import { useState, useEffect, useCallback } from 'react';
import { searchService, SearchResult, SearchSuggestion } from '../services/searchService';
import { DiscussionSearchFilters, DiscussionListItem } from '../types/discussion';
import { PostSearchFilters, PostListItem } from '../types/post';

interface UseSearchOptions {
  type: 'discussions' | 'posts';
  initialQuery?: string;
  initialFilters?: DiscussionSearchFilters | PostSearchFilters;
  autoSearch?: boolean;
  debounceMs?: number;
}

interface UseSearchReturn {
  // Search state
  query: string;
  filters: DiscussionSearchFilters | PostSearchFilters;
  results: SearchResult<DiscussionListItem | PostListItem>;
  suggestions: SearchSuggestion[];
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;

  // Search actions
  setQuery: (query: string) => void;
  setFilters: (filters: DiscussionSearchFilters | PostSearchFilters) => void;
  search: (query?: string, filters?: DiscussionSearchFilters | PostSearchFilters) => Promise<void>;
  loadMore: () => Promise<void>;
  clearResults: () => void;
  clearFilters: () => void;

  // Suggestions
  loadSuggestions: (query: string) => Promise<void>;
  clearSuggestions: () => void;

  // History
  searchHistory: any[];
  savedSearches: any[];
  saveCurrentSearch: (name: string) => Promise<void>;
  loadSavedSearches: () => Promise<void>;
}

export const useSearch = (options: UseSearchOptions): UseSearchReturn => {
  const {
    type,
    initialQuery = '',
    initialFilters = {},
    autoSearch = false,
    debounceMs = 300,
  } = options;

  // State
  const [query, setQueryState] = useState(initialQuery);
  const [filters, setFiltersState] = useState<DiscussionSearchFilters | PostSearchFilters>(
    initialFilters
  );
  const [results, setResults] = useState<SearchResult<DiscussionListItem | PostListItem>>({
    items: [],
    totalCount: 0,
    searchTime: 0,
    hasMore: false,
  });
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchHistory, setSearchHistory] = useState(searchService.getSearchHistory());
  const [savedSearches, setSavedSearches] = useState<any[]>([]);

  // Debounce timer
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  // Search function
  const search = useCallback(
    async (
      searchQuery?: string,
      searchFilters?: DiscussionSearchFilters | PostSearchFilters,
      loadMore: boolean = false
    ) => {
      const finalQuery = searchQuery ?? query;
      const finalFilters = searchFilters ?? filters;

      if (!finalQuery.trim() && Object.keys(finalFilters).length === 0) {
        setResults({
          items: [],
          totalCount: 0,
          searchTime: 0,
          hasMore: false,
        });
        return;
      }

      const isLoadingMoreData = loadMore && results.nextToken;
      setIsLoading(!isLoadingMoreData);
      setIsLoadingMore(isLoadingMoreData);
      setError(null);

      try {
        const searchOptions = {
          query: finalQuery.trim() || undefined,
          filters: finalFilters,
          pagination: {
            limit: 20,
            nextToken: isLoadingMoreData ? results.nextToken : undefined,
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

          // Update search history
          setSearchHistory(searchService.getSearchHistory());
        } else {
          setError(response.error?.message || 'Search failed');
          setResults({
            items: [],
            totalCount: 0,
            searchTime: 0,
            hasMore: false,
          });
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An error occurred during search';
        setError(errorMessage);
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
    },
    [query, filters, results.nextToken, type]
  );

  // Load more results
  const loadMore = useCallback(async () => {
    if (results.hasMore && !isLoadingMore) {
      await search(undefined, undefined, true);
    }
  }, [search, results.hasMore, isLoadingMore]);

  // Load suggestions
  const loadSuggestions = useCallback(
    async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setSuggestions([]);
        return;
      }

      try {
        const response = await searchService.getSearchSuggestions(searchQuery, type);
        if (response.success && response.data) {
          setSuggestions(response.data);
        }
      } catch (err) {
        console.error('Failed to load suggestions:', err);
      }
    },
    [type]
  );

  // Load saved searches
  const loadSavedSearches = useCallback(async () => {
    try {
      const response = await searchService.getSavedSearches();
      if (response.success && response.data) {
        setSavedSearches(response.data);
      }
    } catch (err) {
      console.error('Failed to load saved searches:', err);
    }
  }, []);

  // Save current search
  const saveCurrentSearch = useCallback(
    async (name: string) => {
      try {
        const response = await searchService.saveSearch({
          name,
          query: query || undefined,
          filters: Object.keys(filters).length > 0 ? filters : undefined,
          isActive: true,
        });

        if (response.success) {
          await loadSavedSearches();
        }
      } catch (err) {
        console.error('Failed to save search:', err);
      }
    },
    [query, filters, loadSavedSearches]
  );

  // Set query with debouncing
  const setQuery = useCallback(
    (newQuery: string) => {
      setQueryState(newQuery);

      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      if (autoSearch) {
        const timer = setTimeout(() => {
          if (newQuery.trim() || Object.keys(filters).length > 0) {
            search(newQuery, filters);
          }
        }, debounceMs);

        setDebounceTimer(timer);
      }

      // Load suggestions immediately
      loadSuggestions(newQuery);
    },
    [autoSearch, debounceMs, filters, search, loadSuggestions, debounceTimer]
  );

  // Set filters
  const setFilters = useCallback(
    (newFilters: DiscussionSearchFilters | PostSearchFilters) => {
      setFiltersState(newFilters);

      if (autoSearch) {
        search(query, newFilters);
      }
    },
    [autoSearch, query, search]
  );

  // Clear functions
  const clearResults = useCallback(() => {
    setResults({
      items: [],
      totalCount: 0,
      searchTime: 0,
      hasMore: false,
    });
    setError(null);
  }, []);

  const clearFilters = useCallback(() => {
    setFiltersState({});
    if (autoSearch && query) {
      search(query, {});
    }
  }, [autoSearch, query, search]);

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
  }, []);

  // Initial search
  useEffect(() => {
    if (autoSearch && (initialQuery || Object.keys(initialFilters).length > 0)) {
      search(initialQuery, initialFilters);
    }
  }, []);

  // Load saved searches on mount
  useEffect(() => {
    loadSavedSearches();
  }, [loadSavedSearches]);

  // Cleanup debounce timer
  useEffect(() => {
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [debounceTimer]);

  return {
    // State
    query,
    filters,
    results,
    suggestions,
    isLoading,
    isLoadingMore,
    error,

    // Actions
    setQuery,
    setFilters,
    search,
    loadMore,
    clearResults,
    clearFilters,

    // Suggestions
    loadSuggestions,
    clearSuggestions,

    // History
    searchHistory,
    savedSearches,
    saveCurrentSearch,
    loadSavedSearches,
  };
};
