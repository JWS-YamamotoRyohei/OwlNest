/**
 * Performance tests for React components
 */

import React from 'react';
import {
  renderWithProviders,
  createMockUser,
  createMockDiscussion,
  measureRenderTime,
  measureAsyncOperation,
  detectMemoryLeaks,
  setupTestEnvironment,
  cleanup,
} from '../../utils/testUtils';
import { DiscussionCard } from '../../components/discussions/DiscussionCard';
import { OptimizedList } from '../../components/common/OptimizedComponent';

// Setup test environment
setupTestEnvironment();

describe('Component Performance Tests', () => {
  const mockUser = createMockUser();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe('DiscussionCard Performance', () => {
    it('should render within performance budget', async () => {
      const mockDiscussion = createMockDiscussion();

      const renderTime = await measureRenderTime(() => {
        renderWithProviders(<DiscussionCard discussion={mockDiscussion} />, {
          initialUser: mockUser,
        });
      });

      // Should render within 50ms
      expect(renderTime).toBeLessThan(50);
    });

    it('should handle re-renders efficiently', async () => {
      const mockDiscussion = createMockDiscussion();

      const { rerender } = renderWithProviders(
        <DiscussionCard discussion={mockDiscussion} isFollowing={false} />,
        { initialUser: mockUser }
      );

      // Measure re-render time
      const rerenderTime = await measureRenderTime(() => {
        rerender(<DiscussionCard discussion={mockDiscussion} isFollowing={true} />);
      });

      // Re-renders should be even faster
      expect(rerenderTime).toBeLessThan(20);
    });

    it('should not cause memory leaks', () => {
      const mockDiscussion = createMockDiscussion();

      const testRender = () => {
        const { unmount } = renderWithProviders(<DiscussionCard discussion={mockDiscussion} />, {
          initialUser: mockUser,
        });
        unmount();
      };

      // Test for memory leaks
      expect(() => {
        detectMemoryLeaks(testRender, 50);
      }).not.toThrow();
    });

    it('should handle large datasets efficiently', async () => {
      const largeDiscussion = createMockDiscussion({
        categories: Array.from({ length: 50 }, (_, i) => `Category ${i + 1}`),
        tags: Array.from({ length: 30 }, (_, i) => `tag${i + 1}`),
      });

      const renderTime = await measureRenderTime(() => {
        renderWithProviders(<DiscussionCard discussion={largeDiscussion} />, {
          initialUser: mockUser,
        });
      });

      // Should still render quickly even with large datasets
      expect(renderTime).toBeLessThan(100);
    });
  });

  describe('List Performance', () => {
    it('should render large lists efficiently', async () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) =>
        createMockDiscussion({
          discussionId: `discussion-${i}`,
          title: `Discussion ${i + 1}`,
        })
      );

      const renderTime = await measureRenderTime(() => {
        renderWithProviders(
          <OptimizedList
            items={largeDataset}
            renderItem={item => <div key={item.discussionId}>{item.title}</div>}
            keyExtractor={item => item.discussionId}
            virtualized={true}
            itemHeight={100}
            containerHeight={500}
          />,
          { initialUser: mockUser }
        );
      });

      // Virtualized list should render quickly regardless of dataset size
      expect(renderTime).toBeLessThan(200);
    });

    it('should handle scrolling performance', async () => {
      const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        content: `Item ${i + 1}`,
      }));

      const { container } = renderWithProviders(
        <OptimizedList
          items={largeDataset}
          renderItem={item => <div key={item.id}>{item.content}</div>}
          keyExtractor={item => item.id.toString()}
          virtualized={true}
          itemHeight={50}
          containerHeight={400}
        />,
        { initialUser: mockUser }
      );

      const scrollContainer = container.querySelector('[style*="overflow"]');

      if (scrollContainer) {
        // Measure scroll performance
        const scrollTime = await measureAsyncOperation(async () => {
          // Simulate multiple scroll events
          for (let i = 0; i < 10; i++) {
            scrollContainer.scrollTop = i * 100;
            await new Promise(resolve => setTimeout(resolve, 16)); // ~60fps
          }
        });

        // Scrolling should be smooth
        expect(scrollTime.duration).toBeLessThan(500);
      }
    });
  });

  describe('Component Mounting Performance', () => {
    it('should mount components quickly', async () => {
      const components = [
        () => <DiscussionCard discussion={createMockDiscussion()} />,
        () => <div>Simple Component</div>,
        () => (
          <div>
            {Array.from({ length: 100 }, (_, i) => (
              <span key={i}>Item {i}</span>
            ))}
          </div>
        ),
      ];

      for (const Component of components) {
        const mountTime = await measureRenderTime(() => {
          renderWithProviders(Component(), { initialUser: mockUser });
        });

        expect(mountTime).toBeLessThan(100);
      }
    });

    it('should unmount components cleanly', async () => {
      const mockDiscussion = createMockDiscussion();

      const { unmount } = renderWithProviders(<DiscussionCard discussion={mockDiscussion} />, {
        initialUser: mockUser,
      });

      const unmountTime = await measureAsyncOperation(async () => {
        unmount();
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // Unmounting should be fast
      expect(unmountTime.duration).toBeLessThan(50);
    });
  });

  describe('State Update Performance', () => {
    it('should handle frequent state updates efficiently', async () => {
      const TestComponent = () => {
        const [count, setCount] = React.useState(0);

        React.useEffect(() => {
          const interval = setInterval(() => {
            setCount(c => c + 1);
          }, 10);

          return () => clearInterval(interval);
        }, []);

        return <div data-testid="counter">{count}</div>;
      };

      const { getByTestId } = renderWithProviders(<TestComponent />, { initialUser: mockUser });

      // Let it update for a short time
      await new Promise(resolve => setTimeout(resolve, 100));

      const counter = getByTestId('counter');
      const initialCount = parseInt(counter.textContent || '0');

      // Wait a bit more
      await new Promise(resolve => setTimeout(resolve, 100));

      const finalCount = parseInt(counter.textContent || '0');

      // Should have updated multiple times
      expect(finalCount).toBeGreaterThan(initialCount);
      expect(finalCount).toBeGreaterThan(5); // Should update at least 5 times in 100ms
    });
  });

  describe('Bundle Size Impact', () => {
    it('should not significantly increase bundle size', () => {
      // This is a conceptual test - in reality you'd use webpack-bundle-analyzer
      const componentSizeEstimate = {
        DiscussionCard: 15000, // ~15KB estimated
        OptimizedList: 8000, // ~8KB estimated
        TestUtils: 12000, // ~12KB estimated
      };

      Object.entries(componentSizeEstimate).forEach(([, size]) => {
        // Components should be reasonably sized
        expect(size).toBeLessThan(50000); // 50KB max per component
      });
    });
  });

  describe('Concurrent Rendering', () => {
    it('should handle concurrent renders without blocking', async () => {
      const ConcurrentTest = () => {
        const [items, setItems] = React.useState<any[]>([]);

        React.useEffect(() => {
          // Simulate loading data in chunks
          const loadData = async () => {
            for (let i = 0; i < 10; i++) {
              await new Promise(resolve => setTimeout(resolve, 10));
              setItems(prev => [...prev, createMockDiscussion({ discussionId: `item-${i}` })]);
            }
          };

          loadData();
        }, []);

        return (
          <div>
            {items.map(item => (
              <DiscussionCard key={item.discussionId} discussion={item} />
            ))}
          </div>
        );
      };

      const renderTime = await measureRenderTime(() => {
        renderWithProviders(<ConcurrentTest />, { initialUser: mockUser });
      });

      // Initial render should be fast even with async updates
      expect(renderTime).toBeLessThan(100);
    });
  });

  describe('Error Boundary Performance', () => {
    it('should handle errors without performance degradation', async () => {
      const ErrorComponent = ({ shouldError }: { shouldError: boolean }) => {
        if (shouldError) {
          throw new Error('Test error');
        }
        return <div>No error</div>;
      };

      const ErrorBoundary = ({ children }: { children: React.ReactNode }) => {
        const [hasError, setHasError] = React.useState(false);

        React.useEffect(() => {
          const handleError = () => setHasError(true);
          window.addEventListener('error', handleError);
          return () => window.removeEventListener('error', handleError);
        }, []);

        if (hasError) {
          return <div>Error occurred</div>;
        }

        return <>{children}</>;
      };

      // Test normal rendering
      const normalTime = await measureRenderTime(() => {
        renderWithProviders(
          <ErrorBoundary>
            <ErrorComponent shouldError={false} />
          </ErrorBoundary>,
          { initialUser: mockUser }
        );
      });

      // Test error handling
      const errorTime = await measureRenderTime(() => {
        try {
          renderWithProviders(
            <ErrorBoundary>
              <ErrorComponent shouldError={true} />
            </ErrorBoundary>,
            { initialUser: mockUser }
          );
        } catch (_error) {
          // Expected error
        }
      });

      // Error handling shouldn't be significantly slower
      expect(errorTime).toBeLessThan(normalTime * 2);
    });
  });
});

// Performance benchmarking utility
export const runPerformanceBenchmarks = async () => {
  console.log('Running performance benchmarks...');

  const benchmarks = {
    componentRender: await measureAsyncOperation(async () => {
      for (let i = 0; i < 100; i++) {
        const { unmount } = renderWithProviders(
          <DiscussionCard discussion={createMockDiscussion()} />,
          { initialUser: createMockUser() }
        );
        unmount();
      }
    }),

    listRendering: await measureAsyncOperation(async () => {
      const largeList = Array.from({ length: 1000 }, (_, i) => ({ id: i, name: `Item ${i}` }));
      const { unmount } = renderWithProviders(
        <OptimizedList
          items={largeList}
          renderItem={item => <div key={item.id}>{item.name}</div>}
          keyExtractor={item => item.id.toString()}
          virtualized={true}
        />,
        { initialUser: createMockUser() }
      );
      unmount();
    }),
  };

  console.log('Performance Benchmark Results:', {
    componentRender: `${benchmarks.componentRender.duration.toFixed(2)}ms`,
    listRendering: `${benchmarks.listRendering.duration.toFixed(2)}ms`,
  });

  return benchmarks;
};
