// Post moderation Lambda function
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { 
  DynamoDBDocumentClient, 
  GetCommand, 
  UpdateCommand, 
  QueryCommand, 
  ScanCommand,
  PutCommand
} from '@aws-sdk/lib-dynamodb';
import { 
  CognitoIdentityProviderClient,
  GetUserCommand 
} from '@aws-sdk/client-cognito-identity-provider';
import { v4 as uuidv4 } from 'uuid';

// Initialize AWS clients
const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION }));
const cognitoClient = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION });

const TABLE_NAME = process.env.TABLE_NAME!;

// Types
enum UserRole {
  VIEWER = 'viewer',
  CONTRIBUTOR = 'contributor',
  CREATOR = 'creator',
  ADMIN = 'admin'
}

enum ModerationAction {
  HIDE = 'hide',
  SHOW = 'show',
  DELETE = 'delete',
  RESTORE = 'restore'
}

interface ModerationRequest {
  postId: string;
  action: ModerationAction;
  reason?: string;
}

interface ModerationLog {
  id: string;
  postId: string;
  discussionId: string;
  moderatorId: string;
  action: ModerationAction;
  reason?: string;
  timestamp: string;
  previousState: {
    isHidden: boolean;
    isDeleted: boolean;
  };
  newState: {
    isHidden: boolean;
    isDeleted: boolean;
  };
}

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('Moderation Lambda - Event:', JSON.stringify(event, null, 2));

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Content-Type': 'application/json',
  };

  try {
    const { httpMethod, path, body, pathParameters, queryStringParameters, headers: requestHeaders } = event;

    // Handle CORS preflight
    if (httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers,
        body: '',
      };
    }

    // Extract access token from Authorization header
    const authHeader = requestHeaders?.Authorization || requestHeaders?.authorization;
    const accessToken = authHeader?.replace('Bearer ', '');

    // Get current user info for authorization
    let currentUser = null;
    if (accessToken) {
      try {
        currentUser = await getCurrentUser(accessToken);
      } catch (error) {
        console.error('Error getting current user:', error);
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: 'Invalid or expired token' }),
        };
      }
    }

    if (!currentUser) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Authentication required' }),
      };
    }

    switch (httpMethod) {
      case 'GET':
        if (pathParameters?.proxy) {
          const pathParts = pathParameters.proxy.split('/');
          
          if (pathParts[0] === 'logs') {
            if (pathParts.length === 1) {
              return handleGetModerationLogs(queryStringParameters as { [key: string]: string } | null, currentUser, headers);
            } else if (pathParts.length === 2) {
              return handleGetPostModerationLogs(pathParts[1], currentUser, headers);
            }
          } else if (pathParts[0] === 'posts') {
            return handleGetModeratedPosts(queryStringParameters as { [key: string]: string } | null, currentUser, headers);
          } else if (pathParts[0] === 'queue') {
            return handleGetModerationQueue(queryStringParameters, currentUser, headers);
          } else if (pathParts[0] === 'stats') {
            return handleGetModerationStats(queryStringParameters, currentUser, headers);
          } else if (pathParts[0] === 'filters') {
            if (pathParts[1] === 'active') {
              return handleGetActiveFilters(currentUser, headers);
            } else if (pathParts.length === 3 && pathParts[2] === 'stats') {
              return handleGetFilterStats(pathParts[1], queryStringParameters, currentUser, headers);
            }
          } else if (pathParts[0] === 'config' && pathParts[1] === 'filters') {
            return handleGetFilterConfig(currentUser, headers);
          } else if (pathParts[0] === 'sanctions') {
            if (pathParts.length === 1) {
              return handleGetAllSanctions(queryStringParameters, currentUser, headers);
            } else if (pathParts.length === 2) {
              return handleGetSanction(pathParts[1], currentUser, headers);
            } else if (pathParts.length === 3 && pathParts[1] === 'user') {
              return handleGetUserSanctions(pathParts[2], queryStringParameters, currentUser, headers);
            } else if (pathParts.length === 4 && pathParts[1] === 'user' && pathParts[3] === 'status') {
              return handleGetUserSanctionStatus(pathParts[2], currentUser, headers);
            } else if (pathParts.length === 4 && pathParts[1] === 'user' && pathParts[3] === 'history') {
              return handleGetUserSanctionHistory(pathParts[2], currentUser, headers);
            } else if (pathParts.length === 2 && pathParts[1] === 'stats') {
              return handleGetSanctionStats(queryStringParameters, currentUser, headers);
            } else if (pathParts.length === 2 && pathParts[1] === 'expiring') {
              return handleGetExpiringSanctions(queryStringParameters, currentUser, headers);
            } else if (pathParts.length === 3 && pathParts[1] === 'moderator') {
              return handleGetSanctionsByModerator(pathParts[2], queryStringParameters, currentUser, headers);
            }
          }
        }
        break;

      case 'POST':
        if (pathParameters?.proxy) {
          const pathParts = pathParameters.proxy.split('/');
          
          if (pathParts[0] === 'moderate') {
            return handleModeratePost(body, currentUser, headers);
          } else if (pathParts[0] === 'reports') {
            if (pathParts[1] === 'posts') {
              return handleCreatePostReport(body, currentUser, headers);
            } else if (pathParts.length === 3 && pathParts[2] === 'review') {
              return handleReviewReport(pathParts[1], body, currentUser, headers);
            }
          } else if (pathParts[0] === 'queue' && pathParts.length === 3 && pathParts[2] === 'assign') {
            return handleAssignQueueItem(pathParts[1], body, currentUser, headers);
          } else if (pathParts[0] === 'content') {
            if (pathParts[1] === 'analyze') {
              return handleAnalyzeContent(body, currentUser, headers);
            } else if (pathParts[1] === 'spam-detection') {
              return handleSpamDetection(body, currentUser, headers);
            } else if (pathParts[1] === 'process') {
              return handleProcessContent(body, currentUser, headers);
            }
          } else if (pathParts[0] === 'filters') {
            if (pathParts.length === 1) {
              return handleCreateFilter(body, currentUser, headers);
            } else if (pathParts.length === 3 && pathParts[2] === 'test') {
              return handleTestFilter(pathParts[1], body, currentUser, headers);
            } else if (pathParts.length === 3 && pathParts[2] === 'feedback') {
              return handleFilterFeedback(pathParts[1], body, currentUser, headers);
            }
          } else if (pathParts[0] === 'sanctions') {
            if (pathParts.length === 1) {
              return handleCreateSanction(body, currentUser, headers);
            } else if (pathParts.length === 3 && pathParts[2] === 'revoke') {
              return handleRevokeSanction(pathParts[1], body, currentUser, headers);
            } else if (pathParts.length === 3 && pathParts[2] === 'appeal') {
              return handleAppealSanction(pathParts[1], body, currentUser, headers);
            } else if (pathParts.length === 4 && pathParts[2] === 'appeal' && pathParts[3] === 'review') {
              return handleReviewAppeal(pathParts[1], body, currentUser, headers);
            } else if (pathParts.length === 3 && pathParts[2] === 'notify') {
              return handleNotifyUser(pathParts[1], body, currentUser, headers);
            } else if (pathParts.length === 4 && pathParts[1] === 'user' && pathParts[3] === 'process-automated') {
              return handleProcessAutomatedSanctions(pathParts[2], body, currentUser, headers);
            }
          }
        }
        break;

      case 'PUT':
        if (pathParameters?.proxy) {
          const pathParts = pathParameters.proxy.split('/');
          
          if (pathParts[0] === 'filters' && pathParts.length === 2) {
            return handleUpdateFilter(pathParts[1], body, currentUser, headers);
          } else if (pathParts[0] === 'config' && pathParts[1] === 'filters') {
            return handleUpdateFilterConfig(body, currentUser, headers);
          } else if (pathParts[0] === 'sanctions' && pathParts.length === 2) {
            return handleUpdateSanction(pathParts[1], body, currentUser, headers);
          }
        }
        break;

      case 'DELETE':
        if (pathParameters?.proxy) {
          const pathParts = pathParameters.proxy.split('/');
          
          if (pathParts[0] === 'filters' && pathParts.length === 2) {
            return handleDeleteFilter(pathParts[1], currentUser, headers);
          }
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
    console.error('Moderation Lambda Error:', error);
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

const handleModeratePost = async (
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

    const request: ModerationRequest = JSON.parse(body);

    // Validate required fields
    if (!request.postId || !request.action) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Post ID and action are required' }),
      };
    }

    if (!Object.values(ModerationAction).includes(request.action)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid moderation action' }),
      };
    }

    // Find the post
    const scanCommand = new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'EntityType = :entityType AND postId = :postId',
      ExpressionAttributeValues: {
        ':entityType': 'Post',
        ':postId': request.postId,
      },
    });

    const result = await dynamoClient.send(scanCommand);
    
    if (!result.Items || result.Items.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Post not found' }),
      };
    }

    const post = result.Items[0];

    // Check moderation permissions
    const moderationCheck = await checkModerationPermissions(post, currentUser);
    if (!moderationCheck.hasPermission) {
      return {
        statusCode: moderationCheck.statusCode || 403,
        headers,
        body: JSON.stringify({ error: moderationCheck.error }),
      };
    }

    const now = new Date().toISOString();
    const previousState = {
      isHidden: post.moderation?.isHidden || false,
      isDeleted: post.moderation?.isDeleted || false,
    };

    // Determine new state based on action
    let newState = { ...previousState };
    let updateExpression = '';
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    switch (request.action) {
      case ModerationAction.HIDE:
        newState.isHidden = true;
        updateExpression = 'SET #moderation.#isHidden = :isHidden, #moderation.#hiddenBy = :hiddenBy, #moderation.#hiddenAt = :hiddenAt';
        if (request.reason) {
          updateExpression += ', #moderation.#hiddenReason = :hiddenReason';
          expressionAttributeValues[':hiddenReason'] = request.reason;
        }
        expressionAttributeNames['#isHidden'] = 'isHidden';
        expressionAttributeNames['#hiddenBy'] = 'hiddenBy';
        expressionAttributeNames['#hiddenAt'] = 'hiddenAt';
        expressionAttributeValues[':isHidden'] = true;
        expressionAttributeValues[':hiddenBy'] = currentUser.userId;
        expressionAttributeValues[':hiddenAt'] = now;
        break;

      case ModerationAction.SHOW:
        newState.isHidden = false;
        updateExpression = 'SET #moderation.#isHidden = :isHidden REMOVE #moderation.#hiddenBy, #moderation.#hiddenAt, #moderation.#hiddenReason';
        expressionAttributeNames['#isHidden'] = 'isHidden';
        expressionAttributeValues[':isHidden'] = false;
        break;

      case ModerationAction.DELETE:
        newState.isDeleted = true;
        updateExpression = 'SET #moderation.#isDeleted = :isDeleted, #moderation.#deletedBy = :deletedBy, #moderation.#deletedAt = :deletedAt';
        if (request.reason) {
          updateExpression += ', #moderation.#deletedReason = :deletedReason';
          expressionAttributeValues[':deletedReason'] = request.reason;
        }
        expressionAttributeNames['#isDeleted'] = 'isDeleted';
        expressionAttributeNames['#deletedBy'] = 'deletedBy';
        expressionAttributeNames['#deletedAt'] = 'deletedAt';
        expressionAttributeValues[':isDeleted'] = true;
        expressionAttributeValues[':deletedBy'] = currentUser.userId;
        expressionAttributeValues[':deletedAt'] = now;
        break;

      case ModerationAction.RESTORE:
        newState.isDeleted = false;
        updateExpression = 'SET #moderation.#isDeleted = :isDeleted REMOVE #moderation.#deletedBy, #moderation.#deletedAt, #moderation.#deletedReason';
        expressionAttributeNames['#isDeleted'] = 'isDeleted';
        expressionAttributeValues[':isDeleted'] = false;
        break;
    }

    // Add common update fields
    updateExpression += ', #metadata.#updatedAt = :updatedAt';
    expressionAttributeNames['#moderation'] = 'moderation';
    expressionAttributeNames['#metadata'] = 'metadata';
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = now;

    // Update the post
    const updateCommand = new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: post.PK,
        SK: post.SK,
      },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    });

    const updateResult = await dynamoClient.send(updateCommand);

    // Log the moderation action
    const moderationLog: ModerationLog = {
      id: uuidv4(),
      postId: request.postId,
      discussionId: post.discussionId,
      moderatorId: currentUser.userId,
      action: request.action,
      reason: request.reason,
      timestamp: now,
      previousState,
      newState,
    };

    await logModerationAction(moderationLog);

    // Send notification to post author if not the same as moderator
    if (post.authorId !== currentUser.userId) {
      await sendModerationNotification(post, moderationLog);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: `Post ${request.action} action completed successfully`,
        post: formatPostResponse(updateResult.Attributes!),
        moderationLog: {
          id: moderationLog.id,
          action: moderationLog.action,
          reason: moderationLog.reason,
          timestamp: moderationLog.timestamp,
        },
      }),
    };
  } catch (error: any) {
    console.error('Moderate post error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to moderate post',
        message: error.message
      }),
    };
  }
};

