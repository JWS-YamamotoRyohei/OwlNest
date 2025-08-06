// Authentication Context for managing auth state
import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import {
  User,
  AuthTokens,
  LoginCredentials,
  RegisterData,
  ConfirmSignUpData,
  ForgotPasswordData,
  ConfirmForgotPasswordData,
  ChangePasswordData,
  UpdateUserData,
  AuthChallenge,
  AuthError,
  UserRole,
  Permission,
  ROLE_PERMISSIONS,
} from '../types/auth';
import authService from '../services/authService';

// Auth state interface
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: AuthError | null;
  challenge: AuthChallenge | null;
}

// Auth actions
type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: { user: User } }
  | { type: 'AUTH_CHALLENGE'; payload: { challenge: AuthChallenge } }
  | { type: 'AUTH_ERROR'; payload: { error: AuthError } }
  | { type: 'AUTH_LOGOUT' }
  | { type: 'CLEAR_ERROR' }
  | { type: 'CLEAR_CHALLENGE' }
  | { type: 'UPDATE_USER'; payload: { user: User } };

// Initial state
const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  challenge: null,
};

// Auth reducer
const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'AUTH_START':
      return {
        ...state,
        isLoading: true,
        error: null,
        challenge: null,
      };

    case 'AUTH_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
        challenge: null,
      };

    case 'AUTH_CHALLENGE':
      return {
        ...state,
        challenge: action.payload.challenge,
        isLoading: false,
        error: null,
      };

    case 'AUTH_ERROR':
      return {
        ...state,
        error: action.payload.error,
        isLoading: false,
        challenge: null,
      };

    case 'AUTH_LOGOUT':
      return {
        ...initialState,
      };

    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };

    case 'CLEAR_CHALLENGE':
      return {
        ...state,
        challenge: null,
      };

    case 'UPDATE_USER':
      return {
        ...state,
        user: action.payload.user,
      };

    default:
      return state;
  }
};

// Auth context interface
interface AuthContextType {
  // State
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: AuthError | null;
  challenge: AuthChallenge | null;

