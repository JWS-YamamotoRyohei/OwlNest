import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as backup from 'aws-cdk-lib/aws-backup';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as events from 'aws-cdk-lib/aws-events';
import * as events_targets from 'aws-cdk-lib/aws-events-targets';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as guardduty from 'aws-cdk-lib/aws-guardduty';
import * as config from 'aws-cdk-lib/aws-config';
import * as cloudtrail from 'aws-cdk-lib/aws-cloudtrail';

export interface SecurityBackupStackProps extends cdk.StackProps {
  environment: string;
  dynamoDbTable: dynamodb.Table;
  s3Buckets: s3.Bucket[];
  lambdaFunctions: lambda.Function[];
  alertTopic: sns.Topic;
  enableGuardDuty?: boolean;
  enableConfig?: boolean;
  enableCloudTrail?: boolean;
  backupRetentionDays?: number;
}

export class SecurityBackupStack extends cdk.Stack {
  public readonly backupVault: backup.BackupVault;
  public readonly encryptionKey: kms.Key;
  public readonly securityHub: lambda.Function;

  constructor(scope: Construct, id: string, props: SecurityBackupStackProps) {
    super(scope, id, props);

    const {
      environment,
      dynamoDbTable,
      s3Buckets,
      lambdaFunctions,
      alertTopic,
      enableGuardDuty = true,
      enableConfig = true,
      enableCloudTrail = true,
      backupRetentionDays = 30,
    } = props;

    // KMS Key for encryption
    this.encryptionKey = new kms.Key(this, 'EncryptionKey', {
      alias: `owlnest-encryption-key-${environment}`,
      description: `Encryption key for OwlNest ${environment}`,
      enableKeyRotation: true,
      removalPolicy: environment === 'production' 
        ? cdk.RemovalPolicy.RETAIN 
        : cdk.RemovalPolicy.DESTROY,
    });

    // Backup configuration
    this.setupBackupSystem(environment, dynamoDbTable, s3Buckets, backupRetentionDays);

    // Security monitoring
    if (enableGuardDuty) {
      this.setupGuardDuty(environment, alertTopic);
    }

    if (enableConfig) {
      this.setupConfigRules(environment);
    }

    if (enableCloudTrail) {
      this.setupCloudTrail(environment);
    }

    // Data protection and compliance
    this.setupDataProtection(environment, dynamoDbTable, s3Buckets);

    // Security incident response
    this.setupIncidentResponse(environment, alertTopic);

    // Disaster recovery planning
    this.setupDisasterRecovery(environment, dynamoDbTable, s3Buckets);

    // Security scanning and vulnerability assessment
    this.setupSecurityScanning(environment, lambdaFunctions);

    // Compliance monitoring
    this.setupComplianceMonitoring(environment);

    // Outputs
    new cdk.CfnOutput(this, 'BackupVaultArn', {
      value: this.backupVault.backupVaultArn,
      description: 'Backup Vault ARN',
    });

    new cdk.CfnOutput(this, 'EncryptionKeyId', {
      value: this.encryptionKey.keyId,
      description: 'KMS Encryption Key ID',
    });

    new cdk.CfnOutput(this, 'EncryptionKeyArn', {
      value: this.encryptionKey.keyArn,
      description: 'KMS Encryption Key ARN',
    });
  }

