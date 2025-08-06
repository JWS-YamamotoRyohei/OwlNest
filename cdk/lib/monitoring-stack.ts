import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as sns_subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as cloudwatch_actions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as events from 'aws-cdk-lib/aws-events';
import * as events_targets from 'aws-cdk-lib/aws-events-targets';
import * as budgets from 'aws-cdk-lib/aws-budgets';
import * as xray from 'aws-cdk-lib/aws-xray';

export interface MonitoringStackProps extends cdk.StackProps {
  environment: string;
  alertEmail?: string;
  slackWebhookUrl?: string;
  budgetLimit?: number;
  lambdaFunctions: lambda.Function[];
  apiGateway: cdk.aws_apigateway.RestApi;
  websocketApi: cdk.aws_apigatewayv2.WebSocketApi;
  dynamoDbTable: cdk.aws_dynamodb.Table;
  cloudFrontDistribution: cdk.aws_cloudfront.Distribution;
}

export class MonitoringStack extends cdk.Stack {
  public readonly dashboard: cloudwatch.Dashboard;
  public readonly alertTopic: sns.Topic;
  public readonly logGroup: logs.LogGroup;

  constructor(scope: Construct, id: string, props: MonitoringStackProps) {
    super(scope, id, props);

    const { 
      environment, 
      alertEmail, 
      slackWebhookUrl, 
      budgetLimit = 100,
      lambdaFunctions,
      apiGateway,
      websocketApi,
      dynamoDbTable,
      cloudFrontDistribution
    } = props;

    // SNS Topic for alerts
    this.alertTopic = new sns.Topic(this, 'AlertTopic', {
      topicName: `owlnest-alerts-${environment}`,
      displayName: `OwlNest Alerts - ${environment}`,
    });

    if (alertEmail) {
      this.alertTopic.addSubscription(
        new sns_subscriptions.EmailSubscription(alertEmail)
      );
    }

    // Slack integration Lambda (if webhook URL provided)
    if (slackWebhookUrl) {
      this.createSlackIntegration(slackWebhookUrl, environment);
    }

    // Centralized log group
    this.logGroup = new logs.LogGroup(this, 'CentralLogGroup', {
      logGroupName: `/aws/owlnest/${environment}/application`,
      retention: this.getLogRetention(environment),
      removalPolicy: environment === 'production' 
        ? cdk.RemovalPolicy.RETAIN 
        : cdk.RemovalPolicy.DESTROY,
    });

    // X-Ray tracing
    this.setupXRayTracing(environment);

    // CloudWatch Dashboard
    this.dashboard = this.createDashboard(environment, {
      lambdaFunctions,
      apiGateway,
      websocketApi,
      dynamoDbTable,
      cloudFrontDistribution,
    });

    // CloudWatch Alarms
    this.createAlarms(environment, {
      lambdaFunctions,
      apiGateway,
      websocketApi,
      dynamoDbTable,
      cloudFrontDistribution,
    });

    // Cost monitoring
    this.createBudgetAlerts(environment, budgetLimit);

    // Custom metrics and log insights
    this.setupCustomMetrics(environment);

    // Error tracking and alerting
    this.setupErrorTracking(environment, lambdaFunctions);

    // Performance monitoring
    this.setupPerformanceMonitoring(environment, {
      lambdaFunctions,
      apiGateway,
      dynamoDbTable,
    });

    // Outputs
    new cdk.CfnOutput(this, 'DashboardUrl', {
      value: `https://${this.region}.console.aws.amazon.com/cloudwatch/home?region=${this.region}#dashboards:name=${this.dashboard.dashboardName}`,
      description: 'CloudWatch Dashboard URL',
    });

    new cdk.CfnOutput(this, 'AlertTopicArn', {
      value: this.alertTopic.topicArn,
      description: 'SNS Alert Topic ARN',
    });

    new cdk.CfnOutput(this, 'LogGroupName', {
      value: this.logGroup.logGroupName,
      description: 'Central Log Group Name',
    });
  }

