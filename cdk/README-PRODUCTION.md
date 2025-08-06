# OwlNest Production Infrastructure

This directory contains the AWS CDK infrastructure code for deploying OwlNest to production with comprehensive monitoring, security, and backup capabilities.

## 🏗️ Architecture Overview

The production deployment consists of four main stacks:

1. **ProductionStack** - Main application infrastructure
2. **MonitoringStack** - CloudWatch dashboards, alarms, and alerting
3. **SecurityBackupStack** - Security controls, backups, and compliance
4. **PipelineStack** - CI/CD pipeline for automated deployments

## 📁 Directory Structure

```
cdk/
├── bin/
│   ├── cdk.ts              # Standard deployment entry point
│   └── production.ts       # Production deployment entry point
├── lib/
│   ├── owlnest-stack.ts    # Base application stack
│   ├── production-stack.ts # Enhanced production stack
│   ├── monitoring-stack.ts # Monitoring and alerting
│   ├── security-backup-stack.ts # Security and backup
│   └── pipeline-stack.ts   # CI/CD pipeline
├── config/
│   ├── development.json    # Development configuration
│   ├── staging.json        # Staging configuration
│   └── production.json     # Production configuration
├── scripts/
│   ├── deploy-production.sh   # Linux/macOS deployment script
│   └── deploy-production.ps1  # Windows PowerShell deployment script
└── lambda/                 # Lambda function source code
```

## 🚀 Quick Start

### Prerequisites

1. **AWS CLI v2+** configured with production credentials
2. **AWS CDK v2+** installed globally (`npm install -g aws-cdk`)
3. **Node.js 18+**
4. **Domain name** registered for production use

### Configuration

1. Update `config/production.json` with your settings:

```json
{
  "domainName": "your-domain.com",
  "alertEmail": "alerts@your-domain.com",
  "budgetLimit": 500
}
```

2. Set environment variables:

```bash
export CDK_DEFAULT_ACCOUNT="123456789012"
export CDK_DEFAULT_REGION="ap-northeast-1"
```

### Deployment

#### Option 1: Automated Script

**Linux/macOS:**
```bash
chmod +x scripts/deploy-production.sh
./scripts/deploy-production.sh
```

**Windows PowerShell:**
```powershell
.\scripts\deploy-production.ps1
```

#### Option 2: Manual Deployment

```bash
# Install dependencies
npm install

# Build and test
npm run build
npm test

# Deploy all stacks
cdk deploy --all \
  --context environment=production \
  --context domainName=your-domain.com \
  --context alertEmail=alerts@your-domain.com \
  --app "npx ts-node bin/production.ts"
```

## 🏛️ Infrastructure Components

### Core Services

- **Amazon S3** - Static website hosting and file storage
- **Amazon CloudFront** - Global CDN with custom domain
- **AWS Lambda** - Serverless compute for API functions
- **Amazon API Gateway** - REST and WebSocket APIs
- **Amazon DynamoDB** - NoSQL database with GSI
- **Amazon Cognito** - User authentication and authorization

### Security & Compliance

- **AWS WAF** - Web application firewall protection
- **AWS Shield Advanced** - DDoS protection
- **Amazon GuardDuty** - Threat detection
- **AWS Config** - Compliance monitoring
- **AWS CloudTrail** - Audit logging
- **AWS KMS** - Encryption key management

### Monitoring & Alerting

- **Amazon CloudWatch** - Metrics, logs, and dashboards
- **AWS X-Ray** - Distributed tracing
- **Amazon SNS** - Alert notifications
- **AWS Budgets** - Cost monitoring and alerts
- **Custom Metrics** - Application-specific monitoring

### Backup & Recovery

- **AWS Backup** - Automated backup service
- **DynamoDB Point-in-Time Recovery** - Database backup
- **Cross-region Replication** - Disaster recovery
- **Automated Testing** - DR procedure validation

## 📊 Monitoring & Dashboards

### CloudWatch Dashboards

Access your monitoring dashboards:

1. **Main Dashboard**: Application metrics and health
2. **Infrastructure Dashboard**: AWS service metrics
3. **Security Dashboard**: Security events and compliance
4. **Cost Dashboard**: Spending and budget tracking

### Key Metrics

- **Application Metrics**
  - Active users (24-hour window)
  - Discussions created per day
  - Posts created per day
  - User engagement rates

- **Performance Metrics**
  - API response times
  - Lambda duration and errors
  - DynamoDB read/write capacity
  - CloudFront cache hit ratio

- **Security Metrics**
  - WAF blocked requests
  - GuardDuty findings
  - Failed authentication attempts
  - Unusual access patterns

### Alerting

Automatic alerts are configured for:

- ❌ **High Error Rates** - API 5XX errors, Lambda failures
- ⏱️ **Performance Issues** - High latency, timeouts
- 🔒 **Security Events** - GuardDuty findings, WAF blocks
- 💰 **Cost Overruns** - Budget threshold breaches
- 📊 **Resource Limits** - DynamoDB throttles, Lambda concurrency

## 🔒 Security Features

### Web Application Firewall (WAF)

- **AWS Managed Core Rule Set** - Common attack patterns
- **Known Bad Inputs Rule Set** - Malicious request patterns
- **Rate Limiting** - 2000 requests per 5 minutes per IP
- **Geographic Blocking** - Configurable country restrictions

