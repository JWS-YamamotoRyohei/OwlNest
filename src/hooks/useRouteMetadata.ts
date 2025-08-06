import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { protectedRoutes, publicRoutes } from '../config/routes';
import { RoutePreloader } from '../utils/routePreloader';

export const useRouteMetadata = () => {
  const location = useLocation();

  useEffect(() => {
    // Find current route configuration
    const allRoutes = [...protectedRoutes, ...publicRoutes];
    const currentRoute = allRoutes.find(route => {
      // Handle dynamic routes (e.g., /discussion/:id)
      if (route.path.includes(':')) {
        const routePattern = route.path.replace(/:[^/]+/g, '[^/]+');
        const regex = new RegExp(`^${routePattern}$`);
        return regex.test(location.pathname);
      }
      return route.path === location.pathname;
    });

    if (currentRoute) {
      // Preload related routes
      if (currentRoute.preloadRoutes) {
        currentRoute.preloadRoutes.forEach(routeName => {
          RoutePreloader.preloadRoute(routeName);
        });
      }

      // Update document title if not handled by SEO component
      if (currentRoute.title && document.title !== currentRoute.title) {
        document.title = currentRoute.title;
      }
    }
  }, [location.pathname]);

  return {
    getCurrentRoute: () => {
      const allRoutes = [...protectedRoutes, ...publicRoutes];
      return allRoutes.find(route => {
        if (route.path.includes(':')) {
          const routePattern = route.path.replace(/:[^/]+/g, '[^/]+');
          const regex = new RegExp(`^${routePattern}$`);
          return regex.test(location.pathname);
        }
        return route.path === location.pathname;
      });
    }
  };
};