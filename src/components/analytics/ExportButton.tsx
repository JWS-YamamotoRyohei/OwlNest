import React, { useState } from 'react';
import DataExportDialog from './DataExportDialog';
import './ExportButton.css';

interface ExportButtonProps {
  exportType: 'discussions' | 'platform' | 'trends' | 'posts' | 'users';
  title: string;
  dataIds?: string[];
  metric?: 'posts' | 'users' | 'discussions' | 'engagement';
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
  icon?: boolean;
  className?: string;
  disabled?: boolean;
}

const ExportButton: React.FC<ExportButtonProps> = ({
  exportType,
  title,
  dataIds = [],
  metric,
  variant = 'outline',
  size = 'medium',
  icon = true,
  className,
  disabled = false
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleExportClick = () => {
    if (!disabled) {
      setIsDialogOpen(true);
    }
  };

  const getButtonText = () => {
    switch (exportType) {
      case 'discussions':
        return '議論データをエクスポート';
      case 'platform':
        return 'プラットフォーム統計をエクスポート';
      case 'trends':
        return 'トレンドデータをエクスポート';
      case 'posts':
        return '投稿データをエクスポート';
      case 'users':
        return 'ユーザーデータをエクスポート';
      default:
        return 'データをエクスポート';
    }
  };

  const getDialogTitle = () => {
    switch (exportType) {
      case 'discussions':
        return '議論統計データのエクスポート';
      case 'platform':
        return 'プラットフォーム統計データのエクスポート';
      case 'trends':
        return `${metric ? getMetricName(metric) : 'トレンド'}データのエクスポート`;
      case 'posts':
        return '投稿データのエクスポート';
      case 'users':
        return 'ユーザー活動データのエクスポート';
      default:
        return 'データのエクスポート';
    }
  };

  const getMetricName = (metric: string) => {
    switch (metric) {
      case 'posts':
        return '投稿数';
      case 'users':
        return 'ユーザー数';
      case 'discussions':
        return '議論数';
      case 'engagement':
        return 'エンゲージメント';
      default:
        return metric;
    }
  };

  return (
    <>
      <button
        className={`export-button ${variant} ${size} ${className || ''}`}
        onClick={handleExportClick}
        disabled={disabled}
        title={getButtonText()}
      >
        {icon && (
          <svg
            className="export-icon"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7,10 12,15 17,10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        )}
        <span className="button-text">エクスポート</span>
      </button>

      <DataExportDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        exportType={exportType}
        title={getDialogTitle()}
        dataIds={dataIds}
        metric={metric}
      />
    </>
  );
};

export default ExportButton;