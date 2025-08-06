#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { PipelineStack } from '../lib/pipeline-stack';

const app = new cdk.App();

// Get configuration from context or environment variables
const environment = app.node.tryGetContext('environment') || process.env.ENVIRONMENT || 'development';
const githubOwner = app.node.tryGetContext('githubOwner') || process.env.GITHUB_OWNER || 'your-github-username';
const githubRepo = app.node.tryGetContext('githubRepo') || process.env.GITHUB_REPO || 'owlnest';
const notificationEmail = app.node.tryGetContext('notificationEmail') || process.env.NOTIFICATION_EMAIL;

// Environment-specific configuration
const envConfig = {
  development: {
    stackName: 'OwlNestPipelineDev',
    githubBranch: 'develop',
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: process.env.CDK_DEFAULT_REGION || 'ap-northeast-1',
    },
  },
  staging: {
    stackName: 'OwlNestPipelineStaging',
    githubBranch: 'main',
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: process.env.CDK_DEFAULT_REGION || 'ap-northeast-1',
    },
  },
  production: {
    stackName: 'OwlNestPipelineProd',
    githubBranch: 'main',
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: process.env.CDK_DEFAULT_REGION || 'ap-northeast-1',
    },
  },
};

const config = envConfig[environment as keyof typeof envConfig] || envConfig.development;

new PipelineStack(app, config.stackName, {
  env: config.env,
  environment,
  githubOwner,
  githubRepo,
  githubBranch: config.githubBranch,
  notificationEmail,
  description: `OwlNest CI/CD Pipeline - ${environment} environment`,
});

app.synth();