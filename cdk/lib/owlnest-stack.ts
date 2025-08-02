import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigatewayv2Integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as path from 'path';
import * as fs from 'fs';

export interface OwlNestStackProps extends cdk.StackProps {
  environment: string;
}

export interface EnvironmentConfig {
  environment: string;
  region: string;
  domainName: string;
  certificateArn: string;
  enableDetailedMonitoring: boolean;
  logRetentionDays: number;
  lambdaMemorySize: number;
  lambdaTimeout: number;
  dynamoDbBillingMode: string;
  enablePointInTimeRecovery: boolean;
  removalPolicy: string;
  corsAllowedOrigins: string[];
  cognitoDomainPrefix: string;
}

export class OwlNestStack extends cdk.Stack {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;
  public readonly identityPool: cognito.CfnIdentityPool;
  public readonly mainTable: dynamodb.Table;
  public readonly api: apigateway.RestApi;
  public readonly websocketApi: apigatewayv2.WebSocketApi;
  public readonly websiteBucket: s3.Bucket;
  public readonly filesBucket: s3.Bucket;
  public readonly distribution: cloudfront.Distribution;
  private readonly config: EnvironmentConfig;

  constructor(scope: Construct, id: string, props: OwlNestStackProps) {
    super(scope, id, props);

    const { environment } = props;

    // Load environment-specific configuration
    this.config = this.loadEnvironmentConfig(environment);

    // DynamoDB Table - Single table design
    this.mainTable = new dynamodb.Table(this, 'OwlNestTable', {
      tableName: `owlnest-main-table-${environment}`,
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: this.config.dynamoDbBillingMode === 'ON_DEMAND' 
        ? dynamodb.BillingMode.PAY_PER_REQUEST 
        : dynamodb.BillingMode.PROVISIONED,
      pointInTimeRecovery: this.config.enablePointInTimeRecovery,
      removalPolicy: this.config.removalPolicy === 'RETAIN' 
        ? cdk.RemovalPolicy.RETAIN 
        : cdk.RemovalPolicy.DESTROY,
      timeToLiveAttribute: 'ttl',
    });

    // Global Secondary Index 1 - For category and point-based queries
    this.mainTable.addGlobalSecondaryIndex({
      indexName: 'GSI1',
      partitionKey: { name: 'GSI1PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'GSI1SK', type: dynamodb.AttributeType.STRING },
    });

    // Global Secondary Index 2 - For user-based queries
    this.mainTable.addGlobalSecondaryIndex({
      indexName: 'GSI2',
      partitionKey: { name: 'GSI2PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'GSI2SK', type: dynamodb.AttributeType.STRING },
    });

    // Cognito User Pool
    this.userPool = new cognito.UserPool(this, 'OwlNestUserPool', {
      userPoolName: `owlnest-users-${environment}`,
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: this.config.removalPolicy === 'RETAIN' 
        ? cdk.RemovalPolicy.RETAIN 
        : cdk.RemovalPolicy.DESTROY,
    });

    // Add custom attributes for user roles
    this.userPool.addDomain('OwlNestUserPoolDomain', {
      cognitoDomain: {
        domainPrefix: `${this.config.cognitoDomainPrefix}-${this.account}`,
      },
    });

    // User Pool Client
    this.userPoolClient = new cognito.UserPoolClient(this, 'OwlNestUserPoolClient', {
      userPool: this.userPool,
      userPoolClientName: `owlnest-client-${environment}`,
      generateSecret: false,
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
        },
        scopes: [cognito.OAuthScope.EMAIL, cognito.OAuthScope.OPENID, cognito.OAuthScope.PROFILE],
        callbackUrls: this.config.corsAllowedOrigins,
      },
    });

    // Identity Pool (using CfnIdentityPool for now)
    this.identityPool = new cognito.CfnIdentityPool(this, 'OwlNestIdentityPool', {
      identityPoolName: `owlnest_identity_pool_${environment}`,
      allowUnauthenticatedIdentities: false,
      cognitoIdentityProviders: [
        {
          clientId: this.userPoolClient.userPoolClientId,
          providerName: this.userPool.userPoolProviderName,
        },
      ],
    });

    // S3 Bucket for file uploads
    this.filesBucket = new s3.Bucket(this, 'OwlNestFilesBucket', {
      bucketName: `owlnest-files-${environment}-${this.account}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.POST, s3.HttpMethods.PUT],
          allowedOrigins: this.config.corsAllowedOrigins,
          allowedHeaders: ['*'],
        },
      ],
      lifecycleRules: [
        {
          id: 'DeleteIncompleteMultipartUploads',
          abortIncompleteMultipartUploadAfter: cdk.Duration.days(1),
        },
      ],
      removalPolicy: this.config.removalPolicy === 'RETAIN' 
        ? cdk.RemovalPolicy.RETAIN 
        : cdk.RemovalPolicy.DESTROY,
    });

    // S3 Bucket for website hosting
    this.websiteBucket = new s3.Bucket(this, 'OwlNestWebsiteBucket', {
      bucketName: `owlnest-website-${environment}-${this.account}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'error.html',
      removalPolicy: this.config.removalPolicy === 'RETAIN' 
        ? cdk.RemovalPolicy.RETAIN 
        : cdk.RemovalPolicy.DESTROY,
    });

    // CloudFront Distribution
    this.distribution = new cloudfront.Distribution(this, 'OwlNestDistribution', {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(this.websiteBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
        },
      ],
    });

