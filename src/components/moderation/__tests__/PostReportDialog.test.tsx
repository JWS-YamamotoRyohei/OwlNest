import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PostReportDialog } from '../PostReportDialog';
import { reportService } from '../../../services/reportService';
import { useAuth } from '../../../contexts/AuthContext';
import { PostListItem } from '../../../types/post';
import { UserRole } from '@/types/auth';
import { Stance } from '@/types/common';
import { makeAuthCtx } from '@/utils/testUtils';

// Mock dependencies
jest.mock('../../../services/reportService');
jest.mock('../../../contexts/AuthContext');

const mockReportService = reportService as jest.Mocked<typeof reportService>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

const mockPost: PostListItem = {
  postId: 'test-post-1',
  discussionId: 'test-discussion-1',
  discussionTitle: "test-disucussionTitle",
  isActive:true,
  discussionPointId: 'test-point-1',
  authorId: 'test-author',
  authorDisplayName: 'Test-Author',
  discussionPointTitle:"Test-discussionPointTitle",
  isEdited: Math.random() > 0.8,
  level:0,
  content: {
    text:'This is a test post content',
    preview: 'This is a test post content'.slice(0, 100),
    hasAttachments: 0,
    hasLinks: /(https?:\/\/[^\s]+)/g.test('This is a test post content') ? 1 : 0,
    attachmentCount: 0,
  },
  // content: {
  //   text: 'This is a test post content',
  //   preview: 'This is a test post content',
  //   formatting: {},
  //   attachments: [],
  // },
  stance:  [Stance.PROS, Stance.CONS, Stance.NEUTRAL, Stance.UNKNOWN][
    Math.floor(Math.random() * 4)
  ],
  replyCount: 2,
  statistics: {
    replyCount:2,
    likeCount: Math.floor(Math.random() * 10),
    agreeCount: Math.floor(Math.random() * 8),
    disagreeCount: Math.floor(Math.random() * 5),
    insightfulCount: Math.floor(Math.random() * 3),
    funnyCount: Math.floor(Math.random() * 2),
    viewCount: Math.floor(Math.random() * 50) + 10,
  },
  createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
  updatedAt: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
  
};

const mockUser = {
  userId: 'test-user',
  displayName: 'Test User',
  role: UserRole.VIEWER,
  email: 'test@example.com',
  givenName: 'givenName-mock',
  familyName: 'givenName-mock',
  avatarUrl: '',
  preferences: {
    notifications: {
      email: true,
      push: false,
      mentions: true,
      replies: true,
      follows: true,
    },
    privacy: {
      profileVisible: true,
      emailVisible: false,
    },
  },
  bio: 'Test user bio',
};