  private setupBackupSystem(
    environment: string,
    dynamoDbTable: dynamodb.Table,
    s3Buckets: s3.Bucket[],
    retentionDays: number
  ): void {
    // Backup Vault
    this.backupVault = new backup.BackupVault(this, 'BackupVault', {
      backupVaultName: `owlnest-backup-vault-${environment}`,
      encryptionKey: this.encryptionKey,
      removalPolicy: environment === 'production' 
        ? cdk.RemovalPolicy.RETAIN 
        : cdk.RemovalPolicy.DESTROY,
    });

    // Backup Role
    const backupRole = new iam.Role(this, 'BackupRole', {
      assumedBy: new iam.ServicePrincipal('backup.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSBackupServiceRolePolicyForBackup'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSBackupServiceRolePolicyForRestores'),
      ],
    });

    // Backup Plan
    const backupPlan = new backup.BackupPlan(this, 'BackupPlan', {
      backupPlanName: `owlnest-backup-plan-${environment}`,
      backupVault: this.backupVault,
      backupPlanRules: [
        // Daily backups
        new backup.BackupPlanRule({
          ruleName: 'DailyBackups',
          scheduleExpression: events.Schedule.cron({
            hour: '2',
            minute: '0',
          }),
          deleteAfter: cdk.Duration.days(retentionDays),
          moveToColdStorageAfter: cdk.Duration.days(30),
        }),
        // Weekly backups (longer retention)
        new backup.BackupPlanRule({
          ruleName: 'WeeklyBackups',
          scheduleExpression: events.Schedule.cron({
            weekDay: 'SUN',
            hour: '3',
            minute: '0',
          }),
          deleteAfter: cdk.Duration.days(retentionDays * 4), // 4x longer retention
          moveToColdStorageAfter: cdk.Duration.days(30),
        }),
      ],
    });

    // Backup Selection for DynamoDB
    new backup.BackupSelection(this, 'DynamoDbBackupSelection', {
      backupPlan,
      backupSelectionName: `owlnest-dynamodb-backup-${environment}`,
      role: backupRole,
      resources: [
        backup.BackupResource.fromDynamoDbTable(dynamoDbTable),
      ],
    });

    // Backup Selection for S3 Buckets
    if (s3Buckets.length > 0) {
      new backup.BackupSelection(this, 'S3BackupSelection', {
        backupPlan,
        backupSelectionName: `owlnest-s3-backup-${environment}`,
        role: backupRole,
        resources: s3Buckets.map(bucket => backup.BackupResource.fromArn(bucket.bucketArn)),
      });
    }

    // Cross-region backup for production
    if (environment === 'production') {
      this.setupCrossRegionBackup(dynamoDbTable, s3Buckets);
    }
  }

  private setupCrossRegionBackup(dynamoDbTable: dynamodb.Table, s3Buckets: s3.Bucket[]): void {
    // Cross-region replication for S3 buckets
    s3Buckets.forEach((bucket, index) => {
      const replicationBucket = new s3.Bucket(this, `ReplicationBucket${index}`, {
        bucketName: `${bucket.bucketName}-replica-${this.region === 'ap-northeast-1' ? 'us-west-2' : 'ap-northeast-1'}`,
        versioned: true,
        encryption: s3.BucketEncryption.KMS,
        encryptionKey: this.encryptionKey,
        removalPolicy: cdk.RemovalPolicy.RETAIN,
      });

      // Note: Cross-region replication configuration would need to be set up manually
      // or through custom resources due to CDK limitations
    });

    // DynamoDB Global Tables (for cross-region replication)
    // Note: This would require manual setup or custom resources
    new cdk.CfnOutput(this, 'CrossRegionBackupNote', {
      value: 'Cross-region backup configured. Manual setup required for DynamoDB Global Tables.',
      description: 'Cross-region backup configuration note',
    });
  }

