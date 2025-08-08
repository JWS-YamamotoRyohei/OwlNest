import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PostCreationForm } from '../PostCreationForm';
import { CreatePostData } from '../../../types/post';
import { Stance } from '../../../types/common';
import { generateMockDiscussionPoints } from '../../../utils/testDataFactory';

// Mock the child components
jest.mock('../RichTextEditor', () => ({
  RichTextEditor: ({ value, onChange, error }: any) => (
    <div data-testid="rich-text-editor">
      <textarea
        value={value}
        onChange={e => onChange(e.target.value, {})}
        data-testid="content-textarea"
        placeholder="あなたの意見を入力してください..."
      />
      {error && <div data-testid="content-error">{error}</div>}
    </div>
  ),
}));

jest.mock('../StanceSelector', () => ({
  StanceSelector: ({ value, onChange, error }: any) => (
    <div data-testid="stance-selector">
      <select value={value} onChange={e => onChange(e.target.value)} data-testid="stance-select">
        <option value="pros">賛成</option>
        <option value="cons">反対</option>
        <option value="neutral">中立</option>
        <option value="unknown">わからない</option>
        <option value="hidden">非表示</option>
      </select>
      {error && <div data-testid="stance-error">{error}</div>}
    </div>
  ),
}));

jest.mock('../DiscussionPointSelector', () => ({
  DiscussionPointSelector: ({ selectedPointId, onChange, error }: any) => (
    <div data-testid="discussion-point-selector">
      <select
        value={selectedPointId}
        onChange={e => onChange(e.target.value)}
        data-testid="point-select"
      >
        <option value="">論点を選択</option>
        <option value="point_1">基本的な考え方について</option>
        <option value="point_2">具体的な実装方法</option>
      </select>
      {error && <div data-testid="point-error">{error}</div>}
    </div>
  ),
}));

