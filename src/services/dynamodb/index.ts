// Core service classes
export { DynamoDBService } from './DynamoDBService';
export type {
  DynamoDBConfig,
  DynamoDBItem,
  QueryOptions,
  ScanOptions,
  UpdateOptions,
  BatchGetOptions,
  TransactionItem,
} from './DynamoDBService';

// Error handling
export { DynamoDBError, DynamoDBErrorType } from './DynamoDBError';

// Retry service
export { RetryService } from './RetryService';
export type { RetryConfig } from './RetryService';

// Helper functions
export { DynamoDBHelpers } from './DynamoDBHelpers';

// Factory
export { DynamoDBFactory, getDynamoDBService, getDynamoDBHelpers } from './DynamoDBFactory';

// Re-export AWS SDK types that might be useful
export type {
  GetCommandInput,
  PutCommandInput,
  UpdateCommandInput,
  DeleteCommandInput,
  QueryCommandInput,
  ScanCommandInput,
} from '@aws-sdk/lib-dynamodb';
