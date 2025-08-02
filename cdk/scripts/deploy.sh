#!/bin/bash

# AWS CDK Deployment Script for OwlNest
# Usage: ./deploy.sh [environment] [profile]
# Example: ./deploy.sh development default

set -e

# Default values
ENVIRONMENT=${1:-development}
AWS_PROFILE=${2:-default}

echo "🚀 Deploying OwlNest to $ENVIRONMENT environment using AWS profile: $AWS_PROFILE"

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(development|staging|production)$ ]]; then
    echo "❌ Error: Environment must be one of: development, staging, production"
    exit 1
fi

# Check if AWS CLI is configured
if ! aws sts get-caller-identity --profile $AWS_PROFILE > /dev/null 2>&1; then
    echo "❌ Error: AWS CLI not configured for profile $AWS_PROFILE"
    exit 1
fi

# Build the project
echo "🔨 Building CDK project..."
npm run build

# Bootstrap CDK (if needed)
echo "🏗️  Bootstrapping CDK..."
npx cdk bootstrap --profile $AWS_PROFILE

# Deploy the stack
echo "📦 Deploying stack..."
npx cdk deploy \
    --profile $AWS_PROFILE \
    --context environment=$ENVIRONMENT \
    --require-approval never \
    --outputs-file outputs-$ENVIRONMENT.json

echo "✅ Deployment completed successfully!"
echo "📄 Outputs saved to outputs-$ENVIRONMENT.json"