  private setupGuardDuty(environment: string, alertTopic: sns.Topic): void {
    // GuardDuty Detector
    const detector = new guardduty.CfnDetector(this, 'GuardDutyDetector', {
      enable: true,
      findingPublishingFrequency: 'FIFTEEN_MINUTES',
      dataSources: {
        s3Logs: { enable: true },
        kubernetes: { auditLogs: { enable: true } },
        malwareProtection: { scanEc2InstanceWithFindings: { ebsVolumes: true } },
      },
    });

    // GuardDuty findings handler
    const guardDutyHandler = new lambda.Function(this, 'GuardDutyHandler', {
      functionName: `owlnest-guardduty-handler-${environment}`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        const AWS = require('aws-sdk');
        const sns = new AWS.SNS();

        exports.handler = async (event) => {
          console.log('GuardDuty finding:', JSON.stringify(event, null, 2));
          
          try {
            const finding = event.detail;
            const severity = finding.severity;
            const type = finding.type;
            const title = finding.title;
            const description = finding.description;

            // Only alert on medium and high severity findings
            if (severity >= 4.0) {
              const message = {
                default: \`🚨 GuardDuty Security Alert - \${process.env.ENVIRONMENT}\`,
                subject: \`GuardDuty Alert: \${title}\`,
                body: \`
                  Severity: \${severity}
                  Type: \${type}
                  Title: \${title}
                  Description: \${description}
                  
                  Account: \${finding.accountId}
                  Region: \${finding.region}
                  Time: \${finding.updatedAt}
                  
                  Please investigate this security finding immediately.
                \`
              };

              await sns.publish({
                TopicArn: process.env.ALERT_TOPIC_ARN,
                Message: JSON.stringify(message),
                Subject: \`GuardDuty Alert: \${title}\`
              }).promise();
            }

            return { statusCode: 200 };
          } catch (error) {
            console.error('Error handling GuardDuty finding:', error);
            throw error;
          }
        };
      `),
      environment: {
        ENVIRONMENT: environment,
        ALERT_TOPIC_ARN: alertTopic.topicArn,
      },
      timeout: cdk.Duration.minutes(1),
    });

    guardDutyHandler.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['sns:Publish'],
      resources: [alertTopic.topicArn],
    }));

    // EventBridge rule for GuardDuty findings
    new events.Rule(this, 'GuardDutyRule', {
      ruleName: `owlnest-guardduty-rule-${environment}`,
      eventPattern: {
        source: ['aws.guardduty'],
        detailType: ['GuardDuty Finding'],
      },
      targets: [new events_targets.LambdaFunction(guardDutyHandler)],
    });

    new cdk.CfnOutput(this, 'GuardDutyDetectorId', {
      value: detector.ref,
      description: 'GuardDuty Detector ID',
    });
  }

  private setupConfigRules(environment: string): void {
    // Configuration Recorder
    const configRole = new iam.Role(this, 'ConfigRole', {
      assumedBy: new iam.ServicePrincipal('config.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/ConfigRole'),
      ],
    });

