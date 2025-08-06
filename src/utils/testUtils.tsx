import React, { ReactElement } from 'react';
import { render, RenderOptions, RenderResult } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, expect } from 'vitest';
import { T } from 'vitest/dist/chunks/reporters.d.BFLkQcL6.js';
import { ok } from 'assert';
import { getItem } from 'cdk/lambda/shared/dynamoOptimizations';
import { resolve } from 'dns';
import { json } from 'stream/consumers';
// Import contexts - we'll create mock versions for testing
// import { AuthProvider } from '../contexts/AuthContext';
// import { NotificationProvider } from '../contexts/NotificationContext';
// import { WebSocketProvider } from '../contexts/WebSocketContext';
// import { FollowProvider } from '../contexts/FollowContext';

// Mock providers for testing
const MockAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => children;
const MockNotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => children;
const MockWebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => children;
const MockFollowProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => children;

// Test providers wrapper
const AllTheProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <MockAuthProvider>
          <MockWebSocketProvider>
            <MockNotificationProvider>
              <MockFollowProvider>
                {children}
              </MockFollowProvider>
            </MockNotificationProvider>
          </MockWebSocketProvider>
        </MockAuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

// Custom render function with providers
export const renderWithProviders = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
): RenderResult => {
  return render(ui, { wrapper: AllTheProviders, ...options });
};

// Mock data factories
export const createMockUser = (overrides = {}) => ({
  id: 'user-1',
  email: 'test@example.com',
  displayName: 'Test User',
  role: 'viewer',
  bio: 'Test user bio',
  avatarUrl: '',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  preferences: {
    notifications: {
      email: true,
      push: false,
      mentions: true,
      replies: true,
      follows: true,
    },
    privacy: {
      profileVisible: true,
      emailVisible: false,
    },
  },
  ...overrides,
});

export const createMockDiscussion = (overrides = {}) => ({
  id: 'discussion-1',
  title: 'Test Discussion',
  description: 'This is a test discussion',
  category: 'general',
  createdBy: 'user-1',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  postCount: 0,
  participantCount: 1,
  tags: ['test'],
  isActive: true,
  ...overrides,
});

export const createMockPost = (overrides = {}) => ({
  id: 'post-1',
  discussionId: 'discussion-1',
  content: 'This is a test post',
  createdBy: 'user-1',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  likes: 0,
  replies: [],
  attachments: [],
  isEdited: false,
  ...overrides,
});

export const createMockNotification = (overrides = {}) => ({
  id: 'notification-1',
  userId: 'user-1',
  type: 'mention' as const,
  title: 'Test Notification',
  message: 'You have been mentioned in a discussion',
  isRead: false,
  createdAt: new Date().toISOString(),
  data: {},
  ...overrides,
});

// Mock API responses
export const mockApiResponse = <T,>(data: T, delay = 0) => {
  return new Promise<T>((resolve) => {
    setTimeout(() => resolve(data), delay);
  });
};

export const mockApiError = (message = 'API Error', status = 500, delay = 0) => {
  return new Promise((_, reject) => {
    setTimeout(() => {
      const error = new Error(message);
      (error as any).status = status;
      reject(error);
    }, delay);
  });
};

// Test utilities for async operations
export const waitForLoadingToFinish = () => {
  return new Promise(resolve => setTimeout(resolve, 0));
};

export const flushPromises = () => {
  return new Promise(resolve => setImmediate(resolve));
};

// Mock localStorage
export const mockLocalStorage = () => {
  const store: { [key: string]: string } = {};
  
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach(key => delete store[key]);
    }),
  };
};

// Mock sessionStorage
export const mockSessionStorage = () => {
  const store: { [key: string]: string } = {};
  
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach(key => delete store[key]);
    }),
  };
};

// Mock fetch
export const mockFetch = (response: any, options: { status?: number; ok?: boolean } = {}) => {
  const { status = 200, ok = true } = options;
  
  return vi.fn().mockResolvedValue({
    ok,
    status,
    json: vi.fn().mockResolvedValue(response),
    text: vi.fn().mockResolvedValue(JSON.stringify(response)),
  });
};

