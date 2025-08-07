# デプロイメントガイド

> OwlNestプロジェクトの本番環境へのデプロイ手順

## 📋 目次

1. [デプロイメント概要](#デプロイメント概要)
2. [環境構成](#環境構成)
3. [事前準備](#事前準備)
4. [本番デプロイ手順](#本番デプロイ手順)
5. [ロールバック手順](#ロールバック手順)
6. [監視・運用](#監視運用)
7. [トラブルシューティング](#トラブルシューティング)

---

## デプロイメント概要

### デプロイメント戦略
OwlNestは**Blue-Green デプロイメント**を採用し、ダウンタイムゼロでの本番リリースを実現します。

### デプロイメントフロー
```
開発環境 → ステージング環境 → 本番環境（Blue-Green）
```

### 使用技術
- **AWS CDK**: インフラストラクチャ as Code
- **AWS CodePipeline**: CI/CDパイプライン
- **AWS Lambda**: サーバーレス実行環境
- **Amazon S3 + CloudFront**: 静的サイトホスティング
- **Amazon DynamoDB**: データベース

---

## 環境構成

### 環境一覧

| 環境 | 用途 | URL | 自動デプロイ |
|------|------|-----|-------------|
| Development | 開発・テスト | http://localhost:3002 | - |
| Staging | 本番前検証 | https://staging.owlnest.example.com | ✅ |
| Production | 本番環境 | https://owlnest.example.com | 手動承認後 |

### AWS リソース構成

#### フロントエンド
```
CloudFront Distribution
├── S3 Bucket (静的サイト)
├── Lambda@Edge (認証・リダイレクト)
└── Route 53 (DNS)
```

#### バックエンド
```
API Gateway
├── Lambda Functions
│   ├── auth-handler
│   ├── discussion-handler
│   ├── post-handler
│   └── user-handler
├── DynamoDB Tables
│   ├── Users
│   ├── Discussions
│   ├── Posts
│   └── Likes
└── Cognito User Pool
```

#### 監視・ログ
```
CloudWatch
├── Application Logs
├── Performance Metrics
├── Error Tracking
└── Alarms
```

---

## 事前準備

### 必要なツール・権限

#### 1. 開発環境の準備
```bash
# 必要なツールのインストール確認
node --version    # v18.16.0+
npm --version     # 9.5.1+
aws --version     # AWS CLI v2.0+

# AWS CDK のインストール
npm install -g aws-cdk
cdk --version     # 2.100.0+
```

#### 2. AWS 認証情報の設定
```bash
# AWS CLI の設定
aws configure
# または
export AWS_ACCESS_KEY_ID=your-access-key
export AWS_SECRET_ACCESS_KEY=your-secret-key
export AWS_DEFAULT_REGION=ap-northeast-1
```

#### 3. 必要な AWS 権限
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "cloudformation:*",
        "s3:*",
        "lambda:*",
        "apigateway:*",
        "dynamodb:*",
        "cognito-idp:*",
        "cloudfront:*",
        "route53:*",
        "iam:*",
        "logs:*"
      ],
      "Resource": "*"
    }
  ]
}
```

### 環境変数の設定

#### 1. 本番環境用環境変数
```bash
# .env.production
VITE_NODE_ENV=production
VITE_DEBUG_MODE=false
VITE_LOG_LEVEL=error

# AWS設定
VITE_AWS_REGION=ap-northeast-1
VITE_AWS_USER_POOL_ID=ap-northeast-1_XXXXXXXXX
VITE_AWS_USER_POOL_CLIENT_ID=XXXXXXXXXXXXXXXXXXXXXXXXXX
VITE_AWS_IDENTITY_POOL_ID=ap-northeast-1:XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX

# API設定
VITE_API_GATEWAY_URL=https://api.owlnest.example.com
VITE_WEBSOCKET_API_URL=wss://ws.owlnest.example.com
VITE_USE_MOCK_API=false

# 機能フラグ
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_REALTIME=true
VITE_ENABLE_NOTIFICATIONS=true
VITE_ENABLE_FILE_UPLOAD=true
```

#### 2. CDK用環境変数
```bash
# cdk/.env
CDK_DEFAULT_ACCOUNT=123456789012
CDK_DEFAULT_REGION=ap-northeast-1
DOMAIN_NAME=owlnest.example.com
CERTIFICATE_ARN=arn:aws:acm:us-east-1:123456789012:certificate/XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
```

---

## 本番デプロイ手順

### 自動デプロイ（推奨）

#### 1. GitHub Actions による自動デプロイ
```yaml
# .github/workflows/deploy-production.yml
name: Deploy to Production

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: |
          npm ci
          cd cdk && npm ci
      
      - name: Run tests
        run: npm run test:ci
      
      - name: Build application
        run: npm run build
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ap-northeast-1
      
      - name: Deploy infrastructure
        run: |
          cd cdk
          npx cdk deploy --require-approval never
      
      - name: Deploy frontend
        run: |
          aws s3 sync dist/ s3://owlnest-production-bucket --delete
          aws cloudfront create-invalidation --distribution-id ${{ secrets.CLOUDFRONT_DISTRIBUTION_ID }} --paths "/*"
```

#### 2. デプロイの実行
```bash
# main ブランチにプッシュすると自動実行
git push origin main

# または手動実行
# GitHub Actions の画面から "Deploy to Production" を手動実行
```

### 手動デプロイ

#### 1. コードの準備
```bash
# 最新コードの取得
git checkout main
git pull origin main

# 依存関係のインストール
npm ci
cd cdk && npm ci && cd ..

# テストの実行
npm run test:ci
npm run lint
npm run type-check
```

#### 2. ビルドの実行
```bash
# 本番用ビルド
npm run build

# ビルド結果の確認
ls -la dist/
```

#### 3. インフラストラクチャのデプロイ
```bash
cd cdk

# CDK の初期化（初回のみ）
npx cdk bootstrap

# 変更内容の確認
npx cdk diff

# インフラストラクチャのデプロイ
npx cdk deploy --require-approval never

# デプロイ結果の確認
npx cdk list
```

#### 4. フロントエンドのデプロイ
```bash
# S3 への静的ファイルアップロード
aws s3 sync dist/ s3://owlnest-production-bucket --delete

# CloudFront キャッシュの無効化
aws cloudfront create-invalidation \
  --distribution-id E1234567890123 \
  --paths "/*"

# デプロイ完了の確認
curl -I https://owlnest.example.com
```

### Blue-Green デプロイメント

#### 1. Green 環境の準備
```bash
# Green 環境用のスタックをデプロイ
cd cdk
npx cdk deploy OwlNestStack-Green --context environment=green

# Green 環境への静的ファイルデプロイ
aws s3 sync dist/ s3://owlnest-green-bucket --delete
```

#### 2. Green 環境での検証
```bash
# Green 環境での動作確認
curl -I https://green.owlnest.example.com

# 自動テストの実行
npm run test:e2e -- --baseUrl=https://green.owlnest.example.com
```

#### 3. トラフィックの切り替え
```bash
# Route 53 でトラフィックを Green 環境に切り替え
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890123 \
  --change-batch file://switch-to-green.json

# 切り替え完了の確認
dig owlnest.example.com
```

#### 4. Blue 環境のクリーンアップ
```bash
# 旧 Blue 環境の削除（切り替え成功後）
npx cdk destroy OwlNestStack-Blue --context environment=blue
```

---

## ロールバック手順

### 緊急ロールバック

#### 1. DNS レベルでのロールバック
```bash
# Route 53 で前のバージョンに戻す
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890123 \
  --change-batch file://rollback-to-blue.json

# 変更の確認
dig owlnest.example.com
```

#### 2. CloudFront レベルでのロールバック
```bash
# 前のバージョンの静的ファイルを再デプロイ
aws s3 sync s3://owlnest-backup-bucket/ s3://owlnest-production-bucket/ --delete

# CloudFront キャッシュの無効化
aws cloudfront create-invalidation \
  --distribution-id E1234567890123 \
  --paths "/*"
```

#### 3. Lambda 関数のロールバック
```bash
# 前のバージョンの Lambda 関数に戻す
aws lambda update-function-code \
  --function-name owlnest-auth-handler \
  --s3-bucket owlnest-lambda-backup \
  --s3-key auth-handler-v1.2.3.zip

# 他の Lambda 関数も同様に更新
```

### 計画的ロールバック

#### 1. データベースの整合性確認
```bash
# DynamoDB のデータ整合性チェック
aws dynamodb scan --table-name OwlNest-Users --select COUNT
aws dynamodb scan --table-name OwlNest-Discussions --select COUNT
```

#### 2. 段階的ロールバック
```bash
# 1. 新機能の無効化
# 機能フラグを使用して新機能を無効化

# 2. 前のバージョンのデプロイ
git checkout v1.2.3
npm run build
aws s3 sync dist/ s3://owlnest-production-bucket --delete

# 3. インフラストラクチャのロールバック
cd cdk
git checkout v1.2.3
npx cdk deploy --require-approval never
```

---

## 監視・運用

### デプロイ後の確認項目

#### 1. 基本動作確認
```bash
# ヘルスチェック
curl -f https://owlnest.example.com/health

# API エンドポイントの確認
curl -f https://api.owlnest.example.com/health

# WebSocket 接続の確認
wscat -c wss://ws.owlnest.example.com
```

#### 2. パフォーマンス確認
```bash
# ページ読み込み時間の測定
curl -w "@curl-format.txt" -o /dev/null -s https://owlnest.example.com

# API 応答時間の測定
curl -w "%{time_total}" -o /dev/null -s https://api.owlnest.example.com/discussions
```

#### 3. ログの確認
```bash
# CloudWatch Logs の確認
aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/owlnest"

# エラーログの確認
aws logs filter-log-events \
  --log-group-name "/aws/lambda/owlnest-auth-handler" \
  --filter-pattern "ERROR"
```

### 監視ダッシュボード

#### CloudWatch ダッシュボードの設定
```json
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/Lambda", "Duration", "FunctionName", "owlnest-auth-handler"],
          ["AWS/Lambda", "Errors", "FunctionName", "owlnest-auth-handler"],
          ["AWS/CloudFront", "Requests", "DistributionId", "E1234567890123"],
          ["AWS/DynamoDB", "ConsumedReadCapacityUnits", "TableName", "OwlNest-Users"]
        ],
        "period": 300,
        "stat": "Average",
        "region": "ap-northeast-1",
        "title": "OwlNest Production Metrics"
      }
    }
  ]
}
```

#### アラートの設定
```bash
# Lambda エラー率のアラート
aws cloudwatch put-metric-alarm \
  --alarm-name "OwlNest-Lambda-Errors" \
  --alarm-description "Lambda function error rate" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=FunctionName,Value=owlnest-auth-handler \
  --evaluation-periods 2

