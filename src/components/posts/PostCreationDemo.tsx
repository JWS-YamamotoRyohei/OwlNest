import React, { useState } from 'react';
import { CreatePostData } from '../../types/post';
import { DiscussionPoint } from '../../types/discussion';
import { Stance } from '../../types/common';
import { generateMockDiscussionPoints } from '../../utils/testDataFactory';
import { PostCreationForm } from './PostCreationForm';
import './PostCreationDemo.css';

export const PostCreationDemo: React.FC = () => {
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedPosts, setSubmittedPosts] = useState<CreatePostData[]>([]);

  // Mock data
  const mockDiscussionId = 'discussion_123';
  const mockCurrentUserId = 'user_456';
  const mockUserLastStance = Stance.PROS;
  const mockDiscussionPoints: DiscussionPoint[] = generateMockDiscussionPoints(mockDiscussionId);

  const handleSubmit = async (data: CreatePostData) => {
    setIsSubmitting(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setSubmittedPosts(prev => [...prev, data]);
    setIsFormVisible(false);
    setIsSubmitting(false);
    
    console.log('Post submitted:', data);
  };

  const handleCancel = () => {
    setIsFormVisible(false);
  };

  const getStanceLabel = (stance: Stance) => {
    switch (stance) {
      case Stance.PROS: return '賛成';
      case Stance.CONS: return '反対';
      case Stance.NEUTRAL: return '中立';
      case Stance.UNKNOWN: return 'わからない';
      case Stance.HIDDEN: return '非表示';
      default: return stance;
    }
  };

  const getStanceColor = (stance: Stance) => {
    switch (stance) {
      case Stance.PROS: return '#22c55e';
      case Stance.CONS: return '#ef4444';
      case Stance.NEUTRAL: return '#64748b';
      case Stance.UNKNOWN: return '#a855f7';
      case Stance.HIDDEN: return '#6b7280';
      default: return '#6b7280';
    }
  };

  return (
    <div className="post-creation-demo">
      <div className="post-creation-demo__header">
        <h2>投稿作成フォーム デモ</h2>
        <p>
          このデモでは、議論への投稿作成機能を体験できます。
          論点の選択、リッチテキストエディタ、スタンス選択などの機能が含まれています。
        </p>
      </div>

      <div className="post-creation-demo__actions">
        <button
          onClick={() => setIsFormVisible(true)}
          className="post-creation-demo__button post-creation-demo__button--primary"
          disabled={isFormVisible}
        >
          新しい投稿を作成
        </button>
        
        <button
          onClick={() => setIsFormVisible(true)}
          className="post-creation-demo__button post-creation-demo__button--secondary"
          disabled={isFormVisible}
        >
          返信を作成 (replyToId付き)
        </button>
      </div>

      {isFormVisible && (
        <div className="post-creation-demo__form-container">
          <PostCreationForm
            discussionId={mockDiscussionId}
            discussionPoints={mockDiscussionPoints}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            currentUserId={mockCurrentUserId}
            userLastStance={mockUserLastStance}
            isSubmitting={isSubmitting}
          />
        </div>
      )}

      {submittedPosts.length > 0 && (
        <div className="post-creation-demo__submitted">
          <h3>送信された投稿</h3>
          <div className="post-creation-demo__posts">
            {submittedPosts.map((post, index) => {
              const point = mockDiscussionPoints.find(p => p.pointId === post.discussionPointId);
              return (
                <div key={index} className="post-creation-demo__post">
                  <div className="post-creation-demo__post-header">
                    <div className="post-creation-demo__post-point">
                      論点: {point?.title || 'Unknown'}
                    </div>
                    <div 
                      className="post-creation-demo__post-stance"
                      style={{ color: getStanceColor(post.stance) }}
                    >
                      {getStanceLabel(post.stance)}
                    </div>
                  </div>
                  <div className="post-creation-demo__post-content">
                    {post.content.text}
                  </div>
                  {post.attachments && post.attachments.length > 0 && (
                    <div className="post-creation-demo__post-attachments">
                      <strong>添付ファイル:</strong>
                      <ul>
                        {post.attachments.map(attachment => (
                          <li key={attachment.id}>
                            {attachment.filename} ({Math.round(attachment.size / 1024)}KB)
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {post.replyToId && (
                    <div className="post-creation-demo__post-reply">
                      返信先: {post.replyToId}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="post-creation-demo__info">
        <h3>機能説明</h3>
        <ul>
          <li><strong>論点選択:</strong> 階層構造の論点から投稿対象を選択</li>
          <li><strong>リッチテキストエディタ:</strong> 太字、文字サイズ、画像・リンク埋め込み対応</li>
          <li><strong>スタンス選択:</strong> 賛成/反対/中立/わからない/非表示から選択</li>
          <li><strong>デフォルト値:</strong> 過去の投稿履歴に基づくスタンスのデフォルト設定</li>
          <li><strong>バリデーション:</strong> 必須項目チェックと文字数制限</li>
          <li><strong>ファイルアップロード:</strong> 画像やファイルの添付機能</li>
        </ul>
      </div>
    </div>
  );
};