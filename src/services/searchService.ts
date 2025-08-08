import { ApiResponse, PaginationOptions } from '../types/common';
import { DiscussionListItem } from '../types/discussion';
import { PostListItem } from '../types/post';
import { searchPerformanceMonitor, QueryOptimizer } from '../utils/searchPerformance';
import { apiService } from './api';
import { searchCache, suggestionCache, popularSearchCache } from './searchCache';

/**
 * Search service for discussions and posts
 */

// Search result types
export interface SearchResult<T> {
  items: T[];
  totalCount: number;
  searchTime: number;
  hasMore: boolean;
  nextToken?: string;
  facets?: SearchFacets;
}

export interface SearchFacets {
  categories: Array<{ category: string; count: number }>;
  stances: Array<{ stance: string; count: number }>;
  authors: Array<{ authorId: string; authorName: string; count: number }>;
  dateRanges: Array<{ range: string; count: number }>;
}

// Search options
export interface SearchOptions {
  query?: string;
  filters?: Record<string, any>;
  sort?: {
    field: string;
    direction: 'asc' | 'desc';
  };
  pagination?: PaginationOptions;
  facets?: boolean;
  highlight?: boolean;
}

// Search history
export interface SearchHistoryItem {
  id: string;
  query: string;
  filters?: Record<string, any>;
  timestamp: string;
  resultCount: number;
}

// Saved search
export interface SavedSearch {
  id: string;
  name: string;
  query?: string;
  filters?: Record<string, any>;
  sort?: {
    field: string;
    direction: 'asc' | 'desc';
  };
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

// Search suggestions
export interface SearchSuggestion {
  type: 'query' | 'category' | 'user' | 'tag';
  value: string;
  label: string;
  count?: number;
}

class SearchService {
  private searchHistory: SearchHistoryItem[] = [];
  private savedSearches: SavedSearch[] = [];

