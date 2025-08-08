import { DiscussionCategory } from '../types/common';

/**
 * Main category definitions
 */
export const MAIN_CATEGORIES = {
  POLITICS: 'politics',
  ECONOMY: 'economy',
  SOCIETY: 'society',
  TECHNOLOGY: 'technology',
  ENTERTAINMENT: 'entertainment',
  SPORTS: 'sports',
  OTHER: 'other',
} as const;

/**
 * Category information interface
 */
export interface CategoryInfo {
  id: DiscussionCategory;
  name: string;
  description: string;
  icon: string;
  order: number;
  color?: string;
}

/**
 * Category hierarchy with main categories only
 */
export const CATEGORY_HIERARCHY: CategoryInfo[] = [
  {
    id: DiscussionCategory.POLITICS,
    name: '政治',
    description: '政治、政府政策、選挙に関する議論',
    icon: '🏛️',
    order: 1,
    color: '#dc2626',
  },
  {
    id: DiscussionCategory.ECONOMY,
    name: '経済・産業',
    description: '経済、金融、雇用、産業に関する議論',
    icon: '💼',
    order: 2,
    color: '#059669',
  },
  {
    id: DiscussionCategory.SOCIETY,
    name: '社会・生活',
    description: '社会問題、教育、医療、生活に関する議論',
    icon: '🏘️',
    order: 3,
    color: '#7c3aed',
  },
  {
    id: DiscussionCategory.TECHNOLOGY,
    name: 'ネット・テクノロジー',
    description: 'IT、インターネット、AI、テクノロジーに関する議論',
    icon: '💻',
    order: 4,
    color: '#2563eb',
  },
  {
    id: DiscussionCategory.ENTERTAINMENT,
    name: 'エンタメ',
    description: '芸能、音楽、映画、アニメに関する議論',
    icon: '🎭',
    order: 5,
    color: '#db2777',
  },
  {
    id: DiscussionCategory.SPORTS,
    name: 'スポーツ',
    description: 'スポーツ、競技、選手に関する議論',
    icon: '⚽',
    order: 6,
    color: '#ea580c',
  },
  {
    id: DiscussionCategory.OTHER,
    name: 'その他',
    description: 'その他のトピックに関する議論',
    icon: '📝',
    order: 7,
    color: '#6b7280',
  },
];

/**
 * Get category info by ID
 */
export const getCategoryInfo = (categoryId: DiscussionCategory): CategoryInfo | undefined => {
  return CATEGORY_HIERARCHY.find(category => category.id === categoryId);
};

/**
 * Get category name by ID
 */
export const getCategoryName = (categoryId: DiscussionCategory): string => {
  const category = getCategoryInfo(categoryId);
  return category?.name || 'Unknown Category';
};

/**
 * Get category icon by ID
 */
export const getCategoryIcon = (categoryId: DiscussionCategory): string => {
  const category = getCategoryInfo(categoryId);
  return category?.icon || '📝';
};

/**
 * Get category color by ID
 */
export const getCategoryColor = (categoryId: DiscussionCategory): string => {
  const category = getCategoryInfo(categoryId);
  return category?.color || '#6b7280';
};

/**
 * Get all main categories
 */
export const getAllCategories = (): CategoryInfo[] => {
  return CATEGORY_HIERARCHY.sort((a, b) => a.order - b.order);
};

/**
 * Search categories by name
 */
export const searchCategories = (query: string): CategoryInfo[] => {
  const lowercaseQuery = query.toLowerCase();
  return CATEGORY_HIERARCHY.filter(
    category =>
      category.name.toLowerCase().includes(lowercaseQuery) ||
      category.description.toLowerCase().includes(lowercaseQuery)
  );
};

/**
 * Category validation
 */
export const isValidCategory = (categoryId: string): categoryId is DiscussionCategory => {
  return Object.values(DiscussionCategory).includes(categoryId as DiscussionCategory);
};

/**
 * Get category statistics (placeholder for future implementation)
 */
export const getCategoryStatistics = (_categoryId: DiscussionCategory) => {
  // This would be implemented with actual data from the backend
  return {
    discussionCount: 0,
    activeDiscussions: 0,
    totalPosts: 0,
    weeklyGrowth: 0,
  };
};

/**
 * Validate category selection
 */
export const validateCategorySelection = (
  categories: DiscussionCategory[]
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (categories.length === 0) {
    errors.push('少なくとも1つのカテゴリを選択してください');
  }

  if (categories.length > 5) {
    errors.push('最大5つまでのカテゴリを選択してください');
  }

  // Check if all categories are valid
  const invalidCategories = categories.filter(cat => !isValidCategory(cat));
  if (invalidCategories.length > 0) {
    errors.push('無効なカテゴリが含まれています');
  }

  return { isValid: errors.length === 0, errors };
};
