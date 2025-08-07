// Post management Lambda function
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand,
  TransactWriteCommand
} from '@aws-sdk/lib-dynamodb';
import {
  CognitoIdentityProviderClient,
  GetUserCommand
} from '@aws-sdk/client-cognito-identity-provider';
import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand
} from '@aws-sdk/client-apigatewaymanagementapi';
import { v4 as uuidv4 } from 'uuid';

// Initialize AWS clients
const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION }));
const cognitoClient = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION });

const TABLE_NAME = process.env.TABLE_NAME!;
const WEBSOCKET_API_ENDPOINT = process.env.WEBSOCKET_API_ENDPOINT;

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

enum ReactionType {
  LIKE = 'like',
  AGREE = 'agree',
  DISAGREE = 'disagree',
  INSIGHTFUL = 'insightful'
}

interface TextFormatting {
  bold?: boolean;
  fontSize?: 'small' | 'medium' | 'large';
}

interface CreatePostRequest {
  discussionId: string;
  discussionPointId: string;
  content: {
    text: string;
    formatting?: TextFormatting;
    attachments?: string[];
  };
  stance: Stance;
  replyToId?: string;
}

interface UpdatePostRequest {
  content?: {
    text: string;
    formatting?: TextFormatting;
    attachments?: string[];
  };
  stance?: Stance;
}

