import React, { useState, useEffect } from 'react';
import {
  TimelineItem as TimelineItemType,
  TimelineFilters,
  TimelineSortOptions,
} from '../../types';
import { TimelineItem } from './TimelineItem';
import { TimelineFilters as TimelineFiltersComponent } from './TimelineFilters';
import './TimelineList.css';

interface TimelineListProps {
  items: TimelineItemType[];
  isLoading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onMarkAsRead?: (itemId: string) => void;
  onMarkAllAsRead?: () => void;
  onItemClick?: (item: TimelineItemType) => void;
  onFiltersChange?: (filters: TimelineFilters) => void;
  onSortChange?: (sort: TimelineSortOptions) => void;
  unreadCount?: number;
  className?: string;
}

export const TimelineList: React.FC<TimelineListProps> = ({
  items,
  isLoading = false,
  hasMore = false,
  onLoadMore,
  onMarkAsRead,
  onMarkAllAsRead,
  onItemClick,
  onFiltersChange,
  onSortChange,
  unreadCount = 0,
  className = '',
}) => {
  const [showFilters, setShowFilters] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  // Auto-load more when scrolling near bottom
  useEffect(() => {
    const handleScroll = () => {
      if (!hasMore || isLoading || !onLoadMore) return;

      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = window.innerHeight;

      if (scrollTop + clientHeight >= scrollHeight - 1000) {
        onLoadMore();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasMore, isLoading, onLoadMore]);

  const handleItemSelect = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const handleMarkSelectedAsRead = () => {
    if (onMarkAsRead) {
      selectedItems.forEach(itemId => onMarkAsRead(itemId));
    }
    setSelectedItems(new Set());
    setIsSelectionMode(false);
  };

  const handleSelectAll = () => {
    const unreadItems = items.filter(item => !item.isRead);
    setSelectedItems(new Set(unreadItems.map(item => item.itemId)));
  };

  const handleClearSelection = () => {
    setSelectedItems(new Set());
    setIsSelectionMode(false);
  };

  const unreadItems = items.filter(item => !item.isRead);
  const readItems = items.filter(item => item.isRead);

  if (items.length === 0 && !isLoading) {
    return (
      <div className={`timeline-list timeline-list--empty ${className}`}>
        <div className="timeline-list__empty">
          <div className="timeline-list__empty-icon">📰</div>
          <div className="timeline-list__empty-title">タイムラインは空です</div>
          <div className="timeline-list__empty-message">
            ユーザーや議論をフォローすると、ここに最新の活動が表示されます。
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`timeline-list ${className}`}>
      {/* Header */}
      <div className="timeline-list__header">
        <div className="timeline-list__title">
          <h2>タイムライン</h2>
          {unreadCount > 0 && <span className="timeline-list__unread-badge">{unreadCount}</span>}
        </div>

        <div className="timeline-list__actions">
          {unreadCount > 0 && (
            <button
              className="timeline-list__action-button"
              onClick={onMarkAllAsRead}
              title="すべて既読にする"
            >
              すべて既読
            </button>
          )}

          <button
            className={`timeline-list__action-button ${isSelectionMode ? 'timeline-list__action-button--active' : ''}`}
            onClick={() => setIsSelectionMode(!isSelectionMode)}
            title="選択モード"
          >
            選択
          </button>

          <button
            className={`timeline-list__action-button ${showFilters ? 'timeline-list__action-button--active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
            title="フィルター"
          >
            フィルター
          </button>
        </div>
      </div>

      {/* Selection mode controls */}
      {isSelectionMode && (
        <div className="timeline-list__selection-controls">
          <div className="timeline-list__selection-info">{selectedItems.size}件選択中</div>

          <div className="timeline-list__selection-actions">
            <button
              className="timeline-list__selection-button"
              onClick={handleSelectAll}
              disabled={unreadItems.length === 0}
            >
              未読をすべて選択
            </button>

            <button
              className="timeline-list__selection-button"
              onClick={handleMarkSelectedAsRead}
              disabled={selectedItems.size === 0}
            >
              選択項目を既読にする
            </button>

            <button
              className="timeline-list__selection-button timeline-list__selection-button--secondary"
              onClick={handleClearSelection}
            >
              選択解除
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <div className="timeline-list__filters">
          <TimelineFiltersComponent onFiltersChange={onFiltersChange} onSortChange={onSortChange} />
        </div>
      )}

      {/* Items */}
      <div className="timeline-list__content">
        {/* Unread items */}
        {unreadItems.length > 0 && (
          <div className="timeline-list__section">
            <div className="timeline-list__section-header">
              <h3 className="timeline-list__section-title">未読 ({unreadItems.length})</h3>
            </div>

            <div className="timeline-list__items">
              {unreadItems.map(item => (
                <div
                  key={item.itemId}
                  className={`timeline-list__item-wrapper ${
                    isSelectionMode ? 'timeline-list__item-wrapper--selectable' : ''
                  } ${
                    selectedItems.has(item.itemId) ? 'timeline-list__item-wrapper--selected' : ''
                  }`}
                >
                  {isSelectionMode && (
                    <div className="timeline-list__item-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedItems.has(item.itemId)}
                        onChange={() => handleItemSelect(item.itemId)}
                        aria-label={`${item.title}を選択`}
                      />
                    </div>
                  )}

                  <TimelineItem item={item} onMarkAsRead={onMarkAsRead} onItemClick={onItemClick} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Read items */}
        {readItems.length > 0 && (
          <div className="timeline-list__section">
            <div className="timeline-list__section-header">
              <h3 className="timeline-list__section-title">既読 ({readItems.length})</h3>
            </div>

            <div className="timeline-list__items">
              {readItems.map(item => (
                <div key={item.itemId} className="timeline-list__item-wrapper">
                  <TimelineItem item={item} onMarkAsRead={onMarkAsRead} onItemClick={onItemClick} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Loading indicator */}
      {isLoading && (
        <div className="timeline-list__loading">
          <div className="timeline-list__loading-spinner">
            <div className="spinner"></div>
          </div>
          <span>読み込み中...</span>
        </div>
      )}

      {/* Load more button */}
      {hasMore && !isLoading && onLoadMore && (
        <div className="timeline-list__load-more">
          <button className="timeline-list__load-more-button" onClick={onLoadMore}>
            さらに読み込む
          </button>
        </div>
      )}
    </div>
  );
};
