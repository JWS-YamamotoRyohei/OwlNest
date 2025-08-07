// File upload Lambda function
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, UpdateCommand, DeleteCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';

const s3Client = new S3Client({ region: process.env.AWS_REGION });
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const BUCKET_NAME = process.env.FILES_BUCKET_NAME || 'owlnest-files-dev';
const TABLE_NAME = process.env.TABLE_NAME || 'owlnest-main-table-dev';

// Allowed file types and their MIME types
const ALLOWED_FILE_TYPES = {
  // Images
  'image/jpeg': { extension: 'jpg', maxSize: 10 * 1024 * 1024 }, // 10MB
  'image/jpg': { extension: 'jpg', maxSize: 10 * 1024 * 1024 },
  'image/png': { extension: 'png', maxSize: 10 * 1024 * 1024 },
  'image/gif': { extension: 'gif', maxSize: 5 * 1024 * 1024 }, // 5MB
  'image/webp': { extension: 'webp', maxSize: 10 * 1024 * 1024 },

  // Documents
  'application/pdf': { extension: 'pdf', maxSize: 20 * 1024 * 1024 }, // 20MB
  'text/plain': { extension: 'txt', maxSize: 1 * 1024 * 1024 }, // 1MB
  'application/msword': { extension: 'doc', maxSize: 10 * 1024 * 1024 },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { extension: 'docx', maxSize: 10 * 1024 * 1024 },

  // Audio
  'audio/mpeg': { extension: 'mp3', maxSize: 50 * 1024 * 1024 }, // 50MB
  'audio/wav': { extension: 'wav', maxSize: 50 * 1024 * 1024 },
  'audio/ogg': { extension: 'ogg', maxSize: 50 * 1024 * 1024 },

  // Video
  'video/mp4': { extension: 'mp4', maxSize: 100 * 1024 * 1024 }, // 100MB
  'video/webm': { extension: 'webm', maxSize: 100 * 1024 * 1024 },
  'video/quicktime': { extension: 'mov', maxSize: 100 * 1024 * 1024 },
};

interface PresignedUrlRequest {
  filename: string;
  contentType: string;
  size: number;
  discussionId?: string;
  postId?: string;
}

interface FileMetadata {
  fileId: string;
  filename: string;
  contentType: string;
  size: number;
  uploadedBy: string;
  uploadedAt: string;
  s3Key: string;
  url: string;
  discussionId?: string;
  postId?: string;
  isPublic: boolean;
  status: 'uploading' | 'completed' | 'failed' | 'deleted';
}
type AllowedContentType = keyof typeof ALLOWED_FILE_TYPES;
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('File Upload Lambda - Event:', JSON.stringify(event, null, 2));

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Content-Type': 'application/json',
  };

  try {
    const { httpMethod, path, body, requestContext } = event;
    const userId = requestContext.authorizer?.claims?.sub;

    if (!userId) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized' }),
      };
    }



    switch (httpMethod) {
      case 'OPTIONS':
        return {
          statusCode: 200,
          headers,
          body: '',
        };

      case 'POST':
        if (path.includes('/presigned-url')) {
          return handleGetPresignedUrl(body, userId, headers);
        } else if (path.includes('/complete')) {
          return handleCompleteUpload(body, userId, headers);
        }
        break;

      case 'GET':
        if (path.includes('/file/')) {
          const fileId = path.split('/file/')[1];
          return handleGetFileInfo(fileId, userId, headers);
        }
        break;

      case 'DELETE':
        if (path.includes('/file/')) {
          const fileId = path.split('/file/')[1];
          return handleDeleteFile(fileId, userId, headers);
        }
        break;

      default:
        return {
          statusCode: 405,
          headers,
          body: JSON.stringify({ error: 'Method not allowed' }),
        };
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Not found' }),
    };
  } catch (error) {
    console.error('File Upload Lambda Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
    };
  }
};