  /**
   * Search discussions with full-text search and filtering
   */
  async searchDiscussions(
    options: SearchOptions
  ): Promise<ApiResponse<SearchResult<DiscussionListItem>>> {
    const endTiming = searchPerformanceMonitor.startTiming('searchDiscussions');

    try {
      const startTime = Date.now();

      // Normalize query for better caching
      const normalizedQuery = options.query
        ? QueryOptimizer.normalizeQuery(options.query)
        : undefined;
      const optimizedOptions = { ...options, query: normalizedQuery };

      // Check cache first (only for first page)
      if (!options.pagination?.nextToken) {
        const cached = searchCache.get<SearchResult<DiscussionListItem>>(
          'discussions',
          normalizedQuery,
          options.filters,
          options.sort
        );

        if (cached) {
          searchPerformanceMonitor.recordCacheHit();
          console.log('Cache hit for discussions search');
          endTiming({ cached: true, resultCount: cached.totalCount });
          return {
            success: true,
            data: {
              ...cached,
              searchTime: Date.now() - startTime,
            },
          };
        } else {
          searchPerformanceMonitor.recordCacheMiss();
        }
      }

      const response = await apiService.post<SearchResult<DiscussionListItem>>(
        '/search/discussions',
        {
          ...optimizedOptions,
          timestamp: startTime,
        }
      );

      if (response.success && response.data) {
        // Cache the results (only first page)
        if (!options.pagination?.nextToken) {
          searchCache.set(
            'discussions',
            response.data,
            normalizedQuery,
            options.filters,
            options.sort
          );
        }

        // Add to search history if there's a query
        if (options.query) {
          this.addToSearchHistory({
            query: options.query,
            filters: options.filters,
            resultCount: response.data.totalCount,
          });
        }

        // Calculate search time
        response.data.searchTime = Date.now() - startTime;

        endTiming({
          cached: false,
          resultCount: response.data.totalCount,
          hasFilters: Object.keys(options.filters || {}).length > 0,
        });
      } else {
        searchPerformanceMonitor.recordError();
        endTiming({ success: false, error: response.message });
      }

      return response;
    } catch (error) {
      searchPerformanceMonitor.recordError();
      console.error('Error searching discussions:', error);
      endTiming({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {
        success: false,
        error: {
          code: 'SEARCH_ERROR',
          message: 'Failed to search discussions',
        },
      };
    }
  }

  /**
   * Search posts with full-text search and filtering
   */
  async searchPosts(options: SearchOptions): Promise<ApiResponse<SearchResult<PostListItem>>> {
    try {
      const startTime = Date.now();

      // Check cache first (only for first page)
      if (!options.pagination?.nextToken) {
        const cached = searchCache.get<SearchResult<PostListItem>>(
          'posts',
          options.query,
          options.filters,
          options.sort
        );

        if (cached) {
          console.log('Cache hit for posts search');
          return {
            success: true,
            data: {
              ...cached,
              searchTime: Date.now() - startTime,
            },
          };
        }
      }

      const response = await apiService.post<SearchResult<PostListItem>>('/search/posts', {
        ...options,
        timestamp: startTime,
      });

      if (response.success && response.data) {
        // Cache the results (only first page)
        if (!options.pagination?.nextToken) {
          searchCache.set('posts', response.data, options.query, options.filters, options.sort);
        }

        // Add to search history if there's a query
        if (options.query) {
          this.addToSearchHistory({
            query: options.query,
            filters: options.filters,
            resultCount: response.data.totalCount,
          });
        }

        // Calculate search time
        response.data.searchTime = Date.now() - startTime;
      }

      return response;
    } catch (error) {
      console.error('Error searching posts:', error);
      return {
        success: false,
        error: {
          code: 'SEARCH_ERROR',
          message: 'Failed to search posts',
        },
      };
    }
  }

  /**
   * Get search suggestions based on partial query
   */
  async getSearchSuggestions(
    query: string,
    type?: 'discussions' | 'posts' | 'all'
  ): Promise<ApiResponse<SearchSuggestion[]>> {
    try {
      // Check cache first
      const cached = suggestionCache.get(query, type);
      if (cached) {
        console.log('Cache hit for suggestions');
        return {
          success: true,
          data: cached,
        };
      }

      const response = await apiService.get<SearchSuggestion[]>('/search/suggestions', {
        params: { query, type },
      });

      if (response.success && response.data) {
        // Cache the suggestions
        suggestionCache.set(query, response.data, type);
      }

      return response;
    } catch (error) {
      console.error('Error getting search suggestions:', error);
      return {
        success: false,
        error: {
          code: 'SUGGESTIONS_ERROR',
          message: 'Failed to get search suggestions',
        },
      };
    }
  }

  /**
   * Get popular search queries
   */
  async getPopularSearches(
    type?: 'discussions' | 'posts' | 'all',
    limit: number = 10
  ): Promise<ApiResponse<Array<{ query: string; count: number }>>> {
    try {
      // Check cache first
      const cached = popularSearchCache.get();
      if (cached) {
        console.log('Cache hit for popular searches');
        return {
          success: true,
          data: cached.slice(0, limit),
        };
      }

      const response = await apiService.get<Array<{ query: string; count: number }>>(
        '/search/popular',
        {
          params: { type, limit },
        }
      );

      if (response.success && response.data) {
        // Cache the popular searches
        popularSearchCache.set(response.data);
      }

      return response;
    } catch (error) {
      console.error('Error getting popular searches:', error);
      return {
        success: false,
        error: {
          code: 'POPULAR_SEARCHES_ERROR',
          message: 'Failed to get popular searches',
        },
      };
    }
  }

  /**
   * Search history management
   */
  getSearchHistory(): SearchHistoryItem[] {
    return [...this.searchHistory].reverse(); // Most recent first
  }

  addToSearchHistory(item: Omit<SearchHistoryItem, 'id' | 'timestamp'>): void {
    const historyItem: SearchHistoryItem = {
      id: `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      ...item,
    };

    // Remove duplicate queries
    this.searchHistory = this.searchHistory.filter(h => h.query !== item.query);

    // Add new item
    this.searchHistory.push(historyItem);

    // Keep only last 50 searches
    if (this.searchHistory.length > 50) {
      this.searchHistory = this.searchHistory.slice(-50);
    }

    // Save to localStorage
    this.saveSearchHistoryToStorage();
  }

  clearSearchHistory(): void {
    this.searchHistory = [];
    this.saveSearchHistoryToStorage();
  }

  removeFromSearchHistory(id: string): void {
    this.searchHistory = this.searchHistory.filter(h => h.id !== id);
    this.saveSearchHistoryToStorage();
  }

  /**
   * Saved searches management
   */
  async getSavedSearches(): Promise<ApiResponse<SavedSearch[]>> {
    try {
      const response = await apiService.get<SavedSearch[]>('/search/saved');

      if (response.success && response.data) {
        this.savedSearches = response.data;
      }

      return response;
    } catch (error) {
      console.error('Error getting saved searches:', error);
      return {
        success: false,
        error: {
          code: 'SAVED_SEARCHES_ERROR',
          message: 'Failed to get saved searches',
        },
      };
    }
  }

  async saveSearch(
    search: Omit<SavedSearch, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<ApiResponse<SavedSearch>> {
    try {
      const response = await apiService.post<SavedSearch>('/search/saved', search);

      if (response.success && response.data) {
        this.savedSearches.push(response.data);
      }

      return response;
    } catch (error) {
      console.error('Error saving search:', error);
      return {
        success: false,
        error: {
          code: 'SAVE_SEARCH_ERROR',
          message: 'Failed to save search',
        },
      };
    }
  }

  async updateSavedSearch(
    id: string,
    updates: Partial<SavedSearch>
  ): Promise<ApiResponse<SavedSearch>> {
    try {
      const response = await apiService.put<SavedSearch>(`/search/saved/${id}`, updates);

      if (response.success && response.data) {
        const index = this.savedSearches.findIndex(s => s.id === id);
        if (index !== -1) {
          this.savedSearches[index] = response.data;
        }
      }

      return response;
    } catch (error) {
      console.error('Error updating saved search:', error);
      return {
        success: false,
        error: {
          code: 'UPDATE_SAVED_SEARCH_ERROR',
          message: 'Failed to update saved search',
        },
      };
    }
  }

  async deleteSavedSearch(id: string): Promise<ApiResponse<void>> {
    try {
      const response = await apiService.delete<void>(`/search/saved/${id}`);

      if (response.success) {
        this.savedSearches = this.savedSearches.filter(s => s.id !== id);
      }

      return response;
    } catch (error) {
      console.error('Error deleting saved search:', error);
      return {
        success: false,
        error: {
          code: 'DELETE_SAVED_SEARCH_ERROR',
          message: 'Failed to delete saved search',
        },
      };
    }
  }

  /**
   * Local storage management
   */
  private saveSearchHistoryToStorage(): void {
    try {
      localStorage.setItem('owlnest_search_history', JSON.stringify(this.searchHistory));
    } catch (error) {
      console.warn('Failed to save search history to localStorage:', error);
    }
  }

  private loadSearchHistoryFromStorage(): void {
    try {
      const stored = localStorage.getItem('owlnest_search_history');
      if (stored) {
        this.searchHistory = JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load search history from localStorage:', error);
      this.searchHistory = [];
    }
  }

  /**
   * Clear search cache
   */
  clearCache(): void {
    searchCache.clear();
    suggestionCache.clear();
    popularSearchCache.clear();
  }

  /**
   * Clear cache for specific type
   */
  clearCacheForType(type: 'discussions' | 'posts'): void {
    searchCache.clearType(type);
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): any {
    return {
      searchCache: searchCache.getStats(),
      suggestionCacheSize: suggestionCache['cache'].size,
      popularSearchCached: !!popularSearchCache['cache'],
    };
  }

  /**
   * Initialize service
   */
  init(): void {
    this.loadSearchHistoryFromStorage();
  }
}

// Create and export singleton instance
export const searchService = new SearchService();

// Initialize on import
searchService.init();

export default searchService;
