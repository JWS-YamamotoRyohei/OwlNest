import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const TABLE_NAME = process.env.TABLE_NAME!;

interface SearchOptions {
  query?: string;
  filters?: Record<string, any>;
  sort?: {
    field: string;
    direction: 'asc' | 'desc';
  };
  pagination?: {
    limit?: number;
    nextToken?: string;
  };
  facets?: boolean;
  highlight?: boolean;
}

interface SearchResult<T> {
  items: T[];
  totalCount: number;
  searchTime: number;
  hasMore: boolean;
  nextToken?: string;
  facets?: SearchFacets;
}

interface SearchFacets {
  categories: Array<{ category: string; count: number }>;
  stances: Array<{ stance: string; count: number }>;
  authors: Array<{ authorId: string; authorName: string; count: number }>;
  dateRanges: Array<{ range: string; count: number }>;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Content-Type': 'application/json'
};

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('Search Lambda invoked:', JSON.stringify(event, null, 2));

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  try {
    const path = event.path;
    const method = event.httpMethod;

    if (path.includes('/search/discussions') && method === 'POST') {
      return await searchDiscussions(event);
    } else if (path.includes('/search/posts') && method === 'POST') {
      return await searchPosts(event);
    } else if (path.includes('/search/suggestions') && method === 'GET') {
      return await getSearchSuggestions(event);
    } else if (path.includes('/search/popular') && method === 'GET') {
      return await getPopularSearches(event);
    } else if (path.includes('/search/saved')) {
      return await handleSavedSearches(event);
    }

    return {
      statusCode: 404,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Not found' })
    };
  } catch (error) {
    console.error('Search error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};

async function searchDiscussions(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const startTime = Date.now();
  const options: SearchOptions = JSON.parse(event.body || '{}');
  
  try {
    // Build query parameters
    const queryParams: any = {
      TableName: TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :entityType',
      ExpressionAttributeValues: {
        ':entityType': 'DISCUSSION'
      },
      Limit: options.pagination?.limit || 20
    };

    // Add filters
    const filterExpressions: string[] = [];
    const attributeValues: Record<string, any> = { ...queryParams.ExpressionAttributeValues };
    const attributeNames: Record<string, string> = {};

    // Text search in title and description
    if (options.query) {
      filterExpressions.push('(contains(title, :query) OR contains(description, :query))');
      attributeValues[':query'] = options.query;
    }

    // Category filter
    if (options.filters?.categories?.length) {
      const categoryConditions = options.filters.categories.map((cat: string, index: number) => {
        attributeValues[`:cat${index}`] = cat;
        return `contains(categories, :cat${index})`;
      });
      filterExpressions.push(`(${categoryConditions.join(' OR ')})`);
    }

    // Owner stance filter
    if (options.filters?.ownerStance) {
      filterExpressions.push('ownerStance = :ownerStance');
      attributeValues[':ownerStance'] = options.filters.ownerStance;
    }

    // Status filters
    if (options.filters?.isActive !== undefined) {
      filterExpressions.push('isActive = :isActive');
      attributeValues[':isActive'] = options.filters.isActive;
    }

    if (options.filters?.isPinned !== undefined) {
      filterExpressions.push('isPinned = :isPinned');
      attributeValues[':isPinned'] = options.filters.isPinned;
    }

    if (options.filters?.isFeatured !== undefined) {
      filterExpressions.push('isFeatured = :isFeatured');
      attributeValues[':isFeatured'] = options.filters.isFeatured;
    }

    if (options.filters?.isLocked !== undefined) {
      filterExpressions.push('isLocked = :isLocked');
      attributeValues[':isLocked'] = options.filters.isLocked;
    }

    // Date range filters
    if (options.filters?.createdAfter) {
      filterExpressions.push('createdAt >= :createdAfter');
      attributeValues[':createdAfter'] = options.filters.createdAfter;
    }

    if (options.filters?.createdBefore) {
      filterExpressions.push('createdAt <= :createdBefore');
      attributeValues[':createdBefore'] = options.filters.createdBefore;
    }

    if (options.filters?.lastActivityAfter) {
      filterExpressions.push('lastActivityAt >= :lastActivityAfter');
      attributeValues[':lastActivityAfter'] = options.filters.lastActivityAfter;
    }

    if (options.filters?.lastActivityBefore) {
      filterExpressions.push('lastActivityAt <= :lastActivityBefore');
      attributeValues[':lastActivityBefore'] = options.filters.lastActivityBefore;
    }

    // Participant count range
    if (options.filters?.minParticipants !== undefined) {
      filterExpressions.push('statistics.participantCount >= :minParticipants');
      attributeValues[':minParticipants'] = options.filters.minParticipants;
    }

    if (options.filters?.maxParticipants !== undefined) {
      filterExpressions.push('statistics.participantCount <= :maxParticipants');
      attributeValues[':maxParticipants'] = options.filters.maxParticipants;
    }

    // Post count range
    if (options.filters?.minPosts !== undefined) {
      filterExpressions.push('statistics.postCount >= :minPosts');
      attributeValues[':minPosts'] = options.filters.minPosts;
    }

    if (options.filters?.maxPosts !== undefined) {
      filterExpressions.push('statistics.postCount <= :maxPosts');
      attributeValues[':maxPosts'] = options.filters.maxPosts;
    }

    // Owner filter
    if (options.filters?.ownerId) {
      filterExpressions.push('ownerId = :ownerId');
      attributeValues[':ownerId'] = options.filters.ownerId;
    }

    // Apply filters
    if (filterExpressions.length > 0) {
      queryParams.FilterExpression = filterExpressions.join(' AND ');
    }

    queryParams.ExpressionAttributeValues = attributeValues;
    
    if (Object.keys(attributeNames).length > 0) {
      queryParams.ExpressionAttributeNames = attributeNames;
    }

    // Add pagination
    if (options.pagination?.nextToken) {
      queryParams.ExclusiveStartKey = JSON.parse(
        Buffer.from(options.pagination.nextToken, 'base64').toString()
      );
    }

    // Execute query
    const command = new QueryCommand(queryParams);
    const result = await docClient.send(command);

    // Transform results
    const items = (result.Items || []).map(item => ({
      discussionId: item.discussionId,
      title: item.title,
      description: item.description,
      ownerId: item.ownerId,
      ownerDisplayName: item.ownerDisplayName,
      ownerStance: item.ownerStance,
      categories: item.categories || [],
      tags: item.tags || [],
      isActive: item.isActive,
      isLocked: item.isLocked,
      isPinned: item.isPinned,
      isFeatured: item.isFeatured,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      lastActivityAt: item.lastActivityAt || item.updatedAt,
      statistics: {
        participantCount: item.statistics?.participantCount || 0,
        postCount: item.statistics?.postCount || 0,
        prosCount: item.statistics?.prosCount || 0,
        consCount: item.statistics?.consCount || 0,
        neutralCount: item.statistics?.neutralCount || 0,
        followersCount: item.statistics?.followersCount || 0
      }
    }));

    // Generate facets if requested
    let facets: SearchFacets | undefined;
    if (options.facets) {
      facets = await generateDiscussionFacets(items);
    }

    const searchResult: SearchResult<any> = {
      items,
      totalCount: result.Count || 0,
      searchTime: Date.now() - startTime,
      hasMore: !!result.LastEvaluatedKey,
      nextToken: result.LastEvaluatedKey 
        ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64')
        : undefined,
      facets
    };

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        data: searchResult
      })
    };
  } catch (error) {
    console.error('Discussion search error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        error: {
          code: 'SEARCH_ERROR',
          message: 'Failed to search discussions'
        }
      })
    };
  }
}

