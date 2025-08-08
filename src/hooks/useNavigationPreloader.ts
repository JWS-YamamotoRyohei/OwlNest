import { useCallback } from 'react';
import { RoutePreloader } from '../utils/routePreloader';

/**
 * Hook for handling navigation preloading
 */
export const useNavigationPreloader = () => {
  const preloadRoute = useCallback((routeName: string) => {
    RoutePreloader.preloadRoute(routeName);
  }, []);

  const handleLinkHover = useCallback((routeName: string) => {
    RoutePreloader.onLinkHover(routeName);
  }, []);

  const preloadCommonRoutes = useCallback(() => {
    RoutePreloader.preloadCommonRoutes();
  }, []);

  const preloadRoutesForUser = useCallback(
    (permissions: { canCreateDiscussion: boolean; canModerate: boolean }) => {
      RoutePreloader.preloadRoutesForUser(permissions);
    },
    []
  );

  return {
    preloadRoute,
    handleLinkHover,
    preloadCommonRoutes,
    preloadRoutesForUser,
  };
};
