import { authService } from './authService';

export interface WebSocketMessage {
  action: string;
  data?: any;
  discussionId?: string;
  userId?: string;
  timestamp?: string;
}

export interface WebSocketConnectionOptions {
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
  syncOnReconnect?: boolean;
  offlineDetection?: boolean;
}

export type WebSocketEventHandler = (message: WebSocketMessage) => void;

export class WebSocketService {
  private ws: WebSocket | null = null;
  private url: string;
  private options: Required<WebSocketConnectionOptions>;
  private eventHandlers: Map<string, Set<WebSocketEventHandler>> = new Map();
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private isConnecting = false;
  private isManuallyDisconnected = false;
  private currentDiscussionId: string | null = null;
  private isOnline = true;
  private lastSyncTimestamp: string | null = null;
  private missedMessages: WebSocketMessage[] = [];
  private connectionErrors: string[] = [];

  constructor(url: string, options: WebSocketConnectionOptions = {}) {
    this.url = url;
    this.options = {
      autoReconnect: options.autoReconnect ?? true,
      reconnectInterval: options.reconnectInterval ?? 3000,
      maxReconnectAttempts: options.maxReconnectAttempts ?? 5,
      heartbeatInterval: options.heartbeatInterval ?? 30000,
      syncOnReconnect: options.syncOnReconnect ?? true,
      offlineDetection: options.offlineDetection ?? true,
    };

    // Set up offline/online detection
    if (this.options.offlineDetection && typeof window !== 'undefined') {
      this.setupOfflineDetection();
    }
  }

