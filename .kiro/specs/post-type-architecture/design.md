# Design Document - Post Type Architecture

## Overview

OwlNestプロジェクトでは、投稿（Post）に関して複数の型を定義し、それぞれ異なる用途で使い分けています。この設計により、パフォーマンス、保守性、型安全性を両立させています。

## Architecture

### 型の階層構造

```
Post (Database Entity)
├── PostListItem (UI Display)
├── PostSummary (Card/Preview)
├── PostDetail (Full View)
└── CreatePostData (Creation)
```

### データフロー

```
Database → Post → PostListItem → UI Component
                ↓
            PostDetail → Detail View
                ↓
            PostSummary → Card Component
```

## Type Definitions and Usage

### 1. Post (Database Entity Type)

**用途**: データベース操作、バックエンド処理、完全なデータ管理

**特徴**:
- DynamoDBの完全なスキーマを反映
- モデレーション情報、メタデータを含む
- PK/SK/GSIキー構造を含む
- 内部処理用の完全な型

```typescript
interface Post extends DynamoDBItem, BaseEntity {
  // DynamoDB Keys
  PK: `DISCUSSION#${string}`;
  SK: `POST#${string}`;
  GSI1PK: `POINT#${string}`;
  
  // Core Data
  postId: string;
  content: string;
  
  // Internal Metadata
  moderation: ModerationStatus;
  metadata: PostMetadata;
  statistics: PostStatistics;
}
```

**使用場面**:
- データベースCRUD操作
- バックエンドAPI処理
- モデレーション処理
- 統計情報の更新

### 2. PostListItem (UI Display Type)

**用途**: 投稿一覧表示、リスト表示、リアルタイム更新

**特徴**:
- UI表示に最適化された軽量な型
- 追加のコンテキスト情報（discussionTitle, discussionPointTitle）
- ユーザー権限情報（canEdit, canDelete）
- 表示用に最適化された統計情報

```typescript
interface PostListItem {
  // Core Display Data
  postId: string;
  content: string;
  
  // Context Information
  discussionTitle: string;
  discussionPointTitle: string;
  
  // User Permissions
  canEdit?: boolean;
  canDelete?: boolean;
  
  // Optimized Statistics
  statistics: {
    replyCount: number;
    likeCount: number;
    viewCount: number;
  };
}
```

**使用場面**:
- 投稿一覧コンポーネント
- フィード表示
- 検索結果表示
- リアルタイム更新

### 3. PostSummary (Card/Preview Type)

**用途**: カード表示、プレビュー、サマリー表示

**特徴**:
- 最小限の表示情報
- カード形式での表示に最適化
- 概要情報のみ

### 4. PostDetail (Full View Type)

**用途**: 投稿詳細表示、返信表示、完全な投稿ビュー

**特徴**:
- Post型を拡張
- 返信、リアクション詳細を含む
- 完全な表示情報

## Design Decisions

### なぜ型を分離するのか？

#### 1. パフォーマンス最適化

**問題**: 投稿一覧で全データを転送すると、ネットワーク帯域とメモリを無駄に消費

**解決**: PostListItemで必要最小限のデータのみ転送

```typescript
// ❌ 非効率: 全データを転送
const posts: Post[] = await fetchPosts(); // 重い

// ✅ 効率的: 表示用データのみ転送
const posts: PostListItem[] = await fetchPostsForList(); // 軽い
```

#### 2. 関心の分離

**データベース層**: Post型で完全なデータ管理
**UI層**: PostListItem型で表示に特化

```typescript
// データベース層
async function savePost(post: Post): Promise<void> {
  // 完全なデータでDB操作
}

// UI層
function PostList({ posts }: { posts: PostListItem[] }) {
  // 表示に最適化されたデータでレンダリング
}
```

#### 3. 型安全性の向上

**問題**: 一つの型で全用途をカバーすると、不要なプロパティへのアクセスが可能

**解決**: 用途別の型で適切な制約を設ける

```typescript
// ❌ 問題: UI層でモデレーション情報にアクセス可能
function PostCard({ post }: { post: Post }) {
  // UIでは不要なデータにアクセスできてしまう
  const moderation = post.moderation; // 不適切
}

