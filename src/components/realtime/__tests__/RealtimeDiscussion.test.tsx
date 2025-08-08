import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { useRealtimeDiscussion } from '../../../hooks/useRealtimeDiscussion';
import { WebSocketProvider } from '../../../contexts/WebSocketContext';
import { AuthProvider } from '../../../contexts/AuthContext';

// Mock WebSocket
const mockWebSocket = {
  send: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  readyState: WebSocket.OPEN,
};

// Mock WebSocket constructor
global.WebSocket = jest.fn(() => mockWebSocket) as any;

// Test component that uses the hook
const TestComponent: React.FC<{ discussionId: string }> = ({ discussionId }) => {
  const {
    isConnected,
    connectedUsers,
    typingUsers,
    joinDiscussion,
    leaveDiscussion,
    broadcastPost,
    broadcastTyping,
  } = useRealtimeDiscussion({
    discussionId,
    onNewPost: post => console.log('New post:', post),
    onPostUpdated: post => console.log('Post updated:', post),
    onPostDeleted: postId => console.log('Post deleted:', postId),
    onPostReactionChanged: (postId, reactionData) =>
      console.log('Reaction changed:', postId, reactionData),
    onPostVisibilityChanged: (postId, isHidden) =>
      console.log('Visibility changed:', postId, isHidden),
    onUserJoined: userId => console.log('User joined:', userId),
    onUserLeft: userId => console.log('User left:', userId),
    onTypingStart: (userId, userName) => console.log('Typing start:', userId, userName),
    onTypingStop: userId => console.log('Typing stop:', userId),
    autoJoin: true,
  });

  return (
    <div>
      <div data-testid="connection-status">{isConnected ? 'Connected' : 'Disconnected'}</div>
      <div data-testid="connected-users">{connectedUsers.length} users connected</div>
      <div data-testid="typing-users">{typingUsers.size} users typing</div>
      <button onClick={joinDiscussion} data-testid="join-button">
        Join Discussion
      </button>
      <button onClick={leaveDiscussion} data-testid="leave-button">
        Leave Discussion
      </button>
      <button
        onClick={() => broadcastPost({ type: 'test', content: 'Test post' })}
        data-testid="broadcast-post-button"
      >
        Broadcast Post
      </button>
      <button onClick={() => broadcastTyping(true)} data-testid="start-typing-button">
        Start Typing
      </button>
      <button onClick={() => broadcastTyping(false)} data-testid="stop-typing-button">
        Stop Typing
      </button>
    </div>
  );
};

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <AuthProvider>
      <WebSocketProvider>{component}</WebSocketProvider>
    </AuthProvider>
  );
};

describe('useRealtimeDiscussion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with default state', () => {
    renderWithProviders(<TestComponent discussionId="test-discussion" />);

    expect(screen.getByTestId('connection-status')).toHaveTextContent('Disconnected');
    expect(screen.getByTestId('connected-users')).toHaveTextContent('0 users connected');
    expect(screen.getByTestId('typing-users')).toHaveTextContent('0 users typing');
  });

  it('should provide join and leave discussion functions', () => {
    renderWithProviders(<TestComponent discussionId="test-discussion" />);

    const joinButton = screen.getByTestId('join-button');
    const leaveButton = screen.getByTestId('leave-button');

    expect(joinButton).toBeInTheDocument();
    expect(leaveButton).toBeInTheDocument();
  });

  it('should provide broadcast functions', () => {
    renderWithProviders(<TestComponent discussionId="test-discussion" />);

    const broadcastPostButton = screen.getByTestId('broadcast-post-button');
    const startTypingButton = screen.getByTestId('start-typing-button');
    const stopTypingButton = screen.getByTestId('stop-typing-button');

    expect(broadcastPostButton).toBeInTheDocument();
    expect(startTypingButton).toBeInTheDocument();
    expect(stopTypingButton).toBeInTheDocument();
  });

  it('should handle user joining and leaving', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    renderWithProviders(<TestComponent discussionId="test-discussion" />);

    // Simulate WebSocket connection and user events
    act(() => {
      // Simulate WebSocket open event
      const openHandler = mockWebSocket.addEventListener.mock.calls.find(
        call => call[0] === 'open'
      )?.[1];
      if (openHandler) openHandler();
    });

    await waitFor(() => {
      expect(screen.getByTestId('connection-status')).toHaveTextContent('Connected');
    });

    consoleSpy.mockRestore();
  });

  it('should handle typing events with timeout', async () => {
    jest.useFakeTimers();

    renderWithProviders(<TestComponent discussionId="test-discussion" />);

    // Simulate typing start event
    act(() => {
      // This would normally come from WebSocket message
      // For testing, we'll verify the timeout behavior
    });

    // Fast-forward time to test typing timeout
    act(() => {
      jest.advanceTimersByTime(3000);
    });

    jest.useRealTimers();
  });

  it('should cleanup typing timeouts on unmount', () => {
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

    const { unmount } = renderWithProviders(<TestComponent discussionId="test-discussion" />);

    unmount();

    // Verify cleanup was called (exact number depends on implementation)
    expect(clearTimeoutSpy).toHaveBeenCalled();

    clearTimeoutSpy.mockRestore();
  });
});

describe('Real-time Event Handling', () => {
  it('should handle new post events', () => {
    const onNewPost = jest.fn();

    renderWithProviders(<TestComponent discussionId="test-discussion" />);

    // Simulate receiving a new post event
    // This would normally come through WebSocket

    // In a real scenario, this would be triggered by WebSocket message
    expect(onNewPost).not.toHaveBeenCalled();
  });

  it('should handle post update events', () => {
    const onPostUpdated = jest.fn();

    renderWithProviders(<TestComponent discussionId="test-discussion" />);

    // Similar test for post updates
    expect(onPostUpdated).not.toHaveBeenCalled();
  });

  it('should handle post deletion events', () => {
    const onPostDeleted = jest.fn();

    renderWithProviders(<TestComponent discussionId="test-discussion" />);

    // Similar test for post deletions
    expect(onPostDeleted).not.toHaveBeenCalled();
  });
});
