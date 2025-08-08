import { memoizeWithTTL, LRUCache } from './memoization';
import { performanceMonitor } from './performanceMonitoring';

/**
 * Route preloading utilities for performance optimization
 */

interface PreloadedRoute {
  path: string;
  component: Promise<any>;
  timestamp: number;
  priority: number;
}

interface PreloadOptions {
  priority?: number;
  timeout?: number;
  retries?: number;
}

class RoutePreloaderClass {
  private preloadedRoutes = new LRUCache<string, PreloadedRoute>(50);
  private preloadQueue: Array<{
    path: string;
    importFn: () => Promise<any>;
    options: PreloadOptions;
  }> = [];
  private isPreloading = false;
  private importFunctions = new Map<string, () => Promise<any>>();
  private routeMap = new Map<string, () => Promise<any>>();

  constructor() {
    this.initializeRouteMap();
  }

  private initializeRouteMap() {
    this.routeMap.set('discussions', () => import('../pages/DiscussionListPage'));
    this.routeMap.set('discussion', () => import('../pages/DiscussionPage'));
    this.routeMap.set('create-discussion', () => import('../pages/CreateDiscussionPage'));
    this.routeMap.set('my-discussions', () => import('../pages/MyDiscussionsPage'));
    this.routeMap.set('timeline', () => import('../pages/TimelinePage'));
    this.routeMap.set('following', () => import('../pages/FollowingPage'));
    this.routeMap.set('settings', () => import('../pages/SettingsPage'));
    this.routeMap.set('home', () => import('../pages/Home'));
    this.routeMap.set('search', () =>
      import('../pages/SearchPage').then(module => ({ default: module.SearchPage }))
    );
    this.routeMap.set('moderation', () =>
      import('../pages/ModerationPage').then(module => ({ default: module.ModerationPage }))
    );
  }

  /**
   * Preload a route component with performance monitoring
   */
  async preloadRoute(
    path: string,
    importFn?: () => Promise<any>,
    options: PreloadOptions = {}
  ): Promise<void> {
    if (this.preloadedRoutes.has(path)) {
      return;
    }

    const { priority = 1, timeout = 10000, retries = 2 } = options;
    const actualImportFn = importFn || this.routeMap.get(path);

    if (!actualImportFn) {
      console.warn(`No import function found for route: ${path}`);
      return;
    }

    try {
      performanceMonitor.startMeasure(`preload-${path}`);

      const component = this.withTimeout(this.withRetries(actualImportFn, retries), timeout);

      this.preloadedRoutes.set(path, {
        path,
        component,
        timestamp: Date.now(),
        priority,
      });

      // Actually trigger the import
      await component;

      performanceMonitor.endMeasure(`preload-${path}`);
    } catch (error) {
      console.warn(`Failed to preload route ${path}:`, error);
      performanceMonitor.endMeasure(`preload-${path}`);
    }
  }

