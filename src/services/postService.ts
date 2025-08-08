import { apiService, ApiResponse } from './api';
import { getWebSocketService } from './websocketService';
import { Post, CreatePostData, UpdatePostData, PostFilters, PostSortOptions } from '../types/post';

export interface PostsResponse {
  posts: Post[];
  totalCount: number;
  hasMore: boolean;
  nextToken?: string;
}

export class PostService {
  private websocketService = getWebSocketService();

  // Create a new post
  async createPost(data: CreatePostData): Promise<Post> {
    try {
      const response: ApiResponse<Post> = await apiService.post('/posts', data);

      if (response.success && response.data) {
        // Broadcast the new post via WebSocket
        this.broadcastNewPost(response.data);
        return response.data;
      }

      throw new Error(response.message || 'Failed to create post');
    } catch (error) {
      console.error('Error creating post:', error);
      throw error;
    }
  }

  // Update an existing post
  async updatePost(postId: string, data: UpdatePostData): Promise<Post> {
    try {
      const response: ApiResponse<Post> = await apiService.put(`/posts/${postId}`, data);

      if (response.success && response.data) {
        // Broadcast the updated post via WebSocket
        this.broadcastPostUpdate(response.data);
        return response.data;
      }

      throw new Error(response.message || 'Failed to update post');
    } catch (error) {
      console.error('Error updating post:', error);
      throw error;
    }
  }

