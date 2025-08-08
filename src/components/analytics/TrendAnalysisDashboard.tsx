import React, { useState, useMemo } from 'react';
import {
  useTrendData,
  useAnalyticsFilter,
  useMultipleDiscussionStatistics,
} from '../../hooks/useAnalytics';
import TrendChart from './TrendChart';
import StanceDistributionChart from './StanceDistributionChart';
import ExportButton from './ExportButton';
import { AnalyticsTimeRange } from '../../types/analytics';
import './TrendAnalysisDashboard.css';

interface TrendAnalysisDashboardProps {
  discussionIds?: string[];
  className?: string;
}

const TrendAnalysisDashboard: React.FC<TrendAnalysisDashboardProps> = ({
  discussionIds = [],
  className,
}) => {
  const { filter, updateTimeRange } = useAnalyticsFilter();
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter'>('month');
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([
    'posts',
    'users',
    'engagement',
  ]);

  // Get trend data for different metrics
  const { data: postsTrend, loading: postsLoading } = useTrendData(
    'posts',
    filter.timeRange,
    filter
  );
  const { data: usersTrend, loading: usersLoading } = useTrendData(
    'users',
    filter.timeRange,
    filter
  );
  const { data: discussionsTrend, loading: discussionsLoading } = useTrendData(
    'discussions',
    filter.timeRange,
    filter
  );
  const { data: engagementTrend, loading: engagementLoading } = useTrendData(
    'engagement',
    filter.timeRange,
    filter
  );

  // Get discussion statistics for stance analysis
  const { data: discussionStats, loading: discussionStatsLoading } =
    useMultipleDiscussionStatistics(discussionIds);

  const handlePeriodChange = (period: 'week' | 'month' | 'quarter') => {
    setSelectedPeriod(period);

    const now = new Date();
    let start: Date;

    switch (period) {
      case 'week':
        start = new Date(now.getTime() - 12 * 7 * 24 * 60 * 60 * 1000); // 12 weeks
        break;
      case 'month':
        start = new Date(now.getTime() - 12 * 30 * 24 * 60 * 60 * 1000); // 12 months
        break;
      case 'quarter':
        start = new Date(now.getTime() - 4 * 90 * 24 * 60 * 60 * 1000); // 4 quarters
        break;
    }

    const timeRange: AnalyticsTimeRange = {
      start: start.toISOString(),
      end: now.toISOString(),
      period: period === 'week' ? 'day' : period === 'month' ? 'week' : 'month',
    };

    updateTimeRange(timeRange);
  };

  const handleMetricToggle = (metric: string) => {
    setSelectedMetrics(prev =>
      prev.includes(metric) ? prev.filter(m => m !== metric) : [...prev, metric]
    );
  };

  const trendCharts = useMemo(() => {
    const charts = [];

    if (selectedMetrics.includes('posts') && postsTrend) {
      charts.push({
        key: 'posts',
        component: (
          <TrendChart
            data={postsTrend}
            title="投稿数の推移"
            metric="投稿"
            color="#3b82f6"
            height={180}
          />
        ),
      });
    }

    if (selectedMetrics.includes('users') && usersTrend) {
      charts.push({
        key: 'users',
        component: (
          <TrendChart
            data={usersTrend}
            title="ユーザー数の推移"
            metric="ユーザー"
            color="#22c55e"
            height={180}
          />
        ),
      });
    }

    if (selectedMetrics.includes('discussions') && discussionsTrend) {
      charts.push({
        key: 'discussions',
        component: (
          <TrendChart
            data={discussionsTrend}
            title="議論数の推移"
            metric="議論"
            color="#f59e0b"
            height={180}
          />
        ),
      });
    }

    if (selectedMetrics.includes('engagement') && engagementTrend) {
      charts.push({
        key: 'engagement',
        component: (
          <TrendChart
            data={engagementTrend}
            title="エンゲージメント率の推移"
            metric="%"
            color="#a855f7"
            height={180}
          />
        ),
      });
    }

    return charts;
  }, [selectedMetrics, postsTrend, usersTrend, discussionsTrend, engagementTrend]);

  const isLoading =
    postsLoading ||
    usersLoading ||
    discussionsLoading ||
    engagementLoading ||
    discussionStatsLoading;

  const getInsights = () => {
    if (!postsTrend || !usersTrend || !engagementTrend) return [];

    const insights = [];
    const latestPosts = postsTrend[postsTrend.length - 1];
    const latestUsers = usersTrend[usersTrend.length - 1];
    const latestEngagement = engagementTrend[engagementTrend.length - 1];

    // Growth insights
    if (latestPosts?.changePercentage > 10) {
      insights.push({
        type: 'positive',
        title: '投稿数が急増',
        description: `前期比${latestPosts.changePercentage.toFixed(1)}%の増加を記録`,
      });
    } else if (latestPosts?.changePercentage < -10) {
      insights.push({
        type: 'negative',
        title: '投稿数が減少',
        description: `前期比${Math.abs(latestPosts.changePercentage).toFixed(1)}%の減少`,
      });
    }

    // User growth insights
    if (latestUsers?.changePercentage > 5) {
      insights.push({
        type: 'positive',
        title: 'ユーザー数が増加',
        description: `新規ユーザーの獲得が順調に進んでいます`,
      });
    }

    // Engagement insights
    if (latestEngagement?.value > 0.7) {
      insights.push({
        type: 'positive',
        title: '高いエンゲージメント',
        description: 'ユーザーの参加度が非常に高い状態です',
      });
    } else if (latestEngagement?.value < 0.4) {
      insights.push({
        type: 'warning',
        title: 'エンゲージメント低下',
        description: 'ユーザーの参加度向上が必要です',
      });
    }

    return insights;
  };

  const insights = getInsights();

  return (
    <div className={`trend-analysis-dashboard ${className || ''}`}>
      <div className="dashboard-header">
        <div className="header-content">
          <h2>傾向分析ダッシュボード</h2>
          <p>プラットフォームの成長トレンドと議論パターンを分析します</p>
        </div>

        <div className="dashboard-controls">
          <div className="period-selector">
            <label>期間:</label>
            <div className="period-buttons">
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
              <button
                className={selectedPeriod === 'quarter' ? 'active' : ''}
                onClick={() => handlePeriodChange('quarter')}
              >
                四半期別
              </button>
            </div>
          </div>

          <div className="metrics-selector">
            <label>表示指標:</label>
            <div className="metrics-checkboxes">
              {[
                { key: 'posts', label: '投稿数', color: '#3b82f6' },
                { key: 'users', label: 'ユーザー数', color: '#22c55e' },
                { key: 'discussions', label: '議論数', color: '#f59e0b' },
                { key: 'engagement', label: 'エンゲージメント', color: '#a855f7' },
              ].map(metric => (
                <label key={metric.key} className="metric-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedMetrics.includes(metric.key)}
                    onChange={() => handleMetricToggle(metric.key)}
                  />
                  <span
                    className="checkbox-indicator"
                    style={{
                      backgroundColor: selectedMetrics.includes(metric.key)
                        ? metric.color
                        : '#e2e8f0',
                    }}
                  />
                  {metric.label}
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>トレンドデータを分析中...</p>
        </div>
      ) : (
        <div className="dashboard-content">
          {/* Trend Charts */}
          <div className="trends-section">
            <div className="section-header-with-export">
              <h3>時系列トレンド</h3>
              <div className="export-buttons">
                {selectedMetrics.map(metric => (
                  <ExportButton
                    key={metric}
                    exportType="trends"
                    title={`${metric}トレンドデータのエクスポート`}
                    metric={metric as 'posts' | 'users' | 'discussions' | 'engagement'}
                    variant="outline"
                    size="small"
                  />
                ))}
              </div>
            </div>
            <div className="trends-grid">
              {trendCharts.map(chart => (
                <div key={chart.key} className="trend-chart-wrapper">
                  {chart.component}
                </div>
              ))}
            </div>
          </div>

          {/* Stance Distribution Analysis */}
          {discussionStats && discussionStats.length > 0 && (
            <div className="stance-section">
              <div className="section-header-with-export">
                <h3>スタンス分布分析</h3>
                <ExportButton
                  exportType="discussions"
                  title="議論統計データのエクスポート"
                  dataIds={discussionIds}
                  variant="outline"
                  size="small"
                />
              </div>
              <div className="stance-analysis-grid">
                <StanceDistributionChart
                  data={discussionStats}
                  title="全体のスタンス分布"
                  showLegend={true}
                  showPercentages={true}
                />
              </div>
            </div>
          )}

          {/* Insights */}
          {insights.length > 0 && (
            <div className="insights-section">
              <h3>分析結果とインサイト</h3>
              <div className="insights-grid">
                {insights.map((insight, index) => (
                  <div key={index} className={`insight-card ${insight.type}`}>
                    <div className="insight-icon">
                      {insight.type === 'positive' && '📈'}
                      {insight.type === 'negative' && '📉'}
                      {insight.type === 'warning' && '⚠️'}
                    </div>
                    <div className="insight-content">
                      <h4>{insight.title}</h4>
                      <p>{insight.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Trend Detection Alerts */}
          <div className="alerts-section">
            <h3>トレンド検出アラート</h3>
            <div className="alerts-list">
              <div className="alert-item info">
                <div className="alert-icon">ℹ️</div>
                <div className="alert-content">
                  <div className="alert-title">正常な成長パターン</div>
                  <div className="alert-description">
                    プラットフォームの成長は健全な範囲内で推移しています
                  </div>
                </div>
              </div>

              {latestPosts?.changePercentage && Math.abs(latestPosts.changePercentage) > 20 && (
                <div className="alert-item warning">
                  <div className="alert-icon">🚨</div>
                  <div className="alert-content">
                    <div className="alert-title">投稿数の急激な変化を検出</div>
                    <div className="alert-description">
                      前期比{latestPosts.changePercentage.toFixed(1)}
                      %の変化が発生しています。要因の調査をお勧めします。
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrendAnalysisDashboard;
