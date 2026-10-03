'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo, useTransition } from 'react';
import {
  DEFAULT_PAGE_SIZE,
  PAGE_SIZE_OPTIONS,
  type PageSizeOption,
  parsePaginationParams,
} from '@/lib/pagination';

export interface UsePaginationOptions {
  defaultPageSize?: PageSizeOption;
  scroll?: boolean;
}

export function usePagination(options: UsePaginationOptions = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentParams = useMemo(() => {
    return parsePaginationParams(searchParams);
  }, [searchParams]);

  /**
   * Helper to construct a URL with updated search parameters
   */
  const createQueryString = useCallback(
    (updates: Record<string, string | number | null | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());

      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === undefined || value === '') {
          params.delete(key);
        } else {
          params.set(key, String(value));
        }
      }

      return params.toString();
    },
    [searchParams]
  );

  /**
   * Updates URL with shallow/instant transition, preserving history and state
   */
  const updateUrl = useCallback(
    (updates: Record<string, string | number | null | undefined>) => {
      const queryString = createQueryString(updates);
      const targetUrl = queryString ? `${pathname}?${queryString}` : pathname;

      startTransition(() => {
        router.push(targetUrl, { scroll: options.scroll ?? false });
      });
    },
    [createQueryString, pathname, router, options.scroll]
  );

  const setPage = useCallback(
    (newPage: number) => {
      updateUrl({ page: Math.max(1, newPage) });
    },
    [updateUrl]
  );

  const setPageSize = useCallback(
    (newPageSize: number) => {
      const safeSize = (PAGE_SIZE_OPTIONS as readonly number[]).includes(newPageSize)
        ? newPageSize
        : DEFAULT_PAGE_SIZE;
      // Reset to page 1 whenever page size changes
      updateUrl({ pageSize: safeSize, page: 1 });
    },
    [updateUrl]
  );

  const setSearch = useCallback(
    (term: string) => {
      // Reset to page 1 whenever search changes
      updateUrl({ search: term.trim() || null, page: 1 });
    },
    [updateUrl]
  );

  const setFilter = useCallback(
    (key: string, value: string | undefined) => {
      // Reset to page 1 whenever a filter changes
      updateUrl({ [key]: value || null, page: 1 });
    },
    [updateUrl]
  );

  const setFilters = useCallback(
    (filters: Record<string, string | undefined>) => {
      // Reset to page 1 on batch filter change
      const updates: Record<string, string | number | null | undefined> = { page: 1 };
      for (const [k, v] of Object.entries(filters)) {
        updates[k] = v || null;
      }
      updateUrl(updates);
    },
    [updateUrl]
  );

  const setSort = useCallback(
    (sortBy: string, sortOrder: 'asc' | 'desc' = 'desc') => {
      // Reset to page 1 on sort change
      updateUrl({ sort: sortBy, sortOrder, page: 1 });
    },
    [updateUrl]
  );

  const resetAll = useCallback(
    (preservedFilters: Record<string, string> = {}) => {
      const params = new URLSearchParams();
      if (currentParams.pageSize !== DEFAULT_PAGE_SIZE) {
        params.set('pageSize', String(currentParams.pageSize));
      }
      for (const [k, v] of Object.entries(preservedFilters)) {
        if (v) params.set(k, v);
      }
      const targetUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
      startTransition(() => {
        router.push(targetUrl, { scroll: false });
      });
    },
    [currentParams.pageSize, pathname, router]
  );

  return {
    page: currentParams.page,
    pageSize: currentParams.pageSize,
    search: currentParams.search,
    sortBy: currentParams.sortBy,
    sortOrder: currentParams.sortOrder,
    isPending,
    setPage,
    setPageSize,
    setSearch,
    setFilter,
    setFilters,
    setSort,
    resetAll,
    createQueryString,
  };
}
