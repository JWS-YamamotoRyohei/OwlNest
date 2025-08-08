import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import {
  NotificationListItem,
  NotificationStatistics,
  NotificationPreferences,
  NotificationQueryOptions,
  NotificationBatchOperation,
} from '../types';
import { notificationService } from '../services/notificationService';
import { useAuth } from './AuthContext';

// Notification context state
interface NotificationState {
  // Notifications
  notifications: NotificationListItem[];
  hasMore: boolean;
  nextToken?: string;

  // Statistics
  statistics?: NotificationStatistics;
  unreadCount: number;

  // Preferences
  preferences?: NotificationPreferences;

  // Loading states
  isLoadingNotifications: boolean;
  isLoadingStatistics: boolean;
  isLoadingPreferences: boolean;

  // Operation states
  isUpdating: boolean;
  isBatchOperating: boolean;

  // Error states
  error?: string;
}

// Notification context actions
type NotificationAction =
  | { type: 'SET_LOADING_NOTIFICATIONS'; payload: boolean }
  | { type: 'SET_LOADING_STATISTICS'; payload: boolean }
  | { type: 'SET_LOADING_PREFERENCES'; payload: boolean }
  | { type: 'SET_UPDATING'; payload: boolean }
  | { type: 'SET_BATCH_OPERATING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | undefined }
  | {
      type: 'SET_NOTIFICATIONS';
      payload: { items: NotificationListItem[]; hasMore: boolean; nextToken?: string };
    }
  | {
      type: 'ADD_NOTIFICATIONS';
      payload: { items: NotificationListItem[]; hasMore: boolean; nextToken?: string };
    }
  | {
      type: 'UPDATE_NOTIFICATION';
      payload: { notificationId: string; updates: Partial<NotificationListItem> };
    }
  | { type: 'REMOVE_NOTIFICATION'; payload: string }
  | { type: 'SET_STATISTICS'; payload: NotificationStatistics }
  | { type: 'SET_UNREAD_COUNT'; payload: number }
  | { type: 'SET_PREFERENCES'; payload: NotificationPreferences }
  | { type: 'RESET_STATE' };

// Initial state
const initialState: NotificationState = {
  notifications: [],
  hasMore: false,
  unreadCount: 0,
  isLoadingNotifications: false,
  isLoadingStatistics: false,
  isLoadingPreferences: false,
  isUpdating: false,
  isBatchOperating: false,
};

// Reducer
function notificationReducer(
  state: NotificationState,
  action: NotificationAction
): NotificationState {
  switch (action.type) {
    case 'SET_LOADING_NOTIFICATIONS':
      return { ...state, isLoadingNotifications: action.payload };

    case 'SET_LOADING_STATISTICS':
      return { ...state, isLoadingStatistics: action.payload };

    case 'SET_LOADING_PREFERENCES':
      return { ...state, isLoadingPreferences: action.payload };

    case 'SET_UPDATING':
      return { ...state, isUpdating: action.payload };

    case 'SET_BATCH_OPERATING':
      return { ...state, isBatchOperating: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload };

    case 'SET_NOTIFICATIONS':
      return {
        ...state,
        notifications: action.payload.items,
        hasMore: action.payload.hasMore,
        nextToken: action.payload.nextToken,
      };

    case 'ADD_NOTIFICATIONS':
      return {
        ...state,
        notifications: [...state.notifications, ...action.payload.items],
        hasMore: action.payload.hasMore,
        nextToken: action.payload.nextToken,
      };

    case 'UPDATE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.map(notification =>
          notification.notificationId === action.payload.notificationId
            ? { ...notification, ...action.payload.updates }
            : notification
        ),
      };

    case 'REMOVE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.filter(
          notification => notification.notificationId !== action.payload
        ),
      };

    case 'SET_STATISTICS':
      return { ...state, statistics: action.payload };

    case 'SET_UNREAD_COUNT':
      return { ...state, unreadCount: action.payload };

    case 'SET_PREFERENCES':
      return { ...state, preferences: action.payload };

    case 'RESET_STATE':
      return initialState;

    default:
      return state;
  }
}

// Context type
interface NotificationContextType {
  // State
  state: NotificationState;

  // Data loading
  loadNotifications: (options?: NotificationQueryOptions, refresh?: boolean) => Promise<void>;
  loadMoreNotifications: () => Promise<void>;
  loadStatistics: () => Promise<void>;
  loadPreferences: () => Promise<void>;
  refreshUnreadCount: () => Promise<void>;

  // Notification operations
  markAsRead: (notificationId: string) => Promise<void>;
  markAsUnread: (notificationId: string) => Promise<void>;
  archive: (notificationId: string) => Promise<void>;
  unarchive: (notificationId: string) => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;