const handleGetModerationLogs = async (
  queryParams: { [key: string]: string } | null,
  currentUser: any,
  headers: Record<string, string>
): Promise<APIGatewayProxyResult> => {
  try {
    // Only admins and discussion owners can view moderation logs
    if (currentUser.role !== UserRole.ADMIN) {
      // For discussion owners, we'll filter by their discussions later
      if (currentUser.role !== UserRole.CREATOR) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: 'Insufficient permissions to view moderation logs' }),
        };
      }
    }

    const discussionId = queryParams?.discussionId;
    const moderatorId = queryParams?.moderatorId;
    const limit = queryParams?.limit ? parseInt(queryParams.limit) : 20;
    const lastEvaluatedKey = queryParams?.lastEvaluatedKey ? JSON.parse(queryParams.lastEvaluatedKey) : undefined;

    let queryCommand;

    if (discussionId) {
      // Get logs for a specific discussion
      queryCommand = new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :discussionPK AND begins_with(SK, :logPrefix)',
        ExpressionAttributeValues: {
          ':discussionPK': `DISCUSSION#${discussionId}`,
          ':logPrefix': 'MODLOG#',
        },
        Limit: limit,
        ExclusiveStartKey: lastEvaluatedKey,
        ScanIndexForward: false, // Most recent first
      });
    } else {
      // Scan all moderation logs (admin only)
      if (currentUser.role !== UserRole.ADMIN) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: 'Only admins can view all moderation logs' }),
        };
      }

      queryCommand = new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: 'EntityType = :entityType',
        ExpressionAttributeValues: {
          ':entityType': 'ModerationLog',
        },
        Limit: limit,
        ExclusiveStartKey: lastEvaluatedKey,
      });
    }

    const result = await dynamoClient.send(queryCommand);
    let logs = result.Items || [];

    // Filter by moderator if specified
    if (moderatorId) {
      logs = logs.filter(log => log.moderatorId === moderatorId);
    }

    // For non-admin users, filter to only their discussions
    if (currentUser.role !== UserRole.ADMIN) {
      const userDiscussions = await getUserDiscussions(currentUser.userId);
      const userDiscussionIds = new Set(userDiscussions.map(d => d.discussionId));
      logs = logs.filter(log => userDiscussionIds.has(log.discussionId));
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        logs: logs.map(formatModerationLogResponse),
        lastEvaluatedKey: result.LastEvaluatedKey,
        count: logs.length,
      }),
    };
  } catch (error: any) {
    console.error('Get moderation logs error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to get moderation logs',
        message: error.message
      }),
    };
  }
};

const handleGetPostModerationLogs = async (
  postId: string,
  currentUser: any,
  headers: Record<string, string>
): Promise<APIGatewayProxyResult> => {
  try {
    // Find the post first to check permissions
    const scanCommand = new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'EntityType = :entityType AND postId = :postId',
      ExpressionAttributeValues: {
        ':entityType': 'Post',
        ':postId': postId,
      },
    });

    const postResult = await dynamoClient.send(scanCommand);
    
    if (!postResult.Items || postResult.Items.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Post not found' }),
      };
    }

    const post = postResult.Items[0];

    // Check if user can view moderation logs for this post
    const canView = await canViewModerationLogs(post, currentUser);
    if (!canView) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Insufficient permissions to view moderation logs for this post' }),
      };
    }

    // Get moderation logs for this post
    const queryCommand = new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :discussionPK AND begins_with(SK, :logPrefix)',
      FilterExpression: 'postId = :postId',
      ExpressionAttributeValues: {
        ':discussionPK': `DISCUSSION#${post.discussionId}`,
        ':logPrefix': 'MODLOG#',
        ':postId': postId,
      },
      ScanIndexForward: false, // Most recent first
    });

    const result = await dynamoClient.send(queryCommand);
    const logs = result.Items || [];

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        postId,
        logs: logs.map(formatModerationLogResponse),
        count: logs.length,
      }),
    };
  } catch (error: any) {
    console.error('Get post moderation logs error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to get post moderation logs',
        message: error.message
      }),
    };
  }
};

const handleGetModeratedPosts = async (
  queryParams: { [key: string]: string } | null,
  currentUser: any,
  headers: Record<string, string>
): Promise<APIGatewayProxyResult> => {
  try {
    const discussionId = queryParams?.discussionId;
    const status = queryParams?.status; // 'hidden', 'deleted', 'all'
    const limit = queryParams?.limit ? parseInt(queryParams.limit) : 20;

    if (!discussionId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Discussion ID is required' }),
      };
    }

    // Check if user can moderate posts in this discussion
    const moderationCheck = await checkDiscussionModerationPermissions(discussionId, currentUser);
    if (!moderationCheck.hasPermission) {
      return {
        statusCode: moderationCheck.statusCode || 403,
        headers,
        body: JSON.stringify({ error: moderationCheck.error }),
      };
    }

    // Get all posts in the discussion
    const queryCommand = new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :discussionPK AND begins_with(SK, :postPrefix)',
      ExpressionAttributeValues: {
        ':discussionPK': `DISCUSSION#${discussionId}`,
        ':postPrefix': 'POST#',
      },
      Limit: limit,
    });

    const result = await dynamoClient.send(queryCommand);
    let posts = result.Items || [];

    // Filter by moderation status
    if (status === 'hidden') {
      posts = posts.filter(post => post.moderation?.isHidden && !post.moderation?.isDeleted);
    } else if (status === 'deleted') {
      posts = posts.filter(post => post.moderation?.isDeleted);
    } else if (status === 'moderated') {
      posts = posts.filter(post => post.moderation?.isHidden || post.moderation?.isDeleted);
    }
    // 'all' or undefined shows all posts

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        discussionId,
        posts: posts.map(formatPostResponse),
        count: posts.length,
      }),
    };
  } catch (error: any) {
    console.error('Get moderated posts error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to get moderated posts',
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

const checkModerationPermissions = async (post: any, currentUser: any) => {
  // System admins can moderate any post
  if (currentUser.role === UserRole.ADMIN) {
    return { hasPermission: true };
  }

  // Check if user is the discussion owner
  const getDiscussionCommand = new GetCommand({
    TableName: TABLE_NAME,
    Key: {
      PK: `DISCUSSION#${post.discussionId}`,
      SK: 'METADATA',
    },
  });

  const discussionResult = await dynamoClient.send(getDiscussionCommand);
  
  if (!discussionResult.Item) {
    return {
      hasPermission: false,
      statusCode: 404,
      error: 'Discussion not found',
    };
  }

  const discussion = discussionResult.Item;

  if (discussion.ownerId === currentUser.userId) {
    return { hasPermission: true };
  }

  return {
    hasPermission: false,
    statusCode: 403,
    error: 'Only discussion owners and system administrators can moderate posts',
  };
};

const checkDiscussionModerationPermissions = async (discussionId: string, currentUser: any) => {
  // System admins can moderate any discussion
  if (currentUser.role === UserRole.ADMIN) {
    return { hasPermission: true };
  }

  // Check if user is the discussion owner
  const getDiscussionCommand = new GetCommand({
    TableName: TABLE_NAME,
    Key: {
      PK: `DISCUSSION#${discussionId}`,
      SK: 'METADATA',
    },
  });

  const discussionResult = await dynamoClient.send(getDiscussionCommand);
  
  if (!discussionResult.Item) {
    return {
      hasPermission: false,
      statusCode: 404,
      error: 'Discussion not found',
    };
  }

  const discussion = discussionResult.Item;

  if (discussion.ownerId === currentUser.userId) {
    return { hasPermission: true };
  }

  return {
    hasPermission: false,
    statusCode: 403,
    error: 'Only discussion owners and system administrators can moderate posts',
  };
};

const canViewModerationLogs = async (post: any, currentUser: any): Promise<boolean> => {
  // System admins can view all logs
  if (currentUser.role === UserRole.ADMIN) {
    return true;
  }

  // Post authors can view logs for their own posts
  if (post.authorId === currentUser.userId) {
    return true;
  }

  // Discussion owners can view logs for posts in their discussions
  const getDiscussionCommand = new GetCommand({
    TableName: TABLE_NAME,
    Key: {
      PK: `DISCUSSION#${post.discussionId}`,
      SK: 'METADATA',
    },
  });

  const discussionResult = await dynamoClient.send(getDiscussionCommand);
  
  if (discussionResult.Item && discussionResult.Item.ownerId === currentUser.userId) {
    return true;
  }

  return false;
};

const getUserDiscussions = async (userId: string) => {
  const queryCommand = new QueryCommand({
    TableName: TABLE_NAME,
    IndexName: 'GSI2',
    KeyConditionExpression: 'GSI2PK = :ownerPK',
    ExpressionAttributeValues: {
      ':ownerPK': `OWNER#${userId}`,
    },
  });

  const result = await dynamoClient.send(queryCommand);
  return result.Items || [];
};

const logModerationAction = async (moderationLog: ModerationLog) => {
  const logItem = {
    PK: `DISCUSSION#${moderationLog.discussionId}`,
    SK: `MODLOG#${moderationLog.timestamp}#${moderationLog.id}`,
    EntityType: 'ModerationLog',
    ...moderationLog,
  };

  const putCommand = new PutCommand({
    TableName: TABLE_NAME,
    Item: logItem,
  });

  await dynamoClient.send(putCommand);
};

const sendModerationNotification = async (post: any, moderationLog: ModerationLog) => {
  // Create a notification for the post author
  const notificationId = uuidv4();
  const notification = {
    PK: `USER#${post.authorId}`,
    SK: `NOTIFICATION#${notificationId}`,
    GSI1PK: `USER#${post.authorId}`,
    GSI1SK: `NOTIFICATION#${moderationLog.timestamp}`,
    EntityType: 'Notification',
    notificationId,
    userId: post.authorId,
    type: 'POST_MODERATED',
    title: `Your post has been ${moderationLog.action}`,
    message: `Your post in the discussion has been ${moderationLog.action}${moderationLog.reason ? ` for the following reason: ${moderationLog.reason}` : '.'}`,
    data: {
      postId: post.postId,
      discussionId: post.discussionId,
      moderatorId: moderationLog.moderatorId,
      action: moderationLog.action,
      reason: moderationLog.reason,
    },
    isRead: false,
    createdAt: moderationLog.timestamp,
  };

  const putCommand = new PutCommand({
    TableName: TABLE_NAME,
    Item: notification,
  });

  await dynamoClient.send(putCommand);
};

const formatPostResponse = (post: any) => ({
  id: post.postId,
  discussionId: post.discussionId,
  discussionPointId: post.discussionPointId,
  authorId: post.authorId,
  content: post.content,
  stance: post.stance,
  replyToId: post.replyToId,
  moderation: post.moderation,
  metadata: post.metadata,
  createdAt: post.metadata?.createdAt,
  updatedAt: post.metadata?.updatedAt,
  isEdited: post.metadata?.isEdited || false,
});

const formatModerationLogResponse = (log: any) => ({
  id: log.id,
  postId: log.postId,
  discussionId: log.discussionId,
  moderatorId: log.moderatorId,
  action: log.action,
  reason: log.reason,
  timestamp: log.timestamp,
  previousState: log.previousState,
  newState: log.newState,
});

// Additional handler functions for post reporting system

const handleCreatePostReport = async (
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

    const reportData = JSON.parse(body);

    // Validate required fields
    if (!reportData.postId || !reportData.category || !reportData.reason) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Post ID, category, and reason are required' }),
      };
    }

    // Find the post to report
    const scanCommand = new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'EntityType = :entityType AND postId = :postId',
      ExpressionAttributeValues: {
        ':entityType': 'Post',
        ':postId': reportData.postId,
      },
    });

    const postResult = await dynamoClient.send(scanCommand);
    
    if (!postResult.Items || postResult.Items.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Post not found' }),
      };
    }

    const post = postResult.Items[0];

    // Check if user has already reported this post
    const existingReportQuery = new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :postPK AND begins_with(SK, :reportPrefix)',
      FilterExpression: 'reporterId = :reporterId',
      ExpressionAttributeValues: {
        ':postPK': `POST#${reportData.postId}`,
        ':reportPrefix': 'REPORT#',
        ':reporterId': currentUser.userId,
      },
    });

    const existingReportResult = await dynamoClient.send(existingReportQuery);
    
    if (existingReportResult.Items && existingReportResult.Items.length > 0) {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({ error: 'You have already reported this post' }),
      };
    }

    const now = new Date().toISOString();
    const reportId = uuidv4();

    // Calculate priority based on category and other factors
    const priority = calculateReportPriority(reportData.category);

    // Create the report
    const report = {
      PK: `POST#${reportData.postId}`,
      SK: `REPORT#${reportId}`,
      GSI1PK: `REPORTER#${currentUser.userId}`,
      GSI1SK: `REPORT#${now}`,
      GSI2PK: `STATUS#pending`,
      GSI2SK: `REPORT#${priority}#${now}`,
      EntityType: 'PostReport',
      reportId,
      postId: reportData.postId,
      discussionId: post.discussionId,
      reporterId: currentUser.userId,
      reporterDisplayName: currentUser.displayName || currentUser.userId,
      category: reportData.category,
      reason: reportData.reason,
      description: reportData.description,
      priority,
      status: 'pending',
      metadata: {
        ipAddress: reportData.ipAddress,
        userAgent: reportData.userAgent,
        source: 'web',
      },
      createdAt: now,
      updatedAt: now,
    };

    const putReportCommand = new PutCommand({
      TableName: TABLE_NAME,
      Item: report,
    });

    await dynamoClient.send(putReportCommand);

    // Create moderation queue item
    await createModerationQueueItem(report, post);

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        message: 'Report submitted successfully',
        reportId,
      }),
    };
  } catch (error: any) {
    console.error('Create post report error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to create report',
        message: error.message
      }),
    };
  }
};

