import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConnectionStatus } from '../ConnectionStatus';
import { useWebSocket } from '../../../contexts/WebSocketContext';

// Mock the WebSocket context
jest.mock('../../../contexts/WebSocketContext');

const mockUseWebSocket = useWebSocket as jest.MockedFunction<typeof useWebSocket>;

describe('ConnectionStatus', () => {
  const defaultWebSocketState = {
    isConnected: false,
    connectionState: 'DISCONNECTED',
    isOffline: false,
    connect: jest.fn(),
    disconnect: jest.fn(),
    send: jest.fn(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
    joinDiscussion: jest.fn(),
    leaveDiscussion: jest.fn(),
    broadcastPost: jest.fn(),
    lastError: null,
    reconnectAttempts: 0,
    connectionErrors: [],
    missedMessagesCount: 0,
    lastSyncTimestamp: null,
    clearErrors: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseWebSocket.mockReturnValue(defaultWebSocketState);
  });

  it('renders connected state correctly', () => {
    mockUseWebSocket.mockReturnValue({
      ...defaultWebSocketState,
      isConnected: true,
      connectionState: 'CONNECTED',
    });

    render(<ConnectionStatus />);

    expect(screen.getByText('リアルタイム接続中')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'リアルタイム接続中' })).toHaveTextContent('🟢');
  });

  it('renders offline state correctly', () => {
    mockUseWebSocket.mockReturnValue({
      ...defaultWebSocketState,
      connectionState: 'OFFLINE',
      isOffline: true,
    });

    render(<ConnectionStatus />);

    expect(screen.getByText('オフライン（ネットワーク未接続）')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'オフライン（ネットワーク未接続）' })).toHaveTextContent(
      '📵'
    );
  });

  it('renders connecting state with animation', () => {
    mockUseWebSocket.mockReturnValue({
      ...defaultWebSocketState,
      connectionState: 'CONNECTING',
    });

    render(<ConnectionStatus />);

    expect(screen.getByText('接続中...')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '接続中...' })).toHaveTextContent('🟡');
  });

  it('shows detailed information when showDetails is true', () => {
    mockUseWebSocket.mockReturnValue({
      ...defaultWebSocketState,
      lastError: 'Connection failed',
      reconnectAttempts: 3,
      connectionErrors: ['Error 1', 'Error 2'],
      missedMessagesCount: 5,
      lastSyncTimestamp: '2023-01-01T12:00:00Z',
    });

    render(<ConnectionStatus showDetails={true} />);

    expect(screen.getByText('Connection failed')).toBeInTheDocument();
    expect(screen.getByText('再接続試行回数: 3')).toBeInTheDocument();
    expect(screen.getByText('接続エラー履歴:')).toBeInTheDocument();
    expect(screen.getByText('Error 1')).toBeInTheDocument();
    expect(screen.getByText('Error 2')).toBeInTheDocument();
    expect(screen.getByText('未同期メッセージ: 5件')).toBeInTheDocument();
  });

  it('shows retry button when disconnected and not offline', () => {
    mockUseWebSocket.mockReturnValue({
      ...defaultWebSocketState,
      connectionState: 'DISCONNECTED',
      isOffline: false,
    });

    render(<ConnectionStatus showDetails={true} />);

    const retryButton = screen.getByRole('button', { name: '再接続' });
    expect(retryButton).toBeInTheDocument();
    expect(retryButton).not.toBeDisabled();
  });

  it('disables retry button when offline', () => {
    mockUseWebSocket.mockReturnValue({
      ...defaultWebSocketState,
      connectionState: 'OFFLINE',
      isOffline: true,
    });

    render(<ConnectionStatus showDetails={true} />);

    expect(screen.getByText('ネットワーク接続を確認してください')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '再接続' })).not.toBeInTheDocument();
  });

  it('calls connect when retry button is clicked', async () => {
    const mockConnect = jest.fn();
    mockUseWebSocket.mockReturnValue({
      ...defaultWebSocketState,
      connectionState: 'DISCONNECTED',
      connect: mockConnect,
    });

    render(<ConnectionStatus showDetails={true} />);

    const retryButton = screen.getByRole('button', { name: '再接続' });
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(mockConnect).toHaveBeenCalledTimes(1);
    });
  });

  it('calls clearErrors when clear errors button is clicked', () => {
    const mockClearErrors = jest.fn();
    mockUseWebSocket.mockReturnValue({
      ...defaultWebSocketState,
      connectionErrors: ['Error 1', 'Error 2'],
      clearErrors: mockClearErrors,
    });

    render(<ConnectionStatus showDetails={true} />);

    const clearButton = screen.getByTitle('エラー履歴をクリア');
    fireEvent.click(clearButton);

    expect(mockClearErrors).toHaveBeenCalledTimes(1);
  });

  it('shows sync information when connected and has sync timestamp', () => {
    const syncTime = '2023-01-01T12:00:00Z';
    mockUseWebSocket.mockReturnValue({
      ...defaultWebSocketState,
      isConnected: true,
      connectionState: 'CONNECTED',
      lastSyncTimestamp: syncTime,
    });

    render(<ConnectionStatus showDetails={true} />);

    expect(screen.getByText(/最終同期:/)).toBeInTheDocument();
  });

  it('shows missed messages count when greater than 0', () => {
    mockUseWebSocket.mockReturnValue({
      ...defaultWebSocketState,
      missedMessagesCount: 10,
    });

    render(<ConnectionStatus showDetails={true} />);

    expect(screen.getByText('未同期メッセージ: 10件')).toBeInTheDocument();
    expect(screen.getByText('🔄')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<ConnectionStatus className="custom-class" />);

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('applies connection state as CSS class', () => {
    mockUseWebSocket.mockReturnValue({
      ...defaultWebSocketState,
      connectionState: 'CONNECTED',
    });

    const { container } = render(<ConnectionStatus />);

    expect(container.firstChild).toHaveClass('connected');
  });
});
