/**
 * AgentOS Ops Console - Table Component
 * Data table with sorting, selection, and responsive design
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

// ============================================
// Table Context
// ============================================

interface TableContextValue {
  striped?: boolean;
  compact?: boolean;
  hoverable?: boolean;
}

const TableContext = React.createContext<TableContextValue>({});

// ============================================
// Table Component
// ============================================

interface TableProps extends React.HTMLAttributes<HTMLTableElement> {
  striped?: boolean;
  compact?: boolean;
  hoverable?: boolean;
}

export function Table({
  className,
  striped = false,
  compact = false,
  hoverable = true,
  children,
  ...props
}: TableProps) {
  return (
    <TableContext.Provider value={{ striped, compact, hoverable }}>
      <div className="table-container">
        <table className={cn('table', className)} {...props}>
          {children}
        </table>
      </div>
    </TableContext.Provider>
  );
}

// ============================================
// Table Header
// ============================================

export function TableHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn(className)} {...props} />;
}

// ============================================
// Table Body
// ============================================

export function TableBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn(className)} {...props} />;
}

// ============================================
// Table Row
// ============================================

interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  selected?: boolean;
}

export function TableRow({
  className,
  selected = false,
  ...props
}: TableRowProps) {
  const { striped, hoverable } = React.useContext(TableContext);

  return (
    <tr
      className={cn(
        striped && 'odd:bg-slate-50 dark:odd:bg-dark-bg-tertiary',
        hoverable && 'hover:bg-slate-50 dark:hover:bg-dark-bg-tertiary',
        selected && 'bg-brand-50 dark:bg-brand-500/10',
        'transition-colors',
        className
      )}
      {...props}
    />
  );
}

// ============================================
// Table Head Cell
// ============================================

type SortDirection = 'asc' | 'desc' | null;

interface TableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  sortable?: boolean;
  sortDirection?: SortDirection;
  onSort?: () => void;
}

export function TableHead({
  className,
  children,
  sortable = false,
  sortDirection = null,
  onSort,
  ...props
}: TableHeadProps) {
  const { compact } = React.useContext(TableContext);

  const SortIcon = () => {
    if (!sortable) return null;

    if (sortDirection === 'asc') {
      return <ChevronUp className="w-4 h-4" />;
    }
    if (sortDirection === 'desc') {
      return <ChevronDown className="w-4 h-4" />;
    }
    return <ChevronsUpDown className="w-4 h-4 opacity-50" />;
  };

  return (
    <th
      className={cn(
        compact ? 'px-3 py-2' : 'px-4 py-3',
        sortable && 'cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-dark-bg-elevated',
        className
      )}
      onClick={sortable ? onSort : undefined}
      aria-sort={
        sortDirection === 'asc'
          ? 'ascending'
          : sortDirection === 'desc'
            ? 'descending'
            : undefined
      }
      {...props}
    >
      <div className="flex items-center gap-2">
        {children}
        <SortIcon />
      </div>
    </th>
  );
}

// ============================================
// Table Cell
// ============================================

interface TableCellProps
  extends React.TdHTMLAttributes<HTMLTableCellElement> {
  truncate?: boolean;
}

export function TableCell({
  className,
  truncate = false,
  ...props
}: TableCellProps) {
  const { compact } = React.useContext(TableContext);

  return (
    <td
      className={cn(
        compact ? 'px-3 py-2' : 'px-4 py-4',
        truncate && 'max-w-xs truncate',
        className
      )}
      {...props}
    />
  );
}

// ============================================
// Table Footer
// ============================================

export function TableFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tfoot
      className={cn(
        'bg-slate-50 dark:bg-dark-bg-tertiary border-t border-slate-200 dark:border-dark-border-primary',
        className
      )}
      {...props}
    />
  );
}

// ============================================
// Table Caption
// ============================================

export function TableCaption({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableCaptionElement>) {
  return (
    <caption
      className={cn(
        'py-3 text-sm text-slate-500 dark:text-dark-text-tertiary',
        className
      )}
      {...props}
    />
  );
}

// ============================================
// Table Skeleton Loader
// ============================================

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export function TableSkeleton({ rows = 5, columns = 4 }: TableSkeletonProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {Array.from({ length: columns }).map((_, i) => (
            <TableHead key={i}>
              <div className="skeleton h-4 w-24" />
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <TableRow key={rowIndex}>
            {Array.from({ length: columns }).map((_, colIndex) => (
              <TableCell key={colIndex}>
                <div
                  className="skeleton h-4"
                  style={{
                    width: `${Math.random() * 40 + 60}%`,
                  }}
                />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// ============================================
// Pagination Component
// ============================================

import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  showPageNumbers?: boolean;
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  showPageNumbers = true,
  className,
}: PaginationProps) {
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    const delta = 2;

    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= currentPage - delta && i <= currentPage + delta)
      ) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== 'ellipsis') {
        pages.push('ellipsis');
      }
    }

    return pages;
  };

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 px-4 py-3',
        className
      )}
    >
      <p className="text-sm text-slate-500 dark:text-dark-text-tertiary">
        Page {currentPage} of {totalPages}
      </p>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="btn btn-ghost btn-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Previous</span>
        </button>

        {showPageNumbers &&
          getPageNumbers().map((page, index) =>
            page === 'ellipsis' ? (
              <span
                key={`ellipsis-${index}`}
                className="px-2 text-slate-400 dark:text-dark-text-muted"
              >
                ...
              </span>
            ) : (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                className={cn(
                  'btn btn-sm min-w-[32px]',
                  page === currentPage
                    ? 'btn-primary'
                    : 'btn-ghost'
                )}
              >
                {page}
              </button>
            )
          )}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="btn btn-ghost btn-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default Table;
