import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import {
  FollowTargetType,
  CreateFollowData,
  UpdateFollowData,
  FollowListItem,
  FollowStatistics,
  FollowSuggestion,
  TimelineItem,
  TimelineQueryOptions,
} from '../types';
import { followService } from '../services/followService';
import { useAuth } from './AuthContext';

// Follow context state
interface FollowState {
  // Following lists
  followingUsers: FollowListItem[];
  followingDiscussions: FollowListItem[];

  // Timeline
  timelineItems: TimelineItem[];
  timelineHasMore: boolean;
  timelineNextToken?: string;
  unreadTimelineCount: number;

  // Statistics
  statistics?: FollowStatistics;

  // Suggestions
  suggestions: FollowSuggestion[];

  // Loading states
  isLoadingFollowing: boolean;
  isLoadingTimeline: boolean;
  isLoadingStatistics: boolean;
  isLoadingSuggestions: boolean;

  // Operation states
  isFollowing: boolean;
  isUnfollowing: boolean;

  // Error states
  error?: string;
}

// Follow context actions
type FollowAction =
  | { type: 'SET_LOADING_FOLLOWING'; payload: boolean }
  | { type: 'SET_LOADING_TIMELINE'; payload: boolean }
  | { type: 'SET_LOADING_STATISTICS'; payload: boolean }
  | { type: 'SET_LOADING_SUGGESTIONS'; payload: boolean }
  | { type: 'SET_FOLLOWING_OPERATION'; payload: boolean }
  | { type: 'SET_UNFOLLOWING_OPERATION'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | undefined }
  | { type: 'SET_FOLLOWING_USERS'; payload: FollowListItem[] }
  | { type: 'SET_FOLLOWING_DISCUSSIONS'; payload: FollowListItem[] }
  | { type: 'ADD_FOLLOWING_USERS'; payload: FollowListItem[] }
  | { type: 'ADD_FOLLOWING_DISCUSSIONS'; payload: FollowListItem[] }
  | { type: 'REMOVE_FOLLOWING'; payload: { targetType: FollowTargetType; targetId: string } }
  | {
      type: 'SET_TIMELINE_ITEMS';
      payload: { items: TimelineItem[]; hasMore: boolean; nextToken?: string };
    }
  | {
      type: 'ADD_TIMELINE_ITEMS';
      payload: { items: TimelineItem[]; hasMore: boolean; nextToken?: string };
    }
  | { type: 'ADD_TIMELINE_ITEM'; payload: TimelineItem }
  | { type: 'MARK_TIMELINE_ITEMS_READ'; payload: string[] }
  | { type: 'SET_UNREAD_TIMELINE_COUNT'; payload: number }
  | { type: 'SET_STATISTICS'; payload: FollowStatistics }
  | { type: 'SET_SUGGESTIONS'; payload: FollowSuggestion[] }
  | { type: 'RESET_STATE' };

// Initial state
const initialState: FollowState = {
  followingUsers: [],
  followingDiscussions: [],
  timelineItems: [],
  timelineHasMore: false,
  unreadTimelineCount: 0,
  suggestions: [],
  isLoadingFollowing: false,
  isLoadingTimeline: false,
  isLoadingStatistics: false,
  isLoadingSuggestions: false,
  isFollowing: false,
  isUnfollowing: false,
};

