import { DynamoDBItem } from '../services/dynamodb';
import {
  EntityType,
  BaseEntity,
  NotificationType,
  PaginationOptions,
  PaginationResult,
} from './common';

/**
 * Notification stored in DynamoDB
 * PK: USER#{userId}
 * SK: NOTIFICATION#{notificationId}
 * GSI1PK: USER#{userId}
 * GSI1SK: NOTIFICATION#{createdAt}
 */
export interface Notification extends DynamoDBItem, BaseEntity {
  PK: `USER#${string}`;
  SK: `NOTIFICATION#${string}`;
  GSI1PK: `USER#${string}`;
  GSI1SK: `NOTIFICATION#${string}`;
  EntityType: EntityType.NOTIFICATION;

  // Core notification information
  notificationId: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;

  // Notification data
  data: NotificationData;

  // Status
  isRead: boolean;
  isArchived: boolean;

  // Priority and category
  priority: NotificationPriority;
  category: NotificationCategory;

  // Actions
  actions?: NotificationAction[];

  // Metadata
  sourceId?: string;
  sourceType?: string;
  relatedUserId?: string;
  relatedUserName?: string;

  // TTL for automatic cleanup (90 days)
  ttl: number;
}

/**
 * Notification data based on type
 */
export type NotificationData =
  | PostReplyNotificationData
  | PostMentionNotificationData
  | DiscussionFollowNotificationData
  | UserFollowNotificationData
  | DiscussionUpdateNotificationData
  | ModerationActionNotificationData
  | SystemAnnouncementNotificationData;

/**
 * Post reply notification data
 */
export interface PostReplyNotificationData {
  type: NotificationType.POST_REPLY;
  postId: string;
  replyId: string;
  discussionId: string;
  discussionTitle: string;
  pointId?: string;
  pointTitle?: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  replyPreview: string;
}

/**
 * Post mention notification data
 */
export interface PostMentionNotificationData {
  type: NotificationType.POST_MENTION;
  postId: string;
  discussionId: string;
  discussionTitle: string;
  pointId?: string;
  pointTitle?: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  mentionContext: string;
}

/**
 * Discussion follow notification data
 */
export interface DiscussionFollowNotificationData {
  type: NotificationType.DISCUSSION_FOLLOW;
  discussionId: string;
  discussionTitle: string;
  postId?: string;
  postPreview?: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  activityType: 'new_post' | 'discussion_updated' | 'point_added';
}

/**
 * User follow notification data
 */
export interface UserFollowNotificationData {
  type: NotificationType.USER_FOLLOW;
  followerId: string;
  followerName: string;
  followerAvatar?: string;
  followerBio?: string;
  mutualFollows?: number;
}

/**
 * Discussion update notification data
 */
export interface DiscussionUpdateNotificationData {
  type: NotificationType.DISCUSSION_UPDATE;
  discussionId: string;
  discussionTitle: string;
  updateType: 'title_changed' | 'description_changed' | 'points_updated' | 'status_changed';
  updateSummary: string;
  updatedBy: string;
  updatedByName: string;
}

/**
 * Moderation action notification data
 */
export interface ModerationActionNotificationData {
  type: NotificationType.MODERATION_ACTION;
  actionType:
    | 'post_hidden'
    | 'post_deleted'
    | 'discussion_locked'
    | 'user_warned'
    | 'user_suspended';
  targetId: string;
  targetType: 'post' | 'discussion' | 'user';
  reason: string;
  moderatorId: string;
  moderatorName: string;
  appealable: boolean;
  appealDeadline?: string;
}

/**
 * System announcement notification data
 */
export interface SystemAnnouncementNotificationData {
  type: NotificationType.SYSTEM_ANNOUNCEMENT;
  announcementType: 'maintenance' | 'feature_update' | 'policy_change' | 'general';
  version?: string;
  affectedFeatures?: string[];
  actionRequired?: boolean;
  deadline?: string;
  learnMoreUrl?: string;
}

/**
 * Notification priority levels
 */
export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

/**
 * Notification categories
 */
export enum NotificationCategory {
  SOCIAL = 'social',
  CONTENT = 'content',
  MODERATION = 'moderation',
  SYSTEM = 'system',
  SECURITY = 'security',
}

/**
 * Notification actions
 */
export interface NotificationAction {
  id: string;
  label: string;
  type: 'primary' | 'secondary' | 'danger';
  action: NotificationActionType;
  url?: string;
  data?: any;
}

/**
 * Notification action types
 */
export enum NotificationActionType {
  VIEW = 'view',
  REPLY = 'reply',
  FOLLOW = 'follow',
  UNFOLLOW = 'unfollow',
  APPROVE = 'approve',
  REJECT = 'reject',
  APPEAL = 'appeal',
  DISMISS = 'dismiss',
  MARK_READ = 'mark_read',
  ARCHIVE = 'archive',
}

