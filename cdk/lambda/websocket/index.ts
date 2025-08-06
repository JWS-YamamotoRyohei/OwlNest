import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, DeleteCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { ApiGatewayManagementApiClient, PostToConnectionCommand } from '@aws-sdk/client-apigatewaymanagementapi';
import { CognitoJwtVerifier } from 'aws-jwt-verify';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const TABLE_NAME = process.env.TABLE_NAME!;
const USER_POOL_ID = process.env.USER_POOL_ID!;
const CLIENT_ID = process.env.CLIENT_ID!;

// JWT Verifier for Cognito tokens
const verifier = CognitoJwtVerifier.create({
  userPoolId: USER_POOL_ID,
  tokenUse: 'access',
  clientId: CLIENT_ID,
});

interface WebSocketEvent extends APIGatewayProxyEvent {
  requestContext: {
    connectionId: string;
    routeKey: string;
    domainName: string;
    stage: string;
    apiId: string;
  };
}

interface ConnectionData {
  PK: string;
  SK: string;
  EntityType: string;
  connectionId: string;
  userId?: string;
  connectedAt: string;
  lastActivity: string;
  discussionId?: string;
  ttl: number;
}

interface WebSocketMessage {
  action: string;
  data?: any;
  discussionId?: string;
  userId?: string;
}

export const handler = async (event: WebSocketEvent): Promise<APIGatewayProxyResult> => {
  console.log('WebSocket Event:', JSON.stringify(event, null, 2));

  const { requestContext } = event;
  const { connectionId, routeKey, domainName, stage } = requestContext;

  // Create API Gateway Management API client
  const apiGatewayClient = new ApiGatewayManagementApiClient({
    endpoint: `https://${domainName}/${stage}`,
  });

  try {
    switch (routeKey) {
      case '$connect':
        return await handleConnect(event, connectionId);
      case '$disconnect':
        return await handleDisconnect(connectionId);
      case '$default':
        return await handleMessage(event, connectionId, apiGatewayClient);
      default:
        console.log(`Unknown route: ${routeKey}`);
        return { statusCode: 404, body: 'Route not found' };
    }
  } catch (error) {
    console.error('WebSocket handler error:', error);
    return { statusCode: 500, body: 'Internal server error' };
  }
};

async function handleConnect(event: WebSocketEvent, connectionId: string): Promise<APIGatewayProxyResult> {
  console.log(`Connection request: ${connectionId}`);

  try {
    // Extract token from query parameters or headers
    const token = event.queryStringParameters?.token || 
                  event.headers?.Authorization?.replace('Bearer ', '') ||
                  event.headers?.authorization?.replace('Bearer ', '');

    let userId: string | undefined;

    // Verify JWT token if provided
    if (token) {
      try {
        const payload = await verifier.verify(token);
        userId = payload.sub;
        console.log(`Authenticated connection for user: ${userId}`);
      } catch (tokenError) {
        console.warn('Token verification failed:', tokenError);
        // Allow anonymous connections but without user association
      }
    }

    // Store connection in DynamoDB with TTL (24 hours)
    const ttl = Math.floor(Date.now() / 1000) + (24 * 60 * 60);
    const connectionData: ConnectionData = {
      PK: `CONNECTION#${connectionId}`,
      SK: 'METADATA',
      EntityType: 'WebSocketConnection',
      connectionId,
      userId,
      connectedAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      ttl,
    };

    await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: connectionData,
    }));

    // If user is authenticated, also store user-to-connection mapping
    if (userId) {
      const userConnectionData = {
        PK: `USER#${userId}`,
        SK: `CONNECTION#${connectionId}`,
        EntityType: 'UserConnection',
        connectionId,
        userId,
        connectedAt: new Date().toISOString(),
        ttl,
      };

      await docClient.send(new PutCommand({
        TableName: TABLE_NAME,
        Item: userConnectionData,
      }));
    }

    console.log(`Connection ${connectionId} stored successfully`);
    return { statusCode: 200, body: 'Connected' };

  } catch (error) {
    console.error('Error handling connect:', error);
    return { statusCode: 500, body: 'Failed to connect' };
  }
}

async function handleDisconnect(connectionId: string): Promise<APIGatewayProxyResult> {
  console.log(`Disconnect request: ${connectionId}`);

  try {
    // Get connection data first
    const connectionResult = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: {
        ':pk': `CONNECTION#${connectionId}`,
      },
    }));

    if (connectionResult.Items && connectionResult.Items.length > 0) {
      const connectionData = connectionResult.Items[0] as ConnectionData;
      const { userId } = connectionData;

      // Delete connection record
      await docClient.send(new DeleteCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `CONNECTION#${connectionId}`,
          SK: 'METADATA',
        },
      }));

      // Delete user-to-connection mapping if exists
      if (userId) {
        await docClient.send(new DeleteCommand({
          TableName: TABLE_NAME,
          Key: {
            PK: `USER#${userId}`,
            SK: `CONNECTION#${connectionId}`,
          },
        }));
      }

      console.log(`Connection ${connectionId} cleaned up successfully`);
    }

    return { statusCode: 200, body: 'Disconnected' };

  } catch (error) {
    console.error('Error handling disconnect:', error);
    return { statusCode: 500, body: 'Failed to disconnect' };
  }
}

