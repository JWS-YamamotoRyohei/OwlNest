import React, { useState, useRef, useEffect } from 'react';
import { useNotification } from '../../contexts/NotificationContext';
import { NotificationListItem } from '../../types';
import { NotificationType } from '../../types/common';
import './NotificationBell.css';

interface NotificationBellProps {
  className?: string;
  showBadge?: boolean;
  maxPreviewItems?: number;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  className = '',
  showBadge = true,
  maxPreviewItems = 5,
}) => {
  const { state, markAsRead, loadNotifications } = useNotification();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        buttonRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load notifications when dropdown opens
  useEffect(() => {
    if (isOpen && state.notifications.length === 0) {
      loadNotifications({ pagination: { limit: maxPreviewItems } }, true);
    }
  }, [isOpen, state.notifications.length, loadNotifications, maxPreviewItems]);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleNotificationClick = async (notification: NotificationListItem) => {
    if (!notification.isRead) {
      await markAsRead(notification.notificationId);
    }
    
    // Navigate to related content if available
    if (notification.data) {
      switch (notification.type) {
        case NotificationType.POST_REPLY:
        case NotificationType.POST_MENTION:
          if ('discussionId' in notification.data) {
            window.location.href = `/discussions/${notification.data.discussionId}`;
          }
          break;
        case NotificationType.DISCUSSION_FOLLOW:
          if ('discussionId' in notification.data) {
            window.location.href = `/discussions/${notification.data.discussionId}`;
          }
          break;
        case NotificationType.USER_FOLLOW:
          if ('followerId' in notification.data) {
            window.location.href = `/users/${notification.data.followerId}`;
          }
          break;
      }
    }
    
    setIsOpen(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) {
      return 'たった今';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}分前`;
    } else if (diffInMinutes < 24 * 60) {
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours}時間前`;
    } else {
      const days = Math.floor(diffInMinutes / (24 * 60));
      return `${days}日前`;
    }
  };

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case NotificationType.POST_REPLY:
        return '💬';
      case NotificationType.POST_MENTION:
        return '📢';
      case NotificationType.DISCUSSION_FOLLOW:
        return '👁️';
      case NotificationType.USER_FOLLOW:
        return '👤';
      case NotificationType.DISCUSSION_UPDATE:
        return '📝';
      case NotificationType.MODERATION_ACTION:
        return '⚠️';
      case NotificationType.SYSTEM_ANNOUNCEMENT:
        return '📢';
      default:
        return '🔔';
    }
  };

  const previewNotifications = state.notifications.slice(0, maxPreviewItems);

  return (
    <div className={`notification-bell ${className}`}>
      <button
        ref={buttonRef}
        className="notification-bell__button"
        onClick={handleToggle}
        aria-label={`通知 (${state.unreadCount}件の未読)`}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <svg
          className="notification-bell__icon"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
        </svg>
        
        {showBadge && state.unreadCount > 0 && (
          <span className="notification-bell__badge">
            {state.unreadCount > 99 ? '99+' : state.unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div ref={dropdownRef} className="notification-bell__dropdown">
          <div className="notification-bell__header">
            <h3 className="notification-bell__title">通知</h3>
            {state.unreadCount > 0 && (
              <span className="notification-bell__unread-count">
                {state.unreadCount}件の未読
              </span>
            )}
          </div>

          <div className="notification-bell__content">
            {state.isLoadingNotifications ? (
              <div className="notification-bell__loading">
                <div className="notification-bell__spinner"></div>
                <span>読み込み中...</span>
              </div>
            ) : previewNotifications.length > 0 ? (
              <>
                <div className="notification-bell__list">
                  {previewNotifications.map(notification => (
                    <div
                      key={notification.notificationId}
                      className={`notification-bell__item ${
                        !notification.isRead ? 'notification-bell__item--unread' : ''
                      }`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="notification-bell__item-icon">
                        {getNotificationIcon(notification.type)}
                      </div>
                      
                      <div className="notification-bell__item-content">
                        <div className="notification-bell__item-title">
                          {notification.title}
                        </div>
                        <div className="notification-bell__item-message">
                          {notification.message}
                        </div>
                        <div className="notification-bell__item-time">
                          {formatDate(notification.createdAt)}
                        </div>
                      </div>
                      
                      {!notification.isRead && (
                        <div className="notification-bell__item-unread-dot"></div>
                      )}
                    </div>
                  ))}
                </div>
                
                <div className="notification-bell__footer">
                  <a
                    href="/notifications"
                    className="notification-bell__view-all"
                    onClick={() => setIsOpen(false)}
                  >
                    すべての通知を見る
                  </a>
                </div>
              </>
            ) : (
              <div className="notification-bell__empty">
                <div className="notification-bell__empty-icon">🔔</div>
                <div className="notification-bell__empty-message">
                  新しい通知はありません
                </div>
              </div>
            )}
          </div>

          {state.error && (
            <div className="notification-bell__error">
              <div className="notification-bell__error-message">
                {state.error}
              </div>
              <button
                className="notification-bell__error-retry"
                onClick={() => loadNotifications({ pagination: { limit: maxPreviewItems } }, true)}
              >
                再試行
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};