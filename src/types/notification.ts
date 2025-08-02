// Notification system types

export type NotificationType = 
  | 'NEW_POST'
  | 'NEW_REPLY'
  | 'MENTION'
  | 'FOLLOW'
  | 'DISCUSSION_UPDATE'
  | 'MODERATION_ACTION';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data: any;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  loadNotifications: () => Promise<void>;
}