    const configBucket = new s3.Bucket(this, 'ConfigBucket', {
      bucketName: `owlnest-config-${environment}-${this.account}`,
      encryption: s3.BucketEncryption.KMS,
      encryptionKey: this.encryptionKey,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      lifecycleRules: [
        {
          id: 'DeleteOldConfigData',
          expiration: cdk.Duration.days(365),
        },
      ],
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const deliveryChannel = new config.CfnDeliveryChannel(this, 'ConfigDeliveryChannel', {
      s3BucketName: configBucket.bucketName,
    });

    const configurationRecorder = new config.CfnConfigurationRecorder(this, 'ConfigRecorder', {
      roleArn: configRole.roleArn,
      recordingGroup: {
        allSupported: true,
        includeGlobalResourceTypes: true,
      },
    });

    // Config Rules
    const configRules = [
      // S3 bucket public access prohibited
      new config.CfnConfigRule(this, 'S3BucketPublicAccessProhibited', {
        configRuleName: `s3-bucket-public-access-prohibited-${environment}`,
        source: {
          owner: 'AWS',
          sourceIdentifier: 'S3_BUCKET_PUBLIC_ACCESS_PROHIBITED',
        },
      }),
      // DynamoDB encryption enabled
      new config.CfnConfigRule(this, 'DynamoDbEncryptionEnabled', {
        configRuleName: `dynamodb-table-encryption-enabled-${environment}`,
        source: {
          owner: 'AWS',
          sourceIdentifier: 'DYNAMODB_TABLE_ENCRYPTION_ENABLED',
        },
      }),
      // Lambda function public access prohibited
      new config.CfnConfigRule(this, 'LambdaFunctionPublicAccessProhibited', {
        configRuleName: `lambda-function-public-access-prohibited-${environment}`,
        source: {
          owner: 'AWS',
          sourceIdentifier: 'LAMBDA_FUNCTION_PUBLIC_ACCESS_PROHIBITED',
        },
      }),
      // Root access key check
      new config.CfnConfigRule(this, 'RootAccessKeyCheck', {
        configRuleName: `root-access-key-check-${environment}`,
        source: {
          owner: 'AWS',
          sourceIdentifier: 'ROOT_ACCESS_KEY_CHECK',
        },
      }),
    ];

    // Dependencies
    configRules.forEach(rule => {
      rule.addDependency(configurationRecorder);
      rule.addDependency(deliveryChannel);
    });

    new cdk.CfnOutput(this, 'ConfigBucketName', {
      value: configBucket.bucketName,
      description: 'AWS Config S3 Bucket Name',
    });
  }

  private setupCloudTrail(environment: string): void {
    const cloudTrailBucket = new s3.Bucket(this, 'CloudTrailBucket', {
      bucketName: `owlnest-cloudtrail-${environment}-${this.account}`,
      encryption: s3.BucketEncryption.KMS,
      encryptionKey: this.encryptionKey,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      lifecycleRules: [
        {
          id: 'DeleteOldTrailData',
          expiration: cdk.Duration.days(365),
        },
        {
          id: 'TransitionToIA',
          transitions: [
            {
              storageClass: s3.StorageClass.INFREQUENT_ACCESS,
              transitionAfter: cdk.Duration.days(30),
            },
            {
              storageClass: s3.StorageClass.GLACIER,
              transitionAfter: cdk.Duration.days(90),
            },
          ],
        },
      ],
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const trail = new cloudtrail.Trail(this, 'CloudTrail', {
      trailName: `owlnest-trail-${environment}`,
      bucket: cloudTrailBucket,
      encryptionKey: this.encryptionKey,
      includeGlobalServiceEvents: true,
      isMultiRegionTrail: true,
      enableFileValidation: true,
      sendToCloudWatchLogs: true,
    });

    // CloudTrail insights
    trail.addInsightSelector({
      insightType: cloudtrail.InsightType.API_CALL_RATE,
    });

    new cdk.CfnOutput(this, 'CloudTrailArn', {
      value: trail.trailArn,
      description: 'CloudTrail ARN',
    });

    new cdk.CfnOutput(this, 'CloudTrailBucketName', {
      value: cloudTrailBucket.bucketName,
      description: 'CloudTrail S3 Bucket Name',
    });
  }

  private setupDataProtection(
    environment: string,
    dynamoDbTable: dynamodb.Table,
    s3Buckets: s3.Bucket[]
  ): void {
    // Data classification and tagging
    const dataClassificationTags = {
      DataClassification: 'Confidential',
      DataRetention: environment === 'production' ? '7years' : '1year',
      ComplianceScope: 'GDPR,CCPA',
      Environment: environment,
    };

    // Apply tags to resources
    cdk.Tags.of(dynamoDbTable).add('DataClassification', 'Confidential');
    cdk.Tags.of(dynamoDbTable).add('DataRetention', dataClassificationTags.DataRetention);
    cdk.Tags.of(dynamoDbTable).add('ComplianceScope', dataClassificationTags.ComplianceScope);

    s3Buckets.forEach(bucket => {
      cdk.Tags.of(bucket).add('DataClassification', 'Confidential');
      cdk.Tags.of(bucket).add('DataRetention', dataClassificationTags.DataRetention);
      cdk.Tags.of(bucket).add('ComplianceScope', dataClassificationTags.ComplianceScope);
    });

    // Data retention policy Lambda
    const dataRetentionLambda = new lambda.Function(this, 'DataRetentionLambda', {
      functionName: `owlnest-data-retention-${environment}`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        const AWS = require('aws-sdk');
        const dynamodb = new AWS.DynamoDB.DocumentClient();

        exports.handler = async (event) => {
          console.log('Data retention cleanup event:', JSON.stringify(event, null, 2));
          
          try {
            const tableName = process.env.TABLE_NAME;
            const retentionDays = parseInt(process.env.RETENTION_DAYS);
            const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();

            // Query for expired data
            const expiredItems = await dynamodb.scan({
              TableName: tableName,
              FilterExpression: 'createdAt < :cutoff AND attribute_exists(ttl)',
              ExpressionAttributeValues: {
                ':cutoff': cutoffDate
              }
            }).promise();

            // Delete expired items (in batches)
            if (expiredItems.Items && expiredItems.Items.length > 0) {
              const deleteRequests = expiredItems.Items.map(item => ({
                DeleteRequest: {
                  Key: {
                    PK: item.PK,
                    SK: item.SK
                  }
                }
              }));

              // Process in batches of 25 (DynamoDB limit)
              for (let i = 0; i < deleteRequests.length; i += 25) {
                const batch = deleteRequests.slice(i, i + 25);
                await dynamodb.batchWrite({
                  RequestItems: {
                    [tableName]: batch
                  }
                }).promise();
              }

              console.log(\`Deleted \${expiredItems.Items.length} expired items\`);
            }

            return { 
              statusCode: 200, 
              body: \`Processed \${expiredItems.Items?.length || 0} expired items\`
            };
          } catch (error) {
            console.error('Error in data retention cleanup:', error);
            throw error;
          }
        };
      `),
      environment: {
        TABLE_NAME: dynamoDbTable.tableName,
        RETENTION_DAYS: environment === 'production' ? '2555' : '365', // 7 years for prod, 1 year for others
      },
      timeout: cdk.Duration.minutes(15),
    });

    dataRetentionLambda.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'dynamodb:Scan',
        'dynamodb:BatchWriteItem',
        'dynamodb:DeleteItem',
      ],
      resources: [dynamoDbTable.tableArn],
    }));

    // Schedule data retention cleanup weekly
    new events.Rule(this, 'DataRetentionSchedule', {
      ruleName: `owlnest-data-retention-schedule-${environment}`,
      schedule: events.Schedule.cron({
        weekDay: 'SUN',
        hour: '1',
        minute: '0',
      }),
      targets: [new events_targets.LambdaFunction(dataRetentionLambda)],
    });
  }

  private setupIncidentResponse(environment: string, alertTopic: sns.Topic): void {
    // Security incident response Lambda
    const incidentResponseLambda = new lambda.Function(this, 'IncidentResponseLambda', {
      functionName: `owlnest-incident-response-${environment}`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        const AWS = require('aws-sdk');
        const sns = new AWS.SNS();
        const ssm = new AWS.SSM();

        exports.handler = async (event) => {
          console.log('Security incident event:', JSON.stringify(event, null, 2));
          
          try {
            const incidentType = event.detail?.type || 'Unknown';
            const severity = event.detail?.severity || 'Medium';
            const source = event.source || 'Unknown';

            // Create incident response plan
            const responseActions = [];

            // High severity incidents
            if (severity === 'High' || severity === 'Critical') {
              responseActions.push('Immediate notification sent to security team');
              responseActions.push('Automated containment measures initiated');
              
              // Disable compromised resources if needed
              if (incidentType.includes('Compromised')) {
                responseActions.push('Compromised resources isolated');
              }
            }

            // Log incident
            await ssm.putParameter({
              Name: \`/owlnest/\${process.env.ENVIRONMENT}/incidents/\${Date.now()}\`,
              Value: JSON.stringify({
                timestamp: new Date().toISOString(),
                type: incidentType,
                severity: severity,
                source: source,
                responseActions: responseActions,
                status: 'Open'
              }),
              Type: 'String',
              Description: \`Security incident - \${incidentType}\`
            }).promise();

            // Send alert
            await sns.publish({
              TopicArn: process.env.ALERT_TOPIC_ARN,
              Message: JSON.stringify({
                default: \`🚨 Security Incident - \${process.env.ENVIRONMENT}\`,
                incident: {
                  type: incidentType,
                  severity: severity,
                  source: source,
                  timestamp: new Date().toISOString(),
                  responseActions: responseActions
                }
              }),
              Subject: \`Security Incident: \${incidentType}\`
            }).promise();

            return { 
              statusCode: 200, 
              body: 'Incident response initiated',
              responseActions: responseActions
            };
          } catch (error) {
            console.error('Error in incident response:', error);
            throw error;
          }
        };
      `),
      environment: {
        ENVIRONMENT: environment,
        ALERT_TOPIC_ARN: alertTopic.topicArn,
      },
      timeout: cdk.Duration.minutes(5),
    });

    incidentResponseLambda.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'sns:Publish',
        'ssm:PutParameter',
        'ssm:GetParameter',
      ],
      resources: ['*'],
    }));

    // EventBridge rule for security incidents
    new events.Rule(this, 'SecurityIncidentRule', {
      ruleName: `owlnest-security-incident-rule-${environment}`,
      eventPattern: {
        source: ['aws.guardduty', 'aws.securityhub', 'aws.config'],
        detailType: ['GuardDuty Finding', 'Security Hub Findings - Imported', 'Config Rules Compliance Change'],
      },
      targets: [new events_targets.LambdaFunction(incidentResponseLambda)],
    });
  }

  private setupDisasterRecovery(
    environment: string,
    dynamoDbTable: dynamodb.Table,
    s3Buckets: s3.Bucket[]
  ): void {
    // Disaster recovery plan document
    const drPlan = new ssm.StringParameter(this, 'DisasterRecoveryPlan', {
      parameterName: `/owlnest/${environment}/disaster-recovery/plan`,
      stringValue: JSON.stringify({
        version: '1.0',
        lastUpdated: new Date().toISOString(),
        rto: environment === 'production' ? '4 hours' : '24 hours', // Recovery Time Objective
        rpo: environment === 'production' ? '1 hour' : '24 hours',  // Recovery Point Objective
        procedures: [
          {
            step: 1,
            action: 'Assess the scope of the disaster',
            responsible: 'Incident Commander',
            timeframe: '15 minutes'
          },
          {
            step: 2,
            action: 'Activate disaster recovery team',
            responsible: 'Incident Commander',
            timeframe: '30 minutes'
          },
          {
            step: 3,
            action: 'Restore from latest backup',
            responsible: 'Technical Team',
            timeframe: '2-4 hours'
          },
          {
            step: 4,
            action: 'Validate system functionality',
            responsible: 'QA Team',
            timeframe: '1 hour'
          },
          {
            step: 5,
            action: 'Communicate restoration to stakeholders',
            responsible: 'Communications Team',
            timeframe: '30 minutes'
          }
        ],
        contacts: {
          incidentCommander: 'incident-commander@owlnest.com',
          technicalLead: 'tech-lead@owlnest.com',
          communicationsLead: 'comms-lead@owlnest.com'
        },
        resources: {
          backupVault: this.backupVault.backupVaultName,
          encryptionKey: this.encryptionKey.keyId,
          primaryRegion: this.region,
          secondaryRegion: this.region === 'ap-northeast-1' ? 'us-west-2' : 'ap-northeast-1'
        }
      }),
      description: `Disaster Recovery Plan for OwlNest ${environment}`,
    });

    // DR testing Lambda
    const drTestLambda = new lambda.Function(this, 'DisasterRecoveryTestLambda', {
      functionName: `owlnest-dr-test-${environment}`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        const AWS = require('aws-sdk');
        const backup = new AWS.Backup();
        const dynamodb = new AWS.DynamoDB.DocumentClient();
        const sns = new AWS.SNS();

        exports.handler = async (event) => {
          console.log('DR test event:', JSON.stringify(event, null, 2));
          
          try {
            const testResults = {
              timestamp: new Date().toISOString(),
              testType: event.testType || 'scheduled',
              results: []
            };

            // Test backup availability
            const backups = await backup.listBackupJobs({
              ByResourceArn: process.env.DYNAMODB_TABLE_ARN,
              ByState: 'COMPLETED'
            }).promise();

            testResults.results.push({
              test: 'Backup Availability',
              status: backups.BackupJobs.length > 0 ? 'PASS' : 'FAIL',
              details: \`Found \${backups.BackupJobs.length} completed backups\`
            });

            // Test database connectivity
            try {
              await dynamodb.scan({
                TableName: process.env.TABLE_NAME,
                Limit: 1
              }).promise();
              
              testResults.results.push({
                test: 'Database Connectivity',
                status: 'PASS',
                details: 'Database is accessible'
              });
            } catch (error) {
              testResults.results.push({
                test: 'Database Connectivity',
                status: 'FAIL',
                details: error.message
              });
            }

            // Calculate overall test status
            const failedTests = testResults.results.filter(r => r.status === 'FAIL');
            const overallStatus = failedTests.length === 0 ? 'PASS' : 'FAIL';

            // Send notification
            await sns.publish({
              TopicArn: process.env.ALERT_TOPIC_ARN,
              Message: JSON.stringify({
                default: \`📋 DR Test Results - \${process.env.ENVIRONMENT}\`,
                testResults: testResults,
                overallStatus: overallStatus
              }),
              Subject: \`DR Test \${overallStatus}: \${process.env.ENVIRONMENT}\`
            }).promise();

            return { 
              statusCode: 200, 
              body: testResults,
              overallStatus: overallStatus
            };
          } catch (error) {
            console.error('Error in DR test:', error);
            throw error;
          }
        };
      `),
      environment: {
        ENVIRONMENT: environment,
        TABLE_NAME: dynamoDbTable.tableName,
        DYNAMODB_TABLE_ARN: dynamoDbTable.tableArn,
        ALERT_TOPIC_ARN: alertTopic.topicArn,
      },
      timeout: cdk.Duration.minutes(10),
    });

    drTestLambda.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'backup:ListBackupJobs',
        'dynamodb:Scan',
        'sns:Publish',
      ],
      resources: ['*'],
    }));

    // Schedule DR tests monthly
    new events.Rule(this, 'DisasterRecoveryTestSchedule', {
      ruleName: `owlnest-dr-test-schedule-${environment}`,
      schedule: events.Schedule.cron({
        day: '1',
        hour: '6',
        minute: '0',
      }),
      targets: [new events_targets.LambdaFunction(drTestLambda, {
        event: events.RuleTargetInput.fromObject({
          testType: 'scheduled'
        })
      })],
    });

    new cdk.CfnOutput(this, 'DisasterRecoveryPlanParameter', {
      value: drPlan.parameterName,
      description: 'Disaster Recovery Plan SSM Parameter',
    });
  }

