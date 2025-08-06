import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import DiscussionPointsEditor from '../DiscussionPointsEditor';
import { CreateDiscussionPointData } from '../../../types/discussion';

describe('DiscussionPointsEditor', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('renders empty state when no points', () => {
    render(
      <DiscussionPointsEditor
        points={[]}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByText('論点を追加してください')).toBeInTheDocument();
    expect(screen.getByText('+ 論点を追加')).toBeInTheDocument();
  });

  it('renders existing points', () => {
    const points: CreateDiscussionPointData[] = [
      {
        title: 'Test Point 1',
        description: 'Description 1',
        order: 0,
      },
      {
        title: 'Test Point 2',
        description: 'Description 2',
        order: 1,
      },
    ];

    render(
      <DiscussionPointsEditor
        points={points}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByDisplayValue('Test Point 1')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Point 2')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Description 1')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Description 2')).toBeInTheDocument();
  });

  it('adds new point when add button is clicked', () => {
    render(
      <DiscussionPointsEditor
        points={[]}
        onChange={mockOnChange}
      />
    );

    const addButton = screen.getByText('+ 論点を追加');
    fireEvent.click(addButton);

    expect(mockOnChange).toHaveBeenCalledWith([
      {
        title: '',
        description: '',
        order: 0,
      },
    ]);
  });

  it('removes point when remove button is clicked', () => {
    const points: CreateDiscussionPointData[] = [
      {
        title: 'Test Point 1',
        description: 'Description 1',
        order: 0,
      },
      {
        title: 'Test Point 2',
        description: 'Description 2',
        order: 1,
      },
    ];

    render(
      <DiscussionPointsEditor
        points={points}
        onChange={mockOnChange}
      />
    );

    const removeButtons = screen.getAllByTitle('この論点を削除');
    fireEvent.click(removeButtons[0]);

    expect(mockOnChange).toHaveBeenCalledWith([
      {
        title: 'Test Point 2',
        description: 'Description 2',
        order: 0,
      },
    ]);
  });

  it('updates point title when input changes', () => {
    const points: CreateDiscussionPointData[] = [
      {
        title: 'Test Point 1',
        description: 'Description 1',
        order: 0,
      },
    ];

    render(
      <DiscussionPointsEditor
        points={points}
        onChange={mockOnChange}
      />
    );

    const titleInput = screen.getByDisplayValue('Test Point 1');
    fireEvent.change(titleInput, { target: { value: 'Updated Point 1' } });

    expect(mockOnChange).toHaveBeenCalledWith([
      {
        title: 'Updated Point 1',
        description: 'Description 1',
        order: 0,
      },
    ]);
  });

  it('updates point description when textarea changes', () => {
    const points: CreateDiscussionPointData[] = [
      {
        title: 'Test Point 1',
        description: 'Description 1',
        order: 0,
      },
    ];

    render(
      <DiscussionPointsEditor
        points={points}
        onChange={mockOnChange}
      />
    );

    const descriptionTextarea = screen.getByDisplayValue('Description 1');
    fireEvent.change(descriptionTextarea, { target: { value: 'Updated Description 1' } });

    expect(mockOnChange).toHaveBeenCalledWith([
      {
        title: 'Test Point 1',
        description: 'Updated Description 1',
        order: 0,
      },
    ]);
  });

  it('shows character count for title and description', () => {
    const points: CreateDiscussionPointData[] = [
      {
        title: 'Test Point',
        description: 'Test Description',
        order: 0,
      },
    ];

    render(
      <DiscussionPointsEditor
        points={points}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByText('10/100 文字')).toBeInTheDocument(); // Title length
    expect(screen.getByText('16/500 文字')).toBeInTheDocument(); // Description length
  });

  it('shows error message when provided', () => {
    render(
      <DiscussionPointsEditor
        points={[]}
        onChange={mockOnChange}
        error="Test error message"
      />
    );

    expect(screen.getByText('Test error message')).toBeInTheDocument();
  });

  it('disables inputs when disabled prop is true', () => {
    const points: CreateDiscussionPointData[] = [
      {
        title: 'Test Point 1',
        description: 'Description 1',
        order: 0,
      },
    ];

    render(
      <DiscussionPointsEditor
        points={points}
        onChange={mockOnChange}
        disabled={true}
      />
    );

    expect(screen.getByDisplayValue('Test Point 1')).toBeDisabled();
    expect(screen.getByDisplayValue('Description 1')).toBeDisabled();
    expect(screen.getByText('+ 論点を追加')).toBeDisabled();
  });

  it('shows points count', () => {
    const points: CreateDiscussionPointData[] = [
      {
        title: 'Test Point 1',
        description: 'Description 1',
        order: 0,
      },
      {
        title: 'Test Point 2',
        description: 'Description 2',
        order: 1,
      },
    ];

    render(
      <DiscussionPointsEditor
        points={points}
        onChange={mockOnChange}
        maxPoints={20}
      />
    );

    expect(screen.getByText('2/20 論点')).toBeInTheDocument();
  });

  it('prevents adding points when at max limit', () => {
    const points: CreateDiscussionPointData[] = [
      {
        title: 'Test Point 1',
        description: 'Description 1',
        order: 0,
      },
      {
        title: 'Test Point 2',
        description: 'Description 2',
        order: 1,
      },
    ];

    render(
      <DiscussionPointsEditor
        points={points}
        onChange={mockOnChange}
        maxPoints={2}
      />
    );

    const addButton = screen.getByText('+ 論点を追加');
    expect(addButton).toBeDisabled();
  });

  it('shows help information', () => {
    render(
      <DiscussionPointsEditor
        points={[]}
        onChange={mockOnChange}
      />
    );

    expect(screen.getByText('💡 論点設定のコツ')).toBeInTheDocument();
    expect(screen.getByText(/具体的で明確な論点を設定しましょう/)).toBeInTheDocument();
    expect(screen.getByText(/ドラッグ&ドロップで論点の順序を変更できます/)).toBeInTheDocument();
  });
});