// Reducer
function followReducer(state: FollowState, action: FollowAction): FollowState {
  switch (action.type) {
    case 'SET_LOADING_FOLLOWING':
      return { ...state, isLoadingFollowing: action.payload };

    case 'SET_LOADING_TIMELINE':
      return { ...state, isLoadingTimeline: action.payload };

    case 'SET_LOADING_STATISTICS':
      return { ...state, isLoadingStatistics: action.payload };

    case 'SET_LOADING_SUGGESTIONS':
      return { ...state, isLoadingSuggestions: action.payload };

    case 'SET_FOLLOWING_OPERATION':
      return { ...state, isFollowing: action.payload };

    case 'SET_UNFOLLOWING_OPERATION':
      return { ...state, isUnfollowing: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload };

    case 'SET_FOLLOWING_USERS':
      return { ...state, followingUsers: action.payload };

    case 'SET_FOLLOWING_DISCUSSIONS':
      return { ...state, followingDiscussions: action.payload };

    case 'ADD_FOLLOWING_USERS':
      return {
        ...state,
        followingUsers: [...state.followingUsers, ...action.payload],
      };

    case 'ADD_FOLLOWING_DISCUSSIONS':
      return {
        ...state,
        followingDiscussions: [...state.followingDiscussions, ...action.payload],
      };

    case 'REMOVE_FOLLOWING':
      const { targetType, targetId } = action.payload;
      if (targetType === FollowTargetType.USER) {
        return {
          ...state,
          followingUsers: state.followingUsers.filter(item => item.targetId !== targetId),
        };
      } else {
        return {
          ...state,
          followingDiscussions: state.followingDiscussions.filter(
            item => item.targetId !== targetId
          ),
        };
      }

    case 'SET_TIMELINE_ITEMS':
      return {
        ...state,
        timelineItems: action.payload.items,
        timelineHasMore: action.payload.hasMore,
        timelineNextToken: action.payload.nextToken,
      };

    case 'ADD_TIMELINE_ITEMS':
      return {
        ...state,
        timelineItems: [...state.timelineItems, ...action.payload.items],
        timelineHasMore: action.payload.hasMore,
        timelineNextToken: action.payload.nextToken,
      };

    case 'ADD_TIMELINE_ITEM':
      return {
        ...state,
        timelineItems: [action.payload, ...state.timelineItems],
        unreadTimelineCount: state.unreadTimelineCount + 1,
      };

    case 'MARK_TIMELINE_ITEMS_READ':
      return {
        ...state,
        timelineItems: state.timelineItems.map(item =>
          action.payload.includes(item.itemId) ? { ...item, isRead: true } : item
        ),
        unreadTimelineCount: Math.max(0, state.unreadTimelineCount - action.payload.length),
      };

    case 'SET_UNREAD_TIMELINE_COUNT':
      return { ...state, unreadTimelineCount: action.payload };

    case 'SET_STATISTICS':
      return { ...state, statistics: action.payload };

    case 'SET_SUGGESTIONS':
      return { ...state, suggestions: action.payload };

    case 'RESET_STATE':
      return initialState;

    default:
      return state;
  }
}

// Context type
interface FollowContextType {
  // State
  state: FollowState;

  // Follow operations
  follow: (data: CreateFollowData) => Promise<void>;
  unfollow: (targetType: FollowTargetType, targetId: string) => Promise<void>;
  updateFollow: (
    targetType: FollowTargetType,
    targetId: string,
    data: UpdateFollowData
  ) => Promise<void>;
  isFollowing: (targetType: FollowTargetType, targetId: string) => Promise<boolean>;

  // Data loading
  loadFollowingUsers: (refresh?: boolean) => Promise<void>;
  loadFollowingDiscussions: (refresh?: boolean) => Promise<void>;
  loadTimeline: (options?: TimelineQueryOptions, refresh?: boolean) => Promise<void>;
  loadMoreTimeline: () => Promise<void>;
  loadStatistics: () => Promise<void>;
  loadSuggestions: (targetType?: FollowTargetType) => Promise<void>;

  // Timeline operations
  markTimelineItemsAsRead: (itemIds: string[]) => Promise<void>;
  clearTimeline: () => Promise<void>;
  refreshUnreadCount: () => Promise<void>;

  // Utility functions
  getFollowStatus: (targetType: FollowTargetType, targetId: string) => boolean;
  clearError: () => void;
}

// Create context
const FollowContext = createContext<FollowContextType | undefined>(undefined);

