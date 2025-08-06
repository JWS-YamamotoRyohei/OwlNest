# OwlNest CI/CD Setup Script
# This script helps set up the CI/CD pipeline for OwlNest

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("github-actions", "aws-codepipeline", "both")]
    [string]$CicdType,
    
    [string]$Environment = "development",
    [string]$AwsProfile = "default",
    [string]$GithubOwner = "",
    [string]$GithubRepo = "owlnest",
    [string]$NotificationEmail = ""
)

$ErrorActionPreference = "Stop"

Write-Host "🚀 OwlNest CI/CD Setup" -ForegroundColor Green
Write-Host "Setting up $CicdType for $Environment environment" -ForegroundColor Cyan

# Function to check prerequisites
function Test-Prerequisites {
    Write-Host "`n🔍 Checking prerequisites..." -ForegroundColor Yellow
    
    # Check Node.js
    try {
        $nodeVersion = node --version
        Write-Host "✅ Node.js: $nodeVersion" -ForegroundColor Green
    } catch {
        Write-Host "❌ Node.js not found. Please install Node.js 18 or later." -ForegroundColor Red
        exit 1
    }
    
    # Check npm
    try {
        $npmVersion = npm --version
        Write-Host "✅ npm: $npmVersion" -ForegroundColor Green
    } catch {
        Write-Host "❌ npm not found." -ForegroundColor Red
        exit 1
    }
    
    # Check AWS CLI
    try {
        $awsVersion = aws --version
        Write-Host "✅ AWS CLI: $awsVersion" -ForegroundColor Green
    } catch {
        Write-Host "❌ AWS CLI not found. Please install AWS CLI." -ForegroundColor Red
        exit 1
    }
    
    # Check AWS credentials
    try {
        aws sts get-caller-identity --profile $AwsProfile | Out-Null
        Write-Host "✅ AWS credentials configured for profile: $AwsProfile" -ForegroundColor Green
    } catch {
        Write-Host "❌ AWS credentials not configured for profile: $AwsProfile" -ForegroundColor Red
        exit 1
    }
    
    # Check CDK
    try {
        $cdkVersion = npx cdk --version
        Write-Host "✅ AWS CDK: $cdkVersion" -ForegroundColor Green
    } catch {
        Write-Host "❌ AWS CDK not found. Installing..." -ForegroundColor Yellow
        npm install -g aws-cdk
    }
}

# Function to setup GitHub Actions
function Setup-GitHubActions {
    Write-Host "`n🐙 Setting up GitHub Actions..." -ForegroundColor Yellow
    
    # Check if .github/workflows directory exists
    if (-not (Test-Path ".github/workflows")) {
        Write-Host "❌ GitHub Actions workflows not found. Please ensure you're in the project root directory." -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✅ GitHub Actions workflows found" -ForegroundColor Green
    
    # Instructions for GitHub secrets
    Write-Host "`n📋 GitHub Repository Setup Instructions:" -ForegroundColor Cyan
    Write-Host "1. Go to your GitHub repository settings" -ForegroundColor White
    Write-Host "2. Navigate to Secrets and variables > Actions" -ForegroundColor White
    Write-Host "3. Add the following repository secrets:" -ForegroundColor White
    Write-Host "   - AWS_ACCESS_KEY_ID: Your AWS access key ID" -ForegroundColor Yellow
    Write-Host "   - AWS_SECRET_ACCESS_KEY: Your AWS secret access key" -ForegroundColor Yellow
    
    Write-Host "`n4. Set up GitHub Environments (optional but recommended):" -ForegroundColor White
    Write-Host "   - development: No protection rules" -ForegroundColor Yellow
    Write-Host "   - staging: No protection rules" -ForegroundColor Yellow
    Write-Host "   - production: Require reviewers" -ForegroundColor Yellow
    Write-Host "   - production-approval: Require reviewers" -ForegroundColor Yellow
    
    Write-Host "`n✅ GitHub Actions setup complete!" -ForegroundColor Green
    Write-Host "Push to 'develop' branch to trigger development deployment" -ForegroundColor Cyan
    Write-Host "Push to 'main' branch to trigger staging deployment" -ForegroundColor Cyan
}

# Function to setup AWS CodePipeline
function Setup-AwsCodePipeline {
    Write-Host "`n🔧 Setting up AWS CodePipeline..." -ForegroundColor Yellow
    
    # Get GitHub owner if not provided
    if ([string]::IsNullOrEmpty($GithubOwner)) {
        $GithubOwner = Read-Host "Enter GitHub owner/username"
        if ([string]::IsNullOrEmpty($GithubOwner)) {
            Write-Host "❌ Error: GitHub owner is required" -ForegroundColor Red
            exit 1
        }
    }
    
    # Get notification email if not provided
    if ([string]::IsNullOrEmpty($NotificationEmail)) {
        $NotificationEmail = Read-Host "Enter notification email (optional, press Enter to skip)"
    }
    
    # Install dependencies
    Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
    npm ci
    cd cdk
    npm ci
    cd ..
    
    # Deploy pipeline
    Write-Host "🚀 Deploying CI/CD pipeline..." -ForegroundColor Yellow
    cd cdk
    .\scripts\deploy-pipeline.ps1 $Environment $AwsProfile $GithubOwner $GithubRepo $NotificationEmail
    cd ..
    
    Write-Host "`n✅ AWS CodePipeline setup complete!" -ForegroundColor Green
}

# Function to setup both
function Setup-Both {
    Write-Host "`n🔄 Setting up both GitHub Actions and AWS CodePipeline..." -ForegroundColor Yellow
    Setup-GitHubActions
    Setup-AwsCodePipeline
}

# Main execution
Test-Prerequisites

switch ($CicdType) {
    "github-actions" { Setup-GitHubActions }
    "aws-codepipeline" { Setup-AwsCodePipeline }
    "both" { Setup-Both }
}

Write-Host "`n🎉 CI/CD setup completed successfully!" -ForegroundColor Green
Write-Host "`n📚 Next steps:" -ForegroundColor Yellow
Write-Host "1. Review the documentation in docs/ci-cd-setup.md" -ForegroundColor White
Write-Host "2. Test the pipeline by making a commit" -ForegroundColor White
Write-Host "3. Monitor the pipeline execution" -ForegroundColor White
Write-Host "4. Set up monitoring and alerts as needed" -ForegroundColor White