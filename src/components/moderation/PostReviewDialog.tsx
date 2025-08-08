import React, { useState } from 'react';
import {
  ModerationQueueItem,
  ReviewReportData,
  ReportStatus,
  ModerationActionType,
  SanctionType,
} from '../../types/moderation';
import { reportService } from '../../services/reportService';
import './PostReviewDialog.css';

interface PostReviewDialogProps {
  queueItem: ModerationQueueItem;
  isOpen: boolean;
  onClose: () => void;
  onReviewed: () => void;
}

export const PostReviewDialog: React.FC<PostReviewDialogProps> = ({
  queueItem,
  isOpen,
  onClose,
  onReviewed,
}) => {
  const [reviewStatus, setReviewStatus] = useState<ReportStatus>(ReportStatus.RESOLVED);
  const [resolution, setResolution] = useState('');
  const [notes, setNotes] = useState('');
  const [moderationAction, setModerationAction] = useState<ModerationActionType | ''>('');
  const [moderationReason, setModerationReason] = useState('');
  const [userSanction, setUserSanction] = useState<SanctionType | ''>('');
  const [sanctionReason, setSanctionReason] = useState('');
  const [sanctionDuration, setSanctionDuration] = useState<number>(24);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const statuses = reportService.getStatusOptions();
  const moderationActions = [
    { value: ModerationActionType.HIDE, label: '非表示にする' },
    { value: ModerationActionType.DELETE, label: '削除する' },
    { value: ModerationActionType.FLAG, label: 'フラグを付ける' },
  ];
  const sanctions = [
    { value: SanctionType.WARNING, label: '警告' },
    { value: SanctionType.TEMPORARY_SUSPENSION, label: '一時停止' },
    { value: SanctionType.PERMANENT_BAN, label: '永久停止' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!resolution.trim()) {
      setError('解決内容を入力してください。');
      return;
    }

    if (moderationAction && !moderationReason.trim()) {
      setError('モデレーション操作の理由を入力してください。');
      return;
    }

    if (userSanction && !sanctionReason.trim()) {
      setError('制裁の理由を入力してください。');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const reviewData: ReviewReportData = {
        reportId: queueItem.reportId,
        status: reviewStatus,
        resolution: resolution.trim(),
        notes: notes.trim() || undefined,
      };

      // Add moderation action if specified
      if (moderationAction) {
        reviewData.action = {
          type: moderationAction as ModerationActionType,
          reason: moderationReason.trim(),
        };
      }

      // Add user sanction if specified
      if (userSanction) {
        reviewData.userSanction = {
          type: userSanction as SanctionType,
          reason: sanctionReason.trim(),
          duration:
            userSanction === SanctionType.TEMPORARY_SUSPENSION ? sanctionDuration : undefined,
        };
      }

      await reportService.reviewReport(reviewData);

      onReviewed();

      // Show success message
      alert('レビューが完了しました。');
    } catch (error) {
      console.error('Failed to review report:', error);
      setError(error instanceof Error ? error.message : 'レビューの送信に失敗しました。');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="post-review-dialog-overlay">
      <div className="post-review-dialog">
        <div className="post-review-dialog__header">
          <h2 className="post-review-dialog__title">報告のレビュー</h2>
          <button
            type="button"
            className="post-review-dialog__close"
            onClick={handleClose}
            disabled={isSubmitting}
            aria-label="閉じる"
          >
            ×
          </button>
        </div>

        <div className="post-review-dialog__content">
          {/* Queue Item Summary */}
          <div className="post-review-dialog__summary">
            <h3 className="post-review-dialog__summary-title">報告内容</h3>
            <div className="post-review-dialog__summary-grid">
              <div className="post-review-dialog__summary-item">
                <strong>カテゴリ:</strong> {queueItem.reportCategory}
              </div>
              <div className="post-review-dialog__summary-item">
                <strong>理由:</strong> {queueItem.reportReason}
              </div>
              <div className="post-review-dialog__summary-item">
                <strong>投稿者:</strong> {queueItem.authorDisplayName}
              </div>
              <div className="post-review-dialog__summary-item">
                <strong>報告数:</strong> {queueItem.reporterCount}件
              </div>
            </div>
            <div className="post-review-dialog__content-preview">
              <strong>投稿内容:</strong>
              <div className="post-review-dialog__content-text">{queueItem.contentPreview}</div>
            </div>
          </div>

          {/* Review Form */}
          <form onSubmit={handleSubmit} className="post-review-dialog__form">
            {/* Review Status */}
            <div className="post-review-dialog__field">
              <label className="post-review-dialog__label" htmlFor="status">
                レビュー結果 <span className="post-review-dialog__required">*</span>
              </label>
              <select
                id="status"
                className="post-review-dialog__select"
                value={reviewStatus}
                onChange={e => setReviewStatus(e.target.value as ReportStatus)}
                disabled={isSubmitting}
                required
              >
                {statuses.map(status => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Resolution */}
            <div className="post-review-dialog__field">
              <label className="post-review-dialog__label" htmlFor="resolution">
                解決内容 <span className="post-review-dialog__required">*</span>
              </label>
              <textarea
                id="resolution"
                className="post-review-dialog__textarea"
                value={resolution}
                onChange={e => setResolution(e.target.value)}
                placeholder="この報告に対してどのような判断を下したかを説明してください"
                rows={3}
                maxLength={1000}
                disabled={isSubmitting}
                required
              />
              <div className="post-review-dialog__char-count">{resolution.length}/1000文字</div>
            </div>

            {/* Notes */}
            <div className="post-review-dialog__field">
              <label className="post-review-dialog__label" htmlFor="notes">
                内部メモ（任意）
              </label>
              <textarea
                id="notes"
                className="post-review-dialog__textarea"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="他のモデレーターへの参考情報があれば記入してください"
                rows={2}
                maxLength={500}
                disabled={isSubmitting}
              />
              <div className="post-review-dialog__char-count">{notes.length}/500文字</div>
            </div>

            {/* Moderation Action */}
            <div className="post-review-dialog__section">
              <h4 className="post-review-dialog__section-title">モデレーション操作（任意）</h4>

              <div className="post-review-dialog__field">
                <label className="post-review-dialog__label" htmlFor="moderation-action">
                  操作
                </label>
                <select
                  id="moderation-action"
                  className="post-review-dialog__select"
                  value={moderationAction}
                  onChange={e => setModerationAction(e.target.value as ModerationActionType)}
                  disabled={isSubmitting}
                >
                  <option value="">操作なし</option>
                  {moderationActions.map(action => (
                    <option key={action.value} value={action.value}>
                      {action.label}
                    </option>
                  ))}
                </select>
              </div>

              {moderationAction && (
                <div className="post-review-dialog__field">
                  <label className="post-review-dialog__label" htmlFor="moderation-reason">
                    操作理由 <span className="post-review-dialog__required">*</span>
                  </label>
                  <textarea
                    id="moderation-reason"
                    className="post-review-dialog__textarea"
                    value={moderationReason}
                    onChange={e => setModerationReason(e.target.value)}
                    placeholder="この操作を行う理由を説明してください"
                    rows={2}
                    maxLength={500}
                    disabled={isSubmitting}
                    required={!!moderationAction}
                  />
                </div>
              )}
            </div>

            {/* User Sanction */}
            <div className="post-review-dialog__section">
              <h4 className="post-review-dialog__section-title">ユーザー制裁（任意）</h4>

              <div className="post-review-dialog__field">
                <label className="post-review-dialog__label" htmlFor="user-sanction">
                  制裁タイプ
                </label>
                <select
                  id="user-sanction"
                  className="post-review-dialog__select"
                  value={userSanction}
                  onChange={e => setUserSanction(e.target.value as SanctionType)}
                  disabled={isSubmitting}
                >
                  <option value="">制裁なし</option>
                  {sanctions.map(sanction => (
                    <option key={sanction.value} value={sanction.value}>
                      {sanction.label}
                    </option>
                  ))}
                </select>
              </div>

              {userSanction && (
                <>
                  <div className="post-review-dialog__field">
                    <label className="post-review-dialog__label" htmlFor="sanction-reason">
                      制裁理由 <span className="post-review-dialog__required">*</span>
                    </label>
                    <textarea
                      id="sanction-reason"
                      className="post-review-dialog__textarea"
                      value={sanctionReason}
                      onChange={e => setSanctionReason(e.target.value)}
                      placeholder="この制裁を課す理由を説明してください"
                      rows={2}
                      maxLength={500}
                      disabled={isSubmitting}
                      required={!!userSanction}
                    />
                  </div>

                  {userSanction === SanctionType.TEMPORARY_SUSPENSION && (
                    <div className="post-review-dialog__field">
                      <label className="post-review-dialog__label" htmlFor="sanction-duration">
                        停止期間（時間）
                      </label>
                      <input
                        type="number"
                        id="sanction-duration"
                        className="post-review-dialog__input"
                        value={sanctionDuration}
                        onChange={e => setSanctionDuration(parseInt(e.target.value) || 24)}
                        min={1}
                        max={8760} // 1 year
                        disabled={isSubmitting}
                      />
                      <div className="post-review-dialog__help-text">
                        1時間〜8760時間（1年）の範囲で指定してください
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Error Message */}
            {error && <div className="post-review-dialog__error">{error}</div>}

            {/* Actions */}
            <div className="post-review-dialog__actions">
              <button
                type="button"
                className="post-review-dialog__button post-review-dialog__button--cancel"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                キャンセル
              </button>
              <button
                type="submit"
                className="post-review-dialog__button post-review-dialog__button--submit"
                disabled={isSubmitting || !resolution.trim()}
              >
                {isSubmitting ? '送信中...' : 'レビュー完了'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
