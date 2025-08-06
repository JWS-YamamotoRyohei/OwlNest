import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, DeleteCommand, QueryCommand, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const TABLE_NAME = process.env.TABLE_NAME!;

interface Follow {
  PK: string;
  SK: string;
  GSI1PK: string;
  GSI1SK: string;
  EntityType: 'Follow';
  followerId: string;
  targetType: 'USER' | 'DISCUSSION';
  targetId: string;
  isActive: boolean;
  notificationsEnabled: boolean;
  followReason?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

interface TimelineItem {
  PK: string;
  SK: string;
  GSI1PK: string;
  GSI1SK: string;
  EntityType: 'TimelineItem';
  userId: string;
  itemType: 'POST' | 'DISCUSSION_CREATED' | 'DISCUSSION_UPDATED' | 'USER_JOINED';
  itemId: string;
  title: string;
  preview: string;
  authorId: string;
  authorDisplayName: string;
  authorAvatar?: string;
  discussionId?: string;
  discussionTitle?: string;
  pointId?: string;
  pointTitle?: string;
  isRead: boolean;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  ttl: number;
  createdAt: string;
  updatedAt: string;
}

// Helper function to create API response
const createResponse = (statusCode: number, body: any): APIGatewayProxyResult => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  },
  body: JSON.stringify(body),
});

// Helper function to get user ID from event
const getUserId = (event: APIGatewayProxyEvent): string | null => {
  const authHeader = event.headers.Authorization || event.headers.authorization;
  if (!authHeader) return null;
  
  // In a real implementation, you would decode and verify the JWT token
  // For now, we'll extract a mock user ID
  try {
    const token = authHeader.replace('Bearer ', '');
    // Mock JWT decode - in production, use proper JWT verification
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    return payload.sub || payload.userId;
  } catch {
    return null;
  }
};

// Helper function to generate TTL (30 days from now)
const generateTTL = (): number => {
  return Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60);
};

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('Follow Lambda received event:', JSON.stringify(event, null, 2));

  const userId = getUserId(event);
  if (!userId) {
    return createResponse(401, {
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
    });
  }

  const method = event.httpMethod;
  const path = event.path;
  const pathParts = path.split('/').filter(Boolean);

  try {
    switch (method) {
      case 'POST':
        if (pathParts[pathParts.length - 1] === 'follow') {
          return await handleFollow(event, userId);
        } else if (pathParts[pathParts.length - 1] === 'bulk') {
          return await handleBulkFollow(event, userId);
        } else if (pathParts.includes('timeline') && pathParts[pathParts.length - 1] === 'mark-read') {
          return await handleMarkTimelineRead(event, userId);
        } else if (pathParts.includes('timeline') && pathParts[pathParts.length - 1] === 'clear') {
          return await handleClearTimeline(event, userId);
        }
        return await handleFollow(event, userId);

      case 'DELETE':
        return await handleUnfollow(event, userId);

      case 'PUT':
        return await handleUpdateFollow(event, userId);

      case 'GET':
        if (pathParts.includes('timeline')) {
          if (pathParts[pathParts.length - 1] === 'unread-count') {
            return await handleGetUnreadTimelineCount(event, userId);
          }
          return await handleGetTimeline(event, userId);
        } else if (pathParts[pathParts.length - 1] === 'status') {
          return await handleGetFollowStatus(event, userId);
        } else if (pathParts[pathParts.length - 1] === 'statistics') {
          return await handleGetStatistics(event, userId);
        } else if (pathParts[pathParts.length - 1] === 'suggestions') {
          return await handleGetSuggestions(event, userId);
        } else if (pathParts.includes('followers')) {
          return await handleGetFollowers(event, userId);
        } else if (pathParts[pathParts.length - 1] === 'users') {
          return await handleGetFollowingUsers(event, userId);
        } else if (pathParts[pathParts.length - 1] === 'discussions') {
          return await handleGetFollowingDiscussions(event, userId);
        }
        break;

      default:
        return createResponse(405, {
          success: false,
          error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' },
        });
    }

    return createResponse(404, {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Endpoint not found' },
    });
  } catch (error) {
    console.error('Error in follow handler:', error);
    return createResponse(500, {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
  }
};

// Handle follow operation
const handleFollow = async (event: APIGatewayProxyEvent, userId: string): Promise<APIGatewayProxyResult> => {
  const body = JSON.parse(event.body || '{}');
  const { targetType, targetId, notificationsEnabled = true, followReason, tags } = body;

  if (!targetType || !targetId) {
    return createResponse(400, {
      success: false,
      error: { code: 'INVALID_INPUT', message: 'targetType and targetId are required' },
    });
  }

  const now = new Date().toISOString();
  const followItem: Follow = {
    PK: `USER#${userId}`,
    SK: `FOLLOW#${targetType}#${targetId}`,
    GSI1PK: `${targetType}#${targetId}`,
    GSI1SK: `FOLLOWER#${userId}`,
    EntityType: 'Follow',
    followerId: userId,
    targetType,
    targetId,
    isActive: true,
    notificationsEnabled,
    followReason,
    tags,
    createdAt: now,
    updatedAt: now,
  };

  await docClient.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: followItem,
    ConditionExpression: 'attribute_not_exists(PK)',
  }));

  return createResponse(200, {
    success: true,
    data: followItem,
  });
};