// Performance testing utilities
export const measureRenderTime = async (renderFn: () => void): Promise<number> => {
  const start = performance.now();
  renderFn();
  await new Promise(resolve => setTimeout(resolve, 0)); // Wait for render
  return performance.now() - start;
};

export const measureAsyncOperation = async <T,>(
  operation: () => Promise<T>
): Promise<{ result: T; duration: number }> => {
  const start = performance.now();
  const result = await operation();
  const duration = performance.now() - start;
  return { result, duration };
};

// Memory leak detection
export const detectMemoryLeaks = (testFn: () => void, iterations: number = 100): void => {
  const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

  for (let i = 0; i < iterations; i++) {
    testFn();
  }

  // Force garbage collection if available
  if ((global as any).gc) {
    (global as any).gc();
  }

  const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
  const memoryIncrease = finalMemory - initialMemory;

  if (memoryIncrease > 1024 * 1024) { // 1MB threshold
    console.warn(`Potential memory leak detected: ${memoryIncrease} bytes increase`);
  }
};

// Accessibility testing helpers
export const checkAccessibility = async (container: HTMLElement): Promise<void> => {
  // Check for basic accessibility requirements
  const images = container.querySelectorAll('img');
  images.forEach(img => {
    if (!img.alt && !img.getAttribute('aria-label')) {
      throw new Error(`Image without alt text found: ${img.src}`);
    }
  });

  const buttons = container.querySelectorAll('button');
  buttons.forEach(button => {
    if (!button.textContent?.trim() && !button.getAttribute('aria-label')) {
      throw new Error('Button without accessible text found');
    }
  });

  const inputs = container.querySelectorAll('input');
  inputs.forEach(input => {
    if (!input.labels?.length && !input.getAttribute('aria-label') && !input.getAttribute('aria-labelledby')) {
      throw new Error(`Input without label found: ${input.name || input.id}`);
    }
  });
};

// Custom matchers for Vitest
declare module 'vitest' {
  interface Assertion<T = any> {
    toBeAccessible(): T;
    toHavePerformantRender(maxTime: number): T;
  }
  interface AsymmetricMatchersContaining {
    toBeAccessible(): any;
    toHavePerformantRender(maxTime: number): any;
  }
}

// Setup custom matchers
export const setupCustomMatchers = () => {
  expect.extend({
    toBeAccessible(received: HTMLElement) {
      try {
        checkAccessibility(received);
        return {
          message: () => 'Element is accessible',
          pass: true,
        };
      } catch (error) {
        return {
          message: () => `Element is not accessible: ${(error as Error).message}`,
          pass: false,
        };
      }
    },

    async toHavePerformantRender(received: () => void, maxTime: number) {
      const renderTime = await measureRenderTime(received);
      const pass = renderTime <= maxTime;

      return {
        message: () => 
          pass 
            ? `Render time ${renderTime}ms is within acceptable limit of ${maxTime}ms`
            : `Render time ${renderTime}ms exceeds acceptable limit of ${maxTime}ms`,
        pass,
      };
    },
  });
};

// Test environment setup
export const setupTestEnvironment = () => {
  // Mock window.matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(), // deprecated
      removeListener: vi.fn(), // deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  // Mock IntersectionObserver
  (global as any).IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));

  // Mock ResizeObserver
  (global as any).ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));

  // Mock requestIdleCallback
  (global as any).requestIdleCallback = vi.fn().mockImplementation((cb: Function) => setTimeout(cb, 0));
  (global as any).cancelIdleCallback = vi.fn();

  // Setup custom matchers
  setupCustomMatchers();
};

// Cleanup utilities
export const cleanup = () => {
  vi.clearAllMocks();
  vi.clearAllTimers();
};

// Export everything
export * from '@testing-library/react';
export { renderWithProviders as render };