const handleGetModerationQueue = async (
  queryParams: { [key: string]: string | undefined } | null,
  currentUser: any,
  headers: Record<string, string>
): Promise<APIGatewayProxyResult> => {
  try {
    // Check if user has moderation permissions
    if (currentUser.role !== UserRole.ADMIN && currentUser.role !== UserRole.CREATOR) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Insufficient permissions to access moderation queue' }),
      };
    }

    const priority = queryParams?.priority;
    const status = queryParams?.status;
    const assignedTo = queryParams?.assignedTo;
    const limit = queryParams?.limit ? parseInt(queryParams.limit) : 20;
    const lastEvaluatedKey = queryParams?.lastEvaluatedKey ? JSON.parse(queryParams.lastEvaluatedKey) : undefined;

    let queryCommand;

    if (priority) {
      // Query by priority
      queryCommand = new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :priorityPK',
        ExpressionAttributeValues: {
          ':priorityPK': `MODQUEUE#${priority}`,
        },
        Limit: limit,
        ExclusiveStartKey: lastEvaluatedKey,
        ScanIndexForward: false, // Most recent first
      });
    } else {
      // Scan all queue items
      queryCommand = new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: 'EntityType = :entityType',
        ExpressionAttributeValues: {
          ':entityType': 'ModerationQueueItem',
        },
        Limit: limit,
        ExclusiveStartKey: lastEvaluatedKey,
      });
    }

    const result = await dynamoClient.send(queryCommand);
    let queueItems = result.Items || [];

    // Apply additional filters
    if (status) {
      queueItems = queueItems.filter(item => item.status === status);
    }

    if (assignedTo) {
      queueItems = queueItems.filter(item => item.assignedTo === assignedTo);
    }

    // For non-admin users, filter to only their discussions
    if (currentUser.role !== UserRole.ADMIN) {
      const userDiscussions = await getUserDiscussions(currentUser.userId);
      const userDiscussionIds = new Set(userDiscussions.map(d => d.discussionId));
      queueItems = queueItems.filter(item => userDiscussionIds.has(item.discussionId));
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        items: queueItems.map(formatModerationQueueItemResponse),
        totalCount: queueItems.length,
        hasMore: !!result.LastEvaluatedKey,
        nextToken: result.LastEvaluatedKey ? JSON.stringify(result.LastEvaluatedKey) : undefined,
      }),
    };
  } catch (error: any) {
    console.error('Get moderation queue error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to get moderation queue',
        message: error.message
      }),
    };
  }
};

const handleAssignQueueItem = async (
  queueItemId: string,
  body: string | null,
  currentUser: any,
  headers: Record<string, string>
): Promise<APIGatewayProxyResult> => {
  try {
    // Check if user has moderation permissions
    if (currentUser.role !== UserRole.ADMIN && currentUser.role !== UserRole.CREATOR) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Insufficient permissions to assign queue items' }),
      };
    }

    const assignmentData = body ? JSON.parse(body) : {};
    const moderatorId = assignmentData.moderatorId || currentUser.userId;

    // Find the queue item
    const scanCommand = new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'EntityType = :entityType AND queueItemId = :queueItemId',
      ExpressionAttributeValues: {
        ':entityType': 'ModerationQueueItem',
        ':queueItemId': queueItemId,
      },
    });

    const result = await dynamoClient.send(scanCommand);
    
    if (!result.Items || result.Items.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Queue item not found' }),
      };
    }

    const queueItem = result.Items[0];
    const now = new Date().toISOString();

    // Update assignment
    const updateExpression = moderatorId 
      ? 'SET assignedTo = :moderatorId, assignedAt = :assignedAt, assignedBy = :assignedBy, #status = :status'
      : 'REMOVE assignedTo, assignedAt, assignedBy SET #status = :status';

    const expressionAttributeValues: Record<string, any> = {
      ':status': moderatorId ? 'in_review' : 'pending',
    };

    const expressionAttributeNames: Record<string, string> = {
      '#status': 'status',
    };

    if (moderatorId) {
      expressionAttributeValues[':moderatorId'] = moderatorId;
      expressionAttributeValues[':assignedAt'] = now;
      expressionAttributeValues[':assignedBy'] = currentUser.userId;
    }

    const updateCommand = new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: queueItem.PK,
        SK: queueItem.SK,
      },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    });

    await dynamoClient.send(updateCommand);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: moderatorId ? 'Queue item assigned successfully' : 'Queue item unassigned successfully',
      }),
    };
  } catch (error: any) {
    console.error('Assign queue item error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to assign queue item',
        message: error.message
      }),
    };
  }
};

const handleReviewReport = async (
  reportId: string,
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

    const reviewData = JSON.parse(body);

    // Validate required fields
    if (!reviewData.status || !reviewData.resolution) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Status and resolution are required' }),
      };
    }

    // Find the report
    const scanCommand = new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'EntityType = :entityType AND reportId = :reportId',
      ExpressionAttributeValues: {
        ':entityType': 'PostReport',
        ':reportId': reportId,
      },
    });

    const result = await dynamoClient.send(scanCommand);
    
    if (!result.Items || result.Items.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Report not found' }),
      };
    }

    const report = result.Items[0];

    // Check if user can review this report
    const canReview = await canReviewReport(report, currentUser);
    if (!canReview) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Insufficient permissions to review this report' }),
      };
    }

    const now = new Date().toISOString();

    // Update the report
    const updateCommand = new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: report.PK,
        SK: report.SK,
      },
      UpdateExpression: 'SET #status = :status, resolution = :resolution, reviewedBy = :reviewedBy, reviewedAt = :reviewedAt, reviewNotes = :reviewNotes, updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':status': reviewData.status,
        ':resolution': reviewData.resolution,
        ':reviewedBy': currentUser.userId,
        ':reviewedAt': now,
        ':reviewNotes': reviewData.notes || null,
        ':updatedAt': now,
      },
      ReturnValues: 'ALL_NEW',
    });

    await dynamoClient.send(updateCommand);

    // Update GSI2PK for status change
    const updateGSICommand = new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: report.PK,
        SK: report.SK,
      },
      UpdateExpression: 'SET GSI2PK = :newStatusPK',
      ExpressionAttributeValues: {
        ':newStatusPK': `STATUS#${reviewData.status}`,
      },
    });

    await dynamoClient.send(updateGSICommand);

    // Apply moderation action if specified
    if (reviewData.action) {
      await applyModerationAction(report.postId, reviewData.action, currentUser);
    }

    // Apply user sanction if specified
    if (reviewData.userSanction) {
      await applyUserSanction(report, reviewData.userSanction, currentUser);
    }

    // Update moderation queue item status
    await updateModerationQueueItemStatus(reportId, reviewData.status);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Report reviewed successfully',
      }),
    };
  } catch (error: any) {
    console.error('Review report error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to review report',
        message: error.message
      }),
    };
  }
};

const handleGetModerationStats = async (
  queryParams: { [key: string]: string | undefined } | null,
  currentUser: any,
  headers: Record<string, string>
): Promise<APIGatewayProxyResult> => {
  try {
    // Check if user has moderation permissions
    if (currentUser.role !== UserRole.ADMIN && currentUser.role !== UserRole.CREATOR) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Insufficient permissions to view moderation stats' }),
      };
    }

    const startDate = queryParams?.startDate;
    const endDate = queryParams?.endDate;
    const discussionId = queryParams?.discussionId;

    // Get queue statistics
    const queueStats = await getModerationQueueStats(discussionId, currentUser);
    
    // Get report statistics
    const reportStats = await getReportStats(startDate, endDate, discussionId, currentUser);
    
    // Get action statistics
    const actionStats = await getActionStats(startDate, endDate, discussionId, currentUser);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        queueStats,
        reportStats,
        actionStats,
        generatedAt: new Date().toISOString(),
      }),
    };
  } catch (error: any) {
    console.error('Get moderation stats error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to get moderation stats',
        message: error.message
      }),
    };
  }
};

// Helper functions for the new handlers

const calculateReportPriority = (category: string): string => {
  const priorityMap: Record<string, string> = {
    'hate_speech': 'urgent',
    'violence': 'urgent',
    'harassment': 'high',
    'misinformation': 'high',
    'privacy': 'high',
    'spam': 'medium',
    'inappropriate': 'medium',
    'copyright': 'medium',
    'other': 'low',
  };

  return priorityMap[category] || 'low';
};

const createModerationQueueItem = async (report: any, post: any) => {
  const queueItemId = uuidv4();
  const now = new Date().toISOString();

  const queueItem = {
    PK: `MODQUEUE#${report.priority}`,
    SK: `ITEM#${now}#${queueItemId}`,
    EntityType: 'ModerationQueueItem',
    queueItemId,
    reportId: report.reportId,
    postId: report.postId,
    discussionId: report.discussionId,
    contentType: 'post',
    contentPreview: post.content?.text?.substring(0, 200) || '',
    authorId: post.authorId,
    authorDisplayName: post.authorDisplayName || post.authorId,
    reportCategory: report.category,
    reportReason: report.reason,
    reporterCount: 1,
    priority: report.priority,
    status: 'pending',
    isUrgent: report.priority === 'urgent',
    isEscalated: false,
    requiresSpecialAttention: report.priority === 'urgent',
    metadata: {
      autoDetected: false,
      similarReportsCount: 0,
      reporterHistory: {
        totalReports: 1,
        accurateReports: 0,
        falseReports: 0,
      },
    },
    createdAt: now,
    updatedAt: now,
  };

  const putCommand = new PutCommand({
    TableName: TABLE_NAME,
    Item: queueItem,
  });

  await dynamoClient.send(putCommand);
};

