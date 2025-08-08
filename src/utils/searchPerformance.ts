/**
 * Search performance monitoring and optimization utilities
 */
import { useState } from 'react';

interface PerformanceMetric {
  operation: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

interface SearchMetrics {
  totalSearches: number;
  averageResponseTime: number;
  cacheHitRate: number;
  slowQueries: PerformanceMetric[];
  errorRate: number;
}

class SearchPerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private maxMetrics = 1000;
  private slowQueryThreshold = 1000; // 1 second
  private cacheHits = 0;
  private cacheMisses = 0;
  private errors = 0;

  /**
   * Start timing a search operation
   */
  startTiming(operation: string): (metadata?: Record<string, any>) => void {
    const startTime = performance.now();

    return (metadata?: Record<string, any>) => {
      const duration = performance.now() - startTime;
      this.recordMetric({
        operation,
        duration,
        timestamp: Date.now(),
        metadata,
      });
    };
  }

  /**
   * Record a performance metric
   */
  private recordMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);

    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  /**
   * Record cache hit
   */
  recordCacheHit(): void {
    this.cacheHits++;
  }

  /**
   * Record cache miss
   */
  recordCacheMiss(): void {
    this.cacheMisses++;
  }

  /**
   * Record error
   */
  recordError(): void {
    this.errors++;
  }

  /**
   * Get current search metrics
   */
  getMetrics(): SearchMetrics {
    const totalSearches = this.metrics.length;
    const totalTime = this.metrics.reduce((sum, metric) => sum + metric.duration, 0);
    const averageResponseTime = totalSearches > 0 ? totalTime / totalSearches : 0;

    const slowQueries = this.metrics.filter(metric => metric.duration > this.slowQueryThreshold);

    const totalCacheOperations = this.cacheHits + this.cacheMisses;
    const cacheHitRate =
      totalCacheOperations > 0 ? (this.cacheHits / totalCacheOperations) * 100 : 0;

    const errorRate = totalSearches > 0 ? (this.errors / totalSearches) * 100 : 0;

    return {
      totalSearches,
      averageResponseTime,
      cacheHitRate,
      slowQueries: slowQueries.slice(-10), // Last 10 slow queries
      errorRate,
    };
  }

  /**
   * Get performance recommendations
   */
  getRecommendations(): string[] {
    const metrics = this.getMetrics();
    const recommendations: string[] = [];

    if (metrics.averageResponseTime > 500) {
      recommendations.push('平均応答時間が遅いです。キャッシュの活用を検討してください。');
    }

    if (metrics.cacheHitRate < 50) {
      recommendations.push('キャッシュヒット率が低いです。キャッシュ戦略を見直してください。');
    }

    if (metrics.errorRate > 5) {
      recommendations.push('エラー率が高いです。エラーハンドリングを改善してください。');
    }

    if (metrics.slowQueries.length > 5) {
      recommendations.push('遅いクエリが多数検出されました。検索条件を最適化してください。');
    }

    return recommendations;
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.errors = 0;
  }

  /**
   * Export metrics for analysis
   */
  exportMetrics(): {
    metrics: PerformanceMetric[];
    summary: SearchMetrics;
    recommendations: string[];
  } {
    return {
      metrics: [...this.metrics],
      summary: this.getMetrics(),
      recommendations: this.getRecommendations(),
    };
  }
}

// Debounce utility for search input
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Throttle utility for scroll-based loading
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// Memoization utility for expensive computations
export function memoize<T extends (...args: any[]) => any>(
  func: T,
  getKey?: (...args: Parameters<T>) => string
): T {
  const cache = new Map<string, ReturnType<T>>();

  return ((...args: Parameters<T>) => {
    const key = getKey ? getKey(...args) : JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key);
    }

    const result = func(...args);
    cache.set(key, result);

    return result;
  }) as T;
}

// Query optimization utilities
export const QueryOptimizer = {
  /**
   * Normalize search query for better caching
   */
  normalizeQuery(query: string): string {
    return query
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[^\w\s\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g, ''); // Keep alphanumeric and Japanese characters
  },

  /**
   * Extract keywords from query
   */
  extractKeywords(query: string): string[] {
    const normalized = this.normalizeQuery(query);
    return normalized
      .split(' ')
      .filter(word => word.length > 1)
      .slice(0, 5); // Limit to 5 keywords
  },

  /**
   * Check if query is too broad
   */
  isQueryTooBoard(query: string): boolean {
    const keywords = this.extractKeywords(query);
    return keywords.length === 1 && keywords[0].length < 3;
  },

  /**
   * Suggest query improvements
   */
  suggestImprovements(query: string): string[] {
    const suggestions: string[] = [];

    if (query.length < 2) {
      suggestions.push('より具体的なキーワードを入力してください');
    }

    if (this.isQueryTooBoard(query)) {
      suggestions.push('検索結果を絞り込むため、より詳細なキーワードを追加してください');
    }

    if (query.length > 100) {
      suggestions.push('検索クエリが長すぎます。重要なキーワードに絞ってください');
    }

    return suggestions;
  },
};

// Create singleton instance
export const searchPerformanceMonitor = new SearchPerformanceMonitor();

// Performance measurement decorator
export function measurePerformance(operation: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const endTiming = searchPerformanceMonitor.startTiming(operation);

      try {
        const result = await method.apply(this, args);
        endTiming({ success: true, args: args.length });
        return result;
      } catch (error) {
        searchPerformanceMonitor.recordError();
        endTiming({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw error;
      }
    };

    return descriptor;
  };
}

// React hook for performance monitoring
export function useSearchPerformance() {
  const [metrics, setMetrics] = useState<SearchMetrics | null>(null);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(searchPerformanceMonitor.getMetrics());
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  return {
    metrics,
    recommendations: metrics ? searchPerformanceMonitor.getRecommendations() : [],
    exportMetrics: () => searchPerformanceMonitor.exportMetrics(),
    clearMetrics: () => searchPerformanceMonitor.clear(),
  };
}

// Add React import for the hook
declare const React: any;
