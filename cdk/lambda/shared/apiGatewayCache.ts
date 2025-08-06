/**
 * API Gateway caching configuration and utilities
 */

export interface CacheConfig {
  enabled: boolean;
  ttlInSeconds: number;
  keyParameters?: string[];
  perRequestOverride?: boolean;
}

export const CACHE_CONFIGS: { [endpoint: string]: CacheConfig } = {
  // Discussion endpoints
  'GET /discussions': {
    enabled: true,
    ttlInSeconds: 300, // 5 minutes
    keyParameters: ['category', 'status', 'limit', 'offset'],
    perRequestOverride: true
  },
  'GET /discussion/{id}': {
    enabled: true,
    ttlInSeconds: 180, // 3 minutes
    keyParameters: ['id'],
    perRequestOverride: true
  },
  'GET /discussion/{id}/posts': {
    enabled: true,
    ttlInSeconds: 120, // 2 minutes
    keyParameters: ['id', 'pointId', 'limit', 'offset'],
    perRequestOverride: true
  },
  
  // User endpoints
  'GET /user/{id}': {
    enabled: true,
    ttlInSeconds: 600, // 10 minutes
    keyParameters: ['id'],
    perRequestOverride: false
  },
  'GET /user/{id}/discussions': {
    enabled: true,
    ttlInSeconds: 300, // 5 minutes
    keyParameters: ['id', 'limit', 'offset'],
    perRequestOverride: true
  },

  // Search endpoints
  'GET /search': {
    enabled: true,
    ttlInSeconds: 600, // 10 minutes
    keyParameters: ['q', 'type', 'category', 'limit', 'offset'],
    perRequestOverride: true
  },

  // Analytics endpoints
  'GET /analytics/discussion/{id}': {
    enabled: true,
    ttlInSeconds: 900, // 15 minutes
    keyParameters: ['id', 'period'],
    perRequestOverride: true
  }
};

/**
 * Generate cache key for API Gateway
 */
export function generateCacheKey(
  method: string,
  path: string,
  queryParams: { [key: string]: string } = {},
  pathParams: { [key: string]: string } = {}
): string {
  const endpoint = `${method} ${path}`;
  const config = CACHE_CONFIGS[endpoint];
  
  if (!config || !config.enabled) {
    return '';
  }

  const keyParts: string[] = [method, path];
  
  if (config.keyParameters) {
    for (const param of config.keyParameters) {
      const value = queryParams[param] || pathParams[param] || '';
      keyParts.push(`${param}=${value}`);
    }
  }

  return keyParts.join('|');
}

/**
 * Check if endpoint should be cached
 */
export function shouldCache(method: string, path: string): boolean {
  const endpoint = `${method} ${path}`;
  const config = CACHE_CONFIGS[endpoint];
  return config?.enabled || false;
}

/**
 * Get cache TTL for endpoint
 */
export function getCacheTTL(method: string, path: string): number {
  const endpoint = `${method} ${path}`;
  const config = CACHE_CONFIGS[endpoint];
  return config?.ttlInSeconds || 0;
}

/**
 * Cache headers for Lambda response
 */
export function getCacheHeaders(
  method: string,
  path: string,
  customTTL?: number
): { [key: string]: string } {
  const endpoint = `${method} ${path}`;
  const config = CACHE_CONFIGS[endpoint];
  
  if (!config || !config.enabled) {
    return {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    };
  }

  const ttl = customTTL || config.ttlInSeconds;
  
  return {
    'Cache-Control': `public, max-age=${ttl}, s-maxage=${ttl}`,
    'ETag': generateETag(method, path),
    'Last-Modified': new Date().toUTCString()
  };
}

/**
 * Generate ETag for response
 */
function generateETag(method: string, path: string): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const hash = Buffer.from(`${method}:${path}:${timestamp}`).toString('base64');
  return `"${hash}"`;
}

/**
 * Invalidate cache patterns
 */
export const CACHE_INVALIDATION_PATTERNS = {
  // When discussion is created/updated/deleted
  discussionChanged: (discussionId: string) => [
    `/discussions*`,
    `/discussion/${discussionId}*`,
    `/user/*/discussions*`,
    `/analytics/discussion/${discussionId}*`
  ],
  
  // When post is created/updated/deleted
  postChanged: (discussionId: string) => [
    `/discussion/${discussionId}/posts*`,
    `/discussion/${discussionId}`,
    `/analytics/discussion/${discussionId}*`
  ],
  
  // When user is updated
  userChanged: (userId: string) => [
    `/user/${userId}*`,
    `/discussions*` // User role might affect discussion visibility
  ],
  
  // When search index is updated
  searchIndexChanged: () => [
    `/search*`
  ]
};

/**
 * CloudFront cache behaviors configuration
 */
export const CLOUDFRONT_CACHE_BEHAVIORS = {
  // Static assets - long cache
  '/static/*': {
    ttl: 31536000, // 1 year
    compress: true,
    viewerProtocolPolicy: 'redirect-to-https'
  },
  
  // API responses - short cache
  '/api/*': {
    ttl: 300, // 5 minutes
    compress: true,
    viewerProtocolPolicy: 'https-only',
    cacheKeyPolicy: 'query-strings-and-headers'
  },
  
  // Images - medium cache
  '/images/*': {
    ttl: 86400, // 1 day
    compress: true,
    viewerProtocolPolicy: 'redirect-to-https'
  }
};

/**
 * DynamoDB query result caching
 */
export class DynamoQueryCache {
  private static cache = new Map<string, { data: any; expiry: number }>();
  private static readonly DEFAULT_TTL = 300000; // 5 minutes

  static async get<T>(
    key: string,
    queryFn: () => Promise<T>,
    ttlMs: number = this.DEFAULT_TTL
  ): Promise<T> {
    // Check cache
    const cached = this.cache.get(key);
    if (cached && Date.now() < cached.expiry) {
      return cached.data;
    }

    // Execute query
    const result = await queryFn();
    
    // Cache result
    this.cache.set(key, {
      data: result,
      expiry: Date.now() + ttlMs
    });

    // Cleanup old entries periodically
    if (this.cache.size > 1000) {
      this.cleanup();
    }

    return result;
  }

  static invalidate(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  static clear(): void {
    this.cache.clear();
  }

  private static cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now > value.expiry) {
        this.cache.delete(key);
      }
    }
  }

  static getStats(): { size: number; hitRate: number } {
    return {
      size: this.cache.size,
      hitRate: 0 // TODO: Implement hit rate tracking
    };
  }
}