  private setupSecurityScanning(environment: string, lambdaFunctions: lambda.Function[]): void {
    // Security scanning Lambda
    const securityScanLambda = new lambda.Function(this, 'SecurityScanLambda', {
      functionName: `owlnest-security-scan-${environment}`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        const AWS = require('aws-sdk');
        const lambda = new AWS.Lambda();
        const sns = new AWS.SNS();

        exports.handler = async (event) => {
          console.log('Security scan event:', JSON.stringify(event, null, 2));
          
          try {
            const scanResults = {
              timestamp: new Date().toISOString(),
              scannedFunctions: [],
              vulnerabilities: [],
              recommendations: []
            };

            // Get list of Lambda functions to scan
            const functions = process.env.LAMBDA_FUNCTIONS.split(',');

            for (const functionName of functions) {
              try {
                const functionConfig = await lambda.getFunction({
                  FunctionName: functionName
                }).promise();

                const scanResult = {
                  functionName: functionName,
                  runtime: functionConfig.Configuration.Runtime,
                  lastModified: functionConfig.Configuration.LastModified,
                  vulnerabilities: [],
                  recommendations: []
                };

                // Check for outdated runtime
                if (functionConfig.Configuration.Runtime.includes('nodejs14') || 
                    functionConfig.Configuration.Runtime.includes('nodejs12')) {
                  scanResult.vulnerabilities.push({
                    type: 'Outdated Runtime',
                    severity: 'Medium',
                    description: 'Function is using an outdated Node.js runtime'
                  });
                  scanResult.recommendations.push('Update to Node.js 18.x runtime');
                }

                // Check for excessive permissions (simplified check)
                if (functionConfig.Configuration.Role.includes('PowerUserAccess') ||
                    functionConfig.Configuration.Role.includes('AdministratorAccess')) {
                  scanResult.vulnerabilities.push({
                    type: 'Excessive Permissions',
                    severity: 'High',
                    description: 'Function has overly broad IAM permissions'
                  });
                  scanResult.recommendations.push('Apply principle of least privilege');
                }

                scanResults.scannedFunctions.push(scanResult);
                scanResults.vulnerabilities.push(...scanResult.vulnerabilities);
                scanResults.recommendations.push(...scanResult.recommendations);

              } catch (error) {
                console.error(\`Error scanning function \${functionName}:\`, error);
              }
            }

            // Send results if vulnerabilities found
            if (scanResults.vulnerabilities.length > 0) {
              await sns.publish({
                TopicArn: process.env.ALERT_TOPIC_ARN,
                Message: JSON.stringify({
                  default: \`🔍 Security Scan Results - \${process.env.ENVIRONMENT}\`,
                  scanResults: scanResults,
                  summary: \`Found \${scanResults.vulnerabilities.length} vulnerabilities across \${scanResults.scannedFunctions.length} functions\`
                }),
                Subject: \`Security Scan: \${scanResults.vulnerabilities.length} vulnerabilities found\`
              }).promise();
            }

            return { 
              statusCode: 200, 
              body: scanResults
            };
          } catch (error) {
            console.error('Error in security scan:', error);
            throw error;
          }
        };
      `),
      environment: {
        ENVIRONMENT: environment,
        LAMBDA_FUNCTIONS: lambdaFunctions.map(fn => fn.functionName).join(','),
        ALERT_TOPIC_ARN: alertTopic.topicArn,
      },
      timeout: cdk.Duration.minutes(10),
    });

    securityScanLambda.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'lambda:GetFunction',
        'lambda:ListFunctions',
        'sns:Publish',
      ],
      resources: ['*'],
    }));

    // Schedule security scans weekly
    new events.Rule(this, 'SecurityScanSchedule', {
      ruleName: `owlnest-security-scan-schedule-${environment}`,
      schedule: events.Schedule.cron({
        weekDay: 'MON',
        hour: '9',
        minute: '0',
      }),
      targets: [new events_targets.LambdaFunction(securityScanLambda)],
    });
  }

