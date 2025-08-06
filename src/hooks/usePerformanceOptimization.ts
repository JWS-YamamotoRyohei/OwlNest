import React from 'react';
import { usePerformanceMonitor } from '../utils/performanceMonitoring';
import { RoutePreloader } from '../utils/routePreloader';

/**
 * Hook for component performance optimization
 */
export function usePerformanceOptimization(componentName: string) {
  const { startMeasure, endMeasure, measureFunction } = usePerformanceMonitor();

  // Measure component mount time
  React.useEffect(() => {
    startMeasure(`${componentName}-mount`);
    
    return () => {
      endMeasure(`${componentName}-mount`);
    };
  }, [componentName, startMeasure, endMeasure]);

  // Measure render time
  const measureRender = React.useCallback((renderFn: () => void) => {
    return measureFunction(`${componentName}-render`, renderFn);
  }, [componentName, measureFunction]);

  return {
    measureRender,
    startMeasure: (name: string) => startMeasure(`${componentName}-${name}`),
    endMeasure: (name: string) => endMeasure(`${componentName}-${name}`)
  };
}

/**
 * Hook for intelligent route preloading
 */
export function useRoutePreloading() {
  const [navigationHistory, setNavigationHistory] = React.useState<string[]>([]);

  // Track navigation history
  React.useEffect(() => {
    const currentPath = window.location.pathname;
    setNavigationHistory(prev => [...prev.slice(-10), currentPath]); // Keep last 10 routes
  }, []);

  const preloadRoute = React.useCallback((routeName: string, priority?: number) => {
    RoutePreloader.queuePreload(routeName, undefined, { priority });
  }, []);

  const preloadOnHover = React.useCallback((routeName: string) => {
    RoutePreloader.onLinkHover(routeName);
  }, []);

  const preloadByPattern = React.useCallback(() => {
    const currentPath = window.location.pathname;
    RoutePreloader.preloadByPattern?.(currentPath, navigationHistory);
  }, [navigationHistory]);

  return {
    preloadRoute,
    preloadOnHover,
    preloadByPattern,
    navigationHistory
  };
}

/**
 * Hook for image optimization
 */
export function useImageOptimization() {
  const [loadedImages, setLoadedImages] = React.useState(new Set<string>());
  const [failedImages, setFailedImages] = React.useState(new Set<string>());

  const markImageLoaded = React.useCallback((src: string) => {
    setLoadedImages(prev => new Set(prev).add(src));
  }, []);

  const markImageFailed = React.useCallback((src: string) => {
    setFailedImages(prev => new Set(prev).add(src));
  }, []);

  const isImageLoaded = React.useCallback((src: string) => {
    return loadedImages.has(src);
  }, [loadedImages]);

  const isImageFailed = React.useCallback((src: string) => {
    return failedImages.has(src);
  }, [failedImages]);

  const preloadImages = React.useCallback(async (urls: string[]) => {
    const promises = urls.map(url => {
      return new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => {
          markImageLoaded(url);
          resolve();
        };
        img.onerror = () => {
          markImageFailed(url);
          resolve();
        };
        img.src = url;
      });
    });

    await Promise.allSettled(promises);
  }, [markImageLoaded, markImageFailed]);

  return {
    markImageLoaded,
    markImageFailed,
    isImageLoaded,
    isImageFailed,
    preloadImages
  };
}

/**
 * Hook for virtual scrolling optimization
 */
export function useVirtualScrolling<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  overscan: number = 5
) {
  const [scrollTop, setScrollTop] = React.useState(0);

  const visibleRange = React.useMemo(() => {
    const start = Math.floor(scrollTop / itemHeight);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const end = Math.min(start + visibleCount + overscan, items.length);
    
    return {
      start: Math.max(0, start - overscan),
      end
    };
  }, [scrollTop, itemHeight, containerHeight, overscan, items.length]);

  const visibleItems = React.useMemo(() => {
    return items.slice(visibleRange.start, visibleRange.end);
  }, [items, visibleRange.start, visibleRange.end]);

  const totalHeight = items.length * itemHeight;
  const offsetY = visibleRange.start * itemHeight;

  const handleScroll = React.useCallback((event: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  }, []);

  return {
    visibleItems,
    totalHeight,
    offsetY,
    handleScroll,
    visibleRange
  };
}

/**
 * Hook for debounced state updates
 */
export function useDebouncedState<T>(
  initialValue: T,
  delay: number = 300
): [T, T, (value: T) => void] {
  const [value, setValue] = React.useState(initialValue);
  const [debouncedValue, setDebouncedValue] = React.useState(initialValue);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return [value, debouncedValue, setValue];
}

/**
 * Hook for intersection observer (lazy loading)
 */
export function useIntersectionObserver(
  options: IntersectionObserverInit = {}
) {
  const [isIntersecting, setIsIntersecting] = React.useState(false);
  const [hasIntersected, setHasIntersected] = React.useState(false);
  const elementRef = React.useRef<HTMLElement>(null);

  React.useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
      if (entry.isIntersecting && !hasIntersected) {
        setHasIntersected(true);
      }
    }, options);

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [options, hasIntersected]);

  return {
    elementRef,
    isIntersecting,
    hasIntersected
  };
}

/**
 * Hook for memory usage monitoring
 */
export function useMemoryMonitoring() {
  const [memoryInfo, setMemoryInfo] = React.useState<{
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  } | null>(null);

  React.useEffect(() => {
    const updateMemoryInfo = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        setMemoryInfo({
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit
        });
      }
    };

    updateMemoryInfo();
    const interval = setInterval(updateMemoryInfo, 5000); // Update every 5 seconds

    return () => {
      clearInterval(interval);
    };
  }, []);

  const getMemoryUsagePercentage = React.useCallback(() => {
    if (!memoryInfo) return 0;
    return (memoryInfo.usedJSHeapSize / memoryInfo.jsHeapSizeLimit) * 100;
  }, [memoryInfo]);

  const isMemoryUsageHigh = React.useCallback(() => {
    return getMemoryUsagePercentage() > 80;
  }, [getMemoryUsagePercentage]);

  return {
    memoryInfo,
    getMemoryUsagePercentage,
    isMemoryUsageHigh
  };
}