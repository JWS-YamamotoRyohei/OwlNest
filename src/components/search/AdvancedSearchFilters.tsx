import React, { useState } from 'react';
import { DiscussionCategory, Stance } from '../../types/common';
import { DiscussionSearchFilters } from '../../types/discussion';
import { PostSearchFilters } from '../../types/post';
import './AdvancedSearchFilters.css';

interface AdvancedSearchFiltersProps {
  type: 'discussions' | 'posts';
  filters: DiscussionSearchFilters | PostSearchFilters;
  onFiltersChange: (filters: DiscussionSearchFilters | PostSearchFilters) => void;
  onClear: () => void;
  onSave?: (name: string) => void;
  isLoading?: boolean;
}

export const AdvancedSearchFilters: React.FC<AdvancedSearchFiltersProps> = ({
  type,
  filters,
  onFiltersChange,
  onClear,
  onSave,
  isLoading = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveName, setSaveName] = useState('');

  const categories = [
    { value: DiscussionCategory.POLITICS, label: '政治' },
    { value: DiscussionCategory.ECONOMY, label: '経済・産業' },
    { value: DiscussionCategory.SOCIETY, label: '社会・生活' },
    { value: DiscussionCategory.TECHNOLOGY, label: 'ネット・テクノロジー' },
    { value: DiscussionCategory.ENTERTAINMENT, label: 'エンタメ' },
    { value: DiscussionCategory.SPORTS, label: 'スポーツ' },
    { value: DiscussionCategory.OTHER, label: 'その他' },
  ];

  const stances = [
    { value: Stance.PROS, label: '賛成', color: 'var(--color-pros)' },
    { value: Stance.CONS, label: '反対', color: 'var(--color-cons)' },
    { value: Stance.NEUTRAL, label: '中立', color: 'var(--color-neutral)' },
    { value: Stance.UNKNOWN, label: 'わからない', color: 'var(--color-unknown)' },
  ];

  const getActiveFiltersCount = (): number => {
    let count = 0;
    Object.entries(filters).forEach(([_key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value) && value.length > 0) count++;
        else if (!Array.isArray(value)) count++;
      }
    });
    return count;
  };

  const handleFilterChange = (key: string, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  const handleArrayFilterChange = (key: string, item: any, checked: boolean) => {
    const currentArray = (filters as any)[key] || [];
    const newArray = checked
      ? [...currentArray, item]
      : currentArray.filter((i: any) => i !== item);

    handleFilterChange(key, newArray.length > 0 ? newArray : undefined);
  };

  const handleDateRangeChange = (type: 'start' | 'end', field: string, value: string) => {
    const fieldName = type === 'start' ? `${field}After` : `${field}Before`;
    handleFilterChange(fieldName, value || undefined);
  };

  const handleNumberRangeChange = (type: 'min' | 'max', field: string, value: string) => {
    const fieldName = `${type}${field.charAt(0).toUpperCase() + field.slice(1)}`;
    const numValue = value ? parseInt(value, 10) : undefined;
    handleFilterChange(fieldName, numValue);
  };

  const handleSaveFilter = () => {
    if (saveName.trim() && onSave) {
      onSave(saveName.trim());
      setSaveDialogOpen(false);
      setSaveName('');
    }
  };

  const activeFiltersCount = getActiveFiltersCount();

  return (
    <div className="advanced-search-filters">
      <div className="advanced-search-filters__header">
        <button
          className="advanced-search-filters__toggle"
          onClick={() => setIsExpanded(!isExpanded)}
          aria-expanded={isExpanded}
        >
          <span className="advanced-search-filters__toggle-icon">{isExpanded ? '🔽' : '▶️'}</span>
          <span className="advanced-search-filters__toggle-text">
            詳細フィルター
            {activeFiltersCount > 0 && (
              <span className="advanced-search-filters__count">({activeFiltersCount})</span>
            )}
          </span>
        </button>

        <div className="advanced-search-filters__actions">
          {onSave && (
            <button
              className="advanced-search-filters__save"
              onClick={() => setSaveDialogOpen(true)}
              disabled={isLoading || activeFiltersCount === 0}
            >
              保存
            </button>
          )}
          {activeFiltersCount > 0 && (
            <button
              className="advanced-search-filters__clear"
              onClick={onClear}
              disabled={isLoading}
            >
              クリア
            </button>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="advanced-search-filters__content">
          {/* Categories */}
          {(type === 'discussions' || 'categories' in filters) && (
            <div className="advanced-search-filters__section">
              <h4 className="advanced-search-filters__section-title">カテゴリ</h4>
              <div className="advanced-search-filters__checkbox-group">
                {categories.map(category => (
                  <label key={category.value} className="advanced-search-filters__checkbox-label">
                    <input
                      type="checkbox"
                      checked={(filters as any).categories?.includes(category.value) || false}
                      onChange={e =>
                        handleArrayFilterChange('categories', category.value, e.target.checked)
                      }
                      className="advanced-search-filters__checkbox"
                      disabled={isLoading}
                    />
                    <span className="advanced-search-filters__checkbox-text">{category.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Stance */}
          <div className="advanced-search-filters__section">
            <h4 className="advanced-search-filters__section-title">
              {type === 'discussions' ? '作成者のスタンス' : 'スタンス'}
            </h4>
            <div className="advanced-search-filters__stance-group">
              {stances.map(stance => (
                <button
                  key={stance.value}
                  className={`advanced-search-filters__stance-button ${
                    (filters as any)[type === 'discussions' ? 'ownerStance' : 'stance'] ===
                    stance.value
                      ? 'advanced-search-filters__stance-button--active'
                      : ''
                  }`}
                  onClick={() => {
                    const field = type === 'discussions' ? 'ownerStance' : 'stance';
                    const currentValue = (filters as any)[field];
                    handleFilterChange(
                      field,
                      currentValue === stance.value ? undefined : stance.value
                    );
                  }}
                  style={
                    {
                      '--stance-color': stance.color,
                      borderColor:
                        (filters as any)[type === 'discussions' ? 'ownerStance' : 'stance'] ===
                        stance.value
                          ? stance.color
                          : undefined,
                    } as React.CSSProperties
                  }
                  disabled={isLoading}
                >
                  {stance.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div className="advanced-search-filters__section">
            <h4 className="advanced-search-filters__section-title">作成日時</h4>
            <div className="advanced-search-filters__date-range">
              <div className="advanced-search-filters__date-input-group">
                <label className="advanced-search-filters__date-label">開始日</label>
                <input
                  type="date"
                  value={(filters as any).createdAfter?.split('T')[0] || ''}
                  onChange={e => handleDateRangeChange('start', 'created', e.target.value)}
                  className="advanced-search-filters__date-input"
                  disabled={isLoading}
                />
              </div>
              <div className="advanced-search-filters__date-input-group">
                <label className="advanced-search-filters__date-label">終了日</label>
                <input
                  type="date"
                  value={(filters as any).createdBefore?.split('T')[0] || ''}
                  onChange={e => handleDateRangeChange('end', 'created', e.target.value)}
                  className="advanced-search-filters__date-input"
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>

          {/* Last Activity Date Range (for discussions) */}
          {type === 'discussions' && (
            <div className="advanced-search-filters__section">
              <h4 className="advanced-search-filters__section-title">最終更新日時</h4>
              <div className="advanced-search-filters__date-range">
                <div className="advanced-search-filters__date-input-group">
                  <label className="advanced-search-filters__date-label">開始日</label>
                  <input
                    type="date"
                    value={(filters as any).lastActivityAfter?.split('T')[0] || ''}
                    onChange={e => handleDateRangeChange('start', 'lastActivity', e.target.value)}
                    className="advanced-search-filters__date-input"
                    disabled={isLoading}
                  />
                </div>
                <div className="advanced-search-filters__date-input-group">
                  <label className="advanced-search-filters__date-label">終了日</label>
                  <input
                    type="date"
                    value={(filters as any).lastActivityBefore?.split('T')[0] || ''}
                    onChange={e => handleDateRangeChange('end', 'lastActivity', e.target.value)}
                    className="advanced-search-filters__date-input"
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Participant Count Range (for discussions) */}
          {type === 'discussions' && (
            <div className="advanced-search-filters__section">
              <h4 className="advanced-search-filters__section-title">参加者数</h4>
              <div className="advanced-search-filters__number-range">
                <div className="advanced-search-filters__number-input-group">
                  <label className="advanced-search-filters__number-label">最小</label>
                  <input
                    type="number"
                    min="0"
                    value={(filters as any).minParticipants || ''}
                    onChange={e => handleNumberRangeChange('min', 'participants', e.target.value)}
                    className="advanced-search-filters__number-input"
                    disabled={isLoading}
                  />
                </div>
                <div className="advanced-search-filters__number-input-group">
                  <label className="advanced-search-filters__number-label">最大</label>
                  <input
                    type="number"
                    min="0"
                    value={(filters as any).maxParticipants || ''}
                    onChange={e => handleNumberRangeChange('max', 'participants', e.target.value)}
                    className="advanced-search-filters__number-input"
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Post Count Range */}
          <div className="advanced-search-filters__section">
            <h4 className="advanced-search-filters__section-title">投稿数</h4>
            <div className="advanced-search-filters__number-range">
              <div className="advanced-search-filters__number-input-group">
                <label className="advanced-search-filters__number-label">最小</label>
                <input
                  type="number"
                  min="0"
                  value={(filters as any).minPosts || ''}
                  onChange={e => handleNumberRangeChange('min', 'posts', e.target.value)}
                  className="advanced-search-filters__number-input"
                  disabled={isLoading}
                />
              </div>
              <div className="advanced-search-filters__number-input-group">
                <label className="advanced-search-filters__number-label">最大</label>
                <input
                  type="number"
                  min="0"
                  value={(filters as any).maxPosts || ''}
                  onChange={e => handleNumberRangeChange('max', 'posts', e.target.value)}
                  className="advanced-search-filters__number-input"
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>

          {/* Status Filters (for discussions) */}
          {type === 'discussions' && (
            <div className="advanced-search-filters__section">
              <h4 className="advanced-search-filters__section-title">ステータス</h4>
              <div className="advanced-search-filters__status-group">
                <button
                  className={`advanced-search-filters__status-button ${
                    (filters as any).isActive === true
                      ? 'advanced-search-filters__status-button--active'
                      : ''
                  }`}
                  onClick={() => {
                    const current = (filters as any).isActive;
                    handleFilterChange('isActive', current === true ? undefined : true);
                  }}
                  disabled={isLoading}
                >
                  🟢 アクティブ
                </button>
                <button
                  className={`advanced-search-filters__status-button ${
                    (filters as any).isPinned === true
                      ? 'advanced-search-filters__status-button--active'
                      : ''
                  }`}
                  onClick={() => {
                    const current = (filters as any).isPinned;
                    handleFilterChange('isPinned', current === true ? undefined : true);
                  }}
                  disabled={isLoading}
                >
                  📌 ピン留め
                </button>
                <button
                  className={`advanced-search-filters__status-button ${
                    (filters as any).isFeatured === true
                      ? 'advanced-search-filters__status-button--active'
                      : ''
                  }`}
                  onClick={() => {
                    const current = (filters as any).isFeatured;
                    handleFilterChange('isFeatured', current === true ? undefined : true);
                  }}
                  disabled={isLoading}
                >
                  ⭐ 注目
                </button>
                <button
                  className={`advanced-search-filters__status-button ${
                    (filters as any).isLocked === false
                      ? 'advanced-search-filters__status-button--active'
                      : ''
                  }`}
                  onClick={() => {
                    const current = (filters as any).isLocked;
                    handleFilterChange('isLocked', current === false ? undefined : false);
                  }}
                  disabled={isLoading}
                >
                  🔓 ロックなし
                </button>
              </div>
            </div>
          )}

          {/* Content Filters (for posts) */}
          {type === 'posts' && (
            <div className="advanced-search-filters__section">
              <h4 className="advanced-search-filters__section-title">コンテンツ</h4>
              <div className="advanced-search-filters__content-group">
                <button
                  className={`advanced-search-filters__content-button ${
                    (filters as any).hasAttachments === true
                      ? 'advanced-search-filters__content-button--active'
                      : ''
                  }`}
                  onClick={() => {
                    const current = (filters as any).hasAttachments;
                    handleFilterChange('hasAttachments', current === true ? undefined : true);
                  }}
                  disabled={isLoading}
                >
                  📎 添付ファイルあり
                </button>
                <button
                  className={`advanced-search-filters__content-button ${
                    (filters as any).hasLinks === true
                      ? 'advanced-search-filters__content-button--active'
                      : ''
                  }`}
                  onClick={() => {
                    const current = (filters as any).hasLinks;
                    handleFilterChange('hasLinks', current === true ? undefined : true);
                  }}
                  disabled={isLoading}
                >
                  🔗 リンクあり
                </button>
                <button
                  className={`advanced-search-filters__content-button ${
                    (filters as any).isReply === true
                      ? 'advanced-search-filters__content-button--active'
                      : ''
                  }`}
                  onClick={() => {
                    const current = (filters as any).isReply;
                    handleFilterChange('isReply', current === true ? undefined : true);
                  }}
                  disabled={isLoading}
                >
                  💬 返信のみ
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Save Dialog */}
      {saveDialogOpen && (
        <div className="advanced-search-filters__save-dialog">
          <div className="advanced-search-filters__save-dialog-content">
            <h3>検索条件を保存</h3>
            <input
              type="text"
              value={saveName}
              onChange={e => setSaveName(e.target.value)}
              placeholder="保存名を入力..."
              className="advanced-search-filters__save-input"
              autoFocus
            />
            <div className="advanced-search-filters__save-actions">
              <button
                onClick={() => setSaveDialogOpen(false)}
                className="advanced-search-filters__save-cancel"
              >
                キャンセル
              </button>
              <button
                onClick={handleSaveFilter}
                className="advanced-search-filters__save-confirm"
                disabled={!saveName.trim()}
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
