import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand,
  BatchGetCommand,
  BatchWriteCommand,
  TransactWriteCommand,
  TransactGetCommand,
} from '@aws-sdk/lib-dynamodb';
import { DynamoDBError, DynamoDBErrorType } from './DynamoDBError';
import { RetryConfig, RetryService } from './RetryService';

export interface DynamoDBConfig {
  region: string;
  tableName: string;
  endpoint?: string;
  maxRetries?: number;
  retryDelayBase?: number;
}

export interface DynamoDBItem {
  PK: string;
  SK: string;
  GSI1PK?: string;
  GSI1SK?: string;
  GSI2PK?: string;
  GSI2SK?: string;
  EntityType: string;
  ttl?: number;
  [key: string]: any;
}

export interface QueryOptions {
  indexName?: string;
  limit?: number;
  exclusiveStartKey?: Record<string, any>;
  scanIndexForward?: boolean;
  filterExpression?: string;
  expressionAttributeNames?: Record<string, string>;
  expressionAttributeValues?: Record<string, any>;
}

export interface ScanOptions {
  indexName?: string;
  limit?: number;
  exclusiveStartKey?: Record<string, any>;
  filterExpression?: string;
  expressionAttributeNames?: Record<string, string>;
  expressionAttributeValues?: Record<string, any>;
  segment?: number;
  totalSegments?: number;
}

export interface UpdateOptions {
  updateExpression: string;
  expressionAttributeNames?: Record<string, string>;
  expressionAttributeValues?: Record<string, any>;
  conditionExpression?: string;
  returnValues?: 'NONE' | 'ALL_OLD' | 'UPDATED_OLD' | 'ALL_NEW' | 'UPDATED_NEW';
}

export interface BatchGetOptions {
  consistentRead?: boolean;
  projectionExpression?: string;
  expressionAttributeNames?: Record<string, string>;
}

export interface TransactionItem {
  operation: 'Put' | 'Update' | 'Delete' | 'ConditionCheck';
  item?: DynamoDBItem;
  key?: { PK: string; SK: string };
  updateExpression?: string;
  conditionExpression?: string;
  expressionAttributeNames?: Record<string, string>;
  expressionAttributeValues?: Record<string, any>;
}

export class DynamoDBService {
  private client: DynamoDBDocumentClient;
  private tableName: string;
  private retryService: RetryService;

  constructor(config: DynamoDBConfig) {
    const dynamoClient = new DynamoDBClient({
      region: config.region,
      endpoint: config.endpoint,
    });

    this.client = DynamoDBDocumentClient.from(dynamoClient, {
      marshallOptions: {
        convertEmptyValues: false,
        removeUndefinedValues: true,
        convertClassInstanceToMap: false,
      },
      unmarshallOptions: {
        wrapNumbers: false,
      },
    });

    this.tableName = config.tableName;
    
    const retryConfig: RetryConfig = {
      maxRetries: config.maxRetries || 3,
      baseDelay: config.retryDelayBase || 100,
      maxDelay: 5000,
      backoffMultiplier: 2,
    };
    
    this.retryService = new RetryService(retryConfig);
  }

  /**
   * Get a single item by primary key
   */
  async getItem(PK: string, SK: string, consistentRead = false): Promise<DynamoDBItem | null> {
    try {
      return await this.retryService.executeWithRetry(async () => {
        const command = new GetCommand({
          TableName: this.tableName,
          Key: { PK, SK },
          ConsistentRead: consistentRead,
        });

        const result = await this.client.send(command);
        return result.Item as DynamoDBItem || null;
      });
    } catch (error) {
      throw this.handleError(error, 'getItem', { PK, SK });
    }
  }

  /**
   * Put an item into the table
   */
  async putItem(item: DynamoDBItem, conditionExpression?: string): Promise<void> {
    try {
      await this.retryService.executeWithRetry(async () => {
        const command = new PutCommand({
          TableName: this.tableName,
          Item: {
            ...item,
            updatedAt: new Date().toISOString(),
          },
          ConditionExpression: conditionExpression,
        });

        await this.client.send(command);
      });
    } catch (error) {
      throw this.handleError(error, 'putItem', { item });
    }
  }

  /**
   * Update an item in the table
   */
  async updateItem(
    PK: string,
    SK: string,
    options: UpdateOptions
  ): Promise<DynamoDBItem | null> {
    try {
      return await this.retryService.executeWithRetry(async () => {
        const command = new UpdateCommand({
          TableName: this.tableName,
          Key: { PK, SK },
          UpdateExpression: options.updateExpression,
          ExpressionAttributeNames: options.expressionAttributeNames,
          ExpressionAttributeValues: {
            ...options.expressionAttributeValues,
            ':updatedAt': new Date().toISOString(),
          },
          ConditionExpression: options.conditionExpression,
          ReturnValues: options.returnValues || 'ALL_NEW',
        });

        const result = await this.client.send(command);
        return result.Attributes as DynamoDBItem || null;
      });
    } catch (error) {
      throw this.handleError(error, 'updateItem', { PK, SK, options });
    }
  }

