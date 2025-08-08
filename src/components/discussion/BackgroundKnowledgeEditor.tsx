import React, { useCallback } from 'react';
import { CreateBackgroundKnowledgeData } from '../../types/discussion';
import './BackgroundKnowledgeEditor.css';

interface BackgroundKnowledgeEditorProps {
  backgroundKnowledge: CreateBackgroundKnowledgeData[];
  onChange: (backgroundKnowledge: CreateBackgroundKnowledgeData[]) => void;
  disabled?: boolean;
  maxItems?: number;
}

export const BackgroundKnowledgeEditor: React.FC<BackgroundKnowledgeEditorProps> = ({
  backgroundKnowledge,
  onChange,
  disabled = false,
  maxItems = 10,
}) => {
  const addItem = useCallback(
    (type: 'text' | 'file' | 'url') => {
      if (backgroundKnowledge.length >= maxItems) return;

      const newItem: CreateBackgroundKnowledgeData = {
        type,
        title: '',
        content: '',
        order: backgroundKnowledge.length,
      };

      onChange([...backgroundKnowledge, newItem]);
    },
    [backgroundKnowledge, onChange, maxItems]
  );

  const removeItem = useCallback(
    (index: number) => {
      const newItems = backgroundKnowledge.filter((_, i) => i !== index);
      // Reorder remaining items
      const reorderedItems = newItems.map((item, i) => ({
        ...item,
        order: i,
      }));
      onChange(reorderedItems);
    },
    [backgroundKnowledge, onChange]
  );

  const updateItem = useCallback(
    (index: number, field: keyof CreateBackgroundKnowledgeData, value: any) => {
      const newItems = backgroundKnowledge.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      );
      onChange(newItems);
    },
    [backgroundKnowledge, onChange]
  );

  const moveItem = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (fromIndex === toIndex) return;

      const newItems = [...backgroundKnowledge];
      const [movedItem] = newItems.splice(fromIndex, 1);
      newItems.splice(toIndex, 0, movedItem);

      // Reorder all items
      const reorderedItems = newItems.map((item, i) => ({
        ...item,
        order: i,
      }));

      onChange(reorderedItems);
    },
    [backgroundKnowledge, onChange]
  );

  const getTypeIcon = (type: 'text' | 'file' | 'url') => {
    switch (type) {
      case 'text':
        return '📝';
      case 'file':
        return '📎';
      case 'url':
        return '🔗';
      default:
        return '📄';
    }
  };

  const getTypeName = (type: 'text' | 'file' | 'url') => {
    switch (type) {
      case 'text':
        return 'テキスト';
      case 'file':
        return 'ファイル';
      case 'url':
        return 'URL';
      default:
        return 'その他';
    }
  };

  return (
    <div className={`background-knowledge-editor ${disabled ? 'disabled' : ''}`}>
      <div className="bg-editor-header">
        <div className="bg-editor-info">
          <p className="bg-editor-description">
            議論の理解を深めるための前提知識や参考資料を追加できます。
            テキスト、ファイル、URLの形式で情報を提供できます。
          </p>
          <div className="bg-count">
            {backgroundKnowledge.length}/{maxItems} 項目
          </div>
        </div>

        <div className="add-bg-buttons">
          <button
            type="button"
            onClick={() => addItem('text')}
            className="add-bg-btn"
            disabled={disabled || backgroundKnowledge.length >= maxItems}
            title="テキストを追加"
          >
            📝 テキスト
          </button>
          <button
            type="button"
            onClick={() => addItem('url')}
            className="add-bg-btn"
            disabled={disabled || backgroundKnowledge.length >= maxItems}
            title="URLを追加"
          >
            🔗 URL
          </button>
          <button
            type="button"
            onClick={() => addItem('file')}
            className="add-bg-btn"
            disabled={disabled || backgroundKnowledge.length >= maxItems}
            title="ファイルを追加"
          >
            📎 ファイル
          </button>
        </div>
      </div>

      {backgroundKnowledge.length === 0 ? (
        <div className="empty-bg">
          <div className="empty-bg-icon">📚</div>
          <div className="empty-bg-text">
            <h4>前提知識を追加（任意）</h4>
            <p>
              議論の背景や参考資料を追加することで、参加者の理解を深めることができます。
              テキスト、URL、ファイルの形式で情報を提供できます。
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-list">
          {backgroundKnowledge.map((item, index) => (
            <div key={index} className="bg-item">
              <div className="bg-header">
                <div className="bg-type">
                  <span className="bg-type-icon">{getTypeIcon(item.type)}</span>
                  <span className="bg-type-name">{getTypeName(item.type)}</span>
                </div>
                <div className="bg-actions">
                  <button
                    type="button"
                    onClick={() => moveItem(index, Math.max(0, index - 1))}
                    className="bg-move-btn"
                    disabled={disabled || index === 0}
                    title="上に移動"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      moveItem(index, Math.min(backgroundKnowledge.length - 1, index + 1))
                    }
                    className="bg-move-btn"
                    disabled={disabled || index === backgroundKnowledge.length - 1}
                    title="下に移動"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="remove-bg-btn"
                    disabled={disabled}
                    title="削除"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="bg-content">
                <div className="form-group">
                  <label className="form-label">タイトル（任意）</label>
                  <input
                    type="text"
                    value={item.title || ''}
                    onChange={e => updateItem(index, 'title', e.target.value)}
                    className="form-input"
                    placeholder="前提知識のタイトルを入力してください"
                    disabled={disabled}
                    maxLength={100}
                  />
                  <div className="form-help">{(item.title || '').length}/100 文字</div>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    {item.type === 'text' && '内容'}
                    {item.type === 'url' && 'URL'}
                    {item.type === 'file' && 'ファイル情報'}
                    <span className="required">*</span>
                  </label>

                  {item.type === 'text' && (
                    <textarea
                      value={item.content}
                      onChange={e => updateItem(index, 'content', e.target.value)}
                      className="form-textarea"
                      placeholder="前提知識の内容を詳しく説明してください"
                      disabled={disabled}
                      rows={4}
                      maxLength={2000}
                    />
                  )}

                  {item.type === 'url' && (
                    <input
                      type="url"
                      value={item.content}
                      onChange={e => updateItem(index, 'content', e.target.value)}
                      className="form-input"
                      placeholder="https://example.com"
                      disabled={disabled}
                    />
                  )}

                  {item.type === 'file' && (
                    <div className="file-input-group">
                      <input
                        type="file"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) {
                            updateItem(index, 'content', file.name);
                            // TODO: Handle file upload
                          }
                        }}
                        className="form-file-input"
                        disabled={disabled}
                        accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif"
                      />
                      <div className="file-help">
                        対応形式: PDF, Word, テキスト, 画像ファイル (最大10MB)
                      </div>
                    </div>
                  )}

                  <div className="form-help">
                    {item.type === 'text' && `${item.content.length}/2000 文字`}
                    {item.type === 'url' && ' 参考になるWebページのURLを入力してください'}
                    {item.type === 'file' && 'ファイルを選択してアップロードしてください'}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-editor-help">
        <h4>💡 前提知識の活用方法</h4>
        <ul>
          <li>
            <strong>テキスト:</strong> 議論の背景や専門用語の説明など
          </li>
          <li>
            <strong>URL:</strong> 関連記事、統計データ、公式資料へのリンク
          </li>
          <li>
            <strong>ファイル:</strong> 資料、図表、レポートなどのドキュメント
          </li>
          <li>参加者が議論に参加する前に確認できる情報として表示されます</li>
        </ul>
      </div>
    </div>
  );
};

export default BackgroundKnowledgeEditor;