  // Batch operations
  batchOperation: (operation: NotificationBatchOperation) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearRead: () => Promise<void>;

  // Preferences
  updatePreferences: (preferences: Partial<NotificationPreferences>) => Promise<void>;
  resetPreferences: () => Promise<void>;

  // Push notifications
  subscribeToPush: () => Promise<void>;
  unsubscribeFromPush: () => Promise<void>;

  // Utility functions
  clearError: () => void;
}

// Create context
const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Provider component
export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(notificationReducer, initialState);
  const { user } = useAuth();

  // Clear state when user changes
  useEffect(() => {
    if (!user) {
      dispatch({ type: 'RESET_STATE' });
    }
  }, [user]);

  // Load notifications
  const loadNotifications = useCallback(
    async (options?: NotificationQueryOptions, refresh = false) => {
      if (!user) return;

      dispatch({ type: 'SET_LOADING_NOTIFICATIONS', payload: true });
      dispatch({ type: 'SET_ERROR', payload: undefined });

      try {
        const response = await notificationService.getNotifications(options);
        if (response.success && response.data) {
          if (refresh) {
            dispatch({
              type: 'SET_NOTIFICATIONS',
              payload: {
                items: response.data.items,
                hasMore: response.data.hasMore,
                nextToken: response.data.nextToken,
              },
            });
          } else {
            dispatch({
              type: 'ADD_NOTIFICATIONS',
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
          payload: error instanceof Error ? error.message : '通知の読み込みに失敗しました',
        });
      } finally {
        dispatch({ type: 'SET_LOADING_NOTIFICATIONS', payload: false });
      }
    },
    [user]
  );

  // Load more notifications
  const loadMoreNotifications = useCallback(async () => {
    if (!user || !state.hasMore || !state.nextToken) return;

    await loadNotifications({
      pagination: { nextToken: state.nextToken },
    });
  }, [user, state.hasMore, state.nextToken, loadNotifications]);

  // Load statistics
  const loadStatistics = useCallback(async () => {
    if (!user) return;

    dispatch({ type: 'SET_LOADING_STATISTICS', payload: true });

    try {
      const response = await notificationService.getStatistics();
      if (response.success && response.data) {
        dispatch({ type: 'SET_STATISTICS', payload: response.data });
        dispatch({ type: 'SET_UNREAD_COUNT', payload: response.data.unread });
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

  // Load preferences
  const loadPreferences = useCallback(async () => {
    if (!user) return;

    dispatch({ type: 'SET_LOADING_PREFERENCES', payload: true });

    try {
      const response = await notificationService.getPreferences();
      if (response.success && response.data) {
        dispatch({ type: 'SET_PREFERENCES', payload: response.data });
      }
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        payload: error instanceof Error ? error.message : '設定の読み込みに失敗しました',
      });
    } finally {
      dispatch({ type: 'SET_LOADING_PREFERENCES', payload: false });
    }
  }, [user]);

  // Refresh unread count
  const refreshUnreadCount = useCallback(async () => {
    if (!user) return;

    try {
      const response = await notificationService.getUnreadCount();
      if (response.success && typeof response.data === 'number') {
        dispatch({ type: 'SET_UNREAD_COUNT', payload: response.data });
      }
    } catch (_error) {
      // Silently fail for unread count refresh
    }
  }, [user]);

  // Mark as read
  const markAsRead = useCallback(
    async (notificationId: string) => {
      if (!user) return;

      dispatch({ type: 'SET_UPDATING', payload: true });

      try {
        const response = await notificationService.markAsRead(notificationId);
        if (response.success) {
          dispatch({
            type: 'UPDATE_NOTIFICATION',
            payload: { notificationId, updates: { isRead: true } },
          });
          dispatch({ type: 'SET_UNREAD_COUNT', payload: Math.max(0, state.unreadCount - 1) });
        }
      } catch (error) {
        dispatch({
          type: 'SET_ERROR',
          payload: error instanceof Error ? error.message : '既読マークに失敗しました',
        });
      } finally {
        dispatch({ type: 'SET_UPDATING', payload: false });
      }
    },
    [user, state.unreadCount]
  );

  // Mark as unread
  const markAsUnread = useCallback(
    async (notificationId: string) => {
      if (!user) return;

      dispatch({ type: 'SET_UPDATING', payload: true });

      try {
        const response = await notificationService.markAsUnread(notificationId);
        if (response.success) {
          dispatch({
            type: 'UPDATE_NOTIFICATION',
            payload: { notificationId, updates: { isRead: false } },
          });
          dispatch({ type: 'SET_UNREAD_COUNT', payload: state.unreadCount + 1 });
        }
      } catch (error) {
        dispatch({
          type: 'SET_ERROR',
          payload: error instanceof Error ? error.message : '未読マークに失敗しました',
        });
      } finally {
        dispatch({ type: 'SET_UPDATING', payload: false });
      }
    },
    [user, state.unreadCount]
  );

  // Archive notification
  const archive = useCallback(
    async (notificationId: string) => {
      if (!user) return;

      dispatch({ type: 'SET_UPDATING', payload: true });

      try {
        const response = await notificationService.archive(notificationId);
        if (response.success) {
          dispatch({
            type: 'UPDATE_NOTIFICATION',
            payload: { notificationId, updates: { isArchived: true } },
          });
        }
      } catch (error) {
        dispatch({
          type: 'SET_ERROR',
          payload: error instanceof Error ? error.message : 'アーカイブに失敗しました',
        });
      } finally {
        dispatch({ type: 'SET_UPDATING', payload: false });
      }
    },
    [user]
  );

  // Unarchive notification
  const unarchive = useCallback(
    async (notificationId: string) => {
      if (!user) return;

      dispatch({ type: 'SET_UPDATING', payload: true });

      try {
        const response = await notificationService.unarchive(notificationId);
        if (response.success) {
          dispatch({
            type: 'UPDATE_NOTIFICATION',
            payload: { notificationId, updates: { isArchived: false } },
          });
        }
      } catch (error) {
        dispatch({
          type: 'SET_ERROR',
          payload: error instanceof Error ? error.message : 'アーカイブ解除に失敗しました',
        });
      } finally {
        dispatch({ type: 'SET_UPDATING', payload: false });
      }
    },
    [user]
  );

  // Delete notification
  const deleteNotification = useCallback(
    async (notificationId: string) => {
      if (!user) return;

      dispatch({ type: 'SET_UPDATING', payload: true });

      try {
        const response = await notificationService.deleteNotification(notificationId);
        if (response.success) {
          dispatch({ type: 'REMOVE_NOTIFICATION', payload: notificationId });

          // Update unread count if the deleted notification was unread
          const notification = state.notifications.find(n => n.notificationId === notificationId);
          if (notification && !notification.isRead) {
            dispatch({ type: 'SET_UNREAD_COUNT', payload: Math.max(0, state.unreadCount - 1) });
          }
        }
      } catch (error) {
        dispatch({
          type: 'SET_ERROR',
          payload: error instanceof Error ? error.message : '通知の削除に失敗しました',
        });
      } finally {
        dispatch({ type: 'SET_UPDATING', payload: false });
      }
    },
    [user, state.notifications, state.unreadCount]
  );

  // Batch operation
  const batchOperation = useCallback(
    async (operation: NotificationBatchOperation) => {
      if (!user) return;

      dispatch({ type: 'SET_BATCH_OPERATING', payload: true });

      try {
        const response = await notificationService.batchOperation(operation);
        if (response.success && response.data) {
          const { successful } = response.data;

          // Update notifications based on operation
          successful.forEach(notificationId => {
            switch (operation.operation) {
              case 'mark_read':
                dispatch({
                  type: 'UPDATE_NOTIFICATION',
                  payload: { notificationId, updates: { isRead: true } },
                });
                break;
              case 'mark_unread':
                dispatch({
                  type: 'UPDATE_NOTIFICATION',
                  payload: { notificationId, updates: { isRead: false } },
                });
                break;
              case 'archive':
                dispatch({
                  type: 'UPDATE_NOTIFICATION',
                  payload: { notificationId, updates: { isArchived: true } },
                });
                break;
              case 'unarchive':
                dispatch({
                  type: 'UPDATE_NOTIFICATION',
                  payload: { notificationId, updates: { isArchived: false } },
                });
                break;
              case 'delete':
                dispatch({ type: 'REMOVE_NOTIFICATION', payload: notificationId });
                break;
            }
          });

          // Refresh unread count
          await refreshUnreadCount();
        }
      } catch (error) {
        dispatch({
          type: 'SET_ERROR',
          payload: error instanceof Error ? error.message : '一括操作に失敗しました',
        });
      } finally {
        dispatch({ type: 'SET_BATCH_OPERATING', payload: false });
      }
    },
    [user, refreshUnreadCount]
  );

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    if (!user) return;

    dispatch({ type: 'SET_UPDATING', payload: true });

    try {
      const response = await notificationService.markAllAsRead();
      if (response.success) {
        // Update all notifications to read
        dispatch({
          type: 'SET_NOTIFICATIONS',
          payload: {
            items: state.notifications.map(notification => ({ ...notification, isRead: true })),
            hasMore: state.hasMore,
            nextToken: state.nextToken,
          },
        });
        dispatch({ type: 'SET_UNREAD_COUNT', payload: 0 });
      }
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        payload: error instanceof Error ? error.message : '全て既読にする操作に失敗しました',
      });
    } finally {
      dispatch({ type: 'SET_UPDATING', payload: false });
    }
  }, [user, state.notifications, state.hasMore, state.nextToken]);

  // Clear read notifications
  const clearRead = useCallback(async () => {
    if (!user) return;

    dispatch({ type: 'SET_UPDATING', payload: true });

    try {
      const response = await notificationService.clearRead();
      if (response.success) {
        // Remove read notifications
        dispatch({
          type: 'SET_NOTIFICATIONS',
          payload: {
            items: state.notifications.filter(notification => !notification.isRead),
            hasMore: state.hasMore,
            nextToken: state.nextToken,
          },
        });
      }
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        payload: error instanceof Error ? error.message : '既読通知のクリアに失敗しました',
      });
    } finally {
      dispatch({ type: 'SET_UPDATING', payload: false });
    }
  }, [user, state.notifications, state.hasMore, state.nextToken]);

  // Update preferences
  const updatePreferences = useCallback(
    async (preferences: Partial<NotificationPreferences>) => {
      if (!user) return;

      dispatch({ type: 'SET_LOADING_PREFERENCES', payload: true });

      try {
        const response = await notificationService.updatePreferences(preferences);
        if (response.success && response.data) {
          dispatch({ type: 'SET_PREFERENCES', payload: response.data });
        }
      } catch (error) {
        dispatch({
          type: 'SET_ERROR',
          payload: error instanceof Error ? error.message : '設定の更新に失敗しました',
        });
      } finally {
        dispatch({ type: 'SET_LOADING_PREFERENCES', payload: false });
      }
    },
    [user]
  );

  // Reset preferences
  const resetPreferences = useCallback(async () => {
    if (!user) return;

    dispatch({ type: 'SET_LOADING_PREFERENCES', payload: true });

    try {
      const response = await notificationService.resetPreferences();
      if (response.success && response.data) {
        dispatch({ type: 'SET_PREFERENCES', payload: response.data });
      }
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        payload: error instanceof Error ? error.message : '設定のリセットに失敗しました',
      });
    } finally {
      dispatch({ type: 'SET_LOADING_PREFERENCES', payload: false });
    }
  }, [user]);

  // Subscribe to push notifications
  const subscribeToPush = useCallback(async () => {
    if (!user || !('serviceWorker' in navigator) || !('PushManager' in window)) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.REACT_APP_VAPID_PUBLIC_KEY,
      });

      const response = await notificationService.subscribeToPush(subscription);
      if (response.success) {
        // Update preferences to enable push notifications
        if (state.preferences) {
          dispatch({
            type: 'SET_PREFERENCES',
            payload: { ...state.preferences, push: true },
          });
        }
      }
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        payload: error instanceof Error ? error.message : 'プッシュ通知の登録に失敗しました',
      });
    }
  }, [user, state.preferences]);

  // Unsubscribe from push notifications
  const unsubscribeFromPush = useCallback(async () => {
    if (!user) return;

    try {
      const response = await notificationService.unsubscribeFromPush();
      if (response.success) {
        // Update preferences to disable push notifications
        if (state.preferences) {
          dispatch({
            type: 'SET_PREFERENCES',
            payload: { ...state.preferences, push: false },
          });
        }
      }
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        payload: error instanceof Error ? error.message : 'プッシュ通知の解除に失敗しました',
      });
    }
  }, [user, state.preferences]);

  // Clear error
  const clearError = useCallback(() => {
    dispatch({ type: 'SET_ERROR', payload: undefined });
  }, []);

  // Load initial data when user is available
  useEffect(() => {
    if (user) {
      loadNotifications(undefined, true);
      loadStatistics();
      loadPreferences();
      refreshUnreadCount();
    }
  }, [user, loadNotifications, loadStatistics, loadPreferences, refreshUnreadCount]);

  // Periodically refresh unread count
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      refreshUnreadCount();
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [user, refreshUnreadCount]);

  const contextValue: NotificationContextType = {
    state,
    loadNotifications,
    loadMoreNotifications,
    loadStatistics,
    loadPreferences,
    refreshUnreadCount,
    markAsRead,
    markAsUnread,
    archive,
    unarchive,
    deleteNotification,
    batchOperation,
    markAllAsRead,
    clearRead,
    updatePreferences,
    resetPreferences,
    subscribeToPush,
    unsubscribeFromPush,
    clearError,
  };

  return (
    <NotificationContext.Provider value={contextValue}>{children}</NotificationContext.Provider>
  );
};

// Hook to use notification context
export const useNotification = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
