import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import {
  WebSocketService,
  WebSocketMessage,
  getWebSocketService,
} from '../services/websocketService';
import { useAuth } from './AuthContext';

export interface WebSocketContextType {
  isConnected: boolean;
  connectionState: string;
  isOffline: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  send: (message: WebSocketMessage) => void;
  subscribe: (event: string, callback: (message: WebSocketMessage) => void) => void;
  unsubscribe: (event: string, callback: (message: WebSocketMessage) => void) => void;
  joinDiscussion: (discussionId: string) => void;
  leaveDiscussion: (discussionId: string) => void;
  broadcastPost: (discussionId: string, postData: any) => void;
  lastError: string | null;
  reconnectAttempts: number;
  connectionErrors: string[];
  missedMessagesCount: number;
  lastSyncTimestamp: string | null;
  clearErrors: () => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export interface WebSocketProviderProps {
  children: ReactNode;
  autoConnect?: boolean;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({
  children,
  autoConnect = true,
}) => {
  const { user, isAuthenticated } = useAuth();
  const [websocketService] = useState(() => getWebSocketService());
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState('DISCONNECTED');
  const [isOffline, setIsOffline] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [connectionErrors, setConnectionErrors] = useState<string[]>([]);
  const [missedMessagesCount, setMissedMessagesCount] = useState(0);
  const [lastSyncTimestamp, setLastSyncTimestamp] = useState<string | null>(null);

  // Update connection state
  const updateConnectionState = useCallback(() => {
    const state = websocketService.getConnectionState();
    setConnectionState(state);
    setIsConnected(state === 'CONNECTED');
    setIsOffline(websocketService.isOffline());
    setConnectionErrors(websocketService.getConnectionErrors());
    setMissedMessagesCount(websocketService.getMissedMessagesCount());
    setLastSyncTimestamp(websocketService.getLastSyncTimestamp());
  }, [websocketService]);

  // Clear errors
  const clearErrors = useCallback(() => {
    websocketService.clearConnectionErrors();
    setConnectionErrors([]);
    setLastError(null);
  }, [websocketService]);

  // Connect to WebSocket
  const connect = useCallback(async () => {
    try {
      setLastError(null);
      await websocketService.connect();
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
      setLastError(error instanceof Error ? error.message : 'Connection failed');
    }
  }, [websocketService]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    websocketService.disconnect();
    updateConnectionState();
  }, [websocketService, updateConnectionState]);

  // Send message
  const send = useCallback(
    (message: WebSocketMessage) => {
      websocketService.send(message);
    },
    [websocketService]
  );

  // Subscribe to events
  const subscribe = useCallback(
    (event: string, callback: (message: WebSocketMessage) => void) => {
      websocketService.on(event, callback);
    },
    [websocketService]
  );

  // Unsubscribe from events
  const unsubscribe = useCallback(
    (event: string, callback: (message: WebSocketMessage) => void) => {
      websocketService.off(event, callback);
    },
    [websocketService]
  );

  // Join discussion
  const joinDiscussion = useCallback(
    (discussionId: string) => {
      websocketService.joinDiscussion(discussionId);
    },
    [websocketService]
  );

  // Leave discussion
  const leaveDiscussion = useCallback(
    (discussionId: string) => {
      websocketService.leaveDiscussion(discussionId);
    },
    [websocketService]
  );

  // Broadcast post
  const broadcastPost = useCallback(
    (discussionId: string, postData: any) => {
      websocketService.broadcastPost(discussionId, postData);
    },
    [websocketService]
  );

  // Set up event listeners
  useEffect(() => {
    const handleConnected = () => {
      console.log('WebSocket connected');
      updateConnectionState();
      setLastError(null);
      setReconnectAttempts(0);
    };

    const handleDisconnected = (message: WebSocketMessage) => {
      console.log('WebSocket disconnected:', message.data);
      updateConnectionState();
    };

    const handleError = (message: WebSocketMessage) => {
      console.error('WebSocket error:', message.data);
      setLastError(message.data?.error || 'WebSocket error');
      updateConnectionState();
    };

    const handleMaxReconnectAttempts = (message: WebSocketMessage) => {
      console.log('Max reconnect attempts reached:', message.data);
      setReconnectAttempts(message.data?.attempts || 0);
      setLastError('Connection lost. Please refresh the page to reconnect.');
    };

    const handleOnline = (message: WebSocketMessage) => {
      console.log('Device came online:', message.data);
      updateConnectionState();
      setLastError(null);
    };

    const handleOffline = (message: WebSocketMessage) => {
      console.log('Device went offline:', message.data);
      updateConnectionState();
      setLastError('Device is offline. Connection will resume when online.');
    };

    const handleReconnectScheduled = (message: WebSocketMessage) => {
      console.log('Reconnect scheduled:', message.data);
      setReconnectAttempts(message.data?.attempt || 0);
    };

    const handleSyncComplete = (message: WebSocketMessage) => {
      console.log('Sync completed:', message.data);
      updateConnectionState();
      // Show a brief notification that sync is complete
      if (message.data?.messageCount > 0) {
        console.log(`Synced ${message.data.messageCount} missed messages`);
      }
    };

    // Subscribe to system events
    websocketService.on('connected', handleConnected);
    websocketService.on('disconnected', handleDisconnected);
    websocketService.on('error', handleError);
    websocketService.on('max_reconnect_attempts', handleMaxReconnectAttempts);
    websocketService.on('online', handleOnline);
    websocketService.on('offline', handleOffline);
    websocketService.on('reconnect_scheduled', handleReconnectScheduled);
    websocketService.on('sync_complete', handleSyncComplete);

    return () => {
      websocketService.off('connected', handleConnected);
      websocketService.off('disconnected', handleDisconnected);
      websocketService.off('error', handleError);
      websocketService.off('max_reconnect_attempts', handleMaxReconnectAttempts);
      websocketService.off('online', handleOnline);
      websocketService.off('offline', handleOffline);
      websocketService.off('reconnect_scheduled', handleReconnectScheduled);
      websocketService.off('sync_complete', handleSyncComplete);
    };
  }, [websocketService, updateConnectionState]);

  // Auto-connect when authenticated
  useEffect(() => {
    if (autoConnect && isAuthenticated && !isConnected && connectionState === 'DISCONNECTED') {
      console.log('Auto-connecting to WebSocket...');
      connect();
    }
  }, [autoConnect, isAuthenticated, isConnected, connectionState, connect]);

  // Disconnect when user logs out
  useEffect(() => {
    if (!isAuthenticated && isConnected) {
      console.log('User logged out, disconnecting WebSocket...');
      disconnect();
    }
  }, [isAuthenticated, isConnected, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isConnected) {
        websocketService.disconnect();
      }
    };
  }, [websocketService, isConnected]);

  const contextValue: WebSocketContextType = {
    isConnected,
    connectionState,
    isOffline,
    connect,
    disconnect,
    send,
    subscribe,
    unsubscribe,
    joinDiscussion,
    leaveDiscussion,
    broadcastPost,
    lastError,
    reconnectAttempts,
    connectionErrors,
    missedMessagesCount,
    lastSyncTimestamp,
    clearErrors,
  };

  return <WebSocketContext.Provider value={contextValue}>{children}</WebSocketContext.Provider>;
};

export const useWebSocket = (): WebSocketContextType => {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

export default WebSocketContext;
