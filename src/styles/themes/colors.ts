// Color palette based on design system

export const colors = {
  primary: {
    50: '#eff6ff',
    100: '#dbeafe', 
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa', // メインブランドカラー（現在のヘッダー色）
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
  },
  secondary: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
  },
  success: {
    50: '#f0fdf4',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
  },
  warning: {
    50: '#fffbeb',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
  },
  error: {
    50: '#fef2f2',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
  },
  pros: '#22c55e',    // Pros投稿用の緑色
  cons: '#ef4444',    // Cons投稿用の赤色
  neutral: '#64748b', // 中立投稿用のグレー
  unknown: '#a855f7', // わからない投稿用の紫色
} as const;

export const lightTheme = {
  name: 'light' as const,
  colors: {
    background: '#ffffff',
    surface: '#f8fafc',
    text: '#1e293b',
    textSecondary: '#64748b',
    border: '#e2e8f0',
    ...colors,
  },
} as const;

export const darkTheme = {
  name: 'dark' as const,
  colors: {
    background: '#0f172a',
    surface: '#1e293b',
    text: '#f1f5f9',
    textSecondary: '#94a3b8',
    border: '#334155',
    ...colors,
  },
} as const;

export type Theme = typeof lightTheme;
export type ColorKey = keyof typeof colors;