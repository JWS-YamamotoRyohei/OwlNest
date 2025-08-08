import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useMediaQuery } from 'react-responsive';
import { Header } from '../Header';
import { Sidebar, sidebarWidth } from '../Sidebar';
import { PageTransition } from '../common/PageTransition';
import { RoutePreloader } from '../../utils/routePreloader';
import { useAuth } from '../../contexts/AuthContext';
import './AppLayout.css';

interface AppLayoutProps {
  children?: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isDesktop = useMediaQuery({ minWidth: 768 });
  const { hasPermission } = useAuth();

  // Preload common routes on mount
  useEffect(() => {
    RoutePreloader.preloadCommonRoutes();
    RoutePreloader.preloadRoutesForUser({
      canCreateDiscussion: hasPermission('canCreateDiscussion'),
      canModerate: hasPermission('canModerate'),
    });
  }, [hasPermission]);

  const handleSidebarToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleSidebarClose = () => {
    setSidebarOpen(false);
  };

  return (
    <div className="app-layout">
      {/* Sidebar */}
      {sidebarOpen && (
        <>
          <div className="app-layout__overlay" onClick={handleSidebarClose} aria-hidden="true" />
          <div className="app-layout__sidebar">
            <Sidebar onClose={handleSidebarClose} />
          </div>
        </>
      )}

      {/* Main content area */}
      <div className={`app-layout__main ${sidebarOpen ? 'app-layout__main--shifted' : ''}`}>
        {/* Header */}
        <Header onButtonClick={() => alert('仮アクション')} onIconClick={handleSidebarToggle} />

        {/* Page content with transitions */}
        <main className="app-layout__content">
          <PageTransition>{children || <Outlet />}</PageTransition>
        </main>
      </div>
    </div>
  );
};
