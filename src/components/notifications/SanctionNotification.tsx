import React from 'react';
import { NotificationListItem } from '../../types';
import { SanctionType } from '../../types/moderation';
import './SanctionNotification.css';

interface SanctionNotificationProps {
  notification: NotificationListItem;
  onMarkAsRead: (notificationId: string) => void;
  onArchive: (notificationId: string) => void;
}

export const SanctionNotification: React.FC<SanctionNotificationProps> = ({
  notification,
  onMarkAsRead,
  onArchive,
}) => {
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

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'USER_SANCTIONED':
        return '⚠️';
      case 'SANCTION_REVOKED':
        return '✅';
      case 'APPEAL_REVIEWED':
        return '📋';
      default:
        return '📢';
    }
  };

  const getNotificationClass = (type: string) => {
    switch (type) {
      case 'USER_SANCTIONED':
        return 'sanction-notification';
      case 'SANCTION_REVOKED':
        return 'revocation-notification';
      case 'APPEAL_REVIEWED':
        return 'appeal-notification';
      default:
        return 'default-notification';
    }
  };

  const formatEndDate = (endDate?: string) => {
    if (!endDate) return null;

    const date = new Date(endDate);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      return '期限切れ';
    } else if (diffDays === 1) {
      return '明日まで';
    } else {
      return `${diffDays}日後まで`;
    }
  };

  const handleMarkAsRead = () => {
    if (!notification.isRead) {
      onMarkAsRead(notification.notificationId);
    }
  };

  const handleArchive = () => {
    onArchive(notification.notificationId);
  };

  return (
    <div
      className={`sanction-notification-card ${getNotificationClass(notification.type)} ${!notification.isRead ? 'unread' : ''}`}
    >
      <div className="notification-header">
        <div className="notification-icon">{getNotificationIcon(notification.type)}</div>
        <div className="notification-title">
          <h4>{notification.title}</h4>
          <span className="notification-time">
            {new Date(notification.createdAt).toLocaleString()}
          </span>
        </div>
        <div className="notification-actions">
          {!notification.isRead && (
            <button
              className="btn btn-small btn-secondary"
              onClick={handleMarkAsRead}
              title="既読にする"
            >
              ✓
            </button>
          )}
          <button
            className="btn btn-small btn-secondary"
            onClick={handleArchive}
            title="アーカイブ"
          >
            📁
          </button>
        </div>
      </div>

      <div className="notification-content">
        <p className="notification-message">{notification.message}</p>

        {notification.data && (
          <div className="sanction-details">
            {notification.data.sanctionType && (
              <div className="sanction-info">
                <span
                  className={`sanction-type-badge ${getSanctionTypeClass(notification.data.sanctionType)}`}
                >
                  {getSanctionTypeLabel(notification.data.sanctionType)}
                </span>
              </div>
            )}

            {notification.data.reason && (
              <div className="sanction-reason">
                <strong>理由:</strong> {notification.data.reason}
              </div>
            )}

            {notification.data.endDate && (
              <div className="sanction-duration">
                <strong>期限:</strong> {formatEndDate(notification.data.endDate)}
              </div>
            )}

            {notification.data.revocationReason && (
              <div className="revocation-reason">
                <strong>取り消し理由:</strong> {notification.data.revocationReason}
              </div>
            )}

            {notification.data.appealStatus && (
              <div className="appeal-status">
                <strong>異議申し立て結果:</strong>
                <span className={`appeal-status-badge ${notification.data.appealStatus}`}>
                  {notification.data.appealStatus === 'approved' ? '承認' : '却下'}
                </span>
              </div>
            )}

            {notification.data.appealReviewNotes && (
              <div className="appeal-notes">
                <strong>審査コメント:</strong> {notification.data.appealReviewNotes}
              </div>
            )}
          </div>
        )}
      </div>

      {notification.type === 'USER_SANCTIONED' &&
        notification.data?.sanctionType === SanctionType.TEMPORARY_SUSPENSION && (
          <div className="notification-footer">
            <div className="suspension-info">
              <p className="info-text">
                一時停止期間中は投稿や議論の作成ができません。期間終了後に自動的に制限が解除されます。
              </p>
            </div>
          </div>
        )}

      {notification.type === 'USER_SANCTIONED' &&
        notification.data?.sanctionType === SanctionType.PERMANENT_BAN && (
          <div className="notification-footer">
            <div className="ban-info">
              <p className="info-text">
                永久停止により、今後投稿や議論の作成ができません。異議がある場合は管理者にお問い合わせください。
              </p>
            </div>
          </div>
        )}

      {notification.type === 'SANCTION_REVOKED' && (
        <div className="notification-footer">
          <div className="revocation-info">
            <p className="info-text">
              制裁が取り消されました。通常通りサービスをご利用いただけます。
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SanctionNotification;
