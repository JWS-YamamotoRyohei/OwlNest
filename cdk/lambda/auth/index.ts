// Authentication Lambda function
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { 
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  SignUpCommand,
  ConfirmSignUpCommand,
  ResendConfirmationCodeCommand,
  ForgotPasswordCommand,
  ConfirmForgotPasswordCommand,
  ChangePasswordCommand,
  AdminGetUserCommand,
  AdminUpdateUserAttributesCommand,
  GetUserCommand,
  UpdateUserAttributesCommand,
  GlobalSignOutCommand,
  AuthFlowType,
  ChallengeNameType,
  RespondToAuthChallengeCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

// Initialize AWS clients
const cognitoClient = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION });
const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION }));

const USER_POOL_ID = process.env.USER_POOL_ID!;
const CLIENT_ID = process.env.CLIENT_ID!;
const TABLE_NAME = process.env.TABLE_NAME!;

// User roles enum
enum UserRole {
  VIEWER = 'viewer',
  CONTRIBUTOR = 'contributor',
  CREATOR = 'creator',
  ADMIN = 'admin'
}

interface LoginRequest {
  email: string;
  password: string;
}

interface RegisterRequest {
  email: string;
  password: string;
  givenName?: string;
  familyName?: string;
}

interface ConfirmSignUpRequest {
  email: string;
  confirmationCode: string;
}

interface ForgotPasswordRequest {
  email: string;
}

interface ConfirmForgotPasswordRequest {
  email: string;
  confirmationCode: string;
  newPassword: string;
}

interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
}

interface UpdateUserRequest {
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  givenName?: string;
  familyName?: string;
}

interface UpdateUserRoleRequest {
  userId: string;
  role: UserRole;
}

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('Auth Lambda - Event:', JSON.stringify(event, null, 2));

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Content-Type': 'application/json',
  };

  try {
    const { httpMethod, path, body, headers: requestHeaders } = event;

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

    switch (httpMethod) {
      case 'POST':
        if (path.includes('/login')) {
          return handleLogin(body, headers);
        } else if (path.includes('/register')) {
          return handleRegister(body, headers);
        } else if (path.includes('/confirm-signup')) {
          return handleConfirmSignUp(body, headers);
        } else if (path.includes('/resend-confirmation')) {
          return handleResendConfirmation(body, headers);
        } else if (path.includes('/forgot-password')) {
          return handleForgotPassword(body, headers);
        } else if (path.includes('/confirm-forgot-password')) {
          return handleConfirmForgotPassword(body, headers);
        } else if (path.includes('/change-password')) {
          return handleChangePassword(body, accessToken, headers);
        } else if (path.includes('/logout')) {
          return handleLogout(accessToken, headers);
        } else if (path.includes('/refresh-token')) {
          return handleRefreshToken(body, headers);
        }
        break;

      case 'GET':
        if (path.includes('/me')) {
          return handleGetCurrentUser(accessToken, headers);
        }
        break;

      case 'PUT':
        if (path.includes('/me')) {
          return handleUpdateUser(body, accessToken, headers);
        } else if (path.includes('/role')) {
          return handleUpdateUserRole(body, accessToken, headers);
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
    console.error('Auth Lambda Error:', error);
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

const handleLogin = async (
  body: string | null,
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

    const { email, password }: LoginRequest = JSON.parse(body);

    if (!email || !password) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Email and password are required' }),
      };
    }

    const command = new InitiateAuthCommand({
      AuthFlow: AuthFlowType.USER_PASSWORD_AUTH,
      ClientId: CLIENT_ID,
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
      },
    });

    const response = await cognitoClient.send(command);

    if (response.ChallengeName) {
      // Handle MFA or other challenges
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          challengeName: response.ChallengeName,
          session: response.Session,
          challengeParameters: response.ChallengeParameters,
        }),
      };
    }

    if (response.AuthenticationResult) {
      const { AccessToken, IdToken, RefreshToken, ExpiresIn } = response.AuthenticationResult;

      // Get user profile from DynamoDB
      const userProfile = await getUserProfile(response.AuthenticationResult.AccessToken!);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          accessToken: AccessToken,
          idToken: IdToken,
          refreshToken: RefreshToken,
          expiresIn: ExpiresIn,
          user: userProfile,
        }),
      };
    }

    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Authentication failed' }),
    };
  } catch (error: any) {
    console.error('Login error:', error);
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ 
        error: 'Login failed',
        message: error.message || 'Invalid credentials'
      }),
    };
  }
};