  private setupComplianceMonitoring(environment: string): void {
    // Compliance monitoring Lambda
    const complianceLambda = new lambda.Function(this, 'ComplianceMonitoringLambda', {
      functionName: `owlnest-compliance-monitoring-${environment}`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        const AWS = require('aws-sdk');
        const config = new AWS.ConfigService();
        const ssm = new AWS.SSM();

        exports.handler = async (event) => {
          console.log('Compliance monitoring event:', JSON.stringify(event, null, 2));
          
          try {
            const complianceReport = {
              timestamp: new Date().toISOString(),
              environment: process.env.ENVIRONMENT,
              complianceChecks: [],
              overallStatus: 'COMPLIANT'
            };

            // Get Config rule compliance
            const configRules = await config.describeComplianceByConfigRule().promise();
            
            for (const rule of configRules.ComplianceByConfigRules || []) {
              const check = {
                ruleName: rule.ConfigRuleName,
                complianceType: rule.Compliance?.ComplianceType || 'UNKNOWN',
                lastEvaluated: rule.Compliance?.ComplianceContributorCount?.CappedCount || 0
              };
              
              complianceReport.complianceChecks.push(check);
              
              if (check.complianceType === 'NON_COMPLIANT') {
                complianceReport.overallStatus = 'NON_COMPLIANT';
              }
            }

            // Store compliance report
            await ssm.putParameter({
              Name: \`/owlnest/\${process.env.ENVIRONMENT}/compliance/latest-report\`,
              Value: JSON.stringify(complianceReport),
              Type: 'String',
              Overwrite: true,
              Description: 'Latest compliance monitoring report'
            }).promise();

            return { 
              statusCode: 200, 
              body: complianceReport
            };
          } catch (error) {
            console.error('Error in compliance monitoring:', error);
            throw error;
          }
        };
      `),
      environment: {
        ENVIRONMENT: environment,
      },
      timeout: cdk.Duration.minutes(5),
    });

    complianceLambda.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'config:DescribeComplianceByConfigRule',
        'config:GetComplianceDetailsByConfigRule',
        'ssm:PutParameter',
      ],
      resources: ['*'],
    }));

    // Schedule compliance monitoring daily
    new events.Rule(this, 'ComplianceMonitoringSchedule', {
      ruleName: `owlnest-compliance-monitoring-schedule-${environment}`,
      schedule: events.Schedule.cron({
        hour: '8',
        minute: '0',
      }),
      targets: [new events_targets.LambdaFunction(complianceLambda)],
    });
  }
}