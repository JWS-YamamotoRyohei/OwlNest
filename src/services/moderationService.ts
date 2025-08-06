import { apiService } from './api';

export interface ModerationAction {
  id: string;
  postId: string;
  action: 'hide' | 'show' | 'delete' | 'restore' | 'flag' | 'unflag';
  moderatorId: string;
  moderatorName: string;
  reason: string;
  timestamp: string;
  details?: any;
}

export interface ModerationLog {
  postId: string;
  actions: ModerationAction[];
  totalActions: number;
  lastActionAt: string;
}

export interface ModerationStats {
  totalActions: number;
  actionsByType: Record<string, number>;
  actionsByModerator: Record<string, number>;
  recentActions: ModerationAction[];
}

export class ModerationService {
  /**
   * Hide a post
   */
  async hidePost(postId: string, reason: string): Promise<void> {
    try {
      await apiService.post(`/moderation/posts/${postId}/hide`, {
        reason,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      throw new Error(`Failed to hide post: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Show a hidden post
   */
  async showPost(postId: string): Promise<void> {
    try {
      await apiService.post(`/moderation/posts/${postId}/show`, {
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      throw new Error(`Failed to show post: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete a post
   */
  async deletePost(postId: string, reason: string): Promise<void> {
    try {
      await apiService.delete(`/moderation/posts/${postId}?reason=${encodeURIComponent(reason)}`);
    } catch (error) {
      throw new Error(`Failed to delete post: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Restore a deleted post
   */
  async restorePost(postId: string): Promise<void> {
    try {
      await apiService.post(`/moderation/posts/${postId}/restore`, {
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      throw new Error(`Failed to restore post: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Flag a post
   */
  async flagPost(postId: string, reason: string): Promise<void> {
    try {
      await apiService.post(`/moderation/posts/${postId}/flag`, {
        reason,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      throw new Error(`Failed to flag post: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Unflag a post
   */
  async unflagPost(postId: string): Promise<void> {
    try {
      await apiService.post(`/moderation/posts/${postId}/unflag`, {
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      throw new Error(`Failed to unflag post: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get moderation history for a post
   */
  async getModerationHistory(postId: string): Promise<ModerationAction[]> {
    try {
      const response = await apiService.get(`/moderation/posts/${postId}/history`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get moderation history: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get moderation log for multiple posts
   */
  async getModerationLogs(postIds: string[]): Promise<ModerationLog[]> {
    try {
      const response = await apiService.post('/moderation/posts/logs', {
        postIds,
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get moderation logs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get moderation statistics
   */
  async getModerationStats(filters?: {
    startDate?: string;
    endDate?: string;
    moderatorId?: string;
    discussionId?: string;
  }): Promise<ModerationStats> {
    try {
      const response = await apiService.get('/moderation/stats', {
        params: filters,
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get moderation stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Bulk moderation action
   */
  async bulkModerationAction(
    postIds: string[],
    action: 'hide' | 'show' | 'delete' | 'restore' | 'flag' | 'unflag',
    reason?: string
  ): Promise<void> {
    try {
      await apiService.post('/moderation/posts/bulk', {
        postIds,
        action,
        reason,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      throw new Error(`Failed to perform bulk moderation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get posts pending moderation
   */
  async getPendingModerationPosts(filters?: {
    discussionId?: string;
    reportedOnly?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{
    posts: any[];
    totalCount: number;
    hasMore: boolean;
  }> {
    try {
      const response = await apiService.get('/moderation/posts/pending', {
        params: filters,
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get pending posts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Report a post
   */
  async reportPost(
    postId: string,
    reason: string,
    category: 'spam' | 'harassment' | 'inappropriate' | 'misinformation' | 'other',
    description?: string
  ): Promise<void> {
    try {
      await apiService.post(`/moderation/posts/${postId}/report`, {
        reason,
        category,
        description,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      throw new Error(`Failed to report post: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get user moderation history
   */
  async getUserModerationHistory(userId: string, limit = 50): Promise<ModerationAction[]> {
    try {
      const response = await apiService.get(`/moderation/users/${userId}/history`, {
        params: { limit },
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get user moderation history: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get discussion moderation summary
   */
  async getDiscussionModerationSummary(discussionId: string): Promise<{
    totalPosts: number;
    hiddenPosts: number;
    deletedPosts: number;
    flaggedPosts: number;
    reportedPosts: number;
    moderationActions: number;
    lastModerationAt?: string;
  }> {
    try {
      const response = await apiService.get(`/moderation/discussions/${discussionId}/summary`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get discussion moderation summary: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Export moderation data
   */
  async exportModerationData(filters?: {
    startDate?: string;
    endDate?: string;
    discussionId?: string;
    moderatorId?: string;
    format?: 'csv' | 'json';
  }): Promise<Blob> {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_GATEWAY_URL}/moderation/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('owlnest_auth_token')}`,
        },
        body: JSON.stringify(filters),
      });

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }

      return await response.blob();
    } catch (error) {
      throw new Error(`Failed to export moderation data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const moderationService = new ModerationService();