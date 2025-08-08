import { apiService } from './api';
import { UserSanction, SanctionType, SanctionFilters } from '../types/moderation';

export interface CreateSanctionData {
  userId: string;
  sanctionType: SanctionType;
  reason: string;
  description?: string;
  duration?: number; // Hours for temporary sanctions
  relatedPostId?: string;
  relatedReportId?: string;
}

export interface SanctionStats {
  totalSanctions: number;
  sanctionsByType: Record<SanctionType, number>;
  activeSanctions: number;
  sanctionsToday: number;
  sanctionsThisWeek: number;
  sanctionsThisMonth: number;
  appealRate: number; // Percentage of sanctions that were appealed
  appealSuccessRate: number; // Percentage of appeals that were approved
  averageSanctionDuration: number; // Average duration in hours for temporary sanctions
  topReasons: Array<{
    reason: string;
    count: number;
  }>;
  sanctionTrends: Array<{
    date: string;
    count: number;
    type: SanctionType;
  }>;
}

export interface UserSanctionHistory {
  userId: string;
  userDisplayName: string;
  totalSanctions: number;
  activeSanctions: number;
  sanctions: UserSanction[];
  riskLevel: 'low' | 'medium' | 'high';
  lastSanctionDate?: string;
  sanctionFrequency: number; // Sanctions per month
}

