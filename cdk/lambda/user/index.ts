// User management Lambda function
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('User Lambda - Event:', JSON.stringify(event, null, 2));

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Content-Type': 'application/json',
  };

  try {
    const { httpMethod, path, body, pathParameters } = event;

    switch (httpMethod) {
      case 'OPTIONS':
        return {
          statusCode: 200,
          headers,
          body: '',
        };

      case 'GET':
        if (pathParameters?.proxy) {
          return handleGetUser(pathParameters.proxy, headers);
        } else {
          return handleGetUsers(event, headers);
        }

      case 'PUT':
        if (pathParameters?.proxy) {
          return handleUpdateUser(pathParameters.proxy, body, headers);
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
    console.error('User Lambda Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};

const handleGetUsers = async (
  event: APIGatewayProxyEvent,
  headers: Record<string, string>
): Promise<APIGatewayProxyResult> => {
  // TODO: Implement get users logic with filtering and pagination
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ 
      message: 'Get users endpoint - to be implemented',
      users: []
    }),
  };
};

const handleGetUser = async (
  userId: string,
  headers: Record<string, string>
): Promise<APIGatewayProxyResult> => {
  // TODO: Implement get single user logic
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ 
      message: `Get user ${userId} endpoint - to be implemented`
    }),
  };
};

const handleUpdateUser = async (
  userId: string,
  body: string | null,
  headers: Record<string, string>
): Promise<APIGatewayProxyResult> => {
  // TODO: Implement update user logic
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ 
      message: `Update user ${userId} endpoint - to be implemented`
    }),
  };
};