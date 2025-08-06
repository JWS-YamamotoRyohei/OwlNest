// Custom authentication hooks
import { useContext } from 'react';
import AuthContext from '../contexts/AuthContext';

// Re-export the useAuth hook from context for convenience
export { useAuth } from '../contexts/AuthContext';

// Additional custom hooks for specific auth functionality

// Hook for checking if user has specific permission
export const usePermission = (permission: string) => {
  const { hasPermission } = useContext(AuthContext)!;
  return hasPermission(permission as any);
};

// Hook for checking if user is authenticated
export const useIsAuthenticated = () => {
  const { isAuthenticated } = useContext(AuthContext)!;
  return isAuthenticated;
};

// Hook for getting current user
export const useCurrentUser = () => {
  const { user } = useContext(AuthContext)!;
  return user;
};

// Hook for auth loading state
export const useAuthLoading = () => {
  const { isLoading } = useContext(AuthContext)!;
  return isLoading;
};

// Hook for auth error
export const useAuthError = () => {
  const { error, clearError } = useContext(AuthContext)!;
  return { error, clearError };
};