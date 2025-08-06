import { DynamoDBItem } from '../services/dynamodb';
import { EntityType, BaseEntity, AuditTrail } from './common';

/**
 * Report categories for content moderation
 */
export enum ReportCategory {
  SPAM = 'spam',
  HARASSMENT = 'harassment',
  INAPPROPRIATE = 'inappropriate',
  MISINFORMATION = 'misinformation',
  HATE_SPEECH = 'hate_speech',
  VIOLENCE = 'violence',
  COPYRIGHT = 'copyright',
  PRIVACY = 'privacy',
  OTHER = 'other'
}

/**
 * Report priority levels
 */
export enum ReportPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

/**
 * Report status
 */
export enum ReportStatus {
  PENDING = 'pending',
  IN_REVIEW = 'in_review',
  RESOLVED = 'resolved',
  DISMISSED = 'dismissed',
  ESCALATED = 'escalated'
}

/**
 * Moderation action types
 */
export enum ModerationActionType {
  HIDE = 'hide',
  SHOW = 'show',
  DELETE = 'delete',
  RESTORE = 'restore',
  FLAG = 'flag',
  UNFLAG = 'unflag',
  WARN_USER = 'warn_user',
  SUSPEND_USER = 'suspend_user',
  BAN_USER = 'ban_user',
  UNBAN_USER = 'unban_user'
}

/**
 * User sanction types
 */
export enum SanctionType {
  WARNING = 'warning',
  TEMPORARY_SUSPENSION = 'temporary_suspension',
  PERMANENT_BAN = 'permanent_ban'
}

/**
 * Post report stored in DynamoDB
 * PK: POST#{postId}
 * SK: REPORT#{reportId}
 * GSI1PK: REPORTER#{reporterId}
 * GSI1SK: REPORT#{createdAt}
 * GSI2PK: STATUS#{status}
 * GSI2SK: REPORT#{priority}#{createdAt}
 */
export interface PostReport extends DynamoDBItem, BaseEntity {
  PK: `POST#${string}`;
  SK: `REPORT#${string}`;
  GSI1PK: `REPORTER#${string}`;
  GSI1SK: `REPORT#${string}`;
  GSI2PK: `STATUS#${ReportStatus}`;
  GSI2SK: `REPORT#${ReportPriority}#${string}`;
  EntityType: EntityType.POST_REPORT;
  
  // Report information
  reportId: string;
  postId: string;
  discussionId: string;
  reporterId: string;
  reporterDisplayName: string;
  
  // Report details
  category: ReportCategory;
  reason: string;
  description?: string;
  priority: ReportPriority;
  status: ReportStatus;
  
  // Evidence
  evidence?: {
    screenshots?: string[]; // S3 URLs
    additionalContext?: string;
    relatedReports?: string[]; // Related report IDs
  };
  
  // Review information
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  resolution?: string;
  
  // Auto-detection information
  autoDetected?: boolean;
  autoDetectionReason?: string;
  autoDetectionConfidence?: number;
  
  // Metadata
  metadata: {
    ipAddress?: string;
    userAgent?: string;
    source: 'web' | 'mobile' | 'api' | 'auto';
  };
}

/**
 * Moderation queue item
 * PK: MODQUEUE#{priority}
 * SK: ITEM#{createdAt}#{reportId}
 * GSI1PK: ASSIGNEE#{moderatorId}
 * GSI1SK: ITEM#{createdAt}
 */
export interface ModerationQueueItem extends DynamoDBItem, BaseEntity {
  PK: `MODQUEUE#${ReportPriority}`;
  SK: `ITEM#${string}#${string}`;
  GSI1PK: `ASSIGNEE#${string}`;
  GSI1SK: `ITEM#${string}`;
  EntityType: EntityType.MODERATION_QUEUE_ITEM;
  
  // Queue item information
  queueItemId: string;
  reportId: string;
  postId: string;
  discussionId: string;
  
  // Content information
  contentType: 'post' | 'discussion' | 'user';
  contentPreview: string;
  authorId: string;
  authorDisplayName: string;
  
  // Report information
  reportCategory: ReportCategory;
  reportReason: string;
  reporterCount: number; // Number of users who reported this content
  priority: ReportPriority;
  
