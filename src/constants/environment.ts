// Environment configuration constants

export const ENV = {
  // AWS Configuration
  AWS_REGION: process.env.REACT_APP_AWS_REGION || 'ap-northeast-1',
  AWS_USER_POOL_ID: process.env.REACT_APP_AWS_USER_POOL_ID || '',
  AWS_USER_POOL_CLIENT_ID: process.env.REACT_APP_AWS_USER_POOL_CLIENT_ID || '',
  AWS_IDENTITY_POOL_ID: process.env.REACT_APP_AWS_IDENTITY_POOL_ID || '',

  // API Configuration
  API_GATEWAY_URL: process.env.REACT_APP_API_GATEWAY_URL || '',
  WEBSOCKET_URL: process.env.REACT_APP_WEBSOCKET_URL || '',

  // S3 Configuration
  S3_BUCKET_NAME: process.env.REACT_APP_S3_BUCKET_NAME || '',
  FILES_BUCKET_NAME: process.env.REACT_APP_FILES_BUCKET_NAME || '',
  CLOUDFRONT_DOMAIN: process.env.REACT_APP_CLOUDFRONT_DOMAIN || '',

  // Development Configuration
  ENVIRONMENT: process.env.REACT_APP_ENVIRONMENT || 'development',
  DEBUG_MODE: process.env.REACT_APP_DEBUG_MODE === 'true',

  // Feature Flags
  ENABLE_REAL_TIME: process.env.REACT_APP_ENABLE_REAL_TIME === 'true',
  ENABLE_NOTIFICATIONS: process.env.REACT_APP_ENABLE_NOTIFICATIONS === 'true',
  ENABLE_ANALYTICS: process.env.REACT_APP_ENABLE_ANALYTICS === 'true',
} as const;

export const isDevelopment = ENV.ENVIRONMENT === 'development';
export const isProduction = ENV.ENVIRONMENT === 'production';
export const isStaging = ENV.ENVIRONMENT === 'staging';