// Provider component
export const FollowProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(followReducer, initialState);
  const { user } = useAuth();

  // Clear state when user changes
  useEffect(() => {
    if (!user) {
      dispatch({ type: 'RESET_STATE' });
    }
  }, [user]);

  // Follow a user or discussion
  const follow = useCallback(
    async (data: CreateFollowData) => {
      if (!user) return;

      dispatch({ type: 'SET_FOLLOWING_OPERATION', payload: true });
      dispatch({ type: 'SET_ERROR', payload: undefined });

      try {
        const response = await followService.follow(data);
        if (response.success && response.data) {
          // Add to appropriate following list
          const followItem: FollowListItem = {
            followId: `${data.targetType}#${data.targetId}`,
            targetType: data.targetType,
            targetId: data.targetId,
            targetName: '', // Will be populated by the API response
            isActive: true,
            notificationsEnabled: data.notificationsEnabled ?? true,
            createdAt: new Date().toISOString(),
            targetInfo: {} as any, // Will be populated by the API response
          };

          if (data.targetType === FollowTargetType.USER) {
            dispatch({ type: 'ADD_FOLLOWING_USERS', payload: [followItem] });
          } else {
            dispatch({ type: 'ADD_FOLLOWING_DISCUSSIONS', payload: [followItem] });
          }

          // Update statistics
          if (state.statistics) {
            const updatedStats = { ...state.statistics };
            if (data.targetType === FollowTargetType.USER) {
              updatedStats.followingUsers += 1;
            } else {
              updatedStats.followingDiscussions += 1;
            }
            dispatch({ type: 'SET_STATISTICS', payload: updatedStats });
          }
        }
      } catch (error) {
        dispatch({
          type: 'SET_ERROR',
          payload: error instanceof Error ? error.message : 'フォローに失敗しました',
        });
      } finally {
        dispatch({ type: 'SET_FOLLOWING_OPERATION', payload: false });
      }
    },
    [user, state.statistics]
  );

  // Unfollow a user or discussion
  const unfollow = useCallback(
    async (targetType: FollowTargetType, targetId: string) => {
      if (!user) return;

      dispatch({ type: 'SET_UNFOLLOWING_OPERATION', payload: true });
      dispatch({ type: 'SET_ERROR', payload: undefined });

      try {
        const response = await followService.unfollow(targetType, targetId);
        if (response.success) {
          dispatch({ type: 'REMOVE_FOLLOWING', payload: { targetType, targetId } });

          // Update statistics
          if (state.statistics) {
            const updatedStats = { ...state.statistics };
            if (targetType === FollowTargetType.USER) {
              updatedStats.followingUsers = Math.max(0, updatedStats.followingUsers - 1);
            } else {
              updatedStats.followingDiscussions = Math.max(
                0,
                updatedStats.followingDiscussions - 1
              );
            }
            dispatch({ type: 'SET_STATISTICS', payload: updatedStats });
          }
        }
      } catch (error) {
        dispatch({
          type: 'SET_ERROR',
          payload: error instanceof Error ? error.message : 'フォロー解除に失敗しました',
        });
      } finally {
        dispatch({ type: 'SET_UNFOLLOWING_OPERATION', payload: false });
      }
    },
    [user, state.statistics]
  );

  // Update follow settings
  const updateFollow = useCallback(
    async (targetType: FollowTargetType, targetId: string, data: UpdateFollowData) => {
      if (!user) return;

      try {
        const response = await followService.updateFollow(targetType, targetId, data);
        if (response.success) {
          // Update the follow item in the appropriate list
          const updateList = (items: FollowListItem[]) =>
            items.map(item =>
              item.targetId === targetId
                ? {
                    ...item,
                    notificationsEnabled: data.notificationsEnabled ?? item.notificationsEnabled,
                  }
                : item
            );

          if (targetType === FollowTargetType.USER) {
            dispatch({ type: 'SET_FOLLOWING_USERS', payload: updateList(state.followingUsers) });
          } else {
            dispatch({
              type: 'SET_FOLLOWING_DISCUSSIONS',
              payload: updateList(state.followingDiscussions),
            });
          }
        }
      } catch (error) {
        dispatch({
          type: 'SET_ERROR',
          payload: error instanceof Error ? error.message : 'フォロー設定の更新に失敗しました',
        });
      }
    },
    [user, state.followingUsers, state.followingDiscussions]
  );

  // Check if following a target
  const isFollowing = useCallback(
    async (targetType: FollowTargetType, targetId: string): Promise<boolean> => {
      if (!user) return false;

      try {
        const response = await followService.isFollowing(targetType, targetId);
        return response.success ? response.data || false : false;
      } catch (_error) {
        return false;
      }
    },
    [user]
  );

  // Load following users
  const loadFollowingUsers = useCallback(
    async (refresh = false) => {
      if (!user) return;

      dispatch({ type: 'SET_LOADING_FOLLOWING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: undefined });

      try {
        const response = await followService.getFollowingUsers();
        if (response.success && response.data) {
          if (refresh) {
            dispatch({ type: 'SET_FOLLOWING_USERS', payload: response.data.items });
          } else {
            dispatch({ type: 'ADD_FOLLOWING_USERS', payload: response.data.items });
          }
        }
      } catch (error) {
        dispatch({
          type: 'SET_ERROR',
          payload:
            error instanceof Error ? error.message : 'フォロー中のユーザーの読み込みに失敗しました',
        });
      } finally {
        dispatch({ type: 'SET_LOADING_FOLLOWING', payload: false });
      }
    },
    [user]
  );

  // Load following discussions
  const loadFollowingDiscussions = useCallback(
    async (refresh = false) => {
      if (!user) return;

      dispatch({ type: 'SET_LOADING_FOLLOWING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: undefined });

      try {
        const response = await followService.getFollowingDiscussions();
        if (response.success && response.data) {
          if (refresh) {
            dispatch({ type: 'SET_FOLLOWING_DISCUSSIONS', payload: response.data.items });
          } else {
            dispatch({ type: 'ADD_FOLLOWING_DISCUSSIONS', payload: response.data.items });
          }
        }
      } catch (error) {
        dispatch({
          type: 'SET_ERROR',
          payload:
            error instanceof Error ? error.message : 'フォロー中の議論の読み込みに失敗しました',
        });
      } finally {
        dispatch({ type: 'SET_LOADING_FOLLOWING', payload: false });
      }
    },
    [user]
  );

  // Load timeline
  const loadTimeline = useCallback(
    async (options?: TimelineQueryOptions, refresh = false) => {
      if (!user) return;

      dispatch({ type: 'SET_LOADING_TIMELINE', payload: true });
      dispatch({ type: 'SET_ERROR', payload: undefined });

      try {
        const response = await followService.getTimeline(options);
        if (response.success && response.data) {
          if (refresh) {
            dispatch({
              type: 'SET_TIMELINE_ITEMS',
              payload: {
                items: response.data.items,
                hasMore: response.data.hasMore,
                nextToken: response.data.nextToken,
              },
            });
          } else {
            dispatch({
              type: 'ADD_TIMELINE_ITEMS',
              payload: {
                items: response.data.items,
                hasMore: response.data.hasMore,
                nextToken: response.data.nextToken,
              },
            });
          }
        }
      } catch (error) {
        dispatch({
          type: 'SET_ERROR',
          payload: error instanceof Error ? error.message : 'タイムラインの読み込みに失敗しました',
        });
      } finally {
        dispatch({ type: 'SET_LOADING_TIMELINE', payload: false });
      }
    },
    [user]
  );

  // Load more timeline items
  const loadMoreTimeline = useCallback(async () => {
    if (!user || !state.timelineHasMore || !state.timelineNextToken) return;

    await loadTimeline({
      pagination: { nextToken: state.timelineNextToken },
    });
  }, [user, state.timelineHasMore, state.timelineNextToken, loadTimeline]);

  // Load statistics
  const loadStatistics = useCallback(async () => {
    if (!user) return;

    dispatch({ type: 'SET_LOADING_STATISTICS', payload: true });

    try {
      const response = await followService.getFollowStatistics();
      if (response.success && response.data) {
        dispatch({ type: 'SET_STATISTICS', payload: response.data });
      }
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        payload: error instanceof Error ? error.message : '統計情報の読み込みに失敗しました',
      });
    } finally {
      dispatch({ type: 'SET_LOADING_STATISTICS', payload: false });
    }
  }, [user]);

  // Load suggestions
  const loadSuggestions = useCallback(
    async (targetType?: FollowTargetType) => {
      if (!user) return;

      dispatch({ type: 'SET_LOADING_SUGGESTIONS', payload: true });

      try {
        const response = await followService.getFollowSuggestions(targetType);
        if (response.success && response.data) {
          dispatch({ type: 'SET_SUGGESTIONS', payload: response.data });
        }
      } catch (error) {
        dispatch({
          type: 'SET_ERROR',
          payload: error instanceof Error ? error.message : 'おすすめの読み込みに失敗しました',
        });
      } finally {
        dispatch({ type: 'SET_LOADING_SUGGESTIONS', payload: false });
      }
    },
    [user]
  );

  // Mark timeline items as read
  const markTimelineItemsAsRead = useCallback(
    async (itemIds: string[]) => {
      if (!user || itemIds.length === 0) return;

      try {
        const response = await followService.markTimelineItemsAsRead(itemIds);
        if (response.success) {
          dispatch({ type: 'MARK_TIMELINE_ITEMS_READ', payload: itemIds });
        }
      } catch (error) {
        dispatch({
          type: 'SET_ERROR',
          payload: error instanceof Error ? error.message : '既読マークに失敗しました',
        });
      }
    },
    [user]
  );

  // Clear timeline
  const clearTimeline = useCallback(async () => {
    if (!user) return;

    try {
      const response = await followService.clearTimeline();
      if (response.success) {
        dispatch({ type: 'SET_UNREAD_TIMELINE_COUNT', payload: 0 });
        dispatch({
          type: 'SET_TIMELINE_ITEMS',
          payload: {
            items: state.timelineItems.map(item => ({ ...item, isRead: true })),
            hasMore: false,
          },
        });
      }
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        payload: error instanceof Error ? error.message : 'タイムラインのクリアに失敗しました',
      });
    }
  }, [user, state.timelineItems]);

  // Refresh unread count
  const refreshUnreadCount = useCallback(async () => {
    if (!user) return;

    try {
      const response = await followService.getUnreadTimelineCount();
      if (response.success && typeof response.data === 'number') {
        dispatch({ type: 'SET_UNREAD_TIMELINE_COUNT', payload: response.data });
      }
    } catch (_error) {
      // Silently fail for unread count refresh
    }
  }, [user]);

  // Get follow status from local state
  const getFollowStatus = useCallback(
    (targetType: FollowTargetType, targetId: string): boolean => {
      const list =
        targetType === FollowTargetType.USER ? state.followingUsers : state.followingDiscussions;
      return list.some(item => item.targetId === targetId && item.isActive);
    },
    [state.followingUsers, state.followingDiscussions]
  );

  // Clear error
  const clearError = useCallback(() => {
    dispatch({ type: 'SET_ERROR', payload: undefined });
  }, []);

  // Load initial data when user is available
  useEffect(() => {
    if (user) {
      loadFollowingUsers(true);
      loadFollowingDiscussions(true);
      loadTimeline(undefined, true);
      loadStatistics();
      refreshUnreadCount();
    }
  }, [
    user,
    loadFollowingUsers,
    loadFollowingDiscussions,
    loadTimeline,
    loadStatistics,
    refreshUnreadCount,
  ]);

  const contextValue: FollowContextType = {
    state,
    follow,
    unfollow,
    updateFollow,
    isFollowing,
    loadFollowingUsers,
    loadFollowingDiscussions,
    loadTimeline,
    loadMoreTimeline,
    loadStatistics,
    loadSuggestions,
    markTimelineItemsAsRead,
    clearTimeline,
    refreshUnreadCount,
    getFollowStatus,
    clearError,
  };

  return <FollowContext.Provider value={contextValue}>{children}</FollowContext.Provider>;
};

// Hook to use follow context
export const useFollow = (): FollowContextType => {
  const context = useContext(FollowContext);
  if (!context) {
    throw new Error('useFollow must be used within a FollowProvider');
  }
  return context;
};
