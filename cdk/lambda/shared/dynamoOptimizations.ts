/**
 * DynamoDB query optimizations
 */

import { 
  QueryCommand, 
  ScanCommand, 
  GetCommand,
  BatchGetCommand,
  TransactGetCommand
} from '@aws-sdk/lib-dynamodb';
import { getOptimizedDynamoClient, queryCache } from './optimizations';

const dynamoClient = getOptimizedDynamoClient();

/**
 * Optimized query builder with automatic caching
 */
export class OptimizedQueryBuilder {
  private tableName: string;
  private indexName?: string;
  private keyCondition?: string;
  private keyValues: { [key: string]: any } = {};
  private filterExpression?: string;
  private filterValues: { [key: string]: any } = {};
  private projectionExpression?: string;
  private limit?: number;
  private scanIndexForward?: boolean;
  private consistentRead?: boolean;
  private cacheKey?: string;
  private cacheTTL: number = 300000; // 5 minutes default

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  index(indexName: string): this {
    this.indexName = indexName;
    return this;
  }

  where(keyCondition: string, values: { [key: string]: any }): this {
    this.keyCondition = keyCondition;
    this.keyValues = { ...this.keyValues, ...values };
    return this;
  }

  filter(filterExpression: string, values: { [key: string]: any }): this {
    this.filterExpression = filterExpression;
    this.filterValues = { ...this.filterValues, ...values };
    return this;
  }

  select(projectionExpression: string): this {
    this.projectionExpression = projectionExpression;
    return this;
  }

  take(limit: number): this {
    this.limit = limit;
    return this;
  }

  orderBy(ascending: boolean = true): this {
    this.scanIndexForward = ascending;
    return this;
  }

  consistent(consistent: boolean = true): this {
    this.consistentRead = consistent;
    return this;
  }

  cache(key: string, ttlMs: number = 300000): this {
    this.cacheKey = key;
    this.cacheTTL = ttlMs;
    return this;
  }

  private buildQueryParams() {
    const params: any = {
      TableName: this.tableName
    };

    if (this.indexName) {
      params.IndexName = this.indexName;
    }

    if (this.keyCondition) {
      params.KeyConditionExpression = this.keyCondition;
    }

    if (Object.keys(this.keyValues).length > 0) {
      params.ExpressionAttributeValues = {
        ...params.ExpressionAttributeValues,
        ...this.keyValues
      };
    }

    if (this.filterExpression) {
      params.FilterExpression = this.filterExpression;
      params.ExpressionAttributeValues = {
        ...params.ExpressionAttributeValues,
        ...this.filterValues
      };
    }

    if (this.projectionExpression) {
      params.ProjectionExpression = this.projectionExpression;
    }

    if (this.limit) {
      params.Limit = this.limit;
    }

    if (this.scanIndexForward !== undefined) {
      params.ScanIndexForward = this.scanIndexForward;
    }

    if (this.consistentRead) {
      params.ConsistentRead = this.consistentRead;
    }

    return params;
  }

  async execute<T = any>(): Promise<{ Items: T[]; Count: number; ScannedCount: number; LastEvaluatedKey?: any }> {
    const params = this.buildQueryParams();
    
    // Use cache if specified and not consistent read
    if (this.cacheKey && !this.consistentRead) {
      return queryCache.get(this.cacheKey) || await this.executeQuery(params);
    }

    return this.executeQuery(params);
  }

  private async executeQuery(params: any) {
    const command = new QueryCommand(params);
    const result = await dynamoClient.send(command);
    
    const response = {
      Items: result.Items || [],
      Count: result.Count || 0,
      ScannedCount: result.ScannedCount || 0,
      LastEvaluatedKey: result.LastEvaluatedKey
    };

    // Cache result if cache key is specified
    if (this.cacheKey && !this.consistentRead) {
      queryCache.set(this.cacheKey, response, this.cacheTTL);
    }

    return response;
  }

  async executeAll<T = any>(): Promise<T[]> {
    const allItems: T[] = [];
    let lastEvaluatedKey: any = undefined;

    do {
      const params = this.buildQueryParams();
      if (lastEvaluatedKey) {
        params.ExclusiveStartKey = lastEvaluatedKey;
      }

      const command = new QueryCommand(params);
      const result = await dynamoClient.send(command);
      
      if (result.Items) {
        allItems.push(...result.Items as T[]);
      }
      
      lastEvaluatedKey = result.LastEvaluatedKey;
    } while (lastEvaluatedKey);

    return allItems;
  }
}

/**
 * Batch operations optimizer
 */
export class BatchOperations {
  private static readonly MAX_BATCH_GET_SIZE = 100;
  private static readonly MAX_BATCH_WRITE_SIZE = 25;

