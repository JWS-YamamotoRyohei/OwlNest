import { DynamoDBService, DynamoDBItem, QueryOptions } from './DynamoDBService';

/**
 * Helper functions for common DynamoDB operations
 */
export class DynamoDBHelpers {
  constructor(private dynamoService: DynamoDBService) {}

  /**
   * Generate a unique ID with timestamp prefix for sorting
   */
  static generateId(prefix = ''): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return prefix ? `${prefix}${timestamp}${random}` : `${timestamp}${random}`;
  }

  /**
   * Generate TTL timestamp (seconds since epoch)
   */
  static generateTTL(daysFromNow: number): number {
    return Math.floor(Date.now() / 1000) + daysFromNow * 24 * 60 * 60;
  }

  /**
   * Create pagination token from DynamoDB LastEvaluatedKey
   */
  static createPaginationToken(lastEvaluatedKey?: Record<string, any>): string | undefined {
    if (!lastEvaluatedKey) {
      return undefined;
    }
    return Buffer.from(JSON.stringify(lastEvaluatedKey)).toString('base64');
  }

  /**
   * Parse pagination token to DynamoDB ExclusiveStartKey
   */
  static parsePaginationToken(token?: string): Record<string, any> | undefined {
    if (!token) {
      return undefined;
    }
    try {
      return JSON.parse(Buffer.from(token, 'base64').toString());
    } catch (error) {
      console.warn('Invalid pagination token:', error);
      return undefined;
    }
  }

  /**
   * Build update expression from object
   */
  static buildUpdateExpression(
    updates: Record<string, any>,
    options: {
      skipUndefined?: boolean;
      skipNull?: boolean;
      prefix?: string;
    } = {}
  ): {
    updateExpression: string;
    expressionAttributeNames: Record<string, string>;
    expressionAttributeValues: Record<string, any>;
  } {
    const { skipUndefined = true, skipNull = false, prefix = '' } = options;

    const setExpressions: string[] = [];
    const removeExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    Object.entries(updates).forEach(([key, value]) => {
      // Skip undefined values if requested
      if (skipUndefined && value === undefined) {
        return;
      }

      // Handle null values
      if (value === null) {
        if (skipNull) {
          return;
        }
        // Remove the attribute if value is null
        const nameKey = `#${prefix}${key}`;
        expressionAttributeNames[nameKey] = key;
        removeExpressions.push(nameKey);
        return;
      }

      // Set the attribute
      const nameKey = `#${prefix}${key}`;
      const valueKey = `:${prefix}${key}`;

      expressionAttributeNames[nameKey] = key;
      expressionAttributeValues[valueKey] = value;
      setExpressions.push(`${nameKey} = ${valueKey}`);
    });

    // Build the complete update expression
    const expressions: string[] = [];

    if (setExpressions.length > 0) {
      expressions.push(`SET ${setExpressions.join(', ')}`);
    }

    if (removeExpressions.length > 0) {
      expressions.push(`REMOVE ${removeExpressions.join(', ')}`);
    }

    return {
      updateExpression: expressions.join(' '),
      expressionAttributeNames,
      expressionAttributeValues,
    };
  }

  /**
   * Build filter expression for queries
   */
  static buildFilterExpression(
    filters: Record<string, any>,
    options: {
      operator?: 'AND' | 'OR';
      prefix?: string;
    } = {}
  ): {
    filterExpression: string;
    expressionAttributeNames: Record<string, string>;
    expressionAttributeValues: Record<string, any>;
  } {
    const { operator = 'AND', prefix = 'filter' } = options;

    const expressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    Object.entries(filters).forEach(([key, value], index) => {
      if (value === undefined) {
        return;
      }

      const nameKey = `#${prefix}${index}`;
      const valueKey = `:${prefix}${index}`;

      expressionAttributeNames[nameKey] = key;

      if (Array.isArray(value)) {
        // IN operator for arrays
        const valueKeys = value.map((_, i) => `:${prefix}${index}_${i}`);
        value.forEach((v, i) => {
          expressionAttributeValues[`:${prefix}${index}_${i}`] = v;
        });
        expressions.push(`${nameKey} IN (${valueKeys.join(', ')})`);
      } else if (typeof value === 'object' && value !== null) {
        // Handle comparison operators
        if (value.eq !== undefined) {
          expressionAttributeValues[valueKey] = value.eq;
          expressions.push(`${nameKey} = ${valueKey}`);
        } else if (value.ne !== undefined) {
          expressionAttributeValues[valueKey] = value.ne;
          expressions.push(`${nameKey} <> ${valueKey}`);
        } else if (value.gt !== undefined) {
          expressionAttributeValues[valueKey] = value.gt;
          expressions.push(`${nameKey} > ${valueKey}`);
        } else if (value.gte !== undefined) {
          expressionAttributeValues[valueKey] = value.gte;
          expressions.push(`${nameKey} >= ${valueKey}`);
        } else if (value.lt !== undefined) {
          expressionAttributeValues[valueKey] = value.lt;
          expressions.push(`${nameKey} < ${valueKey}`);
        } else if (value.lte !== undefined) {
          expressionAttributeValues[valueKey] = value.lte;
          expressions.push(`${nameKey} <= ${valueKey}`);
        } else if (value.contains !== undefined) {
          expressionAttributeValues[valueKey] = value.contains;
          expressions.push(`contains(${nameKey}, ${valueKey})`);
        } else if (value.beginsWith !== undefined) {
          expressionAttributeValues[valueKey] = value.beginsWith;
          expressions.push(`begins_with(${nameKey}, ${valueKey})`);
        } else if (
          value.between !== undefined &&
          Array.isArray(value.between) &&
          value.between.length === 2
        ) {
          expressionAttributeValues[`${valueKey}_start`] = value.between[0];
          expressionAttributeValues[`${valueKey}_end`] = value.between[1];
          expressions.push(`${nameKey} BETWEEN ${valueKey}_start AND ${valueKey}_end`);
        }
      } else {
        // Simple equality
        expressionAttributeValues[valueKey] = value;
        expressions.push(`${nameKey} = ${valueKey}`);
      }
    });

    return {
      filterExpression: expressions.join(` ${operator} `),
      expressionAttributeNames,
      expressionAttributeValues,
    };
  }

  /**
   * Query all items with pagination handling
   */
  async queryAllItems(
    PK: string,
    SKCondition?: string,
    options: QueryOptions = {}
  ): Promise<DynamoDBItem[]> {
    const allItems: DynamoDBItem[] = [];
    let lastEvaluatedKey: Record<string, any> | undefined;

    do {
      const result = await this.dynamoService.queryItems(PK, SKCondition, {
        ...options,
        exclusiveStartKey: lastEvaluatedKey,
      });

      allItems.push(...result.items);
      lastEvaluatedKey = result.lastEvaluatedKey;
    } while (lastEvaluatedKey);

    return allItems;
  }

  /**
   * Query items with automatic pagination
   */
  async queryItemsPaginated(
    PK: string,
    SKCondition?: string,
    options: QueryOptions & {
      pageSize?: number;
      paginationToken?: string;
    } = {}
  ): Promise<{
    items: DynamoDBItem[];
    nextToken?: string;
    hasMore: boolean;
  }> {
    const { pageSize = 20, paginationToken, ...queryOptions } = options;

    const result = await this.dynamoService.queryItems(PK, SKCondition, {
      ...queryOptions,
      limit: pageSize,
      exclusiveStartKey: DynamoDBHelpers.parsePaginationToken(paginationToken),
    });

    return {
      items: result.items,
      nextToken: DynamoDBHelpers.createPaginationToken(result.lastEvaluatedKey),
      hasMore: !!result.lastEvaluatedKey,
    };
  }

  /**
   * Batch get items with automatic chunking
   */
  async batchGetItemsChunked(
    keys: Array<{ PK: string; SK: string }>,
    chunkSize = 100
  ): Promise<DynamoDBItem[]> {
    const allItems: DynamoDBItem[] = [];

    for (let i = 0; i < keys.length; i += chunkSize) {
      const chunk = keys.slice(i, i + chunkSize);
      const items = await this.dynamoService.batchGetItems(chunk);
      allItems.push(...items);
    }

    return allItems;
  }

  /**
   * Batch write items with automatic chunking
   */
  async batchWriteItemsChunked(
    putItems: DynamoDBItem[] = [],
    deleteKeys: Array<{ PK: string; SK: string }> = [],
    chunkSize = 25
  ): Promise<void> {
    const totalOperations = putItems.length + deleteKeys.length;

    for (let i = 0; i < totalOperations; i += chunkSize) {
      const putChunk = putItems.slice(i, Math.min(i + chunkSize, putItems.length));
      const deleteStart = Math.max(0, i - putItems.length);
      const deleteEnd = Math.min(deleteStart + chunkSize - putChunk.length, deleteKeys.length);
      const deleteChunk = deleteKeys.slice(deleteStart, deleteEnd);

      if (putChunk.length > 0 || deleteChunk.length > 0) {
        await this.dynamoService.batchWriteItems(putChunk, deleteChunk);
      }
    }
  }

  /**
   * Check if item exists
   */
  async itemExists(PK: string, SK: string): Promise<boolean> {
    try {
      const item = await this.dynamoService.getItem(PK, SK);
      return item !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get item with fallback
   */
  async getItemWithFallback<T extends DynamoDBItem>(
    PK: string,
    SK: string,
    fallback: T
  ): Promise<T> {
    const item = await this.dynamoService.getItem(PK, SK);
    return (item as T) || fallback;
  }

  /**
   * Increment numeric attribute
   */
  async incrementAttribute(
    PK: string,
    SK: string,
    attributeName: string,
    incrementBy = 1
  ): Promise<number> {
    const result = await this.dynamoService.updateItem(PK, SK, {
      updateExpression: `ADD #attr :increment`,
      expressionAttributeNames: {
        '#attr': attributeName,
      },
      expressionAttributeValues: {
        ':increment': incrementBy,
      },
      returnValues: 'ALL_NEW',
    });

    return result?.[attributeName] || 0;
  }

  /**
   * Append to list attribute
   */
  async appendToList(PK: string, SK: string, attributeName: string, values: any[]): Promise<void> {
    await this.dynamoService.updateItem(PK, SK, {
      updateExpression: `SET #attr = list_append(if_not_exists(#attr, :empty_list), :values)`,
      expressionAttributeNames: {
        '#attr': attributeName,
      },
      expressionAttributeValues: {
        ':empty_list': [],
        ':values': values,
      },
    });
  }

  /**
   * Add to string set attribute
   */
  async addToStringSet(
    PK: string,
    SK: string,
    attributeName: string,
    values: string[]
  ): Promise<void> {
    await this.dynamoService.updateItem(PK, SK, {
      updateExpression: `ADD #attr :values`,
      expressionAttributeNames: {
        '#attr': attributeName,
      },
      expressionAttributeValues: {
        ':values': new Set(values),
      },
    });
  }

  /**
   * Remove from string set attribute
   */
  async removeFromStringSet(
    PK: string,
    SK: string,
    attributeName: string,
    values: string[]
  ): Promise<void> {
    await this.dynamoService.updateItem(PK, SK, {
      updateExpression: `DELETE #attr :values`,
      expressionAttributeNames: {
        '#attr': attributeName,
      },
      expressionAttributeValues: {
        ':values': new Set(values),
      },
    });
  }
}