const handleRegister = async (
  body: string | null,
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

    const { email, password, givenName, familyName }: RegisterRequest = JSON.parse(body);

    if (!email || !password) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Email and password are required' }),
      };
    }

    const userAttributes = [
      { Name: 'email', Value: email },
    ];

    if (givenName) {
      userAttributes.push({ Name: 'given_name', Value: givenName });
    }
    if (familyName) {
      userAttributes.push({ Name: 'family_name', Value: familyName });
    }

    const command = new SignUpCommand({
      ClientId: CLIENT_ID,
      Username: email,
      Password: password,
      UserAttributes: userAttributes,
    });

    const response = await cognitoClient.send(command);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        userSub: response.UserSub,
        codeDeliveryDetails: response.CodeDeliveryDetails,
        message: 'User registered successfully. Please check your email for confirmation code.',
      }),
    };
  } catch (error: any) {
    console.error('Register error:', error);
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ 
        error: 'Registration failed',
        message: error.message || 'Registration failed'
      }),
    };
  }
};

const handleConfirmSignUp = async (
  body: string | null,
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

    const { email, confirmationCode }: ConfirmSignUpRequest = JSON.parse(body);

    if (!email || !confirmationCode) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Email and confirmation code are required' }),
      };
    }

    const command = new ConfirmSignUpCommand({
      ClientId: CLIENT_ID,
      Username: email,
      ConfirmationCode: confirmationCode,
    });

    await cognitoClient.send(command);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Email confirmed successfully. You can now log in.',
      }),
    };
  } catch (error: any) {
    console.error('Confirm signup error:', error);
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ 
        error: 'Confirmation failed',
        message: error.message || 'Invalid confirmation code'
      }),
    };
  }
};

const handleResendConfirmation = async (
  body: string | null,
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

    const { email } = JSON.parse(body);

    if (!email) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Email is required' }),
      };
    }

    const command = new ResendConfirmationCodeCommand({
      ClientId: CLIENT_ID,
      Username: email,
    });

    const response = await cognitoClient.send(command);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        codeDeliveryDetails: response.CodeDeliveryDetails,
        message: 'Confirmation code resent successfully.',
      }),
    };
  } catch (error: any) {
    console.error('Resend confirmation error:', error);
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ 
        error: 'Resend failed',
        message: error.message || 'Failed to resend confirmation code'
      }),
    };
  }
};

const handleForgotPassword = async (
  body: string | null,
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

    const { email }: ForgotPasswordRequest = JSON.parse(body);

    if (!email) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Email is required' }),
      };
    }

    const command = new ForgotPasswordCommand({
      ClientId: CLIENT_ID,
      Username: email,
    });

    const response = await cognitoClient.send(command);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        codeDeliveryDetails: response.CodeDeliveryDetails,
        message: 'Password reset code sent successfully.',
      }),
    };
  } catch (error: any) {
    console.error('Forgot password error:', error);
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ 
        error: 'Forgot password failed',
        message: error.message || 'Failed to send password reset code'
      }),
    };
  }
};

const handleConfirmForgotPassword = async (
  body: string | null,
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

    const { email, confirmationCode, newPassword }: ConfirmForgotPasswordRequest = JSON.parse(body);

    if (!email || !confirmationCode || !newPassword) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Email, confirmation code, and new password are required' }),
      };
    }

    const command = new ConfirmForgotPasswordCommand({
      ClientId: CLIENT_ID,
      Username: email,
      ConfirmationCode: confirmationCode,
      Password: newPassword,
    });

    await cognitoClient.send(command);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Password reset successfully.',
      }),
    };
  } catch (error: any) {
    console.error('Confirm forgot password error:', error);
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ 
        error: 'Password reset failed',
        message: error.message || 'Invalid confirmation code or password'
      }),
    };
  }
};

const handleChangePassword = async (
  body: string | null,
  accessToken: string | undefined,
  headers: Record<string, string>
): Promise<APIGatewayProxyResult> => {
  try {
    if (!accessToken) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Access token is required' }),
      };
    }

    if (!body) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Request body is required' }),
      };
    }

    const { oldPassword, newPassword }: ChangePasswordRequest = JSON.parse(body);

    if (!oldPassword || !newPassword) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Old password and new password are required' }),
      };
    }

    const command = new ChangePasswordCommand({
      AccessToken: accessToken,
      PreviousPassword: oldPassword,
      ProposedPassword: newPassword,
    });

    await cognitoClient.send(command);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Password changed successfully.',
      }),
    };
  } catch (error: any) {
    console.error('Change password error:', error);
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ 
        error: 'Password change failed',
        message: error.message || 'Failed to change password'
      }),
    };
  }
};

