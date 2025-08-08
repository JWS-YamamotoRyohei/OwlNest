import { DynamoDBItem } from '../services/dynamodb';
import {
  Stance,
  DiscussionCategory,
  AccessControlType,
  EntityType,
  BaseEntity,
  Statistics,
  ModerationStatus,
  FileAttachment,
} from './common';

/**
 * Discussion metadata stored in DynamoDB
 * PK: DISCUSSION#{discussionId}
 * SK: METADATA
 * GSI1PK: CATEGORY#{categoryId}
 * GSI1SK: DISCUSSION#{discussionId}
 * GSI2PK: OWNER#{ownerId}
 * GSI2SK: DISCUSSION#{discussionId}
 */
export interface Discussion extends DynamoDBItem, BaseEntity {
  PK: `DISCUSSION#${string}`;
  SK: 'METADATA';
  GSI1PK: `CATEGORY#${string}`;
  GSI1SK: `DISCUSSION#${string}`;
  GSI2PK: `OWNER#${string}`;
  GSI2SK: `DISCUSSION#${string}`;
  EntityType: EntityType.DISCUSSION;

  // Core discussion information
  discussionId: string;
  title: string;
  description: string;
  ownerId: string;
  ownerDisplayName: string;
  ownerStance: Stance;

  // Categorization
  categories: DiscussionCategory[];
  tags?: string[];

  // Access control
  accessControl: AccessControl;

  // Discussion status
  isActive: boolean;
  isLocked: boolean;
  isPinned: boolean;
  isFeatured: boolean;

  // Moderation
  moderation: ModerationStatus;

  // Statistics
  statistics: DiscussionStatistics;

  // Metadata
  metadata: DiscussionMetadata;
}

/**
 * Discussion point (論点) stored in DynamoDB
 * PK: DISCUSSION#{discussionId}
 * SK: POINT#{pointId}
 * GSI1PK: DISCUSSION#{discussionId}
 * GSI1SK: POINT#{order}
 */
export interface DiscussionPoint extends DynamoDBItem, BaseEntity {
  PK: `DISCUSSION#${string}`;
  SK: `POINT#${string}`;
  GSI1PK: `DISCUSSION#${string}`;
  GSI1SK: `POINT#${string}`;
  EntityType: EntityType.DISCUSSION_POINT;

  // Core point information
  pointId: string;
  discussionId: string;
  title: string;
  description?: string;

  // Hierarchy
  parentId?: string;
  level: number;
  order: number;

  // Statistics
  postCount: number;
  prosCount: number;
  consCount: number;
  neutralCount: number;

  // Status
  isActive: boolean;
}

/**
 * Background knowledge stored in DynamoDB
 * PK: DISCUSSION#{discussionId}
 * SK: KNOWLEDGE#{knowledgeId}
 */
export interface BackgroundKnowledge extends DynamoDBItem, BaseEntity {
  PK: `DISCUSSION#${string}`;
  SK: `KNOWLEDGE#${string}`;
  EntityType: EntityType.BACKGROUND_KNOWLEDGE;

  // Core information
  knowledgeId: string;
  discussionId: string;
  type: 'text' | 'file' | 'url';
  title?: string;
  content: string;
  order: number;

  // File information (if type is 'file')
  fileAttachment?: FileAttachment;

  // URL information (if type is 'url')
  urlMetadata?: {
    title?: string;
    description?: string;
    image?: string;
    siteName?: string;
  };
}

/**
 * Access control configuration
 */
export interface AccessControl {
  type: AccessControlType;
  userIds: string[];
  allowedRoles?: string[];
  requireApproval?: boolean;
}

/**
 * Discussion statistics
 */
export interface DiscussionStatistics extends Statistics {
  prosCount: number;
  consCount: number;
  neutralCount: number;
  unknownCount: number;
  pointsCount: number;
  followersCount: number;
  uniqueParticipants: number;
  averagePostLength: number;
  engagementRate: number;
}

/**
 * Discussion metadata
 */
export interface DiscussionMetadata {
  version: number;
  language: string;
  region?: string;
  source?: string;
  externalId?: string;
  importedAt?: string;
  lastModifiedBy: string;
  changeLog: DiscussionChangeLog[];
}

/**
 * Discussion change log entry
 */
export interface DiscussionChangeLog {
  timestamp: string;
  userId: string;
  action: string;
  changes: Record<string, { from: any; to: any }>;
  reason?: string;
}

