import React, { useMemo } from 'react';
import { DiscussionStatistics } from '../../types/analytics';
import './StanceDistributionChart.css';

interface StanceDistributionChartProps {
  data: DiscussionStatistics[];
  title?: string;
  showLegend?: boolean;
  showPercentages?: boolean;
  className?: string;
}

interface StanceData {
  stance: 'pros' | 'cons' | 'neutral' | 'unknown';
  label: string;
  count: number;
  percentage: number;
  color: string;
}

const StanceDistributionChart: React.FC<StanceDistributionChartProps> = ({
  data,
  title = 'スタンス分布分析',
  showLegend = true,
  showPercentages = true,
  className
}) => {
  const stanceData = useMemo(() => {
    if (!data || data.length === 0) return [];

    const totalCounts = data.reduce(
      (acc, discussion) => ({
        pros: acc.pros + discussion.prosCount,
        cons: acc.cons + discussion.consCount,
        neutral: acc.neutral + discussion.neutralCount,
        unknown: acc.unknown + discussion.unknownCount
      }),
      { pros: 0, cons: 0, neutral: 0, unknown: 0 }
    );

    const total = Object.values(totalCounts).reduce((sum, count) => sum + count, 0);

    if (total === 0) return [];

    const stances: StanceData[] = [
      {
        stance: 'pros',
        label: '賛成',
        count: totalCounts.pros,
        percentage: (totalCounts.pros / total) * 100,
        color: '#22c55e'
      },
      {
        stance: 'cons',
        label: '反対',
        count: totalCounts.cons,
        percentage: (totalCounts.cons / total) * 100,
        color: '#ef4444'
      },
      {
        stance: 'neutral',
        label: '中立',
        count: totalCounts.neutral,
        percentage: (totalCounts.neutral / total) * 100,
        color: '#64748b'
      },
      {
        stance: 'unknown',
        label: 'わからない',
        count: totalCounts.unknown,
        percentage: (totalCounts.unknown / total) * 100,
        color: '#a855f7'
      }
    ];

    return stances.filter(stance => stance.count > 0);
  }, [data]);

  const formatNumber = (num: number): string => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const generatePieChart = () => {
    if (stanceData.length === 0) return null;

    let cumulativePercentage = 0;
    const radius = 45;
    const centerX = 50;
    const centerY = 50;

    return stanceData.map((stance, index) => {
      const startAngle = (cumulativePercentage / 100) * 360;
      const endAngle = ((cumulativePercentage + stance.percentage) / 100) * 360;
      
      const startAngleRad = (startAngle - 90) * (Math.PI / 180);
      const endAngleRad = (endAngle - 90) * (Math.PI / 180);
      
      const x1 = centerX + radius * Math.cos(startAngleRad);
      const y1 = centerY + radius * Math.sin(startAngleRad);
      const x2 = centerX + radius * Math.cos(endAngleRad);
      const y2 = centerY + radius * Math.sin(endAngleRad);
      
      const largeArcFlag = stance.percentage > 50 ? 1 : 0;
      
      const pathData = [
        `M ${centerX} ${centerY}`,
        `L ${x1} ${y1}`,
        `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
        'Z'
      ].join(' ');

      cumulativePercentage += stance.percentage;

      return (
        <path
          key={stance.stance}
          d={pathData}
          fill={stance.color}
          className="pie-slice"
          data-stance={stance.stance}
        />
      );
    });
  };

  if (!data || data.length === 0) {
    return (
      <div className={`stance-distribution-chart empty ${className || ''}`}>
        <div className="chart-header">
          <h3>{title}</h3>
        </div>
        <div className="empty-state">
          <p>分析するデータがありません</p>
        </div>
      </div>
    );
  }

  if (stanceData.length === 0) {
    return (
      <div className={`stance-distribution-chart empty ${className || ''}`}>
        <div className="chart-header">
          <h3>{title}</h3>
        </div>
        <div className="empty-state">
          <p>スタンスデータがありません</p>
        </div>
      </div>
    );
  }

  const totalPosts = stanceData.reduce((sum, stance) => sum + stance.count, 0);
  const dominantStance = stanceData.reduce((max, stance) => 
    stance.percentage > max.percentage ? stance : max
  );

  return (
    <div className={`stance-distribution-chart ${className || ''}`}>
      <div className="chart-header">
        <h3>{title}</h3>
        <div className="chart-summary">
          <div className="total-posts">
            総投稿数: {formatNumber(totalPosts)}
          </div>
          <div className="dominant-stance">
            最多: <span style={{ color: dominantStance.color }}>{dominantStance.label}</span>
            ({dominantStance.percentage.toFixed(1)}%)
          </div>
        </div>
      </div>

      <div className="chart-content">
        <div className="pie-chart-container">
          <svg
            width="200"
            height="200"
            viewBox="0 0 100 100"
            className="pie-chart"
          >
            {generatePieChart()}
          </svg>
          <div className="chart-center">
            <div className="center-value">{formatNumber(totalPosts)}</div>
            <div className="center-label">投稿</div>
          </div>
        </div>

        {showLegend && (
          <div className="chart-legend">
            {stanceData.map((stance) => (
              <div key={stance.stance} className="legend-item">
                <div 
                  className="legend-color"
                  style={{ backgroundColor: stance.color }}
                />
                <div className="legend-content">
                  <div className="legend-label">{stance.label}</div>
                  <div className="legend-stats">
                    <span className="legend-count">{formatNumber(stance.count)}</span>
                    {showPercentages && (
                      <span className="legend-percentage">
                        ({stance.percentage.toFixed(1)}%)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="chart-insights">
        <h4>分析結果</h4>
        <div className="insights-list">
          <div className="insight-item">
            <span className="insight-label">議論の傾向:</span>
            <span className="insight-value">
              {dominantStance.percentage > 60 
                ? `${dominantStance.label}寄り` 
                : dominantStance.percentage > 40 
                ? '意見が分かれている' 
                : 'バランスが取れている'
              }
            </span>
          </div>
          <div className="insight-item">
            <span className="insight-label">参加度:</span>
            <span className="insight-value">
              {stanceData.find(s => s.stance === 'unknown')?.percentage || 0 < 20 
                ? '高い' 
                : '中程度'
              }
            </span>
          </div>
          <div className="insight-item">
            <span className="insight-label">議論の活発さ:</span>
            <span className="insight-value">
              {(stanceData.find(s => s.stance === 'pros')?.percentage || 0) + 
               (stanceData.find(s => s.stance === 'cons')?.percentage || 0) > 70 
                ? '活発' 
                : '穏やか'
              }
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StanceDistributionChart;