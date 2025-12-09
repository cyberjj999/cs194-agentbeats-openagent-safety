#!/bin/bash
# AWS Deployment Script for OpenAgentSafety Green Agent
# Supports: AWS App Runner, ECS Fargate, or Elastic Beanstalk
# Usage: ./deploy_to_aws.sh [app-runner|ecs|beanstalk] [region]

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    echo -e "${RED}Error: AWS CLI not found${NC}"
    echo "Install from: https://aws.amazon.com/cli/"
    exit 1
fi

# Check Docker (for ECS/App Runner)
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}Warning: Docker not found. App Runner and ECS deployments require Docker.${NC}"
fi

# Load environment variables
if [ -f "../.env" ]; then
    echo -e "${BLUE}Loading environment variables from ../.env${NC}"
    export $(cat ../.env | grep -v '^#' | xargs)
elif [ -f ".env" ]; then
    echo -e "${BLUE}Loading environment variables from .env${NC}"
    export $(cat .env | grep -v '^#' | xargs)
else
    echo -e "${YELLOW}Warning: No .env file found. Make sure OPENAI_API_KEY is set.${NC}"
fi

# Check required environment variables
if [ -z "$OPENAI_API_KEY" ]; then
    echo -e "${RED}Error: OPENAI_API_KEY not set${NC}"
    echo "Please set it in .env file or export it:"
    echo "  export OPENAI_API_KEY=sk-your-key-here"
    exit 1
fi

# Get deployment method and region
DEPLOY_METHOD="${1:-app-runner}"
REGION="${2:-us-east-1}"
SERVICE_NAME="openagentsafety-green-agent"
ECR_REPO_NAME="openagentsafety-green-agent"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}AWS Deployment Script${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Deployment Method: $DEPLOY_METHOD"
echo "Region: $REGION"
echo "Service Name: $SERVICE_NAME"
echo ""

# Verify AWS credentials
echo -e "${YELLOW}Step 1: Verifying AWS credentials...${NC}"
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}Error: AWS credentials not configured${NC}"
    echo "Run: aws configure"
    exit 1
fi

AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo -e "${GREEN}✅ AWS Account: $AWS_ACCOUNT_ID${NC}"

