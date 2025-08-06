import React from 'react';
import './RealtimeStatus.css';

interface RealtimeStatusProps {
  isConnected: boolean;
  connectedUsers: string[];
  showUserCount?: boolean;
  showConnectionStatus?: boolean;
  className?: string;
}

export const RealtimeStatus: React.FC<RealtimeStatusProps> = ({
  isConnected,
  connectedUsers,
  showUserCount = true,
  showConnectionStatus = true,
  className = '',
}) => {
  const getStatusIcon = (): string => {
    return isConnected ? '🟢' : '🔴';
  };

  const getStatusText = (): string => {
    return isConnected ? 'リアルタイム接続中' : 'オフライン';
  };

  const getStatusClass = (): string => {
    return isConnected ? 'realtime-status--connected' : 'realtime-status--disconnected';
  };

  return (
    <div className={`realtime-status ${getStatusClass()} ${className}`}>
      {showConnectionStatus && (
        <div className="realtime-status__connection">
          <span className="realtime-status__icon" title={getStatusText()}>
            {getStatusIcon()}
          </span>
          <span className="realtime-status__text">
            {getStatusText()}
          </span>
        </div>
      )}

      {showUserCount && isConnected && (
        <div className="realtime-status__users">
          <span className="realtime-status__user-icon">👥</span>
          <span className="realtime-status__user-count">
            {connectedUsers.length}人がオンライン
          </span>
        </div>
      )}
    </div>
  );
};

export default RealtimeStatus;