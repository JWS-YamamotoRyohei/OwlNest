import React, { useState, useRef, useCallback } from 'react';
import { TextFormatting, FileAttachment } from '../../types/common';
import { FileUploadButton } from './FileUploadButton';
import './RichTextEditor.css';

interface RichTextEditorProps {
  value: string;
  formatting: TextFormatting;
  attachments: FileAttachment[];
  onChange: (content: string, formatting: TextFormatting) => void;
  onAttachmentsChange: (attachments: FileAttachment[]) => void;
  placeholder?: string;
  error?: string;
  features: {
    bold: boolean;
    fontSize: boolean;
    imageUpload: boolean;
    linkInsert: boolean;
  };
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  formatting,
  attachments,
  onChange,
  onAttachmentsChange,
  placeholder = '内容を入力してください...',
  error,
  features,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange(newValue, formatting);
  };

  const handleBoldToggle = () => {
    if (!features.bold) return;
    
    const newFormatting = {
      ...formatting,
      bold: !formatting.bold,
    };
    onChange(value, newFormatting);
  };

  const handleFontSizeChange = (size: 'small' | 'medium' | 'large') => {
    if (!features.fontSize) return;
    
    const newFormatting = {
      ...formatting,
      fontSize: size,
    };
    onChange(value, newFormatting);
  };

  const insertTextAtCursor = useCallback((text: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newValue = value.substring(0, start) + text + value.substring(end);
    
    onChange(newValue, formatting);
    
    // Set cursor position after inserted text
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + text.length, start + text.length);
    }, 0);
  }, [value, formatting, onChange]);

  const handleLinkInsert = () => {
    if (!features.linkInsert) return;
    setShowLinkDialog(true);
  };

  const handleLinkConfirm = () => {
    if (linkUrl && linkText) {
      const linkMarkdown = `[${linkText}](${linkUrl})`;
      insertTextAtCursor(linkMarkdown);
    }
    setShowLinkDialog(false);
    setLinkUrl('');
    setLinkText('');
  };

  const handleLinkCancel = () => {
    setShowLinkDialog(false);
    setLinkUrl('');
    setLinkText('');
  };

  const handleFileUpload = (files: FileAttachment[]) => {
    if (!features.imageUpload) return;
    
    const newAttachments = [...attachments, ...files];
    onAttachmentsChange(newAttachments);
    
    // Insert image references in text for images
    files.forEach(file => {
      if (file.contentType.startsWith('image/')) {
        const imageMarkdown = `![${file.filename}](${file.url})`;
        insertTextAtCursor(imageMarkdown);
      }
    });
  };

  const handleAttachmentRemove = (attachmentId: string) => {
    const newAttachments = attachments.filter(att => att.id !== attachmentId);
    onAttachmentsChange(newAttachments);
  };

  const getTextareaStyle = () => {
    const style: React.CSSProperties = {};
    
    if (formatting.bold) {
      style.fontWeight = 'bold';
    }
    
    if (formatting.fontSize) {
      switch (formatting.fontSize) {
        case 'small':
          style.fontSize = '0.875rem';
          break;
        case 'medium':
          style.fontSize = '1rem';
          break;
        case 'large':
          style.fontSize = '1.125rem';
          break;
      }
    }
    
    if (formatting.color) {
      style.color = formatting.color;
    }
    
    return style;
  };

  return (
    <div className={`rich-text-editor ${error ? 'rich-text-editor--error' : ''}`}>
      {/* Toolbar */}
      <div className="rich-text-editor__toolbar">
        {features.bold && (
          <button
            type="button"
            className={`rich-text-editor__tool ${formatting.bold ? 'rich-text-editor__tool--active' : ''}`}
            onClick={handleBoldToggle}
            title="太字"
          >
            <strong>B</strong>
          </button>
        )}
        
        {features.fontSize && (
          <div className="rich-text-editor__font-size">
            <select
              value={formatting.fontSize || 'medium'}
              onChange={(e) => handleFontSizeChange(e.target.value as 'small' | 'medium' | 'large')}
              className="rich-text-editor__font-size-select"
            >
              <option value="small">小</option>
              <option value="medium">中</option>
              <option value="large">大</option>
            </select>
          </div>
        )}
        
        {features.linkInsert && (
          <button
            type="button"
            className="rich-text-editor__tool"
            onClick={handleLinkInsert}
            title="リンクを挿入"
          >
            🔗
          </button>
        )}
        
        {features.imageUpload && (
          <FileUploadButton
            onUpload={handleFileUpload}
            accept="image/*"
            multiple={true}
            className="rich-text-editor__tool"
            title="画像をアップロード"
          >
            📷
          </FileUploadButton>
        )}
      </div>

      {/* Text Area */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleTextChange}
        placeholder={placeholder}
        className="rich-text-editor__textarea"
        style={getTextareaStyle()}
        rows={6}
      />

      {/* Attachments */}
      {attachments.length > 0 && (
        <div className="rich-text-editor__attachments">
          <div className="rich-text-editor__attachments-title">添付ファイル:</div>
          <div className="rich-text-editor__attachments-list">
            {attachments.map(attachment => (
              <div key={attachment.id} className="rich-text-editor__attachment">
                <span className="rich-text-editor__attachment-name">
                  {attachment.filename}
                </span>
                <button
                  type="button"
                  onClick={() => handleAttachmentRemove(attachment.id)}
                  className="rich-text-editor__attachment-remove"
                  title="削除"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Link Dialog */}
      {showLinkDialog && (
        <div className="rich-text-editor__link-dialog">
          <div className="rich-text-editor__link-dialog-content">
            <h4>リンクを挿入</h4>
            <div className="rich-text-editor__link-field">
              <label>リンクテキスト:</label>
              <input
                type="text"
                value={linkText}
                onChange={(e) => setLinkText(e.target.value)}
                placeholder="表示するテキスト"
              />
            </div>
            <div className="rich-text-editor__link-field">
              <label>URL:</label>
              <input
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com"
              />
            </div>
            <div className="rich-text-editor__link-actions">
              <button type="button" onClick={handleLinkCancel}>
                キャンセル
              </button>
              <button 
                type="button" 
                onClick={handleLinkConfirm}
                disabled={!linkUrl || !linkText}
              >
                挿入
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};