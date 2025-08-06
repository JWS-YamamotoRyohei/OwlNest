// Optimized Discussion management Lambda function
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { 
  GetCommand, 
  PutCommand, 
  UpdateCommand, 
  DeleteCommand, 
  QueryCommand, 
  ScanCommand,
  BatchWriteCommand,
  TransactWriteCommand
} from '@aws-sdk/lib-dynamodb';
import { 
  GetUserCommand 
} from '@aws-sdk/client-cognito-identity-provider';
import { v4 as uuidv4 } from 'uuid';

// Import optimizations
import {
  getOptimizedDynamoClient,
  getOptimizedCognitoClient,
  userCache,
  discussionCache,
  queryCache,
  OptimizedError,
  LambdaPerformanceMonitor,
  BatchOptimizer,
  QueryOptimizer,
  warmupHandler,
  createOptimizedResponse,
  InputValidator,
  logMemoryUsage
} from '../shared/optimizations';

// Initialize optimized clients
const dynamoClient = getOptimizedDynamoClient();
const cognitoClient = getOptimizedCognitoClient();

const TABLE_NAME = process.env.TABLE_NAME!;

// Types
enum UserRole {
  VIEWER = 'viewer',
  CONTRIBUTOR = 'contributor',
  CREATOR = 'creator',
  ADMIN = 'admin'
}

enum Stance {
  PROS = 'pros',
  CONS = 'cons',
  NEUTRAL = 'neutral',
  UNKNOWN = 'unknown',
  HIDDEN = 'hidden'
}

interface AccessControl {
  type: 'open' | 'blacklist' | 'whitelist';
  userIds: string[];
}

interface DiscussionPoint {
  id: string;
  title: string;
  description?: string;
  parentId?: string;
  level: number;
  order: number;
}

interface BackgroundKnowledge {
  id: string;
  type: 'text' | 'file' | 'url';
  content: string;
  title?: string;
  order: number;
}

interface CreateDiscussionRequest {
  title: string;
  description: string;
  ownerStance: Stance;
  categories: string[];
  discussionPoints: DiscussionPoint[];
  backgroundKnowledge?: BackgroundKnowledge[];
  accessControl?: AccessControl;
}

interface UpdateDiscussionRequest {
  title?: string;
  description?: string;
  ownerStance?: Stance;
  categories?: string[];
  discussionPoints?: DiscussionPoint[];
  backgroundKnowledge?: BackgroundKnowledge[];
  accessControl?: AccessControl;
}