async function searchPosts(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const startTime = Date.now();
  const options: SearchOptions = JSON.parse(event.body || '{}');
  
  try {
    // Build scan parameters for posts (more complex querying needed)
    const scanParams: any = {
      TableName: TABLE_NAME,
      FilterExpression: 'EntityType = :entityType',
      ExpressionAttributeValues: {
        ':entityType': 'POST'
      },
      Limit: options.pagination?.limit || 20
    };

    const filterExpressions: string[] = ['EntityType = :entityType'];
    const attributeValues: Record<string, any> = { ':entityType': 'POST' };

    // Text search in content
    if (options.query) {
      filterExpressions.push('contains(content.#text, :query)');
      attributeValues[':query'] = options.query;
      scanParams.ExpressionAttributeNames = { '#text': 'text' };
    }

    // Discussion filter
    if (options.filters?.discussionId) {
      filterExpressions.push('discussionId = :discussionId');
      attributeValues[':discussionId'] = options.filters.discussionId;
    }

    // Author filter
    if (options.filters?.authorId) {
      filterExpressions.push('authorId = :authorId');
      attributeValues[':authorId'] = options.filters.authorId;
    }

    // Stance filter
    if (options.filters?.stance) {
      filterExpressions.push('stance = :stance');
      attributeValues[':stance'] = options.filters.stance;
    }

    // Content filters
    if (options.filters?.hasAttachments !== undefined) {
      if (options.filters.hasAttachments) {
        filterExpressions.push('size(content.attachments) > :zero');
        attributeValues[':zero'] = 0;
      } else {
        filterExpressions.push('size(content.attachments) = :zero');
        attributeValues[':zero'] = 0;
      }
    }

    if (options.filters?.hasLinks !== undefined) {
      if (options.filters.hasLinks) {
        filterExpressions.push('size(content.links) > :zero');
        attributeValues[':zero'] = 0;
      } else {
        filterExpressions.push('size(content.links) = :zero');
        attributeValues[':zero'] = 0;
      }
    }

    if (options.filters?.isReply !== undefined) {
      if (options.filters.isReply) {
        filterExpressions.push('attribute_exists(replyToId)');
      } else {
        filterExpressions.push('attribute_not_exists(replyToId)');
      }
    }

    // Date filters
    if (options.filters?.createdAfter) {
      filterExpressions.push('createdAt >= :createdAfter');
      attributeValues[':createdAfter'] = options.filters.createdAfter;
    }

    if (options.filters?.createdBefore) {
      filterExpressions.push('createdAt <= :createdBefore');
      attributeValues[':createdBefore'] = options.filters.createdBefore;
    }

    // Reaction count filters
    if (options.filters?.minReactions !== undefined) {
      filterExpressions.push('reactions.totalCount >= :minReactions');
      attributeValues[':minReactions'] = options.filters.minReactions;
    }

    if (options.filters?.maxReactions !== undefined) {
      filterExpressions.push('reactions.totalCount <= :maxReactions');
      attributeValues[':maxReactions'] = options.filters.maxReactions;
    }

    // Reply count filters
    if (options.filters?.minReplies !== undefined) {
      filterExpressions.push('replyCount >= :minReplies');
      attributeValues[':minReplies'] = options.filters.minReplies;
    }

    if (options.filters?.maxReplies !== undefined) {
      filterExpressions.push('replyCount <= :maxReplies');
      attributeValues[':maxReplies'] = options.filters.maxReplies;
    }

    // Moderation filters
    if (options.filters?.isHidden !== undefined) {
      filterExpressions.push('moderation.isHidden = :isHidden');
      attributeValues[':isHidden'] = options.filters.isHidden;
    }

    if (options.filters?.isDeleted !== undefined) {
      filterExpressions.push('moderation.isDeleted = :isDeleted');
      attributeValues[':isDeleted'] = options.filters.isDeleted;
    }

    scanParams.FilterExpression = filterExpressions.join(' AND ');
    scanParams.ExpressionAttributeValues = attributeValues;

    // Add pagination
    if (options.pagination?.nextToken) {
      scanParams.ExclusiveStartKey = JSON.parse(
        Buffer.from(options.pagination.nextToken, 'base64').toString()
      );
    }

    // Execute scan
    const command = new ScanCommand(scanParams);
    const result = await docClient.send(command);

    // Transform results
    const items = (result.Items || []).map(item => ({
      postId: item.postId,
      discussionId: item.discussionId,
      discussionTitle: item.discussionTitle || 'Unknown Discussion',
      discussionPointId: item.discussionPointId,
      discussionPointTitle: item.discussionPointTitle || 'Unknown Point',
      authorId: item.authorId,
      authorDisplayName: item.authorDisplayName,
      authorAvatar: item.authorAvatar,
      content: {
        text: item.content?.text || '',
        preview: (item.content?.text || '').substring(0, 200) + (item.content?.text?.length > 200 ? '...' : ''),
        hasAttachments: (item.content?.attachments?.length || 0) > 0,
        hasLinks: (item.content?.links?.length || 0) > 0,
        attachmentCount: item.content?.attachments?.length || 0
      },
      stance: item.stance,
      replyToId: item.replyToId,
      threadLevel: item.threadLevel || 0,
      reactions: item.reactions || {
        like: 0,
        agree: 0,
        disagree: 0,
        insightful: 0,
        funny: 0,
        totalCount: 0
      },
      replyCount: item.replyCount || 0,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      isEdited: item.metadata?.isEdited || false,
      canEdit: false, // Will be determined by client based on user permissions
      canDelete: false,
      canReact: true,
      canReply: true
    }));

    // Generate facets if requested
    let facets: SearchFacets | undefined;
    if (options.facets) {
      facets = await generatePostFacets(items);
    }

    const searchResult: SearchResult<any> = {
      items,
      totalCount: result.Count || 0,
      searchTime: Date.now() - startTime,
      hasMore: !!result.LastEvaluatedKey,
      nextToken: result.LastEvaluatedKey 
        ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64')
        : undefined,
      facets
    };

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        data: searchResult
      })
    };
  } catch (error) {
    console.error('Post search error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        error: {
          code: 'SEARCH_ERROR',
          message: 'Failed to search posts'
        }
      })
    };
  }
}

