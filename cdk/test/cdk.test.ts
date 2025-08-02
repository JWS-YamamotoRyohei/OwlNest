import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { OwlNestStack } from '../lib/owlnest-stack';

test('OwlNest Stack Resources Created', () => {
  const app = new cdk.App();
  const stack = new OwlNestStack(app, 'TestOwlNestStack', {
    environment: 'test',
  });
  const template = Template.fromStack(stack);

  // Test DynamoDB table creation
  template.hasResourceProperties('AWS::DynamoDB::Table', {
    BillingMode: 'PAY_PER_REQUEST',
    PointInTimeRecoverySpecification: {
      PointInTimeRecoveryEnabled: false,
    },
  });

  // Test Cognito User Pool creation
  template.hasResourceProperties('AWS::Cognito::UserPool', {
    AutoVerifiedAttributes: ['email'],
    UsernameAttributes: ['email'],
  });

  // Test API Gateway creation
  template.hasResourceProperties('AWS::ApiGateway::RestApi', {
    Name: 'owlnest-api-test',
  });

  // Test Lambda functions creation (6 main functions + potential CloudFront functions)
  template.resourceCountIs('AWS::Lambda::Function', 7);

  // Test S3 buckets creation
  template.resourceCountIs('AWS::S3::Bucket', 2);

  // Test CloudFront distribution creation
  template.hasResourceProperties('AWS::CloudFront::Distribution', {
    DistributionConfig: {
      DefaultRootObject: 'index.html',
    },
  });
});