  /**
   * Delete an item from the table
   */
  async deleteItem(
    PK: string,
    SK: string,
    conditionExpression?: string
  ): Promise<DynamoDBItem | null> {
    try {
      return await this.retryService.executeWithRetry(async () => {
        const command = new DeleteCommand({
          TableName: this.tableName,
          Key: { PK, SK },
          ConditionExpression: conditionExpression,
          ReturnValues: 'ALL_OLD',
        });

        const result = await this.client.send(command);
        return result.Attributes as DynamoDBItem || null;
      });
    } catch (error) {
      throw this.handleError(error, 'deleteItem', { PK, SK });
    }
  }

  /**
   * Query items from the table or an index
   */
  async queryItems(
    PK: string,
    SKCondition?: string,
    options: QueryOptions = {}
  ): Promise<{ items: DynamoDBItem[]; lastEvaluatedKey?: Record<string, any> }> {
    try {
      return await this.retryService.executeWithRetry(async () => {
        let keyConditionExpression = '#pk = :pk';
        const expressionAttributeNames = { '#pk': 'PK', ...options.expressionAttributeNames };
        const expressionAttributeValues = { ':pk': PK, ...options.expressionAttributeValues };

        if (SKCondition) {
          keyConditionExpression += ` AND ${SKCondition}`;
        }

        const command = new QueryCommand({
          TableName: this.tableName,
          IndexName: options.indexName,
          KeyConditionExpression: keyConditionExpression,
          FilterExpression: options.filterExpression,
          ExpressionAttributeNames: expressionAttributeNames,
          ExpressionAttributeValues: expressionAttributeValues,
          Limit: options.limit,
          ExclusiveStartKey: options.exclusiveStartKey,
          ScanIndexForward: options.scanIndexForward,
        });

        const result = await this.client.send(command);
        return {
          items: result.Items as DynamoDBItem[] || [],
          lastEvaluatedKey: result.LastEvaluatedKey,
        };
      });
    } catch (error) {
      throw this.handleError(error, 'queryItems', { PK, SKCondition, options });
    }
  }

  /**
   * Scan items from the table or an index
   */
  async scanItems(options: ScanOptions = {}): Promise<{
    items: DynamoDBItem[];
    lastEvaluatedKey?: Record<string, any>;
  }> {
    try {
      return await this.retryService.executeWithRetry(async () => {
        const command = new ScanCommand({
          TableName: this.tableName,
          IndexName: options.indexName,
          FilterExpression: options.filterExpression,
          ExpressionAttributeNames: options.expressionAttributeNames,
          ExpressionAttributeValues: options.expressionAttributeValues,
          Limit: options.limit,
          ExclusiveStartKey: options.exclusiveStartKey,
          Segment: options.segment,
          TotalSegments: options.totalSegments,
        });

        const result = await this.client.send(command);
        return {
          items: result.Items as DynamoDBItem[] || [],
          lastEvaluatedKey: result.LastEvaluatedKey,
        };
      });
    } catch (error) {
      throw this.handleError(error, 'scanItems', { options });
    }
  }

  /**
   * Batch get multiple items
   */
  async batchGetItems(
    keys: Array<{ PK: string; SK: string }>,
    options: BatchGetOptions = {}
  ): Promise<DynamoDBItem[]> {
    try {
      return await this.retryService.executeWithRetry(async () => {
        const command = new BatchGetCommand({
          RequestItems: {
            [this.tableName]: {
              Keys: keys,
              ConsistentRead: options.consistentRead,
              ProjectionExpression: options.projectionExpression,
              ExpressionAttributeNames: options.expressionAttributeNames,
            },
          },
        });

        const result = await this.client.send(command);
        return result.Responses?.[this.tableName] as DynamoDBItem[] || [];
      });
    } catch (error) {
      throw this.handleError(error, 'batchGetItems', { keys, options });
    }
  }

  /**
   * Batch write multiple items (put or delete)
   */
  async batchWriteItems(
    putItems: DynamoDBItem[] = [],
    deleteKeys: Array<{ PK: string; SK: string }> = []
  ): Promise<void> {
    try {
      await this.retryService.executeWithRetry(async () => {
        const requestItems = [];

        // Add put requests
        for (const item of putItems) {
          requestItems.push({
            PutRequest: {
              Item: {
                ...item,
                updatedAt: new Date().toISOString(),
              },
            },
          });
        }

        // Add delete requests
        for (const key of deleteKeys) {
          requestItems.push({
            DeleteRequest: {
              Key: key,
            },
          });
        }

        if (requestItems.length === 0) {
          return;
        }

        const command = new BatchWriteCommand({
          RequestItems: {
            [this.tableName]: requestItems,
          },
        });

        await this.client.send(command);
      });
    } catch (error) {
      throw this.handleError(error, 'batchWriteItems', { putItems, deleteKeys });
    }
  }

