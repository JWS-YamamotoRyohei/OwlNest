import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../types/auth';
import { LoadingSpinner } from '../common/LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
  requiredPermission?: 'canView' | 'canPost' | 'canCreateDiscussion' | 'canModerate' | 'canManageUsers';
  redirectTo?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
  requiredPermission,
  redirectTo = '/login'
}) => {
  const { isAuthenticated, isLoading, user, hasPermission } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Check role requirement
  if (requiredRole && user?.role !== requiredRole) {
    // For admin-only routes, redirect to unauthorized page
    if (requiredRole === UserRole.ADMIN) {
      return <Navigate to="/unauthorized" replace />;
    }
    
    // For other roles, check if user has sufficient permissions
    const roleHierarchy = {
      [UserRole.VIEWER]: 0,
      [UserRole.CONTRIBUTOR]: 1,
      [UserRole.CREATOR]: 2,
      [UserRole.ADMIN]: 3
    };

    const userLevel = roleHierarchy[user?.role || UserRole.VIEWER];
    const requiredLevel = roleHierarchy[requiredRole];

    if (userLevel < requiredLevel) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  // Check permission requirement
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};