import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UserSanctionManager } from '../UserSanctionManager';
import { userSanctionService } from '../../../services/userSanctionService';
import { SanctionType, UserSanction } from '../../../types/moderation';

import { EntityType } from '@/types/common';

// Mock the service
jest.mock('../../../services/userSanctionService');
const mockUserSanctionService = userSanctionService as jest.Mocked<typeof userSanctionService>;
const makeSanction = (
  base: Omit<UserSanction, 'PK' | 'SK' | 'GSI1PK' | 'GSI1SK' | 'EntityType'>
): UserSanction => {
  // const { sanctionId, userId, moderatorId, ...rest } = base;
  return {
    ...base,
    // 残り
    // ...rest,
    // DynamoDB keys
    PK: `USER#${base.userId}`,
    SK: `SANCTION#${base.sanctionId}`,
    GSI1PK: `MODERATOR#${base.moderatorId}`,
    GSI1SK: `SANCTION#${base.sanctionId}`,
    EntityType: EntityType.USER_SANCTION,
    userId: base.userId,
    sanctionId: base.sanctionId,
    moderatorId: base.moderatorId,
    userDisplayName: base.userDisplayName,
    moderatorDisplayName: base.modeeratorDisplayName,
    sanctionType: base.sanctionType,
    reason: base.reason,
    description: base.desctiption,
    startDate: base.startDate,
    isActive: base.isActive,
    isAppealed: base.isAppend,
    previousSanctions: base.previousSanctions,
    userNotified: base.userNotified,
    notifiedAt: base.notifiedAt,
    notificationMethod: base.notificationMethod,
    createdAt: base.creaatedAt,
    updatedAt: base.updatedAt,

    // required domain fields
    // sanctionId,
    // userId,
    // moderatorId,
  };
};
const mockSanctions: UserSanction[] = [
  makeSanction({
    sanctionId: 'sanction-1',
    userId: 'user-1',
    userDisplayName: 'Test User',
    moderatorId: 'mod-1',
    moderatorDisplayName: 'Test Moderator',
    sanctionType: SanctionType.WARNING,
    reason: 'Inappropriate behavior',
    description: 'User posted inappropriate content',
    startDate: '2024-01-01T00:00:00Z',
    isActive: true,
    isAppealed: false,
    previousSanctions: [],
    userNotified: true,
    notifiedAt: '2024-01-01T00:00:00Z',
    notificationMethod: 'both',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  }),
  makeSanction({
    sanctionId: 'sanction-2',
    userId: 'user-2',
    userDisplayName: 'Another User',
    moderatorId: 'mod-1',
    moderatorDisplayName: 'Test Moderator',
    sanctionType: SanctionType.TEMPORARY_SUSPENSION,
    reason: 'Spam posting',
    description: 'User posted spam content multiple times',
    startDate: '2024-01-02T00:00:00Z',
    endDate: '2024-01-09T00:00:00Z',
    duration: 168,
    isActive: true,
    isAppealed: true,
    appealStatus: 'pending',
    appealReason: 'I believe this was a mistake',
    appealedAt: '2024-01-03T00:00:00Z',
    previousSanctions: [],
    userNotified: true,
    notifiedAt: '2024-01-02T00:00:00Z',
    notificationMethod: 'email',
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-03T00:00:00Z',
  }),
];
// Mock data
// const mockSanctions = [
//   {
//     sanctionId: 'sanction-1',
//     userId: 'user-1',
//     userDisplayName: 'Test User',
//     moderatorId: 'mod-1',
//     moderatorDisplayName: 'Test Moderator',
//     sanctionType: SanctionType.WARNING,
//     reason: 'Inappropriate behavior',
//     description: 'User posted inappropriate content',
//     startDate: '2024-01-01T00:00:00Z',
//     isActive: true,
//     isAppealed: false,
//     previousSanctions: [],
//     userNotified: true,
//     notifiedAt: '2024-01-01T00:00:00Z',
//     notificationMethod: 'both',
//     createdAt: '2024-01-01T00:00:00Z',
//     updatedAt: '2024-01-01T00:00:00Z',
//   },
//   {
//     sanctionId: 'sanction-2',
//     userId: 'user-2',
//     userDisplayName: 'Another User',
//     moderatorId: 'mod-1',
//     moderatorDisplayName: 'Test Moderator',
//     sanctionType: SanctionType.TEMPORARY_SUSPENSION,
//     reason: 'Spam posting',
//     description: 'User posted spam content multiple times',
//     startDate: '2024-01-02T00:00:00Z',
//     endDate: '2024-01-09T00:00:00Z',
//     duration: 168,
//     isActive: true,
//     isAppealed: true,
//     appealStatus: 'pending',
//     appealReason: 'I believe this was a mistake',
//     appealedAt: '2024-01-03T00:00:00Z',
//     previousSanctions: [],
//     userNotified: true,
//     notifiedAt: '2024-01-02T00:00:00Z',
//     notificationMethod: 'email',
//     createdAt: '2024-01-02T00:00:00Z',
//     updatedAt: '2024-01-03T00:00:00Z',
//   },
// ];