interface PostFilters {
  discussionId?: string;
  discussionPointId?: string;
  authorId?: string;
  stance?: Stance;
  hasAttachments?: boolean;
  sortBy?: 'createdAt' | 'updatedAt' | 'reactionCount';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  lastEvaluatedKey?: any;
}

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('Post Lambda - Event:', JSON.stringify(event, null, 2));

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Content-Type': 'application/json',
  };

  try {
    const { httpMethod, body, pathParameters, queryStringParameters, headers: requestHeaders } = event;

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

    switch (httpMethod) {
      case 'GET':
        if (pathParameters?.proxy) {
          const pathParts = pathParameters.proxy.split('/');
          const postId = pathParts[0];

          if (pathParts.length === 1) {
            return handleGetPost(postId, currentUser, headers);
          } else if (pathParts[1] === 'reactions') {
            return handleGetPostReactions(postId, currentUser, headers);
          } else if (pathParts[1] === 'replies') {
            return handleGetPostReplies(postId, currentUser, headers);
          }
        } else {
          const sanitizedQueryParams: { [key: string]: string } | null =
            queryStringParameters
              ? Object.entries(queryStringParameters).reduce((acc, [key, value]) => {
                if (value !== undefined) {
                  acc[key] = value;
                }
                return acc;
              }, {} as { [key: string]: string })
              : null;

          return handleGetPosts(sanitizedQueryParams, currentUser, headers);
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

        if (currentUser.role === UserRole.VIEWER) {
          return {
            statusCode: 403,
            headers,
            body: JSON.stringify({ error: 'Insufficient permissions. Post creation requires contributor role or higher.' }),
          };
        }

        if (pathParameters?.proxy) {
          const pathParts = pathParameters.proxy.split('/');
          const postId = pathParts[0];

          if (pathParts[1] === 'reactions') {
            return handleAddReaction(postId, body, currentUser, headers);
          }
        } else {
          return handleCreatePost(body, currentUser, headers);
        }
        break;

      case 'PUT':
        if (!currentUser) {
          return {
            statusCode: 401,
            headers,
            body: JSON.stringify({ error: 'Authentication required' }),
          };
        }

        if (pathParameters?.proxy) {
          const postId = pathParameters.proxy.split('/')[0];
          return handleUpdatePost(postId, body, currentUser, headers);
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
          const pathParts = pathParameters.proxy.split('/');
          const postId = pathParts[0];

          if (pathParts[1] === 'reactions') {
            return handleRemoveReaction(postId, currentUser, headers);
          } else {
            return handleDeletePost(postId, currentUser, headers);
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
    console.error('Post Lambda Error:', error);
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

const handleGetPosts = async (
  queryParams: { [key: string]: string } | null,
  currentUser: any,
  headers: Record<string, string>
): Promise<APIGatewayProxyResult> => {
  try {
    const filters: PostFilters = {
      discussionId: queryParams?.discussionId,
      discussionPointId: queryParams?.discussionPointId,
      authorId: queryParams?.authorId,
      stance: queryParams?.stance as Stance,
      hasAttachments: queryParams?.hasAttachments === 'true',
      sortBy: queryParams?.sortBy as any || 'createdAt',
      sortOrder: queryParams?.sortOrder as 'asc' | 'desc' || 'desc',
      limit: queryParams?.limit ? parseInt(queryParams.limit) : 20,
      lastEvaluatedKey: queryParams?.lastEvaluatedKey ? JSON.parse(queryParams.lastEvaluatedKey) : undefined,
    };

    let queryCommand;

    if (filters.discussionId && filters.discussionPointId) {
      // Query posts by discussion point using GSI1
      queryCommand = new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pointPK',
        ExpressionAttributeValues: {
          ':pointPK': `POINT#${filters.discussionPointId}`,
        },
        Limit: filters.limit,
        ExclusiveStartKey: filters.lastEvaluatedKey,
        ScanIndexForward: filters.sortOrder === 'asc',
      });
    } else if (filters.discussionId) {
      // Query posts by discussion
      queryCommand = new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :discussionPK AND begins_with(SK, :postPrefix)',
        ExpressionAttributeValues: {
          ':discussionPK': `DISCUSSION#${filters.discussionId}`,
          ':postPrefix': 'POST#',
        },
        Limit: filters.limit,
        ExclusiveStartKey: filters.lastEvaluatedKey,
        ScanIndexForward: filters.sortOrder === 'asc',
      });
    } else if (filters.authorId) {
      // Query posts by author using GSI2
      queryCommand = new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'GSI2',
        KeyConditionExpression: 'GSI2PK = :authorPK',
        ExpressionAttributeValues: {
          ':authorPK': `AUTHOR#${filters.authorId}`,
        },
        Limit: filters.limit,
        ExclusiveStartKey: filters.lastEvaluatedKey,
        ScanIndexForward: filters.sortOrder === 'asc',
      });
    } else {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Either discussionId or authorId is required' }),
      };
    }

    const result = await dynamoClient.send(queryCommand);
    let posts = result.Items || [];

    // Apply additional filters
    if (filters.stance) {
      posts = posts.filter(post => post.stance === filters.stance);
    }

    if (filters.hasAttachments !== undefined) {
      posts = posts.filter(post => {
        const hasAttachments = post.content?.attachments && post.content.attachments.length > 0;
        return filters.hasAttachments ? hasAttachments : !hasAttachments;
      });
    }

    // Check access to each post's discussion
    const accessiblePosts = [];
    for (const post of posts) {
      if (await hasPostAccess(post, currentUser)) {
        accessiblePosts.push(await formatPostResponse(post));
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        posts: accessiblePosts,
        lastEvaluatedKey: result.LastEvaluatedKey,
        count: accessiblePosts.length,
      }),
    };
  } catch (error: any) {
    console.error('Get posts error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to get posts',
        message: error.message
      }),
    };
  }
};

const handleGetPost = async (
  postId: string,
  currentUser: any,
  headers: Record<string, string>
): Promise<APIGatewayProxyResult> => {
  try {
    // We need to find the post by scanning since we don't know the discussion ID
    const scanCommand = new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'EntityType = :entityType AND postId = :postId',
      ExpressionAttributeValues: {
        ':entityType': 'Post',
        ':postId': postId,
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

    // Check access control
    if (!(await hasPostAccess(post, currentUser))) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Access denied to this post' }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        post: await formatPostResponse(post),
      }),
    };
  } catch (error: any) {
    console.error('Get post error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to get post',
        message: error.message
      }),
    };
  }
};

