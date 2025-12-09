#!/bin/bash
# AWS EC2 deployment script for OpenAgentSafety agents
# This script creates an EC2 instance and deploys the agent with AgentBeats controller
#
# Usage:
#   ./deploy_to_ec2.sh [green|white] [options]
#
# Options (via environment variables):
#   AWS_REGION          - AWS region (default: us-east-1)
#   INSTANCE_TYPE       - EC2 instance type (default: t3.medium)
#   KEY_NAME            - EC2 key pair name (auto-created if not provided)
#   OPENAI_API_KEY      - OpenAI API key (required)
#   DOMAIN_NAME         - Optional domain name for HTTPS setup
#   EMAIL               - Email for Let's Encrypt (required if DOMAIN_NAME is set)

set -e

AGENT_TYPE=${1:-green}
AWS_REGION=${AWS_REGION:-us-east-1}
INSTANCE_TYPE=${INSTANCE_TYPE:-t3.medium}
KEY_NAME=${KEY_NAME:-""}
SECURITY_GROUP_NAME="openagentsafety-${AGENT_TYPE}-sg"
DOMAIN_NAME=${DOMAIN_NAME:-""}
EMAIL=${EMAIL:-""}

echo "🚀 Deploying ${AGENT_TYPE} agent to AWS EC2..."

# Check AWS credentials
if ! aws sts get-caller-identity &>/dev/null; then
    echo "❌ AWS credentials not configured. Please run 'aws configure'"
    exit 1
fi

# Get AWS account ID and set up ECR
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
ECR_REPO_NAME="openagentsafety-${AGENT_TYPE}"
IMAGE_NAME="${ECR_REGISTRY}/${ECR_REPO_NAME}:latest"

# Check if OPENAI_API_KEY is set
if [ -z "$OPENAI_API_KEY" ]; then
    echo "⚠️  Warning: OPENAI_API_KEY not set. Will need to set it on the instance."
    if [ -f "../.env" ]; then
        export OPENAI_API_KEY=$(grep "^OPENAI_API_KEY=" ../.env | cut -d'=' -f2 | tr -d '"' | tr -d "'")
        echo "✅ Loaded OPENAI_API_KEY from ../.env file"
    elif [ -f ".env" ]; then
        export OPENAI_API_KEY=$(grep "^OPENAI_API_KEY=" .env | cut -d'=' -f2 | tr -d '"' | tr -d "'")
        echo "✅ Loaded OPENAI_API_KEY from .env file"
    else
        echo "⚠️  Please set OPENAI_API_KEY environment variable or create .env file"
    fi
fi

echo "📦 Step 1: Building Docker image..."
cd "$(dirname "$0")/.."
# Build from repo root with agentified Dockerfile
docker build --platform linux/amd64 -f agentified/Dockerfile -t ${ECR_REPO_NAME}:latest .

echo "🔐 Step 2: Logging into ECR..."
aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_REGISTRY}

# Create ECR repository if it doesn't exist
echo "📝 Step 3: Creating ECR repository if needed..."
aws ecr describe-repositories --repository-names ${ECR_REPO_NAME} --region ${AWS_REGION} 2>/dev/null || \
    aws ecr create-repository --repository-name ${ECR_REPO_NAME} --region ${AWS_REGION} --image-scanning-configuration scanOnPush=true

echo "🏷️  Step 4: Tagging and pushing image to ECR..."
docker tag ${ECR_REPO_NAME}:latest ${IMAGE_NAME}
docker push ${IMAGE_NAME}

echo "✅ Image pushed to ECR: ${IMAGE_NAME}"

# Create security group
echo "🔒 Step 5: Creating security group..."
SG_ID=$(aws ec2 describe-security-groups \
    --filters "Name=group-name,Values=${SECURITY_GROUP_NAME}" \
    --region ${AWS_REGION} \
    --query 'SecurityGroups[0].GroupId' \
    --output text 2>/dev/null || echo "")

if [ -z "$SG_ID" ] || [ "$SG_ID" == "None" ]; then
    echo "Creating new security group..."
    SG_ID=$(aws ec2 create-security-group \
        --group-name ${SECURITY_GROUP_NAME} \
        --description "Security group for openagentsafety ${AGENT_TYPE} agent" \
        --region ${AWS_REGION} \
        --query 'GroupId' \
        --output text)
    
    # Allow HTTP traffic on port 8080 (for AgentBeats controller)
    aws ec2 authorize-security-group-ingress \
        --group-id ${SG_ID} \
        --protocol tcp \
        --port 8080 \
        --cidr 0.0.0.0/0 \
        --region ${AWS_REGION} 2>/dev/null || echo "Port 8080 rule may already exist"
    
    # Allow HTTPS on port 443 (for HTTPS setup with nginx)
    aws ec2 authorize-security-group-ingress \
        --group-id ${SG_ID} \
        --protocol tcp \
        --port 443 \
        --cidr 0.0.0.0/0 \
        --region ${AWS_REGION} 2>/dev/null || echo "Port 443 rule may already exist"
    
    # Allow HTTP on port 80 (for Let's Encrypt verification)
    aws ec2 authorize-security-group-ingress \
        --group-id ${SG_ID} \
        --protocol tcp \
        --port 80 \
        --cidr 0.0.0.0/0 \
        --region ${AWS_REGION} 2>/dev/null || echo "Port 80 rule may already exist"
    
    # Allow SSH on port 22
    aws ec2 authorize-security-group-ingress \
        --group-id ${SG_ID} \
        --protocol tcp \
        --port 22 \
        --cidr 0.0.0.0/0 \
        --region ${AWS_REGION} 2>/dev/null || echo "Port 22 rule may already exist"
    
    echo "✅ Security group created: ${SG_ID}"