# API Gateway 応答時間のアラート
aws cloudwatch put-metric-alarm \
  --alarm-name "OwlNest-API-Latency" \
  --alarm-description "API Gateway high latency" \
  --metric-name Latency \
  --namespace AWS/ApiGateway \
  --statistic Average \
  --period 300 \
  --threshold 5000 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2
```

---

## トラブルシューティング

### よくある問題と解決方法

#### 1. デプロイが失敗する

**症状**: CDK デプロイ時にエラーが発生
```
Error: The stack named OwlNestStack failed to deploy
```

**原因と解決方法**:
```bash
# 1. IAM 権限の確認
aws sts get-caller-identity
aws iam get-user

# 2. CloudFormation スタックの状態確認
aws cloudformation describe-stacks --stack-name OwlNestStack

# 3. ロールバック後に再デプロイ
npx cdk destroy OwlNestStack
npx cdk deploy OwlNestStack
```

#### 2. 静的サイトが表示されない

**症状**: CloudFront 経由でサイトにアクセスできない

**原因と解決方法**:
```bash
# 1. S3 バケットの確認
aws s3 ls s3://owlnest-production-bucket/

# 2. CloudFront の設定確認
aws cloudfront get-distribution --id E1234567890123

# 3. キャッシュの強制無効化
aws cloudfront create-invalidation \
  --distribution-id E1234567890123 \
  --paths "/*"

