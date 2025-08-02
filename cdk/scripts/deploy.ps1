# AWS CDK Deployment Script for OwlNest (PowerShell)
# Usage: .\deploy.ps1 [environment] [profile]
# Example: .\deploy.ps1 development default

param(
    [string]$Environment = "development",
    [string]$AwsProfile = "default"
)

$ErrorActionPreference = "Stop"

Write-Host "🚀 Deploying OwlNest to $Environment environment using AWS profile: $AwsProfile" -ForegroundColor Green

# Validate environment
if ($Environment -notin @("development", "staging", "production")) {
    Write-Host "❌ Error: Environment must be one of: development, staging, production" -ForegroundColor Red
    exit 1
}

# Check if AWS CLI is configured
try {
    aws sts get-caller-identity --profile $AwsProfile | Out-Null
} catch {
    Write-Host "❌ Error: AWS CLI not configured for profile $AwsProfile" -ForegroundColor Red
    exit 1
}

# Build the project
Write-Host "🔨 Building CDK project..." -ForegroundColor Yellow
npm run build

# Bootstrap CDK (if needed)
Write-Host "🏗️  Bootstrapping CDK..." -ForegroundColor Yellow
npx cdk bootstrap --profile $AwsProfile

# Deploy the stack
Write-Host "📦 Deploying stack..." -ForegroundColor Yellow
npx cdk deploy `
    --profile $AwsProfile `
    --context environment=$Environment `
    --require-approval never `
    --outputs-file "outputs-$Environment.json"

Write-Host "✅ Deployment completed successfully!" -ForegroundColor Green
Write-Host "📄 Outputs saved to outputs-$Environment.json" -ForegroundColor Cyan