  // Actions
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (userData: RegisterData) => Promise<{ userSub: string; codeDeliveryDetails: any }>;
  confirmSignUp: (data: ConfirmSignUpData) => Promise<void>;
  resendConfirmationCode: (email: string) => Promise<any>;
  forgotPassword: (data: ForgotPasswordData) => Promise<any>;
  confirmForgotPassword: (data: ConfirmForgotPasswordData) => Promise<void>;
  changePassword: (data: ChangePasswordData) => Promise<void>;
  updateUser: (updateData: UpdateUserData) => Promise<void>;
  updateUserRole: (userId: string, role: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  clearChallenge: () => void;

  // Permission helpers
  hasPermission: (permission: keyof Permission) => boolean;
  canView: () => boolean;
  canPost: () => boolean;
  canCreateDiscussion: () => boolean;
  canModerate: () => boolean;
  canManageUsers: () => boolean;
  isAdmin: () => boolean;
  isCreator: () => boolean;
  isContributor: () => boolean;
  isViewer: () => boolean;
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth provider props
interface AuthProviderProps {
  children: ReactNode;
}

// Auth provider component
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Initialize auth state on mount
  useEffect(() => {
    const initializeAuth = async () => {
      if (authService.isAuthenticated()) {
        dispatch({ type: 'AUTH_START' });
        try {
          const user = await authService.getCurrentUser();
          dispatch({ type: 'AUTH_SUCCESS', payload: { user } });
        } catch (error) {
          dispatch({ type: 'AUTH_ERROR', payload: { error: error as AuthError } });
        }
      }
    };

    initializeAuth();
  }, []);

  // Login function
  const login = async (credentials: LoginCredentials): Promise<void> => {
    dispatch({ type: 'AUTH_START' });
    try {
      const result = await authService.login(credentials);
      
      if ('challengeName' in result) {
        // Handle challenge (MFA, etc.)
        dispatch({ type: 'AUTH_CHALLENGE', payload: { challenge: result } });
      } else {
        // Successful login
        dispatch({ type: 'AUTH_SUCCESS', payload: { user: result.user } });
      }
    } catch (error) {
      dispatch({ type: 'AUTH_ERROR', payload: { error: error as AuthError } });
      throw error;
    }
  };

  // Register function
  const register = async (userData: RegisterData): Promise<{ userSub: string; codeDeliveryDetails: any }> => {
    dispatch({ type: 'AUTH_START' });
    try {
      const result = await authService.register(userData);
      dispatch({ type: 'CLEAR_ERROR' });
      return result;
    } catch (error) {
      dispatch({ type: 'AUTH_ERROR', payload: { error: error as AuthError } });
      throw error;
    }
  };

  // Confirm sign up function
  const confirmSignUp = async (data: ConfirmSignUpData): Promise<void> => {
    dispatch({ type: 'AUTH_START' });
    try {
      await authService.confirmSignUp(data);
      dispatch({ type: 'CLEAR_ERROR' });
    } catch (error) {
      dispatch({ type: 'AUTH_ERROR', payload: { error: error as AuthError } });
      throw error;
    }
  };

  // Resend confirmation code function
  const resendConfirmationCode = async (email: string): Promise<any> => {
    dispatch({ type: 'AUTH_START' });
    try {
      const result = await authService.resendConfirmationCode(email);
      dispatch({ type: 'CLEAR_ERROR' });
      return result;
    } catch (error) {
      dispatch({ type: 'AUTH_ERROR', payload: { error: error as AuthError } });
      throw error;
    }
  };

  // Forgot password function
  const forgotPassword = async (data: ForgotPasswordData): Promise<any> => {
    dispatch({ type: 'AUTH_START' });
    try {
      const result = await authService.forgotPassword(data);
      dispatch({ type: 'CLEAR_ERROR' });
      return result;
    } catch (error) {
      dispatch({ type: 'AUTH_ERROR', payload: { error: error as AuthError } });
      throw error;
    }
  };

  // Confirm forgot password function
  const confirmForgotPassword = async (data: ConfirmForgotPasswordData): Promise<void> => {
    dispatch({ type: 'AUTH_START' });
    try {
      await authService.confirmForgotPassword(data);
      dispatch({ type: 'CLEAR_ERROR' });
    } catch (error) {
      dispatch({ type: 'AUTH_ERROR', payload: { error: error as AuthError } });
      throw error;
    }
  };

  // Change password function
  const changePassword = async (data: ChangePasswordData): Promise<void> => {
    dispatch({ type: 'AUTH_START' });
    try {
      await authService.changePassword(data);
      dispatch({ type: 'CLEAR_ERROR' });
    } catch (error) {
      dispatch({ type: 'AUTH_ERROR', payload: { error: error as AuthError } });
      throw error;
    }
  };

  // Update user function
  const updateUser = async (updateData: UpdateUserData): Promise<void> => {
    dispatch({ type: 'AUTH_START' });
    try {
      const updatedUser = await authService.updateUser(updateData);
      dispatch({ type: 'UPDATE_USER', payload: { user: updatedUser } });
    } catch (error) {
      dispatch({ type: 'AUTH_ERROR', payload: { error: error as AuthError } });
      throw error;
    }
  };

  // Update user role function (admin only)
  const updateUserRole = async (userId: string, role: UserRole): Promise<void> => {
    dispatch({ type: 'AUTH_START' });
    try {
      await authService.updateUserRole(userId, role);
      dispatch({ type: 'CLEAR_ERROR' });
    } catch (error) {
      dispatch({ type: 'AUTH_ERROR', payload: { error: error as AuthError } });
      throw error;
    }
  };

  // Logout function
  const logout = async (): Promise<void> => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      dispatch({ type: 'AUTH_LOGOUT' });
    }
  };

  // Clear error function
  const clearError = (): void => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  // Clear challenge function
  const clearChallenge = (): void => {
    dispatch({ type: 'CLEAR_CHALLENGE' });
  };

  // Permission helper functions
  const hasPermission = (permission: keyof Permission): boolean => {
    if (!state.user) return false;
    const userPermissions = ROLE_PERMISSIONS[state.user.role];
    return userPermissions[permission];
  };

  const canView = (): boolean => hasPermission('canView');
  const canPost = (): boolean => hasPermission('canPost');
  const canCreateDiscussion = (): boolean => hasPermission('canCreateDiscussion');
  const canModerate = (): boolean => hasPermission('canModerate');
  const canManageUsers = (): boolean => hasPermission('canManageUsers');

  const isAdmin = (): boolean => state.user?.role === UserRole.ADMIN;
  const isCreator = (): boolean => state.user?.role === UserRole.CREATOR;
  const isContributor = (): boolean => state.user?.role === UserRole.CONTRIBUTOR;
  const isViewer = (): boolean => state.user?.role === UserRole.VIEWER;

  // Context value
  const contextValue: AuthContextType = {
    // State
    user: state.user,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    error: state.error,
    challenge: state.challenge,

    // Actions
    login,
    register,
    confirmSignUp,
    resendConfirmationCode,
    forgotPassword,
    confirmForgotPassword,
    changePassword,
    updateUser,
    updateUserRole,
    logout,
    clearError,
    clearChallenge,

    // Permission helpers
    hasPermission,
    canView,
    canPost,
    canCreateDiscussion,
    canModerate,
    canManageUsers,
    isAdmin,
    isCreator,
    isContributor,
    isViewer,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;