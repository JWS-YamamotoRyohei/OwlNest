# OwlNest ディスカッションプラットフォーム構築ドキュメント 🦉

---

## 目次

- [1. システムの全体像](#1-システムの全体像)
  - [機能概要](#-機能概要)
    - フロントエンド機能
    - バックエンドインフラ
    - 本番環境機能
- [2. 現在の状況](#2-現在の状況-)
- [3. 開発環境でのアクセス](#3-開発環境でのアクセス)
- [4. デプロイ手順](#4-デプロイ手順-)
  - [4.1 開発環境のデプロイ](#41-開発環境のデプロイ)
  - [4.2 本番環境のデプロイ（任意）](#42-本番環境のデプロイ任意)
- [5. CloudWatch ダッシュボード](#5-cloudwatch-ダッシュボード)
- [6. セットアップ手順](#6-セットアップ手順-)
- [7. 機能別ガイド](#7-機能別ガイド-)
- [8. トラブルシューティング](#8-トラブルシューティング-)
- [9. 推奨される次のアクション](#9-推奨される次のアクション-)
- [10. まとめ](#10-まとめ-)

## 1. システムの全体像

### 🎯 機能概要

完全な議論プラットフォームが構築されました。

#### フロントエンド機能

- レスポンシブWebアプリケーション（React + TypeScript）
- ユーザー認証（登録・ログイン・プロフィール管理）
- ディスカッション（作成・参加・カテゴリ分類）
- 投稿（テキスト・ファイル添付・リアルタイム更新）
- 高度な検索（フィルタ・オートコンプリート・履歴）
- フォロー（ユーザー・タイムライン）
- 通知（リアルタイム通知・設定）
- モデレーション（報告・審査・制裁）
- 分析ダッシュボード（統計・トレンド・エクスポート）

#### バックエンドインフラ

- サーバーレス（AWS Lambda + API Gateway）
- NoSQLデータベース（DynamoDB + GSI）
- 認証・認可（Amazon Cognito）
- ストレージ（Amazon S3）
- CDN配信（CloudFront）
- リアルタイム通信（WebSocket API）

#### 本番環境機能

- 🌍 カスタムドメイン（SSL証明書付き）
- 🛡️ セキュリティ（WAF・GuardDuty・CloudTrail）
- 📊 監視（CloudWatch・アラート・メトリクス）
- 💾 バックアップ（日次・週次・クロスリージョン）
- 🔄 CI/CDパイプライン
- 💰 コスト監視（予算アラート・最適化）

---

## 2. 現在の状況 📊

### ✅ 作成済み（コード実装完了）

- フロントエンド（React/TypeScript）
- CDKインフラ（Lambda, DynamoDB, API Gateway定義）
- Lambda関数（バックエンドロジック）
- デプロイスクリプト（本番用）
- 環境別設定ファイル（開発・本番）

### ❌ 未実行（AWSリソース未作成）

- 開発・本番環境へのデプロイ（Lambda, Cognito, S3等）
- Route53・CloudFront・WAF構成

---

## 3. 開発環境(ローカル)でのアクセス

### フロントエンド起動

```bash
npm install
npm run dev
```

参照する環境変数ファイル：env.development

### アクセスURL（ローカル）

- ホーム: http://localhost:3000/
- ログイン: http://localhost:3000/login
- 登録: http://localhost:3000/register
- ディスカッション: http://localhost:3000/discussions
- 検索: http://localhost:3000/search
- タイムライン: http://localhost:3000/timeline
- 分析: http://localhost:3000/analytics
- モデレーション: http://localhost:3000/moderation

### 制限事項（未デプロイのため）

- 🚫 バックエンドAPI未接続  
- 🚫 データベース未接続  
- 🚫 認証未動作（Cognito未設定）  
- 🚫 ファイルアップロード不可（S3未作成）

---

## 4. デプロイ手順 🚀

### 4.1 開発環境のデプロイ

```bash
cd cdk
npm install
npx cdk bootstrap        # 初回のみ
npx cdk deploy --context environment=development
```

#### デプロイ後に有効となる機能

- LambdaによるAPI動作
- DynamoDBアクセス
- Cognito認証
- ファイルアップロード（S3）
- WebSocketによるリアルタイム通信

---

### 4.2 本番環境のデプロイ（任意）

#### PowerShell（Windows）

```powershell
cd cdk
.\scripts\deploy-production.ps1 -DomainName "your-domain.com" -AlertEmail "alerts@your-domain.com"
```

#### Linux/macOS

```bash
cd cdk
chmod +x scripts/deploy-production.sh
./scripts/deploy-production.sh
```

#### 設定ファイル更新（`cdk/config/production.json`）

```json
{
  "domainName": "your-domain.com",
  "alertEmail": "your-email@example.com",
  "corsAllowedOrigins": ["https://your-domain.com"],
  "budgetLimit": 500
}
```

#### 本番アクセスURL（例）

- メインサイト: https://your-domain.com  
- API: https://api.your-domain.com  
- WebSocket: wss://ws.your-domain.com  

---

## 5. CloudWatch ダッシュボード

[CloudWatch ダッシュボードを見る](https://ap-northeast-1.console.aws.amazon.com/cloudwatch/home?region=ap-northeast-1#dashboards:name=owlnest-production)

### 監視項目

- 📊 アクティブユーザー数、投稿数
- ⚡ API応答時間、Lambda実行時間
- 🔒 WAFブロック数、認証エラー
- 💰 日次・月次コスト、予算超過通知

---

## 6. セットアップ手順 📋

### ユーザー登録とログイン

1. アプリへアクセス  
2. 「新規登録」をクリック  
3. メールアドレス・パスワードを入力  
4. 認証メールを確認  
5. プロフィール設定完了

### ディスカッション作成

1. ログイン後「新しいディスカッション」へ  
2. タイトル・説明・カテゴリを入力  
3. 「作成」をクリック

### 管理者権限の付与（CLI）

```bash
aws cognito-idp admin-update-user-attributes \
  --user-pool-id <USER_POOL_ID> \
  --username <USERNAME> \
  --user-attributes Name=custom:role,Value=admin
```

---

## 7. 機能別ガイド 🎯

### ディスカッション

- 作成・参加・カテゴリ分類・検索・フィルタ

### 投稿

- テキスト投稿・ファイル添付・リアルタイム反映・リアクション

### フォロー

- ユーザーをフォロー・タイムライン表示・通知

### 検索

- キーワード・カテゴリ・日付・履歴

### モデレーション（管理者専用）

- 通報管理・制裁対応・コンテンツ制御・統計表示

### 分析

- 投稿数分析・ユーザー活動・トレンド解析・データ出力

---

## 8. トラブルシューティング 🔧

### アクセスできない

- DNS / SSL証明書 / CloudFront 状況確認

### ログイン・認証問題

- Cognito設定 / メール認証 / パスワードポリシー確認

### パフォーマンス問題

- CloudWatchメトリクス / Lambdaコールドスタート / DynamoDBスロットリング

---

## 9. 推奨される次のアクション ✅

### 即座に実行可能

```bash
# フロントエンド確認
npm start

# CDK構成確認
cd cdk
npx cdk synth --context environment=development
```

### AWSアカウントがある場合

```bash
cd cdk
npx cdk bootstrap     # 初回のみ
npx cdk deploy --context environment=development
```

---

## 10. まとめ 📝

- ✅ コードはすべて実装済み  
- ❌ AWSへのデプロイは未実行  
- ⚠️ フロントエンドのみ動作確認済み

### 次のステップ

- 開発環境をデプロイして動作確認  
- 本番環境へ移行してサービス公開

---

💬 不明点がある場合や、個別機能の確認・支援が必要な場合は、お気軽にご相談ください！



1. 環境変数ファイルの使い分け 📁
.env (ベース環境変数)
用途: 全環境で共通の設定値
優先度: 最も低い（他のファイルで上書きされる）
内容例: デフォルト値、共通設定
.env.development (開発環境専用)
用途: 開発環境でのみ使用される設定
優先度: 開発時は.envより高い
内容例:
ローカルAPI URL
デバッグモード有効
モック設定
.env.production (本番環境専用)
用途: 本番環境でのみ使用される設定
優先度: 本番ビルド時は.envより高い
内容例:
本番API URL
デバッグモード無効
最適化設定
.env.example (テンプレート)
用途: 環境変数のテンプレート・ドキュメント
特徴:
実際には読み込まれない
新しい開発者向けの設定例
機密情報は含まない
1. Viteの環境変数読み込み優先順位 🔄
2. .env.[mode].local     (最高優先度)
3. .env.local
4. .env.[mode]           (.env.development / .env.production)
5. .env                  (最低優先度)
例: 開発環境 (NODE_ENV=development) の場合

.env.development.local (Git無視推奨)
.env.local (Git無視推奨)
.env.development
.env
3. 実行コマンドと環境変数の関係 ⚙️
現在のpackage.jsonスクリプト:
{
  "scripts": {
    "dev": "vite",
    "start": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  }
}
コマンド別の動作:
npm run dev / npm run start
環境: development
読み込まれる環境変数:
.env.development.local
.env.local
.env.development
.env
特徴:
開発サーバー起動
ホットリロード有効
デバッグ情報表示
npm run build
環境: production
読み込まれる環境変数:
.env.production.local
.env.local
.env.production
.env
特徴:
本番用ビルド
コード最適化
デバッグ情報削除
4. npm run start vs npm run dev の違い 🔍
現在の設定では:
"dev": "vite",
"start": "vite"
結論: 現在は全く同じ動作をします。

一般的な使い分け:
npm run dev (開発用)
開発者が日常的に使用
開発専用の設定・機能
より詳細なログ出力
npm run start (汎用)
本番環境でも使用可能
より汎用的な起動コマンド
CI/CDでも使用される
推奨される設定例:
{
  "scripts": {
    "dev": "vite --mode development",
    "start": "vite --host 0.0.0.0",
    "start-host0": "vite --host 0.0.0.0",
    "build": "tsc && vite build --mode production",
    "preview": "vite preview"
  }
}
5. 実際の環境変数ファイル例 📝
.env (共通設定)
# 共通設定
VITE_APP_NAME=OwlNest
VITE_AWS_REGION=ap-northeast-1

# デフォルト値
VITE_DEBUG_MODE=false
VITE_LOG_LEVEL=info
.env.development (開発環境)
# 開発環境設定
VITE_NODE_ENV=development
VITE_DEBUG_MODE=true
VITE_LOG_LEVEL=debug

# ローカルAPI
VITE_API_GATEWAY_URL=http://localhost:3001/api
VITE_WEBSOCKET_API_URL=ws://localhost:3001/ws

# モック設定
VITE_USE_MOCK_API=true
.env.production (本番環境)
# 本番環境設定
VITE_NODE_ENV=production
VITE_DEBUG_MODE=false
VITE_LOG_LEVEL=error

# 本番API (デプロイ時に設定)
VITE_USE_MOCK_API=false
.env.example (テンプレート)
# AWS設定 (実際の値を設定してください)
VITE_AWS_REGION=ap-northeast-1
VITE_AWS_USER_POOL_ID=your_user_pool_id
VITE_AWS_USER_POOL_CLIENT_ID=your_client_id

# API設定
VITE_API_GATEWAY_URL=your_api_url
VITE_WEBSOCKET_API_URL=your_websocket_url

# 機能フラグ
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_REALTIME=true
6. 環境変数の確認方法 🔍
開発中に環境変数を確認:

// コンソールで確認
console.log('Environment:', import.meta.env.VITE_NODE_ENV);
console.log('All env vars:', import.meta.env);

// コード内で使用
const isProduction = import.meta.env.VITE_NODE_ENV === 'production';
ブラウザの開発者ツールで確認:
F12で開発者ツールを開く
Consoleタブで import.meta.env を実行
設定された環境変数が表示される
この仕組みにより、環境ごとに適切な設定を自動的に適用できます！