describe('PostReportDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue(   makeAuthCtx({
      user: mockUser,
      isAuthenticated: true,
      hasPermission: jest.fn().mockReturnValue(true),
      updateUserRole: jest.fn().mockResolvedValue(undefined),
    }));

    mockReportService.getReportCategories.mockReturnValue([
      {
        value: 'spam' as any,
        label: 'スパム・宣伝',
        description: '無関係な宣伝や繰り返し投稿',
        priority: 'medium' as any,
      },
      {
        value: 'harassment' as any,
        label: 'ハラスメント',
        description: '嫌がらせや個人攻撃',
        priority: 'high' as any,
      },
    ]);

    mockReportService.validateReportData.mockReturnValue({
      isValid: true,
      errors: [],
    });

    mockReportService.reportPost.mockResolvedValue({} as any);
  });

  it('renders report dialog when open', () => {
    render(
      <PostReportDialog
        post={mockPost}
        isOpen={true}
        onClose={jest.fn()}
        onReportSubmitted={jest.fn()}
      />
    );

    expect(screen.getByText('投稿を報告')).toBeInTheDocument();
    expect(screen.getByText('報告対象の投稿')).toBeInTheDocument();
    expect(screen.getByText('Test Author')).toBeInTheDocument();
    expect(screen.getByText('This is a test post content')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <PostReportDialog
        post={mockPost}
        isOpen={false}
        onClose={jest.fn()}
        onReportSubmitted={jest.fn()}
      />
    );

    expect(screen.queryByText('投稿を報告')).not.toBeInTheDocument();
  });

  it('shows report categories', () => {
    render(
      <PostReportDialog
        post={mockPost}
        isOpen={true}
        onClose={jest.fn()}
        onReportSubmitted={jest.fn()}
      />
    );

    expect(screen.getByText('スパム・宣伝')).toBeInTheDocument();
    expect(screen.getByText('ハラスメント')).toBeInTheDocument();
  });

  it('shows category description when selected', async () => {
    render(
      <PostReportDialog
        post={mockPost}
        isOpen={true}
        onClose={jest.fn()}
        onReportSubmitted={jest.fn()}
      />
    );

    const categorySelect = screen.getByLabelText(/報告カテゴリ/);
    fireEvent.change(categorySelect, { target: { value: 'spam' } });

    await waitFor(() => {
      expect(screen.getByText('無関係な宣伝や繰り返し投稿')).toBeInTheDocument();
    });
  });

  it('validates required fields', async () => {
    const mockOnClose = jest.fn();

    render(
      <PostReportDialog
        post={mockPost}
        isOpen={true}
        onClose={mockOnClose}
        onReportSubmitted={jest.fn()}
      />
    );

    const submitButton = screen.getByText('報告を送信');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('カテゴリと理由を入力してください。')).toBeInTheDocument();
    });

    expect(mockReportService.reportPost).not.toHaveBeenCalled();
  });

  it('submits report with valid data', async () => {
    const mockOnClose = jest.fn();
    const mockOnReportSubmitted = jest.fn();

    render(
      <PostReportDialog
        post={mockPost}
        isOpen={true}
        onClose={mockOnClose}
        onReportSubmitted={mockOnReportSubmitted}
      />
    );

    // Fill in the form
    const categorySelect = screen.getByLabelText(/報告カテゴリ/);
    fireEvent.change(categorySelect, { target: { value: 'spam' } });

    const reasonTextarea = screen.getByLabelText(/報告理由/);
    fireEvent.change(reasonTextarea, {
      target: { value: 'This is spam content that violates community guidelines' },
    });

    const submitButton = screen.getByText('報告を送信');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockReportService.reportPost).toHaveBeenCalledWith({
        postId: 'test-post-1',
        category: 'spam',
        reason: 'This is spam content that violates community guidelines',
      });
    });

    expect(mockOnReportSubmitted).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('handles submission errors', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation();

    mockReportService.reportPost.mockRejectedValue(new Error('Network error'));

    render(
      <PostReportDialog
        post={mockPost}
        isOpen={true}
        onClose={jest.fn()}
        onReportSubmitted={jest.fn()}
      />
    );

    // Fill in the form
    const categorySelect = screen.getByLabelText(/報告カテゴリ/);
    fireEvent.change(categorySelect, { target: { value: 'spam' } });

    const reasonTextarea = screen.getByLabelText(/報告理由/);
    fireEvent.change(reasonTextarea, { target: { value: 'This is spam content' } });

    const submitButton = screen.getByText('報告を送信');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });

    consoleSpy.mockRestore();
    alertSpy.mockRestore();
  });

  it('closes dialog when cancel is clicked', () => {
    const mockOnClose = jest.fn();

    render(
      <PostReportDialog
        post={mockPost}
        isOpen={true}
        onClose={mockOnClose}
        onReportSubmitted={jest.fn()}
      />
    );

    const cancelButton = screen.getByText('キャンセル');
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('shows character count for reason field', () => {
    render(
      <PostReportDialog
        post={mockPost}
        isOpen={true}
        onClose={jest.fn()}
        onReportSubmitted={jest.fn()}
      />
    );

    const reasonTextarea = screen.getByLabelText(/報告理由/);
    fireEvent.change(reasonTextarea, { target: { value: 'Test reason' } });

    expect(screen.getByText('11/500文字')).toBeInTheDocument();
  });

  it('shows guidelines section', () => {
    render(
      <PostReportDialog
        post={mockPost}
        isOpen={true}
        onClose={jest.fn()}
        onReportSubmitted={jest.fn()}
      />
    );

    expect(screen.getByText('報告に関するガイドライン')).toBeInTheDocument();
    expect(screen.getByText('虚偽の報告は禁止されています')).toBeInTheDocument();
    expect(screen.getByText('報告は匿名で処理されます')).toBeInTheDocument();
  });
});
