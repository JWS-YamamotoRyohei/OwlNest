import React, { useState } from 'react';
import { DiscussionSearchFilters } from '../../types/discussion';
import { DiscussionCategory, Stance } from '../../types/common';
import './DiscussionFilters.css';

interface DiscussionFiltersProps {
  filters: DiscussionSearchFilters;
  onFiltersChange: (filters: DiscussionSearchFilters) => void;
  onClear: () => void;
  isLoading?: boolean;
}

export const DiscussionFilters: React.FC<DiscussionFiltersProps> = ({
  filters,
  onFiltersChange,
  onClear,
  isLoading = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const categories = [
    { value: DiscussionCategory.POLITICS, label: '政治' },
    { value: DiscussionCategory.ECONOMY, label: '経済・産業' },
    { value: DiscussionCategory.SOCIETY, label: '社会・生活' },
    { value: DiscussionCategory.TECHNOLOGY, label: 'ネット・テクノロジー' },
    { value: DiscussionCategory.ENTERTAINMENT, label: 'エンタメ' },
    { value: DiscussionCategory.SPORTS, label: 'スポーツ' },
    { value: DiscussionCategory.OTHER, label: 'その他' }
  ];

  const stances = [
    { value: Stance.PROS, label: '賛成', color: 'var(--color-pros)' },
    { value: Stance.CONS, label: '反対', color: 'var(--color-cons)' },
    { value: Stance.NEUTRAL, label: '中立', color: 'var(--color-neutral)' },
    { value: Stance.UNKNOWN, label: 'わからない', color: 'var(--color-unknown)' }
  ];

  const handleCategoryChange = (category: DiscussionCategory, checked: boolean) => {
    const currentCategories = filters.categories || [];
    const newCategories = checked
      ? [...currentCategories, category]
      : currentCategories.filter(c => c !== category);
    
    onFiltersChange({
      ...filters,
      categories: newCategories.length > 0 ? newCategories : undefined
    });
  };

  const handleStanceChange = (stance: Stance) => {
    onFiltersChange({
      ...filters,
      ownerStance: filters.ownerStance === stance ? undefined : stance
    });
  };

  const handleStatusChange = (field: keyof DiscussionSearchFilters, value: boolean) => {
    onFiltersChange({
      ...filters,
      [field]: filters[field] === value ? undefined : value
    });
  };

  const handleSearchChange = (field: 'titleContains' | 'descriptionContains', value: string) => {
    onFiltersChange({
      ...filters,
      [field]: value.trim() || undefined
    });
  };

  const getActiveFiltersCount = (): number => {
    let count = 0;
    if (filters.categories?.length) count++;
    if (filters.ownerStance) count++;
    if (filters.isActive !== undefined) count++;
    if (filters.isLocked !== undefined) count++;
    if (filters.isPinned !== undefined) count++;
    if (filters.isFeatured !== undefined) count++;
    if (filters.titleContains) count++;
    if (filters.descriptionContains) count++;
    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();

  return (
    <div className="discussion-filters">
      <div className="discussion-filters__header">
        <button
          className="discussion-filters__toggle"
          onClick={() => setIsExpanded(!isExpanded)}
          aria-expanded={isExpanded}
          aria-controls="discussion-filters-content"
        >
          <span className="discussion-filters__toggle-icon">
            {isExpanded ? '🔽' : '▶️'}
          </span>
          <span className="discussion-filters__toggle-text">
            フィルター
            {activeFiltersCount > 0 && (
              <span className="discussion-filters__count">
                ({activeFiltersCount})
              </span>
            )}
          </span>
        </button>

        {activeFiltersCount > 0 && (
          <button
            className="discussion-filters__clear"
            onClick={onClear}
            disabled={isLoading}
          >
            クリア
          </button>
        )}
      </div>

      {isExpanded && (
        <div 
          id="discussion-filters-content"
          className="discussion-filters__content"
        >
          {/* Search filters */}
          <div className="discussion-filters__section">
            <h4 className="discussion-filters__section-title">検索</h4>
            <div className="discussion-filters__search-group">
              <input
                type="text"
                placeholder="タイトルで検索..."
                value={filters.titleContains || ''}
                onChange={(e) => handleSearchChange('titleContains', e.target.value)}
                className="discussion-filters__search-input"
                disabled={isLoading}
              />
              <input
                type="text"
                placeholder="説明文で検索..."
                value={filters.descriptionContains || ''}
                onChange={(e) => handleSearchChange('descriptionContains', e.target.value)}
                className="discussion-filters__search-input"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Category filters */}
          <div className="discussion-filters__section">
            <h4 className="discussion-filters__section-title">カテゴリ</h4>
            <div className="discussion-filters__checkbox-group">
              {categories.map((category) => (
                <label key={category.value} className="discussion-filters__checkbox-label">
                  <input
                    type="checkbox"
                    checked={filters.categories?.includes(category.value) || false}
                    onChange={(e) => handleCategoryChange(category.value, e.target.checked)}
                    className="discussion-filters__checkbox"
                    disabled={isLoading}
                  />
                  <span className="discussion-filters__checkbox-text">
                    {category.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Stance filters */}
          <div className="discussion-filters__section">
            <h4 className="discussion-filters__section-title">作成者のスタンス</h4>
            <div className="discussion-filters__stance-group">
              {stances.map((stance) => (
                <button
                  key={stance.value}
                  className={`discussion-filters__stance-button ${
                    filters.ownerStance === stance.value ? 'discussion-filters__stance-button--active' : ''
                  }`}
                  onClick={() => handleStanceChange(stance.value)}
                  style={{ 
                    '--stance-color': stance.color,
                    borderColor: filters.ownerStance === stance.value ? stance.color : undefined
                  } as React.CSSProperties}
                  disabled={isLoading}
                >
                  {stance.label}
                </button>
              ))}
            </div>
          </div>

          {/* Status filters */}
          <div className="discussion-filters__section">
            <h4 className="discussion-filters__section-title">ステータス</h4>
            <div className="discussion-filters__status-group">
              <button
                className={`discussion-filters__status-button ${
                  filters.isActive === true ? 'discussion-filters__status-button--active' : ''
                }`}
                onClick={() => handleStatusChange('isActive', true)}
                disabled={isLoading}
              >
                🟢 アクティブ
              </button>
              <button
                className={`discussion-filters__status-button ${
                  filters.isPinned === true ? 'discussion-filters__status-button--active' : ''
                }`}
                onClick={() => handleStatusChange('isPinned', true)}
                disabled={isLoading}
              >
                📌 ピン留め
              </button>
              <button
                className={`discussion-filters__status-button ${
                  filters.isFeatured === true ? 'discussion-filters__status-button--active' : ''
                }`}
                onClick={() => handleStatusChange('isFeatured', true)}
                disabled={isLoading}
              >
                ⭐ 注目
              </button>
              <button
                className={`discussion-filters__status-button ${
                  filters.isLocked === false ? 'discussion-filters__status-button--active' : ''
                }`}
                onClick={() => handleStatusChange('isLocked', false)}
                disabled={isLoading}
              >
                🔓 ロックなし
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};