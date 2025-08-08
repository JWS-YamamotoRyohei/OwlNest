# 型定義ガイド

> OwlNestプロジェクトの型定義（src/types/）の完全ドキュメント

## 📋 目次

1. [概要](#概要)
2. [共通型定義 (common.ts)](#共通型定義-commonts)
3. [認証型定義 (auth.ts)](#認証型定義-authts)
4. [ユーザー型定義 (User.ts)](#ユーザー型定義-userts)
5. [議論型定義 (discussion.ts)](#議論型定義-discussionts)
6. [投稿型定義 (post.ts)](#投稿型定義-postts)
7. [フォロー型定義 (follow.ts)](#フォロー型定義-followts)
8. [通知型定義 (notification.ts)](#通知型定義-notificationts)
9. [モデレーション型定義 (moderation.ts)](#モデレーション型定義-moderationts)
10. [分析型定義 (analytics.ts)](#分析型定義-analyticsts)
11. [カテゴリ型定義 (categories.ts)](#カテゴリ型定義-categorists)
12. [エラー型定義 (error.ts)](#エラー型定義-errorts)
13. [WebSocket型定義 (websocket.ts)](#websocket型定義-websocketts)
14. [型の関係図](#型の関係図)

---

## 概要

OwlNestプロジェクトでは、TypeScriptの型システムを活用して、データの整合性と開発者体験を向上させています。型定義は機能別に分類され、それぞれが特定の責任を持っています。

### 型定義ファイルの構成

```
src/types/
├── common.ts        # 共通型・基底型・ユーティリティ型
├── auth.ts          # 認証・ログイン関連
├── User.ts          # ユーザープロフィール・セッション管理
├── discussion.ts    # 議論・論点関連
├── post.ts          # 投稿・コメント関連
├── follow.ts        # フォロー・タイムライン関連
├── notification.ts  # 通知・お知らせ関連
├── moderation.ts    # モデレーション・管理関連
├── analytics.ts     # 分析・統計関連
├── categories.ts    # カテゴリ・分類関連
├── error.ts         # エラーハンドリング関連
├── websocket.ts     # リアルタイム通信関連
└── index.ts         # 型定義のエクスポート
```

---

## 共通型定義 (common.ts)

### 基底型・ユーティリティ型

#### `UserRole`
**用途**: システム内のユーザー権限レベルを定義

```typescript
enum UserRole {
  VIEWER = 'viewer',        // 閲覧のみ
  CONTRIBUTOR = 'contributor', // 投稿可能
  CREATOR = 'creator',      // 議論作成可能
  ADMIN = 'admin'           // 管理者権限
}
```

#### `Stance`
**用途**: 議論における立場・スタンスを表現

```typescript
enum Stance {
  PROS = 'pros',        // 賛成・支持
  CONS = 'cons',        // 反対・批判
  NEUTRAL = 'neutral',  // 中立・どちらでもない
  UNKNOWN = 'unknown',  // 不明・未設定
  HIDDEN = 'hidden'     // 非表示
}
```

#### `DiscussionCategory`
**用途**: 議論のカテゴリ分類（UI表示用の簡略版）

```typescript
enum DiscussionCategory {
  POLITICS = 'politics',        // 政治
  ECONOMY = 'economy',          // 経済・産業
  SOCIETY = 'society',          // 社会・生活
  TECHNOLOGY = 'technology',    // ネット・テクノロジー
  ENTERTAINMENT = 'entertainment', // エンタメ
  SPORTS = 'sports',            // スポーツ
  OTHER = 'other'               // その他
}
```

#### `DetailedDiscussionCategory`
**用途**: 詳細なカテゴリ分類（将来の機能拡張用）

```typescript
enum DetailedDiscussionCategory {
  // 政治関連
  POLITICS_NATIONAL = 'politics_national',     // 国の政治
  POLITICS_LOCAL = 'politics_local',           // 地方政治
  POLITICS_INTERNATIONAL = 'politics_international', // 国際政治
  // ... 他のカテゴリも同様
}
```

#### `EntityType`
**用途**: DynamoDBエンティティタイプの識別

```typescript
enum EntityType {
  USER_PROFILE = 'UserProfile',
  DISCUSSION = 'Discussion',
  DISCUSSION_POINT = 'DiscussionPoint',
  POST = 'Post',
  NOTIFICATION = 'Notification',
  // ... 他のエンティティタイプ
}
```

#### `BaseEntity`
**用途**: 全エンティティの基底インターフェース

```typescript
interface BaseEntity {
  createdAt: string;    // 作成日時（ISO 8601形式）
  updatedAt: string;    // 更新日時（ISO 8601形式）
}
```

**各プロパティの用途**:
- `createdAt`: エンティティの作成時刻を記録、ソート・フィルタリングに使用
- `updatedAt`: 最終更新時刻を記録、変更検知・同期に使用

#### `PaginationResult<T>`
**用途**: ページネーション結果の標準化

```typescript
interface PaginationResult<T> {
  items: T[];            // 結果アイテム一覧
  nextToken?: string;    // 次のページ取得用トークン
  hasMore: boolean;      // 次のページが存在するか
  totalCount?: number;   // 総アイテム数（オプション）
}
```

#### `ApiResponse<T>`
**用途**: API レスポンスの標準化

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    timestamp: string;
    requestId?: string;
    [key: string]: any;
  };
}
```

#### `ModerationStatus`
**用途**: コンテンツのモデレーション状態管理

```typescript
interface ModerationStatus {
  isHidden: boolean;        // 非表示状態
  hiddenBy?: string;        // 非表示にしたユーザーID
  hiddenAt?: string;        // 非表示にした日時
  hiddenReason?: string;    // 非表示理由
  isDeleted: boolean;       // 削除状態
  deletedBy?: string;       // 削除したユーザーID
  deletedAt?: string;       // 削除日時
  deletedReason?: string;   // 削除理由
  isReported: boolean;      // 報告状態
  reportCount?: number;     // 報告数
  lastReportedAt?: string;  // 最終報告日時
}
```

---

## 認証型定義 (auth.ts)

### 認証・ログイン関連

#### `User`
**用途**: 認証システムでのユーザー情報管理

```typescript
interface User {
  userId: string;           // ユーザーの一意識別子
  email: string;            // メールアドレス（ログイン用）
  role: UserRole;           // ユーザーロール
  displayName: string;      // 表示名
  bio: string;              // 自己紹介
  avatarUrl: string;        // アバター画像URL
  givenName: string;        // 名前
  familyName: string;       // 姓
  preferences: UserPreferences; // ユーザー設定
  createdAt?: string;       // 作成日時
  updatedAt?: string;       // 更新日時
}
```

**各プロパティの用途**:
- `userId`: ユーザーの一意識別、他のエンティティとの関連付け
- `email`: ログイン認証、通知送信
- `role`: 権限制御、機能アクセス制御
- `displayName`: UI表示、ユーザー識別
- `preferences`: 個人設定、通知設定、プライバシー設定

#### `AuthTokens`
**用途**: 認証トークンの管理

```typescript
interface AuthTokens {
  accessToken: string;      // アクセストークン
  idToken: string;          // IDトークン
  refreshToken: string;     // リフレッシュトークン
  expiresIn: number;        // 有効期限（秒）
}
```

#### `Permission`
**用途**: ユーザーの具体的な権限管理

```typescript
interface Permission {
  canView: boolean;                // 閲覧権限
  canPost: boolean;                // 投稿権限
  canCreateDiscussion: boolean;    // 議論作成権限
  canModerate: boolean;            // モデレーション権限
  canManageUsers: boolean;         // ユーザー管理権限
}
```

#### `ROLE_PERMISSIONS`
**用途**: ロール別権限マッピング

```typescript
const ROLE_PERMISSIONS: Record<UserRole, Permission> = {
  [UserRole.VIEWER]: {
    canView: true,
    canPost: false,
    canCreateDiscussion: false,
    canModerate: false,
    canManageUsers: false,
  },
  // ... 他のロールも同様
};
```

---

## ユーザー型定義 (User.ts)

### ユーザープロフィール・セッション管理

#### `UserProfile`
**用途**: DynamoDBに保存されるユーザープロフィール情報

```typescript
interface UserProfile extends DynamoDBItem, BaseEntity {
  PK: `USER#${string}`;     // パーティションキー
  SK: 'PROFILE';            // ソートキー
  GSI1PK: `ROLE#${UserRole}`; // ロール別検索用
  GSI1SK: `USER#${string}`;   // ユーザーID検索用
  EntityType: EntityType.USER_PROFILE;
  
  // 基本情報
  userId: string;           // ユーザーID
  email: string;            // メールアドレス
  role: UserRole;           // ユーザーロール
  displayName: string;      // 表示名
  avatar?: string;          // アバター画像URL
  bio?: string;             // 自己紹介
  
  // 設定・統計
  preferences: UserPreferences;  // ユーザー設定
  statistics: UserStatistics;    // ユーザー統計
  
  // アカウント状態
  isActive: boolean;        // アカウント有効状態
  isVerified: boolean;      // 認証済み状態
  isSuspended: boolean;     // 停止状態
  suspendedUntil?: string;  // 停止期限
  suspensionReason?: string; // 停止理由
  
  // 監査情報
  lastLoginAt?: string;     // 最終ログイン日時
  loginCount: number;       // ログイン回数
  auditTrail: AuditTrail[]; // 監査ログ
}
```

**各プロパティの用途**:
- `PK/SK`: DynamoDBの主キー、ユーザープロフィールの一意識別
- `GSI1PK/GSI1SK`: ロール別ユーザー検索、管理機能での利用
- `statistics`: ユーザーの活動統計、レピュテーション計算
- `auditTrail`: セキュリティ監査、不正アクセス検知

#### `UserSession`
**用途**: ユーザーセッション情報（メモリ内管理）

```typescript
interface UserSession {
  userId: string;           // ユーザーID
  email: string;            // メールアドレス
  role: UserRole;           // ユーザーロール
  displayName: string;      // 表示名
  avatar?: string;          // アバター画像
  permissions: UserPermissions; // 権限情報
  sessionId: string;        // セッションID
  expiresAt: string;        // セッション有効期限
  issuedAt: string;         // セッション発行日時
}
```

#### `UserPublicProfile`
**用途**: 他のユーザーに公開されるプロフィール情報

```typescript
interface UserPublicProfile {
  userId: string;           // ユーザーID
  displayName: string;      // 表示名
  avatar?: string;          // アバター画像
  bio?: string;             // 自己紹介
  role: UserRole;           // ユーザーロール
  isVerified: boolean;      // 認証済み状態
  createdAt: string;        // アカウント作成日
  lastActivityAt?: string;  // 最終活動日時
  statistics: {             // 公開統計情報
    discussionsCreated: number;
    postsCreated: number;
    followersCount: number;
    reputationScore: number;
  };
  email?: string;           // プライバシー設定により表示
}
```

---

## 議論型定義 (discussion.ts)

### 議論・論点管理

#### `Discussion`
**用途**: 議論の完全な情報を管理（DynamoDB用）

```typescript
interface Discussion extends DynamoDBItem, BaseEntity {
  PK: `DISCUSSION#${string}`;       // パーティションキー
  SK: 'METADATA';                   // ソートキー
  GSI1PK: `CATEGORY#${string}`;     // カテゴリ別検索用
  GSI1SK: `DISCUSSION#${string}`;   // 議論ID検索用
  GSI2PK: `OWNER#${string}`;        // 作成者別検索用
  GSI2SK: `DISCUSSION#${string}`;   // 議論ID検索用
  EntityType: EntityType.DISCUSSION;
  
  // 基本情報
  discussionId: string;             // 議論の一意識別子
  title: string;                    // 議論タイトル
  description: string;              // 議論の説明
  ownerId: string;                  // 作成者のユーザーID
  ownerDisplayName: string;         // 作成者の表示名
  ownerStance: Stance;              // 作成者の立場
  
  // 分類・状態
  categories: DiscussionCategory[]; // カテゴリ一覧
  tags?: string[];                  // タグ一覧
  accessControl: AccessControl;     // アクセス制御設定
  
  // 議論状態
  isActive: boolean;                // 議論の有効状態
  isLocked: boolean;                // ロック状態（投稿不可）
  isPinned: boolean;                // ピン留め状態
  isFeatured: boolean;              // 注目議論状態
  
  // モデレーション・統計
  moderation: ModerationStatus;     // モデレーション状態
  statistics: DiscussionStatistics; // 議論統計
  metadata: DiscussionMetadata;     // メタデータ
}
```

**各プロパティの用途**:
- `discussionId`: 議論の一意識別、URL生成、関連データの紐付け
- `title/description`: ユーザーへの表示、検索対象
- `ownerStance`: 議論作成者の立場明示、バイアス表示
- `accessControl`: 参加制限、プライベート議論の管理
- `isLocked/isPinned/isFeatured`: 議論の表示制御、優先度管理

#### `DiscussionPoint`
**用途**: 議論内の個別論点を管理

```typescript
interface DiscussionPoint extends DynamoDBItem, BaseEntity {
  PK: `DISCUSSION#${string}`;       // 親議論のパーティションキー
  SK: `POINT#${string}`;            // 論点のソートキー
  GSI1PK: `DISCUSSION#${string}`;   // 議論別検索用
  GSI1SK: `POINT#${string}`;        // 論点別検索用
  EntityType: EntityType.DISCUSSION_POINT;
  
  // 基本情報
  pointId: string;                  // 論点の一意識別子
  discussionId: string;             // 親議論のID
  title: string;                    // 論点タイトル
  description?: string;             // 論点の詳細説明
  
  // 階層構造
  parentId?: string;                // 親論点ID（サブ論点の場合）
  level: number;                    // 階層レベル
  order: number;                    // 表示順序
  
  // 統計情報
  postCount: number;                // この論点への投稿数
  prosCount: number;                // 賛成投稿数
  consCount: number;                // 反対投稿数
  neutralCount: number;             // 中立投稿数
  
  // 状態
  isActive: boolean;                // 論点の有効状態
}
```

#### `BackgroundKnowledge`
**用途**: 議論の背景知識・参考資料管理

```typescript
interface BackgroundKnowledge extends DynamoDBItem, BaseEntity {
  PK: `DISCUSSION#${string}`;       // 議論のパーティションキー
  SK: `KNOWLEDGE#${string}`;        // 知識のソートキー
  EntityType: EntityType.BACKGROUND_KNOWLEDGE;
  
  // 基本情報
  knowledgeId: string;              // 知識の一意識別子
  discussionId: string;             // 議論ID
  type: 'text' | 'file' | 'url';   // 知識の種類
  title?: string;                   // タイトル
  content: string;                  // 内容
  order: number;                    // 表示順序
  
  // ファイル情報（type='file'の場合）
  fileAttachment?: FileAttachment;
  
  // URL情報（type='url'の場合）
  urlMetadata?: {
    title?: string;
    description?: string;
    image?: string;
    siteName?: string;
  };
}
```

---

## 投稿型定義 (post.ts)

### 投稿・コメント管理

#### `Post`
**用途**: 投稿の完全な情報を管理（DynamoDB用）

```typescript
interface Post extends DynamoDBItem, BaseEntity {
  PK: `DISCUSSION#${string}`;       // 議論のパーティションキー
  SK: `POST#${string}`;             // 投稿のソートキー
  GSI1PK: `POINT#${string}`;        // 論点別検索用
  GSI1SK: `POST#${string}`;         // 投稿別検索用
  GSI2PK: `USER#${string}`;         // ユーザー別検索用
  GSI2SK: `POST#${string}`;         // 投稿別検索用
  EntityType: EntityType.POST;
  
  // 基本情報
  postId: string;                   // 投稿の一意識別子
  discussionId: string;             // 議論ID
  discussionPointId: string;        // 論点ID
  authorId: string;                 // 投稿者ID
  authorDisplayName: string;        // 投稿者表示名
  content: string;                  // 投稿内容
  stance: Stance;                   // 立場・スタンス
  
  // 階層構造（返信用）
  parentId?: string;                // 親投稿ID
  level: number;                    // 階層レベル
  
  // 添付ファイル
  attachments?: FileAttachment[];   // 添付ファイル一覧
  
  // 状態
  isActive: boolean;                // 投稿の有効状態
  isEdited: boolean;                // 編集済みフラグ
  editedAt?: string;                // 編集日時
  
  // モデレーション・統計・メタデータ
  moderation: ModerationStatus;     // モデレーション状態
  statistics: PostStatistics;       // 投稿統計
  metadata: PostMetadata;           // メタデータ
}
```

**各プロパティの用途**:
- `postId`: 投稿の一意識別、返信の親子関係管理
- `discussionId/discussionPointId`: 投稿の所属先管理
- `content`: ユーザーが入力した投稿内容
- `stance`: 議論における立場の明確化
- `parentId/level`: 返信の階層構造管理
- `attachments`: 画像・ファイルの添付機能

#### `PostListItem`
**用途**: 投稿一覧表示用の軽量な型

```typescript
interface PostListItem {
  postId: string;                   // 投稿ID
  discussionId: string;             // 議論ID
  discussionTitle: string;          // 議論タイトル
  discussionPointId: string;        // 論点ID
  discussionPointTitle: string;     // 論点タイトル
  authorId: string;                 // 投稿者ID
  authorDisplayName: string;        // 投稿者表示名
  authorAvatar?: string;            // 投稿者アバター
  content: {                        // 投稿内容（構造化）
    text: string;                   // テキスト内容
    preview: string;                // プレビュー用短縮テキスト
    hasAttachments: number;         // 添付ファイル有無
    hasLinks: number;               // リンク有無
    attachmentCount: number;        // 添付ファイル数
  };
  stance: Stance;                   // 立場
  parentId?: string;                // 親投稿ID
  level: number;                    // 階層レベル
  attachments?: FileAttachment[];   // 添付ファイル
  isActive: boolean;                // 有効状態
  isEdited: boolean;                // 編集済みフラグ
  editedAt?: string;                // 編集日時
  createdAt: string;                // 作成日時
  updatedAt: string;                // 更新日時
  replyCount: number;               // 返信数
  statistics: {                     // 統計情報（簡略版）
    replyCount: number;             // 返信数
    likeCount: number;              // いいね数
    agreeCount: number;             // 同意数
    disagreeCount: number;          // 反対数
    insightfulCount: number;        // 洞察的数
    funnyCount: number;             // 面白い数
    viewCount: number;              // 閲覧数
  };
  userReaction?: ReactionType;      // ユーザーのリアクション
  canEdit?: boolean;                // 編集権限
  canDelete?: boolean;              // 削除権限
  canReply?: boolean;               // 返信権限
  canReact?: boolean;               // リアクション権限
}
```

#### `PostReaction`
**用途**: 投稿に対するリアクション情報

```typescript
interface PostReaction extends DynamoDBItem, BaseEntity {
  PK: `POST#${string}`;             // 投稿のパーティションキー
  SK: `REACTION#${string}#${string}`; // リアクションのソートキー
  EntityType: EntityType.POST_REACTION;
  
  postId: string;                   // 投稿ID
  userId: string;                   // リアクションしたユーザーID
  reactionType: ReactionType;       // リアクションの種類
}
```

---

## フォロー型定義 (follow.ts)

### フォロー・タイムライン関連

#### `Follow`
**用途**: フォロー関係の管理

```typescript
interface Follow extends DynamoDBItem, BaseEntity {
  PK: `USER#${string}`;             // フォロワーのパーティションキー
  SK: `FOLLOW#${FollowTargetType}#${string}`; // フォロー対象のソートキー
  GSI1PK: `${FollowTargetType}#${string}`;    // 対象別検索用
  GSI1SK: `FOLLOWER#${string}`;     // フォロワー別検索用
  EntityType: EntityType.FOLLOW;
  
  // 基本情報
  followerId: string;               // フォロワーのユーザーID
  targetType: FollowTargetType;     // フォロー対象の種類
  targetId: string;                 // フォロー対象のID
  
  // フォロー設定
  isActive: boolean;                // フォロー状態
  notificationsEnabled: boolean;    // 通知有効状態
  
  // 追加情報
  followReason?: string;            // フォロー理由
  tags?: string[];                  // タグ
}
```

**各プロパティの用途**:
- `followerId`: フォローしているユーザーの識別
- `targetType/targetId`: フォロー対象（ユーザーまたは議論）の識別
- `notificationsEnabled`: フォロー対象の活動通知制御
- `followReason/tags`: フォロー管理、分類機能

#### `FollowTargetType`
**用途**: フォロー対象の種類を定義

```typescript
enum FollowTargetType {
  USER = 'USER',            // ユーザーフォロー
  DISCUSSION = 'DISCUSSION' // 議論フォロー
}
```

#### `TimelineItem`
**用途**: ユーザーのタイムライン項目管理

```typescript
interface TimelineItem extends DynamoDBItem, BaseEntity {
  PK: `USER#${string}`;             // ユーザーのパーティションキー
  SK: `TIMELINE#${string}#${string}`; // タイムラインのソートキー
  GSI1PK: `USER#${string}`;         // ユーザー別検索用
  GSI1SK: `TIMELINE#${string}`;     // タイムライン別検索用
  EntityType: EntityType.TIMELINE_ITEM;
  
  // 基本情報
  userId: string;                   // ユーザーID
  itemType: TimelineItemType;       // アイテムの種類
  itemId: string;                   // アイテムID
  
  // コンテンツ情報
  title: string;                    // タイトル
  preview: string;                  // プレビューテキスト
  authorId: string;                 // 作成者ID
  authorDisplayName: string;        // 作成者表示名
  authorAvatar?: string;            // 作成者アバター
  
  // コンテキスト情報
  discussionId?: string;            // 議論ID
  discussionTitle?: string;         // 議論タイトル
  pointId?: string;                 // 論点ID
  pointTitle?: string;              // 論点タイトル
  
  // メタデータ
  isRead: boolean;                  // 既読状態
  priority: TimelinePriority;       // 優先度
  ttl: number;                      // 自動削除用TTL（30日）
}
```

---

## 通知型定義 (notification.ts)

### 通知・お知らせ関連

#### `Notification`
**用途**: 通知情報の管理

```typescript
interface Notification extends DynamoDBItem, BaseEntity {
  PK: `USER#${string}`;             // ユーザーのパーティションキー
  SK: `NOTIFICATION#${string}`;     // 通知のソートキー
  GSI1PK: `USER#${string}`;         // ユーザー別検索用
  GSI1SK: `NOTIFICATION#${string}`; // 通知別検索用
  EntityType: EntityType.NOTIFICATION;
  
  // 基本情報
  notificationId: string;           // 通知の一意識別子
  userId: string;                   // 通知対象ユーザーID
  type: NotificationType;           // 通知の種類
  title: string;                    // 通知タイトル
  message: string;                  // 通知メッセージ
  
  // 通知データ
  data: NotificationData;           // 通知固有のデータ
  
  // 状態
  isRead: boolean;                  // 既読状態
  isArchived: boolean;              // アーカイブ状態
  
  // 分類・優先度
  priority: NotificationPriority;   // 優先度
  category: NotificationCategory;   // カテゴリ
  
  // アクション
  actions?: NotificationAction[];   // 通知アクション
  
  // メタデータ
  sourceId?: string;                // 通知元ID
  sourceType?: string;              // 通知元タイプ
  relatedUserId?: string;           // 関連ユーザーID
  relatedUserName?: string;         // 関連ユーザー名
  
  ttl: number;                      // 自動削除用TTL（90日）
}
```

**各プロパティの用途**:
- `type`: 通知の種類による処理分岐
- `data`: 通知種類に応じた詳細情報
- `priority`: 通知の表示優先度、配信方法の決定
- `actions`: 通知からの直接アクション（返信、承認等）
- `ttl`: ストレージ容量管理、古い通知の自動削除

#### `NotificationData`
**用途**: 通知種類別の詳細データ（Union型）

```typescript
type NotificationData =
  | PostReplyNotificationData      // 投稿返信通知
  | PostMentionNotificationData    // 投稿メンション通知
  | DiscussionFollowNotificationData // 議論フォロー通知
  | UserFollowNotificationData     // ユーザーフォロー通知
  | DiscussionUpdateNotificationData // 議論更新通知
  | ModerationActionNotificationData // モデレーション通知
  | SystemAnnouncementNotificationData; // システム通知
```

#### `NotificationPreferences`
**用途**: ユーザーの通知設定管理

```typescript
interface NotificationPreferences {
  userId: string;                   // ユーザーID
  
  // チャンネル設定
  email: boolean;                   // メール通知
  push: boolean;                    // プッシュ通知
  inApp: boolean;                   // アプリ内通知
  
  // 種類別設定
  postReplies: boolean;             // 投稿返信通知
  postMentions: boolean;            // メンション通知
  discussionFollows: boolean;       // 議論フォロー通知
  userFollows: boolean;             // ユーザーフォロー通知
  discussionUpdates: boolean;       // 議論更新通知
  moderationActions: boolean;       // モデレーション通知
  systemAnnouncements: boolean;     // システム通知
  
  // 頻度・時間設定
  frequency: NotificationFrequency; // 通知頻度
  quietHours: QuietHours;           // 静寂時間
  
  // グループ化設定
  groupSimilar: boolean;            // 類似通知のグループ化
  maxGroupSize: number;             // グループ最大サイズ
  
  // フィルタリング
  minPriority: NotificationPriority; // 最小優先度
  
  updatedAt: string;                // 設定更新日時
}
```

---

## モデレーション型定義 (moderation.ts)

### モデレーション・管理機能

#### `PostReport`
**用途**: 投稿報告の管理

```typescript
interface PostReport extends DynamoDBItem, BaseEntity {
  PK: `POST#${string}`;             // 投稿のパーティションキー
  SK: `REPORT#${string}`;           // 報告のソートキー
  GSI1PK: `REPORTER#${string}`;     // 報告者別検索用
  GSI1SK: `REPORT#${string}`;       // 報告別検索用
  GSI2PK: `STATUS#${ReportStatus}`; // ステータス別検索用
  GSI2SK: `REPORT#${ReportPriority}#${string}`; // 優先度・日時別検索用
  EntityType: EntityType.POST_REPORT;
  
  // 報告情報
  reportId: string;                 // 報告の一意識別子
  postId: string;                   // 報告対象投稿ID
  discussionId: string;             // 議論ID
  reporterId: string;               // 報告者ID
  reporterDisplayName: string;      // 報告者表示名
  
  // 報告詳細
  category: ReportCategory;         // 報告カテゴリ
  reason: string;                   // 報告理由
  description?: string;             // 詳細説明
  priority: ReportPriority;         // 優先度
  status: ReportStatus;             // 処理状況
  
  // 証拠
  evidence?: {
    screenshots?: string[];         // スクリーンショット（S3 URL）
    additionalContext?: string;     // 追加コンテキスト
    relatedReports?: string[];      // 関連報告ID
  };
  
  // レビュー情報
  reviewedBy?: string;              // レビュー担当者ID
  reviewedAt?: string;              // レビュー日時
  reviewNotes?: string;             // レビューメモ
  resolution?: string;              // 解決内容
  
  // 自動検出情報
  autoDetected?: boolean;           // 自動検出フラグ
  autoDetectionReason?: string;     // 自動検出理由
  autoDetectionConfidence?: number; // 信頼度（0-1）
  
  // メタデータ
  metadata: {
    ipAddress?: string;             // 報告者IPアドレス
    userAgent?: string;             // ユーザーエージェント
    source: 'web' | 'mobile' | 'api' | 'auto'; // 報告元
  };
}
```

**各プロパティの用途**:
- `category/reason`: 報告内容の分類、処理優先度の決定
- `priority/status`: モデレーションキューでの処理順序管理
- `evidence`: 報告の妥当性判断、証拠保全
- `autoDetected`: 自動検出システムとの連携
- `metadata`: 不正報告の検出、パターン分析

#### `ModerationQueueItem`
**用途**: モデレーションキューの項目管理

```typescript
interface ModerationQueueItem extends DynamoDBItem, BaseEntity {
  PK: `MODQUEUE#${ReportPriority}`; // 優先度別パーティションキー
  SK: `ITEM#${string}#${string}`;   // 作成日時・報告IDのソートキー
  GSI1PK: `ASSIGNEE#${string}`;     // 担当者別検索用
  GSI1SK: `ITEM#${string}`;         // アイテム別検索用
  EntityType: EntityType.MODERATION_QUEUE_ITEM;
  
  // キュー項目情報
  queueItemId: string;              // キュー項目ID
  reportId: string;                 // 報告ID
  postId: string;                   // 投稿ID
  discussionId: string;             // 議論ID
  
  // コンテンツ情報
  contentType: 'post' | 'discussion' | 'user'; // コンテンツ種類
  contentPreview: string;           // コンテンツプレビュー
  authorId: string;                 // 作成者ID
  authorDisplayName: string;        // 作成者表示名
  
  // 報告情報
  reportCategory: ReportCategory;   // 報告カテゴリ
  reportReason: string;             // 報告理由
  reporterCount: number;            // 報告者数
  priority: ReportPriority;         // 優先度
  
  // 担当・処理
  assignedTo?: string;              // 担当者ID
  assignedAt?: string;              // 担当割り当て日時
  assignedBy?: string;              // 担当割り当て者ID
  status: ReportStatus;             // 処理状況
  estimatedReviewTime?: number;     // 推定レビュー時間（分）
  actualReviewTime?: number;        // 実際のレビュー時間（分）
  
  // フラグ
  isUrgent: boolean;                // 緊急フラグ
  isEscalated: boolean;             // エスカレーションフラグ
  requiresSpecialAttention: boolean; // 特別注意フラグ
  
  // メタデータ
  metadata: {
    autoDetected: boolean;          // 自動検出フラグ
    similarReportsCount: number;    // 類似報告数
    reporterHistory: {              // 報告者履歴
      totalReports: number;         // 総報告数
      accurateReports: number;      // 正確な報告数
      falseReports: number;         // 誤報告数
    };
  };
}
```

#### `UserSanction`
**用途**: ユーザー制裁措置の管理

```typescript
interface UserSanction extends DynamoDBItem, BaseEntity {
  PK: `USER#${string}`;             // ユーザーのパーティションキー
  SK: `SANCTION#${string}`;         // 制裁のソートキー
  GSI1PK: `MODERATOR#${string}`;    // モデレーター別検索用
  GSI1SK: `SANCTION#${string}`;     // 制裁別検索用
  EntityType: EntityType.USER_SANCTION;
  
  // 制裁情報
  sanctionId: string;               // 制裁の一意識別子
  userId: string;                   // 対象ユーザーID
  userDisplayName: string;          // 対象ユーザー表示名
  moderatorId: string;              // 実行モデレーターID
  moderatorDisplayName: string;     // 実行モデレーター表示名
  
  // 制裁詳細
  sanctionType: SanctionType;       // 制裁の種類
  reason: string;                   // 制裁理由
  description?: string;             // 詳細説明
  
  // 期間（一時制裁の場合）
  startDate: string;                // 開始日時
  endDate?: string;                 // 終了日時
  duration?: number;                // 期間（時間）
  
  // 状態
  isActive: boolean;                // 制裁有効状態
  isAppealed: boolean;              // 異議申し立て状態
  appealedAt?: string;              // 異議申し立て日時
  appealReason?: string;            // 異議申し立て理由
  appealStatus?: 'pending' | 'approved' | 'denied'; // 異議申し立て状況
  appealReviewedBy?: string;        // 異議申し立てレビュー者
  appealReviewedAt?: string;        // 異議申し立てレビュー日時
  
  // 関連情報
  relatedPostId?: string;           // 関連投稿ID
  relatedReportId?: string;         // 関連報告ID
  previousSanctions: string[];      // 過去の制裁ID
  
  // 自動解除
  autoResolveAt?: string;           // 自動解除日時
  isAutoResolved?: boolean;         // 自動解除フラグ
  
  // 通知
  userNotified: boolean;            // ユーザー通知済み
  notifiedAt?: string;              // 通知日時
  notificationMethod?: 'email' | 'in_app' | 'both'; // 通知方法
}
```

---

## 分析型定義 (analytics.ts)

### 分析・統計機能

#### `DiscussionStatistics`
**用途**: 議論の統計情報管理

```typescript
interface DiscussionStatistics {
  discussionId: string;             // 議論ID
  title: string;                    // 議論タイトル
  participantCount: number;         // 参加者数
  postCount: number;                // 投稿数
  engagementRate: number;           // エンゲージメント率
  prosCount: number;                // 賛成投稿数
  consCount: number;                // 反対投稿数
  neutralCount: number;             // 中立投稿数
  unknownCount: number;             // 不明投稿数
  createdAt: string;                // 作成日時
  lastActivityAt: string;           // 最終活動日時
  averagePostsPerParticipant: number; // 参加者あたり平均投稿数
  uniqueViewers: number;            // ユニーク閲覧者数
  totalViews: number;               // 総閲覧数
}
```

**各プロパティの用途**:
- `participantCount`: 議論の活発さ指標
- `engagementRate`: 議論の質的評価
- `prosCount/consCount/neutralCount`: 立場分布の可視化
- `averagePostsPerParticipant`: 議論の深さ指標
- `uniqueViewers/totalViews`: リーチと関心度の測定

#### `UserStatistics`
**用途**: ユーザーの活動統計

```typescript
interface UserStatistics {
  userId: string;                   // ユーザーID
  username: string;                 // ユーザー名
  totalDiscussions: number;         // 作成した議論数
  totalPosts: number;               // 投稿数
  totalReactions: number;           // 受け取ったリアクション数
  averageEngagementRate: number;    // 平均エンゲージメント率
  mostActiveCategory: string;       // 最も活発なカテゴリ
  joinedAt: string;                 // 参加日時
  lastActiveAt: string;             // 最終活動日時
  followersCount: number;           // フォロワー数
  followingCount: number;           // フォロー中ユーザー数
}
```

#### `PlatformStatistics`
**用途**: プラットフォーム全体の統計

```typescript
interface PlatformStatistics {
  totalUsers: number;               // 総ユーザー数
  activeUsers: number;              // アクティブユーザー数
  totalDiscussions: number;         // 総議論数
  activeDiscussions: number;        // アクティブ議論数
  totalPosts: number;               // 総投稿数
  totalReactions: number;           // 総リアクション数
  averageEngagementRate: number;    // 平均エンゲージメント率
  topCategories: CategoryStatistics[]; // トップカテゴリ
  growthMetrics: GrowthMetrics;     // 成長指標
  userActivityDistribution: ActivityDistribution; // ユーザー活動分布
}
```

---

## カテゴリ型定義 (categories.ts)

### カテゴリ・分類関連

#### `Category`
**用途**: カテゴリの基本情報

```typescript
interface Category {
  id: string;                       // カテゴリID
  name: string;                     // カテゴリ名
  parentId?: string;                // 親カテゴリID
  level: number;                    // 階層レベル
}
```

#### `CategoryGroup`
**用途**: カテゴリグループの管理

```typescript
interface CategoryGroup {
  id: string;                       // グループID
  name: string;                     // グループ名
  subcategories: Category[];        // サブカテゴリ一覧
}
```

#### `DISCUSSION_CATEGORIES`
**用途**: 議論カテゴリの階層構造定義

```typescript
const DISCUSSION_CATEGORIES: CategoryGroup[] = [
  {
    id: 'politics',
    name: '政治',
    subcategories: [
      { id: 'national-politics', name: '国の政治', level: 1 },
      { id: 'local-politics', name: '地方政治', level: 1 },
      { id: 'international-politics', name: '国際政治', level: 1 },
      // ... 他のサブカテゴリ
    ],
  },
  // ... 他のカテゴリグループ
];
```

**各カテゴリグループの用途**:
- `politics`: 政治関連の議論分類
- `economy`: 経済・産業関連の議論分類
- `society`: 社会・生活関連の議論分類
- `technology`: テクノロジー関連の議論分類
- `entertainment`: エンタメ関連の議論分類
- `sports`: スポーツ関連の議論分類

---

## エラー型定義 (error.ts)

### エラーハンドリング関連

#### `ErrorType`
**用途**: エラーの種類分類

```typescript
enum ErrorType {
  AUTHENTICATION = 'authentication', // 認証エラー
  AUTHORIZATION = 'authorization',   // 認可エラー
  VALIDATION = 'validation',         // バリデーションエラー
  NETWORK = 'network',               // ネットワークエラー
  SERVER = 'server',                 // サーバーエラー
  NOT_FOUND = 'not_found',           // 見つからないエラー
}
```

#### `AppError`
**用途**: アプリケーションエラーの標準化

```typescript
interface AppError {
  type: ErrorType;                  // エラーの種類
  message: string;                  // エラーメッセージ
  code: string;                     // エラーコード
  details?: any;                    // 詳細情報
}
```

**各プロパティの用途**:
- `type`: エラーハンドリングの分岐処理
- `message`: ユーザーへの表示メッセージ
- `code`: システム内でのエラー識別
- `details`: デバッグ・ログ用の詳細情報

#### `ErrorContextType`
**用途**: エラー状態管理のコンテキスト

```typescript
interface ErrorContextType {
  errors: AppError[];               // エラー一覧
  addError: (error: AppError) => void; // エラー追加
  removeError: (id: string) => void;   // エラー削除
  clearErrors: () => void;          // エラー全削除
}
```

---

## WebSocket型定義 (websocket.ts)

### リアルタイム通信関連

#### `WebSocketMessage`
**用途**: WebSocketメッセージの標準化

```typescript
interface WebSocketMessage {
  type: string;                     // メッセージタイプ
  data: any;                        // メッセージデータ
  timestamp: string;                // タイムスタンプ
}
```

#### `WebSocketContextType`
**用途**: WebSocket接続管理のコンテキスト

```typescript
interface WebSocketContextType {
  isConnected: boolean;             // 接続状態
  subscribe: (event: string, callback: (data: any) => void) => void; // イベント購読
  unsubscribe: (event: string) => void; // イベント購読解除
  emit: (event: string, data: any) => void; // イベント送信
}
```

#### `WebSocketEvent`
**用途**: WebSocketイベントの種類定義

```typescript
type WebSocketEvent =
  | 'NEW_POST'              // 新規投稿
  | 'POST_UPDATED'          // 投稿更新
  | 'POST_DELETED'          // 投稿削除
  | 'USER_JOINED'           // ユーザー参加
  | 'USER_LEFT'             // ユーザー離脱
  | 'DISCUSSION_UPDATED';   // 議論更新
```

**各イベントの用途**:
- `NEW_POST`: リアルタイム投稿表示
- `POST_UPDATED/POST_DELETED`: 投稿状態の即座反映
- `USER_JOINED/USER_LEFT`: オンライン状態の表示
- `DISCUSSION_UPDATED`: 議論情報の即座更新

---

## 型の関係図

### エンティティ関係

```
UserProfile (ユーザープロフィール)
├── Discussion (議論作成)
│   ├── DiscussionPoint (論点)
│   ├── BackgroundKnowledge (背景知識)
│   └── Post (投稿)
│       ├── PostReaction (リアクション)
│       └── PostReport (報告)
├── Follow (フォロー関係)
│   └── TimelineItem (タイムライン)
├── Notification (通知)
├── UserSanction (制裁)
└── Analytics (分析データ)

ModerationQueueItem (モデレーションキュー)
├── PostReport (投稿報告)
├── ModerationActionLog (アクション履歴)
└── UserSanction (ユーザー制裁)

WebSocket (リアルタイム通信)
└── 全エンティティの状態変更を配信
```

### データフロー

```
1. ユーザー登録・認証
   User (auth.ts) → UserProfile (User.ts) → UserSession

2. 議論作成・参加
   UserProfile → Discussion → DiscussionPoint → Post

3. エンゲージメント
   UserProfile → PostReaction, Follow, Notification

4. モデレーション
   PostReport → ModerationQueueItem → ModerationActionLog → UserSanction

5. 分析
   All Activities → Analytics → Statistics Reports

6. リアルタイム更新
   Entity Changes → WebSocket → UI Updates
```

### 型の使い分け

| 用途 | 完全型 | 表示用型 | 作成用型 | 統計用型 |
|------|--------|----------|----------|----------|
| ユーザー | UserProfile | UserPublicProfile | CreateUserData | UserStatistics |
| 議論 | Discussion | DiscussionListItem | CreateDiscussionData | DiscussionStatistics |
| 投稿 | Post | PostListItem | CreatePostData | PostStatistics |
| 通知 | Notification | NotificationListItem | CreateNotificationData | NotificationStatistics |
| フォロー | Follow | FollowListItem | CreateFollowData | FollowStatistics |

### DynamoDBアクセスパターン

```
1. ユーザー関連
   - PK: USER#{userId}, SK: PROFILE
   - GSI1: ROLE#{role} → ロール別ユーザー検索

2. 議論関連
   - PK: DISCUSSION#{discussionId}, SK: METADATA
   - GSI1: CATEGORY#{category} → カテゴリ別議論検索
   - GSI2: OWNER#{ownerId} → 作成者別議論検索

3. 投稿関連
   - PK: DISCUSSION#{discussionId}, SK: POST#{postId}
   - GSI1: POINT#{pointId} → 論点別投稿検索
   - GSI2: USER#{authorId} → ユーザー別投稿検索

4. フォロー関連
   - PK: USER#{followerId}, SK: FOLLOW#{targetType}#{targetId}
   - GSI1: {targetType}#{targetId} → フォロワー検索

5. 通知関連
   - PK: USER#{userId}, SK: NOTIFICATION#{notificationId}
   - GSI1: USER#{userId} → 日時順通知検索
```

---

## まとめ

OwlNestの型定義は以下の原則に基づいて設計されています：

1. **関心の分離**: 機能別にファイルを分割し、責任を明確化
2. **型の使い分け**: 用途に応じた最適な型を提供（完全型・表示用型・作成用型）
3. **拡張性**: 将来の機能追加に対応可能な設計
4. **パフォーマンス**: 必要最小限のデータ転送を実現
5. **型安全性**: TypeScriptの恩恵を最大限活用
6. **DynamoDB最適化**: NoSQLの特性を活かしたアクセスパターン設計
7. **リアルタイム対応**: WebSocketによる即座な状態同期

これらの型定義により、開発者は安全で効率的なコードを書くことができ、システム全体の品質と保守性が向上しています。

---

**最終更新**: 2025-08-08  
**バージョン**: 2.0  
**作成者**: OwlNest開発チーム