async function handleMessage(
  event: WebSocketEvent,
  connectionId: string,
  apiGatewayClient: ApiGatewayManagementApiClient
): Promise<APIGatewayProxyResult> {
  console.log(`Message from connection: ${connectionId}`);

  try {
    if (!event.body) {
      return { statusCode: 400, body: 'Message body is required' };
    }

    const message: WebSocketMessage = JSON.parse(event.body);
    console.log('Parsed message:', message);

    // Get connection data to verify user
    const connectionResult = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: {
        ':pk': `CONNECTION#${connectionId}`,
      },
    }));

    if (!connectionResult.Items || connectionResult.Items.length === 0) {
      return { statusCode: 404, body: 'Connection not found' };
    }

    const connectionData = connectionResult.Items[0] as ConnectionData;

    // Update last activity
    await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        ...connectionData,
        lastActivity: new Date().toISOString(),
      },
    }));

    // Handle different message types
    switch (message.action) {
      case 'ping':
        await sendToConnection(apiGatewayClient, connectionId, {
          action: 'pong',
          timestamp: new Date().toISOString(),
        });
        break;

      case 'join_discussion':
        await handleJoinDiscussion(connectionId, message.discussionId!, connectionData.userId);
        await sendToConnection(apiGatewayClient, connectionId, {
          action: 'joined_discussion',
          discussionId: message.discussionId,
        });
        break;

      case 'leave_discussion':
        await handleLeaveDiscussion(connectionId, message.discussionId!);
        await sendToConnection(apiGatewayClient, connectionId, {
          action: 'left_discussion',
          discussionId: message.discussionId,
        });
        break;

      case 'broadcast_post':
        if (connectionData.userId && message.discussionId) {
          const broadcastData = {
            action: message.data?.type || 'new_post',
            data: message.data,
            userId: connectionData.userId,
            timestamp: new Date().toISOString(),
          };

          await broadcastToDiscussion(
            apiGatewayClient,
            message.discussionId,
            broadcastData,
            connectionId // Exclude sender
          );
        }
        break;

      case 'typing_start':
        if (connectionData.userId && message.discussionId) {
          const typingData = {
            action: 'typing_start',
            data: {
              userId: connectionData.userId,
              userName: await getUserDisplayName(connectionData.userId),
              discussionId: message.discussionId,
            },
            timestamp: new Date().toISOString(),
          };

          await broadcastToDiscussion(
            apiGatewayClient,
            message.discussionId,
            typingData,
            connectionId // Exclude sender
          );
        }
        break;

      case 'typing_stop':
        if (connectionData.userId && message.discussionId) {
          const typingData = {
            action: 'typing_stop',
            data: {
              userId: connectionData.userId,
              discussionId: message.discussionId,
            },
            timestamp: new Date().toISOString(),
          };

          await broadcastToDiscussion(
            apiGatewayClient,
            message.discussionId,
            typingData,
            connectionId // Exclude sender
          );
        }
        break;

      case 'sync_request':
        if (connectionData.userId && message.discussionId) {
          const syncResponse = await handleSyncRequest(
            message.discussionId,
            connectionData.userId,
            message.data?.lastSyncTimestamp
          );

          await sendToConnection(apiGatewayClient, connectionId, {
            action: 'sync_response',
            data: syncResponse,
            timestamp: new Date().toISOString(),
          });
        }
        break;

      default:
        console.log(`Unknown message action: ${message.action}`);
        await sendToConnection(apiGatewayClient, connectionId, {
          action: 'error',
          message: 'Unknown action',
        });
    }

    return { statusCode: 200, body: 'Message processed' };

  } catch (error) {
    console.error('Error handling message:', error);
    
    try {
      await sendToConnection(apiGatewayClient, connectionId, {
        action: 'error',
        message: 'Failed to process message',
      });
    } catch (sendError) {
      console.error('Failed to send error message:', sendError);
    }

    return { statusCode: 500, body: 'Failed to process message' };
  }
}

