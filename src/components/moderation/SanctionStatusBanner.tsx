import React from 'react';
import { SanctionType } from '../../types/moderation';
import { useUserSanctionStatus } from '../../hooks/useUserSanctionStatus';
import './SanctionStatusBanner.css';

interface SanctionStatusBannerProps {
  userId?: string;
  showDetails?: boolean;
}

export const SanctionStatusBanner: React.FC<SanctionStatusBannerProps> = ({
  userId,
  showDetails = true,
}) => {
  const { status, loading, error } = useUserSanctionStatus(userId);

  if (loading || error || !status || !status.isSanctioned) {
    return null;
  }

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

  const formatEndDate = (endDate?: string) => {
    if (!endDate) return null;

    const date = new Date(endDate);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));

    if (diffMs <= 0) {
      return '期限切れ';
    } else if (diffHours < 24) {
      return `${diffHours}時間後まで`;
    } else if (diffDays === 1) {
      return '明日まで';
    } else {
      return `${diffDays}日後まで`;
    }
  };

  const getRestrictionMessage = () => {
    if (!status.highestSanctionType) return '';

    switch (status.highestSanctionType) {
      case SanctionType.WARNING:
        return '今後の行動にご注意ください。';
      case SanctionType.TEMPORARY_SUSPENSION:
        return '一時停止期間中は投稿や議論の作成ができません。';
      case SanctionType.PERMANENT_BAN:
        return '永久停止により、投稿や議論の作成ができません。';
      default:
        return '';
    }
  };

  const bannerClass = status.highestSanctionType
    ? `sanction-banner ${getSanctionTypeClass(status.highestSanctionType)}`
    : 'sanction-banner';

  return (
    <div className={bannerClass}>
      <div className="sanction-banner-content">
        <div className="sanction-banner-header">
          <div className="sanction-icon">
            {status.highestSanctionType === SanctionType.WARNING && '⚠️'}
            {status.highestSanctionType === SanctionType.TEMPORARY_SUSPENSION && '🚫'}
            {status.highestSanctionType === SanctionType.PERMANENT_BAN && '❌'}
          </div>
          <div className="sanction-title">
            <h4>
              {status.highestSanctionType && getSanctionTypeLabel(status.highestSanctionType)}
              が適用されています
            </h4>
            {status.restrictionEndDate && (
              <span className="sanction-duration">{formatEndDate(status.restrictionEndDate)}</span>
            )}
          </div>
        </div>

        <div className="sanction-message">
          <p>{getRestrictionMessage()}</p>
        </div>

        {showDetails && status.activeSanctions.length > 0 && (
          <div className="sanction-details">
            <details>
              <summary>詳細を表示</summary>
              <div className="sanction-list">
                {status.activeSanctions.map(sanction => (
                  <div key={sanction.sanctionId} className="sanction-item">
                    <div className="sanction-item-header">
                      <span
                        className={`sanction-type-badge ${getSanctionTypeClass(sanction.sanctionType)}`}
                      >
                        {getSanctionTypeLabel(sanction.sanctionType)}
                      </span>
                      <span className="sanction-date">
                        {new Date(sanction.startDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="sanction-reason">
                      <strong>理由:</strong> {sanction.reason}
                    </div>
                    {sanction.description && (
                      <div className="sanction-description">
                        <strong>詳細:</strong> {sanction.description}
                      </div>
                    )}
                    {sanction.endDate && (
                      <div className="sanction-end-date">
                        <strong>終了予定:</strong> {new Date(sanction.endDate).toLocaleString()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </details>
          </div>
        )}

        {status.highestSanctionType !== SanctionType.PERMANENT_BAN && (
          <div className="sanction-footer">
            <p className="sanction-note">
              制裁に関してご質問がある場合は、管理者にお問い合わせください。
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SanctionStatusBanner;
