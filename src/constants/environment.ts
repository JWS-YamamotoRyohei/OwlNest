// Environment configuration constants

export const ENV = {
  // AWS Configuration
  AWS_REGION: import.meta.env.VITE_AWS_REGION || 'ap-northeast-1',
  AWS_USER_POOL_ID: import.meta.env.VITE_AWS_USER_POOL_ID || '',
  AWS_USER_POOL_CLIENT_ID: import.meta.env.VITE_AWS_USER_POOL_CLIENT_ID || '',
  AWS_IDENTITY_POOL_ID: import.meta.env.VITE_AWS_IDENTITY_POOL_ID || '',

  // API Configuration
  API_GATEWAY_URL: import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:3001/api',
  WEBSOCKET_URL: import.meta.env.VITE_WEBSOCKET_API_URL || 'ws://localhost:3001/ws',

  // S3 Configuration
  S3_BUCKET_NAME: import.meta.env.VITE_S3_BUCKET_NAME || '',
  FILES_BUCKET_NAME: import.meta.env.VITE_FILES_BUCKET_NAME || '',
  CLOUDFRONT_DOMAIN: import.meta.env.VITE_CLOUDFRONT_DOMAIN || '',

  // Development Configuration
  ENVIRONMENT: import.meta.env.VITE_NODE_ENV || 'development',
  DEBUG_MODE: import.meta.env.VITE_DEBUG_MODE === 'true',

  // Feature Flags
  ENABLE_REAL_TIME: import.meta.env.VITE_ENABLE_REALTIME === 'true',
  ENABLE_NOTIFICATIONS: import.meta.env.VITE_ENABLE_NOTIFICATIONS === 'true',
  ENABLE_ANALYTICS: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
} as const;

export const isDevelopment = ENV.ENVIRONMENT === 'development';
export const isProduction = ENV.ENVIRONMENT === 'production';
export const isStaging = ENV.ENVIRONMENT === 'staging';
