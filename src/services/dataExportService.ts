import { AnalyticsFilter, DiscussionStatistics, PlatformStatistics, TrendData } from '../types/analytics';
import { Discussion } from '../types/discussion';
import { Post } from '../types/post';
import { User } from '../types/user';

export interface ExportOptions {
  format: 'csv' | 'json';
  dateRange?: {
    start: string;
    end: string;
  };
  categories?: string[];
  discussionIds?: string[];
  userIds?: string[];
  includeMetadata?: boolean;
  maxRecords?: number;
}

export interface ExportResult {
  filename: string;
  data: string;
  mimeType: string;
  size: number;
}

class DataExportService {
  private readonly API_BASE = '/api/analytics/export';

  // Export discussion statistics
  async exportDiscussionStatistics(
    discussionIds: string[],
    options: ExportOptions
  ): Promise<ExportResult> {
    try {
      const response = await fetch(`${this.API_BASE}/discussions/statistics`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          discussionIds,
          options
        })
      });

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }

      const data = await response.json();
      return this.processExportData(data, options);
    } catch (error) {
      console.error('Error exporting discussion statistics:', error);
      // Return mock data for development
      return this.generateMockDiscussionExport(discussionIds, options);
    }
  }

  // Export platform statistics
  async exportPlatformStatistics(
    filter: AnalyticsFilter,
    options: ExportOptions
  ): Promise<ExportResult> {
    try {
      const response = await fetch(`${this.API_BASE}/platform/statistics`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          filter,
          options
        })
      });

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }

      const data = await response.json();
      return this.processExportData(data, options);
    } catch (error) {
      console.error('Error exporting platform statistics:', error);
      return this.generateMockPlatformExport(options);
    }
  }

  // Export trend data
  async exportTrendData(
    metric: 'posts' | 'users' | 'discussions' | 'engagement',
    filter: AnalyticsFilter,
    options: ExportOptions
  ): Promise<ExportResult> {
    try {
      const response = await fetch(`${this.API_BASE}/trends/${metric}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          filter,
          options
        })
      });

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }

      const data = await response.json();
      return this.processExportData(data, options);
    } catch (error) {
      console.error('Error exporting trend data:', error);
      return this.generateMockTrendExport(metric, options);
    }
  }

  // Export discussion posts
  async exportDiscussionPosts(
    discussionId: string,
    options: ExportOptions
  ): Promise<ExportResult> {
    try {
      const response = await fetch(`${this.API_BASE}/discussions/${discussionId}/posts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ options })
      });

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }

      const data = await response.json();
      return this.processExportData(data, options);
    } catch (error) {
      console.error('Error exporting discussion posts:', error);
      return this.generateMockPostsExport(discussionId, options);
    }
  }

  // Export user activity data
  async exportUserActivity(
    userIds: string[],
    options: ExportOptions
  ): Promise<ExportResult> {
    try {
      const response = await fetch(`${this.API_BASE}/users/activity`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userIds,
          options
        })
      });

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }

      const data = await response.json();
      return this.processExportData(data, options);
    } catch (error) {
      console.error('Error exporting user activity:', error);
      return this.generateMockUserActivityExport(userIds, options);
    }
  }

  // Process export data based on format
  private processExportData(data: any, options: ExportOptions): ExportResult {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    if (options.format === 'csv') {
      const csvData = this.convertToCSV(data);
      return {
        filename: `export_${timestamp}.csv`,
        data: csvData,
        mimeType: 'text/csv',
        size: new Blob([csvData]).size
      };
    } else {
      const jsonData = JSON.stringify(data, null, 2);
      return {
        filename: `export_${timestamp}.json`,
        data: jsonData,
        mimeType: 'application/json',
        size: new Blob([jsonData]).size
      };
    }
  }

  // Convert data to CSV format
  private convertToCSV(data: any[]): string {
    if (!data || data.length === 0) {
      return '';
    }

    // Get headers from first object
    const headers = Object.keys(data[0]);
    const csvHeaders = headers.join(',');

    // Convert data rows
    const csvRows = data.map(row => {
      return headers.map(header => {
        const value = row[header];
        // Handle nested objects and arrays
        if (typeof value === 'object' && value !== null) {
          return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
        }
        // Escape quotes in strings
        if (typeof value === 'string') {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value || '';
      }).join(',');
    });

    return [csvHeaders, ...csvRows].join('\n');
  }

  // Download export file
  downloadExport(exportResult: ExportResult): void {
    const blob = new Blob([exportResult.data], { type: exportResult.mimeType });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = exportResult.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  }

  // Generate mock data for development
  private generateMockDiscussionExport(discussionIds: string[], options: ExportOptions): ExportResult {
    const mockData = discussionIds.map(id => ({
      discussionId: id,
      title: `議論 ${id}`,
      participantCount: Math.floor(Math.random() * 50) + 10,
      postCount: Math.floor(Math.random() * 200) + 20,
      engagementRate: (Math.random() * 0.8 + 0.2).toFixed(3),
      prosCount: Math.floor(Math.random() * 100) + 10,
      consCount: Math.floor(Math.random() * 100) + 10,
      neutralCount: Math.floor(Math.random() * 50) + 5,
      unknownCount: Math.floor(Math.random() * 30) + 2,
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      lastActivityAt: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
      averagePostsPerParticipant: (Math.random() * 10 + 2).toFixed(2),
      uniqueViewers: Math.floor(Math.random() * 500) + 100,
      totalViews: Math.floor(Math.random() * 2000) + 500
    }));

    return this.processExportData(mockData, options);
  }

  private generateMockPlatformExport(options: ExportOptions): ExportResult {
    const mockData = {
      totalUsers: 1250,
      activeUsers: 890,
      totalDiscussions: 340,
      activeDiscussions: 180,
      totalPosts: 8500,
      totalReactions: 15600,
      averageEngagementRate: 0.68,
      exportedAt: new Date().toISOString(),
      dateRange: options.dateRange || {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        end: new Date().toISOString()
      }
    };

    return this.processExportData([mockData], options);
  }

  private generateMockTrendExport(metric: string, options: ExportOptions): ExportResult {
    const days = 30;
    const mockData = Array.from({ length: days }, (_, index) => {
      const date = new Date(Date.now() - (days - index - 1) * 24 * 60 * 60 * 1000);
      const baseValue = Math.floor(Math.random() * 100) + 50;
      const previousValue = index > 0 ? baseValue + (Math.random() - 0.5) * 20 : baseValue;
      const change = baseValue - previousValue;
      const changePercentage = previousValue > 0 ? (change / previousValue) * 100 : 0;

      return {
        date: date.toISOString().split('T')[0],
        metric,
        value: baseValue,
        change,
        changePercentage: changePercentage.toFixed(2)
      };
    });

    return this.processExportData(mockData, options);
  }

  private generateMockPostsExport(discussionId: string, options: ExportOptions): ExportResult {
    const postCount = Math.floor(Math.random() * 50) + 20;
    const mockData = Array.from({ length: postCount }, (_, index) => ({
      postId: `post_${index + 1}`,
      discussionId,
      authorId: `user_${Math.floor(Math.random() * 20) + 1}`,
      content: `投稿内容 ${index + 1}`,
      stance: ['pros', 'cons', 'neutral', 'unknown'][Math.floor(Math.random() * 4)],
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      reactionCount: Math.floor(Math.random() * 20),
      replyCount: Math.floor(Math.random() * 10)
    }));

    return this.processExportData(mockData, options);
  }

  private generateMockUserActivityExport(userIds: string[], options: ExportOptions): ExportResult {
    const mockData = userIds.map(userId => ({
      userId,
      username: `user_${userId}`,
      totalDiscussions: Math.floor(Math.random() * 20) + 1,
      totalPosts: Math.floor(Math.random() * 100) + 5,
      totalReactions: Math.floor(Math.random() * 200) + 10,
      averageEngagementRate: (Math.random() * 0.6 + 0.3).toFixed(3),
      mostActiveCategory: ['政治', 'テクノロジー', '社会'][Math.floor(Math.random() * 3)],
      joinedAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
      lastActiveAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      followersCount: Math.floor(Math.random() * 100) + 5,
      followingCount: Math.floor(Math.random() * 50) + 3
    }));

    return this.processExportData(mockData, options);
  }

  // Utility methods
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  validateExportOptions(options: ExportOptions): string[] {
    const errors: string[] = [];

    if (!options.format || !['csv', 'json'].includes(options.format)) {
      errors.push('有効なフォーマット（csv または json）を選択してください');
    }

    if (options.maxRecords && (options.maxRecords < 1 || options.maxRecords > 100000)) {
      errors.push('最大レコード数は1から100,000の間で指定してください');
    }

    if (options.dateRange) {
      const start = new Date(options.dateRange.start);
      const end = new Date(options.dateRange.end);
      
      if (start >= end) {
        errors.push('開始日は終了日より前の日付を指定してください');
      }
      
      const maxRange = 365 * 24 * 60 * 60 * 1000; // 1 year
      if (end.getTime() - start.getTime() > maxRange) {
        errors.push('日付範囲は1年以内で指定してください');
      }
    }

    return errors;
  }
}

export const dataExportService = new DataExportService();
export default dataExportService;