  /**
   * Add timeout to promise
   */
  private withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Preload timeout')), timeoutMs)
      ),
    ]);
  }

  /**
   * Add retry logic to import function
   */
  private withRetries<T>(fn: () => Promise<T>, maxRetries: number): Promise<T> {
    return new Promise(async (resolve, reject) => {
      let lastError: Error = new Error('Unknown error');

      for (let i = 0; i <= maxRetries; i++) {
        try {
          const result = await fn();
          resolve(result);
          return;
        } catch (error) {
          lastError = error as Error;
          if (i < maxRetries) {
            // Exponential backoff
            await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000));
          }
        }
      }

      reject(lastError);
    });
  }

  /**
   * Add route to preload queue with intelligent scheduling
   */
  queuePreload(path: string, importFn?: () => Promise<any>, options: PreloadOptions = {}): void {
    if (this.preloadedRoutes.has(path)) {
      return;
    }

    const actualImportFn = importFn || this.routeMap.get(path);
    if (!actualImportFn) {
      console.warn(`No import function found for route: ${path}`);
      return;
    }

    // Check if already in queue
    const existingIndex = this.preloadQueue.findIndex(item => item.path === path);
    if (existingIndex !== -1) {
      // Update priority if higher
      if ((options.priority || 1) > (this.preloadQueue[existingIndex].options.priority || 1)) {
        this.preloadQueue[existingIndex].options = options;
        // Re-sort queue by priority
        this.preloadQueue.sort((a, b) => (b.options.priority || 1) - (a.options.priority || 1));
      }
      return;
    }

    this.preloadQueue.push({ path, importFn: actualImportFn, options });
    this.importFunctions.set(path, actualImportFn);

    // Sort queue by priority
    this.preloadQueue.sort((a, b) => (b.options.priority || 1) - (a.options.priority || 1));

    this.processQueue();
  }

  /**
   * Process preload queue with intelligent scheduling
   */
  private async processQueue(): Promise<void> {
    if (this.isPreloading || this.preloadQueue.length === 0) {
      return;
    }

    this.isPreloading = true;

    while (this.preloadQueue.length > 0) {
      // Check if we should pause preloading based on network conditions
      if (this.shouldPausePreloading()) {
        break;
      }

      const item = this.preloadQueue.shift()!;

      try {
        await this.preloadRoute(item.path, item.importFn, item.options);
      } catch (error) {
        console.warn(`Failed to preload ${item.path}:`, error);
      }

      this.importFunctions.delete(item.path);

      // Use intelligent idle scheduling
      await this.waitForIdleTime();
    }

    this.isPreloading = false;
  }

  /**
   * Check if preloading should be paused based on conditions
   */
  private shouldPausePreloading(): boolean {
    // Check network conditions
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection.saveData || connection.effectiveType === 'slow-2g') {
        return true;
      }
    }

    // Check if page is hidden
    if (document.hidden) {
      return true;
    }

    // Check CPU usage (basic heuristic)
    const vitals = performanceMonitor.getVitals();
    if (vitals.FID && vitals.FID > 100) {
      return true;
    }

    return false;
  }

  /**
   * Wait for idle time with fallback
   */

  private waitForIdleTime(): Promise<void> {
    return new Promise(resolve => {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => resolve(), { timeout: 1000 });
      } else {
        setTimeout(resolve, 16); // ~1 frame at 60fps
      }
    });
  }

  /**
   * Preload commonly accessed routes
   */
  preloadCommonRoutes() {
    // Preload the most commonly accessed routes with high priority
    this.queuePreload('discussions', undefined, { priority: 5 });
    this.queuePreload('timeline', undefined, { priority: 4 });

    // Delay preloading of less common routes
    setTimeout(() => {
      this.queuePreload('create-discussion', undefined, { priority: 2 });
      this.queuePreload('my-discussions', undefined, { priority: 2 });
      this.queuePreload('search', undefined, { priority: 1 });
    }, 2000);
  }

  /**
   * Preload routes based on user permissions
   */
  preloadRoutesForUser(userPermissions: { canCreateDiscussion: boolean; canModerate: boolean }) {
    if (userPermissions.canCreateDiscussion) {
      this.queuePreload('create-discussion', undefined, { priority: 3 });
      this.queuePreload('my-discussions', undefined, { priority: 3 });
    }

    if (userPermissions.canModerate) {
      this.queuePreload('moderation', undefined, { priority: 2 });
    }
  }

  /**
   * Preload route on hover (for navigation links)
   */
  onLinkHover(routeName: string) {
    // Add a small delay to avoid preloading on accidental hovers
    setTimeout(() => {
      this.queuePreload(routeName, undefined, { priority: 4 });
    }, 100);
  }

  /**
   * Check if route is preloaded
   */
  isRoutePreloaded(path: string): boolean {
    return this.preloadedRoutes.has(path);
  }

  /**
   * Get preloaded route
   */
  getPreloadedRoute(path: string): Promise<any> | null {
    const route = this.preloadedRoutes.get(path);
    return route ? route.component : null;
  }

  /**
   * Get preload statistics
   */
  getStats(): {
    preloadedCount: number;
    queueLength: number;
    cacheSize: number;
  } {
    return {
      preloadedCount: this.preloadedRoutes.size,
      queueLength: this.preloadQueue.length,
      cacheSize: this.preloadedRoutes.size,
    };
  }

  /**
   * Clear all preloaded routes
   */
  clearAll(): void {
    this.preloadedRoutes.clear();
    this.preloadQueue.length = 0;
    this.importFunctions.clear();
  }
}

// Create singleton instance
export const RoutePreloader = new RoutePreloaderClass();

// Backward compatibility - static methods
export class RoutePreloaderLegacy {
  static preloadRoute(routeName: string) {
    RoutePreloader.queuePreload(routeName);
  }

  static preloadCommonRoutes() {
    RoutePreloader.preloadCommonRoutes();
  }

  static preloadRoutesForUser(userPermissions: {
    canCreateDiscussion: boolean;
    canModerate: boolean;
  }) {
    RoutePreloader.preloadRoutesForUser(userPermissions);
  }

  static onLinkHover(routeName: string) {
    RoutePreloader.onLinkHover(routeName);
  }
}

// Memoized preload function with TTL
export const memoizedPreload = memoizeWithTTL(
  (path: string, importFn?: () => Promise<any>) => {
    return RoutePreloader.preloadRoute(path, importFn);
  },
  5 * 60 * 1000 // 5 minutes TTL
);
