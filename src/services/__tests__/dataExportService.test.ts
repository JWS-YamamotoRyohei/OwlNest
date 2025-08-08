import dataExportService, { ExportOptions } from '../dataExportService';

// Mock fetch globally
global.fetch = jest.fn();

describe('DataExportService', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(() => 'mock-token'),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
      },
      writable: true,
    });

    // Mock URL.createObjectURL and revokeObjectURL
    global.URL.createObjectURL = jest.fn(() => 'mock-url');
    global.URL.revokeObjectURL = jest.fn();

    // Mock document methods
    const mockLink = {
      href: '',
      download: '',
      click: jest.fn(),
    };
    document.createElement = jest.fn(() => mockLink as any);
    document.body.appendChild = jest.fn();
    document.body.removeChild = jest.fn();
  });

  describe('exportDiscussionStatistics', () => {
    it('should export discussion statistics in CSV format', async () => {
      const mockData = [
        {
          discussionId: '1',
          title: 'Test Discussion',
          participantCount: 10,
          postCount: 25,
          engagementRate: 0.75,
        },
      ];

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      const options: ExportOptions = {
        format: 'csv',
        includeMetadata: true,
      };

      const result = await dataExportService.exportDiscussionStatistics(['1'], options);

      expect(fetch).toHaveBeenCalledWith(
        '/api/analytics/export/discussions/statistics',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer mock-token',
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({
            discussionIds: ['1'],
            options,
          }),
        })
      );

      expect(result.filename).toMatch(/export_.*\.csv/);
      expect(result.mimeType).toBe('text/csv');
      expect(result.data).toContain('discussionId,title,participantCount,postCount,engagementRate');
    });

    it('should export discussion statistics in JSON format', async () => {
      const mockData = [
        {
          discussionId: '1',
          title: 'Test Discussion',
          participantCount: 10,
          postCount: 25,
          engagementRate: 0.75,
        },
      ];

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      const options: ExportOptions = {
        format: 'json',
        includeMetadata: true,
      };

      const result = await dataExportService.exportDiscussionStatistics(['1'], options);

      expect(result.filename).toMatch(/export_.*\.json/);
      expect(result.mimeType).toBe('application/json');
      expect(JSON.parse(result.data)).toEqual(mockData);
    });

    it('should return mock data when API fails', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const options: ExportOptions = {
        format: 'csv',
        includeMetadata: true,
      };

      const result = await dataExportService.exportDiscussionStatistics(['1'], options);

      expect(result.filename).toMatch(/export_.*\.csv/);
      expect(result.mimeType).toBe('text/csv');
      expect(result.data).toContain('discussionId');
    });
  });

  describe('exportPlatformStatistics', () => {
    it('should export platform statistics', async () => {
      const mockData = {
        totalUsers: 1000,
        activeUsers: 750,
        totalDiscussions: 200,
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [mockData],
      });

      const filter = {
        timeRange: {
          start: '2024-01-01T00:00:00Z',
          end: '2024-01-31T23:59:59Z',
          period: 'day' as const,
        },
      };

      const options: ExportOptions = {
        format: 'json',
        includeMetadata: true,
      };

      const result = await dataExportService.exportPlatformStatistics(filter, options);

      expect(fetch).toHaveBeenCalledWith(
        '/api/analytics/export/platform/statistics',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ filter, options }),
        })
      );

      expect(result.filename).toMatch(/export_.*\.json/);
      expect(result.mimeType).toBe('application/json');
    });
  });

  describe('exportTrendData', () => {
    it('should export trend data for specific metric', async () => {
      const mockData = [
        {
          date: '2024-01-01',
          metric: 'posts',
          value: 100,
          change: 5,
          changePercentage: 5.0,
        },
      ];

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      const filter = {
        timeRange: {
          start: '2024-01-01T00:00:00Z',
          end: '2024-01-31T23:59:59Z',
          period: 'day' as const,
        },
      };

      const options: ExportOptions = {
        format: 'csv',
        includeMetadata: true,
      };

      const result = await dataExportService.exportTrendData('posts', filter, options);

      expect(fetch).toHaveBeenCalledWith(
        '/api/analytics/export/trends/posts',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ filter, options }),
        })
      );

      expect(result.filename).toMatch(/export_.*\.csv/);
      expect(result.mimeType).toBe('text/csv');
    });
  });

  describe('downloadExport', () => {
    it('should trigger file download', () => {
      const exportResult = {
        filename: 'test.csv',
        data: 'test,data\n1,2',
        mimeType: 'text/csv',
        size: 100,
      };

      dataExportService.downloadExport(exportResult);

      expect(document.createElement).toHaveBeenCalledWith('a');
      expect(document.body.appendChild).toHaveBeenCalled();
      expect(document.body.removeChild).toHaveBeenCalled();
    });
  });

  describe('validateExportOptions', () => {
    it('should validate export options correctly', () => {
      const validOptions: ExportOptions = {
        format: 'csv',
        maxRecords: 1000,
        includeMetadata: true,
      };

      const errors = dataExportService.validateExportOptions(validOptions);
      expect(errors).toHaveLength(0);
    });

    it('should return errors for invalid format', () => {
      const invalidOptions: ExportOptions = {
        format: 'xml' as any,
        includeMetadata: true,
      };

      const errors = dataExportService.validateExportOptions(invalidOptions);
      expect(errors).toContain('有効なフォーマット（csv または json）を選択してください');
    });

    it('should return errors for invalid max records', () => {
      const invalidOptions: ExportOptions = {
        format: 'csv',
        maxRecords: 200000,
        includeMetadata: true,
      };

      const errors = dataExportService.validateExportOptions(invalidOptions);
      expect(errors).toContain('最大レコード数は1から100,000の間で指定してください');
    });

    it('should return errors for invalid date range', () => {
      const invalidOptions: ExportOptions = {
        format: 'csv',
        dateRange: {
          start: '2024-01-31T00:00:00Z',
          end: '2024-01-01T00:00:00Z',
        },
        includeMetadata: true,
      };

      const errors = dataExportService.validateExportOptions(invalidOptions);
      expect(errors).toContain('開始日は終了日より前の日付を指定してください');
    });
  });

  describe('formatFileSize', () => {
    it('should format file sizes correctly', () => {
      expect(dataExportService.formatFileSize(0)).toBe('0 Bytes');
      expect(dataExportService.formatFileSize(1024)).toBe('1 KB');
      expect(dataExportService.formatFileSize(1048576)).toBe('1 MB');
      expect(dataExportService.formatFileSize(1073741824)).toBe('1 GB');
    });
  });
});
