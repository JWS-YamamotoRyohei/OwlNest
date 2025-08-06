import { 
  PostReport, 
  CreateReportData, 
  ReviewReportData,
  ReportCategory,
  ReportPriority,
  ReportStatus,
  ModerationQueueItem,
  ModerationQueueFilters,
  ModerationStats,
  BulkModerationAction
} from '../types/moderation';
import { apiService } from './api';

export class ReportService {
  /**
   * Report a post
   */
  async reportPost(data: CreateReportData): Promise<PostReport> {
    try {
      const response = await apiService.post('/reports/posts', {
        ...data,
        timestamp: new Date().toISOString(),
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to report post: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get reports for a specific post
   */
  async getPostReports(postId: string): Promise<PostReport[]> {
    try {
      const response = await apiService.get(`/reports/posts/${postId}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get post reports: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get user's report history
   */
  async getUserReports(userId?: string, limit = 50): Promise<PostReport[]> {
    try {
      const params = userId ? { userId, limit } : { limit };
      const response = await apiService.get('/reports/user', { params });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get user reports: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get moderation queue items
   */
  async getModerationQueue(filters?: ModerationQueueFilters): Promise<{
    items: ModerationQueueItem[];
    totalCount: number;
    hasMore: boolean;
    nextToken?: string;
  }> {
    try {
      const response = await apiService.get('/moderation/queue', {
        params: filters,
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get moderation queue: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Assign moderation queue item to moderator
   */
  async assignQueueItem(queueItemId: string, moderatorId?: string): Promise<void> {
    try {
      await apiService.post(`/moderation/queue/${queueItemId}/assign`, {
        moderatorId,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      throw new Error(`Failed to assign queue item: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Review a report
   */
  async reviewReport(data: ReviewReportData): Promise<void> {
    try {
      await apiService.post(`/reports/${data.reportId}/review`, {
        ...data,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      throw new Error(`Failed to review report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Escalate a report
   */
  async escalateReport(reportId: string, reason: string): Promise<void> {
    try {
      await apiService.post(`/reports/${reportId}/escalate`, {
        reason,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      throw new Error(`Failed to escalate report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Bulk review reports
   */
  async bulkReviewReports(action: BulkModerationAction): Promise<void> {
    try {
      await apiService.post('/reports/bulk-review', {
        ...action,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      throw new Error(`Failed to bulk review reports: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get moderation statistics
   */
  async getModerationStats(filters?: {
    startDate?: string;
    endDate?: string;
    discussionId?: string;
    moderatorId?: string;
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
   * Get report categories with descriptions
   */
  getReportCategories(): Array<{
    value: ReportCategory;
    label: string;
    description: string;
    priority: ReportPriority;
  }> {
    return [
      {
        value: ReportCategory.SPAM,
        label: 'スパム・宣伝',
        description: '無関係な宣伝や繰り返し投稿',
        priority: ReportPriority.MEDIUM,
      },
      {
        value: ReportCategory.HARASSMENT,
        label: 'ハラスメント',
        description: '嫌がらせや個人攻撃',
        priority: ReportPriority.HIGH,
      },
      {
        value: ReportCategory.INAPPROPRIATE,
        label: '不適切な内容',
        description: '不適切または攻撃的な内容',
        priority: ReportPriority.MEDIUM,
      },
      {
        value: ReportCategory.MISINFORMATION,
        label: '誤情報・デマ',
        description: '虚偽または誤解を招く情報',
        priority: ReportPriority.HIGH,
      },
      {
        value: ReportCategory.HATE_SPEECH,
        label: 'ヘイトスピーチ',
        description: '差別的または憎悪を煽る発言',
        priority: ReportPriority.URGENT,
      },
      {
        value: ReportCategory.VIOLENCE,
        label: '暴力的な内容',
        description: '暴力の脅迫や暴力的な内容',
        priority: ReportPriority.URGENT,
      },
      {
        value: ReportCategory.COPYRIGHT,
        label: '著作権侵害',
        description: '著作権を侵害する内容',
        priority: ReportPriority.MEDIUM,
      },
      {
        value: ReportCategory.PRIVACY,
        label: 'プライバシー侵害',
        description: '個人情報の無断公開',
        priority: ReportPriority.HIGH,
      },
      {
        value: ReportCategory.OTHER,
        label: 'その他',
        description: '上記に該当しないその他の問題',
        priority: ReportPriority.LOW,
      },
    ];
  }

  /**
   * Get priority levels with descriptions
   */
  getPriorityLevels(): Array<{
    value: ReportPriority;
    label: string;
    description: string;
    color: string;
  }> {
    return [
      {
        value: ReportPriority.LOW,
        label: '低',
        description: '軽微な問題、時間をかけて対応',
        color: '#10b981', // green
      },
      {
        value: ReportPriority.MEDIUM,
        label: '中',
        description: '通常の問題、適切な時間内に対応',
        color: '#f59e0b', // yellow
      },
      {
        value: ReportPriority.HIGH,
        label: '高',
        description: '重要な問題、迅速な対応が必要',
        color: '#f97316', // orange
      },
      {
        value: ReportPriority.URGENT,
        label: '緊急',
        description: '緊急の問題、即座の対応が必要',
        color: '#ef4444', // red
      },
    ];
  }

  /**
   * Get status options with descriptions
   */
  getStatusOptions(): Array<{
    value: ReportStatus;
    label: string;
    description: string;
    color: string;
  }> {
    return [
      {
        value: ReportStatus.PENDING,
        label: '保留中',
        description: 'レビュー待ち',
        color: '#6b7280', // gray
      },
      {
        value: ReportStatus.IN_REVIEW,
        label: 'レビュー中',
        description: 'モデレーターがレビュー中',
        color: '#3b82f6', // blue
      },
      {
        value: ReportStatus.RESOLVED,
        label: '解決済み',
        description: '適切な措置が取られた',
        color: '#10b981', // green
      },
      {
        value: ReportStatus.DISMISSED,
        label: '却下',
        description: '問題なしと判断された',
        color: '#6b7280', // gray
      },
      {
        value: ReportStatus.ESCALATED,
        label: 'エスカレート',
        description: '上位モデレーターに転送',
        color: '#f97316', // orange
      },
    ];
  }

  /**
   * Calculate report priority based on category and other factors
   */
  calculatePriority(
    category: ReportCategory,
    reporterHistory?: {
      totalReports: number;
      accurateReports: number;
      falseReports: number;
    },
    contentAge?: number, // Hours since content was created
    reportCount?: number // Number of reports for the same content
  ): ReportPriority {
    // Base priority from category
    const categoryPriorities = {
      [ReportCategory.HATE_SPEECH]: ReportPriority.URGENT,
      [ReportCategory.VIOLENCE]: ReportPriority.URGENT,
      [ReportCategory.HARASSMENT]: ReportPriority.HIGH,
      [ReportCategory.MISINFORMATION]: ReportPriority.HIGH,
      [ReportCategory.PRIVACY]: ReportPriority.HIGH,
      [ReportCategory.SPAM]: ReportPriority.MEDIUM,
      [ReportCategory.INAPPROPRIATE]: ReportPriority.MEDIUM,
      [ReportCategory.COPYRIGHT]: ReportPriority.MEDIUM,
      [ReportCategory.OTHER]: ReportPriority.LOW,
    };

    let basePriority = categoryPriorities[category];

    // Adjust based on reporter history
    if (reporterHistory) {
      const accuracy = reporterHistory.totalReports > 0 
        ? reporterHistory.accurateReports / reporterHistory.totalReports 
        : 0.5;
      
      if (accuracy < 0.3) {
        // Lower priority for reporters with poor accuracy
        if (basePriority === ReportPriority.URGENT) basePriority = ReportPriority.HIGH;
        else if (basePriority === ReportPriority.HIGH) basePriority = ReportPriority.MEDIUM;
        else if (basePriority === ReportPriority.MEDIUM) basePriority = ReportPriority.LOW;
      } else if (accuracy > 0.8) {
        // Higher priority for reliable reporters
        if (basePriority === ReportPriority.LOW) basePriority = ReportPriority.MEDIUM;
        else if (basePriority === ReportPriority.MEDIUM) basePriority = ReportPriority.HIGH;
      }
    }

    // Adjust based on multiple reports
    if (reportCount && reportCount > 1) {
      if (basePriority === ReportPriority.LOW) basePriority = ReportPriority.MEDIUM;
      else if (basePriority === ReportPriority.MEDIUM) basePriority = ReportPriority.HIGH;
      else if (basePriority === ReportPriority.HIGH) basePriority = ReportPriority.URGENT;
    }

    // Adjust based on content age (newer content gets higher priority)
    if (contentAge !== undefined && contentAge < 1) {
      // Content less than 1 hour old gets priority boost
      if (basePriority === ReportPriority.LOW) basePriority = ReportPriority.MEDIUM;
      else if (basePriority === ReportPriority.MEDIUM) basePriority = ReportPriority.HIGH;
    }

    return basePriority;
  }

  /**
   * Validate report data
   */
  validateReportData(data: CreateReportData): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.postId) {
      errors.push('投稿IDが必要です');
    }

    if (!data.category) {
      errors.push('報告カテゴリを選択してください');
    }

    if (!data.reason || data.reason.trim().length < 10) {
      errors.push('報告理由は10文字以上で入力してください');
    }

    if (data.reason && data.reason.length > 500) {
      errors.push('報告理由は500文字以内で入力してください');
    }

    if (data.description && data.description.length > 1000) {
      errors.push('詳細説明は1000文字以内で入力してください');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Format report for display
   */
  formatReportForDisplay(report: PostReport): {
    id: string;
    category: string;
    categoryLabel: string;
    priority: string;
    priorityLabel: string;
    priorityColor: string;
    status: string;
    statusLabel: string;
    statusColor: string;
    reason: string;
    description?: string;
    reporterName: string;
    createdAt: string;
    reviewedAt?: string;
    reviewedBy?: string;
    resolution?: string;
  } {
    const categories = this.getReportCategories();
    const priorities = this.getPriorityLevels();
    const statuses = this.getStatusOptions();

    const category = categories.find(c => c.value === report.category);
    const priority = priorities.find(p => p.value === report.priority);
    const status = statuses.find(s => s.value === report.status);

    return {
      id: report.reportId,
      category: report.category,
      categoryLabel: category?.label || report.category,
      priority: report.priority,
      priorityLabel: priority?.label || report.priority,
      priorityColor: priority?.color || '#6b7280',
      status: report.status,
      statusLabel: status?.label || report.status,
      statusColor: status?.color || '#6b7280',
      reason: report.reason,
      description: report.description,
      reporterName: report.reporterDisplayName,
      createdAt: report.createdAt,
      reviewedAt: report.reviewedAt,
      reviewedBy: report.reviewedBy,
      resolution: report.resolution,
    };
  }
}

export const reportService = new ReportService();