async function handleJoinDiscussion(connectionId: string, discussionId: string, userId?: string): Promise<void> {
  const ttl = Math.floor(Date.now() / 1000) + (24 * 60 * 60);
  
  // Store discussion subscription
  await docClient.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: {
      PK: `DISCUSSION#${discussionId}`,
      SK: `CONNECTION#${connectionId}`,
      EntityType: 'DiscussionConnection',
      discussionId,
      connectionId,
      userId,
      joinedAt: new Date().toISOString(),
      ttl,
    },
  }));

  // Also store connection-to-discussion mapping
  await docClient.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: {
      PK: `CONNECTION#${connectionId}`,
      SK: `DISCUSSION#${discussionId}`,
      EntityType: 'ConnectionDiscussion',
      connectionId,
      discussionId,
      joinedAt: new Date().toISOString(),
      ttl,
    },
  }));
}

async function handleLeaveDiscussion(connectionId: string, discussionId: string): Promise<void> {
  // Remove discussion subscription
  await docClient.send(new DeleteCommand({
    TableName: TABLE_NAME,
    Key: {
      PK: `DISCUSSION#${discussionId}`,
      SK: `CONNECTION#${connectionId}`,
    },
  }));

  // Remove connection-to-discussion mapping
  await docClient.send(new DeleteCommand({
    TableName: TABLE_NAME,
    Key: {
      PK: `CONNECTION#${connectionId}`,
      SK: `DISCUSSION#${discussionId}`,
    },
  }));
}

async function broadcastToDiscussion(
  apiGatewayClient: ApiGatewayManagementApiClient,
  discussionId: string,
  message: any,
  excludeConnectionId?: string
): Promise<void> {
  try {
    // Get all connections subscribed to this discussion
    const result = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `DISCUSSION#${discussionId}`,
        ':sk': 'CONNECTION#',
      },
    }));

    if (!result.Items || result.Items.length === 0) {
      console.log(`No connections found for discussion: ${discussionId}`);
      return;
    }

    const connections = result.Items.filter(item => 
      item.connectionId !== excludeConnectionId
    );

    console.log(`Broadcasting to ${connections.length} connections for discussion: ${discussionId}`);

    // Send message to all connections
    const sendPromises = connections.map(async (connection) => {
      try {
        await sendToConnection(apiGatewayClient, connection.connectionId, message);
      } catch (error) {
        console.error(`Failed to send to connection ${connection.connectionId}:`, error);
        
        // If connection is stale, clean it up
        if (error.name === 'GoneException') {
          await cleanupStaleConnection(connection.connectionId, discussionId);
        }
      }
    });

    await Promise.allSettled(sendPromises);

  } catch (error) {
    console.error('Error broadcasting to discussion:', error);
  }
}

async function sendToConnection(
  apiGatewayClient: ApiGatewayManagementApiClient,
  connectionId: string,
  message: any
): Promise<void> {
  try {
    await apiGatewayClient.send(new PostToConnectionCommand({
      ConnectionId: connectionId,
      Data: JSON.stringify(message),
    }));
  } catch (error) {
    console.error(`Failed to send message to connection ${connectionId}:`, error);
    throw error;
  }
}

async function cleanupStaleConnection(connectionId: string, discussionId?: string): Promise<void> {
  try {
    console.log(`Cleaning up stale connection: ${connectionId}`);

    // Delete main connection record
    await docClient.send(new DeleteCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `CONNECTION#${connectionId}`,
        SK: 'METADATA',
      },
    }));

    // Delete discussion subscription if provided
    if (discussionId) {
      await docClient.send(new DeleteCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `DISCUSSION#${discussionId}`,
          SK: `CONNECTION#${connectionId}`,
        },
      }));

      await docClient.send(new DeleteCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `CONNECTION#${connectionId}`,
          SK: `DISCUSSION#${discussionId}`,
        },
      }));
    }

    // Find and delete any user-connection mappings
    const userConnections = await docClient.send(new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'EntityType = :type AND connectionId = :connId',
      ExpressionAttributeValues: {
        ':type': 'UserConnection',
        ':connId': connectionId,
      },
    }));

    if (userConnections.Items) {
      const deletePromises = userConnections.Items.map(item =>
        docClient.send(new DeleteCommand({
          TableName: TABLE_NAME,
          Key: {
            PK: item.PK,
            SK: item.SK,
          },
        }))
      );
      await Promise.all(deletePromises);
    }

  } catch (error) {
    console.error('Error cleaning up stale connection:', error);
  }
}

// Utility function to get all connections for a user
export async function getUserConnections(userId: string): Promise<string[]> {
  try {
    const result = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':sk': 'CONNECTION#',
      },
    }));

    return result.Items?.map(item => item.connectionId) || [];
  } catch (error) {
    console.error('Error getting user connections:', error);
    return [];
  }
}

// Utility function to get user display name
async function getUserDisplayName(userId: string): Promise<string> {
  try {
    const result = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND SK = :sk',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':sk': 'PROFILE',
      },
    }));

    if (result.Items && result.Items.length > 0) {
      return result.Items[0].displayName || 'Unknown User';
    }
    
    return 'Unknown User';
  } catch (error) {
    console.error('Error getting user display name:', error);
    return 'Unknown User';
  }
}

