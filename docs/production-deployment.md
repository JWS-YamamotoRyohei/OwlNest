# OwlNest Production Deployment Guide

This guide provides comprehensive instructions for deploying OwlNest to production environment with full monitoring, security, and backup capabilities.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Pre-deployment Checklist](#pre-deployment-checklist)
3. [Configuration](#configuration)
4. [Deployment Process](#deployment-process)
5. [Post-deployment Verification](#post-deployment-verification)
6. [Monitoring and Alerting](#monitoring-and-alerting)
7. [Security Configuration](#security-configuration)
8. [Backup and Disaster Recovery](#backup-and-disaster-recovery)
9. [Troubleshooting](#troubleshooting)
10. [Maintenance](#maintenance)

## Prerequisites

### Required Tools

- **AWS CLI v2+**: [Installation Guide](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)
- **AWS CDK v2+**: `npm install -g aws-cdk`
- **Node.js 18+**: [Download](https://nodejs.org/)
- **Git**: For version control
- **Domain Name**: Registered domain for production use

### AWS Account Requirements

- AWS account with appropriate permissions
- AWS CLI configured with production profile
- Route 53 hosted zone (optional, can be created during deployment)
- SSL certificate (will be created automatically)

### Required AWS Permissions

The deployment user/role needs the following permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "cloudformation:*",
        "s3:*",
        "lambda:*",
        "apigateway:*",
        "dynamodb:*",
        "cognito-idp:*",
        "cognito-identity:*",
        "cloudfront:*",
        "route53:*",
        "acm:*",
        "wafv2:*",
        "guardduty:*",
        "config:*",
        "cloudtrail:*",
        "backup:*",
        "iam:*",
        "logs:*",
        "events:*",
        "sns:*",
        "budgets:*",
        "xray:*",
        "kms:*",
        "secretsmanager:*",
        "ssm:*",
        "codebuild:*",
        "codepipeline:*"
      ],
      "Resource": "*"
    }
  ]
}
```

## Pre-deployment Checklist

### 1. Environment Setup

- [ ] AWS CLI configured with production profile
- [ ] Domain name registered and accessible
- [ ] Email addresses configured for alerts
- [ ] GitHub repository set up for CI/CD
- [ ] Slack webhook URL (optional)

### 2. Configuration Review

- [ ] Update `cdk/config/production.json` with your settings
- [ ] Review security settings in configuration
- [ ] Verify backup retention policies
- [ ] Check budget limits and cost alerts

### 3. Code Preparation

- [ ] All tests passing
- [ ] Code reviewed and approved
- [ ] Security scan completed
- [ ] Documentation updated

## Configuration

### 1. Update Production Configuration

Edit `cdk/config/production.json`:

```json
{
  "environment": "production",
  "region": "ap-northeast-1",
  "domainName": "your-domain.com",
  "certificateArn": "",
  "enableDetailedMonitoring": true,
  "logRetentionDays": 90,
  "lambdaMemorySize": 1024,
  "lambdaTimeout": 30,
  "dynamoDbBillingMode": "ON_DEMAND",
  "enablePointInTimeRecovery": true,
  "removalPolicy": "RETAIN",
  "corsAllowedOrigins": ["https://your-domain.com"],
  "cognitoDomainPrefix": "your-app-prod",
  "enableWaf": true,
  "enableShield": true,
  "enableGuardDuty": true,
  "enableConfig": true,
  "enableCloudTrail": true,
  "backupRetentionDays": 90,
  "budgetLimit": 500,
  "alertEmail": "alerts@your-domain.com",
  "slackWebhookUrl": "https://hooks.slack.com/services/..."
}
```

### 2. Environment Variables

Set the following environment variables or CDK context:

```bash
export CDK_DEFAULT_ACCOUNT="123456789012"
export CDK_DEFAULT_REGION="ap-northeast-1"
```

### 3. GitHub Secrets (for CI/CD)

Add these secrets to your GitHub repository:

- `AWS_ACCESS_KEY_ID`: AWS access key for deployment
- `AWS_SECRET_ACCESS_KEY`: AWS secret key for deployment
- `AWS_REGION`: Target AWS region
- `GITHUB_TOKEN`: GitHub token for repository access

## Deployment Process

### Option 1: Automated Deployment Script

#### For Linux/macOS:
```bash
cd cdk
chmod +x scripts/deploy-production.sh
./scripts/deploy-production.sh
```

#### For Windows (PowerShell):
```powershell
cd cdk
.\scripts\deploy-production.ps1
```

### Option 2: Manual Deployment

1. **Install Dependencies**
   ```bash
   cd cdk
   npm install
   ```

2. **Build and Test**
   ```bash
   npm run build
   npm test
   ```

3. **Deploy Stacks**
   ```bash
   # Deploy main application stack
   cdk deploy OwlNestProduction \
     --profile production \
     --context domainName=your-domain.com \
     --context alertEmail=alerts@your-domain.com \
     --app "npx ts-node bin/production.ts"

   # Deploy monitoring stack
   cdk deploy OwlNestMonitoring \
     --profile production \
     --context domainName=your-domain.com \
     --context alertEmail=alerts@your-domain.com \
     --app "npx ts-node bin/production.ts"

   # Deploy security and backup stack
   cdk deploy OwlNestSecurityBackup \
     --profile production \
     --context domainName=your-domain.com \
     --context alertEmail=alerts@your-domain.com \
     --app "npx ts-node bin/production.ts"

   # Deploy CI/CD pipeline
   cdk deploy OwlNestPipeline \
     --profile production \
     --context domainName=your-domain.com \
     --context alertEmail=alerts@your-domain.com \
     --app "npx ts-node bin/production.ts"
   ```

## Post-deployment Verification

### 1. DNS Configuration

If using an external domain registrar:

1. Get the Route 53 name servers from the hosted zone
2. Update your domain registrar's DNS settings
3. Wait for DNS propagation (up to 48 hours)

### 2. SSL Certificate Validation

1. Check certificate status in AWS Certificate Manager
2. Verify domain validation emails if using email validation
3. Ensure certificate is issued and associated with CloudFront

### 3. Application Testing

1. **Frontend Access**
   - Visit `https://your-domain.com`
   - Verify all pages load correctly
   - Test user registration and login

2. **API Testing**
   - Test API endpoints
   - Verify authentication works
   - Check WebSocket connections

3. **Database Connectivity**
   - Verify DynamoDB tables are created
   - Test CRUD operations
   - Check GSI functionality

### 4. Monitoring Verification

1. **CloudWatch Dashboard**
   - Access the monitoring dashboard
   - Verify metrics are being collected
   - Check alarm configurations

2. **Alert Testing**
   - Trigger a test alarm
   - Verify email notifications
   - Test Slack integration (if configured)

## Monitoring and Alerting

### CloudWatch Dashboards

The deployment creates comprehensive dashboards for:

- **Application Metrics**: User activity, discussions, posts
- **Infrastructure Metrics**: Lambda performance, API Gateway latency
- **Database Metrics**: DynamoDB read/write capacity, throttles
- **Security Metrics**: WAF blocks, GuardDuty findings

### Alarms and Notifications

Automatic alerts are configured for:

- **High Error Rates**: API 5XX errors, Lambda failures
- **Performance Issues**: High latency, timeouts
- **Security Events**: GuardDuty findings, WAF blocks
- **Cost Overruns**: Budget threshold breaches
- **Resource Limits**: DynamoDB throttles, Lambda concurrency

### Custom Metrics

The system tracks custom application metrics:

- Active users (24-hour window)
- Discussions created per day
- Posts created per day
- User engagement rates

## Security Configuration

### Web Application Firewall (WAF)

Configured rules include:

- **AWS Managed Core Rule Set**: Common attack patterns
- **Known Bad Inputs**: Malicious request patterns
- **Rate Limiting**: 2000 requests per 5 minutes per IP
- **Geographic Blocking**: Configurable country restrictions

### GuardDuty

Threat detection for:

- Malicious IP addresses
- Cryptocurrency mining
- Compromised instances
- Data exfiltration attempts

### AWS Config

Compliance monitoring for:

- S3 bucket public access
- DynamoDB encryption
- Lambda function security
- IAM best practices

### CloudTrail

Audit logging for:

- API calls
- Console access
- Resource changes
- Authentication events

## Backup and Disaster Recovery

### Automated Backups

- **DynamoDB**: Point-in-time recovery enabled
- **Daily Backups**: Automated via AWS Backup
- **Weekly Backups**: Long-term retention
- **Cross-region Replication**: For production data

### Recovery Procedures

1. **Database Recovery**
   ```bash
   # Restore from point-in-time
   aws dynamodb restore-table-to-point-in-time \
     --source-table-name owlnest-main-table-production \
     --target-table-name owlnest-main-table-restored \
     --restore-date-time 2024-01-01T00:00:00Z
   ```

2. **Application Recovery**
   - Redeploy CDK stacks
   - Update DNS if needed
   - Verify functionality

### Disaster Recovery Testing

Monthly automated tests verify:

- Backup integrity
- Recovery procedures
- System functionality
- Performance benchmarks

## Troubleshooting

### Common Issues

1. **Certificate Validation Fails**
   - Check domain ownership
   - Verify DNS records
   - Wait for propagation

2. **Stack Deployment Fails**
   - Check AWS permissions
   - Verify resource limits
   - Review CloudFormation events

3. **High Costs**
   - Review CloudWatch metrics
   - Check DynamoDB usage
   - Optimize Lambda memory/timeout

4. **Performance Issues**
   - Monitor CloudWatch dashboards
   - Check DynamoDB throttling
   - Review Lambda cold starts

### Debugging Commands

```bash
# Check stack status
aws cloudformation describe-stacks --stack-name OwlNestProduction

# View stack events
aws cloudformation describe-stack-events --stack-name OwlNestProduction

# Check Lambda logs
aws logs tail /aws/lambda/owlnest-discussion-production --follow

# Monitor DynamoDB metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/DynamoDB \
  --metric-name ConsumedReadCapacityUnits \
  --dimensions Name=TableName,Value=owlnest-main-table-production \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-01T23:59:59Z \
  --period 3600 \
  --statistics Sum
```

## Maintenance

### Regular Tasks

#### Daily
- [ ] Review CloudWatch dashboards
- [ ] Check error logs
- [ ] Monitor cost usage

#### Weekly
- [ ] Review security alerts
- [ ] Check backup status
- [ ] Update dependencies

#### Monthly
- [ ] Security scan
- [ ] Disaster recovery test
- [ ] Performance review
- [ ] Cost optimization

### Updates and Patches

1. **Application Updates**
   - Use CI/CD pipeline for deployments
   - Test in staging first
   - Monitor post-deployment

2. **Infrastructure Updates**
   - Update CDK dependencies
   - Review AWS service updates
   - Plan maintenance windows

3. **Security Updates**
   - Apply security patches
   - Update WAF rules
   - Review access permissions

### Scaling Considerations

- **DynamoDB**: Monitor capacity and adjust as needed
- **Lambda**: Review memory and timeout settings
- **CloudFront**: Consider additional edge locations
- **Backup**: Adjust retention based on compliance needs

## Support and Documentation

### Resources

- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [AWS Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/)
- [AWS Security Best Practices](https://aws.amazon.com/security/security-resources/)

### Getting Help

1. Check CloudWatch logs and metrics
2. Review AWS documentation
3. Contact AWS support for infrastructure issues
4. Use GitHub issues for application problems

---

**Note**: This deployment guide assumes familiarity with AWS services and CDK. Always test deployments in a staging environment before deploying to production.