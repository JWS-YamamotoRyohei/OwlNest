import React, { useState } from 'react';
import { DiscussionPoint } from '../../types/discussion';
import './DiscussionPointSelector.css';

interface DiscussionPointSelectorProps {
  points: DiscussionPoint[];
  selectedPointId: string;
  onChange: (pointId: string) => void;
  error?: string;
  disabled?: boolean;
}

export const DiscussionPointSelector: React.FC<DiscussionPointSelectorProps> = ({
  points,
  selectedPointId,
  onChange,
  error,
  disabled = false,
}) => {
  const [expandedPoints, setExpandedPoints] = useState<Set<string>>(new Set());

  // Build hierarchical structure
  const buildHierarchy = (points: DiscussionPoint[]) => {
    const pointMap = new Map<string, DiscussionPointWithChildren>();
    const rootPoints: DiscussionPointWithChildren[] = [];

    // Initialize all points with children array
    points.forEach(point => {
      pointMap.set(point.pointId, { ...point, children: [] });
    });

    // Build hierarchy
    points.forEach(point => {
      const pointWithChildren = pointMap.get(point.pointId)!;
      if (point.parentId && pointMap.has(point.parentId)) {
        pointMap.get(point.parentId)!.children.push(pointWithChildren);
      } else {
        rootPoints.push(pointWithChildren);
      }
    });

    // Sort by order
    const sortByOrder = (a: DiscussionPoint, b: DiscussionPoint) => a.order - b.order;
    rootPoints.sort(sortByOrder);
    rootPoints.forEach(point => {
      point.children.sort(sortByOrder);
    });

    return rootPoints;
  };

  const hierarchicalPoints = buildHierarchy(points);

  const toggleExpanded = (pointId: string) => {
    const newExpanded = new Set(expandedPoints);
    if (newExpanded.has(pointId)) {
      newExpanded.delete(pointId);
    } else {
      newExpanded.add(pointId);
    }
    setExpandedPoints(newExpanded);
  };

  const handlePointSelect = (pointId: string) => {
    if (!disabled) {
      onChange(pointId);
    }
  };

  type DiscussionPointWithChildren = DiscussionPoint & { children: DiscussionPointWithChildren[] };

  const renderPoint = (point: DiscussionPointWithChildren, level: number = 0) => {
    const hasChildren = point.children.length > 0;
    const isExpanded = expandedPoints.has(point.pointId);
    const isSelected = selectedPointId === point.pointId;

    return (
      <div key={point.pointId} className="discussion-point-selector__point-container">
        <div
          className={`discussion-point-selector__point ${
            isSelected ? 'discussion-point-selector__point--selected' : ''
          } ${disabled ? 'discussion-point-selector__point--disabled' : ''}`}
          style={{ paddingLeft: `${level * 20 + 12}px` }}
        >
          {hasChildren && (
            <button
              type="button"
              className={`discussion-point-selector__expand-button ${
                isExpanded ? 'discussion-point-selector__expand-button--expanded' : ''
              }`}
              onClick={() => toggleExpanded(point.pointId)}
              disabled={disabled}
            >
              ▶
            </button>
          )}

          <div
            className="discussion-point-selector__point-content"
            onClick={() => handlePointSelect(point.pointId)}
          >
            <div className="discussion-point-selector__point-header">
              <input
                type="radio"
                name="discussionPoint"
                value={point.pointId}
                checked={isSelected}
                onChange={() => handlePointSelect(point.pointId)}
                disabled={disabled}
                className="discussion-point-selector__radio"
              />
              <div className="discussion-point-selector__point-title">{point.title}</div>
              <div className="discussion-point-selector__point-stats">
                {point.postCount}件の投稿
              </div>
            </div>

            {point.description && (
              <div className="discussion-point-selector__point-description">
                {point.description}
              </div>
            )}
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="discussion-point-selector__children">
            {point.children.map(child => renderPoint(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (points.length === 0) {
    return (
      <div className="discussion-point-selector discussion-point-selector--empty">
        <div className="discussion-point-selector__empty-message">
          この議論にはまだ論点が設定されていません。
        </div>
      </div>
    );
  }

  return (
    <div className={`discussion-point-selector ${error ? 'discussion-point-selector--error' : ''}`}>
      <div className="discussion-point-selector__header">
        <div className="discussion-point-selector__title">投稿する論点を選択してください</div>
        <div className="discussion-point-selector__subtitle">
          あなたの意見がどの論点に関するものかを選択してください
        </div>
      </div>

      <div className="discussion-point-selector__points">
        {hierarchicalPoints.map(point => renderPoint(point))}
      </div>

      {selectedPointId && (
        <div className="discussion-point-selector__selected-info">
          <div className="discussion-point-selector__selected-label">選択中の論点:</div>
          <div className="discussion-point-selector__selected-title">
            {points.find(p => p.pointId === selectedPointId)?.title}
          </div>
        </div>
      )}
    </div>
  );
};
