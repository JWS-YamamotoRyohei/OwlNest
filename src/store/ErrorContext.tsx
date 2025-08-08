// Error context for global error handling

import React, { createContext, useContext, useState } from 'react';
import { AppError, ErrorContextType } from '../types/error';
import { generateId } from '../utils';

const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

export const useError = (): ErrorContextType => {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error('useError must be used within an ErrorProvider');
  }
  return context;
};

interface ErrorProviderProps {
  children: React.ReactNode;
}

export const ErrorProvider: React.FC<ErrorProviderProps> = ({ children }) => {
  const [errors, setErrors] = useState<(AppError & { id: string })[]>([]);

  const addError = (error: AppError) => {
    const errorWithId = { ...error, id: generateId() };
    setErrors(prev => [...prev, errorWithId]);

    // Auto-remove error after 5 seconds
    setTimeout(() => {
      removeError(errorWithId.id);
    }, 5000);
  };

  const removeError = (id: string) => {
    setErrors(prev => prev.filter(error => error.id !== id));
  };

  const clearErrors = () => {
    setErrors([]);
  };

  const value: ErrorContextType = {
    errors,
    addError,
    removeError,
    clearErrors,
  };

  return <ErrorContext.Provider value={value}>{children}</ErrorContext.Provider>;
};