interface DiscussionFilters {
  category?: string;
  owner?: string;
  status?: 'active' | 'inactive';
  search?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'participantCount' | 'postCount';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  lastEvaluatedKey?: any;
}

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  // Initialize performance monitoring
  const monitor = new LambdaPerformanceMonitor();
  logMemoryUsage('start');

  // Handle warmup requests
  if (event.source === 'serverless-plugin-warmup') {
    warmupHandler();
    return createOptimizedResponse(200, { message: 'Lambda warmed up' });
  }

  console.log('Discussion Lambda - Event:', JSON.stringify(event, null, 2));

  try {
    const { httpMethod, path, body, pathParameters, queryStringParameters, headers: requestHeaders } = event;

    // Handle CORS preflight
    if (httpMethod === 'OPTIONS') {
      return createOptimizedResponse(200, '');
    }

    monitor.mark('cors-handled');

    // Extract access token from Authorization header
    const authHeader = requestHeaders?.Authorization || requestHeaders?.authorization;
    const accessToken = authHeader?.replace('Bearer ', '');

    // Get current user info for authorization with caching
    let currentUser = null;
    if (accessToken) {
      try {
        currentUser = await getCurrentUserCached(accessToken);
        monitor.mark('user-auth');
      } catch (error) {
        console.error('Error getting current user:', error);
        return createOptimizedResponse(401, { error: 'Invalid or expired token' });
      }
    }

    switch (httpMethod) {
      case 'GET':
        if (pathParameters?.proxy) {
          const pathParts = pathParameters.proxy.split('/');
          const discussionId = pathParts[0];
          
          if (pathParts.length === 1) {
            return handleGetDiscussion(discussionId, currentUser, headers);
          } else if (pathParts[1] === 'points') {
            return handleGetDiscussionPoints(discussionId, currentUser, headers);
          } else if (pathParts[1] === 'background-knowledge') {
            return handleGetBackgroundKnowledge(discussionId, currentUser, headers);
          }
        } else {
          return handleGetDiscussions(queryStringParameters, currentUser, headers);
        }
        break;

      case 'POST':
        if (!currentUser) {
          return {
            statusCode: 401,
            headers,
            body: JSON.stringify({ error: 'Authentication required' }),
          };
        }
        
        if (currentUser.role === UserRole.VIEWER || currentUser.role === UserRole.CONTRIBUTOR) {
          return {
            statusCode: 403,
            headers,
            body: JSON.stringify({ error: 'Insufficient permissions. Discussion creation requires creator role or higher.' }),
          };
        }

        return handleCreateDiscussion(body, currentUser, headers);

      case 'PUT':
        if (!currentUser) {
          return {
            statusCode: 401,
            headers,
            body: JSON.stringify({ error: 'Authentication required' }),
          };
        }

        if (pathParameters?.proxy) {
          const discussionId = pathParameters.proxy.split('/')[0];
          return handleUpdateDiscussion(discussionId, body, currentUser, headers);
        }
        break;

      case 'DELETE':
        if (!currentUser) {
          return {
            statusCode: 401,
            headers,
            body: JSON.stringify({ error: 'Authentication required' }),
          };
        }

        if (pathParameters?.proxy) {
          const discussionId = pathParameters.proxy.split('/')[0];
          return handleDeleteDiscussion(discussionId, currentUser, headers);
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
    console.error('Discussion Lambda Error:', error);
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

const handleGetDiscussions = async (
  queryParams: { [key: string]: string } | null,
  currentUser: any,
  headers: Record<string, string>
): Promise<APIGatewayProxyResult> => {
  try {
    const filters: DiscussionFilters = {
      category: queryParams?.category,
      owner: queryParams?.owner,
      status: queryParams?.status as 'active' | 'inactive',
      search: queryParams?.search,
      sortBy: queryParams?.sortBy as any || 'updatedAt',
      sortOrder: queryParams?.sortOrder as 'asc' | 'desc' || 'desc',
      limit: queryParams?.limit ? parseInt(queryParams.limit) : 20,
      lastEvaluatedKey: queryParams?.lastEvaluatedKey ? JSON.parse(queryParams.lastEvaluatedKey) : undefined,
    };

    let queryCommand;
    
    if (filters.category) {
      // Query by category using GSI1
      queryCommand = new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :categoryPK',
        ExpressionAttributeValues: {
          ':categoryPK': `CATEGORY#${filters.category}`,
        },
        Limit: filters.limit,
        ExclusiveStartKey: filters.lastEvaluatedKey,
        ScanIndexForward: filters.sortOrder === 'asc',
      });
    } else if (filters.owner) {
      // Query by owner using GSI2
      queryCommand = new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'GSI2',
        KeyConditionExpression: 'GSI2PK = :ownerPK',
        ExpressionAttributeValues: {
          ':ownerPK': `OWNER#${filters.owner}`,
        },
        Limit: filters.limit,
        ExclusiveStartKey: filters.lastEvaluatedKey,
        ScanIndexForward: filters.sortOrder === 'asc',
      });
    } else {
      // Scan all discussions (less efficient, consider implementing a GSI for this)
      queryCommand = new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: 'EntityType = :entityType',
        ExpressionAttributeValues: {
          ':entityType': 'Discussion',
        },
        Limit: filters.limit,
        ExclusiveStartKey: filters.lastEvaluatedKey,
      });
    }

    const result = await dynamoClient.send(queryCommand);
    let discussions = result.Items || [];

    // Apply additional filters
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      discussions = discussions.filter(discussion => 
        discussion.title?.toLowerCase().includes(searchTerm) ||
        discussion.description?.toLowerCase().includes(searchTerm)
      );
    }

    if (filters.status) {
      discussions = discussions.filter(discussion => 
        filters.status === 'active' ? discussion.metadata?.isActive : !discussion.metadata?.isActive
      );
    }

    // Sort discussions
    discussions.sort((a, b) => {
      const aValue = a.metadata?.[filters.sortBy!] || a[filters.sortBy!];
      const bValue = b.metadata?.[filters.sortBy!] || b[filters.sortBy!];
      
      if (filters.sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    // Check access control for each discussion
    const accessibleDiscussions = [];
    for (const discussion of discussions) {
      if (await hasDiscussionAccess(discussion, currentUser)) {
        accessibleDiscussions.push(formatDiscussionResponse(discussion));
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        discussions: accessibleDiscussions,
        lastEvaluatedKey: result.LastEvaluatedKey,
        count: accessibleDiscussions.length,
      }),
    };
  } catch (error: any) {
    console.error('Get discussions error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to get discussions',
        message: error.message
      }),
    };
  }
};

