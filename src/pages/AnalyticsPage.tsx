import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useMultipleDiscussionStatistics } from '../hooks/useAnalytics';
import StatisticsDashboard from '../components/analytics/StatisticsDashboard';
import DiscussionStatisticsCard from '../components/analytics/DiscussionStatisticsCard';
import TrendAnalysisDashboard from '../components/analytics/TrendAnalysisDashboard';
import { Discussion } from '../types/discussion';
import './AnalyticsPage.css';

const AnalyticsPage: React.FC = () => {
  const { user } = useAuth();
  const [selectedTab, setSelectedTab] = useState<
    'platform' | 'discussions' | 'trends' | 'personal'
  >('platform');

  // Mock discussion IDs for demonstration
  const mockDiscussionIds = ['1', '2', '3', '4', '5'];
  const { data: discussionStats, loading: discussionsLoading } =
    useMultipleDiscussionStatistics(mockDiscussionIds);

  const handleViewDiscussionDetails = (discussionId: string) => {
    // Navigate to detailed analytics for specific discussion
    console.log('View details for discussion:', discussionId);
  };

  if (!user) {
    return (
      <div className="analytics-page">
        <div className="auth-required">
          <h2>ログインが必要です</h2>
          <p>分析機能を利用するにはログインしてください。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-page">
      <div className="page-header">
        <h1>データ分析・レポート</h1>
        <p>プラットフォームの活動状況と議論の傾向を分析します</p>
      </div>

      <div className="analytics-tabs">
        <button
          className={selectedTab === 'platform' ? 'active' : ''}
          onClick={() => setSelectedTab('platform')}
        >
          プラットフォーム統計
        </button>
        <button
          className={selectedTab === 'discussions' ? 'active' : ''}
          onClick={() => setSelectedTab('discussions')}
        >
          議論統計
        </button>
        <button
          className={selectedTab === 'trends' ? 'active' : ''}
          onClick={() => setSelectedTab('trends')}
        >
          傾向分析
        </button>
        <button
          className={selectedTab === 'personal' ? 'active' : ''}
          onClick={() => setSelectedTab('personal')}
        >
          個人統計
        </button>
      </div>

      <div className="analytics-content">
        {selectedTab === 'platform' && (
          <div className="platform-analytics">
            <StatisticsDashboard />
          </div>
        )}

        {selectedTab === 'discussions' && (
          <div className="discussions-analytics">
            <div className="section-header">
              <h2>議論別統計</h2>
              <p>各議論の参加状況とエンゲージメントを確認できます</p>
            </div>

            {discussionsLoading ? (
              <div className="loading-grid">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="loading-card">
                    <div className="loading-spinner"></div>
                    <p>読み込み中...</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="discussions-grid">
                {discussionStats?.map(stats => (
                  <DiscussionStatisticsCard
                    key={stats.discussionId}
                    discussionId={stats.discussionId}
                    showDetailedStats={true}
                    onViewDetails={handleViewDiscussionDetails}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {selectedTab === 'trends' && (
          <div className="trends-analytics">
            <TrendAnalysisDashboard discussionIds={mockDiscussionIds} />
          </div>
        )}

        {selectedTab === 'personal' && (
          <div className="personal-analytics">
            <div className="section-header">
              <h2>個人統計</h2>
              <p>あなたの活動状況と貢献度を確認できます</p>
            </div>

            <div className="personal-stats-grid">
              <div className="personal-stat-card">
                <div className="stat-icon">👤</div>
                <div className="stat-content">
                  <div className="stat-value">12</div>
                  <div className="stat-label">作成した議論</div>
                </div>
              </div>

              <div className="personal-stat-card">
                <div className="stat-icon">💬</div>
                <div className="stat-content">
                  <div className="stat-value">89</div>
                  <div className="stat-label">投稿数</div>
                </div>
              </div>

              <div className="personal-stat-card">
                <div className="stat-icon">👍</div>
                <div className="stat-content">
                  <div className="stat-value">156</div>
                  <div className="stat-label">獲得いいね</div>
                </div>
              </div>

              <div className="personal-stat-card">
                <div className="stat-icon">📈</div>
                <div className="stat-content">
                  <div className="stat-value">68%</div>
                  <div className="stat-label">エンゲージメント率</div>
                </div>
              </div>
            </div>

            <div className="personal-activity-chart">
              <h3>活動履歴</h3>
              <div className="chart-placeholder">
                <p>活動履歴のチャートがここに表示されます</p>
                <small>（実装予定）</small>
              </div>
            </div>

            <div className="personal-categories">
              <h3>よく参加するカテゴリ</h3>
              <div className="category-list">
                <div className="category-item">
                  <span className="category-name">政治</span>
                  <div className="category-bar">
                    <div className="category-fill" style={{ width: '75%' }}></div>
                  </div>
                  <span className="category-percentage">75%</span>
                </div>
                <div className="category-item">
                  <span className="category-name">テクノロジー</span>
                  <div className="category-bar">
                    <div className="category-fill" style={{ width: '45%' }}></div>
                  </div>
                  <span className="category-percentage">45%</span>
                </div>
                <div className="category-item">
                  <span className="category-name">社会</span>
                  <div className="category-bar">
                    <div className="category-fill" style={{ width: '30%' }}></div>
                  </div>
                  <span className="category-percentage">30%</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalyticsPage;