const canReviewReport = async (report: any, currentUser: any): Promise<boolean> => {
  // System admins can review any report
  if (currentUser.role === UserRole.ADMIN) {
    return true;
  }

  // Discussion owners can review reports for posts in their discussions
  if (currentUser.role === UserRole.CREATOR) {
    const getDiscussionCommand = new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `DISCUSSION#${report.discussionId}`,
        SK: 'METADATA',
      },
    });

    const discussionResult = await dynamoClient.send(getDiscussionCommand);
    
    if (discussionResult.Item && discussionResult.Item.ownerId === currentUser.userId) {
      return true;
    }
  }

  return false;
};

const applyModerationAction = async (postId: string, action: any, currentUser: any) => {
  // This would call the existing moderation action logic
  const moderationRequest = {
    postId,
    action: action.type,
    reason: action.reason,
  };

  // Reuse the existing handleModeratePost logic
  await handleModeratePost(JSON.stringify(moderationRequest), currentUser, {});
};

const applyUserSanction = async (report: any, sanction: any, currentUser: any) => {
  const sanctionId = uuidv4();
  const now = new Date().toISOString();

  // Calculate end date for temporary sanctions
  let endDate;
  if (sanction.type === 'temporary_suspension' && sanction.duration) {
    const endDateTime = new Date(Date.now() + (sanction.duration * 60 * 60 * 1000));
    endDate = endDateTime.toISOString();
  }

  const sanctionItem = {
    PK: `USER#${report.authorId}`,
    SK: `SANCTION#${sanctionId}`,
    GSI1PK: `MODERATOR#${currentUser.userId}`,
    GSI1SK: `SANCTION#${now}`,
    EntityType: 'UserSanction',
    sanctionId,
    userId: report.authorId,
    userDisplayName: report.authorDisplayName,
    moderatorId: currentUser.userId,
    moderatorDisplayName: currentUser.displayName || currentUser.userId,
    sanctionType: sanction.type,
    reason: sanction.reason,
    description: sanction.description,
    startDate: now,
    endDate,
    duration: sanction.duration,
    isActive: true,
    isAppealed: false,
    relatedPostId: report.postId,
    relatedReportId: report.reportId,
    previousSanctions: [],
    userNotified: false,
    createdAt: now,
    updatedAt: now,
  };

  const putCommand = new PutCommand({
    TableName: TABLE_NAME,
    Item: sanctionItem,
  });

  await dynamoClient.send(putCommand);

  // Send notification to user
  await sendSanctionNotification(sanctionItem);
};

const sendSanctionNotification = async (sanction: any) => {
  const notificationId = uuidv4();
  const notification = {
    PK: `USER#${sanction.userId}`,
    SK: `NOTIFICATION#${notificationId}`,
    GSI1PK: `USER#${sanction.userId}`,
    GSI1SK: `NOTIFICATION#${sanction.createdAt}`,
    EntityType: 'Notification',
    notificationId,
    userId: sanction.userId,
    type: 'USER_SANCTIONED',
    title: `Account ${sanction.sanctionType.replace('_', ' ')}`,
    message: `Your account has been ${sanction.sanctionType.replace('_', ' ')} for the following reason: ${sanction.reason}`,
    data: {
      sanctionId: sanction.sanctionId,
      sanctionType: sanction.sanctionType,
      reason: sanction.reason,
      endDate: sanction.endDate,
    },
    isRead: false,
    createdAt: sanction.createdAt,
  };

  const putCommand = new PutCommand({
    TableName: TABLE_NAME,
    Item: notification,
  });

  await dynamoClient.send(putCommand);
};

const updateModerationQueueItemStatus = async (reportId: string, status: string) => {
  // Find and update the queue item
  const scanCommand = new ScanCommand({
    TableName: TABLE_NAME,
    FilterExpression: 'EntityType = :entityType AND reportId = :reportId',
    ExpressionAttributeValues: {
      ':entityType': 'ModerationQueueItem',
      ':reportId': reportId,
    },
  });

  const result = await dynamoClient.send(scanCommand);
  
  if (result.Items && result.Items.length > 0) {
    const queueItem = result.Items[0];
    
    const updateCommand = new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: queueItem.PK,
        SK: queueItem.SK,
      },
      UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':status': status,
        ':updatedAt': new Date().toISOString(),
      },
    });

    await dynamoClient.send(updateCommand);
  }
};

const getModerationQueueStats = async (discussionId?: string, currentUser?: any) => {
  // Implementation for queue statistics
  const scanCommand = new ScanCommand({
    TableName: TABLE_NAME,
    FilterExpression: 'EntityType = :entityType',
    ExpressionAttributeValues: {
      ':entityType': 'ModerationQueueItem',
    },
  });

  const result = await dynamoClient.send(scanCommand);
  const items = result.Items || [];

  // Filter by discussion if specified
  const filteredItems = discussionId 
    ? items.filter(item => item.discussionId === discussionId)
    : items;

  const totalItems = filteredItems.length;
  const pendingItems = filteredItems.filter(item => item.status === 'pending').length;
  const inReviewItems = filteredItems.filter(item => item.status === 'in_review').length;

  const itemsByPriority = {
    urgent: filteredItems.filter(item => item.priority === 'urgent').length,
    high: filteredItems.filter(item => item.priority === 'high').length,
    medium: filteredItems.filter(item => item.priority === 'medium').length,
    low: filteredItems.filter(item => item.priority === 'low').length,
  };

  return {
    totalItems,
    pendingItems,
    inReviewItems,
    itemsByPriority,
    averageReviewTime: 0, // Would need to calculate from actual review times
    oldestPendingItem: filteredItems
      .filter(item => item.status === 'pending')
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0]?.createdAt,
  };
};

const getReportStats = async (startDate?: string, endDate?: string, discussionId?: string, currentUser?: any) => {
  // Implementation for report statistics
  const scanCommand = new ScanCommand({
    TableName: TABLE_NAME,
    FilterExpression: 'EntityType = :entityType',
    ExpressionAttributeValues: {
      ':entityType': 'PostReport',
    },
  });

  const result = await dynamoClient.send(scanCommand);
  let reports = result.Items || [];

  // Apply filters
  if (startDate) {
    reports = reports.filter(report => report.createdAt >= startDate);
  }
  if (endDate) {
    reports = reports.filter(report => report.createdAt <= endDate);
  }
  if (discussionId) {
    reports = reports.filter(report => report.discussionId === discussionId);
  }

  const totalReports = reports.length;
  
  const reportsByCategory = reports.reduce((acc, report) => {
    acc[report.category] = (acc[report.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const reportsByStatus = reports.reduce((acc, report) => {
    acc[report.status] = (acc[report.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const reportsByPriority = reports.reduce((acc, report) => {
    acc[report.priority] = (acc[report.priority] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    totalReports,
    reportsByCategory,
    reportsByStatus,
    reportsByPriority,
    averageResolutionTime: 0, // Would need to calculate from actual resolution times
    accuracyRate: 0, // Would need to track accuracy over time
  };
};

const getActionStats = async (startDate?: string, endDate?: string, discussionId?: string, currentUser?: any) => {
  // Implementation for action statistics
  const scanCommand = new ScanCommand({
    TableName: TABLE_NAME,
    FilterExpression: 'EntityType = :entityType',
    ExpressionAttributeValues: {
      ':entityType': 'ModerationLog',
    },
  });

  const result = await dynamoClient.send(scanCommand);
  let actions = result.Items || [];

  // Apply filters
  if (startDate) {
    actions = actions.filter(action => action.timestamp >= startDate);
  }
  if (endDate) {
    actions = actions.filter(action => action.timestamp <= endDate);
  }
  if (discussionId) {
    actions = actions.filter(action => action.discussionId === discussionId);
  }

  const totalActions = actions.length;
  
  const actionsByType = actions.reduce((acc, action) => {
    acc[action.action] = (acc[action.action] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const actionsByModerator = actions.reduce((acc, action) => {
    acc[action.moderatorId] = (acc[action.moderatorId] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const today = new Date().toISOString().split('T')[0];
  const actionsToday = actions.filter(action => action.timestamp.startsWith(today)).length;

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const actionsThisWeek = actions.filter(action => action.timestamp >= weekAgo).length;

  return {
    totalActions,
    actionsByType,
    actionsByModerator,
    actionsToday,
    actionsThisWeek,
  };
};

const formatModerationQueueItemResponse = (item: any) => ({
  queueItemId: item.queueItemId,
  reportId: item.reportId,
  postId: item.postId,
  discussionId: item.discussionId,
  contentType: item.contentType,
  contentPreview: item.contentPreview,
  authorId: item.authorId,
  authorDisplayName: item.authorDisplayName,
  reportCategory: item.reportCategory,
  reportReason: item.reportReason,
  reporterCount: item.reporterCount,
  priority: item.priority,
  status: item.status,
  assignedTo: item.assignedTo,
  assignedAt: item.assignedAt,
  assignedBy: item.assignedBy,
  isUrgent: item.isUrgent,
  isEscalated: item.isEscalated,
  requiresSpecialAttention: item.requiresSpecialAttention,
  estimatedReviewTime: item.estimatedReviewTime,
  actualReviewTime: item.actualReviewTime,
  metadata: item.metadata,
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
});

// Content Filtering Functions

const handleAnalyzeContent = async (
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

    const { content, metadata } = JSON.parse(body);

    if (!content) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Content is required' }),
      };
    }

    // Perform content analysis
    const analysisResult = await analyzeContentForInappropriateMaterial(content, metadata);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(analysisResult),
    };
  } catch (error: any) {
    console.error('Analyze content error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to analyze content',
        message: error.message
      }),
    };
  }
};

const handleSpamDetection = async (
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

    const { content, metadata } = JSON.parse(body);

    if (!content) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Content is required' }),
      };
    }

    // Perform spam detection
    const spamResult = await detectSpamContent(content, metadata);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(spamResult),
    };
  } catch (error: any) {
    console.error('Spam detection error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to detect spam',
        message: error.message
      }),
    };
  }
};

const handleProcessContent = async (
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

    const { content, metadata } = JSON.parse(body);

    if (!content) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Content is required' }),
      };
    }

    // Process content with all active filters
    const processResult = await processContentWithFilters(content, metadata);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(processResult),
    };
  } catch (error: any) {
    console.error('Process content error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to process content',
        message: error.message
      }),
    };
  }
};

const handleGetActiveFilters = async (
  currentUser: any,
  headers: Record<string, string>
): Promise<APIGatewayProxyResult> => {
  try {
    // Only admins can view filters
    if (currentUser.role !== UserRole.ADMIN) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Only administrators can view content filters' }),
      };
    }

    const scanCommand = new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'EntityType = :entityType AND isActive = :isActive',
      ExpressionAttributeValues: {
        ':entityType': 'ContentFilter',
        ':isActive': true,
      },
    });

    const result = await dynamoClient.send(scanCommand);
    const filters = result.Items || [];

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(filters.map(formatFilterResponse)),
    };
  } catch (error: any) {
    console.error('Get active filters error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to get active filters',
        message: error.message
      }),
    };
  }
};

const handleCreateFilter = async (
  body: string | null,
  currentUser: any,
  headers: Record<string, string>
): Promise<APIGatewayProxyResult> => {
  try {
    // Only admins can create filters
    if (currentUser.role !== UserRole.ADMIN) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Only administrators can create content filters' }),
      };
    }

    if (!body) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Request body is required' }),
      };
    }

    const filterData = JSON.parse(body);

    // Validate required fields
    if (!filterData.name || !filterData.type || !filterData.action) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Name, type, and action are required' }),
      };
    }

    const now = new Date().toISOString();
    const filterId = uuidv4();

    const filter = {
      PK: `FILTER#${filterId}`,
      SK: 'METADATA',
      EntityType: 'ContentFilter',
      filterId,
      name: filterData.name,
      description: filterData.description || '',
      type: filterData.type,
      pattern: filterData.pattern,
      keywords: filterData.keywords,
      modelName: filterData.modelName,
      apiEndpoint: filterData.apiEndpoint,
      action: filterData.action,
      severity: filterData.severity || 'medium',
      confidence: filterData.confidence || 0.8,
      applyToContent: filterData.applyToContent !== false,
      applyToTitles: filterData.applyToTitles !== false,
      applyToComments: filterData.applyToComments !== false,
      isActive: filterData.isActive !== false,
      isTestMode: filterData.isTestMode || false,
      stats: {
        totalMatches: 0,
        truePositives: 0,
        falsePositives: 0,
        accuracy: 0,
      },
      createdBy: currentUser.userId,
      lastModifiedBy: currentUser.userId,
      createdAt: now,
      updatedAt: now,
    };

    const putCommand = new PutCommand({
      TableName: TABLE_NAME,
      Item: filter,
    });

    await dynamoClient.send(putCommand);

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify(formatFilterResponse(filter)),
    };
  } catch (error: any) {
    console.error('Create filter error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to create filter',
        message: error.message
      }),
    };
  }
};

