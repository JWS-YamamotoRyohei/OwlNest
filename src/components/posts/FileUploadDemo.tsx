import React, { useState } from 'react';
import { FileUploadButton } from './FileUploadButton';
import { FileAttachmentDisplay } from './FileAttachmentDisplay';
import { FileAttachment } from '../../types/common';
import { UploadProgress } from '../../services/fileUploadService';
import './FileUploadDemo.css';

export const FileUploadDemo: React.FC = () => {
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [uploadProgresses, setUploadProgresses] = useState<UploadProgress[]>([]);
  const [error, setError] = useState<string>('');

  const handleUpload = (newFiles: FileAttachment[]) => {
    setAttachments(prev => [...prev, ...newFiles]);
    setError('');
    console.log('Files uploaded:', newFiles);
  };

  const handleProgress = (progresses: UploadProgress[]) => {
    setUploadProgresses(progresses);
  };

  const handleRemoveAttachment = (attachmentId: string) => {
    setAttachments(prev => prev.filter(att => att.id !== attachmentId));
  };

  const handleDownload = (attachment: FileAttachment) => {
    console.log('Downloading file:', attachment);
    // Default download behavior will be used
  };

  const clearAll = () => {
    setAttachments([]);
    setUploadProgresses([]);
    setError('');
  };

  return (
    <div className="file-upload-demo">
      <div className="file-upload-demo__header">
        <h3>ファイルアップロード機能デモ</h3>
        <p>画像、文書、音声、動画ファイルをアップロードできます。</p>
      </div>

      <div className="file-upload-demo__controls">
        <FileUploadButton
          onUpload={handleUpload}
          onProgress={handleProgress}
          accept="image/*,application/pdf,text/plain,audio/*,video/*"
          multiple={true}
          maxSize={50 * 1024 * 1024} // 50MB
          maxFiles={10}
          className="file-upload-demo__button"
          discussionId="demo-discussion"
          postId="demo-post"
        >
          📎 ファイルを選択
        </FileUploadButton>

        {attachments.length > 0 && (
          <button type="button" onClick={clearAll} className="file-upload-demo__clear">
            すべてクリア
          </button>
        )}
      </div>

      {/* Upload Progress */}
      {uploadProgresses.length > 0 && (
        <div className="file-upload-demo__progress-section">
          <h4>アップロード進行状況</h4>
          <div className="file-upload-demo__progress-list">
            {uploadProgresses.map(progress => (
              <div key={progress.fileId} className="file-upload-demo__progress-item">
                <div className="file-upload-demo__progress-header">
                  <span className="file-upload-demo__progress-filename">{progress.filename}</span>
                  <span className="file-upload-demo__progress-percentage">
                    {Math.round(progress.progress)}%
                  </span>
                </div>
                <div className="file-upload-demo__progress-bar">
                  <div
                    className={`file-upload-demo__progress-fill ${
                      progress.status === 'error'
                        ? 'file-upload-demo__progress-fill--error'
                        : progress.status === 'completed'
                          ? 'file-upload-demo__progress-fill--completed'
                          : ''
                    }`}
                    style={{ width: `${progress.progress}%` }}
                  />
                </div>
                <div className="file-upload-demo__progress-status">
                  {progress.status === 'uploading' && 'アップロード中...'}
                  {progress.status === 'completed' && '✅ 完了'}
                  {progress.status === 'error' && `❌ エラー: ${progress.error}`}
                  {progress.status === 'cancelled' && '⏹️ キャンセル済み'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Uploaded Files */}
      {attachments.length > 0 && (
        <div className="file-upload-demo__attachments-section">
          <h4>アップロード済みファイル ({attachments.length})</h4>
          <FileAttachmentDisplay
            attachments={attachments}
            onRemove={handleRemoveAttachment}
            onDownload={handleDownload}
            showRemoveButton={true}
            showDownloadButton={true}
            maxDisplayCount={20}
            className="file-upload-demo__attachments"
          />
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="file-upload-demo__error">
          <h4>エラー</h4>
          <p>{error}</p>
        </div>
      )}

      {/* Instructions */}
      <div className="file-upload-demo__instructions">
        <h4>使用方法</h4>
        <ul>
          <li>「ファイルを選択」ボタンをクリックしてファイルを選択</li>
          <li>複数ファイルの同時選択が可能</li>
          <li>アップロード中はプログレスバーで進行状況を確認</li>
          <li>アップロード完了後、ファイルの表示・ダウンロード・削除が可能</li>
          <li>画像ファイルはプレビュー表示</li>
          <li>対応形式: 画像、PDF、テキスト、音声、動画</li>
          <li>最大ファイルサイズ: 50MB</li>
          <li>最大ファイル数: 10個</li>
        </ul>
      </div>

      {/* Technical Info */}
      <div className="file-upload-demo__tech-info">
        <h4>技術情報</h4>
        <ul>
          <li>S3 Presigned URLを使用した直接アップロード</li>
          <li>アップロード進行状況のリアルタイム表示</li>
          <li>ファイルサイズ・形式の事前バリデーション</li>
          <li>エラーハンドリングと再試行機能</li>
          <li>DynamoDBでのファイルメタデータ管理</li>
          <li>セキュアなファイルアクセス制御</li>
        </ul>
      </div>
    </div>
  );
};
