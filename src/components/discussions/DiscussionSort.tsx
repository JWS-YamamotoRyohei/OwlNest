import React from 'react';
import './DiscussionSort.css';

export interface DiscussionSortOptions {
  field:
    | 'createdAt'
    | 'updatedAt'
    | 'lastActivityAt'
    | 'participantCount'
    | 'postCount'
    | 'followersCount';
  direction: 'asc' | 'desc';
}

interface DiscussionSortProps {
  sortOptions: DiscussionSortOptions;
  onSortChange: (options: DiscussionSortOptions) => void;
  isLoading?: boolean;
}

export const DiscussionSort: React.FC<DiscussionSortProps> = ({
  sortOptions,
  onSortChange,
  isLoading = false,
}) => {
  const sortFields = [
    { value: 'lastActivityAt', label: '最終更新日時' },
    { value: 'createdAt', label: '作成日時' },
    { value: 'participantCount', label: '参加者数' },
    { value: 'postCount', label: '投稿数' },
    { value: 'followersCount', label: 'フォロワー数' },
  ] as const;

  const handleFieldChange = (field: DiscussionSortOptions['field']) => {
    onSortChange({
      ...sortOptions,
      field,
    });
  };

  const handleDirectionToggle = () => {
    onSortChange({
      ...sortOptions,
      direction: sortOptions.direction === 'asc' ? 'desc' : 'asc',
    });
  };

  const getCurrentFieldLabel = () => {
    const field = sortFields.find(f => f.value === sortOptions.field);
    return field?.label || '不明';
  };

  const getDirectionIcon = () => {
    return sortOptions.direction === 'desc' ? '↓' : '↑';
  };

  const getDirectionLabel = () => {
    return sortOptions.direction === 'desc' ? '降順' : '昇順';
  };

  return (
    <div className="discussion-sort">
      <div className="discussion-sort__label">並び順:</div>

      <div className="discussion-sort__controls">
        <select
          className="discussion-sort__field-select"
          value={sortOptions.field}
          onChange={e => handleFieldChange(e.target.value as DiscussionSortOptions['field'])}
          disabled={isLoading}
        >
          {sortFields.map(field => (
            <option key={field.value} value={field.value}>
              {field.label}
            </option>
          ))}
        </select>

        <button
          className="discussion-sort__direction-button"
          onClick={handleDirectionToggle}
          disabled={isLoading}
          title={`${getDirectionLabel()}に変更`}
          aria-label={`現在${getDirectionLabel()}、クリックで${sortOptions.direction === 'desc' ? '昇順' : '降順'}に変更`}
        >
          <span className="discussion-sort__direction-icon">{getDirectionIcon()}</span>
          <span className="discussion-sort__direction-text">{getDirectionLabel()}</span>
        </button>
      </div>

      <div className="discussion-sort__current">
        {getCurrentFieldLabel()}で{getDirectionLabel()}
      </div>
    </div>
  );
};