# 4. DNS の確認
dig owlnest.example.com
nslookup owlnest.example.com
```

#### 3. API が応答しない

**症状**: API Gateway 経由でバックエンドにアクセスできない

**原因と解決方法**:
```bash
# 1. Lambda 関数の状態確認
aws lambda get-function --function-name owlnest-auth-handler

# 2. API Gateway の設定確認
aws apigateway get-rest-apis

# 3. CloudWatch Logs の確認
aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/owlnest"

# 4. Lambda 関数の手動実行テスト
aws lambda invoke \
  --function-name owlnest-auth-handler \
  --payload '{"httpMethod":"GET","path":"/health"}' \
  response.json
```

#### 4. データベース接続エラー

**症状**: DynamoDB への接続でエラーが発生

**原因と解決方法**:
```bash
# 1. DynamoDB テーブルの確認
aws dynamodb list-tables
aws dynamodb describe-table --table-name OwlNest-Users

# 2. IAM ロールの権限確認
aws iam get-role --role-name OwlNestLambdaExecutionRole

# 3. VPC 設定の確認（VPC 内の Lambda の場合）
aws ec2 describe-vpc-endpoints

# 4. DynamoDB の手動テスト
aws dynamodb scan --table-name OwlNest-Users --limit 1
```

### パフォーマンス問題の対処

#### 1. 応答時間が遅い

**調査方法**:
```bash
# CloudWatch メトリクスの確認
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Duration \
  --dimensions Name=FunctionName,Value=owlnest-auth-handler \
  --start-time 2025-08-06T00:00:00Z \
  --end-time 2025-08-06T23:59:59Z \
  --period 3600 \
  --statistics Average,Maximum

