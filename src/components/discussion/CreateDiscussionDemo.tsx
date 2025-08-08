import React, { useState } from 'react';
import CreateDiscussionForm from './CreateDiscussionForm';
import { CreateDiscussionData } from '../../types/discussion';
import { DiscussionCategory, Stance, AccessControlType } from '../../types/common';
import './CreateDiscussionDemo.css';

export const CreateDiscussionDemo: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [submittedData, setSubmittedData] = useState<CreateDiscussionData | null>(null);
  const [showForm, setShowForm] = useState(true);

  const handleSubmit = async (data: CreateDiscussionData) => {
    setIsLoading(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('Submitted discussion data:', data);
    setSubmittedData(data);
    setIsLoading(false);
    setShowForm(false);
  };

  const handleCancel = () => {
    setShowForm(false);
  };

  const resetDemo = () => {
    setSubmittedData(null);
    setShowForm(true);
  };

  // Sample initial data for testing
  const sampleData: Partial<CreateDiscussionData> = {
    title: 'AI技術の社会への影響について',
    description:
      'AI技術の急速な発展が社会に与える影響について議論しましょう。雇用、プライバシー、倫理的な観点から様々な意見を交換したいと思います。',
    ownerStance: Stance.NEUTRAL,
    categories: [DiscussionCategory.TECHNOLOGY, DiscussionCategory.SOCIETY],
    points: [
      {
        title: '雇用への影響',
        description: 'AI技術の発展が既存の職業や雇用市場に与える影響について',
        order: 0,
      },
      {
        title: 'プライバシーと個人情報',
        description: 'AI技術による個人情報の収集・活用とプライバシー保護のバランス',
        order: 1,
      },
    ],
    backgroundKnowledge: [
      {
        type: 'text',
        title: 'AI技術の現状',
        content:
          '現在のAI技術は機械学習、特に深層学習の発展により、画像認識、自然言語処理、音声認識などの分野で人間レベルの性能を達成しています。',
        order: 0,
      },
    ],
    accessControl: {
      type: AccessControlType.OPEN,
      userIds: [],
    },
  };

  if (!showForm && submittedData) {
    return (
      <div className="create-discussion-demo">
        <div className="demo-header">
          <h1>議論作成フォーム デモ</h1>
          <p>議論作成が完了しました！</p>
        </div>

        <div className="demo-result">
          <div className="result-header">
            <h2>✅ 作成された議論</h2>
            <button onClick={resetDemo} className="reset-btn">
              新しい議論を作成
            </button>
          </div>

          <div className="result-content">
            <div className="result-section">
              <h3>基本情報</h3>
              <div className="result-item">
                <span className="result-label">議題:</span>
                <span className="result-value">{submittedData.title}</span>
              </div>
              <div className="result-item">
                <span className="result-label">概要:</span>
                <span className="result-value">{submittedData.description}</span>
              </div>
              <div className="result-item">
                <span className="result-label">スタンス:</span>
                <span className="result-value stance-badge">{submittedData.ownerStance}</span>
              </div>
            </div>

            <div className="result-section">
              <h3>カテゴリ</h3>
              <div className="category-list">
                {submittedData.categories.map((category, index) => (
                  <span key={index} className="category-badge">
                    {category}
                  </span>
                ))}
              </div>
            </div>

            <div className="result-section">
              <h3>論点 ({submittedData.points.length}個)</h3>
              <div className="points-list">
                {submittedData.points.map((point, index) => (
                  <div key={index} className="point-item">
                    <div className="point-title">{point.title}</div>
                    {point.description && (
                      <div className="point-description">{point.description}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {submittedData.backgroundKnowledge && submittedData.backgroundKnowledge.length > 0 && (
              <div className="result-section">
                <h3>前提知識 ({submittedData.backgroundKnowledge.length}個)</h3>
                <div className="bg-list">
                  {submittedData.backgroundKnowledge.map((bg, index) => (
                    <div key={index} className="bg-item">
                      <div className="bg-type">{bg.type}</div>
                      <div className="bg-content">
                        {bg.title && <div className="bg-title">{bg.title}</div>}
                        <div className="bg-text">{bg.content}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="result-section">
              <h3>アクセス制御</h3>
              <div className="result-item">
                <span className="result-label">タイプ:</span>
                <span className="result-value">{submittedData.accessControl?.type || 'open'}</span>
              </div>
              {submittedData.accessControl?.userIds &&
                submittedData.accessControl.userIds.length > 0 && (
                  <div className="result-item">
                    <span className="result-label">対象ユーザー:</span>
                    <span className="result-value">
                      {submittedData.accessControl.userIds.join(', ')}
                    </span>
                  </div>
                )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!showForm) {
    return (
      <div className="create-discussion-demo">
        <div className="demo-header">
          <h1>議論作成フォーム デモ</h1>
          <p>フォームがキャンセルされました。</p>
        </div>
        <button onClick={resetDemo} className="reset-btn">
          フォームを再表示
        </button>
      </div>
    );
  }

  return (
    <div className="create-discussion-demo">
      <div className="demo-header">
        <h1>議論作成フォーム デモ</h1>
        <p>新しい議論を作成するためのフォームです。各ステップを進めて議論を作成してください。</p>

        <div className="demo-actions">
          <button onClick={() => window.location.reload()} className="demo-btn demo-btn-secondary">
            空のフォームで開始
          </button>
          <button
            onClick={() => {
              // Reset form with sample data by reloading
              window.location.reload();
            }}
            className="demo-btn demo-btn-primary"
          >
            サンプルデータで開始
          </button>
        </div>
      </div>

      <CreateDiscussionForm
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={isLoading}
        initialData={sampleData}
      />
    </div>
  );
};

export default CreateDiscussionDemo;
