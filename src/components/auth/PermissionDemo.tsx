// Permission system demonstration component
import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { usePermissions } from '../../hooks/usePermissions';
import {
  AuthGate,
  RoleGate,
  PermissionGate,
  MultiplePermissionsGate,
  ContentOwnershipGate,
} from './PermissionGate';
import UserRoleBadge, { UserRoleDisplay, RoleSelector } from './UserRoleBadge';
import PermissionError, {
  LoginRequiredError,
  PostPermissionError,
  CreateDiscussionError,
  ModerateError,
} from './PermissionError';
import AuthModal from './AuthModal';
import { UserRole } from '../../types/auth';
import './PermissionDemo.css';

const PermissionDemo: React.FC = () => {
  const { user, isAuthenticated, logout, updateUserRole } = useAuth();
  const {
    canViewContent,
    canCreatePosts,
    canCreateDiscussions,
    canModerateContent,
    canManageUsers,
    isAdmin,
    isCreator,
    isContributor,
    isViewer,
  } = usePermissions();

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.VIEWER);

  const handleRoleChange = async (newRole: UserRole) => {
    if (user && isAdmin()) {
      try {
        await updateUserRole(user.userId, newRole);
        alert(`ユーザー権限を${newRole}に変更しました`);
      } catch (error) {
        alert('権限変更に失敗しました');
      }
    }
  };

  return (
    <div className="permission-demo">
      <div className="permission-demo__header">
        <h2>権限管理システム デモ</h2>

        <AuthGate
          fallback={
            <button className="auth-button" onClick={() => setShowAuthModal(true)}>
              ログイン
            </button>
          }
        >
          <div className="user-info">
            <span>ようこそ、{user?.displayName}さん</span>
            <UserRoleBadge role={user?.role || UserRole.VIEWER} />
            <button className="logout-button" onClick={logout}>
              ログアウト
            </button>
          </div>
        </AuthGate>
      </div>

      <div className="permission-demo__content">
        {/* Authentication Status */}
        <section className="demo-section">
          <h3>認証状態</h3>
          <div className="status-grid">
            <div className="status-item">
              <span>認証済み:</span>
              <span className={isAuthenticated ? 'status-true' : 'status-false'}>
                {isAuthenticated ? '✅' : '❌'}
              </span>
            </div>
            {user && (
              <>
                <div className="status-item">
                  <span>ユーザーID:</span>
                  <span>{user.userId}</span>
                </div>
                <div className="status-item">
                  <span>メール:</span>
                  <span>{user.email}</span>
                </div>
                <div className="status-item">
                  <span>権限:</span>
                  <UserRoleBadge role={user.role} />
                </div>
              </>
            )}
          </div>
        </section>

        {/* Role-based Display */}
        <section className="demo-section">
          <h3>権限別表示</h3>
          <div className="role-demos">
            <RoleGate
              allowedRoles={[
                UserRole.VIEWER,
                UserRole.CONTRIBUTOR,
                UserRole.CREATOR,
                UserRole.ADMIN,
              ]}
              fallback={<div className="demo-fallback">閲覧者以上の権限が必要</div>}
            >
              <div className="demo-item demo-item--viewer">👁️ 閲覧者以上に表示される内容</div>
            </RoleGate>

            <RoleGate
              allowedRoles={[UserRole.CONTRIBUTOR, UserRole.CREATOR, UserRole.ADMIN]}
              fallback={<div className="demo-fallback">投稿者以上の権限が必要</div>}
            >
              <div className="demo-item demo-item--contributor">✍️ 投稿者以上に表示される内容</div>
            </RoleGate>

            <RoleGate
              allowedRoles={[UserRole.CREATOR, UserRole.ADMIN]}
              fallback={<div className="demo-fallback">作成者以上の権限が必要</div>}
            >
              <div className="demo-item demo-item--creator">🎯 作成者以上に表示される内容</div>
            </RoleGate>

            <RoleGate
              allowedRoles={[UserRole.ADMIN]}
              fallback={<div className="demo-fallback">管理者権限が必要</div>}
            >
              <div className="demo-item demo-item--admin">👑 管理者のみに表示される内容</div>
            </RoleGate>
          </div>
        </section>

        {/* Permission-based Display */}
        <section className="demo-section">
          <h3>機能別権限チェック</h3>
          <div className="permission-checks">
            <div className="permission-check">
              <span>閲覧権限:</span>
              <span className={canViewContent() ? 'status-true' : 'status-false'}>
                {canViewContent() ? '✅' : '❌'}
              </span>
            </div>
            <div className="permission-check">
              <span>投稿権限:</span>
              <span className={canCreatePosts() ? 'status-true' : 'status-false'}>
                {canCreatePosts() ? '✅' : '❌'}
              </span>
            </div>
            <div className="permission-check">
              <span>議論作成権限:</span>
              <span className={canCreateDiscussions() ? 'status-true' : 'status-false'}>
                {canCreateDiscussions() ? '✅' : '❌'}
              </span>
            </div>
            <div className="permission-check">
              <span>モデレーション権限:</span>
              <span className={canModerateContent() ? 'status-true' : 'status-false'}>
                {canModerateContent() ? '✅' : '❌'}
              </span>
            </div>
            <div className="permission-check">
              <span>ユーザー管理権限:</span>
              <span className={canManageUsers() ? 'status-true' : 'status-false'}>
                {canManageUsers() ? '✅' : '❌'}
              </span>
            </div>
          </div>
        </section>

        {/* Permission Gates */}
        <section className="demo-section">
          <h3>権限ゲート</h3>
          <div className="gate-demos">
            <PermissionGate permission="canPost" fallback={<PostPermissionError />}>
              <div className="demo-item demo-item--success">✅ 投稿機能が利用可能です</div>
            </PermissionGate>

            <PermissionGate permission="canCreateDiscussion" fallback={<CreateDiscussionError />}>
              <div className="demo-item demo-item--success">✅ 議論作成機能が利用可能です</div>
            </PermissionGate>

            <PermissionGate permission="canModerate" fallback={<ModerateError />}>
              <div className="demo-item demo-item--success">
                ✅ モデレーション機能が利用可能です
              </div>
            </PermissionGate>
          </div>
        </section>

        {/* Content Ownership */}
        <section className="demo-section">
          <h3>コンテンツ所有権</h3>
          <div className="ownership-demos">
            <ContentOwnershipGate
              contentOwnerId={user?.userId || 'other-user'}
              fallback={<div className="demo-fallback">自分のコンテンツではありません</div>}
            >
              <div className="demo-item demo-item--success">✅ 自分のコンテンツを編集できます</div>
            </ContentOwnershipGate>

            <ContentOwnershipGate
              contentOwnerId="other-user"
              allowModerators={true}
              fallback={<div className="demo-fallback">編集権限がありません</div>}
            >
              <div className="demo-item demo-item--success">
                ✅ モデレーター権限で他者のコンテンツを管理できます
              </div>
            </ContentOwnershipGate>
          </div>
        </section>

        {/* Role Management (Admin only) */}
        <RoleGate
          allowedRoles={[UserRole.ADMIN]}
          fallback={
            <section className="demo-section">
              <h3>権限管理</h3>
              <ModerateError />
            </section>
          }
        >
          <section className="demo-section">
            <h3>権限管理（管理者のみ）</h3>
            <div className="role-management">
              <RoleSelector currentRole={selectedRole} onRoleChange={setSelectedRole} />
              <button className="role-change-button" onClick={() => handleRoleChange(selectedRole)}>
                権限を変更
              </button>
            </div>
          </section>
        </RoleGate>

        {/* Role Information */}
        <section className="demo-section">
          <h3>権限情報</h3>
          <div className="role-info-grid">
            {Object.values(UserRole).map(role => (
              <UserRoleDisplay key={role} role={role} showDescription={true} />
            ))}
          </div>
        </section>
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => setShowAuthModal(false)}
      />
    </div>
  );
};

export default PermissionDemo;