// Handle unfollow operation
const handleUnfollow = async (event: APIGatewayProxyEvent, userId: string): Promise<APIGatewayProxyResult> => {
  const pathParts = event.path.split('/').filter(Boolean);
  const targetType = pathParts[pathParts.length - 2];
  const targetId = pathParts[pathParts.length - 1];

  if (!targetType || !targetId) {
    return createResponse(400, {
      success: false,
      error: { code: 'INVALID_INPUT', message: 'Invalid path parameters' },
    });
  }

  await docClient.send(new DeleteCommand({
    TableName: TABLE_NAME,
    Key: {
      PK: `USER#${userId}`,
      SK: `FOLLOW#${targetType.toUpperCase()}#${targetId}`,
    },
  }));

  return createResponse(200, {
    success: true,
    data: null,
  });
};

// Handle update follow settings
const handleUpdateFollow = async (event: APIGatewayProxyEvent, userId: string): Promise<APIGatewayProxyResult> => {
  const pathParts = event.path.split('/').filter(Boolean);
  const targetType = pathParts[pathParts.length - 2];
  const targetId = pathParts[pathParts.length - 1];
  const body = JSON.parse(event.body || '{}');

  const updateExpression = [];
  const expressionAttributeValues: any = {};
  const expressionAttributeNames: any = {};

  if (body.notificationsEnabled !== undefined) {
    updateExpression.push('#notificationsEnabled = :notificationsEnabled');
    expressionAttributeNames['#notificationsEnabled'] = 'notificationsEnabled';
    expressionAttributeValues[':notificationsEnabled'] = body.notificationsEnabled;
  }

  if (body.followReason !== undefined) {
    updateExpression.push('#followReason = :followReason');
    expressionAttributeNames['#followReason'] = 'followReason';
    expressionAttributeValues[':followReason'] = body.followReason;
  }

  if (body.tags !== undefined) {
    updateExpression.push('#tags = :tags');
    expressionAttributeNames['#tags'] = 'tags';
    expressionAttributeValues[':tags'] = body.tags;
  }

  updateExpression.push('#updatedAt = :updatedAt');
  expressionAttributeNames['#updatedAt'] = 'updatedAt';
  expressionAttributeValues[':updatedAt'] = new Date().toISOString();

  const result = await docClient.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: {
      PK: `USER#${userId}`,
      SK: `FOLLOW#${targetType.toUpperCase()}#${targetId}`,
    },
    UpdateExpression: `SET ${updateExpression.join(', ')}`,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
    ReturnValues: 'ALL_NEW',
  }));

  return createResponse(200, {
    success: true,
    data: result.Attributes,
  });
};