const handleGetPostReactions = async (
  postId: string,
  currentUser: any,
  headers: Record<string, string>
): Promise<APIGatewayProxyResult> => {
  try {
    // Find the post first to get the discussion ID
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

    // Check access control
    if (!(await hasPostAccess(post, currentUser))) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Access denied to this post' }),
      };
    }

    // Get reactions
    const queryCommand = new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :postPK AND begins_with(SK, :reactionPrefix)',
      ExpressionAttributeValues: {
        ':postPK': `POST#${postId}`,
        ':reactionPrefix': 'REACTION#',
      },
    });

    const result = await dynamoClient.send(queryCommand);
    const reactions = result.Items || [];

    // Group reactions by type
    const reactionSummary: Record<string, { count: number; users: string[] }> = {};

    reactions.forEach(reaction => {
      const type = reaction.reactionType;
      if (!reactionSummary[type]) {
        reactionSummary[type] = { count: 0, users: [] };
      }
      reactionSummary[type].count++;
      reactionSummary[type].users.push(reaction.userId);
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        reactions: reactionSummary,
        userReaction: currentUser ? reactions.find(r => r.userId === currentUser.userId)?.reactionType : null,
      }),
    };
  } catch (error: any) {
    console.error('Get post reactions error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to get post reactions',
        message: error.message
      }),
    };
  }
};

const handleGetPostReplies = async (
  postId: string,
  currentUser: any,
  headers: Record<string, string>
): Promise<APIGatewayProxyResult> => {
  try {
    // Find the post first to get the discussion ID
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

    // Check access control
    if (!(await hasPostAccess(post, currentUser))) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Access denied to this post' }),
      };
    }

    // Get replies
    const queryCommand = new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :discussionPK AND begins_with(SK, :postPrefix)',
      FilterExpression: 'replyToId = :replyToId',
      ExpressionAttributeValues: {
        ':discussionPK': `DISCUSSION#${post.discussionId}`,
        ':postPrefix': 'POST#',
        ':replyToId': postId,
      },
    });

    const result = await dynamoClient.send(queryCommand);
    const replies = result.Items || [];

    const formattedReplies = [];
    for (const reply of replies) {
      if (await hasPostAccess(reply, currentUser)) {
        formattedReplies.push(await formatPostResponse(reply));
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        replies: formattedReplies,
        count: formattedReplies.length,
      }),
    };
  } catch (error: any) {
    console.error('Get post replies error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to get post replies',
        message: error.message
      }),
    };
  }
};

const handleCreatePost = async (
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

    const request: CreatePostRequest = JSON.parse(body);

    // Validate required fields
    if (!request.discussionId || !request.discussionPointId || !request.content?.text || !request.stance) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Discussion ID, discussion point ID, content text, and stance are required' }),
      };
    }

    // Check if user has access to the discussion
    const discussionAccess = await checkDiscussionAccess(request.discussionId, currentUser);
    if (!discussionAccess.hasAccess) {
      return {
        statusCode: discussionAccess.statusCode,
        headers,
        body: JSON.stringify({ error: discussionAccess.error }),
      };
    }

    // Verify discussion point exists
    const pointCheck = await verifyDiscussionPoint(request.discussionId, request.discussionPointId);
    if (!pointCheck.exists) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Discussion point not found' }),
      };
    }

    // If replying to another post, verify it exists
    if (request.replyToId) {
      const replyToCheck = await verifyPostExists(request.discussionId, request.replyToId);
      if (!replyToCheck.exists) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Reply target post not found' }),
        };
      }
    }

    const postId = uuidv4();
    const now = new Date().toISOString();

    const postItem = {
      PK: `DISCUSSION#${request.discussionId}`,
      SK: `POST#${postId}`,
      GSI1PK: `POINT#${request.discussionPointId}`,
      GSI1SK: `POST#${now}`,
      GSI2PK: `AUTHOR#${currentUser.userId}`,
      GSI2SK: `POST#${now}`,
      EntityType: 'Post',
      postId,
      discussionId: request.discussionId,
      discussionPointId: request.discussionPointId,
      authorId: currentUser.userId,
      content: request.content,
      stance: request.stance,
      replyToId: request.replyToId,
      reactions: {},
      moderation: {
        isHidden: false,
        isDeleted: false,
      },
      metadata: {
        createdAt: now,
        updatedAt: now,
        isEdited: false,
      },
    };

    // Create the post and update discussion metadata in a transaction
    const transactItems = [
      {
        Put: {
          TableName: TABLE_NAME,
          Item: postItem,
        },
      },
      {
        Update: {
          TableName: TABLE_NAME,
          Key: {
            PK: `DISCUSSION#${request.discussionId}`,
            SK: 'METADATA',
          },
          UpdateExpression: 'ADD #metadata.#postCount :increment SET #metadata.#updatedAt = :updatedAt',
          ExpressionAttributeNames: {
            '#metadata': 'metadata',
            '#postCount': 'postCount',
            '#updatedAt': 'updatedAt',
          },
          ExpressionAttributeValues: {
            ':increment': 1,
            ':updatedAt': now,
          },
        },
      },
    ];

    const transactCommand = new TransactWriteCommand({
      TransactItems: transactItems,
    });

    await dynamoClient.send(transactCommand);

    // Broadcast the new post to discussion participants
    await broadcastNewPost(postItem);

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        message: 'Post created successfully',
        post: await formatPostResponse(postItem),
      }),
    };
  } catch (error: any) {
    console.error('Create post error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to create post',
        message: error.message
      }),
    };
  }
};

