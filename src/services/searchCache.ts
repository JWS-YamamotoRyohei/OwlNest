/**
 * Search cache service for optimizing search performance
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

interface SearchCacheOptions {
  maxSize?: number;
  defaultTTL?: number; // Default TTL in milliseconds
}

class SearchCache {
  private cache = new Map<string, CacheEntry<any>>();
  private maxSize: number;
  private defaultTTL: number;

  constructor(options: SearchCacheOptions = {}) {
    this.maxSize = options.maxSize || 100;
    this.defaultTTL = options.defaultTTL || 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Generate cache key from search parameters
   */
  private generateKey(type: string, query?: string, filters?: any, sort?: any): string {
    const keyParts = [type];

    if (query) {
      keyParts.push(`q:${query}`);
    }

    if (filters && Object.keys(filters).length > 0) {
      const filterStr = Object.entries(filters)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}:${JSON.stringify(value)}`)
        .join('|');
      keyParts.push(`f:${filterStr}`);
    }

    if (sort) {
      keyParts.push(`s:${sort.field}:${sort.direction}`);
    }

    return keyParts.join('::');
  }

  /**
   * Check if cache entry is expired
   */
  private isExpired(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Evict oldest entries if cache is full
   */
  private evictIfNeeded(): void {
    if (this.cache.size >= this.maxSize) {
      // Remove oldest entries (simple LRU)
      const entries = Array.from(this.cache.entries());
      entries.sort(([, a], [, b]) => a.timestamp - b.timestamp);

      const toRemove = Math.ceil(this.maxSize * 0.2); // Remove 20% of entries
      for (let i = 0; i < toRemove; i++) {
        this.cache.delete(entries[i][0]);
      }
    }
  }

  /**
   * Get cached search results
   */
  get<T>(type: string, query?: string, filters?: any, sort?: any): T | null {
    const key = this.generateKey(type, query, filters, sort);
    const entry = this.cache.get(key);

    if (!entry || this.isExpired(entry)) {
      if (entry) {
        this.cache.delete(key);
      }
      return null;
    }

    // Update timestamp for LRU
    entry.timestamp = Date.now();
    return entry.data;
  }

  /**
   * Set cached search results
   */
  set<T>(type: string, data: T, query?: string, filters?: any, sort?: any, ttl?: number): void {
    const key = this.generateKey(type, query, filters, sort);

    this.evictIfNeeded();

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    });
  }

  /**
   * Clear all cached entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Clear cached entries for specific type
   */
  clearType(type: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${type}::`)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    memoryUsage: number;
  } {
    // Simple memory estimation
    const memoryUsage = Array.from(this.cache.values()).reduce((total, entry) => {
      return total + JSON.stringify(entry.data).length * 2; // Rough estimate
    }, 0);

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: 0, // Would need to track hits/misses for accurate calculation
      memoryUsage,
    };
  }

  /**
   * Start periodic cleanup
   */
  startCleanup(intervalMs: number = 60000): void {
    setInterval(() => {
      this.cleanup();
    }, intervalMs);
  }
}

// Suggestion cache for autocomplete
class SuggestionCache {
  private cache = new Map<string, CacheEntry<any>>();
  private maxSize = 50;
  private defaultTTL = 10 * 60 * 1000; // 10 minutes

  private generateKey(query: string, type?: string): string {
    return `${type || 'all'}:${query.toLowerCase()}`;
  }

  get(query: string, type?: string): any[] | null {
    const key = this.generateKey(query, type);
    const entry = this.cache.get(key);

    if (!entry || Date.now() - entry.timestamp > entry.ttl) {
      if (entry) {
        this.cache.delete(key);
      }
      return null;
    }

    return entry.data;
  }

  set(query: string, suggestions: any[], type?: string): void {
    const key = this.generateKey(query, type);

    if (this.cache.size >= this.maxSize) {
      // Remove oldest entry
      const oldestKey = Array.from(this.cache.entries()).sort(
        ([, a], [, b]) => a.timestamp - b.timestamp
      )[0][0];
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      data: suggestions,
      timestamp: Date.now(),
      ttl: this.defaultTTL,
    });
  }

  clear(): void {
    this.cache.clear();
  }
}

// Popular searches cache
class PopularSearchCache {
  private cache: CacheEntry<any[]> | null = null;
  private ttl = 30 * 60 * 1000; // 30 minutes

  get(): any[] | null {
    if (!this.cache || Date.now() - this.cache.timestamp > this.cache.ttl) {
      return null;
    }
    return this.cache.data;
  }

  set(searches: any[]): void {
    this.cache = {
      data: searches,
      timestamp: Date.now(),
      ttl: this.ttl,
    };
  }

  clear(): void {
    this.cache = null;
  }
}

// Create singleton instances
export const searchCache = new SearchCache({
  maxSize: 100,
  defaultTTL: 5 * 60 * 1000, // 5 minutes
});

export const suggestionCache = new SuggestionCache();
export const popularSearchCache = new PopularSearchCache();

// Start cleanup
searchCache.startCleanup();

export { SearchCache, SuggestionCache, PopularSearchCache };
