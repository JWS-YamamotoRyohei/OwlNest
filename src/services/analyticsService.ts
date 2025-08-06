import {
  DiscussionStatistics,
  UserStatistics,
  PlatformStatistics,
  EngagementMetrics,
  TrendData,
  AnalyticsFilter,
  AnalyticsTimeRange,
  StatisticsCache
} from '../types/analytics';
import { Discussion } from '../types/discussion';
import { Post } from '../types/post';
import { User } from '../types/user';

class AnalyticsService {
  private cache: Map<string, StatisticsCache> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Cache management
  private getCacheKey(method: string, params: any): string {
    return `${method}_${JSON.stringify(params)}`;
  }

  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data as T;
    }
    this.cache.delete(key);
    return null;
  }

  private setCache(key: string, data: any): void {
    const now = Date.now();
    this.cache.set(key, {
      key,
      data,
      timestamp: now,
      expiresAt: now + this.CACHE_DURATION
    });
  }

  // Discussion Statistics
  async getDiscussionStatistics(discussionId: string): Promise<DiscussionStatistics> {
    const cacheKey = this.getCacheKey('discussionStats', { discussionId });
    const cached = this.getFromCache<DiscussionStatistics>(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(`/api/analytics/discussions/${discussionId}/statistics`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch discussion statistics: ${response.statusText}`);
      }

      const statistics = await response.json();
      this.setCache(cacheKey, statistics);
      return statistics;
    } catch (error) {
      console.error('Error fetching discussion statistics:', error);
      // Return mock data for development
      return this.getMockDiscussionStatistics(discussionId);
    }
  }

  async getMultipleDiscussionStatistics(discussionIds: string[]): Promise<DiscussionStatistics[]> {
    const cacheKey = this.getCacheKey('multipleDiscussionStats', { discussionIds });
    const cached = this.getFromCache<DiscussionStatistics[]>(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch('/api/analytics/discussions/batch-statistics', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ discussionIds })
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch multiple discussion statistics: ${response.statusText}`);
      }

      const statistics = await response.json();
      this.setCache(cacheKey, statistics);
      return statistics;
    } catch (error) {
      console.error('Error fetching multiple discussion statistics:', error);
      return discussionIds.map(id => this.getMockDiscussionStatistics(id));
    }
  }

  // User Statistics
  async getUserStatistics(userId: string): Promise<UserStatistics> {
    const cacheKey = this.getCacheKey('userStats', { userId });
    const cached = this.getFromCache<UserStatistics>(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(`/api/analytics/users/${userId}/statistics`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch user statistics: ${response.statusText}`);
      }

      const statistics = await response.json();
      this.setCache(cacheKey, statistics);
      return statistics;
    } catch (error) {
      console.error('Error fetching user statistics:', error);
      return this.getMockUserStatistics(userId);
    }
  }

  // Platform Statistics
  async getPlatformStatistics(filter?: AnalyticsFilter): Promise<PlatformStatistics> {
    const cacheKey = this.getCacheKey('platformStats', filter || {});
    const cached = this.getFromCache<PlatformStatistics>(cacheKey);
    if (cached) return cached;

    try {
      const queryParams = filter ? `?${new URLSearchParams(this.serializeFilter(filter))}` : '';
      const response = await fetch(`/api/analytics/platform/statistics${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch platform statistics: ${response.statusText}`);
      }

      const statistics = await response.json();
      this.setCache(cacheKey, statistics);
      return statistics;
    } catch (error) {
      console.error('Error fetching platform statistics:', error);
      return this.getMockPlatformStatistics();
    }
  }

  // Engagement Metrics
  async getEngagementMetrics(discussionId: string, timeRange: AnalyticsTimeRange): Promise<EngagementMetrics> {
    const cacheKey = this.getCacheKey('engagementMetrics', { discussionId, timeRange });
    const cached = this.getFromCache<EngagementMetrics>(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(`/api/analytics/discussions/${discussionId}/engagement`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ timeRange })
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch engagement metrics: ${response.statusText}`);
      }

      const metrics = await response.json();
      this.setCache(cacheKey, metrics);
      return metrics;
    } catch (error) {
      console.error('Error fetching engagement metrics:', error);
      return this.getMockEngagementMetrics(discussionId);
    }
  }

  // Trend Analysis
  async getTrendData(
    metric: 'posts' | 'users' | 'discussions' | 'engagement',
    timeRange: AnalyticsTimeRange,
    filter?: AnalyticsFilter
  ): Promise<TrendData[]> {
    const cacheKey = this.getCacheKey('trendData', { metric, timeRange, filter });
    const cached = this.getFromCache<TrendData[]>(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(`/api/analytics/trends/${metric}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ timeRange, filter })
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch trend data: ${response.statusText}`);
      }

      const trendData = await response.json();
      this.setCache(cacheKey, trendData);
      return trendData;
    } catch (error) {
      console.error('Error fetching trend data:', error);
      return this.getMockTrendData(metric, timeRange);
    }
  }

  // Utility methods
  private serializeFilter(filter: AnalyticsFilter): Record<string, string> {
    const params: Record<string, string> = {};
    
    params.startDate = filter.timeRange.start;
    params.endDate = filter.timeRange.end;
    params.period = filter.timeRange.period;
    
    if (filter.categories?.length) {
      params.categories = filter.categories.join(',');
    }
    
    if (filter.userIds?.length) {
      params.userIds = filter.userIds.join(',');
    }
    
    if (filter.discussionIds?.length) {
      params.discussionIds = filter.discussionIds.join(',');
    }
    
    if (filter.stances?.length) {
      params.stances = filter.stances.join(',');
    }
    
    return params;
  }

  // Mock data for development
  private getMockDiscussionStatistics(discussionId: string): DiscussionStatistics {
    return {
      discussionId,
      title: `議論 ${discussionId}`,
      participantCount: Math.floor(Math.random() * 50) + 10,
      postCount: Math.floor(Math.random() * 200) + 20,
      engagementRate: Math.random() * 0.8 + 0.2,
      prosCount: Math.floor(Math.random() * 100) + 10,
      consCount: Math.floor(Math.random() * 100) + 10,
      neutralCount: Math.floor(Math.random() * 50) + 5,
      unknownCount: Math.floor(Math.random() * 30) + 2,
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      lastActivityAt: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
      averagePostsPerParticipant: Math.random() * 10 + 2,
      uniqueViewers: Math.floor(Math.random() * 500) + 100,
      totalViews: Math.floor(Math.random() * 2000) + 500
    };
  }

  private getMockUserStatistics(userId: string): UserStatistics {
    return {
      userId,
      username: `user_${userId}`,
      totalDiscussions: Math.floor(Math.random() * 20) + 1,
      totalPosts: Math.floor(Math.random() * 100) + 5,
      totalReactions: Math.floor(Math.random() * 200) + 10,
      averageEngagementRate: Math.random() * 0.6 + 0.3,
      mostActiveCategory: '政治',
      joinedAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
      lastActiveAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      followersCount: Math.floor(Math.random() * 100) + 5,
      followingCount: Math.floor(Math.random() * 50) + 3
    };
  }

  private getMockPlatformStatistics(): PlatformStatistics {
    return {
      totalUsers: 1250,
      activeUsers: 890,
      totalDiscussions: 340,
      activeDiscussions: 180,
      totalPosts: 8500,
      totalReactions: 15600,
      averageEngagementRate: 0.68,
      topCategories: [
        { categoryId: 'politics', categoryName: '政治', discussionCount: 85, postCount: 2100, participantCount: 320, engagementRate: 0.72 },
        { categoryId: 'technology', categoryName: 'テクノロジー', discussionCount: 62, postCount: 1800, participantCount: 280, engagementRate: 0.69 },
        { categoryId: 'society', categoryName: '社会', discussionCount: 58, postCount: 1650, participantCount: 250, engagementRate: 0.65 }
      ],
      growthMetrics: {
        dailyActiveUsers: 245,
        weeklyActiveUsers: 680,
        monthlyActiveUsers: 890,
        newUsersToday: 12,
        newUsersThisWeek: 85,
        newUsersThisMonth: 320,
        retentionRate: 0.78
      },
      userActivityDistribution: {
        timeOfDay: {
          '0': 45, '1': 32, '2': 28, '3': 25, '4': 22, '5': 30,
          '6': 55, '7': 85, '8': 120, '9': 145, '10': 160, '11': 175,
          '12': 190, '13': 185, '14': 170, '15': 165, '16': 155, '17': 145,
          '18': 180, '19': 195, '20': 210, '21': 185, '22': 140, '23': 85
        },
        dayOfWeek: {
          'Monday': 180, 'Tuesday': 195, 'Wednesday': 210, 'Thursday': 205,
          'Friday': 185, 'Saturday': 165, 'Sunday': 150
        },
        stanceDistribution: {
          pros: 0.35,
          cons: 0.32,
          neutral: 0.22,
          unknown: 0.11
        }
      }
    };
  }

  private getMockEngagementMetrics(discussionId: string): EngagementMetrics {
    return {
      discussionId,
      viewCount: Math.floor(Math.random() * 1000) + 200,
      uniqueViewers: Math.floor(Math.random() * 500) + 100,
      postCount: Math.floor(Math.random() * 150) + 30,
      reactionCount: Math.floor(Math.random() * 300) + 50,
      shareCount: Math.floor(Math.random() * 50) + 5,
      averageTimeSpent: Math.random() * 600 + 120, // seconds
      bounceRate: Math.random() * 0.4 + 0.1,
      returnVisitorRate: Math.random() * 0.6 + 0.3
    };
  }

  private getMockTrendData(metric: string, timeRange: AnalyticsTimeRange): TrendData[] {
    const days = this.getDaysBetween(new Date(timeRange.start), new Date(timeRange.end));
    return days.map((date, index) => {
      const baseValue = Math.floor(Math.random() * 100) + 50;
      const previousValue = index > 0 ? baseValue + (Math.random() - 0.5) * 20 : baseValue;
      const change = baseValue - previousValue;
      const changePercentage = previousValue > 0 ? (change / previousValue) * 100 : 0;

      return {
        date: date.toISOString().split('T')[0],
        value: baseValue,
        change,
        changePercentage
      };
    });
  }

  private getDaysBetween(start: Date, end: Date): Date[] {
    const days: Date[] = [];
    const current = new Date(start);
    
    while (current <= end) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  }

  // Cache management methods
  clearCache(): void {
    this.cache.clear();
  }

  getCacheSize(): number {
    return this.cache.size;
  }

  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

export const analyticsService = new AnalyticsService();
export default analyticsService;