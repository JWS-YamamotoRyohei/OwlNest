import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as route53Targets from 'aws-cdk-lib/aws-route53-targets';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { OwlNestStack, OwlNestStackProps } from './owlnest-stack';

export interface ProductionStackProps extends OwlNestStackProps {
  domainName: string;
  hostedZoneId?: string;
  enableWaf?: boolean;
  enableShield?: boolean;
}

export class ProductionStack extends OwlNestStack {
  public readonly hostedZone: route53.IHostedZone;
  public readonly certificate: acm.Certificate;
  public readonly webAcl?: wafv2.CfnWebACL;

  constructor(scope: Construct, id: string, props: ProductionStackProps) {
    super(scope, id, props);

    const { domainName, hostedZoneId, enableWaf = true, enableShield = true } = props;

    // Route 53 Hosted Zone
    if (hostedZoneId) {
      this.hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, 'HostedZone', {
        hostedZoneId,
        zoneName: domainName,
      });
    } else {
      this.hostedZone = new route53.HostedZone(this, 'HostedZone', {
        zoneName: domainName,
        comment: `Hosted zone for OwlNest ${props.environment}`,
      });
    }

    // SSL Certificate
    this.certificate = new acm.Certificate(this, 'Certificate', {
      domainName,
      subjectAlternativeNames: [`*.${domainName}`],
      validation: acm.CertificateValidation.fromDns(this.hostedZone),
    });

    // WAF Web ACL for security
    if (enableWaf) {
      this.webAcl = this.createWebAcl(props.environment);
    }

    // Enhanced CloudFront Distribution
    const enhancedDistribution = this.createEnhancedDistribution(domainName);

    // Route 53 Records
    new route53.ARecord(this, 'AliasRecord', {
      zone: this.hostedZone,
      recordName: domainName,
      target: route53.RecordTarget.fromAlias(
        new route53Targets.CloudFrontTarget(enhancedDistribution)
      ),
    });

    new route53.AaaaRecord(this, 'AliasRecordIPv6', {
      zone: this.hostedZone,
      recordName: domainName,
      target: route53.RecordTarget.fromAlias(
        new route53Targets.CloudFrontTarget(enhancedDistribution)
      ),
    });

    // API subdomain
    new route53.CnameRecord(this, 'ApiRecord', {
      zone: this.hostedZone,
      recordName: `api.${domainName}`,
      domainName: `${this.api.restApiId}.execute-api.${this.region}.amazonaws.com`,
    });

    // WebSocket subdomain
    new route53.CnameRecord(this, 'WebSocketRecord', {
      zone: this.hostedZone,
      recordName: `ws.${domainName}`,
      domainName: `${this.websocketApi.apiId}.execute-api.${this.region}.amazonaws.com`,
    });

    // Environment variables and secrets management
    this.setupSecretsAndParameters(props.environment);

    // Shield Advanced (optional)
    if (enableShield) {
      this.enableShieldAdvanced(enhancedDistribution);
    }

    // Outputs
    new cdk.CfnOutput(this, 'DomainName', {
      value: domainName,
      description: 'Production domain name',
    });

    new cdk.CfnOutput(this, 'CertificateArn', {
      value: this.certificate.certificateArn,
      description: 'SSL Certificate ARN',
    });

    new cdk.CfnOutput(this, 'HostedZoneId', {
      value: this.hostedZone.hostedZoneId,
      description: 'Route 53 Hosted Zone ID',
    });

    new cdk.CfnOutput(this, 'CloudFrontDistributionId', {
      value: enhancedDistribution.distributionId,
      description: 'CloudFront Distribution ID',
    });

