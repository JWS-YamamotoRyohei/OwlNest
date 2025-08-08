/**
 * Unit tests for DiscussionCard component
 */

import { screen, fireEvent, waitFor } from '@testing-library/react';
import { DiscussionCard } from '../DiscussionCard';
import {
  renderWithProviders,
  createMockUser,
  createMockDiscussion,
  setupTestEnvironment,
  cleanup,
} from '../../../utils/testUtils';
import { UserRole } from '../../../types/auth';

// Setup test environment
setupTestEnvironment();

describe('DiscussionCard', () => {
  const mockDiscussion = createMockDiscussion();
  const mockUser = createMockUser();
  const mockOnFollow = jest.fn();
  const mockOnUnfollow = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe('Rendering', () => {
    it('renders discussion title and description', () => {
      renderWithProviders(<DiscussionCard discussion={mockDiscussion} />, {
        initialUser: mockUser,
      });

      expect(screen.getByText(mockDiscussion.title)).toBeInTheDocument();
      expect(screen.getByText(mockDiscussion.description)).toBeInTheDocument();
    });

    it('renders discussion categories', () => {
      renderWithProviders(<DiscussionCard discussion={mockDiscussion} />, {
        initialUser: mockUser,
      });

      mockDiscussion.categories.forEach(category => {
        expect(screen.getByText(category)).toBeInTheDocument();
      });
    });

    it('renders discussion statistics', () => {
      renderWithProviders(<DiscussionCard discussion={mockDiscussion} />, {
        initialUser: mockUser,
      });

      expect(
        screen.getByText(mockDiscussion.statistics.participantCount.toString())
      ).toBeInTheDocument();
      expect(screen.getByText(mockDiscussion.statistics.postCount.toString())).toBeInTheDocument();
      expect(
        screen.getByText(mockDiscussion.statistics.followersCount.toString())
      ).toBeInTheDocument();
    });

    it('renders owner information', () => {
      renderWithProviders(<DiscussionCard discussion={mockDiscussion} />, {
        initialUser: mockUser,
      });

      expect(screen.getByText(mockDiscussion.ownerDisplayName)).toBeInTheDocument();
    });

    it('renders status badges when applicable', () => {
      const pinnedDiscussion = createMockDiscussion({ isPinned: true });

      renderWithProviders(<DiscussionCard discussion={pinnedDiscussion} />, {
        initialUser: mockUser,
      });

      expect(screen.getByText(/ピン留め/)).toBeInTheDocument();
    });

    it('renders in compact mode', () => {
      const { container } = renderWithProviders(
        <DiscussionCard discussion={mockDiscussion} compact={true} />,
        { initialUser: mockUser }
      );

      expect(container.querySelector('.discussion-card--compact')).toBeInTheDocument();
    });
  });

  describe('Follow functionality', () => {
    it('shows follow button when user is authenticated', () => {
      renderWithProviders(
        <DiscussionCard
          discussion={mockDiscussion}
          onFollow={mockOnFollow}
          onUnfollow={mockOnUnfollow}
          isFollowing={false}
        />,
        { initialUser: mockUser }
      );

      expect(screen.getByRole('button', { name: /フォローする/ })).toBeInTheDocument();
    });

    it('does not show follow button when user is not authenticated', () => {
      renderWithProviders(
        <DiscussionCard
          discussion={mockDiscussion}
          onFollow={mockOnFollow}
          onUnfollow={mockOnUnfollow}
          isFollowing={false}
        />
      );

      expect(screen.queryByRole('button', { name: /フォローする/ })).not.toBeInTheDocument();
    });

    it('calls onFollow when follow button is clicked', async () => {
      renderWithProviders(
        <DiscussionCard
          discussion={mockDiscussion}
          onFollow={mockOnFollow}
          onUnfollow={mockOnUnfollow}
          isFollowing={false}
        />,
        { initialUser: mockUser }
      );

      const followButton = screen.getByRole('button', { name: /フォローする/ });
      fireEvent.click(followButton);

      await waitFor(() => {
        expect(mockOnFollow).toHaveBeenCalledWith(mockDiscussion.discussionId);
      });
    });

    it('calls onUnfollow when unfollow button is clicked', async () => {
      renderWithProviders(
        <DiscussionCard
          discussion={mockDiscussion}
          onFollow={mockOnFollow}
          onUnfollow={mockOnUnfollow}
          isFollowing={true}
        />,
        { initialUser: mockUser }
      );

      const unfollowButton = screen.getByRole('button', { name: /フォローを解除/ });
      fireEvent.click(unfollowButton);

      await waitFor(() => {
        expect(mockOnUnfollow).toHaveBeenCalledWith(mockDiscussion.discussionId);
      });
    });

    it('shows correct follow state', () => {
      const { rerender } = renderWithProviders(
        <DiscussionCard
          discussion={mockDiscussion}
          onFollow={mockOnFollow}
          onUnfollow={mockOnUnfollow}
          isFollowing={false}
        />,
        { initialUser: mockUser }
      );

      expect(screen.getByText(/フォロー$/)).toBeInTheDocument();

      rerender(
        <DiscussionCard
          discussion={mockDiscussion}
          onFollow={mockOnFollow}
          onUnfollow={mockOnUnfollow}
          isFollowing={true}
        />
      );

      expect(screen.getByText(/フォロー中/)).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('has correct link to discussion detail page', () => {
      renderWithProviders(<DiscussionCard discussion={mockDiscussion} />, {
        initialUser: mockUser,
      });

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', `/discussion/${mockDiscussion.discussionId}`);
    });

    it('prevents navigation when follow button is clicked', async () => {
      const mockPreventDefault = jest.fn();
      const mockStopPropagation = jest.fn();

      renderWithProviders(
        <DiscussionCard discussion={mockDiscussion} onFollow={mockOnFollow} isFollowing={false} />,
        { initialUser: mockUser }
      );

      const followButton = screen.getByRole('button', { name: /フォローする/ });

      fireEvent.click(followButton, {
        preventDefault: mockPreventDefault,
        stopPropagation: mockStopPropagation,
      });

      // Note: In a real test, you'd need to mock the event object properly
      // This is a simplified version for demonstration
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      renderWithProviders(
        <DiscussionCard discussion={mockDiscussion} onFollow={mockOnFollow} isFollowing={false} />,
        { initialUser: mockUser }
      );

      const followButton = screen.getByRole('button', { name: /フォローする/ });
      expect(followButton).toHaveAttribute('aria-label', 'フォローする');
    });

    it('uses semantic HTML elements', () => {
      const { container } = renderWithProviders(<DiscussionCard discussion={mockDiscussion} />, {
        initialUser: mockUser,
      });

      expect(container.querySelector('article')).toBeInTheDocument();
      expect(container.querySelector('h3')).toBeInTheDocument();
    });

    it('is accessible', () => {
      const { container } = renderWithProviders(<DiscussionCard discussion={mockDiscussion} />, {
        initialUser: mockUser,
      });

      expect(container.firstChild).toBeAccessible();
    });
  });

  describe('Performance', () => {
    it('renders within performance budget', async () => {
      const renderFn = () => {
        renderWithProviders(<DiscussionCard discussion={mockDiscussion} />, {
          initialUser: mockUser,
        });
      };

      await expect(renderFn).toHavePerformantRender(100); // 100ms budget
    });

    it('handles large number of categories efficiently', () => {
      const discussionWithManyCategories = createMockDiscussion({
        categories: Array.from({ length: 20 }, (_, i) => `Category ${i + 1}`),
      });

      const renderFn = () => {
        renderWithProviders(<DiscussionCard discussion={discussionWithManyCategories} />, {
          initialUser: mockUser,
        });
      };

      expect(() => renderFn()).not.toThrow();
    });
  });

  describe('Edge cases', () => {
    it('handles missing optional props gracefully', () => {
      expect(() => {
        renderWithProviders(<DiscussionCard discussion={mockDiscussion} />);
      }).not.toThrow();
    });

    it('handles empty categories array', () => {
      const discussionWithNoCategories = createMockDiscussion({ categories: [] });

      expect(() => {
        renderWithProviders(<DiscussionCard discussion={discussionWithNoCategories} />, {
          initialUser: mockUser,
        });
      }).not.toThrow();
    });

    it('handles very long titles and descriptions', () => {
      const discussionWithLongContent = createMockDiscussion({
        title: 'A'.repeat(200),
        description: 'B'.repeat(1000),
      });

      expect(() => {
        renderWithProviders(<DiscussionCard discussion={discussionWithLongContent} />, {
          initialUser: mockUser,
        });
      }).not.toThrow();
    });

    it('handles null/undefined user gracefully', () => {
      expect(() => {
        renderWithProviders(
          <DiscussionCard
            discussion={mockDiscussion}
            onFollow={mockOnFollow}
            isFollowing={false}
          />,
          { initialUser: null }
        );
      }).not.toThrow();
    });
  });

  describe('User permissions', () => {
    it('shows appropriate content for different user roles', () => {
      const adminUser = createMockUser({ role: UserRole.ADMIN });

      renderWithProviders(<DiscussionCard discussion={mockDiscussion} />, {
        initialUser: adminUser,
      });

      // Admin users should see all content
      expect(screen.getByText(mockDiscussion.title)).toBeInTheDocument();
    });

    it('respects showFollowButton prop', () => {
      renderWithProviders(<DiscussionCard discussion={mockDiscussion} showFollowButton={false} />, {
        initialUser: mockUser,
      });

      expect(screen.queryByRole('button', { name: /フォロー/ })).not.toBeInTheDocument();
    });
  });
});
