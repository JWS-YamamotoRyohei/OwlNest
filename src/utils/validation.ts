import {
  UserRole,
  Stance,
  DiscussionCategory,
  AccessControlType,
  ReactionType,
  ValidationError,
} from '../types/common';
import { CreateUserData, UpdateUserData } from '../types/User';
import { CreateDiscussionData, UpdateDiscussionData } from '../types/discussion';
import { CreatePostData, UpdatePostData } from '../types/post';

/**
 * Validation utility functions
 */
export class ValidationUtils {
  /**
   * Validate email format
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate user role
   */
  static isValidUserRole(role: string): role is UserRole {
    return Object.values(UserRole).includes(role as UserRole);
  }

  /**
   * Validate stance
   */
  static isValidStance(stance: string): stance is Stance {
    return Object.values(Stance).includes(stance as Stance);
  }

  /**
   * Validate discussion category
   */
  static isValidDiscussionCategory(category: string): category is DiscussionCategory {
    return Object.values(DiscussionCategory).includes(category as DiscussionCategory);
  }

  /**
   * Validate access control type
   */
  static isValidAccessControlType(type: string): type is AccessControlType {
    return Object.values(AccessControlType).includes(type as AccessControlType);
  }

  /**
   * Validate reaction type
   */
  static isValidReactionType(type: string): type is ReactionType {
    return Object.values(ReactionType).includes(type as ReactionType);
  }

  /**
   * Validate string length
   */
  static isValidLength(value: string, minLength: number, maxLength: number): boolean {
    return value.length >= minLength && value.length <= maxLength;
  }

  /**
   * Validate URL format
   */
  static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate UUID format
   */
  static isValidUuid(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * Validate ISO date string
   */
  static isValidISODate(dateString: string): boolean {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime()) && date.toISOString() === dateString;
  }

  /**
   * Sanitize HTML content
   */
  static sanitizeHtml(html: string): string {
    // Basic HTML sanitization - in production, use a proper library like DOMPurify
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
  }

  /**
   * Validate and sanitize text content
   */
  static validateAndSanitizeText(
    text: string,
    minLength: number,
    maxLength: number,
    allowHtml = false
  ): { isValid: boolean; sanitized: string; errors: string[] } {
    const errors: string[] = [];
    let sanitized = text.trim();

    // Check length
    if (sanitized.length < minLength) {
      errors.push(`テキストは${minLength}文字以上である必要があります`);
    }
    if (sanitized.length > maxLength) {
      errors.push(`テキストは${maxLength}文字以下である必要があります`);
    }

    // Sanitize HTML if not allowed
    if (!allowHtml) {
      sanitized = this.sanitizeHtml(sanitized);
    }

    // Check for prohibited content
    const prohibitedPatterns = [/\b(?:spam|scam|phishing)\b/gi, /\b(?:viagra|cialis|casino)\b/gi];

    for (const pattern of prohibitedPatterns) {
      if (pattern.test(sanitized)) {
        errors.push('禁止されたコンテンツが含まれています');
        break;
      }
    }

    return {
      isValid: errors.length === 0,
      sanitized,
      errors,
    };
  }
}

/**
 * User validation functions
 */
export class UserValidator {
  /**
   * Validate user creation data
   */
  static validateCreateUser(data: CreateUserData): ValidationError[] {
    const errors: ValidationError[] = [];

    // Validate email
    if (!data.email) {
      errors.push({
        field: 'email',
        message: 'メールアドレスは必須です',
        code: 'REQUIRED',
      });
    } else if (!ValidationUtils.isValidEmail(data.email)) {
      errors.push({
        field: 'email',
        message: '有効なメールアドレスを入力してください',
        code: 'INVALID_FORMAT',
      });
    }

    // Validate display name
    if (!data.displayName) {
      errors.push({
        field: 'displayName',
        message: '表示名は必須です',
        code: 'REQUIRED',
      });
    } else if (!ValidationUtils.isValidLength(data.displayName, 1, 50)) {
      errors.push({
        field: 'displayName',
        message: '表示名は1文字以上50文字以下である必要があります',
        code: 'INVALID_LENGTH',
      });
    }

    // Validate bio (optional)
    if (data.bio && !ValidationUtils.isValidLength(data.bio, 0, 500)) {
      errors.push({
        field: 'bio',
        message: '自己紹介は500文字以下である必要があります',
        code: 'INVALID_LENGTH',
      });
    }

    // Validate avatar URL (optional)
    if (data.avatar && !ValidationUtils.isValidUrl(data.avatar)) {
      errors.push({
        field: 'avatar',
        message: '有効なアバターURLを入力してください',
        code: 'INVALID_FORMAT',
      });
    }

    return errors;
  }

