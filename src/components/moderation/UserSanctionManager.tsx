import React, { useState, useEffect } from 'react';
import {
  UserSanction,
  SanctionType,
  CreateSanctionData,
  SanctionFilters,
} from '../../types/moderation';
import { userSanctionService } from '../../services/userSanctionService';
import './UserSanctionManager.css';

interface UserSanctionManagerProps {
  userId?: string; // If provided, show sanctions for specific user
  onSanctionUpdate?: () => void;
}

export const UserSanctionManager: React.FC<UserSanctionManagerProps> = ({
  userId,
  onSanctionUpdate,
}) => {
  const [sanctions, setSanctions] = useState<UserSanction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedSanction, setSelectedSanction] = useState<UserSanction | null>(null);
  const [filters, setFilters] = useState<SanctionFilters>({
    isActive: true,
  });

  useEffect(() => {
    loadSanctions();
  }, [userId, filters]);

  const loadSanctions = async () => {
    try {
      setLoading(true);
      const sanctionsData = userId
        ? await userSanctionService.getUserSanctions(userId, filters)
        : await userSanctionService.getAllSanctions(filters);
      setSanctions(sanctionsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : '制裁情報の読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSanction = async (sanctionData: CreateSanctionData) => {
    try {
      const newSanction = await userSanctionService.createSanction(sanctionData);

      // Automatically send notification to the user
      try {
        await userSanctionService.notifyUser(newSanction.sanctionId, 'both');
      } catch (notificationError) {
        console.warn('Failed to send automatic notification:', notificationError);
        // Don't fail the entire operation if notification fails
      }

      await loadSanctions();
      setShowCreateForm(false);
      onSanctionUpdate?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : '制裁の作成に失敗しました');
    }
  };

  const handleRevokeSanction = async (sanctionId: string, reason: string) => {
    try {
      await userSanctionService.revokeSanction(sanctionId, reason);
      await loadSanctions();
      onSanctionUpdate?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : '制裁の取り消しに失敗しました');
    }
  };

  const handleAppealSanction = async (sanctionId: string, appealReason: string) => {
    try {
      await userSanctionService.appealSanction(sanctionId, appealReason);
      await loadSanctions();
    } catch (err) {
      setError(err instanceof Error ? err.message : '異議申し立てに失敗しました');
    }
  };

  const handleReviewAppeal = async (
    sanctionId: string,
    approved: boolean,
    reviewNotes?: string
  ) => {
    try {
      await userSanctionService.reviewAppeal(sanctionId, approved, reviewNotes);
      await loadSanctions();
      onSanctionUpdate?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : '異議申し立ての審査に失敗しました');
    }
  };

  const handleNotifyUser = async (sanctionId: string) => {
    try {
      await userSanctionService.notifyUser(sanctionId, 'both');
      // Show success message or update UI to indicate notification was sent
      setError(null); // Clear any existing errors
    } catch (err) {
      setError(err instanceof Error ? err.message : '通知の送信に失敗しました');
    }
  };

  if (loading) {
    return <div className="user-sanction-manager loading">読み込み中...</div>;
  }

  return (
    <div className="user-sanction-manager">
      <div className="sanction-manager-header">
        <h2>{userId ? 'ユーザー制裁履歴' : '制裁管理'}</h2>
        {!userId && (
          <button className="btn btn-primary" onClick={() => setShowCreateForm(true)}>
            新しい制裁を作成
          </button>
        )}
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* Filters */}
      <div className="sanction-filters">
        <div className="filter-group">
          <label>
            <input
              type="checkbox"
              checked={filters.isActive}
              onChange={e =>
                setFilters({ ...filters, isActive: e.target.checked ? true : undefined })
              }
            />
            アクティブな制裁のみ
          </label>
        </div>
        <div className="filter-group">
          <label>
            制裁タイプ:
            <select
              value={filters.sanctionType || ''}
              onChange={e =>
                setFilters({
                  ...filters,
                  sanctionType: (e.target.value as SanctionType) || undefined,
                })
              }
            >
              <option value="">すべて</option>
              <option value={SanctionType.WARNING}>警告</option>
              <option value={SanctionType.TEMPORARY_SUSPENSION}>一時停止</option>
              <option value={SanctionType.PERMANENT_BAN}>永久停止</option>
            </select>
          </label>
        </div>
        <div className="filter-group">
          <label>
            異議申し立て:
            <select
              value={
                filters.isAppealed !== undefined ? (filters.isAppealed ? 'true' : 'false') : ''
              }
              onChange={e =>
                setFilters({
                  ...filters,
                  isAppealed: e.target.value === '' ? undefined : e.target.value === 'true',
                })
              }
            >
              <option value="">すべて</option>
              <option value="true">異議申し立てあり</option>
              <option value="false">異議申し立てなし</option>
            </select>
          </label>
        </div>
      </div>

      {/* Sanctions List */}
      <div className="sanctions-list">
        {sanctions.length === 0 ? (
          <div className="no-sanctions">
            {userId ? 'このユーザーに対する制裁はありません。' : '制裁が見つかりませんでした。'}
          </div>
        ) : (
          <div className="sanctions-grid">
            {sanctions.map(sanction => (
              <SanctionCard
                key={sanction.sanctionId}
                sanction={sanction}
                onRevoke={handleRevokeSanction}
                onAppeal={handleAppealSanction}
                onReviewAppeal={handleReviewAppeal}
                onViewDetails={setSelectedSanction}
                onNotifyUser={handleNotifyUser}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Sanction Form */}
      {showCreateForm && (
        <CreateSanctionModal
          onSave={handleCreateSanction}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      {/* Sanction Details Modal */}
      {selectedSanction && (
        <SanctionDetailsModal
          sanction={selectedSanction}
          onClose={() => setSelectedSanction(null)}
          onRevoke={handleRevokeSanction}
          onAppeal={handleAppealSanction}
          onReviewAppeal={handleReviewAppeal}
        />
      )}
    </div>
  );
};

interface SanctionCardProps {
  sanction: UserSanction;
  onRevoke: (sanctionId: string, reason: string) => void;
  onAppeal: (sanctionId: string, reason: string) => void;
  onReviewAppeal: (sanctionId: string, approved: boolean, notes?: string) => void;
  onViewDetails: (sanction: UserSanction) => void;
  onNotifyUser: (sanctionId: string) => void;
}

const SanctionCard: React.FC<SanctionCardProps> = ({
  sanction,
  onRevoke,
  onAppeal,
  onReviewAppeal,
  onViewDetails,
  onNotifyUser,
}) => {
  const [showRevokeForm, setShowRevokeForm] = useState(false);
  const [revokeReason, setRevokeReason] = useState('');

  const getSanctionTypeLabel = (type: SanctionType) => {
    switch (type) {
      case SanctionType.WARNING:
        return '警告';
      case SanctionType.TEMPORARY_SUSPENSION:
        return '一時停止';
      case SanctionType.PERMANENT_BAN:
        return '永久停止';
      default:
        return type;
    }
  };

  const getSanctionTypeClass = (type: SanctionType) => {
    switch (type) {
      case SanctionType.WARNING:
        return 'warning';
      case SanctionType.TEMPORARY_SUSPENSION:
        return 'suspension';
      case SanctionType.PERMANENT_BAN:
        return 'ban';
      default:
        return 'default';
    }
  };

  const isExpired = sanction.endDate && new Date(sanction.endDate) < new Date();
  const daysRemaining = sanction.endDate
    ? Math.ceil(
        (new Date(sanction.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      )
    : null;

  const handleRevoke = () => {
    if (revokeReason.trim()) {
      onRevoke(sanction.sanctionId, revokeReason);
      setShowRevokeForm(false);
      setRevokeReason('');
    }
  };

  return (
    <div
      className={`sanction-card ${getSanctionTypeClass(sanction.sanctionType)} ${!sanction.isActive ? 'inactive' : ''}`}
    >
      <div className="sanction-header">
        <div className="sanction-type">
          <span className={`type-badge ${getSanctionTypeClass(sanction.sanctionType)}`}>
            {getSanctionTypeLabel(sanction.sanctionType)}
          </span>
          {!sanction.isActive && <span className="inactive-badge">無効</span>}
          {isExpired && <span className="expired-badge">期限切れ</span>}
        </div>
        <div className="sanction-actions">
          <button className="btn btn-small" onClick={() => onViewDetails(sanction)}>
            詳細
          </button>
        </div>
      </div>

      <div className="sanction-details">
        <div className="user-info">
          <strong>対象ユーザー:</strong> {sanction.userDisplayName}
        </div>
        <div className="moderator-info">
          <strong>実行者:</strong> {sanction.moderatorDisplayName}
        </div>
        <div className="reason">
          <strong>理由:</strong> {sanction.reason}
        </div>
        {sanction.description && (
          <div className="description">
            <strong>詳細:</strong> {sanction.description}
          </div>
        )}

        <div className="sanction-dates">
          <div>
            <strong>開始日:</strong> {new Date(sanction.startDate).toLocaleString()}
          </div>
          {sanction.endDate && (
            <div>
              <strong>終了日:</strong> {new Date(sanction.endDate).toLocaleString()}
              {daysRemaining !== null && daysRemaining > 0 && (
                <span className="days-remaining"> (残り{daysRemaining}日)</span>
              )}
            </div>
          )}
        </div>

        {sanction.isAppealed && (
          <div className="appeal-info">
            <div className="appeal-status">
              <strong>異議申し立て:</strong>
              <span className={`appeal-badge ${sanction.appealStatus}`}>
                {sanction.appealStatus === 'pending'
                  ? '審査中'
                  : sanction.appealStatus === 'approved'
                    ? '承認'
                    : '却下'}
              </span>
            </div>
            {sanction.appealReason && (
              <div className="appeal-reason">
                <strong>申し立て理由:</strong> {sanction.appealReason}
              </div>
            )}
          </div>
        )}

        {sanction.previousSanctions.length > 0 && (
          <div className="previous-sanctions">
            <strong>過去の制裁:</strong> {sanction.previousSanctions.length}件
          </div>
        )}
      </div>

      <div className="sanction-footer">
        {sanction.isActive && !showRevokeForm && (
          <button className="btn btn-small btn-secondary" onClick={() => setShowRevokeForm(true)}>
            制裁を取り消す
          </button>
        )}

        {showRevokeForm && (
          <div className="revoke-form">
            <textarea
              value={revokeReason}
              onChange={e => setRevokeReason(e.target.value)}
              placeholder="取り消し理由を入力してください..."
              rows={2}
            />
            <div className="revoke-actions">
              <button
                className="btn btn-small btn-primary"
                onClick={handleRevoke}
                disabled={!revokeReason.trim()}
              >
                取り消し
              </button>
              <button
                className="btn btn-small btn-secondary"
                onClick={() => {
                  setShowRevokeForm(false);
                  setRevokeReason('');
                }}
              >
                キャンセル
              </button>
            </div>
          </div>
        )}

        {sanction.isAppealed && sanction.appealStatus === 'pending' && (
          <div className="appeal-review">
            <button
              className="btn btn-small btn-success"
              onClick={() => onReviewAppeal(sanction.sanctionId, true)}
            >
              異議を承認
            </button>
            <button
              className="btn btn-small btn-danger"
              onClick={() => onReviewAppeal(sanction.sanctionId, false)}
            >
              異議を却下
            </button>
          </div>
        )}

        {sanction.isActive && (
          <div className="notification-actions">
            <button
              className="btn btn-small btn-secondary"
              onClick={() => onNotifyUser(sanction.sanctionId)}
              title="ユーザーに通知を再送信"
            >
              📧 通知送信
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

interface CreateSanctionModalProps {
  onSave: (sanctionData: CreateSanctionData) => void;
  onCancel: () => void;
}

const CreateSanctionModal: React.FC<CreateSanctionModalProps> = ({ onSave, onCancel }) => {
  const [formData, setFormData] = useState<CreateSanctionData>({
    userId: '',
    sanctionType: SanctionType.WARNING,
    reason: '',
    description: '',
    duration: undefined,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="create-sanction-modal">
      <div className="modal-content">
        <div className="modal-header">
          <h3>新しい制裁を作成</h3>
          <button className="close-btn" onClick={onCancel}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="sanction-form">
          <div className="form-group">
            <label>対象ユーザーID *</label>
            <input
              type="text"
              value={formData.userId}
              onChange={e => setFormData({ ...formData, userId: e.target.value })}
              required
              placeholder="ユーザーIDを入力してください"
            />
          </div>

          <div className="form-group">
            <label>制裁タイプ *</label>
            <select
              value={formData.sanctionType}
              onChange={e =>
                setFormData({ ...formData, sanctionType: e.target.value as SanctionType })
              }
              required
            >
              <option value={SanctionType.WARNING}>警告</option>
              <option value={SanctionType.TEMPORARY_SUSPENSION}>一時停止</option>
              <option value={SanctionType.PERMANENT_BAN}>永久停止</option>
            </select>
          </div>

          {formData.sanctionType === SanctionType.TEMPORARY_SUSPENSION && (
            <div className="form-group">
              <label>停止期間 (時間) *</label>
              <input
                type="number"
                min="1"
                value={formData.duration || ''}
                onChange={e =>
                  setFormData({ ...formData, duration: parseInt(e.target.value) || undefined })
                }
                required
                placeholder="例: 24 (24時間)"
              />
              <small>時間単位で入力してください（例: 24時間停止の場合は24）</small>
            </div>
          )}

          <div className="form-group">
            <label>理由 *</label>
            <input
              type="text"
              value={formData.reason}
              onChange={e => setFormData({ ...formData, reason: e.target.value })}
              required
              placeholder="制裁の理由を入力してください"
            />
          </div>

          <div className="form-group">
            <label>詳細説明</label>
            <textarea
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              placeholder="制裁の詳細な説明を入力してください（任意）"
            />
          </div>

          <div className="form-group">
            <label>関連投稿ID</label>
            <input
              type="text"
              value={formData.relatedPostId || ''}
              onChange={e =>
                setFormData({ ...formData, relatedPostId: e.target.value || undefined })
              }
              placeholder="制裁の原因となった投稿のID（任意）"
            />
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onCancel}>
              キャンセル
            </button>
            <button type="submit" className="btn btn-primary">
              制裁を作成
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface SanctionDetailsModalProps {
  sanction: UserSanction;
  onClose: () => void;
  onRevoke: (sanctionId: string, reason: string) => void;
  onAppeal: (sanctionId: string, reason: string) => void;
  onReviewAppeal: (sanctionId: string, approved: boolean, notes?: string) => void;
}

const SanctionDetailsModal: React.FC<SanctionDetailsModalProps> = ({
  sanction,
  onClose,
  onRevoke,
  onAppeal,
  onReviewAppeal,
}) => {
  const [showAppealForm, setShowAppealForm] = useState(false);
  const [appealReason, setAppealReason] = useState('');
  const [showRevokeForm, setShowRevokeForm] = useState(false);
  const [revokeReason, setRevokeReason] = useState('');

  const handleAppeal = () => {
    if (appealReason.trim()) {
      onAppeal(sanction.sanctionId, appealReason);
      setShowAppealForm(false);
      setAppealReason('');
    }
  };

  const handleRevoke = () => {
    if (revokeReason.trim()) {
      onRevoke(sanction.sanctionId, revokeReason);
      setShowRevokeForm(false);
      setRevokeReason('');
    }
  };

  return (
    <div className="sanction-details-modal">
      <div className="modal-content">
        <div className="modal-header">
          <h3>制裁詳細</h3>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="sanction-details-content">
          <div className="detail-section">
            <h4>基本情報</h4>
            <div className="detail-grid">
              <div>
                <strong>制裁ID:</strong> {sanction.sanctionId}
              </div>
              <div>
                <strong>対象ユーザー:</strong> {sanction.userDisplayName}
              </div>
              <div>
                <strong>実行者:</strong> {sanction.moderatorDisplayName}
              </div>
              <div>
                <strong>制裁タイプ:</strong> {sanction.sanctionType}
              </div>
              <div>
                <strong>状態:</strong> {sanction.isActive ? 'アクティブ' : '無効'}
              </div>
            </div>
          </div>

          <div className="detail-section">
            <h4>制裁内容</h4>
            <div>
              <strong>理由:</strong> {sanction.reason}
            </div>
            {sanction.description && (
              <div>
                <strong>詳細:</strong> {sanction.description}
              </div>
            )}
          </div>

          <div className="detail-section">
            <h4>期間</h4>
            <div>
              <strong>開始日:</strong> {new Date(sanction.startDate).toLocaleString()}
            </div>
            {sanction.endDate && (
              <div>
                <strong>終了日:</strong> {new Date(sanction.endDate).toLocaleString()}
              </div>
            )}
            {sanction.duration && (
              <div>
                <strong>期間:</strong> {sanction.duration}時間
              </div>
            )}
          </div>

          {sanction.isAppealed && (
            <div className="detail-section">
              <h4>異議申し立て</h4>
              <div>
                <strong>申し立て日:</strong>{' '}
                {sanction.appealedAt ? new Date(sanction.appealedAt).toLocaleString() : '-'}
              </div>
              <div>
                <strong>状態:</strong> {sanction.appealStatus}
              </div>
              {sanction.appealReason && (
                <div>
                  <strong>申し立て理由:</strong> {sanction.appealReason}
                </div>
              )}
              {sanction.appealReviewedBy && (
                <div>
                  <strong>審査者:</strong> {sanction.appealReviewedBy}
                </div>
              )}
              {sanction.appealReviewedAt && (
                <div>
                  <strong>審査日:</strong> {new Date(sanction.appealReviewedAt).toLocaleString()}
                </div>
              )}
            </div>
          )}

          {sanction.relatedPostId && (
            <div className="detail-section">
              <h4>関連情報</h4>
              <div>
                <strong>関連投稿:</strong> {sanction.relatedPostId}
              </div>
            </div>
          )}

          {sanction.previousSanctions.length > 0 && (
            <div className="detail-section">
              <h4>過去の制裁</h4>
              <div>
                <strong>過去の制裁数:</strong> {sanction.previousSanctions.length}件
              </div>
            </div>
          )}

          <div className="detail-section">
            <h4>通知情報</h4>
            <div>
              <strong>ユーザー通知:</strong> {sanction.userNotified ? '済み' : '未通知'}
            </div>
            {sanction.notifiedAt && (
              <div>
                <strong>通知日時:</strong> {new Date(sanction.notifiedAt).toLocaleString()}
              </div>
            )}
            {sanction.notificationMethod && (
              <div>
                <strong>通知方法:</strong> {sanction.notificationMethod}
              </div>
            )}
          </div>
        </div>

        <div className="modal-actions">
          {sanction.isActive && !showRevokeForm && (
            <button className="btn btn-secondary" onClick={() => setShowRevokeForm(true)}>
              制裁を取り消す
            </button>
          )}

          {!sanction.isAppealed && !showAppealForm && (
            <button className="btn btn-secondary" onClick={() => setShowAppealForm(true)}>
              異議申し立て
            </button>
          )}

          {sanction.isAppealed && sanction.appealStatus === 'pending' && (
            <>
              <button
                className="btn btn-success"
                onClick={() => onReviewAppeal(sanction.sanctionId, true)}
              >
                異議を承認
              </button>
              <button
                className="btn btn-danger"
                onClick={() => onReviewAppeal(sanction.sanctionId, false)}
              >
                異議を却下
              </button>
            </>
          )}

          <button className="btn btn-primary" onClick={onClose}>
            閉じる
          </button>
        </div>

        {showAppealForm && (
          <div className="appeal-form">
            <h4>異議申し立て</h4>
            <textarea
              value={appealReason}
              onChange={e => setAppealReason(e.target.value)}
              placeholder="異議申し立ての理由を入力してください..."
              rows={4}
            />
            <div className="form-actions">
              <button
                className="btn btn-primary"
                onClick={handleAppeal}
                disabled={!appealReason.trim()}
              >
                申し立てを送信
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setShowAppealForm(false);
                  setAppealReason('');
                }}
              >
                キャンセル
              </button>
            </div>
          </div>
        )}

        {showRevokeForm && (
          <div className="revoke-form">
            <h4>制裁の取り消し</h4>
            <textarea
              value={revokeReason}
              onChange={e => setRevokeReason(e.target.value)}
              placeholder="取り消し理由を入力してください..."
              rows={4}
            />
            <div className="form-actions">
              <button
                className="btn btn-primary"
                onClick={handleRevoke}
                disabled={!revokeReason.trim()}
              >
                取り消し
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setShowRevokeForm(false);
                  setRevokeReason('');
                }}
              >
                キャンセル
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserSanctionManager;
