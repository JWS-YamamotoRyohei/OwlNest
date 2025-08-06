import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // Path aliases (equivalent to CRA's baseUrl and paths)
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@/components': resolve(__dirname, './src/components'),
      '@/pages': resolve(__dirname, './src/pages'),
      '@/hooks': resolve(__dirname, './src/hooks'),
      '@/services': resolve(__dirname, './src/services'),
      '@/store': resolve(__dirname, './src/store'),
      '@/types': resolve(__dirname, './src/types'),
      '@/utils': resolve(__dirname, './src/utils'),
      '@/constants': resolve(__dirname, './src/constants'),
      '@/styles': resolve(__dirname, './src/styles'),
      '@/assets': resolve(__dirname, './src/assets'),
      '@/contexts': resolve(__dirname, './src/contexts'),
    },
  },

  // Development server configuration
  server: {
    port: 3000,
    open: true,
    host: true, // Allow external connections
  },

  // Build configuration
  build: {
    outDir: 'build', // Keep same output directory as CRA
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunk for better caching
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          aws: ['@aws-sdk/client-cognito-identity-provider', '@aws-sdk/client-dynamodb'],
        },
      },
    },
  },

  // Environment variables (Vite uses VITE_ prefix instead of REACT_APP_)
  define: {
    // Only expose specific environment variables for security
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
  },

  // CSS configuration
  css: {
    modules: {
      localsConvention: 'camelCase',
    },
  },


});