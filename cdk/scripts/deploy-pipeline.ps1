# AWS CDK Pipeline Deployment Script for OwlNest (PowerShell)
# Usage: .\deploy-pipeline.ps1 [environment] [profile] [githubOwner] [githubRepo] [notificationEmail]
# Example: .\deploy-pipeline.ps1 development default myusername owlnest admin@example.com

param(
    [string]$Environment = "development",
    [string]$AwsProfile = "default",
    [string]$GithubOwner = "",
    [string]$GithubRepo = "owlnest",
    [string]$NotificationEmail = ""
)

$ErrorActionPreference = "Stop"

Write-Host "🚀 Deploying OwlNest CI/CD Pipeline for $Environment environment" -ForegroundColor Green

# Validate environment
if ($Environment -notin @("development", "staging", "production")) {
    Write-Host "❌ Error: Environment must be one of: development, staging, production" -ForegroundColor Red
    exit 1
}

# Validate required parameters
if ([string]::IsNullOrEmpty($GithubOwner)) {
    $GithubOwner = Read-Host "Enter GitHub owner/username"
    if ([string]::IsNullOrEmpty($GithubOwner)) {
        Write-Host "❌ Error: GitHub owner is required" -ForegroundColor Red
        exit 1
    }
}

if ([string]::IsNullOrEmpty($NotificationEmail)) {
    $NotificationEmail = Read-Host "Enter notification email (optional, press Enter to skip)"
}

# Check if AWS CLI is configured
try {
    aws sts get-caller-identity --profile $AwsProfile | Out-Null
} catch {
    Write-Host "❌ Error: AWS CLI not configured for profile $AwsProfile" -ForegroundColor Red
    exit 1
}

# Check if GitHub token is stored in AWS Secrets Manager
Write-Host "🔐 Checking GitHub token in Secrets Manager..." -ForegroundColor Yellow
try {
    aws secretsmanager get-secret-value --secret-id github-token --profile $AwsProfile | Out-Null
    Write-Host "✅ GitHub token found in Secrets Manager" -ForegroundColor Green
} catch {
    Write-Host "⚠️  GitHub token not found in Secrets Manager" -ForegroundColor Yellow
    Write-Host "Please create a GitHub personal access token and store it in AWS Secrets Manager:" -ForegroundColor Yellow
    Write-Host "aws secretsmanager create-secret --name github-token --secret-string 'your-github-token' --profile $AwsProfile" -ForegroundColor Cyan
    
    $createToken = Read-Host "Do you want to create the secret now? (y/N)"
    if ($createToken -eq "y" -or $createToken -eq "Y") {
        $token = Read-Host "Enter your GitHub personal access token" -AsSecureString
        $tokenPlainText = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($token))
        
        try {
            aws secretsmanager create-secret --name github-token --secret-string $tokenPlainText --profile $AwsProfile
            Write-Host "✅ GitHub token stored in Secrets Manager" -ForegroundColor Green
        } catch {
            Write-Host "❌ Error: Failed to store GitHub token" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "❌ Error: GitHub token is required for pipeline deployment" -ForegroundColor Red
        exit 1
    }
}

# Build the project
Write-Host "🔨 Building CDK project..." -ForegroundColor Yellow
npm run build

# Bootstrap CDK (if needed)
Write-Host "🏗️  Bootstrapping CDK..." -ForegroundColor Yellow
npx cdk bootstrap --profile $AwsProfile

# Prepare context parameters
$contextParams = @(
    "--context", "environment=$Environment",
    "--context", "githubOwner=$GithubOwner",
    "--context", "githubRepo=$GithubRepo"
)

if (-not [string]::IsNullOrEmpty($NotificationEmail)) {
    $contextParams += "--context", "notificationEmail=$NotificationEmail"
}

# Deploy the pipeline stack
Write-Host "📦 Deploying pipeline stack..." -ForegroundColor Yellow
npx cdk deploy `
    --app "npx ts-node --prefer-ts-exts bin/pipeline.ts" `
    --profile $AwsProfile `
    @contextParams `
    --require-approval never `
    --outputs-file "pipeline-outputs-$Environment.json"

Write-Host "✅ Pipeline deployment completed successfully!" -ForegroundColor Green
Write-Host "📄 Outputs saved to pipeline-outputs-$Environment.json" -ForegroundColor Cyan

# Display next steps
Write-Host "`n🎯 Next Steps:" -ForegroundColor Yellow
Write-Host "1. Check the AWS CodePipeline console to verify the pipeline is created" -ForegroundColor White
Write-Host "2. Make a commit to trigger the first pipeline execution" -ForegroundColor White
Write-Host "3. Monitor the pipeline execution and build logs" -ForegroundColor White
if (-not [string]::IsNullOrEmpty($NotificationEmail)) {
    Write-Host "4. Check your email for pipeline notifications" -ForegroundColor White
}

Write-Host "`n📊 Useful Commands:" -ForegroundColor Yellow
Write-Host "- View pipeline: aws codepipeline get-pipeline --name owlnest-pipeline-$Environment --profile $AwsProfile" -ForegroundColor Cyan
Write-Host "- View build project: aws codebuild batch-get-projects --names owlnest-build-$Environment --profile $AwsProfile" -ForegroundColor Cyan