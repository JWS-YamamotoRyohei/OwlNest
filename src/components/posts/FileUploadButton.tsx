import React, { useRef, useState, useCallback } from 'react';
import { FileAttachment } from '../../types/common';
import { fileUploadService, UploadProgress } from '../../services/fileUploadService';
import './FileUploadButton.css';

interface FileUploadButtonProps {
  onUpload: (files: FileAttachment[]) => void;
  onProgress?: (progress: UploadProgress[]) => void;
  accept?: string;
  multiple?: boolean;
  maxSize?: number; // in bytes
  maxFiles?: number;
  className?: string;
  title?: string;
  children: React.ReactNode;
  disabled?: boolean;
  discussionId?: string;
  postId?: string;
}

export const FileUploadButton: React.FC<FileUploadButtonProps> = ({
  onUpload,
  onProgress,
  accept = '*/*',
  multiple = false,
  maxSize = 10 * 1024 * 1024, // 10MB default
  maxFiles = 5,
  className = '',
  title,
  children,
  disabled = false,
  discussionId,
  postId,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string>('');
  const [uploadProgresses, setUploadProgresses] = useState<Map<string, UploadProgress>>(new Map());

  const validateFile = (file: File): string | null => {
    if (file.size > maxSize) {
      const maxSizeMB = Math.round(maxSize / (1024 * 1024));
      return `ファイルサイズが大きすぎます。${maxSizeMB}MB以下のファイルを選択してください。`;
    }

    // Check file type if accept is specified
    if (accept !== '*/*') {
      const acceptedTypes = accept.split(',').map(type => type.trim());
      const isAccepted = acceptedTypes.some(acceptedType => {
        if (acceptedType.startsWith('.')) {
          // Extension check
          return file.name.toLowerCase().endsWith(acceptedType.toLowerCase());
        } else if (acceptedType.includes('*')) {
          // MIME type with wildcard
          const [mainType] = acceptedType.split('/');
          return file.type.startsWith(mainType);
        } else {
          // Exact MIME type
          return file.type === acceptedType;
        }
      });

      if (!isAccepted) {
        return `サポートされていないファイル形式です。`;
      }
    }

    return null;
  };

  const updateProgress = useCallback((progress: UploadProgress) => {
    setUploadProgresses(prev => {
      const newProgresses = new Map(prev);
      newProgresses.set(progress.fileId, progress);
      
      // Notify parent component
      onProgress?.(Array.from(newProgresses.values()));
      
      return newProgresses;
    });
  }, [onProgress]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    if (files.length === 0) return;

    // Validate number of files
    if (files.length > maxFiles) {
      setError(`一度にアップロードできるファイル数は${maxFiles}個までです。`);
      return;
    }

    // Validate each file
    const validationErrors: string[] = [];
    files.forEach((file, index) => {
      const error = validateFile(file);
      if (error) {
        validationErrors.push(`${file.name}: ${error}`);
      }
    });

    if (validationErrors.length > 0) {
      setError(validationErrors.join('\n'));
      return;
    }

    setError('');
    setIsUploading(true);
    setUploadProgresses(new Map());

    try {
      // Upload files using the file upload service
      const uploadPromises = files.map(file => 
        fileUploadService.uploadFile(file, {
          discussionId,
          postId,
          onProgress: updateProgress,
        })
      );

      const uploadedFiles = await Promise.all(uploadPromises);
      
      onUpload(uploadedFiles);
      
      // Clear progress after successful upload
      setTimeout(() => {
        setUploadProgresses(new Map());
      }, 2000);
      
    } catch (error) {
      console.error('File upload failed:', error);
      setError(error instanceof Error ? error.message : 'ファイルのアップロードに失敗しました。');
    } finally {
      setIsUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleButtonClick = () => {
    if (!disabled && !isUploading && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleCancelUpload = (fileId: string) => {
    fileUploadService.cancelUpload(fileId);
    setUploadProgresses(prev => {
      const newProgresses = new Map(prev);
      newProgresses.delete(fileId);
      return newProgresses;
    });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getOverallProgress = (): number => {
    const progresses = Array.from(uploadProgresses.values());
    if (progresses.length === 0) return 0;
    
    const totalProgress = progresses.reduce((sum, p) => sum + p.progress, 0);
    return Math.round(totalProgress / progresses.length);
  };

  return (
    <div className="file-upload-button">
      <button
        type="button"
        className={`file-upload-button__trigger ${className} ${
          isUploading ? 'file-upload-button__trigger--uploading' : ''
        } ${disabled ? 'file-upload-button__trigger--disabled' : ''}`}
        onClick={handleButtonClick}
        disabled={disabled || isUploading}
        title={title}
      >
        {isUploading ? (
          <div className="file-upload-button__loading">
            <div className="file-upload-button__spinner"></div>
            アップロード中... ({getOverallProgress()}%)
          </div>
        ) : (
          children
        )}
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleFileSelect}
        className="file-upload-button__input"
        disabled={disabled || isUploading}
      />

      {/* Upload Progress Display */}
      {uploadProgresses.size > 0 && (
        <div className="file-upload-button__progress-container">
          {Array.from(uploadProgresses.values()).map((progress) => (
            <div key={progress.fileId} className="file-upload-button__progress-item">
              <div className="file-upload-button__progress-header">
                <span className="file-upload-button__filename">
                  {progress.filename}
                </span>
                <button
                  type="button"
                  className="file-upload-button__cancel"
                  onClick={() => handleCancelUpload(progress.fileId)}
                  disabled={progress.status === 'completed'}
                  title="キャンセル"
                >
                  ×
                </button>
              </div>
              
              <div className="file-upload-button__progress-bar">
                <div 
                  className={`file-upload-button__progress-fill ${
                    progress.status === 'error' ? 'file-upload-button__progress-fill--error' :
                    progress.status === 'completed' ? 'file-upload-button__progress-fill--completed' : ''
                  }`}
                  style={{ width: `${progress.progress}%` }}
                />
              </div>
              
              <div className="file-upload-button__progress-info">
                <span className="file-upload-button__progress-percentage">
                  {Math.round(progress.progress)}%
                </span>
                <span className="file-upload-button__progress-status">
                  {progress.status === 'uploading' && 'アップロード中'}
                  {progress.status === 'completed' && '完了'}
                  {progress.status === 'error' && `エラー: ${progress.error}`}
                  {progress.status === 'cancelled' && 'キャンセル済み'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="file-upload-button__error">
          {error.split('\n').map((line, index) => (
            <div key={index}>{line}</div>
          ))}
        </div>
      )}
    </div>
  );
};