const handleUpdateFilter = async (
  filterId: string,
  body: string | null,
  currentUser: any,
  headers: Record<string, string>
): Promise<APIGatewayProxyResult> => {
  try {
    // Only admins can update filters
    if (currentUser.role !== UserRole.ADMIN) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Only administrators can update content filters' }),
      };
    }

    if (!body) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Request body is required' }),
      };
    }

    const updates = JSON.parse(body);
    const now = new Date().toISOString();

    // Build update expression
    let updateExpression = 'SET #updatedAt = :updatedAt, #lastModifiedBy = :lastModifiedBy';
    const expressionAttributeNames: Record<string, string> = {
      '#updatedAt': 'updatedAt',
      '#lastModifiedBy': 'lastModifiedBy',
    };
    const expressionAttributeValues: Record<string, any> = {
      ':updatedAt': now,
      ':lastModifiedBy': currentUser.userId,
    };

    // Add fields to update
    Object.keys(updates).forEach((key, index) => {
      if (key !== 'filterId' && key !== 'createdAt' && key !== 'createdBy') {
        const attrName = `#attr${index}`;
        const attrValue = `:val${index}`;
        updateExpression += `, ${attrName} = ${attrValue}`;
        expressionAttributeNames[attrName] = key;
        expressionAttributeValues[attrValue] = updates[key];
      }
    });

    const updateCommand = new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `FILTER#${filterId}`,
        SK: 'METADATA',
      },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    });

    const result = await dynamoClient.send(updateCommand);

    if (!result.Attributes) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Filter not found' }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(formatFilterResponse(result.Attributes)),
    };
  } catch (error: any) {
    console.error('Update filter error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to update filter',
        message: error.message
      }),
    };
  }
};

const handleDeleteFilter = async (
  filterId: string,
  currentUser: any,
  headers: Record<string, string>
): Promise<APIGatewayProxyResult> => {
  try {
    // Only admins can delete filters
    if (currentUser.role !== UserRole.ADMIN) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Only administrators can delete content filters' }),
      };
    }

    const deleteCommand = new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `FILTER#${filterId}`,
        SK: 'METADATA',
      },
      UpdateExpression: 'SET isActive = :isActive, #updatedAt = :updatedAt, #lastModifiedBy = :lastModifiedBy',
      ExpressionAttributeNames: {
        '#updatedAt': 'updatedAt',
        '#lastModifiedBy': 'lastModifiedBy',
      },
      ExpressionAttributeValues: {
        ':isActive': false,
        ':updatedAt': new Date().toISOString(),
        ':lastModifiedBy': currentUser.userId,
      },
      ReturnValues: 'ALL_NEW',
    });

    const result = await dynamoClient.send(deleteCommand);

    if (!result.Attributes) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Filter not found' }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'Filter deactivated successfully' }),
    };
  } catch (error: any) {
    console.error('Delete filter error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to delete filter',
        message: error.message
      }),
    };
  }
};

const handleTestFilter = async (
  filterId: string,
  body: string | null,
  currentUser: any,
  headers: Record<string, string>
): Promise<APIGatewayProxyResult> => {
  try {
    // Only admins can test filters
    if (currentUser.role !== UserRole.ADMIN) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Only administrators can test content filters' }),
      };
    }

    if (!body) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Request body is required' }),
      };
    }

    const { content } = JSON.parse(body);

    if (!content) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Content is required' }),
      };
    }

    // Get the filter
    const getCommand = new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `FILTER#${filterId}`,
        SK: 'METADATA',
      },
    });

    const result = await dynamoClient.send(getCommand);

    if (!result.Item) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Filter not found' }),
      };
    }

    const filter = result.Item;

    // Test the filter
    const testResult = await testFilterAgainstContent(filter, content);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(testResult),
    };
  } catch (error: any) {
    console.error('Test filter error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to test filter',
        message: error.message
      }),
    };
  }
};

const handleGetFilterStats = async (
  filterId: string,
  queryParams: { [key: string]: string | undefined } | null,
  currentUser: any,
  headers: Record<string, string>
): Promise<APIGatewayProxyResult> => {
  try {
    // Only admins can view filter stats
    if (currentUser.role !== UserRole.ADMIN) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Only administrators can view filter statistics' }),
      };
    }

    // Get the filter
    const getCommand = new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `FILTER#${filterId}`,
        SK: 'METADATA',
      },
    });

    const result = await dynamoClient.send(getCommand);

    if (!result.Item) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Filter not found' }),
      };
    }

    const filter = result.Item;

    // Get recent matches (this would be implemented with proper logging)
    const recentMatches = await getFilterRecentMatches(filterId, queryParams);

    const stats = {
      totalMatches: filter.stats.totalMatches,
      truePositives: filter.stats.truePositives,
      falsePositives: filter.stats.falsePositives,
      accuracy: filter.stats.accuracy,
      recentMatches,
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(stats),
    };
  } catch (error: any) {
    console.error('Get filter stats error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to get filter stats',
        message: error.message
      }),
    };
  }
};

const handleFilterFeedback = async (
  filterId: string,
  body: string | null,
  currentUser: any,
  headers: Record<string, string>
): Promise<APIGatewayProxyResult> => {
  try {
    // Only admins can provide filter feedback
    if (currentUser.role !== UserRole.ADMIN) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Only administrators can provide filter feedback' }),
      };
    }

    if (!body) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Request body is required' }),
      };
    }

    const { contentId, wasCorrect } = JSON.parse(body);

    if (contentId === undefined || wasCorrect === undefined) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Content ID and wasCorrect are required' }),
      };
    }

    // Update filter accuracy
    await updateFilterAccuracy(filterId, wasCorrect);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'Filter feedback recorded successfully' }),
    };
  } catch (error: any) {
    console.error('Filter feedback error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to record filter feedback',
        message: error.message
      }),
    };
  }
};

const handleGetFilterConfig = async (
  currentUser: any,
  headers: Record<string, string>
): Promise<APIGatewayProxyResult> => {
  try {
    // Only admins can view filter config
    if (currentUser.role !== UserRole.ADMIN) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Only administrators can view filter configuration' }),
      };
    }

    // Get filter configuration (this would be stored in a config table or parameter store)
    const config = {
      enabledFilters: [],
      strictMode: false,
      autoActionThreshold: 0.8,
      queueThreshold: 0.5,
      customKeywords: [],
      whitelistedDomains: [],
      blacklistedDomains: [],
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(config),
    };
  } catch (error: any) {
    console.error('Get filter config error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to get filter configuration',
        message: error.message
      }),
    };
  }
};

const handleUpdateFilterConfig = async (
  body: string | null,
  currentUser: any,
  headers: Record<string, string>
): Promise<APIGatewayProxyResult> => {
  try {
    // Only admins can update filter config
    if (currentUser.role !== UserRole.ADMIN) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Only administrators can update filter configuration' }),
      };
    }

    if (!body) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Request body is required' }),
      };
    }

    const configUpdates = JSON.parse(body);

    // Update filter configuration (this would update a config table or parameter store)
    const updatedConfig = {
      ...configUpdates,
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser.userId,
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(updatedConfig),
    };
  } catch (error: any) {
    console.error('Update filter config error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to update filter configuration',
        message: error.message
      }),
    };
  }
};

// Content Analysis Functions

const analyzeContentForInappropriateMaterial = async (content: string, metadata?: any) => {
  const detectedIssues: any[] = [];
  let maxSeverity: 'low' | 'medium' | 'high' = 'low';

  // Basic inappropriate content detection
  const inappropriatePatterns = [
    { pattern: /スパム|spam/gi, category: 'SPAM', severity: 'medium' },
    { pattern: /詐欺|scam|fraud/gi, category: 'MISINFORMATION', severity: 'high' },
    { pattern: /荒らし|troll|harassment/gi, category: 'HARASSMENT', severity: 'high' },
    { pattern: /誹謗中傷|差別|discrimination/gi, category: 'HATE_SPEECH', severity: 'high' },
    { pattern: /暴力|violence|脅迫|threat/gi, category: 'VIOLENCE', severity: 'high' },
  ];

  for (const { pattern, category, severity } of inappropriatePatterns) {
    const matches = content.match(pattern);
    if (matches) {
      detectedIssues.push({
        type: category,
        severity,
        confidence: 0.8,
        matchedPattern: matches[0],
        description: `不適切なコンテンツが検出されました: ${category}`,
      });
      if (severity === 'high') maxSeverity = 'high';
      else if (severity === 'medium' && maxSeverity !== 'high') maxSeverity = 'medium';
    }
  }

  const isAppropriate = detectedIssues.length === 0;
  const confidence = detectedIssues.length > 0 
    ? Math.max(...detectedIssues.map(issue => issue.confidence))
    : 0.9;

  let suggestedAction = 'allow';
  if (maxSeverity === 'high') {
    suggestedAction = 'hide';
  } else if (maxSeverity === 'medium') {
    suggestedAction = 'queue_for_review';
  } else if (detectedIssues.length > 0) {
    suggestedAction = 'flag';
  }

  return {
    isAppropriate,
    confidence,
    detectedIssues,
    suggestedAction,
    explanation: isAppropriate 
      ? 'コンテンツに問題は検出されませんでした。'
      : `${detectedIssues.length}件の問題が検出されました。`,
  };
};

const detectSpamContent = async (content: string, metadata?: any) => {
  const detectedPatterns: any[] = [];
  const reasons: string[] = [];
  let spamScore = 0;

  // Spam detection patterns
  const spamPatterns = [
    { pattern: /(.)\1{10,}/, type: 'repetitive_text', score: 30 },
    { pattern: /https?:\/\/[^\s]+/gi, type: 'excessive_links', score: 25 },
    { pattern: /\b\d{10,}\b/g, type: 'suspicious_patterns', score: 20 },
    { pattern: /[!]{5,}/g, type: 'suspicious_patterns', score: 15 },
    { pattern: /[?]{5,}/g, type: 'suspicious_patterns', score: 15 },
  ];

  for (const { pattern, type, score } of spamPatterns) {
    const matches = content.match(pattern);
    if (matches && matches.length > 0) {
      detectedPatterns.push({
        type,
        description: `疑わしいパターンが検出されました: ${type}`,
        confidence: 0.8,
      });
      reasons.push(type);
      spamScore += score;
    }
  }

  // Content length checks
  if (content.length < 10) {
    spamScore += 10;
    reasons.push('too_short');
  } else if (content.length > 5000) {
    spamScore += 15;
    reasons.push('too_long');
  }

  // Uppercase ratio check
  const upperCaseRatio = (content.match(/[A-Z]/g) || []).length / content.length;
  if (upperCaseRatio > 0.5) {
    spamScore += 20;
    reasons.push('excessive_caps');
    detectedPatterns.push({
      type: 'suspicious_patterns',
      description: '過度な大文字使用が検出されました',
      confidence: 0.7,
    });
  }

  const isSpam = spamScore >= 50;
  const confidence = Math.min(spamScore / 100, 1);

  return {
    isSpam,
    confidence,
    reasons,
    spamScore,
    detectedPatterns,
  };
};

const processContentWithFilters = async (content: string, metadata?: any) => {
  // Get active filters
  const scanCommand = new ScanCommand({
    TableName: TABLE_NAME,
    FilterExpression: 'EntityType = :entityType AND isActive = :isActive',
    ExpressionAttributeValues: {
      ':entityType': 'ContentFilter',
      ':isActive': true,
    },
  });

  const result = await dynamoClient.send(scanCommand);
  const filters = result.Items || [];

  const triggeredFilters: any[] = [];
  let shouldAllow = true;
  let action = 'allow';
  let maxConfidence = 0;
  let reason = '';

  // Test content against each filter
  for (const filter of filters) {
    const testResult = await testFilterAgainstContent(filter, content);
    
    if (testResult.matched) {
      triggeredFilters.push(testResult);
      
      if (testResult.confidence > maxConfidence) {
        maxConfidence = testResult.confidence;
        action = testResult.suggestedAction;
        reason = testResult.explanation;
      }
      
      // If any filter suggests blocking, don't allow
      if (testResult.suggestedAction !== 'allow' && testResult.suggestedAction !== 'flag') {
        shouldAllow = false;
      }
    }
  }

  return {
    shouldAllow,
    action,
    reason: shouldAllow ? undefined : reason,
    confidence: maxConfidence,
    triggeredFilters,
  };
};

