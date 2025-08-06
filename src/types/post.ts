import { DynamoDBItem } from '../services/dynamodb';
import {
  Stance,
  ReactionType,
  EntityType,
  BaseEntity,
  TextFormatting,
  FileAttachment,
  ModerationStatus,
  AuditTrail,
} from './common';

/**
 * Post stored in DynamoDB
 * PK: DISCUSSION#{discussionId}
 * SK: POST#{postId}
 * GSI1PK: POINT#{discussionPointId}
 * GSI1SK: POST#{createdAt}
 * GSI2PK: AUTHOR#{authorId}
 * GSI2SK: POST#{createdAt}
 */
export interface Post extends DynamoDBItem, BaseEntity {
  PK: `DISCUSSION#${string}`;
  SK: `POST#${string}`;
  GSI1PK: `POINT#${string}`;
  GSI1SK: `POST#${string}`;
  GSI2PK: `AUTHOR#${string}`;
  GSI2SK: `POST#${string}`;
  EntityType: EntityType.POST;
  
  // Core post information
  postId: string;
  discussionId: string;
  discussionPointId: string;
  authorId: string;
  authorDisplayName: string;
  
  // Content
  content: PostContent;
  stance: Stance;
  
  // Thread information
  replyToId?: string;
  threadLevel: number;
  threadPath: string; // e.g., "post1/post2/post3"
  
  // Reactions and engagement
  reactions: PostReactions;
  replyCount: number;
  
  // Moderation
  moderation: ModerationStatus;
  
  // Metadata
  metadata: PostMetadata;
}

/**
 * Post content with formatting and attachments
 */
export interface PostContent {
  text: string;
  formatting: TextFormatting;
  attachments: FileAttachment[];
  links: PostLink[];
  mentions: PostMention[];
  hashtags: string[];
}

/**
 * Post link information
 */
export interface PostLink {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  startIndex: number;
  endIndex: number;
}

/**
 * Post mention information
 */
export interface PostMention {
  userId: string;
  displayName: string;
  startIndex: number;
  endIndex: number;
}

/**
 * Post reactions summary
 */
export interface PostReactions {
  [ReactionType.LIKE]: number;
  [ReactionType.AGREE]: number;
  [ReactionType.DISAGREE]: number;
  [ReactionType.INSIGHTFUL]: number;
  [ReactionType.FUNNY]: number;
  totalCount: number;
  userReaction?: ReactionType; // Current user's reaction
}

/**
 * Post metadata
 */
export interface PostMetadata {
  version: number;
  editCount: number;
  lastEditedAt?: string;
  lastEditedBy?: string;
  isEdited: boolean;
  originalContent?: string; // Store original content for edit history
  editHistory: PostEditHistory[];
  ipAddress?: string;
  userAgent?: string;
  source: 'web' | 'mobile' | 'api';
}

/**
 * Post edit history entry
 */
export interface PostEditHistory {
  timestamp: string;
  editedBy: string;
  changes: {
    content?: { from: string; to: string };
    stance?: { from: Stance; to: Stance };
    attachments?: { added: FileAttachment[]; removed: FileAttachment[] };
  };
  reason?: string;
}

/**
 * Post reaction stored in DynamoDB
 * PK: POST#{postId}
 * SK: REACTION#{userId}
 */
export interface PostReaction extends DynamoDBItem, BaseEntity {
  PK: `POST#${string}`;
  SK: `REACTION#${string}`;
  EntityType: EntityType.POST_REACTION;
  
  postId: string;
  userId: string;
  reactionType: ReactionType;
  discussionId: string;
  authorId: string; // Post author ID for notifications
}

/**
 * Post creation data
 */
export interface CreatePostData {
  discussionId: string;
  discussionPointId: string;
  content: {
    text: string;
    formatting?: TextFormatting;
    attachments?: FileAttachment[];
  };
  stance: Stance;
  replyToId?: string;
  mentions?: string[]; // User IDs to mention
}

/**
 * Post update data
 */
