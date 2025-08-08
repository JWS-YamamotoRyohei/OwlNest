/**
 * Image optimization utilities for lazy loading and performance
 */

export interface ImageOptimizationOptions {
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png';
  width?: number;
  height?: number;
  lazy?: boolean;
  placeholder?: string;
}

/**
 * Generate optimized image URL with query parameters
 */
export function getOptimizedImageUrl(
  originalUrl: string,
  options: ImageOptimizationOptions = {}
): string {
  if (!originalUrl) return '';

  const url = new URL(originalUrl, window.location.origin);

  if (options.quality) {
    url.searchParams.set('quality', options.quality.toString());
  }

  if (options.format) {
    url.searchParams.set('format', options.format);
  }

  if (options.width) {
    url.searchParams.set('w', options.width.toString());
  }

  if (options.height) {
    url.searchParams.set('h', options.height.toString());
  }

  return url.toString();
}

/**
 * Create responsive image srcSet
 */
export function createResponsiveSrcSet(
  originalUrl: string,
  sizes: number[] = [320, 640, 768, 1024, 1280]
): string {
  return sizes
    .map(size => `${getOptimizedImageUrl(originalUrl, { width: size })} ${size}w`)
    .join(', ');
}

/**
 * Generate placeholder image (base64 encoded blur)
 */
export function generatePlaceholder(width: number = 40, height: number = 40): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Create gradient placeholder
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#f3f4f6');
  gradient.addColorStop(1, '#e5e7eb');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  return canvas.toDataURL('image/jpeg', 0.1);
}

/**
 * Preload critical images
 */
export function preloadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Batch preload multiple images
 */
export async function preloadImages(urls: string[]): Promise<void> {
  const promises = urls.map(url => preloadImage(url));
  await Promise.allSettled(promises);
}

/**
 * Check if WebP is supported
 */
export function supportsWebP(): boolean {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
}

/**
 * Get optimal image format based on browser support
 */
export function getOptimalFormat(): 'webp' | 'jpeg' {
  return supportsWebP() ? 'webp' : 'jpeg';
}
