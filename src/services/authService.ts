// Authentication service using AWS Cognito
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  SignUpCommand,
  ConfirmSignUpCommand,
  ResendConfirmationCodeCommand,
  ForgotPasswordCommand,
  ConfirmForgotPasswordCommand,
  ChangePasswordCommand,
  GetUserCommand,
  GlobalSignOutCommand,
  AuthFlowType,
} from '@aws-sdk/client-cognito-identity-provider';

import {
  User,
  AuthTokens,
  LoginCredentials,
  RegisterData,
  ConfirmSignUpData,
  ForgotPasswordData,
  ConfirmForgotPasswordData,
  ChangePasswordData,
  UpdateUserData,
  AuthChallenge,
  AuthError,
  UserRole,
} from '../types/auth';

// Configuration - these should come from environment variables
const AWS_REGION = import.meta.env.VITE_AWS_REGION || 'ap-northeast-1';
const USER_POOL_ID = import.meta.env.VITE_AWS_USER_POOL_ID || '';
const CLIENT_ID = import.meta.env.VITE_AWS_USER_POOL_CLIENT_ID || '';
const API_BASE_URL = import.meta.env.VITE_API_GATEWAY_URL || '';

// Initialize Cognito client
const cognitoClient = new CognitoIdentityProviderClient({
  region: AWS_REGION,
});

class AuthService {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private idToken: string | null = null;
  private tokenExpiry: number | null = null;
  private isDevelopmentMode: boolean;

  constructor() {
    // Load tokens from localStorage on initialization
    this.loadTokensFromStorage();
    
    // Check if we're in development mode without AWS configuration
    this.isDevelopmentMode = import.meta.env.VITE_NODE_ENV === 'development' && 
                             (!USER_POOL_ID || !CLIENT_ID);
  }

