// Error handling types

export enum ErrorType {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  VALIDATION = 'validation',
  NETWORK = 'network',
  SERVER = 'server',
  NOT_FOUND = 'not_found'
}

export interface AppError {
  type: ErrorType;
  message: string;
  code: string;
  details?: any;
}

export interface ErrorContextType {
  errors: AppError[];
  addError: (error: AppError) => void;
  removeError: (id: string) => void;
  clearErrors: () => void;
}