/**
 * Discussion creation data
 */
export interface CreateDiscussionData {
  title: string;
  description: string;
  ownerStance: Stance;
  categories: DiscussionCategory[];
  points: CreateDiscussionPointData[];
  backgroundKnowledge?: CreateBackgroundKnowledgeData[];
  accessControl?: Partial<AccessControl>;
  tags?: string[];
}

/**
 * Discussion point creation data
 */
export interface CreateDiscussionPointData {
  title: string;
  description?: string;
  parentId?: string;
  order: number;
}

/**
 * Background knowledge creation data
 */
export interface CreateBackgroundKnowledgeData {
  type: 'text' | 'file' | 'url';
  title?: string;
  content: string;
  order: number;
  fileAttachment?: FileAttachment;
}

/**
 * Discussion update data
 */
export interface UpdateDiscussionData {
  title?: string;
  description?: string;
  ownerStance?: Stance;
  categories?: DiscussionCategory[];
  accessControl?: Partial<AccessControl>;
  tags?: string[];
  isActive?: boolean;
  isLocked?: boolean;
  isPinned?: boolean;
  isFeatured?: boolean;
}

/**
 * Discussion search filters
 */
export interface DiscussionSearchFilters {
  categories?: DiscussionCategory[];
  ownerId?: string;
  ownerStance?: Stance;
  isActive?: boolean;
  isLocked?: boolean;
  isPinned?: boolean;
  isFeatured?: boolean;
  createdAfter?: string;
  createdBefore?: string;
  lastActivityAfter?: string;
  lastActivityBefore?: string;
  minParticipants?: number;
  maxParticipants?: number;
  minPosts?: number;
  maxPosts?: number;
  tags?: string[];
  titleContains?: string;
  descriptionContains?: string;
}

/**
 * Discussion list item (for discussion lists and search results)
 */
export interface DiscussionListItem {
  discussionId: string;
  title: string;
  description: string;
  ownerId: string;
  ownerDisplayName: string;
  ownerStance: Stance;
  categories: DiscussionCategory[];
  tags?: string[];
  isActive: boolean;
  isLocked: boolean;
  isPinned: boolean;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
  lastActivityAt: string;
  statistics: {
    participantCount: number;
    postCount: number;
    prosCount: number;
    consCount: number;
    neutralCount: number;
    followersCount: number;
  };
}

/**
 * Discussion summary (for cards and previews)
 */
export interface DiscussionSummary {
  discussionId: string;
  title: string;
  description: string;
  ownerId: string;
  ownerDisplayName: string;
  ownerStance: Stance;
  categories: DiscussionCategory[];
  pointsCount: number;
  participantCount: number;
  postCount: number;
  lastActivityAt: string;
  createdAt: string;
  isFollowing?: boolean;
}

/**
 * Discussion detail view (full discussion with points)
 */
export interface DiscussionDetail extends Discussion {
  points: DiscussionPoint[];
  backgroundKnowledge: BackgroundKnowledge[];
  recentPosts: Array<{
    postId: string;
    authorId: string;
    authorDisplayName: string;
    content: string;
    stance: Stance;
    createdAt: string;
    pointId: string;
    pointTitle: string;
  }>;
  topContributors: Array<{
    userId: string;
    displayName: string;
    avatar?: string;
    postCount: number;
    reactionCount: number;
  }>;
  isFollowing?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  canModerate?: boolean;
}

/**
 * Discussion analytics data
 */
export interface DiscussionAnalytics {
  discussionId: string;
  title: string;
  timeRange: {
    startDate: string;
    endDate: string;
  };
  engagement: {
    totalViews: number;
    uniqueViewers: number;
    totalPosts: number;
    uniquePosters: number;
    averagePostsPerUser: number;
    engagementRate: number;
  };
  stanceDistribution: {
    pros: number;
    cons: number;
    neutral: number;
    unknown: number;
  };
  activityTimeline: Array<{
    date: string;
    posts: number;
    views: number;
    participants: number;
  }>;
  topPoints: Array<{
    pointId: string;
    title: string;
    postCount: number;
    engagementScore: number;
  }>;
  participantAnalytics: {
    newParticipants: number;
    returningParticipants: number;
    averageSessionDuration: number;
    bounceRate: number;
  };
}
