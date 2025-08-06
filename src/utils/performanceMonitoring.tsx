/**
 * Performance monitoring utilities
 */
import React from 'react';

export interface PerformanceMetrics {
  name: string;
  duration: number;
  startTime: number;
  endTime: number;
  type: 'navigation' | 'resource' | 'measure' | 'custom';
}

export interface VitalMetrics {
  FCP?: number; // First Contentful Paint
  LCP?: number; // Largest Contentful Paint
  FID?: number; // First Input Delay
  CLS?: number; // Cumulative Layout Shift
  TTFB?: number; // Time to First Byte
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private vitals: VitalMetrics = {};
  private observers: Map<string, PerformanceObserver> = new Map();

  constructor() {
    this.initializeObservers();
  }

  private initializeObservers() {
    // Observe navigation timing
    if ('PerformanceObserver' in window) {
      try {
        const navObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'navigation') {
              const navEntry = entry as PerformanceNavigationTiming;
              this.vitals.TTFB = navEntry.responseStart - navEntry.requestStart;
            }
          }
        });
        navObserver.observe({ entryTypes: ['navigation'] });
        this.observers.set('navigation', navObserver);
      } catch (e) {
        console.warn('Navigation timing observer not supported');
      }

      // Observe paint timing
      try {
        const paintObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.name === 'first-contentful-paint') {
              this.vitals.FCP = entry.startTime;
            }
          }
        });
        paintObserver.observe({ entryTypes: ['paint'] });
        this.observers.set('paint', paintObserver);
      } catch (e) {
        console.warn('Paint timing observer not supported');
      }

      // Observe largest contentful paint
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          this.vitals.LCP = lastEntry.startTime;
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        this.observers.set('lcp', lcpObserver);
      } catch (e) {
        console.warn('LCP observer not supported');
      }

      // Observe layout shift
      try {
        const clsObserver = new PerformanceObserver((list) => {
          let clsValue = 0;
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              clsValue += (entry as any).value;
            }
          }
          this.vitals.CLS = clsValue;
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
        this.observers.set('cls', clsObserver);
      } catch (e) {
        console.warn('CLS observer not supported');
      }
    }
  }

  /**
   * Start measuring a custom metric
   */
  startMeasure(name: string): void {
    performance.mark(`${name}-start`);
  }

  /**
   * End measuring a custom metric
   */
  endMeasure(name: string): PerformanceMetrics | null {
    try {
      performance.mark(`${name}-end`);
      performance.measure(name, `${name}-start`, `${name}-end`);
      
      const measure = performance.getEntriesByName(name, 'measure')[0];
      if (measure) {
        const metric: PerformanceMetrics = {
          name,
          duration: measure.duration,
          startTime: measure.startTime,
          endTime: measure.startTime + measure.duration,
          type: 'measure'
        };
        
        this.metrics.push(metric);
        return metric;
      }
    } catch (e) {
      console.warn(`Failed to measure ${name}:`, e);
    }
    
    return null;
  }

  /**
   * Measure a function execution time
   */
  async measureFunction<T>(
    name: string,
    fn: () => T | Promise<T>
  ): Promise<{ result: T; metric: PerformanceMetrics | null }> {
    this.startMeasure(name);
    
    try {
      const result = await fn();
      const metric = this.endMeasure(name);
      return { result, metric };
    } catch (error) {
      this.endMeasure(name);
      throw error;
    }
  }

  /**
   * Get all collected metrics
   */
  getMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  /**
   * Get vital metrics
   */
  getVitals(): VitalMetrics {
    return { ...this.vitals };
  }

  /**
   * Get resource timing metrics
   */
  getResourceMetrics(): PerformanceMetrics[] {
    const resources = performance.getEntriesByType('resource');
    return resources.map(entry => ({
      name: entry.name,
      duration: entry.duration,
      startTime: entry.startTime,
      endTime: entry.startTime + entry.duration,
      type: 'resource' as const
    }));
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics = [];
    performance.clearMarks();
    performance.clearMeasures();
  }

  /**
   * Report metrics to console (development only)
   */
  reportMetrics(): void {
    if (process.env.NODE_ENV === 'development') {
      console.group('Performance Metrics');
      console.table(this.getMetrics());
      console.log('Vitals:', this.getVitals());
      console.groupEnd();
    }
  }

  /**
   * Send metrics to analytics service
   */
  sendMetrics(endpoint?: string): void {
    const metrics = {
      custom: this.getMetrics(),
      vitals: this.getVitals(),
      resources: this.getResourceMetrics(),
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    if (endpoint) {
      fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(metrics)
      }).catch(error => {
        console.warn('Failed to send metrics:', error);
      });
    }
  }

  /**
   * Cleanup observers
   */
  disconnect(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
  }
}

// Create singleton instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * React hook for performance monitoring
 */
export function usePerformanceMonitor() {
  return {
    startMeasure: performanceMonitor.startMeasure.bind(performanceMonitor),
    endMeasure: performanceMonitor.endMeasure.bind(performanceMonitor),
    measureFunction: performanceMonitor.measureFunction.bind(performanceMonitor),
    getMetrics: performanceMonitor.getMetrics.bind(performanceMonitor),
    getVitals: performanceMonitor.getVitals.bind(performanceMonitor),
    reportMetrics: performanceMonitor.reportMetrics.bind(performanceMonitor)
  };
}

/**
 * Higher-order component for measuring component render time
 */
export function withPerformanceMonitoring<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName?: string
) {
  const displayName = componentName || WrappedComponent.displayName || WrappedComponent.name;
  
  return React.memo((props: P) => {
    React.useEffect(() => {
      performanceMonitor.startMeasure(`${displayName}-render`);
      
      return () => {
        performanceMonitor.endMeasure(`${displayName}-render`);
      };
    });

    return <WrappedComponent {...props} />;})}