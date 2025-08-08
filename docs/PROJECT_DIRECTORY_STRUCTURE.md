# OwlNest プロジェクト ディレクトリ構成ドキュメント

## プロジェクト概要

OwlNestは、議論プラットフォームを構築するためのReact + TypeScriptベースのWebアプリケーションです。AWS CDKを使用したインフラストラクチャ管理、リアルタイム機能、モデレーション機能、分析機能などを含む包括的なプラットフォームです。

## 主要機能

### TypeScript Configuration

- Enhanced with path mapping for cleaner imports
- Strict type checking enabled
- Support for both `src` and `cdk` directories

### Design System

- Comprehensive color palette with light/dark theme support
- Typography system with Japanese font support
- Consistent spacing and layout system
- Responsive breakpoints

### Development Tools

- ESLint with import ordering rules
- Prettier for code formatting
- Additional npm scripts for linting and type checking

### State Management

- Context API based architecture
- Theme management with localStorage persistence
- Global error handling system

### API Integration

- Base API service with error handling
- JWT token management
- Type-safe API responses

## ルートディレクトリ構成

### 📁 `.git/`

**用途**: Gitバージョン管理システムの内部ファイル

- コミット履歴、ブランチ情報、設定ファイルなどを格納

### 📁 `.github/`

**用途**: GitHub Actions CI/CDワークフロー設定

- `workflows/`: CI/CD パイプライン定義
  - `ci.yml`: 継続的インテグレーション
  - `cd-development.yml`: 開発環境デプロイ
  - `cd-staging.yml`: ステージング環境デプロイ
  - `cd-production.yml`: 本番環境デプロイ

### 📁 `.kiro/`

**用途**: Kiro IDE設定とスペック管理

- `specs/`: 機能仕様書とタスク管理
  - `discussion-platform-enhancement/`: 議論プラットフォーム拡張仕様
  - `post-type-architecture/`: 投稿タイプアーキテクチャ仕様

### 📁 `.vscode/`

**用途**: Visual Studio Code エディタ設定

- `settings.json`: プロジェクト固有のエディタ設定

### 📁 `build/`

**用途**: ビルド成果物（本番用静的ファイル）

- React アプリケーションのコンパイル済みファイル

### 📁 `cdk/`

**用途**: AWS CDK インフラストラクチャコード

- **サブディレクトリ**:
  - `bin/`: CDK アプリケーションエントリーポイント
  - `lib/`: スタック定義とインフラストラクチャコード
  - `lambda/`: Lambda関数のソースコード
    - `analytics/`: 分析機能
    - `auth/`: 認証機能
    - `discussion/`: 議論機能
    - `file-upload/`: ファイルアップロード
    - `follow/`: フォロー機能
    - `moderation/`: モデレーション機能
    - `notification/`: 通知機能
    - `post/`: 投稿機能
    - `search/`: 検索機能
    - `user/`: ユーザー管理
    - `websocket/`: WebSocket通信
  - `config/`: 環境別設定ファイル
  - `scripts/`: デプロイメントスクリプト

### 📁 `docs/`

**用途**: プロジェクトドキュメント

- `README.md`: 統合されたドキュメント索引
- `deployment/`: デプロイメント関連ドキュメント
  - `deployment-guide.md`: CI/CD + デプロイメント統合版
- `development/`: 開発者向けドキュメント
  - `kiro-request-guide.md`: Kiro使用ガイド
  - `spec-management-guide.md`: 仕様管理ガイド
  - `type-definitions-guide.md`: 型定義ガイド
  - `troubleshooting.md`: トラブルシューティング
- `PROJECT_DIRECTORY_STRUCTURE.md`: このファイル

### 📁 `node_modules/`

**用途**: npm/yarn依存関係パッケージ

- プロジェクトで使用するすべてのライブラリとその依存関係

### 📁 `public/`

**用途**: 静的アセット（ビルド時にそのままコピーされるファイル）

- `favicon.ico`: ファビコン
- `logo192.png`, `logo512.png`: アプリケーションロゴ
- `manifest.json`: PWA マニフェスト
- `robots.txt`: 検索エンジン向け設定

