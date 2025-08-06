import React, { useState, useEffect } from 'react';
import { PostList, PostFilters, PostSortOptions } from './PostList';
import { PostThread } from './PostThread';
import { PostListItem, CreatePostData } from '../../types/post';
import { DiscussionPoint } from '../../types/discussion';
import { Stance, ReactionType } from '../../types/common';
import { TestDataFactory } from '../../utils/testDataFactory';
import './PostManagementDemo.css';

export const PostManagementDemo: React.FC = () => {
  const [posts, setPosts] = useState<PostListItem[]>([]);
  const [discussionPoints, setDiscussionPoints] = useState<DiscussionPoint[]>([]);
  const [filters, setFilters] = useState<PostFilters>({});
  const [sortOptions, setSortOptions] = useState<PostSortOptions>({
    field: 'createdAt',
    direction: 'desc',
  });
  const [selectedPost, setSelectedPost] = useState<PostListItem | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'thread'>('list');

  // Initialize demo data
  useEffect(() => {
    const demoDiscussionPoints = TestDataFactory.createDiscussionPoints(5);
    setDiscussionPoints(demoDiscussionPoints);

    const demoPosts = TestDataFactory.createPosts(20, {
      discussionId: 'demo-discussion',
      discussionPoints: demoDiscussionPoints,
    });
    setPosts(demoPosts);
  }, []);

  const handleFiltersChange = (newFilters: PostFilters) => {
    setFilters(newFilters);
  };

  const handleSortChange = (newSortOptions: PostSortOptions) => {
    setSortOptions(newSortOptions);
  };

  const handleCreatePost = async (data: CreatePostData): Promise<void> => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    const newPost = TestDataFactory.createPost({
      discussionId: data.discussionId,
      discussionPointId: data.discussionPointId,
      content: data.content,
      stance: data.stance,
      replyToId: data.replyToId,
    });

    setPosts(prev => [newPost, ...prev]);
  };

  const handleReactToPost = async (postId: string, reactionType: ReactionType): Promise<void> => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));

    setPosts(prev => prev.map(post => {
      if (post.postId === postId) {
        const currentReaction = post.reactions.userReaction;
        const newReactions = { ...post.reactions };

        // Remove previous reaction
        if (currentReaction) {
          newReactions[currentReaction] = Math.max(0, newReactions[currentReaction] - 1);
          newReactions.totalCount = Math.max(0, newReactions.totalCount - 1);
        }

        // Add new reaction if different
        if (currentReaction !== reactionType) {
          newReactions[reactionType] = (newReactions[reactionType] || 0) + 1;
          newReactions.totalCount += 1;
          newReactions.userReaction = reactionType;
        } else {
          newReactions.userReaction = undefined;
        }

        return {
          ...post,
          reactions: newReactions,
        };
      }
      return post;
    }));
  };

  const handleEditPost = (postId: string) => {
    alert(`編集機能は実装予定です。投稿ID: ${postId}`);
  };

  const handleDeletePost = async (postId: string): Promise<void> => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));

    setPosts(prev => prev.filter(post => post.postId !== postId));
  };

  const handleHidePost = async (postId: string, reason?: string): Promise<void> => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));

    setPosts(prev => prev.map(post => {
      if (post.postId === postId) {
        return {
          ...post,
          // In real implementation, this would be handled by moderation status
          content: {
            ...post.content,
            text: '[この投稿は非表示にされました]',
          },
        };
      }
      return post;
    }));

    console.log(`投稿を非表示にしました。投稿ID: ${postId}, 理由: ${reason}`);
  };

  const handleShowPost = async (postId: string): Promise<void> => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));

    // In real implementation, this would restore the original content
    console.log(`投稿を表示しました。投稿ID: ${postId}`);
  };

  const handleFlagPost = async (postId: string, reason: string): Promise<void> => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));

    console.log(`投稿にフラグを設定しました。投稿ID: ${postId}, 理由: ${reason}`);
  };

  const handleUnflagPost = async (postId: string): Promise<void> => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));

    console.log(`投稿のフラグを解除しました。投稿ID: ${postId}`);
  };

  const handleRestorePost = async (postId: string): Promise<void> => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));

    console.log(`投稿を復元しました。投稿ID: ${postId}`);
  };

  const handleViewThread = (post: PostListItem) => {
    setSelectedPost(post);
    setViewMode('thread');
  };

  const getRepliesForPost = (postId: string): PostListItem[] => {
    return posts.filter(post => post.replyToId === postId);
  };

  const getPostStats = () => {
    const totalPosts = posts.length;
    const stanceDistribution = posts.reduce((acc, post) => {
      acc[post.stance] = (acc[post.stance] || 0) + 1;
      return acc;
    }, {} as Record<Stance, number>);

    const totalReactions = posts.reduce((sum, post) => sum + post.reactions.totalCount, 0);
    const totalReplies = posts.reduce((sum, post) => sum + post.replyCount, 0);

    return {
      totalPosts,
      stanceDistribution,
      totalReactions,
      totalReplies,
    };
  };

  const stats = getPostStats();

  return (
    <div className="post-management-demo">
      <div className="post-management-demo__header">
        <h2>投稿表示・管理機能デモ</h2>
        <p>投稿の表示、フィルタリング、ソート、管理機能をテストできます。</p>
      </div>

      {/* Statistics */}
      <div className="post-management-demo__stats">
        <div className="post-management-demo__stat-card">
          <div className="post-management-demo__stat-value">{stats.totalPosts}</div>
          <div className="post-management-demo__stat-label">総投稿数</div>
        </div>
        <div className="post-management-demo__stat-card">
          <div className="post-management-demo__stat-value">{stats.totalReactions}</div>
          <div className="post-management-demo__stat-label">総リアクション数</div>
        </div>
        <div className="post-management-demo__stat-card">
          <div className="post-management-demo__stat-value">{stats.totalReplies}</div>
          <div className="post-management-demo__stat-label">総返信数</div>
        </div>
        <div className="post-management-demo__stat-card">
          <div className="post-management-demo__stance-distribution">
            <div className="post-management-demo__stance-item">
              <span className="post-management-demo__stance-color post-management-demo__stance-color--pros"></span>
              賛成: {stats.stanceDistribution[Stance.PROS] || 0}
            </div>
            <div className="post-management-demo__stance-item">
              <span className="post-management-demo__stance-color post-management-demo__stance-color--cons"></span>
              反対: {stats.stanceDistribution[Stance.CONS] || 0}
            </div>
            <div className="post-management-demo__stance-item">
              <span className="post-management-demo__stance-color post-management-demo__stance-color--neutral"></span>
              中立: {stats.stanceDistribution[Stance.NEUTRAL] || 0}
            </div>
          </div>
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="post-management-demo__view-toggle">
        <button
          type="button"
          className={`post-management-demo__view-button ${
            viewMode === 'list' ? 'post-management-demo__view-button--active' : ''
          }`}
          onClick={() => setViewMode('list')}
        >
          📋 リスト表示
        </button>
        <button
          type="button"
          className={`post-management-demo__view-button ${
            viewMode === 'thread' ? 'post-management-demo__view-button--active' : ''
          }`}
          onClick={() => setViewMode('thread')}
          disabled={!selectedPost}
        >
          🧵 スレッド表示
        </button>
      </div>

      {/* Content */}
      <div className="post-management-demo__content">
        {viewMode === 'list' ? (
          <PostList
            posts={posts}
            discussionPoints={discussionPoints}
            discussionId="demo-discussion"
            filters={filters}
            sortOptions={sortOptions}
            onFiltersChange={handleFiltersChange}
            onSortChange={handleSortChange}
            onCreatePost={handleCreatePost}
            onReactToPost={handleReactToPost}
            onEditPost={handleEditPost}
            onDeletePost={handleDeletePost}
            onHidePost={handleHidePost}
            onShowPost={handleShowPost}
            onFlagPost={handleFlagPost}
            onUnflagPost={handleUnflagPost}
            onRestorePost={handleRestorePost}
            showCreateForm={true}
            showFilters={true}
            showSorting={true}
            groupByPoint={true}
            maxReplyLevel={3}
          />
        ) : (
          selectedPost && (
            <div className="post-management-demo__thread-view">
              <div className="post-management-demo__thread-header">
                <button
                  type="button"
                  className="post-management-demo__back-button"
                  onClick={() => setViewMode('list')}
                >
                  ← リスト表示に戻る
                </button>
                <h3>スレッド表示</h3>
              </div>
              
              <PostThread
                rootPost={selectedPost}
                replies={getRepliesForPost(selectedPost.postId)}
                onReact={handleReactToPost}
                onReply={(postId) => alert(`返信機能は実装予定です。投稿ID: ${postId}`)}
                onEdit={handleEditPost}
                onDelete={handleDeletePost}
                onHide={handleHidePost}
                onShow={handleShowPost}
                maxLevel={3}
                showAllReplies={false}
              />
            </div>
          )
        )}
      </div>

      {/* Feature Information */}
      <div className="post-management-demo__features">
        <h3>実装済み機能</h3>
        <div className="post-management-demo__feature-grid">
          <div className="post-management-demo__feature-card">
            <h4>📝 投稿作成</h4>
            <ul>
              <li>論点選択</li>
              <li>リッチテキスト編集</li>
              <li>スタンス設定</li>
              <li>ファイル添付</li>
              <li>返信機能</li>
            </ul>
          </div>
          
          <div className="post-management-demo__feature-card">
            <h4>🔍 フィルタリング</h4>
            <ul>
              <li>テキスト検索</li>
              <li>論点別フィルタ</li>
              <li>スタンス別フィルタ</li>
              <li>ユーザー別フィルタ</li>
              <li>日付範囲フィルタ</li>
            </ul>
          </div>
          
          <div className="post-management-demo__feature-card">
            <h4>📊 ソート機能</h4>
            <ul>
              <li>投稿日時順</li>
              <li>更新日時順</li>
              <li>リアクション数順</li>
              <li>返信数順</li>
              <li>昇順・降順切り替え</li>
            </ul>
          </div>
          
          <div className="post-management-demo__feature-card">
            <h4>👍 インタラクション</h4>
            <ul>
              <li>5種類のリアクション</li>
              <li>リアクション数表示</li>
              <li>返信機能</li>
              <li>投稿編集・削除</li>
              <li>基本的なモデレーション</li>
            </ul>
          </div>
          
          <div className="post-management-demo__feature-card">
            <h4>🛡️ モデレーション</h4>
            <ul>
              <li>投稿の非表示・表示</li>
              <li>投稿の削除・復元</li>
              <li>投稿のフラグ管理</li>
              <li>モデレーション履歴</li>
              <li>理由付きアクション</li>
            </ul>
          </div>
          
          <div className="post-management-demo__feature-card">
            <h4>🧵 スレッド表示</h4>
            <ul>
              <li>階層構造表示</li>
              <li>返信の展開・折りたたみ</li>
              <li>最大階層レベル制限</li>
              <li>スレッド統計表示</li>
              <li>ナビゲーション機能</li>
            </ul>
          </div>
          
          <div className="post-management-demo__feature-card">
            <h4>🎨 UI/UX</h4>
            <ul>
              <li>レスポンシブデザイン</li>
              <li>ダークモード対応</li>
              <li>アクセシビリティ対応</li>
              <li>アニメーション効果</li>
              <li>モバイル最適化</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};