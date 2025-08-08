import { apiService } from './api';
import { ContentFilterRule, ReportCategory } from '../types/moderation';

/**
 * Content analysis result
 */
export interface ContentAnalysisResult {
  isAppropriate: boolean;
  confidence: number;
  detectedIssues: Array<{
    type: ReportCategory;
    severity: 'low' | 'medium' | 'high';
    confidence: number;
    matchedRule?: string;
    matchedPattern?: string;
    description: string;
  }>;
  suggestedAction: 'allow' | 'flag' | 'hide' | 'delete' | 'queue_for_review';
  explanation: string;
}

/**
 * Spam detection result
 */
export interface SpamDetectionResult {
  isSpam: boolean;
  confidence: number;
  reasons: string[];
  spamScore: number; // 0-100
  detectedPatterns: Array<{
    type:
      | 'duplicate_content'
      | 'excessive_links'
      | 'promotional'
      | 'repetitive_text'
      | 'suspicious_patterns';
    description: string;
    confidence: number;
  }>;
}

/**
 * Content filter configuration
 */
export interface ContentFilterConfig {
  enabledFilters: string[];
  strictMode: boolean;
  autoActionThreshold: number; // Confidence threshold for automatic actions
  queueThreshold: number; // Confidence threshold for queuing for review
  customKeywords: string[];
  whitelistedDomains: string[];
  blacklistedDomains: string[];
}

/**
 * Filter match result
 */
export interface FilterMatchResult {
  filterId: string;
  filterName: string;
  matched: boolean;
  confidence: number;
  matchedText?: string;
  suggestedAction: 'flag' | 'hide' | 'delete' | 'queue_for_review';
  explanation: string;
}

export class ContentFilterService {
  private readonly ngWords = [
    // 基本的な不適切語句（実際の実装では外部設定ファイルから読み込み）
    'スパム',
    'spam',
    '詐欺',
    'scam',
    '荒らし',
    'troll',
    '誹謗中傷',
    '差別',
    'discrimination',
    'harassment',
    '暴力',
    'violence',
    '脅迫',
    'threat',
    '殺害',
    'kill',
    // 追加のNGワードは設定で管理
  ];

  private readonly spamPatterns = [
    /(.)\1{10,}/, // 同じ文字の連続
    /https?:\/\/[^\s]+/gi, // URL検出
    /\b\d{10,}\b/g, // 長い数字列
    /[!]{5,}/g, // 感嘆符の連続
    /[?]{5,}/g, // 疑問符の連続
  ];

  /**
   * Analyze content for inappropriate material
   */
  async analyzeContent(
    content: string,
    metadata?: {
      authorId?: string;
      discussionId?: string;
      contentType?: 'post' | 'comment' | 'discussion_title';
    }
  ): Promise<ContentAnalysisResult> {
    try {
      // クライアントサイドでの基本的な分析
      const basicAnalysis = this.performBasicAnalysis(content);

      // サーバーサイドでの詳細分析
      const response = await apiService.post('/moderation/content/analyze', {
        content,
        metadata,
        basicAnalysis,
      });

      return response.data as ContentAnalysisResult;
    } catch (error) {
      // フォールバック: クライアントサイドの基本分析のみ
      console.warn('Server-side content analysis failed, using basic analysis:', error);
      return this.performBasicAnalysis(content);
    }
  }

  /**
   * Detect spam content
   */
  async detectSpam(
    content: string,
    metadata?: {
      authorId?: string;
      authorPostHistory?: number;
      ipAddress?: string;
    }
  ): Promise<SpamDetectionResult> {
    try {
      const response = await apiService.post('/moderation/content/spam-detection', {
        content,
        metadata,
      });

      return response.data as SpamDetectionResult;
    } catch (error) {
      // フォールバック: クライアントサイドのスパム検出
      console.warn('Server-side spam detection failed, using basic detection:', error);
      return this.performBasicSpamDetection(content);
    }
  }

