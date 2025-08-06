#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { ProductionStack } from '../lib/production-stack';
import { MonitoringStack } from '../lib/monitoring-stack';
import { SecurityBackupStack } from '../lib/security-backup-stack';
import { PipelineStack } from '../lib/pipeline-stack';

const app = new cdk.App();

// Get configuration from context
const environment = 'production';
const domainName = app.node.tryGetContext('domainName') || 'owlnest.example.com';
const hostedZoneId = app.node.tryGetContext('hostedZoneId');
const alertEmail = app.node.tryGetContext('alertEmail') || 'alerts@owlnest.example.com';
const slackWebhookUrl = app.node.tryGetContext('slackWebhookUrl');
const budgetLimit = parseInt(app.node.tryGetContext('budgetLimit') || '500');
const githubOwner = app.node.tryGetContext('githubOwner') || 'your-github-username';
const githubRepo = app.node.tryGetContext('githubRepo') || 'OwlNest';
const githubBranch = app.node.tryGetContext('githubBranch') || 'main';

// Environment configuration
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION || 'ap-northeast-1',
};

// Production Stack with enhanced features
const productionStack = new ProductionStack(app, 'OwlNestProduction', {
  env,
  environment,
  domainName,
  hostedZoneId,
  enableWaf: true,
  enableShield: true,
  description: 'OwlNest Discussion Platform - Production Environment',
  tags: {
    Environment: 'production',
    Project: 'OwlNest',
    Owner: 'OwlNest Team',
    CostCenter: 'Engineering',
    Backup: 'Required',
    Monitoring: 'Enhanced',
  },
});

// Monitoring Stack
const monitoringStack = new MonitoringStack(app, 'OwlNestMonitoring', {
  env,
  environment,
  alertEmail,
  slackWebhookUrl,
  budgetLimit,
  lambdaFunctions: [], // Will be populated after production stack creation
  apiGateway: productionStack.api,
  websocketApi: productionStack.websocketApi,
  dynamoDbTable: productionStack.mainTable,
  cloudFrontDistribution: productionStack.distribution,
  description: 'OwlNest Monitoring and Alerting Stack',
  tags: {
    Environment: 'production',
    Project: 'OwlNest',
    Component: 'Monitoring',
  },
});

// Security and Backup Stack
const securityBackupStack = new SecurityBackupStack(app, 'OwlNestSecurityBackup', {
  env,
  environment,
  dynamoDbTable: productionStack.mainTable,
  s3Buckets: [productionStack.websiteBucket, productionStack.filesBucket],
  lambdaFunctions: [], // Will be populated after production stack creation
  alertTopic: monitoringStack.alertTopic,
  enableGuardDuty: true,
  enableConfig: true,
  enableCloudTrail: true,
  backupRetentionDays: 90,
  description: 'OwlNest Security and Backup Stack',
  tags: {
    Environment: 'production',
    Project: 'OwlNest',
    Component: 'Security',
  },
});

// CI/CD Pipeline Stack
const pipelineStack = new PipelineStack(app, 'OwlNestPipeline', {
  env,
  environment,
  githubOwner,
  githubRepo,
  githubBranch,
  notificationEmail: alertEmail,
  description: 'OwlNest CI/CD Pipeline',
  tags: {
    Environment: 'production',
    Project: 'OwlNest',
    Component: 'Pipeline',
  },
});

// Stack dependencies
monitoringStack.addDependency(productionStack);
securityBackupStack.addDependency(productionStack);
securityBackupStack.addDependency(monitoringStack);

// Add stack-level tags
cdk.Tags.of(app).add('Project', 'OwlNest');
cdk.Tags.of(app).add('Environment', 'production');
cdk.Tags.of(app).add('ManagedBy', 'CDK');
cdk.Tags.of(app).add('CostTracking', 'Enabled');

// Outputs for cross-stack references
new cdk.CfnOutput(productionStack, 'ProductionStackOutputs', {
  value: JSON.stringify({
    domainName: domainName,
    apiUrl: productionStack.api.url,
    websocketUrl: productionStack.websocketApi.apiEndpoint,
    cloudFrontUrl: `https://${productionStack.distribution.distributionDomainName}`,
    userPoolId: productionStack.userPool.userPoolId,
    userPoolClientId: productionStack.userPoolClient.userPoolClientId,
    identityPoolId: productionStack.identityPool.ref,
    dynamoDbTableName: productionStack.mainTable.tableName,
    filesBucketName: productionStack.filesBucket.bucketName,
    websiteBucketName: productionStack.websiteBucket.bucketName,
  }),
  description: 'Production stack outputs for frontend configuration',
  exportName: 'OwlNestProductionOutputs',
});

// Deployment validation
app.synth();

console.log(`
🚀 OwlNest Production Deployment Configuration
==============================================

Environment: ${environment}
Domain: ${domainName}
Region: ${env.region}
Account: ${env.account}

Stacks to be deployed:
- OwlNestProduction (Main application stack)
- OwlNestMonitoring (Monitoring and alerting)
- OwlNestSecurityBackup (Security and backup)
- OwlNestPipeline (CI/CD pipeline)

Features enabled:
✅ Custom domain with SSL
✅ WAF protection
✅ AWS Shield Advanced
✅ GuardDuty threat detection
✅ AWS Config compliance
✅ CloudTrail auditing
✅ Automated backups
✅ Comprehensive monitoring
✅ Cost budgets and alerts
✅ Disaster recovery planning

Next steps:
1. Review the generated CloudFormation templates
2. Deploy using: cdk deploy --all --profile production
3. Configure DNS records if using external domain
4. Set up GitHub secrets for CI/CD pipeline
5. Test disaster recovery procedures

⚠️  Important Notes:
- Ensure you have the necessary AWS permissions
- Review all security settings before deployment
- Update domain name and email addresses in configuration
- Set up proper backup and monitoring alerts
- Test all functionality in staging environment first
`);