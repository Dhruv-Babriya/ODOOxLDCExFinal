import { ZodError } from 'zod';
import type { ActionResult } from '@/types/shared';

export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string = 'BAD_REQUEST',
    public readonly statusCode: number = 400,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required. Please log in.') {
    super(message, 'UNAUTHENTICATED', 401);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Access denied. You do not have permission to perform this action.') {
    super(message, 'FORBIDDEN', 403);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends AppError {
  constructor(entity = 'Resource') {
    super(`${entity} not found.`, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 'CONFLICT', 409);
    this.name = 'ConflictError';
  }
}

export class BookingConcurrencyError extends ConflictError {
  constructor(message = 'This court has just been reserved by another member. Please choose another slot.') {
    super(message);
    this.name = 'BookingConcurrencyError';
  }
}

/**
 * Transforms any unknown error into a sanitized, safe ActionResult for server actions
 */
export function handleActionError(error: unknown): ActionResult<never> {
  if (typeof error === 'object' && error !== null && 'digest' in error) {
    const digest = String((error as { digest?: unknown }).digest);
    if (digest === 'DYNAMIC_SERVER_USAGE' || digest.startsWith('NEXT_REDIRECT')) {
      throw error;
    }
  }

  // Console log internal error details on the server
  console.error('[Server Action Error]:', error);

  // 1. Zod validation error (duck-typed for cross-bundle prototype preservation)
  const isZod =
    error instanceof ZodError ||
    (typeof error === 'object' &&
      error !== null &&
      (('name' in error && (error as { name?: unknown }).name === 'ZodError') ||
        'issues' in error));

  if (isZod) {
    const zodErr = error as ZodError;
    const fieldErrors: Record<string, string[]> = {};
    if (Array.isArray(zodErr.issues)) {
      zodErr.issues.forEach((issue) => {
        const path = issue.path?.join('.') || 'general';
        if (!fieldErrors[path]) {
          fieldErrors[path] = [];
        }
        fieldErrors[path].push(issue.message);
      });
    }

    const firstMsg = Array.isArray(zodErr.issues) && zodErr.issues[0]?.message;
    return {
      success: false,
      error: firstMsg ? `Validation failed: ${firstMsg}` : 'Validation failed. Please check your inputs.',
      code: 'VALIDATION_ERROR',
      fieldErrors,
    };
  }

  // 2. AppError hierarchy (duck-typed for cross-bundle prototype preservation)
  const isAppErr =
    error instanceof AppError ||
    (typeof error === 'object' &&
      error !== null &&
      'name' in error &&
      typeof (error as { name?: unknown }).name === 'string' &&
      [
        'AppError',
        'AuthenticationError',
        'AuthorizationError',
        'NotFoundError',
        'ConflictError',
        'BookingConcurrencyError',
      ].includes((error as { name: string }).name) &&
      'message' in error);

  if (isAppErr) {
    const appErr = error as { message: string; code?: string };
    return {
      success: false,
      error: appErr.message,
      code: appErr.code || 'BAD_REQUEST',
    };
  }

  // 3. PostgreSQL & Supabase PostgREST error codes
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const pgError = error as { code: string; message?: string; details?: string; hint?: string };

    // 23P01 = exclusion_violation (Exclusion constraint triggered!)
    if (pgError.code === '23P01') {
      return {
        success: false,
        error: 'This court has just been reserved by another booking for the requested time.',
        code: 'SLOT_OCCUPIED',
      };
    }

    // 23505 = unique_violation
    if (pgError.code === '23505') {
      const details = (pgError.details || pgError.message || '').toLowerCase();
      let errorMsg = 'A record with this identifier already exists.';
      if (details.includes('email')) {
        errorMsg = 'An account or profile with this email address already exists.';
      } else if (details.includes('employee_code') || details.includes('staff_employee_code')) {
        errorMsg = 'This employee code is already assigned to an existing staff member.';
      } else if (details.includes('phone')) {
        errorMsg = 'This phone number is already registered.';
      }

      return {
        success: false,
        error: errorMsg,
        code: 'DUPLICATE_ENTRY',
      };
    }

    // 23503 = foreign_key_violation
    if (pgError.code === '23503') {
      return {
        success: false,
        error: 'Referenced user or record was not found.',
        code: 'FOREIGN_KEY_VIOLATION',
      };
    }

    // 23502 = not_null_violation
    if (pgError.code === '23502') {
      return {
        success: false,
        error: 'A required field was missing. Please fill in all required fields.',
        code: 'NOT_NULL_VIOLATION',
      };
    }

    // 42501 = insufficient_privilege
    if (pgError.code === '42501') {
      return {
        success: false,
        error: 'Database permission denied. You do not have sufficient privileges.',
        code: 'FORBIDDEN',
      };
    }

    // P0001 = Raise exception from stored procedure
    if (pgError.code === 'P0001') {
      return {
        success: false,
        error: pgError.message || 'Operation rejected by business rule.',
        code: 'BUSINESS_RULE_VIOLATION',
      };
    }

    // P0002 = Insufficient stock
    if (pgError.code === 'P0002') {
      return {
        success: false,
        error: pgError.message || 'Insufficient stock to fulfill request.',
        code: 'INSUFFICIENT_STOCK',
      };
    }

    if (pgError.message) {
      return {
        success: false,
        error: pgError.message,
        code: pgError.code || 'DATABASE_ERROR',
      };
    }
  }

  // 4. Standard Error instance or object with descriptive message
  if (error instanceof Error || (typeof error === 'object' && error !== null && 'message' in error)) {
    const errObj = error as { message?: unknown; code?: unknown };
    if (typeof errObj.message === 'string' && errObj.message.trim().length > 0) {
      return {
        success: false,
        error: errObj.message,
        code: typeof errObj.code === 'string' ? errObj.code : 'INTERNAL_SERVER_ERROR',
      };
    }
  }

  // 5. Fallback generic error only if no meaningful message is available
  return {
    success: false,
    error: 'An unexpected error occurred. Please try again later.',
    code: 'INTERNAL_SERVER_ERROR',
  };
}