describe('UserSanctionManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUserSanctionService.getAllSanctions.mockResolvedValue(mockSanctions);
    mockUserSanctionService.getUserSanctions.mockResolvedValue(mockSanctions);
  });

  describe('Rendering', () => {
    it('renders loading state initially', () => {
      render(<UserSanctionManager />);
      expect(screen.getByText('読み込み中...')).toBeInTheDocument();
    });

    it('renders sanctions list after loading', async () => {
      render(<UserSanctionManager />);

      await waitFor(() => {
        expect(screen.getByText('制裁管理')).toBeInTheDocument();
      });

      expect(screen.getByText('Test User')).toBeInTheDocument();
      expect(screen.getByText('Another User')).toBeInTheDocument();
    });

    it('renders user-specific title when userId is provided', async () => {
      render(<UserSanctionManager userId="user-1" />);

      await waitFor(() => {
        expect(screen.getByText('ユーザー制裁履歴')).toBeInTheDocument();
      });
    });

    it('shows create sanction button for general view', async () => {
      render(<UserSanctionManager />);

      await waitFor(() => {
        expect(screen.getByText('新しい制裁を作成')).toBeInTheDocument();
      });
    });

    it('does not show create sanction button for user-specific view', async () => {
      render(<UserSanctionManager userId="user-1" />);

      await waitFor(() => {
        expect(screen.queryByText('新しい制裁を作成')).not.toBeInTheDocument();
      });
    });
  });

  describe('Sanction Cards', () => {
    it('displays sanction information correctly', async () => {
      render(<UserSanctionManager />);

      await waitFor(() => {
        expect(screen.getByText('警告')).toBeInTheDocument();
        expect(screen.getByText('一時停止')).toBeInTheDocument();
        expect(screen.getByText('Inappropriate behavior')).toBeInTheDocument();
        expect(screen.getByText('Spam posting')).toBeInTheDocument();
      });
    });

    it('shows appeal status for appealed sanctions', async () => {
      render(<UserSanctionManager />);

      await waitFor(() => {
        expect(screen.getByText('審査中')).toBeInTheDocument();
        expect(screen.getByText('I believe this was a mistake')).toBeInTheDocument();
      });
    });

    it('shows revoke button for active sanctions', async () => {
      render(<UserSanctionManager />);

      await waitFor(() => {
        const revokeButtons = screen.getAllByText('制裁を取り消す');
        expect(revokeButtons).toHaveLength(2);
      });
    });

    it('shows appeal review buttons for pending appeals', async () => {
      render(<UserSanctionManager />);

      await waitFor(() => {
        expect(screen.getByText('異議を承認')).toBeInTheDocument();
        expect(screen.getByText('異議を却下')).toBeInTheDocument();
      });
    });

    it('shows notification button for active sanctions', async () => {
      render(<UserSanctionManager />);

      await waitFor(() => {
        const notificationButtons = screen.getAllByTitle('ユーザーに通知を再送信');
        expect(notificationButtons).toHaveLength(2);
      });
    });
  });

  describe('Filtering', () => {
    it('filters by sanction type', async () => {
      render(<UserSanctionManager />);

      await waitFor(() => {
        const typeFilter = screen.getByDisplayValue('すべて');
        fireEvent.change(typeFilter, { target: { value: 'warning' } });
      });

      expect(mockUserSanctionService.getAllSanctions).toHaveBeenCalledWith({
        isActive: true,
        sanctionType: 'warning',
      });
    });

    it('filters by active status', async () => {
      render(<UserSanctionManager />);

      await waitFor(() => {
        const activeFilter = screen.getByLabelText('アクティブな制裁のみ');
        fireEvent.click(activeFilter);
      });

      expect(mockUserSanctionService.getAllSanctions).toHaveBeenCalledWith({
        isActive: undefined,
      });
    });

    it('filters by appeal status', async () => {
      render(<UserSanctionManager />);

      await waitFor(() => {
        const appealFilter = screen.getByDisplayValue('すべて');
        fireEvent.change(appealFilter, { target: { value: 'true' } });
      });

      expect(mockUserSanctionService.getAllSanctions).toHaveBeenCalledWith({
        isActive: true,
        isAppealed: true,
      });
    });
  });

  describe('Actions', () => {
    it('handles sanction creation', async () => {
      mockUserSanctionService.createSanction.mockResolvedValue({
        ...mockSanctions[0],
        sanctionId: 'new-sanction',
      });
      mockUserSanctionService.notifyUser.mockResolvedValue();

      render(<UserSanctionManager />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('新しい制裁を作成'));
      });

      // Fill out the form
      fireEvent.change(screen.getByPlaceholderText('ユーザーIDを入力してください'), {
        target: { value: 'user-3' },
      });
      fireEvent.change(screen.getByPlaceholderText('制裁の理由を入力してください'), {
        target: { value: 'Test reason' },
      });

      fireEvent.click(screen.getByText('制裁を作成'));

      await waitFor(() => {
        expect(mockUserSanctionService.createSanction).toHaveBeenCalledWith({
          userId: 'user-3',
          sanctionType: 'warning',
          reason: 'Test reason',
          description: '',
        });
        expect(mockUserSanctionService.notifyUser).toHaveBeenCalledWith('new-sanction', 'both');
      });
    });

    it('handles sanction revocation', async () => {
      mockUserSanctionService.revokeSanction.mockResolvedValue();

      render(<UserSanctionManager />);

      await waitFor(() => {
        fireEvent.click(screen.getAllByText('制裁を取り消す')[0]);
      });

      // Fill out revocation reason
      fireEvent.change(screen.getByPlaceholderText('取り消し理由を入力してください...'), {
        target: { value: 'Mistake in judgment' },
      });

      fireEvent.click(screen.getByText('取り消し'));

      await waitFor(() => {
        expect(mockUserSanctionService.revokeSanction).toHaveBeenCalledWith(
          'sanction-1',
          'Mistake in judgment'
        );
      });
    });

    it('handles appeal review', async () => {
      mockUserSanctionService.reviewAppeal.mockResolvedValue();

      render(<UserSanctionManager />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('異議を承認'));
      });

      await waitFor(() => {
        expect(mockUserSanctionService.reviewAppeal).toHaveBeenCalledWith(
          'sanction-2',
          true,
          undefined
        );
      });
    });

    it('handles manual notification', async () => {
      mockUserSanctionService.notifyUser.mockResolvedValue();

      render(<UserSanctionManager />);

      await waitFor(() => {
        fireEvent.click(screen.getAllByTitle('ユーザーに通知を再送信')[0]);
      });

      await waitFor(() => {
        expect(mockUserSanctionService.notifyUser).toHaveBeenCalledWith('sanction-1', 'both');
      });
    });
  });

  describe('Error Handling', () => {
    it('displays error message when loading fails', async () => {
      mockUserSanctionService.getAllSanctions.mockRejectedValue(new Error('Network error'));

      render(<UserSanctionManager />);

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });

    it('displays error message when action fails', async () => {
      mockUserSanctionService.revokeSanction.mockRejectedValue(new Error('Revocation failed'));

      render(<UserSanctionManager />);

      await waitFor(() => {
        fireEvent.click(screen.getAllByText('制裁を取り消す')[0]);
      });

      fireEvent.change(screen.getByPlaceholderText('取り消し理由を入力してください...'), {
        target: { value: 'Test reason' },
      });

      fireEvent.click(screen.getByText('取り消し'));

      await waitFor(() => {
        expect(screen.getByText('Revocation failed')).toBeInTheDocument();
      });
    });

    it('allows error dismissal', async () => {
      mockUserSanctionService.getAllSanctions.mockRejectedValue(new Error('Network error'));

      render(<UserSanctionManager />);

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('×'));

      expect(screen.queryByText('Network error')).not.toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('shows empty state when no sanctions exist', async () => {
      mockUserSanctionService.getAllSanctions.mockResolvedValue([]);

      render(<UserSanctionManager />);

      await waitFor(() => {
        expect(screen.getByText('制裁が見つかりませんでした。')).toBeInTheDocument();
      });
    });

    it('shows user-specific empty state', async () => {
      mockUserSanctionService.getUserSanctions.mockResolvedValue([]);

      render(<UserSanctionManager userId="user-1" />);

      await waitFor(() => {
        expect(screen.getByText('このユーザーに対する制裁はありません。')).toBeInTheDocument();
      });
    });
  });
});
