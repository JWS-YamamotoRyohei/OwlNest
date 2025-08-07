import {
  UserProfile,
  CreateUserData,
  UserListItem,
} from '../types/User';
import {
  Discussion,
  DiscussionPoint,
  BackgroundKnowledge,
  CreateDiscussionData,
  DiscussionListItem,
} from '../types/discussion';
import {
  Post,
  PostReaction,
  CreatePostData,
  PostListItem,
} from '../types/post';
import {
  UserRole,
  Stance,
  DiscussionCategory,
  AccessControlType,
  ReactionType,
  EntityType,
} from '../types/common';
import { DynamoDBHelpers } from '../services/dynamodb';
import { DataTransformUtils } from './dataTransform';

/**
 * Factory functions for generating test data
 */
export class TestDataFactory {
  private static userCounter = 1;
  private static discussionCounter = 1;
  private static postCounter = 1;

  /**
   * Generate a random string
   */
  private static randomString(length: number): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Generate a random element from array
   */
  private static randomElement<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  /**
   * Generate a random number between min and max
   */
  private static randomNumber(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Generate a random date within the last N days
   */
  private static randomDate(daysAgo: number): string {
    const now = new Date();
    const pastDate = new Date(now.getTime() - (Math.random() * daysAgo * 24 * 60 * 60 * 1000));
    return pastDate.toISOString();
  }

  /**
   * Create test user data
   */
  static createTestUserData(overrides: Partial<CreateUserData> = {}): CreateUserData {
    const userId = this.userCounter++;
    return {
      email: `user${userId}@example.com`,
      displayName: `テストユーザー${userId}`,
      bio: `これはテストユーザー${userId}の自己紹介です。`,
      avatar: `https://example.com/avatars/user${userId}.jpg`,
      ...overrides,
    };
  }

  /**
   * Create test user profile
   */
  static createTestUserProfile(overrides: Partial<UserProfile> = {}): UserProfile {
    const userId = DynamoDBHelpers.generateId('user_');
    const userData = this.createTestUserData();
    const role = this.randomElement(Object.values(UserRole));
    
    const profile = DataTransformUtils.createUserDataToProfile(userData, userId, role);
    
    return {
      ...profile,
      statistics: {
        ...profile.statistics,
        discussionsCreated: this.randomNumber(0, 10),
        postsCreated: this.randomNumber(0, 50),
        reactionsGiven: this.randomNumber(0, 100),
        reactionsReceived: this.randomNumber(0, 80),
        followersCount: this.randomNumber(0, 20),
        followingCount: this.randomNumber(0, 30),
        reputationScore: this.randomNumber(0, 1000),
      },
      lastLoginAt: this.randomDate(30),
      loginCount: this.randomNumber(1, 100),
      ...overrides,
    };
  }

  /**
   * Create test user list item
   */
  static createTestUserListItem(overrides: Partial<UserListItem> = {}): UserListItem {
    const profile = this.createTestUserProfile();
    return {
      ...DataTransformUtils.userProfileToListItem(profile),
      ...overrides,
    };
  }

  /**
   * Create test discussion data
   */
  static createTestDiscussionData(overrides: Partial<CreateDiscussionData> = {}): CreateDiscussionData {
    const discussionId = this.discussionCounter++;
    const categories = [
      this.randomElement(Object.values(DiscussionCategory)),
      this.randomElement(Object.values(DiscussionCategory)),
    ];
    
    return {
      title: `テスト議論${discussionId}`,
      description: `これはテスト議論${discussionId}の説明です。この議論では重要なトピックについて話し合います。`,
      ownerStance: this.randomElement(Object.values(Stance)),
      categories: Array.from(new Set(categories)), // Remove duplicates
      points: [
        {
          title: `論点1: 基本的な考え方`,
          description: '基本的な考え方について議論します',
          order: 1,
        },
        {
          title: `論点2: 具体的な実装`,
          description: '具体的な実装方法について議論します',
          order: 2,
        },
        {
          title: `論点3: 将来の展望`,
          description: '将来の展望について議論します',
          order: 3,
        },
      ],
      backgroundKnowledge: [
        {
          type: 'text' as const,
          title: '前提知識1',
          content: 'この議論を理解するための前提知識です。',
          order: 1,
        },
        {
          type: 'url' as const,
          title: '参考リンク',
          content: 'https://example.com/reference',
          order: 2,
        },
      ],
      accessControl: {
        type: AccessControlType.OPEN,
        userIds: [],
      },
      tags: [`tag${discussionId}`, 'テスト', '議論'],
      ...overrides,
    };
  }

  /**
   * Create test discussion
   */
  static createTestDiscussion(overrides: Partial<Discussion> = {}): Discussion {
    const discussionId = DynamoDBHelpers.generateId('discussion_');
    const ownerId = DynamoDBHelpers.generateId('user_');
    const ownerDisplayName = `テストユーザー${this.randomNumber(1, 100)}`;
    const discussionData = this.createTestDiscussionData();
    
    const discussion = DataTransformUtils.createDiscussionDataToDiscussion(
      discussionData,
      discussionId,
      ownerId,
      ownerDisplayName
    );
    
    return {
      ...discussion,
      statistics: {
        ...discussion.statistics,
        viewCount: this.randomNumber(10, 1000),
        participantCount: this.randomNumber(1, 50),
        postCount: this.randomNumber(0, 200),
        reactionCount: this.randomNumber(0, 500),
        prosCount: this.randomNumber(0, 100),
        consCount: this.randomNumber(0, 100),
        neutralCount: this.randomNumber(0, 50),
        unknownCount: this.randomNumber(0, 30),
        followersCount: this.randomNumber(0, 20),
        uniqueParticipants: this.randomNumber(1, 30),
        lastActivityAt: this.randomDate(7),
      },
      createdAt: this.randomDate(30),
      updatedAt: this.randomDate(7),
      ...overrides,
    };
  }

  /**
   * Create test discussion point
   */
  static createTestDiscussionPoint(
    discussionId: string,
    overrides: Partial<DiscussionPoint> = {}
  ): DiscussionPoint {
    const pointId = DynamoDBHelpers.generateId('point_');
    const order = this.randomNumber(1, 10);
    
    return {
      PK: `DISCUSSION#${discussionId}`,
      SK: `POINT#${pointId}`,
      GSI1PK: `DISCUSSION#${discussionId}`,
      GSI1SK: `POINT#${order.toString().padStart(3, '0')}`,
      EntityType: EntityType.DISCUSSION_POINT,
      
      pointId,
      discussionId,
      title: `テスト論点${order}`,
      description: `これはテスト論点${order}の説明です。`,
      level: 0,
      order,
      
      postCount: this.randomNumber(0, 50),
      prosCount: this.randomNumber(0, 20),
      consCount: this.randomNumber(0, 20),
      neutralCount: this.randomNumber(0, 10),
      
      isActive: true,
      
      createdAt: this.randomDate(30),
      updatedAt: this.randomDate(7),
      ...overrides,
    };
  }

  /**
   * Create test background knowledge
   */
  static createTestBackgroundKnowledge(
    discussionId: string,
    overrides: Partial<BackgroundKnowledge> = {}
  ): BackgroundKnowledge {
    const knowledgeId = DynamoDBHelpers.generateId('knowledge_');
    const order = this.randomNumber(1, 5);
    
    return {
      PK: `DISCUSSION#${discussionId}`,
      SK: `KNOWLEDGE#${knowledgeId}`,
      EntityType: EntityType.BACKGROUND_KNOWLEDGE,
      
      knowledgeId,
      discussionId,
      type: this.randomElement(['text', 'url'] as const),
      title: `前提知識${order}`,
      content: `これは前提知識${order}の内容です。`,
      order,
      
      createdAt: this.randomDate(30),
      updatedAt: this.randomDate(7),
      ...overrides,
    };
  }

  /**
   * Create test discussion list item
   */
  static createTestDiscussionListItem(overrides: Partial<DiscussionListItem> = {}): DiscussionListItem {
    const discussion = this.createTestDiscussion();
    return {
      ...DataTransformUtils.discussionToListItem(discussion),
      ...overrides,
    };
  }

  /**
   * Create test post data
   */
  static createTestPostData(
    discussionId: string,
    discussionPointId: string,
    overrides: Partial<CreatePostData> = {}
  ): CreatePostData {
    const postId = this.postCounter++;
    const stances = Object.values(Stance).filter(s => s !== Stance.HIDDEN);
    
    return {
      discussionId,
      discussionPointId,
      content: {
        text: `これはテスト投稿${postId}の内容です。この投稿では重要なポイントについて述べています。詳細な説明や具体例も含まれています。`,
        formatting: {
          bold: Math.random() > 0.5,
          fontSize: this.randomElement(['small', 'medium', 'large'] as const),
        },
        attachments: Math.random() > 0.7 ? [{
          id: DynamoDBHelpers.generateId('file_'),
          url: `https://example.com/files/attachment${postId}.jpg`,
          filename: `attachment${postId}.jpg`,
          contentType: 'image/jpeg',
          size: this.randomNumber(1000, 1000000),
          uploadedAt: this.randomDate(1),
        }] : [],
      },
      stance: this.randomElement(stances),
      mentions: Math.random() > 0.8 ? [DynamoDBHelpers.generateId('user_')] : [],
      ...overrides,
    };
  }

  /**
   * Create test post
   */
  static createTestPost(
    discussionId: string,
    discussionPointId: string,
    overrides: Partial<Post> = {}
  ): Post {
    const postId = DynamoDBHelpers.generateId('post_');
    const authorId = DynamoDBHelpers.generateId('user_');
    const authorDisplayName = `テストユーザー${this.randomNumber(1, 100)}`;
    const postData = this.createTestPostData(discussionId, discussionPointId);
    
    const post = DataTransformUtils.createPostDataToPost(
      postData,
      postId,
      authorId,
      authorDisplayName
    );
    
    return {
      ...post,
      reactions: {
        like: this.randomNumber(0, 20),
        agree: this.randomNumber(0, 15),
        disagree: this.randomNumber(0, 10),
        insightful: this.randomNumber(0, 8),
        funny: this.randomNumber(0, 5),
        totalCount: 0, // Will be calculated
      },
      replyCount: this.randomNumber(0, 10),
      createdAt: this.randomDate(30),
      updatedAt: this.randomDate(7),
      ...overrides,
    };
  }

  /**
   * Create test post reaction
   */
  static createTestPostReaction(
    postId: string,
    userId: string,
    overrides: Partial<PostReaction> = {}
  ): PostReaction {
    return {
      PK: `POST#${postId}`,
      SK: `REACTION#${userId}`,
      EntityType: EntityType.POST_REACTION,
      
      postId,
      userId,
      reactionType: this.randomElement(Object.values(ReactionType)),
      discussionId: DynamoDBHelpers.generateId('discussion_'),
      authorId: DynamoDBHelpers.generateId('user_'),
      
      createdAt: this.randomDate(30),
      updatedAt: this.randomDate(7),
      ...overrides,
    };
  }

  /**
   * Create test post list item
   */
  static createTestPostListItem(overrides: Partial<PostListItem> = {}): PostListItem {
    const discussionId = DynamoDBHelpers.generateId('discussion_');
    const discussionPointId = DynamoDBHelpers.generateId('point_');
    const post = this.createTestPost(discussionId, discussionPointId);
    
    return {
      ...DataTransformUtils.postToListItem(
        post,
        `テスト議論${this.randomNumber(1, 100)}`,
        `テスト論点${this.randomNumber(1, 10)}`,
        `https://example.com/avatars/user${this.randomNumber(1, 100)}.jpg`
      ),
      ...overrides,
    };
  }

  /**
   * Create multiple test users
   */
  static createTestUsers(count: number): UserProfile[] {
    return Array.from({ length: count }, () => this.createTestUserProfile());
  }

  /**
   * Create multiple test discussions
   */
  static createTestDiscussions(count: number): Discussion[] {
    return Array.from({ length: count }, () => this.createTestDiscussion());
  }

  /**
   * Create multiple test posts for a discussion
   */
  static createTestPostsForDiscussion(
    discussionId: string,
    discussionPointIds: string[],
    count: number
  ): Post[] {
    return Array.from({ length: count }, () => {
      const pointId = this.randomElement(discussionPointIds);
      return this.createTestPost(discussionId, pointId);
    });
  }

  /**
   * Create a complete test discussion with points and posts
   */
  static createCompleteTestDiscussion(): {
    discussion: Discussion;
    points: DiscussionPoint[];
    backgroundKnowledge: BackgroundKnowledge[];
    posts: Post[];
  } {
    const discussion = this.createTestDiscussion();
    const points = Array.from({ length: 3 }, () => 
      this.createTestDiscussionPoint(discussion.discussionId)
    );
    const backgroundKnowledge = Array.from({ length: 2 }, () =>
      this.createTestBackgroundKnowledge(discussion.discussionId)
    );
    const posts = this.createTestPostsForDiscussion(
      discussion.discussionId,
      points.map(p => p.pointId),
      10
    );

    return {
      discussion,
      points,
      backgroundKnowledge,
      posts,
    };
  }

  /**
   * Create test data for a user's activity
   */
  static createTestUserActivity(userId: string): {
    discussions: Discussion[];
    posts: Post[];
  } {
    const discussions = Array.from({ length: 3 }, () =>
      this.createTestDiscussion({ ownerId: userId })
    );
    
    const posts = Array.from({ length: 10 }, () => {
      const discussion = this.randomElement(discussions);
      const pointId = DynamoDBHelpers.generateId('point_');
      return this.createTestPost(discussion.discussionId, pointId, { authorId: userId });
    });

    return {
      discussions,
      posts,
    };
  }

  /**
   * Create discussion points for demo
   */
  static createDiscussionPoints(count: number, discussionId = 'demo-discussion'): DiscussionPoint[] {
    return Array.from({ length: count }, (_, index) => 
      this.createTestDiscussionPoint(discussionId, {
        title: `論点${index + 1}: ${this.randomElement([
          '基本的な考え方について',
          '具体的な実装方法',
          '技術的な課題',
          '将来の展望',
          'ユーザビリティの観点',
          'セキュリティの考慮',
          'パフォーマンスの最適化',
          'コストと効果',
          '運用・保守性',
          '法的・倫理的な問題'
        ])}`,
        order: index + 1,
      })
    );
  }

  /**
   * Create posts for demo
   */
  static createPosts(
    count: number, 
    options: {
      discussionId: string;
      discussionPoints: DiscussionPoint[];
    }
  ): PostListItem[] {
    const { discussionId, discussionPoints } = options;
    
    return Array.from({ length: count }, (_, index) => {
      const point = this.randomElement(discussionPoints);
      const authorId = `user_${this.randomNumber(1, 10)}`;
      const authorDisplayName = `ユーザー${this.randomNumber(1, 10)}`;
      
      // Create some replies
      const isReply = Math.random() > 0.7;
      const replyToId = isReply ? `post_${this.randomNumber(1, Math.max(1, index))}` : undefined;
      const threadLevel = isReply ? this.randomNumber(1, 3) : 0;
      
      return {
        postId: `post_${index + 1}`,
        discussionId,
        discussionTitle: 'デモ議論',
        discussionPointId: point.pointId,
        discussionPointTitle: point.title,
        authorId,
        authorDisplayName,
        authorAvatar: `https://example.com/avatars/${authorId}.jpg`,
        content: {
          text: this.generateRandomPostContent(),
          preview: this.generateRandomPostContent().substring(0, 100) + '...',
          hasAttachments: Math.random() > 0.8,
          hasLinks: Math.random() > 0.9,
          attachmentCount: Math.random() > 0.8 ? this.randomNumber(1, 3) : 0,
        },
        stance: this.randomElement(Object.values(Stance).filter(s => s !== Stance.HIDDEN)),
        replyToId,
        threadLevel,
        reactions: {
          [ReactionType.LIKE]: this.randomNumber(0, 15),
          [ReactionType.AGREE]: this.randomNumber(0, 10),
          [ReactionType.DISAGREE]: this.randomNumber(0, 8),
          [ReactionType.INSIGHTFUL]: this.randomNumber(0, 5),
          [ReactionType.FUNNY]: this.randomNumber(0, 3),
          totalCount: 0, // Will be calculated below
          userReaction: Math.random() > 0.7 ? this.randomElement(Object.values(ReactionType)) : undefined,
        },
        replyCount: this.randomNumber(0, 8),
        createdAt: this.randomDate(30),
        updatedAt: this.randomDate(7),
        isEdited: Math.random() > 0.8,
        canEdit: authorId === 'user_1', // Simulate current user
        canDelete: authorId === 'user_1' || Math.random() > 0.9, // Owner or admin
        canReact: true,
        canReply: true,
      };
    }).map(post => {
      // Calculate total reactions
      post.reactions.totalCount = Object.values(post.reactions)
        .filter((value): value is number => typeof value === 'number')
        .reduce((sum, count) => sum + count, 0);
      return post;
    });
  }

  /**
   * Create a single post
   */
  
  static createPost(data: {
    discussionId: string;
    discussionPointId: string;
    content: {
      text: string;
      formatting?: any;
      attachments?: any[];
    };
    stance: Stance;
    replyToId?: string;
  }): PostListItem {
    const postId = `post_${Date.now()}_${this.randomString(6)}`;
    const authorId = 'user_1';
    const authorDisplayName = '現在のユーザー';
    const createdAt = new Date().toISOString();
  
    const attachmentCount = data.content.attachments?.length || 0;
  
    return {
      postId,
      discussionId: data.discussionId,
      discussionTitle: 'デモ議論',
      discussionPointId: data.discussionPointId,
      discussionPointTitle: '選択された論点',
      authorId,
      authorDisplayName,
      authorAvatar: `https://example.com/avatars/${authorId}.jpg`,
      content: {
        text: data.content.text,
        preview: data.content.text.substring(0, 100) + (data.content.text.length > 100 ? '...' : ''),
        hasAttachments: attachmentCount > 0 ? 1 : 0,
        hasLinks: data.content.text.includes('http') ? 1 : 0,
        attachmentCount,
      },
      stance: data.stance,
      parentId: data.replyToId,
      level: data.replyToId ? 1 : 0,
      attachments: data.content.attachments || [],
      isActive: true,
      isEdited: false,
      createdAt,
      updatedAt: createdAt,
      replyCount: 0,
      statistics: {
        replyCount: 0,
        likeCount: 0,
        agreeCount: 0,
        disagreeCount: 0,
        insightfulCount: 0,
        funnyCount: 0,
        viewCount: 0,
      },
      editedAt: undefined,
      userReaction: undefined,
      canEdit: true,
      canDelete: true,
      canReply: true,
      canReact: true,
    };
  }
  

  /**
   * Generate random post content
   */
  private static generateRandomPostContent(): string {
    const templates = [
      'この点について私は{stance}です。理由として、{reason}が挙げられます。具体的には{example}という事例があります。',
      '{topic}に関して、{opinion}と考えています。これは{evidence}に基づいています。',
      '私の経験から言うと、{experience}です。そのため、{conclusion}という結論に至りました。',
      '{question}という疑問があります。{analysis}を考慮すると、{answer}が適切だと思います。',
      '他の方の意見も参考になりますが、{perspective}という観点から見ると{viewpoint}です。',
    ];

    const stances = ['賛成', '反対', '中立的', '慎重'];
    const reasons = [
      '技術的な実現可能性',
      'コストパフォーマンス',
      'ユーザビリティの向上',
      'セキュリティの観点',
      '将来的な拡張性',
      '運用・保守の容易さ'
    ];
    const examples = [
      '他社での成功事例',
      '過去のプロジェクトでの経験',
      '業界のベストプラクティス',
      '最新の技術動向',
      'ユーザーからのフィードバック'
    ];
    const topics = [
      'この機能',
      'この提案',
      'この実装方法',
      'このアプローチ',
      'この技術選択'
    ];
    const opinions = [
      '非常に有効',
      '慎重に検討すべき',
      '改善の余地がある',
      '実現可能',
      '課題が多い'
    ];

    const template = this.randomElement(templates);
    return template
      .replace('{stance}', this.randomElement(stances))
      .replace('{reason}', this.randomElement(reasons))
      .replace('{example}', this.randomElement(examples))
      .replace('{topic}', this.randomElement(topics))
      .replace('{opinion}', this.randomElement(opinions))
      .replace('{evidence}', this.randomElement(reasons))
      .replace('{experience}', this.randomElement(examples))
      .replace('{conclusion}', this.randomElement(opinions))
      .replace('{question}', 'どのような方法が最適か')
      .replace('{analysis}', this.randomElement(reasons))
      .replace('{answer}', this.randomElement(opinions))
      .replace('{perspective}', this.randomElement(reasons))
      .replace('{viewpoint}', this.randomElement(opinions));
  }

  /**
   * Reset counters (useful for testing)
   */
  static resetCounters(): void {
    this.userCounter = 1;
    this.discussionCounter = 1;
    this.postCounter = 1;
  }
}

/**
 * Generate mock discussion points for demo purposes
 */
export function generateMockDiscussionPoints(discussionId: string): DiscussionPoint[] {
  return [
    {
      PK: `DISCUSSION#${discussionId}`,
      SK: 'POINT#point_1',
      GSI1PK: `DISCUSSION#${discussionId}`,
      GSI1SK: 'POINT#001',
      EntityType: EntityType.DISCUSSION_POINT,
      pointId: 'point_1',
      discussionId,
      title: '基本的な考え方について',
      description: 'この議論の基本的な考え方や前提について話し合います',
      level: 0,
      order: 1,
      postCount: 15,
      prosCount: 8,
      consCount: 5,
      neutralCount: 2,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      PK: `DISCUSSION#${discussionId}`,
      SK: 'POINT#point_2',
      GSI1PK: `DISCUSSION#${discussionId}`,
      GSI1SK: 'POINT#002',
      EntityType: EntityType.DISCUSSION_POINT,
      pointId: 'point_2',
      discussionId,
      title: '具体的な実装方法',
      description: '実際にどのように実装するかの具体的な方法について',
      level: 0,
      order: 2,
      postCount: 23,
      prosCount: 12,
      consCount: 8,
      neutralCount: 3,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      PK: `DISCUSSION#${discussionId}`,
      SK: 'POINT#point_2_1',
      GSI1PK: `DISCUSSION#${discussionId}`,
      GSI1SK: 'POINT#003',
      EntityType: EntityType.DISCUSSION_POINT,
      pointId: 'point_2_1',
      discussionId,
      title: 'フロントエンドの実装',
      description: 'フロントエンド部分の具体的な実装について',
      parentId: 'point_2',
      level: 1,
      order: 3,
      postCount: 12,
      prosCount: 7,
      consCount: 3,
      neutralCount: 2,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      PK: `DISCUSSION#${discussionId}`,
      SK: 'POINT#point_2_2',
      GSI1PK: `DISCUSSION#${discussionId}`,
      GSI1SK: 'POINT#004',
      EntityType: EntityType.DISCUSSION_POINT,
      pointId: 'point_2_2',
      discussionId,
      title: 'バックエンドの実装',
      description: 'バックエンド部分の具体的な実装について',
      parentId: 'point_2',
      level: 1,
      order: 4,
      postCount: 18,
      prosCount: 10,
      consCount: 6,
      neutralCount: 2,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      PK: `DISCUSSION#${discussionId}`,
      SK: 'POINT#point_3',
      GSI1PK: `DISCUSSION#${discussionId}`,
      GSI1SK: 'POINT#005',
      EntityType: EntityType.DISCUSSION_POINT,
      pointId: 'point_3',
      discussionId,
      title: '将来の展望と課題',
      description: '今後の発展可能性や解決すべき課題について',
      level: 0,
      order: 5,
      postCount: 9,
      prosCount: 4,
      consCount: 3,
      neutralCount: 2,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
}