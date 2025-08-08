import React, { useState } from 'react';
import {
  TimelineFilters as TimelineFiltersType,
  TimelineSortOptions,
  TimelineItemType,
  TimelinePriority,
} from '../../types';
import './TimelineFilters.css';

interface TimelineFiltersProps {
  onFiltersChange?: (filters: TimelineFiltersType) => void;
  onSortChange?: (sort: TimelineSortOptions) => void;
  className?: string;
}

export const TimelineFilters: React.FC<TimelineFiltersProps> = ({
  onFiltersChange,
  onSortChange,
  className = '',
}) => {
  const [filters, setFilters] = useState<TimelineFiltersType>({});
  const [sort, setSort] = useState<TimelineSortOptions>({
    field: 'createdAt',
    direction: 'desc',
  });

  const handleItemTypeChange = (itemType: TimelineItemType, checked: boolean) => {
    const newItemTypes = filters.itemTypes ? [...filters.itemTypes] : [];

    if (checked) {
      if (!newItemTypes.includes(itemType)) {
        newItemTypes.push(itemType);
      }
    } else {
      const index = newItemTypes.indexOf(itemType);
      if (index > -1) {
        newItemTypes.splice(index, 1);
      }
    }

    const newFilters = {
      ...filters,
      itemTypes: newItemTypes.length > 0 ? newItemTypes : undefined,
    };

    setFilters(newFilters);
    onFiltersChange?.(newFilters);
  };

  const handlePriorityChange = (priority: TimelinePriority | undefined) => {
    const newFilters = {
      ...filters,
      priority,
    };

    setFilters(newFilters);
    onFiltersChange?.(newFilters);
  };

  const handleReadStatusChange = (isRead: boolean | undefined) => {
    const newFilters = {
      ...filters,
      isRead,
    };

    setFilters(newFilters);
    onFiltersChange?.(newFilters);
  };

  const handleDateRangeChange = (field: 'dateFrom' | 'dateTo', value: string) => {
    const newFilters = {
      ...filters,
      [field]: value || undefined,
    };

    setFilters(newFilters);
    onFiltersChange?.(newFilters);
  };

  const handleSortChange = (field: string, direction: 'asc' | 'desc') => {
    const newSort = { field, direction } as TimelineSortOptions;
    setSort(newSort);
    onSortChange?.(newSort);
  };

  const handleClearFilters = () => {
    const clearedFilters: TimelineFiltersType = {};
    setFilters(clearedFilters);
    onFiltersChange?.(clearedFilters);
  };

  const getItemTypeLabel = (itemType: TimelineItemType) => {
    switch (itemType) {
      case TimelineItemType.POST:
        return '投稿';
      case TimelineItemType.DISCUSSION_CREATED:
        return '議論作成';
      case TimelineItemType.DISCUSSION_UPDATED:
        return '議論更新';
      case TimelineItemType.USER_JOINED:
        return 'ユーザー参加';
      default:
        return itemType;
    }
  };

  const getPriorityLabel = (priority: TimelinePriority) => {
    switch (priority) {
      case TimelinePriority.URGENT:
        return '緊急';
      case TimelinePriority.HIGH:
        return '高';
      case TimelinePriority.NORMAL:
        return '通常';
      case TimelinePriority.LOW:
        return '低';
      default:
        return priority;
    }
  };

  const hasActiveFilters = Object.values(filters).some(
    value =>
      value !== undefined && value !== null && (Array.isArray(value) ? value.length > 0 : true)
  );

  return (
    <div className={`timeline-filters ${className}`}>
      <div className="timeline-filters__header">
        <h3 className="timeline-filters__title">フィルターと並び替え</h3>

        {hasActiveFilters && (
          <button className="timeline-filters__clear" onClick={handleClearFilters}>
            クリア
          </button>
        )}
      </div>

      <div className="timeline-filters__content">
        {/* Item Type Filter */}
        <div className="timeline-filters__section">
          <h4 className="timeline-filters__section-title">アイテムタイプ</h4>

          <div className="timeline-filters__checkbox-group">
            {Object.values(TimelineItemType).map(itemType => (
              <label key={itemType} className="timeline-filters__checkbox">
                <input
                  type="checkbox"
                  checked={filters.itemTypes?.includes(itemType) || false}
                  onChange={e => handleItemTypeChange(itemType, e.target.checked)}
                />
                <span className="timeline-filters__checkbox-label">
                  {getItemTypeLabel(itemType)}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Priority Filter */}
        <div className="timeline-filters__section">
          <h4 className="timeline-filters__section-title">優先度</h4>

          <div className="timeline-filters__radio-group">
            <label className="timeline-filters__radio">
              <input
                type="radio"
                name="priority"
                checked={filters.priority === undefined}
                onChange={() => handlePriorityChange(undefined)}
              />
              <span className="timeline-filters__radio-label">すべて</span>
            </label>

            {Object.values(TimelinePriority).map(priority => (
              <label key={priority} className="timeline-filters__radio">
                <input
                  type="radio"
                  name="priority"
                  checked={filters.priority === priority}
                  onChange={() => handlePriorityChange(priority)}
                />
                <span className="timeline-filters__radio-label">{getPriorityLabel(priority)}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Read Status Filter */}
        <div className="timeline-filters__section">
          <h4 className="timeline-filters__section-title">既読状態</h4>

          <div className="timeline-filters__radio-group">
            <label className="timeline-filters__radio">
              <input
                type="radio"
                name="readStatus"
                checked={filters.isRead === undefined}
                onChange={() => handleReadStatusChange(undefined)}
              />
              <span className="timeline-filters__radio-label">すべて</span>
            </label>

            <label className="timeline-filters__radio">
              <input
                type="radio"
                name="readStatus"
                checked={filters.isRead === false}
                onChange={() => handleReadStatusChange(false)}
              />
              <span className="timeline-filters__radio-label">未読のみ</span>
            </label>

            <label className="timeline-filters__radio">
              <input
                type="radio"
                name="readStatus"
                checked={filters.isRead === true}
                onChange={() => handleReadStatusChange(true)}
              />
              <span className="timeline-filters__radio-label">既読のみ</span>
            </label>
          </div>
        </div>

        {/* Date Range Filter */}
        <div className="timeline-filters__section">
          <h4 className="timeline-filters__section-title">日付範囲</h4>

          <div className="timeline-filters__date-range">
            <div className="timeline-filters__date-input">
              <label className="timeline-filters__date-label">開始日</label>
              <input
                type="date"
                value={filters.dateFrom || ''}
                onChange={e => handleDateRangeChange('dateFrom', e.target.value)}
                className="timeline-filters__date-field"
              />
            </div>

            <div className="timeline-filters__date-input">
              <label className="timeline-filters__date-label">終了日</label>
              <input
                type="date"
                value={filters.dateTo || ''}
                onChange={e => handleDateRangeChange('dateTo', e.target.value)}
                className="timeline-filters__date-field"
              />
            </div>
          </div>
        </div>

        {/* Sort Options */}
        <div className="timeline-filters__section">
          <h4 className="timeline-filters__section-title">並び替え</h4>

          <div className="timeline-filters__sort-options">
            <div className="timeline-filters__sort-field">
              <label className="timeline-filters__sort-label">並び替え基準</label>
              <select
                value={sort.field}
                onChange={e => handleSortChange(e.target.value, sort.direction)}
                className="timeline-filters__sort-select"
              >
                <option value="createdAt">作成日時</option>
                <option value="priority">優先度</option>
                <option value="authorName">作成者名</option>
              </select>
            </div>

            <div className="timeline-filters__sort-direction">
              <label className="timeline-filters__sort-label">順序</label>
              <select
                value={sort.direction}
                onChange={e => handleSortChange(sort.field, e.target.value as 'asc' | 'desc')}
                className="timeline-filters__sort-select"
              >
                <option value="desc">降順</option>
                <option value="asc">昇順</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
