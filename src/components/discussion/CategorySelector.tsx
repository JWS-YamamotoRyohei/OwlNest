import React, { useState, useMemo } from 'react';
import { DiscussionCategory } from '../../types/common';
import {
  CATEGORY_HIERARCHY,
  getCategoryInfo,
  getAllCategories,
  searchCategories,
} from '../../constants/categories';
import './CategorySelector.css';

interface CategorySelectorProps {
  selectedCategories: DiscussionCategory[];
  onChange: (categories: DiscussionCategory[]) => void;
  maxSelections?: number;
  required?: boolean;
  disabled?: boolean;
  compact?: boolean;
  showSearch?: boolean;
  className?: string;
  error?: string;
}

const CategorySelector: React.FC<CategorySelectorProps> = ({
  selectedCategories,
  onChange,
  maxSelections = 10,
  required = false,
  disabled = false,
  compact = false,
  showSearch = true,
  className = '',
  error,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter categories based on search query
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) {
      return getAllCategories();
    }
    return searchCategories(searchQuery);
  }, [searchQuery]);

  const handleCategoryToggle = (categoryId: DiscussionCategory) => {
    if (disabled) return;

    const isSelected = selectedCategories.includes(categoryId);
    
    if (isSelected) {
      // Remove category
      onChange(selectedCategories.filter(id => id !== categoryId));
    } else {
      // Add category if not at max limit
      if (selectedCategories.length < maxSelections) {
        onChange([...selectedCategories, categoryId]);
      }
    }
  };

  const handleClearAll = () => {
    if (disabled) return;
    onChange([]);
  };

  const handleRemoveCategory = (categoryId: DiscussionCategory) => {
    if (disabled) return;
    onChange(selectedCategories.filter(id => id !== categoryId));
  };

  const isAtMaxLimit = selectedCategories.length >= maxSelections;
  const hasError = required && selectedCategories.length === 0;

  return (
    <div className={`category-selector ${compact ? 'category-selector--compact' : ''} ${disabled ? 'disabled' : ''} ${className}`}>
      <div className="category-selector__header">
        <h3 className="category-selector__title">カテゴリ選択</h3>
        <div className="category-selector__info">
          <span className="category-selector__count">
            {selectedCategories.length}/{maxSelections} 選択中
          </span>
          {selectedCategories.length > 0 && (
            <button
              type="button"
              className="category-selector__clear"
              onClick={handleClearAll}
              disabled={disabled}
            >
              すべて解除
            </button>
          )}
        </div>
      </div>

      {showSearch && (
        <div className="category-selector__search">
          <input
            type="text"
            placeholder="カテゴリを検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={disabled}
            className="category-selector__search-input"
          />
        </div>
      )}

      {(hasError || error) && (
        <div className="category-selector__error">
          {error || '少なくとも1つのカテゴリを選択してください'}
        </div>
      )}

      {selectedCategories.length > 0 && (
        <div className="category-selector__selected">
          <div className="category-selector__selected-header">
            選択中のカテゴリ:
          </div>
          <div className="category-selector__selected-list">
            {selectedCategories.map(categoryId => {
              const categoryInfo = getCategoryInfo(categoryId);
              if (!categoryInfo) return null;

              return (
                <div key={categoryId} className="category-selector__selected-item">
                  <span className="category-selector__selected-icon">
                    {categoryInfo.icon}
                  </span>
                  <span className="category-selector__selected-name">
                    {categoryInfo.name}
                  </span>
                  <button
                    type="button"
                    className="category-selector__selected-remove"
                    onClick={() => handleRemoveCategory(categoryId)}
                    disabled={disabled}
                    aria-label={`${categoryInfo.name}を削除`}
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="category-selector__categories">
        {filteredCategories.map(categoryInfo => {
          const isSelected = selectedCategories.includes(categoryInfo.id);
          const canSelect = !isSelected && !isAtMaxLimit;

          return (
            <div
              key={categoryInfo.id}
              className={`category-selector__category ${isSelected ? 'selected' : ''} ${!canSelect && !isSelected ? 'disabled' : ''}`}
              onClick={() => handleCategoryToggle(categoryInfo.id)}
            >
              <div className="category-selector__category-content">
                <span className="category-selector__category-icon">
                  {categoryInfo.icon}
                </span>
                <div className="category-selector__category-info">
                  <span className="category-selector__category-name">
                    {categoryInfo.name}
                  </span>
                  <span className="category-selector__category-description">
                    {categoryInfo.description}
                  </span>
                </div>
              </div>
              <div className="category-selector__category-checkbox">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => {}} // Handled by parent onClick
                  disabled={disabled || (!canSelect && !isSelected)}
                />
              </div>
            </div>
          );
        })}
      </div>

      {isAtMaxLimit && (
        <div className="category-selector__limit-message">
          最大{maxSelections}個まで選択できます
        </div>
      )}
    </div>
  );
};

export default CategorySelector;