  /**
   * Optimized batch get with automatic chunking
   */
  static async batchGet<T = any>(
    tableName: string,
    keys: { [key: string]: any }[],
    projectionExpression?: string
  ): Promise<T[]> {
    if (keys.length === 0) return [];

    const chunks = this.chunkArray(keys, this.MAX_BATCH_GET_SIZE);
    const allItems: T[] = [];

    for (const chunk of chunks) {
      const params: any = {
        RequestItems: {
          [tableName]: {
            Keys: chunk
          }
        }
      };

      if (projectionExpression) {
        params.RequestItems[tableName].ProjectionExpression = projectionExpression;
      }

      const command = new BatchGetCommand(params);
      const result = await dynamoClient.send(command);
      
      if (result.Responses && result.Responses[tableName]) {
        allItems.push(...result.Responses[tableName] as T[]);
      }

      // Handle unprocessed keys
      if (result.UnprocessedKeys && Object.keys(result.UnprocessedKeys).length > 0) {
        // Retry unprocessed keys with exponential backoff
        await this.retryUnprocessedKeys(result.UnprocessedKeys, allItems);
      }
    }

    return allItems;
  }

  private static async retryUnprocessedKeys(unprocessedKeys: any, allItems: any[], retryCount = 0) {
    if (retryCount >= 3) {
      console.warn('Max retries reached for unprocessed keys');
      return;
    }

    // Exponential backoff
    await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 100));

    const command = new BatchGetCommand({ RequestItems: unprocessedKeys });
    const result = await dynamoClient.send(command);
    
    for (const tableName in result.Responses || {}) {
      allItems.push(...result.Responses![tableName]);
    }

    if (result.UnprocessedKeys && Object.keys(result.UnprocessedKeys).length > 0) {
      await this.retryUnprocessedKeys(result.UnprocessedKeys, allItems, retryCount + 1);
    }
  }

  private static chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
}

/**
 * Query performance analyzer
 */
export class QueryPerformanceAnalyzer {
  private static metrics: { [query: string]: { count: number; totalTime: number; avgTime: number } } = {};

  static startTimer(queryName: string): () => void {
    const startTime = Date.now();
    
    return () => {
      const duration = Date.now() - startTime;
      this.recordMetric(queryName, duration);
    };
  }

  private static recordMetric(queryName: string, duration: number) {
    if (!this.metrics[queryName]) {
      this.metrics[queryName] = { count: 0, totalTime: 0, avgTime: 0 };
    }

    const metric = this.metrics[queryName];
    metric.count++;
    metric.totalTime += duration;
    metric.avgTime = metric.totalTime / metric.count;
  }

  static getMetrics(): { [query: string]: { count: number; totalTime: number; avgTime: number } } {
    return { ...this.metrics };
  }

  static getSlowQueries(thresholdMs: number = 1000): string[] {
    return Object.entries(this.metrics)
      .filter(([_, metric]) => metric.avgTime > thresholdMs)
      .map(([queryName]) => queryName);
  }

  static reset(): void {
    this.metrics = {};
  }
}

/**
 * Connection pool monitoring
 */
export class ConnectionPoolMonitor {
  private static activeConnections = 0;
  private static maxConnections = 0;
  private static totalConnections = 0;

  static incrementConnection(): void {
    this.activeConnections++;
    this.totalConnections++;
    this.maxConnections = Math.max(this.maxConnections, this.activeConnections);
  }

  static decrementConnection(): void {
    this.activeConnections = Math.max(0, this.activeConnections - 1);
  }

  static getStats(): {
    active: number;
    max: number;
    total: number;
  } {
    return {
      active: this.activeConnections,
      max: this.maxConnections,
      total: this.totalConnections
    };
  }

  static reset(): void {
    this.activeConnections = 0;
    this.maxConnections = 0;
    this.totalConnections = 0;
  }
}

/**
 * Create optimized query builder
 */
export function createQuery(tableName: string): OptimizedQueryBuilder {
  return new OptimizedQueryBuilder(tableName);
}

/**
 * Optimized single item get with caching
 */
export async function getItem<T = any>(
  tableName: string,
  key: { [key: string]: any },
  options: {
    projectionExpression?: string;
    consistentRead?: boolean;
    cacheKey?: string;
    cacheTTL?: number;
  } = {}
): Promise<T | null> {
  const { projectionExpression, consistentRead, cacheKey, cacheTTL = 300000 } = options;

  // Check cache first if not consistent read
  if (cacheKey && !consistentRead) {
    const cached = queryCache.get(cacheKey);
    if (cached) {
      return cached;
    }
  }

  const params: any = {
    TableName: tableName,
    Key: key
  };

  if (projectionExpression) {
    params.ProjectionExpression = projectionExpression;
  }

  if (consistentRead) {
    params.ConsistentRead = consistentRead;
  }

  const command = new GetCommand(params);
  const result = await dynamoClient.send(command);
  
  const item = result.Item as T || null;

  // Cache result if cache key is specified
  if (cacheKey && !consistentRead && item) {
    queryCache.set(cacheKey, item, cacheTTL);
  }

  return item;
}