  /**
   * Validate user update data
   */
  static validateUpdateUser(data: UpdateUserData): ValidationError[] {
    const errors: ValidationError[] = [];

    // Validate display name (optional)
    if (data.displayName !== undefined) {
      if (!data.displayName) {
        errors.push({
          field: 'displayName',
          message: '表示名は必須です',
          code: 'REQUIRED',
        });
      } else if (!ValidationUtils.isValidLength(data.displayName, 1, 50)) {
        errors.push({
          field: 'displayName',
          message: '表示名は1文字以上50文字以下である必要があります',
          code: 'INVALID_LENGTH',
        });
      }
    }

    // Validate bio (optional)
    if (data.bio !== undefined && !ValidationUtils.isValidLength(data.bio, 0, 500)) {
      errors.push({
        field: 'bio',
        message: '自己紹介は500文字以下である必要があります',
        code: 'INVALID_LENGTH',
      });
    }

    // Validate avatar URL (optional)
    if (data.avatar !== undefined && data.avatar && !ValidationUtils.isValidUrl(data.avatar)) {
      errors.push({
        field: 'avatar',
        message: '有効なアバターURLを入力してください',
        code: 'INVALID_FORMAT',
      });
    }

    return errors;
  }
}

/**
 * Discussion validation functions
 */
export class DiscussionValidator {
  /**
   * Validate discussion creation data
   */
  static validateCreateDiscussion(data: CreateDiscussionData): ValidationError[] {
    const errors: ValidationError[] = [];

    // Validate title
    if (!data.title) {
      errors.push({
        field: 'title',
        message: 'タイトルは必須です',
        code: 'REQUIRED',
      });
    } else if (!ValidationUtils.isValidLength(data.title, 1, 200)) {
      errors.push({
        field: 'title',
        message: 'タイトルは1文字以上200文字以下である必要があります',
        code: 'INVALID_LENGTH',
      });
    }

    // Validate description
    if (!data.description) {
      errors.push({
        field: 'description',
        message: '説明は必須です',
        code: 'REQUIRED',
      });
    } else if (!ValidationUtils.isValidLength(data.description, 1, 2000)) {
      errors.push({
        field: 'description',
        message: '説明は1文字以上2000文字以下である必要があります',
        code: 'INVALID_LENGTH',
      });
    }

    // Validate owner stance
    if (!ValidationUtils.isValidStance(data.ownerStance)) {
      errors.push({
        field: 'ownerStance',
        message: '有効なスタンスを選択してください',
        code: 'INVALID_VALUE',
      });
    }

    // Validate categories
    if (!data.categories || data.categories.length === 0) {
      errors.push({
        field: 'categories',
        message: '少なくとも1つのカテゴリを選択してください',
        code: 'REQUIRED',
      });
    } else {
      for (const category of data.categories) {
        if (!ValidationUtils.isValidDiscussionCategory(category)) {
          errors.push({
            field: 'categories',
            message: '無効なカテゴリが含まれています',
            code: 'INVALID_VALUE',
          });
          break;
        }
      }
    }

    // Validate points
    if (!data.points || data.points.length === 0) {
      errors.push({
        field: 'points',
        message: '少なくとも1つの論点を追加してください',
        code: 'REQUIRED',
      });
    } else {
      data.points.forEach((point, index) => {
        if (!point.title) {
          errors.push({
            field: `points[${index}].title`,
            message: '論点のタイトルは必須です',
            code: 'REQUIRED',
          });
        } else if (!ValidationUtils.isValidLength(point.title, 1, 200)) {
          errors.push({
            field: `points[${index}].title`,
            message: '論点のタイトルは1文字以上200文字以下である必要があります',
            code: 'INVALID_LENGTH',
          });
        }

        if (point.description && !ValidationUtils.isValidLength(point.description, 0, 1000)) {
          errors.push({
            field: `points[${index}].description`,
            message: '論点の説明は1000文字以下である必要があります',
            code: 'INVALID_LENGTH',
          });
        }
      });
    }

    // Validate access control
    if (
      data.accessControl?.type &&
      !ValidationUtils.isValidAccessControlType(data.accessControl.type)
    ) {
      errors.push({
        field: 'accessControl.type',
        message: '有効なアクセス制御タイプを選択してください',
        code: 'INVALID_VALUE',
      });
    }

    return errors;
  }

