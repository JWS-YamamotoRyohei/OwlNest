import { apiService, ApiResponse } from './api';
import {
  Notification,
  NotificationListItem,
  NotificationStatistics,
  NotificationPreferences,
  NotificationFilters,
  NotificationSortOptions,
  NotificationQueryOptions,
  NotificationBatchOperation,
  NotificationDigest,
  NotificationExportData,
  CreateNotificationData,
  UpdateNotificationData,
  PaginationResult,
} from '../types';

/**
 * Notification service for managing user notifications
 */
class NotificationService {
  private readonly baseUrl = '/notifications';

  /**
   * Get user notifications
   */
  async getNotifications(options?: NotificationQueryOptions): Promise<ApiResponse<PaginationResult<NotificationListItem>>> {
    const params = new URLSearchParams();
    
    if (options?.filters) {
      const filters = options.filters;
      if (filters.types) {
        filters.types.forEach(type => params.append('type', type));
      }
      if (filters.categories) {
        filters.categories.forEach(category => params.append('category', category));
      }
      if (filters.priorities) {
        filters.priorities.forEach(priority => params.append('priority', priority));
      }
      if (filters.isRead !== undefined) params.append('isRead', filters.isRead.toString());
      if (filters.isArchived !== undefined) params.append('isArchived', filters.isArchived.toString());
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);
      if (filters.sourceType) params.append('sourceType', filters.sourceType);
      if (filters.relatedUserId) params.append('relatedUserId', filters.relatedUserId);
    }
    
    if (options?.sort) {
      params.append('sortField', options.sort.field);
      params.append('sortDirection', options.sort.direction);
    }
    
    if (options?.pagination) {
      if (options.pagination.limit) params.append('limit', options.pagination.limit.toString());
      if (options.pagination.nextToken) params.append('nextToken', options.pagination.nextToken);
    }
    
    return apiService.get(`${this.baseUrl}?${params.toString()}`);
  }

  /**
   * Get notification by ID
   */
  async getNotification(notificationId: string): Promise<ApiResponse<Notification>> {
    return apiService.get(`${this.baseUrl}/${notificationId}`);
  }

  /**
   * Create a new notification (admin only)
   */
  async createNotification(data: CreateNotificationData): Promise<ApiResponse<Notification>> {
    return apiService.post(`${this.baseUrl}`, data);
  }

  /**
   * Update notification
   */
  async updateNotification(notificationId: string, data: UpdateNotificationData): Promise<ApiResponse<Notification>> {
    return apiService.put(`${this.baseUrl}/${notificationId}`, data);
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string): Promise<ApiResponse<void>> {
    return apiService.delete(`${this.baseUrl}/${notificationId}`);
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<ApiResponse<void>> {
    return apiService.put(`${this.baseUrl}/${notificationId}/read`);
  }

  /**
   * Mark notification as unread
   */
  async markAsUnread(notificationId: string): Promise<ApiResponse<void>> {
    return apiService.put(`${this.baseUrl}/${notificationId}/unread`);
  }

  /**
   * Archive notification
   */
  async archive(notificationId: string): Promise<ApiResponse<void>> {
    return apiService.put(`${this.baseUrl}/${notificationId}/archive`);
  }

  /**
   * Unarchive notification
   */
  async unarchive(notificationId: string): Promise<ApiResponse<void>> {
    return apiService.put(`${this.baseUrl}/${notificationId}/unarchive`);
  }

  /**
   * Batch operation on notifications
   */
  async batchOperation(operation: NotificationBatchOperation): Promise<ApiResponse<{ successful: string[]; failed: string[] }>> {
    return apiService.post(`${this.baseUrl}/batch`, operation);
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<ApiResponse<void>> {
    return apiService.put(`${this.baseUrl}/mark-all-read`);
  }

  /**
   * Clear all read notifications
   */
  async clearRead(): Promise<ApiResponse<void>> {
    return apiService.delete(`${this.baseUrl}/read`);
  }

  /**
   * Get notification statistics
   */
  async getStatistics(): Promise<ApiResponse<NotificationStatistics>> {
    return apiService.get(`${this.baseUrl}/statistics`);
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(): Promise<ApiResponse<number>> {
    return apiService.get(`${this.baseUrl}/unread-count`);
  }

  /**
   * Get notification preferences
   */
  async getPreferences(): Promise<ApiResponse<NotificationPreferences>> {
    return apiService.get(`${this.baseUrl}/preferences`);
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(preferences: Partial<NotificationPreferences>): Promise<ApiResponse<NotificationPreferences>> {
    return apiService.put(`${this.baseUrl}/preferences`, preferences);
  }

  /**
   * Reset notification preferences to defaults
   */
  async resetPreferences(): Promise<ApiResponse<NotificationPreferences>> {
    return apiService.post(`${this.baseUrl}/preferences/reset`);
  }

  /**
   * Get notification digest
   */
  async getDigest(period: 'daily' | 'weekly' = 'daily'): Promise<ApiResponse<NotificationDigest>> {
    return apiService.get(`${this.baseUrl}/digest?period=${period}`);
  }

  /**
   * Subscribe to push notifications
   */
  async subscribeToPush(subscription: PushSubscription): Promise<ApiResponse<void>> {
    return apiService.post(`${this.baseUrl}/push/subscribe`, {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
    });
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribeFromPush(): Promise<ApiResponse<void>> {
    return apiService.delete(`${this.baseUrl}/push/subscribe`);
  }

  /**
   * Test notification delivery
   */
  async testNotification(channels: ('email' | 'push' | 'inApp')[]): Promise<ApiResponse<void>> {
    return apiService.post(`${this.baseUrl}/test`, { channels });
  }

  /**
   * Export notification data
   */
  async exportData(dateFrom?: string, dateTo?: string): Promise<ApiResponse<NotificationExportData>> {
    const params = new URLSearchParams();
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);
    
    return apiService.get(`${this.baseUrl}/export?${params.toString()}`);
  }

  /**
   * Get notification templates (admin only)
   */
  async getTemplates(): Promise<ApiResponse<any[]>> {
    return apiService.get(`${this.baseUrl}/templates`);
  }

  /**
   * Create notification template (admin only)
   */
  async createTemplate(template: any): Promise<ApiResponse<any>> {
    return apiService.post(`${this.baseUrl}/templates`, template);
  }

  /**
   * Update notification template (admin only)
   */
  async updateTemplate(templateId: string, template: any): Promise<ApiResponse<any>> {
    return apiService.put(`${this.baseUrl}/templates/${templateId}`, template);
  }

  /**
   * Delete notification template (admin only)
   */
  async deleteTemplate(templateId: string): Promise<ApiResponse<void>> {
    return apiService.delete(`${this.baseUrl}/templates/${templateId}`);
  }

  /**
   * Send bulk notifications (admin only)
   */
  async sendBulkNotifications(data: {
    userIds: string[];
    templateId: string;
    variables?: Record<string, any>;
  }): Promise<ApiResponse<{ successful: string[]; failed: string[] }>> {
    return apiService.post(`${this.baseUrl}/bulk-send`, data);
  }

  /**
   * Get notification delivery status (admin only)
   */
  async getDeliveryStatus(notificationId: string): Promise<ApiResponse<any>> {
    return apiService.get(`${this.baseUrl}/${notificationId}/delivery-status`);
  }

  /**
   * Retry failed notification delivery (admin only)
   */
  async retryDelivery(notificationId: string, channels: string[]): Promise<ApiResponse<void>> {
    return apiService.post(`${this.baseUrl}/${notificationId}/retry`, { channels });
  }
}

export const notificationService = new NotificationService();