else
    echo "✅ Using existing security group: ${SG_ID}"
fi

# Get the latest Amazon Linux 2023 AMI
echo "🖼️  Step 6: Getting latest Amazon Linux 2023 AMI..."
AMI_ID=$(aws ec2 describe-images \
    --owners amazon \
    --filters "Name=name,Values=al2023-ami-2023*" "Name=architecture,Values=x86_64" \
    --query 'Images | sort_by(@, &CreationDate) | [-1].ImageId' \
    --output text \
    --region ${AWS_REGION})

if [ -z "$AMI_ID" ] || [ "$AMI_ID" == "None" ]; then
    echo "⚠️  Could not find Amazon Linux 2023 AMI, trying Amazon Linux 2..."
    AMI_ID=$(aws ec2 describe-images \
        --owners amazon \
        --filters "Name=name,Values=amzn2-ami-hvm-*-x86_64-gp2" "Name=state,Values=available" \
        --query 'Images | sort_by(@, &CreationDate) | [-1].ImageId' \
        --output text \
        --region ${AWS_REGION})
fi

echo "Using AMI: ${AMI_ID}"

# Create user data script to install Docker and run the container with AgentBeats controller
USER_DATA=$(cat <<EOF
#!/bin/bash
set -e

# Update system
yum update -y

# Install Docker
yum install -y docker
systemctl start docker
systemctl enable docker
usermod -a -G docker ec2-user

# Install AWS CLI v2 if not present
if ! command -v aws &> /dev/null; then
    curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
    unzip -q awscliv2.zip
    ./aws/install
    rm -rf aws awscliv2.zip
fi

# Install jq for JSON parsing
yum install -y jq

# Login to ECR
aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_REGISTRY}

# Pull the container image
docker pull ${IMAGE_NAME}

# Create directory for agent state
mkdir -p /opt/agentbeats
chown ec2-user:ec2-user /opt/agentbeats

# Get public IP for agent card URL (avoid localhost)
# Try metadata service first with generous retries; fallback to checkip.
PUBLIC_IP=""
for i in {1..30}; do
    sleep 2
    PUBLIC_IP=\$(curl -s --max-time 5 http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo "")
    if [ -n "\$PUBLIC_IP" ] && [ "\$PUBLIC_IP" != "" ] && [ "\$PUBLIC_IP" != "None" ]; then
        echo "Got public IP from metadata service: \$PUBLIC_IP"
        break
    fi
done

if [ -z "\$PUBLIC_IP" ] || [ "\$PUBLIC_IP" == "None" ]; then
    echo "Metadata service failed; trying checkip..."
    PUBLIC_IP=\$(curl -s --max-time 5 https://checkip.amazonaws.com 2>/dev/null | tr -d '\\n\\r' || echo "")
fi

if [ -z "\$PUBLIC_IP" ] || [ "\$PUBLIC_IP" == "None" ]; then
    echo "Warning: Could not determine public IP; using localhost (agent card may be incorrect)."
    PUBLIC_IP="localhost"
fi

PUBLIC_URL="http://\${PUBLIC_IP}:8080"
CLOUDRUN_HOST="\${PUBLIC_IP}:8080"
echo "Using public URL for agent card: \${PUBLIC_URL}"

# Run the container with AgentBeats controller
# The controller will manage the agent lifecycle and expose the API
docker run -d \\
    --name openagentsafety-${AGENT_TYPE} \\
    --restart unless-stopped \\
    -p 8080:8080 \\
    -v /opt/agentbeats:/app/agentified/.ab \\
    -e AGENT_TYPE=${AGENT_TYPE} \\
    -e HOST=0.0.0.0 \\
    -e AGENT_PORT=8080 \\
    -e PORT=8080 \\
    -e PUBLIC_URL=\${PUBLIC_URL} \\
    -e CLOUDRUN_HOST=\${CLOUDRUN_HOST} \\
    -e OPENAI_API_KEY=${OPENAI_API_KEY:-PLACEHOLDER_KEY} \\
    ${IMAGE_NAME}

# Wait for container to be ready
sleep 10

# Create a simple health check script
cat > /usr/local/bin/check-agent-health.sh <<'HEALTH_END'
#!/bin/bash
curl -f http://localhost:8080/.well-known/agent-card.json > /dev/null 2>&1
HEALTH_END
chmod +x /usr/local/bin/check-agent-health.sh

# Log container startup
docker logs openagentsafety-${AGENT_TYPE} > /var/log/openagentsafety.log 2>&1 || true

echo "✅ Agent container started successfully"
EOF
)

