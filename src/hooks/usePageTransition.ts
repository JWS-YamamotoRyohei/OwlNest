import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface PageTransitionState {
  isLoading: boolean;
  previousPath: string | null;
  currentPath: string;
}

export const usePageTransition = (delay: number = 300) => {
  const location = useLocation();
  const [state, setState] = useState<PageTransitionState>({
    isLoading: false,
    previousPath: null,
    currentPath: location.pathname,
  });

  useEffect(() => {
    // Start loading when location changes
    if (location.pathname !== state.currentPath) {
      setState(prev => ({
        isLoading: true,
        previousPath: prev.currentPath,
        currentPath: location.pathname,
      }));

      // End loading after delay
      const timer = setTimeout(() => {
        setState(prev => ({
          ...prev,
          isLoading: false,
        }));
      }, delay);

      return () => clearTimeout(timer);
    }
  }, [location.pathname, state.currentPath, delay]);

  return {
    isLoading: state.isLoading,
    previousPath: state.previousPath,
    currentPath: state.currentPath,
  };
};
