/**
 * Lambda optimization utilities
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';

// Connection pooling and reuse
let dynamoClient: DynamoDBDocumentClient | null = null;
let cognitoClient: CognitoIdentityProviderClient | null = null;

/**
 * Get optimized DynamoDB client with connection reuse
 */
export function getOptimizedDynamoClient(): DynamoDBDocumentClient {
  if (!dynamoClient) {
    const baseClient = new DynamoDBClient({
      region: process.env.AWS_REGION,
      maxAttempts: 3,
      retryMode: 'adaptive',
      // Connection pooling
      requestHandler: {
        connectionTimeout: 3000,
        socketTimeout: 3000,
        httpOptions: {
          agent: {
            maxSockets: 50,
            keepAlive: true,
            keepAliveMsecs: 30000
          }
        }
      }
    });

    dynamoClient = DynamoDBDocumentClient.from(baseClient, {
      marshallOptions: {
        removeUndefinedValues: true,
        convertEmptyValues: false
      },
      unmarshallOptions: {
        wrapNumbers: false
      }
    });
  }

  return dynamoClient;
}

/**
 * Get optimized Cognito client with connection reuse
 */
export function getOptimizedCognitoClient(): CognitoIdentityProviderClient {
  if (!cognitoClient) {
    cognitoClient = new CognitoIdentityProviderClient({
      region: process.env.AWS_REGION,
      maxAttempts: 3,
      retryMode: 'adaptive',
      requestHandler: {
        connectionTimeout: 3000,
        socketTimeout: 3000
      }
    });
  }

  return cognitoClient;
}

/**
 * Memory-efficient cache with TTL
 */
class MemoryCache<T> {
  private cache = new Map<string, { value: T; expiry: number }>();
  private maxSize: number;

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }

  set(key: string, value: T, ttlMs: number = 300000): void { // 5 minutes default
    // Clean expired entries if cache is full
    if (this.cache.size >= this.maxSize) {
      this.cleanup();
    }

    // If still full, remove oldest entry
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      value,
      expiry: Date.now() + ttlMs
    });
  }

  get(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
      }
    }
  }

  getStats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize
    };
  }
}

// Global cache instances
const userCache = new MemoryCache<any>(50);
const discussionCache = new MemoryCache<any>(100);
const queryCache = new MemoryCache<any>(200);

export { userCache, discussionCache, queryCache };

/**
 * Optimized error handling with structured logging
 */
export class OptimizedError extends Error {
  public statusCode: number;
  public code: string;
  public details?: any;

  constructor(message: string, statusCode: number = 500, code?: string, details?: any) {
    super(message);
    this.name = 'OptimizedError';
    this.statusCode = statusCode;
    this.code = code || 'INTERNAL_ERROR';
    this.details = details;
  }
}

/**
 * Performance monitoring for Lambda functions
 */
export class LambdaPerformanceMonitor {
  private startTime: number;
  private metrics: { [key: string]: number } = {};

  constructor() {
    this.startTime = Date.now();
  }

  mark(name: string): void {
    this.metrics[name] = Date.now() - this.startTime;
  }

  getMetrics(): { [key: string]: number } {
    return { ...this.metrics };
  }

  getDuration(): number {
    return Date.now() - this.startTime;
  }

  log(): void {
    console.log('Lambda Performance Metrics:', {
      totalDuration: this.getDuration(),
      ...this.metrics
    });
  }
}

/**
 * Batch operations optimizer
 */
export class BatchOptimizer {
  private static readonly MAX_BATCH_SIZE = 25; // DynamoDB limit

  static chunkArray<T>(array: T[], chunkSize: number = this.MAX_BATCH_SIZE): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  static async processBatches<T, R>(
    items: T[],
    processor: (batch: T[]) => Promise<R>,
    chunkSize: number = this.MAX_BATCH_SIZE
  ): Promise<R[]> {
    const chunks = this.chunkArray(items, chunkSize);
    const results: R[] = [];

    for (const chunk of chunks) {
      try {
        const result = await processor(chunk);
        results.push(result);
      } catch (error) {
        console.error('Batch processing error:', error);
        throw error;
      }
    }

    return results;
  }
}

