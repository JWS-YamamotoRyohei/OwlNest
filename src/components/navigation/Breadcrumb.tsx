import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Breadcrumb.css';

interface BreadcrumbItem {
  label: string;
  path?: string;
  icon?: string;
}

interface BreadcrumbProps {
  items?: BreadcrumbItem[];
  separator?: string;
  showHome?: boolean;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({
  items,
  separator = '/',
  showHome = true
}) => {
  const location = useLocation();

  // Generate breadcrumb items from current path if not provided
  const generateBreadcrumbItems = (): BreadcrumbItem[] => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const breadcrumbItems: BreadcrumbItem[] = [];

    if (showHome) {
      breadcrumbItems.push({
        label: 'ホーム',
        path: '/discussions',
        icon: '🏠'
      });
    }

    let currentPath = '';
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      
      // Skip the last segment (current page)
      if (index === pathSegments.length - 1) {
        breadcrumbItems.push({
          label: getSegmentLabel(segment),
          icon: getSegmentIcon(segment)
        });
      } else {
        breadcrumbItems.push({
          label: getSegmentLabel(segment),
          path: currentPath,
          icon: getSegmentIcon(segment)
        });
      }
    });

    return breadcrumbItems;
  };

  const getSegmentLabel = (segment: string): string => {
    const labelMap: Record<string, string> = {
      'discussions': '議論一覧',
      'discussion': '議論詳細',
      'create-discussion': '議論作成',
      'my-discussions': '自分の議論',
      'timeline': 'タイムライン',
      'following': 'フォロー中',
      'settings': '設定',
      'home': 'ダッシュボード'
    };

    return labelMap[segment] || segment;
  };

  const getSegmentIcon = (segment: string): string => {
    const iconMap: Record<string, string> = {
      'discussions': '💬',
      'discussion': '📝',
      'create-discussion': '✏️',
      'my-discussions': '👤',
      'timeline': '📰',
      'following': '❤️',
      'settings': '⚙️',
      'home': '📊'
    };

    return iconMap[segment] || '';
  };

  const breadcrumbItems = items || generateBreadcrumbItems();

  if (breadcrumbItems.length <= 1) {
    return null;
  }

  return (
    <nav className="breadcrumb" aria-label="パンくずナビゲーション">
      <ol className="breadcrumb__list">
        {breadcrumbItems.map((item, index) => (
          <li key={index} className="breadcrumb__item">
            {item.path ? (
              <Link 
                to={item.path} 
                className="breadcrumb__link"
                aria-label={`${item.label}に移動`}
              >
                {item.icon && (
                  <span className="breadcrumb__icon" aria-hidden="true">
                    {item.icon}
                  </span>
                )}
                <span className="breadcrumb__label">{item.label}</span>
              </Link>
            ) : (
              <span className="breadcrumb__current" aria-current="page">
                {item.icon && (
                  <span className="breadcrumb__icon" aria-hidden="true">
                    {item.icon}
                  </span>
                )}
                <span className="breadcrumb__label">{item.label}</span>
              </span>
            )}
            
            {index < breadcrumbItems.length - 1 && (
              <span className="breadcrumb__separator" aria-hidden="true">
                {separator}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};