const handleUpdatePost = async (
  postId: string,
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

    // Find the post
    const scanCommand = new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'EntityType = :entityType AND postId = :postId',
      ExpressionAttributeValues: {
        ':entityType': 'Post',
        ':postId': postId,
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

    // Check ownership or admin permission
    if (post.authorId !== currentUser.userId && currentUser.role !== UserRole.ADMIN) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Only the post author or admin can update this post' }),
      };
    }

    // Check if post is deleted
    if (post.moderation?.isDeleted) {
      return {
        statusCode: 410,
        headers,
        body: JSON.stringify({ error: 'Post has been deleted' }),
      };
    }

    const request: UpdatePostRequest = JSON.parse(body);
    const now = new Date().toISOString();

    // Build update expression
    const updateExpression = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    if (request.content) {
      updateExpression.push('#content = :content');
      expressionAttributeNames['#content'] = 'content';
      expressionAttributeValues[':content'] = request.content;
    }

    if (request.stance) {
      updateExpression.push('#stance = :stance');
      expressionAttributeNames['#stance'] = 'stance';
      expressionAttributeValues[':stance'] = request.stance;
    }

    // Always update the metadata
    updateExpression.push('#metadata.#updatedAt = :updatedAt', '#metadata.#isEdited = :isEdited');
    expressionAttributeNames['#metadata'] = 'metadata';
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeNames['#isEdited'] = 'isEdited';
    expressionAttributeValues[':updatedAt'] = now;
    expressionAttributeValues[':isEdited'] = true;

    if (updateExpression.length === 2) { // Only metadata updates
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No valid fields to update' }),
      };
    }

    const updateCommand = new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: post.PK,
        SK: post.SK,
      },
      UpdateExpression: `SET ${updateExpression.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    });

    const updateResult = await dynamoClient.send(updateCommand);

    // Broadcast the post update to discussion participants
    await broadcastPostUpdate(updateResult.Attributes!);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Post updated successfully',
        post: await formatPostResponse(updateResult.Attributes!),
      }),
    };
  } catch (error: any) {
    console.error('Update post error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to update post',
        message: error.message
      }),
    };
  }
};

const handleDeletePost = async (
  postId: string,
  currentUser: any,
  headers: Record<string, string>
): Promise<APIGatewayProxyResult> => {
  try {
    // Find the post
    const scanCommand = new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'EntityType = :entityType AND postId = :postId',
      ExpressionAttributeValues: {
        ':entityType': 'Post',
        ':postId': postId,
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

    // Check ownership, discussion ownership, or admin permission
    const isAuthor = post.authorId === currentUser.userId;
    const isAdmin = currentUser.role === UserRole.ADMIN;

    // Check if user is discussion owner
    const discussionOwnerCheck = await checkDiscussionOwnership(post.discussionId, currentUser.userId);
    const isDiscussionOwner = discussionOwnerCheck.isOwner;

    if (!isAuthor && !isDiscussionOwner && !isAdmin) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Only the post author, discussion owner, or admin can delete this post' }),
      };
    }

    const now = new Date().toISOString();

    // Mark as deleted instead of actually deleting
    const updateCommand = new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: post.PK,
        SK: post.SK,
      },
      UpdateExpression: 'SET #moderation.#isDeleted = :isDeleted, #moderation.#deletedBy = :deletedBy, #moderation.#deletedAt = :deletedAt, #metadata.#updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#moderation': 'moderation',
        '#isDeleted': 'isDeleted',
        '#deletedBy': 'deletedBy',
        '#deletedAt': 'deletedAt',
        '#metadata': 'metadata',
        '#updatedAt': 'updatedAt',
      },
      ExpressionAttributeValues: {
        ':isDeleted': true,
        ':deletedBy': currentUser.userId,
        ':deletedAt': now,
        ':updatedAt': now,
      },
    });

    await dynamoClient.send(updateCommand);

    // Update discussion post count
    const updateDiscussionCommand = new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `DISCUSSION#${post.discussionId}`,
        SK: 'METADATA',
      },
      UpdateExpression: 'ADD #metadata.#postCount :decrement SET #metadata.#updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#metadata': 'metadata',
        '#postCount': 'postCount',
        '#updatedAt': 'updatedAt',
      },
      ExpressionAttributeValues: {
        ':decrement': -1,
        ':updatedAt': now,
      },
    });

    await dynamoClient.send(updateDiscussionCommand);

    // Broadcast the post deletion to discussion participants
    await broadcastPostDeletion(postId, post.discussionId);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Post deleted successfully',
        postId,
        discussionId: post.discussionId,
      }),
    };
  } catch (error: any) {
    console.error('Delete post error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to delete post',
        message: error.message
      }),
    };
  }
};

