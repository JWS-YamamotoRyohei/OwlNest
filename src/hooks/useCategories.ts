import { useState, useMemo, useCallback } from 'react';
import { DiscussionCategory } from '../types/common';
import {
  CATEGORY_HIERARCHY,
  getCategoryInfo,
  searchCategories,
  validateCategorySelection,
} from '../constants/categories';

export interface UseCategoriesOptions {
  maxSelections?: number;
  required?: boolean;
  initialCategories?: DiscussionCategory[];
}

export interface CategorySearchResult {
  categories: typeof CATEGORY_HIERARCHY;
  hasResults: boolean;
  resultCount: number;
}

export interface CategoryValidation {
  isValid: boolean;
  errors: string[];
}

export const useCategories = (options: UseCategoriesOptions = {}) => {
  const { maxSelections = 5, required = true, initialCategories = [] } = options;

  const [selectedCategories, setSelectedCategories] =
    useState<DiscussionCategory[]>(initialCategories);
  const [searchQuery, setSearchQuery] = useState('');

  // Helper functions
  const _getCategoriesByParent = useCallback((_parentId: string) => {
    // Since current category structure is flat, return empty array
    // This function is kept for future hierarchical category support
    return [];
  }, []);

  const getCategoryById = useCallback((categoryId: DiscussionCategory) => {
    return CATEGORY_HIERARCHY.find(category => category.id === categoryId);
  }, []);

  // Search functionality
  const searchResults = useMemo((): CategorySearchResult => {
    if (!searchQuery.trim()) {
      return {
        categories: CATEGORY_HIERARCHY,
        hasResults: true,
        resultCount: CATEGORY_HIERARCHY.length,
      };
    }

    const results = searchCategories(searchQuery);
    return {
      categories: results,
      hasResults: results.length > 0,
      resultCount: results.length,
    };
  }, [searchQuery]);

  // Validation
  const validation = useMemo((): CategoryValidation => {
    return validateCategorySelection(selectedCategories);
  }, [selectedCategories]);

  // Category selection handlers
  const addCategory = useCallback(
    (categoryId: DiscussionCategory) => {
      setSelectedCategories(prev => {
        if (prev.includes(categoryId)) return prev;
        if (prev.length >= maxSelections) return prev;
        return [...prev, categoryId];
      });
    },
    [maxSelections]
  );

  const removeCategory = useCallback((categoryId: DiscussionCategory) => {
    setSelectedCategories(prev => prev.filter(id => id !== categoryId));
  }, []);

  const toggleCategory = useCallback(
    (categoryId: DiscussionCategory) => {
      setSelectedCategories(prev => {
        const isSelected = prev.includes(categoryId);
        if (isSelected) {
          return prev.filter(id => id !== categoryId);
        } else if (prev.length < maxSelections) {
          return [...prev, categoryId];
        }
        return prev;
      });
    },
    [maxSelections]
  );

  const clearCategories = useCallback(() => {
    setSelectedCategories([]);
  }, []);

  const setCategories = useCallback(
    (categories: DiscussionCategory[]) => {
      const validCategories = categories.slice(0, maxSelections);
      setSelectedCategories(validCategories);
    },
    [maxSelections]
  );

  // Bulk operations
  const selectAllInMainCategory = useCallback(
    (mainCategory: string) => {
      // Since current structure is flat, toggle the specific category
      const categoryId = mainCategory as DiscussionCategory;
      
      setSelectedCategories(prev => {
        const isSelected = prev.includes(categoryId);
        
        if (isSelected) {
          // Remove the category
          return prev.filter(id => id !== categoryId);
        } else if (prev.length < maxSelections) {
          // Add the category
          return [...prev, categoryId];
        }
        return prev;
      });
    },
    [maxSelections]
  );

  const getSelectedCategoryNames = useMemo(() => {
    return selectedCategories.map(id => {
      const category = getCategoryById(id);
      return category?.name || id;
    });
  }, [selectedCategories, getCategoryById]);

  const getSelectedCategoriesByMainCategory = useMemo(() => {
    const grouped: Record<string, DiscussionCategory[]> = {};

    selectedCategories.forEach(categoryId => {
      const category = getCategoryById(categoryId);
      if (category) {
        // Since current structure is flat, group by category id itself
        if (!grouped[category.id]) {
          grouped[category.id] = [];
        }
        grouped[category.id].push(categoryId);
      }
    });

    return grouped;
  }, [selectedCategories, getCategoryById]);

  // Statistics
  const selectionStats = useMemo(() => {
    return {
      selectedCount: selectedCategories.length,
      maxSelections,
      remainingSelections: maxSelections - selectedCategories.length,
      isAtLimit: selectedCategories.length >= maxSelections,
      isEmpty: selectedCategories.length === 0,
    };
  }, [selectedCategories, maxSelections]);

  // Filter helpers for discussion lists
  const createCategoryFilter = useCallback((categories: DiscussionCategory[]) => {
    return (discussionCategories: DiscussionCategory[]) => {
      if (categories.length === 0) return true;
      return categories.some(cat => discussionCategories.includes(cat));
    };
  }, []);

  const getMainCategoryFilter = useCallback((mainCategory: string) => {
    const categoryId = mainCategory as DiscussionCategory;

    return (discussionCategories: DiscussionCategory[]) => {
      return discussionCategories.includes(categoryId);
    };
  }, []);

  return {
    // State
    selectedCategories,
    searchQuery,

    // Search
    searchResults,
    setSearchQuery,

    // Validation
    validation,
    isValid: validation.isValid,
    errors: validation.errors,

    // Selection handlers
    addCategory,
    removeCategory,
    toggleCategory,
    clearCategories,
    setCategories,
    selectAllInMainCategory,

    // Information helpers
    getCategoryInfo,
    getCategoryById,
    getSelectedCategoryNames,
    getSelectedCategoriesByMainCategory,

    // Statistics
    selectionStats,

    // Filter helpers
    createCategoryFilter,
    getMainCategoryFilter,

    // Configuration
    maxSelections,
    required,
  };
};

export default useCategories;
