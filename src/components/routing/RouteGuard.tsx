import React, { Suspense, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../types/auth';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { RoutePreloader } from '../../utils/routePreloader';
import { useRouteMetadata } from '../../hooks/useRouteMetadata';

interface RouteGuardProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
  requiredPermission?: 'canView' | 'canPost' | 'canCreateDiscussion' | 'canModerate' | 'canManageUsers';
  redirectTo?: string;
  fallback?: React.ReactNode;
  showLoadingMessage?: boolean;
  routeName?: string; // For preloading related routes
}

export const RouteGuard: React.FC<RouteGuardProps> = ({
  children,
  requiredRole,
  requiredPermission,
  redirectTo = '/login',
  fallback,
  showLoadingMessage = true,
  routeName
}) => {
  const { isAuthenticated, isLoading, user, hasPermission } = useAuth();
  const location = useLocation();
  const [isPageTransitioning, setIsPageTransitioning] = useState(false);
  const { getCurrentRoute } = useRouteMetadata();

  // Handle page transitions and preloading
  useEffect(() => {
    if (isAuthenticated && user) {
      // Preload routes based on user permissions
      RoutePreloader.preloadRoutesForUser({
        canCreateDiscussion: hasPermission('canCreateDiscussion'),
        canModerate: hasPermission('canModerate')
      });

      // Preload common routes
      RoutePreloader.preloadCommonRoutes();
    }
  }, [isAuthenticated, user, hasPermission]);

  // Handle route changes with transition
  useEffect(() => {
    setIsPageTransitioning(true);
    const timer = setTimeout(() => {
      setIsPageTransitioning(false);
    }, 100);

    return () => clearTimeout(timer);
  }, [location.pathname]);

  // Show loading spinner while checking authentication or during page transitions
  if (isLoading || isPageTransitioning) {
    const loadingMessage = isLoading 
      ? "認証状態を確認中..." 
      : "ページを読み込み中...";
    
    return (
      <LoadingSpinner 
        size="large" 
        message={showLoadingMessage ? loadingMessage : undefined}
        fullScreen 
      />
    );
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

  // Wrap children with error boundary and suspense
  return (
    <ErrorBoundary fallback={fallback}>
      <Suspense fallback={<LoadingSpinner size="large" fullScreen />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
};