### 📁 `scripts/`

**用途**: 開発・デプロイメント用スクリプト

- `setup-cicd.ps1`: CI/CD セットアップスクリプト
- `setup-jest.ps1/.sh`: テスト環境セットアップ
- `test-runner.js`: テスト実行スクリプト

### 📁 `src/`

**用途**: アプリケーションのメインソースコード

詳細は後述の「srcディレクトリ詳細」を参照

### 📁 `works/`

**用途**: 作業用ファイル・差分ファイル

- `diff_1.txt`, `diff_2.txt`: 変更差分ファイル
- `kiro-request.md`: Kiro関連の作業メモ

## 設定ファイル

### 📄 環境設定

- `.env*`: 環境変数設定ファイル
- `vite.config.ts`: Vite ビルドツール設定
- `tsconfig*.json`: TypeScript コンパイラ設定

### 📄 品質管理

- `eslint.config.js`: ESLint コード品質チェック設定
- `.prettierrc`: Prettier コードフォーマッター設定
- `jest.config.js`: Jest テストフレームワーク設定

### �  パッケージ管理

- `package.json`: プロジェクト依存関係とスクリプト定義
- `package-lock.json`: 依存関係のロックファイル

## 環境変数ファイルの使い分け

### 1. 環境変数ファイルの種類

#### `.env` (ベース環境変数)

- **用途**: 全環境で共通の設定値
- **優先度**: 最も低い（他のファイルで上書きされる）
- **内容例**: デフォルト値、共通設定

#### `.env.development` (開発環境専用)

- **用途**: 開発環境でのみ使用される設定
- **優先度**: 開発時は.envより高い
- **内容例**: ローカルAPI URL、デバッグモード有効、モック設定

#### `.env.production` (本番環境専用)

- **用途**: 本番環境でのみ使用される設定
- **優先度**: 本番ビルド時は.envより高い
- **内容例**: 本番API URL、デバッグモード無効、最適化設定

#### `.env.example` (テンプレート)

- **用途**: 環境変数のテンプレート・ドキュメント
- **特徴**: 実際には読み込まれない、新しい開発者向けの設定例、機密情報は含まない

### 2. Viteの環境変数読み込み優先順位

1. `.env.[mode].local` (最高優先度)
2. `.env.local`
3. `.env.[mode]` (.env.development / .env.production)
4. `.env` (最低優先度)

### 3. 実行コマンドと環境変数の関係

#### 開発環境 (`npm run dev` / `npm run start`)

- **環境**: development
- **読み込まれる環境変数**: .env.development.local → .env.local → .env.development → .env
- **特徴**: 開発サーバー起動、ホットリロード有効、デバッグ情報表示

#### 本番ビルド (`npm run build`)

- **環境**: production
- **読み込まれる環境変数**: .env.production.local → .env.local → .env.production → .env
- **特徴**: 本番用ビルド、コード最適化、デバッグ情報削除

## srcディレクトリ詳細

### 📁 `src/components/`

**用途**: Reactコンポーネント（機能別に分類）

#### ルートレベルコンポーネント

- `Header.tsx`: アプリケーションヘッダー（ロゴ、タイトル、ナビゲーション）
- `Sidebar.tsx`: サイドバーナビゲーション（権限ベースのメニュー表示）
- `SortableTile.tsx`: ドラッグ&ドロップ可能な投稿タイル

#### サブディレクトリ構成

**`analytics/`**: 分析・統計表示コンポーネント

- `DataExportDialog.tsx`: データエクスポートダイアログ（CSV/JSON形式対応）
- `DiscussionStatisticsCard.tsx`: 議論統計カード（参加者数、投稿数、エンゲージメント率）
- `ExportButton.tsx`: エクスポートボタン（各種データ形式に対応）
- `StanceDistributionChart.tsx`: スタンス分布チャート（賛成/反対/中立の可視化）
- `StatisticsDashboard.tsx`: プラットフォーム統計ダッシュボード
- `TrendAnalysisDashboard.tsx`: トレンド分析ダッシュボード
- `TrendChart.tsx`: トレンドチャート（時系列データの可視化）

