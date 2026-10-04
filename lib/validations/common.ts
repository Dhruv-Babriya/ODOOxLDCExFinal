import { z } from 'zod';

/**
 * Standard PostgreSQL-compliant UUID format validator.
 * Matches any 32-character hexadecimal UUID string separated by hyphens (8-4-4-4-12).
 * Supports RFC 4122 v1-v7, deterministic seed UUIDs (e.g. 77777777-7777-7777-7777-777777777701),
 * nil UUIDs, and any valid 128-bit PostgreSQL UUID column value.
 */
export const UUID_REGEX =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export const uuidSchema = (message = 'Invalid UUID') =>
  z.string().regex(UUID_REGEX, message);
