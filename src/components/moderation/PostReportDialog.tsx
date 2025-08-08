import React, { useState } from 'react';
import { PostListItem } from '../../types/post';
import { CreateReportData, ReportCategory } from '../../types/moderation';
import { reportService } from '../../services/reportService';
import './PostReportDialog.css';

interface PostReportDialogProps {
  post: PostListItem;
  isOpen: boolean;
  onClose: () => void;
  onReportSubmitted?: () => void;
}

export const PostReportDialog: React.FC<PostReportDialogProps> = ({
  post,
  isOpen,
  onClose,
  onReportSubmitted,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<ReportCategory | ''>('');
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categories = reportService.getReportCategories();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCategory || !reason.trim()) {
      setError('カテゴリと理由を入力してください。');
      return;
    }

    const reportData: CreateReportData = {
      postId: post.postId,
      category: selectedCategory as ReportCategory,
      reason: reason.trim(),
      description: description.trim() || undefined,
    };

    const validation = reportService.validateReportData(reportData);
    if (!validation.isValid) {
      setError(validation.errors.join('\n'));
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await reportService.reportPost(reportData);

      // Reset form
      setSelectedCategory('');
      setReason('');
      setDescription('');

      onReportSubmitted?.();
      onClose();

      // Show success message
      alert('報告を送信しました。モデレーターが確認いたします。');
    } catch (error) {
      console.error('Failed to submit report:', error);
      setError(error instanceof Error ? error.message : '報告の送信に失敗しました。');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setSelectedCategory('');
      setReason('');
      setDescription('');
      setError(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="post-report-dialog-overlay">
      <div className="post-report-dialog">
        <div className="post-report-dialog__header">
          <h2 className="post-report-dialog__title">投稿を報告</h2>
          <button
            type="button"
            className="post-report-dialog__close"
            onClick={handleClose}
            disabled={isSubmitting}
            aria-label="閉じる"
          >
            ×
          </button>
        </div>

        <div className="post-report-dialog__content">
          {/* Post Preview */}
          <div className="post-report-dialog__post-preview">
            <h3 className="post-report-dialog__preview-title">報告対象の投稿</h3>
            <div className="post-report-dialog__post-info">
              <div className="post-report-dialog__post-author">
                投稿者: {post.authorDisplayName}
              </div>
              <div className="post-report-dialog__post-date">
                投稿日時: {new Date(post.createdAt).toLocaleString('ja-JP')}
              </div>
            </div>
            <div className="post-report-dialog__post-content">
              {post.content.preview}
              {post.content.preview.length < post.content.text.length && '...'}
            </div>
          </div>

          {/* Report Form */}
          <form onSubmit={handleSubmit} className="post-report-dialog__form">
            {/* Category Selection */}
            <div className="post-report-dialog__field">
              <label className="post-report-dialog__label" htmlFor="category">
                報告カテゴリ <span className="post-report-dialog__required">*</span>
              </label>
              <select
                id="category"
                className="post-report-dialog__select"
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value as ReportCategory)}
                disabled={isSubmitting}
                required
              >
                <option value="">カテゴリを選択してください</option>
                {categories.map(category => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
              {selectedCategory && (
                <div className="post-report-dialog__category-description">
                  {categories.find(c => c.value === selectedCategory)?.description}
                </div>
              )}
            </div>

            {/* Reason */}
            <div className="post-report-dialog__field">
              <label className="post-report-dialog__label" htmlFor="reason">
                報告理由 <span className="post-report-dialog__required">*</span>
              </label>
              <textarea
                id="reason"
                className="post-report-dialog__textarea"
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="この投稿を報告する理由を具体的に説明してください（10文字以上）"
                rows={4}
                maxLength={500}
                disabled={isSubmitting}
                required
              />
              <div className="post-report-dialog__char-count">{reason.length}/500文字</div>
            </div>

            {/* Additional Description */}
            <div className="post-report-dialog__field">
              <label className="post-report-dialog__label" htmlFor="description">
                詳細説明（任意）
              </label>
              <textarea
                id="description"
                className="post-report-dialog__textarea"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="追加の詳細情報があれば記入してください"
                rows={3}
                maxLength={1000}
                disabled={isSubmitting}
              />
              <div className="post-report-dialog__char-count">{description.length}/1000文字</div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="post-report-dialog__error">
                {error.split('\n').map((line, index) => (
                  <div key={index}>{line}</div>
                ))}
              </div>
            )}

            {/* Guidelines */}
            <div className="post-report-dialog__guidelines">
              <h4 className="post-report-dialog__guidelines-title">報告に関するガイドライン</h4>
              <ul className="post-report-dialog__guidelines-list">
                <li>虚偽の報告は禁止されています</li>
                <li>報告は匿名で処理されます</li>
                <li>モデレーターが内容を確認し、適切な措置を取ります</li>
                <li>報告の結果については通知されない場合があります</li>
              </ul>
            </div>

            {/* Actions */}
            <div className="post-report-dialog__actions">
              <button
                type="button"
                className="post-report-dialog__button post-report-dialog__button--cancel"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                キャンセル
              </button>
              <button
                type="submit"
                className="post-report-dialog__button post-report-dialog__button--submit"
                disabled={isSubmitting || !selectedCategory || !reason.trim()}
              >
                {isSubmitting ? '送信中...' : '報告を送信'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