**`auth/`**: 認証関連コンポーネント

- `AuthModal.tsx`: 認証モーダル（ログイン/登録/確認画面の切り替え）
- `ConfirmSignUpForm.tsx`: メールアドレス確認フォーム
- `LoginForm.tsx`: ログインフォーム
- `PermissionDemo.tsx`: 権限システムデモ（開発・テスト用）
- `PermissionError.tsx`: 権限エラー表示（権限不足時のメッセージ）
- `PermissionGate.tsx`: 権限ベースのコンポーネント表示制御
- `RegisterForm.tsx`: ユーザー登録フォーム
- `UserRoleBadge.tsx`: ユーザー権限バッジ（閲覧者/投稿者/作成者/管理者）

**`common/`**: 共通UI コンポーネント

- `Button.tsx`: 再利用可能なボタンコンポーネント（バリアント、サイズ対応）
- `ErrorBoundary.tsx`: エラーバウンダリ（予期しないエラーのキャッチ）
- `LazyImage.tsx`: 遅延読み込み画像（最適化、レスポンシブ対応）
- `LoadingSpinner.tsx`: ローディングスピナー
- `OptimizedComponent.tsx`: パフォーマンス最適化コンポーネント
- `PageTransition.tsx`: ページ遷移アニメーション
- `SEO.tsx`: SEO対応メタタグ管理

**`discussion/`**: 議論機能コンポーネント

- `AccessControlEditor.tsx`: アクセス制御設定エディタ
- `BackgroundKnowledgeEditor.tsx`: 背景知識エディタ
- `CategoryDemo.tsx`: カテゴリ機能デモ
- `CategoryFilter.tsx`: カテゴリフィルター
- `CategorySelector.tsx`: カテゴリ選択器
- `CreateDiscussionDemo.tsx`: 議論作成デモ
- `CreateDiscussionForm.tsx`: 議論作成フォーム
- `DiscussionPointsEditor.tsx`: 議論ポイントエディタ

**`discussions/`**: 議論一覧関連コンポーネント

- `DiscussionCard.tsx`: 議論カード（一覧表示用）
- `DiscussionFilters.tsx`: 議論フィルター
- `DiscussionList.tsx`: 議論一覧表示
- `DiscussionSort.tsx`: 議論ソート機能

**`follow/`**: フォロー機能コンポーネント

- `FollowButton.tsx`: フォローボタン
- `FollowList.tsx`: フォロー一覧表示

**`forms/`**: フォーム関連コンポーネント

- （現在は空のディレクトリ）

**`layout/`**: レイアウトコンポーネント

- `AppLayout.tsx`: アプリケーション全体のレイアウト

**`moderation/`**: モデレーション機能コンポーネント

- `ContentFilterManager.tsx`: コンテンツフィルター管理
- `ModerationQueue.tsx`: モデレーションキュー
- `ModerationQueueFilters.tsx`: モデレーションキューフィルター
- `ModerationQueueItemCard.tsx`: モデレーションアイテムカード
- `PostReportDialog.tsx`: 投稿報告ダイアログ
- `PostReviewDialog.tsx`: 投稿レビューダイアログ
- `SanctionStatusBanner.tsx`: 制裁状況バナー
- `UserSanctionManager.tsx`: ユーザー制裁管理

**`navigation/`**: ナビゲーションコンポーネント

- `Breadcrumb.tsx`: パンくずナビゲーション

**`notifications/`**: 通知機能コンポーネント

- `NotificationBell.tsx`: 通知ベル（未読通知数表示）
- `SanctionNotification.tsx`: 制裁通知

**`posts/`**: 投稿機能コンポーネント

