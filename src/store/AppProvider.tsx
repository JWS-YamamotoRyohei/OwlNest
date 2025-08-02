// Main application provider that combines all contexts

import React from 'react';
import { ThemeProvider } from './ThemeContext';
import { ErrorProvider } from './ErrorContext';

interface AppProviderProps {
  children: React.ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  return (
    <ErrorProvider>
      <ThemeProvider>
        {children}
      </ThemeProvider>
    </ErrorProvider>
  );
};