  /**
   * Validate discussion update data
   */
  static validateUpdateDiscussion(data: UpdateDiscussionData): ValidationError[] {
    const errors: ValidationError[] = [];

    // Validate title (optional)
    if (data.title !== undefined) {
      if (!data.title) {
        errors.push({
          field: 'title',
          message: 'タイトルは必須です',
          code: 'REQUIRED',
        });
      } else if (!ValidationUtils.isValidLength(data.title, 1, 200)) {
        errors.push({
          field: 'title',
          message: 'タイトルは1文字以上200文字以下である必要があります',
          code: 'INVALID_LENGTH',
        });
      }
    }

    // Validate description (optional)
    if (data.description !== undefined) {
      if (!data.description) {
        errors.push({
          field: 'description',
          message: '説明は必須です',
          code: 'REQUIRED',
        });
      } else if (!ValidationUtils.isValidLength(data.description, 1, 2000)) {
        errors.push({
          field: 'description',
          message: '説明は1文字以上2000文字以下である必要があります',
          code: 'INVALID_LENGTH',
        });
      }
    }

    // Validate owner stance (optional)
    if (data.ownerStance !== undefined && !ValidationUtils.isValidStance(data.ownerStance)) {
      errors.push({
        field: 'ownerStance',
        message: '有効なスタンスを選択してください',
        code: 'INVALID_VALUE',
      });
    }

    // Validate categories (optional)
    if (data.categories !== undefined) {
      if (data.categories.length === 0) {
        errors.push({
          field: 'categories',
          message: '少なくとも1つのカテゴリを選択してください',
          code: 'REQUIRED',
        });
      } else {
        for (const category of data.categories) {
          if (!ValidationUtils.isValidDiscussionCategory(category)) {
            errors.push({
              field: 'categories',
              message: '無効なカテゴリが含まれています',
              code: 'INVALID_VALUE',
            });
            break;
          }
        }
      }
    }

    return errors;
  }
}

/**
 * Post validation functions
 */
export class PostValidator {
  /**
   * Validate post creation data
   */
  static validateCreatePost(data: CreatePostData): ValidationError[] {
    const errors: ValidationError[] = [];

    // Validate discussion ID
    if (!data.discussionId) {
      errors.push({
        field: 'discussionId',
        message: '議論IDは必須です',
        code: 'REQUIRED',
      });
    }

    // Validate discussion point ID
    if (!data.discussionPointId) {
      errors.push({
        field: 'discussionPointId',
        message: '論点IDは必須です',
        code: 'REQUIRED',
      });
    }

    // Validate content
    if (!data.content.text) {
      errors.push({
        field: 'content.text',
        message: '投稿内容は必須です',
        code: 'REQUIRED',
      });
    } else {
      const validation = ValidationUtils.validateAndSanitizeText(data.content.text, 1, 5000, true);
      if (!validation.isValid) {
        validation.errors.forEach(error => {
          errors.push({
            field: 'content.text',
            message: error,
            code: 'INVALID_CONTENT',
          });
        });
      }
    }

    // Validate stance
    if (!ValidationUtils.isValidStance(data.stance)) {
      errors.push({
        field: 'stance',
        message: '有効なスタンスを選択してください',
        code: 'INVALID_VALUE',
      });
    }

    // Validate attachments (optional)
    if (data.content.hasAttachments) {
      if (data.attachments.length > 10) {
        errors.push({
          field: 'content.attachments',
          message: '添付ファイルは10個まで追加できます',
          code: 'TOO_MANY_ATTACHMENTS',
        });
      }

      data.attachments.forEach((attachment, index) => {
        if (!attachment.url || !ValidationUtils.isValidUrl(attachment.url)) {
          errors.push({
            field: `content.attachments[${index}].url`,
            message: '有効な添付ファイルURLが必要です',
            code: 'INVALID_URL',
          });
        }

        if (attachment.size > 10 * 1024 * 1024) {
          // 10MB limit
          errors.push({
            field: `content.attachments[${index}].size`,
            message: '添付ファイルのサイズは10MB以下である必要があります',
            code: 'FILE_TOO_LARGE',
          });
        }
      });
    }

    return errors;
  }

  /**
   * Validate post update data
   */
  static validateUpdatePost(data: UpdatePostData): ValidationError[] {
    const errors: ValidationError[] = [];

    // Validate content (optional)
    if (data.content !== undefined) {
      if (!data.content) {
        errors.push({
          field: 'content.text',
          message: '投稿内容は必須です',
          code: 'REQUIRED',
        });
      } else {
        const validation = ValidationUtils.validateAndSanitizeText(
          data.content,
          1,
          5000,
          true
        );
        if (!validation.isValid) {
          validation.errors.forEach(error => {
            errors.push({
              field: 'content.text',
              message: error,
              code: 'INVALID_CONTENT',
            });
          });
        }
      }
    }

    // Validate stance (optional)
    if (data.stance !== undefined && !ValidationUtils.isValidStance(data.stance)) {
      errors.push({
        field: 'stance',
        message: '有効なスタンスを選択してください',
        code: 'INVALID_VALUE',
      });
    }

    // Validate reason (optional)
    if (data.reason !== undefined && !ValidationUtils.isValidLength(data.reason, 0, 200)) {
      errors.push({
        field: 'reason',
        message: '編集理由は200文字以下である必要があります',
        code: 'INVALID_LENGTH',
      });
    }

    return errors;
  }
}
