import React, { useState } from 'react';
import {
  FollowListItem,
  FollowTargetType,
  UserFollowInfo,
  DiscussionFollowInfo,
} from '../../types';
import { FollowButton } from './FollowButton';
import './FollowList.css';

interface FollowListProps {
  items: FollowListItem[];
  targetType: FollowTargetType;
  isLoading?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
  emptyMessage?: string;
  className?: string;
}

export const FollowList: React.FC<FollowListProps> = ({
  items,
  targetType,
  isLoading = false,
  onLoadMore,
  hasMore = false,
  emptyMessage,
  className = '',
}) => {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpanded = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const formatDate = (dateString: string) => {
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
      return date.toLocaleDateString('ja-JP');
    }
  };

  const renderUserItem = (item: FollowListItem) => {
    const userInfo = item.targetInfo as UserFollowInfo;
    const isExpanded = expandedItems.has(item.followId);

    return (
      <div key={item.followId} className="follow-list__item follow-list__item--user">
        <div className="follow-list__item-header">
          <div className="follow-list__item-avatar">
            {userInfo.avatar ? (
              <img src={userInfo.avatar} alt={userInfo.displayName} />
            ) : (
              <div className="follow-list__item-avatar-placeholder">
                {userInfo.displayName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <div className="follow-list__item-info">
            <div className="follow-list__item-name">
              <span className="follow-list__item-display-name">{userInfo.displayName}</span>
              {userInfo.isVerified && (
                <span className="follow-list__item-verified" title="認証済み">
                  ✓
                </span>
              )}
              <span className="follow-list__item-role">{userInfo.role}</span>
            </div>

            {userInfo.bio && (
              <div className="follow-list__item-bio">
                {isExpanded
                  ? userInfo.bio
                  : `${userInfo.bio.slice(0, 100)}${userInfo.bio.length > 100 ? '...' : ''}`}
              </div>
            )}

            <div className="follow-list__item-stats">
              <span>議論: {userInfo.discussionsCount}</span>
              <span>投稿: {userInfo.postsCount}</span>
              <span>フォロワー: {userInfo.followersCount}</span>
              {userInfo.lastActivityAt && (
                <span>最終活動: {formatDate(userInfo.lastActivityAt)}</span>
              )}
            </div>
          </div>

          <div className="follow-list__item-actions">
            <FollowButton
              targetType={FollowTargetType.USER}
              targetId={item.targetId}
              targetName={userInfo.displayName}
              size="small"
              variant="outline"
            />

            {userInfo.bio && userInfo.bio.length > 100 && (
              <button
                className="follow-list__item-expand"
                onClick={() => toggleExpanded(item.followId)}
                aria-label={isExpanded ? '折りたたむ' : '展開する'}
              >
                {isExpanded ? '▲' : '▼'}
              </button>
            )}
          </div>
        </div>

        <div className="follow-list__item-meta">
          <span className="follow-list__item-follow-date">
            {formatDate(item.createdAt)}にフォロー
          </span>

          {item.notificationsEnabled && (
            <span className="follow-list__item-notifications" title="通知有効">
              🔔
            </span>
          )}
        </div>
      </div>
    );
  };

  const renderDiscussionItem = (item: FollowListItem) => {
    const discussionInfo = item.targetInfo as DiscussionFollowInfo;
    const isExpanded = expandedItems.has(item.followId);

    return (
      <div key={item.followId} className="follow-list__item follow-list__item--discussion">
        <div className="follow-list__item-header">
          <div className="follow-list__item-info">
            <div className="follow-list__item-name">
              <span className="follow-list__item-title">{discussionInfo.title}</span>
              {!discussionInfo.isActive && (
                <span className="follow-list__item-inactive" title="非アクティブ">
                  ⏸
                </span>
              )}
            </div>

            <div className="follow-list__item-owner">作成者: {discussionInfo.ownerDisplayName}</div>

            <div className="follow-list__item-description">
              {isExpanded
                ? discussionInfo.description
                : `${discussionInfo.description.slice(0, 150)}${discussionInfo.description.length > 150 ? '...' : ''}`}
            </div>

            <div className="follow-list__item-categories">
              {discussionInfo.categories.map((category, index) => (
                <span key={index} className="follow-list__item-category">
                  {category}
                </span>
              ))}
            </div>

            <div className="follow-list__item-stats">
              <span>参加者: {discussionInfo.participantCount}</span>
              <span>投稿: {discussionInfo.postCount}</span>
              <span>最終活動: {formatDate(discussionInfo.lastActivityAt)}</span>
            </div>
          </div>

          <div className="follow-list__item-actions">
            <FollowButton
              targetType={FollowTargetType.DISCUSSION}
              targetId={item.targetId}
              targetName={discussionInfo.title}
              size="small"
              variant="outline"
            />

            {discussionInfo.description.length > 150 && (
              <button
                className="follow-list__item-expand"
                onClick={() => toggleExpanded(item.followId)}
                aria-label={isExpanded ? '折りたたむ' : '展開する'}
              >
                {isExpanded ? '▲' : '▼'}
              </button>
            )}
          </div>
        </div>

        <div className="follow-list__item-meta">
          <span className="follow-list__item-follow-date">
            {formatDate(item.createdAt)}にフォロー
          </span>

          {item.notificationsEnabled && (
            <span className="follow-list__item-notifications" title="通知有効">
              🔔
            </span>
          )}
        </div>
      </div>
    );
  };

  if (items.length === 0 && !isLoading) {
    return (
      <div className={`follow-list follow-list--empty ${className}`}>
        <div className="follow-list__empty">
          <div className="follow-list__empty-icon">
            {targetType === FollowTargetType.USER ? '👥' : '💬'}
          </div>
          <div className="follow-list__empty-message">
            {emptyMessage ||
              (targetType === FollowTargetType.USER
                ? 'フォロー中のユーザーはいません'
                : 'フォロー中の議論はありません')}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`follow-list ${className}`}>
      <div className="follow-list__items">
        {items.map(item =>
          targetType === FollowTargetType.USER ? renderUserItem(item) : renderDiscussionItem(item)
        )}
      </div>

      {isLoading && (
        <div className="follow-list__loading">
          <div className="follow-list__loading-spinner">
            <div className="spinner"></div>
          </div>
          <span>読み込み中...</span>
        </div>
      )}

      {hasMore && !isLoading && onLoadMore && (
        <div className="follow-list__load-more">
          <button className="follow-list__load-more-button" onClick={onLoadMore}>
            さらに読み込む
          </button>
        </div>
      )}
    </div>
  );
};