const handleGetDiscussion = async (
  discussionId: string,
  currentUser: any,
  headers: Record<string, string>
): Promise<APIGatewayProxyResult> => {
  try {
    const getCommand = new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `DISCUSSION#${discussionId}`,
        SK: 'METADATA',
      },
    });

    const result = await dynamoClient.send(getCommand);
    
    if (!result.Item) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Discussion not found' }),
      };
    }

    const discussion = result.Item;

    // Check access control
    if (!(await hasDiscussionAccess(discussion, currentUser))) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Access denied to this discussion' }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        discussion: formatDiscussionResponse(discussion),
      }),
    };
  } catch (error: any) {
    console.error('Get discussion error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to get discussion',
        message: error.message
      }),
    };
  }
};

const handleGetDiscussionPoints = async (
  discussionId: string,
  currentUser: any,
  headers: Record<string, string>
): Promise<APIGatewayProxyResult> => {
  try {
    // First check if user has access to the discussion
    const discussionAccess = await checkDiscussionAccess(discussionId, currentUser);
    if (!discussionAccess.hasAccess) {
      return {
        statusCode: discussionAccess.statusCode,
        headers,
        body: JSON.stringify({ error: discussionAccess.error }),
      };
    }

    const queryCommand = new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      ExpressionAttributeValues: {
        ':pk': `DISCUSSION#${discussionId}`,
        ':skPrefix': 'POINT#',
      },
    });

    const result = await dynamoClient.send(queryCommand);
    const points = (result.Items || []).sort((a, b) => a.order - b.order);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        discussionPoints: points.map(formatDiscussionPointResponse),
      }),
    };
  } catch (error: any) {
    console.error('Get discussion points error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to get discussion points',
        message: error.message
      }),
    };
  }
};

const handleGetBackgroundKnowledge = async (
  discussionId: string,
  currentUser: any,
  headers: Record<string, string>
): Promise<APIGatewayProxyResult> => {
  try {
    // First check if user has access to the discussion
    const discussionAccess = await checkDiscussionAccess(discussionId, currentUser);
    if (!discussionAccess.hasAccess) {
      return {
        statusCode: discussionAccess.statusCode,
        headers,
        body: JSON.stringify({ error: discussionAccess.error }),
      };
    }

    const queryCommand = new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      ExpressionAttributeValues: {
        ':pk': `DISCUSSION#${discussionId}`,
        ':skPrefix': 'KNOWLEDGE#',
      },
    });

    const result = await dynamoClient.send(queryCommand);
    const knowledge = (result.Items || []).sort((a, b) => a.order - b.order);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        backgroundKnowledge: knowledge.map(formatBackgroundKnowledgeResponse),
      }),
    };
  } catch (error: any) {
    console.error('Get background knowledge error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to get background knowledge',
        message: error.message
      }),
    };
  }
};