  // Delete a post
  async deletePost(postId: string): Promise<void> {
    try {
      const response: ApiResponse<{ postId: string; discussionId: string }> =
        await apiService.delete(`/posts/${postId}`);

      if (response.success && response.data) {
        // Broadcast the post deletion via WebSocket
        this.broadcastPostDeletion(response.data.postId, response.data.discussionId);
      } else {
        throw new Error(response.message || 'Failed to delete post');
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      throw error;
    }
  }

  // Get posts for a discussion
  async getDiscussionPosts(
    discussionId: string,
    filters?: PostFilters,
    sortBy?: PostSortOptions,
    limit?: number,
    nextToken?: string
  ): Promise<PostsResponse> {
    try {
      const params = new URLSearchParams();
      if (filters?.discussionPointId) params.append('pointId', filters.discussionPointId);
      // if (filters?.pointId) params.append('pointId', filters.pointId);
      if (filters?.authorId) params.append('authorId', filters.authorId);
      if (filters?.stance) params.append('stance', filters.stance);
      if (filters?.hasAttachments !== undefined) {
        params.append('hasAttachments', filters.hasAttachments.toString());
      }
      // if (sortBy) params.append('sortBy', sortBy);
      if (sortBy) {
        params.append('sortField', sortBy.field);
        params.append('sortDirection', sortBy.direction);
      }
      if (limit) params.append('limit', limit.toString());
      if (nextToken) params.append('nextToken', nextToken);

      const queryString = params.toString();
      const endpoint = `/discussions/${discussionId}/posts${queryString ? `?${queryString}` : ''}`;

      const response: ApiResponse<PostsResponse> = await apiService.get(endpoint);

      if (response.success && response.data) {
        return response.data;
      }

      throw new Error(response.message || 'Failed to fetch posts');
    } catch (error) {
      console.error('Error fetching discussion posts:', error);
      throw error;
    }
  }

  // Get a single post
  async getPost(postId: string): Promise<Post> {
    try {
      const response: ApiResponse<Post> = await apiService.get(`/posts/${postId}`);

      if (response.success && response.data) {
        return response.data;
      }

      throw new Error(response.message || 'Failed to fetch post');
    } catch (error) {
      console.error('Error fetching post:', error);
      throw error;
    }
  }

  // Get posts by user
  async getUserPosts(userId: string, limit?: number, nextToken?: string): Promise<PostsResponse> {
    try {
      const params = new URLSearchParams();
      if (limit) params.append('limit', limit.toString());
      if (nextToken) params.append('nextToken', nextToken);

      const queryString = params.toString();
      const endpoint = `/users/${userId}/posts${queryString ? `?${queryString}` : ''}`;

      const response: ApiResponse<PostsResponse> = await apiService.get(endpoint);

      if (response.success && response.data) {
        return response.data;
      }

      throw new Error(response.message || 'Failed to fetch user posts');
    } catch (error) {
      console.error('Error fetching user posts:', error);
      throw error;
    }
  }

  // React to a post (like, agree, disagree, etc.)
  async reactToPost(postId: string, reactionType: string): Promise<void> {
    try {
      const response: ApiResponse<{ post: Post; reactionData: any }> = await apiService.post(
        `/posts/${postId}/reactions`,
        {
          reactionType,
        }
      );

      if (response.success && response.data) {
        // Broadcast the reaction change via WebSocket
        this.broadcastPostReaction(
          postId,
          response.data.post.discussionId,
          response.data.reactionData
        );
      } else {
        throw new Error(response.message || 'Failed to react to post');
      }
    } catch (error) {
      console.error('Error reacting to post:', error);
      throw error;
    }
  }

  // Remove reaction from a post
  async removeReaction(postId: string): Promise<void> {
    try {
      const response: ApiResponse<{ post: Post; reactionData: any }> = await apiService.delete(
        `/posts/${postId}/reactions`
      );

      if (response.success && response.data) {
        // Broadcast the reaction change via WebSocket
        this.broadcastPostReaction(
          postId,
          response.data.post.discussionId,
          response.data.reactionData
        );
      } else {
        throw new Error(response.message || 'Failed to remove reaction');
      }
    } catch (error) {
      console.error('Error removing reaction:', error);
      throw error;
    }
  }

  // Report a post
  async reportPost(postId: string, reason: string, details?: string): Promise<void> {
    try {
      const response: ApiResponse<void> = await apiService.post(`/posts/${postId}/reports`, {
        reason,
        details,
      });

      if (!response.success) {
        throw new Error(response.message || 'Failed to report post');
      }
    } catch (error) {
      console.error('Error reporting post:', error);
      throw error;
    }
  }

  // Hide/unhide a post (for discussion owners)
  async togglePostVisibility(postId: string, isHidden: boolean, reason?: string): Promise<void> {
    try {
      const response: ApiResponse<{ post: Post }> = await apiService.put(
        `/posts/${postId}/visibility`,
        {
          isHidden,
          reason,
        }
      );

      if (response.success && response.data) {
        // Broadcast the visibility change via WebSocket
        this.broadcastPostVisibilityChange(
          postId,
          response.data.post.discussionId,
          isHidden,
          reason
        );
      } else {
        throw new Error(response.message || 'Failed to toggle post visibility');
      }
    } catch (error) {
      console.error('Error toggling post visibility:', error);
      throw error;
    }
  }

  // Private methods for WebSocket broadcasting
  private broadcastNewPost(post: Post): void {
    if (this.websocketService.isConnected()) {
      this.websocketService.broadcastPost(post.discussionId, {
        type: 'new_post',
        post,
        timestamp: new Date().toISOString(),
        metadata: {
          action: 'create',
          discussionId: post.discussionId,
          discussionPointId: post.discussionPointId,
          authorId: post.authorId,
        },
      });
    }
  }

  private broadcastPostUpdate(post: Post): void {
    if (this.websocketService.isConnected()) {
      this.websocketService.broadcastPost(post.discussionId, {
        type: 'post_updated',
        post,
        timestamp: new Date().toISOString(),
        metadata: {
          action: 'update',
          discussionId: post.discussionId,
          discussionPointId: post.discussionPointId,
          authorId: post.authorId,
        },
      });
    }
  }

  private broadcastPostDeletion(postId: string, discussionId: string): void {
    if (this.websocketService.isConnected()) {
      this.websocketService.broadcastPost(discussionId, {
        type: 'post_deleted',
        postId,
        discussionId,
        timestamp: new Date().toISOString(),
        metadata: {
          action: 'delete',
          discussionId,
        },
      });
    }
  }

  // Broadcast post reaction changes
  private broadcastPostReaction(postId: string, discussionId: string, reactionData: any): void {
    if (this.websocketService.isConnected()) {
      this.websocketService.broadcastPost(discussionId, {
        type: 'post_reaction_changed',
        postId,
        discussionId,
        reactionData,
        timestamp: new Date().toISOString(),
        metadata: {
          action: 'reaction',
          discussionId,
        },
      });
    }
  }

  // Broadcast post visibility changes
  private broadcastPostVisibilityChange(
    postId: string,
    discussionId: string,
    isHidden: boolean,
    reason?: string
  ): void {
    if (this.websocketService.isConnected()) {
      this.websocketService.broadcastPost(discussionId, {
        type: 'post_visibility_changed',
        postId,
        discussionId,
        isHidden,
        reason,
        timestamp: new Date().toISOString(),
        metadata: {
          action: 'visibility_change',
          discussionId,
        },
      });
    }
  }
}

// Singleton instance
export const postService = new PostService();
export default postService;
