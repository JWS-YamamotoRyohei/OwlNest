import { DynamoDBItem } from '../services/dynamodb';
import { EntityType, BaseEntity, PaginationOptions } from './common';

/**
 * Follow relationship stored in DynamoDB
 * PK: USER#{followerId}
 * SK: FOLLOW#{targetType}#{targetId}
 * GSI1PK: {targetType}#{targetId}
 * GSI1SK: FOLLOWER#{followerId}
 */
export interface Follow extends DynamoDBItem, BaseEntity {
  PK: `USER#${string}`;
  SK: `FOLLOW#${FollowTargetType}#${string}`;
  GSI1PK: `${FollowTargetType}#${string}`;
  GSI1SK: `FOLLOWER#${string}`;
  EntityType: EntityType.FOLLOW;

  // Core follow information
  followerId: string;
  targetType: FollowTargetType;
  targetId: string;

  // Follow metadata
  isActive: boolean;
  notificationsEnabled: boolean;

  // Additional context
  followReason?: string;
  tags?: string[];
}

/**
 * Timeline item stored in DynamoDB
 * PK: USER#{userId}
 * SK: TIMELINE#{timestamp}#{itemId}
 * GSI1PK: USER#{userId}
 * GSI1SK: TIMELINE#{timestamp}
 */
export interface TimelineItem extends DynamoDBItem, BaseEntity {
  PK: `USER#${string}`;
  SK: `TIMELINE#${string}#${string}`;
  GSI1PK: `USER#${string}`;
  GSI1SK: `TIMELINE#${string}`;
  EntityType: EntityType.TIMELINE_ITEM;

  // Core timeline information
  userId: string;
  itemType: TimelineItemType;
  itemId: string;

  // Content information
  title: string;
  preview: string;
  authorId: string;
  authorDisplayName: string;
  authorAvatar?: string;

  // Context information
  discussionId?: string;
  discussionTitle?: string;
  pointId?: string;
  pointTitle?: string;

  // Metadata
  isRead: boolean;
  priority: TimelinePriority;

  // TTL for automatic cleanup (30 days)
  ttl: number;
}

/**
 * Follow target types
 */
export enum FollowTargetType {
  USER = 'USER',
  DISCUSSION = 'DISCUSSION',
}

/**
 * Timeline item types
 */
export enum TimelineItemType {
  POST = 'POST',
  DISCUSSION_CREATED = 'DISCUSSION_CREATED',
  DISCUSSION_UPDATED = 'DISCUSSION_UPDATED',
  USER_JOINED = 'USER_JOINED',
}

/**
 * Timeline priority levels
 */
export enum TimelinePriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

/**
 * Follow creation data
 */
export interface CreateFollowData {
  targetType: FollowTargetType;
  targetId: string;
  notificationsEnabled?: boolean;
  followReason?: string;
  tags?: string[];
}

/**
 * Follow update data
 */
export interface UpdateFollowData {
  notificationsEnabled?: boolean;
  followReason?: string;
  tags?: string[];
}

/**
 * Follow list item
 */
export interface FollowListItem {
  followId: string;
  targetType: FollowTargetType;
  targetId: string;
  targetName: string;
  targetAvatar?: string;
  targetDescription?: string;
  isActive: boolean;
  notificationsEnabled: boolean;
  createdAt: string;

  // Target-specific information
  targetInfo: UserFollowInfo | DiscussionFollowInfo;
}

/**
 * User follow information
 */
export interface UserFollowInfo {
  displayName: string;
  avatar?: string;
  bio?: string;
  role: string;
  isVerified: boolean;
  followersCount: number;
  discussionsCount: number;
  postsCount: number;
  lastActivityAt?: string;
}

/**
 * Discussion follow information
 */
export interface DiscussionFollowInfo {
  title: string;
  description: string;
  ownerDisplayName: string;
  categories: string[];
  participantCount: number;
  postCount: number;
  lastActivityAt: string;
  isActive: boolean;
}

/**
 * Timeline filters
 */
export interface TimelineFilters {
  itemTypes?: TimelineItemType[];
  authorIds?: string[];
  discussionIds?: string[];
  priority?: TimelinePriority;
  isRead?: boolean;
  dateFrom?: string;
  dateTo?: string;
}

/**
 * Timeline sort options
 */
export interface TimelineSortOptions {
  field: 'createdAt' | 'priority' | 'authorName';
  direction: 'asc' | 'desc';
}

/**
 * Timeline query options
 */
export interface TimelineQueryOptions {
  filters?: TimelineFilters;
  sort?: TimelineSortOptions;
  pagination?: PaginationOptions;
}

/**
 * Follow statistics
 */
export interface FollowStatistics {
  userId: string;
  followingUsers: number;
  followingDiscussions: number;
  followers: number;
  mutualFollows: number;
  timelineItemsToday: number;
  timelineItemsWeek: number;
  lastTimelineUpdate: string;
}

/**
 * Follow suggestions
 */
export interface FollowSuggestion {
  targetType: FollowTargetType;
  targetId: string;
  targetName: string;
  targetAvatar?: string;
  targetDescription?: string;
  reason: FollowSuggestionReason;
  score: number;
  mutualConnections?: string[];

  // Target-specific information
  targetInfo: UserFollowInfo | DiscussionFollowInfo;
}

/**
 * Follow suggestion reasons
 */
export enum FollowSuggestionReason {
  MUTUAL_FOLLOWS = 'mutual_follows',
  SIMILAR_INTERESTS = 'similar_interests',
  ACTIVE_PARTICIPANT = 'active_participant',
  TRENDING_DISCUSSION = 'trending_discussion',
  CATEGORY_MATCH = 'category_match',
  LOCATION_BASED = 'location_based',
}

/**
 * Bulk follow operation
 */
export interface BulkFollowOperation {
  targetType: FollowTargetType;
  targetIds: string[];
  notificationsEnabled?: boolean;
  followReason?: string;
}

/**
 * Follow activity summary
 */
export interface FollowActivitySummary {
  userId: string;
  period: 'day' | 'week' | 'month';
  newFollows: number;
  unfollows: number;
  timelineItems: number;
  topAuthors: Array<{
    authorId: string;
    authorName: string;
    itemCount: number;
  }>;
  topDiscussions: Array<{
    discussionId: string;
    discussionTitle: string;
    itemCount: number;
  }>;
  engagementRate: number;
}

/**
 * Follow export data
 */
export interface FollowExportData {
  userId: string;
  exportedAt: string;
  followingUsers: Array<{
    userId: string;
    displayName: string;
    followedAt: string;
    notificationsEnabled: boolean;
  }>;
  followingDiscussions: Array<{
    discussionId: string;
    title: string;
    followedAt: string;
    notificationsEnabled: boolean;
  }>;
  followers: Array<{
    userId: string;
    displayName: string;
    followedAt: string;
  }>;
}