const testFilterAgainstContent = async (filter: any, content: string) => {
  let matched = false;
  let confidence = 0;
  let matchedText = '';
  let explanation = '';

  switch (filter.type) {
    case 'keyword':
      if (filter.keywords && filter.keywords.length > 0) {
        const lowerContent = content.toLowerCase();
        for (const keyword of filter.keywords) {
          if (lowerContent.includes(keyword.toLowerCase())) {
            matched = true;
            confidence = filter.confidence;
            matchedText = keyword;
            explanation = `キーワード "${keyword}" がマッチしました`;
            break;
          }
        }
      }
      break;

    case 'regex':
      if (filter.pattern) {
        try {
          const regex = new RegExp(filter.pattern, 'gi');
          const matches = content.match(regex);
          if (matches && matches.length > 0) {
            matched = true;
            confidence = filter.confidence;
            matchedText = matches[0];
            explanation = `正規表現パターンがマッチしました: ${filter.pattern}`;
          }
        } catch (error) {
          console.error('Invalid regex pattern:', filter.pattern, error);
        }
      }
      break;

    case 'ml_model':
      // Placeholder for ML model integration
      explanation = 'ML model analysis not implemented';
      break;

    case 'external_api':
      // Placeholder for external API integration
      explanation = 'External API analysis not implemented';
      break;
  }

  return {
    filterId: filter.filterId,
    filterName: filter.name,
    matched,
    confidence,
    matchedText: matchedText || undefined,
    suggestedAction: matched ? filter.action : 'allow',
    explanation,
  };
};

const updateFilterAccuracy = async (filterId: string, wasCorrect: boolean) => {
  const getCommand = new GetCommand({
    TableName: TABLE_NAME,
    Key: {
      PK: `FILTER#${filterId}`,
      SK: 'METADATA',
    },
  });

  const result = await dynamoClient.send(getCommand);
  
  if (result.Item) {
    const filter = result.Item;
    const stats = filter.stats || { totalMatches: 0, truePositives: 0, falsePositives: 0, accuracy: 0 };
    
    stats.totalMatches += 1;
    if (wasCorrect) {
      stats.truePositives += 1;
    } else {
      stats.falsePositives += 1;
    }
    stats.accuracy = stats.totalMatches > 0 ? stats.truePositives / stats.totalMatches : 0;

    const updateCommand = new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `FILTER#${filterId}`,
        SK: 'METADATA',
      },
      UpdateExpression: 'SET stats = :stats, #updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#updatedAt': 'updatedAt',
      },
      ExpressionAttributeValues: {
        ':stats': stats,
        ':updatedAt': new Date().toISOString(),
      },
    });

    await dynamoClient.send(updateCommand);
  }
};

const getFilterRecentMatches = async (filterId: string, queryParams: any) => {
  // This would query a separate table or index for filter match logs
  // For now, return empty array as placeholder
  return [];
};

const formatFilterResponse = (filter: any) => ({
  filterId: filter.filterId,
  name: filter.name,
  description: filter.description,
  type: filter.type,
  pattern: filter.pattern,
  keywords: filter.keywords,
  modelName: filter.modelName,
  apiEndpoint: filter.apiEndpoint,
  action: filter.action,
  severity: filter.severity,
  confidence: filter.confidence,
  applyToContent: filter.applyToContent,
  applyToTitles: filter.applyToTitles,
  applyToComments: filter.applyToComments,
  isActive: filter.isActive,
  isTestMode: filter.isTestMode,
  stats: filter.stats,
  createdBy: filter.createdBy,
  lastModifiedBy: filter.lastModifiedBy,
  createdAt: filter.createdAt,
  updatedAt: filter.updatedAt,
});

// User Sanction Functions

const handleCreateSanction = async (
  body: string | null,
  currentUser: any,
  headers: Record<string, string>
): Promise<APIGatewayProxyResult> => {
  try {
    // Only admins can create sanctions
    if (currentUser.role !== UserRole.ADMIN) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Only administrators can create user sanctions' }),
      };
    }

    if (!body) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Request body is required' }),
      };
    }

    const sanctionData = JSON.parse(body);

    // Validate required fields
    if (!sanctionData.userId || !sanctionData.sanctionType || !sanctionData.reason) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'User ID, sanction type, and reason are required' }),
      };
    }

    const sanctionId = uuidv4();
    const now = new Date().toISOString();

    // Calculate end date for temporary sanctions
    let endDate;
    if (sanctionData.sanctionType === 'temporary_suspension' && sanctionData.duration) {
      const endDateTime = new Date(Date.now() + (sanctionData.duration * 60 * 60 * 1000));
      endDate = endDateTime.toISOString();
    }

    // Get user display name
    let userDisplayName = sanctionData.userId;
    try {
      const userProfile = await getUserProfile(sanctionData.userId);
      userDisplayName = userProfile?.displayName || sanctionData.userId;
    } catch (error) {
      console.warn('Could not get user display name:', error);
    }

    // Get previous sanctions for this user
    const previousSanctions = await getUserPreviousSanctions(sanctionData.userId);

    const sanctionItem = {
      PK: `USER#${sanctionData.userId}`,
      SK: `SANCTION#${sanctionId}`,
      GSI1PK: `MODERATOR#${currentUser.userId}`,
      GSI1SK: `SANCTION#${now}`,
      EntityType: 'UserSanction',
      sanctionId,
      userId: sanctionData.userId,
      userDisplayName,
      moderatorId: currentUser.userId,
      moderatorDisplayName: currentUser.displayName || currentUser.userId,
      sanctionType: sanctionData.sanctionType,
      reason: sanctionData.reason,
      description: sanctionData.description,
      startDate: now,
      endDate,
      duration: sanctionData.duration,
      isActive: true,
      isAppealed: false,
      relatedPostId: sanctionData.relatedPostId,
      relatedReportId: sanctionData.relatedReportId,
      previousSanctions: previousSanctions.map(s => s.sanctionId),
      userNotified: false,
      createdAt: now,
      updatedAt: now,
    };

    const putCommand = new PutCommand({
      TableName: TABLE_NAME,
      Item: sanctionItem,
    });

    await dynamoClient.send(putCommand);

    // Send notification to user
    await sendSanctionNotification(sanctionItem);

    // Mark as notified
    await markSanctionAsNotified(sanctionId, 'both');

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        message: 'User sanction created successfully',
        sanction: formatSanctionResponse(sanctionItem),
      }),
    };
  } catch (error: any) {
    console.error('Create sanction error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to create sanction',
        message: error.message
      }),
    };
  }
};

const handleGetAllSanctions = async (
  queryParams: { [key: string]: string | undefined } | null,
  currentUser: any,
  headers: Record<string, string>
): Promise<APIGatewayProxyResult> => {
  try {
    // Only admins can view all sanctions
    if (currentUser.role !== UserRole.ADMIN) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Only administrators can view all sanctions' }),
      };
    }

    const sanctionType = queryParams?.sanctionType;
    const isActive = queryParams?.isActive;
    const isAppealed = queryParams?.isAppealed;
    const moderatorId = queryParams?.moderatorId;
    const limit = queryParams?.limit ? parseInt(queryParams.limit) : 20;
    const lastEvaluatedKey = queryParams?.lastEvaluatedKey ? JSON.parse(queryParams.lastEvaluatedKey) : undefined;

    let queryCommand;

    if (moderatorId) {
      // Query by moderator
      queryCommand = new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :moderatorPK',
        ExpressionAttributeValues: {
          ':moderatorPK': `MODERATOR#${moderatorId}`,
        },
        Limit: limit,
        ExclusiveStartKey: lastEvaluatedKey,
        ScanIndexForward: false,
      });
    } else {
      // Scan all sanctions
      queryCommand = new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: 'EntityType = :entityType',
        ExpressionAttributeValues: {
          ':entityType': 'UserSanction',
        },
        Limit: limit,
        ExclusiveStartKey: lastEvaluatedKey,
      });
    }

    const result = await dynamoClient.send(queryCommand);
    let sanctions = result.Items || [];

    // Apply additional filters
    if (sanctionType) {
      sanctions = sanctions.filter(sanction => sanction.sanctionType === sanctionType);
    }

    if (isActive !== undefined) {
      const activeFilter = isActive === 'true';
      sanctions = sanctions.filter(sanction => sanction.isActive === activeFilter);
    }

    if (isAppealed !== undefined) {
      const appealedFilter = isAppealed === 'true';
      sanctions = sanctions.filter(sanction => sanction.isAppealed === appealedFilter);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        sanctions: sanctions.map(formatSanctionResponse),
        lastEvaluatedKey: result.LastEvaluatedKey,
        count: sanctions.length,
      }),
    };
  } catch (error: any) {
    console.error('Get all sanctions error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to get sanctions',
        message: error.message
      }),
    };
  }
};

const handleGetUserSanctions = async (
  userId: string,
  queryParams: { [key: string]: string | undefined } | null,
  currentUser: any,
  headers: Record<string, string>
): Promise<APIGatewayProxyResult> => {
  try {
    // Users can view their own sanctions, admins can view any user's sanctions
    if (currentUser.role !== UserRole.ADMIN && currentUser.userId !== userId) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Insufficient permissions to view user sanctions' }),
      };
    }

    const sanctionType = queryParams?.sanctionType;
    const isActive = queryParams?.isActive;
    const isAppealed = queryParams?.isAppealed;
    const limit = queryParams?.limit ? parseInt(queryParams.limit) : 20;

    const queryCommand = new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :userPK AND begins_with(SK, :sanctionPrefix)',
      ExpressionAttributeValues: {
        ':userPK': `USER#${userId}`,
        ':sanctionPrefix': 'SANCTION#',
      },
      Limit: limit,
      ScanIndexForward: false, // Most recent first
    });

    const result = await dynamoClient.send(queryCommand);
    let sanctions = result.Items || [];

    // Apply filters
    if (sanctionType) {
      sanctions = sanctions.filter(sanction => sanction.sanctionType === sanctionType);
    }

    if (isActive !== undefined) {
      const activeFilter = isActive === 'true';
      sanctions = sanctions.filter(sanction => sanction.isActive === activeFilter);
    }

    if (isAppealed !== undefined) {
      const appealedFilter = isAppealed === 'true';
      sanctions = sanctions.filter(sanction => sanction.isAppealed === appealedFilter);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        userId,
        sanctions: sanctions.map(formatSanctionResponse),
        count: sanctions.length,
      }),
    };
  } catch (error: any) {
    console.error('Get user sanctions error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to get user sanctions',
        message: error.message
      }),
    };
  }
};

const handleGetSanction = async (
  sanctionId: string,
  currentUser: any,
  headers: Record<string, string>
): Promise<APIGatewayProxyResult> => {
  try {
    // Find the sanction
    const scanCommand = new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'EntityType = :entityType AND sanctionId = :sanctionId',
      ExpressionAttributeValues: {
        ':entityType': 'UserSanction',
        ':sanctionId': sanctionId,
      },
    });

    const result = await dynamoClient.send(scanCommand);
    
    if (!result.Items || result.Items.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Sanction not found' }),
      };
    }

    const sanction = result.Items[0];

    // Check permissions
    if (currentUser.role !== UserRole.ADMIN && currentUser.userId !== sanction.userId) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Insufficient permissions to view this sanction' }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(formatSanctionResponse(sanction)),
    };
  } catch (error: any) {
    console.error('Get sanction error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to get sanction',
        message: error.message
      }),
    };
  }
};

