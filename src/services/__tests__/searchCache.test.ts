import { SearchCache, SuggestionCache, PopularSearchCache } from '../searchCache';

describe('SearchCache', () => {
  let cache: SearchCache;

  beforeEach(() => {
    cache = new SearchCache({ maxSize: 5, defaultTTL: 1000 });
  });

  describe('basic operations', () => {
    it('should store and retrieve data', () => {
      const data = { items: [], totalCount: 0, searchTime: 100, hasMore: false };

      cache.set('discussions', data, 'test query');
      const retrieved = cache.get('discussions', 'test query');

      expect(retrieved).toEqual(data);
    });

    it('should return null for non-existent keys', () => {
      const result = cache.get('discussions', 'non-existent');
      expect(result).toBeNull();
    });

    it('should handle different query parameters', () => {
      const data1 = { items: [1], totalCount: 1, searchTime: 100, hasMore: false };
      const data2 = { items: [2], totalCount: 1, searchTime: 100, hasMore: false };

      cache.set('discussions', data1, 'query1');
      cache.set('discussions', data2, 'query2');

      expect(cache.get('discussions', 'query1')).toEqual(data1);
      expect(cache.get('discussions', 'query2')).toEqual(data2);
    });

    it('should handle filters in cache key', () => {
      const data = { items: [], totalCount: 0, searchTime: 100, hasMore: false };
      const filters = { categories: ['politics'] };

      cache.set('discussions', data, 'test', filters);

      expect(cache.get('discussions', 'test', filters)).toEqual(data);
      expect(cache.get('discussions', 'test')).toBeNull();
    });

    it('should handle sort parameters', () => {
      const data = { items: [], totalCount: 0, searchTime: 100, hasMore: false };
      const sort = { field: 'createdAt', direction: 'desc' as const };

      cache.set('discussions', data, 'test', undefined, sort);

      expect(cache.get('discussions', 'test', undefined, sort)).toEqual(data);
      expect(cache.get('discussions', 'test')).toBeNull();
    });
  });

  describe('TTL and expiration', () => {
    it('should expire entries after TTL', async () => {
      const data = { items: [], totalCount: 0, searchTime: 100, hasMore: false };

      cache.set('discussions', data, 'test', undefined, undefined, 50); // 50ms TTL

      expect(cache.get('discussions', 'test')).toEqual(data);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 60));

      expect(cache.get('discussions', 'test')).toBeNull();
    });
  });

  describe('cache size management', () => {
    it('should evict old entries when cache is full', () => {
      const data = { items: [], totalCount: 0, searchTime: 100, hasMore: false };

      // Fill cache to max size
      for (let i = 0; i < 5; i++) {
        cache.set('discussions', data, `query${i}`);
      }

      // Add one more to trigger eviction
      cache.set('discussions', data, 'query5');

      // Some old entries should be evicted
      const stats = cache.getStats();
      expect(stats.size).toBeLessThanOrEqual(5);
    });
  });

  describe('cache management', () => {
    it('should clear all entries', () => {
      const data = { items: [], totalCount: 0, searchTime: 100, hasMore: false };

      cache.set('discussions', data, 'test1');
      cache.set('posts', data, 'test2');

      cache.clear();

      expect(cache.get('discussions', 'test1')).toBeNull();
      expect(cache.get('posts', 'test2')).toBeNull();
    });

    it('should clear entries by type', () => {
      const data = { items: [], totalCount: 0, searchTime: 100, hasMore: false };

      cache.set('discussions', data, 'test1');
      cache.set('posts', data, 'test2');

      cache.clearType('discussions');

      expect(cache.get('discussions', 'test1')).toBeNull();
      expect(cache.get('posts', 'test2')).toEqual(data);
    });

    it('should provide cache statistics', () => {
      const data = { items: [], totalCount: 0, searchTime: 100, hasMore: false };

      cache.set('discussions', data, 'test');

      const stats = cache.getStats();

      expect(stats.size).toBe(1);
      expect(stats.maxSize).toBe(5);
      expect(typeof stats.memoryUsage).toBe('number');
    });
  });
});

describe('SuggestionCache', () => {
  let cache: SuggestionCache;

  beforeEach(() => {
    cache = new SuggestionCache();
  });

  it('should store and retrieve suggestions', () => {
    const suggestions = [{ type: 'query' as const, value: 'test', label: 'test suggestion' }];

    cache.set('test', suggestions);
    const retrieved = cache.get('test');

    expect(retrieved).toEqual(suggestions);
  });

  it('should handle different types', () => {
    const suggestions = [{ type: 'query' as const, value: 'test', label: 'test suggestion' }];

    cache.set('test', suggestions, 'discussions');

    expect(cache.get('test', 'discussions')).toEqual(suggestions);
    expect(cache.get('test', 'posts')).toBeNull();
  });

  it('should clear all suggestions', () => {
    const suggestions = [{ type: 'query' as const, value: 'test', label: 'test suggestion' }];

    cache.set('test', suggestions);
    cache.clear();

    expect(cache.get('test')).toBeNull();
  });
});

describe('PopularSearchCache', () => {
  let cache: PopularSearchCache;

  beforeEach(() => {
    cache = new PopularSearchCache();
  });

  it('should store and retrieve popular searches', () => {
    const searches = [
      { query: 'politics', count: 100 },
      { query: 'economy', count: 80 },
    ];

    cache.set(searches);
    const retrieved = cache.get();

    expect(retrieved).toEqual(searches);
  });

  it('should clear popular searches', () => {
    const searches = [{ query: 'politics', count: 100 }];

    cache.set(searches);
    cache.clear();

    expect(cache.get()).toBeNull();
  });
});