# X-Ray トレースの確認
aws xray get-trace-summaries \
  --time-range-type TimeRangeByStartTime \
  --start-time 2025-08-06T00:00:00Z \
  --end-time 2025-08-06T23:59:59Z
```

**対処方法**:
```bash
# Lambda 関数のメモリ増加
aws lambda update-function-configuration \
  --function-name owlnest-auth-handler \
  --memory-size 512

# DynamoDB の読み取り/書き込み容量増加
aws dynamodb update-table \
  --table-name OwlNest-Users \
  --provisioned-throughput ReadCapacityUnits=10,WriteCapacityUnits=5
```

#### 2. メモリ不足エラー

**症状**: Lambda 関数でメモリ不足エラーが発生

**対処方法**:
```bash
# メモリサイズの増加
aws lambda update-function-configuration \
  --function-name owlnest-auth-handler \
  --memory-size 1024

# タイムアウト時間の調整
aws lambda update-function-configuration \
  --function-name owlnest-auth-handler \
  --timeout 30
```

### セキュリティ問題の対処

#### 1. 不正アクセスの検出

**調査方法**:
```bash
# CloudTrail ログの確認
aws logs filter-log-events \
  --log-group-name CloudTrail/OwlNestAuditLog \
  --filter-pattern "{ $.errorCode = \"*UnauthorizedOperation\" }"

# WAF ログの確認
aws logs filter-log-events \
  --log-group-name aws-waf-logs-owlnest \
  --filter-pattern "{ $.action = \"BLOCK\" }"
```

**対処方法**:
```bash
# IP アドレスのブロック
aws wafv2 update-ip-set \
  --scope CLOUDFRONT \
  --id blocked-ips-set \
  --addresses "192.0.2.1/32,203.0.113.0/24"

# レート制限の強化
aws wafv2 update-rule-group \
  --scope CLOUDFRONT \
  --id rate-limit-rule \
  --rules file://enhanced-rate-limit.json
```

---

## チェックリスト

### デプロイ前チェックリスト
- [ ] 全てのテストが通過している
- [ ] コードレビューが完了している
- [ ] 環境変数が正しく設定されている
- [ ] データベースマイグレーションが準備されている
- [ ] ロールバック計画が準備されている
- [ ] 監視・アラートが設定されている

### デプロイ後チェックリスト
- [ ] ヘルスチェックが正常に応答する
- [ ] 主要機能が正常に動作する
- [ ] パフォーマンスが要件を満たしている
- [ ] ログにエラーが出力されていない
- [ ] 監視ダッシュボードが正常に表示される
- [ ] アラートが適切に設定されている

### 緊急時対応チェックリスト
- [ ] 問題の影響範囲を特定した
- [ ] ロールバック手順を確認した
- [ ] 関係者に状況を報告した
- [ ] ロールバックを実行した
- [ ] 問題の解決を確認した
- [ ] 事後分析を実施した

---

**最終更新**: 2025-08-06  
**バージョン**: 1.0  
**作成者**: OwlNest開発チーム