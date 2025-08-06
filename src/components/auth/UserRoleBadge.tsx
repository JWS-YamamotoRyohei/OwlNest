// User role badge component
import React from 'react';
import { UserRole } from '../../types/auth';
import './UserRoleBadge.css';

interface UserRoleBadgeProps {
  role: UserRole;
  size?: 'small' | 'medium' | 'large';
  showIcon?: boolean;
  showText?: boolean;
  className?: string;
}

const ROLE_CONFIG = {
  [UserRole.VIEWER]: {
    label: '閲覧者',
    icon: '👁️',
    color: 'gray',
    description: '議論を閲覧できます',
  },
  [UserRole.CONTRIBUTOR]: {
    label: '投稿者',
    icon: '✍️',
    color: 'blue',
    description: '議論を閲覧し、投稿できます',
  },
  [UserRole.CREATOR]: {
    label: '作成者',
    icon: '🎯',
    color: 'green',
    description: '議論を作成・管理できます',
  },
  [UserRole.ADMIN]: {
    label: '管理者',
    icon: '👑',
    color: 'purple',
    description: 'すべての機能を利用できます',
  },
};

const UserRoleBadge: React.FC<UserRoleBadgeProps> = ({
  role,
  size = 'medium',
  showIcon = true,
  showText = true,
  className = '',
}) => {
  const config = ROLE_CONFIG[role];

  if (!config) {
    return null;
  }

  const badgeClasses = [
    'user-role-badge',
    `user-role-badge--${size}`,
    `user-role-badge--${config.color}`,
    className,
  ].filter(Boolean).join(' ');

  return (
    <span
      className={badgeClasses}
      title={config.description}
      aria-label={`ユーザー権限: ${config.label}`}
    >
      {showIcon && (
        <span className="user-role-badge__icon" aria-hidden="true">
          {config.icon}
        </span>
      )}
      {showText && (
        <span className="user-role-badge__text">
          {config.label}
        </span>
      )}
    </span>
  );
};

// Component for displaying role with description
interface UserRoleDisplayProps {
  role: UserRole;
  showDescription?: boolean;
  className?: string;
}

export const UserRoleDisplay: React.FC<UserRoleDisplayProps> = ({
  role,
  showDescription = false,
  className = '',
}) => {
  const config = ROLE_CONFIG[role];

  if (!config) {
    return null;
  }

  return (
    <div className={`user-role-display ${className}`}>
      <UserRoleBadge role={role} />
      {showDescription && (
        <p className="user-role-display__description">
          {config.description}
        </p>
      )}
    </div>
  );
};

// Component for role selection (for admin use)
interface RoleSelectorProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  disabled?: boolean;
  className?: string;
}

export const RoleSelector: React.FC<RoleSelectorProps> = ({
  currentRole,
  onRoleChange,
  disabled = false,
  className = '',
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onRoleChange(e.target.value as UserRole);
  };

  return (
    <div className={`role-selector ${className}`}>
      <label htmlFor="role-select" className="role-selector__label">
        ユーザー権限
      </label>
      <select
        id="role-select"
        value={currentRole}
        onChange={handleChange}
        disabled={disabled}
        className="role-selector__select"
      >
        {Object.entries(ROLE_CONFIG).map(([roleValue, config]) => (
          <option key={roleValue} value={roleValue}>
            {config.icon} {config.label}
          </option>
        ))}
      </select>
      <p className="role-selector__description">
        {ROLE_CONFIG[currentRole].description}
      </p>
    </div>
  );
};

export default UserRoleBadge;