async function getSearchSuggestions(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const query = event.queryStringParameters?.query || '';
  const type = event.queryStringParameters?.type || 'all';

  try {
    const suggestions: any[] = [];

    // Add query suggestions (mock implementation)
    if (query.length > 0) {
      suggestions.push({
        type: 'query',
        value: query,
        label: query,
        count: Math.floor(Math.random() * 100) + 1
      });
    }

    // Add category suggestions
    const categories = ['politics', 'economy', 'society', 'technology', 'entertainment', 'sports'];
    categories
      .filter(cat => cat.toLowerCase().includes(query.toLowerCase()))
      .forEach(cat => {
        suggestions.push({
          type: 'category',
          value: cat,
          label: cat,
          count: Math.floor(Math.random() * 50) + 1
        });
      });

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        data: suggestions.slice(0, 10)
      })
    };
  } catch (error) {
    console.error('Suggestions error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        error: {
          code: 'SUGGESTIONS_ERROR',
          message: 'Failed to get search suggestions'
        }
      })
    };
  }
}

async function getPopularSearches(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const type = event.queryStringParameters?.type || 'all';
  const limit = parseInt(event.queryStringParameters?.limit || '10');

  try {
    // Mock popular searches (in real implementation, this would come from analytics)
    const popularSearches = [
      { query: '政治', count: 150 },
      { query: '経済', count: 120 },
      { query: 'AI', count: 100 },
      { query: '環境問題', count: 85 },
      { query: '教育', count: 70 }
    ].slice(0, limit);

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        data: popularSearches
      })
    };
  } catch (error) {
    console.error('Popular searches error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        error: {
          code: 'POPULAR_SEARCHES_ERROR',
          message: 'Failed to get popular searches'
        }
      })
    };
  }
}

