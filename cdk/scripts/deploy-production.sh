#!/bin/bash

# OwlNest Production Deployment Script
# This script deploys the OwlNest application to production environment

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT="production"
REGION="ap-northeast-1"
PROFILE="production"  # AWS CLI profile for production
DOMAIN_NAME="owlnest.example.com"
ALERT_EMAIL="alerts@owlnest.example.com"
GITHUB_OWNER="your-github-username"
GITHUB_REPO="OwlNest"
GITHUB_BRANCH="main"
BUDGET_LIMIT="500"

echo -e "${BLUE}🚀 OwlNest Production Deployment${NC}"
echo "=================================="
echo ""

# Check prerequisites
echo -e "${YELLOW}📋 Checking prerequisites...${NC}"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI is not installed. Please install it first.${NC}"
    exit 1
fi

# Check if CDK is installed
if ! command -v cdk &> /dev/null; then
    echo -e "${RED}❌ AWS CDK is not installed. Please install it first.${NC}"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install it first.${NC}"
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity --profile $PROFILE &> /dev/null; then
    echo -e "${RED}❌ AWS credentials not configured for profile '$PROFILE'. Please configure them first.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites check passed${NC}"
echo ""

# Get AWS account and region info
ACCOUNT_ID=$(aws sts get-caller-identity --profile $PROFILE --query Account --output text)
CURRENT_REGION=$(aws configure get region --profile $PROFILE)

echo -e "${BLUE}📊 Deployment Information${NC}"
echo "Account ID: $ACCOUNT_ID"
echo "Region: $CURRENT_REGION"
echo "Profile: $PROFILE"
echo "Environment: $ENVIRONMENT"
echo "Domain: $DOMAIN_NAME"
echo ""

# Confirmation prompt
echo -e "${YELLOW}⚠️  You are about to deploy to PRODUCTION environment.${NC}"
echo -e "${YELLOW}This will create real AWS resources and may incur costs.${NC}"
echo ""
read -p "Are you sure you want to continue? (yes/no): " -r
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo -e "${RED}❌ Deployment cancelled.${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}🔧 Installing dependencies...${NC}"
npm install

echo ""
echo -e "${BLUE}🏗️  Building TypeScript...${NC}"
npm run build

echo ""
echo -e "${BLUE}🧪 Running tests...${NC}"
npm test

echo ""
echo -e "${BLUE}📦 Synthesizing CDK stacks...${NC}"
cdk synth \
    --profile $PROFILE \
    --context environment=$ENVIRONMENT \
    --context domainName=$DOMAIN_NAME \
    --context alertEmail=$ALERT_EMAIL \
    --context githubOwner=$GITHUB_OWNER \
    --context githubRepo=$GITHUB_REPO \
    --context githubBranch=$GITHUB_BRANCH \
    --context budgetLimit=$BUDGET_LIMIT \
    --app "npx ts-node bin/production.ts"

echo ""
echo -e "${BLUE}🚀 Deploying stacks...${NC}"

# Deploy stacks in order
echo -e "${YELLOW}📦 Deploying Production Stack...${NC}"
cdk deploy OwlNestProduction \
    --profile $PROFILE \
    --require-approval never \
    --context environment=$ENVIRONMENT \
    --context domainName=$DOMAIN_NAME \
    --context alertEmail=$ALERT_EMAIL \
    --context githubOwner=$GITHUB_OWNER \
    --context githubRepo=$GITHUB_REPO \
    --context githubBranch=$GITHUB_BRANCH \
    --context budgetLimit=$BUDGET_LIMIT \
    --app "npx ts-node bin/production.ts"

echo -e "${YELLOW}📊 Deploying Monitoring Stack...${NC}"
cdk deploy OwlNestMonitoring \
    --profile $PROFILE \
    --require-approval never \
    --context environment=$ENVIRONMENT \
    --context domainName=$DOMAIN_NAME \
    --context alertEmail=$ALERT_EMAIL \
    --context githubOwner=$GITHUB_OWNER \
    --context githubRepo=$GITHUB_REPO \
    --context githubBranch=$GITHUB_BRANCH \
    --context budgetLimit=$BUDGET_LIMIT \
    --app "npx ts-node bin/production.ts"

echo -e "${YELLOW}🔒 Deploying Security & Backup Stack...${NC}"
cdk deploy OwlNestSecurityBackup \
    --profile $PROFILE \
    --require-approval never \
    --context environment=$ENVIRONMENT \
    --context domainName=$DOMAIN_NAME \
    --context alertEmail=$ALERT_EMAIL \
    --context githubOwner=$GITHUB_OWNER \
    --context githubRepo=$GITHUB_REPO \
    --context githubBranch=$GITHUB_BRANCH \
    --context budgetLimit=$BUDGET_LIMIT \
    --app "npx ts-node bin/production.ts"

echo -e "${YELLOW}🔄 Deploying Pipeline Stack...${NC}"
cdk deploy OwlNestPipeline \
    --profile $PROFILE \
    --require-approval never \
    --context environment=$ENVIRONMENT \
    --context domainName=$DOMAIN_NAME \
    --context alertEmail=$ALERT_EMAIL \
    --context githubOwner=$GITHUB_OWNER \
    --context githubRepo=$GITHUB_REPO \
    --context githubBranch=$GITHUB_BRANCH \
    --context budgetLimit=$BUDGET_LIMIT \
    --app "npx ts-node bin/production.ts"

echo ""
echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo ""

# Get stack outputs
echo -e "${BLUE}📋 Deployment Summary${NC}"
echo "===================="

# Get CloudFormation outputs
STACK_OUTPUTS=$(aws cloudformation describe-stacks \
    --stack-name OwlNestProduction \
    --profile $PROFILE \
    --query 'Stacks[0].Outputs' \
    --output table)

echo "$STACK_OUTPUTS"

echo ""
echo -e "${BLUE}🔗 Important URLs${NC}"
echo "=================="

# Extract specific outputs
CLOUDFRONT_URL=$(aws cloudformation describe-stacks \
    --stack-name OwlNestProduction \
    --profile $PROFILE \
    --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDomainName`].OutputValue' \
    --output text)

API_URL=$(aws cloudformation describe-stacks \
    --stack-name OwlNestProduction \
    --profile $PROFILE \
    --query 'Stacks[0].Outputs[?OutputKey==`ApiGatewayUrl`].OutputValue' \
    --output text)

DASHBOARD_URL=$(aws cloudformation describe-stacks \
    --stack-name OwlNestMonitoring \
    --profile $PROFILE \
    --query 'Stacks[0].Outputs[?OutputKey==`DashboardUrl`].OutputValue' \
    --output text)

echo "🌐 Website: https://$DOMAIN_NAME"
echo "🌐 CloudFront: https://$CLOUDFRONT_URL"
echo "🔌 API: $API_URL"
echo "📊 Dashboard: $DASHBOARD_URL"

echo ""
echo -e "${BLUE}📝 Next Steps${NC}"
echo "=============="
echo "1. 🌐 Configure DNS records for your domain"
echo "2. 🔑 Set up GitHub secrets for CI/CD pipeline"
echo "3. 📧 Verify email subscriptions for alerts"
echo "4. 🧪 Test the application functionality"
echo "5. 📋 Review monitoring dashboards"
echo "6. 🔒 Verify security configurations"
echo "7. 💾 Test backup and restore procedures"
echo ""

echo -e "${GREEN}🎉 Production deployment is complete!${NC}"
echo -e "${YELLOW}⚠️  Remember to update your frontend configuration with the new endpoints.${NC}"