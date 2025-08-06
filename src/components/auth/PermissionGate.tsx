// Permission-based component rendering
import React, { ReactNode } from 'react';
import { UserRole, Permission } from '../../types/auth';
import { usePermissions } from '../../hooks/usePermissions';

// Props for role-based gate
interface RoleGateProps {
  allowedRoles: UserRole[];
  children: ReactNode;
  fallback?: ReactNode;
}

// Role-based gate component
export const RoleGate: React.FC<RoleGateProps> = ({
  allowedRoles,
  children,
  fallback = null,
}) => {
  const { user } = usePermissions();

  if (!user || !allowedRoles.includes(user.role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

// Props for permission-based gate
interface PermissionGateProps {
  permission: keyof Permission;
  children: ReactNode;
  fallback?: ReactNode;
}

// Permission-based gate component
export const PermissionGate: React.FC<PermissionGateProps> = ({
  permission,
  children,
  fallback = null,
}) => {
  const { checkPermission } = usePermissions();

  if (!checkPermission(permission)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

// Props for multiple permissions gate
interface MultiplePermissionsGateProps {
  permissions: (keyof Permission)[];
  children: ReactNode;
  fallback?: ReactNode;
  requireAll?: boolean; // true = AND logic, false = OR logic
}

// Multiple permissions gate component
export const MultiplePermissionsGate: React.FC<MultiplePermissionsGateProps> = ({
  permissions,
  children,
  fallback = null,
  requireAll = true,
}) => {
  const { checkMultiplePermissions, checkAnyPermission } = usePermissions();

  const hasPermissions = requireAll
    ? checkMultiplePermissions(permissions)
    : checkAnyPermission(permissions);

  if (!hasPermissions) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

// Props for content ownership gate
interface ContentOwnershipGateProps {
  contentOwnerId: string;
  children: ReactNode;
  fallback?: ReactNode;
  allowModerators?: boolean; // Allow moderators to access even if not owner
}

// Content ownership gate component
export const ContentOwnershipGate: React.FC<ContentOwnershipGateProps> = ({
  contentOwnerId,
  children,
  fallback = null,
  allowModerators = false,
}) => {
  const { canEditOwnContent, canModerateContent } = usePermissions();

  const hasAccess = canEditOwnContent(contentOwnerId) || 
    (allowModerators && canModerateContent());

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

// Props for authentication gate
interface AuthGateProps {
  children: ReactNode;
  fallback?: ReactNode;
}

// Authentication gate component
export const AuthGate: React.FC<AuthGateProps> = ({
  children,
  fallback = null,
}) => {
  const { user } = usePermissions();

  if (!user) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

// Combined permission and role gate
interface CombinedGateProps {
  allowedRoles?: UserRole[];
  requiredPermissions?: (keyof Permission)[];
  requireAllPermissions?: boolean;
  children: ReactNode;
  fallback?: ReactNode;
}

export const CombinedGate: React.FC<CombinedGateProps> = ({
  allowedRoles,
  requiredPermissions,
  requireAllPermissions = true,
  children,
  fallback = null,
}) => {
  const { user, checkMultiplePermissions, checkAnyPermission } = usePermissions();

  // Check role if specified
  if (allowedRoles && (!user || !allowedRoles.includes(user.role))) {
    return <>{fallback}</>;
  }

  // Check permissions if specified
  if (requiredPermissions) {
    const hasPermissions = requireAllPermissions
      ? checkMultiplePermissions(requiredPermissions)
      : checkAnyPermission(requiredPermissions);

    if (!hasPermissions) {
      return <>{fallback}</>;
    }
  }

  return <>{children}</>;
};

// Default export for the main PermissionGate
export default PermissionGate;