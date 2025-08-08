import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNavigationPreloader } from '../hooks/useNavigationPreloader';
import './Sidebar.css';

interface SidebarProps {
  onClose: () => void;
}

export const sidebarWidth = '280px';

interface SidebarItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  badge?: number;
  requiredPermission?:
    | 'canView'
    | 'canPost'
    | 'canCreateDiscussion'
    | 'canModerate'
    | 'canManageUsers';
}

const sidebarItems: SidebarItem[] = [
  { id: 'discussions', label: '議論一覧', icon: '💬', path: '/discussions' },
  { id: 'timeline', label: 'タイムライン', icon: '📰', path: '/timeline' },
  { id: 'following', label: 'フォロー中', icon: '❤️', path: '/following' },
  {
    id: 'create',
    label: '議論を作成',
    icon: '✏️',
    path: '/create-discussion',
    requiredPermission: 'canCreateDiscussion',
  },
  {
    id: 'my-discussions',
    label: '自分の議論',
    icon: '👤',
    path: '/my-discussions',
    requiredPermission: 'canCreateDiscussion',
  },
  {
    id: 'moderation',
    label: 'モデレーション',
    icon: '🛡️',
    path: '/moderation',
    requiredPermission: 'canModerate',
  },
  { id: 'settings', label: '設定', icon: '⚙️', path: '/settings' },
];

export const Sidebar: React.FC<SidebarProps> = ({ onClose }) => {
  const { hasPermission, user } = useAuth();
  // const location = useLocation();
  const { handleLinkHover } = useNavigationPreloader();

  const filteredItems = sidebarItems.filter(
    item => !item.requiredPermission || hasPermission(item.requiredPermission)
  );

  const getRouteNameFromPath = (path: string): string => {
    return path.replace('/', '').replace('-', '') || 'discussions';
  };

  return (
    <div className="sidebar">
      <div className="sidebar__header">
        <button className="sidebar__close-button" onClick={onClose} aria-label="サイドバーを閉じる">
          ✕
        </button>
        <div className="sidebar__user-info">
          <div className="sidebar__user-avatar">{user?.displayName?.charAt(0) || '?'}</div>
          <div className="sidebar__user-details">
            <div className="sidebar__user-name">{user?.displayName || 'ユーザー'}</div>
            <div className="sidebar__user-role">{user?.role || 'viewer'}</div>
          </div>
        </div>
      </div>

      <nav className="sidebar__nav">
        <ul className="sidebar__nav-list">
          {filteredItems.map(item => (
            <li key={item.id} className="sidebar__nav-item">
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `sidebar__nav-link ${isActive ? 'sidebar__nav-link--active' : ''}`
                }
                onClick={onClose}
                onMouseEnter={() => handleLinkHover(getRouteNameFromPath(item.path))}
              >
                <span className="sidebar__nav-icon">{item.icon}</span>
                <span className="sidebar__nav-label">{item.label}</span>
                {item.badge && <span className="sidebar__nav-badge">{item.badge}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
};