export class UserSanctionService {
  /**
   * Create a new user sanction
   */
  async createSanction(sanctionData: CreateSanctionData): Promise<UserSanction> {
    try {
      const response = await apiService.post<UserSanction>('/moderation/sanctions', {
        ...sanctionData,
        timestamp: new Date().toISOString(),
      });
      return response.data;
    } catch (error) {
      throw new Error(
        `Failed to create sanction: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get all sanctions with optional filters
   */
  async getAllSanctions(filters?: SanctionFilters): Promise<UserSanction[]> {
    try {
      const response = await apiService.get<UserSanction[]>('/moderation/sanctions', {
        params: filters,
      });
      return response.data;
    } catch (error) {
      throw new Error(
        `Failed to get sanctions: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get sanctions for a specific user
   */
  async getUserSanctions(userId: string, filters?: SanctionFilters): Promise<UserSanction[]> {
    try {
      const response = await apiService.get<UserSanction[]>(
        `/moderation/sanctions/user/${userId}`,
        {
          params: filters,
        }
      );
      return response.data;
    } catch (error) {
      throw new Error(
        `Failed to get user sanctions: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get a specific sanction by ID
   */
  async getSanction(sanctionId: string): Promise<UserSanction> {
    try {
      const response = await apiService.get<UserSanction>(`/moderation/sanctions/${sanctionId}`);
      return response.data;
    } catch (error) {
      throw new Error(
        `Failed to get sanction: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Revoke a sanction
   */
  async revokeSanction(sanctionId: string, reason: string): Promise<void> {
    try {
      await apiService.post(`/moderation/sanctions/${sanctionId}/revoke`, {
        reason,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      throw new Error(
        `Failed to revoke sanction: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Appeal a sanction
   */
  async appealSanction(sanctionId: string, appealReason: string): Promise<void> {
    try {
      await apiService.post(`/moderation/sanctions/${sanctionId}/appeal`, {
        appealReason,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      throw new Error(
        `Failed to appeal sanction: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Review an appeal (approve or deny)
   */
  async reviewAppeal(sanctionId: string, approved: boolean, reviewNotes?: string): Promise<void> {
    try {
      await apiService.post(`/moderation/sanctions/${sanctionId}/appeal/review`, {
        approved,
        reviewNotes,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      throw new Error(
        `Failed to review appeal: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get sanction statistics
   */
  async getSanctionStats(filters?: {
    startDate?: string;
    endDate?: string;
    moderatorId?: string;
    sanctionType?: SanctionType;
  }): Promise<SanctionStats> {
    try {
      const response = await apiService.get<SanctionStats>('/moderation/sanctions/stats', {
        params: filters,
      });
      return response.data;
    } catch (error) {
      throw new Error(
        `Failed to get sanction stats: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get user sanction history with risk assessment
   */
  async getUserSanctionHistory(userId: string): Promise<UserSanctionHistory> {
    try {
      const response = await apiService.get<UserSanctionHistory>(
        `/moderation/sanctions/user/${userId}/history`
      );
      return response.data;
    } catch (error) {
      throw new Error(
        `Failed to get user sanction history: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Check if user is currently sanctioned
   */
  async isUserSanctioned(userId: string): Promise<{
    isSanctioned: boolean;
    activeSanctions: UserSanction[];
    highestSanctionType?: SanctionType;
    canPost: boolean;
    canCreateDiscussion: boolean;
    restrictionEndDate?: string;
  }> {
    try {
      const response = await apiService.get<{
        isSanctioned: boolean;
        activeSanctions: UserSanction[];
        highestSanctionType?: SanctionType;
        canPost: boolean;
        canCreateDiscussion: boolean;
        restrictionEndDate?: string;
      }>(`/moderation/sanctions/user/${userId}/status`);
      return response.data;
    } catch (error) {
      throw new Error(
        `Failed to check user sanction status: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get sanctions that are about to expire
   */
  async getExpiringSanctions(hoursAhead: number = 24): Promise<UserSanction[]> {
    try {
      const response = await apiService.get<UserSanction[]>('/moderation/sanctions/expiring', {
        params: { hoursAhead },
      });
      return response.data;
    } catch (error) {
      throw new Error(
        `Failed to get expiring sanctions: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Extend a temporary sanction
   */
  async extendSanction(
    sanctionId: string,
    additionalHours: number,
    reason: string
  ): Promise<UserSanction> {
    try {
      const response = await apiService.post<UserSanction>(
        `/moderation/sanctions/${sanctionId}/extend`,
        {
          additionalHours,
          reason,
          timestamp: new Date().toISOString(),
        }
      );
      return response.data;
    } catch (error) {
      throw new Error(
        `Failed to extend sanction: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Convert a temporary sanction to permanent
   */
  async convertToPermanent(sanctionId: string, reason: string): Promise<UserSanction> {
    try {
      const response = await apiService.post<UserSanction>(
        `/moderation/sanctions/${sanctionId}/convert-permanent`,
        {
          reason,
          timestamp: new Date().toISOString(),
        }
      );
      return response.data;
    } catch (error) {
      throw new Error(
        `Failed to convert sanction to permanent: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get sanctions by moderator
   */
  async getSanctionsByModerator(
    moderatorId: string,
    filters?: SanctionFilters
  ): Promise<UserSanction[]> {
    try {
      const response = await apiService.get<UserSanction[]>(
        `/moderation/sanctions/moderator/${moderatorId}`,
        {
          params: filters,
        }
      );
      return response.data;
    } catch (error) {
      throw new Error(
        `Failed to get sanctions by moderator: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Bulk revoke sanctions
   */
  async bulkRevokeSanctions(sanctionIds: string[], reason: string): Promise<void> {
    try {
      await apiService.post('/moderation/sanctions/bulk-revoke', {
        sanctionIds,
        reason,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      throw new Error(
        `Failed to bulk revoke sanctions: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get sanction templates for common violations
   */
  async getSanctionTemplates(): Promise<
    Array<{
      id: string;
      name: string;
      sanctionType: SanctionType;
      reason: string;
      description: string;
      duration?: number;
      category: string;
    }>
  > {
    try {
      const response = await apiService.get<
        {
          id: string;
          name: string;
          sanctionType: SanctionType;
          reason: string;
          description: string;
          duration?: number | undefined;
          category: string;
        }[]
      >('/moderation/sanctions/templates');
      return response.data;
    } catch (error) {
      throw new Error(
        `Failed to get sanction templates: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Create a sanction template
   */
  async createSanctionTemplate(template: {
    name: string;
    sanctionType: SanctionType;
    reason: string;
    description: string;
    duration?: number;
    category: string;
  }): Promise<void> {
    try {
      await apiService.post('/moderation/sanctions/templates', template);
    } catch (error) {
      throw new Error(
        `Failed to create sanction template: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Export sanction data
   */
  async exportSanctionData(filters?: {
    startDate?: string;
    endDate?: string;
    sanctionType?: SanctionType;
    moderatorId?: string;
    format?: 'csv' | 'json';
  }): Promise<Blob> {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_GATEWAY_URL}/moderation/sanctions/export`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('owlnest_auth_token')}`,
          },
          body: JSON.stringify(filters),
        }
      );

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }

      return await response.blob();
    } catch (error) {
      throw new Error(
        `Failed to export sanction data: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get automated sanction rules
   */
  async getAutomatedSanctionRules(): Promise<
    Array<{
      id: string;
      name: string;
      description: string;
      conditions: Array<{
        type: 'report_count' | 'violation_type' | 'user_history' | 'time_period';
        operator: 'equals' | 'greater_than' | 'less_than' | 'contains';
        value: any;
      }>;
      action: {
        sanctionType: SanctionType;
        duration?: number;
        reason: string;
      };
      isActive: boolean;
      priority: number;
    }>
  > {
    try {
      const response = await apiService.get<
        {
          id: string;
          name: string;
          description: string;
          conditions: Array<{
            type: 'report_count' | 'violation_type' | 'user_history' | 'time_period';
            operator: 'equals' | 'greater_than' | 'less_than' | 'contains';
            value: any;
          }>;
          action: {
            sanctionType: SanctionType;
            duration?: number;
            reason: string;
          };
          isActive: boolean;
          priority: number;
        }[]
      >('/moderation/sanctions/automated-rules');
      return response.data;
    } catch (error) {
      throw new Error(
        `Failed to get automated sanction rules: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Create an automated sanction rule
   */
  async createAutomatedSanctionRule(rule: {
    name: string;
    description: string;
    conditions: Array<{
      type: 'report_count' | 'violation_type' | 'user_history' | 'time_period';
      operator: 'equals' | 'greater_than' | 'less_than' | 'contains';
      value: any;
    }>;
    action: {
      sanctionType: SanctionType;
      duration?: number;
      reason: string;
    };
    priority: number;
  }): Promise<void> {
    try {
      await apiService.post('/moderation/sanctions/automated-rules', rule);
    } catch (error) {
      throw new Error(
        `Failed to create automated sanction rule: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Process automated sanctions for a user
   */
  async processAutomatedSanctions(
    userId: string,
    context: {
      reportCount?: number;
      violationType?: string;
      postId?: string;
      discussionId?: string;
    }
  ): Promise<{
    sanctionsApplied: UserSanction[];
    rulesTriggered: string[];
  }> {
    try {
      const response = await apiService.post<{
        sanctionsApplied: UserSanction[];
        rulesTriggered: string[];
      }>(`/moderation/sanctions/user/${userId}/process-automated`, {
        context,
        timestamp: new Date().toISOString(),
      });
      return response.data;
    } catch (error) {
      throw new Error(
        `Failed to process automated sanctions: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Send notification to sanctioned user
   */
  async notifyUser(
    sanctionId: string,
    method: 'email' | 'in_app' | 'both' = 'both'
  ): Promise<void> {
    try {
      await apiService.post(`/moderation/sanctions/${sanctionId}/notify`, {
        method,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      throw new Error(
        `Failed to notify user: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get sanction notification templates
   */
  async getNotificationTemplates(): Promise<
    Array<{
      id: string;
      sanctionType: SanctionType;
      subject: string;
      emailTemplate: string;
      inAppTemplate: string;
      language: string;
    }>
  > {
    try {
      const response = await apiService.get<
        {
          id: string;
          sanctionType: SanctionType;
          subject: string;
          emailTemplate: string;
          inAppTemplate: string;
          language: string;
        }[]
      >('/moderation/sanctions/notification-templates');
      return response.data;
    } catch (error) {
      throw new Error(
        `Failed to get notification templates: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}

export const userSanctionService = new UserSanctionService();
