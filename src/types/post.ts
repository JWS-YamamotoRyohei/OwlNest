import { DynamoDBItem } from '../services/dynamodb';
import {
  Stance,
  EntityType,
  BaseEntity,
  Statistics,
  ModerationStatus,
  FileAttachment,
  ReactionType,
} from './common';

/**
 * Post stored in DynamoDB
 * PK: DISCUSSION#{discussionId}
 * SK: POST#{postId}
 * GSI1PK: POINT#{pointId}
 * GSI1SK: POST#{createdAt}
 * GSI2PK: USER#{authorId}
 * GSI2SK: POST#{createdAt}
 */
export interface Post extends DynamoDBItem, BaseEntity {
  PK: `DISCUSSION#${string}`;
  SK: `POST#${string}`;
  GSI1PK: `POINT#${string}`;
  GSI1SK: `POST#${string}`;
  GSI2PK: `USER#${string}`;
  GSI2SK: `POST#${string}`;
  EntityType: EntityType.POST;
  
  // Core post information
  postId: string;
  discussionId: string;
  discussionPointId: string;
  authorId: string;
  authorDisplayName: string;
  content: string;
  stance: Stance;
  
  // Hierarchy (for replies)
  parentId?: string;
  level: number;
  
  // File attachments
  attachments?: FileAttachment[];
  
  // Post status
  isActive: boolean;
  isEdited: boolean;
  editedAt?: string;
  
  // Moderation
  moderation: ModerationStatus;
  
  // Statistics
  statistics: PostStatistics;
  
  // Metadata
  metadata: PostMetadata;
}

/**
 * Post statistics
 */
export interface PostStatistics extends Statistics {
  replyCount: number;
  likeCount: number;
  agreeCount: number;
  disagreeCount: number;
  insightfulCount: number;
  funnyCount: number;
}

/**
 * Post metadata
 */
export interface PostMetadata {
  version: number;
  ipAddress?: string;
  userAgent?: string;
  source?: string;
  editHistory?: PostEditHistory[];
}

/**
 * Post edit history entry
 */
export interface PostEditHistory {
  timestamp: string;
  previousContent: string;
  reason?: string;
}

/**
 * Post list item (for post lists and feeds)
 */
export interface PostListItem {
  postId: string;
  discussionId: string;
  discussionTitle: string;
  discussionPointId: string;
  discussionPointTitle: string;
  authorId: string;
  authorDisplayName: string;
  authorAvatar?: string;
  content: {
        text: string,
        preview: string,
        hasAttachments: number,
        hasLinks: number,
        attachmentCount: number,
      };
  stance: Stance;
  parentId?: string;
  level: number;
  attachments?: FileAttachment[];
  isActive: boolean;
  isEdited: boolean;
  createdAt: string;
  updatedAt: string;
  replyCount:number;
  statistics: {
    replyCount: number;
    likeCount: number;
    agreeCount: number;
    disagreeCount: number;
    insightfulCount: number;
    funnyCount: number;
    viewCount: number;
  };
  editedAt?: string;
  userReaction?: ReactionType;
  canEdit?: boolean;
  canDelete?: boolean;
  canReply?: boolean;
  canReact?:boolean
}

/**
 * Post creation data
 */
export interface CreatePostData {
  discussionId: string;
  discussionPointId: string;
  content: {
    text: string,
    preview: string,
    hasAttachments: number,
    hasLinks: number,
    attachmentCount: number,
  };
  attachments: FileAttachment[];
  stance: Stance;
  parentId?: string;
  replyToId:string
}

/**
 * Post update data
 */
export interface UpdatePostData {
  content?: string;
  stance?: Stance;
  attachments?: FileAttachment[];
  reason?: string;
}

/**
 * Post search filters
 */
export interface PostSearchFilters {
  discussionId?: string;
  discussionPointId?: string;
  authorId?: string;
  stance?: Stance;
  hasAttachments?: boolean;
  isEdited?: boolean;
  createdAfter?: string;
  createdBefore?: string;
  contentContains?: string;
  minReactions?: number;
  maxLevel?: number;
}

/**
 * Post reaction data
 */
export interface PostReaction extends DynamoDBItem, BaseEntity {
  PK: `POST#${string}`;
  SK: `REACTION#${string}#${string}`;
  EntityType: EntityType.POST_REACTION;
  
  postId: string;
  userId: string;
  reactionType: ReactionType;
}

/**
 * Post report data
 */
export interface PostReport extends DynamoDBItem, BaseEntity {
  PK: `POST#${string}`;
  SK: `REPORT#${string}#${string}`;
  EntityType: EntityType.POST_REPORT;
  
  postId: string;
  reporterId: string;
  reason: string;
  description?: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  reviewedBy?: string;
  reviewedAt?: string;
  resolution?: string;
}

/**
 * Post summary (for cards and previews)
 */
export interface PostSummary {
  postId: string;
  discussionId: string;
  discussionTitle: string;
  discussionPointId: string;
  discussionPointTitle: string;
  authorId: string;
  authorDisplayName: string;
  authorAvatar?: string;
  content: string;
  stance: Stance;
  createdAt: string;
  reactionCount: number;
  replyCount: number;
  isEdited: boolean;
}

/**
 * Post detail view (full post with replies)
 */
export interface PostDetail extends Post {
  discussionTitle: string;
  discussionPointTitle: string;
  authorAvatar?: string;
  replies: PostListItem[];
  reactions: Array<{
    type: ReactionType;
    count: number;
    users: Array<{
      userId: string;
      displayName: string;
      avatar?: string;
    }>;
  }>;
  userReaction?: ReactionType;
  canEdit?: boolean;
  canDelete?: boolean;
  canReply?: boolean;
  canReport?: boolean;
}

/**
 * Post filters for searching and filtering posts
 */
export interface PostFilters {
  discussionId?: string;
  discussionPointId?: string;
  authorId?: string;
  stance?: Stance;
  hasAttachments?: boolean;
  hasLinks?: boolean;
  isEdited?: boolean;
  searchText?: string;
  createdAfter?: string;
  createdBefore?: string;
  contentContains?: string;
  minReactions?: number;
  maxLevel?: number;
  dateRange?: {
    start: string;
    end: string;
  };
}

/**
 * Post sort options
 */
export interface PostSortOptions {
  field: 'createdAt' | 'updatedAt' | 'reactions' | 'replies';
  direction: 'asc' | 'desc';
}

/**
 * Post analytics data
 */
export interface PostAnalytics {
  postId: string;
  discussionId: string;
  timeRange: {
    startDate: string;
    endDate: string;
  };
  engagement: {
    totalViews: number;
    uniqueViewers: number;
    totalReactions: number;
    totalReplies: number;
    engagementRate: number;
  };
  reactionBreakdown: {
    like: number;
    agree: number;
    disagree: number;
    insightful: number;
    funny: number;
  };
  viewerAnalytics: {
    averageReadTime: number;
    bounceRate: number;
    shareCount: number;
  };
}