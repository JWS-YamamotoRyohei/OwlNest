// Authentication and user management types

export enum UserRole {
  VIEWER = 'viewer',
  CONTRIBUTOR = 'contributor',
  CREATOR = 'creator',
  ADMIN = 'admin'
}

export interface Permission {
  canView: boolean;
  canPost: boolean;
  canCreateDiscussion: boolean;
  canModerate: boolean;
  canManageUsers: boolean;
}

export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  role: UserRole;
  avatar?: string;
  bio?: string;
  preferences: {
    notifications: NotificationSettings;
    privacy: PrivacySettings;
  };
  createdAt: string;
  updatedAt: string;
}

export interface NotificationSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  followedDiscussions: boolean;
  mentions: boolean;
  replies: boolean;
}

export interface PrivacySettings {
  profileVisibility: 'public' | 'private';
  showEmail: boolean;
  showActivity: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  username: string;
  displayName: string;
}

export interface AuthContextType {
  user: User | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  register: (userData: RegisterData) => Promise<void>;
  updateUserRole: (userId: string, role: UserRole) => Promise<void>;
  isAuthenticated: boolean;
  hasPermission: (permission: keyof Permission) => boolean;
}