import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const TABLE_NAME = process.env.TABLE_NAME || 'OwlNestTable';

interface DiscussionStatistics {
  discussionId: string;
  title: string;
  participantCount: number;
  postCount: number;
  engagementRate: number;
  prosCount: number;
  consCount: number;
  neutralCount: number;
  unknownCount: number;
  createdAt: string;
  lastActivityAt: string;
  averagePostsPerParticipant: number;
  uniqueViewers: number;
  totalViews: number;
}

interface PlatformStatistics {
  totalUsers: number;
  activeUsers: number;
  totalDiscussions: number;
  activeDiscussions: number;
  totalPosts: number;
  totalReactions: number;
  averageEngagementRate: number;
  topCategories: any[];
  growthMetrics: any;
  userActivityDistribution: any;
}

// Helper function to calculate engagement rate
function calculateEngagementRate(posts: any[], participants: number): number {
  if (participants === 0) return 0;
  
  const totalReactions = posts.reduce((sum, post) => {
    return sum + (post.reactions ? Object.keys(post.reactions).length : 0);
  }, 0);
  
  const totalInteractions = posts.length + totalReactions;
  return totalInteractions / (participants * 2); // Normalize to 0-1 scale
}

// Helper function to count stance distribution
function countStanceDistribution(posts: any[]) {
  const counts = { pros: 0, cons: 0, neutral: 0, unknown: 0 };
  
  posts.forEach(post => {
    switch (post.stance) {
      case 'pros':
        counts.pros++;
        break;
      case 'cons':
        counts.cons++;
        break;
      case 'neutral':
        counts.neutral++;
        break;
      default:
        counts.unknown++;
        break;
    }
  });
  
  return counts;
}

// Get discussion statistics
async function getDiscussionStatistics(discussionId: string): Promise<DiscussionStatistics> {
  try {
    // Get discussion metadata
    const discussionQuery = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND SK = :sk',
      ExpressionAttributeValues: {
        ':pk': `DISCUSSION#${discussionId}`,
        ':sk': 'METADATA'
      }
    }));

    if (!discussionQuery.Items || discussionQuery.Items.length === 0) {
      throw new Error('Discussion not found');
    }

    const discussion = discussionQuery.Items[0];

    // Get all posts for this discussion
    const postsQuery = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `DISCUSSION#${discussionId}`,
        ':sk': 'POST#'
      }
    }));

    const posts = postsQuery.Items || [];
    const uniqueParticipants = new Set(posts.map(post => post.authorId));
    const participantCount = uniqueParticipants.size;
    const stanceCounts = countStanceDistribution(posts);
    const engagementRate = calculateEngagementRate(posts, participantCount);

    // Calculate last activity
    const lastActivityAt = posts.length > 0 
      ? posts.reduce((latest, post) => 
          post.metadata?.createdAt > latest ? post.metadata.createdAt : latest, 
          discussion.metadata?.createdAt || new Date().toISOString()
        )
      : discussion.metadata?.createdAt || new Date().toISOString();

    return {
      discussionId,
      title: discussion.title || `議論 ${discussionId}`,
      participantCount,
      postCount: posts.length,
      engagementRate: Math.min(engagementRate, 1), // Cap at 1.0
      prosCount: stanceCounts.pros,
      consCount: stanceCounts.cons,
      neutralCount: stanceCounts.neutral,
      unknownCount: stanceCounts.unknown,
      createdAt: discussion.metadata?.createdAt || new Date().toISOString(),
      lastActivityAt,
      averagePostsPerParticipant: participantCount > 0 ? posts.length / participantCount : 0,
      uniqueViewers: Math.floor(Math.random() * 500) + 100, // Mock data
      totalViews: Math.floor(Math.random() * 2000) + 500 // Mock data
    };
  } catch (error) {
    console.error('Error getting discussion statistics:', error);
    throw error;
  }
}

