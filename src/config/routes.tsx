import React from 'react';
import { UserRole } from '../types/auth';
import { lazyLoad } from '../utils/lazyLoad';
// Auth pages (not lazy loaded as they're needed immediately)
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { UnauthorizedPage } from '../pages/UnauthorizedPage';
import { NotFoundPage } from '../pages/NotFoundPage';

// Lazy load page components for code splitting
const DiscussionListPage = lazyLoad(() => import('../pages/DiscussionListPage'));
const DiscussionPage = lazyLoad(() => import('../pages/DiscussionPage'));
const CreateDiscussionPage = lazyLoad(() => import('../pages/CreateDiscussionPage'));
const MyDiscussionsPage = lazyLoad(() => import('../pages/MyDiscussionsPage'));
const TimelinePage = lazyLoad(() => import('../pages/TimelinePage'));
const FollowingPage = lazyLoad(() => import('../pages/FollowingPage'));
const SettingsPage = lazyLoad(() => import('../pages/SettingsPage'));
const SearchPage = lazyLoad(() => import('../pages/SearchPage').then(module => ({ default: module.SearchPage })));
const ModerationPage = lazyLoad(() => import('../pages/ModerationPage').then(module => ({ default: module.ModerationPage })));
const Home = lazyLoad(() => import('../pages/Home'));

export interface RouteConfig {
  path: string;
  element: React.ReactNode;
  requiredRole?: UserRole;
  requiredPermission?: 'canView' | 'canPost' | 'canCreateDiscussion' | 'canModerate' | 'canManageUsers';
  title?: string;
  description?: string;
  isPublic?: boolean;
  isRestricted?: boolean; // For auth pages that redirect authenticated users
  keywords?: string[];
  breadcrumbLabel?: string;
  preloadRoutes?: string[]; // Routes to preload when this route is accessed
}

export const publicRoutes: RouteConfig[] = [
  {
    path: '/login',
    element: <LoginPage />,
    isPublic: true,
    isRestricted: true,
    title: 'ログイン - OwlNest',
    description: 'OwlNestにログインして議論に参加しましょう'
  },
  {
    path: '/register',
    element: <RegisterPage />,
    isPublic: true,
    isRestricted: true,
    title: '新規登録 - OwlNest',
    description: 'OwlNestに新規登録して議論プラットフォームを始めましょう'
  },
  {
    path: '/unauthorized',
    element: <UnauthorizedPage />,
    isPublic: true,
    title: 'アクセス権限がありません - OwlNest'
  },
  {
    path: '/404',
    element: <NotFoundPage />,
    isPublic: true,
    title: 'ページが見つかりません - OwlNest'
  }
];

export const protectedRoutes: RouteConfig[] = [
  {
    path: '/',
    element: <DiscussionListPage />,
    title: 'ホーム - OwlNest',
    description: '議論プラットフォーム OwlNest',
    keywords: ['議論', 'ディスカッション', 'プラットフォーム'],
    breadcrumbLabel: 'ホーム',
    preloadRoutes: ['timeline', 'create-discussion']
  },
  {
    path: '/home',
    element: <Home />,
    title: 'ダッシュボード - OwlNest',
    description: 'あなたの議論活動の概要',
    keywords: ['ダッシュボード', '活動', '統計'],
    breadcrumbLabel: 'ダッシュボード',
    preloadRoutes: ['discussions', 'my-discussions']
  },
  {
    path: '/discussions',
    element: <DiscussionListPage />,
    title: '議論一覧 - OwlNest',
    description: '進行中の議論を探して参加しましょう',
    keywords: ['議論一覧', '検索', 'カテゴリ'],
    breadcrumbLabel: '議論一覧',
    preloadRoutes: ['create-discussion', 'timeline']
  },
  {
    path: '/search',
    element: <SearchPage />,
    title: '検索 - OwlNest',
    description: '議論と投稿を検索して見つけましょう',
    keywords: ['検索', '議論検索', '投稿検索', 'フィルター'],
    breadcrumbLabel: '検索',
    preloadRoutes: ['discussions', 'timeline']
  },
  {
    path: '/discussion/:id',
    element: <DiscussionPage />,
    title: '議論詳細 - OwlNest',
    description: '議論の詳細と投稿',
    keywords: ['議論詳細', '投稿', 'コメント'],
    breadcrumbLabel: '議論詳細',
    preloadRoutes: ['discussions']
  },
  {
    path: '/create-discussion',
    element: <CreateDiscussionPage />,
    requiredPermission: 'canCreateDiscussion',
    title: '議論を作成 - OwlNest',
    description: '新しい議論トピックを作成しましょう',
    keywords: ['議論作成', '新規', 'トピック'],
    breadcrumbLabel: '議論作成',
    preloadRoutes: ['discussions', 'my-discussions']
  },
  {
    path: '/my-discussions',
    element: <MyDiscussionsPage />,
    requiredPermission: 'canCreateDiscussion',
    title: '自分の議論 - OwlNest',
    description: 'あなたが作成した議論の管理',
    keywords: ['自分の議論', '管理', '編集'],
    breadcrumbLabel: '自分の議論',
    preloadRoutes: ['create-discussion', 'discussions']
  },
  {
    path: '/timeline',
    element: <TimelinePage />,
    title: 'タイムライン - OwlNest',
    description: 'フォローしているユーザーと議論の最新投稿',
    keywords: ['タイムライン', 'フォロー', '最新'],
    breadcrumbLabel: 'タイムライン',
    preloadRoutes: ['following', 'discussions']
  },
  {
    path: '/following',
    element: <FollowingPage />,
    title: 'フォロー中 - OwlNest',
    description: 'フォローしているユーザーと議論の管理',
    keywords: ['フォロー', 'ユーザー', '管理'],
    breadcrumbLabel: 'フォロー中',
    preloadRoutes: ['timeline', 'discussions']
  },
  {
    path: '/settings',
    element: <SettingsPage />,
    title: '設定 - OwlNest',
    description: 'アカウント設定と環境設定',
    keywords: ['設定', 'アカウント', 'プロフィール'],
    breadcrumbLabel: '設定',
    preloadRoutes: []
  },
  {
    path: '/moderation',
    element: <ModerationPage />,
    requiredPermission: 'canModerate',
    title: 'モデレーション - OwlNest',
    description: '投稿の報告を確認し、適切なモデレーション措置を実行します',
    keywords: ['モデレーション', '報告', '管理'],
    breadcrumbLabel: 'モデレーション',
    preloadRoutes: []
  }
];

export const adminRoutes: RouteConfig[] = [
  // Admin routes will be implemented later
];

// Legacy route redirects
export const legacyRoutes = [
  { from: '/discussion', to: '/discussions' },
  { from: '/owlnest', to: '/discussions' }
];