const handleRevokeSanction = async (
  sanctionId: string,
  body: string | null,
  currentUser: any,
  headers: Record<string, string>
): Promise<APIGatewayProxyResult> => {
  try {
    // Only admins can revoke sanctions
    if (currentUser.role !== UserRole.ADMIN) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Only administrators can revoke sanctions' }),
      };
    }

    if (!body) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Request body is required' }),
      };
    }

    const { reason } = JSON.parse(body);

    if (!reason) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Revocation reason is required' }),
      };
    }

    // Find the sanction
    const scanCommand = new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'EntityType = :entityType AND sanctionId = :sanctionId',
      ExpressionAttributeValues: {
        ':entityType': 'UserSanction',
        ':sanctionId': sanctionId,
      },
    });

    const result = await dynamoClient.send(scanCommand);
    
    if (!result.Items || result.Items.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Sanction not found' }),
      };
    }

    const sanction = result.Items[0];

    if (!sanction.isActive) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Sanction is already inactive' }),
      };
    }

    const now = new Date().toISOString();

    // Update the sanction
    const updateCommand = new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: sanction.PK,
        SK: sanction.SK,
      },
      UpdateExpression: 'SET isActive = :isActive, revokedBy = :revokedBy, revokedAt = :revokedAt, revocationReason = :revocationReason, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':isActive': false,
        ':revokedBy': currentUser.userId,
        ':revokedAt': now,
        ':revocationReason': reason,
        ':updatedAt': now,
      },
      ReturnValues: 'ALL_NEW',
    });

    const updateResult = await dynamoClient.send(updateCommand);

    // Send notification to user
    await sendSanctionRevocationNotification(updateResult.Attributes!);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Sanction revoked successfully',
        sanction: formatSanctionResponse(updateResult.Attributes!),
      }),
    };
  } catch (error: any) {
    console.error('Revoke sanction error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to revoke sanction',
        message: error.message
      }),
    };
  }
};

const handleAppealSanction = async (
  sanctionId: string,
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

    const { appealReason } = JSON.parse(body);

    if (!appealReason) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Appeal reason is required' }),
      };
    }

    // Find the sanction
    const scanCommand = new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'EntityType = :entityType AND sanctionId = :sanctionId',
      ExpressionAttributeValues: {
        ':entityType': 'UserSanction',
        ':sanctionId': sanctionId,
      },
    });

    const result = await dynamoClient.send(scanCommand);
    
    if (!result.Items || result.Items.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Sanction not found' }),
      };
    }

    const sanction = result.Items[0];

    // Check if user can appeal this sanction
    if (currentUser.userId !== sanction.userId) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'You can only appeal your own sanctions' }),
      };
    }

    if (!sanction.isActive) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Cannot appeal an inactive sanction' }),
      };
    }

    if (sanction.isAppealed) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'This sanction has already been appealed' }),
      };
    }

    const now = new Date().toISOString();

    // Update the sanction with appeal information
    const updateCommand = new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: sanction.PK,
        SK: sanction.SK,
      },
      UpdateExpression: 'SET isAppealed = :isAppealed, appealedAt = :appealedAt, appealReason = :appealReason, appealStatus = :appealStatus, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':isAppealed': true,
        ':appealedAt': now,
        ':appealReason': appealReason,
        ':appealStatus': 'pending',
        ':updatedAt': now,
      },
      ReturnValues: 'ALL_NEW',
    });

    const updateResult = await dynamoClient.send(updateCommand);

    // Send notification to moderators
    await sendAppealNotificationToModerators(updateResult.Attributes!);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Appeal submitted successfully',
        sanction: formatSanctionResponse(updateResult.Attributes!),
      }),
    };
  } catch (error: any) {
    console.error('Appeal sanction error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to submit appeal',
        message: error.message
      }),
    };
  }
};

const handleReviewAppeal = async (
  sanctionId: string,
  body: string | null,
  currentUser: any,
  headers: Record<string, string>
): Promise<APIGatewayProxyResult> => {
  try {
    // Only admins can review appeals
    if (currentUser.role !== UserRole.ADMIN) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Only administrators can review appeals' }),
      };
    }

    if (!body) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Request body is required' }),
      };
    }

    const { approved, reviewNotes } = JSON.parse(body);

    if (approved === undefined) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Approval decision is required' }),
      };
    }

    // Find the sanction
    const scanCommand = new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'EntityType = :entityType AND sanctionId = :sanctionId',
      ExpressionAttributeValues: {
        ':entityType': 'UserSanction',
        ':sanctionId': sanctionId,
      },
    });

    const result = await dynamoClient.send(scanCommand);
    
    if (!result.Items || result.Items.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Sanction not found' }),
      };
    }

    const sanction = result.Items[0];

    if (!sanction.isAppealed || sanction.appealStatus !== 'pending') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No pending appeal found for this sanction' }),
      };
    }

    const now = new Date().toISOString();
    const appealStatus = approved ? 'approved' : 'denied';

    // Update the sanction with appeal review
    let updateExpression = 'SET appealStatus = :appealStatus, appealReviewedBy = :appealReviewedBy, appealReviewedAt = :appealReviewedAt, updatedAt = :updatedAt';
    const expressionAttributeValues: Record<string, any> = {
      ':appealStatus': appealStatus,
      ':appealReviewedBy': currentUser.userId,
      ':appealReviewedAt': now,
      ':updatedAt': now,
    };

    if (reviewNotes) {
      updateExpression += ', appealReviewNotes = :appealReviewNotes';
      expressionAttributeValues[':appealReviewNotes'] = reviewNotes;
    }

    // If appeal is approved, deactivate the sanction
    if (approved) {
      updateExpression += ', isActive = :isActive';
      expressionAttributeValues[':isActive'] = false;
    }

    const updateCommand = new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: sanction.PK,
        SK: sanction.SK,
      },
      UpdateExpression: updateExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    });

    const updateResult = await dynamoClient.send(updateCommand);

    // Send notification to user
    await sendAppealReviewNotification(updateResult.Attributes!);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: `Appeal ${appealStatus} successfully`,
        sanction: formatSanctionResponse(updateResult.Attributes!),
      }),
    };
  } catch (error: any) {
    console.error('Review appeal error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to review appeal',
        message: error.message
      }),
    };
  }
};

const handleNotifyUser = async (
  sanctionId: string,
  body: string | null,
  currentUser: any,
  headers: Record<string, string>
): Promise<APIGatewayProxyResult> => {
  try {
    // Only admins can manually send notifications
    if (currentUser.role !== UserRole.ADMIN) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Only administrators can send notifications' }),
      };
    }

    const { method = 'both' } = body ? JSON.parse(body) : {};

    // Find the sanction
    const scanCommand = new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'EntityType = :entityType AND sanctionId = :sanctionId',
      ExpressionAttributeValues: {
        ':entityType': 'UserSanction',
        ':sanctionId': sanctionId,
      },
    });

    const result = await dynamoClient.send(scanCommand);
    
    if (!result.Items || result.Items.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Sanction not found' }),
      };
    }

    const sanction = result.Items[0];

    // Send notification
    await sendSanctionNotification(sanction);

    // Mark as notified
    await markSanctionAsNotified(sanctionId, method);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'User notification sent successfully',
      }),
    };
  } catch (error: any) {
    console.error('Notify user error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to send notification',
        message: error.message
      }),
    };
  }
};

const handleGetUserSanctionStatus = async (
  userId: string,
  currentUser: any,
  headers: Record<string, string>
): Promise<APIGatewayProxyResult> => {
  try {
    // Users can check their own status, admins can check any user's status
    if (currentUser.role !== UserRole.ADMIN && currentUser.userId !== userId) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Insufficient permissions to check user sanction status' }),
      };
    }

    // Get active sanctions for the user
    const queryCommand = new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :userPK AND begins_with(SK, :sanctionPrefix)',
      FilterExpression: 'isActive = :isActive',
      ExpressionAttributeValues: {
        ':userPK': `USER#${userId}`,
        ':sanctionPrefix': 'SANCTION#',
        ':isActive': true,
      },
    });

    const result = await dynamoClient.send(queryCommand);
    const activeSanctions = result.Items || [];

    const isSanctioned = activeSanctions.length > 0;
    let highestSanctionType;
    let canPost = true;
    let canCreateDiscussion = true;
    let restrictionEndDate;

    if (isSanctioned) {
      // Determine the highest severity sanction
      const sanctionSeverity = {
        'warning': 1,
        'temporary_suspension': 2,
        'permanent_ban': 3,
      };

      const highestSanction = activeSanctions.reduce((highest, current) => {
        const currentSeverity = sanctionSeverity[current.sanctionType as keyof typeof sanctionSeverity] || 0;
        const highestSeverity = sanctionSeverity[highest.sanctionType as keyof typeof sanctionSeverity] || 0;
        return currentSeverity > highestSeverity ? current : highest;
      });

      highestSanctionType = highestSanction.sanctionType;

      // Determine restrictions based on highest sanction
      switch (highestSanctionType) {
        case 'warning':
          // Warnings don't restrict functionality
          break;
        case 'temporary_suspension':
          canPost = false;
          canCreateDiscussion = false;
          restrictionEndDate = highestSanction.endDate;
          break;
        case 'permanent_ban':
          canPost = false;
          canCreateDiscussion = false;
          break;
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        userId,
        isSanctioned,
        activeSanctions: activeSanctions.map(formatSanctionResponse),
        highestSanctionType,
        canPost,
        canCreateDiscussion,
        restrictionEndDate,
      }),
    };
  } catch (error: any) {
    console.error('Get user sanction status error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to get user sanction status',
        message: error.message
      }),
    };
  }
};

const handleGetUserSanctionHistory = async (
  userId: string,
  currentUser: any,
  headers: Record<string, string>
): Promise<APIGatewayProxyResult> => {
  try {
    // Only admins can view detailed sanction history
    if (currentUser.role !== UserRole.ADMIN) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Only administrators can view detailed sanction history' }),
      };
    }

    // Get all sanctions for the user
    const queryCommand = new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :userPK AND begins_with(SK, :sanctionPrefix)',
      ExpressionAttributeValues: {
        ':userPK': `USER#${userId}`,
        ':sanctionPrefix': 'SANCTION#',
      },
      ScanIndexForward: false, // Most recent first
    });

    const result = await dynamoClient.send(queryCommand);
    const sanctions = result.Items || [];

    const totalSanctions = sanctions.length;
    const activeSanctions = sanctions.filter(s => s.isActive).length;
    const lastSanctionDate = sanctions.length > 0 ? sanctions[0].createdAt : undefined;

    // Calculate risk level based on sanction history
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    const recentSanctions = sanctions.filter(s => {
      const sanctionDate = new Date(s.createdAt);
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      return sanctionDate > thirtyDaysAgo;
    });

    if (recentSanctions.length >= 3) {
      riskLevel = 'high';
    } else if (recentSanctions.length >= 2 || activeSanctions > 0) {
      riskLevel = 'medium';
    }

    // Calculate sanction frequency (sanctions per month)
    const sanctionFrequency = totalSanctions > 0 && lastSanctionDate
      ? totalSanctions / Math.max(1, (Date.now() - new Date(lastSanctionDate).getTime()) / (30 * 24 * 60 * 60 * 1000))
      : 0;

    // Get user display name
    let userDisplayName = userId;
    try {
      const userProfile = await getUserProfile(userId);
      userDisplayName = userProfile?.displayName || userId;
    } catch (error) {
      console.warn('Could not get user display name:', error);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        userId,
        userDisplayName,
        totalSanctions,
        activeSanctions,
        sanctions: sanctions.map(formatSanctionResponse),
        riskLevel,
        lastSanctionDate,
        sanctionFrequency: Math.round(sanctionFrequency * 100) / 100,
      }),
    };
  } catch (error: any) {
    console.error('Get user sanction history error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to get user sanction history',
        message: error.message
      }),
    };
  }
};