const handleCreateDiscussion = async (
  body: string | null,
  currentUser: any,
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

    const request: CreateDiscussionRequest = JSON.parse(body);

    // Validate required fields
    if (!request.title || !request.description || !request.categories || !request.discussionPoints) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Title, description, categories, and discussion points are required' }),
      };
    }

    if (request.categories.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'At least one category is required' }),
      };
    }

    if (request.discussionPoints.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'At least one discussion point is required' }),
      };
    }

    const discussionId = uuidv4();
    const now = new Date().toISOString();

    // Prepare transaction items
    const transactItems = [];

    // Main discussion item
    const discussionItem = {
      PK: `DISCUSSION#${discussionId}`,
      SK: 'METADATA',
      GSI1PK: `CATEGORY#${request.categories[0]}`, // Primary category for indexing
      GSI1SK: `DISCUSSION#${discussionId}`,
      GSI2PK: `OWNER#${currentUser.userId}`,
      GSI2SK: `DISCUSSION#${discussionId}`,
      EntityType: 'Discussion',
      discussionId,
      title: request.title,
      description: request.description,
      ownerId: currentUser.userId,
      ownerStance: request.ownerStance || Stance.UNKNOWN,
      categories: request.categories,
      accessControl: request.accessControl || { type: 'open', userIds: [] },
      metadata: {
        createdAt: now,
        updatedAt: now,
        participantCount: 1,
        postCount: 0,
        isActive: true,
      },
    };

    transactItems.push({
      Put: {
        TableName: TABLE_NAME,
        Item: discussionItem,
      },
    });

    // Discussion points
    request.discussionPoints.forEach((point, index) => {
      const pointId = point.id || uuidv4();
      const pointItem = {
        PK: `DISCUSSION#${discussionId}`,
        SK: `POINT#${pointId}`,
        GSI1PK: `DISCUSSION#${discussionId}`,
        GSI1SK: `POINT#${String(index).padStart(3, '0')}`,
        EntityType: 'DiscussionPoint',
        pointId,
        discussionId,
        title: point.title,
        description: point.description,
        parentId: point.parentId,
        level: point.level || 0,
        order: point.order !== undefined ? point.order : index,
      };

      transactItems.push({
        Put: {
          TableName: TABLE_NAME,
          Item: pointItem,
        },
      });
    });

    // Background knowledge (if provided)
    if (request.backgroundKnowledge) {
      request.backgroundKnowledge.forEach((knowledge, index) => {
        const knowledgeId = knowledge.id || uuidv4();
        const knowledgeItem = {
          PK: `DISCUSSION#${discussionId}`,
          SK: `KNOWLEDGE#${knowledgeId}`,
          EntityType: 'BackgroundKnowledge',
          knowledgeId,
          discussionId,
          type: knowledge.type,
          content: knowledge.content,
          title: knowledge.title,
          order: knowledge.order !== undefined ? knowledge.order : index,
        };

        transactItems.push({
          Put: {
            TableName: TABLE_NAME,
            Item: knowledgeItem,
          },
        });
      });
    }

    // Execute transaction
    const transactCommand = new TransactWriteCommand({
      TransactItems: transactItems,
    });

    await dynamoClient.send(transactCommand);

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        message: 'Discussion created successfully',
        discussion: formatDiscussionResponse(discussionItem),
      }),
    };
  } catch (error: any) {
    console.error('Create discussion error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to create discussion',
        message: error.message
      }),
    };
  }
};

const handleUpdateDiscussion = async (
  discussionId: string,
  body: string | null,
  currentUser: any,
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

    // Check if discussion exists and user has permission
    const getCommand = new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `DISCUSSION#${discussionId}`,
        SK: 'METADATA',
      },
    });

    const result = await dynamoClient.send(getCommand);
    
    if (!result.Item) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Discussion not found' }),
      };
    }

    const discussion = result.Item;

    // Check ownership or admin permission
    if (discussion.ownerId !== currentUser.userId && currentUser.role !== UserRole.ADMIN) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Only the discussion owner or admin can update this discussion' }),
      };
    }

    const request: UpdateDiscussionRequest = JSON.parse(body);
    const now = new Date().toISOString();

    // Build update expression
    const updateExpression = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    if (request.title) {
      updateExpression.push('#title = :title');
      expressionAttributeNames['#title'] = 'title';
      expressionAttributeValues[':title'] = request.title;
    }

    if (request.description) {
      updateExpression.push('#description = :description');
      expressionAttributeNames['#description'] = 'description';
      expressionAttributeValues[':description'] = request.description;
    }

    if (request.ownerStance) {
      updateExpression.push('#ownerStance = :ownerStance');
      expressionAttributeNames['#ownerStance'] = 'ownerStance';
      expressionAttributeValues[':ownerStance'] = request.ownerStance;
    }

    if (request.categories) {
      updateExpression.push('#categories = :categories');
      expressionAttributeNames['#categories'] = 'categories';
      expressionAttributeValues[':categories'] = request.categories;
      
      // Update GSI1PK if primary category changed
      updateExpression.push('GSI1PK = :gsi1pk');
      expressionAttributeValues[':gsi1pk'] = `CATEGORY#${request.categories[0]}`;
    }

    if (request.accessControl) {
      updateExpression.push('#accessControl = :accessControl');
      expressionAttributeNames['#accessControl'] = 'accessControl';
      expressionAttributeValues[':accessControl'] = request.accessControl;
    }

    // Always update the updatedAt timestamp
    updateExpression.push('#metadata.#updatedAt = :updatedAt');
    expressionAttributeNames['#metadata'] = 'metadata';
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = now;

    if (updateExpression.length === 1) { // Only updatedAt
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No valid fields to update' }),
      };
    }

    const updateCommand = new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `DISCUSSION#${discussionId}`,
        SK: 'METADATA',
      },
      UpdateExpression: `SET ${updateExpression.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    });

    const updateResult = await dynamoClient.send(updateCommand);

    // Handle discussion points update if provided
    if (request.discussionPoints) {
      await updateDiscussionPoints(discussionId, request.discussionPoints);
    }

    // Handle background knowledge update if provided
    if (request.backgroundKnowledge) {
      await updateBackgroundKnowledge(discussionId, request.backgroundKnowledge);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Discussion updated successfully',
        discussion: formatDiscussionResponse(updateResult.Attributes!),
      }),
    };
  } catch (error: any) {
    console.error('Update discussion error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to update discussion',
        message: error.message
      }),
    };
  }
};

const handleDeleteDiscussion = async (
  discussionId: string,
  currentUser: any,
  headers: Record<string, string>
): Promise<APIGatewayProxyResult> => {
  try {
    // Check if discussion exists and user has permission
    const getCommand = new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `DISCUSSION#${discussionId}`,
        SK: 'METADATA',
      },
    });

    const result = await dynamoClient.send(getCommand);
    
    if (!result.Item) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Discussion not found' }),
      };
    }

    const discussion = result.Item;

    // Check ownership or admin permission
    if (discussion.ownerId !== currentUser.userId && currentUser.role !== UserRole.ADMIN) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Only the discussion owner or admin can delete this discussion' }),
      };
    }

    // Get all related items (points, knowledge, posts)
    const queryCommand = new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: {
        ':pk': `DISCUSSION#${discussionId}`,
      },
    });

    const queryResult = await dynamoClient.send(queryCommand);
    const itemsToDelete = queryResult.Items || [];

    // Batch delete all items
    const deleteRequests = itemsToDelete.map(item => ({
      DeleteRequest: {
        Key: {
          PK: item.PK,
          SK: item.SK,
        },
      },
    }));

    // DynamoDB batch write has a limit of 25 items
    const batchSize = 25;
    for (let i = 0; i < deleteRequests.length; i += batchSize) {
      const batch = deleteRequests.slice(i, i + batchSize);
      const batchCommand = new BatchWriteCommand({
        RequestItems: {
          [TABLE_NAME]: batch,
        },
      });
      await dynamoClient.send(batchCommand);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Discussion deleted successfully',
        discussionId,
      }),
    };
  } catch (error: any) {
    console.error('Delete discussion error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to delete discussion',
        message: error.message
      }),
    };
  }
};