  async connect(): Promise<void> {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    this.isConnecting = true;
    this.isManuallyDisconnected = false;

    try {
      // Get authentication token
      const token = await authService.getAccessToken();
      const wsUrl = token ? `${this.url}?token=${encodeURIComponent(token)}` : this.url;

      console.log('Connecting to WebSocket:', wsUrl.replace(/token=[^&]+/, 'token=***'));

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
      this.ws.onerror = this.handleError.bind(this);

      // Wait for connection to open or fail
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('WebSocket connection timeout'));
        }, 10000);

        const onOpen = () => {
          clearTimeout(timeout);
          this.ws?.removeEventListener('open', onOpen);
          this.ws?.removeEventListener('error', onError);
          resolve();
        };

        const onError = (error: Event) => {
          clearTimeout(timeout);
          this.ws?.removeEventListener('open', onOpen);
          this.ws?.removeEventListener('error', onError);
          reject(new Error('WebSocket connection failed'));
        };

        this.ws?.addEventListener('open', onOpen);
        this.ws?.addEventListener('error', onError);
      });
    } catch (error) {
      console.error('WebSocket connection error:', error);
      this.isConnecting = false;
      throw error;
    }
  }

  disconnect(): void {
    this.isManuallyDisconnected = true;
    this.clearTimers();

    if (this.ws) {
      this.ws.close(1000, 'Manual disconnect');
      this.ws = null;
    }
  }

  send(message: WebSocketMessage): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket is not connected. Message not sent:', message);
      return;
    }

    try {
      this.ws.send(JSON.stringify(message));
    } catch (error) {
      console.error('Error sending WebSocket message:', error);
    }
  }

  on(event: string, handler: WebSocketEventHandler): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }

  off(event: string, handler: WebSocketEventHandler): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.eventHandlers.delete(event);
      }
    }
  }

  joinDiscussion(discussionId: string): void {
    this.currentDiscussionId = discussionId;
    this.send({
      action: 'join_discussion',
      discussionId,
    });
  }

  leaveDiscussion(discussionId: string): void {
    if (this.currentDiscussionId === discussionId) {
      this.currentDiscussionId = null;
    }
    this.send({
      action: 'leave_discussion',
      discussionId,
    });
  }

  broadcastPost(discussionId: string, postData: any): void {
    this.send({
      action: 'broadcast_post',
      discussionId,
      data: postData,
    });
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  getConnectionState(): string {
    if (!this.isOnline) return 'OFFLINE';
    if (!this.ws) return 'DISCONNECTED';

    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return 'CONNECTING';
      case WebSocket.OPEN:
        return 'CONNECTED';
      case WebSocket.CLOSING:
        return 'CLOSING';
      case WebSocket.CLOSED:
        return 'DISCONNECTED';
      default:
        return 'UNKNOWN';
    }
  }

  isOffline(): boolean {
    return !this.isOnline;
  }

  getLastSyncTimestamp(): string | null {
    return this.lastSyncTimestamp;
  }

  getMissedMessagesCount(): number {
    return this.missedMessages.length;
  }

  getConnectionErrors(): string[] {
    return [...this.connectionErrors];
  }

  clearConnectionErrors(): void {
    this.connectionErrors = [];
  }

  private handleOpen(event: Event): void {
    console.log('WebSocket connected');
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.clearConnectionErrors();
    this.startHeartbeat();

    // Rejoin current discussion if any
    if (this.currentDiscussionId) {
      this.joinDiscussion(this.currentDiscussionId);
    }

    // Sync missed data if this is a reconnection
    if (this.lastSyncTimestamp) {
      this.syncMissedData();
    } else {
      // First connection, set initial sync timestamp
      this.lastSyncTimestamp = new Date().toISOString();
    }

    this.emit('connected', {
      timestamp: new Date().toISOString(),
      isReconnection: this.lastSyncTimestamp !== null,
    });
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);
      console.log('WebSocket message received:', message);

      // Handle system messages
      if (message.action === 'pong') {
        // Heartbeat response - no need to emit
        return;
      }

      if (message.action === 'sync_response') {
        this.handleSyncResponse(message);
        return;
      }

      // Store message for potential replay if offline
      if (!this.isOnline) {
        this.missedMessages.push(message);
        // Keep only the last 100 missed messages
        if (this.missedMessages.length > 100) {
          this.missedMessages = this.missedMessages.slice(-100);
        }
      }

      this.emit(message.action, message);
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
      this.addConnectionError('Failed to parse message');
    }
  }

  private handleClose(event: CloseEvent): void {
    console.log('WebSocket disconnected:', event.code, event.reason);
    this.isConnecting = false;
    this.clearTimers();

    // Categorize the disconnection reason
    let disconnectionReason = 'unknown';
    let shouldReconnect = true;

    switch (event.code) {
      case 1000: // Normal closure
        disconnectionReason = 'normal';
        shouldReconnect = false;
        break;
      case 1001: // Going away
        disconnectionReason = 'going_away';
        break;
      case 1006: // Abnormal closure
        disconnectionReason = 'abnormal';
        break;
      case 1011: // Server error
        disconnectionReason = 'server_error';
        this.addConnectionError('Server error during connection');
        break;
      case 1012: // Service restart
        disconnectionReason = 'service_restart';
        break;
      default:
        disconnectionReason = `code_${event.code}`;
    }

    this.emit('disconnected', {
      code: event.code,
      reason: event.reason,
      disconnectionReason,
      timestamp: new Date().toISOString(),
    });

    // Auto-reconnect if not manually disconnected and conditions are met
    if (
      !this.isManuallyDisconnected &&
      this.options.autoReconnect &&
      shouldReconnect &&
      this.isOnline
    ) {
      this.scheduleReconnect();
    }
  }

  private handleError(event: Event): void {
    console.error('WebSocket error:', event);

    let errorMessage = 'WebSocket error';
    let errorType = 'unknown';

    // Try to determine error type
    if (!this.isOnline) {
      errorType = 'offline';
      errorMessage = 'Connection failed: Device is offline';
    } else if (this.reconnectAttempts > 0) {
      errorType = 'reconnection_failed';
      errorMessage = `Reconnection attempt ${this.reconnectAttempts} failed`;
    } else {
      errorType = 'connection_failed';
      errorMessage = 'Initial connection failed';
    }

    this.addConnectionError(errorMessage);

    this.emit('error', {
      error: errorMessage,
      errorType,
      reconnectAttempts: this.reconnectAttempts,
      isOnline: this.isOnline,
      timestamp: new Date().toISOString(),
    });
  }

  private scheduleReconnect(): void {
    // Don't reconnect if offline
    if (!this.isOnline) {
      console.log('Skipping reconnect: Device is offline');
      return;
    }

    if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
      console.log('Max reconnect attempts reached');
      this.emit('max_reconnect_attempts', {
        attempts: this.reconnectAttempts,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    this.reconnectAttempts++;
    // Exponential backoff with jitter
    const baseDelay = this.options.reconnectInterval * Math.pow(1.5, this.reconnectAttempts - 1);
    const jitter = Math.random() * 1000; // Add up to 1 second of jitter
    const delay = Math.min(baseDelay + jitter, 30000); // Cap at 30 seconds

    console.log(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${Math.round(delay)}ms`);

    this.emit('reconnect_scheduled', {
      attempt: this.reconnectAttempts,
      delay: Math.round(delay),
      timestamp: new Date().toISOString(),
    });

    this.reconnectTimer = setTimeout(async () => {
      // Check if still online before attempting reconnect
      if (!this.isOnline) {
        console.log('Cancelling reconnect: Device went offline');
        return;
      }

      try {
        console.log(
          `Attempting reconnect ${this.reconnectAttempts}/${this.options.maxReconnectAttempts}`
        );
        await this.connect();
      } catch (error) {
        console.error('Reconnect attempt failed:', error);
        this.addConnectionError(`Reconnect attempt ${this.reconnectAttempts} failed`);
        this.scheduleReconnect();
      }
    }, delay);
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected()) {
        this.send({ action: 'ping' });
      }
    }, this.options.heartbeatInterval);
  }

  private clearTimers(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private emit(event: string, data: any): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler({ action: event, data, timestamp: new Date().toISOString() });
        } catch (error) {
          console.error('Error in WebSocket event handler:', error);
        }
      });
    }
  }

  private setupOfflineDetection(): void {
    const handleOnline = () => {
      console.log('Network connection restored');
      this.isOnline = true;
      this.emit('online', { timestamp: new Date().toISOString() });

      // Auto-reconnect if we were disconnected due to offline status
      if (this.options.autoReconnect && !this.isConnected() && !this.isManuallyDisconnected) {
        console.log('Attempting to reconnect after coming online');
        this.connect().catch(error => {
          console.error('Failed to reconnect after coming online:', error);
        });
      }
    };

    const handleOffline = () => {
      console.log('Network connection lost');
      this.isOnline = false;
      this.emit('offline', { timestamp: new Date().toISOString() });

      // Clear timers when offline
      this.clearTimers();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial state
    this.isOnline = navigator.onLine;
  }

  private addConnectionError(error: string): void {
    this.connectionErrors.push(error);
    // Keep only the last 10 errors
    if (this.connectionErrors.length > 10) {
      this.connectionErrors = this.connectionErrors.slice(-10);
    }
  }

  private async syncMissedData(): Promise<void> {
    if (!this.options.syncOnReconnect || !this.currentDiscussionId) {
      return;
    }

    try {
      console.log('Syncing missed data since:', this.lastSyncTimestamp);

      // Request sync from server
      this.send({
        action: 'sync_request',
        discussionId: this.currentDiscussionId,
        data: {
          lastSyncTimestamp: this.lastSyncTimestamp,
        },
      });

      // Update sync timestamp
      this.lastSyncTimestamp = new Date().toISOString();
    } catch (error) {
      console.error('Failed to sync missed data:', error);
      this.addConnectionError('Failed to sync missed data');
    }
  }

  private handleSyncResponse(message: WebSocketMessage): void {
    if (message.data?.missedMessages) {
      console.log('Received sync data:', message.data.missedMessages.length, 'messages');

      // Process missed messages
      message.data.missedMessages.forEach((missedMessage: WebSocketMessage) => {
        this.emit(missedMessage.action, missedMessage);
      });

      this.emit('sync_complete', {
        messageCount: message.data.missedMessages.length,
        timestamp: new Date().toISOString(),
      });
    }
  }
}

// Singleton instance
let websocketService: WebSocketService | null = null;

export const getWebSocketService = (): WebSocketService => {
  if (!websocketService) {
    const wsUrl = process.env.REACT_APP_WEBSOCKET_URL || 'wss://localhost:3001';
    websocketService = new WebSocketService(wsUrl);
  }
  return websocketService;
};

export default WebSocketService;
