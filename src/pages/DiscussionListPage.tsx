import React, { useState, useEffect, useCallback } from 'react';
import { DiscussionListItem, DiscussionSearchFilters } from '../types/discussion';
import { DiscussionList } from '../components/discussions/DiscussionList';
import { DiscussionFilters } from '../components/discussions/DiscussionFilters';
import { DiscussionSort, DiscussionSortOptions } from '../components/discussions/DiscussionSort';
import { Breadcrumb } from '../components/navigation/Breadcrumb';
import { SEO } from '../components/common/SEO';
import './DiscussionListPage.css';
import { DiscussionCategory } from '@/types/common';

const DiscussionListPage: React.FC = () => {
  
  // State management
  const [discussions, setDiscussions] = useState<DiscussionListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [followedDiscussions, setFollowedDiscussions] = useState<Set<string>>(new Set());
  
  // Filter and sort state
  const [filters, setFilters] = useState<DiscussionSearchFilters>({});
  const [sortOptions, setSortOptions] = useState<DiscussionSortOptions>({
    field: 'lastActivityAt',
    direction: 'desc'
  });

  // Mock data generator (replace with actual API calls)
  const generateMockDiscussion = (id: number): DiscussionListItem => ({
    discussionId: `discussion_${id}`,
    title: `議論タイトル ${id}`,
    description: `これは議論 ${id} の説明文です。この議論では様々な観点から意見を交換し、建設的な対話を目指します。`,
    ownerId: `user_${Math.floor(Math.random() * 10) + 1}`,
    ownerDisplayName: `ユーザー${Math.floor(Math.random() * 10) + 1}`,
    ownerStance: ['pros', 'cons', 'neutral', 'unknown'][Math.floor(Math.random() * 4)] as any,
    categories:  [
      ['politics', 'economy', 'society'][Math.floor(Math.random() * 3)]
    ] as DiscussionCategory[],
    tags: [`タグ${id}`, `関連${id}`],
    isActive: Math.random() > 0.2,
    isLocked: Math.random() > 0.9,
    isPinned: Math.random() > 0.8,
    isFeatured: Math.random() > 0.7,
    createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
    lastActivityAt: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
    statistics: {
      participantCount: Math.floor(Math.random() * 50) + 1,
      postCount: Math.floor(Math.random() * 200) + 1,
      prosCount: Math.floor(Math.random() * 50),
      consCount: Math.floor(Math.random() * 50),
      neutralCount: Math.floor(Math.random() * 20),
      followersCount: Math.floor(Math.random() * 30)
    }
  });

  // Load discussions (mock implementation)
  const loadDiscussions = useCallback(async (reset = false) => {
    if (isLoading) return;
    
    setIsLoading(true);
    
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const pageToLoad = reset ? 1 : currentPage;
      const pageSize = 12;
      const startId = (pageToLoad - 1) * pageSize + 1;
      
      const newDiscussions = Array.from({ length: pageSize }, (_, i) => 
        generateMockDiscussion(startId + i)
      );
      console.log("newDiscussions!",newDiscussions)
      if (reset) {
        setDiscussions(newDiscussions);
        setCurrentPage(2);
      } else {
        setDiscussions(prev => [...prev, ...newDiscussions]);
        setCurrentPage(prev => prev + 1);
      }
      
      // Simulate end of data
      setHasMore(pageToLoad < 5);
      
    } catch (error) {
      console.error('Failed to load discussions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, isLoading]);

  // Load more discussions for infinite scroll
  const handleLoadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      loadDiscussions(false);
    }
  }, [loadDiscussions, isLoading, hasMore]);

  // Handle filter changes
  const handleFiltersChange = useCallback((newFilters: DiscussionSearchFilters) => {
    setFilters(newFilters);
    setCurrentPage(1);
    loadDiscussions(true);
  }, [loadDiscussions]);

  // Handle sort changes
  const handleSortChange = useCallback((newSortOptions: DiscussionSortOptions) => {
    setSortOptions(newSortOptions);
    setCurrentPage(1);
    loadDiscussions(true);
  }, [loadDiscussions]);

  // Clear filters
  const handleClearFilters = useCallback(() => {
    setFilters({});
    setCurrentPage(1);
    loadDiscussions(true);
  }, [loadDiscussions]);

  // Follow/unfollow handlers
  const handleFollow = useCallback(async (discussionId: string) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      setFollowedDiscussions(prev => new Set([...prev, discussionId]));
    } catch (error) {
      console.error('Failed to follow discussion:', error);
    }
  }, []);

  const handleUnfollow = useCallback(async (discussionId: string) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      setFollowedDiscussions(prev => {
        const newSet = new Set(prev);
        newSet.delete(discussionId);
        return newSet;
      });
    } catch (error) {
      console.error('Failed to unfollow discussion:', error);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadDiscussions(true);
  }, []);

  return (
    <>
      <SEO
        title="議論一覧 - OwlNest"
        description="進行中の議論を探して参加しましょう。様々なカテゴリの議論から興味のあるトピックを見つけて、建設的な対話に参加できます。"
        keywords={['議論一覧', '検索', 'カテゴリ', 'フィルター', 'ディスカッション']}
      />
      
      <div className="discussion-list-page">
        <Breadcrumb />
        
        <div className="discussion-list-page__header">
          <h1>議論一覧</h1>
          <p>進行中の議論を探して参加しましょう</p>
        </div>
        
        <div className="discussion-list-page__controls">
          <DiscussionFilters
            filters={filters}
            onFiltersChange={handleFiltersChange}
            onClear={handleClearFilters}
            isLoading={isLoading}
          />
          
          <DiscussionSort
            sortOptions={sortOptions}
            onSortChange={handleSortChange}
            isLoading={isLoading}
          />
        </div>
        
        <div className="discussion-list-page__content">
          <DiscussionList
            discussions={discussions}
            isLoading={isLoading}
            hasMore={hasMore}
            onLoadMore={handleLoadMore}
            onFollow={handleFollow}
            onUnfollow={handleUnfollow}
            followedDiscussions={followedDiscussions}
            useInfiniteScroll={true}
          />
        </div>
      </div>
    </>
  );
};

export default DiscussionListPage;