const handleGetSanctionStats = async (
  queryParams: { [key: string]: string | undefined } | null,
  currentUser: any,
  headers: Record<string, string>
): Promise<APIGatewayProxyResult> => {
  try {
    // Only admins can view sanction statistics
    if (currentUser.role !== UserRole.ADMIN) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Only administrators can view sanction statistics' }),
      };
    }

    const startDate = queryParams?.startDate;
    const endDate = queryParams?.endDate;
    const moderatorId = queryParams?.moderatorId;
    const sanctionType = queryParams?.sanctionType;

    // Get all sanctions
    const scanCommand = new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'EntityType = :entityType',
      ExpressionAttributeValues: {
        ':entityType': 'UserSanction',
      },
    });

    const result = await dynamoClient.send(scanCommand);
    let sanctions = result.Items || [];

    // Apply filters
    if (startDate) {
      sanctions = sanctions.filter(sanction => sanction.createdAt >= startDate);
    }
    if (endDate) {
      sanctions = sanctions.filter(sanction => sanction.createdAt <= endDate);
    }
    if (moderatorId) {
      sanctions = sanctions.filter(sanction => sanction.moderatorId === moderatorId);
    }
    if (sanctionType) {
      sanctions = sanctions.filter(sanction => sanction.sanctionType === sanctionType);
    }

    const totalSanctions = sanctions.length;
    const activeSanctions = sanctions.filter(s => s.isActive).length;

    const sanctionsByType = sanctions.reduce((acc, sanction) => {
      acc[sanction.sanctionType] = (acc[sanction.sanctionType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const today = new Date().toISOString().split('T')[0];
    const sanctionsToday = sanctions.filter(s => s.createdAt.startsWith(today)).length;

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const sanctionsThisWeek = sanctions.filter(s => s.createdAt >= weekAgo).length;

    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const sanctionsThisMonth = sanctions.filter(s => s.createdAt >= monthAgo).length;

    const appealedSanctions = sanctions.filter(s => s.isAppealed);
    const appealRate = totalSanctions > 0 ? (appealedSanctions.length / totalSanctions) * 100 : 0;

    const approvedAppeals = appealedSanctions.filter(s => s.appealStatus === 'approved');
    const appealSuccessRate = appealedSanctions.length > 0 ? (approvedAppeals.length / appealedSanctions.length) * 100 : 0;

    const temporarySanctions = sanctions.filter(s => s.sanctionType === 'temporary_suspension' && s.duration);
    const averageSanctionDuration = temporarySanctions.length > 0
      ? temporarySanctions.reduce((sum, s) => sum + (s.duration || 0), 0) / temporarySanctions.length
      : 0;

    const topReasons = Object.entries(
      sanctions.reduce((acc, sanction) => {
        acc[sanction.reason] = (acc[sanction.reason] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    )
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([reason, count]) => ({ reason, count }));

    // Generate trend data (last 30 days)
    const sanctionTrends = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const daySanctions = sanctions.filter(s => s.createdAt.startsWith(date));
      
      const typeBreakdown = daySanctions.reduce((acc, sanction) => {
        acc[sanction.sanctionType] = (acc[sanction.sanctionType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      Object.entries(typeBreakdown).forEach(([type, count]) => {
        sanctionTrends.push({ date, count, type });
      });
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        totalSanctions,
        sanctionsByType,
        activeSanctions,
        sanctionsToday,
        sanctionsThisWeek,
        sanctionsThisMonth,
        appealRate: Math.round(appealRate * 100) / 100,
        appealSuccessRate: Math.round(appealSuccessRate * 100) / 100,
        averageSanctionDuration: Math.round(averageSanctionDuration * 100) / 100,
        topReasons,
        sanctionTrends,
      }),
    };
  } catch (error: any) {
    console.error('Get sanction stats error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to get sanction statistics',
        message: error.message
      }),
    };
  }
};

const handleGetExpiringSanctions = async (
  queryParams: { [key: string]: string | undefined } | null,
  currentUser: any,
  headers: Record<string, string>
): Promise<APIGatewayProxyResult> => {
  try {
    // Only admins can view expiring sanctions
    if (currentUser.role !== UserRole.ADMIN) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Only administrators can view expiring sanctions' }),
      };
    }

    const hoursAhead = queryParams?.hoursAhead ? parseInt(queryParams.hoursAhead) : 24;
    const futureTime = new Date(Date.now() + hoursAhead * 60 * 60 * 1000).toISOString();

    // Get active temporary sanctions
    const scanCommand = new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'EntityType = :entityType AND isActive = :isActive AND sanctionType = :sanctionType AND endDate <= :futureTime',
      ExpressionAttributeValues: {
        ':entityType': 'UserSanction',
        ':isActive': true,
        ':sanctionType': 'temporary_suspension',
        ':futureTime': futureTime,
      },
    });

    const result = await dynamoClient.send(scanCommand);
    const expiringSanctions = result.Items || [];

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        hoursAhead,
        sanctions: expiringSanctions.map(formatSanctionResponse),
        count: expiringSanctions.length,
      }),
    };
  } catch (error: any) {
    console.error('Get expiring sanctions error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to get expiring sanctions',
        message: error.message
      }),
    };
  }
};

const handleGetSanctionsByModerator = async (
  moderatorId: string,
  queryParams: { [key: string]: string | undefined } | null,
  currentUser: any,
  headers: Record<string, string>
): Promise<APIGatewayProxyResult> => {
  try {
    // Only admins can view sanctions by moderator
    if (currentUser.role !== UserRole.ADMIN) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Only administrators can view sanctions by moderator' }),
      };
    }

    const sanctionType = queryParams?.sanctionType;
    const isActive = queryParams?.isActive;
    const limit = queryParams?.limit ? parseInt(queryParams.limit) : 20;

    const queryCommand = new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :moderatorPK',
      ExpressionAttributeValues: {
        ':moderatorPK': `MODERATOR#${moderatorId}`,
      },
      Limit: limit,
      ScanIndexForward: false, // Most recent first
    });

    const result = await dynamoClient.send(queryCommand);
    let sanctions = result.Items || [];

    // Apply filters
    if (sanctionType) {
      sanctions = sanctions.filter(sanction => sanction.sanctionType === sanctionType);
    }

    if (isActive !== undefined) {
      const activeFilter = isActive === 'true';
      sanctions = sanctions.filter(sanction => sanction.isActive === activeFilter);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        moderatorId,
        sanctions: sanctions.map(formatSanctionResponse),
        count: sanctions.length,
      }),
    };
  } catch (error: any) {
    console.error('Get sanctions by moderator error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to get sanctions by moderator',
        message: error.message
      }),
    };
  }
};

const handleProcessAutomatedSanctions = async (
  userId: string,
  body: string | null,
  currentUser: any,
  headers: Record<string, string>
): Promise<APIGatewayProxyResult> => {
  try {
    // Only admins can process automated sanctions
    if (currentUser.role !== UserRole.ADMIN) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Only administrators can process automated sanctions' }),
      };
    }

    if (!body) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Request body is required' }),
      };
    }

    const { context } = JSON.parse(body);

    // This would implement automated sanction rules
    // For now, return empty results
    const sanctionsApplied: any[] = [];
    const rulesTriggered: string[] = [];

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        userId,
        sanctionsApplied,
        rulesTriggered,
        message: 'Automated sanctions processed successfully',
      }),
    };
  } catch (error: any) {
    console.error('Process automated sanctions error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to process automated sanctions',
        message: error.message
      }),
    };
  }
};

// Helper functions for sanctions

const getUserProfile = async (userId: string) => {
  const getCommand = new GetCommand({
    TableName: TABLE_NAME,
    Key: {
      PK: `USER#${userId}`,
      SK: 'PROFILE',
    },
  });

  const result = await dynamoClient.send(getCommand);
  return result.Item;
};

const getUserPreviousSanctions = async (userId: string) => {
  const queryCommand = new QueryCommand({
    TableName: TABLE_NAME,
    KeyConditionExpression: 'PK = :userPK AND begins_with(SK, :sanctionPrefix)',
    ExpressionAttributeValues: {
      ':userPK': `USER#${userId}`,
      ':sanctionPrefix': 'SANCTION#',
    },
  });

  const result = await dynamoClient.send(queryCommand);
  return result.Items || [];
};

const sendSanctionRevocationNotification = async (sanction: any) => {
  const notificationId = uuidv4();
  const notification = {
    PK: `USER#${sanction.userId}`,
    SK: `NOTIFICATION#${notificationId}`,
    GSI1PK: `USER#${sanction.userId}`,
    GSI1SK: `NOTIFICATION#${sanction.updatedAt}`,
    EntityType: 'Notification',
    notificationId,
    userId: sanction.userId,
    type: 'SANCTION_REVOKED',
    title: 'Sanction Revoked',
    message: `Your ${sanction.sanctionType.replace('_', ' ')} has been revoked. Reason: ${sanction.revocationReason}`,
    data: {
      sanctionId: sanction.sanctionId,
      sanctionType: sanction.sanctionType,
      revocationReason: sanction.revocationReason,
    },
    isRead: false,
    createdAt: sanction.updatedAt,
  };

  const putCommand = new PutCommand({
    TableName: TABLE_NAME,
    Item: notification,
  });

  await dynamoClient.send(putCommand);
};

const sendAppealNotificationToModerators = async (sanction: any) => {
  // This would send notifications to all moderators
  // For now, just log the appeal
  console.log('Appeal submitted for sanction:', sanction.sanctionId);
};

const sendAppealReviewNotification = async (sanction: any) => {
  const notificationId = uuidv4();
  const notification = {
    PK: `USER#${sanction.userId}`,
    SK: `NOTIFICATION#${notificationId}`,
    GSI1PK: `USER#${sanction.userId}`,
    GSI1SK: `NOTIFICATION#${sanction.updatedAt}`,
    EntityType: 'Notification',
    notificationId,
    userId: sanction.userId,
    type: 'APPEAL_REVIEWED',
    title: `Appeal ${sanction.appealStatus}`,
    message: `Your appeal for the ${sanction.sanctionType.replace('_', ' ')} has been ${sanction.appealStatus}.${sanction.appealReviewNotes ? ` Notes: ${sanction.appealReviewNotes}` : ''}`,
    data: {
      sanctionId: sanction.sanctionId,
      sanctionType: sanction.sanctionType,
      appealStatus: sanction.appealStatus,
      appealReviewNotes: sanction.appealReviewNotes,
    },
    isRead: false,
    createdAt: sanction.updatedAt,
  };

  const putCommand = new PutCommand({
    TableName: TABLE_NAME,
    Item: notification,
  });

  await dynamoClient.send(putCommand);
};

const markSanctionAsNotified = async (sanctionId: string, method: string) => {
  const now = new Date().toISOString();

  // Find and update the sanction
  const scanCommand = new ScanCommand({
    TableName: TABLE_NAME,
    FilterExpression: 'EntityType = :entityType AND sanctionId = :sanctionId',
    ExpressionAttributeValues: {
      ':entityType': 'UserSanction',
      ':sanctionId': sanctionId,
    },
  });

  const result = await dynamoClient.send(scanCommand);
  
  if (result.Items && result.Items.length > 0) {
    const sanction = result.Items[0];
    
    const updateCommand = new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: sanction.PK,
        SK: sanction.SK,
      },
      UpdateExpression: 'SET userNotified = :userNotified, notifiedAt = :notifiedAt, notificationMethod = :notificationMethod, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':userNotified': true,
        ':notifiedAt': now,
        ':notificationMethod': method,
        ':updatedAt': now,
      },
    });

    await dynamoClient.send(updateCommand);
  }
};

const formatSanctionResponse = (sanction: any) => ({
  sanctionId: sanction.sanctionId,
  userId: sanction.userId,
  userDisplayName: sanction.userDisplayName,
  moderatorId: sanction.moderatorId,
  moderatorDisplayName: sanction.moderatorDisplayName,
  sanctionType: sanction.sanctionType,
  reason: sanction.reason,
  description: sanction.description,
  startDate: sanction.startDate,
  endDate: sanction.endDate,
  duration: sanction.duration,
  isActive: sanction.isActive,
  isAppealed: sanction.isAppealed,
  appealedAt: sanction.appealedAt,
  appealReason: sanction.appealReason,
  appealStatus: sanction.appealStatus,
  appealReviewedBy: sanction.appealReviewedBy,
  appealReviewedAt: sanction.appealReviewedAt,
  appealReviewNotes: sanction.appealReviewNotes,
  relatedPostId: sanction.relatedPostId,
  relatedReportId: sanction.relatedReportId,
  previousSanctions: sanction.previousSanctions,
  userNotified: sanction.userNotified,
  notifiedAt: sanction.notifiedAt,
  notificationMethod: sanction.notificationMethod,
  revokedBy: sanction.revokedBy,
  revokedAt: sanction.revokedAt,
  revocationReason: sanction.revocationReason,
  createdAt: sanction.createdAt,
  updatedAt: sanction.updatedAt,
});
  