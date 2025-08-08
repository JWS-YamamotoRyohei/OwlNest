import React, { useState, useCallback } from 'react';
import { AccessControl } from '../../types/discussion';
import { AccessControlType } from '../../types/common';
import './AccessControlEditor.css';

interface AccessControlEditorProps {
  accessControl: Partial<AccessControl>;
  onChange: (accessControl: Partial<AccessControl>) => void;
  disabled?: boolean;
}

export const AccessControlEditor: React.FC<AccessControlEditorProps> = ({
  accessControl,
  onChange,
  disabled = false,
}) => {
  const [userInput, setUserInput] = useState('');

  const handleTypeChange = useCallback(
    (type: AccessControlType) => {
      onChange({
        ...accessControl,
        type,
        userIds: type === AccessControlType.OPEN ? [] : accessControl.userIds || [],
      });
    },
    [accessControl, onChange]
  );

  const addUser = useCallback(() => {
    const trimmedInput = userInput.trim();
    if (!trimmedInput) return;

    const currentUserIds = accessControl.userIds || [];
    if (currentUserIds.includes(trimmedInput)) {
      setUserInput('');
      return;
    }

    onChange({
      ...accessControl,
      userIds: [...currentUserIds, trimmedInput],
    });
    setUserInput('');
  }, [userInput, accessControl, onChange]);

  const removeUser = useCallback(
    (userId: string) => {
      const currentUserIds = accessControl.userIds || [];
      onChange({
        ...accessControl,
        userIds: currentUserIds.filter(id => id !== userId),
      });
    },
    [accessControl, onChange]
  );

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addUser();
    }
  };

  const getTypeDescription = (type: AccessControlType) => {
    switch (type) {
      case AccessControlType.OPEN:
        return '全てのユーザーが投稿できます';
      case AccessControlType.BLACKLIST:
        return '指定したユーザーのみ投稿が制限されます';
      case AccessControlType.WHITELIST:
        return '指定したユーザーのみ投稿できます';
      default:
        return '';
    }
  };

  const getTypeIcon = (type: AccessControlType) => {
    switch (type) {
      case AccessControlType.OPEN:
        return '🌐';
      case AccessControlType.BLACKLIST:
        return '🚫';
      case AccessControlType.WHITELIST:
        return '✅';
      default:
        return '❓';
    }
  };

  return (
    <div className={`access-control-editor ${disabled ? 'disabled' : ''}`}>
      <div className="access-control-info">
        <p className="access-control-description">
          議論への投稿権限を設定できます。デフォルトでは全てのユーザーが投稿可能です。
        </p>
      </div>

      <div className="access-control-types">
        <div className="control-type-group">
          <label className="control-type-option">
            <input
              type="radio"
              name="accessControlType"
              value={AccessControlType.OPEN}
              checked={accessControl.type === AccessControlType.OPEN}
              onChange={() => handleTypeChange(AccessControlType.OPEN)}
              disabled={disabled}
            />
            <div className="control-type-content">
              <div className="control-type-header">
                <span className="control-type-icon">{getTypeIcon(AccessControlType.OPEN)}</span>
                <span className="control-type-title">オープン（推奨）</span>
              </div>
              <div className="control-type-description">
                {getTypeDescription(AccessControlType.OPEN)}
              </div>
            </div>
          </label>

          <label className="control-type-option">
            <input
              type="radio"
              name="accessControlType"
              value={AccessControlType.BLACKLIST}
              checked={accessControl.type === AccessControlType.BLACKLIST}
              onChange={() => handleTypeChange(AccessControlType.BLACKLIST)}
              disabled={disabled}
            />
            <div className="control-type-content">
              <div className="control-type-header">
                <span className="control-type-icon">
                  {getTypeIcon(AccessControlType.BLACKLIST)}
                </span>
                <span className="control-type-title">ブラックリスト方式</span>
              </div>
              <div className="control-type-description">
                {getTypeDescription(AccessControlType.BLACKLIST)}
              </div>
            </div>
          </label>

          <label className="control-type-option">
            <input
              type="radio"
              name="accessControlType"
              value={AccessControlType.WHITELIST}
              checked={accessControl.type === AccessControlType.WHITELIST}
              onChange={() => handleTypeChange(AccessControlType.WHITELIST)}
              disabled={disabled}
            />
            <div className="control-type-content">
              <div className="control-type-header">
                <span className="control-type-icon">
                  {getTypeIcon(AccessControlType.WHITELIST)}
                </span>
                <span className="control-type-title">ホワイトリスト方式</span>
              </div>
              <div className="control-type-description">
                {getTypeDescription(AccessControlType.WHITELIST)}
              </div>
            </div>
          </label>
        </div>
      </div>

      {(accessControl.type === AccessControlType.BLACKLIST ||
        accessControl.type === AccessControlType.WHITELIST) && (
        <div className="user-list-section">
          <div className="user-list-header">
            <h4>
              {accessControl.type === AccessControlType.BLACKLIST
                ? '制限するユーザー'
                : '許可するユーザー'}
            </h4>
            <p className="user-list-help">
              {accessControl.type === AccessControlType.BLACKLIST
                ? 'ここに追加されたユーザーは投稿できなくなります'
                : 'ここに追加されたユーザーのみが投稿できます'}
            </p>
          </div>

          <div className="user-input-group">
            <input
              type="text"
              value={userInput}
              onChange={e => setUserInput(e.target.value)}
              onKeyPress={handleKeyPress}
              className="user-input"
              placeholder="ユーザーIDまたはメールアドレスを入力"
              disabled={disabled}
            />
            <button
              type="button"
              onClick={addUser}
              className="add-user-btn"
              disabled={disabled || !userInput.trim()}
            >
              追加
            </button>
          </div>

          {accessControl.userIds && accessControl.userIds.length > 0 ? (
            <div className="user-list">
              <div className="user-list-count">
                {accessControl.userIds.length} 人のユーザーが
                {accessControl.type === AccessControlType.BLACKLIST ? '制限' : '許可'}されています
              </div>
              <div className="user-items">
                {accessControl.userIds.map((userId, index) => (
                  <div key={index} className="user-item">
                    <div className="user-info">
                      <span className="user-icon">👤</span>
                      <span className="user-id">{userId}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeUser(userId)}
                      className="remove-user-btn"
                      disabled={disabled}
                      title="削除"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="empty-user-list">
              <div className="empty-user-icon">👥</div>
              <div className="empty-user-text">
                {accessControl.type === AccessControlType.BLACKLIST
                  ? '制限するユーザーが設定されていません'
                  : '許可するユーザーが設定されていません'}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="access-control-help">
        <h4>🔒 アクセス制御について</h4>
        <ul>
          <li>
            <strong>オープン:</strong> 健全な議論を促進するため、基本的にはオープンを推奨します
          </li>
          <li>
            <strong>ブラックリスト:</strong>{' '}
            特定のユーザーからの荒らしや不適切な投稿を防ぎたい場合に使用
          </li>
          <li>
            <strong>ホワイトリスト:</strong>{' '}
            専門的な議論や限定的な参加者での議論を行いたい場合に使用
          </li>
          <li>設定は議論作成後も変更可能です</li>
        </ul>
      </div>
    </div>
  );
};

export default AccessControlEditor;
