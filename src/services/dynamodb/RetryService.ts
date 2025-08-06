import { DynamoDBError, DynamoDBErrorType } from './DynamoDBError';

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitterEnabled?: boolean;
}

export class RetryService {
  private config: RetryConfig;

  constructor(config: RetryConfig) {
    this.config = {
      ...config,
      jitterEnabled: config.jitterEnabled ?? true,
    };
  }

  /**
   * Execute a function with retry logic
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    customConfig?: Partial<RetryConfig>
  ): Promise<T> {
    const config = { ...this.config, ...customConfig };
    let lastError: any;

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        // Don't retry on the last attempt
        if (attempt === config.maxRetries) {
          break;
        }

        // Check if error is retryable
        if (!this.isRetryableError(error)) {
          break;
        }

        // Calculate delay for next retry
        const delay = this.calculateDelay(attempt, config);
        
        console.warn(
          `Operation failed (attempt ${attempt + 1}/${config.maxRetries + 1}), retrying in ${delay}ms:`,
          error instanceof Error ? error.message : String(error)
        );

        await this.sleep(delay);
      }
    }

    // If we get here, all retries failed
    throw DynamoDBError.fromError(lastError, 'executeWithRetry');
  }

  /**
   * Check if an error is retryable
   */
  private isRetryableError(error: any): boolean {
    // If it's already a DynamoDBError, use its retryable property
    if (error instanceof DynamoDBError) {
      return error.retryable;
    }

    // Check for specific error names/codes that are retryable
    const retryableErrorNames = [
      'ProvisionedThroughputExceededException',
      'RequestLimitExceeded',
      'ServiceUnavailable',
      'ThrottlingException',
      'InternalServerError',
      'ENOTFOUND',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ECONNRESET',
    ];

    const errorName = error.name || error.code;
    return retryableErrorNames.includes(errorName);
  }

  /**
   * Calculate delay for next retry using exponential backoff with jitter
   */
  private calculateDelay(attempt: number, config: RetryConfig): number {
    // Exponential backoff: baseDelay * (backoffMultiplier ^ attempt)
    let delay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt);

    // Cap at maxDelay
    delay = Math.min(delay, config.maxDelay);

    // Add jitter to avoid thundering herd problem
    if (config.jitterEnabled) {
      // Full jitter: random value between 0 and calculated delay
      delay = Math.random() * delay;
    }

    return Math.floor(delay);
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Create a retry service with default configuration
   */
  static createDefault(): RetryService {
    return new RetryService({
      maxRetries: 3,
      baseDelay: 100,
      maxDelay: 5000,
      backoffMultiplier: 2,
      jitterEnabled: true,
    });
  }

  /**
   * Create a retry service for high-throughput operations
   */
  static createHighThroughput(): RetryService {
    return new RetryService({
      maxRetries: 5,
      baseDelay: 50,
      maxDelay: 2000,
      backoffMultiplier: 1.5,
      jitterEnabled: true,
    });
  }

  /**
   * Create a retry service for critical operations
   */
  static createCritical(): RetryService {
    return new RetryService({
      maxRetries: 10,
      baseDelay: 200,
      maxDelay: 10000,
      backoffMultiplier: 2,
      jitterEnabled: true,
    });
  }
}