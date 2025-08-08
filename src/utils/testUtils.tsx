import React, { ReactElement } from 'react';
import { render, RenderOptions, RenderResult } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DiscussionCategory, EntityType, Stance } from '@/types/common';
import { DiscussionListItem, Post } from '@/types';
import {
  ConfirmSignUpData,
  ForgotPasswordData,
  ConfirmForgotPasswordData,
  ChangePasswordData,
  UpdateUserData,
  UserRole,
  Permission,
  User,
  LoginCredentials,
  RegisterData,
} from '@/types/auth';

import type { AuthContextType } from '@/contexts/AuthContext';

const MockAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => children;
const MockNotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) =>
  children;
const MockWebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => children;
const MockFollowProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => children;



// Custom render options with initialUser
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialUser?: User;
}

// Custom render function with providers
export const renderWithProviders = (
  ui: ReactElement,
  options?: CustomRenderOptions
): RenderResult => {
  const { initialUser, ...renderOptions } = options || {};
  
  // Create a wrapper that includes the initial user if provided
  const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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
                <MockFollowProvider>{children}</MockFollowProvider>
              </MockNotificationProvider>
            </MockWebSocketProvider>
          </MockAuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    );
  };

  return render(ui, { wrapper: TestWrapper, ...renderOptions });
};

// Mock data factories
export const createMockUser = (overrides = {}): User => ({
  userId: 'user-1',
  email: 'test@example.com',
  displayName: 'Test User',
  givenName: 'givenName-mock',
  familyName: 'givenName-mock',
  role: UserRole.VIEWER,
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

export const createMockDiscussion = (overrides = {}): DiscussionListItem => ({
  discussionId: 'discussion-1',
  title: 'Test Discussion',
  description: 'This is a test discussion',
  ownerId: 'user-1',
  ownerDisplayName: '',
  ownerStance: Stance.NEUTRAL,
  categories: [DiscussionCategory.POLITICS],
  tags: ['test'],
  isActive: true,
  isLocked: false,
  isPinned: false,
  isFeatured: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  lastActivityAt: '',
  statistics: {
    participantCount: 1,
    postCount: 9,
    prosCount: 0,
    consCount: 0,
    neutralCount: 0,
    followersCount: 0,
  },
  ...overrides,
});

export const makeAuthCtx = (overrides: Partial<AuthContextType> = {}): AuthContextType => ({
  // State
  user: null as User | null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  challenge: null,

  login: jest.fn<Promise<void>, [LoginCredentials]>().mockResolvedValue(),
  register: jest
    .fn<Promise<{ userSub: string; codeDeliveryDetails: any }>, [RegisterData]>()
    .mockResolvedValue({ userSub: 'mock-sub', codeDeliveryDetails: {} }),
  confirmSignUp: jest.fn<Promise<void>, [ConfirmSignUpData]>().mockResolvedValue(),
  resendConfirmationCode: jest.fn<Promise<any>, [string]>().mockResolvedValue({}),
  forgotPassword: jest.fn<Promise<any>, [ForgotPasswordData]>().mockResolvedValue({}),
  confirmForgotPassword: jest.fn<Promise<void>, [ConfirmForgotPasswordData]>().mockResolvedValue(),
  changePassword: jest.fn<Promise<void>, [ChangePasswordData]>().mockResolvedValue(),
  updateUser: jest.fn<Promise<void>, [UpdateUserData]>().mockResolvedValue(),
  updateUserRole: jest.fn<Promise<void>, [string, UserRole]>().mockResolvedValue(),
  logout: jest.fn<Promise<void>, []>().mockResolvedValue(),
  clearError: jest.fn<void, []>(),
  clearChallenge: jest.fn<void, []>(),

  hasPermission: jest.fn<boolean, [keyof Permission]>().mockReturnValue(false),

  canView: jest.fn().mockReturnValue(true),
  canPost: jest.fn().mockReturnValue(false),
  canCreateDiscussion: jest.fn().mockReturnValue(false),
  canModerate: jest.fn().mockReturnValue(false),
  canManageUsers: jest.fn().mockReturnValue(false),
  isAdmin: jest.fn().mockReturnValue(false),
  isCreator: jest.fn().mockReturnValue(false),
  isContributor: jest.fn().mockReturnValue(false),
  isViewer: jest.fn().mockReturnValue(true),
  ...overrides,
});

export const createMockPost = (overrides: Partial<Post> = {}): Post => {
  const now = new Date().toISOString();

  const base: Post = {
    // DynamoDB keys
    PK: `DISCUSSION#discussion-1`,
    SK: `POST#post-1`,
    GSI1PK: `POINT#point-1`,
    GSI1SK: `POST#post-1`,
    GSI2PK: `USER#user-1`,
    GSI2SK: `POST#post-1`,
    EntityType: EntityType.POST,

    // Core post info
    postId: 'post-1',
    discussionId: 'discussion-1',
    discussionPointId: 'point-1',
    authorId: 'user-1',
    authorDisplayName: 'Test User',
    content: 'This is a test post',
    stance: Stance.NEUTRAL,

    // Hierarchy
    parentId: undefined,
    level: 0,

    // Files
    attachments: [],

    // Status
    isActive: true,
    isEdited: false,
    editedAt: undefined,

    // Moderation
    moderation: {
      isHidden: false,
      hiddenBy: undefined,
      hiddenAt: undefined,
      hiddenReason: undefined,
      isDeleted: false,
      deletedBy: undefined,
      deletedAt: undefined,
      deletedReason: undefined,
      isReported: false,
      reportCount: 0,
      lastReportedAt: undefined,
    },

    // Statistics
    statistics: {
      viewCount: 0,
      participantCount: 0,
      postCount: 0,
      reactionCount: 0,
      shareCount: 0,
      lastActivityAt: now,
      replyCount: 0,
      likeCount: 0,
      agreeCount: 0,
      disagreeCount: 0,
      insightfulCount: 0,
      funnyCount: 0,
    },

    // Metadata
    metadata: {
      version: 1,
      ipAddress: undefined,
      userAgent: undefined,
      source: undefined,
      editHistory: [],
    },

    // BaseEntity
    createdAt: now,
    updatedAt: now,
  };

  return { ...base, ...overrides };
};

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
  return new Promise<T>(resolve => {
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
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      Object.keys(store).forEach(key => delete store[key]);
    }),
  };
};

