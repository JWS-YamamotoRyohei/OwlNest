import { useEffect, useCallback, useRef, useState } from 'react';
import { useWebSocket } from '../contexts/WebSocketContext';
import { WebSocketMessage } from '../services/websocketService';
import { Post } from '../types/post';

export interface RealtimeDiscussionOptions {
  discussionId: string;
  onNewPost?: (post: Post) => void;
  onPostUpdated?: (post: Post) => void;
  onPostDeleted?: (postId: string) => void;
  onPostReactionChanged?: (postId: string, reactionData: any) => void;
  onPostVisibilityChanged?: (postId: string, isHidden: boolean, reason?: string) => void;
  onUserJoined?: (userId: string) => void;
  onUserLeft?: (userId: string) => void;
  onTypingStart?: (userId: string, userName: string) => void;
  onTypingStop?: (userId: string) => void;
  onDiscussionUpdated?: (discussion: any) => void;
  autoJoin?: boolean;
}

export interface RealtimeDiscussionReturn {
  joinDiscussion: () => void;
  leaveDiscussion: () => void;
  broadcastPost: (postData: any) => void;
  broadcastTyping: (isTyping: boolean) => void;
  isConnected: boolean;
  connectedUsers: string[];
  typingUsers: Map<string, string>;
}

export const useRealtimeDiscussion = (
  options: RealtimeDiscussionOptions
): RealtimeDiscussionReturn => {
  const {
    discussionId,
    onNewPost,
    onPostUpdated,
    onPostDeleted,
    onPostReactionChanged,
    onPostVisibilityChanged,
    onUserJoined,
    onUserLeft,
    onTypingStart,
    onTypingStop,
    onDiscussionUpdated,
    autoJoin = true,
  } = options;

  const {
    isConnected,
    joinDiscussion: wsJoinDiscussion,
    leaveDiscussion: wsLeaveDiscussion,
    broadcastPost: wsBroadcastPost,
    subscribe,
    unsubscribe,
    send,
  } = useWebSocket();

  const [connectedUsers, setConnectedUsers] = useState<string[]>([]);
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map());
  const typingTimeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const handlersRef = useRef({
    onNewPost,
    onPostUpdated,
    onPostDeleted,
    onPostReactionChanged,
    onPostVisibilityChanged,
    onUserJoined,
    onUserLeft,
    onTypingStart,
    onTypingStop,
    onDiscussionUpdated,
  });

  // Update handlers ref when they change
  useEffect(() => {
    handlersRef.current = {
      onNewPost,
      onPostUpdated,
      onPostDeleted,
      onPostReactionChanged,
      onPostVisibilityChanged,
      onUserJoined,
      onUserLeft,
      onTypingStart,
      onTypingStop,
      onDiscussionUpdated,
    };
  }, [
    onNewPost,
    onPostUpdated,
    onPostDeleted,
    onPostReactionChanged,
    onPostVisibilityChanged,
    onUserJoined,
    onUserLeft,
    onTypingStart,
    onTypingStop,
    onDiscussionUpdated,
  ]);

  // Join discussion
  const joinDiscussion = useCallback(() => {
    if (isConnected) {
      wsJoinDiscussion(discussionId);
    }
  }, [isConnected, wsJoinDiscussion, discussionId]);

  // Leave discussion
  const leaveDiscussion = useCallback(() => {
    if (isConnected) {
      wsLeaveDiscussion(discussionId);
    }
  }, [isConnected, wsLeaveDiscussion, discussionId]);

  // Broadcast post
  const broadcastPost = useCallback(
    (postData: any) => {
      if (isConnected) {
        wsBroadcastPost(discussionId, postData);
      }
    },
    [isConnected, wsBroadcastPost, discussionId]
  );

  // Broadcast typing status
  const broadcastTyping = useCallback(
    (isTyping: boolean) => {
      if (isConnected) {
        const message = {
          action: isTyping ? 'typing_start' : 'typing_stop',
          discussionId,
          timestamp: new Date().toISOString(),
        };
        send(message);
      }
    },
    [isConnected, discussionId, send]
  );

  // Handle new post
  const handleNewPost = useCallback((message: WebSocketMessage) => {
    if (message.data?.post && handlersRef.current.onNewPost) {
      handlersRef.current.onNewPost(message.data.post);
    }
  }, []);

  // Handle post updated
  const handlePostUpdated = useCallback((message: WebSocketMessage) => {
    if (message.data?.post && handlersRef.current.onPostUpdated) {
      handlersRef.current.onPostUpdated(message.data.post);
    }
  }, []);

  // Handle post deleted
  const handlePostDeleted = useCallback((message: WebSocketMessage) => {
    if (message.data?.postId && handlersRef.current.onPostDeleted) {
      handlersRef.current.onPostDeleted(message.data.postId);
    }
  }, []);

  // Handle post reaction changed
  const handlePostReactionChanged = useCallback((message: WebSocketMessage) => {
    if (
      message.data?.postId &&
      message.data?.reactionData &&
      handlersRef.current.onPostReactionChanged
    ) {
      handlersRef.current.onPostReactionChanged(message.data.postId, message.data.reactionData);
    }
  }, []);

  // Handle post visibility changed
  const handlePostVisibilityChanged = useCallback((message: WebSocketMessage) => {
    if (message.data?.postId && handlersRef.current.onPostVisibilityChanged) {
      handlersRef.current.onPostVisibilityChanged(
        message.data.postId,
        message.data.isHidden,
        message.data.reason
      );
    }
  }, []);

  // Handle typing start
  const handleTypingStart = useCallback((message: WebSocketMessage) => {
    if (message.data?.userId && message.data?.userName) {
      const userId = message.data.userId;
      const userName = message.data.userName;

      setTypingUsers(prev => new Map(prev.set(userId, userName)));

      // Clear existing timeout for this user
      const existingTimeout = typingTimeoutRef.current.get(userId);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      // Set new timeout to remove typing indicator after 3 seconds
      const timeout = setTimeout(() => {
        setTypingUsers(prev => {
          const newMap = new Map(prev);
          newMap.delete(userId);
          return newMap;
        });
        typingTimeoutRef.current.delete(userId);
      }, 3000);

      typingTimeoutRef.current.set(userId, timeout);

      if (handlersRef.current.onTypingStart) {
        handlersRef.current.onTypingStart(userId, userName);
      }
    }
  }, []);

  // Handle typing stop
  const handleTypingStop = useCallback((message: WebSocketMessage) => {
    if (message.data?.userId) {
      const userId = message.data.userId;

      setTypingUsers(prev => {
        const newMap = new Map(prev);
        newMap.delete(userId);
        return newMap;
      });

      // Clear timeout for this user
      const existingTimeout = typingTimeoutRef.current.get(userId);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
        typingTimeoutRef.current.delete(userId);
      }

      if (handlersRef.current.onTypingStop) {
        handlersRef.current.onTypingStop(userId);
      }
    }
  }, []);

  // Handle discussion updated
  const handleDiscussionUpdated = useCallback((message: WebSocketMessage) => {
    if (message.data && handlersRef.current.onDiscussionUpdated) {
      handlersRef.current.onDiscussionUpdated(message.data);
    }
  }, []);

  // Handle user joined
  const handleUserJoined = useCallback((message: WebSocketMessage) => {
    if (message.data?.userId) {
      setConnectedUsers(prev => {
        if (!prev.includes(message.data.userId)) {
          return [...prev, message.data.userId];
        }
        return prev;
      });

      if (handlersRef.current.onUserJoined) {
        handlersRef.current.onUserJoined(message.data.userId);
      }
    }
  }, []);

  // Handle user left
  const handleUserLeft = useCallback((message: WebSocketMessage) => {
    if (message.data?.userId) {
      setConnectedUsers(prev => prev.filter(id => id !== message.data.userId));

      // Remove from typing users if present
      setTypingUsers(prev => {
        const newMap = new Map(prev);
        newMap.delete(message.data.userId);
        return newMap;
      });

      // Clear typing timeout for this user
      const existingTimeout = typingTimeoutRef.current.get(message.data.userId);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
        typingTimeoutRef.current.delete(message.data.userId);
      }

      if (handlersRef.current.onUserLeft) {
        handlersRef.current.onUserLeft(message.data.userId);
      }
    }
  }, []);

  // Handle discussion joined confirmation
  const handleJoinedDiscussion = useCallback((message: WebSocketMessage) => {
    console.log(`Joined discussion: ${message.data?.discussionId}`);
  }, []);

  // Handle discussion left confirmation
  const handleLeftDiscussion = useCallback((message: WebSocketMessage) => {
    console.log(`Left discussion: ${message.data?.discussionId}`);
  }, []);

  // Set up event listeners
  useEffect(() => {
    if (!isConnected) return;

    // Subscribe to events
    subscribe('new_post', handleNewPost);
    subscribe('post_updated', handlePostUpdated);
    subscribe('post_deleted', handlePostDeleted);
    subscribe('post_reaction_changed', handlePostReactionChanged);
    subscribe('post_visibility_changed', handlePostVisibilityChanged);
    subscribe('user_joined', handleUserJoined);
    subscribe('user_left', handleUserLeft);
    subscribe('typing_start', handleTypingStart);
    subscribe('typing_stop', handleTypingStop);
    subscribe('discussion_updated', handleDiscussionUpdated);
    subscribe('joined_discussion', handleJoinedDiscussion);
    subscribe('left_discussion', handleLeftDiscussion);

    return () => {
      // Unsubscribe from events
      unsubscribe('new_post', handleNewPost);
      unsubscribe('post_updated', handlePostUpdated);
      unsubscribe('post_deleted', handlePostDeleted);
      unsubscribe('post_reaction_changed', handlePostReactionChanged);
      unsubscribe('post_visibility_changed', handlePostVisibilityChanged);
      unsubscribe('user_joined', handleUserJoined);
      unsubscribe('user_left', handleUserLeft);
      unsubscribe('typing_start', handleTypingStart);
      unsubscribe('typing_stop', handleTypingStop);
      unsubscribe('discussion_updated', handleDiscussionUpdated);
      unsubscribe('joined_discussion', handleJoinedDiscussion);
      unsubscribe('left_discussion', handleLeftDiscussion);
    };
  }, [
    isConnected,
    subscribe,
    unsubscribe,
    handleNewPost,
    handlePostUpdated,
    handlePostDeleted,
    handlePostReactionChanged,
    handlePostVisibilityChanged,
    handleUserJoined,
    handleUserLeft,
    handleTypingStart,
    handleTypingStop,
    handleDiscussionUpdated,
    handleJoinedDiscussion,
    handleLeftDiscussion,
  ]);

  // Auto-join discussion when connected
  useEffect(() => {
    if (autoJoin && isConnected) {
      joinDiscussion();
    }

    // Leave discussion on cleanup
    return () => {
      if (isConnected) {
        leaveDiscussion();
      }
    };
  }, [autoJoin, isConnected, joinDiscussion, leaveDiscussion]);

  // Cleanup typing timeouts on unmount
  useEffect(() => {
    return () => {
      typingTimeoutRef.current.forEach(timeout => clearTimeout(timeout));
      typingTimeoutRef.current.clear();
    };
  }, []);

  return {
    joinDiscussion,
    leaveDiscussion,
    broadcastPost,
    broadcastTyping,
    isConnected,
    connectedUsers,
    typingUsers,
  };
};

export default useRealtimeDiscussion;
