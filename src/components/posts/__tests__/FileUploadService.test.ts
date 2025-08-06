import { FileUploadService } from '../../../services/fileUploadService';

// Mock the API service
jest.mock('../../../services/api', () => ({
  apiService: {
    post: jest.fn(),
    get: jest.fn(),
    delete: jest.fn(),
  },
}));

describe('FileUploadService', () => {
  let fileUploadService: FileUploadService;
  let mockFile: File;

  beforeEach(() => {
    fileUploadService = new FileUploadService();
    
    // Create a mock file
    mockFile = new File(['test content'], 'test.txt', {
      type: 'text/plain',
      lastModified: Date.now(),
    });

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('validateFile', () => {
    it('should validate file size correctly', () => {
      // Create a large file (over 100MB)
      const largeFile = new File(['x'.repeat(101 * 1024 * 1024)], 'large.txt', {
        type: 'text/plain',
      });

      expect(() => {
        (fileUploadService as any).validateFile(largeFile);
      }).toThrow('File size');
    });

    it('should validate file type correctly', () => {
      const invalidFile = new File(['test'], 'test.exe', {
        type: 'application/x-executable',
      });

      expect(() => {
        (fileUploadService as any).validateFile(invalidFile);
      }).toThrow('File type');
    });

    it('should validate filename correctly', () => {
      const fileWithoutName = new File(['test'], '', {
        type: 'text/plain',
      });

      expect(() => {
        (fileUploadService as any).validateFile(fileWithoutName);
      }).toThrow('Invalid filename');
    });

    it('should pass validation for valid files', () => {
      expect(() => {
        (fileUploadService as any).validateFile(mockFile);
      }).not.toThrow();
    });
  });

  describe('formatFileSize', () => {
    it('should format file sizes correctly', () => {
      const formatFileSize = (fileUploadService as any).formatFileSize;

      expect(formatFileSize(0)).toBe('0 Bytes');
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1024 * 1024)).toBe('1 MB');
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
      expect(formatFileSize(1536)).toBe('1.5 KB');
    });
  });

  describe('generateFileId', () => {
    it('should generate unique file IDs', () => {
      const generateFileId = (fileUploadService as any).generateFileId;
      
      const id1 = generateFileId();
      const id2 = generateFileId();

      expect(id1).toMatch(/^file_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^file_\d+_[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });
  });

  describe('cancelUpload', () => {
    it('should cancel active uploads', () => {
      const mockController = {
        abort: jest.fn(),
      };

      // Set up an active upload
      (fileUploadService as any).activeUploads.set('test-file-id', mockController);

      fileUploadService.cancelUpload('test-file-id');

      expect(mockController.abort).toHaveBeenCalled();
      expect((fileUploadService as any).activeUploads.has('test-file-id')).toBe(false);
    });

    it('should handle cancelling non-existent uploads gracefully', () => {
      expect(() => {
        fileUploadService.cancelUpload('non-existent-id');
      }).not.toThrow();
    });
  });

  describe('cancelAllUploads', () => {
    it('should cancel all active uploads', () => {
      const mockController1 = { abort: jest.fn() };
      const mockController2 = { abort: jest.fn() };

      // Set up multiple active uploads
      (fileUploadService as any).activeUploads.set('file1', mockController1);
      (fileUploadService as any).activeUploads.set('file2', mockController2);

      fileUploadService.cancelAllUploads();

      expect(mockController1.abort).toHaveBeenCalled();
      expect(mockController2.abort).toHaveBeenCalled();
      expect((fileUploadService as any).activeUploads.size).toBe(0);
    });
  });
});