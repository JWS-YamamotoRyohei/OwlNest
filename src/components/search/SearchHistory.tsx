import React, { useState } from 'react';
import { SearchHistoryItem, SavedSearch } from '../../services/searchService';
import './SearchHistory.css';

interface SearchHistoryProps {
  searchHistory: SearchHistoryItem[];
  savedSearches: SavedSearch[];
  onHistorySelect: (item: SearchHistoryItem) => void;
  onSavedSearchSelect: (search: SavedSearch) => void;
  onHistoryDelete: (id: string) => void;
  onSavedSearchDelete: (id: string) => void;
  onSavedSearchUpdate: (id: string, updates: Partial<SavedSearch>) => void;
  onClearHistory: () => void;
  isLoading?: boolean;
}

export const SearchHistory: React.FC<SearchHistoryProps> = ({
  searchHistory,
  savedSearches,
  onHistorySelect,
  onSavedSearchSelect,
  onHistoryDelete,
  onSavedSearchDelete,
  onSavedSearchUpdate,
  onClearHistory,
  isLoading = false,
}) => {
  const [activeTab, setActiveTab] = useState<'history' | 'saved'>('history');
  const [editingSearch, setEditingSearch] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return '今日';
    } else if (diffDays === 1) {
      return '昨日';
    } else if (diffDays < 7) {
      return `${diffDays}日前`;
    } else {
      return date.toLocaleDateString('ja-JP');
    }
  };

  const formatFilters = (filters?: Record<string, any>): string => {
    if (!filters) return '';

    const filterParts: string[] = [];

    if (filters.categories?.length) {
      filterParts.push(`カテゴリ: ${filters.categories.length}件`);
    }
    if (filters.ownerStance || filters.stance) {
      filterParts.push(`スタンス: ${filters.ownerStance || filters.stance}`);
    }
    if (filters.createdAfter || filters.createdBefore) {
      filterParts.push('日付範囲指定');
    }
    if (filters.isActive !== undefined) {
      filterParts.push(filters.isActive ? 'アクティブのみ' : '非アクティブのみ');
    }

    return filterParts.join(', ');
  };

  const handleEditStart = (search: SavedSearch) => {
    setEditingSearch(search.id);
    setEditName(search.name);
  };

  const handleEditSave = (id: string) => {
    if (editName.trim()) {
      onSavedSearchUpdate(id, { name: editName.trim() });
    }
    setEditingSearch(null);
    setEditName('');
  };

  const handleEditCancel = () => {
    setEditingSearch(null);
    setEditName('');
  };

  const renderHistoryTab = () => (
    <div className="search-history__tab-content">
      {searchHistory.length === 0 ? (
        <div className="search-history__empty">
          <div className="search-history__empty-icon">🕒</div>
          <div className="search-history__empty-text">検索履歴がありません</div>
        </div>
      ) : (
        <>
          <div className="search-history__header">
            <h3>検索履歴</h3>
            <button
              className="search-history__clear-button"
              onClick={onClearHistory}
              disabled={isLoading}
            >
              すべて削除
            </button>
          </div>

          <div className="search-history__list">
            {searchHistory.map(item => (
              <div key={item.id} className="search-history__item">
                <button
                  className="search-history__item-content"
                  onClick={() => onHistorySelect(item)}
                  disabled={isLoading}
                >
                  <div className="search-history__item-main">
                    <div className="search-history__item-query">{item.query}</div>
                    <div className="search-history__item-meta">
                      <span className="search-history__item-date">
                        {formatDate(item.timestamp)}
                      </span>
                      <span className="search-history__item-results">
                        {item.resultCount.toLocaleString()}件
                      </span>
                      {item.filters && (
                        <span className="search-history__item-filters">
                          {formatFilters(item.filters)}
                        </span>
                      )}
                    </div>
                  </div>
                </button>

                <button
                  className="search-history__item-delete"
                  onClick={() => onHistoryDelete(item.id)}
                  disabled={isLoading}
                  aria-label="削除"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );

  const renderSavedTab = () => (
    <div className="search-history__tab-content">
      {savedSearches.length === 0 ? (
        <div className="search-history__empty">
          <div className="search-history__empty-icon">⭐</div>
          <div className="search-history__empty-text">保存された検索がありません</div>
          <div className="search-history__empty-description">
            検索条件を保存すると、ここに表示されます
          </div>
        </div>
      ) : (
        <>
          <div className="search-history__header">
            <h3>保存された検索</h3>
          </div>

          <div className="search-history__list">
            {savedSearches.map(search => (
              <div key={search.id} className="search-history__saved-item">
                <button
                  className="search-history__saved-content"
                  onClick={() => onSavedSearchSelect(search)}
                  disabled={isLoading}
                >
                  <div className="search-history__saved-main">
                    {editingSearch === search.id ? (
                      <div className="search-history__edit-form">
                        <input
                          type="text"
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          className="search-history__edit-input"
                          autoFocus
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              handleEditSave(search.id);
                            } else if (e.key === 'Escape') {
                              handleEditCancel();
                            }
                          }}
                        />
                        <div className="search-history__edit-actions">
                          <button
                            className="search-history__edit-save"
                            onClick={() => handleEditSave(search.id)}
                            disabled={!editName.trim()}
                          >
                            保存
                          </button>
                          <button
                            className="search-history__edit-cancel"
                            onClick={handleEditCancel}
                          >
                            キャンセル
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="search-history__saved-name">{search.name}</div>
                        <div className="search-history__saved-meta">
                          {search.query && (
                            <span className="search-history__saved-query">「{search.query}」</span>
                          )}
                          {search.filters && (
                            <span className="search-history__saved-filters">
                              {formatFilters(search.filters)}
                            </span>
                          )}
                          <span className="search-history__saved-date">
                            {formatDate(search.createdAt)}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </button>

                {editingSearch !== search.id && (
                  <div className="search-history__saved-actions">
                    <button
                      className="search-history__saved-edit"
                      onClick={() => handleEditStart(search)}
                      disabled={isLoading}
                      aria-label="編集"
                    >
                      ✏️
                    </button>
                    <button
                      className="search-history__saved-delete"
                      onClick={() => onSavedSearchDelete(search.id)}
                      disabled={isLoading}
                      aria-label="削除"
                    >
                      🗑️
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="search-history">
      <div className="search-history__tabs">
        <button
          className={`search-history__tab ${
            activeTab === 'history' ? 'search-history__tab--active' : ''
          }`}
          onClick={() => setActiveTab('history')}
        >
          履歴 ({searchHistory.length})
        </button>
        <button
          className={`search-history__tab ${
            activeTab === 'saved' ? 'search-history__tab--active' : ''
          }`}
          onClick={() => setActiveTab('saved')}
        >
          保存済み ({savedSearches.length})
        </button>
      </div>

      {activeTab === 'history' ? renderHistoryTab() : renderSavedTab()}
    </div>
  );
};
