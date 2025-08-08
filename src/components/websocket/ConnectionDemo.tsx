import React, { useState, useEffect } from 'react';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { ConnectionStatus } from './ConnectionStatus';
import './ConnectionDemo.css';

export const ConnectionDemo: React.FC = () => {
  const {
    isConnected,
    connectionState,
    isOffline,
    connect,
    disconnect,
    lastError,
    reconnectAttempts,
    connectionErrors,
    missedMessagesCount,
    lastSyncTimestamp,
    clearErrors,
    subscribe,
    unsubscribe,
  } = useWebSocket();

  const [messages, setMessages] = useState<string[]>([]);
  const [isSimulatingOffline, setIsSimulatingOffline] = useState(false);

  // Subscribe to WebSocket events for demo
  useEffect(() => {
    const handleConnected = () => {
      setMessages(prev => [...prev, `✅ Connected at ${new Date().toLocaleTimeString()}`]);
    };

    const handleDisconnected = (message: any) => {
      setMessages(prev => [
        ...prev,
        `❌ Disconnected: ${message.data?.reason || 'Unknown'} at ${new Date().toLocaleTimeString()}`,
      ]);
    };

    const handleError = (message: any) => {
      setMessages(prev => [
        ...prev,
        `⚠️ Error: ${message.data?.error} at ${new Date().toLocaleTimeString()}`,
      ]);
    };

    const handleOnline = () => {
      setMessages(prev => [...prev, `🌐 Device came online at ${new Date().toLocaleTimeString()}`]);
    };

    const handleOffline = () => {
      setMessages(prev => [
        ...prev,
        `📵 Device went offline at ${new Date().toLocaleTimeString()}`,
      ]);
    };

    const handleReconnectScheduled = (message: any) => {
      setMessages(prev => [
        ...prev,
        `🔄 Reconnect attempt ${message.data?.attempt} scheduled for ${message.data?.delay}ms at ${new Date().toLocaleTimeString()}`,
      ]);
    };

    const handleSyncComplete = (message: any) => {
      setMessages(prev => [
        ...prev,
        `🔄 Sync completed: ${message.data?.messageCount || 0} messages at ${new Date().toLocaleTimeString()}`,
      ]);
    };

    subscribe('connected', handleConnected);
    subscribe('disconnected', handleDisconnected);
    subscribe('error', handleError);
    subscribe('online', handleOnline);
    subscribe('offline', handleOffline);
    subscribe('reconnect_scheduled', handleReconnectScheduled);
    subscribe('sync_complete', handleSyncComplete);

    return () => {
      unsubscribe('connected', handleConnected);
      unsubscribe('disconnected', handleDisconnected);
      unsubscribe('error', handleError);
      unsubscribe('online', handleOnline);
      unsubscribe('offline', handleOffline);
      unsubscribe('reconnect_scheduled', handleReconnectScheduled);
      unsubscribe('sync_complete', handleSyncComplete);
    };
  }, [subscribe, unsubscribe]);

  const handleConnect = async () => {
    try {
      await connect();
      setMessages(prev => [
        ...prev,
        `🔌 Manual connect requested at ${new Date().toLocaleTimeString()}`,
      ]);
    } catch (error) {
      setMessages(prev => [
        ...prev,
        `❌ Manual connect failed: ${error} at ${new Date().toLocaleTimeString()}`,
      ]);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setMessages(prev => [
      ...prev,
      `🔌 Manual disconnect requested at ${new Date().toLocaleTimeString()}`,
    ]);
  };

  const simulateOffline = () => {
    setIsSimulatingOffline(true);
    // Simulate going offline by dispatching offline event
    window.dispatchEvent(new Event('offline'));
    setMessages(prev => [
      ...prev,
      `📵 Simulated offline mode at ${new Date().toLocaleTimeString()}`,
    ]);

    // Automatically come back online after 5 seconds
    setTimeout(() => {
      setIsSimulatingOffline(false);
      window.dispatchEvent(new Event('online'));
      setMessages(prev => [
        ...prev,
        `🌐 Simulated online mode at ${new Date().toLocaleTimeString()}`,
      ]);
    }, 5000);
  };

  const clearMessages = () => {
    setMessages([]);
  };

  const handleClearErrors = () => {
    clearErrors();
    setMessages(prev => [
      ...prev,
      `🧹 Cleared connection errors at ${new Date().toLocaleTimeString()}`,
    ]);
  };

  return (
    <div className="connection-demo">
      <div className="connection-demo__header">
        <h2>WebSocket Connection State Management Demo</h2>
        <p>
          This demo showcases the enhanced connection state management, offline detection, and error
          handling features.
        </p>
      </div>

      <div className="connection-demo__status">
        <h3>Current Connection Status</h3>
        <ConnectionStatus showDetails={true} />
      </div>

      <div className="connection-demo__info">
        <div className="connection-demo__info-grid">
          <div className="connection-demo__info-item">
            <label>Connection State:</label>
            <span
              className={`connection-demo__state connection-demo__state--${connectionState.toLowerCase()}`}
            >
              {connectionState}
            </span>
          </div>

          <div className="connection-demo__info-item">
            <label>Is Connected:</label>
            <span className={`connection-demo__boolean ${isConnected ? 'true' : 'false'}`}>
              {isConnected ? 'Yes' : 'No'}
            </span>
          </div>

          <div className="connection-demo__info-item">
            <label>Is Offline:</label>
            <span className={`connection-demo__boolean ${isOffline ? 'true' : 'false'}`}>
              {isOffline ? 'Yes' : 'No'}
            </span>
          </div>

          <div className="connection-demo__info-item">
            <label>Reconnect Attempts:</label>
            <span>{reconnectAttempts}</span>
          </div>

          <div className="connection-demo__info-item">
            <label>Missed Messages:</label>
            <span>{missedMessagesCount}</span>
          </div>

          <div className="connection-demo__info-item">
            <label>Last Sync:</label>
            <span>
              {lastSyncTimestamp ? new Date(lastSyncTimestamp).toLocaleString() : 'Never'}
            </span>
          </div>
        </div>

        {lastError && (
          <div className="connection-demo__error">
            <label>Last Error:</label>
            <span>{lastError}</span>
          </div>
        )}

        {connectionErrors.length > 0 && (
          <div className="connection-demo__errors">
            <label>Connection Errors ({connectionErrors.length}):</label>
            <ul>
              {connectionErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="connection-demo__controls">
        <h3>Connection Controls</h3>
        <div className="connection-demo__buttons">
          <button
            onClick={handleConnect}
            disabled={isConnected || connectionState === 'CONNECTING'}
            className="connection-demo__button connection-demo__button--connect"
          >
            Connect
          </button>

          <button
            onClick={handleDisconnect}
            disabled={!isConnected}
            className="connection-demo__button connection-demo__button--disconnect"
          >
            Disconnect
          </button>

          <button
            onClick={simulateOffline}
            disabled={isSimulatingOffline}
            className="connection-demo__button connection-demo__button--offline"
          >
            {isSimulatingOffline ? 'Simulating Offline...' : 'Simulate Offline (5s)'}
          </button>

          <button
            onClick={handleClearErrors}
            disabled={connectionErrors.length === 0}
            className="connection-demo__button connection-demo__button--clear"
          >
            Clear Errors
          </button>
        </div>
      </div>

      <div className="connection-demo__events">
        <div className="connection-demo__events-header">
          <h3>Connection Events Log</h3>
          <button
            onClick={clearMessages}
            className="connection-demo__button connection-demo__button--clear-small"
          >
            Clear Log
          </button>
        </div>

        <div className="connection-demo__events-list">
          {messages.length === 0 ? (
            <p className="connection-demo__no-events">
              No events yet. Try connecting or simulating offline mode.
            </p>
          ) : (
            messages.slice(-20).map((message, index) => (
              <div key={index} className="connection-demo__event">
                {message}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="connection-demo__features">
        <h3>Enhanced Features</h3>
        <ul className="connection-demo__features-list">
          <li>
            <strong>Offline Detection:</strong> Automatically detects when the device goes
            offline/online using the Navigator API
          </li>
          <li>
            <strong>Auto-Reconnection:</strong> Automatically attempts to reconnect with exponential
            backoff and jitter
          </li>
          <li>
            <strong>Connection State Management:</strong> Tracks detailed connection states
            including OFFLINE, CONNECTING, CONNECTED, etc.
          </li>
          <li>
            <strong>Error History:</strong> Maintains a history of connection errors for debugging
          </li>
          <li>
            <strong>Sync on Reconnect:</strong> Requests missed messages when reconnecting after a
            disconnection
          </li>
          <li>
            <strong>Heartbeat Monitoring:</strong> Sends periodic ping messages to detect connection
            health
          </li>
          <li>
            <strong>Graceful Degradation:</strong> Handles various disconnection scenarios
            appropriately
          </li>
        </ul>
      </div>
    </div>
  );
};

export default ConnectionDemo;