    if (this.webAcl) {
      new cdk.CfnOutput(this, 'WebAclArn', {
        value: this.webAcl.attrArn,
        description: 'WAF Web ACL ARN',
      });
    }
  }

  private createWebAcl(environment: string): wafv2.CfnWebACL {
    return new wafv2.CfnWebACL(this, 'WebAcl', {
      name: `owlnest-web-acl-${environment}`,
      scope: 'CLOUDFRONT',
      defaultAction: { allow: {} },
      description: `WAF Web ACL for OwlNest ${environment}`,
      rules: [
        // AWS Managed Rules - Core Rule Set
        {
          name: 'AWSManagedRulesCommonRuleSet',
          priority: 1,
          overrideAction: { none: {} },
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesCommonRuleSet',
            },
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'CommonRuleSetMetric',
          },
        },
        // AWS Managed Rules - Known Bad Inputs
        {
          name: 'AWSManagedRulesKnownBadInputsRuleSet',
          priority: 2,
          overrideAction: { none: {} },
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesKnownBadInputsRuleSet',
            },
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'KnownBadInputsRuleSetMetric',
          },
        },
        // Rate limiting rule
        {
          name: 'RateLimitRule',
          priority: 3,
          action: { block: {} },
          statement: {
            rateBasedStatement: {
              limit: 2000,
              aggregateKeyType: 'IP',
            },
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'RateLimitRuleMetric',
          },
        },
        // Geographic restriction (optional - can be customized)
        {
          name: 'GeoBlockRule',
          priority: 4,
          action: { block: {} },
          statement: {
            geoMatchStatement: {
              countryCodes: ['CN', 'RU'], // Block specific countries if needed
            },
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'GeoBlockRuleMetric',
          },
        },
      ],
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: `owlnest-web-acl-${environment}`,
      },
    });
  }

  private createEnhancedDistribution(domainName: string): cloudfront.Distribution {
    // Security headers response function
    const securityHeadersFunction = new cloudfront.Function(this, 'SecurityHeadersFunction', {
      functionName: `owlnest-security-headers-${this.stackName}`,
      code: cloudfront.FunctionCode.fromInline(`
        function handler(event) {
          var response = event.response;
          var headers = response.headers;

          // Security headers
          headers['strict-transport-security'] = { value: 'max-age=63072000; includeSubdomains; preload' };
          headers['content-type-options'] = { value: 'nosniff' };
          headers['x-frame-options'] = { value: 'DENY' };
          headers['x-content-type-options'] = { value: 'nosniff' };
          headers['referrer-policy'] = { value: 'strict-origin-when-cross-origin' };
          headers['permissions-policy'] = { 
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' 
          };
          headers['content-security-policy'] = { 
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; media-src 'self'; object-src 'none'; child-src 'none'; worker-src 'self'; frame-ancestors 'none'; form-action 'self'; base-uri 'self';" 
          };

          return response;
        }
      `),
    });

    return new cloudfront.Distribution(this, 'EnhancedDistribution', {
      domainNames: [domainName],
      certificate: this.certificate,
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(this.websiteBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        originRequestPolicy: cloudfront.OriginRequestPolicy.CORS_S3_ORIGIN,
        responseHeadersPolicy: cloudfront.ResponseHeadersPolicy.SECURITY_HEADERS,
        functionAssociations: [
          {
            function: securityHeadersFunction,
            eventType: cloudfront.FunctionEventType.VIEWER_RESPONSE,
          },
        ],
        compress: true,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
      },
      additionalBehaviors: {
        // API behavior
        '/api/*': {
          origin: new origins.HttpOrigin(`${this.api.restApiId}.execute-api.${this.region}.amazonaws.com`, {
            originPath: `/${this.node.tryGetContext('environment') || 'development'}`,
          }),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        },
        // Static assets with long-term caching
        '/static/*': {
          origin: origins.S3BucketOrigin.withOriginAccessControl(this.websiteBucket),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: new cloudfront.CachePolicy(this, 'StaticAssetsCachePolicy', {
            cachePolicyName: `owlnest-static-assets-${this.stackName}`,
            defaultTtl: cdk.Duration.days(30),
            maxTtl: cdk.Duration.days(365),
            minTtl: cdk.Duration.days(1),
            headerBehavior: cloudfront.CacheHeaderBehavior.none(),
            queryStringBehavior: cloudfront.CacheQueryStringBehavior.none(),
            cookieBehavior: cloudfront.CacheCookieBehavior.none(),
          }),
          compress: true,
        },
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(5),
        },
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(5),
        },
      ],
      priceClass: cloudfront.PriceClass.PRICE_CLASS_ALL,
      enableIpv6: true,
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      webAclId: this.webAcl?.attrArn,
      enableLogging: true,
      logBucket: this.createLogsBucket(),
      logFilePrefix: 'cloudfront-logs/',
      logIncludesCookies: false,
    });
  }

  private createLogsBucket(): cdk.aws_s3.Bucket {
    return new cdk.aws_s3.Bucket(this, 'CloudFrontLogsBucket', {
      bucketName: `owlnest-cloudfront-logs-${this.node.tryGetContext('environment')}-${this.account}`,
      blockPublicAccess: cdk.aws_s3.BlockPublicAccess.BLOCK_ALL,
      encryption: cdk.aws_s3.BucketEncryption.S3_MANAGED,
      lifecycleRules: [
        {
          id: 'DeleteOldLogs',
          expiration: cdk.Duration.days(90),
        },
        {
          id: 'TransitionToIA',
          transitions: [
            {
              storageClass: cdk.aws_s3.StorageClass.INFREQUENT_ACCESS,
              transitionAfter: cdk.Duration.days(30),
            },
            {
              storageClass: cdk.aws_s3.StorageClass.GLACIER,
              transitionAfter: cdk.Duration.days(90),
            },
          ],
        },
      ],
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
  }

  private setupSecretsAndParameters(environment: string): void {
    // Database connection secrets
    const dbSecrets = new secretsmanager.Secret(this, 'DatabaseSecrets', {
      secretName: `owlnest/${environment}/database`,
      description: `Database secrets for OwlNest ${environment}`,
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: 'admin' }),
        generateStringKey: 'password',
        excludeCharacters: '"@/\\',
      },
    });

    // API keys and external service secrets
    const apiSecrets = new secretsmanager.Secret(this, 'ApiSecrets', {
      secretName: `owlnest/${environment}/api-keys`,
      description: `API keys and external service secrets for OwlNest ${environment}`,
      secretObjectValue: {
        jwtSecret: cdk.SecretValue.unsafePlainText('CHANGE_ME_IN_PRODUCTION'),
        encryptionKey: cdk.SecretValue.unsafePlainText('CHANGE_ME_IN_PRODUCTION'),
        sesApiKey: cdk.SecretValue.unsafePlainText('CHANGE_ME_IN_PRODUCTION'),
      },
    });

    // System parameters
    new ssm.StringParameter(this, 'EnvironmentParameter', {
      parameterName: `/owlnest/${environment}/config/environment`,
      stringValue: environment,
      description: `Environment name for OwlNest ${environment}`,
    });

    new ssm.StringParameter(this, 'RegionParameter', {
      parameterName: `/owlnest/${environment}/config/region`,
      stringValue: this.region,
      description: `AWS region for OwlNest ${environment}`,
    });

    new ssm.StringParameter(this, 'DomainParameter', {
      parameterName: `/owlnest/${environment}/config/domain`,
      stringValue: this.node.tryGetContext('domainName') || '',
      description: `Domain name for OwlNest ${environment}`,
    });

    // Feature flags
    new ssm.StringParameter(this, 'FeatureFlagsParameter', {
      parameterName: `/owlnest/${environment}/feature-flags`,
      stringValue: JSON.stringify({
        enableRealtime: true,
        enableModeration: true,
        enableAnalytics: true,
        enableNotifications: true,
        enableFileUploads: true,
        maxFileSize: 10485760, // 10MB
        maxFilesPerPost: 5,
        enableAdvancedSearch: true,
        enableUserFollowing: true,
      }),
      description: `Feature flags for OwlNest ${environment}`,
    });

    // Outputs for secrets
    new cdk.CfnOutput(this, 'DatabaseSecretsArn', {
      value: dbSecrets.secretArn,
      description: 'Database secrets ARN',
    });

    new cdk.CfnOutput(this, 'ApiSecretsArn', {
      value: apiSecrets.secretArn,
      description: 'API secrets ARN',
    });
  }

  private enableShieldAdvanced(distribution: cloudfront.Distribution): void {
    // Note: Shield Advanced requires manual setup through AWS Console
    // This creates the necessary CloudWatch alarms for monitoring
    
    const ddosAlarm = new cdk.aws_cloudwatch.Alarm(this, 'DDoSAlarm', {
      alarmName: `owlnest-ddos-alarm-${this.node.tryGetContext('environment')}`,
      alarmDescription: 'DDoS attack detection alarm',
      metric: new cdk.aws_cloudwatch.Metric({
        namespace: 'AWS/CloudFront',
        metricName: 'Requests',
        dimensionsMap: {
          DistributionId: distribution.distributionId,
        },
        statistic: 'Sum',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 10000,
      evaluationPeriods: 2,
      treatMissingData: cdk.aws_cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    // Create SNS topic for DDoS alerts
    const ddosAlertTopic = new cdk.aws_sns.Topic(this, 'DDoSAlertTopic', {
      topicName: `owlnest-ddos-alerts-${this.node.tryGetContext('environment')}`,
      displayName: 'OwlNest DDoS Alert Topic',
    });

    ddosAlarm.addAlarmAction(new cdk.aws_cloudwatch_actions.SnsAction(ddosAlertTopic));

    new cdk.CfnOutput(this, 'DDoSAlertTopicArn', {
      value: ddosAlertTopic.topicArn,
      description: 'DDoS alert SNS topic ARN',
    });
  }
}