- `DiscussionPointSelector.tsx`: 議論ポイント選択器
- `FileAttachmentDisplay.tsx`: ファイル添付表示
- `FileUploadButton.tsx`: ファイルアップロードボタン
- `FileUploadDemo.tsx`: ファイルアップロードデモ
- `PostCard.tsx`: 投稿カード
- `PostCreationDemo.tsx`: 投稿作成デモ
- `PostCreationForm.tsx`: 投稿作成フォーム
- `PostList.tsx`: 投稿一覧表示
- `PostManagementDemo.tsx`: 投稿管理デモ
- `PostModerationPanel.tsx`: 投稿モデレーションパネル
- `PostThread.tsx`: 投稿スレッド表示
- `RichTextEditor.tsx`: リッチテキストエディタ
- `StanceSelector.tsx`: スタンス選択器（賛成/反対/中立/わからない）

**`realtime/`**: リアルタイム機能コンポーネント

- `RealtimeStatus.tsx`: リアルタイム接続状況表示
- `TypingIndicator.tsx`: 入力中インジケーター

**`routing/`**: ルーティング関連コンポーネント

- `PageTransition.tsx`: ページ遷移アニメーション
- `ProtectedRoute.tsx`: 認証が必要なルート
- `PublicRoute.tsx`: 公開ルート
- `RouteGuard.tsx`: ルートガード（権限チェック）
- `RouteLoadingIndicator.tsx`: ルート読み込みインジケーター

**`search/`**: 検索機能コンポーネント

- `AdvancedSearchFilters.tsx`: 高度な検索フィルター
- `SearchAutocomplete.tsx`: 検索オートコンプリート
- `SearchBar.tsx`: 検索バー
- `SearchHistory.tsx`: 検索履歴
- `SearchResults.tsx`: 検索結果表示

**`timeline/`**: タイムライン表示コンポーネント

- `TimelineFilters.tsx`: タイムラインフィルター
- `TimelineItem.tsx`: タイムラインアイテム
- `TimelineList.tsx`: タイムライン一覧表示

**`user/`**: ユーザー関連コンポーネント

- （現在は空のディレクトリ）

**`websocket/`**: WebSocket通信コンポーネント

- `ConnectionDemo.tsx`: WebSocket接続デモ
- `ConnectionStatus.tsx`: WebSocket接続状況表示

### 📁 `src/pages/`

**用途**: ページレベルコンポーネント

- `AnalyticsPage.tsx`: 分析ページ
- `CreateDiscussionPage.tsx`: 議論作成ページ
- `DiscussionListPage.tsx`: 議論一覧ページ
- `DiscussionPage.tsx`: 議論詳細ページ
- `FollowingPage.tsx`: フォロー中ページ
- `LoginPage.tsx`: ログインページ
- `ModerationPage.tsx`: モデレーションページ
- `SearchPage.tsx`: 検索ページ
- `SettingsPage.tsx`: 設定ページ
- `TimelinePage.tsx`: タイムラインページ

### 📁 `src/services/`

**用途**: API通信・ビジネスロジック

- `analyticsService.ts`: 分析データ処理
- `authService.ts`: 認証処理
- `discussionService.ts`: 議論データ処理
- `followService.ts`: フォロー機能処理
- `moderationService.ts`: モデレーション処理
- `notificationService.ts`: 通知処理
- `postService.ts`: 投稿処理
- `searchService.ts`: 検索処理
- `websocketService.ts`: WebSocket通信処理
- `dynamodb/`: DynamoDB関連処理

### 📁 `src/types/`

**用途**: TypeScript型定義

- `analytics.ts`: 分析関連型
- `auth.ts`: 認証関連型
- `common.ts`: 共通型定義
- `discussion.ts`: 議論関連型
- `follow.ts`: フォロー関連型
- `moderation.ts`: モデレーション関連型
- `notification.ts`: 通知関連型
- `post.ts`: 投稿関連型
- `websocket.ts`: WebSocket関連型

### 📁 `src/hooks/`

**用途**: カスタムReactフック

- `useAuth.ts`: 認証状態管理
- `useAnalytics.ts`: 分析データ管理
- `useCategories.ts`: カテゴリ管理
- `useLocalStorage.ts`: ローカルストレージ管理
- `usePermissions.ts`: 権限管理
- `useRealtimeDiscussion.ts`: リアルタイム議論管理
- `useSearch.ts`: 検索機能管理

