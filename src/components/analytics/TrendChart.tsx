import React, { useMemo } from 'react';
import { TrendData } from '../../types/analytics';
import './TrendChart.css';

interface TrendChartProps {
  data: TrendData[];
  title: string;
  metric: string;
  color?: string;
  height?: number;
  showChange?: boolean;
  className?: string;
}

const TrendChart: React.FC<TrendChartProps> = ({
  data,
  title,
  metric,
  color = '#3b82f6',
  height = 200,
  showChange = true,
  className,
}) => {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return null;

    const maxValue = Math.max(...data.map(d => d.value));
    const minValue = Math.min(...data.map(d => d.value));
    const range = maxValue - minValue;
    const padding = range * 0.1; // 10% padding

    return {
      maxValue: maxValue + padding,
      minValue: Math.max(0, minValue - padding),
      range: range + 2 * padding,
      points: data.map((item, index) => ({
        ...item,
        x: (index / (data.length - 1)) * 100,
        y: ((maxValue + padding - item.value) / (range + 2 * padding)) * 100,
      })),
    };
  }, [data]);

  const formatValue = (value: number): string => {
    if (value >= 1000000) {
      return (value / 1000000).toFixed(1) + 'M';
    }
    if (value >= 1000) {
      return (value / 1000).toFixed(1) + 'K';
    }
    return value.toString();
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      month: 'short',
      day: 'numeric',
    });
  };

  const formatChange = (change: number, changePercentage: number): string => {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change} (${sign}${changePercentage.toFixed(1)}%)`;
  };

  const getChangeColor = (change: number): string => {
    if (change > 0) return '#22c55e';
    if (change < 0) return '#ef4444';
    return '#64748b';
  };

  if (!chartData || chartData.points.length === 0) {
    return (
      <div className={`trend-chart empty ${className || ''}`}>
        <div className="chart-header">
          <h3>{title}</h3>
        </div>
        <div className="empty-state">
          <p>データがありません</p>
        </div>
      </div>
    );
  }

  const pathData = chartData.points
    .map((point, index) => {
      const command = index === 0 ? 'M' : 'L';
      return `${command} ${point.x} ${point.y}`;
    })
    .join(' ');

  const latestData = data[data.length - 1];
  const previousData = data[data.length - 2];

  return (
    <div className={`trend-chart ${className || ''}`}>
      <div className="chart-header">
        <div className="chart-title">
          <h3>{title}</h3>
          <div className="chart-value">
            <span className="current-value">{formatValue(latestData.value)}</span>
            <span className="metric-label">{metric}</span>
          </div>
        </div>
        {showChange && previousData && (
          <div className="chart-change">
            <span className="change-value" style={{ color: getChangeColor(latestData.change) }}>
              {formatChange(latestData.change, latestData.changePercentage)}
            </span>
            <span className="change-period">前期比</span>
          </div>
        )}
      </div>

      <div className="chart-container" style={{ height: `${height}px` }}>
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="chart-svg"
        >
          {/* Grid lines */}
          <defs>
            <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#f1f5f9" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100" height="100" fill="url(#grid)" />

          {/* Area under curve */}
          <path
            d={`${pathData} L ${chartData.points[chartData.points.length - 1].x} 100 L ${chartData.points[0].x} 100 Z`}
            fill={`${color}20`}
            className="chart-area"
          />

          {/* Trend line */}
          <path d={pathData} fill="none" stroke={color} strokeWidth="2" className="chart-line" />

          {/* Data points */}
          {chartData.points.map((point, index) => (
            <circle
              key={index}
              cx={point.x}
              cy={point.y}
              r="1.5"
              fill={color}
              className="chart-point"
            />
          ))}
        </svg>

        {/* Tooltip overlay */}
        <div className="chart-overlay">
          {chartData.points.map((point, index) => (
            <div
              key={index}
              className="chart-tooltip-trigger"
              style={{
                left: `${point.x}%`,
                top: `${point.y}%`,
              }}
              title={`${formatDate(point.date)}: ${formatValue(point.value)} ${metric}`}
            />
          ))}
        </div>
      </div>

      <div className="chart-footer">
        <div className="chart-range">
          <span className="range-start">{formatDate(data[0].date)}</span>
          <span className="range-end">{formatDate(data[data.length - 1].date)}</span>
        </div>
        <div className="chart-stats">
          <span className="stat-item">最高: {formatValue(chartData.maxValue)}</span>
          <span className="stat-item">最低: {formatValue(chartData.minValue)}</span>
        </div>
      </div>
    </div>
  );
};

export default TrendChart;
