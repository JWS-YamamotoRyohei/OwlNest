import React, { useState } from 'react';
import {
  ModerationQueueFilters as Filters,
  ReportPriority,
  ReportStatus,
  ReportCategory,
} from '../../types/moderation';
import { reportService } from '../../services/reportService';
import './ModerationQueueFilters.css';

interface ModerationQueueFiltersProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  onClose: () => void;
}

export const ModerationQueueFilters: React.FC<ModerationQueueFiltersProps> = ({
  filters,
  onFiltersChange,
  onClose,
}) => {
  const [localFilters, setLocalFilters] = useState<Filters>(filters);

  const categories = reportService.getReportCategories();
  const priorities = reportService.getPriorityLevels();
  const statuses = reportService.getStatusOptions();

  const handleFilterChange = (key: keyof Filters, value: any) => {
    setLocalFilters(prev => ({
      ...prev,
      [key]: value || undefined,
    }));
  };

  const handleApplyFilters = () => {
    onFiltersChange(localFilters);
    onClose();
  };

  const handleClearFilters = () => {
    const clearedFilters: Filters = {};
    setLocalFilters(clearedFilters);
    onFiltersChange(clearedFilters);
    onClose();
  };

  const handleDateChange = (key: 'createdAfter' | 'createdBefore', value: string) => {
    if (value) {
      // Convert date to ISO string
      const date = new Date(value);
      handleFilterChange(key, date.toISOString());
    } else {
      handleFilterChange(key, undefined);
    }
  };

  const formatDateForInput = (isoString?: string): string => {
    if (!isoString) return '';
    return new Date(isoString).toISOString().split('T')[0];
  };

  return (
    <div className="moderation-queue-filters">
      <div className="moderation-queue-filters__header">
        <h3 className="moderation-queue-filters__title">フィルター</h3>
        <button
          type="button"
          className="moderation-queue-filters__close"
          onClick={onClose}
          aria-label="閉じる"
        >
          ×
        </button>
      </div>

      <div className="moderation-queue-filters__content">
        <div className="moderation-queue-filters__grid">
          {/* Priority Filter */}
          <div className="moderation-queue-filters__field">
            <label className="moderation-queue-filters__label">優先度</label>
            <select
              className="moderation-queue-filters__select"
              value={localFilters.priority || ''}
              onChange={e => handleFilterChange('priority', e.target.value as ReportPriority)}
            >
              <option value="">すべて</option>
              {priorities.map(priority => (
                <option key={priority.value} value={priority.value}>
                  {priority.label}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="moderation-queue-filters__field">
            <label className="moderation-queue-filters__label">ステータス</label>
            <select
              className="moderation-queue-filters__select"
              value={localFilters.status || ''}
              onChange={e => handleFilterChange('status', e.target.value as ReportStatus)}
            >
              <option value="">すべて</option>
              {statuses.map(status => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div className="moderation-queue-filters__field">
            <label className="moderation-queue-filters__label">カテゴリ</label>
            <select
              className="moderation-queue-filters__select"
              value={localFilters.category || ''}
              onChange={e => handleFilterChange('category', e.target.value as ReportCategory)}
            >
              <option value="">すべて</option>
              {categories.map(category => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>

          {/* Content Type Filter */}
          <div className="moderation-queue-filters__field">
            <label className="moderation-queue-filters__label">コンテンツタイプ</label>
            <select
              className="moderation-queue-filters__select"
              value={localFilters.contentType || ''}
              onChange={e => handleFilterChange('contentType', e.target.value)}
            >
              <option value="">すべて</option>
              <option value="post">投稿</option>
              <option value="discussion">議論</option>
              <option value="user">ユーザー</option>
            </select>
          </div>

          {/* Assigned To Filter */}
          <div className="moderation-queue-filters__field">
            <label className="moderation-queue-filters__label">担当者</label>
            <input
              type="text"
              className="moderation-queue-filters__input"
              value={localFilters.assignedTo || ''}
              onChange={e => handleFilterChange('assignedTo', e.target.value)}
              placeholder="ユーザーIDを入力"
            />
          </div>

          {/* Discussion ID Filter */}
          <div className="moderation-queue-filters__field">
            <label className="moderation-queue-filters__label">議論ID</label>
            <input
              type="text"
              className="moderation-queue-filters__input"
              value={localFilters.discussionId || ''}
              onChange={e => handleFilterChange('discussionId', e.target.value)}
              placeholder="議論IDを入力"
            />
          </div>

          {/* Author ID Filter */}
          <div className="moderation-queue-filters__field">
            <label className="moderation-queue-filters__label">投稿者ID</label>
            <input
              type="text"
              className="moderation-queue-filters__input"
              value={localFilters.authorId || ''}
              onChange={e => handleFilterChange('authorId', e.target.value)}
              placeholder="投稿者IDを入力"
            />
          </div>

          {/* Reporter ID Filter */}
          <div className="moderation-queue-filters__field">
            <label className="moderation-queue-filters__label">報告者ID</label>
            <input
              type="text"
              className="moderation-queue-filters__input"
              value={localFilters.reporterId || ''}
              onChange={e => handleFilterChange('reporterId', e.target.value)}
              placeholder="報告者IDを入力"
            />
          </div>

          {/* Created After Filter */}
          <div className="moderation-queue-filters__field">
            <label className="moderation-queue-filters__label">作成日時（以降）</label>
            <input
              type="date"
              className="moderation-queue-filters__input"
              value={formatDateForInput(localFilters.createdAfter)}
              onChange={e => handleDateChange('createdAfter', e.target.value)}
            />
          </div>

          {/* Created Before Filter */}
          <div className="moderation-queue-filters__field">
            <label className="moderation-queue-filters__label">作成日時（以前）</label>
            <input
              type="date"
              className="moderation-queue-filters__input"
              value={formatDateForInput(localFilters.createdBefore)}
              onChange={e => handleDateChange('createdBefore', e.target.value)}
            />
          </div>
        </div>

        {/* Boolean Filters */}
        <div className="moderation-queue-filters__checkboxes">
          <label className="moderation-queue-filters__checkbox">
            <input
              type="checkbox"
              checked={localFilters.isUrgent || false}
              onChange={e => handleFilterChange('isUrgent', e.target.checked || undefined)}
            />
            緊急のみ
          </label>

          <label className="moderation-queue-filters__checkbox">
            <input
              type="checkbox"
              checked={localFilters.isEscalated || false}
              onChange={e => handleFilterChange('isEscalated', e.target.checked || undefined)}
            />
            エスカレート済みのみ
          </label>
        </div>
      </div>

      <div className="moderation-queue-filters__actions">
        <button
          type="button"
          className="moderation-queue-filters__button moderation-queue-filters__button--clear"
          onClick={handleClearFilters}
        >
          クリア
        </button>
        <button
          type="button"
          className="moderation-queue-filters__button moderation-queue-filters__button--apply"
          onClick={handleApplyFilters}
        >
          適用
        </button>
      </div>
    </div>
  );
};
