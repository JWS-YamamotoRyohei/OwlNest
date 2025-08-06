import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import './PageTransition.css';

interface PageTransitionProps {
  children: React.ReactNode;
  duration?: number;
  type?: 'fade' | 'slide' | 'scale';
}

export const PageTransition: React.FC<PageTransitionProps> = ({
  children,
  duration = 300,
  type = 'fade'
}) => {
  const location = useLocation();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [displayLocation, setDisplayLocation] = useState(location);

  useEffect(() => {
    if (location !== displayLocation) {
      setIsTransitioning(true);
      
      const timer = setTimeout(() => {
        setDisplayLocation(location);
        setIsTransitioning(false);
      }, duration / 2);

      return () => clearTimeout(timer);
    }
  }, [location, displayLocation, duration]);

  const transitionClass = `page-transition page-transition--${type}`;
  const activeClass = isTransitioning ? 'page-transition--transitioning' : '';

  return (
    <div 
      className={`${transitionClass} ${activeClass}`}
      style={{ '--transition-duration': `${duration}ms` } as React.CSSProperties}
    >
      {children}
    </div>
  );
};