// Handle get follow status
const handleGetFollowStatus = async (event: APIGatewayProxyEvent, userId: string): Promise<APIGatewayProxyResult> => {
  const pathParts = event.path.split('/').filter(Boolean);
  const targetType = pathParts[pathParts.length - 3];
  const targetId = pathParts[pathParts.length - 2];

  const result = await docClient.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: {
      PK: `USER#${userId}`,
      SK: `FOLLOW#${targetType.toUpperCase()}#${targetId}`,
    },
  }));

  return createResponse(200, {
    success: true,
    data: !!result.Item?.isActive,
  });
};

// Handle get following users
const handleGetFollowingUsers = async (event: APIGatewayProxyEvent, userId: string): Promise<APIGatewayProxyResult> => {
  const limit = parseInt(event.queryStringParameters?.limit || '20');
  const nextToken = event.queryStringParameters?.nextToken;

  const queryParams: any = {
    TableName: TABLE_NAME,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: {
      ':pk': `USER#${userId}`,
      ':sk': 'FOLLOW#USER#',
    },
    Limit: limit,
  };

  if (nextToken) {
    queryParams.ExclusiveStartKey = JSON.parse(Buffer.from(nextToken, 'base64').toString());
  }

  const result = await docClient.send(new QueryCommand(queryParams));

  // In a real implementation, you would fetch user details for each followed user
  const items = result.Items?.map(item => ({
    followId: `${item.targetType}#${item.targetId}`,
    targetType: item.targetType,
    targetId: item.targetId,
    targetName: `User ${item.targetId}`, // Mock data
    isActive: item.isActive,
    notificationsEnabled: item.notificationsEnabled,
    createdAt: item.createdAt,
    targetInfo: {
      displayName: `User ${item.targetId}`,
      role: 'contributor',
      isVerified: false,
      followersCount: 0,
      discussionsCount: 0,
      postsCount: 0,
    },
  })) || [];

  const response: any = {
    items,
    hasMore: !!result.LastEvaluatedKey,
  };

  if (result.LastEvaluatedKey) {
    response.nextToken = Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64');
  }

  return createResponse(200, {
    success: true,
    data: response,
  });
};

// Handle get following discussions
const handleGetFollowingDiscussions = async (event: APIGatewayProxyEvent, userId: string): Promise<APIGatewayProxyResult> => {
  const limit = parseInt(event.queryStringParameters?.limit || '20');
  const nextToken = event.queryStringParameters?.nextToken;

  const queryParams: any = {
    TableName: TABLE_NAME,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: {
      ':pk': `USER#${userId}`,
      ':sk': 'FOLLOW#DISCUSSION#',
    },
    Limit: limit,
  };

  if (nextToken) {
    queryParams.ExclusiveStartKey = JSON.parse(Buffer.from(nextToken, 'base64').toString());
  }

  const result = await docClient.send(new QueryCommand(queryParams));

  // In a real implementation, you would fetch discussion details for each followed discussion
  const items = result.Items?.map(item => ({
    followId: `${item.targetType}#${item.targetId}`,
    targetType: item.targetType,
    targetId: item.targetId,
    targetName: `Discussion ${item.targetId}`, // Mock data
    isActive: item.isActive,
    notificationsEnabled: item.notificationsEnabled,
    createdAt: item.createdAt,
    targetInfo: {
      title: `Discussion ${item.targetId}`,
      description: 'Mock discussion description',
      ownerDisplayName: 'Mock Owner',
      categories: ['technology'],
      participantCount: 5,
      postCount: 10,
      lastActivityAt: new Date().toISOString(),
      isActive: true,
    },
  })) || [];

  const response: any = {
    items,
    hasMore: !!result.LastEvaluatedKey,
  };

  if (result.LastEvaluatedKey) {
    response.nextToken = Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64');
  }

  return createResponse(200, {
    success: true,
    data: response,
  });
};

