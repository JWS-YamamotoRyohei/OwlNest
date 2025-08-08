import React, { useState } from 'react';
import { FileAttachment } from '../../types/common';
import { fileUploadService } from '../../services/fileUploadService';
import './FileAttachmentDisplay.css';

interface FileAttachmentDisplayProps {
  attachments: FileAttachment[];
  onRemove?: (attachmentId: string) => void;
  onDownload?: (attachment: FileAttachment) => void;
  showRemoveButton?: boolean;
  showDownloadButton?: boolean;
  maxDisplayCount?: number;
  className?: string;
}

export const FileAttachmentDisplay: React.FC<FileAttachmentDisplayProps> = ({
  attachments,
  onRemove,
  onDownload,
  showRemoveButton = false,
  showDownloadButton = true,
  maxDisplayCount = 10,
  className = '',
}) => {
  const [loadingStates, setLoadingStates] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Map<string, string>>(new Map());

  const displayedAttachments = attachments.slice(0, maxDisplayCount);
  const hiddenCount = Math.max(0, attachments.length - maxDisplayCount);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (contentType: string): string => {
    if (contentType.startsWith('image/')) return '🖼️';
    if (contentType.startsWith('video/')) return '🎥';
    if (contentType.startsWith('audio/')) return '🎵';
    if (contentType === 'application/pdf') return '📄';
    if (contentType.includes('document') || contentType.includes('word')) return '📝';
    if (contentType.includes('spreadsheet') || contentType.includes('excel')) return '📊';
    if (contentType.includes('presentation') || contentType.includes('powerpoint')) return '📽️';
    if (contentType === 'text/plain') return '📄';
    return '📎';
  };

  const isImageFile = (contentType: string): boolean => {
    return contentType.startsWith('image/');
  };

  const handleRemove = async (attachmentId: string) => {
    if (!onRemove) return;

    setLoadingStates(prev => new Set(prev).add(attachmentId));
    setErrors(prev => {
      const newErrors = new Map(prev);
      newErrors.delete(attachmentId);
      return newErrors;
    });

    try {
      await fileUploadService.deleteFile(attachmentId);
      onRemove(attachmentId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'ファイルの削除に失敗しました';
      setErrors(prev => {
        const newErrors = new Map(prev);
        newErrors.set(attachmentId, errorMessage);
        return newErrors;
      });
    } finally {
      setLoadingStates(prev => {
        const newStates = new Set(prev);
        newStates.delete(attachmentId);
        return newStates;
      });
    }
  };

  const handleDownload = (attachment: FileAttachment) => {
    if (onDownload) {
      onDownload(attachment);
    } else {
      // Default download behavior
      const link = document.createElement('a');
      link.href = attachment.url;
      link.download = attachment.filename;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleImageError = (attachmentId: string) => {
    setErrors(prev => {
      const newErrors = new Map(prev);
      newErrors.set(attachmentId, '画像の読み込みに失敗しました');
      return newErrors;
    });
  };

  if (attachments.length === 0) {
    return null;
  }

  return (
    <div className={`file-attachment-display ${className}`}>
      <div className="file-attachment-display__list">
        {displayedAttachments.map(attachment => {
          const isLoading = loadingStates.has(attachment.id);
          const error = errors.get(attachment.id);
          const isImage = isImageFile(attachment.contentType);

          return (
            <div key={attachment.id} className="file-attachment-display__item">
              {isImage ? (
                <div className="file-attachment-display__image-container">
                  <img
                    src={attachment.url}
                    alt={attachment.filename}
                    className="file-attachment-display__image"
                    onError={() => handleImageError(attachment.id)}
                    loading="lazy"
                  />
                  {error && <div className="file-attachment-display__image-error">{error}</div>}
                </div>
              ) : (
                <div className="file-attachment-display__file">
                  <div className="file-attachment-display__file-icon">
                    {getFileIcon(attachment.contentType)}
                  </div>
                  <div className="file-attachment-display__file-info">
                    <div className="file-attachment-display__filename">{attachment.filename}</div>
                    <div className="file-attachment-display__file-meta">
                      {formatFileSize(attachment.size)}
                    </div>
                  </div>
                </div>
              )}

              <div className="file-attachment-display__actions">
                {showDownloadButton && (
                  <button
                    type="button"
                    className="file-attachment-display__action file-attachment-display__download"
                    onClick={() => handleDownload(attachment)}
                    title="ダウンロード"
                    disabled={isLoading}
                  >
                    ⬇️
                  </button>
                )}

                {showRemoveButton && (
                  <button
                    type="button"
                    className="file-attachment-display__action file-attachment-display__remove"
                    onClick={() => handleRemove(attachment.id)}
                    title="削除"
                    disabled={isLoading}
                  >
                    {isLoading ? <div className="file-attachment-display__spinner" /> : '🗑️'}
                  </button>
                )}
              </div>

              {error && !isImage && <div className="file-attachment-display__error">{error}</div>}
            </div>
          );
        })}
      </div>

      {hiddenCount > 0 && (
        <div className="file-attachment-display__more">他 {hiddenCount} 個のファイル</div>
      )}
    </div>
  );
};
