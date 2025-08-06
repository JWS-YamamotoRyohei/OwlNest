import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DiscussionDetail, DiscussionPoint } from '../types/discussion';
import { PostListItem, PostFilters, PostSortOptions } from '../types/post';
import { Stance } from '../types/common';
import { PostList } from '../components/posts/PostList';
import { PostCreationDemo } from '../components/posts/PostCreationDemo';
import { Breadcrumb } from '../components/navigation/Breadcrumb';
import { SEO } from '../components/common/SEO';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';
import { useRealtimeDiscussion } from '../hooks/useRealtimeDiscussion';
import { ConnectionStatus } from '../components/websocket/ConnectionStatus';
import { TypingIndicator } from '../components/realtime/TypingIndicator';
import { RealtimeStatus } from '../components/realtime/RealtimeStatus';
import { Post } from '../types/post';
import './DiscussionPage.css';

const DiscussionPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();

  // State management
  const [discussion, setDiscussion] = useState<DiscussionDetail | null>(null);
  const [posts, setPosts] = useState<PostListItem[]>([]);
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showPostForm, setShowPostForm] = useState(false);

  // Post filters and sorting
  const [postFilters, setPostFilters] = useState<PostFilters>({});
  const [postSort, setPostSort] = useState<PostSortOptions>({
    field: 'createdAt',
    direction: 'desc'
  });

  // Real-time discussion updates
  const {
    joinDiscussion,
    leaveDiscussion,
    broadcastPost,
    broadcastTyping,
    isConnected: isRealtimeConnected,
    connectedUsers,
    typingUsers
  } = useRealtimeDiscussion({
    discussionId: id || '',
    onNewPost: (post: Post) => {
      console.log('New post received:', post);
      // Add the new post to the current posts if it matches the selected point
      if (!selectedPointId || post.discussionPointId === selectedPointId) {
        setPosts(prevPosts => {
          // Check if post already exists to avoid duplicates
          if (prevPosts.some(p => p.postId === post.postId)) {
            return prevPosts;
          }
          return [post as PostListItem, ...prevPosts];
        });
      }
    },
    onPostUpdated: (post: Post) => {
      console.log('Post updated:', post);
      // Update the post in the current posts list
      setPosts(prevPosts => 
        prevPosts.map(p => p.postId === post.postId ? post as PostListItem : p)
      );
    },
    onPostDeleted: (postId: string) => {
      console.log('Post deleted:', postId);
      // Remove the post from the current posts list
      setPosts(prevPosts => prevPosts.filter(p => p.postId !== postId));
    },
    onPostReactionChanged: (postId: string, reactionData: any) => {
      console.log('Post reaction changed:', postId, reactionData);
      // Update the post's reaction counts
      setPosts(prevPosts => 
        prevPosts.map(p => {
          if (p.postId === postId) {
            // Update reaction counts based on the reaction data
            const updatedReactions = { ...p.reactions };
            if (reactionData.action === 'add') {
              updatedReactions[reactionData.reactionType] = (updatedReactions[reactionData.reactionType] || 0) + 1;
            } else if (reactionData.action === 'remove') {
              updatedReactions[reactionData.reactionType] = Math.max(0, (updatedReactions[reactionData.reactionType] || 0) - 1);
            }
            return { ...p, reactions: updatedReactions };
          }
          return p;
        })
      );
    },
    onPostVisibilityChanged: (postId: string, isHidden: boolean, reason?: string) => {
      console.log('Post visibility changed:', postId, isHidden, reason);
      // Update the post's visibility status or remove from list if hidden
      if (isHidden) {
        setPosts(prevPosts => prevPosts.filter(p => p.postId !== postId));
      } else {
        // Reload posts to show the restored post
        loadPosts();
      }
    },
    onUserJoined: (userId: string) => {
      console.log('User joined discussion:', userId);
    },
    onUserLeft: (userId: string) => {
      console.log('User left discussion:', userId);
    },
    onTypingStart: (userId: string, userName: string) => {
      console.log('User started typing:', userId, userName);
    },
    onTypingStop: (userId: string) => {
      console.log('User stopped typing:', userId);
    },
    onDiscussionUpdated: (discussionData: any) => {
      console.log('Discussion updated:', discussionData);
      // Update discussion data if needed
      if (discussion) {
        setDiscussion(prev => ({ ...prev, ...discussionData }));
      }
    },
    autoJoin: true,
  });

  // Mock data generator
  const generateMockDiscussion = (discussionId: string): DiscussionDetail => ({
    PK: `DISCUSSION#${discussionId}`,
    SK: 'METADATA',
    GSI1PK: `CATEGORY#politics`,
    GSI1SK: `DISCUSSION#${discussionId}`,
    GSI2PK: `OWNER#user_1`,
    GSI2SK: `DISCUSSION#${discussionId}`,
    EntityType: 'Discussion' as any,
    discussionId,
    title: '議論タイトル例',
    description: 'これは議論の詳細説明です。この議論では様々な観点から意見を交換し、建設的な対話を目指します。',
    ownerId: 'user_1',
    ownerDisplayName: '議論作成者',
    ownerStance: Stance.NEUTRAL,
    categories: ['politics' as any],
    tags: ['政治', '社会'],
    accessControl: {
      type: 'open' as any,
      userIds: []
    },
    isActive: true,
    isLocked: false,
    isPinned: false,
    isFeatured: false,
    moderation: {
      isHidden: false,
      isDeleted: false,
      isReported: false
    },
    statistics: {
      viewCount: 150,
      participantCount: 25,
      postCount: 48,
      reactionCount: 120,
      shareCount: 8,
      prosCount: 20,
      consCount: 15,
      neutralCount: 10,
      unknownCount: 3,
      pointsCount: 3,
      followersCount: 12,
      uniqueParticipants: 25,
      averagePostLength: 150,
      engagementRate: 0.75,
      lastActivityAt: new Date().toISOString()
    },
    metadata: {
      version: 1,
      language: 'ja',
      lastModifiedBy: 'user_1',
      changeLog: []
    },
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    points: [
      {
        PK: `DISCUSSION#${discussionId}`,
        SK: 'POINT#point_1',
        GSI1PK: `DISCUSSION#${discussionId}`,
        GSI1SK: 'POINT#1',
        EntityType: 'DiscussionPoint' as any,
        pointId: 'point_1',
        discussionId,
        title: '論点1: 基本的な考え方',
        description: 'この論点では基本的な考え方について議論します',
        level: 0,
        order: 1,
        postCount: 15,
        prosCount: 8,
        consCount: 5,
        neutralCount: 2,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        PK: `DISCUSSION#${discussionId}`,
        SK: 'POINT#point_2',
        GSI1PK: `DISCUSSION#${discussionId}`,
        GSI1SK: 'POINT#2',
        EntityType: 'DiscussionPoint' as any,
        pointId: 'point_2',
        discussionId,
        title: '論点2: 実装方法',
        description: '具体的な実装方法について検討します',
        level: 0,
        order: 2,
        postCount: 20,
        prosCount: 12,
        consCount: 6,
        neutralCount: 2,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        PK: `DISCUSSION#${discussionId}`,
        SK: 'POINT#point_3',
        GSI1PK: `DISCUSSION#${discussionId}`,
        GSI1SK: 'POINT#3',
        EntityType: 'DiscussionPoint' as any,
        pointId: 'point_3',
        discussionId,
        title: '論点3: 将来的な展望',
        description: '将来的な展望と課題について議論します',
        level: 0,
        order: 3,
        postCount: 13,
        prosCount: 7,
        consCount: 4,
        neutralCount: 2,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ],
    backgroundKnowledge: [],
    recentPosts: [],
    topContributors: [],
    isFollowing: false,
    canEdit: user?.userId === 'user_1',
    canDelete: user?.userId === 'user_1' || hasPermission('canModerate'),
    canModerate: hasPermission('canModerate')
  });

  // Load discussion data
  const loadDiscussion = useCallback(async () => {
    if (!id) {
      navigate('/discussions');
      return;
    }

    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      const mockDiscussion = generateMockDiscussion(id);
      setDiscussion(mockDiscussion);
      setIsFollowing(mockDiscussion.isFollowing || false);
      
      // Set default selected point
      if (mockDiscussion.points.length > 0) {
        setSelectedPointId(mockDiscussion.points[0].pointId);
      }
    } catch (error) {
      console.error('Failed to load discussion:', error);
      navigate('/discussions');
    } finally {
      setIsLoading(false);
    }
  }, [id, navigate, user, hasPermission]);

  // Load posts for selected point
  const loadPosts = useCallback(async () => {
    if (!selectedPointId || !discussion) return;

    try {
      // Mock posts data
      const mockPosts: PostListItem[] = Array.from({ length: 10 }, (_, i) => ({
        postId: `post_${selectedPointId}_${i + 1}`,
        discussionId: discussion.discussionId,
        discussionTitle: discussion.title,
        discussionPointId: selectedPointId,
        discussionPointTitle: discussion.points.find(p => p.pointId === selectedPointId)?.title || '',
        authorId: `user_${Math.floor(Math.random() * 5) + 1}`,
        authorDisplayName: `ユーザー${Math.floor(Math.random() * 5) + 1}`,
        authorAvatar: undefined,
        content: {
          text: `これは論点「${discussion.points.find(p => p.pointId === selectedPointId)?.title}」に対する投稿 ${i + 1} です。詳細な意見や考察を含んでいます。`,
          formatting: {},
          attachments: []
        },
        stance: [Stance.PROS, Stance.CONS, Stance.NEUTRAL, Stance.UNKNOWN][Math.floor(Math.random() * 4)],
        reactions: {},
        reactionCounts: {
          like: Math.floor(Math.random() * 10),
          agree: Math.floor(Math.random() * 8),
          disagree: Math.floor(Math.random() * 5),
          insightful: Math.floor(Math.random() * 3),
          funny: Math.floor(Math.random() * 2)
        },
        replyCount: Math.floor(Math.random() * 5),
        isEdited: Math.random() > 0.8,
        createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
        canEdit: Math.random() > 0.7,
        canDelete: Math.random() > 0.8,
        canModerate: hasPermission('canModerate'),
        replies: [],
        parentPost: undefined
      }));

      setPosts(mockPosts);
    } catch (error) {
      console.error('Failed to load posts:', error);
    }
  }, [selectedPointId, discussion, hasPermission]);

  // Handle follow/unfollow
  const handleFollowToggle = useCallback(async () => {
    if (!discussion) return;

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      setIsFollowing(!isFollowing);
    } catch (error) {
      console.error('Failed to toggle follow:', error);
    }
  }, [discussion, isFollowing]);

  // Handle post creation
  const handlePostCreate = useCallback(() => {
    setShowPostForm(true);
  }, []);

  // Handle post form close
  const handlePostFormClose = useCallback(() => {
    setShowPostForm(false);
  }, []);

  // Initial load
  useEffect(() => {
    loadDiscussion();
  }, [loadDiscussion]);

  // Load posts when point changes
  useEffect(() => {
    if (selectedPointId) {
      loadPosts();
    }
  }, [selectedPointId, loadPosts]);

  // Loading state
  if (isLoading || !discussion) {
    return (
      <div className="discussion-page discussion-page--loading">
        <LoadingSpinner size="large" message="議論を読み込み中..." fullScreen />
      </div>
    );
  }

  const getStanceColor = (stance: Stance): string => {
    switch (stance) {
      case Stance.PROS: return 'var(--color-pros)';
      case Stance.CONS: return 'var(--color-cons)';
      case Stance.NEUTRAL: return 'var(--color-neutral)';
      case Stance.UNKNOWN: return 'var(--color-unknown)';
      default: return 'var(--color-neutral)';
    }
  };

  const getStanceLabel = (stance: Stance): string => {
    switch (stance) {
      case Stance.PROS: return '賛成';
      case Stance.CONS: return '反対';
      case Stance.NEUTRAL: return '中立';
      case Stance.UNKNOWN: return 'わからない';
      default: return '不明';
    }
  };

  return (
    <>
      <SEO
        title={`${discussion.title} - OwlNest`}
        description={discussion.description}
        keywords={[...discussion.categories, ...(discussion.tags || [])]}
        type="article"
      />

      <div className="discussion-page">
        <Breadcrumb
          items={[
            { label: 'ホーム', path: '/discussions', icon: '🏠' },
            { label: '議論一覧', path: '/discussions', icon: '💬' },
            { label: discussion.title, icon: '📝' }
          ]}
        />

        {/* Discussion Header */}
        <div className="discussion-page__header">
          <div className="discussion-page__header-content">
            <div className="discussion-page__title-section">
              <h1 className="discussion-page__title">{discussion.title}</h1>
              <p className="discussion-page__description">{discussion.description}</p>
            </div>

            <div className="discussion-page__actions">
              {user && (
                <button
                  className={`discussion-page__follow-button ${
                    isFollowing ? 'discussion-page__follow-button--following' : ''
                  }`}
                  onClick={handleFollowToggle}
                >
                  {isFollowing ? '❤️ フォロー中' : '🤍 フォロー'}
                </button>
              )}
            </div>
          </div>

          <div className="discussion-page__meta">
            <div className="discussion-page__owner">
              <div className="discussion-page__owner-avatar">
                {discussion.ownerDisplayName.charAt(0)}
              </div>
              <div className="discussion-page__owner-info">
                <span className="discussion-page__owner-name">
                  {discussion.ownerDisplayName}
                </span>
                <span 
                  className="discussion-page__owner-stance"
                  style={{ color: getStanceColor(discussion.ownerStance) }}
                >
                  {getStanceLabel(discussion.ownerStance)}
                </span>
              </div>
            </div>

            <div className="discussion-page__stats">
              <div className="discussion-page__stat">
                <span className="discussion-page__stat-icon">👥</span>
                <span className="discussion-page__stat-value">
                  {discussion.statistics.participantCount}
                </span>
                <span className="discussion-page__stat-label">参加者</span>
              </div>
              <div className="discussion-page__stat">
                <span className="discussion-page__stat-icon">💬</span>
                <span className="discussion-page__stat-value">
                  {discussion.statistics.postCount}
                </span>
                <span className="discussion-page__stat-label">投稿</span>
              </div>
              <div className="discussion-page__stat">
                <span className="discussion-page__stat-icon">❤️</span>
                <span className="discussion-page__stat-value">
                  {discussion.statistics.followersCount}
                </span>
                <span className="discussion-page__stat-label">フォロワー</span>
              </div>
            </div>
          </div>

          <div className="discussion-page__categories">
            {discussion.categories.map((category, index) => (
              <span key={index} className="discussion-page__category">
                {category}
              </span>
            ))}
            {discussion.tags && discussion.tags.map((tag, index) => (
              <span key={index} className="discussion-page__tag">
                #{tag}
              </span>
            ))}
          </div>

          {/* Real-time Connection Status */}
          <div className="discussion-page__realtime-status">
            <RealtimeStatus
              isConnected={isRealtimeConnected}
              connectedUsers={connectedUsers}
              showUserCount={true}
              showConnectionStatus={true}
              className="realtime-status--compact"
            />
          </div>
        </div>

        {/* Main Content */}
        <div className="discussion-page__main">
          {/* Discussion Points Navigation */}
          <div className="discussion-page__points-nav">
            <h3 className="discussion-page__points-title">議論の論点</h3>
            <div className="discussion-page__points-list">
              {discussion.points.map((point) => (
                <button
                  key={point.pointId}
                  className={`discussion-page__point-button ${
                    selectedPointId === point.pointId ? 'discussion-page__point-button--active' : ''
                  }`}
                  onClick={() => setSelectedPointId(point.pointId)}
                >
                  <div className="discussion-page__point-title">{point.title}</div>
                  <div className="discussion-page__point-stats">
                    <span className="discussion-page__point-stat">
                      💬 {point.postCount}
                    </span>
                    <span className="discussion-page__point-stat discussion-page__point-stat--pros">
                      👍 {point.prosCount}
                    </span>
                    <span className="discussion-page__point-stat discussion-page__point-stat--cons">
                      👎 {point.consCount}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Posts Section */}
          <div className="discussion-page__posts-section">
            {selectedPointId && (
              <>
                <div className="discussion-page__posts-header">
                  <h3 className="discussion-page__posts-title">
                    {discussion.points.find(p => p.pointId === selectedPointId)?.title}
                  </h3>
                  
                  {user && hasPermission('canPost') && (
                    <button
                      className="discussion-page__create-post-button"
                      onClick={handlePostCreate}
                    >
                      💬 投稿する
                    </button>
                  )}
                </div>

                {showPostForm && (
                  <div className="discussion-page__post-form">
                    <PostCreationDemo />
                    <div className="discussion-page__post-form-actions">
                      <button
                        className="discussion-page__post-form-cancel"
                        onClick={handlePostFormClose}
                      >
                        キャンセル
                      </button>
                    </div>
                  </div>
                )}

                {/* Typing Indicator */}
                <TypingIndicator
                  typingUsers={typingUsers}
                  currentUserId={user?.userId}
                  className="discussion-page__typing-indicator"
                />

                <PostList
                  posts={posts}
                  filters={postFilters}
                  sortOptions={postSort}
                  onFiltersChange={setPostFilters}
                  onSortChange={setPostSort}
                  showFilters={true}
                  showSort={true}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
export default DiscussionPage;