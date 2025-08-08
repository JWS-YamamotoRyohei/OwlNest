import {
  UserProfile,
  UserListItem,
  UserPublicProfile,
  CreateUserData,
  UpdateUserData,
} from '../types/User';
import {
  Discussion,
  DiscussionPoint,
  BackgroundKnowledge,
  DiscussionListItem,
  DiscussionSummary,
  DiscussionDetail,
  CreateDiscussionData,
  UpdateDiscussionData,
} from '../types/discussion';
import { Post, PostListItem, PostDetail, CreatePostData, UpdatePostData } from '../types/post';
import {
  UserRole,
  Stance,
  EntityType,
  AccessControlType,
  UserPreferences,
  NotificationSettings,
  PrivacySettings,
  DisplaySettings,
} from '../types/common';
import { DynamoDBHelpers } from '../services/dynamodb';

/**
 * Data transformation utilities for converting between different data formats
 */
export class DataTransformUtils {
  /**
   * Create default user preferences
   */
  static createDefaultUserPreferences(): UserPreferences {
    return {
      notifications: {
        email: true,
        push: false,
        mentions: true,
        replies: true,
        follows: true,
        discussions: true,
        moderation: false,
      },
      privacy: {
        profileVisible: true,
        emailVisible: false,
        activityVisible: true,
      },
      display: {
        theme: 'light',
        language: 'ja',
        timezone: 'Asia/Tokyo',
        postsPerPage: 20,
      },
    };
  }

