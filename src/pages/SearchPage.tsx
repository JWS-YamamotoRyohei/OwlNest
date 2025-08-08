import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { SearchBar } from '../components/search/SearchBar';
import { AdvancedSearchFilters } from '../components/search/AdvancedSearchFilters';
import { SearchResults } from '../components/search/SearchResults';
import { SearchHistory } from '../components/search/SearchHistory';
import { searchService, SearchResult, SearchSuggestion } from '../services/searchService';
import { DiscussionSearchFilters, DiscussionListItem } from '../types/discussion';
import { PostSearchFilters, PostListItem } from '../types/post';
import { DiscussionCategory, Stance } from '../types/common';
import './SearchPage.css';

export const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Search state
  const [searchType, setSearchType] = useState<'discussions' | 'posts'>('discussions');
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<DiscussionSearchFilters | PostSearchFilters>({});
  const [results, setResults] = useState<SearchResult<DiscussionListItem | PostListItem>>({
    items: [],
    totalCount: 0,
    searchTime: 0,
    hasMore: false,
  });
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // History state
  const [searchHistory, setSearchHistory] = useState(searchService.getSearchHistory());
  const [savedSearches, setSavedSearches] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  // 初期ロード用（安定参照）
  const performInitialSearch = useCallback(
    (searchQuery: string, type: 'discussions' | 'posts', searchFilters: any) => {
      performSearchCore(searchQuery, type, searchFilters, false);
    },
    [] // ← 依存なしで安定
  );

  // Initialize from URL params
  useEffect(() => {
    const urlQuery = searchParams.get('q') || '';
    const urlType = (searchParams.get('type') as 'discussions' | 'posts') || 'discussions';
    const urlFilters = searchParams.get('filters');

    setQuery(urlQuery);
    setSearchType(urlType);

    if (urlFilters) {
      try {
        setFilters(JSON.parse(decodeURIComponent(urlFilters)));
      } catch (error) {
        console.warn('Failed to parse filters from URL:', error);
      }
    }
  }, [searchParams]);

  // Load saved searches
  useEffect(() => {
    loadSavedSearches();
  }, []);

  // Perform initial search when URL params change
  useEffect(() => {
    const urlQuery = searchParams.get('q') || '';
    const urlType = (searchParams.get('type') as 'discussions' | 'posts') || 'discussions';
    const urlFilters = searchParams.get('filters');

    if (urlQuery) {
      const parsedFilters = urlFilters
        ? (() => {
            try {
              return JSON.parse(decodeURIComponent(urlFilters));
            } catch {
              return {};
            }
          })()
        : {};
      performInitialSearch(urlQuery, urlType, parsedFilters);
    }
  }, [searchParams, performInitialSearch]);
  
  const updateURL = useCallback(
    (newQuery: string, newType: string, newFilters: any) => {
      const params = new URLSearchParams();
      if (newQuery) params.set('q', newQuery);
      if (newType !== 'discussions') params.set('type', newType);
      if (Object.keys(newFilters).length > 0) {
        params.set('filters', encodeURIComponent(JSON.stringify(newFilters)));
      }
      setSearchParams(params);
    },
    [setSearchParams]
  );

  // 共通のコア関数（依存なし）
  const performSearchCore = async (
    searchQuery: string,
    type: 'discussions' | 'posts',
    searchFilters: any,
    loadMore: boolean,
    nextToken?: string
  ) => {
    if (!searchQuery.trim() && Object.keys(searchFilters).length === 0) {
      return;
    }

    const isLoadingMoreData = loadMore && !!nextToken;
    setIsLoading(!isLoadingMoreData);
    setIsLoadingMore(isLoadingMoreData);

    try {
      const searchOptions = {
        query: searchQuery.trim() || undefined,
        filters: searchFilters,
        pagination: {
          limit: 20,
          nextToken: isLoadingMoreData ? nextToken : undefined,
        },
        facets: true,
        highlight: true,
      };

      const response =
        type === 'discussions'
          ? await searchService.searchDiscussions(searchOptions)
          : await searchService.searchPosts(searchOptions);

      if (response.success && response.data) {
        if (isLoadingMoreData) {
          setResults(prev => ({
            ...response.data!,
            items: [...prev.items, ...response.data!.items],
          }));
        } else {
          setResults(response.data);
        }
      } else {
        console.error('Search failed:', response.error);
        setResults({
          items: [],
          totalCount: 0,
          searchTime: 0,
          hasMore: false,
        });
      }
    } catch (error) {
      console.error('Search error:', error);
      setResults({
        items: [],
        totalCount: 0,
        searchTime: 0,
        hasMore: false,
      });
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  // ユーザー操作用
  const performSearch = useCallback(
    (
      searchQuery: string,
      type: 'discussions' | 'posts' = searchType,
      searchFilters: any = filters,
      loadMore = false
    ) => {
      performSearchCore(searchQuery, type, searchFilters, loadMore, results.nextToken);
    },
    [searchType, filters, results.nextToken]
  );

  const loadSuggestions = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setSuggestions([]);
      return;
    }

    try {
      const response = await searchService.getSearchSuggestions(searchQuery, searchType);
      if (response.success && response.data) {
        setSuggestions(response.data);
      }
    } catch (error) {
      console.error('Failed to load suggestions:', error);
    }
  };

  const loadSavedSearches = async () => {
    try {
      const response = await searchService.getSavedSearches();
      if (response.success && response.data) {
        setSavedSearches(response.data);
      }
    } catch (error) {
      console.error('Failed to load saved searches:', error);
    }
  };

  // Event handlers
  const handleSearch = (searchQuery: string) => {
    setQuery(searchQuery);
    updateURL(searchQuery, searchType, filters);
    performSearch(searchQuery, searchType, filters);
    setShowHistory(false);
  };

  const handleQueryChange = (newQuery: string) => {
    setQuery(newQuery);
    loadSuggestions(newQuery);
  };

  const handleTypeChange = (newType: 'discussions' | 'posts') => {
    setSearchType(newType);
    setFilters({});
    updateURL(query, newType, {});
    if (query) {
      performSearch(query, newType, {});
    }
  };

  const handleFiltersChange = (newFilters: DiscussionSearchFilters | PostSearchFilters) => {
    setFilters(newFilters);
    updateURL(query, searchType, newFilters);
    performSearch(query, searchType, newFilters);
  };

  const handleFiltersClear = () => {
    setFilters({});
    updateURL(query, searchType, {});
    performSearch(query, searchType, {});
  };

  const handleLoadMore = () => {
    if (results.hasMore && !isLoadingMore) {
      performSearch(query, searchType, filters, true);
    }
  };

  const handleSuggestionSelect = (suggestion: SearchSuggestion) => {
    if (suggestion.type === 'category' && searchType === 'discussions') {
      const discussionFilters = filters as DiscussionSearchFilters;
      const categoryValue = suggestion.value as DiscussionCategory;
      const newFilters = {
        ...discussionFilters,
        categories: [...(discussionFilters.categories || []), categoryValue],
      };
      setFilters(newFilters);
      updateURL(query, searchType, newFilters);
      performSearch(query, searchType, newFilters);
    } else if (suggestion.type === 'user') {
      const newFilters = {
        ...filters,
        [searchType === 'discussions' ? 'ownerId' : 'authorId']: suggestion.value,
      };
      setFilters(newFilters);
      updateURL(query, searchType, newFilters);
      performSearch(query, searchType, newFilters);
    }
  };

  const handleHistorySelect = (item: any) => {
    setQuery(item.query);
    if (item.filters) {
      setFilters(item.filters);
    }
    updateURL(item.query, searchType, item.filters || {});
    performSearch(item.query, searchType, item.filters || {});
    setShowHistory(false);
  };

  const handleSavedSearchSelect = (search: any) => {
    if (search.query) {
      setQuery(search.query);
    }
    if (search.filters) {
      setFilters(search.filters);
    }
    updateURL(search.query || '', searchType, search.filters || {});
    performSearch(search.query || '', searchType, search.filters || {});
    setShowHistory(false);
  };

  const handleSaveSearch = async (name: string) => {
    try {
      const response = await searchService.saveSearch({
        name,
        query: query || undefined,
        filters: Object.keys(filters).length > 0 ? filters : undefined,
        isActive: true,
      });

      if (response.success) {
        loadSavedSearches();
      }
    } catch (error) {
      console.error('Failed to save search:', error);
    }
  };

  const handleHistoryDelete = (id: string) => {
    searchService.removeFromSearchHistory(id);
    setSearchHistory(searchService.getSearchHistory());
  };

  const handleClearHistory = () => {
    searchService.clearSearchHistory();
    setSearchHistory([]);
  };

  const handleSavedSearchDelete = async (id: string) => {
    try {
      const response = await searchService.deleteSavedSearch(id);
      if (response.success) {
        loadSavedSearches();
      }
    } catch (error) {
      console.error('Failed to delete saved search:', error);
    }
  };

  const handleSavedSearchUpdate = async (id: string, updates: any) => {
    try {
      const response = await searchService.updateSavedSearch(id, updates);
      if (response.success) {
        loadSavedSearches();
      }
    } catch (error) {
      console.error('Failed to update saved search:', error);
    }
  };

  const handleItemClick = (item: DiscussionListItem | PostListItem) => {
    if ('discussionId' in item && 'postId' in item) {
      // Post item
      navigate(`/discussions/${item.discussionId}?post=${item.postId}`);
    } else if ('discussionId' in item) {
      // Discussion item
      navigate(`/discussions/${item.discussionId}`);
    }
  };

  const handleFacetClick = (facetType: string, facetValue: string) => {
    let newFilters = { ...filters };

    if (facetType === 'category' && searchType === 'discussions') {
      const discussionFilters = newFilters as DiscussionSearchFilters;
      const categories = discussionFilters.categories || [];
      const categoryValue = facetValue as DiscussionCategory;
      if (!categories.includes(categoryValue)) {
        newFilters = {
          ...discussionFilters,
          categories: [...categories, categoryValue],
        };
      }
    } else if (facetType === 'stance') {
      const stanceValue = facetValue as Stance;
      newFilters = {
        ...newFilters,
        [searchType === 'discussions' ? 'ownerStance' : 'stance']: stanceValue,
      };
    } else if (facetType === 'author') {
      newFilters = {
        ...newFilters,
        [searchType === 'discussions' ? 'ownerId' : 'authorId']: facetValue,
      };
    }

    setFilters(newFilters);
    updateURL(query, searchType, newFilters);
    performSearch(query, searchType, newFilters);
  };

  return (
    <div className="search-page">
      <div className="search-page__header">
        <h1 className="search-page__title">検索</h1>

        {/* Search Type Toggle */}
        <div className="search-page__type-toggle">
          <button
            className={`search-page__type-button ${
              searchType === 'discussions' ? 'search-page__type-button--active' : ''
            }`}
            onClick={() => handleTypeChange('discussions')}
          >
            議論を検索
          </button>
          <button
            className={`search-page__type-button ${
              searchType === 'posts' ? 'search-page__type-button--active' : ''
            }`}
            onClick={() => handleTypeChange('posts')}
          >
            投稿を検索
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="search-page__search-bar">
        <SearchBar
          value={query}
          onChange={handleQueryChange}
          onSearch={handleSearch}
          suggestions={suggestions}
          isLoading={isLoading}
          searchHistory={searchHistory}
          onSuggestionSelect={handleSuggestionSelect}
          onHistorySelect={q => handleHistorySelect({ query: q, filters: {} })}
          placeholder={`${searchType === 'discussions' ? '議論' : '投稿'}を検索...`}
        />

        <button
          className="search-page__history-toggle"
          onClick={() => setShowHistory(!showHistory)}
        >
          履歴 {showHistory ? '▼' : '▶'}
        </button>
      </div>

      {/* Search History */}
      {showHistory && (
        <div className="search-page__history">
          <SearchHistory
            searchHistory={searchHistory}
            savedSearches={savedSearches}
            onHistorySelect={handleHistorySelect}
            onSavedSearchSelect={handleSavedSearchSelect}
            onHistoryDelete={handleHistoryDelete}
            onSavedSearchDelete={handleSavedSearchDelete}
            onSavedSearchUpdate={handleSavedSearchUpdate}
            onClearHistory={handleClearHistory}
          />
        </div>
      )}

      {/* Advanced Filters */}
      <AdvancedSearchFilters
        type={searchType}
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onClear={handleFiltersClear}
        onSave={handleSaveSearch}
        isLoading={isLoading}
      />

      {/* Search Results */}
      <SearchResults
        type={searchType}
        results={results}
        query={query}
        isLoading={isLoading || isLoadingMore}
        onLoadMore={handleLoadMore}
        onItemClick={handleItemClick}
        onFacetClick={handleFacetClick}
        highlightQuery={true}
      />
    </div>
  );
};
