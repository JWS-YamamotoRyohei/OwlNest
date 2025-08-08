import React, { useState, useRef, useEffect } from 'react';
import {
  getOptimizedImageUrl,
  createResponsiveSrcSet,
  generatePlaceholder,
  getOptimalFormat,
} from '../../utils/imageOptimization';

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  quality?: number;
  placeholder?: string;
  threshold?: number;
  sizes?: string;
  responsiveSizes?: number[];
  onLoad?: () => void;
  onError?: () => void;
}

export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  width,
  height,
  quality = 80,
  placeholder,
  threshold = 0.1,
  sizes,
  responsiveSizes,
  onLoad,
  onError,
  className = '',
  style,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Generate optimized image URL
  const optimizedSrc = getOptimizedImageUrl(src, {
    quality,
    format: getOptimalFormat(),
    width,
    height,
  });

  // Generate responsive srcSet if sizes are provided
  const srcSet = responsiveSizes ? createResponsiveSrcSet(src, responsiveSizes) : undefined;

  // Generate placeholder
  const placeholderSrc = placeholder || generatePlaceholder(width || 300, height || 200);

  useEffect(() => {
    const currentImg = imgRef.current;
    if (!currentImg) return;

    // Create intersection observer
    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observerRef.current?.disconnect();
        }
      },
      { threshold }
    );

    observerRef.current.observe(currentImg);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [threshold]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  const imageStyle: React.CSSProperties = {
    transition: 'opacity 0.3s ease-in-out',
    opacity: isLoaded ? 1 : 0,
    ...style,
  };

  const placeholderStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    filter: 'blur(4px)',
    transition: 'opacity 0.3s ease-in-out',
    opacity: isLoaded ? 0 : 1,
    pointerEvents: 'none',
  };

  return (
    <div
      className={`lazy-image-container ${className}`}
      style={{ position: 'relative', overflow: 'hidden', ...style }}
    >
      {/* Placeholder image */}
      <img src={placeholderSrc} alt="" style={placeholderStyle} aria-hidden="true" />

      {/* Main image */}
      <img
        ref={imgRef}
        src={isInView ? optimizedSrc : undefined}
        srcSet={isInView && srcSet ? srcSet : undefined}
        sizes={sizes}
        alt={alt}
        width={width}
        height={height}
        style={imageStyle}
        onLoad={handleLoad}
        onError={handleError}
        loading="lazy"
        decoding="async"
        {...props}
      />

      {/* Error state */}
      {hasError && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f3f4f6',
            color: '#6b7280',
            fontSize: '14px',
          }}
        >
          画像を読み込めませんでした
        </div>
      )}
    </div>
  );
};