// Handle get timeline
const handleGetTimeline = async (event: APIGatewayProxyEvent, userId: string): Promise<APIGatewayProxyResult> => {
  const limit = parseInt(event.queryStringParameters?.limit || '20');
  const nextToken = event.queryStringParameters?.nextToken;

  const queryParams: any = {
    TableName: TABLE_NAME,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: {
      ':pk': `USER#${userId}`,
      ':sk': 'TIMELINE#',
    },
    ScanIndexForward: false, // Sort by SK in descending order (newest first)
    Limit: limit,
  };

  if (nextToken) {
    queryParams.ExclusiveStartKey = JSON.parse(Buffer.from(nextToken, 'base64').toString());
  }

  const result = await docClient.send(new QueryCommand(queryParams));

  const items = result.Items || [];
  const response: any = {
    items,
    hasMore: !!result.LastEvaluatedKey,
  };

  if (result.LastEvaluatedKey) {
    response.nextToken = Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64');
  }

  return createResponse(200, {
    success: true,
    data: response,
  });
};

// Handle mark timeline items as read
const handleMarkTimelineRead = async (event: APIGatewayProxyEvent, userId: string): Promise<APIGatewayProxyResult> => {
  const body = JSON.parse(event.body || '{}');
  const { itemIds } = body;

  if (!Array.isArray(itemIds)) {
    return createResponse(400, {
      success: false,
      error: { code: 'INVALID_INPUT', message: 'itemIds must be an array' },
    });
  }

  // Update each timeline item to mark as read
  const updatePromises = itemIds.map(itemId => {
    // Find the timeline item by itemId and update it
    return docClient.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `USER#${userId}`,
        SK: `TIMELINE#${new Date().toISOString()}#${itemId}`, // This is simplified
      },
      UpdateExpression: 'SET #isRead = :isRead, #updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#isRead': 'isRead',
        '#updatedAt': 'updatedAt',
      },
      ExpressionAttributeValues: {
        ':isRead': true,
        ':updatedAt': new Date().toISOString(),
      },
    }));
  });

  await Promise.all(updatePromises);

  return createResponse(200, {
    success: true,
    data: null,
  });
};

// Handle clear timeline
const handleClearTimeline = async (event: APIGatewayProxyEvent, userId: string): Promise<APIGatewayProxyResult> => {
  // In a real implementation, you would query all timeline items and mark them as read
  // For now, we'll return success
  return createResponse(200, {
    success: true,
    data: null,
  });
};

// Handle get unread timeline count
const handleGetUnreadTimelineCount = async (event: APIGatewayProxyEvent, userId: string): Promise<APIGatewayProxyResult> => {
  const result = await docClient.send(new QueryCommand({
    TableName: TABLE_NAME,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    FilterExpression: '#isRead = :isRead',
    ExpressionAttributeNames: {
      '#isRead': 'isRead',
    },
    ExpressionAttributeValues: {
      ':pk': `USER#${userId}`,
      ':sk': 'TIMELINE#',
      ':isRead': false,
    },
    Select: 'COUNT',
  }));

  return createResponse(200, {
    success: true,
    data: result.Count || 0,
  });
};

// Handle get statistics
const handleGetStatistics = async (event: APIGatewayProxyEvent, userId: string): Promise<APIGatewayProxyResult> => {
  // Mock statistics - in a real implementation, you would calculate these from the database
  const statistics = {
    userId,
    followingUsers: 10,
    followingDiscussions: 5,
    followers: 8,
    mutualFollows: 3,
    timelineItemsToday: 15,
    timelineItemsWeek: 45,
    lastTimelineUpdate: new Date().toISOString(),
  };

  return createResponse(200, {
    success: true,
    data: statistics,
  });
};

