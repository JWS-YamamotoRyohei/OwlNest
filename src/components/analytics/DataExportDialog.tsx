import React, { useState, useEffect } from 'react';
import { ExportOptions } from '../../services/dataExportService';
import dataExportService from '../../services/dataExportService';
import './DataExportDialog.css';

interface DataExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  exportType: 'discussions' | 'platform' | 'trends' | 'posts' | 'users';
  title: string;
  dataIds?: string[]; // For discussions, posts, or users
  metric?: 'posts' | 'users' | 'discussions' | 'engagement'; // For trends
}

const DataExportDialog: React.FC<DataExportDialogProps> = ({
  isOpen,
  onClose,
  exportType,
  title,
  dataIds = [],
  metric
}) => {
  const [options, setOptions] = useState<ExportOptions>({
    format: 'csv',
    includeMetadata: true,
    maxRecords: 10000
  });
  
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      // Reset state when dialog opens
      setOptions({
        format: 'csv',
        includeMetadata: true,
        maxRecords: 10000
      });
      setErrors([]);
      setExportProgress(0);
    }
  }, [isOpen]);

  const handleDateRangeChange = (field: 'start' | 'end', value: string) => {
    setOptions(prev => ({
      ...prev,
      dateRange: {
        ...prev.dateRange,
        start: field === 'start' ? value : prev.dateRange?.start || '',
        end: field === 'end' ? value : prev.dateRange?.end || ''
      }
    }));
  };

  const handleCategoriesChange = (categories: string) => {
    setOptions(prev => ({
      ...prev,
      categories: categories.split(',').map(c => c.trim()).filter(c => c.length > 0)
    }));
  };

  const validateAndExport = async () => {
    const validationErrors = dataExportService.validateExportOptions(options);
    
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors([]);
    setIsExporting(true);
    setExportProgress(0);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setExportProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      let exportResult;

      switch (exportType) {
        case 'discussions':
          exportResult = await dataExportService.exportDiscussionStatistics(dataIds, options);
          break;
        case 'platform':
          const filter = {
            timeRange: {
              start: options.dateRange?.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
              end: options.dateRange?.end || new Date().toISOString(),
              period: 'day' as const
            },
            categories: options.categories,
            userIds: options.userIds,
            discussionIds: options.discussionIds
          };
          exportResult = await dataExportService.exportPlatformStatistics(filter, options);
          break;
        case 'trends':
          if (!metric) throw new Error('Metric is required for trend export');
          const trendFilter = {
            timeRange: {
              start: options.dateRange?.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
              end: options.dateRange?.end || new Date().toISOString(),
              period: 'day' as const
            },
            categories: options.categories
          };
          exportResult = await dataExportService.exportTrendData(metric, trendFilter, options);
          break;
        case 'posts':
          if (dataIds.length === 0) throw new Error('Discussion ID is required for posts export');
          exportResult = await dataExportService.exportDiscussionPosts(dataIds[0], options);
          break;
        case 'users':
          exportResult = await dataExportService.exportUserActivity(dataIds, options);
          break;
        default:
          throw new Error('Invalid export type');
      }

      clearInterval(progressInterval);
      setExportProgress(100);

      // Download the file
      dataExportService.downloadExport(exportResult);

      // Close dialog after successful export
      setTimeout(() => {
        onClose();
      }, 1000);

    } catch (error) {
      setErrors([error instanceof Error ? error.message : 'エクスポートに失敗しました']);
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="data-export-dialog-overlay">
      <div className="data-export-dialog">
        <div className="dialog-header">
          <h3>{title}</h3>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="dialog-content">
          {/* Format Selection */}
          <div className="form-group">
            <label>エクスポート形式</label>
            <div className="format-options">
              <label className="radio-option">
                <input
                  type="radio"
                  name="format"
                  value="csv"
                  checked={options.format === 'csv'}
                  onChange={(e) => setOptions(prev => ({ ...prev, format: e.target.value as 'csv' | 'json' }))}
                />
                <span className="radio-indicator"></span>
                CSV形式
                <small>表計算ソフトで開けます</small>
              </label>
              <label className="radio-option">
                <input
                  type="radio"
                  name="format"
                  value="json"
                  checked={options.format === 'json'}
                  onChange={(e) => setOptions(prev => ({ ...prev, format: e.target.value as 'csv' | 'json' }))}
                />
                <span className="radio-indicator"></span>
                JSON形式
                <small>プログラムで処理しやすい形式</small>
              </label>
            </div>
          </div>

          {/* Date Range */}
          <div className="form-group">
            <label>日付範囲（任意）</label>
            <div className="date-range">
              <input
                type="date"
                value={options.dateRange?.start?.split('T')[0] || ''}
                onChange={(e) => handleDateRangeChange('start', e.target.value ? new Date(e.target.value).toISOString() : '')}
                placeholder="開始日"
              />
              <span className="date-separator">〜</span>
              <input
                type="date"
                value={options.dateRange?.end?.split('T')[0] || ''}
                onChange={(e) => handleDateRangeChange('end', e.target.value ? new Date(e.target.value).toISOString() : '')}
                placeholder="終了日"
              />
            </div>
          </div>

          {/* Categories Filter */}
          {(exportType === 'platform' || exportType === 'trends') && (
            <div className="form-group">
              <label>カテゴリフィルター（任意）</label>
              <input
                type="text"
                placeholder="政治,テクノロジー,社会（カンマ区切り）"
                onChange={(e) => handleCategoriesChange(e.target.value)}
              />
              <small>特定のカテゴリのみをエクスポートする場合に指定</small>
            </div>
          )}

          {/* Max Records */}
          <div className="form-group">
            <label>最大レコード数</label>
            <input
              type="number"
              min="1"
              max="100000"
              value={options.maxRecords || ''}
              onChange={(e) => setOptions(prev => ({ ...prev, maxRecords: parseInt(e.target.value) || undefined }))}
              placeholder="10000"
            />
            <small>大量データの場合、処理時間を短縮するために制限できます</small>
          </div>

          {/* Include Metadata */}
          <div className="form-group">
            <label className="checkbox-option">
              <input
                type="checkbox"
                checked={options.includeMetadata || false}
                onChange={(e) => setOptions(prev => ({ ...prev, includeMetadata: e.target.checked }))}
              />
              <span className="checkbox-indicator"></span>
              メタデータを含める
              <small>作成日時、更新日時などの詳細情報を含めます</small>
            </label>
          </div>

          {/* Errors */}
          {errors.length > 0 && (
            <div className="error-messages">
              {errors.map((error, index) => (
                <div key={index} className="error-message">
                  {error}
                </div>
              ))}
            </div>
          )}

          {/* Export Progress */}
          {isExporting && (
            <div className="export-progress">
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{ width: `${exportProgress}%` }}
                ></div>
              </div>
              <div className="progress-text">
                エクスポート中... {exportProgress}%
              </div>
            </div>
          )}
        </div>

        <div className="dialog-footer">
          <button 
            className="cancel-button" 
            onClick={onClose}
            disabled={isExporting}
          >
            キャンセル
          </button>
          <button 
            className="export-button" 
            onClick={validateAndExport}
            disabled={isExporting}
          >
            {isExporting ? 'エクスポート中...' : 'エクスポート開始'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DataExportDialog;