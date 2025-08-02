// Notification Lambda function
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('Notification Lambda - Event:', JSON.stringify(event, null, 2));

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Content-Type': 'application/json',
  };

  try {
    const { httpMethod, path, pathParameters } = event;

    switch (httpMethod) {
      case 'OPTIONS':
        return {
          statusCode: 200,
          headers,
          body: '',
        };

      case 'GET':
        if (path.includes('/notifications')) {
          return handleGetNotifications(event, headers);
        }
        break;

      case 'PUT':
        if (pathParameters?.proxy && path.includes('/read')) {
          return handleMarkAsRead(pathParameters.proxy, headers);
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
    console.error('Notification Lambda Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};

const handleGetNotifications = async (
  event: APIGatewayProxyEvent,
  headers: Record<string, string>
): Promise<APIGatewayProxyResult> => {
  // TODO: Implement get notifications logic
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      message: 'Get notifications endpoint - to be implemented',
      notifications: []
    }),
  };
};

const handleMarkAsRead = async (
  notificationId: string,
  headers: Record<string, string>
): Promise<APIGatewayProxyResult> => {
  // TODO: Implement mark notification as read logic
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      message: `Mark notification ${notificationId} as read endpoint - to be implemented`
    }),
  };
};