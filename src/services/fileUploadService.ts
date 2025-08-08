import { FileAttachment } from '../types/common';
import { apiService } from './api';

export interface UploadProgress {
  fileId: string;
  filename: string;
  progress: number; // 0-100
  status: 'uploading' | 'completed' | 'error' | 'cancelled';
  error?: string;
}

export interface PresignedUrlResponse {
  fileId: string;
  presignedUrl: string;
  s3Key: string;
  expiresIn: number;
  metadata: {
    filename: string;
    contentType: string;
    size: number;
    maxSize: number;
  };
}

export interface FileUploadOptions {
  discussionId?: string;
  postId?: string;
  onProgress?: (progress: UploadProgress) => void;
  signal?: AbortSignal;
}

export class FileUploadService {
  private activeUploads = new Map<string, AbortController>();

  /**
   * Upload a single file to S3
   */
  async uploadFile(file: File, options: FileUploadOptions = {}): Promise<FileAttachment> {
    const { discussionId, postId, onProgress, signal } = options;

    // Validate file
    this.validateFile(file);

    // Create abort controller for this upload
    const abortController = new AbortController();
    const fileId = this.generateFileId();

    this.activeUploads.set(fileId, abortController);

    // Listen for external abort signal
    if (signal) {
      signal.addEventListener('abort', () => {
        abortController.abort();
      });
    }

    try {
      // Report initial progress
      onProgress?.({
        fileId,
        filename: file.name,
        progress: 0,
        status: 'uploading',
      });

      // Step 1: Get presigned URL
      const presignedResponse = await this.getPresignedUrl({
        filename: file.name,
        contentType: file.type,
        size: file.size,
        discussionId,
        postId,
      });

      onProgress?.({
        fileId,
        filename: file.name,
        progress: 10,
        status: 'uploading',
      });

      // Step 2: Upload to S3 using presigned URL
      await this.uploadToS3(presignedResponse.presignedUrl, file, {
        onProgress: progress => {
          onProgress?.({
            fileId,
            filename: file.name,
            progress: 10 + progress * 0.8, // 10-90%
            status: 'uploading',
          });
        },
        signal: abortController.signal,
      });

      onProgress?.({
        fileId,
        filename: file.name,
        progress: 95,
        status: 'uploading',
      });

      // Step 3: Complete upload
      await this.completeUpload(presignedResponse.fileId);

      onProgress?.({
        fileId,
        filename: file.name,
        progress: 100,
        status: 'completed',
      });

      // Get the file info to get the actual URL
      const fileInfo = await this.getFileInfo(presignedResponse.fileId);

      // Create FileAttachment object
      const fileAttachment: FileAttachment = {
        id: presignedResponse.fileId,
        url: fileInfo.url,
        filename: file.name,
        contentType: file.type,
        size: file.size,
        uploadedAt: new Date().toISOString(),
      };

      return fileAttachment;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';

      onProgress?.({
        fileId,
        filename: file.name,
        progress: 0,
        status: 'error',
        error: errorMessage,
      });

      throw new Error(`File upload failed: ${errorMessage}`);
    } finally {
      this.activeUploads.delete(fileId);
    }
  }

  /**
   * Upload multiple files
   */
  async uploadFiles(files: File[], options: FileUploadOptions = {}): Promise<FileAttachment[]> {
    const uploadPromises = files.map(file => this.uploadFile(file, options));
    return Promise.all(uploadPromises);
  }

  /**
   * Cancel an active upload
   */
  cancelUpload(fileId: string): void {
    const controller = this.activeUploads.get(fileId);
    if (controller) {
      controller.abort();
      this.activeUploads.delete(fileId);
    }
  }

  /**
   * Cancel all active uploads
   */
  cancelAllUploads(): void {
    for (const [_fileId, controller] of this.activeUploads) {
      controller.abort();
    }
    this.activeUploads.clear();
  }

  /**
   * Delete a file
   */
  async deleteFile(fileId: string): Promise<void> {
    try {
      await apiService.delete(`/files/file/${fileId}`);
    } catch (error) {
      throw new Error(
        `Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get file information
   */
  async getFileInfo(fileId: string): Promise<FileAttachment> {
    try {
      const response = await apiService.get<FileAttachment>(`/files/file/${fileId}`);
      return response.data;
    } catch (error) {
      throw new Error(
        `Failed to get file info: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private async getPresignedUrl(request: {
    filename: string;
    contentType: string;
    size: number;
    discussionId?: string;
    postId?: string;
  }): Promise<PresignedUrlResponse> {
    try {
      const response = await apiService.post<PresignedUrlResponse>('/files/presigned-url', request);
      return response.data;
    } catch (error) {
      throw new Error(
        `Failed to get presigned URL: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private async uploadToS3(
    presignedUrl: string,
    file: File,
    options: {
      onProgress?: (progress: number) => void;
      signal?: AbortSignal;
    }
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // Handle progress
      xhr.upload.addEventListener('progress', event => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 100;
          options.onProgress?.(progress);
        }
      });

      // Handle completion
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      });

      // Handle errors
      xhr.addEventListener('error', () => {
        reject(new Error('Network error during upload'));
      });

      // Handle abort
      xhr.addEventListener('abort', () => {
        reject(new Error('Upload cancelled'));
      });

      // Handle external abort signal
      if (options.signal) {
        options.signal.addEventListener('abort', () => {
          xhr.abort();
        });
      }

      // Start upload
      xhr.open('PUT', presignedUrl);
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.send(file);
    });
  }

  private async completeUpload(fileId: string): Promise<void> {
    try {
      await apiService.post('/files/complete', { fileId });
    } catch (error) {
      throw new Error(
        `Failed to complete upload: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private validateFile(file: File): void {
    // File size validation (max 100MB)
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error(
        `File size ${this.formatFileSize(file.size)} exceeds maximum allowed size ${this.formatFileSize(maxSize)}`
      );
    }

    // File type validation
    const allowedTypes = [
      // Images
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      // Documents
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      // Audio
      'audio/mpeg',
      'audio/wav',
      'audio/ogg',
      // Video
      'video/mp4',
      'video/webm',
      'video/quicktime',
    ];

    if (!allowedTypes.includes(file.type)) {
      throw new Error(`File type ${file.type} is not allowed`);
    }

    // Filename validation
    if (!file.name || file.name.length > 255) {
      throw new Error('Invalid filename');
    }
  }

  private generateFileId(): string {
    return `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

export const fileUploadService = new FileUploadService();
