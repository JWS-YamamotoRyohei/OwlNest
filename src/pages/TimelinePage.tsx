import React, { useEffect, useState } from 'react';
import { useFollow } from '../contexts/FollowContext';
import { useAuth } from '../contexts/AuthContext';
import { TimelineList } from '../components/timeline/TimelineList';
import { SEO } from '../components/common/SEO';
import { TimelineFilters, TimelineSortOptions, TimelineItem } from '../types';
import './TimelinePage.css';

export const TimelinePage: React.FC = () => {
  const { user } = useAuth();
  const { state, loadTimeline, loadMoreTimeline, markTimelineItemsAsRead, clearTimeline } =
    useFollow();
  const [currentFilters, setCurrentFilters] = useState<TimelineFilters>({});
  const [currentSort, setCurrentSort] = useState<TimelineSortOptions>({
    field: 'createdAt',
    direction: 'desc',
  });

  // Load initial timeline data
  useEffect(() => {
    if (user) {
      loadTimeline(
        {
          filters: currentFilters,
          sort: currentSort,
          pagination: { limit: 20 },
        },
        true
      );
    }
  }, [user, loadTimeline, currentFilters, currentSort]);

  const handleFiltersChange = (filters: TimelineFilters) => {
    setCurrentFilters(filters);
    // Reload timeline with new filters
    loadTimeline(
      {
        filters,
        sort: currentSort,
        pagination: { limit: 20 },
      },
      true
    );
  };

  const handleSortChange = (sort: TimelineSortOptions) => {
    setCurrentSort(sort);
    // Reload timeline with new sort
    loadTimeline(
      {
        filters: currentFilters,
        sort,
        pagination: { limit: 20 },
      },
      true
    );
  };

  const handleMarkAsRead = (itemId: string) => {
    markTimelineItemsAsRead([itemId]);
  };

  const handleMarkAllAsRead = () => {
    clearTimeline();
  };

  const handleItemClick = (item: TimelineItem) => {
    // Navigate to the item's detail page
    if (item.discussionId) {
      window.location.href = `/discussions/${item.discussionId}`;
    }
  };

  const handleLoadMore = () => {
    loadMoreTimeline();
  };

  if (!user) {
    return (
      <div className="timeline-page">
        <SEO
          title="タイムライン"
          description="フォローしているユーザーや議論の最新活動をチェック"
        />

        <div className="timeline-page__auth-required">
          <div className="timeline-page__auth-message">
            <h1>タイムラインを表示するにはログインが必要です</h1>
            <p>ユーザーや議論をフォローして、最新の活動をタイムラインで確認しましょう。</p>
            <a href="/login" className="timeline-page__login-button">
              ログイン
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="timeline-page">
      <SEO title="タイムライン" description="フォローしているユーザーや議論の最新活動" />

      <div className="timeline-page__container">
        <div className="timeline-page__header">
          <div className="timeline-page__title-section">
            <h1 className="timeline-page__title">タイムライン</h1>
            <p className="timeline-page__description">
              フォローしているユーザーや議論の最新活動をチェックしましょう
            </p>
          </div>

          <div className="timeline-page__stats">
            <div className="timeline-page__stat">
              <span className="timeline-page__stat-value">
                {state.statistics?.followingUsers || 0}
              </span>
              <span className="timeline-page__stat-label">フォロー中のユーザー</span>
            </div>

            <div className="timeline-page__stat">
              <span className="timeline-page__stat-value">
                {state.statistics?.followingDiscussions || 0}
              </span>
              <span className="timeline-page__stat-label">フォロー中の議論</span>
            </div>

            <div className="timeline-page__stat">
              <span className="timeline-page__stat-value">{state.unreadTimelineCount}</span>
              <span className="timeline-page__stat-label">未読</span>
            </div>
          </div>
        </div>

        <div className="timeline-page__content">
          {state.statistics?.followingUsers === 0 &&
          state.statistics?.followingDiscussions === 0 ? (
            <div className="timeline-page__empty-state">
              <div className="timeline-page__empty-icon">👥</div>
              <h2 className="timeline-page__empty-title">まだ誰もフォローしていません</h2>
              <p className="timeline-page__empty-description">
                興味のあるユーザーや議論をフォローして、タイムラインを充実させましょう。
              </p>
              <div className="timeline-page__empty-actions">
                <a href="/discussions" className="timeline-page__empty-button">
                  議論を探す
                </a>
                <a
                  href="/users"
                  className="timeline-page__empty-button timeline-page__empty-button--secondary"
                >
                  ユーザーを探す
                </a>
              </div>
            </div>
          ) : (
            <TimelineList
              items={state.timelineItems}
              isLoading={state.isLoadingTimeline}
              hasMore={state.timelineHasMore}
              onLoadMore={handleLoadMore}
              onMarkAsRead={handleMarkAsRead}
              onMarkAllAsRead={handleMarkAllAsRead}
              onItemClick={handleItemClick}
              onFiltersChange={handleFiltersChange}
              onSortChange={handleSortChange}
              unreadCount={state.unreadTimelineCount}
            />
          )}
        </div>

        {state.error && (
          <div className="timeline-page__error">
            <div className="timeline-page__error-message">{state.error}</div>
            <button
              className="timeline-page__error-retry"
              onClick={() =>
                loadTimeline(
                  {
                    filters: currentFilters,
                    sort: currentSort,
                    pagination: { limit: 20 },
                  },
                  true
                )
              }
            >
              再試行
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TimelinePage;