  /**
   * Get active content filters
   */
  async getActiveFilters(): Promise<ContentFilterRule[]> {
    try {
      const response = await apiService.get('/moderation/filters/active');
      return response.data as ContentFilterRule[];
    } catch (error) {
      throw new Error(
        `Failed to get active filters: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Create a new content filter
   */
  async createFilter(
    filterData: Omit<
      ContentFilterRule,
      'filterId' | 'createdAt' | 'updatedAt' | 'PK' | 'SK' | 'EntityType' | 'stats'
    >
  ): Promise<ContentFilterRule> {
    try {
      const response = await apiService.post('/moderation/filters', filterData);
      return response.data as ContentFilterRule;
    } catch (error) {
      throw new Error(
        `Failed to create filter: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Update a content filter
   */
  async updateFilter(
    filterId: string,
    updates: Partial<ContentFilterRule>
  ): Promise<ContentFilterRule> {
    try {
      const response = await apiService.put(`/moderation/filters/${filterId}`, updates);
      return response.data as ContentFilterRule;
    } catch (error) {
      throw new Error(
        `Failed to update filter: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Delete a content filter
   */
  async deleteFilter(filterId: string): Promise<void> {
    try {
      await apiService.delete(`/moderation/filters/${filterId}`);
    } catch (error) {
      throw new Error(
        `Failed to delete filter: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Test a filter against content
   */
  async testFilter(filterId: string, content: string): Promise<FilterMatchResult> {
    try {
      const response = await apiService.post(`/moderation/filters/${filterId}/test`, {
        content,
      });
      return response.data as FilterMatchResult;
    } catch (error) {
      throw new Error(
        `Failed to test filter: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get filter statistics
   */
  async getFilterStats(
    filterId: string,
    timeRange?: {
      startDate: string;
      endDate: string;
    }
  ): Promise<{
    totalMatches: number;
    truePositives: number;
    falsePositives: number;
    accuracy: number;
    recentMatches: Array<{
      contentId: string;
      matchedAt: string;
      confidence: number;
      wasCorrect?: boolean;
    }>;
  }> {
    try {
      // Build URL with query parameters if timeRange is provided
      let endpoint = `/moderation/filters/${filterId}/stats`;
      if (timeRange) {
        const params = new URLSearchParams({
          startDate: timeRange.startDate,
          endDate: timeRange.endDate,
        });
        endpoint += `?${params.toString()}`;
      }

      const response = await apiService.get(endpoint);
      return response.data as {
        totalMatches: number;
        truePositives: number;
        falsePositives: number;
        accuracy: number;
        recentMatches: Array<{
          contentId: string;
          matchedAt: string;
          confidence: number;
          wasCorrect?: boolean;
        }>;
      };
    } catch (error) {
      throw new Error(
        `Failed to get filter stats: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Update filter accuracy based on moderation feedback
   */
  async updateFilterAccuracy(
    filterId: string,
    contentId: string,
    wasCorrect: boolean
  ): Promise<void> {
    try {
      await apiService.post(`/moderation/filters/${filterId}/feedback`, {
        contentId,
        wasCorrect,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      throw new Error(
        `Failed to update filter accuracy: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get content filter configuration
   */
  async getFilterConfig(): Promise<ContentFilterConfig> {
    try {
      const response = await apiService.get('/moderation/config/filters');
      return response.data as ContentFilterConfig;
    } catch (error) {
      throw new Error(
        `Failed to get filter config: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Update content filter configuration
   */
  async updateFilterConfig(config: Partial<ContentFilterConfig>): Promise<ContentFilterConfig> {
    try {
      const response = await apiService.put('/moderation/config/filters', config);
      return response.data as ContentFilterConfig;
    } catch (error) {
      throw new Error(
        `Failed to update filter config: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Perform basic client-side content analysis
   */
  private performBasicAnalysis(content: string): ContentAnalysisResult {
    const detectedIssues: ContentAnalysisResult['detectedIssues'] = [];
    let maxSeverity: 'low' | 'medium' | 'high' = 'low';

    // NGワード検出
    const lowerContent = content.toLowerCase();
    for (const ngWord of this.ngWords) {
      if (lowerContent.includes(ngWord.toLowerCase())) {
        const severity = this.getNGWordSeverity(ngWord);
        detectedIssues.push({
          type: ReportCategory.INAPPROPRIATE,
          severity,
          confidence: 0.8,
          matchedPattern: ngWord,
          description: `不適切な語句が検出されました: ${ngWord}`,
        });
        if (severity === 'high') maxSeverity = 'high';
        else if (severity === 'medium' && maxSeverity !== 'high') maxSeverity = 'medium';
      }
    }

    // スパムパターン検出
    const spamResult = this.performBasicSpamDetection(content);
    if (spamResult.isSpam) {
      detectedIssues.push({
        type: ReportCategory.SPAM,
        severity: spamResult.confidence > 0.8 ? 'high' : 'medium',
        confidence: spamResult.confidence,
        description: `スパムの可能性: ${spamResult.reasons.join(', ')}`,
      });
      if (spamResult.confidence > 0.8) maxSeverity = 'high';
      else if (maxSeverity !== 'high') maxSeverity = 'medium';
    }

    // 結果の決定
    const isAppropriate = detectedIssues.length === 0;
    const confidence =
      detectedIssues.length > 0 ? Math.max(...detectedIssues.map(issue => issue.confidence)) : 0.9;

    let suggestedAction: ContentAnalysisResult['suggestedAction'] = 'allow';
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
  }

  /**
   * Perform basic client-side spam detection
   */
  private performBasicSpamDetection(content: string): SpamDetectionResult {
    const detectedPatterns: SpamDetectionResult['detectedPatterns'] = [];
    const reasons: string[] = [];
    let spamScore = 0;

    // パターンマッチング
    for (const pattern of this.spamPatterns) {
      const matches = content.match(pattern);
      if (matches && matches.length > 0) {
        if (pattern === this.spamPatterns[0]) {
          // 同じ文字の連続
          detectedPatterns.push({
            type: 'repetitive_text',
            description: '同じ文字の異常な連続が検出されました',
            confidence: 0.9,
          });
          reasons.push('repetitive_text');
          spamScore += 30;
        } else if (pattern === this.spamPatterns[1]) {
          // URL検出
          if (matches.length > 3) {
            detectedPatterns.push({
              type: 'excessive_links',
              description: '過度なリンクが検出されました',
              confidence: 0.8,
            });
            reasons.push('excessive_links');
            spamScore += 25;
          }
        } else if (pattern === this.spamPatterns[2]) {
          // 長い数字列
          detectedPatterns.push({
            type: 'suspicious_patterns',
            description: '疑わしい数字パターンが検出されました',
            confidence: 0.7,
          });
          reasons.push('suspicious_patterns');
          spamScore += 20;
        } else if (pattern === this.spamPatterns[3] || pattern === this.spamPatterns[4]) {
          // 記号の連続
          detectedPatterns.push({
            type: 'suspicious_patterns',
            description: '記号の異常な連続が検出されました',
            confidence: 0.8,
          });
          reasons.push('suspicious_patterns');
          spamScore += 15;
        }
      }
    }

    // 文字数チェック
    if (content.length < 10) {
      spamScore += 10;
      reasons.push('too_short');
    } else if (content.length > 5000) {
      spamScore += 15;
      reasons.push('too_long');
    }

    // 大文字の割合チェック
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
  }

  /**
   * Get severity level for NG words
   */
  private getNGWordSeverity(word: string): 'low' | 'medium' | 'high' {
    const highSeverityWords = ['殺害', 'kill', '脅迫', 'threat', '暴力', 'violence'];
    const mediumSeverityWords = ['誹謗中傷', 'harassment', '差別', 'discrimination'];

    if (highSeverityWords.includes(word.toLowerCase())) {
      return 'high';
    } else if (mediumSeverityWords.includes(word.toLowerCase())) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Process content with automatic filtering
   */
  async processContentWithFilters(
    content: string,
    metadata?: {
      authorId?: string;
      discussionId?: string;
      contentType?: 'post' | 'comment' | 'discussion_title';
    }
  ): Promise<{
    shouldAllow: boolean;
    action: 'allow' | 'flag' | 'hide' | 'delete' | 'queue_for_review';
    reason?: string;
    confidence: number;
    triggeredFilters: FilterMatchResult[];
  }> {
    try {
      const response = await apiService.post('/moderation/content/process', {
        content,
        metadata,
      });
      return response.data as {
        shouldAllow: boolean;
        action: 'allow' | 'flag' | 'hide' | 'delete' | 'queue_for_review';
        reason?: string;
        confidence: number;
        triggeredFilters: FilterMatchResult[];
      };
    } catch (error) {
      // フォールバック処理
      console.warn('Server-side content processing failed, using basic processing:', error);

      const analysis = this.performBasicAnalysis(content);
      const spamResult = this.performBasicSpamDetection(content);

      const shouldAllow = analysis.isAppropriate && !spamResult.isSpam;
      const action = shouldAllow ? 'allow' : analysis.suggestedAction;
      const confidence = Math.max(analysis.confidence, spamResult.confidence);

      return {
        shouldAllow,
        action,
        reason: shouldAllow ? undefined : analysis.explanation,
        confidence,
        triggeredFilters: [], // 基本処理では空配列
      };
    }
  }
}
