import React, { useState, useEffect, useMemo } from 'react';
import { PostListItem, CreatePostData, PostFilters, PostSortOptions } from '../../types/post';
import { Stance, ReactionType } from '../../types/common';
import { DiscussionPoint } from '../../types/discussion';
import { useAuth } from '../../hooks/useAuth';
import { PostCard } from './PostCard';
import { PostCreationForm } from './PostCreationForm';
import './PostList.css';

interface PostListProps {
  posts: PostListItem[];
  discussionPoints: DiscussionPoint[];
  discussionId: string;
  filters?: PostFilters;
  sortOptions?: PostSortOptions;
  onFiltersChange?: (filters: PostFilters) => void;
  onSortChange?: (sortOptions: PostSortOptions) => void;
  onCreatePost?: (data: CreatePostData) => Promise<void>;
  onReactToPost?: (postId: string, reactionType: ReactionType) => Promise<void>;
  onEditPost?: (postId: string) => void;
  onDeletePost?: (postId: string) => Promise<void>;
  onHidePost?: (postId: string) => Promise<void>;
  onShowPost?: (postId: string) => Promise<void>;
  onFlagPost?: (postId: string, reason: string) => Promise<void>;
  onUnflagPost?: (postId: string) => Promise<void>;
  onRestorePost?: (postId: string) => Promise<void>;
  showCreateForm?: boolean;
  showFilters?: boolean;
  showSorting?: boolean;
  groupByPoint?: boolean;
  maxReplyLevel?: number;
  className?: string;
}