// Helper functions
const getCurrentUser = async (accessToken: string) => {
  const getUserCommand = new GetUserCommand({
    AccessToken: accessToken,
  });
  const cognitoUser = await cognitoClient.send(getUserCommand);

  const userId = cognitoUser.Username!;
  const role = cognitoUser.UserAttributes?.find(attr => attr.Name === 'custom:role')?.Value || UserRole.VIEWER;

  return {
    userId,
    role: role as UserRole,
  };
};

// Cached version of getCurrentUser
const getCurrentUserCached = async (accessToken: string) => {
  const cacheKey = `user:${accessToken.substring(0, 20)}`;
  
  // Check cache first
  const cached = userCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // Get user from Cognito
  const user = await getCurrentUser(accessToken);
  
  // Cache for 5 minutes
  userCache.set(cacheKey, user, 300000);
  
  return user;
};

const hasDiscussionAccess = async (discussion: any, currentUser: any): Promise<boolean> => {
  if (!discussion.accessControl || discussion.accessControl.type === 'open') {
    return true;
  }

  if (!currentUser) {
    return false;
  }

  // Owner and admin always have access
  if (discussion.ownerId === currentUser.userId || currentUser.role === UserRole.ADMIN) {
    return true;
  }

  const { type, userIds } = discussion.accessControl;

  if (type === 'blacklist') {
    return !userIds.includes(currentUser.userId);
  } else if (type === 'whitelist') {
    return userIds.includes(currentUser.userId);
  }

  return false;
};

const checkDiscussionAccess = async (discussionId: string, currentUser: any) => {
  const getCommand = new GetCommand({
    TableName: TABLE_NAME,
    Key: {
      PK: `DISCUSSION#${discussionId}`,
      SK: 'METADATA',
    },
  });

  const result = await dynamoClient.send(getCommand);
  
  if (!result.Item) {
    return {
      hasAccess: false,
      statusCode: 404,
      error: 'Discussion not found',
    };
  }

  const hasAccess = await hasDiscussionAccess(result.Item, currentUser);
  
  if (!hasAccess) {
    return {
      hasAccess: false,
      statusCode: 403,
      error: 'Access denied to this discussion',
    };
  }

  return {
    hasAccess: true,
    discussion: result.Item,
  };
};

