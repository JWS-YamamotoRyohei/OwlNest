import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PostModerationPanel } from '../PostModerationPanel';
import { PostListItem } from '../../../types/post';
import { Stance, ReactionType } from '../../../types/common';

// Mock hooks
jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      userId: 'user_1',
      displayName: 'Test User',
      role: 'admin',
    },
    hasPermission: (permission: string) => permission === 'canModerate',
  }),
}));

// Mock updated to use AuthContext

const mockPost: PostListItem = {
  postId: 'post_1',
  discussionId: 'discussion_1',
  discussionTitle: 'Test Discussion',
  discussionPointId: 'point_1',
  discussionPointTitle: 'Test Point',
  authorId: 'user_2',
  authorDisplayName: 'Post Author',
  authorAvatar: 'https://example.com/avatar.jpg',
  content: {
    text: 'This is a test post content.',
    preview: 'This is a test post content.',
    hasAttachments: false,
    hasLinks: false,
    attachmentCount: 0,
  },
  stance: Stance.PROS,
  replyToId: undefined,
  threadLevel: 0,
  reactions: {
    [ReactionType.LIKE]: 5,
    [ReactionType.AGREE]: 3,
    [ReactionType.DISAGREE]: 1,
    [ReactionType.INSIGHTFUL]: 2,
    [ReactionType.FUNNY]: 0,
    totalCount: 11,
    userReaction: undefined,
  },
  replyCount: 2,
  createdAt: '2024-01-01T10:00:00Z',
  updatedAt: '2024-01-01T10:00:00Z',
  isEdited: false,
  canEdit: false,
  canDelete: false,
  canReact: true,
  canReply: true,
};

const mockModerationHistory = [
  {
    id: 'action_1',
    postId: 'post_1',
    action: 'hide' as const,
    moderatorId: 'user_1',
    moderatorName: 'Test Moderator',
    reason: 'Inappropriate content',
    timestamp: '2024-01-01T11:00:00Z',
  },
  {
    id: 'action_2',
    postId: 'post_1',
    action: 'show' as const,
    moderatorId: 'user_1',
    moderatorName: 'Test Moderator',
    reason: '',
    timestamp: '2024-01-01T12:00:00Z',
  },
];

