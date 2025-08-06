import React from 'react';
import { createMemoComponent, shallowEqual } from '../../utils/memoization';
import { withPerformanceMonitoring } from '../../utils/performanceMonitoring';

/**
 * Higher-order component for optimizing React components
 */

interface OptimizationOptions {
  memo?: boolean;
  deepMemo?: boolean;
  performanceMonitoring?: boolean;
  displayName?: string;
}

/**
 * Optimize a component with memoization and performance monitoring
 */
export function optimizeComponent<P extends object>(
  Component: React.ComponentType<P>,
  options: OptimizationOptions = {}
): React.ComponentType<P> {
  const {
    memo = true,
    deepMemo = false,
    performanceMonitoring = process.env.NODE_ENV === 'development',
    displayName
  } = options;

  let OptimizedComponent = Component;

  // Apply memoization
  if (memo) {
    const compareFunction = deepMemo ? undefined : shallowEqual;
    OptimizedComponent = createMemoComponent(OptimizedComponent, compareFunction);
  }

  // Apply performance monitoring
  if (performanceMonitoring) {
    OptimizedComponent = withPerformanceMonitoring(
      OptimizedComponent,
      displayName || Component.displayName || Component.name
    );
  }

  // Set display name
  if (displayName) {
    OptimizedComponent.displayName = displayName;
  }

  return OptimizedComponent;
}

/**
 * Optimized container component for lists
 */
interface OptimizedListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T, index: number) => string | number;
  className?: string;
  style?: React.CSSProperties;
  virtualized?: boolean;
  itemHeight?: number;
  containerHeight?: number;
}

export function OptimizedList<T>({
  items,
  renderItem,
  keyExtractor,
  className,
  style,
  virtualized = false,
  itemHeight = 100,
  containerHeight = 400
}: OptimizedListProps<T>) {
  const [visibleRange, setVisibleRange] = React.useState({ start: 0, end: items.length });
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Virtualization logic
  React.useEffect(() => {
    if (!virtualized || !containerRef.current) return;

    const handleScroll = () => {
      if (!containerRef.current) return;

      const scrollTop = containerRef.current.scrollTop;
      const start = Math.floor(scrollTop / itemHeight);
      const visibleCount = Math.ceil(containerHeight / itemHeight);
      const end = Math.min(start + visibleCount + 5, items.length); // Buffer of 5 items

      setVisibleRange({ start: Math.max(0, start - 5), end });
    };

    const container = containerRef.current;
    container.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial calculation

    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [virtualized, itemHeight, containerHeight, items.length]);

  const visibleItems = virtualized 
    ? items.slice(visibleRange.start, visibleRange.end)
    : items;

  const totalHeight = virtualized ? items.length * itemHeight : 'auto';
  const offsetY = virtualized ? visibleRange.start * itemHeight : 0;

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        height: virtualized ? containerHeight : 'auto',
        overflow: virtualized ? 'auto' : 'visible',
        ...style
      }}
    >
      {virtualized && (
        <div style={{ height: totalHeight, position: 'relative' }}>
          <div
            style={{
              transform: `translateY(${offsetY}px)`,
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0
            }}
          >
            {visibleItems.map((item, index) => (
              <div key={keyExtractor(item, visibleRange.start + index)}>
                {renderItem(item, visibleRange.start + index)}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {!virtualized && visibleItems.map((item, index) => (
        <div key={keyExtractor(item, index)}>
          {renderItem(item, index)}
        </div>
      ))}
    </div>
  );
}

/**
 * Optimized image grid component
 */
interface OptimizedImageGridProps {
  images: Array<{
    src: string;
    alt: string;
    width?: number;
    height?: number;
  }>;
  columns?: number;
  gap?: number;
  className?: string;
  onImageLoad?: (index: number) => void;
  onImageError?: (index: number) => void;
}

export const OptimizedImageGrid = optimizeComponent<OptimizedImageGridProps>(
  ({ images, columns = 3, gap = 16, className, onImageLoad, onImageError }) => {
    const [loadedImages, setLoadedImages] = React.useState(new Set<number>());

    const handleImageLoad = React.useCallback((index: number) => {
      setLoadedImages(prev => new Set(prev).add(index));
      onImageLoad?.(index);
    }, [onImageLoad]);

    const handleImageError = React.useCallback((index: number) => {
      onImageError?.(index);
    }, [onImageError]);

    const gridStyle: React.CSSProperties = {
      display: 'grid',
      gridTemplateColumns: `repeat(${columns}, 1fr)`,
      gap: `${gap}px`,
      width: '100%'
    };

    return (
      <div className={className} style={gridStyle}>
        {images.map((image, index) => (
          <div
            key={index}
            style={{
              position: 'relative',
              overflow: 'hidden',
              borderRadius: '8px',
              backgroundColor: '#f3f4f6',
              aspectRatio: '1'
            }}
          >
            <img
              src={image.src}
              alt={image.alt}
              loading="lazy"
              decoding="async"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transition: 'opacity 0.3s ease',
                opacity: loadedImages.has(index) ? 1 : 0
              }}
              onLoad={() => handleImageLoad(index)}
              onError={() => handleImageError(index)}
            />
            {!loadedImages.has(index) && (
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  color: '#6b7280',
                  fontSize: '14px'
                }}
              >
                読み込み中...
              </div>
            )}
          </div>
        ))}
      </div>
    );
  },
  { displayName: 'OptimizedImageGrid', memo: true }
);

/**
 * Optimized text component with truncation
 */
interface OptimizedTextProps {
  children: string;
  maxLines?: number;
  className?: string;
  style?: React.CSSProperties;
  expandable?: boolean;
}

export const OptimizedText = optimizeComponent<OptimizedTextProps>(
  ({ children, maxLines = 3, className, style, expandable = false }) => {
    const [isExpanded, setIsExpanded] = React.useState(false);
    const [isTruncated, setIsTruncated] = React.useState(false);
    const textRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
      if (!textRef.current) return;

      const element = textRef.current;
      const lineHeight = parseInt(getComputedStyle(element).lineHeight);
      const maxHeight = lineHeight * maxLines;
      
      setIsTruncated(element.scrollHeight > maxHeight);
    }, [children, maxLines]);

    const textStyle: React.CSSProperties = {
      ...style,
      display: '-webkit-box',
      WebkitLineClamp: isExpanded ? 'none' : maxLines,
      WebkitBoxOrient: 'vertical',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    };

    return (
      <div className={className}>
        <div ref={textRef} style={textStyle}>
          {children}
        </div>
        {expandable && isTruncated && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            style={{
              background: 'none',
              border: 'none',
              color: '#3b82f6',
              cursor: 'pointer',
              fontSize: '14px',
              marginTop: '4px',
              padding: 0
            }}
          >
            {isExpanded ? '折りたたむ' : 'もっと見る'}
          </button>
        )}
      </div>
    );
  },
  { displayName: 'OptimizedText', memo: true }
);