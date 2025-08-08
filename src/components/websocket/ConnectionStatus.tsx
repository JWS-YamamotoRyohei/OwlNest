import React from 'react';
import { useWebSocket } from '../../contexts/WebSocketContext';
import './ConnectionStatus.css';

export interface ConnectionStatusProps {
  showDetails?: boolean;
  className?: string;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  showDetails = false,
  className = '',
}) => {
  const {
    isConnected,
    connectionState,
    isOffline,
    lastError,
    reconnectAttempts,
    connectionErrors,
    missedMessagesCount,
    lastSyncTimestamp,
    connect,
    clearErrors,
  } = useWebSocket();

  const getStatusIcon = () => {
    if (isOffline) return '📵';

    switch (connectionState) {
      case 'CONNECTED':
        return '🟢';
      case 'CONNECTING':
        return '🟡';
      case 'DISCONNECTED':
        return '🔴';
      case 'CLOSING':
        return '🟠';
      case 'OFFLINE':
        return '📵';
      default:
        return '⚪';
    }
  };

  const getStatusText = () => {
    if (isOffline) return 'オフライン（ネットワーク未接続）';

    switch (connectionState) {
      case 'CONNECTED':
        return 'リアルタイム接続中';
      case 'CONNECTING':
        return '接続中...';
      case 'DISCONNECTED':
        return 'オフライン';
      case 'CLOSING':
        return '切断中...';
      case 'OFFLINE':
        return 'オフライン（ネットワーク未接続）';
      default:
        return '不明';
    }
  };

  const handleRetryConnection = async () => {
    try {
      await connect();
    } catch (error) {
      console.error('Manual reconnection failed:', error);
    }
  };

  return (
    <div className={`connection-status ${connectionState.toLowerCase()} ${className}`}>
      <div className="connection-status__indicator">
        <span className="connection-status__icon" role="img" aria-label={getStatusText()}>
          {getStatusIcon()}
        </span>
        <span className="connection-status__text">{getStatusText()}</span>
      </div>

      {showDetails && (
        <div className="connection-status__details">
          {lastError && (
            <div className="connection-status__error">
              <span className="connection-status__error-icon">⚠️</span>
              <span className="connection-status__error-text">{lastError}</span>
            </div>
          )}

          {connectionErrors.length > 0 && (
            <div className="connection-status__errors">
              <div className="connection-status__errors-header">
                <span>接続エラー履歴:</span>
                <button
                  className="connection-status__clear-errors"
                  onClick={clearErrors}
                  type="button"
                  title="エラー履歴をクリア"
                >
                  ✕
                </button>
              </div>
              <ul className="connection-status__errors-list">
                {connectionErrors.slice(-3).map((error, index) => (
                  <li key={index} className="connection-status__error-item">
                    {error}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {reconnectAttempts > 0 && (
            <div className="connection-status__reconnect">
              <span>再接続試行回数: {reconnectAttempts}</span>
            </div>
          )}

          {missedMessagesCount > 0 && (
            <div className="connection-status__sync">
              <span className="connection-status__sync-icon">🔄</span>
              <span>未同期メッセージ: {missedMessagesCount}件</span>
            </div>
          )}

          {lastSyncTimestamp && connectionState === 'CONNECTED' && (
            <div className="connection-status__last-sync">
              <span>最終同期: {new Date(lastSyncTimestamp).toLocaleTimeString()}</span>
            </div>
          )}

          {(connectionState === 'DISCONNECTED' || connectionState === 'OFFLINE') &&
            !isOffline &&
            !lastError?.includes('refresh') && (
              <button
                className="connection-status__retry-button"
                onClick={handleRetryConnection}
                type="button"
                disabled={isOffline}
              >
                再接続
              </button>
            )}

          {isOffline && (
            <div className="connection-status__offline-notice">
              <span>ネットワーク接続を確認してください</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ConnectionStatus;