async function handleSavedSearches(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const method = event.httpMethod;
  const pathParts = event.path.split('/');
  const searchId = pathParts[pathParts.length - 1];

  try {
    switch (method) {
      case 'GET':
        return await getSavedSearches(event);
      case 'POST':
        return await createSavedSearch(event);
      case 'PUT':
        return await updateSavedSearch(event, searchId);
      case 'DELETE':
        return await deleteSavedSearch(event, searchId);
      default:
        return {
          statusCode: 405,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Method not allowed' })
        };
    }
  } catch (error) {
    console.error('Saved searches error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        error: {
          code: 'SAVED_SEARCHES_ERROR',
          message: 'Failed to handle saved searches'
        }
      })
    };
  }
}

async function getSavedSearches(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  // Mock implementation - in real app, this would query user's saved searches
  const savedSearches = [
    {
      id: 'search1',
      name: 'AI関連の議論',
      query: 'AI',
      filters: { categories: ['technology'] },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isActive: true
    }
  ];

  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify({
      success: true,
      data: savedSearches
    })
  };
}

async function createSavedSearch(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const searchData = JSON.parse(event.body || '{}');
  
  const savedSearch = {
    id: `search_${Date.now()}`,
    ...searchData,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  return {
    statusCode: 201,
    headers: corsHeaders,
    body: JSON.stringify({
      success: true,
      data: savedSearch
    })
  };
}

async function updateSavedSearch(event: APIGatewayProxyEvent, searchId: string): Promise<APIGatewayProxyResult> {
  const updates = JSON.parse(event.body || '{}');
  
  const updatedSearch = {
    id: searchId,
    ...updates,
    updatedAt: new Date().toISOString()
  };

  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify({
      success: true,
      data: updatedSearch
    })
  };
}

