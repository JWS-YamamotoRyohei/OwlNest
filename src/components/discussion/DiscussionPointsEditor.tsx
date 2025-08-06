import React, { useState, useCallback } from 'react';
import { CreateDiscussionPointData } from '../../types/discussion';
import './DiscussionPointsEditor.css';

interface DiscussionPointsEditorProps {
  points: CreateDiscussionPointData[];
  onChange: (points: CreateDiscussionPointData[]) => void;
  error?: string;
  disabled?: boolean;
  maxPoints?: number;
  maxDepth?: number;
}

interface HierarchicalPoint extends CreateDiscussionPointData {
  id: string;
  level: number;
  children: HierarchicalPoint[];
  isExpanded?: boolean;
}

export const DiscussionPointsEditor: React.FC<DiscussionPointsEditorProps> = ({
  points,
  onChange,
  error,
  disabled = false,
  maxPoints = 20,
  maxDepth = 3,
}) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [expandedPoints, setExpandedPoints] = useState<Set<string>>(new Set());

  // Convert flat points to hierarchical structure
  const buildHierarchy = useCallback((flatPoints: CreateDiscussionPointData[]): HierarchicalPoint[] => {
    const pointMap = new Map<string, HierarchicalPoint>();
    const rootPoints: HierarchicalPoint[] = [];

    // Create hierarchical points with IDs
    flatPoints.forEach((point, index) => {
      const id = point.parentId ? `${point.parentId}-${index}` : `root-${index}`;
      const hierarchicalPoint: HierarchicalPoint = {
        ...point,
        id,
        level: point.parentId ? 1 : 0, // Calculate level based on parent
        children: [],
        isExpanded: expandedPoints.has(id),
      };
      pointMap.set(id, hierarchicalPoint);
    });

    // Build parent-child relationships
    pointMap.forEach((point) => {
      if (point.parentId) {
        const parent = Array.from(pointMap.values()).find(p => p.id.startsWith(point.parentId!));
        if (parent) {
          parent.children.push(point);
          point.level = parent.level + 1;
        } else {
          rootPoints.push(point);
        }
      } else {
        rootPoints.push(point);
      }
    });

    return rootPoints;
  }, [expandedPoints]);

  const flattenHierarchy = useCallback((hierarchicalPoints: HierarchicalPoint[]): CreateDiscussionPointData[] => {
    const result: CreateDiscussionPointData[] = [];
    
    const traverse = (points: HierarchicalPoint[]) => {
      points.forEach((point) => {
        result.push({
          title: point.title,
          description: point.description,
          parentId: point.parentId,
          order: point.order,
        });
        if (point.children.length > 0) {
          traverse(point.children);
        }
      });
    };
    
    traverse(hierarchicalPoints);
    return result;
  }, []);

  const addPoint = useCallback((parentId?: string) => {
    if (points.length >= maxPoints) return;
    
    const newPoint: CreateDiscussionPointData = {
      title: '',
      description: '',
      parentId,
      order: points.length,
    };
    
    onChange([...points, newPoint]);
  }, [points, onChange, maxPoints]);

  const removePoint = useCallback((index: number) => {
    const newPoints = points.filter((_, i) => i !== index);
    // Reorder remaining points
    const reorderedPoints = newPoints.map((point, i) => ({
      ...point,
      order: i,
    }));
    onChange(reorderedPoints);
  }, [points, onChange]);

  const updatePoint = useCallback((index: number, field: keyof CreateDiscussionPointData, value: string | number) => {
    const newPoints = points.map((point, i) => 
      i === index ? { ...point, [field]: value } : point
    );
    onChange(newPoints);
  }, [points, onChange]);

  const movePoint = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    
    const newPoints = [...points];
    const [movedPoint] = newPoints.splice(fromIndex, 1);
    newPoints.splice(toIndex, 0, movedPoint);
    
    // Reorder all points
    const reorderedPoints = newPoints.map((point, i) => ({
      ...point,
      order: i,
    }));
    
    onChange(reorderedPoints);
  }, [points, onChange]);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
      movePoint(draggedIndex, dropIndex);
    }
    setDraggedIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const toggleExpanded = useCallback((pointId: string) => {
    setExpandedPoints(prev => {
      const newSet = new Set(prev);
      if (newSet.has(pointId)) {
        newSet.delete(pointId);
      } else {
        newSet.add(pointId);
      }
      return newSet;
    });
  }, []);

  const canAddChild = useCallback((point: HierarchicalPoint) => {
    return point.level < maxDepth - 1 && points.length < maxPoints;
  }, [maxDepth, points.length, maxPoints]);

  const renderHierarchicalPoint = useCallback((point: HierarchicalPoint, index: number, parentIndex?: number) => {
    const hasChildren = point.children.length > 0;
    const canHaveChildren = canAddChild(point);
    const indentLevel = point.level;

    return (
      <div key={point.id} className="hierarchical-point-container">
        <div
          className={`point-item hierarchical-point level-${indentLevel} ${draggedIndex === index ? 'dragging' : ''}`}
          draggable={!disabled}
          onDragStart={(e) => handleDragStart(e, index)}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, index)}
          onDragEnd={handleDragEnd}
          style={{ marginLeft: `${indentLevel * 20}px` }}
        >
          <div className="point-header">
            <div className="point-controls">
              <div className="point-drag-handle" title="ドラッグして並び替え">
                ⋮⋮
              </div>
              {hasChildren && (
                <button
                  type="button"
                  onClick={() => toggleExpanded(point.id)}
                  className="expand-toggle-btn"
                  disabled={disabled}
                  title={point.isExpanded ? '折りたたむ' : '展開する'}
                >
                  {point.isExpanded ? '▼' : '▶'}
                </button>
              )}
              {!hasChildren && <div className="expand-placeholder" />}
            </div>
            <div className="point-number">
              論点 {index + 1}
              {indentLevel > 0 && <span className="point-level">レベル {indentLevel + 1}</span>}
            </div>
            <div className="point-actions">
              {canHaveChildren && (
                <button
                  type="button"
                  onClick={() => addPoint(point.id)}
                  className="add-child-btn"
                  disabled={disabled}
                  title="子論点を追加"
                >
                  + 子論点
                </button>
              )}
              <button
                type="button"
                onClick={() => removePoint(index)}
                className="remove-point-btn"
                disabled={disabled}
                title="この論点を削除"
              >
                ×
              </button>
            </div>
          </div>

          <div className="point-content">
            <div className="form-group">
              <label className="form-label">
                論点タイトル <span className="required">*</span>
              </label>
              <input
                type="text"
                value={point.title}
                onChange={(e) => updatePoint(index, 'title', e.target.value)}
                className="form-input"
                placeholder="論点のタイトルを入力してください"
                disabled={disabled}
                maxLength={100}
              />
              <div className="form-help">
                {point.title.length}/100 文字
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                論点の説明（任意）
              </label>
              <textarea
                value={point.description || ''}
                onChange={(e) => updatePoint(index, 'description', e.target.value)}
                className="form-textarea"
                placeholder="論点の詳細な説明を入力してください"
                disabled={disabled}
                rows={3}
                maxLength={500}
              />
              <div className="form-help">
                {(point.description || '').length}/500 文字
              </div>
            </div>
          </div>
        </div>

        {/* Render children if expanded */}
        {hasChildren && point.isExpanded && (
          <div className="point-children">
            {point.children.map((child, childIndex) => 
              renderHierarchicalPoint(child, childIndex, index)
            )}
          </div>
        )}
      </div>
    );
  }, [
    draggedIndex, disabled, canAddChild, addPoint, removePoint, updatePoint, 
    handleDragStart, handleDragOver, handleDrop, handleDragEnd, toggleExpanded
  ]);

  const hierarchicalPoints = buildHierarchy(points);

  return (
    <div className={`discussion-points-editor ${disabled ? 'disabled' : ''}`}>
      <div className="points-editor-header">
        <div className="points-editor-info">
          <p className="points-editor-description">
            議論の論点を設定してください。参加者はこれらの論点に対して意見を投稿できます。
          </p>
          <div className="points-count">
            {points.length}/{maxPoints} 論点
          </div>
        </div>
        
        <button
          type="button"
          onClick={() => addPoint()}
          className="add-point-btn"
          disabled={disabled || points.length >= maxPoints}
        >
          + 論点を追加
        </button>
      </div>

      {points.length === 0 ? (
        <div className="empty-points">
          <div className="empty-points-icon">💭</div>
          <div className="empty-points-text">
            <h4>論点を追加してください</h4>
            <p>議論を構造化するために、少なくとも1つの論点を追加してください。</p>
          </div>
        </div>
      ) : (
        <div className="points-list hierarchical-points-list">
          {hierarchicalPoints.map((point, index) => 
            renderHierarchicalPoint(point, index)
          )}
        </div>
      )}

      {error && (
        <div className="points-editor-error">
          {error}
        </div>
      )}

      <div className="points-editor-help">
        <h4>💡 論点設定のコツ</h4>
        <ul>
          <li>具体的で明確な論点を設定しましょう</li>
          <li>論点は議論の焦点を絞るために重要です</li>
          <li>ドラッグ&ドロップで論点の順序を変更できます</li>
          <li>「+ 子論点」ボタンで階層構造の論点を作成できます（最大{maxDepth}レベル）</li>
          <li>▶/▼ボタンで子論点の表示/非表示を切り替えられます</li>
          <li>参加者は各論点に対して賛成・反対・中立の立場で投稿できます</li>
        </ul>
      </div>
    </div>
  );
};

export default DiscussionPointsEditor;