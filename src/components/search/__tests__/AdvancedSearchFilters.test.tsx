import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AdvancedSearchFilters } from '../AdvancedSearchFilters';
import { DiscussionSearchFilters } from '../../../types/discussion';
import { PostSearchFilters } from '../../../types/post';
import { DiscussionCategory, Stance } from '../../../types/common';

describe('AdvancedSearchFilters', () => {
  const mockOnFiltersChange = jest.fn();
  const mockOnClear = jest.fn();
  const mockOnSave = jest.fn();

  const defaultDiscussionFilters: DiscussionSearchFilters = {};
  const defaultPostFilters: PostSearchFilters = {};

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Discussion Filters', () => {
    const defaultProps = {
      type: 'discussions' as const,
      filters: defaultDiscussionFilters,
      onFiltersChange: mockOnFiltersChange,
      onClear: mockOnClear,
      onSave: mockOnSave
    };

    it('renders collapsed by default', () => {
      render(<AdvancedSearchFilters {...defaultProps} />);
      
      expect(screen.getByText('詳細フィルター')).toBeInTheDocument();
      expect(screen.queryByText('カテゴリ')).not.toBeInTheDocument();
    });

    it('expands when toggle button is clicked', async () => {
      render(<AdvancedSearchFilters {...defaultProps} />);
      
      const toggleButton = screen.getByText('詳細フィルター');
      fireEvent.click(toggleButton);
      
      await waitFor(() => {
        expect(screen.getByText('カテゴリ')).toBeInTheDocument();
        expect(screen.getByText('作成者のスタンス')).toBeInTheDocument();
        expect(screen.getByText('作成日時')).toBeInTheDocument();
      });
    });

    it('shows active filters count', () => {
      const filtersWithData: DiscussionSearchFilters = {
        categories: [DiscussionCategory.POLITICS],
        ownerStance: Stance.PROS,
        isActive: true
      };

      render(
        <AdvancedSearchFilters 
          {...defaultProps} 
          filters={filtersWithData}
        />
      );
      
      expect(screen.getByText('(3)')).toBeInTheDocument();
    });

    it('handles category selection', async () => {
      render(<AdvancedSearchFilters {...defaultProps} />);
      
      // Expand filters
      fireEvent.click(screen.getByText('詳細フィルター'));
      
      await waitFor(() => {
        const politicsCheckbox = screen.getByLabelText('政治');
        fireEvent.click(politicsCheckbox);
      });

      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        categories: [DiscussionCategory.POLITICS]
      });
    });

    it('handles stance selection', async () => {
      render(<AdvancedSearchFilters {...defaultProps} />);
      
      // Expand filters
      fireEvent.click(screen.getByText('詳細フィルター'));
      
      await waitFor(() => {
        const prosButton = screen.getByText('賛成');
        fireEvent.click(prosButton);
      });

      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        ownerStance: Stance.PROS
      });
    });

    it('handles date range selection', async () => {
      render(<AdvancedSearchFilters {...defaultProps} />);
      
      // Expand filters
      fireEvent.click(screen.getByText('詳細フィルター'));
      
      await waitFor(() => {
        const dateInputs = screen.getAllByDisplayValue('');
        const startDateInput = dateInputs.find(input => 
          input.getAttribute('type') === 'date' && 
          input.closest('.advanced-search-filters__date-input-group')?.querySelector('.advanced-search-filters__date-label')?.textContent === '開始日'
        );
        if (startDateInput) {
          fireEvent.change(startDateInput, { target: { value: '2024-01-01' } });
        }
      });

      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        createdAfter: '2024-01-01'
      });
    });

    it('handles participant count range', async () => {
      render(<AdvancedSearchFilters {...defaultProps} />);
      
      // Expand filters
      fireEvent.click(screen.getByText('詳細フィルター'));
      
      await waitFor(() => {
        const numberInputs = screen.getAllByDisplayValue('');
        const minParticipantsInput = numberInputs.find(input => 
          input.getAttribute('type') === 'number' && 
          input.closest('.advanced-search-filters__number-input-group')?.querySelector('.advanced-search-filters__number-label')?.textContent === '最小' &&
          input.closest('.advanced-search-filters__section')?.querySelector('.advanced-search-filters__section-title')?.textContent === '参加者数'
        );
        if (minParticipantsInput) {
          fireEvent.change(minParticipantsInput, { target: { value: '5' } });
        }
      });

      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        minParticipants: 5
      });
    });

    it('handles status filters', async () => {
      render(<AdvancedSearchFilters {...defaultProps} />);
      
      // Expand filters
      fireEvent.click(screen.getByText('詳細フィルター'));
      
      await waitFor(() => {
        const activeButton = screen.getByText('🟢 アクティブ');
        fireEvent.click(activeButton);
      });

      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        isActive: true
      });
    });

    it('calls onClear when clear button is clicked', () => {
      const filtersWithData: DiscussionSearchFilters = {
        categories: [DiscussionCategory.POLITICS]
      };

      render(
        <AdvancedSearchFilters 
          {...defaultProps} 
          filters={filtersWithData}
        />
      );
      
      const clearButton = screen.getByText('クリア');
      fireEvent.click(clearButton);
      
      expect(mockOnClear).toHaveBeenCalled();
    });

    it('opens save dialog when save button is clicked', async () => {
      const filtersWithData: DiscussionSearchFilters = {
        categories: [DiscussionCategory.POLITICS]
      };

      render(
        <AdvancedSearchFilters 
          {...defaultProps} 
          filters={filtersWithData}
        />
      );
      
      const saveButton = screen.getByText('保存');
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(screen.getByText('検索条件を保存')).toBeInTheDocument();
      });
    });
  });

  describe('Post Filters', () => {
    const defaultProps = {
      type: 'posts' as const,
      filters: defaultPostFilters,
      onFiltersChange: mockOnFiltersChange,
      onClear: mockOnClear,
      onSave: mockOnSave
    };

    it('shows post-specific filters', async () => {
      render(<AdvancedSearchFilters {...defaultProps} />);
      
      // Expand filters
      fireEvent.click(screen.getByText('詳細フィルター'));
      
      await waitFor(() => {
        expect(screen.getByText('スタンス')).toBeInTheDocument();
        expect(screen.getByText('コンテンツ')).toBeInTheDocument();
        expect(screen.getByText('📎 添付ファイルあり')).toBeInTheDocument();
        expect(screen.getByText('🔗 リンクあり')).toBeInTheDocument();
        expect(screen.getByText('💬 返信のみ')).toBeInTheDocument();
      });
    });

    it('handles content filters', async () => {
      render(<AdvancedSearchFilters {...defaultProps} />);
      
      // Expand filters
      fireEvent.click(screen.getByText('詳細フィルター'));
      
      await waitFor(() => {
        const attachmentsButton = screen.getByText('📎 添付ファイルあり');
        fireEvent.click(attachmentsButton);
      });

      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        hasAttachments: true
      });
    });

    it('handles stance filter for posts', async () => {
      render(<AdvancedSearchFilters {...defaultProps} />);
      
      // Expand filters
      fireEvent.click(screen.getByText('詳細フィルター'));
      
      await waitFor(() => {
        const consButton = screen.getByText('反対');
        fireEvent.click(consButton);
      });

      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        stance: Stance.CONS
      });
    });
  });

  describe('Save Dialog', () => {
    const defaultProps = {
      type: 'discussions' as const,
      filters: { categories: [DiscussionCategory.POLITICS] } as DiscussionSearchFilters,
      onFiltersChange: mockOnFiltersChange,
      onClear: mockOnClear,
      onSave: mockOnSave
    };

    it('saves search with entered name', async () => {
      render(<AdvancedSearchFilters {...defaultProps} />);
      
      // Open save dialog
      const saveButton = screen.getByText('保存');
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        const nameInput = screen.getByPlaceholderText('保存名を入力...');
        fireEvent.change(nameInput, { target: { value: 'My Search' } });
      });

      // Find the confirm button in the dialog
      const dialogConfirmButton = screen.getByRole('button', { name: '保存' });
      const confirmButtons = screen.getAllByText('保存');
      const saveConfirmButton = confirmButtons.find(button => 
        button.className.includes('advanced-search-filters__save-confirm')
      );
      
      if (saveConfirmButton) {
        fireEvent.click(saveConfirmButton);
      }

      expect(mockOnSave).toHaveBeenCalledWith('My Search');
    });

    it('cancels save dialog', async () => {
      render(<AdvancedSearchFilters {...defaultProps} />);
      
      // Open save dialog
      const saveButton = screen.getByText('保存');
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        const cancelButton = screen.getByText('キャンセル');
        fireEvent.click(cancelButton);
      });

      await waitFor(() => {
        expect(screen.queryByText('検索条件を保存')).not.toBeInTheDocument();
      });
    });
  });

  describe('Loading State', () => {
    const defaultProps = {
      type: 'discussions' as const,
      filters: defaultDiscussionFilters,
      onFiltersChange: mockOnFiltersChange,
      onClear: mockOnClear,
      isLoading: true
    };

    it('disables controls when loading', async () => {
      render(<AdvancedSearchFilters {...defaultProps} />);
      
      // Expand filters
      fireEvent.click(screen.getByText('詳細フィルター'));
      
      await waitFor(() => {
        const politicsCheckbox = screen.getByLabelText('政治');
        expect(politicsCheckbox).toBeDisabled();
      });
    });
  });
});