// Permission management hooks
import { useAuth } from './useAuth';
import { UserRole, Permission, ROLE_PERMISSIONS } from '../types/auth';

// Hook for checking specific permissions
export const usePermissions = () => {
  const { user, hasPermission } = useAuth();

  const getUserPermissions = (): Permission => {
    if (!user) {
      return {
        canView: false,
        canPost: false,
        canCreateDiscussion: false,
        canModerate: false,
        canManageUsers: false,
      };
    }
    return ROLE_PERMISSIONS[user.role];
  };

  const checkPermission = (permission: keyof Permission): boolean => {
    return hasPermission(permission);
  };

  const checkMultiplePermissions = (permissions: (keyof Permission)[]): boolean => {
    return permissions.every(permission => hasPermission(permission));
  };

  const checkAnyPermission = (permissions: (keyof Permission)[]): boolean => {
    return permissions.some(permission => hasPermission(permission));
  };

  // Role-specific checks
  const isAdmin = (): boolean => user?.role === UserRole.ADMIN;
  const isCreator = (): boolean => user?.role === UserRole.CREATOR;
  const isContributor = (): boolean => user?.role === UserRole.CONTRIBUTOR;
  const isViewer = (): boolean => user?.role === UserRole.VIEWER;

  // Permission level checks
  const canViewContent = (): boolean => checkPermission('canView');
  const canCreatePosts = (): boolean => checkPermission('canPost');
  const canCreateDiscussions = (): boolean => checkPermission('canCreateDiscussion');
  const canModerateContent = (): boolean => checkPermission('canModerate');
  const canManageUsers = (): boolean => checkPermission('canManageUsers');

  // Combined permission checks
  const canParticipateInDiscussions = (): boolean => {
    return checkMultiplePermissions(['canView', 'canPost']);
  };

  const canManageDiscussions = (): boolean => {
    return checkMultiplePermissions(['canCreateDiscussion', 'canModerate']);
  };

  const canAdministrate = (): boolean => {
    return checkMultiplePermissions(['canModerate', 'canManageUsers']);
  };

  // Check if user can perform action on specific content
  const canEditOwnContent = (contentOwnerId: string): boolean => {
    return user?.userId === contentOwnerId;
  };

  const canDeleteContent = (contentOwnerId: string): boolean => {
    // Users can delete their own content, or moderators can delete any content
    return canEditOwnContent(contentOwnerId) || canModerateContent();
  };

  const canEditDiscussion = (discussionOwnerId: string): boolean => {
    // Only discussion owner can edit, unless user is admin
    return canEditOwnContent(discussionOwnerId) || isAdmin();
  };

  const canManageDiscussionPosts = (discussionOwnerId: string): boolean => {
    // Discussion owner or moderators can manage posts in a discussion
    return canEditOwnContent(discussionOwnerId) || canModerateContent();
  };

  return {
    // Basic permission data
    user,
    permissions: getUserPermissions(),

    // Permission checking functions
    checkPermission,
    checkMultiplePermissions,
    checkAnyPermission,

    // Role checks
    isAdmin,
    isCreator,
    isContributor,
    isViewer,

    // Permission checks
    canViewContent,
    canCreatePosts,
    canCreateDiscussions,
    canModerateContent,
    canManageUsers,

    // Combined checks
    canParticipateInDiscussions,
    canManageDiscussions,
    canAdministrate,

    // Content-specific checks
    canEditOwnContent,
    canDeleteContent,
    canEditDiscussion,
    canManageDiscussionPosts,
  };
};

// Hook for role-based rendering
export const useRoleBasedRendering = () => {
  const { user } = useAuth();
  const permissions = usePermissions();

  const renderForRole = (
    allowedRoles: UserRole[],
    component: React.ReactNode,
    fallback?: React.ReactNode
  ): React.ReactNode => {
    if (!user || !allowedRoles.includes(user.role)) {
      return fallback || null;
    }
    return component;
  };

  const renderForPermission = (
    requiredPermission: keyof Permission,
    component: React.ReactNode,
    fallback?: React.ReactNode
  ): React.ReactNode => {
    if (!permissions.checkPermission(requiredPermission)) {
      return fallback || null;
    }
    return component;
  };

  const renderForMultiplePermissions = (
    requiredPermissions: (keyof Permission)[],
    component: React.ReactNode,
    fallback?: React.ReactNode,
    requireAll: boolean = true
  ): React.ReactNode => {
    const hasPermissions = requireAll
      ? permissions.checkMultiplePermissions(requiredPermissions)
      : permissions.checkAnyPermission(requiredPermissions);

    if (!hasPermissions) {
      return fallback || null;
    }
    return component;
  };

  return {
    renderForRole,
    renderForPermission,
    renderForMultiplePermissions,
  };
};

export default usePermissions;