describe('PostModerationPanel', () => {
  const mockHandlers = {
    onHidePost: jest.fn(),
    onShowPost: jest.fn(),
    onDeletePost: jest.fn(),
    onRestorePost: jest.fn(),
    onFlagPost: jest.fn(),
    onUnflagPost: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders moderation toggle button', () => {
    render(<PostModerationPanel post={mockPost} {...mockHandlers} />);

    expect(screen.getByText('モデレーション')).toBeInTheDocument();
  });

  it('expands panel when toggle is clicked', () => {
    render(<PostModerationPanel post={mockPost} {...mockHandlers} />);

    const toggleButton = screen.getByText('モデレーション');
    fireEvent.click(toggleButton);

    expect(screen.getByText('表示制御')).toBeInTheDocument();
    expect(screen.getByText('削除・復元')).toBeInTheDocument();
    expect(screen.getByText('フラグ管理')).toBeInTheDocument();
  });

  it('shows moderation history when provided', () => {
    render(
      <PostModerationPanel
        post={mockPost}
        moderationHistory={mockModerationHistory}
        {...mockHandlers}
      />
    );

    const toggleButton = screen.getByText('モデレーション');
    fireEvent.click(toggleButton);

    expect(screen.getByText('モデレーション履歴')).toBeInTheDocument();
    expect(screen.getByText('👁️‍🗨️ 非表示')).toBeInTheDocument();
    expect(screen.getByText('👁️ 表示')).toBeInTheDocument();
  });

  it('shows post information', () => {
    render(<PostModerationPanel post={mockPost} {...mockHandlers} />);

    const toggleButton = screen.getByText('モデレーション');
    fireEvent.click(toggleButton);

    expect(screen.getByText('投稿情報')).toBeInTheDocument();
    expect(screen.getByText('Post Author')).toBeInTheDocument();
    expect(screen.getByText('pros')).toBeInTheDocument();
    expect(screen.getByText('11')).toBeInTheDocument(); // Total reactions
    expect(screen.getByText('2')).toBeInTheDocument(); // Reply count
  });

  it('opens reason dialog when hide button is clicked', () => {
    render(<PostModerationPanel post={mockPost} {...mockHandlers} />);

    const toggleButton = screen.getByText('モデレーション');
    fireEvent.click(toggleButton);

    const hideButton = screen.getByText('👁️‍🗨️ 非表示');
    fireEvent.click(hideButton);

    expect(screen.getByText('非表示の理由')).toBeInTheDocument();
    expect(screen.getByText('理由を選択してください:')).toBeInTheDocument();
  });

  it('shows predefined reason options', () => {
    render(<PostModerationPanel post={mockPost} {...mockHandlers} />);

    const toggleButton = screen.getByText('モデレーション');
    fireEvent.click(toggleButton);

    const hideButton = screen.getByText('👁️‍🗨️ 非表示');
    fireEvent.click(hideButton);

    expect(screen.getByText('スパム・宣伝')).toBeInTheDocument();
    expect(screen.getByText('不適切な内容')).toBeInTheDocument();
    expect(screen.getByText('ハラスメント')).toBeInTheDocument();
    expect(screen.getByText('誤情報・デマ')).toBeInTheDocument();
  });

  it('calls onHidePost when hide action is confirmed', async () => {
    render(<PostModerationPanel post={mockPost} {...mockHandlers} />);

    const toggleButton = screen.getByText('モデレーション');
    fireEvent.click(toggleButton);

    const hideButton = screen.getByText('👁️‍🗨️ 非表示');
    fireEvent.click(hideButton);

    // Select a reason
    const reasonButton = screen.getByText('スパム・宣伝');
    fireEvent.click(reasonButton);

    // Confirm action
    const confirmButton = screen.getByText('実行');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockHandlers.onHidePost).toHaveBeenCalledWith('post_1', 'スパム・宣伝');
    });
  });

  it('calls onShowPost when show button is clicked', async () => {
    render(<PostModerationPanel post={mockPost} {...mockHandlers} />);

    const toggleButton = screen.getByText('モデレーション');
    fireEvent.click(toggleButton);

    const showButton = screen.getByText('👁️ 表示');
    fireEvent.click(showButton);

    await waitFor(() => {
      expect(mockHandlers.onShowPost).toHaveBeenCalledWith('post_1');
    });
  });

  it('allows custom reason input', () => {
    render(<PostModerationPanel post={mockPost} {...mockHandlers} />);

    const toggleButton = screen.getByText('モデレーション');
    fireEvent.click(toggleButton);

    const flagButton = screen.getByText('🚩 フラグ');
    fireEvent.click(flagButton);

    const textarea = screen.getByPlaceholderText('詳細な理由を入力してください...');
    fireEvent.change(textarea, { target: { value: 'Custom reason for flagging' } });

    expect(textarea).toHaveValue('Custom reason for flagging');
  });

  it('disables confirm button when no reason is provided', () => {
    render(<PostModerationPanel post={mockPost} {...mockHandlers} />);

    const toggleButton = screen.getByText('モデレーション');
    fireEvent.click(toggleButton);

    const deleteButton = screen.getByText('🗑️ 削除');
    fireEvent.click(deleteButton);

    const confirmButton = screen.getByText('実行');
    expect(confirmButton).toBeDisabled();
  });

  it('closes dialog when cancel is clicked', () => {
    render(<PostModerationPanel post={mockPost} {...mockHandlers} />);

    const toggleButton = screen.getByText('モデレーション');
    fireEvent.click(toggleButton);

    const deleteButton = screen.getByText('🗑️ 削除');
    fireEvent.click(deleteButton);

    expect(screen.getByText('削除の理由')).toBeInTheDocument();

    const cancelButton = screen.getByText('キャンセル');
    fireEvent.click(cancelButton);

    expect(screen.queryByText('削除の理由')).not.toBeInTheDocument();
  });

  it('shows history count in toggle button', () => {
    render(
      <PostModerationPanel
        post={mockPost}
        moderationHistory={mockModerationHistory}
        {...mockHandlers}
      />
    );

    expect(screen.getByText('(2)')).toBeInTheDocument();
  });

  it('formats dates correctly in history', () => {
    render(
      <PostModerationPanel
        post={mockPost}
        moderationHistory={mockModerationHistory}
        {...mockHandlers}
      />
    );

    const toggleButton = screen.getByText('モデレーション');
    fireEvent.click(toggleButton);

    // Check if dates are formatted (exact format may vary by locale)
    expect(screen.getByText(/2024/)).toBeInTheDocument();
  });

  it('handles action errors gracefully', async () => {
    const mockOnHidePost = jest.fn().mockRejectedValue(new Error('Network error'));

    render(<PostModerationPanel post={mockPost} onHidePost={mockOnHidePost} {...mockHandlers} />);

    // Mock alert
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

    const toggleButton = screen.getByText('モデレーション');
    fireEvent.click(toggleButton);

    const hideButton = screen.getByText('👁️‍🗨️ 非表示');
    fireEvent.click(hideButton);

    const reasonButton = screen.getByText('スパム・宣伝');
    fireEvent.click(reasonButton);

    const confirmButton = screen.getByText('実行');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('操作に失敗しました。もう一度お試しください。');
    });

    alertSpy.mockRestore();
  });
});
