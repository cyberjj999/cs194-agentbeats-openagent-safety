#!/bin/bash
# Quick deployment script for Google Cloud Run
# Usage: ./deploy_to_cloudrun.sh YOUR_PROJECT_ID YOUR_OPENAI_KEY

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check arguments
if [ "$#" -lt 2 ]; then
    echo -e "${RED}Error: Missing arguments${NC}"
    echo "Usage: $0 PROJECT_ID OPENAI_API_KEY [REGION]"
    echo "Example: $0 my-project-123 sk-xxxxx us-central1"
    exit 1
fi

PROJECT_ID="$1"
OPENAI_KEY="$2"
REGION="${3:-us-central1}"
SERVICE_NAME="openagentsafety-green-agent"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}AgentBeats Deployment Script${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Project ID: $PROJECT_ID"
echo "Region: $REGION"
echo "Service Name: $SERVICE_NAME"
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}Error: gcloud CLI not found${NC}"
    echo "Install from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

echo -e "${YELLOW}Step 1: Authenticating with Google Cloud...${NC}"
gcloud auth login

echo -e "${YELLOW}Step 2: Setting project...${NC}"
gcloud config set project "$PROJECT_ID"

echo -e "${YELLOW}Step 3: Enabling required APIs...${NC}"
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com

echo -e "${YELLOW}Step 4: Deploying to Cloud Run...${NC}"
gcloud run deploy "$SERVICE_NAME" \
  --source . \
  --platform managed \
  --region "$REGION" \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 2 \
  --timeout 3600 \
  --set-env-vars "OPENAI_API_KEY=$OPENAI_KEY" \
  --set-env-vars "AGENT_TYPE=green" \
  --set-env-vars "HOST=0.0.0.0" \
  --set-env-vars "PORT=8080" \
  --set-env-vars "AGENT_PORT=8080" \
  --set-env-vars "WHITE_AGENT_MODEL=gpt-4o" \
  --set-env-vars "WHITE_AGENT_PROVIDER=openai"

# Get the service URL
SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" --region "$REGION" --format='value(status.url)')

# Extract host from URL for CLOUDRUN_HOST
SERVICE_HOST=$(echo "$SERVICE_URL" | sed 's|https://||' | sed 's|http://||')

# Update service with PUBLIC_URL and CLOUDRUN_HOST
echo -e "${YELLOW}Updating service with PUBLIC_URL and CLOUDRUN_HOST...${NC}"
gcloud run services update "$SERVICE_NAME" \
  --region "$REGION" \
  --update-env-vars "PUBLIC_URL=$SERVICE_URL,CLOUDRUN_HOST=$SERVICE_HOST" \
  --quiet

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${GREEN}Service URL:${NC} $SERVICE_URL"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Wait 2-3 minutes for service to fully start"
echo "2. Verify deployment:"
echo "   curl $SERVICE_URL/.well-known/agent-card.json"
echo ""
echo "3. Register on AgentBeats platform:"
echo "   - Controller URL: $SERVICE_URL"
echo "   - Agent Name: OpenAgentSafety Green Agent"
echo "   - Description: Evaluates agent safety in realistic simulations"
echo ""
echo -e "${GREEN}Your green agent is ready for submission! 🚀${NC}"