export const PostList: React.FC<PostListProps> = ({
  posts,
  discussionPoints,
  discussionId,
  filters = {},
  sortOptions = { field: 'createdAt', direction: 'desc' },
  onFiltersChange,
  onSortChange,
  onCreatePost,
  onReactToPost,
  onEditPost,
  onDeletePost,
  onHidePost,
  onShowPost,
  showCreateForm = true,
  showFilters = true,
  showSorting = true,
  groupByPoint = true,
  maxReplyLevel = 3,
  className = '',
}) => {
  const { user } = useAuth();
  const [showCreatePostForm, setShowCreatePostForm] = useState(false);
  const [replyToPostId, setReplyToPostId] = useState<string | null>(null);
  const [selectedPointId, setSelectedPointId] = useState<string>('');
  const [searchText, setSearchText] = useState(filters.searchText || '');
  const [selectedStance, setSelectedStance] = useState<Stance | ''>(filters.stance || '');
  const [selectedAuthor, setSelectedAuthor] = useState(filters.authorId || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  console.log('discussionPoints', discussionPoints);
  // Update local state when filters change
  useEffect(() => {
    setSearchText(filters.searchText || '');
    setSelectedStance(filters.stance || '');
    setSelectedAuthor(filters.authorId || '');
    setSelectedPointId(filters.discussionPointId || '');
  }, [filters]);

  // Filter and sort posts
  const filteredAndSortedPosts = useMemo(() => {
    let filtered = [...posts];

    // Apply filters
    if (filters.discussionPointId) {
      filtered = filtered.filter(post => post.discussionPointId === filters.discussionPointId);
    }

    if (filters.authorId) {
      filtered = filtered.filter(post => post.authorId === filters.authorId);
    }

    if (filters.stance) {
      filtered = filtered.filter(post => post.stance === filters.stance);
    }

    if (filters.hasAttachments) {
      filtered = filtered.filter(post => post.attachments && post.attachments.length > 0);
    }

    if (filters.hasLinks) {
      filtered = filtered.filter(post => {
        // Check if content contains URLs
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        return urlRegex.test(post.content.text);
      });
    }

    if (filters.searchText) {
      const searchLower = filters.searchText.toLowerCase();
      filtered = filtered.filter(
        post =>
          post.content.text.toLowerCase().includes(searchLower) ||
          post.authorDisplayName.toLowerCase().includes(searchLower) ||
          post.discussionPointTitle.toLowerCase().includes(searchLower)
      );
    }

    if (filters.dateRange) {
      const startDate = new Date(filters.dateRange.start);
      const endDate = new Date(filters.dateRange.end);
      filtered = filtered.filter(post => {
        const postDate = new Date(post.createdAt);
        return postDate >= startDate && postDate <= endDate;
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortOptions.field) {
        case 'createdAt':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        case 'updatedAt':
          aValue = new Date(a.updatedAt).getTime();
          bValue = new Date(b.updatedAt).getTime();
          break;
        case 'reactions':
          aValue =
            a.statistics.likeCount +
            a.statistics.agreeCount +
            a.statistics.disagreeCount +
            a.statistics.insightfulCount +
            a.statistics.funnyCount;
          bValue =
            b.statistics.likeCount +
            b.statistics.agreeCount +
            b.statistics.disagreeCount +
            b.statistics.insightfulCount +
            b.statistics.funnyCount;
          break;
        case 'replies':
          aValue = a.statistics.replyCount;
          bValue = b.statistics.replyCount;
          break;
        default:
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
      }

      if (sortOptions.direction === 'asc') {
        return aValue - bValue;
      } else {
        return bValue - aValue;
      }
    });

    return filtered;
  }, [posts, filters, sortOptions]);

  // Group posts by discussion point
  const groupedPosts = useMemo(() => {
    if (!groupByPoint) {
      return { '': filteredAndSortedPosts };
    }

    const groups: Record<string, PostListItem[]> = {};

    filteredAndSortedPosts.forEach(post => {
      const pointId = post.discussionPointId;
      if (!groups[pointId]) {
        groups[pointId] = [];
      }
      groups[pointId].push(post);
    });

    return groups;
  }, [filteredAndSortedPosts, groupByPoint]);

  // Get unique authors for filter
  const uniqueAuthors = useMemo(() => {
    const authors = new Map<string, string>();
    posts.forEach(post => {
      authors.set(post.authorId, post.authorDisplayName);
    });
    return Array.from(authors.entries()).map(([id, name]) => ({ id, name }));
  }, [posts]);

  const handleFilterChange = (newFilters: Partial<PostFilters>) => {
    const updatedFilters = { ...filters, ...newFilters };
    onFiltersChange?.(updatedFilters);
  };

  const handleSortChange = (field: PostSortOptions['field']) => {
    const newDirection: 'asc' | 'desc' =
      sortOptions.field === field && sortOptions.direction === 'desc' ? 'asc' : 'desc';
    const newSortOptions = { field, direction: newDirection };
    onSortChange?.(newSortOptions);
  };

  const handleCreatePost = async (data: CreatePostData) => {
    if (!onCreatePost) return;

    setIsSubmitting(true);
    try {
      await onCreatePost(data);
      setShowCreatePostForm(false);
      setReplyToPostId(null);
    } catch (error) {
      console.error('Failed to create post:', error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReply = (postId: string) => {
    setReplyToPostId(postId);
    setShowCreatePostForm(true);
  };

  const handleCancelCreate = () => {
    setShowCreatePostForm(false);
    setReplyToPostId(null);
  };

  const getPointTitle = (pointId: string): string => {
    const point = discussionPoints.find(p => p.pointId === pointId);
    return point?.title || '不明な論点';
  };

  return (
    <div className={`post-list ${className}`}>
      {/* Filters and Sorting */}
      {(showFilters || showSorting) && (
        <div className="post-list__controls">
          {showFilters && (
            <div className="post-list__filters">
              <div className="post-list__filter-group">
                <input
                  type="text"
                  placeholder="投稿を検索..."
                  value={searchText}
                  onChange={e => {
                    setSearchText(e.target.value);
                    handleFilterChange({ searchText: e.target.value });
                  }}
                  className="post-list__search-input"
                />
              </div>

              <div className="post-list__filter-group">
                <select
                  value={selectedPointId}
                  onChange={e => {
                    setSelectedPointId(e.target.value);
                    handleFilterChange({ discussionPointId: e.target.value || undefined });
                  }}
                  className="post-list__filter-select"
                >
                  <option value="">すべての論点</option>
                  {discussionPoints.map(point => (
                    <option key={point.pointId} value={point.pointId}>
                      {point.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="post-list__filter-group">
                <select
                  value={selectedStance}
                  onChange={e => {
                    const stance = e.target.value as Stance | '';
                    setSelectedStance(stance);
                    handleFilterChange({ stance: stance || undefined });
                  }}
                  className="post-list__filter-select"
                >
                  <option value="">すべてのスタンス</option>
                  <option value={Stance.PROS}>賛成</option>
                  <option value={Stance.CONS}>反対</option>
                  <option value={Stance.NEUTRAL}>中立</option>
                  <option value={Stance.UNKNOWN}>わからない</option>
                </select>
              </div>

              <div className="post-list__filter-group">
                <select
                  value={selectedAuthor}
                  onChange={e => {
                    setSelectedAuthor(e.target.value);
                    handleFilterChange({ authorId: e.target.value || undefined });
                  }}
                  className="post-list__filter-select"
                >
                  <option value="">すべてのユーザー</option>
                  {uniqueAuthors.map(author => (
                    <option key={author.id} value={author.id}>
                      {author.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {showSorting && (
            <div className="post-list__sorting">
              <span className="post-list__sort-label">並び順:</span>
              <button
                type="button"
                className={`post-list__sort-button ${
                  sortOptions.field === 'createdAt' ? 'post-list__sort-button--active' : ''
                }`}
                onClick={() => handleSortChange('createdAt')}
              >
                投稿日時
                {sortOptions.field === 'createdAt' && (
                  <span className="post-list__sort-direction">
                    {sortOptions.direction === 'desc' ? '↓' : '↑'}
                  </span>
                )}
              </button>
              <button
                type="button"
                className={`post-list__sort-button ${
                  sortOptions.field === 'reactions' ? 'post-list__sort-button--active' : ''
                }`}
                onClick={() => handleSortChange('reactions')}
              >
                リアクション数
                {sortOptions.field === 'reactions' && (
                  <span className="post-list__sort-direction">
                    {sortOptions.direction === 'desc' ? '↓' : '↑'}
                  </span>
                )}
              </button>
              <button
                type="button"
                className={`post-list__sort-button ${
                  sortOptions.field === 'replies' ? 'post-list__sort-button--active' : ''
                }`}
                onClick={() => handleSortChange('replies')}
              >
                返信数
                {sortOptions.field === 'replies' && (
                  <span className="post-list__sort-direction">
                    {sortOptions.direction === 'desc' ? '↓' : '↑'}
                  </span>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Create Post Button */}
      {showCreateForm && user && !showCreatePostForm && (
        <div className="post-list__create-button-container">
          <button
            type="button"
            className="post-list__create-button"
            onClick={() => setShowCreatePostForm(true)}
          >
            💬 新しい投稿を作成
          </button>
        </div>
      )}

      {/* Create Post Form */}
      {showCreatePostForm && user && onCreatePost && (
        <div className="post-list__create-form">
          <PostCreationForm
            discussionId={discussionId}
            discussionPoints={discussionPoints}
            onSubmit={handleCreatePost}
            onCancel={handleCancelCreate}
            replyToId={replyToPostId || undefined}
            currentUserId={user.userId}
            isSubmitting={isSubmitting}
          />
        </div>
      )}

      {/* Posts */}
      <div className="post-list__posts">
        {Object.keys(groupedPosts).length === 0 ? (
          <div className="post-list__empty">
            <div className="post-list__empty-icon">💬</div>
            <div className="post-list__empty-title">投稿がありません</div>
            <div className="post-list__empty-description">
              {filters.searchText || filters.stance || filters.authorId || filters.discussionPointId
                ? 'フィルター条件に一致する投稿が見つかりませんでした。'
                : 'まだ投稿がありません。最初の投稿を作成してみましょう。'}
            </div>
          </div>
        ) : (
          Object.entries(groupedPosts).map(([pointId, pointPosts]) => (
            <div key={pointId || 'no-point'} className="post-list__point-group">
              {groupByPoint && pointId && (
                <div className="post-list__point-header">
                  <h3 className="post-list__point-title">{getPointTitle(pointId)}</h3>
                  <div className="post-list__point-count">{pointPosts.length}件の投稿</div>
                </div>
              )}

              <div className="post-list__point-posts">
                {pointPosts.map(post => (
                  <PostCard
                    key={post.postId}
                    post={post}
                    onReact={onReactToPost}
                    onReply={handleReply}
                    onEdit={onEditPost}
                    onDelete={onDeletePost}
                    onHide={onHidePost}
                    onShow={onShowPost}
                    showActions={true}
                    showReplies={true}
                    isReply={post.level > 0}
                    level={post.level}
                    maxLevel={maxReplyLevel}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Results Summary */}
      {filteredAndSortedPosts.length > 0 && (
        <div className="post-list__summary">
          {filteredAndSortedPosts.length}件の投稿を表示中
          {posts.length !== filteredAndSortedPosts.length && (
            <span className="post-list__filtered-count">（全{posts.length}件中）</span>
          )}
        </div>
      )}
    </div>
  );
};
