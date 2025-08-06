import React, { useState, useRef, useEffect } from 'react';
import { SearchSuggestion } from '../../services/searchService';
import './SearchBar.css';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: (query: string) => void;
  placeholder?: string;
  suggestions?: SearchSuggestion[];
  isLoading?: boolean;
  showHistory?: boolean;
  searchHistory?: Array<{ query: string; timestamp: string }>;
  onSuggestionSelect?: (suggestion: SearchSuggestion) => void;
  onHistorySelect?: (query: string) => void;
  className?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  onSearch,
  placeholder = '議論や投稿を検索...',
  suggestions = [],
  isLoading = false,
  showHistory = true,
  searchHistory = [],
  onSuggestionSelect,
  onHistorySelect,
  className = ''
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setShowDropdown(newValue.length > 0 || (showHistory && searchHistory.length > 0));
  };

  const handleInputFocus = () => {
    setIsFocused(true);
    setShowDropdown(value.length > 0 || (showHistory && searchHistory.length > 0));
  };

  const handleInputBlur = () => {
    // Delay hiding dropdown to allow clicks on suggestions
    setTimeout(() => {
      setIsFocused(false);
      setShowDropdown(false);
    }, 200);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (value.trim()) {
        onSearch(value.trim());
        setShowDropdown(false);
        inputRef.current?.blur();
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
      inputRef.current?.blur();
    }
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    if (suggestion.type === 'query') {
      onChange(suggestion.value);
      onSearch(suggestion.value);
    } else {
      onSuggestionSelect?.(suggestion);
    }
    setShowDropdown(false);
    inputRef.current?.blur();
  };

  const handleHistoryClick = (query: string) => {
    onChange(query);
    onHistorySelect?.(query);
    setShowDropdown(false);
    inputRef.current?.blur();
  };

  const handleSearchClick = () => {
    if (value.trim()) {
      onSearch(value.trim());
      setShowDropdown(false);
      inputRef.current?.blur();
    }
  };

  const getSuggestionIcon = (type: SearchSuggestion['type']) => {
    switch (type) {
      case 'query': return '🔍';
      case 'category': return '📁';
      case 'user': return '👤';
      case 'tag': return '🏷️';
      default: return '🔍';
    }
  };

  const getSuggestionTypeLabel = (type: SearchSuggestion['type']) => {
    switch (type) {
      case 'query': return 'クエリ';
      case 'category': return 'カテゴリ';
      case 'user': return 'ユーザー';
      case 'tag': return 'タグ';
      default: return '';
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`search-bar ${className}`}>
      <div className="search-bar__input-container">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`search-bar__input ${isFocused ? 'search-bar__input--focused' : ''}`}
          disabled={isLoading}
        />
        
        <button
          className="search-bar__search-button"
          onClick={handleSearchClick}
          disabled={isLoading || !value.trim()}
          aria-label="検索"
        >
          {isLoading ? (
            <span className="search-bar__loading">⏳</span>
          ) : (
            <span className="search-bar__search-icon">🔍</span>
          )}
        </button>
      </div>

      {showDropdown && (
        <div ref={dropdownRef} className="search-bar__dropdown">
          {/* Search suggestions */}
          {suggestions.length > 0 && (
            <div className="search-bar__section">
              <div className="search-bar__section-title">検索候補</div>
              {suggestions.map((suggestion, index) => (
                <button
                  key={`suggestion-${index}`}
                  className="search-bar__suggestion"
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  <span className="search-bar__suggestion-icon">
                    {getSuggestionIcon(suggestion.type)}
                  </span>
                  <span className="search-bar__suggestion-content">
                    <span className="search-bar__suggestion-label">
                      {suggestion.label}
                    </span>
                    {suggestion.type !== 'query' && (
                      <span className="search-bar__suggestion-type">
                        {getSuggestionTypeLabel(suggestion.type)}
                      </span>
                    )}
                    {suggestion.count && (
                      <span className="search-bar__suggestion-count">
                        ({suggestion.count})
                      </span>
                    )}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Search history */}
          {showHistory && searchHistory.length > 0 && (
            <div className="search-bar__section">
              <div className="search-bar__section-title">検索履歴</div>
              {searchHistory.slice(0, 5).map((item, index) => (
                <button
                  key={`history-${index}`}
                  className="search-bar__history-item"
                  onClick={() => handleHistoryClick(item.query)}
                >
                  <span className="search-bar__history-icon">🕒</span>
                  <span className="search-bar__history-query">{item.query}</span>
                  <span className="search-bar__history-time">
                    {new Date(item.timestamp).toLocaleDateString('ja-JP')}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* No results */}
          {suggestions.length === 0 && searchHistory.length === 0 && value.trim() && (
            <div className="search-bar__no-results">
              検索候補が見つかりません
            </div>
          )}
        </div>
      )}
    </div>
  );
};