// Mock sessionStorage
export const mockSessionStorage = () => {
  const store: { [key: string]: string } = {};

  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      Object.keys(store).forEach(key => delete store[key]);
    }),
  };
};

// Mock fetch
export const mockFetch = (response: any, options: { status?: number; ok?: boolean } = {}) => {
  const { status = 200, ok = true } = options;

  return jest.fn().mockResolvedValue({
    ok,
    status,
    json: jest.fn().mockResolvedValue(response),
    text: jest.fn().mockResolvedValue(JSON.stringify(response)),
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

  if (memoryIncrease > 1024 * 1024) {
    // 1MB threshold
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
    if (
      !input.labels?.length &&
      !input.getAttribute('aria-label') &&
      !input.getAttribute('aria-labelledby')
    ) {
      throw new Error(`Input without label found: ${input.name || input.id}`);
    }
  });
};

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
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(), // deprecated
      removeListener: jest.fn(), // deprecated
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });

  // Mock IntersectionObserver
  (global as any).IntersectionObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));

  // Mock ResizeObserver
  (global as any).ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));

  // Mock requestIdleCallback
  (global as any).requestIdleCallback = jest
    .fn()
    .mockImplementation((cb: () => void) => setTimeout(cb, 0));
  (global as any).cancelIdleCallback = jest.fn();

  // Setup custom matchers
  setupCustomMatchers();
};

// Cleanup utilities
export const cleanup = () => {
  jest.clearAllMocks();
  jest.clearAllTimers();
};

// Export everything
export * from '@testing-library/react';
export { renderWithProviders as render };
