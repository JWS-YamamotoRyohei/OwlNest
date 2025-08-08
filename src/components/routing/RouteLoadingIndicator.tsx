import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import './RouteLoadingIndicator.css';

interface RouteLoadingIndicatorProps {
  delay?: number;
  duration?: number;
}

export const RouteLoadingIndicator: React.FC<RouteLoadingIndicatorProps> = ({
  delay = 200,
  duration = 300,
}) => {
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let progressTimer: NodeJS.Timeout;
    let completeTimer: NodeJS.Timeout;

    // Start loading after delay
    const delayTimer: NodeJS.Timeout = setTimeout(() => {
      setIsLoading(true);
      setProgress(0);

      // Animate progress
      let currentProgress = 0;
      progressTimer = setInterval(() => {
        currentProgress += Math.random() * 30;
        if (currentProgress > 90) {
          currentProgress = 90;
        }
        setProgress(currentProgress);
      }, 100);

      // Complete loading
      completeTimer = setTimeout(() => {
        setProgress(100);
        setTimeout(() => {
          setIsLoading(false);
          setProgress(0);
        }, 200);
      }, duration);
    }, delay);

    return () => {
      clearTimeout(delayTimer);
      clearInterval(progressTimer);
      clearTimeout(completeTimer);
      setIsLoading(false);
      setProgress(0);
    };
  }, [location.pathname, delay, duration]);

  if (!isLoading) {
    return null;
  }

  return (
    <div className="route-loading-indicator">
      <div className="route-loading-indicator__bar" style={{ width: `${progress}%` }} />
    </div>
  );
};