  /**
   * Execute a transaction with multiple operations
   */
  async transactWrite(items: TransactionItem[]): Promise<void> {
    try {
      await this.retryService.executeWithRetry(async () => {
        const transactItems = items.map((item) => {
          const baseItem = {
            TableName: this.tableName,
            ConditionExpression: item.conditionExpression,
            ExpressionAttributeNames: item.expressionAttributeNames,
            ExpressionAttributeValues: item.expressionAttributeValues,
          };

          switch (item.operation) {
            case 'Put':
              return {
                Put: {
                  ...baseItem,
                  Item: {
                    ...item.item,
                    updatedAt: new Date().toISOString(),
                  },
                },
              };
            case 'Update':
              return {
                Update: {
                  ...baseItem,
                  Key: item.key,
                  UpdateExpression: item.updateExpression,
                  ExpressionAttributeValues: {
                    ...item.expressionAttributeValues,
                    ':updatedAt': new Date().toISOString(),
                  },
                },
              };
            case 'Delete':
              return {
                Delete: {
                  ...baseItem,
                  Key: item.key,
                },
              };
            case 'ConditionCheck':
              return {
                ConditionCheck: {
                  ...baseItem,
                  Key: item.key,
                },
              };
            default:
              throw new Error(`Unsupported transaction operation: ${item.operation}`);
          }
        });

        const command = new TransactWriteCommand({
          TransactItems: transactItems,
        });

        await this.client.send(command);
      });
    } catch (error) {
      throw this.handleError(error, 'transactWrite', { items });
    }
  }

  /**
   * Execute a transaction to get multiple items
   */
  async transactGet(keys: Array<{ PK: string; SK: string }>): Promise<DynamoDBItem[]> {
    try {
      return await this.retryService.executeWithRetry(async () => {
        const transactItems = keys.map((key) => ({
          Get: {
            TableName: this.tableName,
            Key: key,
          },
        }));

        const command = new TransactGetCommand({
          TransactItems: transactItems,
        });

        const result = await this.client.send(command);
        return result.Responses?.map((response) => response.Item as DynamoDBItem).filter(Boolean) || [];
      });
    } catch (error) {
      throw this.handleError(error, 'transactGet', { keys });
    }
  }

  /**
   * Handle and transform DynamoDB errors
   */
  private handleError(error: any, operation: string, context: any): DynamoDBError {
    console.error(`DynamoDB ${operation} error:`, error, 'Context:', context);

    if (error instanceof DynamoDBError) {
      return error;
    }

    let errorType: DynamoDBErrorType = DynamoDBErrorType.UNKNOWN;
    let message = error.message || 'Unknown DynamoDB error';

    if (error.name) {
      switch (error.name) {
        case 'ConditionalCheckFailedException':
          errorType = DynamoDBErrorType.CONDITIONAL_CHECK_FAILED;
          message = 'Conditional check failed';
          break;
        case 'ItemCollectionSizeLimitExceededException':
          errorType = DynamoDBErrorType.ITEM_COLLECTION_SIZE_LIMIT_EXCEEDED;
          message = 'Item collection size limit exceeded';
          break;
        case 'LimitExceededException':
          errorType = DynamoDBErrorType.LIMIT_EXCEEDED;
          message = 'Request limit exceeded';
          break;
        case 'ProvisionedThroughputExceededException':
          errorType = DynamoDBErrorType.PROVISIONED_THROUGHPUT_EXCEEDED;
          message = 'Provisioned throughput exceeded';
          break;
        case 'RequestLimitExceeded':
          errorType = DynamoDBErrorType.REQUEST_LIMIT_EXCEEDED;
          message = 'Request limit exceeded';
          break;
        case 'ResourceNotFoundException':
          errorType = DynamoDBErrorType.RESOURCE_NOT_FOUND;
          message = 'Resource not found';
          break;
        case 'ServiceUnavailable':
          errorType = DynamoDBErrorType.SERVICE_UNAVAILABLE;
          message = 'Service unavailable';
          break;
        case 'ThrottlingException':
          errorType = DynamoDBErrorType.THROTTLING;
          message = 'Request was throttled';
          break;
        case 'UnrecognizedClientException':
          errorType = DynamoDBErrorType.UNRECOGNIZED_CLIENT;
          message = 'Unrecognized client';
          break;
        case 'ValidationException':
          errorType = DynamoDBErrorType.VALIDATION;
          message = 'Validation error';
          break;
        case 'AccessDeniedException':
          errorType = DynamoDBErrorType.ACCESS_DENIED;
          message = 'Access denied';
          break;
        case 'InternalServerError':
          errorType = DynamoDBErrorType.INTERNAL_SERVER_ERROR;
          message = 'Internal server error';
          break;
        case 'TransactionConflictException':
          errorType = DynamoDBErrorType.TRANSACTION_CONFLICT;
          message = 'Transaction conflict';
          break;
        case 'TransactionCanceledException':
          errorType = DynamoDBErrorType.TRANSACTION_CANCELED;
          message = 'Transaction was canceled';
          break;
        case 'TransactionInProgressException':
          errorType = DynamoDBErrorType.TRANSACTION_IN_PROGRESS;
          message = 'Transaction in progress';
          break;
      }
    }

    return new DynamoDBError(errorType, message, operation, context, error);
  }
}