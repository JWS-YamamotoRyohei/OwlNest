import React, { lazy, ComponentType } from 'react';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

interface LazyLoadOptions {
  fallback?: React.ReactNode;
  delay?: number;
}

/**
 * Utility function for lazy loading components with custom fallback
 */
export const lazyLoad = <T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  options: LazyLoadOptions = {}
) => {
  const { fallback, delay = 200 } = options;

  const LazyComponent = lazy(() => {
    // Add artificial delay for better UX (prevents flash of loading state)
    return new Promise<{ default: T }>((resolve) => {
      setTimeout(() => {
        importFunc().then(resolve);
      }, delay);
    });
  });

  const WrappedComponent: React.FC<React.ComponentProps<T>> = (props) => (
    <React.Suspense 
      fallback={fallback || <LoadingSpinner size="large" fullScreen />}
    >
      <LazyComponent {...props} />
    </React.Suspense>
  );

  return WrappedComponent;
};

/**
 * Preload a lazy component
 */
export const preloadComponent = (importFunc: () => Promise<{ default: ComponentType<any> }>) => {
  importFunc();
};