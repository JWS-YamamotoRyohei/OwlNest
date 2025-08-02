// Discussion category types

export interface Category {
  id: string;
  name: string;
  parentId?: string;
  level: number;
}

export interface CategoryGroup {
  id: string;
  name: string;
  subcategories: Category[];
}

// Hierarchical category structure as defined in requirements
export const DISCUSSION_CATEGORIES: CategoryGroup[] = [
  {
    id: 'politics',
    name: '政治',
    subcategories: [
      { id: 'national-politics', name: '国の政治', level: 1 },
      { id: 'local-politics', name: '地方政治', level: 1 },
      { id: 'international-politics', name: '国際政治', level: 1 },
      { id: 'elections', name: '選挙', level: 1 },
      { id: 'politicians-parties', name: '政治家・政党', level: 1 },
      { id: 'constitution-law', name: '憲法・法制度', level: 1 }
    ]
  },
  {
    id: 'economy',
    name: '経済・産業',
    subcategories: [
      { id: 'economy-general', name: '経済', level: 1 },
      { id: 'finance-investment', name: '金融・投資', level: 1 },
      { id: 'employment-labor', name: '雇用・労働', level: 1 },
      { id: 'local-economy', name: '地方経済', level: 1 },
      { id: 'industry-general', name: '産業全般', level: 1 },
      { id: 'transportation-logistics', name: '交通・物流', level: 1 },
      { id: 'sme-startups', name: '中小企業・スタートアップ', level: 1 }
    ]
  },
  {
    id: 'society',
    name: '社会・生活',
    subcategories: [
      { id: 'social-issues', name: '社会問題全般', level: 1 },
      { id: 'education', name: '教育', level: 1 },
      { id: 'healthcare-welfare', name: '医療・福祉', level: 1 },
      { id: 'disaster-prevention', name: '防災・災害対応', level: 1 },
      { id: 'lifestyle-health', name: '生活習慣・健康', level: 1 },
      { id: 'romance-marriage', name: '恋愛・結婚', level: 1 },
      { id: 'family-childcare', name: '家族・子育て', level: 1 }
    ]
  },
  {
    id: 'technology',
    name: 'ネット・テクノロジー',
    subcategories: [
      { id: 'internet-culture', name: 'ネット文化', level: 1 },
      { id: 'sns-controversy', name: 'SNS・炎上', level: 1 },
      { id: 'gaming-esports', name: 'ゲーム・eスポーツ', level: 1 },
      { id: 'ai-ml', name: 'AI・機械学習', level: 1 },
      { id: 'security-privacy', name: 'セキュリティ・個人情報', level: 1 },
      { id: 'gadgets-mobile', name: 'ガジェット・スマホ', level: 1 },
      { id: 'advanced-tech', name: '先端技術', level: 1 }
    ]
  },
  {
    id: 'entertainment',
    name: 'エンタメ',
    subcategories: [
      { id: 'celebrity-news', name: '芸能ニュース', level: 1 },
      { id: 'music-live', name: '音楽・ライブ', level: 1 },
      { id: 'movies-drama', name: '映画・ドラマ', level: 1 },
      { id: 'comedy-entertainers', name: 'お笑い・芸人', level: 1 },
      { id: 'manga-anime', name: '漫画・アニメ', level: 1 },
      { id: 'voice-actors-2d', name: '声優・二次元文化', level: 1 },
      { id: 'subculture-doujin', name: 'サブカル・同人', level: 1 }
    ]
  },
  {
    id: 'sports',
    name: 'スポーツ',
    subcategories: [
      { id: 'baseball', name: '野球', level: 1 },
      { id: 'soccer', name: 'サッカー', level: 1 },
      { id: 'basketball', name: 'バスケットボール', level: 1 },
      { id: 'martial-arts', name: '格闘技', level: 1 },
      { id: 'olympics-international', name: 'オリンピック・国際大会', level: 1 },
      { id: 'athletes-teams', name: 'スポーツ選手・チーム', level: 1 },
      { id: 'sports-culture', name: 'スポーツ観戦文化', level: 1 }
    ]
  },
  {
    id: 'other',
    name: 'その他',
    subcategories: []
  }
];

export type CategoryId = string;