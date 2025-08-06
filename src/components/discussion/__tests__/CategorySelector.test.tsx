import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import CategorySelector from '../CategorySelector';
import { DiscussionCategory } from '../../../types/common';

describe('CategorySelector', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('renders category selector with main categories', () => {
    render(
      <CategorySelector
        selectedCategories={[]}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByText('カテゴリ選択')).toBeInTheDocument();
    expect(screen.getByText('政治')).toBeInTheDocument();
    expect(screen.getByText('経済・産業')).toBeInTheDocument();
    expect(screen.getByText('社会・生活')).toBeInTheDocument();
    expect(screen.getByText('ネット・テクノロジー')).toBeInTheDocument();
    expect(screen.getByText('エンタメ')).toBeInTheDocument();
    expect(screen.getByText('スポーツ')).toBeInTheDocument();
  });

  it('shows selected categories count', () => {
    render(
      <CategorySelector
        selectedCategories={[DiscussionCategory.POLITICS, DiscussionCategory.ECONOMY]}
        onChange={mockOnChange}
        maxSelections={5}
      />
    );

    expect(screen.getByText('2/5 選択中')).toBeInTheDocument();
  });

  it('displays selected categories', () => {
    render(
      <CategorySelector
        selectedCategories={[DiscussionCategory.POLITICS]}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByText('選択中のカテゴリ:')).toBeInTheDocument();
    expect(screen.getByText('政治')).toBeInTheDocument();
  });

  it('calls onChange when category is selected', () => {
    render(
      <CategorySelector
        selectedCategories={[]}
        onChange={mockOnChange}
      />
    );

    // Click on politics category
    const politicsCategory = screen.getByText('政治').closest('.category-selector__category');
    fireEvent.click(politicsCategory!);

    expect(mockOnChange).toHaveBeenCalledWith([DiscussionCategory.POLITICS]);
  });

  it('removes category when remove button is clicked', () => {
    render(
      <CategorySelector
        selectedCategories={[DiscussionCategory.POLITICS]}
        onChange={mockOnChange}
      />
    );

    const removeButton = screen.getByLabelText('政治を削除');
    fireEvent.click(removeButton);

    expect(mockOnChange).toHaveBeenCalledWith([]);
  });

  it('clears all categories when clear button is clicked', () => {
    render(
      <CategorySelector
        selectedCategories={[DiscussionCategory.POLITICS, DiscussionCategory.ECONOMY]}
        onChange={mockOnChange}
      />
    );

    const clearButton = screen.getByText('すべて解除');
    fireEvent.click(clearButton);

    expect(mockOnChange).toHaveBeenCalledWith([]);
  });

  it('filters categories based on search query', () => {
    render(
      <CategorySelector
        selectedCategories={[]}
        onChange={mockOnChange}
      />
    );

    const searchInput = screen.getByPlaceholderText('カテゴリを検索...');
    fireEvent.change(searchInput, { target: { value: '政治' } });

    expect(screen.getByText('政治')).toBeInTheDocument();
    expect(screen.queryByText('経済・産業')).not.toBeInTheDocument();
  });

  it('shows validation error when required but no categories selected', () => {
    render(
      <CategorySelector
        selectedCategories={[]}
        onChange={mockOnChange}
        required={true}
      />
    );

    expect(screen.getByText('少なくとも1つのカテゴリを選択してください')).toBeInTheDocument();
  });

  it('prevents selection when at max limit', () => {
    const maxCategories = [
      DiscussionCategory.POLITICS,
      DiscussionCategory.ECONOMY,
    ];

    render(
      <CategorySelector
        selectedCategories={maxCategories}
        onChange={mockOnChange}
        maxSelections={2}
      />
    );

    // Try to select another category
    const technologyCategory = screen.getByText('ネット・テクノロジー').closest('.category-selector__category');
    fireEvent.click(technologyCategory!);

    // Should not call onChange since we're at the limit
    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it('disables component when disabled prop is true', () => {
    render(
      <CategorySelector
        selectedCategories={[]}
        onChange={mockOnChange}
        disabled={true}
      />
    );

    const searchInput = screen.getByPlaceholderText('カテゴリを検索...');
    expect(searchInput).toBeDisabled();

    const component = screen.getByText('カテゴリ選択').closest('.category-selector');
    expect(component).toHaveClass('disabled');
  });
});