# Function: Deploy to AWS App Runner (Easiest)
deploy_app_runner() {
    echo -e "${YELLOW}Step 2: Building Docker image...${NC}"
    
    # Build image
    docker build -t $SERVICE_NAME:latest .
    
    echo -e "${YELLOW}Step 3: Pushing to ECR...${NC}"
    
    # Create ECR repository if it doesn't exist
    aws ecr describe-repositories --repository-names $ECR_REPO_NAME --region $REGION 2>/dev/null || \
        aws ecr create-repository --repository-name $ECR_REPO_NAME --region $REGION
    
    # Login to ECR
    aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin \
        $AWS_ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com
    
    # Tag and push
    ECR_URI="$AWS_ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$ECR_REPO_NAME:latest"
    docker tag $SERVICE_NAME:latest $ECR_URI
    docker push $ECR_URI
    
    echo -e "${YELLOW}Step 4: Creating App Runner service...${NC}"
    
    # Create apprunner service config
    cat > apprunner-service.json << EOF
{
  "ServiceName": "$SERVICE_NAME",
  "SourceConfiguration": {
    "ImageRepository": {
      "ImageIdentifier": "$ECR_URI",
      "ImageConfiguration": {
        "Port": "8080",
        "RuntimeEnvironmentVariables": {
          "OPENAI_API_KEY": "$OPENAI_API_KEY",
          "AGENT_TYPE": "green",
          "HOST": "0.0.0.0",
          "PORT": "8080",
          "AGENT_PORT": "8080"
        }
      },
      "ImageRepositoryType": "ECR"
    },
    "AutoDeploymentsEnabled": true
  },
  "InstanceConfiguration": {
    "Cpu": "1 vCPU",
    "Memory": "2 GB"
  }
}
EOF
    
    # Create or update service
    if aws apprunner describe-service --service-arn "arn:aws:apprunner:$REGION:$AWS_ACCOUNT_ID:service/$SERVICE_NAME" --region $REGION &>/dev/null; then
        echo "Updating existing service..."
        aws apprunner update-service \
            --service-arn "arn:aws:apprunner:$REGION:$AWS_ACCOUNT_ID:service/$SERVICE_NAME" \
            --source-configuration file://apprunner-service.json \
            --region $REGION
    else
        echo "Creating new service..."
        aws apprunner create-service \
            --service-name $SERVICE_NAME \
            --source-configuration file://apprunner-service.json \
            --instance-configuration file://apprunner-service.json \
            --region $REGION
    fi
    
    # Get service URL
    echo -e "${YELLOW}Step 5: Waiting for service to be ready...${NC}"
    sleep 10
    
    SERVICE_URL=$(aws apprunner describe-service \
        --service-arn "arn:aws:apprunner:$REGION:$AWS_ACCOUNT_ID:service/$SERVICE_NAME" \
        --region $REGION \
        --query 'Service.ServiceUrl' \
        --output text)
    
    # Update service with PUBLIC_URL and CLOUDRUN_HOST
    echo -e "${YELLOW}Step 6: Updating service with PUBLIC_URL and CLOUDRUN_HOST...${NC}"
    SERVICE_HOST=$(echo $SERVICE_URL | sed 's|https://||' | sed 's|http://||')
    cat > apprunner-update.json << EOF
{
  "ServiceName": "$SERVICE_NAME",
  "SourceConfiguration": {
    "ImageRepository": {
      "ImageIdentifier": "$ECR_URI",
      "ImageConfiguration": {
        "Port": "8080",
        "RuntimeEnvironmentVariables": {
          "OPENAI_API_KEY": "$OPENAI_API_KEY",
          "AGENT_TYPE": "green",
          "HOST": "0.0.0.0",
          "PORT": "8080",
          "AGENT_PORT": "8080",
          "PUBLIC_URL": "https://$SERVICE_URL",
          "CLOUDRUN_HOST": "$SERVICE_HOST:8080"
        }
      },
      "ImageRepositoryType": "ECR"
    },
    "AutoDeploymentsEnabled": true
  },
  "InstanceConfiguration": {
    "Cpu": "1 vCPU",
    "Memory": "2 GB"
  }
}
EOF
    
    aws apprunner update-service \
        --service-arn "arn:aws:apprunner:$REGION:$AWS_ACCOUNT_ID:service/$SERVICE_NAME" \
        --source-configuration file://apprunner-update.json \
        --region $REGION > /dev/null
    
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}Deployment Complete!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo -e "${GREEN}Service URL:${NC} https://$SERVICE_URL"
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo "1. Wait 2-3 minutes for service to fully start"
    echo "2. Verify deployment:"
    echo "   curl https://$SERVICE_URL/.well-known/agent-card.json"
    echo ""
    echo "3. Register on AgentBeats platform:"
    echo "   - Controller URL: https://$SERVICE_URL"
    echo "   - Agent Name: OpenAgentSafety Green Agent"
    echo ""
    echo -e "${GREEN}Your green agent is ready! 🚀${NC}"
}

# Function: Deploy to ECS Fargate
deploy_ecs() {
    echo -e "${YELLOW}ECS Fargate deployment not yet implemented${NC}"
    echo "Use App Runner for easier deployment, or implement ECS manually"
    exit 1
}

# Function: Deploy to Elastic Beanstalk
deploy_beanstalk() {
    echo -e "${YELLOW}Elastic Beanstalk deployment not yet implemented${NC}"
    echo "Use App Runner for easier deployment"
    exit 1
}

# Main deployment logic
case $DEPLOY_METHOD in
    app-runner|apprunner)
        deploy_app_runner
        ;;
    ecs)
        deploy_ecs
        ;;
    beanstalk)
        deploy_beanstalk
        ;;
    *)
        echo -e "${RED}Error: Unknown deployment method: $DEPLOY_METHOD${NC}"
        echo "Valid methods: app-runner, ecs, beanstalk"
        exit 1
        ;;
esac

