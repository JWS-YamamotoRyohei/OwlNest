/**
 * Common types and enums used across the application
 */

// User roles in the system
export enum UserRole {
  VIEWER = 'viewer',
  CONTRIBUTOR = 'contributor',
  CREATOR = 'creator',
  ADMIN = 'admin',
}

// User stance on discussions and posts
export enum Stance {
  PROS = 'pros',
  CONS = 'cons',
  NEUTRAL = 'neutral',
  UNKNOWN = 'unknown',
  HIDDEN = 'hidden',
}

// Discussion categories (simplified for UI)
export enum DiscussionCategory {
  POLITICS = 'politics',
  ECONOMY = 'economy',
  SOCIETY = 'society',
  TECHNOLOGY = 'technology',
  ENTERTAINMENT = 'entertainment',
  SPORTS = 'sports',
  OTHER = 'other',
}

// Detailed discussion categories (for future use)
export enum DetailedDiscussionCategory {
  // Politics
  POLITICS_NATIONAL = 'politics_national',
  POLITICS_LOCAL = 'politics_local',
  POLITICS_INTERNATIONAL = 'politics_international',
  POLITICS_ELECTIONS = 'politics_elections',
  POLITICS_POLITICIANS = 'politics_politicians',
  POLITICS_CONSTITUTION = 'politics_constitution',

  // Economy & Industry
  ECONOMY_GENERAL = 'economy_general',
  ECONOMY_FINANCE = 'economy_finance',
  ECONOMY_EMPLOYMENT = 'economy_employment',
  ECONOMY_LOCAL = 'economy_local',
  ECONOMY_INDUSTRY = 'economy_industry',
  ECONOMY_TRANSPORT = 'economy_transport',
  ECONOMY_STARTUPS = 'economy_startups',

  // Society & Life
  SOCIETY_GENERAL = 'society_general',
  SOCIETY_EDUCATION = 'society_education',
  SOCIETY_HEALTHCARE = 'society_healthcare',
  SOCIETY_DISASTER = 'society_disaster',
  SOCIETY_LIFESTYLE = 'society_lifestyle',
  SOCIETY_RELATIONSHIPS = 'society_relationships',
  SOCIETY_FAMILY = 'society_family',

  // Technology & Internet
  TECH_INTERNET_CULTURE = 'tech_internet_culture',
  TECH_SOCIAL_MEDIA = 'tech_social_media',
  TECH_GAMING = 'tech_gaming',
  TECH_AI = 'tech_ai',
  TECH_SECURITY = 'tech_security',
  TECH_GADGETS = 'tech_gadgets',
  TECH_ADVANCED = 'tech_advanced',

  // Entertainment
  ENTERTAINMENT_CELEBRITY = 'entertainment_celebrity',
  ENTERTAINMENT_MUSIC = 'entertainment_music',
  ENTERTAINMENT_MOVIES = 'entertainment_movies',
  ENTERTAINMENT_COMEDY = 'entertainment_comedy',
  ENTERTAINMENT_ANIME = 'entertainment_anime',
  ENTERTAINMENT_VOICE_ACTORS = 'entertainment_voice_actors',
  ENTERTAINMENT_SUBCULTURE = 'entertainment_subculture',

  // Sports
  SPORTS_BASEBALL = 'sports_baseball',
  SPORTS_SOCCER = 'sports_soccer',
  SPORTS_BASKETBALL = 'sports_basketball',
  SPORTS_MARTIAL_ARTS = 'sports_martial_arts',
  SPORTS_OLYMPICS = 'sports_olympics',
  SPORTS_ATHLETES = 'sports_athletes',
  SPORTS_CULTURE = 'sports_culture',

  // Other
  OTHER = 'other',
}

// Access control types
export enum AccessControlType {
  OPEN = 'open',
  BLACKLIST = 'blacklist',
  WHITELIST = 'whitelist',
}

// Notification types
export enum NotificationType {
  POST_REPLY = 'post_reply',
  POST_MENTION = 'post_mention',
  DISCUSSION_FOLLOW = 'discussion_follow',
  USER_FOLLOW = 'user_follow',
  DISCUSSION_UPDATE = 'discussion_update',
  MODERATION_ACTION = 'moderation_action',
  SYSTEM_ANNOUNCEMENT = 'system_announcement',
}

