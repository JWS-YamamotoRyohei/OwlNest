# OwlNest Production Deployment Script (PowerShell)
# This script deploys the OwlNest application to production environment

param(
    [string]$Environment = "production",
    [string]$Region = "ap-northeast-1",
    [string]$Profile = "production",
    [string]$DomainName = "owlnest.example.com",
    [string]$AlertEmail = "alerts@owlnest.example.com",
    [string]$GithubOwner = "your-github-username",
    [string]$GithubRepo = "OwlNest",
    [string]$GithubBranch = "main",
    [int]$BudgetLimit = 500
)

# Error handling
$ErrorActionPreference = "Stop"

# Colors for output
function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    
    switch ($Color) {
        "Red" { Write-Host $Message -ForegroundColor Red }
        "Green" { Write-Host $Message -ForegroundColor Green }
        "Yellow" { Write-Host $Message -ForegroundColor Yellow }
        "Blue" { Write-Host $Message -ForegroundColor Blue }
        "Cyan" { Write-Host $Message -ForegroundColor Cyan }
        default { Write-Host $Message }
    }
}

Write-ColorOutput "🚀 OwlNest Production Deployment" "Blue"
Write-ColorOutput "==================================" "Blue"
Write-Host ""

# Check prerequisites
Write-ColorOutput "📋 Checking prerequisites..." "Yellow"

# Check if AWS CLI is installed
try {
    aws --version | Out-Null
    Write-ColorOutput "✅ AWS CLI found" "Green"
} catch {
    Write-ColorOutput "❌ AWS CLI is not installed. Please install it first." "Red"
    exit 1
}

# Check if CDK is installed
try {
    cdk --version | Out-Null
    Write-ColorOutput "✅ AWS CDK found" "Green"
} catch {
    Write-ColorOutput "❌ AWS CDK is not installed. Please install it first." "Red"
    exit 1
}

# Check if Node.js is installed
try {
    node --version | Out-Null
    Write-ColorOutput "✅ Node.js found" "Green"
} catch {
    Write-ColorOutput "❌ Node.js is not installed. Please install it first." "Red"
    exit 1
}

# Check AWS credentials
try {
    $accountInfo = aws sts get-caller-identity --profile $Profile 2>$null | ConvertFrom-Json
    Write-ColorOutput "✅ AWS credentials configured" "Green"
} catch {
    Write-ColorOutput "❌ AWS credentials not configured for profile '$Profile'. Please configure them first." "Red"
    exit 1
}

Write-Host ""

# Get AWS account and region info
$AccountId = $accountInfo.Account
$CurrentRegion = aws configure get region --profile $Profile

Write-ColorOutput "📊 Deployment Information" "Blue"
Write-Host "Account ID: $AccountId"
Write-Host "Region: $CurrentRegion"
Write-Host "Profile: $Profile"
Write-Host "Environment: $Environment"
Write-Host "Domain: $DomainName"
Write-Host ""

# Confirmation prompt
Write-ColorOutput "⚠️  You are about to deploy to PRODUCTION environment." "Yellow"
Write-ColorOutput "This will create real AWS resources and may incur costs." "Yellow"
Write-Host ""

$confirmation = Read-Host "Are you sure you want to continue? (yes/no)"
if ($confirmation -ne "yes") {
    Write-ColorOutput "❌ Deployment cancelled." "Red"
    exit 1
}

Write-Host ""