const handleGetPresignedUrl = async (
  body: string | null,
  userId: string,
  headers: Record<string, string>
): Promise<APIGatewayProxyResult> => {
  try {
    if (!body) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Request body is required' }),
      };
    }

    const request: PresignedUrlRequest = JSON.parse(body);
    const { filename, contentType, size, discussionId, postId } = request;
    if (!(contentType in ALLOWED_FILE_TYPES)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: `File type ${contentType} is not allowed`,
          allowedTypes: Object.keys(ALLOWED_FILE_TYPES)
        }),
      };
    }
    // Validate required fields
    if (!filename || !contentType || !size) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Missing required fields: filename, contentType, size'
        }),
      };
    }

    // Validate file type
    if (!ALLOWED_FILE_TYPES[contentType as AllowedContentType]) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: `File type ${contentType} is not allowed`,
          allowedTypes: Object.keys(ALLOWED_FILE_TYPES)
        }),
      };
    }

    // Validate file size
    const maxSize = ALLOWED_FILE_TYPES[contentType as AllowedContentType].maxSize;
    if (size > maxSize) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: `File size ${size} exceeds maximum allowed size ${maxSize}`,
          maxSize
        }),
      };
    }

    // Generate unique file ID and S3 key
    const fileId = uuidv4();
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const extension = ALLOWED_FILE_TYPES[contentType as AllowedContentType].extension;
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const s3Key = `uploads/${timestamp}/${userId}/${fileId}_${sanitizedFilename}`;

    // Create presigned URL for upload
    const putCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      ContentType: contentType,
      ContentLength: size,
      Metadata: {
        'uploaded-by': userId,
        'original-filename': filename,
        'file-id': fileId,
        ...(discussionId && { 'discussion-id': discussionId }),
        ...(postId && { 'post-id': postId }),
      },
    });

    const presignedUrl = await getSignedUrl(s3Client, putCommand, {
      expiresIn: 3600 // 1 hour
    });

    // Store file metadata in DynamoDB
    const fileMetadata: FileMetadata = {
      fileId,
      filename,
      contentType,
      size,
      uploadedBy: userId,
      uploadedAt: new Date().toISOString(),
      s3Key,
      url: `https://${BUCKET_NAME}.s3.amazonaws.com/${s3Key}`,
      discussionId,
      postId,
      isPublic: false, // Will be set to true after successful upload
      status: 'uploading',
    };

    await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: `FILE#${fileId}`,
        SK: 'METADATA',
        GSI1PK: `USER#${userId}`,
        GSI1SK: `FILE#${fileMetadata.uploadedAt}`,
        EntityType: 'FileMetadata',
        ...fileMetadata,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        fileId,
        presignedUrl,
        s3Key,
        expiresIn: 3600,
        metadata: {
          filename,
          contentType,
          size,
          maxSize,
        },
      }),
    };
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to generate presigned URL',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
    };
  }
};

const handleCompleteUpload = async (
  body: string | null,
  userId: string,
  headers: Record<string, string>
): Promise<APIGatewayProxyResult> => {
  try {
    if (!body) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Request body is required' }),
      };
    }

    const { fileId } = JSON.parse(body);

    if (!fileId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'fileId is required' }),
      };
    }

    // Verify the file exists in S3 and update status
    const updateCommand = new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `FILE#${fileId}`,
        SK: 'METADATA',
      },
      UpdateExpression: 'SET #status = :status, #isPublic = :isPublic, #updatedAt = :updatedAt',
      ConditionExpression: '#uploadedBy = :userId AND #status = :uploadingStatus',
      ExpressionAttributeNames: {
        '#status': 'status',
        '#isPublic': 'isPublic',
        '#updatedAt': 'updatedAt',
        '#uploadedBy': 'uploadedBy',
      },
      ExpressionAttributeValues: {
        ':status': 'completed',
        ':isPublic': true,
        ':updatedAt': new Date().toISOString(),
        ':userId': userId,
        ':uploadingStatus': 'uploading',
      },
      ReturnValues: 'ALL_NEW',
    });

    const result = await docClient.send(updateCommand);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Upload completed successfully',
        file: result.Attributes,
      }),
    };
  } catch (error) {
    console.error('Error completing upload:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to complete upload',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
    };
  }
};

const handleGetFileInfo = async (
  fileId: string,
  userId: string,
  headers: Record<string, string>
): Promise<APIGatewayProxyResult> => {
  try {
    // Get file metadata from DynamoDB
    const getCommand = new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `FILE#${fileId}`,
        SK: 'METADATA',
      },
    });

    const result = await docClient.send(getCommand);

    if (!result.Item) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'File not found' }),
      };
    }

    const fileMetadata = result.Item as FileMetadata;

    // Check if user has permission to access the file
    if (!fileMetadata.isPublic && fileMetadata.uploadedBy !== userId) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Access denied' }),
      };
    }

    // Generate presigned URL for download if file is private
    let downloadUrl = fileMetadata.url;
    if (!fileMetadata.isPublic) {
      const getCommand = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: fileMetadata.s3Key,
      });
      downloadUrl = await getSignedUrl(s3Client, getCommand, { expiresIn: 3600 });
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ...fileMetadata,
        downloadUrl,
      }),
    };
  } catch (error) {
    console.error('Error getting file info:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to get file info',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
    };
  }
};

const handleDeleteFile = async (
  fileId: string,
  userId: string,
  headers: Record<string, string>
): Promise<APIGatewayProxyResult> => {
  try {
    // Get file metadata first to verify ownership
    const getCommand = new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `FILE#${fileId}`,
        SK: 'METADATA',
      },
    });

    const result = await docClient.send(getCommand);

    if (!result.Item) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'File not found' }),
      };
    }

    const fileMetadata = result.Item as FileMetadata;

    // Check if user has permission to delete the file
    if (fileMetadata.uploadedBy !== userId) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Access denied' }),
      };
    }

    // Delete from S3
    const deleteS3Command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileMetadata.s3Key,
    });

    await s3Client.send(deleteS3Command);

    // Update status in DynamoDB (soft delete)
    const updateCommand = new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `FILE#${fileId}`,
        SK: 'METADATA',
      },
      UpdateExpression: 'SET #status = :status, #updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#status': 'status',
        '#updatedAt': 'updatedAt',
      },
      ExpressionAttributeValues: {
        ':status': 'deleted',
        ':updatedAt': new Date().toISOString(),
      },
    });

    await docClient.send(updateCommand);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'File deleted successfully',
        fileId,
      }),
    };
  } catch (error) {
    console.error('Error deleting file:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to delete file',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
    };
  }
};