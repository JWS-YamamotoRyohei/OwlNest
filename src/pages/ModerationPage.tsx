import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ModerationQueue } from '../components/moderation/ModerationQueue';
import { SEO } from '../components/common/SEO';
import './ModerationPage.css';

export const ModerationPage: React.FC = () => {
  const { user, hasPermission } = useAuth();

  const canModerate = hasPermission('canModerate');

  if (!user) {
    return (
      <div className="moderation-page">
        <SEO
          title="モデレーション - ログインが必要"
          description="モデレーション機能を使用するにはログインが必要です。"
        />
        <div className="moderation-page__no-auth">
          <h1>ログインが必要です</h1>
          <p>モデレーション機能を使用するにはログインしてください。</p>
        </div>
      </div>
    );
  }

  if (!canModerate) {
    return (
      <div className="moderation-page">
        <SEO
          title="モデレーション - アクセス権限なし"
          description="モデレーション機能を使用する権限がありません。"
        />
        <div className="moderation-page__no-permission">
          <h1>アクセス権限がありません</h1>
          <p>モデレーション機能を使用するには適切な権限が必要です。</p>
          <p>システム管理者にお問い合わせください。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="moderation-page">
      <SEO
        title="モデレーション"
        description="投稿の報告を確認し、適切なモデレーション措置を実行します。"
      />

      <div className="moderation-page__header">
        <h1 className="moderation-page__title">モデレーション</h1>
        <p className="moderation-page__description">
          投稿の報告を確認し、適切なモデレーション措置を実行します。
        </p>
      </div>

      <div className="moderation-page__content">
        <ModerationQueue />
      </div>
    </div>
  );
};
