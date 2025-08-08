// Authentication components exports
export { default as LoginForm } from './LoginForm';
export { default as RegisterForm } from './RegisterForm';
export { default as ConfirmSignUpForm } from './ConfirmSignUpForm';
export { default as AuthModal } from './AuthModal';
export type { AuthModalView } from './AuthModal';

export {
  default as PermissionGate,
  RoleGate,
  PermissionGate as Permission,
  MultiplePermissionsGate,
  ContentOwnershipGate,
  AuthGate,
  CombinedGate,
} from './PermissionGate';

export { default as UserRoleBadge, UserRoleDisplay, RoleSelector } from './UserRoleBadge';

export {
  default as PermissionError,
  LoginRequiredError,
  PostPermissionError,
  CreateDiscussionError,
  ModerateError,
} from './PermissionError';
