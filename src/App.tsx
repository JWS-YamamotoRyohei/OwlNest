import './App.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AppProvider } from './store';
import { AuthProvider } from './contexts/AuthContext';
import { WebSocketProvider } from './contexts/WebSocketContext';

// Layout components
import { AppLayout } from './components/layout/AppLayout';

// Route guards
import { RouteGuard } from './components/routing/RouteGuard';
import { PublicRoute } from './components/routing/PublicRoute';
import { PageTransition } from './components/routing/PageTransition';
import { RouteLoadingIndicator } from './components/routing/RouteLoadingIndicator';

// Route configuration
import { publicRoutes, protectedRoutes, legacyRoutes } from './config/routes';

// Types
import { UserRole } from './types/auth';

export const App = () => {
  return (
    <HelmetProvider>
      <AuthProvider>
        <WebSocketProvider>
          <AppProvider>
            <BrowserRouter>
              <RouteLoadingIndicator />
              <Routes>
                {/* Public routes */}
                {publicRoutes.map(route => (
                  <Route
                    key={route.path}
                    path={route.path}
                    element={
                      route.isRestricted ? (
                        <PublicRoute restricted>{route.element}</PublicRoute>
                      ) : (
                        route.element
                      )
                    }
                  />
                ))}

                {/* Protected routes with layout */}
                <Route
                  path="/"
                  element={
                    <RouteGuard>
                      <AppLayout />
                    </RouteGuard>
                  }
                >
                  {protectedRoutes.map(route => (
                    <Route
                      key={route.path}
                      path={route.path}
                      element={
                        <RouteGuard
                          requiredRole={route.requiredRole}
                          requiredPermission={route.requiredPermission}
                          routeName={route.path.replace('/', '') || 'home'}
                        >
                          <PageTransition type="fade">{route.element}</PageTransition>
                        </RouteGuard>
                      }
                    />
                  ))}

                  {/* Admin routes */}
                  <Route
                    path="admin/*"
                    element={
                      <RouteGuard requiredRole={UserRole.ADMIN}>
                        <PageTransition type="fade">
                          <div>Admin Panel (To be implemented)</div>
                        </PageTransition>
                      </RouteGuard>
                    }
                  />
                </Route>

                {/* Legacy route redirects */}
                {legacyRoutes.map(redirect => (
                  <Route
                    key={redirect.from}
                    path={redirect.from}
                    element={<Navigate replace to={redirect.to} />}
                  />
                ))}

                {/* Catch all route */}
                <Route path="*" element={<Navigate replace to="/404" />} />
              </Routes>
            </BrowserRouter>
          </AppProvider>
        </WebSocketProvider>
      </AuthProvider>
    </HelmetProvider>
  );
};