const handleLogout = async (
  accessToken: string | undefined,
  headers: Record<string, string>
): Promise<APIGatewayProxyResult> => {
  try {
    if (!accessToken) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Access token is required' }),
      };
    }

    const command = new GlobalSignOutCommand({
      AccessToken: accessToken,
    });

    await cognitoClient.send(command);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Logged out successfully.',
      }),
    };
  } catch (error: any) {
    console.error('Logout error:', error);
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ 
        error: 'Logout failed',
        message: error.message || 'Failed to logout'
      }),
    };
  }
};

const handleRefreshToken = async (
  body: string | null,
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

    const { refreshToken } = JSON.parse(body);

    if (!refreshToken) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Refresh token is required' }),
      };
    }

    const command = new InitiateAuthCommand({
      AuthFlow: AuthFlowType.REFRESH_TOKEN_AUTH,
      ClientId: CLIENT_ID,
      AuthParameters: {
        REFRESH_TOKEN: refreshToken,
      },
    });

    const response = await cognitoClient.send(command);

    if (response.AuthenticationResult) {
      const { AccessToken, IdToken, ExpiresIn } = response.AuthenticationResult;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          accessToken: AccessToken,
          idToken: IdToken,
          expiresIn: ExpiresIn,
        }),
      };
    }

    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Token refresh failed' }),
    };
  } catch (error: any) {
    console.error('Refresh token error:', error);
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ 
        error: 'Token refresh failed',
        message: error.message || 'Invalid refresh token'
      }),
    };
  }
};

const handleGetCurrentUser = async (
  accessToken: string | undefined,
  headers: Record<string, string>
): Promise<APIGatewayProxyResult> => {
  try {
    if (!accessToken) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Access token is required' }),
      };
    }

    const userProfile = await getUserProfile(accessToken);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ user: userProfile }),
    };
  } catch (error: any) {
    console.error('Get current user error:', error);
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to get user',
        message: error.message || 'Invalid access token'
      }),
    };
  }
};

