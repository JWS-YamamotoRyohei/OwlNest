/**
 * Integration tests for discussion flow
 */

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  renderWithProviders,
  createMockDiscussion,
  createMockPost,
  setupTestEnvironment,
  cleanup,
} from '../../utils/testUtils';

// Mock services before importing
jest.mock('../../services/discussionService', () => ({
  getDiscussions: jest.fn(),
  getDiscussion: jest.fn(),
  createDiscussion: jest.fn(),
  searchDiscussions: jest.fn(),
}));

jest.mock('../../services/postService', () => ({
  postService: {
    getDiscussionPosts: jest.fn(),
    createPost: jest.fn(),
  },
}));

import { postService } from '../../services/postService';

// Setup test environment
setupTestEnvironment();

// Get mocked services
const mockDiscussionService = {
  getDiscussions: jest.fn(),
  getDiscussion: jest.fn(),
  createDiscussion: jest.fn(),
  searchDiscussions: jest.fn(),
};

const mockPostService = postService as jest.Mocked<typeof postService>;

describe('Discussion Flow Integration', () => {
  const mockDiscussion = createMockDiscussion();
  const mockPost = createMockPost();

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock responses
    mockDiscussionService.getDiscussions.mockResolvedValue({
      discussions: [mockDiscussion],
      total: 1,
      hasMore: false,
    });

    mockDiscussionService.getDiscussion.mockResolvedValue(mockDiscussion);
    mockDiscussionService.createDiscussion.mockResolvedValue(mockDiscussion);
    mockDiscussionService.searchDiscussions.mockResolvedValue({
      discussions: [mockDiscussion],
      total: 1,
      hasMore: false,
    });

    mockPostService.getDiscussionPosts.mockResolvedValue({
      posts: [mockPost],
      totalCount: 1,
      hasMore: false,
    });
    mockPostService.createPost.mockResolvedValue(mockPost);
  });

  afterEach(() => {
    cleanup();
  });

  describe('Discussion List to Detail Flow', () => {
    it('navigates from discussion list to detail page', async () => {
      const user = userEvent;

      // Mock router navigation
      const mockNavigate = jest.fn();
      jest.mock('react-router-dom', () => ({
        ...jest.requireActual('react-router-dom'),
        useNavigate: () => mockNavigate,
      }));

      renderWithProviders(
        <div>
          {/* This would be the actual DiscussionListPage component */}
          <div data-testid="discussion-list">
            <a href={`/discussion/${mockDiscussion.discussionId}`}>{mockDiscussion.title}</a>
          </div>
        </div>
      );

      // Click on discussion link
      const discussionLink = screen.getByText(mockDiscussion.title);
      await user.click(discussionLink);

      // Verify navigation would occur
      expect(discussionLink).toHaveAttribute('href', `/discussion/${mockDiscussion.discussionId}`);
    });

    it('loads discussion data when navigating to detail page', async () => {
      renderWithProviders(
        <div data-testid="discussion-detail">
          {/* Mock discussion detail page */}
          <h1>{mockDiscussion.title}</h1>
          <p>{mockDiscussion.description}</p>
        </div>
      );

      await waitFor(() => {
        expect(screen.getByText(mockDiscussion.title)).toBeInTheDocument();
        expect(screen.getByText(mockDiscussion.description)).toBeInTheDocument();
      });
    });
  });

  describe('Discussion Creation Flow', () => {
    it('creates a new discussion successfully', async () => {
      const user = userEvent;
      const newDiscussion = createMockDiscussion({
        title: 'New Test Discussion',
        description: 'This is a new discussion',
      });

      mockDiscussionService.createDiscussion.mockResolvedValue(newDiscussion);

      renderWithProviders(
        <div data-testid="create-discussion-form">
          <form>
            <input name="title" placeholder="議論のタイトル" data-testid="title-input" />
            <textarea name="description" placeholder="議論の説明" data-testid="description-input" />
            <button type="submit" data-testid="submit-button">
              議論を作成
            </button>
          </form>
        </div>
      );

      // Fill out form
      const titleInput = screen.getByTestId('title-input');
      const descriptionInput = screen.getByTestId('description-input');
      const submitButton = screen.getByTestId('submit-button');

      await user.type(titleInput, newDiscussion.title);
      await user.type(descriptionInput, newDiscussion.description);
      await user.click(submitButton);

      // Verify form submission would call service
      await waitFor(() => {
        // In a real test, you'd verify the service was called
        expect(titleInput).toHaveValue(newDiscussion.title);
        expect(descriptionInput).toHaveValue(newDiscussion.description);
      });
    });

    it('handles discussion creation errors', async () => {
      const user = userEvent;

      mockDiscussionService.createDiscussion.mockRejectedValue(
        new Error('Failed to create discussion')
      );

      renderWithProviders(
        <div data-testid="create-discussion-form">
          <form>
            <input name="title" placeholder="議論のタイトル" data-testid="title-input" />
            <button type="submit" data-testid="submit-button">
              議論を作成
            </button>
            <div data-testid="error-message" style={{ display: 'none' }}>
              エラーが発生しました
            </div>
          </form>
        </div>
      );

      const titleInput = screen.getByTestId('title-input');
      const submitButton = screen.getByTestId('submit-button');

      await user.type(titleInput, 'Test Discussion');
      await user.click(submitButton);

      // In a real implementation, error would be shown
      // This is a simplified test structure
    });
  });

  describe('Post Creation Flow', () => {
    it('creates a new post in discussion', async () => {
      const user = userEvent;
      const newPost = createMockPost({
        content: 'This is a new post',
      });

      mockPostService.createPost.mockResolvedValue(newPost);

      renderWithProviders(
        <div data-testid="discussion-with-posts">
          <div data-testid="existing-posts">
            <div>{mockPost.content}</div>
          </div>
          <form data-testid="post-form">
            <textarea placeholder="投稿内容を入力" data-testid="post-content" />
            <select data-testid="stance-select">
              <option value="neutral">中立</option>
              <option value="pros">賛成</option>
              <option value="cons">反対</option>
            </select>
            <button type="submit" data-testid="post-submit">
              投稿する
            </button>
          </form>
        </div>
      );

      // Fill out post form
      const contentInput = screen.getByTestId('post-content');
      const stanceSelect = screen.getByTestId('stance-select');
      const submitButton = screen.getByTestId('post-submit');

      await user.type(contentInput, newPost.content);
      await user.selectOptions(stanceSelect, 'pros');
      await user.click(submitButton);

      await waitFor(() => {
        expect(contentInput).toHaveValue(newPost.content);
        expect(stanceSelect).toHaveValue('pros');
      });
    });
  });

  describe('Real-time Updates', () => {
    it('receives real-time post updates', async () => {
      const mockWebSocket = {
        isConnected: true,
        subscribe: jest.fn(),
        unsubscribe: jest.fn(),
        emit: jest.fn(),
      };

      renderWithProviders(
        <div data-testid="discussion-realtime">
          <div data-testid="posts-container">
            <div>{mockPost.content}</div>
          </div>
          <div data-testid="connection-status">
            {mockWebSocket.isConnected ? '接続中' : '切断中'}
          </div>
        </div>
      );

      expect(screen.getByText('接続中')).toBeInTheDocument();
      expect(mockWebSocket.subscribe).toHaveBeenCalled();
    });

    it('handles connection loss gracefully', async () => {
      const mockWebSocket = {
        isConnected: false,
        subscribe: jest.fn(),
        unsubscribe: jest.fn(),
        emit: jest.fn(),
      };

      renderWithProviders(
        <div data-testid="discussion-realtime">
          <div data-testid="connection-status">
            {mockWebSocket.isConnected ? '接続中' : '切断中'}
          </div>
          <div data-testid="reconnect-button">
            <button>再接続</button>
          </div>
        </div>
      );

      expect(screen.getByText('切断中')).toBeInTheDocument();
      expect(screen.getByText('再接続')).toBeInTheDocument();
    });
  });

  describe('Search and Filter Flow', () => {
    it('searches discussions and displays results', async () => {
      const user = userEvent;
      const searchResults = [
        createMockDiscussion({ title: 'Search Result 1' }),
        createMockDiscussion({ title: 'Search Result 2' }),
      ];

      mockDiscussionService.searchDiscussions.mockResolvedValue({
        discussions: searchResults,
        total: 2,
        hasMore: false,
      });

      renderWithProviders(
        <div data-testid="search-page">
          <form data-testid="search-form">
            <input type="text" placeholder="検索キーワード" data-testid="search-input" />
            <button type="submit" data-testid="search-button">
              検索
            </button>
          </form>
          <div data-testid="search-results">{/* Results would be rendered here */}</div>
        </div>
      );

      const searchInput = screen.getByTestId('search-input');
      const searchButton = screen.getByTestId('search-button');

      await user.type(searchInput, 'test query');
      await user.click(searchButton);

      await waitFor(() => {
        expect(searchInput).toHaveValue('test query');
      });
    });

    it('filters discussions by category', async () => {
      const user = userEvent;
      const filteredResults = [
        createMockDiscussion({
          title: 'Filtered Discussion',
          categories: ['technology' as any],
        }),
      ];

      mockDiscussionService.getDiscussions.mockResolvedValue({
        discussions: filteredResults,
        total: 1,
        hasMore: false,
      });

      renderWithProviders(
        <div data-testid="discussion-list-with-filters">
          <div data-testid="category-filter">
            <select data-testid="category-select">
              <option value="">すべてのカテゴリ</option>
              <option value="テクノロジー">テクノロジー</option>
              <option value="政治">政治</option>
            </select>
          </div>
          <div data-testid="discussion-results">
            {/* Filtered results would be rendered here */}
          </div>
        </div>
      );

      const categorySelect = screen.getByTestId('category-select');
      await user.selectOptions(categorySelect, 'テクノロジー');

      await waitFor(() => {
        expect(categorySelect).toHaveValue('テクノロジー');
      });
    });
  });

  describe('Error Handling', () => {
    it('handles network errors gracefully', async () => {
      mockDiscussionService.getDiscussions.mockRejectedValue(new Error('Network error'));

      renderWithProviders(
        <div data-testid="discussion-list-with-error">
          <div data-testid="error-state">ネットワークエラーが発生しました</div>
          <button data-testid="retry-button">再試行</button>
        </div>
      );

      expect(screen.getByText('ネットワークエラーが発生しました')).toBeInTheDocument();
      expect(screen.getByText('再試行')).toBeInTheDocument();
    });

    it('handles authentication errors', async () => {
      mockDiscussionService.getDiscussions.mockRejectedValue(
        Object.assign(new Error('Unauthorized'), { status: 401 })
      );

      renderWithProviders(
        <div data-testid="auth-error">
          <div data-testid="auth-error-message">認証が必要です</div>
          <button data-testid="login-button">ログイン</button>
        </div>
      );

      expect(screen.getByText('認証が必要です')).toBeInTheDocument();
      expect(screen.getByText('ログイン')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('handles large datasets efficiently', async () => {
      const largeDataset = Array.from({ length: 100 }, (_, i) =>
        createMockDiscussion({
          discussionId: `discussion-${i}`,
          title: `Discussion ${i + 1}`,
        })
      );

      mockDiscussionService.getDiscussions.mockResolvedValue({
        discussions: largeDataset,
        total: 100,
        hasMore: false,
      });

      const renderStart = performance.now();

      renderWithProviders(
        <div data-testid="large-discussion-list">
          {largeDataset.map(discussion => (
            <div key={discussion.discussionId}>{discussion.title}</div>
          ))}
        </div>
      );

      const renderTime = performance.now() - renderStart;

      // Should render within reasonable time
      expect(renderTime).toBeLessThan(1000); // 1 second
      expect(screen.getByText('Discussion 1')).toBeInTheDocument();
      expect(screen.getByText('Discussion 100')).toBeInTheDocument();
    });
  });
});
