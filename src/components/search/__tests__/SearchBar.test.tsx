import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SearchBar } from '../SearchBar';
import { SearchSuggestion } from '../../../services/searchService';

describe('SearchBar', () => {
  const mockOnChange = jest.fn();
  const mockOnSearch = jest.fn();
  const mockOnSuggestionSelect = jest.fn();
  const mockOnHistorySelect = jest.fn();

  const defaultProps = {
    value: '',
    onChange: mockOnChange,
    onSearch: mockOnSearch,
    onSuggestionSelect: mockOnSuggestionSelect,
    onHistorySelect: mockOnHistorySelect
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders search input with placeholder', () => {
    render(<SearchBar {...defaultProps} placeholder="Search discussions..." />);
    
    expect(screen.getByPlaceholderText('Search discussions...')).toBeInTheDocument();
  });

  it('calls onChange when input value changes', () => {
    render(<SearchBar {...defaultProps} />);
    
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'test query' } });
    
    expect(mockOnChange).toHaveBeenCalledWith('test query');
  });

  it('calls onSearch when Enter key is pressed', () => {
    render(<SearchBar {...defaultProps} value="test query" />);
    
    const input = screen.getByRole('textbox');
    fireEvent.keyDown(input, { key: 'Enter' });
    
    expect(mockOnSearch).toHaveBeenCalledWith('test query');
  });

  it('calls onSearch when search button is clicked', () => {
    render(<SearchBar {...defaultProps} value="test query" />);
    
    const searchButton = screen.getByLabelText('検索');
    fireEvent.click(searchButton);
    
    expect(mockOnSearch).toHaveBeenCalledWith('test query');
  });

  it('does not call onSearch with empty query', () => {
    render(<SearchBar {...defaultProps} value="" />);
    
    const searchButton = screen.getByLabelText('検索');
    fireEvent.click(searchButton);
    
    expect(mockOnSearch).not.toHaveBeenCalled();
  });

  it('shows loading state', () => {
    render(<SearchBar {...defaultProps} isLoading={true} />);
    
    expect(screen.getByText('⏳')).toBeInTheDocument();
  });

  it('displays suggestions when provided', async () => {
    const suggestions: SearchSuggestion[] = [
      { type: 'query', value: 'test', label: 'test suggestion', count: 5 },
      { type: 'category', value: 'politics', label: 'Politics', count: 10 }
    ];

    render(
      <SearchBar 
        {...defaultProps} 
        value="test" 
        suggestions={suggestions}
      />
    );

    const input = screen.getByRole('textbox');
    fireEvent.focus(input);

    await waitFor(() => {
      expect(screen.getByText('test suggestion')).toBeInTheDocument();
      expect(screen.getByText('Politics')).toBeInTheDocument();
    });
  });

  it('displays search history when provided', async () => {
    const searchHistory = [
      { query: 'previous search', timestamp: new Date().toISOString() }
    ];

    render(
      <SearchBar 
        {...defaultProps} 
        searchHistory={searchHistory}
        showHistory={true}
      />
    );

    const input = screen.getByRole('textbox');
    fireEvent.focus(input);

    await waitFor(() => {
      expect(screen.getByText('previous search')).toBeInTheDocument();
    });
  });

  it('calls onSuggestionSelect when suggestion is clicked', async () => {
    const suggestions: SearchSuggestion[] = [
      { type: 'category', value: 'politics', label: 'Politics', count: 10 }
    ];

    render(
      <SearchBar 
        {...defaultProps} 
        value="pol" 
        suggestions={suggestions}
      />
    );

    const input = screen.getByRole('textbox');
    fireEvent.focus(input);

    await waitFor(() => {
      const suggestion = screen.getByText('Politics');
      fireEvent.click(suggestion);
    });

    expect(mockOnSuggestionSelect).toHaveBeenCalledWith(suggestions[0]);
  });

  it('calls onHistorySelect when history item is clicked', async () => {
    const searchHistory = [
      { query: 'previous search', timestamp: new Date().toISOString() }
    ];

    render(
      <SearchBar 
        {...defaultProps} 
        searchHistory={searchHistory}
        showHistory={true}
      />
    );

    const input = screen.getByRole('textbox');
    fireEvent.focus(input);

    await waitFor(() => {
      const historyItem = screen.getByText('previous search');
      fireEvent.click(historyItem);
    });

    expect(mockOnHistorySelect).toHaveBeenCalledWith('previous search');
  });

  it('hides dropdown when Escape key is pressed', async () => {
    const suggestions: SearchSuggestion[] = [
      { type: 'query', value: 'test', label: 'test suggestion' }
    ];

    render(
      <SearchBar 
        {...defaultProps} 
        value="test" 
        suggestions={suggestions}
      />
    );

    const input = screen.getByRole('textbox');
    fireEvent.focus(input);

    await waitFor(() => {
      expect(screen.getByText('test suggestion')).toBeInTheDocument();
    });

    fireEvent.keyDown(input, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByText('test suggestion')).not.toBeInTheDocument();
    });
  });

  it('disables input and button when loading', () => {
    render(<SearchBar {...defaultProps} isLoading={true} />);
    
    const input = screen.getByRole('textbox');
    const button = screen.getByLabelText('検索');
    
    expect(input).toBeDisabled();
    expect(button).toBeDisabled();
  });
});