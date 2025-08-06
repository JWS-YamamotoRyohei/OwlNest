import { DynamoDBItem } from '../services/dynamodb';
import {
  UserRole,
  EntityType,
  BaseEntity,
  UserPreferences,
  Statistics,
  AuditTrail,
} from './common';

/**
 * User profile stored in DynamoDB
 * PK: USER#{userId}
 * SK: PROFILE
 * GSI1PK: ROLE#{role}
 * GSI1SK: USER#{userId}
 */
export interface UserProfile extends DynamoDBItem, BaseEntity {
  PK: `USER#${string}`;
  SK: 'PROFILE';
  GSI1PK: `ROLE#${UserRole}`;
  GSI1SK: `USER#${string}`;
  EntityType: EntityType.USER_PROFILE;
  
  // Core user information
  userId: string;
  email: string;
  role: UserRole;
  displayName: string;
  avatar?: string;
  bio?: string;
  
  // User preferences and settings
  preferences: UserPreferences;
  
  // User statistics
  statistics: UserStatistics;
  
  // Account status
  isActive: boolean;
  isVerified: boolean;
  isSuspended: boolean;
  suspendedUntil?: string;
  suspensionReason?: string;
  
  // Audit information
  lastLoginAt?: string;
  loginCount: number;
  auditTrail: AuditTrail[];
}

/**
 * User statistics
 */
export interface UserStatistics extends Statistics {
  discussionsCreated: number;
  postsCreated: number;
  reactionsGiven: number;
  reactionsReceived: number;
  followersCount: number;
  followingCount: number;
  reputationScore: number;
}

/**
 * User session information (not stored in DynamoDB)
 */
export interface UserSession {
  userId: string;
  email: string;
  role: UserRole;
  displayName: string;
  avatar?: string;
  permissions: UserPermissions;
  sessionId: string;
  expiresAt: string;
  issuedAt: string;
}

/**
 * User permissions based on role
 */
export interface UserPermissions {
  canView: boolean;
  canPost: boolean;
  canCreateDiscussion: boolean;
  canModerate: boolean;
  canManageUsers: boolean;
  canDeleteOwnPosts: boolean;
  canEditOwnPosts: boolean;
  canDeleteOthersPosts: boolean;
  canEditOthersDiscussions: boolean;
  canChangeUserRoles: boolean;
  canAccessAnalytics: boolean;
  canManageCategories: boolean;
  canSendNotifications: boolean;
}

/**
 * User creation data
 */
export interface CreateUserData {
  email: string;
  displayName: string;
  bio?: string;
  avatar?: string;
  preferences?: Partial<UserPreferences>;
}

/**
 * User update data
 */
export interface UpdateUserData {
  displayName?: string;
  bio?: string;
  avatar?: string;
  preferences?: Partial<UserPreferences>;
}

/**
 * User role change data
 */
export interface ChangeUserRoleData {
  userId: string;
  newRole: UserRole;
  reason: string;
  changedBy: string;
}

/**
 * User suspension data
 */
export interface SuspendUserData {
  userId: string;
  suspendedUntil: string;
  reason: string;
  suspendedBy: string;
}

/**
 * User search filters
 */
export interface UserSearchFilters {
  role?: UserRole;
  isActive?: boolean;
  isVerified?: boolean;
  isSuspended?: boolean;
  createdAfter?: string;
  createdBefore?: string;
  lastLoginAfter?: string;
  lastLoginBefore?: string;
  displayNameContains?: string;
  emailContains?: string;
}

/**
 * User list item (for user lists and search results)
 */
export interface UserListItem {
  userId: string;
  displayName: string;
  avatar?: string;
  role: UserRole;
  isActive: boolean;
  isVerified: boolean;
  isSuspended: boolean;
  createdAt: string;
  lastLoginAt?: string;
  statistics: {
    discussionsCreated: number;
    postsCreated: number;
    followersCount: number;
    reputationScore: number;
  };
}

/**
 * User public profile (visible to other users)
 */
export interface UserPublicProfile {
  userId: string;
  displayName: string;
  avatar?: string;
  bio?: string;
  role: UserRole;
  isVerified: boolean;
  createdAt: string;
  lastActivityAt?: string;
  statistics: {
    discussionsCreated: number;
    postsCreated: number;
    followersCount: number;
    reputationScore: number;
  };
  // Only show email if privacy settings allow
  email?: string;
}

/**
 * User activity summary
 */
export interface UserActivitySummary {
  userId: string;
  displayName: string;
  avatar?: string;
  recentDiscussions: Array<{
    discussionId: string;
    title: string;
    createdAt: string;
  }>;
  recentPosts: Array<{
    postId: string;
    discussionId: string;
    discussionTitle: string;
    preview: string;
    createdAt: string;
  }>;
  totalActivity: {
    discussionsThisWeek: number;
    postsThisWeek: number;
    reactionsThisWeek: number;
  };
}

/**
 * User notification preferences
 */
export interface UserNotificationPreferences {
  userId: string;
  email: boolean;
  push: boolean;
  mentions: boolean;
  replies: boolean;
  follows: boolean;
  discussions: boolean;
  moderation: boolean;
  frequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
  quietHours: {
    enabled: boolean;
    startTime: string; // HH:mm format
    endTime: string;   // HH:mm format
    timezone: string;
  };
}