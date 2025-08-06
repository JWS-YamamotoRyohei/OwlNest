import * as cdk from 'aws-cdk-lib';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as sns_subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import { Construct } from 'constructs';

export interface PipelineStackProps extends cdk.StackProps {
  environment: string;
  githubOwner: string;
  githubRepo: string;
  githubBranch: string;
  notificationEmail?: string;
}

export class PipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: PipelineStackProps) {
    super(scope, id, props);

    // S3 bucket for pipeline artifacts
    const artifactsBucket = new s3.Bucket(this, 'PipelineArtifacts', {
      bucketName: `owlnest-pipeline-artifacts-${props.environment}-${this.account}`,
      versioned: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      lifecycleRules: [
        {
          id: 'DeleteOldArtifacts',
          expiration: cdk.Duration.days(30),
          noncurrentVersionExpiration: cdk.Duration.days(7),
        },
      ],
    });

    // SNS topic for notifications
    const notificationTopic = new sns.Topic(this, 'PipelineNotifications', {
      topicName: `owlnest-pipeline-notifications-${props.environment}`,
      displayName: `OwlNest Pipeline Notifications - ${props.environment}`,
    });

    if (props.notificationEmail) {
      notificationTopic.addSubscription(
        new sns_subscriptions.EmailSubscription(props.notificationEmail)
      );
    }

    // IAM role for CodeBuild
    const codeBuildRole = new iam.Role(this, 'CodeBuildRole', {
      assumedBy: new iam.ServicePrincipal('codebuild.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('PowerUserAccess'),
      ],
      inlinePolicies: {
        CDKDeployPolicy: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'sts:AssumeRole',
                'cloudformation:*',
                'iam:*',
                's3:*',
                'lambda:*',
                'apigateway:*',
                'dynamodb:*',
                'cognito-idp:*',
                'ses:*',
                'events:*',
                'logs:*',
              ],
              resources: ['*'],
            }),
          ],
        }),
      },
    });

    // CodeBuild project for CI/CD
    const buildProject = new codebuild.Project(this, 'BuildProject', {
      projectName: `owlnest-build-${props.environment}`,
      description: `Build project for OwlNest ${props.environment} environment`,
      source: codebuild.Source.gitHub({
        owner: props.githubOwner,
        repo: props.githubRepo,
        webhook: true,
        webhookFilters: [
          codebuild.FilterGroup.inEventOf(codebuild.EventAction.PUSH).andBranchIs(props.githubBranch),
          codebuild.FilterGroup.inEventOf(codebuild.EventAction.PULL_REQUEST_CREATED),
          codebuild.FilterGroup.inEventOf(codebuild.EventAction.PULL_REQUEST_UPDATED),
        ],
      }),
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
        computeType: codebuild.ComputeType.SMALL,
        environmentVariables: {
          ENVIRONMENT: {
            value: props.environment,
          },
          AWS_DEFAULT_REGION: {
            value: this.region,
          },
          AWS_ACCOUNT_ID: {
            value: this.account,
          },
        },
      },
      role: codeBuildRole,
      artifacts: codebuild.Artifacts.s3({
        bucket: artifactsBucket,
        includeBuildId: true,
        packageZip: true,
      }),
      cache: codebuild.Cache.local(codebuild.LocalCacheMode.SOURCE),
      timeout: cdk.Duration.minutes(60),
    });

    // CodePipeline artifacts
    const sourceOutput = new codepipeline.Artifact('SourceOutput');
    const buildOutput = new codepipeline.Artifact('BuildOutput');

    // CodePipeline
    const pipeline = new codepipeline.Pipeline(this, 'Pipeline', {
      pipelineName: `owlnest-pipeline-${props.environment}`,
      artifactBucket: artifactsBucket,
      stages: [
        {
          stageName: 'Source',
          actions: [
            new codepipeline_actions.GitHubSourceAction({
              actionName: 'GitHub_Source',
              owner: props.githubOwner,
              repo: props.githubRepo,
              branch: props.githubBranch,
              oauthToken: cdk.SecretValue.secretsManager('github-token'),
              output: sourceOutput,
            }),
          ],
        },
        {
          stageName: 'Build',
          actions: [
            new codepipeline_actions.CodeBuildAction({
              actionName: 'Build_and_Test',
              project: buildProject,
              input: sourceOutput,
              outputs: [buildOutput],
              environmentVariables: {
                DEPLOY_INFRASTRUCTURE: {
                  value: 'true',
                },
              },
            }),
          ],
        },
      ],
    });

    // Add manual approval stage for production
    if (props.environment === 'production') {
      pipeline.addStage({
        stageName: 'ManualApproval',
        actions: [
          new codepipeline_actions.ManualApprovalAction({
            actionName: 'Manual_Approval',
            notificationTopic: notificationTopic,
            additionalInformation: 'Please review the changes and approve for production deployment.',
          }),
        ],
      });
    }

    // Pipeline notifications
    pipeline.onStateChange('PipelineStateChange', {
      target: new cdk.aws_events_targets.SnsTopic(notificationTopic),
      description: 'Pipeline state change notification',
    });

    // CloudWatch dashboard for monitoring
    const dashboard = new cdk.aws_cloudwatch.Dashboard(this, 'PipelineDashboard', {
      dashboardName: `owlnest-pipeline-${props.environment}`,
    });

    dashboard.addWidgets(
      new cdk.aws_cloudwatch.GraphWidget({
        title: 'Build Duration',
        left: [buildProject.metricDuration()],
      }),
      new cdk.aws_cloudwatch.GraphWidget({
        title: 'Build Success Rate',
        left: [buildProject.metricSucceededBuilds()],
        right: [buildProject.metricFailedBuilds()],
      })
    );

    // Outputs
    new cdk.CfnOutput(this, 'PipelineName', {
      value: pipeline.pipelineName,
      description: 'Name of the CodePipeline',
    });

    new cdk.CfnOutput(this, 'BuildProjectName', {
      value: buildProject.projectName,
      description: 'Name of the CodeBuild project',
    });

    new cdk.CfnOutput(this, 'ArtifactsBucketName', {
      value: artifactsBucket.bucketName,
      description: 'Name of the artifacts S3 bucket',
    });

    new cdk.CfnOutput(this, 'NotificationTopicArn', {
      value: notificationTopic.topicArn,
      description: 'ARN of the SNS notification topic',
    });

    new cdk.CfnOutput(this, 'DashboardUrl', {
      value: `https://${this.region}.console.aws.amazon.com/cloudwatch/home?region=${this.region}#dashboards:name=${dashboard.dashboardName}`,
      description: 'URL to the CloudWatch dashboard',
    });
  }
}