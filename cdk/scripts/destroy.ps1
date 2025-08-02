# AWS CDK Destroy Script for OwlNest (PowerShell)
# Usage: .\destroy.ps1 [environment] [profile]
# Example: .\destroy.ps1 development default

param(
    [string]$Environment = "development",
    [string]$AwsProfile = "default"
)

$ErrorActionPreference = "Stop"

Write-Host "🗑️  Destroying OwlNest $Environment environment using AWS profile: $AwsProfile" -ForegroundColor Red

# Validate environment
if ($Environment -notin @("development", "staging", "production")) {
    Write-Host "❌ Error: Environment must be one of: development, staging, production" -ForegroundColor Red
    exit 1
}

# Confirmation prompt
$confirmation = Read-Host "Are you sure you want to destroy the $Environment environment? This action cannot be undone. Type 'yes' to confirm"
if ($confirmation -ne "yes") {
    Write-Host "❌ Destruction cancelled" -ForegroundColor Yellow
    exit 0
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

# Destroy the stack
Write-Host "💥 Destroying stack..." -ForegroundColor Red
npx cdk destroy `
    --profile $AwsProfile `
    --context environment=$Environment `
    --force

Write-Host "✅ Destruction completed successfully!" -ForegroundColor Green