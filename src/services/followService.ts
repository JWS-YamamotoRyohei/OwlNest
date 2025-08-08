import {
  Follow,
  FollowTargetType,
  CreateFollowData,
  UpdateFollowData,
  FollowListItem,
  FollowStatistics,
  FollowSuggestion,
  BulkFollowOperation,
  FollowActivitySummary,
  FollowExportData,
  TimelineItem,
  TimelineQueryOptions,
  TimelineFilters,
  PaginationResult,
} from '../types';
import { apiService, ApiResponse } from './api';

/**
 * Follow service for managing user and discussion follows
 */
class FollowService {
  private readonly baseUrl = '/follow';

  /**
   * Follow a user or discussion
   */
  async follow(data: CreateFollowData): Promise<ApiResponse<Follow>> {
    return apiService.post(`${this.baseUrl}`, data);
  }

  /**
   * Unfollow a user or discussion
   */
  async unfollow(targetType: FollowTargetType, targetId: string): Promise<ApiResponse<void>> {
    return apiService.delete(`${this.baseUrl}/${targetType}/${targetId}`);
  }

  /**
   * Update follow settings
   */
  async updateFollow(
    targetType: FollowTargetType,
    targetId: string,
    data: UpdateFollowData
  ): Promise<ApiResponse<Follow>> {
    return apiService.put(`${this.baseUrl}/${targetType}/${targetId}`, data);
  }

  /**
   * Check if currently following a target
   */
  async isFollowing(targetType: FollowTargetType, targetId: string): Promise<ApiResponse<boolean>> {
    return apiService.get(`${this.baseUrl}/${targetType}/${targetId}/status`);
  }

  /**
   * Get list of users the current user is following
   */
  async getFollowingUsers(
    limit?: number,
    nextToken?: string
  ): Promise<ApiResponse<PaginationResult<FollowListItem>>> {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (nextToken) params.append('nextToken', nextToken);

    return apiService.get(`${this.baseUrl}/users?${params.toString()}`);
  }

  /**
   * Get list of discussions the current user is following
   */
  async getFollowingDiscussions(
    limit?: number,
    nextToken?: string
  ): Promise<ApiResponse<PaginationResult<FollowListItem>>> {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (nextToken) params.append('nextToken', nextToken);

    return apiService.get(`${this.baseUrl}/discussions?${params.toString()}`);
  }

  /**
   * Get list of followers for a user
   */
  async getFollowers(
    userId: string,
    limit?: number,
    nextToken?: string
  ): Promise<ApiResponse<PaginationResult<FollowListItem>>> {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (nextToken) params.append('nextToken', nextToken);

    return apiService.get(`${this.baseUrl}/users/${userId}/followers?${params.toString()}`);
  }

  /**
   * Get list of followers for a discussion
   */
  async getDiscussionFollowers(
    discussionId: string,
    limit?: number,
    nextToken?: string
  ): Promise<ApiResponse<PaginationResult<FollowListItem>>> {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (nextToken) params.append('nextToken', nextToken);

    return apiService.get(
      `${this.baseUrl}/discussions/${discussionId}/followers?${params.toString()}`
    );
  }

  /**
   * Get follow statistics for a user
   */
  async getFollowStatistics(userId?: string): Promise<ApiResponse<FollowStatistics>> {
    const endpoint = userId ? `${this.baseUrl}/statistics/${userId}` : `${this.baseUrl}/statistics`;
    return apiService.get(endpoint);
  }

  /**
   * Get follow suggestions
   */
  async getFollowSuggestions(
    targetType?: FollowTargetType,
    limit?: number
  ): Promise<ApiResponse<FollowSuggestion[]>> {
    const params = new URLSearchParams();
    if (targetType) params.append('targetType', targetType);
    if (limit) params.append('limit', limit.toString());

    return apiService.get(`${this.baseUrl}/suggestions?${params.toString()}`);
  }

  /**
   * Bulk follow operation
   */
  async bulkFollow(
    operation: BulkFollowOperation
  ): Promise<ApiResponse<{ successful: string[]; failed: string[] }>> {
    return apiService.post(`${this.baseUrl}/bulk`, operation);
  }

  /**
   * Bulk unfollow operation
   */
  async bulkUnfollow(
    targetType: FollowTargetType,
    targetIds: string[]
  ): Promise<ApiResponse<{ successful: string[]; failed: string[] }>> {
    return apiService.post(`${this.baseUrl}/bulk/unfollow`, {
      targetType,
      targetIds,
    });
  }

  /**
   * Get follow activity summary
   */
  async getFollowActivitySummary(
    period: 'day' | 'week' | 'month' = 'week'
  ): Promise<ApiResponse<FollowActivitySummary>> {
    return apiService.get(`${this.baseUrl}/activity?period=${period}`);
  }

  /**
   * Export follow data
   */
  async exportFollowData(): Promise<ApiResponse<FollowExportData>> {
    return apiService.get(`${this.baseUrl}/export`);
  }

  /**
   * Get timeline items
   */
  async getTimeline(
    options?: TimelineQueryOptions
  ): Promise<ApiResponse<PaginationResult<TimelineItem>>> {
    const params = new URLSearchParams();

    if (options?.filters) {
      const filters = options.filters;
      if (filters.itemTypes) {
        filters.itemTypes.forEach(type => params.append('itemType', type));
      }
      if (filters.authorIds) {
        filters.authorIds.forEach(id => params.append('authorId', id));
      }
      if (filters.discussionIds) {
        filters.discussionIds.forEach(id => params.append('discussionId', id));
      }
      if (filters.priority) params.append('priority', filters.priority);
      if (filters.isRead !== undefined) params.append('isRead', filters.isRead.toString());
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);
    }

    if (options?.sort) {
      params.append('sortField', options.sort.field);
      params.append('sortDirection', options.sort.direction);
    }

    if (options?.pagination) {
      if (options.pagination.limit) params.append('limit', options.pagination.limit.toString());
      if (options.pagination.nextToken) params.append('nextToken', options.pagination.nextToken);
    }

    return apiService.get(`/timeline?${params.toString()}`);
  }

  /**
   * Mark timeline items as read
   */
  async markTimelineItemsAsRead(itemIds: string[]): Promise<ApiResponse<void>> {
    return apiService.post('/timeline/mark-read', { itemIds });
  }

  /**
   * Clear timeline (mark all as read)
   */
  async clearTimeline(): Promise<ApiResponse<void>> {
    return apiService.post('/timeline/clear');
  }

  /**
   * Get unread timeline count
   */
  async getUnreadTimelineCount(): Promise<ApiResponse<number>> {
    return apiService.get('/timeline/unread-count');
  }
}

export const followService = new FollowService();
