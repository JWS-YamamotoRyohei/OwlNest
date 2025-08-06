import React, { useState, useEffect } from 'react';
import { ContentFilterRule } from '../../types/moderation';
import { ContentFilterService, ContentFilterConfig } from '../../services/contentFilterService';
import './ContentFilterManager.css';

interface ContentFilterManagerProps {
  onFilterUpdate?: () => void;
}

export const ContentFilterManager: React.FC<ContentFilterManagerProps> = ({
  onFilterUpdate,
}) => {
  const [filters, setFilters] = useState<ContentFilterRule[]>([]);
  const [config, setConfig] = useState<ContentFilterConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingFilter, setEditingFilter] = useState<ContentFilterRule | null>(null);
  const [testContent, setTestContent] = useState('');
  const [testResults, setTestResults] = useState<any>(null);

  useEffect(() => {
    loadFilters();
    loadConfig();
  }, []);
  const contentFilterService = new ContentFilterService();

  const loadFilters = async () => {
    try {
      const filtersData = await contentFilterService.getActiveFilters();
      setFilters(filtersData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'フィルターの読み込みに失敗しました');
    }
  };

  const loadConfig = async () => {
    try {
      const configData = await contentFilterService.getFilterConfig();
      setConfig(configData);
    } catch (err) {
      console.warn('Failed to load filter config:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFilter = async (filterData: Omit<ContentFilterRule, 'filterId' | 'createdAt' | 'updatedAt' | 'PK' | 'SK' | 'EntityType' | 'stats'>) => {
    try {
      await contentFilterService.createFilter(filterData);
      await loadFilters();
      setShowCreateForm(false);
      onFilterUpdate?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'フィルターの作成に失敗しました');
    }
  };

  const handleUpdateFilter = async (filterId: string, updates: Partial<ContentFilterRule>) => {
    try {
      await contentFilterService.updateFilter(filterId, updates);
      await loadFilters();
      setEditingFilter(null);
      onFilterUpdate?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'フィルターの更新に失敗しました');
    }
  };

  const handleDeleteFilter = async (filterId: string) => {
    if (!window.confirm('このフィルターを削除しますか？')) return;

    try {
      await contentFilterService.deleteFilter(filterId);
      await loadFilters();
      onFilterUpdate?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'フィルターの削除に失敗しました');
    }
  };
  
  const handleTestFilter = async (filterId: string) => {
    if (!testContent.trim()) return;

    try {
      const result = await contentFilterService.testFilter(filterId, testContent);
      setTestResults({ [filterId]: result });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'フィルターのテストに失敗しました');
    }
  };

  const handleToggleFilter = async (filterId: string, isActive: boolean) => {
    try {
      await contentFilterService.updateFilter(filterId, { isActive });
      await loadFilters();
      onFilterUpdate?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'フィルターの状態変更に失敗しました');
    }
  };

  const handleUpdateConfig = async (updates: Partial<ContentFilterConfig>) => {
    try {
      const updatedConfig = await contentFilterService.updateFilterConfig(updates);
      setConfig(updatedConfig);
    } catch (err) {
      setError(err instanceof Error ? err.message : '設定の更新に失敗しました');
    }
  };

  if (loading) {
    return <div className="content-filter-manager loading">読み込み中...</div>;
  }

  return (
    <div className="content-filter-manager">
      <div className="filter-manager-header">
        <h2>コンテンツフィルター管理</h2>
        <button
          className="btn btn-primary"
          onClick={() => setShowCreateForm(true)}
        >
          新しいフィルターを作成
        </button>
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* Configuration Section */}
      {config && (
        <div className="filter-config-section">
          <h3>フィルター設定</h3>
          <div className="config-form">
            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={config.strictMode}
                  onChange={(e) => handleUpdateConfig({ strictMode: e.target.checked })}
                />
                厳格モード
              </label>
            </div>
            <div className="form-group">
              <label>
                自動アクション閾値:
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={config.autoActionThreshold}
                  onChange={(e) => handleUpdateConfig({ autoActionThreshold: parseFloat(e.target.value) })}
                />
                <span>{config.autoActionThreshold}</span>
              </label>
            </div>
            <div className="form-group">
              <label>
                レビューキュー閾値:
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={config.queueThreshold}
                  onChange={(e) => handleUpdateConfig({ queueThreshold: parseFloat(e.target.value) })}
                />
                <span>{config.queueThreshold}</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Test Section */}
      <div className="filter-test-section">
        <h3>フィルターテスト</h3>
        <div className="test-form">
          <textarea
            value={testContent}
            onChange={(e) => setTestContent(e.target.value)}
            placeholder="テストしたいコンテンツを入力してください..."
            rows={4}
          />
          <div className="test-buttons">
            {filters.map(filter => (
              <button
                key={filter.filterId}
                className="btn btn-secondary"
                onClick={() => handleTestFilter(filter.filterId)}
                disabled={!testContent.trim()}
              >
                {filter.name}でテスト
              </button>
            ))}
          </div>
          {testResults && (
            <div className="test-results">
              {Object.entries(testResults).map(([filterId, result]: [string, any]) => (
                <div key={filterId} className="test-result">
                  <h4>{filters.find(f => f.filterId === filterId)?.name}</h4>
                  <div className={`result ${result.matched ? 'matched' : 'no-match'}`}>
                    <p>マッチ: {result.matched ? 'はい' : 'いいえ'}</p>
                    <p>信頼度: {(result.confidence * 100).toFixed(1)}%</p>
                    <p>推奨アクション: {result.suggestedAction}</p>
                    <p>説明: {result.explanation}</p>
                    {result.matchedText && (
                      <p>マッチしたテキスト: "{result.matchedText}"</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Filters List */}
      <div className="filters-list">
        <h3>アクティブなフィルター ({filters.length})</h3>
        {filters.length === 0 ? (
          <p className="no-filters">フィルターが設定されていません。</p>
        ) : (
          <div className="filters-grid">
            {filters.map(filter => (
              <FilterCard
                key={filter.filterId}
                filter={filter}
                onEdit={setEditingFilter}
                onDelete={handleDeleteFilter}
                onToggle={handleToggleFilter}
                testResult={testResults?.[filter.filterId]}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Form Modal */}
      {(showCreateForm || editingFilter) && (
        <FilterFormModal
          filter={editingFilter}
          onSave={editingFilter ? 
            (updates) => handleUpdateFilter(editingFilter.filterId, updates) :
            handleCreateFilter
          }
          onCancel={() => {
            setShowCreateForm(false);
            setEditingFilter(null);
          }}
        />
      )}
    </div>
  );
};

interface FilterCardProps {
  filter: ContentFilterRule;
  onEdit: (filter: ContentFilterRule) => void;
  onDelete: (filterId: string) => void;
  onToggle: (filterId: string, isActive: boolean) => void;
  testResult?: any;
}

const FilterCard: React.FC<FilterCardProps> = ({
  filter,
  onEdit,
  onDelete,
  onToggle,
  testResult,
}) => {
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const contentFilterService = new ContentFilterService();
  const loadStats = async () => {
    try {
      const statsData = await contentFilterService.getFilterStats(filter.filterId);
      setStats(statsData);
      setShowStats(true);
    } catch (err) {
      console.error('Failed to load filter stats:', err);
    }
  };

  return (
    <div className={`filter-card ${!filter.isActive ? 'inactive' : ''}`}>
      <div className="filter-header">
        <h4>{filter.name}</h4>
        <div className="filter-actions">
          <button
            className={`toggle-btn ${filter.isActive ? 'active' : 'inactive'}`}
            onClick={() => onToggle(filter.filterId, !filter.isActive)}
            title={filter.isActive ? '無効にする' : '有効にする'}
          >
            {filter.isActive ? '有効' : '無効'}
          </button>
          <button
            className="btn btn-small"
            onClick={() => onEdit(filter)}
            title="編集"
          >
            編集
          </button>
          <button
            className="btn btn-small btn-danger"
            onClick={() => onDelete(filter.filterId)}
            title="削除"
          >
            削除
          </button>
        </div>
      </div>

      <div className="filter-details">
        <p className="description">{filter.description}</p>
        <div className="filter-meta">
          <span className="type">{filter.type}</span>
          <span className="severity">{filter.severity}</span>
          <span className="action">{filter.action}</span>
          {filter.isTestMode && <span className="test-mode">テストモード</span>}
        </div>
        
        {filter.keywords && (
          <div className="keywords">
            <strong>キーワード:</strong> {filter.keywords.join(', ')}
          </div>
        )}
        
        {filter.pattern && (
          <div className="pattern">
            <strong>パターン:</strong> <code>{filter.pattern}</code>
          </div>
        )}

        <div className="filter-stats-summary">
          <span>マッチ数: {filter.stats.totalMatches}</span>
          <span>精度: {(filter.stats.accuracy * 100).toFixed(1)}%</span>
          <button
            className="btn btn-link"
            onClick={loadStats}
          >
            詳細統計
          </button>
        </div>

        {testResult && (
          <div className={`test-result-summary ${testResult.matched ? 'matched' : 'no-match'}`}>
            テスト結果: {testResult.matched ? 'マッチ' : 'マッチなし'} 
            ({(testResult.confidence * 100).toFixed(1)}%)
          </div>
        )}
      </div>

      {showStats && stats && (
        <div className="filter-stats-modal">
          <div className="stats-content">
            <h5>統計情報</h5>
            <div className="stats-grid">
              <div>総マッチ数: {stats.totalMatches}</div>
              <div>正解数: {stats.truePositives}</div>
              <div>誤検出数: {stats.falsePositives}</div>
              <div>精度: {(stats.accuracy * 100).toFixed(1)}%</div>
            </div>
            <div className="recent-matches">
              <h6>最近のマッチ</h6>
              {stats.recentMatches.map((match: any, index: number) => (
                <div key={index} className="match-item">
                  <span>{new Date(match.matchedAt).toLocaleString()}</span>
                  <span>信頼度: {(match.confidence * 100).toFixed(1)}%</span>
                  {match.wasCorrect !== undefined && (
                    <span className={match.wasCorrect ? 'correct' : 'incorrect'}>
                      {match.wasCorrect ? '正解' : '誤検出'}
                    </span>
                  )}
                </div>
              ))}
            </div>
            <button
              className="btn btn-secondary"
              onClick={() => setShowStats(false)}
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

interface FilterFormModalProps {
  filter?: ContentFilterRule | null;
  onSave: (filterData: any) => void;
  onCancel: () => void;
}

const FilterFormModal: React.FC<FilterFormModalProps> = ({
  filter,
  onSave,
  onCancel,
}) => {
  const [formData, setFormData] = useState({
    name: filter?.name || '',
    description: filter?.description || '',
    type: filter?.type || 'keyword' as const,
    pattern: filter?.pattern || '',
    keywords: filter?.keywords?.join(', ') || '',
    action: filter?.action || 'flag' as const,
    severity: filter?.severity || 'medium' as const,
    confidence: filter?.confidence || 0.8,
    applyToContent: filter?.applyToContent ?? true,
    applyToTitles: filter?.applyToTitles ?? true,
    applyToComments: filter?.applyToComments ?? true,
    isActive: filter?.isActive ?? true,
    isTestMode: filter?.isTestMode ?? false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const filterData = {
      ...formData,
      keywords: formData.keywords ? formData.keywords.split(',').map(k => k.trim()).filter(k => k) : undefined,
      createdBy: 'current-user', // TODO: Get from auth context
      lastModifiedBy: 'current-user', // TODO: Get from auth context
      stats: filter?.stats || {
        totalMatches: 0,
        truePositives: 0,
        falsePositives: 0,
        accuracy: 0,
      },
    };

    onSave(filterData);
  };

  return (
    <div className="filter-form-modal">
      <div className="modal-content">
        <div className="modal-header">
          <h3>{filter ? 'フィルターを編集' : '新しいフィルターを作成'}</h3>
          <button className="close-btn" onClick={onCancel}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="filter-form">
          <div className="form-group">
            <label>名前 *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>説明</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>タイプ</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
              >
                <option value="keyword">キーワード</option>
                <option value="regex">正規表現</option>
                <option value="ml_model">機械学習モデル</option>
                <option value="external_api">外部API</option>
              </select>
            </div>

            <div className="form-group">
              <label>アクション</label>
              <select
                value={formData.action}
                onChange={(e) => setFormData({ ...formData, action: e.target.value as any })}
              >
                <option value="flag">フラグ</option>
                <option value="hide">非表示</option>
                <option value="delete">削除</option>
                <option value="queue_for_review">レビューキューに追加</option>
              </select>
            </div>
          </div>

          {formData.type === 'keyword' && (
            <div className="form-group">
              <label>キーワード (カンマ区切り)</label>
              <textarea
                value={formData.keywords}
                onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                placeholder="スパム, 荒らし, 不適切"
                rows={3}
              />
            </div>
          )}

          {formData.type === 'regex' && (
            <div className="form-group">
              <label>正規表現パターン</label>
              <input
                type="text"
                value={formData.pattern}
                onChange={(e) => setFormData({ ...formData, pattern: e.target.value })}
                placeholder="例: \b(spam|scam)\b"
              />
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label>重要度</label>
              <select
                value={formData.severity}
                onChange={(e) => setFormData({ ...formData, severity: e.target.value as any })}
              >
                <option value="low">低</option>
                <option value="medium">中</option>
                <option value="high">高</option>
              </select>
            </div>

            <div className="form-group">
              <label>信頼度閾値</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={formData.confidence}
                onChange={(e) => setFormData({ ...formData, confidence: parseFloat(e.target.value) })}
              />
              <span>{formData.confidence}</span>
            </div>
          </div>

          <div className="form-group">
            <label>適用範囲</label>
            <div className="checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={formData.applyToContent}
                  onChange={(e) => setFormData({ ...formData, applyToContent: e.target.checked })}
                />
                投稿内容
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={formData.applyToTitles}
                  onChange={(e) => setFormData({ ...formData, applyToTitles: e.target.checked })}
                />
                タイトル
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={formData.applyToComments}
                  onChange={(e) => setFormData({ ...formData, applyToComments: e.target.checked })}
                />
                コメント
              </label>
            </div>
          </div>

          <div className="form-group">
            <div className="checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                />
                有効
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={formData.isTestMode}
                  onChange={(e) => setFormData({ ...formData, isTestMode: e.target.checked })}
                />
                テストモード（アクションを実行せずログのみ）
              </label>
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onCancel}>
              キャンセル
            </button>
            <button type="submit" className="btn btn-primary">
              {filter ? '更新' : '作成'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ContentFilterManager;