// File upload Lambda function
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

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
    const { httpMethod, path, body } = event;

    switch (httpMethod) {
      case 'OPTIONS':
        return {
          statusCode: 200,
          headers,
          body: '',
        };

      case 'POST':
        if (path.includes('/presigned-url')) {
          return handleGetPresignedUrl(body, headers);
        }
        break;

      case 'DELETE':
        if (path.includes('/file/')) {
          const fileKey = path.split('/file/')[1];
          return handleDeleteFile(fileKey, headers);
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
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};

const handleGetPresignedUrl = async (
  body: string | null,
  headers: Record<string, string>
): Promise<APIGatewayProxyResult> => {
  // TODO: Implement S3 presigned URL generation
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ message: 'Get presigned URL endpoint - to be implemented' }),
  };
};

const handleDeleteFile = async (
  fileKey: string,
  headers: Record<string, string>
): Promise<APIGatewayProxyResult> => {
  // TODO: Implement S3 file deletion
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ message: `Delete file ${fileKey} endpoint - to be implemented` }),
  };
};