/**
 * Reusable Server-Side and Client-Side Pagination Utilities
 *
 * Designed to handle 50,000+ records cleanly across:
 * - Court Bookings
 * - Courts
 * - Members
 * - Shop Orders
 * - Bar Orders
 * - Finance Records
 */

export const DEFAULT_PAGE_SIZE = 50;
export const PAGE_SIZE_OPTIONS = [50, 100, 200] as const;
export type PageSizeOption = (typeof PAGE_SIZE_OPTIONS)[number];

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPrev: boolean;
  hasNext: boolean;
  fromRecord: number;
  toRecord: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: PaginationMeta;
}

/**
 * Validates and extracts pagination parameters from a URL query string,
 * URLSearchParams object, or Next.js server searchParams dictionary.
 */
export function parsePaginationParams(
  rawParams?: Record<string, string | string[] | undefined> | URLSearchParams
): {
  page: number;
  pageSize: number;
  search: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
} {
  let getParam = (key: string): string | undefined => undefined;

  if (rawParams instanceof URLSearchParams) {
    getParam = (key) => rawParams.get(key) ?? undefined;
  } else if (rawParams && typeof rawParams === 'object') {
    getParam = (key) => {
      const val = rawParams[key];
      return Array.isArray(val) ? val[0] : val;
    };
  }

  // Parse page
  const rawPage = parseInt(getParam('page') || '1', 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;

  // Parse pageSize
  const rawSize = parseInt(getParam('pageSize') || String(DEFAULT_PAGE_SIZE), 10);
  const pageSize = (PAGE_SIZE_OPTIONS as readonly number[]).includes(rawSize)
    ? rawSize
    : DEFAULT_PAGE_SIZE;

  // Parse search
  const rawSearch = (getParam('search') || '').trim();

  // Parse sort
  const sortBy = (getParam('sortBy') || getParam('sort') || 'start_time_desc').trim();
  const rawOrder = (getParam('sortOrder') || '').toLowerCase();
  const sortOrder: 'asc' | 'desc' = rawOrder === 'asc' ? 'asc' : 'desc';

  return {
    page,
    pageSize,
    search: rawSearch,
    sortBy,
    sortOrder,
  };
}

/**
 * Computes PostgreSQL/Supabase 0-indexed range slice [from, to]
 * Example: page 1, pageSize 50 -> from 0, to 49
 * Example: page 2, pageSize 50 -> from 50, to 99
 */
export function getSupabaseRange(page: number, pageSize: number): { from: number; to: number } {
  const safePage = Math.max(1, page);
  const safeSize = Math.max(1, pageSize);
  const from = (safePage - 1) * safeSize;
  const to = from + safeSize - 1;
  return { from, to };
}

/**
 * Calculates pagination metadata and record boundaries based on total matching count.
 */
export function calculatePaginationMeta(
  totalCount: number,
  page: number,
  pageSize: number
): PaginationMeta {
  const safeTotal = Math.max(0, totalCount);
  const safeSize = Math.max(1, pageSize);
  const totalPages = Math.max(1, Math.ceil(safeTotal / safeSize));
  const safePage = Math.min(Math.max(1, page), totalPages);

  const fromRecord = safeTotal === 0 ? 0 : (safePage - 1) * safeSize + 1;
  const toRecord = safeTotal === 0 ? 0 : Math.min(safePage * safeSize, safeTotal);

  return {
    page: safePage,
    pageSize: safeSize,
    totalCount: safeTotal,
    totalPages,
    hasPrev: safePage > 1,
    hasNext: safePage < totalPages,
    fromRecord,
    toRecord,
  };
}

/**
 * Generates pagination page numbers with smart ellipsis tokens.
 * Example for page 5 of 20: [1, '...', 4, 5, 6, '...', 20]
 */
export function generatePaginationPages(
  currentPage: number,
  totalPages: number,
  siblingCount = 1
): (number | 'ellipsis')[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
  const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);

  const shouldShowLeftDots = leftSiblingIndex > 2;
  const shouldShowRightDots = rightSiblingIndex < totalPages - 1;

  if (!shouldShowLeftDots && shouldShowRightDots) {
    const leftItemCount = 3 + 2 * siblingCount;
    const leftRange = Array.from({ length: leftItemCount }, (_, i) => i + 1);
    return [...leftRange, 'ellipsis', totalPages];
  }

  if (shouldShowLeftDots && !shouldShowRightDots) {
    const rightItemCount = 3 + 2 * siblingCount;
    const rightRange = Array.from(
      { length: rightItemCount },
      (_, i) => totalPages - rightItemCount + i + 1
    );
    return [1, 'ellipsis', ...rightRange];
  }

  const middleRange = Array.from(
    { length: rightSiblingIndex - leftSiblingIndex + 1 },
    (_, i) => leftSiblingIndex + i
  );
  return [1, 'ellipsis', ...middleRange, 'ellipsis', totalPages];
}

/**
 * Generic CSV generator for exporting query datasets safely without truncating rows.
 */
export function generateCsvContent<T extends Record<string, any>>(
  rows: T[],
  columns: { key: keyof T | string; label: string; format?: (row: T) => string | number | null | undefined }[]
): string {
  const headerLine = columns.map((col) => `"${col.label.replace(/"/g, '""')}"`).join(',');

  const bodyLines = rows.map((row) => {
    return columns
      .map((col) => {
        let value: any;
        if (col.format) {
          value = col.format(row);
        } else {
          value = (row as any)[col.key];
        }

        if (value === null || value === undefined) {
          return '""';
        }
        const stringVal = String(value);
        return `"${stringVal.replace(/"/g, '""')}"`;
      })
      .join(',');
  });

  return [headerLine, ...bodyLines].join('\r\n');
}