const updateDiscussionPoints = async (discussionId: string, points: DiscussionPoint[]) => {
  // Delete existing points
  const queryCommand = new QueryCommand({
    TableName: TABLE_NAME,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
    ExpressionAttributeValues: {
      ':pk': `DISCUSSION#${discussionId}`,
      ':skPrefix': 'POINT#',
    },
  });

  const existingPoints = await dynamoClient.send(queryCommand);
  
  if (existingPoints.Items && existingPoints.Items.length > 0) {
    const deleteRequests = existingPoints.Items.map(item => ({
      DeleteRequest: {
        Key: {
          PK: item.PK,
          SK: item.SK,
        },
      },
    }));

    const batchCommand = new BatchWriteCommand({
      RequestItems: {
        [TABLE_NAME]: deleteRequests,
      },
    });
    await dynamoClient.send(batchCommand);
  }

  // Add new points
  const putRequests = points.map((point, index) => {
    const pointId = point.id || uuidv4();
    return {
      PutRequest: {
        Item: {
          PK: `DISCUSSION#${discussionId}`,
          SK: `POINT#${pointId}`,
          GSI1PK: `DISCUSSION#${discussionId}`,
          GSI1SK: `POINT#${String(index).padStart(3, '0')}`,
          EntityType: 'DiscussionPoint',
          pointId,
          discussionId,
          title: point.title,
          description: point.description,
          parentId: point.parentId,
          level: point.level || 0,
          order: point.order !== undefined ? point.order : index,
        },
      },
    };
  });

  if (putRequests.length > 0) {
    const batchCommand = new BatchWriteCommand({
      RequestItems: {
        [TABLE_NAME]: putRequests,
      },
    });
    await dynamoClient.send(batchCommand);
  }
};

const updateBackgroundKnowledge = async (discussionId: string, knowledge: BackgroundKnowledge[]) => {
  // Delete existing knowledge
  const queryCommand = new QueryCommand({
    TableName: TABLE_NAME,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
    ExpressionAttributeValues: {
      ':pk': `DISCUSSION#${discussionId}`,
      ':skPrefix': 'KNOWLEDGE#',
    },
  });

  const existingKnowledge = await dynamoClient.send(queryCommand);
  
  if (existingKnowledge.Items && existingKnowledge.Items.length > 0) {
    const deleteRequests = existingKnowledge.Items.map(item => ({
      DeleteRequest: {
        Key: {
          PK: item.PK,
          SK: item.SK,
        },
      },
    }));

    const batchCommand = new BatchWriteCommand({
      RequestItems: {
        [TABLE_NAME]: deleteRequests,
      },
    });
    await dynamoClient.send(batchCommand);
  }

  // Add new knowledge
  const putRequests = knowledge.map((item, index) => {
    const knowledgeId = item.id || uuidv4();
    return {
      PutRequest: {
        Item: {
          PK: `DISCUSSION#${discussionId}`,
          SK: `KNOWLEDGE#${knowledgeId}`,
          EntityType: 'BackgroundKnowledge',
          knowledgeId,
          discussionId,
          type: item.type,
          content: item.content,
          title: item.title,
          order: item.order !== undefined ? item.order : index,
        },
      },
    };
  });

  if (putRequests.length > 0) {
    const batchCommand = new BatchWriteCommand({
      RequestItems: {
        [TABLE_NAME]: putRequests,
      },
    });
    await dynamoClient.send(batchCommand);
  }
};

const formatDiscussionResponse = (discussion: any) => ({
  id: discussion.discussionId,
  title: discussion.title,
  description: discussion.description,
  ownerId: discussion.ownerId,
  ownerStance: discussion.ownerStance,
  categories: discussion.categories,
  accessControl: discussion.accessControl,
  metadata: discussion.metadata,
  createdAt: discussion.metadata?.createdAt,
  updatedAt: discussion.metadata?.updatedAt,
});

const formatDiscussionPointResponse = (point: any) => ({
  id: point.pointId,
  title: point.title,
  description: point.description,
  parentId: point.parentId,
  level: point.level,
  order: point.order,
});

const formatBackgroundKnowledgeResponse = (knowledge: any) => ({
  id: knowledge.knowledgeId,
  type: knowledge.type,
  content: knowledge.content,
  title: knowledge.title,
  order: knowledge.order,
});