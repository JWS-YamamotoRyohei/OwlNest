import React, { useState, useEffect } from 'react';
import { 
  ModerationQueueItem, 
  ModerationQueueFilters, 
  ReportPriority, 
  ReportStatus, 
  ReportCategory 
} from '../../types/moderation';
import { reportService } from '../../services/reportService';
import { useAuth } from '../../contexts/AuthContext';
import { ModerationQueueItemCard } from './ModerationQueueItemCard';
import { ModerationQueueFilters as FiltersComponent } from './ModerationQueueFilters';
import './ModerationQueue.css';

interface ModerationQueueProps {
  className?: string;
}

export const ModerationQueue: React.FC<ModerationQueueProps> = ({
  className = '',
}) => {
  const { user, hasPermission } = useAuth();
  const [queueItems, setQueueItems] = useState<ModerationQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ModerationQueueFilters>({});
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [nextToken, setNextToken] = useState<string | undefined>();
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);

  const canModerate = hasPermission('canModerate');

  useEffect(() => {
    if (canModerate) {
      loadQueueItems();
    }
  }, [canModerate, filters]);

  const loadQueueItems = async (loadMore = false) => {
    try {
      setLoading(true);
      setError(null);

      const currentFilters = loadMore && nextToken 
        ? { ...filters, nextToken } 
        : filters;

      const response = await reportService.getModerationQueue(currentFilters);

      if (loadMore) {
        setQueueItems(prev => [...prev, ...response.items]);
      } else {
        setQueueItems(response.items);
      }

      setTotalCount(response.totalCount);
      setHasMore(response.hasMore);
      setNextToken(response.nextToken);
    } catch (error) {
      console.error('Failed to load moderation queue:', error);
      setError(error instanceof Error ? error.message : 'キューの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignToSelf = async (queueItemId: string) => {
    try {
      await reportService.assignQueueItem(queueItemId, user?.userId);
      await loadQueueItems(); // Reload to reflect changes
    } catch (error) {
      console.error('Failed to assign queue item:', error);
      alert('アサインに失敗しました');
    }
  };

  const handleUnassign = async (queueItemId: string) => {
    try {
      await reportService.assignQueueItem(queueItemId); // No moderatorId = unassign
      await loadQueueItems(); // Reload to reflect changes
    } catch (error) {
      console.error('Failed to unassign queue item:', error);
      alert('アサイン解除に失敗しました');
    }
  };

  const handleItemProcessed = () => {
    loadQueueItems(); // Reload queue after item is processed
  };

  const handleSelectItem = (queueItemId: string, selected: boolean) => {
    const newSelected = new Set(selectedItems);
    if (selected) {
      newSelected.add(queueItemId);
    } else {
      newSelected.delete(queueItemId);
    }
    setSelectedItems(newSelected);
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedItems(new Set(queueItems.map(item => item.queueItemId)));
    } else {
      setSelectedItems(new Set());
    }
  };

  const handleBulkAssign = async () => {
    if (selectedItems.size === 0) return;

    try {
      const promises = Array.from(selectedItems).map(queueItemId =>
        reportService.assignQueueItem(queueItemId, user?.userId)
      );
      await Promise.all(promises);
      setSelectedItems(new Set());
      await loadQueueItems();
    } catch (error) {
      console.error('Failed to bulk assign:', error);
      alert('一括アサインに失敗しました');
    }
  };

  const getPriorityColor = (priority: ReportPriority): string => {
    const priorities = reportService.getPriorityLevels();
    return priorities.find(p => p.value === priority)?.color || '#6b7280';
  };

  const getPriorityLabel = (priority: ReportPriority): string => {
    const priorities = reportService.getPriorityLevels();
    return priorities.find(p => p.value === priority)?.label || priority;
  };

  if (!canModerate) {
    return (
      <div className="moderation-queue__no-permission">
        <h2>アクセス権限がありません</h2>
        <p>モデレーション機能を使用するには適切な権限が必要です。</p>
      </div>
    );
  }

  return (
    <div className={`moderation-queue ${className}`}>
      {/* Header */}
      <div className="moderation-queue__header">
        <div className="moderation-queue__title-section">
          <h1 className="moderation-queue__title">モデレーションキュー</h1>
          <div className="moderation-queue__stats">
            <span className="moderation-queue__stat">
              総件数: {totalCount}
            </span>
            {selectedItems.size > 0 && (
              <span className="moderation-queue__stat">
                選択中: {selectedItems.size}
              </span>
            )}
          </div>
        </div>

        <div className="moderation-queue__actions">
          <button
            type="button"
            className="moderation-queue__filter-toggle"
            onClick={() => setShowFilters(!showFilters)}
          >
            🔍 フィルター
          </button>
          
          {selectedItems.size > 0 && (
            <button
              type="button"
              className="moderation-queue__bulk-assign"
              onClick={handleBulkAssign}
            >
              選択項目を自分にアサイン
            </button>
          )}
          
          <button
            type="button"
            className="moderation-queue__refresh"
            onClick={() => loadQueueItems()}
            disabled={loading}
          >
            🔄 更新
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <FiltersComponent
          filters={filters}
          onFiltersChange={setFilters}
          onClose={() => setShowFilters(false)}
        />
      )}

      {/* Error */}
      {error && (
        <div className="moderation-queue__error">
          <p>{error}</p>
          <button onClick={() => loadQueueItems()}>再試行</button>
        </div>
      )}

      {/* Loading */}
      {loading && queueItems.length === 0 && (
        <div className="moderation-queue__loading">
          <p>読み込み中...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && queueItems.length === 0 && !error && (
        <div className="moderation-queue__empty">
          <h3>キューは空です</h3>
          <p>現在処理待ちの報告はありません。</p>
        </div>
      )}

      {/* Queue Items */}
      {queueItems.length > 0 && (
        <>
          {/* Bulk Actions */}
          <div className="moderation-queue__bulk-actions">
            <label className="moderation-queue__select-all">
              <input
                type="checkbox"
                checked={selectedItems.size === queueItems.length && queueItems.length > 0}
                onChange={(e) => handleSelectAll(e.target.checked)}
              />
              すべて選択
            </label>
          </div>

          {/* Items List */}
          <div className="moderation-queue__items">
            {queueItems.map((item) => (
              <ModerationQueueItemCard
                key={item.queueItemId}
                item={item}
                isSelected={selectedItems.has(item.queueItemId)}
                onSelect={(selected) => handleSelectItem(item.queueItemId, selected)}
                onAssignToSelf={() => handleAssignToSelf(item.queueItemId)}
                onUnassign={() => handleUnassign(item.queueItemId)}
                onProcessed={handleItemProcessed}
                currentUserId={user?.userId}
              />
            ))}
          </div>

          {/* Load More */}
          {hasMore && (
            <div className="moderation-queue__load-more">
              <button
                type="button"
                className="moderation-queue__load-more-button"
                onClick={() => loadQueueItems(true)}
                disabled={loading}
              >
                {loading ? '読み込み中...' : 'さらに読み込む'}
              </button>
            </div>
          )}
        </>
      )}

      {/* Priority Legend */}
      <div className="moderation-queue__legend">
        <h4 className="moderation-queue__legend-title">優先度の説明</h4>
        <div className="moderation-queue__legend-items">
          {reportService.getPriorityLevels().map((priority) => (
            <div key={priority.value} className="moderation-queue__legend-item">
              <div 
                className="moderation-queue__legend-color"
                style={{ backgroundColor: priority.color }}
              />
              <span className="moderation-queue__legend-label">
                {priority.label}: {priority.description}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};