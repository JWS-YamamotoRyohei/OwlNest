import React, { useState } from 'react';
import { DiscussionListItem } from '../../types/discussion';
import { PostListItem } from '../../types/post';
import { SearchResult, SearchFacets } from '../../services/searchService';
import { DiscussionCard } from '../discussions/DiscussionCard';
import { PostCard } from '../posts/PostCard';
import './SearchResults.css';

interface SearchResultsProps {
  type: 'discussions' | 'posts';
  results: SearchResult<DiscussionListItem | PostListItem>;
  query?: string;
  isLoading?: boolean;
  onLoadMore?: () => void;
  onItemClick?: (item: DiscussionListItem | PostListItem) => void;
  onFacetClick?: (facetType: string, facetValue: string) => void;
  highlightQuery?: boolean;
}

export const SearchResults: React.FC<SearchResultsProps> = ({
  type,
  results,
  query = '',
  isLoading = false,
  onLoadMore,
  onItemClick,
  onFacetClick,
  highlightQuery = true
}) => {
  const [showFacets, setShowFacets] = useState(false);

  const highlightText = (text: string, query: string): React.ReactNode => {
    if (!highlightQuery || !query.trim()) {
      return text;
    }

    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="search-results__highlight">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const formatSearchTime = (time: number): string => {
    if (time < 1000) {
      return `${time}ms`;
    }
    return `${(time / 1000).toFixed(2)}秒`;
  };

  const renderFacets = (facets: SearchFacets) => {
    return (
      <div className="search-results__facets">
        <div className="search-results__facets-header">
          <h3>絞り込み</h3>
          <button
            className="search-results__facets-toggle"
            onClick={() => setShowFacets(!showFacets)}
          >
            {showFacets ? '隠す' : '表示'}
          </button>
        </div>

        {showFacets && (
          <div className="search-results__facets-content">
            {/* Categories */}
            {facets.categories && facets.categories.length > 0 && (
              <div className="search-results__facet-group">
                <h4>カテゴリ</h4>
                {facets.categories.map((facet, index) => (
                  <button
                    key={index}
                    className="search-results__facet-item"
                    onClick={() => onFacetClick?.('category', facet.category)}
                  >
                    <span className="search-results__facet-label">
                      {facet.category}
                    </span>
                    <span className="search-results__facet-count">
                      ({facet.count})
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Stances */}
            {facets.stances && facets.stances.length > 0 && (
              <div className="search-results__facet-group">
                <h4>スタンス</h4>
                {facets.stances.map((facet, index) => (
                  <button
                    key={index}
                    className="search-results__facet-item"
                    onClick={() => onFacetClick?.('stance', facet.stance)}
                  >
                    <span className="search-results__facet-label">
                      {facet.stance}
                    </span>
                    <span className="search-results__facet-count">
                      ({facet.count})
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Authors */}
            {facets.authors && facets.authors.length > 0 && (
              <div className="search-results__facet-group">
                <h4>作成者</h4>
                {facets.authors.slice(0, 10).map((facet, index) => (
                  <button
                    key={index}
                    className="search-results__facet-item"
                    onClick={() => onFacetClick?.('author', facet.authorId)}
                  >
                    <span className="search-results__facet-label">
                      {facet.authorName}
                    </span>
                    <span className="search-results__facet-count">
                      ({facet.count})
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderDiscussionItem = (item: DiscussionListItem) => {
    const highlightedItem = highlightQuery ? {
      ...item,
      title: highlightText(item.title, query) as string,
      description: highlightText(item.description, query) as string
    } : item;

    return (
      <div
        key={item.discussionId}
        className="search-results__item"
        onClick={() => onItemClick?.(item)}
      >
        <DiscussionCard
          discussion={highlightedItem}
          onFollow={() => {}}
          onUnfollow={() => {}}
          isFollowing={false}
          compact={true}
        />
      </div>
    );
  };

  const renderPostItem = (item: PostListItem) => {
    const highlightedItem = highlightQuery ? {
      ...item,
      content: {
        ...item.content,
        text: highlightText(item.content.text, query) as string,
        preview: highlightText(item.content.preview, query) as string
      }
    } : item;

    return (
      <div
        key={item.postId}
        className="search-results__item"
        onClick={() => onItemClick?.(item)}
      >
        <PostCard
          post={highlightedItem}
          onReact={async () => {}}
          onReply={() => {}}
          onEdit={() => {}}
          onDelete={async () => {}}
        />
      </div>
    );
  };

  if (isLoading && results.items.length === 0) {
    return (
      <div className="search-results search-results--loading">
        <div className="search-results__loading">
          <div className="search-results__loading-spinner">⏳</div>
          <div className="search-results__loading-text">検索中...</div>
        </div>
      </div>
    );
  }

  if (results.items.length === 0 && !isLoading) {
    return (
      <div className="search-results search-results--empty">
        <div className="search-results__empty">
          <div className="search-results__empty-icon">🔍</div>
          <div className="search-results__empty-title">
            検索結果が見つかりません
          </div>
          <div className="search-results__empty-description">
            {query ? (
              <>「{query}」に一致する{type === 'discussions' ? '議論' : '投稿'}が見つかりませんでした。</>
            ) : (
              <>検索条件に一致する{type === 'discussions' ? '議論' : '投稿'}が見つかりませんでした。</>
            )}
          </div>
          <div className="search-results__empty-suggestions">
            <p>検索のヒント:</p>
            <ul>
              <li>キーワードを変更してみてください</li>
              <li>より一般的な用語を使用してみてください</li>
              <li>フィルター条件を緩和してみてください</li>
              <li>スペルを確認してください</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="search-results">
      {/* Results Header */}
      <div className="search-results__header">
        <div className="search-results__info">
          <div className="search-results__count">
            {results.totalCount.toLocaleString()}件の{type === 'discussions' ? '議論' : '投稿'}が見つかりました
            {query && (
              <span className="search-results__query">
                「{query}」の検索結果
              </span>
            )}
          </div>
          <div className="search-results__time">
            検索時間: {formatSearchTime(results.searchTime)}
          </div>
        </div>

        {results.facets && (
          <button
            className="search-results__facets-button"
            onClick={() => setShowFacets(!showFacets)}
          >
            絞り込み {showFacets ? '▼' : '▶'}
          </button>
        )}
      </div>

      <div className="search-results__content">
        {/* Facets Sidebar */}
        {results.facets && showFacets && (
          <div className="search-results__sidebar">
            {renderFacets(results.facets)}
          </div>
        )}

        {/* Results List */}
        <div className="search-results__list">
          {results.items.map((item) => 
            type === 'discussions' 
              ? renderDiscussionItem(item as DiscussionListItem)
              : renderPostItem(item as PostListItem)
          )}

          {/* Load More */}
          {results.hasMore && (
            <div className="search-results__load-more">
              <button
                className="search-results__load-more-button"
                onClick={onLoadMore}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="search-results__load-more-spinner">⏳</span>
                    読み込み中...
                  </>
                ) : (
                  'さらに読み込む'
                )}
              </button>
            </div>
          )}

          {/* End of Results */}
          {!results.hasMore && results.items.length > 0 && (
            <div className="search-results__end">
              すべての結果を表示しました
            </div>
          )}
        </div>
      </div>
    </div>
  );
};