import { useState, useEffect, useCallback } from 'react';
import { userSanctionService } from '../services/userSanctionService';
import { UserSanction, SanctionType } from '../types/moderation';
import { useAuth } from '../contexts/AuthContext';

interface UserSanctionStatus {
  isSanctioned: boolean;
  activeSanctions: UserSanction[];
  highestSanctionType?: SanctionType;
  canPost: boolean;
  canCreateDiscussion: boolean;
  restrictionEndDate?: string;
}

interface UseUserSanctionStatusReturn {
  status: UserSanctionStatus | null;
  loading: boolean;
  error: string | null;
  checkStatus: (userId?: string) => Promise<void>;
  refreshStatus: () => Promise<void>;
}

export const useUserSanctionStatus = (userId?: string): UseUserSanctionStatusReturn => {
  const [status, setStatus] = useState<UserSanctionStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const checkStatus = useCallback(
    async (targetUserId?: string) => {
      const userIdToCheck = targetUserId || userId || user?.userId;

      if (!userIdToCheck) {
        setError('ユーザーIDが指定されていません');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await userSanctionService.isUserSanctioned(userIdToCheck);
        setStatus(response);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'ユーザー制裁状況の確認に失敗しました';
        setError(errorMessage);
        console.error('Failed to check user sanction status:', err);
      } finally {
        setLoading(false);
      }
    },
    [userId, user?.userId]
  );

  const refreshStatus = useCallback(async () => {
    await checkStatus();
  }, [checkStatus]);

  // Auto-check status when user or userId changes
  useEffect(() => {
    if (user?.userId || userId) {
      checkStatus();
    }
  }, [user?.userId, userId, checkStatus]);

  // Auto-refresh status periodically (every 5 minutes)
  useEffect(() => {
    if (!status) return;

    const interval = setInterval(
      () => {
        refreshStatus();
      },
      5 * 60 * 1000
    ); // 5 minutes

    return () => clearInterval(interval);
  }, [status, refreshStatus]);

  return {
    status,
    loading,
    error,
    checkStatus,
    refreshStatus,
  };
};

export default useUserSanctionStatus;