async function deleteSavedSearch(event: APIGatewayProxyEvent, searchId: string): Promise<APIGatewayProxyResult> {
  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify({
      success: true
    })
  };
}

async function generateDiscussionFacets(items: any[]): Promise<SearchFacets> {
  const categoryCount: Record<string, number> = {};
  const stanceCount: Record<string, number> = {};
  const authorCount: Record<string, { name: string; count: number }> = {};

  items.forEach(item => {
    // Count categories
    item.categories?.forEach((cat: string) => {
      categoryCount[cat] = (categoryCount[cat] || 0) + 1;
    });

    // Count stances
    if (item.ownerStance) {
      stanceCount[item.ownerStance] = (stanceCount[item.ownerStance] || 0) + 1;
    }

    // Count authors
    if (item.ownerId) {
      if (!authorCount[item.ownerId]) {
        authorCount[item.ownerId] = { name: item.ownerDisplayName, count: 0 };
      }
      authorCount[item.ownerId].count++;
    }
  });

  return {
    categories: Object.entries(categoryCount)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count),
    stances: Object.entries(stanceCount)
      .map(([stance, count]) => ({ stance, count }))
      .sort((a, b) => b.count - a.count),
    authors: Object.entries(authorCount)
      .map(([authorId, data]) => ({ authorId, authorName: data.name, count: data.count }))
      .sort((a, b) => b.count - a.count),
    dateRanges: [] // Would be implemented based on date distribution
  };
}

async function generatePostFacets(items: any[]): Promise<SearchFacets> {
  const stanceCount: Record<string, number> = {};
  const authorCount: Record<string, { name: string; count: number }> = {};

  items.forEach(item => {
    // Count stances
    if (item.stance) {
      stanceCount[item.stance] = (stanceCount[item.stance] || 0) + 1;
    }

    // Count authors
    if (item.authorId) {
      if (!authorCount[item.authorId]) {
        authorCount[item.authorId] = { name: item.authorDisplayName, count: 0 };
      }
      authorCount[item.authorId].count++;
    }
  });

  return {
    categories: [], // Posts don't have direct categories
    stances: Object.entries(stanceCount)
      .map(([stance, count]) => ({ stance, count }))
      .sort((a, b) => b.count - a.count),
    authors: Object.entries(authorCount)
      .map(([authorId, data]) => ({ authorId, authorName: data.name, count: data.count }))
      .sort((a, b) => b.count - a.count),
    dateRanges: [] // Would be implemented based on date distribution
  };
}