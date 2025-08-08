import React from 'react';
import { usePageTransition } from '../../hooks/usePageTransition';
import { LoadingSpinner } from './LoadingSpinner';
import './PageTransition.css';

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

export const PageTransition: React.FC<PageTransitionProps> = ({ children, className = '' }) => {
  const { isLoading } = usePageTransition(200);

  return (
    <div className={`page-transition ${className}`}>
      {isLoading && (
        <div className="page-transition__loading">
          <LoadingSpinner size="medium" />
        </div>
      )}
      <div
        className={`page-transition__content ${isLoading ? 'page-transition__content--loading' : ''}`}
      >
        {children}
      </div>
    </div>
  );
};
