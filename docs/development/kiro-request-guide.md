# Kiro IDE 使用ガイド

## 概要
このドキュメントでは、OwlNestプロジェクトでのKiro IDEの効果的な使用方法について説明します。

## Kiro IDEとは
Kiro IDEは、AI支援による開発環境で、コード生成、リファクタリング、デバッグ支援などの機能を提供します。

## セットアップ

### 1. 初期設定
```bash
# Kiro IDE設定ディレクトリの作成
mkdir -p .kiro/specs
# 基本設定ファイルの作成
touch .kiro/config.json
```

### 2. プロジェクト設定
```json
{
  "project": {
    "name": "OwlNest",
    "type": "react-typescript",
    "framework": "vite"
  },
  "ai": {
    "model": "gpt-4",
    "context_window": 8000
  },
  "specs": {
    "directory": ".kiro/specs",
    "format": "markdown"
  }
}
```

## 基本的な使用方法

### 1. 仕様書の作成
```markdown
# 機能仕様書テンプレート
## 機能名
[機能の名前]
## 概要
[機能の概要説明]
## 要件
### 機能要件
- [ ] 要件1
- [ ] 要件2
### 非機能要件
- [ ] パフォーマンス要件
- [ ] セキュリティ要件
## 実装方針
[実装の方針]
## テスト計画
[テスト方法]
```

### 2. コード生成リクエスト
```
@kiro generate component
名前: UserProfile
機能: ユーザープロフィール表示
props: { userId: string, showEdit: boolean }
```

### 3. リファクタリング支援
```
@kiro refactor
対象: src/components/UserProfile.tsx
目的: パフォーマンス最適化
方針: React.memo使用、不要な再レンダリング防止
```

## 高度な機能

### 1. 自動テスト生成
```
@kiro generate tests
対象: src/services/authService.ts
カバレッジ: 90%以上
テストタイプ: unit, integration
```

### 2. 型定義生成
```
@kiro generate types
API仕様: swagger.json
出力先: src/types/api.ts
命名規則: PascalCase
```

### 3. ドキュメント生成
```
@kiro generate docs
対象: src/components/
形式: JSDoc
出力: docs/components/
```

## ベストプラクティス

### 1. 明確な指示
- 具体的な要件を記述
- 期待する出力形式を指定
- 制約条件を明記

### 2. 段階的な開発
- 小さな単位で機能を分割
- 各段階でレビューを実施
- 継続的な改善

### 3. コンテキストの活用
- プロジェクト構造の理解
- 既存コードとの整合性
- 命名規則の統一

## トラブルシューティング

### 1. 生成されたコードが期待と異なる場合
```
@kiro clarify
問題: 生成されたコンポーネントにpropsの型定義が不足
期待: TypeScriptの厳密な型定義
追加情報: 既存のコンポーネントと同様の型安全性
```

### 2. エラーが発生した場合
```
@kiro debug
エラー: TypeScript compilation error
ファイル: src/components/NewComponent.tsx
エラー内容: [エラーメッセージ]
```

### 3. パフォーマンス問題
```
@kiro optimize
対象: src/pages/DiscussionPage.tsx
問題: 初期ロードが遅い
制約: 既存のAPIを変更しない
```

## 効率的なワークフロー

### 1. 機能開発フロー
1. 仕様書作成 (`@kiro spec`)
2. 型定義生成 (`@kiro types`)
3. コンポーネント生成 (`@kiro component`)
4. テスト生成 (`@kiro tests`)
5. ドキュメント生成 (`@kiro docs`)

### 2. バグ修正フロー
1. 問題の特定 (`@kiro analyze`)
2. 修正案の提案 (`@kiro fix`)
3. テストケース追加 (`@kiro test-case`)
4. 回帰テスト (`@kiro regression`)

### 3. リファクタリングフロー
1. 現状分析 (`@kiro analyze`)
2. 改善提案 (`@kiro suggest`)
3. 段階的実装 (`@kiro refactor`)
4. 影響範囲確認 (`@kiro impact`)

## 設定のカスタマイズ

### 1. コード生成設定
```json
{
  "generation": {
    "style": "functional-components",
    "typescript": "strict",
    "testing": "jest",
    "styling": "css-modules"
  }
}
```

### 2. 命名規則設定
```json
{
  "naming": {
    "components": "PascalCase",
    "functions": "camelCase",
    "constants": "UPPER_SNAKE_CASE",
    "files": "kebab-case"
  }
}
```

### 3. 品質設定
```json
{
  "quality": {
    "eslint": true,
    "prettier": true,
    "type-check": true,
    "test-coverage": 80
  }
}
```

## 統合機能

### 1. Git連携
```
@kiro commit
変更内容: ユーザープロフィール機能追加
影響範囲: src/components/user/
テスト状況: 全テスト通過
```

### 2. CI/CD連携
```
@kiro deploy-check
環境: staging
変更内容: [変更の概要]
リスク評価: low/medium/high
```

### 3. 依存関係管理
```
@kiro dependencies
アクション: update
パッケージ: react, typescript
互換性チェック: true
```

## セキュリティ考慮事項

### 1. 機密情報の取り扱い
- API キーやパスワードを含めない
- 環境変数の適切な使用
- ログ出力時の機密情報マスク

### 2. コード品質
- 生成されたコードのレビュー
- セキュリティ脆弱性のチェック
- 適切な入力検証の実装

### 3. アクセス制御
- 適切な権限設定
- 監査ログの記録
- 不正アクセスの検知

## パフォーマンス最適化

### 1. 生成速度の向上
- 適切なコンテキストサイズ
- 効率的なプロンプト設計
- キャッシュの活用

### 2. 品質の向上
- 詳細な要件定義
- 段階的な改善
- フィードバックループ

### 3. リソース管理
- 適切なモデル選択
- バッチ処理の活用
- 並列処理の最適化

## まとめ
Kiro IDEを効果的に活用することで、開発効率を大幅に向上させることができます。適切な設定と使用方法を理解し、プロジェクトの特性に合わせてカスタマイズすることが重要です。