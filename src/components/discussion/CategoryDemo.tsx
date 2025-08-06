import React from 'react';
import { DiscussionCategory } from '../../types/common';
import CategorySelector from './CategorySelector';
import CategoryFilter from './CategoryFilter';
import useCategories from '../../hooks/useCategories';
import './CategoryDemo.css';

export const CategoryDemo: React.FC = () => {
  const {
    selectedCategories,
    setCategories,
    validation,
    selectionStats,
    getSelectedCategoryNames,
  } = useCategories({
    maxSelections: 5,
    required: true,
  });

  const [filterCategories, setFilterCategories] = React.useState<DiscussionCategory[]>([]);

  // Mock category counts for filter demo
  const mockCategoryCounts: Record<DiscussionCategory, number> = {
    [DiscussionCategory.POLITICS]: 234,
    [DiscussionCategory.ECONOMY]: 189,
    [DiscussionCategory.SOCIETY]: 345,
    [DiscussionCategory.TECHNOLOGY]: 456,
    [DiscussionCategory.ENTERTAINMENT]: 123,
    [DiscussionCategory.SPORTS]: 78,
    [DiscussionCategory.OTHER]: 67,
  };

  return (
    <div className="category-demo">
      <div className="category-demo__header">
        <h1>カテゴリシステム デモ</h1>
        <p>議論プラットフォームのカテゴリ選択・フィルタリング機能のデモンストレーションです。</p>
      </div>

      <div className="category-demo__content">
        <div className="category-demo__section">
          <h2>カテゴリ選択（議論作成時）</h2>
          <div className="category-demo__selector">
            <CategorySelector
              selectedCategories={selectedCategories}
              onChange={setCategories}
              maxSelections={5}
              required={true}
            />
          </div>
          
          <div className="category-demo__info">
            <h3>選択状況</h3>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">選択数:</span>
                <span className="info-value">
                  {selectionStats.selectedCount} / {selectionStats.maxSelections}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">バリデーション:</span>
                <span className={`info-value ${validation.isValid ? 'valid' : 'invalid'}`}>
                  {validation.isValid ? '✓ 有効' : '✗ 無効'}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">残り選択可能数:</span>
                <span className="info-value">{selectionStats.remainingSelections}</span>
              </div>
            </div>
            
            {selectedCategories.length > 0 && (
              <div className="selected-categories">
                <h4>選択されたカテゴリ:</h4>
                <ul>
                  {getSelectedCategoryNames.map((name, index) => (
                    <li key={index}>{name}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {!validation.isValid && (
              <div className="validation-errors">
                <h4>エラー:</h4>
                <ul>
                  {validation.errors.map((error, index) => (
                    <li key={index} className="error">{error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        <div className="category-demo__section">
          <h2>カテゴリフィルター（議論一覧時）</h2>
          <div className="category-demo__filters">
            <div className="filter-section">
              <h3>通常版</h3>
              <CategoryFilter
                selectedCategories={filterCategories}
                onChange={setFilterCategories}
                showCounts={true}
                categoryCounts={mockCategoryCounts}
              />
            </div>
            
            <div className="filter-section">
              <h3>コンパクト版</h3>
              <CategoryFilter
                selectedCategories={filterCategories}
                onChange={setFilterCategories}
                showCounts={true}
                categoryCounts={mockCategoryCounts}
                compact={true}
              />
            </div>
          </div>
          
          <div className="category-demo__filter-info">
            <h3>フィルター状況</h3>
            <div className="info-item">
              <span className="info-label">選択中のフィルター:</span>
              <span className="info-value">{filterCategories.length} 個</span>
            </div>
            {filterCategories.length > 0 && (
              <div className="selected-filters">
                <h4>適用中のフィルター:</h4>
                <div className="filter-tags">
                  {filterCategories.map(categoryId => {
                    const count = mockCategoryCounts[categoryId] || 0;
                    return (
                      <span key={categoryId} className="filter-tag">
                        {categoryId} ({count})
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CategoryDemo;