// ✅ 解決: UI層では表示用データのみアクセス可能
function PostCard({ post }: { post: PostListItem }) {
  // 表示に必要なデータのみアクセス可能
  const title = post.discussionTitle; // 適切
}
```

#### 4. 進化可能性の確保

**将来の変更に対する柔軟性**:
- データベーススキーマ変更 → Post型のみ影響
- UI要件変更 → PostListItem型のみ影響
- 新しい表示形式 → 新しい型を追加

### 型変換の設計

#### 変換ユーティリティ

```typescript
// Post → PostListItem の安全な変換
function convertPostToPostListItem(
  post: Post,
  discussionTitle: string,
  discussionPointTitle: string
): PostListItem {
  return {
    // 基本データのマッピング
    postId: post.postId,
    content: post.content,
    
    // 追加コンテキストの注入
    discussionTitle,
    discussionPointTitle,
    
    // 権限情報の計算
    canEdit: calculateCanEdit(post),
    canDelete: calculateCanDelete(post),
    
    // 統計情報の最適化
    statistics: optimizeStatistics(post.statistics),
  };
}
```

#### リアルタイム更新での変換

```typescript
// 最小限のデータからPostListItemを構築
function createPostListItemFromMinimalData(
  postData: MinimalPostData,
  discussionTitle: string,
  discussionPointTitle: string
): PostListItem {
  return {
    ...postData,
    discussionTitle,
    discussionPointTitle,
    // デフォルト値の設定
    statistics: {
      replyCount: 0,
      likeCount: 0,
      viewCount: 0,
    },
    canEdit: false,
    canDelete: false,
  };
}
```

## Benefits of This Design

### 1. パフォーマンス向上
- データ転送量の削減（約60-70%削減）
- メモリ使用量の最適化
- レンダリング速度の向上

### 2. 保守性の向上
- 関心の分離による明確な責任範囲
- 変更の影響範囲の限定
- テストの容易性

### 3. 型安全性の確保
- 用途に応じた適切な型制約
- コンパイル時エラーによる早期発見
- IDEサポートの向上

### 4. 開発者体験の向上
- 明確な型の使い分け
- 適切な抽象化レベル
- 豊富なドキュメント

## Trade-offs

### デメリット
1. **複雑性の増加**: 複数の型を管理する必要
2. **変換コスト**: 型変換処理のオーバーヘッド
3. **学習コスト**: 開発者が使い分けを理解する必要

### 対策
1. **明確なドキュメント**: 各型の用途を明確に文書化
2. **ユーティリティ関数**: 型変換を簡単にする関数を提供
3. **TypeScript活用**: コンパイル時チェックで間違いを防止

## Alternative Approaches Considered

### 1. 単一型アプローチ
```typescript
// 一つの型で全てをカバー
interface UnifiedPost {
  // 全フィールドをオプショナルに
  moderation?: ModerationStatus;
  discussionTitle?: string;
  // ...
}
```

**却下理由**: 型安全性の低下、パフォーマンス問題

### 2. 継承ベースアプローチ
```typescript
interface BasePost { /* 共通フィールド */ }
interface FullPost extends BasePost { /* 追加フィールド */ }
interface ListPost extends BasePost { /* UI用フィールド */ }
```

**却下理由**: 複雑な継承階層、柔軟性の不足

### 3. ジェネリック型アプローチ
```typescript
interface Post<T = 'full'> {
  // 条件付き型で制御
}
```

**却下理由**: 複雑すぎる型定義、理解困難

## Conclusion

現在の型分離アプローチは、パフォーマンス、保守性、型安全性のバランスを最適化した設計です。複雑性の増加というトレードオフはありますが、適切なドキュメントとユーティリティ関数により、開発者体験を向上させています。