// Get platform statistics
async function getPlatformStatistics(): Promise<PlatformStatistics> {
  try {
    // Get all users
    const usersQuery = await docClient.send(new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'EntityType = :entityType',
      ExpressionAttributeValues: {
        ':entityType': 'UserProfile'
      }
    }));

    const users = usersQuery.Items || [];
    const totalUsers = users.length;
    
    // Calculate active users (users with activity in last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const activeUsers = users.filter(user => 
      user.lastActiveAt && user.lastActiveAt > thirtyDaysAgo
    ).length;

    // Get all discussions
    const discussionsQuery = await docClient.send(new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'EntityType = :entityType',
      ExpressionAttributeValues: {
        ':entityType': 'Discussion'
      }
    }));

    const discussions = discussionsQuery.Items || [];
    const totalDiscussions = discussions.length;
    
    // Calculate active discussions (discussions with activity in last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const activeDiscussions = discussions.filter(discussion => 
      discussion.metadata?.updatedAt && discussion.metadata.updatedAt > sevenDaysAgo
    ).length;

    // Get all posts
    const postsQuery = await docClient.send(new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'EntityType = :entityType',
      ExpressionAttributeValues: {
        ':entityType': 'Post'
      }
    }));

    const posts = postsQuery.Items || [];
    const totalPosts = posts.length;

    // Calculate total reactions
    const totalReactions = posts.reduce((sum, post) => {
      return sum + (post.reactions ? Object.keys(post.reactions).length : 0);
    }, 0);

    // Calculate average engagement rate
    const averageEngagementRate = discussions.length > 0 
      ? discussions.reduce((sum, discussion) => {
          const discussionPosts = posts.filter(post => post.discussionId === discussion.discussionId);
          const participants = new Set(discussionPosts.map(post => post.authorId)).size;
          return sum + calculateEngagementRate(discussionPosts, participants);
        }, 0) / discussions.length
      : 0;

    // Calculate category statistics
    const categoryStats = new Map();
    discussions.forEach(discussion => {
      if (discussion.categories) {
        discussion.categories.forEach((category: string) => {
          if (!categoryStats.has(category)) {
            categoryStats.set(category, {
              categoryId: category,
              categoryName: category,
              discussionCount: 0,
              postCount: 0,
              participantCount: 0,
              engagementRate: 0
            });
          }
          const stats = categoryStats.get(category);
          stats.discussionCount++;
          
          const categoryPosts = posts.filter(post => post.discussionId === discussion.discussionId);
          stats.postCount += categoryPosts.length;
          stats.participantCount += new Set(categoryPosts.map(post => post.authorId)).size;
          stats.engagementRate += calculateEngagementRate(categoryPosts, stats.participantCount);
        });
      }
    });

    const topCategories = Array.from(categoryStats.values())
      .sort((a, b) => b.discussionCount - a.discussionCount)
      .slice(0, 5);

    // Calculate stance distribution
    const stanceCounts = countStanceDistribution(posts);
    const totalStancePosts = Object.values(stanceCounts).reduce((sum, count) => sum + count, 0);
    const stanceDistribution = {
      pros: totalStancePosts > 0 ? stanceCounts.pros / totalStancePosts : 0,
      cons: totalStancePosts > 0 ? stanceCounts.cons / totalStancePosts : 0,
      neutral: totalStancePosts > 0 ? stanceCounts.neutral / totalStancePosts : 0,
      unknown: totalStancePosts > 0 ? stanceCounts.unknown / totalStancePosts : 0
    };

    return {
      totalUsers,
      activeUsers,
      totalDiscussions,
      activeDiscussions,
      totalPosts,
      totalReactions,
      averageEngagementRate: Math.min(averageEngagementRate, 1),
      topCategories,
      growthMetrics: {
        dailyActiveUsers: Math.floor(activeUsers * 0.3),
        weeklyActiveUsers: Math.floor(activeUsers * 0.7),
        monthlyActiveUsers: activeUsers,
        newUsersToday: Math.floor(Math.random() * 20) + 5,
        newUsersThisWeek: Math.floor(Math.random() * 100) + 50,
        newUsersThisMonth: Math.floor(Math.random() * 400) + 200,
        retentionRate: Math.random() * 0.3 + 0.6
      },
      userActivityDistribution: {
        timeOfDay: generateMockTimeDistribution(),
        dayOfWeek: generateMockDayDistribution(),
        stanceDistribution
      }
    };
  } catch (error) {
    console.error('Error getting platform statistics:', error);
    throw error;
  }
}

// Helper functions for mock data
function generateMockTimeDistribution() {
  const distribution: { [key: string]: number } = {};
  for (let hour = 0; hour < 24; hour++) {
    // Simulate realistic activity patterns
    let activity = 50;
    if (hour >= 6 && hour <= 9) activity += Math.random() * 100; // Morning peak
    if (hour >= 12 && hour <= 14) activity += Math.random() * 80; // Lunch peak
    if (hour >= 18 && hour <= 22) activity += Math.random() * 120; // Evening peak
    if (hour >= 0 && hour <= 5) activity *= 0.3; // Night low
    
    distribution[hour.toString()] = Math.floor(activity);
  }
  return distribution;
}

function generateMockDayDistribution() {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const distribution: { [key: string]: number } = {};
  
  days.forEach((day, index) => {
    let activity = 150 + Math.random() * 100;
    if (index >= 5) activity *= 0.8; // Weekend slightly lower
    distribution[day] = Math.floor(activity);
  });
  
  return distribution;
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
  };

  try {
    const { httpMethod, pathParameters, body } = event;
    const path = event.resource;

    if (httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers,
        body: ''
      };
    }

    // GET /analytics/discussions/{discussionId}/statistics
    if (httpMethod === 'GET' && path.includes('/discussions/') && path.includes('/statistics')) {
      const discussionId = pathParameters?.discussionId;
      if (!discussionId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Discussion ID is required' })
        };
      }

      const statistics = await getDiscussionStatistics(discussionId);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(statistics)
      };
    }

    // POST /analytics/discussions/batch-statistics
    if (httpMethod === 'POST' && path.includes('/discussions/batch-statistics')) {
      const { discussionIds } = JSON.parse(body || '{}');
      if (!discussionIds || !Array.isArray(discussionIds)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Discussion IDs array is required' })
        };
      }

      const statistics = await Promise.all(
        discussionIds.map(id => getDiscussionStatistics(id))
      );

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(statistics)
      };
    }

    // GET /analytics/platform/statistics
    if (httpMethod === 'GET' && path.includes('/platform/statistics')) {
      const statistics = await getPlatformStatistics();
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(statistics)
      };
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Endpoint not found' })
    };

  } catch (error) {
    console.error('Analytics Lambda error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};