  /**
   * Transform CreateUserData to UserProfile
   */
  static createUserDataToProfile(
    data: CreateUserData,
    userId: string,
    role: UserRole = UserRole.VIEWER
  ): UserProfile {
    const now = new Date().toISOString();

    return {
      PK: `USER#${userId}`,
      SK: 'PROFILE',
      GSI1PK: `ROLE#${role}`,
      GSI1SK: `USER#${userId}`,
      EntityType: EntityType.USER_PROFILE,

      userId,
      email: data.email,
      role,
      displayName: data.displayName,
      avatar: data.avatar,
      bio: data.bio,

      preferences: {
        ...this.createDefaultUserPreferences(),
        ...data.preferences,
      },

      statistics: {
        viewCount: 0,
        participantCount: 0,
        postCount: 0,
        reactionCount: 0,
        shareCount: 0,
        lastActivityAt: now,
        discussionsCreated: 0,
        postsCreated: 0,
        reactionsGiven: 0,
        reactionsReceived: 0,
        followersCount: 0,
        followingCount: 0,
        reputationScore: 0,
      },

      isActive: true,
      isVerified: false,
      isSuspended: false,

      loginCount: 0,
      auditTrail: [],

      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Transform UserProfile to UserListItem
   */
  static userProfileToListItem(profile: UserProfile): UserListItem {
    return {
      userId: profile.userId,
      displayName: profile.displayName,
      avatar: profile.avatar,
      role: profile.role,
      isActive: profile.isActive,
      isVerified: profile.isVerified,
      isSuspended: profile.isSuspended,
      createdAt: profile.createdAt,
      lastLoginAt: profile.lastLoginAt,
      statistics: {
        discussionsCreated: profile.statistics.discussionsCreated,
        postsCreated: profile.statistics.postsCreated,
        followersCount: profile.statistics.followersCount,
        reputationScore: profile.statistics.reputationScore,
      },
    };
  }

  /**
   * Transform UserProfile to UserPublicProfile
   */
  static userProfileToPublicProfile(profile: UserProfile): UserPublicProfile {
    return {
      userId: profile.userId,
      displayName: profile.displayName,
      avatar: profile.avatar,
      bio: profile.bio,
      role: profile.role,
      isVerified: profile.isVerified,
      createdAt: profile.createdAt,
      lastActivityAt: profile.statistics.lastActivityAt,
      statistics: {
        discussionsCreated: profile.statistics.discussionsCreated,
        postsCreated: profile.statistics.postsCreated,
        followersCount: profile.statistics.followersCount,
        reputationScore: profile.statistics.reputationScore,
      },
      // Only include email if privacy settings allow
      email: profile.preferences.privacy.emailVisible ? profile.email : undefined,
    };
  }

  /**
   * Transform CreateDiscussionData to Discussion
   */
  static createDiscussionDataToDiscussion(
    data: CreateDiscussionData,
    discussionId: string,
    ownerId: string,
    ownerDisplayName: string
  ): Discussion {
    const now = new Date().toISOString();
    const primaryCategory = data.categories[0];

    return {
      PK: `DISCUSSION#${discussionId}`,
      SK: 'METADATA',
      GSI1PK: `CATEGORY#${primaryCategory}`,
      GSI1SK: `DISCUSSION#${discussionId}`,
      GSI2PK: `OWNER#${ownerId}`,
      GSI2SK: `DISCUSSION#${discussionId}`,
      EntityType: EntityType.DISCUSSION,

      discussionId,
      title: data.title,
      description: data.description,
      ownerId,
      ownerDisplayName,
      ownerStance: data.ownerStance,

      categories: data.categories,
      tags: data.tags || [],

      accessControl: {
        type: data.accessControl?.type || AccessControlType.OPEN,
        userIds: data.accessControl?.userIds || [],
        allowedRoles: data.accessControl?.allowedRoles,
        requireApproval: data.accessControl?.requireApproval || false,
      },

      isActive: true,
      isLocked: false,
      isPinned: false,
      isFeatured: false,

      moderation: {
        isHidden: false,
        isDeleted: false,
        isReported: false,
        reportCount: 0,
      },

      statistics: {
        viewCount: 0,
        participantCount: 0,
        postCount: 0,
        reactionCount: 0,
        shareCount: 0,
        lastActivityAt: now,
        prosCount: 0,
        consCount: 0,
        neutralCount: 0,
        unknownCount: 0,
        pointsCount: data.points.length,
        followersCount: 0,
        uniqueParticipants: 0,
        averagePostLength: 0,
        engagementRate: 0,
      },

      metadata: {
        version: 1,
        language: 'ja',
        lastModifiedBy: ownerId,
        changeLog: [
          {
            timestamp: now,
            userId: ownerId,
            action: 'created',
            changes: {},
          },
        ],
      },

      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Transform CreateDiscussionData points to DiscussionPoint array
   */
  static createDiscussionPointsFromData(
    data: CreateDiscussionData,
    discussionId: string
  ): DiscussionPoint[] {
    const now = new Date().toISOString();

    return data.points.map((pointData, index) => ({
      PK: `DISCUSSION#${discussionId}`,
      SK: `POINT#${DynamoDBHelpers.generateId('point_')}`,
      GSI1PK: `DISCUSSION#${discussionId}`,
      GSI1SK: `POINT#${pointData.order.toString().padStart(3, '0')}`,
      EntityType: EntityType.DISCUSSION_POINT,

      pointId: DynamoDBHelpers.generateId('point_'),
      discussionId,
      title: pointData.title,
      description: pointData.description,
      parentId: pointData.parentId,
      level: pointData.parentId ? 1 : 0, // Simple 2-level hierarchy for now
      order: pointData.order,

      postCount: 0,
      prosCount: 0,
      consCount: 0,
      neutralCount: 0,

      isActive: true,

      createdAt: now,
      updatedAt: now,
    }));
  }

  /**
   * Transform Discussion to DiscussionListItem
   */
  static discussionToListItem(discussion: Discussion): DiscussionListItem {
    return {
      discussionId: discussion.discussionId,
      title: discussion.title,
      description: discussion.description,
      ownerId: discussion.ownerId,
      ownerDisplayName: discussion.ownerDisplayName,
      ownerStance: discussion.ownerStance,
      categories: discussion.categories,
      tags: discussion.tags,
      isActive: discussion.isActive,
      isLocked: discussion.isLocked,
      isPinned: discussion.isPinned,
      isFeatured: discussion.isFeatured,
      createdAt: discussion.createdAt,
      updatedAt: discussion.updatedAt,
      lastActivityAt: discussion.statistics.lastActivityAt,
      statistics: {
        participantCount: discussion.statistics.participantCount,
        postCount: discussion.statistics.postCount,
        prosCount: discussion.statistics.prosCount,
        consCount: discussion.statistics.consCount,
        neutralCount: discussion.statistics.neutralCount,
        followersCount: discussion.statistics.followersCount,
      },
    };
  }

  /**
   * Transform Discussion to DiscussionSummary
   */
  static discussionToSummary(discussion: Discussion): DiscussionSummary {
    return {
      discussionId: discussion.discussionId,
      title: discussion.title,
      description: discussion.description,
      ownerId: discussion.ownerId,
      ownerDisplayName: discussion.ownerDisplayName,
      ownerStance: discussion.ownerStance,
      categories: discussion.categories,
      pointsCount: discussion.statistics.pointsCount,
      participantCount: discussion.statistics.participantCount,
      postCount: discussion.statistics.postCount,
      lastActivityAt: discussion.statistics.lastActivityAt,
      createdAt: discussion.createdAt,
    };
  }

  /**
   * Transform CreatePostData to Post
   */
  static createPostDataToPost(
    data: CreatePostData,
    postId: string,
    authorId: string,
    authorDisplayName: string
  ): Post {
    const now = new Date().toISOString();

    return {
      PK: `DISCUSSION#${data.discussionId}`,
      SK: `POST#${postId}`,
      GSI1PK: `POINT#${data.discussionPointId}`,
      GSI1SK: `POST#${now}`,
      GSI2PK: `AUTHOR#${authorId}`,
      GSI2SK: `POST#${now}`,
      EntityType: EntityType.POST,

      postId,
      discussionId: data.discussionId,
      discussionPointId: data.discussionPointId,
      authorId,
      authorDisplayName,

      content: {
        text: data.content.text,
        formatting: data.content.formatting || {},
        attachments: data.content.attachments || [],
        links: [], // Will be extracted from text
        mentions: [], // Will be extracted from mentions array
        hashtags: [], // Will be extracted from text
      },
      stance: data.stance,

      replyToId: data.replyToId,
      threadLevel: data.replyToId ? 1 : 0, // Will be calculated based on parent
      threadPath: data.replyToId ? `${data.replyToId}/${postId}` : postId,

      reactions: {
        like: 0,
        agree: 0,
        disagree: 0,
        insightful: 0,
        funny: 0,
        totalCount: 0,
      },
      replyCount: 0,

      moderation: {
        isHidden: false,
        isDeleted: false,
        isReported: false,
        reportCount: 0,
      },

      metadata: {
        version: 1,
        editCount: 0,
        isEdited: false,
        editHistory: [],
        source: 'web',
      },

      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Transform Post to PostListItem
   */
  static postToListItem(
    post: Post,
    discussionTitle?: string,
    discussionPointTitle?: string,
    authorAvatar?: string
  ): PostListItem {
    return {
      postId: post.postId,
      discussionId: post.discussionId,
      discussionTitle: discussionTitle || '',
      discussionPointId: post.discussionPointId,
      discussionPointTitle: discussionPointTitle || '',
      authorId: post.authorId,
      authorDisplayName: post.authorDisplayName,
      authorAvatar,
      content: {
        text: post.content.text,
        preview: this.truncateText(post.content.text, 200),
        hasAttachments: post.content.attachments.length > 0,
        hasLinks: post.content.links.length > 0,
        attachmentCount: post.content.attachments.length,
      },
      stance: post.stance,
      replyToId: post.replyToId,
      threadLevel: post.threadLevel,
      reactions: post.reactions,
      replyCount: post.replyCount,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      isEdited: post.metadata.isEdited,
    };
  }

  /**
   * Extract mentions from text and mention array
   */
  static extractMentions(
    text: string,
    mentionUserIds: string[] = []
  ): Array<{
    userId: string;
    displayName: string;
    startIndex: number;
    endIndex: number;
  }> {
    const mentions: Array<{
      userId: string;
      displayName: string;
      startIndex: number;
      endIndex: number;
    }> = [];

    // Extract @mentions from text
    const mentionRegex = /@(\w+)/g;
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      const displayName = match[1];
      // In a real implementation, you would look up the userId by displayName
      mentions.push({
        userId: '', // Would be resolved from displayName
        displayName,
        startIndex: match.index,
        endIndex: match.index + match[0].length,
      });
    }

    return mentions;
  }

  /**
   * Extract hashtags from text
   */
  static extractHashtags(text: string): string[] {
    const hashtagRegex = /#(\w+)/g;
    const hashtags: string[] = [];
    let match;

    while ((match = hashtagRegex.exec(text)) !== null) {
      hashtags.push(match[1]);
    }

    return Array.from(new Set(hashtags)); // Remove duplicates
  }

  /**
   * Extract links from text
   */
  static extractLinks(text: string): Array<{
    url: string;
    startIndex: number;
    endIndex: number;
  }> {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const links: Array<{
      url: string;
      startIndex: number;
      endIndex: number;
    }> = [];
    let match;

    while ((match = urlRegex.exec(text)) !== null) {
      links.push({
        url: match[1],
        startIndex: match.index,
        endIndex: match.index + match[0].length,
      });
    }

    return links;
  }

  /**
   * Truncate text to specified length
   */
  static truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }

    return text.substring(0, maxLength - 3) + '...';
  }

  /**
   * Calculate thread level from thread path
   */
  static calculateThreadLevel(threadPath: string): number {
    return threadPath.split('/').length - 1;
  }

  /**
   * Generate thread path for reply
   */
  static generateThreadPath(parentThreadPath: string, postId: string): string {
    return `${parentThreadPath}/${postId}`;
  }

  /**
   * Sanitize and format text content
   */
  static sanitizeAndFormatContent(text: string): {
    sanitized: string;
    mentions: Array<{ userId: string; displayName: string; startIndex: number; endIndex: number }>;
    hashtags: string[];
    links: Array<{ url: string; startIndex: number; endIndex: number }>;
  } {
    // Basic sanitization (in production, use a proper library)
    const sanitized = text
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .trim();

    return {
      sanitized,
      mentions: this.extractMentions(sanitized),
      hashtags: this.extractHashtags(sanitized),
      links: this.extractLinks(sanitized),
    };
  }

  /**
   * Convert stance to display text
   */
  static stanceToDisplayText(stance: Stance): string {
    switch (stance) {
      case Stance.PROS:
        return '賛成';
      case Stance.CONS:
        return '反対';
      case Stance.NEUTRAL:
        return '中立';
      case Stance.UNKNOWN:
        return 'わからない';
      case Stance.HIDDEN:
        return '非表示';
      default:
        return 'わからない';
    }
  }

  /**
   * Convert user role to display text
   */
  static userRoleToDisplayText(role: UserRole): string {
    switch (role) {
      case UserRole.VIEWER:
        return '閲覧者';
      case UserRole.CONTRIBUTOR:
        return '投稿者';
      case UserRole.CREATOR:
        return '議論作成者';
      case UserRole.ADMIN:
        return '管理者';
      default:
        return '閲覧者';
    }
  }

  /**
   * Format date for display
   */
  static formatDateForDisplay(dateString: string, locale = 'ja-JP'): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) {
      return 'たった今';
    } else if (diffMinutes < 60) {
      return `${diffMinutes}分前`;
    } else if (diffHours < 24) {
      return `${diffHours}時間前`;
    } else if (diffDays < 7) {
      return `${diffDays}日前`;
    } else {
      return date.toLocaleDateString(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    }
  }
}
