import React from 'react';
import { TimelineItem as TimelineItemType, TimelineItemType as ItemType } from '../../types';
import './TimelineItem.css';

interface TimelineItemProps {
  item: TimelineItemType;
  onMarkAsRead?: (itemId: string) => void;
  onItemClick?: (item: TimelineItemType) => void;
  className?: string;
}

export const TimelineItem: React.FC<TimelineItemProps> = ({
  item,
  onMarkAsRead,
  onItemClick,
  className = '',
}) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) {
      return '1時間未満前';
    } else if (diffInHours < 24) {
      return `${diffInHours}時間前`;
    } else if (diffInHours < 24 * 7) {
      const days = Math.floor(diffInHours / 24);
      return `${days}日前`;
    } else {
      return date.toLocaleDateString('ja-JP');
    }
  };

  const getItemTypeIcon = (itemType: ItemType) => {
    switch (itemType) {
      case ItemType.POST:
        return '💬';
      case ItemType.DISCUSSION_CREATED:
        return '🆕';
      case ItemType.DISCUSSION_UPDATED:
        return '📝';
      case ItemType.USER_JOINED:
        return '👋';
      default:
        return '📄';
    }
  };

  const getItemTypeLabel = (itemType: ItemType) => {
    switch (itemType) {
      case ItemType.POST:
        return '新しい投稿';
      case ItemType.DISCUSSION_CREATED:
        return '議論が作成されました';
      case ItemType.DISCUSSION_UPDATED:
        return '議論が更新されました';
      case ItemType.USER_JOINED:
        return 'ユーザーが参加しました';
      default:
        return 'アクティビティ';
    }
  };

  const getPriorityClass = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'timeline-item--urgent';
      case 'high':
        return 'timeline-item--high';
      case 'normal':
        return 'timeline-item--normal';
      case 'low':
        return 'timeline-item--low';
      default:
        return 'timeline-item--normal';
    }
  };

  const handleClick = () => {
    if (!item.isRead && onMarkAsRead) {
      onMarkAsRead(item.itemId);
    }
    if (onItemClick) {
      onItemClick(item);
    }
  };

  const handleMarkAsRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onMarkAsRead) {
      onMarkAsRead(item.itemId);
    }
  };

  const itemClasses = [
    'timeline-item',
    getPriorityClass(item.priority),
    item.isRead ? 'timeline-item--read' : 'timeline-item--unread',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={itemClasses} onClick={handleClick}>
      <div className="timeline-item__header">
        <div className="timeline-item__type">
          <span className="timeline-item__type-icon">
            {getItemTypeIcon(item.itemType)}
          </span>
          <span className="timeline-item__type-label">
            {getItemTypeLabel(item.itemType)}
          </span>
        </div>
        
        <div className="timeline-item__meta">
          <span className="timeline-item__date">
            {formatDate(item.createdAt)}
          </span>
          
          {!item.isRead && (
            <button
              className="timeline-item__mark-read"
              onClick={handleMarkAsRead}
              title="既読にする"
              aria-label="既読にする"
            >
              ✓
            </button>
          )}
        </div>
      </div>

      <div className="timeline-item__content">
        <div className="timeline-item__author">
          <div className="timeline-item__author-avatar">
            {item.authorAvatar ? (
              <img src={item.authorAvatar} alt={item.authorDisplayName} />
            ) : (
              <div className="timeline-item__author-avatar-placeholder">
                {item.authorDisplayName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          
          <div className="timeline-item__author-info">
            <span className="timeline-item__author-name">
              {item.authorDisplayName}
            </span>
            
            {item.discussionTitle && (
              <span className="timeline-item__discussion">
                in {item.discussionTitle}
              </span>
            )}
            
            {item.pointTitle && (
              <span className="timeline-item__point">
                → {item.pointTitle}
              </span>
            )}
          </div>
        </div>

        <div className="timeline-item__main">
          <h3 className="timeline-item__title">
            {item.title}
          </h3>
          
          <p className="timeline-item__preview">
            {item.preview}
          </p>
        </div>
      </div>

      {!item.isRead && (
        <div className="timeline-item__unread-indicator" />
      )}
    </div>
  );
};