  // Login with email and password
  async login(credentials: LoginCredentials): Promise<{ user: User; tokens: AuthTokens } | AuthChallenge> {
    // Development mode mock login
    if (this.isDevelopmentMode) {
      return this.mockLogin(credentials);
    }

    try {
      const command = new InitiateAuthCommand({
        AuthFlow: AuthFlowType.USER_PASSWORD_AUTH,
        ClientId: CLIENT_ID,
        AuthParameters: {
          USERNAME: credentials.email,
          PASSWORD: credentials.password,
        },
      });

      const response = await cognitoClient.send(command);

      // Handle MFA or other challenges
      if (response.ChallengeName) {
        return {
          challengeName: response.ChallengeName,
          session: response.Session || '',
          challengeParameters: response.ChallengeParameters || {},
        };
      }

      if (response.AuthenticationResult) {
        const tokens = {
          accessToken: response.AuthenticationResult.AccessToken!,
          idToken: response.AuthenticationResult.IdToken!,
          refreshToken: response.AuthenticationResult.RefreshToken!,
          expiresIn: response.AuthenticationResult.ExpiresIn!,
        };

        // Store tokens
        this.setTokens(tokens);

        // Get user profile
        const user = await this.getCurrentUser();

        return { user, tokens };
      }

      throw new Error('Authentication failed');
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  // Register new user
  async register(userData: RegisterData): Promise<{ userSub: string; codeDeliveryDetails: any }> {
    try {
      const userAttributes = [
        { Name: 'email', Value: userData.email },
      ];

      if (userData.givenName) {
        userAttributes.push({ Name: 'given_name', Value: userData.givenName });
      }
      if (userData.familyName) {
        userAttributes.push({ Name: 'family_name', Value: userData.familyName });
      }

      const command = new SignUpCommand({
        ClientId: CLIENT_ID,
        Username: userData.email,
        Password: userData.password,
        UserAttributes: userAttributes,
      });

      const response = await cognitoClient.send(command);

      return {
        userSub: response.UserSub!,
        codeDeliveryDetails: response.CodeDeliveryDetails,
      };
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  // Confirm sign up with verification code
  async confirmSignUp(data: ConfirmSignUpData): Promise<void> {
    try {
      const command = new ConfirmSignUpCommand({
        ClientId: CLIENT_ID,
        Username: data.email,
        ConfirmationCode: data.confirmationCode,
      });

      await cognitoClient.send(command);
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  // Resend confirmation code
  async resendConfirmationCode(email: string): Promise<any> {
    try {
      const command = new ResendConfirmationCodeCommand({
        ClientId: CLIENT_ID,
        Username: email,
      });

      const response = await cognitoClient.send(command);
      return response.CodeDeliveryDetails;
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  // Forgot password
  async forgotPassword(data: ForgotPasswordData): Promise<any> {
    try {
      const command = new ForgotPasswordCommand({
        ClientId: CLIENT_ID,
        Username: data.email,
      });

      const response = await cognitoClient.send(command);
      return response.CodeDeliveryDetails;
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  // Confirm forgot password
  async confirmForgotPassword(data: ConfirmForgotPasswordData): Promise<void> {
    try {
      const command = new ConfirmForgotPasswordCommand({
        ClientId: CLIENT_ID,
        Username: data.email,
        ConfirmationCode: data.confirmationCode,
        Password: data.newPassword,
      });

      await cognitoClient.send(command);
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  // Change password
  async changePassword(data: ChangePasswordData): Promise<void> {
    try {
      if (!this.accessToken) {
        throw new Error('Not authenticated');
      }

      const command = new ChangePasswordCommand({
        AccessToken: this.accessToken,
        PreviousPassword: data.oldPassword,
        ProposedPassword: data.newPassword,
      });

      await cognitoClient.send(command);
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  // Get current user
  async getCurrentUser(): Promise<User> {
    // Development mode mock
    if (this.isDevelopmentMode) {
      return this.mockGetCurrentUser();
    }

    try {
      if (!this.accessToken) {
        throw new Error('Not authenticated');
      }

      // Check if token is expired and refresh if needed
      if (this.isTokenExpired()) {
        await this.refreshAccessToken();
      }

      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to get user profile');
      }

      const data = await response.json();
      return data.user;
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  // Update user profile
  async updateUser(updateData: UpdateUserData): Promise<User> {
    try {
      if (!this.accessToken) {
        throw new Error('Not authenticated');
      }

      // Check if token is expired and refresh if needed
      if (this.isTokenExpired()) {
        await this.refreshAccessToken();
      }

      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        throw new Error('Failed to update user profile');
      }

      const data = await response.json();
      return data.user;
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  // Update user role (admin only)
  async updateUserRole(userId: string, role: UserRole): Promise<void> {
    try {
      if (!this.accessToken) {
        throw new Error('Not authenticated');
      }

      // Check if token is expired and refresh if needed
      if (this.isTokenExpired()) {
        await this.refreshAccessToken();
      }

      const response = await fetch(`${API_BASE_URL}/auth/role`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, role }),
      });

      if (!response.ok) {
        throw new Error('Failed to update user role');
      }
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  // Logout
  async logout(): Promise<void> {
    try {
      if (this.accessToken) {
        const command = new GlobalSignOutCommand({
          AccessToken: this.accessToken,
        });

        await cognitoClient.send(command);
      }
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      // Clear tokens regardless of API call success
      this.clearTokens();
    }
  }

  // Refresh access token
  async refreshAccessToken(): Promise<void> {
    try {
      if (!this.refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });

      if (!response.ok) {
        throw new Error('Failed to refresh token');
      }

      const data = await response.json();
      
      // Update tokens
      this.accessToken = data.accessToken;
      this.idToken = data.idToken;
      this.tokenExpiry = Date.now() + (data.expiresIn * 1000);

      // Save to localStorage
      this.saveTokensToStorage();
    } catch (error: any) {
      // If refresh fails, clear all tokens
      this.clearTokens();
      throw this.handleAuthError(error);
    }
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    // Development mode: check for mock user data
    if (this.isDevelopmentMode) {
      return !!localStorage.getItem('owlnest_mock_user') && !!this.accessToken;
    }
    
    return !!this.accessToken && !this.isTokenExpired();
  }

  // Check if token is expired
  private isTokenExpired(): boolean {
    if (!this.tokenExpiry) return true;
    return Date.now() >= this.tokenExpiry;
  }

  // Get access token
  getAccessToken(): string | null {
    if (this.isTokenExpired()) {
      return null;
    }
    return this.accessToken;
  }

  // Get ID token
  getIdToken(): string | null {
    if (this.isTokenExpired()) {
      return null;
    }
    return this.idToken;
  }

  // Set tokens
  private setTokens(tokens: AuthTokens): void {
    this.accessToken = tokens.accessToken;
    this.idToken = tokens.idToken;
    this.refreshToken = tokens.refreshToken;
    this.tokenExpiry = Date.now() + (tokens.expiresIn * 1000);

    this.saveTokensToStorage();
  }

  // Clear tokens
  private clearTokens(): void {
    this.accessToken = null;
    this.idToken = null;
    this.refreshToken = null;
    this.tokenExpiry = null;

    // Clear from localStorage
    localStorage.removeItem('owlnest_access_token');
    localStorage.removeItem('owlnest_id_token');
    localStorage.removeItem('owlnest_refresh_token');
    localStorage.removeItem('owlnest_token_expiry');
  }

  // Save tokens to localStorage
  private saveTokensToStorage(): void {
    if (this.accessToken) {
      localStorage.setItem('owlnest_access_token', this.accessToken);
    }
    if (this.idToken) {
      localStorage.setItem('owlnest_id_token', this.idToken);
    }
    if (this.refreshToken) {
      localStorage.setItem('owlnest_refresh_token', this.refreshToken);
    }
    if (this.tokenExpiry) {
      localStorage.setItem('owlnest_token_expiry', this.tokenExpiry.toString());
    }
  }

  // Load tokens from localStorage
  private loadTokensFromStorage(): void {
    this.accessToken = localStorage.getItem('owlnest_access_token');
    this.idToken = localStorage.getItem('owlnest_id_token');
    this.refreshToken = localStorage.getItem('owlnest_refresh_token');
    
    const expiry = localStorage.getItem('owlnest_token_expiry');
    this.tokenExpiry = expiry ? parseInt(expiry, 10) : null;
  }

  // Handle authentication errors
  private handleAuthError(error: any): AuthError {
    console.error('Auth error:', error);

    return {
      code: error.name || 'AuthError',
      message: error.message || 'Authentication error occurred',
      name: error.name || 'AuthError',
    };
  }

  // Mock login for development environment
  private async mockLogin(credentials: LoginCredentials): Promise<{ user: User; tokens: AuthTokens }> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Mock user data based on email
    const mockUser: User = {
      userId: 'mock-user-1',
      givenName: "mock",
      familyName: "user",
      email: credentials.email,
      displayName: credentials.email.split('@')[0],
      role: credentials.email.includes('admin') ? UserRole.ADMIN : UserRole.CONTRIBUTOR,
      bio: 'Mock user for development',
      avatarUrl: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      preferences: {
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
    };

    // Mock tokens
    const mockTokens: AuthTokens = {
      accessToken: 'mock-access-token',
      idToken: 'mock-id-token',
      refreshToken: 'mock-refresh-token',
      expiresIn: 3600,
    };

    // Store tokens
    this.setTokens(mockTokens);

    // Store mock user data
    localStorage.setItem('owlnest_mock_user', JSON.stringify(mockUser));

    console.log('🔧 Development mode: Mock login successful', { user: mockUser });

    return { user: mockUser, tokens: mockTokens };
  }

  // Mock getCurrentUser for development
  private async mockGetCurrentUser(): Promise<User> {
    const mockUserData = localStorage.getItem('owlnest_mock_user');
    if (mockUserData) {
      return JSON.parse(mockUserData);
    }

    // Default mock user if no stored data
    return {
      userId: 'mock-user-1',
      givenName: "mock",
      familyName: "user",
      email: 'dev@example.com',
      displayName: 'Development User',
      role: UserRole.CONTRIBUTOR,
      bio: 'Mock user for development',
      avatarUrl: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      preferences: {
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
    };
  }
}

// Export singleton instance
export const authService = new AuthService();
export default authService;