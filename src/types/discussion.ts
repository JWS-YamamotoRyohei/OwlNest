// Discussion and post related types

export type Stance = 'pros' | 'cons' | 'neutral' | 'unknown' | 'hidden';

export interface DiscussionPoint {
  id: string;
  title: string;
  description?: string;
  parentId?: string;
  level: number;
  order: number;
}

export interface BackgroundKnowledge {
  id: string;
  type: 'text' | 'file' | 'url';
  content: string;
  title?: string;
  order: number;
}

export interface AccessControl {
  type: 'blacklist' | 'whitelist' | 'open';
  userIds: string[];
}

export interface Discussion {
  id: string;
  title: string;
  description: string;
  ownerId: string;
  ownerStance: Stance;
  categories: string[];
  discussionPoints: DiscussionPoint[];
  backgroundKnowledge: BackgroundKnowledge[];
  accessControl: AccessControl;
  metadata: {
    createdAt: string;
    updatedAt: string;
    participantCount: number;
    postCount: number;
    isActive: boolean;
  };
}

export interface TextFormatting {
  bold?: boolean;
  fontSize?: 'small' | 'medium' | 'large';
}

export interface PostContent {
  text: string;
  formatting: TextFormatting;
  attachments: string[]; // S3 URLs
}

export interface PostModeration {
  isHidden: boolean;
  hiddenBy?: string;
  hiddenAt?: string;
  hiddenReason?: string;
  isDeleted: boolean;
  deletedBy?: string;
  deletedAt?: string;
}

export interface Post {
  id: string;
  discussionId: string;
  discussionPointId: string;
  authorId: string;
  content: PostContent;
  stance: Stance;
  replyToId?: string;
  reactions: Record<string, ReactionType>;
  moderation: PostModeration;
  metadata: {
    createdAt: string;
    updatedAt: string;
    isEdited: boolean;
  };
}

export type ReactionType = 'like' | 'agree' | 'disagree' | 'insightful';

export interface PostReaction {
  postId: string;
  userId: string;
  reactionType: ReactionType;
  createdAt: string;
}

export interface CreateDiscussionData {
  title: string;
  description: string;
  ownerStance: Stance;
  categories: string[];
  discussionPoints: Omit<DiscussionPoint, 'id'>[];
  backgroundKnowledge?: Omit<BackgroundKnowledge, 'id'>[];
  accessControl?: AccessControl;
}

export interface UpdateDiscussionData {
  title?: string;
  description?: string;
  ownerStance?: Stance;
  categories?: string[];
  discussionPoints?: DiscussionPoint[];
  backgroundKnowledge?: BackgroundKnowledge[];
  accessControl?: AccessControl;
}

export interface CreatePostData {
  discussionId: string;
  discussionPointId: string;
  content: PostContent;
  stance: Stance;
  replyToId?: string;
}

export interface UpdatePostData {
  content?: PostContent;
  stance?: Stance;
}

export interface DiscussionFilters {
  categories?: string[];
  ownerId?: string;
  isActive?: boolean;
  search?: string;
}

export interface PostFilters {
  discussionPointId?: string;
  authorId?: string;
  stance?: Stance;
  hasAttachments?: boolean;
}

export type PostSortOption = 'createdAt' | 'reactions' | 'replies';

export interface DiscussionContextType {
  discussions: Discussion[];
  currentDiscussion: Discussion | null;
  createDiscussion: (data: CreateDiscussionData) => Promise<Discussion>;
  updateDiscussion: (id: string, data: UpdateDiscussionData) => Promise<void>;
  deleteDiscussion: (id: string) => Promise<void>;
  loadDiscussion: (id: string) => Promise<void>;
  filterDiscussions: (filters: DiscussionFilters) => Discussion[];
}

export interface PostContextType {
  posts: Post[];
  createPost: (data: CreatePostData) => Promise<Post>;
  updatePost: (id: string, data: UpdatePostData) => Promise<void>;
  deletePost: (id: string) => Promise<void>;
  filterPosts: (filters: PostFilters) => Post[];
  sortPosts: (sortBy: PostSortOption) => Post[];
}