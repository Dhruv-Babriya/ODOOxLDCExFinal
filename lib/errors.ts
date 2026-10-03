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
  // Re-throw Next.js dynamic server usage error so Next.js handles route dynamism correctly
<<<<<<< HEAD
  if (typeof error === 'object' && error !== null && 'digest' in error && (error as { digest?: string }).digest === 'DYNAMIC_SERVER_USAGE') {
=======
  if (typeof error === 'object' && error !== null && 'digest' in error && (error as { digest?: unknown }).digest === 'DYNAMIC_SERVER_USAGE') {
>>>>>>> fdf6696dc65136cca6700d389d83efd15f0b24a9
    throw error;
  }

  // Console log internal error details on the server (never send raw details to client)
  console.error('[Server Action Error]:', error);

  if (error instanceof ZodError) {
    const fieldErrors: Record<string, string[]> = {};
    error.issues.forEach((issue) => {
      const path = issue.path.join('.') || 'general';
      if (!fieldErrors[path]) {
        fieldErrors[path] = [];
      }
      fieldErrors[path].push(issue.message);
    });

    return {
      success: false,
      error: 'Validation failed. Please check your inputs.',
      code: 'VALIDATION_ERROR',
      fieldErrors,
    };
  }

  if (error instanceof AppError) {
    return {
      success: false,
      error: error.message,
      code: error.code,
    };
  }

  // Handle standard PostgreSQL errors
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const pgError = error as { code: string; message: string; details?: string };

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
      return {
        success: false,
        error: 'A record with this identifier already exists.',
        code: 'DUPLICATE_ENTRY',
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
  }

  // Fallback generic error
  return {
    success: false,
    error: 'An unexpected error occurred. Please try again later.',
    code: 'INTERNAL_SERVER_ERROR',
  };
}