export interface UpdatePostData {
  content?: {
    text: string;
    formatting?: TextFormatting;
    attachments?: FileAttachment[];
  };
  stance?: Stance;
  reason?: string; // Reason for edit
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
  hasLinks?: boolean;
  hasMentions?: boolean;
  isReply?: boolean;
  threadLevel?: number;
  createdAfter?: string;
  createdBefore?: string;
  updatedAfter?: string;
  updatedBefore?: string;
  minReactions?: number;
  maxReactions?: number;
  minReplies?: number;
  maxReplies?: number;
  contentContains?: string;
  mentionsUser?: string;
  hasHashtag?: string;
  reactionType?: ReactionType;
  isModerated?: boolean;
  isHidden?: boolean;
  isDeleted?: boolean;
}

/**
 * Post list item (for post lists and search results)
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
    text: string;
    preview: string; // Truncated text for previews
    hasAttachments: boolean;
    hasLinks: boolean;
    attachmentCount: number;
  };
  stance: Stance;
  replyToId?: string;
  threadLevel: number;
  reactions: PostReactions;
  replyCount: number;
  createdAt: string;
  updatedAt: string;
  isEdited: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  canReact?: boolean;
  canReply?: boolean;
}

/**
 * Post detail view (full post with replies)
 */
export interface PostDetail extends Post {
  replies: PostListItem[];
  parentPost?: PostListItem;
  discussionTitle: string;
  discussionPointTitle: string;
  authorAvatar?: string;
  canEdit: boolean;
  canDelete: boolean;
  canReact: boolean;
  canReply: boolean;
  canModerate: boolean;
}

/**
 * Post thread view (post with its thread context)
 */
export interface PostThread {
  rootPost: PostListItem;
  posts: PostListItem[];
  totalCount: number;
  maxDepth: number;
  hasMore: boolean;
  nextToken?: string;
}

/**
 * Post reaction summary for analytics
 */
export interface PostReactionSummary {
  postId: string;
  reactions: {
    [key in ReactionType]: {
      count: number;
      users: Array<{
        userId: string;
        displayName: string;
        avatar?: string;
        reactedAt: string;
      }>;
    };
  };
  totalReactions: number;
  uniqueReactors: number;
  mostPopularReaction: ReactionType;
}

/**
 * Post analytics data
 */
export interface PostAnalytics {
  postId: string;
  discussionId: string;
  authorId: string;
  metrics: {
    views: number;
    uniqueViewers: number;
    reactions: PostReactions;
    replies: number;
    shares: number;
    mentions: number;
    engagementRate: number;
  };
  timeline: Array<{
    date: string;
    views: number;
    reactions: number;
    replies: number;
  }>;
  audienceInsights: {
    topReactors: Array<{
      userId: string;
      displayName: string;
      reactionCount: number;
    }>;
    stanceDistribution: {
      pros: number;
      cons: number;
      neutral: number;
      unknown: number;
    };
    engagementByHour: Array<{
      hour: number;
      engagement: number;
    }>;
  };
}

/**
 * Post moderation action
 */
export interface PostModerationAction {
  postId: string;
  action: 'hide' | 'show' | 'delete' | 'restore' | 'flag' | 'unflag';
  moderatorId: string;
  reason: string;
  timestamp: string;
  details?: any;
  auditTrail: AuditTrail;
}

/**
 * Post report
 */
export interface PostReport {
  reportId: string;
  postId: string;
  reporterId: string;
  reason: string;
  category: 'spam' | 'harassment' | 'inappropriate' | 'misinformation' | 'other';
  description?: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  reviewedBy?: string;
  reviewedAt?: string;
  resolution?: string;
  createdAt: string;
}

/**
 * Post draft (for saving work in progress)
 */
export interface PostDraft {
  draftId: string;
  userId: string;
  discussionId: string;
  discussionPointId: string;
  content: {
    text: string;
    formatting?: TextFormatting;
    attachments?: FileAttachment[];
  };
  stance: Stance;
  replyToId?: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}