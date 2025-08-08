export interface DiscussionStatistics {
  discussionId: string;
  title: string;
  participantCount: number;
  postCount: number;
  engagementRate: number;
  prosCount: number;
  consCount: number;
  neutralCount: number;
  unknownCount: number;
  createdAt: string;
  lastActivityAt: string;
  averagePostsPerParticipant: number;
  uniqueViewers: number;
  totalViews: number;
}

export interface UserStatistics {
  userId: string;
  username: string;
  totalDiscussions: number;
  totalPosts: number;
  totalReactions: number;
  averageEngagementRate: number;
  mostActiveCategory: string;
  joinedAt: string;
  lastActiveAt: string;
  followersCount: number;
  followingCount: number;
}

export interface PlatformStatistics {
  totalUsers: number;
  activeUsers: number;
  totalDiscussions: number;
  activeDiscussions: number;
  totalPosts: number;
  totalReactions: number;
  averageEngagementRate: number;
  topCategories: CategoryStatistics[];
  growthMetrics: GrowthMetrics;
  userActivityDistribution: ActivityDistribution;
}

export interface CategoryStatistics {
  categoryId: string;
  categoryName: string;
  discussionCount: number;
  postCount: number;
  participantCount: number;
  engagementRate: number;
}

export interface GrowthMetrics {
  dailyActiveUsers: number;
  weeklyActiveUsers: number;
  monthlyActiveUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  retentionRate: number;
}

export interface ActivityDistribution {
  timeOfDay: { [hour: string]: number };
  dayOfWeek: { [day: string]: number };
  stanceDistribution: {
    pros: number;
    cons: number;
    neutral: number;
    unknown: number;
  };
}

export interface EngagementMetrics {
  discussionId: string;
  viewCount: number;
  uniqueViewers: number;
  postCount: number;
  reactionCount: number;
  shareCount: number;
  averageTimeSpent: number;
  bounceRate: number;
  returnVisitorRate: number;
}

export interface TrendData {
  date: string;
  value: number;
  change: number;
  changePercentage: number;
}

export interface AnalyticsTimeRange {
  start: string;
  end: string;
  period: 'day' | 'week' | 'month' | 'quarter' | 'year';
}

export interface AnalyticsFilter {
  timeRange: AnalyticsTimeRange;
  categories?: string[];
  userIds?: string[];
  discussionIds?: string[];
  stances?: ('pros' | 'cons' | 'neutral' | 'unknown')[];
}

export interface StatisticsCache {
  key: string;
  data: any;
  timestamp: number;
  expiresAt: number;
}
