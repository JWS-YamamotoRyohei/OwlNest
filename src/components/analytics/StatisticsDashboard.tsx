import React, { useState } from 'react';
import { usePlatformStatistics, useAnalyticsFilter } from '../../hooks/useAnalytics';
import { AnalyticsTimeRange } from '../../types/analytics';
import ExportButton from './ExportButton';
import './StatisticsDashboard.css';

interface StatisticsDashboardProps {
  className?: string;
}

const StatisticsDashboard: React.FC<StatisticsDashboardProps> = ({ className }) => {
  const { filter, updateTimeRange } = useAnalyticsFilter();
  const { data: platformStats, loading, error, refetch } = usePlatformStatistics(filter);
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month'>('day');

  const handlePeriodChange = (period: 'day' | 'week' | 'month') => {
    setSelectedPeriod(period);

    const now = new Date();
    let start: Date;

    switch (period) {
      case 'day':
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days
        break;
      case 'week':
        start = new Date(now.getTime() - 12 * 7 * 24 * 60 * 60 * 1000); // 12 weeks
        break;
      case 'month':
        start = new Date(now.getTime() - 12 * 30 * 24 * 60 * 60 * 1000); // 12 months
        break;
    }

    const timeRange: AnalyticsTimeRange = {
      start: start.toISOString(),
      end: now.toISOString(),
      period,
    };

    updateTimeRange(timeRange);
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const formatPercentage = (num: number): string => {
    return (num * 100).toFixed(1) + '%';
  };

  if (loading) {
    return (
      <div className={`statistics-dashboard ${className || ''}`}>
        <div className="dashboard-header">
          <h2>プラットフォーム統計</h2>
        </div>
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>統計データを読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`statistics-dashboard ${className || ''}`}>
        <div className="dashboard-header">
          <h2>プラットフォーム統計</h2>
        </div>
        <div className="error-state">
          <p>統計データの読み込みに失敗しました: {error}</p>
          <button onClick={refetch} className="retry-button">
            再試行
          </button>
        </div>
      </div>
    );
  }

  if (!platformStats) {
    return null;
  }

  return (
    <div className={`statistics-dashboard ${className || ''}`}>
      <div className="dashboard-header">
        <div className="header-left">
          <h2>プラットフォーム統計</h2>
        </div>
        <div className="header-right">
          <div className="period-selector">
            <button
              className={selectedPeriod === 'day' ? 'active' : ''}
              onClick={() => handlePeriodChange('day')}
            >
              日別
            </button>
            <button
              className={selectedPeriod === 'week' ? 'active' : ''}
              onClick={() => handlePeriodChange('week')}
            >
              週別
            </button>
            <button
              className={selectedPeriod === 'month' ? 'active' : ''}
              onClick={() => handlePeriodChange('month')}
            >
              月別
            </button>
          </div>
          <ExportButton
            exportType="platform"
            title="プラットフォーム統計データのエクスポート"
            variant="outline"
            size="medium"
          />
        </div>
      </div>

      <div className="stats-grid">
        {/* Overview Stats */}
        <div className="stats-section overview-stats">
          <h3>概要</h3>
          <div className="stats-cards">
            <div className="stat-card">
              <div className="stat-value">{formatNumber(platformStats.totalUsers)}</div>
              <div className="stat-label">総ユーザー数</div>
              <div className="stat-detail">
                アクティブ: {formatNumber(platformStats.activeUsers)}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{formatNumber(platformStats.totalDiscussions)}</div>
              <div className="stat-label">総議論数</div>
              <div className="stat-detail">
                アクティブ: {formatNumber(platformStats.activeDiscussions)}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{formatNumber(platformStats.totalPosts)}</div>
              <div className="stat-label">総投稿数</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">
                {formatPercentage(platformStats.averageEngagementRate)}
              </div>
              <div className="stat-label">平均エンゲージメント率</div>
            </div>
          </div>
        </div>

        {/* Growth Metrics */}
        <div className="stats-section growth-stats">
          <h3>成長指標</h3>
          <div className="stats-cards">
            <div className="stat-card">
              <div className="stat-value">
                {formatNumber(platformStats.growthMetrics.dailyActiveUsers)}
              </div>
              <div className="stat-label">日間アクティブユーザー</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">
                {formatNumber(platformStats.growthMetrics.weeklyActiveUsers)}
              </div>
              <div className="stat-label">週間アクティブユーザー</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">
                {formatNumber(platformStats.growthMetrics.monthlyActiveUsers)}
              </div>
              <div className="stat-label">月間アクティブユーザー</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">
                {formatPercentage(platformStats.growthMetrics.retentionRate)}
              </div>
              <div className="stat-label">ユーザー継続率</div>
            </div>
          </div>
        </div>

        {/* New Users */}
        <div className="stats-section new-users-stats">
          <h3>新規ユーザー</h3>
          <div className="stats-cards">
            <div className="stat-card">
              <div className="stat-value">
                {formatNumber(platformStats.growthMetrics.newUsersToday)}
              </div>
              <div className="stat-label">今日</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">
                {formatNumber(platformStats.growthMetrics.newUsersThisWeek)}
              </div>
              <div className="stat-label">今週</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">
                {formatNumber(platformStats.growthMetrics.newUsersThisMonth)}
              </div>
              <div className="stat-label">今月</div>
            </div>
          </div>
        </div>

        {/* Top Categories */}
        <div className="stats-section categories-stats">
          <h3>人気カテゴリ</h3>
          <div className="categories-list">
            {platformStats.topCategories.map((category, index) => (
              <div key={category.categoryId} className="category-item">
                <div className="category-rank">#{index + 1}</div>
                <div className="category-info">
                  <div className="category-name">{category.categoryName}</div>
                  <div className="category-stats">
                    <span>議論: {category.discussionCount}</span>
                    <span>投稿: {formatNumber(category.postCount)}</span>
                    <span>参加者: {category.participantCount}</span>
                  </div>
                </div>
                <div className="category-engagement">
                  {formatPercentage(category.engagementRate)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stance Distribution */}
        <div className="stats-section stance-stats">
          <h3>スタンス分布</h3>
          <div className="stance-distribution">
            <div className="stance-item pros">
              <div
                className="stance-bar"
                style={{
                  width: `${platformStats.userActivityDistribution.stanceDistribution.pros * 100}%`,
                }}
              ></div>
              <div className="stance-label">
                <span className="stance-name">賛成</span>
                <span className="stance-percentage">
                  {formatPercentage(platformStats.userActivityDistribution.stanceDistribution.pros)}
                </span>
              </div>
            </div>
            <div className="stance-item cons">
              <div
                className="stance-bar"
                style={{
                  width: `${platformStats.userActivityDistribution.stanceDistribution.cons * 100}%`,
                }}
              ></div>
              <div className="stance-label">
                <span className="stance-name">反対</span>
                <span className="stance-percentage">
                  {formatPercentage(platformStats.userActivityDistribution.stanceDistribution.cons)}
                </span>
              </div>
            </div>
            <div className="stance-item neutral">
              <div
                className="stance-bar"
                style={{
                  width: `${platformStats.userActivityDistribution.stanceDistribution.neutral * 100}%`,
                }}
              ></div>
              <div className="stance-label">
                <span className="stance-name">中立</span>
                <span className="stance-percentage">
                  {formatPercentage(
                    platformStats.userActivityDistribution.stanceDistribution.neutral
                  )}
                </span>
              </div>
            </div>
            <div className="stance-item unknown">
              <div
                className="stance-bar"
                style={{
                  width: `${platformStats.userActivityDistribution.stanceDistribution.unknown * 100}%`,
                }}
              ></div>
              <div className="stance-label">
                <span className="stance-name">わからない</span>
                <span className="stance-percentage">
                  {formatPercentage(
                    platformStats.userActivityDistribution.stanceDistribution.unknown
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatisticsDashboard;
