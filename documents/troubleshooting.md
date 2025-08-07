# トラブルシューティング

> OwlNestプロジェクトでよくある問題と解決方法

## 📋 目次

1. [開発環境の問題](#開発環境の問題)
2. [ビルド・デプロイの問題](#ビルドデプロイの問題)
3. [認証・権限の問題](#認証権限の問題)
4. [パフォーマンスの問題](#パフォーマンスの問題)
5. [UI・表示の問題](#ui表示の問題)
6. [データベース・API の問題](#データベースapi-の問題)
7. [緊急時対応](#緊急時対応)

---

## 開発環境の問題

### 1. 開発サーバーが起動しない

#### 症状
```bash
npm run dev
# エラー: Port 3002 is already in use
```

#### 原因と解決方法

**原因1: ポートが使用中**
```bash
# Windows
netstat -ano | findstr :3002
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:3002 | xargs kill -9

# または別のポートを使用
npx vite --port 3003
```

**原因2: Node.js のバージョン不適合**
```bash
# Node.js バージョン確認
node --version

# 推奨バージョン: v18.16.0+
# nvm を使用してバージョン切り替え
nvm install 18.16.0
nvm use 18.16.0
```

**原因3: 依存関係の問題**
```bash
# node_modules を削除して再インストール
rm -rf node_modules package-lock.json
npm install

# CDK の依存関係も再インストール
cd cdk
rm -rf node_modules package-lock.json
npm install
cd ..
```

### 2. 環境変数が読み込まれない

#### 症状
```javascript
console.log(import.meta.env.VITE_API_URL); // undefined
```

#### 原因と解決方法

**原因1: プレフィックスが間違っている**
```bash
# ❌ 間違い
REACT_APP_API_URL=http://localhost:3001

# ✅ 正しい（Vite では VITE_ プレフィックス）
VITE_API_URL=http://localhost:3001
```

**原因2: 環境変数ファイルが存在しない**
```bash
# .env ファイルの確認
ls -la .env*

# .env.example をコピー
cp .env.example .env
```

**原因3: ファイルの配置場所が間違っている**
```bash
# 環境変数ファイルはプロジェクトルートに配置
OwlNest/
├── .env                    # ✅ ここに配置
├── .env.development
├── .env.production
├── src/
└── package.json
```

### 3. TypeScript エラーが解決しない

#### 症状
```
Error: Cannot find module 'src/types/discussion' or its corresponding type declarations.
```

#### 原因と解決方法

**原因1: 型定義ファイルが存在しない**
```bash
# 型定義ファイルの確認
ls -la src/types/

# 不足している型定義ファイルを作成
touch src/types/discussion.ts
```

**原因2: tsconfig.json の設定問題**
```json
// tsconfig.json の確認
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "src/*": ["src/*"]
    }
  }
}
```

**原因3: IDE の TypeScript サーバーの問題**
```bash
# VS Code の場合
# Ctrl+Shift+P → "TypeScript: Restart TS Server"

# または TypeScript の再インストール
npm install -D typescript@latest
```

### 4. テストが実行できない

#### 症状
```bash
npm run test
# Error: Cannot resolve dependency
```

#### 原因と解決方法

**原因1: Vitest の設定問題**
```typescript
// vitest.config.ts の確認
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['src/__tests__/setup.ts'],
  },
})
```

**原因2: テスト用の依存関係不足**
```bash
# テスト関連パッケージのインストール
npm install -D @testing-library/react @testing-library/jest-dom jsdom
```

**原因3: モックの設定問題**
```typescript
// src/__tests__/setup.ts
import '@testing-library/jest-dom'

// fetch のモック
global.fetch = vi.fn()

// localStorage のモック
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
})
```

---

## ビルド・デプロイの問題

### 1. ビルドが失敗する

#### 症状
```bash
npm run build
# Error: Build failed with 1 error
```

#### 原因と解決方法

**原因1: TypeScript エラー**
```bash
# 型チェックの実行
npm run type-check

# エラーの詳細確認
npx tsc --noEmit --pretty
```

**原因2: ESLint エラー**
```bash
# リンティングエラーの確認
npm run lint

# 自動修正可能なエラーの修正
npm run lint:fix
```

**原因3: メモリ不足**
```bash
# Node.js のメモリ制限を増加
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build

# または package.json で設定
{
  "scripts": {
    "build": "NODE_OPTIONS='--max-old-space-size=4096' vite build"
  }
}
```

### 2. CDK デプロイが失敗する

#### 症状
```bash
npx cdk deploy
# Error: The stack named OwlNestStack failed to deploy
```

#### 原因と解決方法

**原因1: AWS 認証情報の問題**
```bash
# AWS 認証情報の確認
aws sts get-caller-identity

# 認証情報の再設定
aws configure
```

**原因2: IAM 権限不足**
```bash
# 必要な権限の確認
aws iam get-user
aws iam list-attached-user-policies --user-name your-username

# 管理者権限の一時的な付与（開発環境のみ）
aws iam attach-user-policy \
  --user-name your-username \
  --policy-arn arn:aws:iam::aws:policy/AdministratorAccess
```

**原因3: CloudFormation スタックの状態問題**
```bash
# スタックの状態確認
aws cloudformation describe-stacks --stack-name OwlNestStack

# 失敗したスタックの削除
aws cloudformation delete-stack --stack-name OwlNestStack

# 再デプロイ
npx cdk deploy
```

### 3. 静的サイトが更新されない

#### 症状
古いバージョンのサイトが表示され続ける

#### 原因と解決方法

**原因1: CloudFront キャッシュ**
```bash
# キャッシュの無効化
aws cloudfront create-invalidation \
  --distribution-id E1234567890123 \
  --paths "/*"

# 無効化の状況確認
aws cloudfront get-invalidation \
  --distribution-id E1234567890123 \
  --id I1234567890123
```

**原因2: ブラウザキャッシュ**
```bash
# 強制リロード
# Chrome: Ctrl+Shift+R
# Firefox: Ctrl+F5

# または開発者ツールでキャッシュを無効化
# F12 → Network タブ → "Disable cache" をチェック
```

**原因3: S3 同期の問題**
```bash
# S3 バケットの内容確認
aws s3 ls s3://owlnest-production-bucket/ --recursive

# 強制的に再同期
aws s3 sync dist/ s3://owlnest-production-bucket/ --delete --exact-timestamps
```

---

## 認証・権限の問題

### 1. ログインできない

#### 症状
ログインボタンを押してもログインできない、またはエラーが表示される

#### 原因と解決方法

**原因1: 開発環境のモック認証が無効**
```javascript
// ブラウザのコンソールで確認
console.log('Mock API:', import.meta.env.VITE_USE_MOCK_API);
console.log('Environment:', import.meta.env.VITE_NODE_ENV);

// .env.development の確認
VITE_USE_MOCK_API=true
VITE_NODE_ENV=development
```

**原因2: Cognito の設定問題**
```javascript
// AWS Cognito の設定確認
console.log('User Pool ID:', import.meta.env.VITE_AWS_USER_POOL_ID);
console.log('Client ID:', import.meta.env.VITE_AWS_USER_POOL_CLIENT_ID);

// 設定が空の場合は .env ファイルを確認
```

**原因3: ネットワークエラー**
```bash
# ブラウザの開発者ツールで確認
# F12 → Network タブ → 認証リクエストの状態確認

# API エンドポイントの疎通確認
curl -I https://api.owlnest.example.com/health
```

### 2. 認証状態が保持されない

#### 症状
ページをリロードするとログアウト状態になる

#### 原因と解決方法

**原因1: localStorage の問題**
```javascript
// ブラウザのコンソールで確認
console.log('Auth token:', localStorage.getItem('authToken'));
console.log('User info:', localStorage.getItem('userInfo'));

// localStorage のクリア
localStorage.clear();
// 再ログイン
```

**原因2: トークンの有効期限切れ**
```javascript
// JWT トークンの確認（開発者ツールのコンソールで）
const token = localStorage.getItem('authToken');
if (token) {
  const payload = JSON.parse(atob(token.split('.')[1]));
  console.log('Token expires:', new Date(payload.exp * 1000));
  console.log('Current time:', new Date());
}
```

**原因3: CORS の問題**
```bash
# ブラウザのコンソールでCORSエラーを確認
# "Access to fetch at 'https://api.example.com' from origin 'http://localhost:3002' has been blocked by CORS policy"

# API Gateway の CORS 設定確認
aws apigateway get-resource --rest-api-id your-api-id --resource-id your-resource-id
```

### 3. 権限エラーが発生する

#### 症状
```
Error: You don't have permission to access this resource
```

#### 原因と解決方法

**原因1: ユーザーロールの問題**
```javascript
// 現在のユーザー情報確認
console.log('Current user:', JSON.parse(localStorage.getItem('userInfo')));
console.log('User role:', JSON.parse(localStorage.getItem('userInfo'))?.role);
```

**原因2: JWT トークンの問題**
```bash
# API リクエストのヘッダー確認（開発者ツール）
# Authorization: Bearer <token> が正しく設定されているか確認
```

**原因3: バックエンドの権限設定**
```bash
# Lambda 関数のログ確認
aws logs filter-log-events \
  --log-group-name "/aws/lambda/owlnest-auth-handler" \
  --filter-pattern "ERROR"
```

---

## パフォーマンスの問題

### 1. ページの読み込みが遅い

#### 症状
初回ページ読み込みに5秒以上かかる

#### 原因と解決方法

**原因1: バンドルサイズが大きい**
```bash
# バンドルサイズの分析
npm run build
npx vite-bundle-analyzer dist

# 大きなライブラリの特定と最適化
# 不要なライブラリの削除
# 動的インポートの使用
```

**原因2: 画像の最適化不足**
```bash
# 画像ファイルのサイズ確認
ls -lh public/images/

# 画像の圧縮
# WebP 形式への変換
# 適切なサイズでの配信
```

**原因3: CDN の設定問題**
```bash
# CloudFront の設定確認
aws cloudfront get-distribution-config --id E1234567890123

# キャッシュヒット率の確認
aws cloudwatch get-metric-statistics \
  --namespace AWS/CloudFront \
  --metric-name CacheHitRate \
  --dimensions Name=DistributionId,Value=E1234567890123 \
  --start-time 2025-08-06T00:00:00Z \
  --end-time 2025-08-06T23:59:59Z \
  --period 3600 \
  --statistics Average
```

### 2. API の応答が遅い

#### 症状
API リクエストに3秒以上かかる

#### 原因と解決方法

**原因1: Lambda のコールドスタート**
```bash
# Lambda 関数の実行時間確認
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Duration \
  --dimensions Name=FunctionName,Value=owlnest-auth-handler \
  --start-time 2025-08-06T00:00:00Z \
  --end-time 2025-08-06T23:59:59Z \
  --period 3600 \
  --statistics Average,Maximum

# Provisioned Concurrency の設定
aws lambda put-provisioned-concurrency-config \
  --function-name owlnest-auth-handler \
  --qualifier $LATEST \
  --provisioned-concurrency-units 2
```

**原因2: DynamoDB のスループット不足**
```bash
# DynamoDB のメトリクス確認
aws cloudwatch get-metric-statistics \
  --namespace AWS/DynamoDB \
  --metric-name ConsumedReadCapacityUnits \
  --dimensions Name=TableName,Value=OwlNest-Users \
  --start-time 2025-08-06T00:00:00Z \
  --end-time 2025-08-06T23:59:59Z \
  --period 3600 \
  --statistics Sum

# 読み取り容量の増加
aws dynamodb update-table \
  --table-name OwlNest-Users \
  --provisioned-throughput ReadCapacityUnits=10,WriteCapacityUnits=5
```

**原因3: N+1 クエリ問題**
```javascript
// 問題のあるコード例
const discussions = await getDiscussions();
for (const discussion of discussions) {
  discussion.author = await getUser(discussion.authorId); // N+1 問題
}

// 改善されたコード例
const discussions = await getDiscussions();
const authorIds = discussions.map(d => d.authorId);
const authors = await getUsers(authorIds); // 一括取得
const authorMap = new Map(authors.map(a => [a.id, a]));
discussions.forEach(d => {
  d.author = authorMap.get(d.authorId);
});
```

### 3. メモリ使用量が多い

#### 症状
ブラウザのメモリ使用量が1GB以上になる

#### 原因と解決方法

**原因1: メモリリーク**
```javascript
// メモリ使用量の監視
console.log('Memory usage:', performance.memory);

// React DevTools Profiler でコンポーネントの再レンダリング確認
// useEffect のクリーンアップ関数の確認
useEffect(() => {
  const interval = setInterval(() => {
    // 処理
  }, 1000);
  
  return () => clearInterval(interval); // クリーンアップ
}, []);
```

**原因2: 大量のデータの保持**
```javascript
// 不要なデータの削除
// React Query のキャッシュサイズ制限
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      cacheTime: 1000 * 60 * 5, // 5分
      staleTime: 1000 * 60 * 1, // 1分
    },
  },
});
```

---

## UI・表示の問題

### 1. レスポンシブデザインが崩れる

#### 症状
モバイル表示で要素が重なったり、はみ出したりする

#### 原因と解決方法

**原因1: CSS の単位問題**
```css
/* 問題のあるCSS */
.container {
  width: 1200px; /* 固定幅 */
}

/* 改善されたCSS */
.container {
  width: 100%;
  max-width: 1200px;
  padding: 0 1rem;
}
```

**原因2: メディアクエリの不足**
```css
/* モバイル対応の追加 */
@media (max-width: 768px) {
  .sidebar {
    display: none;
  }
  
  .main-content {
    width: 100%;
  }
}
```

**原因3: Flexbox/Grid の設定問題**
```css
/* 問題のあるCSS */
.flex-container {
  display: flex;
  /* flex-wrap が設定されていない */
}

/* 改善されたCSS */
.flex-container {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}
```

### 2. ダークモードで表示が崩れる

#### 症状
ダークモードに切り替えると文字が見えなくなる

#### 原因と解決方法

**原因1: CSS変数の未定義**
```css
/* CSS変数の定義不足 */
:root {
  --text-color: #000;
  --bg-color: #fff;
}

[data-theme="dark"] {
  --text-color: #fff;
  --bg-color: #000;
}

/* 使用箇所 */
.text {
  color: var(--text-color);
  background-color: var(--bg-color);
}
```

**原因2: ハードコードされた色の使用**
```css
/* 問題のあるCSS */
.button {
  color: #000; /* ハードコード */
  background: white;
}

/* 改善されたCSS */
.button {
  color: var(--button-text-color);
  background: var(--button-bg-color);
}
```

### 3. アニメーションがカクつく

#### 症状
スクロールやホバーアニメーションが滑らかでない

#### 原因と解決方法

**原因1: 重いCSS プロパティのアニメーション**
```css
/* 問題のあるCSS */
.element {
  transition: width 0.3s, height 0.3s; /* レイアウトの変更 */
}

/* 改善されたCSS */
.element {
  transition: transform 0.3s, opacity 0.3s; /* GPU加速 */
}
```

**原因2: JavaScript での強制的な再描画**
```javascript
// 問題のあるコード
element.style.left = '100px'; // 強制的な再描画

// 改善されたコード
element.style.transform = 'translateX(100px)'; // GPU加速
```

**原因3: 60FPS を超える更新**
```javascript
// 問題のあるコード
setInterval(() => {
  updateAnimation();
}, 10); // 100FPS

// 改善されたコード
function animate() {
  updateAnimation();
  requestAnimationFrame(animate); // 60FPS
}
requestAnimationFrame(animate);
```

---

## データベース・API の問題

### 1. データが取得できない

#### 症状
API リクエストは成功するが、データが空で返される

#### 原因と解決方法

**原因1: DynamoDB のクエリ条件問題**
```javascript
// 問題のあるクエリ
const params = {
  TableName: 'OwlNest-Discussions',
  KeyConditionExpression: 'id = :id',
  ExpressionAttributeValues: {
    ':id': discussionId // 型が間違っている可能性
  }
};

// 改善されたクエリ
const params = {
  TableName: 'OwlNest-Discussions',
  KeyConditionExpression: 'id = :id',
  ExpressionAttributeValues: {
    ':id': { S: discussionId } // DynamoDB の型指定
  }
};
```

**原因2: インデックスの設定問題**
```bash
# DynamoDB のインデックス確認
aws dynamodb describe-table --table-name OwlNest-Discussions

# 必要に応じてGSI（Global Secondary Index）の追加
aws dynamodb update-table \
  --table-name OwlNest-Discussions \
  --attribute-definitions AttributeName=categoryId,AttributeType=S \
  --global-secondary-index-updates file://add-category-index.json
```

**原因3: Lambda 関数のエラーハンドリング不足**
```javascript
// 問題のあるコード
exports.handler = async (event) => {
  const result = await dynamodb.query(params).promise();
  return result.Items; // エラーハンドリングなし
};

// 改善されたコード
exports.handler = async (event) => {
  try {
    const result = await dynamodb.query(params).promise();
    return {
      statusCode: 200,
      body: JSON.stringify(result.Items)
    };
  } catch (error) {
    console.error('Query error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
```

### 2. データの更新が反映されない

#### 症状
データを更新したが、画面に反映されない

#### 原因と解決方法

**原因1: キャッシュの問題**
```javascript
// React Query のキャッシュ無効化
const queryClient = useQueryClient();

const updateDiscussion = useMutation(updateDiscussionAPI, {
  onSuccess: () => {
    queryClient.invalidateQueries(['discussions']);
    queryClient.invalidateQueries(['discussion', discussionId]);
  }
});
```

**原因2: 楽観的更新の失敗**
```javascript
// 楽観的更新の実装
const updateDiscussion = useMutation(updateDiscussionAPI, {
  onMutate: async (newData) => {
    await queryClient.cancelQueries(['discussion', discussionId]);
    const previousData = queryClient.getQueryData(['discussion', discussionId]);
    
    queryClient.setQueryData(['discussion', discussionId], newData);
    
    return { previousData };
  },
  onError: (err, newData, context) => {
    queryClient.setQueryData(['discussion', discussionId], context.previousData);
  },
  onSettled: () => {
    queryClient.invalidateQueries(['discussion', discussionId]);
  }
});
```

**原因3: DynamoDB の整合性問題**
```javascript
// 強い整合性読み取りの使用
const params = {
  TableName: 'OwlNest-Discussions',
  Key: { id: discussionId },
  ConsistentRead: true // 強い整合性
};
```

### 3. API のレート制限に引っかかる

#### 症状
```
Error: Too Many Requests (429)
```

#### 原因と解決方法

**原因1: API Gateway のスロットリング**
```bash
# API Gateway の使用量プラン確認
aws apigateway get-usage-plans

# スロットリング制限の緩和
aws apigateway update-usage-plan \
  --usage-plan-id your-usage-plan-id \
  --patch-ops op=replace,path=/throttle/rateLimit,value=1000
```

**原因2: DynamoDB の書き込み容量不足**
```bash
# DynamoDB のスロットリングメトリクス確認
aws cloudwatch get-metric-statistics \
  --namespace AWS/DynamoDB \
  --metric-name UserErrors \
  --dimensions Name=TableName,Value=OwlNest-Discussions \
  --start-time 2025-08-06T00:00:00Z \
  --end-time 2025-08-06T23:59:59Z \
  --period 3600 \
  --statistics Sum

# 書き込み容量の増加
aws dynamodb update-table \
  --table-name OwlNest-Discussions \
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=10
```

**原因3: フロントエンドでの過度なリクエスト**
```javascript
// 問題のあるコード
useEffect(() => {
  fetchData(); // 無制限にリクエスト
}, [searchTerm]);

// 改善されたコード
const debouncedSearchTerm = useDebounce(searchTerm, 300);
useEffect(() => {
  if (debouncedSearchTerm) {
    fetchData();
  }
}, [debouncedSearchTerm]);
```

---

## 緊急時対応

### 1. サービス全体が停止している

#### 対応手順

**Step 1: 状況の確認**
```bash
# ヘルスチェックの実行
curl -f https://owlnest.example.com/health
curl -f https://api.owlnest.example.com/health

# CloudWatch アラームの確認
aws cloudwatch describe-alarms --state-value ALARM
```

**Step 2: 影響範囲の特定**
```bash
# CloudFront の状態確認
aws cloudfront get-distribution --id E1234567890123

# Lambda 関数の状態確認
aws lambda list-functions --query 'Functions[?starts_with(FunctionName, `owlnest`)]'

# DynamoDB の状態確認
aws dynamodb list-tables
```

**Step 3: 緊急ロールバック**
```bash
# 前のバージョンへのロールバック
git checkout v1.2.3
npm run build
aws s3 sync dist/ s3://owlnest-production-bucket/ --delete

# CloudFront キャッシュの無効化
aws cloudfront create-invalidation \
  --distribution-id E1234567890123 \
  --paths "/*"
```

### 2. データベースの問題

#### 対応手順

**Step 1: データの整合性確認**
```bash
# DynamoDB テーブルの状態確認
aws dynamodb describe-table --table-name OwlNest-Users
aws dynamodb describe-table --table-name OwlNest-Discussions

# データ数の確認
aws dynamodb scan --table-name OwlNest-Users --select COUNT
```

**Step 2: バックアップからの復旧**
```bash
# ポイントインタイムリカバリの実行
aws dynamodb restore-table-to-point-in-time \
  --source-table-name OwlNest-Users \
  --target-table-name OwlNest-Users-Restored \
  --restore-date-time 2025-08-06T12:00:00Z
```

**Step 3: データの検証**
```bash
# 復旧したデータの確認
aws dynamodb scan --table-name OwlNest-Users-Restored --limit 10
```

### 3. セキュリティインシデント

#### 対応手順

**Step 1: 攻撃の遮断**
```bash
# 疑わしい IP アドレスのブロック
aws wafv2 update-ip-set \
  --scope CLOUDFRONT \
  --id blocked-ips-set \
  --addresses "192.0.2.1/32"

# API Gateway のレート制限強化
aws apigateway update-usage-plan \
  --usage-plan-id your-usage-plan-id \
  --patch-ops op=replace,path=/throttle/rateLimit,value=100
```

**Step 2: ログの分析**
```bash
# 不正アクセスのログ確認
aws logs filter-log-events \
  --log-group-name "/aws/lambda/owlnest-auth-handler" \
  --filter-pattern "ERROR" \
  --start-time 1691280000000

# CloudTrail の確認
aws logs filter-log-events \
  --log-group-name "CloudTrail/OwlNestAuditLog" \
  --filter-pattern "{ $.errorCode = \"*UnauthorizedOperation\" }"
```

**Step 3: 影響の評価**
```bash
# 影響を受けた可能性のあるデータの確認
aws dynamodb scan \
  --table-name OwlNest-Users \
  --filter-expression "attribute_exists(lastModified) AND lastModified > :timestamp" \
  --expression-attribute-values '{":timestamp":{"S":"2025-08-06T12:00:00Z"}}'
```

### 4. パフォーマンス劣化

#### 対応手順

**Step 1: ボトルネックの特定**
```bash
# Lambda 関数の実行時間確認
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Duration \
  --dimensions Name=FunctionName,Value=owlnest-auth-handler \
  --start-time 2025-08-06T12:00:00Z \
  --end-time 2025-08-06T13:00:00Z \
  --period 300 \
  --statistics Average,Maximum

# DynamoDB のスロットリング確認
aws cloudwatch get-metric-statistics \
  --namespace AWS/DynamoDB \
  --metric-name UserErrors \
  --dimensions Name=TableName,Value=OwlNest-Discussions \
  --start-time 2025-08-06T12:00:00Z \
  --end-time 2025-08-06T13:00:00Z \
  --period 300 \
  --statistics Sum
```

**Step 2: 緊急対応**
```bash
# Lambda のメモリ増加
aws lambda update-function-configuration \
  --function-name owlnest-auth-handler \
  --memory-size 1024

# DynamoDB の容量増加
aws dynamodb update-table \
  --table-name OwlNest-Discussions \
  --provisioned-throughput ReadCapacityUnits=20,WriteCapacityUnits=10
```

**Step 3: 監視の強化**
```bash
# 追加アラームの設定
aws cloudwatch put-metric-alarm \
  --alarm-name "OwlNest-High-Latency" \
  --alarm-description "High API latency detected" \
  --metric-name Duration \
  --namespace AWS/Lambda \
  --statistic Average \
  --period 300 \
  --threshold 5000 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=FunctionName,Value=owlnest-auth-handler \
  --evaluation-periods 2
```

---

## 予防策・ベストプラクティス

### 1. 定期的なヘルスチェック

```bash
# 日次ヘルスチェックスクリプト
#!/bin/bash
echo "=== OwlNest Health Check $(date) ==="

# フロントエンドの確認
if curl -f -s https://owlnest.example.com/health > /dev/null; then
  echo "✅ Frontend: OK"
else
  echo "❌ Frontend: ERROR"
fi

# API の確認
if curl -f -s https://api.owlnest.example.com/health > /dev/null; then
  echo "✅ API: OK"
else
  echo "❌ API: ERROR"
fi

# データベースの確認
if aws dynamodb describe-table --table-name OwlNest-Users > /dev/null 2>&1; then
  echo "✅ Database: OK"
else
  echo "❌ Database: ERROR"
fi
```

### 2. 監視・アラートの設定

```bash
# 重要なメトリクスのアラート設定
aws cloudwatch put-metric-alarm \
  --alarm-name "OwlNest-Lambda-Errors" \
  --alarm-description "Lambda function errors" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=FunctionName,Value=owlnest-auth-handler \
  --evaluation-periods 2 \
  --alarm-actions arn:aws:sns:ap-northeast-1:123456789012:owlnest-alerts
```

### 3. 定期的なバックアップ

```bash
# DynamoDB の自動バックアップ設定
aws dynamodb put-backup-policy \
  --table-name OwlNest-Users \
  --backup-policy BackupEnabled=true

# ポイントインタイムリカバリの有効化
aws dynamodb update-continuous-backups \
  --table-name OwlNest-Users \
  --point-in-time-recovery-specification PointInTimeRecoveryEnabled=true
```

---

## チェックリスト

### 問題発生時の初期対応チェックリスト
- [ ] 問題の症状を正確に把握した
- [ ] 影響範囲を特定した
- [ ] 緊急度を判定した
- [ ] 関係者に状況を報告した
- [ ] 応急処置を実施した
- [ ] 根本原因の調査を開始した

### 復旧後の確認チェックリスト
- [ ] 主要機能が正常に動作することを確認した
- [ ] パフォーマンスが正常レベルに戻った
- [ ] エラーログに新しい問題がない
- [ ] 監視ダッシュボードが正常値を示している
- [ ] ユーザーからの問い合わせがない
- [ ] 事後分析を実施した

### 予防策実施チェックリスト
- [ ] 定期的なヘルスチェックを設定した
- [ ] 適切な監視・アラートを設定した
- [ ] バックアップ戦略を実装した
- [ ] ドキュメントを最新に保った
- [ ] チーム内で知識を共有した
- [ ] 緊急時対応手順を整備した

---

**最終更新**: 2025-08-06  
**バージョン**: 1.0  
**作成者**: OwlNest開発チーム