import React, { useEffect, useRef, useCallback } from 'react';
import { DiscussionListItem } from '../../types/discussion';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { DiscussionCard } from './DiscussionCard';
import './DiscussionList.css';

interface DiscussionListProps {
  discussions: DiscussionListItem[];
  isLoading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onFollow?: (discussionId: string) => void;
  onUnfollow?: (discussionId: string) => void;
  followedDiscussions?: Set<string>;
  emptyMessage?: string;
  loadingMessage?: string;
  useInfiniteScroll?: boolean;
}

export const DiscussionList: React.FC<DiscussionListProps> = ({
  discussions,
  isLoading = false,
  hasMore = false,
  onLoadMore,
  onFollow,
  onUnfollow,
  followedDiscussions = new Set(),
  emptyMessage = '議論が見つかりませんでした',
  loadingMessage = '議論を読み込み中...',
  useInfiniteScroll = true,
}) => {
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Intersection Observer for infinite scroll
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [target] = entries;
      if (target.isIntersecting && hasMore && !isLoading && onLoadMore) {
        onLoadMore();
      }
    },
    [hasMore, isLoading, onLoadMore]
  );

  useEffect(() => {
    if (!useInfiniteScroll || !loadMoreRef.current) return;

    observerRef.current = new IntersectionObserver(handleObserver, {
      threshold: 0.1,
      rootMargin: '100px',
    });

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [handleObserver, useInfiniteScroll]);

  // Show loading state for initial load
  if (isLoading && discussions.length === 0) {
    return (
      <div className="discussion-list discussion-list--loading">
        <LoadingSpinner size="large" message={loadingMessage} />
      </div>
    );
  }

  // Show empty state
  if (!isLoading && discussions.length === 0) {
    return (
      <div className="discussion-list discussion-list--empty">
        <div className="discussion-list__empty-state">
          <div className="discussion-list__empty-icon">💬</div>
          <h3 className="discussion-list__empty-title">議論がありません</h3>
          <p className="discussion-list__empty-message">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="discussion-list">
      <div className="discussion-list__grid">
        {discussions.map(discussion => (
          <DiscussionCard
            key={discussion.discussionId}
            discussion={discussion}
            onFollow={onFollow}
            onUnfollow={onUnfollow}
            isFollowing={followedDiscussions.has(discussion.discussionId)}
            showFollowButton={true}
          />
        ))}
      </div>

      {/* Infinite scroll trigger */}
      {useInfiniteScroll && hasMore && (
        <div ref={loadMoreRef} className="discussion-list__load-more-trigger" aria-hidden="true" />
      )}

      {/* Loading more indicator */}
      {isLoading && discussions.length > 0 && (
        <div className="discussion-list__loading-more">
          <LoadingSpinner size="medium" message="さらに読み込み中..." />
        </div>
      )}

      {/* Manual load more button (fallback for infinite scroll) */}
      {!useInfiniteScroll && hasMore && !isLoading && (
        <div className="discussion-list__load-more-button-container">
          <button
            className="discussion-list__load-more-button"
            onClick={onLoadMore}
            disabled={isLoading}
          >
            さらに読み込む
          </button>
        </div>
      )}

      {/* End of list indicator */}
      {!hasMore && discussions.length > 0 && (
        <div className="discussion-list__end-message">
          <p>すべての議論を表示しました</p>
        </div>
      )}
    </div>
  );
};
