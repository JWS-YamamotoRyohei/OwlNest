export enum DynamoDBErrorType {
  CONDITIONAL_CHECK_FAILED = 'CONDITIONAL_CHECK_FAILED',
  ITEM_COLLECTION_SIZE_LIMIT_EXCEEDED = 'ITEM_COLLECTION_SIZE_LIMIT_EXCEEDED',
  LIMIT_EXCEEDED = 'LIMIT_EXCEEDED',
  PROVISIONED_THROUGHPUT_EXCEEDED = 'PROVISIONED_THROUGHPUT_EXCEEDED',
  REQUEST_LIMIT_EXCEEDED = 'REQUEST_LIMIT_EXCEEDED',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  THROTTLING = 'THROTTLING',
  UNRECOGNIZED_CLIENT = 'UNRECOGNIZED_CLIENT',
  VALIDATION = 'VALIDATION',
  ACCESS_DENIED = 'ACCESS_DENIED',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  TRANSACTION_CONFLICT = 'TRANSACTION_CONFLICT',
  TRANSACTION_CANCELED = 'TRANSACTION_CANCELED',
  TRANSACTION_IN_PROGRESS = 'TRANSACTION_IN_PROGRESS',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  UNKNOWN = 'UNKNOWN',
}

export class DynamoDBError extends Error {
  public readonly type: DynamoDBErrorType;
  public readonly operation: string;
  public readonly context: any;
  public readonly originalError: any;
  public readonly timestamp: Date;
  public readonly retryable: boolean;

  constructor(
    type: DynamoDBErrorType,
    message: string,
    operation: string,
    context: any = {},
    originalError: any = null
  ) {
    super(message);
    this.name = 'DynamoDBError';
    this.type = type;
    this.operation = operation;
    this.context = context;
    this.originalError = originalError;
    this.timestamp = new Date();
    this.retryable = this.isRetryableError(type);

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, DynamoDBError);
    }
  }

  /**
   * Determine if an error type is retryable
   */
  private isRetryableError(type: DynamoDBErrorType): boolean {
    const retryableErrors = [
      DynamoDBErrorType.PROVISIONED_THROUGHPUT_EXCEEDED,
      DynamoDBErrorType.REQUEST_LIMIT_EXCEEDED,
      DynamoDBErrorType.SERVICE_UNAVAILABLE,
      DynamoDBErrorType.THROTTLING,
      DynamoDBErrorType.INTERNAL_SERVER_ERROR,
      DynamoDBErrorType.NETWORK_ERROR,
      DynamoDBErrorType.TIMEOUT,
    ];

    return retryableErrors.includes(type);
  }

  /**
   * Get a user-friendly error message
   */
  getUserFriendlyMessage(): string {
    switch (this.type) {
      case DynamoDBErrorType.CONDITIONAL_CHECK_FAILED:
        return 'データの更新に失敗しました。他のユーザーによって既に変更されている可能性があります。';
      case DynamoDBErrorType.VALIDATION:
        return '入力データに問題があります。入力内容を確認してください。';
      case DynamoDBErrorType.ACCESS_DENIED:
        return 'この操作を実行する権限がありません。';
      case DynamoDBErrorType.RESOURCE_NOT_FOUND:
        return '指定されたデータが見つかりません。';
      case DynamoDBErrorType.PROVISIONED_THROUGHPUT_EXCEEDED:
      case DynamoDBErrorType.REQUEST_LIMIT_EXCEEDED:
      case DynamoDBErrorType.THROTTLING:
        return 'サーバーが混雑しています。しばらく待ってから再試行してください。';
      case DynamoDBErrorType.SERVICE_UNAVAILABLE:
      case DynamoDBErrorType.INTERNAL_SERVER_ERROR:
        return 'サーバーエラーが発生しました。しばらく待ってから再試行してください。';
      case DynamoDBErrorType.NETWORK_ERROR:
      case DynamoDBErrorType.TIMEOUT:
        return 'ネットワークエラーが発生しました。接続を確認して再試行してください。';
      case DynamoDBErrorType.TRANSACTION_CONFLICT:
        return 'データの競合が発生しました。再試行してください。';
      case DynamoDBErrorType.TRANSACTION_CANCELED:
        return 'トランザクションがキャンセルされました。';
      default:
        return '予期しないエラーが発生しました。';
    }
  }

  /**
   * Convert error to JSON for logging
   */
  toJSON(): object {
    return {
      name: this.name,
      type: this.type,
      message: this.message,
      operation: this.operation,
      context: this.context,
      timestamp: this.timestamp.toISOString(),
      retryable: this.retryable,
      stack: this.stack,
    };
  }

  /**
   * Create a DynamoDBError from a generic error
   */
  static fromError(
    error: any,
    operation: string,
    context: any = {}
  ): DynamoDBError {
    if (error instanceof DynamoDBError) {
      return error;
    }

    let type = DynamoDBErrorType.UNKNOWN;
    let message = error.message || 'Unknown error';

    // Network errors
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      type = DynamoDBErrorType.NETWORK_ERROR;
      message = 'Network connection failed';
    } else if (error.code === 'ETIMEDOUT') {
      type = DynamoDBErrorType.TIMEOUT;
      message = 'Request timed out';
    }

    return new DynamoDBError(type, message, operation, context, error);
  }
}