import React from 'react';

/**
 * Advanced memoization utilities for React components and functions
 */

/**
 * Deep comparison function for React.memo
 */
export function deepEqual(prevProps: any, nextProps: any): boolean {
  if (prevProps === nextProps) return true;
  
  if (prevProps == null || nextProps == null) return false;
  
  if (typeof prevProps !== 'object' || typeof nextProps !== 'object') {
    return prevProps === nextProps;
  }
  
  const prevKeys = Object.keys(prevProps);
  const nextKeys = Object.keys(nextProps);
  
  if (prevKeys.length !== nextKeys.length) return false;
  
  for (const key of prevKeys) {
    if (!nextKeys.includes(key)) return false;
    if (!deepEqual(prevProps[key], nextProps[key])) return false;
  }
  
  return true;
}

/**
 * Shallow comparison function for React.memo
 */
export function shallowEqual(prevProps: any, nextProps: any): boolean {
  if (prevProps === nextProps) return true;
  
  if (prevProps == null || nextProps == null) return false;
  
  if (typeof prevProps !== 'object' || typeof nextProps !== 'object') {
    return prevProps === nextProps;
  }
  
  const prevKeys = Object.keys(prevProps);
  const nextKeys = Object.keys(nextProps);
  
  if (prevKeys.length !== nextKeys.length) return false;
  
  for (const key of prevKeys) {
    if (!nextKeys.includes(key)) return false;
    if (prevProps[key] !== nextProps[key]) return false;
  }
  
  return true;
}

/**
 * Create a memoized component with custom comparison
 */
export function createMemoComponent<P extends object>(
  Component: React.ComponentType<P>,
  compareProps?: (prevProps: P, nextProps: P) => boolean
): React.ComponentType<P> {
  return React.memo(Component, compareProps);
}

/**
 * Memoize expensive calculations
 */
export function memoize<Args extends any[], Return>(
  fn: (...args: Args) => Return,
  getKey?: (...args: Args) => string
): (...args: Args) => Return {
  const cache = new Map<string, Return>();
  
  return (...args: Args): Return => {
    const key = getKey ? getKey(...args) : JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key)!;
    }
    
    const result = fn(...args);
    cache.set(key, result);
    
    return result;
  };
}

/**
 * Memoize with TTL (Time To Live)
 */
export function memoizeWithTTL<Args extends any[], Return>(
  fn: (...args: Args) => Return,
  ttlMs: number = 5 * 60 * 1000, // 5 minutes default
  getKey?: (...args: Args) => string
): (...args: Args) => Return {
  const cache = new Map<string, { value: Return; timestamp: number }>();
  
  return (...args: Args): Return => {
    const key = getKey ? getKey(...args) : JSON.stringify(args);
    const now = Date.now();
    
    const cached = cache.get(key);
    if (cached && (now - cached.timestamp) < ttlMs) {
      return cached.value;
    }
    
    const result = fn(...args);
    cache.set(key, { value: result, timestamp: now });
    
    return result;
  };
}

/**
 * Memoize async functions
 */
export function memoizeAsync<Args extends any[], Return>(
  fn: (...args: Args) => Promise<Return>,
  getKey?: (...args: Args) => string
): (...args: Args) => Promise<Return> {
  const cache = new Map<string, Promise<Return>>();
  
  return (...args: Args): Promise<Return> => {
    const key = getKey ? getKey(...args) : JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key)!;
    }
    
    const promise = fn(...args).catch(error => {
      // Remove failed promises from cache
      cache.delete(key);
      throw error;
    });
    
    cache.set(key, promise);
    return promise;
  };
}

/**
 * LRU (Least Recently Used) cache implementation
 */
export class LRUCache<K, V> {
  private cache = new Map<K, V>();
  private maxSize: number;
  
  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }
  
  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }
  
  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Remove least recently used (first item)
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    
    this.cache.set(key, value);
  }
  
  has(key: K): boolean {
    return this.cache.has(key);
  }
  
  delete(key: K): boolean {
    return this.cache.delete(key);
  }
  
  clear(): void {
    this.cache.clear();
  }
  
  get size(): number {
    return this.cache.size;
  }
}

/**
 * Create memoized function with LRU cache
 */
export function memoizeWithLRU<Args extends any[], Return>(
  fn: (...args: Args) => Return,
  maxSize: number = 100,
  getKey?: (...args: Args) => string
): (...args: Args) => Return {
  const cache = new LRUCache<string, Return>(maxSize);
  
  return (...args: Args): Return => {
    const key = getKey ? getKey(...args) : JSON.stringify(args);
    
    const cached = cache.get(key);
    if (cached !== undefined) {
      return cached;
    }
    
    const result = fn(...args);
    cache.set(key, result);
    
    return result;
  };
}

/**
 * React hook for memoizing expensive calculations
 */
export function useExpensiveMemo<T>(
  factory: () => T,
  deps: React.DependencyList,
  compare?: (prev: T, next: T) => boolean
): T {
  const ref = React.useRef<{ deps: React.DependencyList; value: T } | null>(null);

  if (!ref.current || !depsEqual(ref.current.deps, deps)) {
    const newValue = factory();

    if (!ref.current || !compare || !compare(ref.current.value, newValue)) {
      ref.current = { deps, value: newValue };
    }
  }

  return ref.current.value;
}


/**
 * Compare dependency arrays
 */
function depsEqual(prevDeps: React.DependencyList, nextDeps: React.DependencyList): boolean {
  if (prevDeps.length !== nextDeps.length) return false;
  
  for (let i = 0; i < prevDeps.length; i++) {
    if (prevDeps[i] !== nextDeps[i]) return false;
  }
  
  return true;
}

/**
 * Debounced memoization
 */
export function memoizeDebounced<Args extends any[], Return>(
  fn: (...args: Args) => Return,
  delay: number = 300,
  getKey?: (...args: Args) => string
): (...args: Args) => Return {
  const cache = new Map<string, Return>();
  const timeouts = new Map<string, NodeJS.Timeout>();
  
  return (...args: Args): Return => {
    const key = getKey ? getKey(...args) : JSON.stringify(args);
    
    // Clear existing timeout
    const existingTimeout = timeouts.get(key);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }
    
    // Return cached value if available
    if (cache.has(key)) {
      return cache.get(key)!;
    }
    
    // Calculate and cache result
    const result = fn(...args);
    cache.set(key, result);
    
    // Set timeout to clear cache
    const timeout = setTimeout(() => {
      cache.delete(key);
      timeouts.delete(key);
    }, delay);
    
    timeouts.set(key, timeout);
    
    return result;
  };
}