const handleAddReaction = async (
  postId: string,
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

    const { reactionType } = JSON.parse(body);

    if (!reactionType || !Object.values(ReactionType).includes(reactionType)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Valid reaction type is required' }),
      };
    }

    // Find the post
    const scanCommand = new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'EntityType = :entityType AND postId = :postId',
      ExpressionAttributeValues: {
        ':entityType': 'Post',
        ':postId': postId,
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

    // Check access control
    if (!(await hasPostAccess(post, currentUser))) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Access denied to this post' }),
      };
    }

    const now = new Date().toISOString();

    // Add or update reaction
    const reactionItem = {
      PK: `POST#${postId}`,
      SK: `REACTION#${currentUser.userId}`,
      EntityType: 'PostReaction',
      postId,
      userId: currentUser.userId,
      reactionType,
      createdAt: now,
    };

    const putCommand = new PutCommand({
      TableName: TABLE_NAME,
      Item: reactionItem,
    });

    await dynamoClient.send(putCommand);

    // Broadcast the reaction change to discussion participants
    const reactionData = {
      postId,
      userId: currentUser.userId,
      reactionType,
      action: 'add',
    };
    await broadcastPostReaction(postId, post.discussionId, reactionData);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Reaction added successfully',
        post,
        reactionData,
      }),
    };
  } catch (error: any) {
    console.error('Add reaction error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to add reaction',
        message: error.message
      }),
    };
  }
};

