import React, { useState } from 'react';
import { PostListItem } from '../../types/post';
import { Stance, ReactionType } from '../../types/common';
import { useAuth } from '../../contexts/AuthContext';
import { PostReportDialog } from '../moderation/PostReportDialog';
import { FileAttachmentDisplay } from './FileAttachmentDisplay';
import { PostModerationPanel } from './PostModerationPanel';
import './PostCard.css';

interface PostCardProps {
  post: PostListItem;
  onReact?: (postId: string, reactionType: ReactionType) => Promise<void>;
  onReply?: (postId: string) => void;
  onEdit?: (postId: string) => void;
  onDelete?: (postId: string) => Promise<void>;
  onHide?: (postId: string, reason?: string) => Promise<void>;
  onShow?: (postId: string) => Promise<void>;
  onFlag?: (postId: string, reason: string) => Promise<void>;
  onUnflag?: (postId: string) => Promise<void>;
  onRestore?: (postId: string) => Promise<void>;
  showActions?: boolean;
  showModerationPanel?: boolean;
  showReplies?: boolean;
  isReply?: boolean;
  level?: number;
  maxLevel?: number;
  className?: string;
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  onReact,
  onReply,
  onEdit,
  onDelete,
  onHide,
  onShow,
  onFlag,
  onUnflag,
  onRestore,
  showActions = true,
  showModerationPanel = true,
  showReplies = true,
  isReply = false,
  level = 0,
  maxLevel = 3,
  className = '',
}) => {
  const { user, hasPermission } = useAuth();
  const [isReacting, setIsReacting] = useState<ReactionType | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [isHiding, setIsHiding] = useState(false);
  const [showFullContent, setShowFullContent] = useState(false);

  const isOwner = user?.userId === post.authorId;
  const canEdit = isOwner && post.canEdit;
  const canDelete = (isOwner && post.canDelete) || hasPermission('canModerate');
  const canModerate = hasPermission('canModerate');
  const canReact = post.canReact && user;
  const canReply = post.canReply && user && level < maxLevel;

  const getStanceColor = (stance: Stance): string => {
    switch (stance) {
      case Stance.PROS:
        return '#22c55e';
      case Stance.CONS:
        return '#ef4444';
      case Stance.NEUTRAL:
        return '#64748b';
      case Stance.UNKNOWN:
        return '#a855f7';
      default:
        return '#64748b';
    }
  };

  const getStanceLabel = (stance: Stance): string => {
    switch (stance) {
      case Stance.PROS:
        return '賛成';
      case Stance.CONS:
        return '反対';
      case Stance.NEUTRAL:
        return '中立';
      case Stance.UNKNOWN:
        return 'わからない';
      case Stance.HIDDEN:
        return '非表示';
      default:
        return '不明';
    }
  };

  const getReactionIcon = (reactionType: ReactionType): string => {
    switch (reactionType) {
      case ReactionType.LIKE:
        return '👍';
      case ReactionType.AGREE:
        return '✅';
      case ReactionType.DISAGREE:
        return '❌';
      case ReactionType.INSIGHTFUL:
        return '💡';
      case ReactionType.FUNNY:
        return '😄';
      default:
        return '👍';
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'たった今';
    if (diffMins < 60) return `${diffMins}分前`;
    if (diffHours < 24) return `${diffHours}時間前`;
    if (diffDays < 7) return `${diffDays}日前`;

    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleReaction = async (reactionType: ReactionType) => {
    if (!onReact || !canReact || isReacting) return;

    setIsReacting(reactionType);
    try {
      await onReact(post.postId, reactionType);
    } catch (error) {
      console.error('Failed to react to post:', error);
    } finally {
      setIsReacting(null);
    }
  };

  const handleDelete = async () => {
    if (!onDelete || !canDelete || isDeleting) return;

    const confirmed = window.confirm('この投稿を削除しますか？この操作は取り消せません。');
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      await onDelete(post.postId);
    } catch (error) {
      console.error('Failed to delete post:', error);
      alert('投稿の削除に失敗しました。');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleHide = async (reason?: string) => {
    if (!onHide || !canModerate || isHiding) return;

    setIsHiding(true);
    try {
      await onHide(post.postId, reason);
    } catch (error) {
      console.error('Failed to hide post:', error);
      alert('投稿の非表示に失敗しました。');
    } finally {
      setIsHiding(false);
    }
  };

  const handleShow = async () => {
    if (!onShow || !canModerate || isHiding) return;

    setIsHiding(true);
    try {
      await onShow(post.postId);
    } catch (error) {
      console.error('Failed to show post:', error);
      alert('投稿の表示に失敗しました。');
    } finally {
      setIsHiding(false);
    }
  };

  const handleFlag = async (reason: string) => {
    if (!onFlag || !canModerate) return;

    try {
      await onFlag(post.postId, reason);
    } catch (error) {
      console.error('Failed to flag post:', error);
      alert('投稿のフラグに失敗しました。');
    }
  };

  const handleUnflag = async () => {
    if (!onUnflag || !canModerate) return;

    try {
      await onUnflag(post.postId);
    } catch (error) {
      console.error('Failed to unflag post:', error);
      alert('投稿のフラグ解除に失敗しました。');
    }
  };

  const handleRestore = async () => {
    if (!onRestore || !canModerate) return;

    try {
      await onRestore(post.postId);
    } catch (error) {
      console.error('Failed to restore post:', error);
      alert('投稿の復元に失敗しました。');
    }
  };

  const shouldTruncateContent = post.content.text.length > 300;
  const displayContent =
    showFullContent || !shouldTruncateContent
      ? post.content.text
      : post.content.text.substring(0, 300) + '...';

  return (
    <article
      className={`post-card ${className} ${isReply ? 'post-card--reply' : ''}`}
      style={{ '--reply-level': level } as React.CSSProperties}
    >
      {/* Post Header */}
      <header className="post-card__header">
        <div className="post-card__author">
          {post.authorAvatar && (
            <img
              src={post.authorAvatar}
              alt={post.authorDisplayName}
              className="post-card__avatar"
            />
          )}
          <div className="post-card__author-info">
            <div className="post-card__author-name">{post.authorDisplayName}</div>
            <div className="post-card__meta">
              <time className="post-card__timestamp" dateTime={post.createdAt}>
                {formatDate(post.createdAt)}
              </time>
              {post.isEdited && (
                <span className="post-card__edited" title="編集済み">
                  (編集済み)
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="post-card__stance">
          <span
            className="post-card__stance-badge"
            style={{ backgroundColor: getStanceColor(post.stance) }}
          >
            {getStanceLabel(post.stance)}
          </span>
        </div>
      </header>

      {/* Discussion Point */}
      <div className="post-card__point">
        <span className="post-card__point-label">論点:</span>
        <span className="post-card__point-title">{post.discussionPointTitle}</span>
      </div>

      {/* Post Content */}
      <div className="post-card__content">
        <div className="post-card__text">{displayContent}</div>

        {shouldTruncateContent && (
          <button
            type="button"
            className="post-card__expand-button"
            onClick={() => setShowFullContent(!showFullContent)}
          >
            {showFullContent ? '折りたたむ' : 'もっと見る'}
          </button>
        )}

        {/* File Attachments */}
        {post.attachments && (
          <div className="post-card__attachments">
            <FileAttachmentDisplay
              attachments={[]} // TODO: Load actual attachments
              showRemoveButton={false}
              showDownloadButton={true}
              maxDisplayCount={5}
            />
          </div>
        )}
      </div>

      {/* Post Actions */}
      {showActions && (
        <footer className="post-card__actions">
          {/* Reactions */}
          <div className="post-card__reactions">
            {/* {Object.entries(ReactionType).map(([key, reactionType]) => {
              const count = post?.userReaction[reactionType] || 0;
              const count = post?.statistics?.[reactionType.toLowerCase() + 'Count'] || 0;

              const isUserReaction = post.userReaction === reactionType;
              const isLoading = isReacting === reactionType;

              return (
                <button
                  key={reactionType}
                  type="button"
                  className={`post-card__reaction ${
                    isUserReaction ? 'post-card__reaction--active' : ''
                  } ${isLoading ? 'post-card__reaction--loading' : ''}`}
                  onClick={() => handleReaction(reactionType)}
                  disabled={!canReact || isLoading}
                  title={`${key} (${count})`}
                >
                  <span className="post-card__reaction-icon">
                    {getReactionIcon(reactionType)}
                  </span>
                  {count > 0 && (
                    <span className="post-card__reaction-count">{count}</span>
                  )}
                </button>
              );
            })} */}
            {Object.entries(ReactionType).map(([key, reactionType]) => {
              const reactionKeyMap: Record<ReactionType, keyof PostListItem['statistics']> = {
                [ReactionType.LIKE]: 'likeCount',
                [ReactionType.AGREE]: 'agreeCount',
                [ReactionType.DISAGREE]: 'disagreeCount',
                [ReactionType.INSIGHTFUL]: 'insightfulCount',
                [ReactionType.FUNNY]: 'funnyCount',
              };
              const count = post?.statistics?.[reactionKeyMap[reactionType]] || 0;
              const isUserReaction = post.userReaction === reactionType;
              const isLoading = isReacting === reactionType;

              return (
                <button
                  key={reactionType}
                  type="button"
                  className={`post-card__reaction ${
                    isUserReaction ? 'post-card__reaction--active' : ''
                  } ${isLoading ? 'post-card__reaction--loading' : ''}`}
                  onClick={() => handleReaction(reactionType)}
                  disabled={!canReact || isLoading}
                  title={`${key} (${count})`}
                >
                  <span className="post-card__reaction-icon">{getReactionIcon(reactionType)}</span>
                  {count > 0 && <span className="post-card__reaction-count">{count}</span>}
                </button>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className="post-card__action-buttons">
            {canReply && (
              <button
                type="button"
                className="post-card__action-button"
                onClick={() => onReply?.(post.postId)}
                title="返信"
              >
                💬 返信
                {post.replyCount > 0 && (
                  <span className="post-card__reply-count">({post.replyCount})</span>
                )}
              </button>
            )}

            {canEdit && (
              <button
                type="button"
                className="post-card__action-button"
                onClick={() => onEdit?.(post.postId)}
                title="編集"
              >
                ✏️ 編集
              </button>
            )}

            {canDelete && (
              <button
                type="button"
                className="post-card__action-button post-card__action-button--danger"
                onClick={handleDelete}
                disabled={isDeleting}
                title="削除"
              >
                {isDeleting ? '削除中...' : '🗑️ 削除'}
              </button>
            )}

            {/* Report Button - Available to all authenticated users except post author */}
            {user && user.userId !== post.authorId && (
              <button
                type="button"
                className="post-card__action-button post-card__action-button--report"
                onClick={() => setShowReportDialog(true)}
                title="報告"
              >
                🚩 報告
              </button>
            )}
          </div>
        </footer>
      )}

      {/* Moderation Panel */}
      {showModerationPanel && canModerate && (
        <PostModerationPanel
          post={post}
          onHidePost={handleHide}
          onShowPost={handleShow}
          onDeletePost={async (postId, reason) => {
            if (onDelete) {
              await onDelete(postId);
            }
          }}
          onRestorePost={handleRestore}
          onFlagPost={handleFlag}
          onUnflagPost={handleUnflag}
          moderationHistory={[]} // TODO: Load actual moderation history
        />
      )}

      {/* Report Dialog */}
      <PostReportDialog
        post={post}
        isOpen={showReportDialog}
        onClose={() => setShowReportDialog(false)}
        onReportSubmitted={() => {
          // Optionally refresh post data or show success message
        }}
      />
    </article>
  );
};
