import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SearchSuggestion, searchService } from '../../services/searchService';
import './SearchAutocomplete.css';

interface SearchAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (suggestion: SearchSuggestion) => void;
  type?: 'discussions' | 'posts' | 'all';
  placeholder?: string;
  disabled?: boolean;
  debounceMs?: number;
  maxSuggestions?: number;
  className?: string;
}

export const SearchAutocomplete: React.FC<SearchAutocompleteProps> = ({
  value,
  onChange,
  onSelect,
  type = 'all',
  placeholder = '検索...',
  disabled = false,
  debounceMs = 300,
  maxSuggestions = 8,
  className = '',
}) => {
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Debounced suggestion loading
  const loadSuggestions = useCallback(
    async (query: string) => {
      if (!query.trim() || query.length < 2) {
        setSuggestions([]);
        setIsLoading(false);
        return;
      }

      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();
      setIsLoading(true);

      try {
        const response = await searchService.getSearchSuggestions(query, type);

        if (response.success && response.data) {
          setSuggestions(response.data.slice(0, maxSuggestions));
        } else {
          setSuggestions([]);
        }
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('Failed to load suggestions:', error);
          setSuggestions([]);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [type, maxSuggestions]
  );

  // Handle input change with debouncing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setSelectedIndex(-1);

    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Set new debounce
    debounceRef.current = setTimeout(() => {
      loadSuggestions(newValue);
    }, debounceMs);
  };

  // Handle input focus
  const handleInputFocus = () => {
    setShowSuggestions(true);
    if (value.length >= 2 && suggestions.length === 0 && !isLoading) {
      loadSuggestions(value);
    }
  };

  // Handle input blur
  const handleInputBlur = () => {
    // Delay hiding to allow suggestion clicks
    setTimeout(() => {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }, 200);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) {
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
        break;

      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;

      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSuggestionSelect(suggestions[selectedIndex]);
        }
        break;

      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion: SearchSuggestion) => {
    onSelect(suggestion);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    inputRef.current?.blur();
  };

  // Get suggestion icon
  const getSuggestionIcon = (type: SearchSuggestion['type']) => {
    switch (type) {
      case 'query':
        return '🔍';
      case 'category':
        return '📁';
      case 'user':
        return '👤';
      case 'tag':
        return '🏷️';
      default:
        return '🔍';
    }
  };

  // Get suggestion type label
  const getSuggestionTypeLabel = (type: SearchSuggestion['type']) => {
    switch (type) {
      case 'query':
        return 'クエリ';
      case 'category':
        return 'カテゴリ';
      case 'user':
        return 'ユーザー';
      case 'tag':
        return 'タグ';
      default:
        return '';
    }
  };

  // Highlight matching text
  const highlightMatch = (text: string, query: string): React.ReactNode => {
    if (!query.trim()) return text;

    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, index) =>
      regex.test(part) ? (
        <mark key={index} className="search-autocomplete__highlight">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return (
    <div className={`search-autocomplete ${className}`}>
      <div className="search-autocomplete__input-container">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="search-autocomplete__input"
          autoComplete="off"
          spellCheck="false"
        />

        {isLoading && (
          <div className="search-autocomplete__loading">
            <span className="search-autocomplete__loading-spinner">⏳</span>
          </div>
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="search-autocomplete__suggestions"
          role="listbox"
          aria-label="検索候補"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={`${suggestion.type}-${suggestion.value}-${index}`}
              className={`search-autocomplete__suggestion ${
                index === selectedIndex ? 'search-autocomplete__suggestion--selected' : ''
              }`}
              onClick={() => handleSuggestionSelect(suggestion)}
              role="option"
              aria-selected={index === selectedIndex}
            >
              <span className="search-autocomplete__suggestion-icon">
                {getSuggestionIcon(suggestion.type)}
              </span>

              <div className="search-autocomplete__suggestion-content">
                <div className="search-autocomplete__suggestion-text">
                  {highlightMatch(suggestion.label, value)}
                </div>

                {suggestion.type !== 'query' && (
                  <div className="search-autocomplete__suggestion-type">
                    {getSuggestionTypeLabel(suggestion.type)}
                  </div>
                )}
              </div>

              {suggestion.count && (
                <div className="search-autocomplete__suggestion-count">
                  {suggestion.count.toLocaleString()}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
