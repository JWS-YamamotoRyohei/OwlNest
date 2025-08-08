// Theme system exports

import { lightTheme, darkTheme } from './colors';
import { typography } from './typography';
import { spacing, borderRadius, breakpoints } from './spacing';

export * from './colors';
export * from './typography';
export * from './spacing';

export const theme = {
  light: {
    ...lightTheme,
    typography,
    spacing,
    borderRadius,
    breakpoints,
  },
  dark: {
    ...darkTheme,
    typography,
    spacing,
    borderRadius,
    breakpoints,
  },
} as const;

export type ThemeMode = 'light' | 'dark';
export type FullTheme = typeof theme.light  ;
