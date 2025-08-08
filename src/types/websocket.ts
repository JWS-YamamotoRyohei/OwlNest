// WebSocket and real-time communication types

export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: string;
}

export interface WebSocketContextType {
  isConnected: boolean;
  subscribe: (event: string, callback: (data: any) => void) => void;
  unsubscribe: (event: string) => void;
  emit: (event: string, data: any) => void;
}

export type WebSocketEvent =
  | 'NEW_POST'
  | 'POST_UPDATED'
  | 'POST_DELETED'
  | 'USER_JOINED'
  | 'USER_LEFT'
  | 'DISCUSSION_UPDATED';
