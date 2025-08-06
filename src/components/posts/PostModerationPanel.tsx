import React, { useState } from 'react';
import { PostListItem } from '../../types/post';
import { useAuth } from '../../contexts/AuthContext';
import './PostModerationPanel.css';

interface PostModerationAction {
  id: string;
  postId: string;
  action: 'hide' | 'show' | 'delete' | 'restore' | 'flag' | 'unflag';
  moderatorId: string;
  moderatorName: string;
  reason: string;
  timestamp: string;
  details?: any;
}

interface PostModerationPanelProps {
  post: PostListItem;
  onHidePost?: (postId: string, reason: string) => Promise<void>;
  onShowPost?: (postId: string) => Promise<void>;
  onDeletePost?: (postId: string, reason: string) => Promise<void>;
  onRestorePost?: (postId: string) => Promise<void>;
  onFlagPost?: (postId: string, reason: string) => Promise<void>;
  onUnflagPost?: (postId: string) => Promise<void>;
  moderationHistory?: PostModerationAction[];
  className?: string;
}

export const PostModerationPanel: React.FC<PostModerationPanelProps> = ({
  post,
  onHidePost,
  onShowPost,
  onDeletePost,
  onRestorePost,
  onFlagPost,
  onUnflagPost,
  moderationHistory = [],
  className = '',
}) => {
  const { user, hasPermission } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showReasonDialog, setShowReasonDialog] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const canModerate = hasPermission('canModerate');
  const isDiscussionOwner = user?.userId === post.discussionId; // In real app, check actual ownership
  const canModeratePosts = canModerate || isDiscussionOwner;

  if (!canModeratePosts) {
    return null;
  }

  const handleAction = async (action: string) => {
    if (!reason.trim() && action !== 'show' && action !== 'restore' && action !== 'unflag') {
      alert('理由を入力してください。');
      return;
    }

    setIsProcessing(true);
    try {
      switch (action) {
        case 'hide':
          await onHidePost?.(post.postId, reason);
          break;
        case 'show':
          await onShowPost?.(post.postId);
          break;
        case 'delete':
          await onDeletePost?.(post.postId, reason);
          break;
        case 'restore':
          await onRestorePost?.(post.postId);
          break;
        case 'flag':
          await onFlagPost?.(post.postId, reason);
          break;
        case 'unflag':
          await onUnflagPost?.(post.postId);
          break;
      }
      setShowReasonDialog(null);
      setReason('');
    } catch (error) {
      console.error('Moderation action failed:', error);
      alert('操作に失敗しました。もう一度お試しください。');
    } finally {
      setIsProcessing(false);
    }
  };

  const openReasonDialog = (action: string) => {
    setShowReasonDialog(action);
    setReason('');
  };

  const closeReasonDialog = () => {
    setShowReasonDialog(null);
    setReason('');
  };

  const getActionLabel = (action: string): string => {
    switch (action) {
      case 'hide':
        return '非表示';
      case 'show':
        return '表示';
      case 'delete':
        return '削除';
      case 'restore':
        return '復元';
      case 'flag':
        return 'フラグ';
      case 'unflag':
        return 'フラグ解除';
      default:
        return action;
    }
  };

  const getActionIcon = (action: string): string => {
    switch (action) {
      case 'hide':
        return '👁️‍🗨️';
      case 'show':
        return '👁️';
      case 'delete':
        return '🗑️';
      case 'restore':
        return '♻️';
      case 'flag':
        return '🚩';
      case 'unflag':
        return '🏳️';
      default:
        return '⚙️';
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const predefinedReasons = [
    'スパム・宣伝',
    '不適切な内容',
    'ハラスメント',
    '誤情報・デマ',
    'トピック外の内容',
    '重複投稿',
    '著作権侵害',
    'その他',
  ];

  return (
    <div className={`post-moderation-panel ${className}`}>
      {/* Toggle Button */}
      <button
        type="button"
        className="post-moderation-panel__toggle"
        onClick={() => setIsExpanded(!isExpanded)}
        title="モデレーション機能"
      >
        <span className="post-moderation-panel__toggle-icon">
          {isExpanded ? '▼' : '▶'}
        </span>
        <span className="post-moderation-panel__toggle-text">
          モデレーション
        </span>
        {moderationHistory.length > 0 && (
          <span className="post-moderation-panel__history-count">
            ({moderationHistory.length})
          </span>
        )}
      </button>

      {/* Expanded Panel */}
      {isExpanded && (
        <div className="post-moderation-panel__content">
          {/* Action Buttons */}
          <div className="post-moderation-panel__actions">
            <div className="post-moderation-panel__action-group">
              <h4 className="post-moderation-panel__group-title">表示制御</h4>
              <div className="post-moderation-panel__buttons">
                <button
                  type="button"
                  className="post-moderation-panel__action-button post-moderation-panel__action-button--warning"
                  onClick={() => openReasonDialog('hide')}
                  disabled={isProcessing}
                >
                  👁️‍🗨️ 非表示
                </button>
                <button
                  type="button"
                  className="post-moderation-panel__action-button"
                  onClick={() => handleAction('show')}
                  disabled={isProcessing}
                >
                  👁️ 表示
                </button>
              </div>
            </div>

            <div className="post-moderation-panel__action-group">
              <h4 className="post-moderation-panel__group-title">削除・復元</h4>
              <div className="post-moderation-panel__buttons">
                <button
                  type="button"
                  className="post-moderation-panel__action-button post-moderation-panel__action-button--danger"
                  onClick={() => openReasonDialog('delete')}
                  disabled={isProcessing}
                >
                  🗑️ 削除
                </button>
                <button
                  type="button"
                  className="post-moderation-panel__action-button"
                  onClick={() => handleAction('restore')}
                  disabled={isProcessing}
                >
                  ♻️ 復元
                </button>
              </div>
            </div>

            <div className="post-moderation-panel__action-group">
              <h4 className="post-moderation-panel__group-title">フラグ管理</h4>
              <div className="post-moderation-panel__buttons">
                <button
                  type="button"
                  className="post-moderation-panel__action-button post-moderation-panel__action-button--warning"
                  onClick={() => openReasonDialog('flag')}
                  disabled={isProcessing}
                >
                  🚩 フラグ
                </button>
                <button
                  type="button"
                  className="post-moderation-panel__action-button"
                  onClick={() => handleAction('unflag')}
                  disabled={isProcessing}
                >
                  🏳️ フラグ解除
                </button>
              </div>
            </div>
          </div>

          {/* Moderation History */}
          {moderationHistory.length > 0 && (
            <div className="post-moderation-panel__history">
              <h4 className="post-moderation-panel__history-title">
                モデレーション履歴
              </h4>
              <div className="post-moderation-panel__history-list">
                {moderationHistory.map((action) => (
                  <div key={action.id} className="post-moderation-panel__history-item">
                    <div className="post-moderation-panel__history-header">
                      <span className="post-moderation-panel__history-action">
                        {getActionIcon(action.action)} {getActionLabel(action.action)}
                      </span>
                      <span className="post-moderation-panel__history-date">
                        {formatDate(action.timestamp)}
                      </span>
                    </div>
                    <div className="post-moderation-panel__history-details">
                      <div className="post-moderation-panel__history-moderator">
                        実行者: {action.moderatorName}
                      </div>
                      {action.reason && (
                        <div className="post-moderation-panel__history-reason">
                          理由: {action.reason}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Post Info */}
          <div className="post-moderation-panel__post-info">
            <h4 className="post-moderation-panel__info-title">投稿情報</h4>
            <div className="post-moderation-panel__info-grid">
              <div className="post-moderation-panel__info-item">
                <span className="post-moderation-panel__info-label">投稿者:</span>
                <span className="post-moderation-panel__info-value">
                  {post.authorDisplayName}
                </span>
              </div>
              <div className="post-moderation-panel__info-item">
                <span className="post-moderation-panel__info-label">投稿日時:</span>
                <span className="post-moderation-panel__info-value">
                  {formatDate(post.createdAt)}
                </span>
              </div>
              <div className="post-moderation-panel__info-item">
                <span className="post-moderation-panel__info-label">スタンス:</span>
                <span className="post-moderation-panel__info-value">
                  {post.stance}
                </span>
              </div>
              <div className="post-moderation-panel__info-item">
                <span className="post-moderation-panel__info-label">リアクション数:</span>
                <span className="post-moderation-panel__info-value">
                  {post.reactions.totalCount}
                </span>
              </div>
              <div className="post-moderation-panel__info-item">
                <span className="post-moderation-panel__info-label">返信数:</span>
                <span className="post-moderation-panel__info-value">
                  {post.replyCount}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reason Dialog */}
      {showReasonDialog && (
        <div className="post-moderation-panel__dialog-overlay">
          <div className="post-moderation-panel__dialog">
            <div className="post-moderation-panel__dialog-header">
              <h3 className="post-moderation-panel__dialog-title">
                {getActionLabel(showReasonDialog)}の理由
              </h3>
              <button
                type="button"
                className="post-moderation-panel__dialog-close"
                onClick={closeReasonDialog}
              >
                ×
              </button>
            </div>

            <div className="post-moderation-panel__dialog-content">
              <div className="post-moderation-panel__reason-section">
                <label className="post-moderation-panel__reason-label">
                  理由を選択してください:
                </label>
                <div className="post-moderation-panel__reason-options">
                  {predefinedReasons.map((predefinedReason) => (
                    <button
                      key={predefinedReason}
                      type="button"
                      className={`post-moderation-panel__reason-option ${
                        reason === predefinedReason ? 'post-moderation-panel__reason-option--selected' : ''
                      }`}
                      onClick={() => setReason(predefinedReason)}
                    >
                      {predefinedReason}
                    </button>
                  ))}
                </div>
              </div>

              <div className="post-moderation-panel__reason-section">
                <label className="post-moderation-panel__reason-label">
                  詳細な理由（任意）:
                </label>
                <textarea
                  className="post-moderation-panel__reason-textarea"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="詳細な理由を入力してください..."
                  rows={3}
                />
              </div>
            </div>

            <div className="post-moderation-panel__dialog-actions">
              <button
                type="button"
                className="post-moderation-panel__dialog-button post-moderation-panel__dialog-button--cancel"
                onClick={closeReasonDialog}
                disabled={isProcessing}
              >
                キャンセル
              </button>
              <button
                type="button"
                className="post-moderation-panel__dialog-button post-moderation-panel__dialog-button--confirm"
                onClick={() => handleAction(showReasonDialog)}
                disabled={isProcessing || !reason.trim()}
              >
                {isProcessing ? '処理中...' : '実行'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};