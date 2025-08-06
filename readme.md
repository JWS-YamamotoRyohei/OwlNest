# OwlNest ディスカッションプラットフォーム構築ドキュメント 🦉

---

## 1. システムの全体像 🏗️

### 🎯 機能概要

完全な議論プラットフォームが構築されました。

#### フロントエンド機能

- 📱 レスポンシブWebアプリケーション（React + TypeScript）
- 🔐 ユーザー認証（登録・ログイン・プロフィール管理）
- 💬 ディスカッション（作成・参加・カテゴリ分類）
- 📝 投稿（テキスト・ファイル添付・リアルタイム更新）
- 🔍 高度な検索（フィルタ・オートコンプリート・履歴）
- 👥 フォロー（ユーザー・タイムライン）
- 🔔 通知（リアルタイム通知・設定）
- 🛡️ モデレーション（報告・審査・制裁）
- 📊 分析ダッシュボード（統計・トレンド・エクスポート）

#### バックエンドインフラ

- ☁️ サーバーレス（AWS Lambda + API Gateway）
- 🗄️ NoSQLデータベース（DynamoDB + GSI）
- 🔐 認証・認可（Amazon Cognito）
- 📁 ストレージ（Amazon S3）
- 🌐 CDN配信（CloudFront）
- ⚡ リアルタイム通信（WebSocket API）

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

## 3. 開発環境でのアクセス 🖥️

### フロントエンド起動

```bash
npm install
npm start
```

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
