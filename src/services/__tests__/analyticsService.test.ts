import analyticsService from '../analyticsService';
import { AnalyticsTimeRange } from '../../types/analytics';

// Mock fetch globally
global.fetch = jest.fn();

describe('AnalyticsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    analyticsService.clearCache();
    
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(() => 'mock-token'),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
      },
      writable: true,
    });
  });

  describe('getDiscussionStatistics', () => {
    it('should fetch discussion statistics successfully', async () => {
      const mockStats = {
        discussionId: '1',
        title: 'Test Discussion',
        participantCount: 10,
        postCount: 25,
        engagementRate: 0.75,
        prosCount: 12,
        consCount: 8,
        neutralCount: 3,
        unknownCount: 2,
        createdAt: '2024-01-01T00:00:00Z',
        lastActivityAt: '2024-01-02T00:00:00Z',
        averagePostsPerParticipant: 2.5,
        uniqueViewers: 150,
        totalViews: 500
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockStats
      });

      const result = await analyticsService.getDiscussionStatistics('1');

      expect(fetch).toHaveBeenCalledWith(
        '/api/analytics/discussions/1/statistics',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-token',
            'Content-Type': 'application/json'
          })
        })
      );

      expect(result).toEqual(mockStats);
    });

    it('should return mock data when API fails', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await analyticsService.getDiscussionStatistics('1');

      expect(result).toMatchObject({
        discussionId: '1',
        title: '議論 1',
        participantCount: expect.any(Number),
        postCount: expect.any(Number),
        engagementRate: expect.any(Number)
      });
    });

    it('should use cached data when available', async () => {
      const mockStats = {
        discussionId: '1',
        title: 'Cached Discussion',
        participantCount: 5,
        postCount: 15,
        engagementRate: 0.6,
        prosCount: 8,
        consCount: 4,
        neutralCount: 2,
        unknownCount: 1,
        createdAt: '2024-01-01T00:00:00Z',
        lastActivityAt: '2024-01-02T00:00:00Z',
        averagePostsPerParticipant: 3.0,
        uniqueViewers: 100,
        totalViews: 300
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockStats
      });

      // First call should fetch from API
      const result1 = await analyticsService.getDiscussionStatistics('1');
      expect(fetch).toHaveBeenCalledTimes(1);

      // Second call should use cache
      const result2 = await analyticsService.getDiscussionStatistics('1');
      expect(fetch).toHaveBeenCalledTimes(1); // Still only 1 call
      expect(result2).toEqual(result1);
    });
  });

  describe('getMultipleDiscussionStatistics', () => {
    it('should fetch multiple discussion statistics', async () => {
      const mockStats = [
        {
          discussionId: '1',
          title: 'Discussion 1',
          participantCount: 10,
          postCount: 25,
          engagementRate: 0.75,
          prosCount: 12,
          consCount: 8,
          neutralCount: 3,
          unknownCount: 2,
          createdAt: '2024-01-01T00:00:00Z',
          lastActivityAt: '2024-01-02T00:00:00Z',
          averagePostsPerParticipant: 2.5,
          uniqueViewers: 150,
          totalViews: 500
        },
        {
          discussionId: '2',
          title: 'Discussion 2',
          participantCount: 8,
          postCount: 20,
          engagementRate: 0.65,
          prosCount: 10,
          consCount: 6,
          neutralCount: 2,
          unknownCount: 2,
          createdAt: '2024-01-01T00:00:00Z',
          lastActivityAt: '2024-01-02T00:00:00Z',
          averagePostsPerParticipant: 2.5,
          uniqueViewers: 120,
          totalViews: 400
        }
      ];

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockStats
      });

      const result = await analyticsService.getMultipleDiscussionStatistics(['1', '2']);

      expect(fetch).toHaveBeenCalledWith(
        '/api/analytics/discussions/batch-statistics',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-token',
            'Content-Type': 'application/json'
          }),
          body: JSON.stringify({ discussionIds: ['1', '2'] })
        })
      );

      expect(result).toEqual(mockStats);
    });
  });

  describe('getPlatformStatistics', () => {
    it('should fetch platform statistics successfully', async () => {
      const mockStats = {
        totalUsers: 1000,
        activeUsers: 750,
        totalDiscussions: 200,
        activeDiscussions: 150,
        totalPosts: 5000,
        totalReactions: 10000,
        averageEngagementRate: 0.68,
        topCategories: [
          {
            categoryId: 'politics',
            categoryName: '政治',
            discussionCount: 50,
            postCount: 1200,
            participantCount: 200,
            engagementRate: 0.75
          }
        ],
        growthMetrics: {
          dailyActiveUsers: 200,
          weeklyActiveUsers: 500,
          monthlyActiveUsers: 750,
          newUsersToday: 10,
          newUsersThisWeek: 70,
          newUsersThisMonth: 250,
          retentionRate: 0.8
        },
        userActivityDistribution: {
          timeOfDay: { '12': 100, '18': 150 },
          dayOfWeek: { 'Monday': 120, 'Friday': 180 },
          stanceDistribution: {
            pros: 0.35,
            cons: 0.30,
            neutral: 0.25,
            unknown: 0.10
          }
        }
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockStats
      });

      const result = await analyticsService.getPlatformStatistics();

      expect(fetch).toHaveBeenCalledWith(
        '/api/analytics/platform/statistics',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-token',
            'Content-Type': 'application/json'
          })
        })
      );

      expect(result).toEqual(mockStats);
    });

    it('should include filter parameters in query string', async () => {
      const filter = {
        timeRange: {
          start: '2024-01-01T00:00:00Z',
          end: '2024-01-31T23:59:59Z',
          period: 'day' as const
        },
        categories: ['politics', 'technology'],
        stances: ['pros', 'cons'] as const
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      });

      await analyticsService.getPlatformStatistics(filter);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/analytics/platform/statistics?'),
        expect.any(Object)
      );

      const callUrl = (fetch as jest.Mock).mock.calls[0][0];
      expect(callUrl).toContain('startDate=2024-01-01T00%3A00%3A00Z');
      expect(callUrl).toContain('endDate=2024-01-31T23%3A59%3A59Z');
      expect(callUrl).toContain('period=day');
      expect(callUrl).toContain('categories=politics%2Ctechnology');
      expect(callUrl).toContain('stances=pros%2Ccons');
    });
  });

  describe('getTrendData', () => {
    it('should fetch trend data successfully', async () => {
      const timeRange: AnalyticsTimeRange = {
        start: '2024-01-01T00:00:00Z',
        end: '2024-01-31T23:59:59Z',
        period: 'day'
      };

      const mockTrendData = [
        {
          date: '2024-01-01',
          value: 100,
          change: 5,
          changePercentage: 5.0
        },
        {
          date: '2024-01-02',
          value: 105,
          change: 5,
          changePercentage: 5.0
        }
      ];

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTrendData
      });

      const result = await analyticsService.getTrendData('posts', timeRange);

      expect(fetch).toHaveBeenCalledWith(
        '/api/analytics/trends/posts',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-token',
            'Content-Type': 'application/json'
          }),
          body: JSON.stringify({ timeRange, filter: undefined })
        })
      );

      expect(result).toEqual(mockTrendData);
    });
  });

  describe('cache management', () => {
    it('should clear cache', () => {
      analyticsService.clearCache();
      const stats = analyticsService.getCacheStats();
      expect(stats.size).toBe(0);
      expect(stats.keys).toEqual([]);
    });

    it('should return cache statistics', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      });

      await analyticsService.getDiscussionStatistics('1');
      
      const stats = analyticsService.getCacheStats();
      expect(stats.size).toBe(1);
      expect(stats.keys.length).toBe(1);
      expect(stats.keys[0]).toContain('discussionStats');
    });
  });
});