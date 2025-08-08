import { useState, useEffect, useCallback } from 'react';
import {
  DiscussionStatistics,
  UserStatistics,
  PlatformStatistics,
  EngagementMetrics,
  TrendData,
  AnalyticsFilter,
  AnalyticsTimeRange,
} from '../types/analytics';
import analyticsService from '../services/analyticsService';

interface UseAnalyticsState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useDiscussionStatistics(
  discussionId: string
): UseAnalyticsState<DiscussionStatistics> {
  const [state, setState] = useState<UseAnalyticsState<DiscussionStatistics>>({
    data: null,
    loading: true,
    error: null,
    refetch: async () => {},
  });

  const fetchData = useCallback(async () => {
    if (!discussionId) return;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const data = await analyticsService.getDiscussionStatistics(discussionId);
      setState(prev => ({ ...prev, data, loading: false }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Unknown error',
        loading: false,
      }));
    }
  }, [discussionId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    ...state,
    refetch: fetchData,
  };
}

export function useMultipleDiscussionStatistics(
  discussionIds: string[]
): UseAnalyticsState<DiscussionStatistics[]> {
  const [state, setState] = useState<UseAnalyticsState<DiscussionStatistics[]>>({
    data: null,
    loading: true,
    error: null,
    refetch: async () => {},
  });

  const fetchData = useCallback(async () => {
    if (!discussionIds.length) {
      setState(prev => ({ ...prev, data: [], loading: false }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const data = await analyticsService.getMultipleDiscussionStatistics(discussionIds);
      setState(prev => ({ ...prev, data, loading: false }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Unknown error',
        loading: false,
      }));
    }
  }, [discussionIds]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    ...state,
    refetch: fetchData,
  };
}

export function useUserStatistics(userId: string): UseAnalyticsState<UserStatistics> {
  const [state, setState] = useState<UseAnalyticsState<UserStatistics>>({
    data: null,
    loading: true,
    error: null,
    refetch: async () => {},
  });

  const fetchData = useCallback(async () => {
    if (!userId) return;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const data = await analyticsService.getUserStatistics(userId);
      setState(prev => ({ ...prev, data, loading: false }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Unknown error',
        loading: false,
      }));
    }
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    ...state,
    refetch: fetchData,
  };
}

export function usePlatformStatistics(
  filter?: AnalyticsFilter
): UseAnalyticsState<PlatformStatistics> {
  const [state, setState] = useState<UseAnalyticsState<PlatformStatistics>>({
    data: null,
    loading: true,
    error: null,
    refetch: async () => {},
  });

  const fetchData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const data = await analyticsService.getPlatformStatistics(filter);
      setState(prev => ({ ...prev, data, loading: false }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Unknown error',
        loading: false,
      }));
    }
  }, [filter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    ...state,
    refetch: fetchData,
  };
}

export function useEngagementMetrics(
  discussionId: string,
  timeRange: AnalyticsTimeRange
): UseAnalyticsState<EngagementMetrics> {
  const [state, setState] = useState<UseAnalyticsState<EngagementMetrics>>({
    data: null,
    loading: true,
    error: null,
    refetch: async () => {},
  });

  const fetchData = useCallback(async () => {
    if (!discussionId) return;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const data = await analyticsService.getEngagementMetrics(discussionId, timeRange);
      setState(prev => ({ ...prev, data, loading: false }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Unknown error',
        loading: false,
      }));
    }
  }, [discussionId, timeRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    ...state,
    refetch: fetchData,
  };
}

export function useTrendData(
  metric: 'posts' | 'users' | 'discussions' | 'engagement',
  timeRange: AnalyticsTimeRange,
  filter?: AnalyticsFilter
): UseAnalyticsState<TrendData[]> {
  const [state, setState] = useState<UseAnalyticsState<TrendData[]>>({
    data: null,
    loading: true,
    error: null,
    refetch: async () => {},
  });

  const fetchData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const data = await analyticsService.getTrendData(metric, timeRange, filter);
      setState(prev => ({ ...prev, data, loading: false }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Unknown error',
        loading: false,
      }));
    }
  }, [metric, timeRange, filter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    ...state,
    refetch: fetchData,
  };
}

// Utility hook for managing analytics filters
export function useAnalyticsFilter() {
  const [filter, setFilter] = useState<AnalyticsFilter>({
    timeRange: {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      end: new Date().toISOString(),
      period: 'day',
    },
  });

  const updateTimeRange = useCallback((timeRange: AnalyticsTimeRange) => {
    setFilter(prev => ({ ...prev, timeRange }));
  }, []);

  const updateCategories = useCallback((categories: string[]) => {
    setFilter(prev => ({ ...prev, categories }));
  }, []);

  const updateUserIds = useCallback((userIds: string[]) => {
    setFilter(prev => ({ ...prev, userIds }));
  }, []);

  const updateDiscussionIds = useCallback((discussionIds: string[]) => {
    setFilter(prev => ({ ...prev, discussionIds }));
  }, []);

  const updateStances = useCallback((stances: ('pros' | 'cons' | 'neutral' | 'unknown')[]) => {
    setFilter(prev => ({ ...prev, stances }));
  }, []);

  const resetFilter = useCallback(() => {
    setFilter({
      timeRange: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        end: new Date().toISOString(),
        period: 'day',
      },
    });
  }, []);

  return {
    filter,
    updateTimeRange,
    updateCategories,
    updateUserIds,
    updateDiscussionIds,
    updateStances,
    resetFilter,
  };
}
