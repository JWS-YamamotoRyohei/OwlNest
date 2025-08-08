import React from 'react';
import { useDiscussionStatistics } from '../../hooks/useAnalytics';
import { DiscussionStatistics } from '../../types/analytics';
import ExportButton from './ExportButton';
import './DiscussionStatisticsCard.css';

interface DiscussionStatisticsCardProps {
  discussionId: string;
  title?: string;
  showDetailedStats?: boolean;
  className?: string;
  onViewDetails?: (discussionId: string) => void;
}

const DiscussionStatisticsCard: React.FC<DiscussionStatisticsCardProps> = ({
  discussionId,
  title,
  showDetailedStats = false,
  className,
  onViewDetails,
}) => {
  const { data: stats, loading, error, refetch } = useDiscussionStatistics(discussionId);

  const formatNumber = (num: number): string => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const formatPercentage = (num: number): string => {
    return (num * 100).toFixed(1) + '%';
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getEngagementLevel = (rate: number): { level: string; color: string } => {
    if (rate >= 0.7) return { level: '高', color: '#22c55e' };
    if (rate >= 0.4) return { level: '中', color: '#f59e0b' };
    return { level: '低', color: '#ef4444' };
  };

  if (loading) {
    return (
      <div className={`discussion-statistics-card loading ${className || ''}`}>
        <div className="card-header">
          <h3>{title || '議論統計'}</h3>
        </div>
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <p>統計を読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`discussion-statistics-card error ${className || ''}`}>
        <div className="card-header">
          <h3>{title || '議論統計'}</h3>
        </div>
        <div className="error-content">
          <p>統計の読み込みに失敗しました</p>
          <button onClick={refetch} className="retry-button">
            再試行
          </button>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const engagementInfo = getEngagementLevel(stats.engagementRate);

  return (
    <div className={`discussion-statistics-card ${className || ''}`}>
      <div className="card-header">
        <h3>{title || stats.title}</h3>
        <div className="header-actions">
          <ExportButton
            exportType="posts"
            title="投稿データのエクスポート"
            dataIds={[discussionId]}
            variant="outline"
            size="small"
          />
          {onViewDetails && (
            <button className="view-details-button" onClick={() => onViewDetails(discussionId)}>
              詳細を見る
            </button>
          )}
        </div>
      </div>

      <div className="stats-content">
        {/* Basic Stats */}
        <div className="basic-stats">
          <div className="stat-item">
            <div className="stat-value">{formatNumber(stats.participantCount)}</div>
            <div className="stat-label">参加者</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{formatNumber(stats.postCount)}</div>
            <div className="stat-label">投稿数</div>
          </div>
          <div className="stat-item">
            <div className="stat-value" style={{ color: engagementInfo.color }}>
              {formatPercentage(stats.engagementRate)}
            </div>
            <div className="stat-label">エンゲージメント率</div>
            <div className="stat-badge" style={{ backgroundColor: engagementInfo.color }}>
              {engagementInfo.level}
            </div>
          </div>
        </div>

        {/* Stance Distribution */}
        <div className="stance-distribution">
          <h4>スタンス分布</h4>
          <div className="stance-bars">
            <div className="stance-bar-item">
              <div className="stance-info">
                <span className="stance-label pros">賛成</span>
                <span className="stance-count">{stats.prosCount}</span>
              </div>
              <div className="stance-bar">
                <div
                  className="stance-fill pros"
                  style={{
                    width: `${(stats.prosCount / stats.postCount) * 100}%`,
                  }}
                ></div>
              </div>
            </div>
            <div className="stance-bar-item">
              <div className="stance-info">
                <span className="stance-label cons">反対</span>
                <span className="stance-count">{stats.consCount}</span>
              </div>
              <div className="stance-bar">
                <div
                  className="stance-fill cons"
                  style={{
                    width: `${(stats.consCount / stats.postCount) * 100}%`,
                  }}
                ></div>
              </div>
            </div>
            <div className="stance-bar-item">
              <div className="stance-info">
                <span className="stance-label neutral">中立</span>
                <span className="stance-count">{stats.neutralCount}</span>
              </div>
              <div className="stance-bar">
                <div
                  className="stance-fill neutral"
                  style={{
                    width: `${(stats.neutralCount / stats.postCount) * 100}%`,
                  }}
                ></div>
              </div>
            </div>
            <div className="stance-bar-item">
              <div className="stance-info">
                <span className="stance-label unknown">わからない</span>
                <span className="stance-count">{stats.unknownCount}</span>
              </div>
              <div className="stance-bar">
                <div
                  className="stance-fill unknown"
                  style={{
                    width: `${(stats.unknownCount / stats.postCount) * 100}%`,
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Stats */}
        {showDetailedStats && (
          <div className="detailed-stats">
            <div className="detailed-stat-row">
              <div className="detailed-stat-item">
                <div className="detailed-stat-value">
                  {stats.averagePostsPerParticipant.toFixed(1)}
                </div>
                <div className="detailed-stat-label">平均投稿数/参加者</div>
              </div>
              <div className="detailed-stat-item">
                <div className="detailed-stat-value">{formatNumber(stats.uniqueViewers)}</div>
                <div className="detailed-stat-label">ユニーク閲覧者</div>
              </div>
            </div>
            <div className="detailed-stat-row">
              <div className="detailed-stat-item">
                <div className="detailed-stat-value">{formatNumber(stats.totalViews)}</div>
                <div className="detailed-stat-label">総閲覧数</div>
              </div>
              <div className="detailed-stat-item">
                <div className="detailed-stat-value">{formatDate(stats.lastActivityAt)}</div>
                <div className="detailed-stat-label">最終活動</div>
              </div>
            </div>
          </div>
        )}

        {/* Activity Timeline */}
        <div className="activity-info">
          <div className="activity-item">
            <span className="activity-label">作成日:</span>
            <span className="activity-value">{formatDate(stats.createdAt)}</span>
          </div>
          <div className="activity-item">
            <span className="activity-label">最終活動:</span>
            <span className="activity-value">{formatDate(stats.lastActivityAt)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiscussionStatisticsCard;