    // Lambda execution role
    const lambdaRole = new iam.Role(this, 'OwlNestLambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
      inlinePolicies: {
        DynamoDBAccess: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'dynamodb:GetItem',
                'dynamodb:PutItem',
                'dynamodb:UpdateItem',
                'dynamodb:DeleteItem',
                'dynamodb:Query',
                'dynamodb:Scan',
                'dynamodb:BatchGetItem',
                'dynamodb:BatchWriteItem',
              ],
              resources: [
                this.mainTable.tableArn,
                `${this.mainTable.tableArn}/index/*`,
              ],
            }),
          ],
        }),
        CognitoAccess: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'cognito-idp:AdminGetUser',
                'cognito-idp:AdminUpdateUserAttributes',
                'cognito-idp:ListUsers',
              ],
              resources: [this.userPool.userPoolArn],
            }),
          ],
        }),
        S3Access: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                's3:GetObject',
                's3:PutObject',
                's3:DeleteObject',
              ],
              resources: [`${this.filesBucket.bucketArn}/*`],
            }),
          ],
        }),
      },
    });

    // API Gateway
    this.api = new apigateway.RestApi(this, 'OwlNestApi', {
      restApiName: `owlnest-api-${environment}`,
      description: `OwlNest Discussion Platform API - ${environment}`,
      defaultCorsPreflightOptions: {
        allowOrigins: this.config.corsAllowedOrigins,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'X-Amz-Date', 'Authorization', 'X-Api-Key'],
      },
    });

    // Cognito Authorizer
    const cognitoAuthorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'OwlNestAuthorizer', {
      cognitoUserPools: [this.userPool],
      authorizerName: `owlnest-authorizer-${environment}`,
    });

    // WebSocket API for real-time communication
    this.websocketApi = new apigatewayv2.WebSocketApi(this, 'OwlNestWebSocketApi', {
      apiName: `owlnest-websocket-${environment}`,
      description: `OwlNest WebSocket API - ${environment}`,
    });

    // Lambda functions will be created in separate constructs
    this.createLambdaFunctions(lambdaRole, cognitoAuthorizer, environment);

    // Output important values
    new cdk.CfnOutput(this, 'UserPoolId', {
      value: this.userPool.userPoolId,
      description: 'Cognito User Pool ID',
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: this.userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID',
    });

    new cdk.CfnOutput(this, 'IdentityPoolId', {
      value: this.identityPool.ref,
      description: 'Cognito Identity Pool ID',
    });

    new cdk.CfnOutput(this, 'ApiGatewayUrl', {
      value: this.api.url,
      description: 'API Gateway URL',
    });

    new cdk.CfnOutput(this, 'WebsiteBucketName', {
      value: this.websiteBucket.bucketName,
      description: 'Website S3 Bucket Name',
    });

    new cdk.CfnOutput(this, 'CloudFrontDomainName', {
      value: this.distribution.distributionDomainName,
      description: 'CloudFront Distribution Domain Name',
    });

    new cdk.CfnOutput(this, 'DynamoDBTableName', {
      value: this.mainTable.tableName,
      description: 'DynamoDB Main Table Name',
    });

    new cdk.CfnOutput(this, 'WebSocketApiUrl', {
      value: this.websocketApi.apiEndpoint,
      description: 'WebSocket API URL',
    });

    new cdk.CfnOutput(this, 'FilesBucketName', {
      value: this.filesBucket.bucketName,
      description: 'Files S3 Bucket Name',
    });
  }

  private loadEnvironmentConfig(environment: string): EnvironmentConfig {
    const configPath = path.join(__dirname, '../config', `${environment}.json`);
    
    if (!fs.existsSync(configPath)) {
      throw new Error(`Configuration file not found: ${configPath}`);
    }

    const configData = fs.readFileSync(configPath, 'utf8');
    return JSON.parse(configData) as EnvironmentConfig;
  }

  private getLogRetention(days: number): logs.RetentionDays {
    switch (days) {
      case 1:
        return logs.RetentionDays.ONE_DAY;
      case 3:
        return logs.RetentionDays.THREE_DAYS;
      case 5:
        return logs.RetentionDays.FIVE_DAYS;
      case 7:
        return logs.RetentionDays.ONE_WEEK;
      case 14:
        return logs.RetentionDays.TWO_WEEKS;
      case 30:
        return logs.RetentionDays.ONE_MONTH;
      case 60:
        return logs.RetentionDays.TWO_MONTHS;
      case 90:
        return logs.RetentionDays.THREE_MONTHS;
      case 120:
        return logs.RetentionDays.FOUR_MONTHS;
      case 150:
        return logs.RetentionDays.FIVE_MONTHS;
      case 180:
        return logs.RetentionDays.SIX_MONTHS;
      case 365:
        return logs.RetentionDays.ONE_YEAR;
      case 400:
        return logs.RetentionDays.THIRTEEN_MONTHS;
      case 545:
        return logs.RetentionDays.EIGHTEEN_MONTHS;
      case 731:
        return logs.RetentionDays.TWO_YEARS;
      case 1827:
        return logs.RetentionDays.FIVE_YEARS;
      case 3653:
        return logs.RetentionDays.TEN_YEARS;
      default:
        return logs.RetentionDays.ONE_WEEK;
    }
  }

  private createLambdaFunctions(
    lambdaRole: iam.Role,
    authorizer: apigateway.CognitoUserPoolsAuthorizer,
    environment: string
  ) {
    // Create Lambda functions directory structure
    const commonLambdaProps = {
      runtime: lambda.Runtime.NODEJS_18_X,
      role: lambdaRole,
      environment: {
        TABLE_NAME: this.mainTable.tableName,
        USER_POOL_ID: this.userPool.userPoolId,
        ENVIRONMENT: environment,
        WEBSOCKET_API_ENDPOINT: this.websocketApi.apiEndpoint,
      },
      timeout: cdk.Duration.seconds(this.config.lambdaTimeout),
      memorySize: this.config.lambdaMemorySize,
      logRetention: this.getLogRetention(this.config.logRetentionDays),
    };

    // Auth Lambda
    const authLambda = new lambda.Function(this, 'AuthLambda', {
      ...commonLambdaProps,
      functionName: `owlnest-auth-${environment}`,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/auth')),
    });

    // Discussion Lambda
    const discussionLambda = new lambda.Function(this, 'DiscussionLambda', {
      ...commonLambdaProps,
      functionName: `owlnest-discussion-${environment}`,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/discussion')),
    });

    // User Lambda
    const userLambda = new lambda.Function(this, 'UserLambda', {
      ...commonLambdaProps,
      functionName: `owlnest-user-${environment}`,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/user')),
    });

    // File Upload Lambda
    const fileUploadLambda = new lambda.Function(this, 'FileUploadLambda', {
      ...commonLambdaProps,
      functionName: `owlnest-file-upload-${environment}`,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/file-upload')),
    });

    // Notification Lambda
    const notificationLambda = new lambda.Function(this, 'NotificationLambda', {
      ...commonLambdaProps,
      functionName: `owlnest-notification-${environment}`,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/notification')),
    });

    // WebSocket Lambda for real-time communication
    const websocketLambda = new lambda.Function(this, 'WebSocketLambda', {
      ...commonLambdaProps,
      functionName: `owlnest-websocket-${environment}`,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        exports.handler = async (event) => {
          console.log('WebSocket Lambda - Event:', JSON.stringify(event, null, 2));
          const { requestContext } = event;
          const { routeKey, connectionId } = requestContext;
          
          switch (routeKey) {
            case '$connect':
              return { statusCode: 200 };
            case '$disconnect':
              return { statusCode: 200 };
            case '$default':
              return { statusCode: 200 };
            default:
              return { statusCode: 404 };
          }
        };
      `),
    });

    // API Gateway routes
    const authResource = this.api.root.addResource('auth');
    authResource.addMethod('ANY', new apigateway.LambdaIntegration(authLambda));

    const discussionsResource = this.api.root.addResource('discussions');
    discussionsResource.addMethod('ANY', new apigateway.LambdaIntegration(discussionLambda), {
      authorizer,
    });
    discussionsResource.addProxy({
      defaultIntegration: new apigateway.LambdaIntegration(discussionLambda),
      defaultMethodOptions: {
        authorizer,
      },
    });

    const usersResource = this.api.root.addResource('users');
    usersResource.addMethod('ANY', new apigateway.LambdaIntegration(userLambda), {
      authorizer,
    });
    usersResource.addProxy({
      defaultIntegration: new apigateway.LambdaIntegration(userLambda),
      defaultMethodOptions: {
        authorizer,
      },
    });

    // File upload routes
    const filesResource = this.api.root.addResource('files');
    filesResource.addMethod('ANY', new apigateway.LambdaIntegration(fileUploadLambda), {
      authorizer,
    });
    filesResource.addProxy({
      defaultIntegration: new apigateway.LambdaIntegration(fileUploadLambda),
      defaultMethodOptions: {
        authorizer,
      },
    });

    // Notification routes
    const notificationsResource = this.api.root.addResource('notifications');
    notificationsResource.addMethod('ANY', new apigateway.LambdaIntegration(notificationLambda), {
      authorizer,
    });
    notificationsResource.addProxy({
      defaultIntegration: new apigateway.LambdaIntegration(notificationLambda),
      defaultMethodOptions: {
        authorizer,
      },
    });

    // WebSocket API routes
    const connectRoute = new apigatewayv2.WebSocketRoute(this, 'ConnectRoute', {
      webSocketApi: this.websocketApi,
      routeKey: '$connect',
      integration: new apigatewayv2Integrations.WebSocketLambdaIntegration(
        'ConnectIntegration',
        websocketLambda
      ),
    });

    const disconnectRoute = new apigatewayv2.WebSocketRoute(this, 'DisconnectRoute', {
      webSocketApi: this.websocketApi,
      routeKey: '$disconnect',
      integration: new apigatewayv2Integrations.WebSocketLambdaIntegration(
        'DisconnectIntegration',
        websocketLambda
      ),
    });

    const defaultRoute = new apigatewayv2.WebSocketRoute(this, 'DefaultRoute', {
      webSocketApi: this.websocketApi,
      routeKey: '$default',
      integration: new apigatewayv2Integrations.WebSocketLambdaIntegration(
        'DefaultIntegration',
        websocketLambda
      ),
    });

    // WebSocket API Stage
    const websocketStage = new apigatewayv2.WebSocketStage(this, 'WebSocketStage', {
      webSocketApi: this.websocketApi,
      stageName: environment,
      autoDeploy: true,
    });
  }
}