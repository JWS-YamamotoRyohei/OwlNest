import React from 'react';
import './LoadingSpinner.css';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  message?: string;
  fullScreen?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  message,
  fullScreen = false
}) => {
  const spinnerClass = `loading-spinner loading-spinner--${size}`;
  const containerClass = fullScreen 
    ? 'loading-spinner-container loading-spinner-container--fullscreen'
    : 'loading-spinner-container';

  return (
    <div className={containerClass}>
      <div className={spinnerClass}>
        <div className="loading-spinner__circle"></div>
      </div>
      {message && (
        <p className="loading-spinner__message">{message}</p>
      )}
    </div>
  );
};