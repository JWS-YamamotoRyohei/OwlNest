import React, { useState } from 'react';
import { DiscussionCategory } from '../../types/common';
import {
  getAllCategories,
  searchCategories,
} from '../../constants/categories';
import './CategoryFilter.css';

interface CategoryFilterProps {
  selectedCategories: DiscussionCategory[];
  onChange: (categories: DiscussionCategory[]) => void;
  showCounts?: boolean;
  categoryCounts?: Record<DiscussionCategory, number>;
  compact?: boolean;
}

const CategoryFilter: React.FC<CategoryFilterProps> = ({
  selectedCategories,
  onChange,
  showCounts = false,
  categoryCounts = {} as Record<DiscussionCategory, number>,
  compact = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isExpanded, setIsExpanded] = useState(!compact);

  const categories = searchQuery.trim() 
    ? searchCategories(searchQuery)
    : getAllCategories();

  const handleCategoryToggle = (categoryId: DiscussionCategory) => {
    const isSelected = selectedCategories.includes(categoryId);
    
    if (isSelected) {
      onChange(selectedCategories.filter(id => id !== categoryId));
    } else {
      onChange([...selectedCategories, categoryId]);
    }
  };

  const handleClearAll = () => {
    onChange([]);
  };

  const selectedCount = selectedCategories.length;

  if (compact && !isExpanded) {
    return (
      <div className="category-filter category-filter--compact">
        <button
          className="category-filter__toggle"
          onClick={() => setIsExpanded(true)}
        >
          カテゴリフィルター
          {selectedCount > 0 && (
            <span className="category-filter__badge">{selectedCount}</span>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className={`category-filter ${compact ? 'category-filter--compact' : ''}`}>
      <div className="category-filter__header">
        <h3 className="category-filter__title">カテゴリフィルター</h3>
        <div className="category-filter__actions">
          {selectedCount > 0 && (
            <button
              className="category-filter__clear"
              onClick={handleClearAll}
            >
              クリア ({selectedCount})
            </button>
          )}
          {compact && (
            <button
              className="category-filter__collapse"
              onClick={() => setIsExpanded(false)}
            >
              ×
            </button>
          )}
        </div>
      </div>

      <div className="category-filter__search">
        <input
          type="text"
          placeholder="カテゴリを検索..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="category-filter__search-input"
        />
      </div>

      <div className="category-filter__categories">
        {categories.map(categoryInfo => {
          const isSelected = selectedCategories.includes(categoryInfo.id);
          const count = categoryCounts[categoryInfo.id] || 0;

          return (
            <div
              key={categoryInfo.id}
              className={`category-filter__category ${isSelected ? 'selected' : ''}`}
              onClick={() => handleCategoryToggle(categoryInfo.id)}
            >
              <div className="category-filter__category-content">
                <span className="category-filter__category-icon">
                  {categoryInfo.icon}
                </span>
                <span className="category-filter__category-name">
                  {categoryInfo.name}
                </span>
                {showCounts && (
                  <span className="category-filter__category-count">
                    ({count})
                  </span>
                )}
              </div>
              <div className="category-filter__category-checkbox">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => {}} // Handled by parent onClick
                />
              </div>
            </div>
          );
        })}
      </div>

      {categories.length === 0 && searchQuery && (
        <div className="category-filter__no-results">
          「{searchQuery}」に一致するカテゴリが見つかりません
        </div>
      )}
    </div>
  );
};

export default CategoryFilter;