  private createSlackIntegration(webhookUrl: string, environment: string): void {
    const slackLambda = new lambda.Function(this, 'SlackNotificationLambda', {
      functionName: `owlnest-slack-notifications-${environment}`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        const https = require('https');
        const url = require('url');

        exports.handler = async (event) => {
          console.log('Received event:', JSON.stringify(event, null, 2));
          
          const message = JSON.parse(event.Records[0].Sns.Message);
          const webhookUrl = process.env.SLACK_WEBHOOK_URL;
          
          const slackMessage = {
            text: \`🚨 OwlNest Alert - \${process.env.ENVIRONMENT}\`,
            attachments: [
              {
                color: message.NewStateValue === 'ALARM' ? 'danger' : 'good',
                fields: [
                  {
                    title: 'Alarm Name',
                    value: message.AlarmName,
                    short: true
                  },
                  {
                    title: 'State',
                    value: message.NewStateValue,
                    short: true
                  },
                  {
                    title: 'Reason',
                    value: message.NewStateReason,
                    short: false
                  },
                  {
                    title: 'Timestamp',
                    value: message.StateChangeTime,
                    short: true
                  }
                ]
              }
            ]
          };

          const options = {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            }
          };

          return new Promise((resolve, reject) => {
            const req = https.request(webhookUrl, options, (res) => {
              resolve({ statusCode: res.statusCode });
            });

            req.on('error', (e) => {
              reject(e);
            });

            req.write(JSON.stringify(slackMessage));
            req.end();
          });
        };
      `),
      environment: {
        SLACK_WEBHOOK_URL: webhookUrl,
        ENVIRONMENT: environment,
      },
      timeout: cdk.Duration.seconds(30),
    });

    this.alertTopic.addSubscription(
      new sns_subscriptions.LambdaSubscription(slackLambda)
    );
  }

  private setupXRayTracing(environment: string): void {
    // X-Ray service map
    new xray.CfnSamplingRule(this, 'XRaySamplingRule', {
      samplingRule: {
        ruleName: `owlnest-sampling-rule-${environment}`,
        priority: 9000,
        fixedRate: environment === 'production' ? 0.1 : 0.5,
        reservoirSize: 1,
        serviceName: 'owlnest',
        serviceType: '*',
        host: '*',
        httpMethod: '*',
        urlPath: '*',
        version: 1,
      },
    });
  }

  private createDashboard(
    environment: string,
    resources: {
      lambdaFunctions: lambda.Function[];
      apiGateway: cdk.aws_apigateway.RestApi;
      websocketApi: cdk.aws_apigatewayv2.WebSocketApi;
      dynamoDbTable: cdk.aws_dynamodb.Table;
      cloudFrontDistribution: cdk.aws_cloudfront.Distribution;
    }
  ): cloudwatch.Dashboard {
    const dashboard = new cloudwatch.Dashboard(this, 'Dashboard', {
      dashboardName: `owlnest-${environment}`,
    });

    // API Gateway metrics
    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'API Gateway - Requests',
        left: [
          resources.apiGateway.metricCount(),
          resources.apiGateway.metric4XXError(),
          resources.apiGateway.metric5XXError(),
        ],
        width: 12,
        height: 6,
      }),
      new cloudwatch.GraphWidget({
        title: 'API Gateway - Latency',
        left: [
          resources.apiGateway.metricLatency(),
          resources.apiGateway.metricIntegrationLatency(),
        ],
        width: 12,
        height: 6,
      })
    );

    // Lambda metrics
    const lambdaWidgets = resources.lambdaFunctions.map((fn, index) => 
      new cloudwatch.GraphWidget({
        title: `Lambda - ${fn.functionName}`,
        left: [
          fn.metricInvocations(),
          fn.metricErrors(),
          fn.metricThrottles(),
        ],
        right: [fn.metricDuration()],
        width: 8,
        height: 6,
      })
    );
    dashboard.addWidgets(...lambdaWidgets);

    // DynamoDB metrics
    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'DynamoDB - Read/Write Capacity',
        left: [
          resources.dynamoDbTable.metricConsumedReadCapacityUnits(),
          resources.dynamoDbTable.metricConsumedWriteCapacityUnits(),
        ],
        width: 12,
        height: 6,
      }),
      new cloudwatch.GraphWidget({
        title: 'DynamoDB - Throttles and Errors',
        left: [
          resources.dynamoDbTable.metricThrottledRequests(),
          resources.dynamoDbTable.metricSystemErrors(),
          resources.dynamoDbTable.metricUserErrors(),
        ],
        width: 12,
        height: 6,
      })
    );

    // CloudFront metrics
    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'CloudFront - Requests and Errors',
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/CloudFront',
            metricName: 'Requests',
            dimensionsMap: {
              DistributionId: resources.cloudFrontDistribution.distributionId,
            },
          }),
          new cloudwatch.Metric({
            namespace: 'AWS/CloudFront',
            metricName: '4xxErrorRate',
            dimensionsMap: {
              DistributionId: resources.cloudFrontDistribution.distributionId,
            },
          }),
          new cloudwatch.Metric({
            namespace: 'AWS/CloudFront',
            metricName: '5xxErrorRate',
            dimensionsMap: {
              DistributionId: resources.cloudFrontDistribution.distributionId,
            },
          }),
        ],
        width: 12,
        height: 6,
      })
    );

    // Custom application metrics
    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Application Metrics',
        left: [
          new cloudwatch.Metric({
            namespace: 'OwlNest/Application',
            metricName: 'ActiveUsers',
          }),
          new cloudwatch.Metric({
            namespace: 'OwlNest/Application',
            metricName: 'DiscussionsCreated',
          }),
          new cloudwatch.Metric({
            namespace: 'OwlNest/Application',
            metricName: 'PostsCreated',
          }),
        ],
        width: 12,
        height: 6,
      })
    );

    return dashboard;
  }

  private createAlarms(
    environment: string,
    resources: {
      lambdaFunctions: lambda.Function[];
      apiGateway: cdk.aws_apigateway.RestApi;
      websocketApi: cdk.aws_apigatewayv2.WebSocketApi;
      dynamoDbTable: cdk.aws_dynamodb.Table;
      cloudFrontDistribution: cdk.aws_cloudfront.Distribution;
    }
  ): void {
    // API Gateway alarms
    const apiErrorAlarm = new cloudwatch.Alarm(this, 'ApiErrorAlarm', {
      alarmName: `owlnest-api-errors-${environment}`,
      alarmDescription: 'API Gateway 5XX errors',
      metric: resources.apiGateway.metric5XXError({
        statistic: 'Sum',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 10,
      evaluationPeriods: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    apiErrorAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(this.alertTopic));

    const apiLatencyAlarm = new cloudwatch.Alarm(this, 'ApiLatencyAlarm', {
      alarmName: `owlnest-api-latency-${environment}`,
      alarmDescription: 'API Gateway high latency',
      metric: resources.apiGateway.metricLatency({
        statistic: 'Average',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 5000, // 5 seconds
      evaluationPeriods: 3,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    apiLatencyAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(this.alertTopic));

    // Lambda alarms
    resources.lambdaFunctions.forEach((fn, index) => {
      const errorAlarm = new cloudwatch.Alarm(this, `LambdaErrorAlarm${index}`, {
        alarmName: `owlnest-lambda-errors-${fn.functionName}-${environment}`,
        alarmDescription: `Lambda function ${fn.functionName} errors`,
        metric: fn.metricErrors({
          statistic: 'Sum',
          period: cdk.Duration.minutes(5),
        }),
        threshold: 5,
        evaluationPeriods: 2,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      });
      errorAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(this.alertTopic));

      const durationAlarm = new cloudwatch.Alarm(this, `LambdaDurationAlarm${index}`, {
        alarmName: `owlnest-lambda-duration-${fn.functionName}-${environment}`,
        alarmDescription: `Lambda function ${fn.functionName} high duration`,
        metric: fn.metricDuration({
          statistic: 'Average',
          period: cdk.Duration.minutes(5),
        }),
        threshold: 25000, // 25 seconds (close to timeout)
        evaluationPeriods: 3,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      });
      durationAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(this.alertTopic));

      const throttleAlarm = new cloudwatch.Alarm(this, `LambdaThrottleAlarm${index}`, {
        alarmName: `owlnest-lambda-throttles-${fn.functionName}-${environment}`,
        alarmDescription: `Lambda function ${fn.functionName} throttles`,
        metric: fn.metricThrottles({
          statistic: 'Sum',
          period: cdk.Duration.minutes(5),
        }),
        threshold: 1,
        evaluationPeriods: 1,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      });
      throttleAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(this.alertTopic));
    });

    // DynamoDB alarms
    const dynamoThrottleAlarm = new cloudwatch.Alarm(this, 'DynamoThrottleAlarm', {
      alarmName: `owlnest-dynamo-throttles-${environment}`,
      alarmDescription: 'DynamoDB throttled requests',
      metric: resources.dynamoDbTable.metricThrottledRequests({
        statistic: 'Sum',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 1,
      evaluationPeriods: 1,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    dynamoThrottleAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(this.alertTopic));

    const dynamoErrorAlarm = new cloudwatch.Alarm(this, 'DynamoErrorAlarm', {
      alarmName: `owlnest-dynamo-errors-${environment}`,
      alarmDescription: 'DynamoDB system errors',
      metric: resources.dynamoDbTable.metricSystemErrors({
        statistic: 'Sum',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 5,
      evaluationPeriods: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    dynamoErrorAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(this.alertTopic));
  }

  private createBudgetAlerts(environment: string, budgetLimit: number): void {
    new budgets.CfnBudget(this, 'CostBudget', {
      budget: {
        budgetName: `owlnest-budget-${environment}`,
        budgetLimit: {
          amount: budgetLimit,
          unit: 'USD',
        },
        timeUnit: 'MONTHLY',
        budgetType: 'COST',
        costFilters: {
          TagKey: ['Project'],
          TagValue: ['OwlNest'],
        },
      },
      notificationsWithSubscribers: [
        {
          notification: {
            notificationType: 'ACTUAL',
            comparisonOperator: 'GREATER_THAN',
            threshold: 80,
            thresholdType: 'PERCENTAGE',
          },
          subscribers: [
            {
              subscriptionType: 'SNS',
              address: this.alertTopic.topicArn,
            },
          ],
        },
        {
          notification: {
            notificationType: 'FORECASTED',
            comparisonOperator: 'GREATER_THAN',
            threshold: 100,
            thresholdType: 'PERCENTAGE',
          },
          subscribers: [
            {
              subscriptionType: 'SNS',
              address: this.alertTopic.topicArn,
            },
          ],
        },
      ],
    });
  }

  private setupCustomMetrics(environment: string): void {
    // Custom metrics Lambda for application-specific metrics
    const customMetricsLambda = new lambda.Function(this, 'CustomMetricsLambda', {
      functionName: `owlnest-custom-metrics-${environment}`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        const AWS = require('aws-sdk');
        const cloudwatch = new AWS.CloudWatch();
        const dynamodb = new AWS.DynamoDB.DocumentClient();

        exports.handler = async (event) => {
          try {
            const tableName = process.env.TABLE_NAME;
            
            // Count active users (users who posted in last 24 hours)
            const activeUsersResult = await dynamodb.query({
              TableName: tableName,
              IndexName: 'GSI1',
              KeyConditionExpression: 'GSI1PK = :pk',
              ExpressionAttributeValues: {
                ':pk': 'ACTIVE_USERS',
                ':timestamp': new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
              },
              FilterExpression: 'createdAt > :timestamp'
            }).promise();

            // Count discussions created today
            const discussionsResult = await dynamodb.query({
              TableName: tableName,
              IndexName: 'GSI1',
              KeyConditionExpression: 'GSI1PK = :pk',
              ExpressionAttributeValues: {
                ':pk': 'DISCUSSION',
                ':timestamp': new Date().toISOString().split('T')[0]
              },
              FilterExpression: 'begins_with(createdAt, :timestamp)'
            }).promise();

            // Count posts created today
            const postsResult = await dynamodb.query({
              TableName: tableName,
              IndexName: 'GSI1',
              KeyConditionExpression: 'GSI1PK = :pk',
              ExpressionAttributeValues: {
                ':pk': 'POST',
                ':timestamp': new Date().toISOString().split('T')[0]
              },
              FilterExpression: 'begins_with(createdAt, :timestamp)'
            }).promise();

            // Send metrics to CloudWatch
            await cloudwatch.putMetricData({
              Namespace: 'OwlNest/Application',
              MetricData: [
                {
                  MetricName: 'ActiveUsers',
                  Value: activeUsersResult.Count || 0,
                  Unit: 'Count',
                  Timestamp: new Date()
                },
                {
                  MetricName: 'DiscussionsCreated',
                  Value: discussionsResult.Count || 0,
                  Unit: 'Count',
                  Timestamp: new Date()
                },
                {
                  MetricName: 'PostsCreated',
                  Value: postsResult.Count || 0,
                  Unit: 'Count',
                  Timestamp: new Date()
                }
              ]
            }).promise();

            return { statusCode: 200, body: 'Metrics sent successfully' };
          } catch (error) {
            console.error('Error sending custom metrics:', error);
            throw error;
          }
        };
      `),
      environment: {
        TABLE_NAME: process.env.TABLE_NAME || '',
      },
      timeout: cdk.Duration.minutes(5),
    });

    // Grant permissions
    customMetricsLambda.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'cloudwatch:PutMetricData',
        'dynamodb:Query',
        'dynamodb:Scan',
      ],
      resources: ['*'],
    }));

    // Schedule the custom metrics Lambda to run every 15 minutes
    new events.Rule(this, 'CustomMetricsSchedule', {
      ruleName: `owlnest-custom-metrics-schedule-${environment}`,
      schedule: events.Schedule.rate(cdk.Duration.minutes(15)),
      targets: [new events_targets.LambdaFunction(customMetricsLambda)],
    });
  }

  private setupErrorTracking(environment: string, lambdaFunctions: lambda.Function[]): void {
    // Error aggregation Lambda
    const errorTrackingLambda = new lambda.Function(this, 'ErrorTrackingLambda', {
      functionName: `owlnest-error-tracking-${environment}`,
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        const AWS = require('aws-sdk');
        const cloudwatch = new AWS.CloudWatch();

        exports.handler = async (event) => {
          console.log('Error tracking event:', JSON.stringify(event, null, 2));
          
          try {
            const logEvent = event.awslogs?.data ? 
              JSON.parse(Buffer.from(event.awslogs.data, 'base64').toString('utf8')) : 
              event;

            if (logEvent.logEvents) {
              const errorCount = logEvent.logEvents.filter(log => 
                log.message.includes('ERROR') || 
                log.message.includes('Exception') ||
                log.message.includes('error')
              ).length;

              if (errorCount > 0) {
                await cloudwatch.putMetricData({
                  Namespace: 'OwlNest/Errors',
                  MetricData: [
                    {
                      MetricName: 'ApplicationErrors',
                      Value: errorCount,
                      Unit: 'Count',
                      Timestamp: new Date(),
                      Dimensions: [
                        {
                          Name: 'Environment',
                          Value: process.env.ENVIRONMENT
                        }
                      ]
                    }
                  ]
                }).promise();
              }
            }

            return { statusCode: 200 };
          } catch (error) {
            console.error('Error in error tracking:', error);
            throw error;
          }
        };
      `),
      environment: {
        ENVIRONMENT: environment,
      },
      timeout: cdk.Duration.minutes(1),
    });

    errorTrackingLambda.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['cloudwatch:PutMetricData'],
      resources: ['*'],
    }));

    // Subscribe error tracking Lambda to log groups
    lambdaFunctions.forEach((fn, index) => {
      new logs.SubscriptionFilter(this, `ErrorSubscription${index}`, {
        logGroup: fn.logGroup,
        destination: new cdk.aws_logs_destinations.LambdaDestination(errorTrackingLambda),
        filterPattern: logs.FilterPattern.anyTerm('ERROR', 'Exception', 'error'),
      });
    });
  }

  private setupPerformanceMonitoring(
    environment: string,
    resources: {
      lambdaFunctions: lambda.Function[];
      apiGateway: cdk.aws_apigateway.RestApi;
      dynamoDbTable: cdk.aws_dynamodb.Table;
    }
  ): void {
    // Performance monitoring composite alarm
    const performanceAlarms: cloudwatch.Alarm[] = [];

    // API Gateway performance alarm
    const apiPerformanceAlarm = new cloudwatch.Alarm(this, 'ApiPerformanceAlarm', {
      alarmName: `owlnest-api-performance-${environment}`,
      alarmDescription: 'API Gateway performance degradation',
      metric: resources.apiGateway.metricLatency({
        statistic: 'Average',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 2000, // 2 seconds
      evaluationPeriods: 3,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    performanceAlarms.push(apiPerformanceAlarm);

    // Lambda performance alarms
    resources.lambdaFunctions.forEach((fn, index) => {
      const lambdaPerformanceAlarm = new cloudwatch.Alarm(this, `LambdaPerformanceAlarm${index}`, {
        alarmName: `owlnest-lambda-performance-${fn.functionName}-${environment}`,
        alarmDescription: `Lambda ${fn.functionName} performance degradation`,
        metric: fn.metricDuration({
          statistic: 'Average',
          period: cdk.Duration.minutes(5),
        }),
        threshold: 10000, // 10 seconds
        evaluationPeriods: 3,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      });
      performanceAlarms.push(lambdaPerformanceAlarm);
    });

    // Composite alarm for overall system performance
    const systemPerformanceAlarm = new cloudwatch.CompositeAlarm(this, 'SystemPerformanceAlarm', {
      alarmDescription: 'Overall system performance degradation',
      compositeAlarmRule: cloudwatch.AlarmRule.anyOf(...performanceAlarms.map(alarm => 
        cloudwatch.AlarmRule.fromAlarm(alarm, cloudwatch.AlarmState.ALARM)
      )),
    });

    systemPerformanceAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(this.alertTopic));
  }

  private getLogRetention(environment: string): logs.RetentionDays {
    switch (environment) {
      case 'production':
        return logs.RetentionDays.ONE_YEAR;
      case 'staging':
        return logs.RetentionDays.THREE_MONTHS;
      default:
        return logs.RetentionDays.ONE_WEEK;
    }
  }
}