// Handle get suggestions
const handleGetSuggestions = async (event: APIGatewayProxyEvent, userId: string): Promise<APIGatewayProxyResult> => {
  // Mock suggestions - in a real implementation, you would generate these based on user behavior
  const suggestions = [
    {
      targetType: 'USER',
      targetId: 'user1',
      targetName: 'Suggested User 1',
      reason: 'mutual_follows',
      score: 0.8,
      targetInfo: {
        displayName: 'Suggested User 1',
        role: 'contributor',
        isVerified: false,
        followersCount: 25,
        discussionsCount: 3,
        postsCount: 15,
      },
    },
    {
      targetType: 'DISCUSSION',
      targetId: 'discussion1',
      targetName: 'Trending Discussion',
      reason: 'trending_discussion',
      score: 0.9,
      targetInfo: {
        title: 'Trending Discussion',
        description: 'A popular discussion about technology',
        ownerDisplayName: 'Tech Expert',
        categories: ['technology'],
        participantCount: 50,
        postCount: 120,
        lastActivityAt: new Date().toISOString(),
        isActive: true,
      },
    },
  ];

  return createResponse(200, {
    success: true,
    data: suggestions,
  });
};

// Handle bulk follow
const handleBulkFollow = async (event: APIGatewayProxyEvent, userId: string): Promise<APIGatewayProxyResult> => {
  const body = JSON.parse(event.body || '{}');
  const { targetType, targetIds, notificationsEnabled = true, followReason } = body;

  if (!targetType || !Array.isArray(targetIds)) {
    return createResponse(400, {
      success: false,
      error: { code: 'INVALID_INPUT', message: 'targetType and targetIds array are required' },
    });
  }

  const successful: string[] = [];
  const failed: string[] = [];

  for (const targetId of targetIds) {
    try {
      const now = new Date().toISOString();
      const followItem: Follow = {
        PK: `USER#${userId}`,
        SK: `FOLLOW#${targetType}#${targetId}`,
        GSI1PK: `${targetType}#${targetId}`,
        GSI1SK: `FOLLOWER#${userId}`,
        EntityType: 'Follow',
        followerId: userId,
        targetType,
        targetId,
        isActive: true,
        notificationsEnabled,
        followReason,
        createdAt: now,
        updatedAt: now,
      };

      await docClient.send(new PutCommand({
        TableName: TABLE_NAME,
        Item: followItem,
        ConditionExpression: 'attribute_not_exists(PK)',
      }));

      successful.push(targetId);
    } catch (error) {
      failed.push(targetId);
    }
  }

  return createResponse(200, {
    success: true,
    data: { successful, failed },
  });
};

// Handle get followers
const handleGetFollowers = async (event: APIGatewayProxyEvent, userId: string): Promise<APIGatewayProxyResult> => {
  const pathParts = event.path.split('/').filter(Boolean);
  const targetType = pathParts[pathParts.length - 3];
  const targetId = pathParts[pathParts.length - 2];
  const limit = parseInt(event.queryStringParameters?.limit || '20');

  // Query GSI1 to get followers
  const result = await docClient.send(new QueryCommand({
    TableName: TABLE_NAME,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :gsi1pk',
    ExpressionAttributeValues: {
      ':gsi1pk': `${targetType.toUpperCase()}#${targetId}`,
    },
    Limit: limit,
  }));

  const items = result.Items?.map(item => ({
    followId: `${item.targetType}#${item.targetId}`,
    targetType: 'USER',
    targetId: item.followerId,
    targetName: `User ${item.followerId}`,
    isActive: item.isActive,
    notificationsEnabled: item.notificationsEnabled,
    createdAt: item.createdAt,
    targetInfo: {
      displayName: `User ${item.followerId}`,
      role: 'contributor',
      isVerified: false,
      followersCount: 0,
      discussionsCount: 0,
      postsCount: 0,
    },
  })) || [];

  return createResponse(200, {
    success: true,
    data: { items, hasMore: false },
  });
};