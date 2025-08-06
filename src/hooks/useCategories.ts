import { useState, useMemo, useCallback } from 'react';
import { DiscussionCategory } from '../types/common';
import {
  CATEGORY_HIERARCHY,
  getCategoryInfo,
  getCategoriesByParent,
  searchCategories,
  validateCategorySelection,
  MAIN_CATEGORIES,
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
  const {
    maxSelections = 5,
    required = true,
    initialCategories = [],
  } = options;

  const [selectedCategories, setSelectedCategories] = useState<DiscussionCategory[]>(initialCategories);
  const [searchQuery, setSearchQuery] = useState('');

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
  const addCategory = useCallback((categoryId: DiscussionCategory) => {
    setSelectedCategories(prev => {
      if (prev.includes(categoryId)) return prev;
      if (prev.length >= maxSelections) return prev;
      return [...prev, categoryId];
    });
  }, [maxSelections]);

  const removeCategory = useCallback((categoryId: DiscussionCategory) => {
    setSelectedCategories(prev => prev.filter(id => id !== categoryId));
  }, []);

  const toggleCategory = useCallback((categoryId: DiscussionCategory) => {
    setSelectedCategories(prev => {
      const isSelected = prev.includes(categoryId);
      if (isSelected) {
        return prev.filter(id => id !== categoryId);
      } else if (prev.length < maxSelections) {
        return [...prev, categoryId];
      }
      return prev;
    });
  }, [maxSelections]);

  const clearCategories = useCallback(() => {
    setSelectedCategories([]);
  }, []);

  const setCategories = useCallback((categories: DiscussionCategory[]) => {
    const validCategories = categories.slice(0, maxSelections);
    setSelectedCategories(validCategories);
  }, [maxSelections]);

  // Bulk operations
  const selectAllInMainCategory = useCallback((mainCategory: string) => {
    const subcategories = getCategoriesByParent(mainCategory);
    const subcategoryIds = subcategories.map(sub => sub.id);
    
    setSelectedCategories(prev => {
      const allSelected = subcategoryIds.every(id => prev.includes(id));
      
      if (allSelected) {
        // Remove all subcategories
        return prev.filter(id => !subcategoryIds.includes(id));
      } else {
        // Add all subcategories that fit within limit
        const unselected = subcategoryIds.filter(id => !prev.includes(id));
        const canAdd = Math.min(unselected.length, maxSelections - prev.length);
        return [...prev, ...unselected.slice(0, canAdd)];
      }
    });
  }, [maxSelections]);

  // Category information helpers
  const getCategoryInfoById = useCallback((categoryId: DiscussionCategory) => {
    return getCategoryInfo(categoryId);
  }, []);

  const getSelectedCategoryNames = useMemo(() => {
    return selectedCategories.map(id => {
      const category = getCategoryById(id);
      return category?.name || id;
    });
  }, [selectedCategories]);

  const getSelectedCategoriesByMainCategory = useMemo(() => {
    const grouped: Record<string, DiscussionCategory[]> = {};
    
    selectedCategories.forEach(categoryId => {
      const category = getCategoryById(categoryId);
      if (category?.parentId) {
        if (!grouped[category.parentId]) {
          grouped[category.parentId] = [];
        }
        grouped[category.parentId].push(categoryId);
      }
    });
    
    return grouped;
  }, [selectedCategories]);

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
    const subcategories = getCategoriesByParent(mainCategory);
    const subcategoryIds = subcategories.map(sub => sub.id);
    
    return (discussionCategories: DiscussionCategory[]) => {
      return subcategoryIds.some(id => discussionCategories.includes(id));
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