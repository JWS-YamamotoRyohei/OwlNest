import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LoadingSpinner } from '../common/LoadingSpinner';

interface PublicRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
  restricted?: boolean; // If true, authenticated users will be redirected
}

export const PublicRoute: React.FC<PublicRouteProps> = ({
  children,
  redirectTo = '/discussions',
  restricted = false
}) => {
  const { isAuthenticated, isLoading } = useAuth();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return <LoadingSpinner />;
  }

  // If route is restricted and user is authenticated, redirect
  if (restricted && isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
};