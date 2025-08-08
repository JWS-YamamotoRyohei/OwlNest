// Environment configuration for Vite
// This file centralizes all environment variable access

export const env = {
  // Node environment
  NODE_ENV: import.meta.env.VITE_NODE_ENV || 'development',

  // AWS Configuration
  AWS_REGION: import.meta.env.VITE_AWS_REGION || 'ap-northeast-1',
  AWS_USER_POOL_ID: import.meta.env.VITE_AWS_USER_POOL_ID || '',
  AWS_USER_POOL_CLIENT_ID: import.meta.env.VITE_AWS_USER_POOL_CLIENT_ID || '',
  AWS_IDENTITY_POOL_ID: import.meta.env.VITE_AWS_IDENTITY_POOL_ID || '',

  // API Configuration
  API_GATEWAY_URL: import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:3001/api',
  WEBSOCKET_API_URL: import.meta.env.VITE_WEBSOCKET_API_URL || 'ws://localhost:3001/ws',

  // Feature Flags
  ENABLE_ANALYTICS: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
  ENABLE_REALTIME: import.meta.env.VITE_ENABLE_REALTIME === 'true',
  ENABLE_NOTIFICATIONS: import.meta.env.VITE_ENABLE_NOTIFICATIONS === 'true',
  ENABLE_FILE_UPLOAD: import.meta.env.VITE_ENABLE_FILE_UPLOAD === 'true',

  // Debug Settings
  DEBUG_MODE: import.meta.env.VITE_DEBUG_MODE === 'true',
  LOG_LEVEL: import.meta.env.VITE_LOG_LEVEL || 'info',
  USE_MOCK_API: import.meta.env.VITE_USE_MOCK_API === 'true',

  // Computed values
  get isDevelopment() {
    return this.NODE_ENV === 'development';
  },

  get isProduction() {
    return this.NODE_ENV === 'production';
  },

  get isTest() {
    return this.NODE_ENV === 'test';
  },
} as const;

// Validation function to ensure required environment variables are set
export const validateEnv = () => {
  const requiredVars = ['VITE_AWS_REGION'];

  const missingVars = requiredVars.filter(varName => !import.meta.env[varName]);

  if (missingVars.length > 0) {
    console.warn('Missing environment variables:', missingVars);
  }

  return missingVars.length === 0;
};

// Initialize environment validation in development
if (env.isDevelopment) {
  validateEnv();
}