const handleRemoveReaction = async (
  postId: string,
  currentUser: any,
  headers: Record<string, string>
): Promise<APIGatewayProxyResult> => {
  try {
    const deleteCommand = new DeleteCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `POST#${postId}`,
        SK: `REACTION#${currentUser.userId}`,
      },
    });

    await dynamoClient.send(deleteCommand);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Reaction removed successfully',
        postId,
        userId: currentUser.userId,
      }),
    };
  } catch (error: any) {
    console.error('Remove reaction error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to remove reaction',
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

const hasPostAccess = async (post: any, currentUser: any): Promise<boolean> => {
  // Check if post is hidden and user is not the author, discussion owner, or admin
  if (post.moderation?.isHidden) {
    if (!currentUser) return false;

    const isAuthor = post.authorId === currentUser.userId;
    const isAdmin = currentUser.role === UserRole.ADMIN;

    if (!isAuthor && !isAdmin) {
      // Check if user is discussion owner
      const discussionOwnerCheck = await checkDiscussionOwnership(post.discussionId, currentUser.userId);
      if (!discussionOwnerCheck.isOwner) {
        return false;
      }
    }
  }

  // Check if post is deleted
  if (post.moderation?.isDeleted) {
    return false;
  }

  // Check discussion access
  return await hasDiscussionAccess(post.discussionId, currentUser);
};

const hasDiscussionAccess = async (discussionId: string, currentUser: any): Promise<boolean> => {
  const getCommand = new GetCommand({
    TableName: TABLE_NAME,
    Key: {
      PK: `DISCUSSION#${discussionId}`,
      SK: 'METADATA',
    },
  });

  const result = await dynamoClient.send(getCommand);

  if (!result.Item) {
    return false;
  }

  const discussion = result.Item;

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

  const hasAccess = await hasDiscussionAccess(discussionId, currentUser);

  if (!hasAccess) {
    return {
      hasAccess: false,
      statusCode: 403,
      error: 'Access denied to this discussion',
    };
  }

  return {
    hasAccess: true,
    statusCode: 200,
    discussion: result.Item,
  };
};

const checkDiscussionOwnership = async (discussionId: string, userId: string) => {
  const getCommand = new GetCommand({
    TableName: TABLE_NAME,
    Key: {
      PK: `DISCUSSION#${discussionId}`,
      SK: 'METADATA',
    },
  });

  const result = await dynamoClient.send(getCommand);

  return {
    isOwner: result.Item?.ownerId === userId,
    discussion: result.Item,
  };
};

const verifyDiscussionPoint = async (discussionId: string, pointId: string) => {
  const getCommand = new GetCommand({
    TableName: TABLE_NAME,
    Key: {
      PK: `DISCUSSION#${discussionId}`,
      SK: `POINT#${pointId}`,
    },
  });

  const result = await dynamoClient.send(getCommand);

  return {
    exists: !!result.Item,
    point: result.Item,
  };
};

const verifyPostExists = async (discussionId: string, postId: string) => {
  const getCommand = new GetCommand({
    TableName: TABLE_NAME,
    Key: {
      PK: `DISCUSSION#${discussionId}`,
      SK: `POST#${postId}`,
    },
  });

  const result = await dynamoClient.send(getCommand);

  return {
    exists: !!result.Item,
    post: result.Item,
  };
};

const formatPostResponse = async (post: any) => {
  // Get reaction count
  const reactionQuery = new QueryCommand({
    TableName: TABLE_NAME,
    KeyConditionExpression: 'PK = :postPK AND begins_with(SK, :reactionPrefix)',
    ExpressionAttributeValues: {
      ':postPK': `POST#${post.postId}`,
      ':reactionPrefix': 'REACTION#',
    },
  });

  const reactionResult = await dynamoClient.send(reactionQuery);
  const reactions = reactionResult.Items || [];

  const reactionCounts: Record<string, number> = {};
  reactions.forEach(reaction => {
    const type = reaction.reactionType;
    reactionCounts[type] = (reactionCounts[type] || 0) + 1;
  });

  return {
    id: post.postId,
    discussionId: post.discussionId,
    discussionPointId: post.discussionPointId,
    authorId: post.authorId,
    content: post.content,
    stance: post.stance,
    replyToId: post.replyToId,
    reactionCounts,
    moderation: post.moderation,
    metadata: post.metadata,
    createdAt: post.metadata?.createdAt,
    updatedAt: post.metadata?.updatedAt,
    isEdited: post.metadata?.isEdited || false,
  };
};

// Real-time broadcasting functions
const broadcastToDiscussion = async (
  discussionId: string,
  message: any,
  excludeConnectionId?: string
): Promise<void> => {
  if (!WEBSOCKET_API_ENDPOINT) {
    console.log('WebSocket API endpoint not configured, skipping broadcast');
    return;
  }

  try {
    const apiGatewayClient = new ApiGatewayManagementApiClient({
      endpoint: WEBSOCKET_API_ENDPOINT,
    });

    // Get all connections subscribed to this discussion
    const result = await dynamoClient.send(new QueryCommand({
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
        await apiGatewayClient.send(new PostToConnectionCommand({
          ConnectionId: connection.connectionId,
          Data: JSON.stringify(message),
        }));
      } catch (error: any) {
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
};

const cleanupStaleConnection = async (connectionId: string, discussionId?: string): Promise<void> => {
  try {
    console.log(`Cleaning up stale connection: ${connectionId}`);

    // Delete main connection record
    await dynamoClient.send(new DeleteCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `CONNECTION#${connectionId}`,
        SK: 'METADATA',
      },
    }));

    // Delete discussion subscription if provided
    if (discussionId) {
      await dynamoClient.send(new DeleteCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `DISCUSSION#${discussionId}`,
          SK: `CONNECTION#${connectionId}`,
        },
      }));

      await dynamoClient.send(new DeleteCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `CONNECTION#${connectionId}`,
          SK: `DISCUSSION#${discussionId}`,
        },
      }));
    }

    // Find and delete any user-connection mappings
    const userConnections = await dynamoClient.send(new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'EntityType = :type AND connectionId = :connId',
      ExpressionAttributeValues: {
        ':type': 'UserConnection',
        ':connId': connectionId,
      },
    }));

    if (userConnections.Items) {
      const deletePromises = userConnections.Items.map(item =>
        dynamoClient.send(new DeleteCommand({
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
};

const broadcastNewPost = async (post: any): Promise<void> => {
  const message = {
    action: 'new_post',
    data: {
      post: await formatPostResponse(post),
    },
    timestamp: new Date().toISOString(),
    metadata: {
      action: 'create',
      discussionId: post.discussionId,
      discussionPointId: post.discussionPointId,
      authorId: post.authorId,
    }
  };

  await broadcastToDiscussion(post.discussionId, message);
};

const broadcastPostUpdate = async (post: any): Promise<void> => {
  const message = {
    action: 'post_updated',
    data: {
      post: await formatPostResponse(post),
    },
    timestamp: new Date().toISOString(),
    metadata: {
      action: 'update',
      discussionId: post.discussionId,
      discussionPointId: post.discussionPointId,
      authorId: post.authorId,
    }
  };

  await broadcastToDiscussion(post.discussionId, message);
};

const broadcastPostDeletion = async (postId: string, discussionId: string): Promise<void> => {
  const message = {
    action: 'post_deleted',
    data: {
      postId,
      discussionId,
    },
    timestamp: new Date().toISOString(),
    metadata: {
      action: 'delete',
      discussionId,
    }
  };

  await broadcastToDiscussion(discussionId, message);
};

const broadcastPostReaction = async (postId: string, discussionId: string, reactionData: any): Promise<void> => {
  const message = {
    action: 'post_reaction_changed',
    data: {
      postId,
      discussionId,
      reactionData,
    },
    timestamp: new Date().toISOString(),
    metadata: {
      action: 'reaction',
      discussionId,
    }
  };

  await broadcastToDiscussion(discussionId, message);
};

const broadcastPostVisibilityChange = async (postId: string, discussionId: string, isHidden: boolean, reason?: string): Promise<void> => {
  const message = {
    action: 'post_visibility_changed',
    data: {
      postId,
      discussionId,
      isHidden,
      reason,
    },
    timestamp: new Date().toISOString(),
    metadata: {
      action: 'visibility_change',
      discussionId,
    }
  };

  await broadcastToDiscussion(discussionId, message);
};