# File Upload System

This directory contains the file upload system implementation for the OwlNest discussion platform.

## Overview

The file upload system provides secure, scalable file upload functionality using AWS S3 with presigned URLs. It supports various file types including images, documents, audio, and video files.

## Components

### FileUploadButton

A reusable file upload button component with progress tracking and error handling.

**Features:**

- Multiple file selection support
- Real-time upload progress tracking
- File validation (size, type, count)
- Upload cancellation
- Error handling and display
- Responsive design with mobile support

**Usage:**

```tsx
import { FileUploadButton } from './components/posts';

<FileUploadButton
  onUpload={handleUpload}
  onProgress={handleProgress}
  accept="image/*,application/pdf"
  multiple={true}
  maxSize={10 * 1024 * 1024} // 10MB
  maxFiles={5}
  discussionId="discussion-123"
  postId="post-456"
>
  📎 ファイルを選択
</FileUploadButton>;
```

### FileAttachmentDisplay

A component for displaying uploaded file attachments with download and delete functionality.

**Features:**

- Image preview for image files
- File type icons for non-image files
- Download functionality
- Delete functionality with confirmation
- Responsive grid layout
- Error handling for failed loads

**Usage:**

```tsx
import { FileAttachmentDisplay } from './components/posts';

<FileAttachmentDisplay
  attachments={attachments}
  onRemove={handleRemove}
  onDownload={handleDownload}
  showRemoveButton={true}
  showDownloadButton={true}
  maxDisplayCount={10}
/>;
```

### FileUploadDemo

A comprehensive demo component showcasing all file upload features.

**Features:**

- Interactive file upload testing
- Progress monitoring
- Error demonstration
- Usage instructions
- Technical information display

## Services

### FileUploadService

A service class that handles all file upload operations.

**Key Methods:**

- `uploadFile(file, options)` - Upload a single file
- `uploadFiles(files, options)` - Upload multiple files
- `cancelUpload(fileId)` - Cancel an active upload
- `deleteFile(fileId)` - Delete an uploaded file
- `getFileInfo(fileId)` - Get file metadata

**Features:**

- S3 presigned URL generation
- Upload progress tracking
- File validation
- Error handling
- Upload cancellation
- Concurrent upload support

## Backend Integration

### Lambda Function

The file upload Lambda function (`cdk/lambda/file-upload/index.ts`) handles:

- Presigned URL generation
- File metadata storage in DynamoDB
- Upload completion confirmation
- File deletion
- Access control

**API Endpoints:**

- `POST /files/presigned-url` - Get presigned URL for upload
- `POST /files/complete` - Mark upload as completed
- `GET /files/file/{fileId}` - Get file information
- `DELETE /files/file/{fileId}` - Delete file

### DynamoDB Schema

Files are stored in the main table with the following structure:

```typescript
{
  PK: "FILE#{fileId}",
  SK: "METADATA",
  GSI1PK: "USER#{userId}",
  GSI1SK: "FILE#{uploadedAt}",
  EntityType: "FileMetadata",
  fileId: string,
  filename: string,
  contentType: string,
  size: number,
  uploadedBy: string,
  uploadedAt: string,
  s3Key: string,
  url: string,
  discussionId?: string,
  postId?: string,
  isPublic: boolean,
  status: "uploading" | "completed" | "failed" | "deleted"
}
```

## File Type Support

### Supported File Types

**Images:**

- JPEG/JPG (max 10MB)
- PNG (max 10MB)
- GIF (max 5MB)
- WebP (max 10MB)

**Documents:**

- PDF (max 20MB)
- Plain Text (max 1MB)
- Word Documents (.doc, .docx) (max 10MB)

**Audio:**

- MP3 (max 50MB)
- WAV (max 50MB)
- OGG (max 50MB)

**Video:**

- MP4 (max 100MB)
- WebM (max 100MB)
- QuickTime (.mov) (max 100MB)

### File Validation

Files are validated on both client and server sides:

1. **Client-side validation:**
   - File type checking
   - File size limits
   - File count limits
   - Filename validation

2. **Server-side validation:**
   - MIME type verification
   - File size enforcement
   - Security scanning (future enhancement)

## Security Features

### Access Control

- User authentication required for all operations
- File ownership verification
- Presigned URL expiration (1 hour)
- Private S3 bucket with restricted access

### Data Protection

- Files stored in private S3 bucket
- Metadata stored in DynamoDB with encryption at rest
- Secure presigned URLs for temporary access
- File deletion with audit trail

## Performance Optimizations

### Upload Performance

- Direct S3 upload using presigned URLs
- Concurrent file uploads
- Progress tracking with minimal overhead
- Efficient error handling

### Display Performance

- Lazy loading for images
- Thumbnail generation (future enhancement)
- CDN integration via CloudFront
- Optimized file metadata queries

## Error Handling

### Client-side Errors

- Network connectivity issues
- File validation failures
- Upload cancellation
- Server errors

### Server-side Errors

- Authentication failures
- Authorization errors
- S3 service errors
- DynamoDB errors

## Testing

### Unit Tests

Run the file upload service tests:

```bash
npm test -- --testPathPattern=FileUploadService.test.ts
```

### Integration Tests

Test the complete upload flow:

```bash
npm test -- --testPathPattern=FileUpload.integration.test.ts
```

### Manual Testing

Use the FileUploadDemo component for manual testing:

1. Start the development server
2. Navigate to the demo page
3. Test various file types and sizes
4. Verify progress tracking and error handling

## Configuration

### Environment Variables

Add these variables to your `.env` file:

```bash
REACT_APP_FILES_BUCKET_NAME=your-files-bucket-name
REACT_APP_API_GATEWAY_URL=your-api-gateway-url
```

### CDK Configuration

The file upload infrastructure is defined in `cdk/lib/owlnest-stack.ts`:

- S3 bucket for file storage
- Lambda function for upload handling
- API Gateway endpoints
- DynamoDB table for metadata

## Future Enhancements

### Planned Features

1. **Image Processing:**
   - Automatic thumbnail generation
   - Image compression and optimization
   - Multiple resolution support

2. **Advanced Security:**
   - Virus scanning integration
   - Content moderation
   - Watermarking for images

3. **Performance Improvements:**
   - Multipart upload for large files
   - Resume interrupted uploads
   - Background upload queue

4. **User Experience:**
   - Drag and drop interface
   - Paste from clipboard
   - Bulk operations

5. **Analytics:**
   - Upload success rates
   - File type usage statistics
   - Storage usage monitoring

## Troubleshooting

### Common Issues

1. **Upload fails with 403 error:**
   - Check AWS credentials
   - Verify S3 bucket permissions
   - Ensure presigned URL hasn't expired

2. **File validation errors:**
   - Check file type against allowed types
   - Verify file size limits
   - Ensure filename is valid

3. **Progress not updating:**
   - Check network connectivity
   - Verify progress callback implementation
   - Check for JavaScript errors

### Debug Mode

Enable debug mode by setting:

```bash
REACT_APP_DEBUG_MODE=true
```

This will provide detailed logging for troubleshooting.

## Contributing

When contributing to the file upload system:

1. Follow the existing code style
2. Add unit tests for new functionality
3. Update documentation
4. Test with various file types and sizes
5. Consider security implications
6. Ensure mobile compatibility

## License

This file upload system is part of the OwlNest project and follows the same license terms.