// Handle sync request to get missed messages
async function handleSyncRequest(
  discussionId: string,
  userId: string,
  lastSyncTimestamp?: string
): Promise<{ missedMessages: any[] }> {
  try {
    console.log(`Sync request for discussion ${discussionId}, user ${userId}, since ${lastSyncTimestamp}`);

    if (!lastSyncTimestamp) {
      // If no timestamp provided, return empty array
      return { missedMessages: [] };
    }

    // Get posts created after the last sync timestamp
    const result = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :gsi1pk',
      FilterExpression: 'createdAt > :timestamp',
      ExpressionAttributeValues: {
        ':gsi1pk': `DISCUSSION#${discussionId}`,
        ':timestamp': lastSyncTimestamp,
      },
      ScanIndexForward: true, // Sort by createdAt ascending
    }));

    const missedMessages: any[] = [];

    if (result.Items) {
      for (const item of result.Items) {
        if (item.EntityType === 'Post') {
          // Get post author information
          const authorName = await getUserDisplayName(item.authorId);
          
          missedMessages.push({
            action: 'new_post',
            data: {
              post: {
                id: item.postId,
                discussionId: item.discussionId,
                discussionPointId: item.discussionPointId,
                authorId: item.authorId,
                authorName,
                content: item.content,
                stance: item.stance,
                createdAt: item.createdAt,
                updatedAt: item.updatedAt,
                reactions: item.reactions || {},
                replyToId: item.replyToId,
              },
            },
            userId: item.authorId,
            timestamp: item.createdAt,
          });
        }
      }
    }

    // Also check for post updates/deletions
    const updatedPosts = await getUpdatedPosts(discussionId, lastSyncTimestamp);
    missedMessages.push(...updatedPosts);

    // Sort messages by timestamp
    missedMessages.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    console.log(`Found ${missedMessages.length} missed messages for sync`);
    return { missedMessages };

  } catch (error) {
    console.error('Error handling sync request:', error);
    return { missedMessages: [] };
  }
}

// Get posts that were updated or deleted since last sync
async function getUpdatedPosts(discussionId: string, lastSyncTimestamp: string): Promise<any[]> {
  try {
    const result = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      FilterExpression: 'updatedAt > :timestamp AND updatedAt <> createdAt',
      ExpressionAttributeValues: {
        ':pk': `DISCUSSION#${discussionId}`,
        ':sk': 'POST#',
        ':timestamp': lastSyncTimestamp,
      },
    }));

    const updatedMessages: any[] = [];

    if (result.Items) {
      for (const item of result.Items) {
        const authorName = await getUserDisplayName(item.authorId);
        
        if (item.moderation?.isDeleted) {
          updatedMessages.push({
            action: 'post_deleted',
            data: {
              postId: item.postId,
              discussionId: item.discussionId,
              deletedBy: item.moderation.deletedBy,
              deletedAt: item.moderation.deletedAt,
            },
            timestamp: item.updatedAt,
          });
        } else if (item.moderation?.isHidden) {
          updatedMessages.push({
            action: 'post_hidden',
            data: {
              postId: item.postId,
              discussionId: item.discussionId,
              hiddenBy: item.moderation.hiddenBy,
              hiddenAt: item.moderation.hiddenAt,
            },
            timestamp: item.updatedAt,
          });
        } else {
          updatedMessages.push({
            action: 'post_updated',
            data: {
              post: {
                id: item.postId,
                discussionId: item.discussionId,
                discussionPointId: item.discussionPointId,
                authorId: item.authorId,
                authorName,
                content: item.content,
                stance: item.stance,
                createdAt: item.createdAt,
                updatedAt: item.updatedAt,
                reactions: item.reactions || {},
                replyToId: item.replyToId,
              },
            },
            timestamp: item.updatedAt,
          });
        }
      }
    }

    return updatedMessages;

  } catch (error) {
    console.error('Error getting updated posts:', error);
    return [];
  }
}

// Utility function to broadcast to all user connections
export async function broadcastToUser(
  apiGatewayClient: ApiGatewayManagementApiClient,
  userId: string,
  message: any
): Promise<void> {
  const connections = await getUserConnections(userId);
  
  const sendPromises = connections.map(async (connectionId) => {
    try {
      await sendToConnection(apiGatewayClient, connectionId, message);
    } catch (error) {
      console.error(`Failed to send to user connection ${connectionId}:`, error);
      
      if (error.name === 'GoneException') {
        await cleanupStaleConnection(connectionId);
      }
    }
  });

  await Promise.allSettled(sendPromises);
}