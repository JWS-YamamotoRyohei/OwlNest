// Permission error component
import React from 'react';
import { UserRole } from '../../types/auth';
import { useAuth } from '../../hooks/useAuth';
import UserRoleBadge from './UserRoleBadge';
import './PermissionError.css';

interface PermissionErrorProps {
  title?: string;
  message?: string;
  requiredRole?: UserRole;
  requiredPermission?: string;
  showCurrentRole?: boolean;
  showUpgradeInfo?: boolean;
  onRequestUpgrade?: () => void;
  className?: string;
  children?: React.ReactNode;
}

const PermissionError: React.FC<PermissionErrorProps> = ({
  title = 'アクセス権限がありません',
  message,
  requiredRole,
  requiredPermission,
  showCurrentRole = true,
  showUpgradeInfo = true,
  onRequestUpgrade,
  className = '',
  children,
}) => {
  const { user } = useAuth();

  const getDefaultMessage = (): string => {
    if (requiredRole) {
      return `この機能を利用するには${requiredRole}以上の権限が必要です。`;
    }
    if (requiredPermission) {
      return `この機能を利用するには${requiredPermission}権限が必要です。`;
    }
    return 'この機能を利用する権限がありません。';
  };

  const getUpgradeMessage = (): string => {
    if (!user) {
      return 'ログインしてください。';
    }

    switch (user.role) {
      case UserRole.VIEWER:
        return '投稿権限の申請を行うか、管理者にお問い合わせください。';
      case UserRole.CONTRIBUTOR:
        return '議論作成権限の申請を行うか、管理者にお問い合わせください。';
      case UserRole.CREATOR:
        return '管理者権限が必要です。管理者にお問い合わせください。';
      default:
        return '管理者にお問い合わせください。';
    }
  };

  return (
    <div className={`permission-error ${className}`}>
      <div className="permission-error__icon">🔒</div>

      <div className="permission-error__content">
        <h3 className="permission-error__title">{title}</h3>

        <p className="permission-error__message">{message || getDefaultMessage()}</p>

        {showCurrentRole && user && (
          <div className="permission-error__current-role">
            <span>現在の権限: </span>
            <UserRoleBadge role={user.role} />
          </div>
        )}

        {requiredRole && (
          <div className="permission-error__required-role">
            <span>必要な権限: </span>
            <UserRoleBadge role={requiredRole} />
          </div>
        )}

        {showUpgradeInfo && (
          <div className="permission-error__upgrade-info">
            <p className="permission-error__upgrade-message">{getUpgradeMessage()}</p>

            {onRequestUpgrade && (
              <button className="permission-error__upgrade-button" onClick={onRequestUpgrade}>
                権限申請
              </button>
            )}
          </div>
        )}

        {children && <div className="permission-error__children">{children}</div>}
      </div>
    </div>
  );
};

// Specific error components for common scenarios
export const LoginRequiredError: React.FC<{ onLogin?: () => void }> = ({ onLogin }) => (
  <PermissionError
    title="ログインが必要です"
    message="この機能を利用するにはログインしてください。"
    showCurrentRole={false}
    showUpgradeInfo={false}
  >
    {onLogin && (
      <div className="permission-error__actions">
        <button className="permission-error__login-button" onClick={onLogin}>
          ログイン
        </button>
      </div>
    )}
  </PermissionError>
);

export const PostPermissionError: React.FC = () => (
  <PermissionError
    title="投稿権限がありません"
    message="投稿するには投稿者以上の権限が必要です。"
    requiredRole={UserRole.CONTRIBUTOR}
  />
);

export const CreateDiscussionError: React.FC = () => (
  <PermissionError
    title="議論作成権限がありません"
    message="議論を作成するには作成者以上の権限が必要です。"
    requiredRole={UserRole.CREATOR}
  />
);

export const ModerateError: React.FC = () => (
  <PermissionError
    title="モデレーション権限がありません"
    message="この操作には管理者権限が必要です。"
    requiredRole={UserRole.ADMIN}
  />
);

export default PermissionError;