/**
 * Notification preferences
 */
export interface NotificationPreferences {
  userId: string;

  // Channel preferences
  email: boolean;
  push: boolean;
  inApp: boolean;

  // Type preferences
  postReplies: boolean;
  postMentions: boolean;
  discussionFollows: boolean;
  userFollows: boolean;
  discussionUpdates: boolean;
  moderationActions: boolean;
  systemAnnouncements: boolean;

  // Frequency settings
  frequency: NotificationFrequency;
  quietHours: QuietHours;

  // Grouping preferences
  groupSimilar: boolean;
  maxGroupSize: number;

  // Priority filtering
  minPriority: NotificationPriority;

  updatedAt: string;
}

/**
 * Notification frequency options
 */
export enum NotificationFrequency {
  IMMEDIATE = 'immediate',
  HOURLY = 'hourly',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  NEVER = 'never',
}

/**
 * Quiet hours configuration
 */
export interface QuietHours {
  enabled: boolean;
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  timezone: string;
  days: number[]; // 0-6, Sunday = 0
}

/**
 * Notification creation data
 */
export interface CreateNotificationData {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data: NotificationData;
  priority?: NotificationPriority;
  category?: NotificationCategory;
  actions?: NotificationAction[];
  sourceId?: string;
  sourceType?: string;
  relatedUserId?: string;
  relatedUserName?: string;
}

/**
 * Notification update data
 */
export interface UpdateNotificationData {
  isRead?: boolean;
  isArchived?: boolean;
}

/**
 * Notification filters
 */
export interface NotificationFilters {
  types?: NotificationType[];
  categories?: NotificationCategory[];
  priorities?: NotificationPriority[];
  isRead?: boolean;
  isArchived?: boolean;
  dateFrom?: string;
  dateTo?: string;
  sourceType?: string;
  relatedUserId?: string;
}

/**
 * Notification sort options
 */
export interface NotificationSortOptions {
  field: 'createdAt' | 'priority' | 'type';
  direction: 'asc' | 'desc';
}

/**
 * Notification query options
 */
export interface NotificationQueryOptions {
  filters?: NotificationFilters;
  sort?: NotificationSortOptions;
  pagination?: PaginationOptions;
}

/**
 * Notification list item
 */
export interface NotificationListItem {
  notificationId: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  category: NotificationCategory;
  isRead: boolean;
  isArchived: boolean;
  createdAt: string;
  relatedUserName?: string;
  actions?: NotificationAction[];
  data: NotificationData;
}

/**
 * Notification statistics
 */
export interface NotificationStatistics {
  userId: string;
  total: number;
  unread: number;
  archived: number;
  byType: Record<NotificationType, number>;
  byCategory: Record<NotificationCategory, number>;
  byPriority: Record<NotificationPriority, number>;
  todayCount: number;
  weekCount: number;
  monthCount: number;
  lastNotificationAt?: string;
}

/**
 * Notification batch operation
 */
export interface NotificationBatchOperation {
  notificationIds: string[];
  operation: 'mark_read' | 'mark_unread' | 'archive' | 'unarchive' | 'delete';
}

/**
 * Notification template
 */
export interface NotificationTemplate {
  id: string;
  type: NotificationType;
  category: NotificationCategory;
  priority: NotificationPriority;
  titleTemplate: string;
  messageTemplate: string;
  actionsTemplate?: NotificationAction[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Notification delivery status
 */
export interface NotificationDeliveryStatus {
  notificationId: string;
  userId: string;
  channels: {
    inApp: {
      delivered: boolean;
      deliveredAt?: string;
      error?: string;
    };
    email: {
      delivered: boolean;
      deliveredAt?: string;
      error?: string;
      messageId?: string;
    };
    push: {
      delivered: boolean;
      deliveredAt?: string;
      error?: string;
      messageId?: string;
    };
  };
  createdAt: string;
  updatedAt: string;
}

/**
 * Notification digest
 */
export interface NotificationDigest {
  userId: string;
  period: 'daily' | 'weekly';
  startDate: string;
  endDate: string;
  totalNotifications: number;
  unreadNotifications: number;
  topCategories: Array<{
    category: NotificationCategory;
    count: number;
  }>;
  recentNotifications: NotificationListItem[];
  generatedAt: string;
}

/**
 * Notification export data
 */
export interface NotificationExportData {
  userId: string;
  exportedAt: string;
  totalNotifications: number;
  dateRange: {
    from: string;
    to: string;
  };
  notifications: Array<{
    notificationId: string;
    type: NotificationType;
    title: string;
    message: string;
    priority: NotificationPriority;
    category: NotificationCategory;
    isRead: boolean;
    isArchived: boolean;
    createdAt: string;
    data: NotificationData;
  }>;
}
