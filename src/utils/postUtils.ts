import { Post, PostListItem } from '../types/post';

/**
 * Convert Post to PostListItem
 * This function handles the type conversion and adds missing properties
 */
export function convertPostToPostListItem(
  post: Post,
  discussionTitle: string,
  discussionPointTitle: string
): PostListItem {
  return {
    postId: post.postId,
    discussionId: post.discussionId,
    discussionTitle,
    discussionPointId: post.discussionPointId,
    discussionPointTitle,
    authorId: post.authorId,
    authorDisplayName: post.authorDisplayName,
    authorAvatar: undefined, // This would need to be fetched separately
    content: post.content,
    stance: post.stance,
    parentId: post.parentId,
    level: post.level,
    attachments: post.attachments,
    isActive: post.isActive,
    isEdited: post.isEdited,
    editedAt: post.editedAt,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    statistics: {
      replyCount: post.statistics.replyCount,
      likeCount: post.statistics.likeCount,
      agreeCount: post.statistics.agreeCount,
      disagreeCount: post.statistics.disagreeCount,
      insightfulCount: post.statistics.insightfulCount,
      funnyCount: post.statistics.funnyCount,
      viewCount: post.statistics.viewCount,
    },
    userReaction: undefined, // This would need to be fetched separately
    canEdit: false, // This would need to be determined based on user permissions
    canDelete: false, // This would need to be determined based on user permissions
    canReply: true, // Default to true, but should be determined based on discussion status
  };
}

/**
 * Convert multiple Posts to PostListItems
 */
export function convertPostsToPostListItems(
  posts: Post[],
  discussionTitle: string,
  discussionPointTitle: string
): PostListItem[] {
  return posts.map(post => convertPostToPostListItem(post, discussionTitle, discussionPointTitle));
}

/**
 * Create a PostListItem from minimal data (for real-time updates)
 */
export function createPostListItemFromMinimalData(
  postData: {
    postId: string;
    discussionId: string;
    discussionPointId: string;
    authorId: string;
    authorDisplayName: string;
    content: string;
    stance: any;
    createdAt: string;
    updatedAt: string;
    isEdited?: boolean;
    editedAt?: string;
    parentId?: string;
    level?: number;
  },
  discussionTitle: string,
  discussionPointTitle: string
): PostListItem {
  return {
    postId: postData.postId,
    discussionId: postData.discussionId,
    discussionTitle,
    discussionPointId: postData.discussionPointId,
    discussionPointTitle,
    authorId: postData.authorId,
    authorDisplayName: postData.authorDisplayName,
    authorAvatar: undefined,
    content: postData.content,
    stance: postData.stance,
    parentId: postData.parentId,
    level: postData.level || 0,
    attachments: [],
    isActive: true,
    isEdited: postData.isEdited || false,
    editedAt: postData.editedAt,
    createdAt: postData.createdAt,
    updatedAt: postData.updatedAt,
    statistics: {
      replyCount: 0,
      likeCount: 0,
      agreeCount: 0,
      disagreeCount: 0,
      insightfulCount: 0,
      funnyCount: 0,
      viewCount: 0,
    },
    userReaction: undefined,
    canEdit: false,
    canDelete: false,
    canReply: true,
  };
}