/**
 * Query optimization utilities
 */
export class QueryOptimizer {
  /**
   * Build optimized DynamoDB query parameters
   */
  static buildQuery(params: {
    tableName: string;
    indexName?: string;
    keyCondition: string;
    keyValues: { [key: string]: any };
    filterExpression?: string;
    filterValues?: { [key: string]: any };
    limit?: number;
    scanIndexForward?: boolean;
    projectionExpression?: string;
  }) {
    const {
      tableName,
      indexName,
      keyCondition,
      keyValues,
      filterExpression,
      filterValues,
      limit,
      scanIndexForward,
      projectionExpression
    } = params;

    const queryParams: any = {
      TableName: tableName,
      KeyConditionExpression: keyCondition,
      ExpressionAttributeValues: keyValues
    };

    if (indexName) {
      queryParams.IndexName = indexName;
    }

    if (filterExpression && filterValues) {
      queryParams.FilterExpression = filterExpression;
      queryParams.ExpressionAttributeValues = {
        ...queryParams.ExpressionAttributeValues,
        ...filterValues
      };
    }

    if (limit) {
      queryParams.Limit = limit;
    }

    if (scanIndexForward !== undefined) {
      queryParams.ScanIndexForward = scanIndexForward;
    }

    if (projectionExpression) {
      queryParams.ProjectionExpression = projectionExpression;
    }

    return queryParams;
  }

  /**
   * Cache query results
   */
  static async cachedQuery<T>(
    cacheKey: string,
    queryFn: () => Promise<T>,
    ttlMs: number = 300000
  ): Promise<T> {
    // Check cache first
    const cached = queryCache.get(cacheKey);
    if (cached) {
      return cached as T;
    }

    // Execute query
    const result = await queryFn();
    
    // Cache result
    queryCache.set(cacheKey, result, ttlMs);
    
    return result;
  }
}

/**
 * Cold start optimization
 */
export function warmupHandler() {
  // Pre-initialize connections
  getOptimizedDynamoClient();
  getOptimizedCognitoClient();
  
  // Pre-warm caches if needed
  console.log('Lambda warmed up');
}

/**
 * Response optimization
 */
export function createOptimizedResponse(
  statusCode: number,
  body: any,
  headers: { [key: string]: string } = {}
): {
  statusCode: number;
  headers: { [key: string]: string };
  body: string;
} {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Cache-Control': statusCode === 200 ? 'public, max-age=300' : 'no-cache',
      ...headers
    },
    body: JSON.stringify(body)
  };
}

/**
 * Input validation with caching
 */
export class InputValidator {
  private static validationCache = new MemoryCache<boolean>(1000);

  static validate(input: any, schema: any, cacheKey?: string): boolean {
    if (cacheKey && this.validationCache.has(cacheKey)) {
      return this.validationCache.get(cacheKey)!;
    }

    // Simple validation logic (in real implementation, use a library like Joi)
    const isValid = this.performValidation(input, schema);

    if (cacheKey) {
      this.validationCache.set(cacheKey, isValid, 60000); // 1 minute cache
    }

    return isValid;
  }

  private static performValidation(input: any, schema: any): boolean {
    // Simplified validation - in real implementation, use proper validation library
    if (schema.required) {
      for (const field of schema.required) {
        if (!(field in input) || input[field] === undefined || input[field] === null) {
          return false;
        }
      }
    }

    return true;
  }
}

/**
 * Memory usage monitoring
 */
export function logMemoryUsage(label: string): void {
  const used = process.memoryUsage();
  console.log(`Memory Usage (${label}):`, {
    rss: Math.round(used.rss / 1024 / 1024 * 100) / 100,
    heapTotal: Math.round(used.heapTotal / 1024 / 1024 * 100) / 100,
    heapUsed: Math.round(used.heapUsed / 1024 / 1024 * 100) / 100,
    external: Math.round(used.external / 1024 / 1024 * 100) / 100
  });
}