try {
    Write-ColorOutput "🔧 Installing dependencies..." "Blue"
    npm install
    if ($LASTEXITCODE -ne 0) { throw "npm install failed" }

    Write-Host ""
    Write-ColorOutput "🏗️  Building TypeScript..." "Blue"
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "npm run build failed" }

    Write-Host ""
    Write-ColorOutput "🧪 Running tests..." "Blue"
    npm test
    if ($LASTEXITCODE -ne 0) { throw "npm test failed" }

    Write-Host ""
    Write-ColorOutput "📦 Synthesizing CDK stacks..." "Blue"
    
    $cdkContext = @(
        "--profile", $Profile,
        "--context", "environment=$Environment",
        "--context", "domainName=$DomainName",
        "--context", "alertEmail=$AlertEmail",
        "--context", "githubOwner=$GithubOwner",
        "--context", "githubRepo=$GithubRepo",
        "--context", "githubBranch=$GithubBranch",
        "--context", "budgetLimit=$BudgetLimit",
        "--app", "npx ts-node bin/production.ts"
    )
    
    & cdk synth @cdkContext
    if ($LASTEXITCODE -ne 0) { throw "cdk synth failed" }

    Write-Host ""
    Write-ColorOutput "🚀 Deploying stacks..." "Blue"

    # Deploy stacks in order
    Write-ColorOutput "📦 Deploying Production Stack..." "Yellow"
    & cdk deploy OwlNestProduction --require-approval never @cdkContext
    if ($LASTEXITCODE -ne 0) { throw "Production stack deployment failed" }

    Write-ColorOutput "📊 Deploying Monitoring Stack..." "Yellow"
    & cdk deploy OwlNestMonitoring --require-approval never @cdkContext
    if ($LASTEXITCODE -ne 0) { throw "Monitoring stack deployment failed" }

    Write-ColorOutput "🔒 Deploying Security & Backup Stack..." "Yellow"
    & cdk deploy OwlNestSecurityBackup --require-approval never @cdkContext
    if ($LASTEXITCODE -ne 0) { throw "Security & Backup stack deployment failed" }

    Write-ColorOutput "🔄 Deploying Pipeline Stack..." "Yellow"
    & cdk deploy OwlNestPipeline --require-approval never @cdkContext
    if ($LASTEXITCODE -ne 0) { throw "Pipeline stack deployment failed" }

    Write-Host ""
    Write-ColorOutput "✅ Deployment completed successfully!" "Green"
    Write-Host ""

    # Get stack outputs
    Write-ColorOutput "📋 Deployment Summary" "Blue"
    Write-ColorOutput "====================" "Blue"

    # Get CloudFormation outputs
    $stackOutputs = aws cloudformation describe-stacks --stack-name OwlNestProduction --profile $Profile --query 'Stacks[0].Outputs' --output table
    Write-Host $stackOutputs

    Write-Host ""
    Write-ColorOutput "🔗 Important URLs" "Blue"
    Write-ColorOutput "=================" "Blue"

    # Extract specific outputs
    $cloudFrontUrl = aws cloudformation describe-stacks --stack-name OwlNestProduction --profile $Profile --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDomainName`].OutputValue' --output text
    $apiUrl = aws cloudformation describe-stacks --stack-name OwlNestProduction --profile $Profile --query 'Stacks[0].Outputs[?OutputKey==`ApiGatewayUrl`].OutputValue' --output text
    $dashboardUrl = aws cloudformation describe-stacks --stack-name OwlNestMonitoring --profile $Profile --query 'Stacks[0].Outputs[?OutputKey==`DashboardUrl`].OutputValue' --output text

    Write-Host "🌐 Website: https://$DomainName"
    Write-Host "🌐 CloudFront: https://$cloudFrontUrl"
    Write-Host "🔌 API: $apiUrl"
    Write-Host "📊 Dashboard: $dashboardUrl"

    Write-Host ""
    Write-ColorOutput "📝 Next Steps" "Blue"
    Write-ColorOutput "==============" "Blue"
    Write-Host "1. 🌐 Configure DNS records for your domain"
    Write-Host "2. 🔑 Set up GitHub secrets for CI/CD pipeline"
    Write-Host "3. 📧 Verify email subscriptions for alerts"
    Write-Host "4. 🧪 Test the application functionality"
    Write-Host "5. 📋 Review monitoring dashboards"
    Write-Host "6. 🔒 Verify security configurations"
    Write-Host "7. 💾 Test backup and restore procedures"
    Write-Host ""

    Write-ColorOutput "🎉 Production deployment is complete!" "Green"
    Write-ColorOutput "⚠️  Remember to update your frontend configuration with the new endpoints." "Yellow"

} catch {
    Write-ColorOutput "❌ Deployment failed: $($_.Exception.Message)" "Red"
    Write-ColorOutput "Please check the error messages above and try again." "Red"
    exit 1
}