# OwlNest CDK Infrastructure

This CDK project defines the AWS infrastructure for the OwlNest Discussion Platform, including DynamoDB, Lambda functions, API Gateway, Cognito, S3, and CloudFront.

## Architecture Overview

The infrastructure follows a serverless architecture pattern with:

- **Amazon Cognito**: User authentication and authorization
- **Amazon DynamoDB**: Single-table design for all data storage
- **AWS Lambda**: Serverless compute for API endpoints
- **Amazon API Gateway**: REST API and WebSocket API
- **Amazon S3**: Static website hosting and file storage
- **Amazon CloudFront**: CDN for global content delivery

## Environment Configuration

The project supports three environments:
- `development`: Local development and testing
- `staging`: Pre-production testing
- `production`: Live production environment

Each environment has its own configuration file in the `config/` directory.

## Prerequisites

1. **AWS CLI**: Install and configure with appropriate credentials
2. **Node.js**: Version 18 or later
3. **AWS CDK**: Install globally with `npm install -g aws-cdk`

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Bootstrap CDK (first time only):
   ```bash
   npx cdk bootstrap
   ```

## Deployment

### Quick Deployment Commands

```bash
# Deploy to development
npm run deploy:dev

# Deploy to staging
npm run deploy:staging

# Deploy to production
npm run deploy:prod
```

### Manual Deployment

```bash
# Build the project
npm run build

# Deploy to specific environment
npx cdk deploy --context environment=development

# Deploy with specific AWS profile
npx cdk deploy --context environment=development --profile my-profile
```

### Using PowerShell Scripts

```powershell
# Deploy to development
.\scripts\deploy.ps1 development default

# Deploy to production with specific profile
.\scripts\deploy.ps1 production production-profile
```

## Destruction

⚠️ **Warning**: This will permanently delete all resources and data.

```bash
# Destroy development environment
npm run destroy:dev

# Or using PowerShell script
.\scripts\destroy.ps1 development
```

## Configuration

Environment-specific settings are stored in `config/[environment].json`:

```json
{
  "environment": "development",
  "region": "ap-northeast-1",
  "enableDetailedMonitoring": false,
  "logRetentionDays": 7,
  "lambdaMemorySize": 256,
  "lambdaTimeout": 30,
  "dynamoDbBillingMode": "ON_DEMAND",
  "enablePointInTimeRecovery": true,
  "removalPolicy": "DESTROY",
  "corsAllowedOrigins": ["http://localhost:3000"],
  "cognitoDomainPrefix": "owlnest-dev"
}
```

## Lambda Functions

The project includes the following Lambda functions:

- **Auth Lambda** (`lambda/auth/`): User authentication and authorization
- **Discussion Lambda** (`lambda/discussion/`): Discussion management
- **User Lambda** (`lambda/user/`): User profile management
- **File Upload Lambda** (`lambda/file-upload/`): File upload and management
- **Notification Lambda** (`lambda/notification/`): Notification system
- **WebSocket Lambda**: Real-time communication

## API Endpoints

After deployment, the following endpoints will be available:

- `POST /auth/login` - User login
- `POST /auth/register` - User registration
- `GET /discussions` - List discussions
- `POST /discussions` - Create discussion
- `GET /users` - List users
- `POST /files/presigned-url` - Get file upload URL
- `GET /notifications` - Get user notifications

## WebSocket API

Real-time features are supported through WebSocket API with the following routes:

- `$connect` - Client connection
- `$disconnect` - Client disconnection
- `$default` - Default message handling

## Outputs

After successful deployment, the following outputs are available:

- **UserPoolId**: Cognito User Pool ID
- **UserPoolClientId**: Cognito User Pool Client ID
- **IdentityPoolId**: Cognito Identity Pool ID
- **ApiGatewayUrl**: REST API Gateway URL
- **WebSocketApiUrl**: WebSocket API URL
- **CloudFrontDomainName**: CloudFront distribution domain
- **DynamoDBTableName**: Main DynamoDB table name
- **WebsiteBucketName**: S3 website bucket name
- **FilesBucketName**: S3 files bucket name

## Development Commands

```bash
# Compile TypeScript
npm run build

# Watch for changes
npm run watch

# Run tests
npm run test

# Synthesize CloudFormation template
npm run synth

# Compare deployed stack with current state
npm run diff
```

## Monitoring and Logs

- **CloudWatch Logs**: All Lambda functions log to CloudWatch
- **CloudWatch Metrics**: Automatic metrics collection for all services
- **Log Retention**: Configurable per environment (7-90 days)

## Security

- **IAM Roles**: Least privilege access for all Lambda functions
- **Cognito**: JWT-based authentication
- **CORS**: Configurable allowed origins per environment
- **S3**: Block public access by default
- **API Gateway**: Cognito authorizer for protected endpoints

## Cost Optimization

- **On-Demand Billing**: DynamoDB and Lambda use pay-per-request
- **Log Retention**: Shorter retention for development environments
- **Resource Cleanup**: Development resources are destroyed by default
- **Memory Optimization**: Lambda memory sizes optimized per environment

## Troubleshooting

### Common Issues

1. **Bootstrap Error**: Run `npx cdk bootstrap` first
2. **Permission Denied**: Check AWS credentials and IAM permissions
3. **Stack Already Exists**: Use `cdk diff` to see changes before deploy
4. **Resource Limits**: Check AWS service limits in your region

### Useful Commands

```bash
# Check CDK version
npx cdk --version

# List all stacks
npx cdk list

# Show stack template
npx cdk synth

# Validate template
npx cdk doctor
```