describe('PostCreationForm', () => {
  const mockDiscussionId = 'discussion_123';
  const mockCurrentUserId = 'user_456';
  const mockDiscussionPoints = generateMockDiscussionPoints(mockDiscussionId);
  const mockOnSubmit = jest.fn();
  const mockOnCancel = jest.fn();

  const defaultProps = {
    discussionId: mockDiscussionId,
    discussionPoints: mockDiscussionPoints,
    onSubmit: mockOnSubmit,
    onCancel: mockOnCancel,
    currentUserId: mockCurrentUserId,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the form with all required fields', () => {
    render(<PostCreationForm {...defaultProps} />);

    expect(screen.getByText('新しい投稿を作成')).toBeInTheDocument();
    expect(screen.getByTestId('discussion-point-selector')).toBeInTheDocument();
    expect(screen.getByTestId('rich-text-editor')).toBeInTheDocument();
    expect(screen.getByTestId('stance-selector')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'キャンセル' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '投稿する' })).toBeInTheDocument();
  });

  it('shows reply title when replyToId is provided', () => {
    render(<PostCreationForm {...defaultProps} replyToId="post_123" />);

    expect(screen.getByText('返信を投稿')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '返信する' })).toBeInTheDocument();
  });

  it('sets default stance from userLastStance prop', () => {
    render(<PostCreationForm {...defaultProps} userLastStance={Stance.PROS} />);

    const stanceSelect = screen.getByTestId('stance-select');
    expect(stanceSelect).toHaveValue('pros');
  });

  it('sets default point from defaultPointId prop', () => {
    render(<PostCreationForm {...defaultProps} defaultPointId="point_1" />);

    const pointSelect = screen.getByTestId('point-select');
    expect(pointSelect).toHaveValue('point_1');
  });

  it('validates required fields on submit', async () => {
    render(<PostCreationForm {...defaultProps} />);

    const submitButton = screen.getByRole('button', { name: '投稿する' });
    userEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByTestId('point-error')).toHaveTextContent('論点を選択してください');
      expect(screen.getByTestId('content-error')).toHaveTextContent('意見を入力してください');
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('validates minimum content length', async () => {
    render(<PostCreationForm {...defaultProps} />);

    // Fill in required fields with short content
    const pointSelect = screen.getByTestId('point-select');
    const contentTextarea = screen.getByTestId('content-textarea');
    const submitButton = screen.getByRole('button', { name: '投稿する' });

    userEvent.selectOptions(pointSelect, 'point_1');
    userEvent.type(contentTextarea, '短い');
    userEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByTestId('content-error')).toHaveTextContent(
        '意見は10文字以上で入力してください'
      );
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('validates maximum content length', async () => {
    render(<PostCreationForm {...defaultProps} />);

    const pointSelect = screen.getByTestId('point-select');
    const contentTextarea = screen.getByTestId('content-textarea');
    const submitButton = screen.getByRole('button', { name: '投稿する' });

    userEvent.selectOptions(pointSelect, 'point_1');
    userEvent.type(contentTextarea, 'a'.repeat(5001));
    userEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByTestId('content-error')).toHaveTextContent(
        '意見は5000文字以内で入力してください'
      );
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('submits form with valid data', async () => {
    mockOnSubmit.mockResolvedValue(undefined);

    render(<PostCreationForm {...defaultProps} />);

    const pointSelect = screen.getByTestId('point-select');
    const contentTextarea = screen.getByTestId('content-textarea');
    const stanceSelect = screen.getByTestId('stance-select');
    const submitButton = screen.getByRole('button', { name: '投稿する' });

    userEvent.selectOptions(pointSelect, 'point_1');
    userEvent.type(contentTextarea, 'これは有効な投稿内容です。十分な長さがあります。');
    userEvent.selectOptions(stanceSelect, 'pros');
    userEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        discussionId: mockDiscussionId,
        discussionPointId: 'point_1',
        content: {
          text: 'これは有効な投稿内容です。十分な長さがあります。',
          formatting: {},
          attachments: [],
        },
        stance: Stance.PROS,
        replyToId: undefined,
      });
    });
  });

  it('includes replyToId in submission when provided', async () => {
    mockOnSubmit.mockResolvedValue(undefined);

    render(<PostCreationForm {...defaultProps} replyToId="post_123" />);

    const pointSelect = screen.getByTestId('point-select');
    const contentTextarea = screen.getByTestId('content-textarea');
    const submitButton = screen.getByRole('button', { name: '返信する' });

    userEvent.selectOptions(pointSelect, 'point_1');
    userEvent.type(contentTextarea, 'これは返信の内容です。十分な長さがあります。');
    userEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          replyToId: 'post_123',
        })
      );
    });
  });

  it('calls onCancel when cancel button is clicked', async () => {
    render(<PostCreationForm {...defaultProps} />);

    const cancelButton = screen.getByRole('button', { name: 'キャンセル' });
    userEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('disables submit button when form is invalid', () => {
    render(<PostCreationForm {...defaultProps} />);

    const submitButton = screen.getByRole('button', { name: '投稿する' });
    expect(submitButton).toBeDisabled();
  });

  it('shows loading state when submitting', async () => {
    render(<PostCreationForm {...defaultProps} isSubmitting={true} />);

    expect(screen.getByText('投稿中...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '投稿中...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'キャンセル' })).toBeDisabled();
  });

  it('shows character count', async () => {
    render(<PostCreationForm {...defaultProps} />);

    const contentTextarea = screen.getByTestId('content-textarea');
    userEvent.type(contentTextarea, 'テスト内容');

    expect(screen.getByText('5 / 5000文字')).toBeInTheDocument();
  });

  it('clears errors when user starts typing', async () => {
    render(<PostCreationForm {...defaultProps} />);

    // First trigger validation errors
    const submitButton = screen.getByRole('button', { name: '投稿する' });
    userEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByTestId('content-error')).toBeInTheDocument();
    });

    // Then start typing to clear the error
    const contentTextarea = screen.getByTestId('content-textarea');
    userEvent.type(contentTextarea, 'テスト');

    await waitFor(() => {
      expect(screen.queryByTestId('content-error')).not.toBeInTheDocument();
    });
  });

  it('handles submission errors gracefully', async () => {
    const error = new Error('Submission failed');
    mockOnSubmit.mockRejectedValue(error);

    render(<PostCreationForm {...defaultProps} />);

    const pointSelect = screen.getByTestId('point-select');
    const contentTextarea = screen.getByTestId('content-textarea');
    const submitButton = screen.getByRole('button', { name: '投稿する' });

    userEvent.selectOptions(pointSelect, 'point_1');
    userEvent.type(contentTextarea, 'これは有効な投稿内容です。十分な長さがあります。');
    userEvent.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText('投稿の作成に失敗しました。もう一度お試しください。')
      ).toBeInTheDocument();
    });
  });
});
