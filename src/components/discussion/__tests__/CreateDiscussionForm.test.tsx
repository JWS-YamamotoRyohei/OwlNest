import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CreateDiscussionForm from '../CreateDiscussionForm';
import { CreateDiscussionData } from '../../../types/discussion';
import { DiscussionCategory, Stance } from '../../../types/common';

describe('CreateDiscussionForm', () => {
  const mockOnSubmit = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    mockOnSubmit.mockClear();
    mockOnCancel.mockClear();
  });

  it('renders form with initial step', () => {
    render(<CreateDiscussionForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    expect(screen.getByText('新しい議論を作成')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '基本情報' })).toBeInTheDocument();
    expect(screen.getByLabelText(/議題/)).toBeInTheDocument();
    expect(screen.getByLabelText(/概要/)).toBeInTheDocument();
    expect(screen.getByLabelText(/あなたのスタンス/)).toBeInTheDocument();
  });

  it('shows step indicator with correct steps', () => {
    render(<CreateDiscussionForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    // Check step indicator items
    expect(screen.getAllByText('基本情報')).toHaveLength(2); // Step indicator + form heading
    expect(screen.getAllByText('カテゴリ')).toHaveLength(1);
    expect(screen.getAllByText('論点')).toHaveLength(1);
    expect(screen.getAllByText('前提知識')).toHaveLength(1);
    expect(screen.getAllByText('アクセス制御')).toHaveLength(1);
  });

  it('validates required fields on basic info step', async () => {
    render(<CreateDiscussionForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const nextButton = screen.getByText('次へ');
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText('議題は必須です')).toBeInTheDocument();
      expect(screen.getByText('概要は必須です')).toBeInTheDocument();
    });
  });

  it('moves to next step when basic info is valid', async () => {
    render(<CreateDiscussionForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    // Fill in basic info
    fireEvent.change(screen.getByLabelText(/議題/), {
      target: { value: 'Test Discussion' },
    });
    fireEvent.change(screen.getByLabelText(/概要/), {
      target: { value: 'This is a test discussion description' },
    });

    const nextButton = screen.getByText('次へ');
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(screen.getAllByText('カテゴリ選択')[0]).toBeInTheDocument();
    });
  });

  it('calls onCancel when cancel button is clicked', () => {
    render(<CreateDiscussionForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const cancelButton = screen.getByText('キャンセル');
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('shows loading state when isLoading is true', () => {
    render(
      <CreateDiscussionForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} isLoading={true} />
    );

    expect(screen.getByLabelText(/議題/)).toBeDisabled();
    expect(screen.getByLabelText(/概要/)).toBeDisabled();
  });

  it('populates form with initial data', () => {
    const initialData: Partial<CreateDiscussionData> = {
      title: 'Initial Title',
      description: 'Initial Description',
      ownerStance: Stance.PROS,
      categories: [DiscussionCategory.TECHNOLOGY],
    };

    render(
      <CreateDiscussionForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        initialData={initialData}
      />
    );

    expect(screen.getByDisplayValue('Initial Title')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Initial Description')).toBeInTheDocument();
    
    // Check select element value
    const selectElement = screen.getByLabelText(/あなたのスタンス/) as HTMLSelectElement;
    expect(selectElement.value).toBe(Stance.PROS);
  });

  it('validates character limits', async () => {
    render(<CreateDiscussionForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const titleInput = screen.getByLabelText(/議題/);
    const longTitle = 'a'.repeat(201);

    fireEvent.change(titleInput, { target: { value: longTitle } });

    const nextButton = screen.getByText('次へ');
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText('議題は200文字以内で入力してください')).toBeInTheDocument();
    });
  });

  it('shows character count for inputs', () => {
    render(<CreateDiscussionForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    expect(screen.getByText('0/200 文字')).toBeInTheDocument();
    expect(screen.getByText('0/2000 文字')).toBeInTheDocument();
  });

  it('allows navigation between completed steps', async () => {
    render(<CreateDiscussionForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    // Fill basic info and move to next step
    fireEvent.change(screen.getByLabelText(/議題/), {
      target: { value: 'Test Discussion' },
    });
    fireEvent.change(screen.getByLabelText(/概要/), {
      target: { value: 'Test description' },
    });

    fireEvent.click(screen.getByText('次へ'));

    await waitFor(() => {
      expect(screen.getAllByText('カテゴリ選択')[0]).toBeInTheDocument();
    });

    // Go back to previous step
    fireEvent.click(screen.getByText('前へ'));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '基本情報' })).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test Discussion')).toBeInTheDocument();
    });
  });
});
