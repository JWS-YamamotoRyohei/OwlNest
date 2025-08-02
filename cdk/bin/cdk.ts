#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { OwlNestStack } from '../lib/owlnest-stack';

const app = new cdk.App();

// Get environment from context or environment variables
const environment = app.node.tryGetContext('environment') || process.env.ENVIRONMENT || 'development';

// Environment-specific configuration
const envConfig = {
  development: {
    stackName: 'OwlNestDev',
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: process.env.CDK_DEFAULT_REGION || 'ap-northeast-1',
    },
  },
  staging: {
    stackName: 'OwlNestStaging',
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: process.env.CDK_DEFAULT_REGION || 'ap-northeast-1',
    },
  },
  production: {
    stackName: 'OwlNestProd',
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: process.env.CDK_DEFAULT_REGION || 'ap-northeast-1',
    },
  },
};

const config = envConfig[environment as keyof typeof envConfig] || envConfig.development;

new OwlNestStack(app, config.stackName, {
  env: config.env,
  environment,
  description: `OwlNest Discussion Platform - ${environment} environment`,
});