  // Assignment
  assignedTo?: string;
  assignedAt?: string;
  assignedBy?: string;
  
  // Processing
  status: ReportStatus;
  estimatedReviewTime?: number; // Minutes
  actualReviewTime?: number; // Minutes
  
  // Flags
  isUrgent: boolean;
  isEscalated: boolean;
  requiresSpecialAttention: boolean;
  
  // Metadata
  metadata: {
    autoDetected: boolean;
    similarReportsCount: number;
    reporterHistory: {
      totalReports: number;
      accurateReports: number;
      falseReports: number;
    };
  };
}

/**
 * Moderation action log
 * PK: POST#{postId}
 * SK: ACTION#{timestamp}#{actionId}
 * GSI1PK: MODERATOR#{moderatorId}
 * GSI1SK: ACTION#{timestamp}
 */
export interface ModerationActionLog extends DynamoDBItem, BaseEntity {
  PK: `POST#${string}`;
  SK: `ACTION#${string}#${string}`;
  GSI1PK: `MODERATOR#${string}`;
  GSI1SK: `ACTION#${string}`;
  EntityType: EntityType.MODERATION_ACTION;
  
  // Action information
  actionId: string;
  postId: string;
  discussionId: string;
  moderatorId: string;
  moderatorDisplayName: string;
  
  // Action details
  actionType: ModerationActionType;
  reason: string;
  details?: string;
  
  // State changes
  previousState: {
    isHidden: boolean;
    isDeleted: boolean;
    isFlagged: boolean;
  };
  newState: {
    isHidden: boolean;
    isDeleted: boolean;
    isFlagged: boolean;
  };
  
  // Related information
  relatedReportId?: string;
  relatedQueueItemId?: string;
  
  // Audit trail
  auditTrail: AuditTrail;
}

/**
 * User sanction record
 * PK: USER#{userId}
 * SK: SANCTION#{sanctionId}
 * GSI1PK: MODERATOR#{moderatorId}
 * GSI1SK: SANCTION#{createdAt}
 */
export interface UserSanction extends DynamoDBItem, BaseEntity {
  PK: `USER#${string}`;
  SK: `SANCTION#${string}`;
  GSI1PK: `MODERATOR#${string}`;
  GSI1SK: `SANCTION#${string}`;
  EntityType: EntityType.USER_SANCTION;
  
  // Sanction information
  sanctionId: string;
  userId: string;
  userDisplayName: string;
  moderatorId: string;
  moderatorDisplayName: string;
  
  // Sanction details
  sanctionType: SanctionType;
  reason: string;
  description?: string;
  
  // Duration (for temporary sanctions)
  startDate: string;
  endDate?: string;
  duration?: number; // Duration in hours
  
  // Status
  isActive: boolean;
  isAppealed: boolean;
  appealedAt?: string;
  appealReason?: string;
  appealStatus?: 'pending' | 'approved' | 'denied';
  appealReviewedBy?: string;
  appealReviewedAt?: string;
  
  // Related information
  relatedPostId?: string;
  relatedReportId?: string;
  previousSanctions: string[]; // Previous sanction IDs
  
  // Auto-resolution
  autoResolveAt?: string;
  isAutoResolved?: boolean;
  
  // Notification
  userNotified: boolean;
  notifiedAt?: string;
  notificationMethod?: 'email' | 'in_app' | 'both';
}

/**
 * Content filter rule
 * PK: FILTER#{filterId}
 * SK: METADATA
 */
export interface ContentFilterRule extends DynamoDBItem, BaseEntity {
  PK: `FILTER#${string}`;
  SK: 'METADATA';
  EntityType: EntityType.CONTENT_FILTER;
  
  // Filter information
  filterId: string;
  name: string;
  description: string;
  
  // Filter configuration
  type: 'keyword' | 'regex' | 'ml_model' | 'external_api';
  pattern?: string; // For keyword/regex filters
  keywords?: string[]; // For keyword filters
  modelName?: string; // For ML model filters
  apiEndpoint?: string; // For external API filters
  
  // Filter behavior
  action: 'flag' | 'hide' | 'delete' | 'queue_for_review';
  severity: 'low' | 'medium' | 'high';
  confidence: number; // 0-1, minimum confidence to trigger
  