# Encode user data
USER_DATA_B64=$(echo "$USER_DATA" | base64)

# Check if key pair exists, create if needed
if [ -z "$KEY_NAME" ]; then
    KEY_NAME="openagentsafety-${AGENT_TYPE}-key"
    echo "🔑 Step 7: Checking for key pair..."
    if ! aws ec2 describe-key-pairs --key-names ${KEY_NAME} --region ${AWS_REGION} &>/dev/null; then
        echo "Creating new key pair: ${KEY_NAME}"
        aws ec2 create-key-pair \
            --key-name ${KEY_NAME} \
            --region ${AWS_REGION} \
            --query 'KeyMaterial' \
            --output text > ${KEY_NAME}.pem
        chmod 400 ${KEY_NAME}.pem
        echo "✅ Key pair created. Private key saved to: ${KEY_NAME}.pem"
        echo "⚠️  IMPORTANT: Save this key file! You'll need it to SSH into the instance."
    else
        echo "✅ Using existing key pair: ${KEY_NAME}"
    fi
fi

# Launch EC2 instance
echo "🚀 Step 8: Launching EC2 instance..."
INSTANCE_ID=$(aws ec2 run-instances \
    --image-id ${AMI_ID} \
    --instance-type ${INSTANCE_TYPE} \
    --key-name ${KEY_NAME} \
    --security-group-ids ${SG_ID} \
    --iam-instance-profile Name=EC2-ECR-Access-Profile \
    --user-data "$USER_DATA_B64" \
    --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=openagentsafety-${AGENT_TYPE}},{Key=Project,Value=agentbeats}]" \
    --region ${AWS_REGION} \
    --query 'Instances[0].InstanceId' \
    --output text)

echo "✅ Instance launched: ${INSTANCE_ID}"

# Wait for instance to be running
echo "⏳ Waiting for instance to be running..."
aws ec2 wait instance-running --instance-ids ${INSTANCE_ID} --region ${AWS_REGION}

# Get public IP
echo "🌐 Getting public IP address..."
sleep 10  # Give it a moment to get an IP
PUBLIC_IP=$(aws ec2 describe-instances \
    --instance-ids ${INSTANCE_ID} \
    --region ${AWS_REGION} \
    --query 'Reservations[0].Instances[0].PublicIpAddress' \
    --output text)

# Update container with correct PUBLIC_URL if we got the IP
if [ -n "$PUBLIC_IP" ] && [ "$PUBLIC_IP" != "None" ]; then
    echo "🔄 Updating container with correct PUBLIC_URL..."
    # Wait a bit for container to be running
    sleep 30
    # Use AWS SSM or direct command execution to update the container
    # For now, we'll log the command that needs to be run manually
    echo "   To fix agent card URL, run on instance:"
    echo "   docker stop openagentsafety-${AGENT_TYPE}"
    echo "   docker rm openagentsafety-${AGENT_TYPE}"
    echo "   docker run -d --name openagentsafety-${AGENT_TYPE} --restart unless-stopped -p 8080:8080 -v /opt/agentbeats:/app/agentified/.ab -e AGENT_TYPE=${AGENT_TYPE} -e HOST=0.0.0.0 -e AGENT_PORT=8080 -e PORT=8080 -e PUBLIC_URL=http://${PUBLIC_IP}:8080 -e CLOUDRUN_HOST=${PUBLIC_IP}:8080 -e OPENAI_API_KEY=\$(docker inspect openagentsafety-${AGENT_TYPE} 2>/dev/null | grep OPENAI_API_KEY | head -1 | cut -d'\"' -f4 || echo 'REQUIRED') ${IMAGE_NAME}"
fi

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📋 Instance details:"
echo "   Instance ID: ${INSTANCE_ID}"
echo "   Public IP: ${PUBLIC_IP}"
echo "   Service URL: http://${PUBLIC_IP}:8080"
echo ""
echo "⏳ The container is starting up. It may take 2-3 minutes for the service to be ready."
echo ""
echo "🔍 To check if the service is ready:"
echo "   curl http://${PUBLIC_IP}:8080/.well-known/agent-card.json"
echo ""
echo "📝 To check logs:"
echo "   ssh -i ${KEY_NAME}.pem ec2-user@${PUBLIC_IP}"
echo "   sudo docker logs -f openagentsafety-${AGENT_TYPE}"
echo ""
echo "🌐 For AgentBeats registration:"
echo "   Use: http://${PUBLIC_IP}:8080 (or set up HTTPS with a domain)"
echo "   Note: AgentBeats prefers HTTPS URLs for security"
echo ""
echo "💰 Cost management:"
echo "   To stop the instance:"
echo "   aws ec2 stop-instances --instance-ids ${INSTANCE_ID} --region ${AWS_REGION}"
echo "   To terminate (delete) the instance:"
echo "   aws ec2 terminate-instances --instance-ids ${INSTANCE_ID} --region ${AWS_REGION}"


