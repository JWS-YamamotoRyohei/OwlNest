// Application constants

export * from './environment';
export * from './categories';

// API endpoints
export const API_ENDPOINTS = {
  AUTH: '/auth',
  USERS: '/users',
  DISCUSSIONS: '/discussions',
  POSTS: '/posts',
  NOTIFICATIONS: '/notifications',
  FOLLOW: '/follow',
} as const;

// Local storage keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'owlnest_auth_token',
  USER_PREFERENCES: 'owlnest_user_preferences',
  THEME: 'owlnest_theme',
} as const;

// Application limits
export const LIMITS = {
  MAX_POST_LENGTH: 5000,
  MAX_DISCUSSION_TITLE_LENGTH: 200,
  MAX_DISCUSSION_DESCRIPTION_LENGTH: 2000,
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_DISCUSSION_POINTS: 20,
  MAX_CATEGORIES_PER_DISCUSSION: 5,
} as const;

// Default values
export const DEFAULTS = {
  STANCE: 'unknown' as const,
  PAGE_SIZE: 20,
  DEBOUNCE_DELAY: 300,
} as const;