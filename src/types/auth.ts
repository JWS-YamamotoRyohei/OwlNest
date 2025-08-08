// Authentication types and interfaces

export enum UserRole {
  VIEWER = 'viewer',
  CONTRIBUTOR = 'contributor',
  CREATOR = 'creator',
  ADMIN = 'admin',
}

export interface User {
  userId: string;
  email: string;
  role: UserRole;
  displayName: string;
  bio: string;
  avatarUrl: string;
  givenName: string;
  familyName: string;
  preferences: UserPreferences;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserPreferences {
  notifications: NotificationSettings;
  privacy: PrivacySettings;
}

export interface NotificationSettings {
  email: boolean;
  push: boolean;
  mentions: boolean;
  replies: boolean;
  follows: boolean;
}

export interface PrivacySettings {
  profileVisible: boolean;
  emailVisible: boolean;
}

export interface AuthTokens {
  accessToken: string;
  idToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  givenName?: string;
  familyName?: string;
}

export interface ConfirmSignUpData {
  email: string;
  confirmationCode: string;
}

export interface ForgotPasswordData {
  email: string;
}

export interface ConfirmForgotPasswordData {
  email: string;
  confirmationCode: string;
  newPassword: string;
}

export interface ChangePasswordData {
  oldPassword: string;
  newPassword: string;
}

export interface UpdateUserData {
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  givenName?: string;
  familyName?: string;
}

export interface AuthChallenge {
  challengeName: string;
  session: string;
  challengeParameters: Record<string, string>;
}

export interface AuthError {
  code: string;
  message: string;
  name: string;
}

export interface Permission {
  canView: boolean;
  canPost: boolean;
  canCreateDiscussion: boolean;
  canModerate: boolean;
  canManageUsers: boolean;
}

// Permission mapping based on user roles
export const ROLE_PERMISSIONS: Record<UserRole, Permission> = {
  [UserRole.VIEWER]: {
    canView: true,
    canPost: false,
    canCreateDiscussion: false,
    canModerate: false,
    canManageUsers: false,
  },
  [UserRole.CONTRIBUTOR]: {
    canView: true,
    canPost: true,
    canCreateDiscussion: false,
    canModerate: false,
    canManageUsers: false,
  },
  [UserRole.CREATOR]: {
    canView: true,
    canPost: true,
    canCreateDiscussion: true,
    canModerate: false,
    canManageUsers: false,
  },
  [UserRole.ADMIN]: {
    canView: true,
    canPost: true,
    canCreateDiscussion: true,
    canModerate: true,
    canManageUsers: true,
  },
};
