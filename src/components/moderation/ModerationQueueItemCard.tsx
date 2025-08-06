import React, { useState } from 'react';
import { ModerationQueueItem, ReportPriority, ReportStatus } from '../../types/moderation';
import { reportService } from '../../services/reportService';
import { PostReviewDialog } from './PostReviewDialog';
import './ModerationQueueItemCard.css';

interface ModerationQueueItemCardProps {
  item: ModerationQueueItem;
  isSelected: boolean;
  onSelect: (selected: boolean) => void;
  onAssignToSelf: () => void;
  onUnassign: () => void;
  onProcessed: () => void;
  currentUserId?: string;
}

export const ModerationQueueItemCard: React.FC<ModerationQueueItemCardProps> = ({
  item,
  isSelected,
  onSelect,
  onAssignToSelf,
  onUnassign,
  onProcessed,
  currentUserId,
}) => {
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const getPriorityColor = (priority: ReportPriority): string => {
    const priorities = reportService.getPriorityLevels();
    return priorities.find(p => p.value === priority)?.color || '#6b7280';
  };

  const getPriorityLabel = (priority: ReportPriority): string => {
    const priorities = reportService.getPriorityLevels();
    return priorities.find(p => p.value === priority)?.label || priority;
  };

  const getCategoryLabel = (category: string): string => {
    const categories = reportService.getReportCategories();
    return categories.find(c => c.value === category)?.label || category;
  };

  const getStatusColor = (status: ReportStatus): string => {
    const statuses = reportService.getStatusOptions();
    return statuses.find(s => s.value === status)?.color || '#6b7280';
  };

  const getStatusLabel = (status: ReportStatus): string => {
    const statuses = reportService.getStatusOptions();
    return statuses.find(s => s.value === status)?.label || status;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return `${diffMinutes}分前`;
    } else if (diffHours < 24) {
      return `${diffHours}時間前`;
    } else if (diffDays < 7) {
      return `${diffDays}日前`;
    } else {
      return date.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    }
  };

  const isAssignedToCurrentUser = item.assignedTo === currentUserId;
  const canReview = isAssignedToCurrentUser || !item.assignedTo;

  return (
    <div className={`moderation-queue-item ${isSelected ? 'moderation-queue-item--selected' : ''}`}>
      {/* Header */}
      <div className="moderation-queue-item__header">
        <div className="moderation-queue-item__header-left">
          <label className="moderation-queue-item__checkbox">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => onSelect(e.target.checked)}
            />
          </label>

          <div className="moderation-queue-item__priority">
            <div 
              className="moderation-queue-item__priority-indicator"
              style={{ backgroundColor: getPriorityColor(item.priority) }}
              title={`優先度: ${getPriorityLabel(item.priority)}`}
            />
            <span className="moderation-queue-item__priority-label">
              {getPriorityLabel(item.priority)}
            </span>
          </div>

          <div className="moderation-queue-item__status">
            <span 
              className="moderation-queue-item__status-badge"
              style={{ 
                backgroundColor: getStatusColor(item.status),
                color: 'white'
              }}
            >
              {getStatusLabel(item.status)}
            </span>
          </div>

          {item.isUrgent && (
            <span className="moderation-queue-item__urgent-badge">
              🚨 緊急
            </span>
          )}

          {item.isEscalated && (
            <span className="moderation-queue-item__escalated-badge">
              ⬆️ エスカレート
            </span>
          )}
        </div>

        <div className="moderation-queue-item__header-right">
          <span className="moderation-queue-item__time">
            {formatDate(item.createdAt)}
          </span>
          
          <button
            type="button"
            className="moderation-queue-item__expand"
            onClick={() => setIsExpanded(!isExpanded)}
            aria-label={isExpanded ? '折りたたむ' : '展開する'}
          >
            {isExpanded ? '▼' : '▶'}
          </button>
        </div>
      </div>

      {/* Content Preview */}
      <div className="moderation-queue-item__content">
        <div className="moderation-queue-item__report-info">
          <div className="moderation-queue-item__category">
            <strong>カテゴリ:</strong> {getCategoryLabel(item.reportCategory)}
          </div>
          <div className="moderation-queue-item__reason">
            <strong>理由:</strong> {item.reportReason}
          </div>
        </div>

        <div className="moderation-queue-item__post-preview">
          <div className="moderation-queue-item__post-author">
            投稿者: {item.authorDisplayName}
          </div>
          <div className="moderation-queue-item__post-content">
            {item.contentPreview}
          </div>
        </div>

        {item.reporterCount > 1 && (
          <div className="moderation-queue-item__multiple-reports">
            📊 {item.reporterCount}人が報告
          </div>
        )}
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="moderation-queue-item__details">
          <div className="moderation-queue-item__metadata">
            <div className="moderation-queue-item__metadata-item">
              <strong>投稿ID:</strong> {item.postId}
            </div>
            <div className="moderation-queue-item__metadata-item">
              <strong>議論ID:</strong> {item.discussionId}
            </div>
            <div className="moderation-queue-item__metadata-item">
              <strong>報告者履歴:</strong> 
              {item.metadata.reporterHistory.totalReports}件の報告
              （正確: {item.metadata.reporterHistory.accurateReports}件、
              誤報: {item.metadata.reporterHistory.falseReports}件）
            </div>
            {item.metadata.autoDetected && (
              <div className="moderation-queue-item__metadata-item">
                <strong>自動検出:</strong> はい
              </div>
            )}
            {item.metadata.similarReportsCount > 0 && (
              <div className="moderation-queue-item__metadata-item">
                <strong>類似報告:</strong> {item.metadata.similarReportsCount}件
              </div>
            )}
          </div>

          {item.assignedTo && (
            <div className="moderation-queue-item__assignment">
              <strong>担当者:</strong> {item.assignedTo}
              {item.assignedAt && (
                <span className="moderation-queue-item__assigned-time">
                  （{formatDate(item.assignedAt)}にアサイン）
                </span>
              )}
            </div>
          )}

          {item.estimatedReviewTime && (
            <div className="moderation-queue-item__review-time">
              <strong>予想レビュー時間:</strong> {item.estimatedReviewTime}分
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="moderation-queue-item__actions">
        {!item.assignedTo && (
          <button
            type="button"
            className="moderation-queue-item__action moderation-queue-item__action--assign"
            onClick={onAssignToSelf}
          >
            自分にアサイン
          </button>
        )}

        {isAssignedToCurrentUser && (
          <button
            type="button"
            className="moderation-queue-item__action moderation-queue-item__action--unassign"
            onClick={onUnassign}
          >
            アサイン解除
          </button>
        )}

        {canReview && (
          <button
            type="button"
            className="moderation-queue-item__action moderation-queue-item__action--review"
            onClick={() => setShowReviewDialog(true)}
          >
            レビューする
          </button>
        )}

        <button
          type="button"
          className="moderation-queue-item__action moderation-queue-item__action--view"
          onClick={() => {
            // Navigate to post/discussion
            window.open(`/discussions/${item.discussionId}#post-${item.postId}`, '_blank');
          }}
        >
          投稿を表示
        </button>
      </div>

      {/* Review Dialog */}
      {showReviewDialog && (
        <PostReviewDialog
          queueItem={item}
          isOpen={showReviewDialog}
          onClose={() => setShowReviewDialog(false)}
          onReviewed={() => {
            setShowReviewDialog(false);
            onProcessed();
          }}
        />
      )}
    </div>
  );
};