import React from 'react';
import { Link } from 'react-router-dom';
import { DiscussionListItem } from '../../types/discussion';
import { Stance } from '../../types/common';
import { useAuth } from '../../contexts/AuthContext';
import { optimizeComponent } from '../common/OptimizedComponent';
import { RoutePreloader } from '../../utils/routePreloader';
import './DiscussionCard.css';

interface DiscussionCardProps {
  discussion: DiscussionListItem;
  onFollow?: (discussionId: string) => void;
  onUnfollow?: (discussionId: string) => void;
  isFollowing?: boolean;
  showFollowButton?: boolean;
  compact?: boolean;
}

const DiscussionCardComponent: React.FC<DiscussionCardProps> = ({
  discussion,
  onFollow,
  onUnfollow,
  isFollowing = false,
  showFollowButton = true,
  compact = false,
}) => {
  const { user } = useAuth();
  console.log('discussion!1', discussion);
  console.log('discussion!2', discussion.categories);
  console.log('discussion!3', discussion.categories.slice(0, 3));
  const getStanceColor = (stance: Stance): string => {
    switch (stance) {
      case Stance.PROS:
        return 'var(--color-pros)';
      case Stance.CONS:
        return 'var(--color-cons)';
      case Stance.NEUTRAL:
        return 'var(--color-neutral)';
      case Stance.UNKNOWN:
        return 'var(--color-unknown)';
      default:
        return 'var(--color-neutral)';
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
      default:
        return '不明';
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) {
      return '1時間未満前';
    } else if (diffInHours < 24) {
      return `${diffInHours}時間前`;
    } else if (diffInHours < 24 * 7) {
      const days = Math.floor(diffInHours / 24);
      return `${days}日前`;
    } else {
      return date.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    }
  };

  const handleFollowClick = React.useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (isFollowing && onUnfollow) {
        onUnfollow(discussion.discussionId);
      } else if (!isFollowing && onFollow) {
        onFollow(discussion.discussionId);
      }
    },
    [isFollowing, onUnfollow, onFollow, discussion.discussionId]
  );

  const handleLinkHover = React.useCallback(() => {
    RoutePreloader.onLinkHover('discussion');
  }, []);

  return (
    <article className={`discussion-card ${compact ? 'discussion-card--compact' : ''}`}>
      <div className="discussion-card__header">
        <div className="discussion-card__status-indicators">
          {discussion.isPinned && (
            <span className="discussion-card__badge discussion-card__badge--pinned">
              📌 ピン留め
            </span>
          )}
          {discussion.isFeatured && (
            <span className="discussion-card__badge discussion-card__badge--featured">⭐ 注目</span>
          )}
          {discussion.isLocked && (
            <span className="discussion-card__badge discussion-card__badge--locked">
              🔒 ロック済み
            </span>
          )}
          {!discussion.isActive && (
            <span className="discussion-card__badge discussion-card__badge--inactive">
              ⏸️ 非アクティブ
            </span>
          )}
        </div>

        {showFollowButton && user && (
          <button
            className={`discussion-card__follow-button ${
              isFollowing ? 'discussion-card__follow-button--following' : ''
            }`}
            onClick={handleFollowClick}
            aria-label={isFollowing ? 'フォローを解除' : 'フォローする'}
          >
            {isFollowing ? '❤️ フォロー中' : '🤍 フォロー'}
          </button>
        )}
      </div>

      <Link
        to={`/discussion/${discussion.discussionId}`}
        className="discussion-card__content"
        onMouseEnter={handleLinkHover}
      >
        <h3 className="discussion-card__title">{discussion.title}</h3>

        <p className="discussion-card__description">{discussion.description}</p>

        <div className="discussion-card__categories">
          {discussion.categories.slice(0, 3).map((category, index) => (
            <span key={index} className="discussion-card__category">
              {category}
            </span>
          ))}
          {discussion.categories.length > 3 && (
            <span className="discussion-card__category discussion-card__category--more">
              +{discussion.categories.length - 3}
            </span>
          )}
        </div>

        {discussion.tags && discussion.tags.length > 0 && (
          <div className="discussion-card__tags">
            {discussion.tags.slice(0, 3).map((tag, index) => (
              <span key={index} className="discussion-card__tag">
                #{tag}
              </span>
            ))}
            {discussion.tags.length > 3 && (
              <span className="discussion-card__tag discussion-card__tag--more">
                +{discussion.tags.length - 3}
              </span>
            )}
          </div>
        )}
      </Link>

      <div className="discussion-card__footer">
        <div className="discussion-card__owner">
          <div className="discussion-card__owner-avatar">
            {discussion.ownerDisplayName.charAt(0)}
          </div>
          <div className="discussion-card__owner-info">
            <span className="discussion-card__owner-name">{discussion.ownerDisplayName}</span>
            <span
              className="discussion-card__owner-stance"
              style={{ color: getStanceColor(discussion.ownerStance) }}
            >
              {getStanceLabel(discussion.ownerStance)}
            </span>
          </div>
        </div>

        <div className="discussion-card__stats">
          <div className="discussion-card__stat">
            <span className="discussion-card__stat-icon">👥</span>
            <span className="discussion-card__stat-value">
              {discussion.statistics.participantCount}
            </span>
          </div>
          <div className="discussion-card__stat">
            <span className="discussion-card__stat-icon">💬</span>
            <span className="discussion-card__stat-value">{discussion.statistics.postCount}</span>
          </div>
          <div className="discussion-card__stat">
            <span className="discussion-card__stat-icon">❤️</span>
            <span className="discussion-card__stat-value">
              {discussion.statistics.followersCount}
            </span>
          </div>
        </div>

        <div className="discussion-card__activity">
          <span className="discussion-card__last-activity">
            最終更新: {formatDate(discussion.lastActivityAt)}
          </span>
        </div>
      </div>
    </article>
  );
};

// Export optimized component
export const DiscussionCard = optimizeComponent(DiscussionCardComponent, {
  displayName: 'DiscussionCard',
  memo: true,
  performanceMonitoring: true,
});