// Reaction types
export enum ReactionType {
  LIKE = 'like',
  AGREE = 'agree',
  DISAGREE = 'disagree',
  INSIGHTFUL = 'insightful',
  FUNNY = 'funny',
}

// Entity types for DynamoDB
export enum EntityType {
  USER_PROFILE = 'UserProfile',
  DISCUSSION = 'Discussion',
  DISCUSSION_POINT = 'DiscussionPoint',
  BACKGROUND_KNOWLEDGE = 'BackgroundKnowledge',
  POST = 'Post',
  POST_REACTION = 'PostReaction',
  POST_REPORT = 'PostReport',
  FOLLOW = 'Follow',
  NOTIFICATION = 'Notification',
  TIMELINE_ITEM = 'TimelineItem',
  MODERATION_QUEUE_ITEM = 'ModerationQueueItem',
  MODERATION_ACTION = 'ModerationAction',
  USER_SANCTION = 'UserSanction',
  CONTENT_FILTER = 'ContentFilter',
}

// Text formatting options
export interface TextFormatting {
  bold?: boolean;
  fontSize?: 'small' | 'medium' | 'large';
  color?: string;
}

// File attachment types
export interface FileAttachment {
  id: string;
  url: string;
  filename: string;
  contentType: string;
  size: number;
  uploadedAt: string;
}

// Pagination options
export interface PaginationOptions {
  limit?: number;
  nextToken?: string;
}

// Pagination result
export interface PaginationResult<T> {
  items: T[];
  nextToken?: string;
  hasMore: boolean;
  totalCount?: number;
}

// Sort options
export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}

// Filter options
export interface FilterOptions {
  [key: string]: any;
}

// Search options
export interface SearchOptions {
  query?: string;
  filters?: FilterOptions;
  sort?: SortOptions;
  pagination?: PaginationOptions;
}

// API response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    timestamp: string;
    requestId?: string;
    [key: string]: any;
  };
}

// Validation error
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

// Base entity interface
export interface BaseEntity {
  createdAt: string;
  updatedAt: string;
}

// Audit trail
export interface AuditTrail {
  action: string;
  userId: string;
  timestamp: string;
  details?: any;
}

// Permission interface
export interface Permission {
  canView: boolean;
  canPost: boolean;
  canCreateDiscussion: boolean;
  canModerate: boolean;
  canManageUsers: boolean;
  canDeleteOwnPosts: boolean;
  canEditOwnPosts: boolean;
  canDeleteOthersPosts: boolean;
  canEditOthersDiscussions: boolean;
}

// User preferences
export interface UserPreferences {
  notifications: NotificationSettings;
  privacy: PrivacySettings;
  display: DisplaySettings;
}

export interface NotificationSettings {
  email: boolean;
  push: boolean;
  mentions: boolean;
  replies: boolean;
  follows: boolean;
  discussions: boolean;
  moderation: boolean;
}

export interface PrivacySettings {
  profileVisible: boolean;
  emailVisible: boolean;
  activityVisible: boolean;
}

export interface DisplaySettings {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  timezone: string;
  postsPerPage: number;
}

// Moderation status
export interface ModerationStatus {
  isHidden: boolean;
  hiddenBy?: string;
  hiddenAt?: string;
  hiddenReason?: string;
  isDeleted: boolean;
  deletedBy?: string;
  deletedAt?: string;
  deletedReason?: string;
  isReported: boolean;
  reportCount?: number;
  lastReportedAt?: string;
}

// Statistics interface
export interface Statistics {
  viewCount: number;
  participantCount: number;
  postCount: number;
  reactionCount: number;
  shareCount: number;
  lastActivityAt: string;
}

// Category hierarchy
export interface CategoryHierarchy {
  id: DiscussionCategory;
  name: string;
  parentId?: DiscussionCategory;
  level: number;
  order: number;
  description?: string;
  icon?: string;
}

// Time-based data
export interface TimeBasedData {
  createdAt: string;
  updatedAt: string;
  lastAccessedAt?: string;
  expiresAt?: string;
  ttl?: number;
}