### 📁 `src/contexts/`

**用途**: React Context（グローバル状態管理）

- `AuthContext.tsx`: 認証状態
- `FollowContext.tsx`: フォロー状態
- `NotificationContext.tsx`: 通知状態
- `WebSocketContext.tsx`: WebSocket接続状態

### 📁 `src/utils/`

**用途**: ユーティリティ関数

- `classNames.ts`: CSS クラス名管理
- `dataTransform.ts`: データ変換処理
- `error.ts`: エラーハンドリング
- `performanceMonitoring.tsx`: パフォーマンス監視
- `testUtils.tsx`: テスト用ユーティリティ
- `validation.ts`: バリデーション処理

### 📁 `src/__tests__/`

**用途**: テストファイル

- `e2e/`: エンドツーエンドテスト
- `integration/`: 統合テスト
- `performance/`: パフォーマンステスト

### 📁 `src/assets/`

**用途**: 静的アセット（画像、フォント、アイコン）

- `fonts/`: フォントファイル
- `icons/`: アイコンファイル
- `images/`: 画像ファイル

### 📁 `src/styles/`

**用途**: スタイルシート

- `components/`: コンポーネント別スタイル
- `globals/`: グローバルスタイル
- `themes/`: テーマ定義

## 使用例

### Path Mappingを使用したインポート

```typescript
// 相対インポートの代わりに
import { Button } from '../../../components/common/Button';

// Path mappingを使用
import { Button } from '@/components/common';
```

### テーマシステムの使用

```typescript
import { useTheme } from '@/store';

const MyComponent = () => {
  const { currentTheme, toggleTheme } = useTheme();
  
  return (
    <div style={{ color: currentTheme.colors.text }}>
      <button onClick={toggleTheme}>Toggle Theme</button>
    </div>
  );
};
```

### 型安全なAPI呼び出し

```typescript
import { apiService } from '@/services/api';
import { Discussion } from '@/types';

const discussions = await apiService.get<Discussion[]>('/discussions');
```

## 開発スクリプト

- `npm start` - Start development server
- `npm run build` - Build for production
- `npm run test` - Run tests
- `npm run test:coverage` - Run tests with coverage
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run format` - Format code with Prettier
- `npm run type-check` - Run TypeScript type checking

## 開発フロー

### 1. 機能開発

1. `.kiro/specs/` で仕様を定義
2. `src/types/` で型定義を作成
3. `src/services/` でAPI処理を実装
4. `src/components/` でUIコンポーネントを作成
5. `src/pages/` でページを構築

### 2. インフラ管理

1. `cdk/lib/` でAWSリソースを定義
2. `cdk/lambda/` でサーバーサイド処理を実装
3. `cdk/config/` で環境別設定を管理

### 3. デプロイメント

1. GitHub Actions（`.github/workflows/`）で自動デプロイ
2. `scripts/` のスクリプトで環境セットアップ
3. `cdk/scripts/` でインフラデプロイ

## 技術スタック

### フロントエンド

- **React 18**: UIライブラリ
- **TypeScript**: 型安全な開発
- **Vite**: 高速ビルドツール
- **Material-UI**: UIコンポーネントライブラリ

### バックエンド

- **AWS Lambda**: サーバーレス関数
- **DynamoDB**: NoSQLデータベース
- **API Gateway**: REST API
- **WebSocket API**: リアルタイム通信

### インフラ

- **AWS CDK**: インフラストラクチャ as Code
- **CloudFront**: CDN
- **S3**: 静的ファイルホスティング
- **Cognito**: 認証サービス

### 開発ツール

- **ESLint**: コード品質チェック
- **Prettier**: コードフォーマッター
- **Jest**: テストフレームワーク
- **GitHub Actions**: CI/CD

このドキュメントは、プロジェクトの全体構造を理解し、効率的な開発を行うためのガイドとして活用してください。
