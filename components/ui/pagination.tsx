'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoreHorizontal,
} from 'lucide-react';
import {
  PAGE_SIZE_OPTIONS,
  type PageSizeOption,
  generatePaginationPages,
} from '@/lib/pagination';

export interface PaginationProps {
  currentPage: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  fromRecord?: number;
  toRecord?: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  isLoading?: boolean;
  itemLabel?: string;
  className?: string;
}

export function Pagination({
  currentPage,
  pageSize,
  totalCount,
  totalPages,
  fromRecord: propFromRecord,
  toRecord: propToRecord,
  onPageChange,
  onPageSizeChange,
  isLoading = false,
  itemLabel = 'records',
  className = '',
}: PaginationProps) {
  const safePage = Math.max(1, Math.min(currentPage, Math.max(1, totalPages)));
  const fromRecord =
    propFromRecord !== undefined
      ? propFromRecord
      : totalCount === 0
      ? 0
      : (safePage - 1) * pageSize + 1;
  const toRecord =
    propToRecord !== undefined
      ? propToRecord
      : totalCount === 0
      ? 0
      : Math.min(safePage * pageSize, totalCount);

  const pages = generatePaginationPages(safePage, totalPages, 1);

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-4 px-2 py-3 text-xs text-zinc-400 ${className}`}
      aria-label="Pagination Navigation"
    >
      {/* Record Counter Info */}
      <div className="flex items-center gap-2">
        <span className="font-medium text-zinc-300">
          Showing{' '}
          <span className="text-white font-semibold">
            {fromRecord.toLocaleString()}–{toRecord.toLocaleString()}
          </span>{' '}
          of <span className="text-white font-semibold">{totalCount.toLocaleString()}</span> {itemLabel}
        </span>
        {isLoading && (
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
        )}
      </div>

      {/* Controls Container */}
      <div className="flex flex-wrap items-center justify-center sm:justify-end gap-3 w-full sm:w-auto">
        {/* Page Size Selector */}
        {onPageSizeChange && (
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-400 text-xs hidden md:inline">Page Size:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              disabled={isLoading}
              className="bg-zinc-950 border border-zinc-800 text-zinc-200 rounded-lg px-2.5 py-1 text-xs focus:ring-1 focus:ring-emerald-500 outline-none cursor-pointer disabled:opacity-50"
              aria-label="Records per page"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size} per page
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center gap-1">
          {/* First Page Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onPageChange(1)}
            disabled={safePage <= 1 || isLoading}
            className="h-8 w-8 p-0 text-zinc-400 hover:text-white disabled:opacity-30 hidden sm:inline-flex"
            title="First Page"
            aria-label="Go to first page"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>

          {/* Previous Page Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(safePage - 1)}
            disabled={safePage <= 1 || isLoading}
            className="h-8 px-2.5 text-xs border-zinc-800 bg-zinc-950 text-zinc-200 hover:bg-zinc-800 disabled:opacity-40"
            aria-label="Previous page"
          >
            <ChevronLeft className="h-3.5 w-3.5 mr-1" />
            Previous
          </Button>

          {/* Numbered Page Buttons */}
          <div className="flex items-center gap-1">
            {pages.map((p, idx) => {
              if (p === 'ellipsis') {
                return (
                  <span
                    key={`ellipsis-${idx}`}
                    className="h-8 w-8 flex items-center justify-center text-zinc-600 select-none"
                  >
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </span>
                );
              }

              const isCurrent = p === safePage;

              return (
                <button
                  key={`page-${p}`}
                  type="button"
                  onClick={() => onPageChange(p)}
                  disabled={isLoading || isCurrent}
                  className={`h-8 min-w-8 px-2 rounded-lg text-xs font-medium transition-colors ${
                    isCurrent
                      ? 'bg-emerald-600 text-white font-bold shadow-sm'
                      : 'bg-zinc-950/80 border border-zinc-800/80 text-zinc-300 hover:bg-zinc-800 hover:text-white'
                  } disabled:cursor-default`}
                  aria-label={`Page ${p}`}
                  aria-current={isCurrent ? 'page' : undefined}
                >
                  {p}
                </button>
              );
            })}
          </div>

          {/* Next Page Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(safePage + 1)}
            disabled={safePage >= totalPages || isLoading}
            className="h-8 px-2.5 text-xs border-zinc-800 bg-zinc-950 text-zinc-200 hover:bg-zinc-800 disabled:opacity-40"
            aria-label="Next page"
          >
            Next
            <ChevronRight className="h-3.5 w-3.5 ml-1" />
          </Button>

          {/* Last Page Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onPageChange(totalPages)}
            disabled={safePage >= totalPages || isLoading}
            className="h-8 w-8 p-0 text-zinc-400 hover:text-white disabled:opacity-30 hidden sm:inline-flex"
            title="Last Page"
            aria-label="Go to last page"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
