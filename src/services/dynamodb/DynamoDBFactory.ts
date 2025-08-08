import { DynamoDBService, DynamoDBConfig } from './DynamoDBService';
import { DynamoDBHelpers } from './DynamoDBHelpers';

/**
 * Factory for creating DynamoDB service instances
 */
export class DynamoDBFactory {
  private static instance: DynamoDBService | null = null;
  private static helpers: DynamoDBHelpers | null = null;

  /**
   * Create a DynamoDB service instance
   */
  static createService(config: DynamoDBConfig): DynamoDBService {
    return new DynamoDBService(config);
  }

  /**
   * Get or create a singleton DynamoDB service instance
   */
  static getInstance(config?: DynamoDBConfig): DynamoDBService {
    if (!DynamoDBFactory.instance) {
      if (!config) {
        throw new Error('DynamoDB configuration is required for first initialization');
      }
      DynamoDBFactory.instance = new DynamoDBService(config);
    }
    return DynamoDBFactory.instance;
  }

  /**
   * Get or create DynamoDB helpers instance
   */
  static getHelpers(config?: DynamoDBConfig): DynamoDBHelpers {
    if (!DynamoDBFactory.helpers) {
      const service = DynamoDBFactory.getInstance(config);
      DynamoDBFactory.helpers = new DynamoDBHelpers(service);
    }
    return DynamoDBFactory.helpers;
  }

  /**
   * Create a DynamoDB service for development environment
   */
  static createDevelopmentService(tableName: string): DynamoDBService {
    return new DynamoDBService({
      region: process.env.AWS_REGION || 'ap-northeast-1',
      tableName,
      endpoint: process.env.DYNAMODB_ENDPOINT, // For local DynamoDB
      maxRetries: 3,
      retryDelayBase: 100,
    });
  }

  /**
   * Create a DynamoDB service for production environment
   */
  static createProductionService(tableName: string): DynamoDBService {
    return new DynamoDBService({
      region: process.env.AWS_REGION || 'ap-northeast-1',
      tableName,
      maxRetries: 5,
      retryDelayBase: 200,
    });
  }

  /**
   * Create a DynamoDB service from environment variables
   */
  static createFromEnvironment(): DynamoDBService {
    const tableName = process.env.DYNAMODB_TABLE_NAME;
    if (!tableName) {
      throw new Error('DYNAMODB_TABLE_NAME environment variable is required');
    }

    const config: DynamoDBConfig = {
      region: process.env.AWS_REGION || 'ap-northeast-1',
      tableName,
      endpoint: process.env.DYNAMODB_ENDPOINT,
      maxRetries: parseInt(process.env.DYNAMODB_MAX_RETRIES || '3', 10),
      retryDelayBase: parseInt(process.env.DYNAMODB_RETRY_DELAY_BASE || '100', 10),
    };

    return new DynamoDBService(config);
  }

  /**
   * Reset singleton instances (useful for testing)
   */
  static reset(): void {
    DynamoDBFactory.instance = null;
    DynamoDBFactory.helpers = null;
  }

  /**
   * Create a test service with mock configuration
   */
  static createTestService(): DynamoDBService {
    return new DynamoDBService({
      region: 'us-east-1',
      tableName: 'test-table',
      endpoint: 'http://localhost:8000',
      maxRetries: 1,
      retryDelayBase: 10,
    });
  }
}

// Export a default instance getter for convenience
export const getDynamoDBService = (config?: DynamoDBConfig): DynamoDBService => {
  return DynamoDBFactory.getInstance(config);
};

export const getDynamoDBHelpers = (config?: DynamoDBConfig): DynamoDBHelpers => {
  return DynamoDBFactory.getHelpers(config);
};