  // Scope
  applyToContent: boolean;
  applyToTitles: boolean;
  applyToComments: boolean;
  
  // Status
  isActive: boolean;
  isTestMode: boolean; // If true, only logs matches without taking action
  
  // Statistics
  stats: {
    totalMatches: number;
    truePositives: number;
    falsePositives: number;
    accuracy: number;
    lastTriggered?: string;
  };
  
  // Configuration
  createdBy: string;
  lastModifiedBy: string;
}

/**
 * Moderation dashboard statistics
 */
export interface ModerationStats {
  // Queue statistics
  queueStats: {
    totalItems: number;
    pendingItems: number;
    inReviewItems: number;
    itemsByPriority: Record<ReportPriority, number>;
    averageReviewTime: number; // Minutes
    oldestPendingItem?: string; // ISO date
  };
  
  // Report statistics
  reportStats: {
    totalReports: number;
    reportsByCategory: Record<ReportCategory, number>;
    reportsByStatus: Record<ReportStatus, number>;
    reportsByPriority: Record<ReportPriority, number>;
    averageResolutionTime: number; // Hours
    accuracyRate: number; // Percentage of reports that were valid
  };
  
  // Action statistics
  actionStats: {
    totalActions: number;
    actionsByType: Record<ModerationActionType, number>;
    actionsByModerator: Record<string, number>;
    actionsToday: number;
    actionsThisWeek: number;
  };
  
  // User sanction statistics
  sanctionStats: {
    totalSanctions: number;
    sanctionsByType: Record<SanctionType, number>;
    activeSanctions: number;
    sanctionsToday: number;
    appealRate: number; // Percentage of sanctions that were appealed
  };
  
  // Content filter statistics
  filterStats: {
    totalFilters: number;
    activeFilters: number;
    totalMatches: number;
    averageAccuracy: number;
    topPerformingFilters: Array<{
      filterId: string;
      name: string;
      accuracy: number;
      matches: number;
    }>;
  };
  
  // Time-based statistics
  trends: {
    reportsOverTime: Array<{
      date: string;
      count: number;
    }>;
    actionsOverTime: Array<{
      date: string;
      count: number;
    }>;
    queueSizeOverTime: Array<{
      date: string;
      size: number;
    }>;
  };
}

/**
 * Report creation data
 */
export interface CreateReportData {
  postId: string;
  category: ReportCategory;
  reason: string;
  description?: string;
  evidence?: {
    screenshots?: File[];
    additionalContext?: string;
  };
}

/**
 * Report review data
 */
export interface ReviewReportData {
  reportId: string;
  status: ReportStatus;
  resolution: string;
  notes?: string;
  action?: {
    type: ModerationActionType;
    reason: string;
    details?: string;
  };
  userSanction?: {
    type: SanctionType;
    reason: string;
    duration?: number; // Hours for temporary sanctions
  };
}

/**
 * Moderation queue filters
 */
export interface ModerationQueueFilters {
  priority?: ReportPriority;
  status?: ReportStatus;
  category?: ReportCategory;
  assignedTo?: string;
  isUrgent?: boolean;
  isEscalated?: boolean;
  createdAfter?: string;
  createdBefore?: string;
  contentType?: 'post' | 'discussion' | 'user';
  discussionId?: string;
  authorId?: string;
  reporterId?: string;
}

/**
 * Bulk moderation action data
 */
export interface BulkModerationAction {
  itemIds: string[]; // Queue item IDs or report IDs
  action: {
    type: ModerationActionType;
    reason: string;
    details?: string;
  };
  userSanction?: {
    type: SanctionType;
    reason: string;
    duration?: number;
  };
}

/**
 * Create sanction data
 */
export interface CreateSanctionData {
  userId: string;
  sanctionType: SanctionType;
  reason: string;
  description?: string;
  duration?: number; // Hours for temporary sanctions
  relatedPostId?: string;
  relatedReportId?: string;
}

/**
 * Sanction filters
 */
export interface SanctionFilters {
  sanctionType?: SanctionType;
  isActive?: boolean;
  isAppealed?: boolean;
  moderatorId?: string;
  startDate?: string;
  endDate?: string;
  userId?: string;
}