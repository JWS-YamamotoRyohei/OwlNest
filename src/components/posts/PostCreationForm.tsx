import React, { useState, useEffect } from 'react';
import { CreatePostData } from '../../types/post';
import { DiscussionPoint } from '../../types/discussion';
import { TextFormatting, FileAttachment, Stance } from '../../types/common';
import { RichTextEditor } from './RichTextEditor';
import { StanceSelector } from './StanceSelector';
import { DiscussionPointSelector } from './DiscussionPointSelector';
import './PostCreationForm.css';

interface PostCreationFormProps {
  discussionId: string;
  discussionPoints: DiscussionPoint[];
  onSubmit: (data: CreatePostData) => Promise<void>;
  onCancel: () => void;
  replyToId?: string;
  defaultPointId?: string;
  currentUserId: string;
  userLastStance?: Stance;
  isSubmitting?: boolean;
}

export const PostCreationForm: React.FC<PostCreationFormProps> = ({
  discussionId,
  discussionPoints,
  onSubmit,
  onCancel,
  replyToId,
  defaultPointId,
  currentUserId,
  userLastStance,
  isSubmitting = false,
}) => {
  const [selectedPointId, setSelectedPointId] = useState<string>(defaultPointId || '');
  const [content, setContent] = useState<string>('');
  const [formatting, setFormatting] = useState<TextFormatting>({});
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);

  // Use currentUserId for future features like draft saving
  console.debug('Current user ID:', currentUserId);
  const [stance, setStance] = useState<Stance>(userLastStance || Stance.UNKNOWN);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when props change
  useEffect(() => {
    if (defaultPointId) {
      setSelectedPointId(defaultPointId);
    }
    if (userLastStance) {
      setStance(userLastStance);
    }
  }, [defaultPointId, userLastStance]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!selectedPointId) {
      newErrors.point = '論点を選択してください';
    }

    if (!content.trim()) {
      newErrors.content = '意見を入力してください';
    } else if (content.trim().length < 10) {
      newErrors.content = '意見は10文字以上で入力してください';
    } else if (content.trim().length > 5000) {
      newErrors.content = '意見は5000文字以内で入力してください';
    }

    if (stance === undefined || stance === null) {
      newErrors.stance = 'スタンスを選択してください';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const postData: CreatePostData = {
      discussionId,
      discussionPointId: selectedPointId,
      content: {
        text: content.trim(),
        preview: content.trim().substring(0, 200),
        hasAttachments: attachments.length > 0 ? 1 : 0,
        hasLinks: content.includes('http') ? 1 : 0,
        attachmentCount: attachments.length,
      },
      attachments,
      stance,
      ...(replyToId && { replyToId }),
    };

    try {
      await onSubmit(postData);
      // Reset form after successful submission
      setContent('');
      setFormatting({});
      setAttachments([]);
      setStance(userLastStance || Stance.UNKNOWN);
      setErrors({});
    } catch (error) {
      console.error('Failed to create post:', error);
      setErrors({ submit: '投稿の作成に失敗しました。もう一度お試しください。' });
    }
  };

  const handleContentChange = (newContent: string, newFormatting: TextFormatting) => {
    setContent(newContent);
    setFormatting(newFormatting);
    // Clear content error when user starts typing
    if (errors.content && newContent.trim()) {
      setErrors(prev => ({ ...prev, content: '' }));
    }
  };

  const handleAttachmentsChange = (newAttachments: FileAttachment[]) => {
    setAttachments(newAttachments);
  };

  const handlePointChange = (pointId: string) => {
    setSelectedPointId(pointId);
    // Clear point error when user selects a point
    if (errors.point && pointId) {
      setErrors(prev => ({ ...prev, point: '' }));
    }
  };

  const handleStanceChange = (newStance: Stance) => {
    setStance(newStance);
    // Clear stance error when user selects a stance
    if (errors.stance && newStance) {
      setErrors(prev => ({ ...prev, stance: '' }));
    }
  };

  return (
    <div className="post-creation-form">
      <div className="post-creation-form__header">
        <h3 className="post-creation-form__title">
          {replyToId ? '返信を投稿' : '新しい投稿を作成'}
        </h3>
      </div>

      <form onSubmit={handleSubmit} className="post-creation-form__form">
        {/* Discussion Point Selection */}
        <div className="post-creation-form__field">
          <label className="post-creation-form__label">
            論点 <span className="post-creation-form__required">*</span>
          </label>
          <DiscussionPointSelector
            points={discussionPoints}
            selectedPointId={selectedPointId}
            onChange={handlePointChange}
            error={errors.point}
          />
          {errors.point && <div className="post-creation-form__error">{errors.point}</div>}
        </div>

        {/* Content Editor */}
        <div className="post-creation-form__field">
          <label className="post-creation-form__label">
            意見 <span className="post-creation-form__required">*</span>
          </label>
          <RichTextEditor
            value={content}
            formatting={formatting}
            attachments={attachments}
            onChange={handleContentChange}
            onAttachmentsChange={handleAttachmentsChange}
            placeholder="あなたの意見を入力してください..."
            error={errors.content}
            features={{
              bold: true,
              fontSize: true,
              imageUpload: true,
              linkInsert: true,
            }}
          />
          {errors.content && <div className="post-creation-form__error">{errors.content}</div>}
          <div className="post-creation-form__char-count">{content.length} / 5000文字</div>
        </div>

        {/* Stance Selection */}
        <div className="post-creation-form__field">
          <label className="post-creation-form__label">
            スタンス <span className="post-creation-form__required">*</span>
          </label>
          <StanceSelector
            value={stance}
            onChange={handleStanceChange}
            error={errors.stance}
            showDefault={true}
          />
          {errors.stance && <div className="post-creation-form__error">{errors.stance}</div>}
        </div>

        {/* Submit Error */}
        {errors.submit && (
          <div className="post-creation-form__error post-creation-form__error--submit">
            {errors.submit}
          </div>
        )}

        {/* Form Actions */}
        <div className="post-creation-form__actions">
          <button
            type="button"
            onClick={onCancel}
            className="post-creation-form__button post-creation-form__button--cancel"
            disabled={isSubmitting}
          >
            キャンセル
          </button>
          <button
            type="submit"
            className="post-creation-form__button post-creation-form__button--submit"
            disabled={isSubmitting || !content.trim() || !selectedPointId}
          >
            {isSubmitting ? '投稿中...' : replyToId ? '返信する' : '投稿する'}
          </button>
        </div>
      </form>
    </div>
  );
};