### Threat Detection

- **GuardDuty** - Machine learning-based threat detection
- **Config Rules** - Compliance monitoring
- **CloudTrail** - API call auditing
- **VPC Flow Logs** - Network traffic analysis

### Data Protection

- **Encryption at Rest** - All data encrypted with KMS
- **Encryption in Transit** - HTTPS/TLS everywhere
- **Access Controls** - IAM roles with least privilege
- **Data Classification** - Automated tagging and retention

## 💾 Backup & Disaster Recovery

### Backup Strategy

- **Daily Backups** - Automated via AWS Backup
- **Weekly Long-term Backups** - Extended retention
- **Point-in-Time Recovery** - DynamoDB PITR enabled
- **Cross-region Replication** - For critical data

### Recovery Procedures

1. **Database Recovery**
   - Restore from point-in-time backup
   - Validate data integrity
   - Update application configuration

2. **Application Recovery**
   - Redeploy CDK stacks
   - Update DNS records if needed
   - Verify all functionality

3. **Disaster Recovery Testing**
   - Monthly automated tests
   - Backup integrity verification
   - Recovery time measurement

## 🔄 CI/CD Pipeline

### Pipeline Stages

1. **Source** - GitHub repository trigger
2. **Build** - Compile, test, and package
3. **Deploy** - Infrastructure and application deployment
4. **Test** - Post-deployment verification
5. **Notify** - Success/failure notifications

### Deployment Environments

- **Development** - Feature development and testing
- **Staging** - Pre-production validation
- **Production** - Live environment with full monitoring

### Pipeline Features

- **Automated Testing** - Unit, integration, and E2E tests
- **Security Scanning** - Vulnerability assessment
- **Infrastructure as Code** - CDK-based deployments
- **Rollback Capability** - Quick reversion on issues
- **Manual Approval** - Production deployment gates

## 💰 Cost Optimization

### Cost-Effective Architecture

- **Serverless Services** - Pay only for usage
- **On-Demand Billing** - DynamoDB and Lambda scaling
- **CloudFront Caching** - Reduced origin requests
- **S3 Intelligent Tiering** - Automatic storage optimization

### Cost Monitoring

- **Budget Alerts** - Threshold-based notifications
- **Cost Dashboards** - Real-time spending visibility
- **Resource Tagging** - Detailed cost allocation
- **Usage Analytics** - Optimization recommendations

### Estimated Monthly Costs

| Service | Estimated Cost |
|---------|----------------|
| Lambda | $10-50 |
| DynamoDB | $20-100 |
| CloudFront | $5-25 |
| S3 | $5-20 |
| API Gateway | $10-40 |
| Monitoring | $10-30 |
| **Total** | **$60-265** |

*Costs vary based on usage patterns and data volume*

## 🛠️ Maintenance & Operations

### Regular Tasks

#### Daily
- [ ] Review CloudWatch dashboards
- [ ] Check error logs and alerts
- [ ] Monitor cost usage

#### Weekly
- [ ] Review security alerts
- [ ] Check backup status
- [ ] Update dependencies

#### Monthly
- [ ] Security vulnerability scan
- [ ] Disaster recovery test
- [ ] Performance review
- [ ] Cost optimization review

### Troubleshooting

#### Common Issues

1. **Certificate Validation Fails**
   ```bash
   # Check certificate status
   aws acm describe-certificate --certificate-arn <arn>
   ```

2. **High DynamoDB Costs**
   ```bash
   # Check table metrics
   aws cloudwatch get-metric-statistics \
     --namespace AWS/DynamoDB \
     --metric-name ConsumedReadCapacityUnits
   ```

3. **Lambda Cold Starts**
   ```bash
   # Check function metrics
   aws logs tail /aws/lambda/function-name --follow
   ```

#### Debugging Commands

```bash
# Stack status
aws cloudformation describe-stacks --stack-name OwlNestProduction

# Stack events
aws cloudformation describe-stack-events --stack-name OwlNestProduction

# Lambda logs
aws logs tail /aws/lambda/owlnest-discussion-production --follow

# DynamoDB metrics
aws dynamodb describe-table --table-name owlnest-main-table-production
```

## 📚 Documentation

- [Production Deployment Guide](../docs/production-deployment.md)
- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [AWS Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/)

## 🆘 Support

### Getting Help

1. **Check Logs** - CloudWatch logs and metrics
2. **Review Documentation** - AWS and CDK docs
3. **AWS Support** - For infrastructure issues
4. **GitHub Issues** - For application problems

### Emergency Contacts

- **Technical Lead**: tech-lead@your-domain.com
- **DevOps Team**: devops@your-domain.com
- **On-Call**: oncall@your-domain.com

---

## 🎯 Next Steps

After successful deployment:

1. 🌐 **Configure DNS** - Point your domain to CloudFront
2. 📧 **Verify Alerts** - Test email and Slack notifications
3. 🧪 **Run Tests** - Validate all functionality
4. 📊 **Review Dashboards** - Check monitoring setup
5. 🔒 **Security Review** - Verify all security controls
6. 💾 **Test Backups** - Validate backup and restore procedures

**🎉 Congratulations! Your OwlNest production environment is ready!**