const handleUpdateUser = async (
  body: string | null,
  accessToken: string | undefined,
  headers: Record<string, string>
): Promise<APIGatewayProxyResult> => {
  try {
    if (!accessToken) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Access token is required' }),
      };
    }

    if (!body) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Request body is required' }),
      };
    }

    const updateData: UpdateUserRequest = JSON.parse(body);

    // Get current user info
    const getUserCommand = new GetUserCommand({
      AccessToken: accessToken,
    });
    const userResponse = await cognitoClient.send(getUserCommand);
    const userId = userResponse.Username!;

    // Update Cognito attributes
    const userAttributes = [];
    if (updateData.displayName) {
      userAttributes.push({ Name: 'custom:displayName', Value: updateData.displayName });
    }
    if (updateData.bio) {
      userAttributes.push({ Name: 'custom:bio', Value: updateData.bio });
    }
    if (updateData.avatarUrl) {
      userAttributes.push({ Name: 'custom:avatarUrl', Value: updateData.avatarUrl });
    }
    if (updateData.givenName) {
      userAttributes.push({ Name: 'given_name', Value: updateData.givenName });
    }
    if (updateData.familyName) {
      userAttributes.push({ Name: 'family_name', Value: updateData.familyName });
    }

    if (userAttributes.length > 0) {
      const updateAttributesCommand = new UpdateUserAttributesCommand({
        AccessToken: accessToken,
        UserAttributes: userAttributes,
      });
      await cognitoClient.send(updateAttributesCommand);
    }

    // Update DynamoDB profile
    const updateExpression = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    if (updateData.displayName) {
      updateExpression.push('#displayName = :displayName');
      expressionAttributeNames['#displayName'] = 'displayName';
      expressionAttributeValues[':displayName'] = updateData.displayName;
    }
    if (updateData.bio) {
      updateExpression.push('#bio = :bio');
      expressionAttributeNames['#bio'] = 'bio';
      expressionAttributeValues[':bio'] = updateData.bio;
    }
    if (updateData.avatarUrl) {
      updateExpression.push('#avatarUrl = :avatarUrl');
      expressionAttributeNames['#avatarUrl'] = 'avatarUrl';
      expressionAttributeValues[':avatarUrl'] = updateData.avatarUrl;
    }

    updateExpression.push('#updatedAt = :updatedAt');
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = new Date().toISOString();

    if (updateExpression.length > 1) { // More than just updatedAt
      const updateCommand = new UpdateCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `USER#${userId}`,
          SK: 'PROFILE',
        },
        UpdateExpression: `SET ${updateExpression.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
      });

      await dynamoClient.send(updateCommand);
    }

    // Get updated user profile
    const updatedProfile = await getUserProfile(accessToken);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'User updated successfully',
        user: updatedProfile,
      }),
    };
  } catch (error: any) {
    console.error('Update user error:', error);
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ 
        error: 'Update failed',
        message: error.message || 'Failed to update user'
      }),
    };
  }
};

const handleUpdateUserRole = async (
  body: string | null,
  accessToken: string | undefined,
  headers: Record<string, string>
): Promise<APIGatewayProxyResult> => {
  try {
    if (!accessToken) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Access token is required' }),
      };
    }

    if (!body) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Request body is required' }),
      };
    }

    // Check if current user is admin
    const currentUser = await getUserProfile(accessToken);
    if (currentUser.role !== UserRole.ADMIN) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Only administrators can update user roles' }),
      };
    }

    const { userId, role }: UpdateUserRoleRequest = JSON.parse(body);

    if (!userId || !role || !Object.values(UserRole).includes(role)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Valid userId and role are required' }),
      };
    }

    // Update Cognito custom attribute
    const updateAttributesCommand = new AdminUpdateUserAttributesCommand({
      UserPoolId: USER_POOL_ID,
      Username: userId,
      UserAttributes: [
        { Name: 'custom:role', Value: role },
      ],
    });
    await cognitoClient.send(updateAttributesCommand);

    // Update DynamoDB profile
    const updateCommand = new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `USER#${userId}`,
        SK: 'PROFILE',
      },
      UpdateExpression: 'SET #role = :role, #updatedAt = :updatedAt, GSI1PK = :gsi1pk',
      ExpressionAttributeNames: {
        '#role': 'role',
        '#updatedAt': 'updatedAt',
      },
      ExpressionAttributeValues: {
        ':role': role,
        ':updatedAt': new Date().toISOString(),
        ':gsi1pk': `ROLE#${role}`,
      },
    });

    await dynamoClient.send(updateCommand);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'User role updated successfully',
        userId,
        role,
      }),
    };
  } catch (error: any) {
    console.error('Update user role error:', error);
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ 
        error: 'Role update failed',
        message: error.message || 'Failed to update user role'
      }),
    };
  }
};

// Helper function to get user profile
const getUserProfile = async (accessToken: string) => {
  // Get user from Cognito
  const getUserCommand = new GetUserCommand({
    AccessToken: accessToken,
  });
  const cognitoUser = await cognitoClient.send(getUserCommand);

  const userId = cognitoUser.Username!;
  const email = cognitoUser.UserAttributes?.find(attr => attr.Name === 'email')?.Value;
  const role = cognitoUser.UserAttributes?.find(attr => attr.Name === 'custom:role')?.Value || UserRole.VIEWER;
  const displayName = cognitoUser.UserAttributes?.find(attr => attr.Name === 'custom:displayName')?.Value;
  const bio = cognitoUser.UserAttributes?.find(attr => attr.Name === 'custom:bio')?.Value;
  const avatarUrl = cognitoUser.UserAttributes?.find(attr => attr.Name === 'custom:avatarUrl')?.Value;
  const givenName = cognitoUser.UserAttributes?.find(attr => attr.Name === 'given_name')?.Value;
  const familyName = cognitoUser.UserAttributes?.find(attr => attr.Name === 'family_name')?.Value;

  // Get additional profile data from DynamoDB
  const getCommand = new GetCommand({
    TableName: TABLE_NAME,
    Key: {
      PK: `USER#${userId}`,
      SK: 'PROFILE',
    },
  });

  const dynamoResponse = await dynamoClient.send(getCommand);
  const profile = dynamoResponse.Item;

  return {
    userId,
    email,
    role: role as UserRole,
    displayName: displayName || email?.split('@')[0],
    bio: bio || '',
    avatarUrl: avatarUrl || '',
    givenName: givenName || '',
    familyName: familyName || '',
    preferences: profile?.preferences || {
      notifications: {
        email: true,
        push: false,
        mentions: true,
        replies: true,
        follows: true,
      },
      privacy: {
        profileVisible: true,
        emailVisible: false,
      },
    },
    createdAt: profile?.createdAt,
    updatedAt: profile?.updatedAt,
  };
};