/**
 * AgentOS Studio - Validation Panel Component
 * Displays validation errors and warnings with navigation
 */

'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { type ValidationError } from '@/lib/studio/formYamlSync';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  X,
  Filter,
  FileWarning,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

// ============================================
// Types
// ============================================

export interface ValidationPanelProps {
  errors: ValidationError[];
  warnings: ValidationError[];
  className?: string;
  onErrorClick?: (error: ValidationError) => void;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  maxHeight?: number;
}

type FilterType = 'all' | 'errors' | 'warnings';

// ============================================
// Validation Panel Component
// ============================================

export function ValidationPanel({
  errors,
  warnings,
  className,
  onErrorClick,
  collapsible = true,
  defaultCollapsed = false,
  maxHeight = 200,
}: ValidationPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [filter, setFilter] = useState<FilterType>('all');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Filter items based on selected filter
  const filteredItems = useMemo(() => {
    switch (filter) {
      case 'errors':
        return errors.map((e, i) => ({ ...e, type: 'error' as const, index: i }));
      case 'warnings':
        return warnings.map((w, i) => ({ ...w, type: 'warning' as const, index: i }));
      default:
        return [
          ...errors.map((e, i) => ({ ...e, type: 'error' as const, index: i })),
          ...warnings.map((w, i) => ({ ...w, type: 'warning' as const, index: errors.length + i })),
        ];
    }
  }, [errors, warnings, filter]);

  // Group items by path
  const groupedItems = useMemo(() => {
    const groups = new Map<string, Array<typeof filteredItems[0]>>();

    for (const item of filteredItems) {
      const path = item.path || 'general';
      if (!groups.has(path)) {
        groups.set(path, []);
      }
      groups.get(path)!.push(item);
    }

    return groups;
  }, [filteredItems]);

  // Toggle collapse
  const handleToggleCollapse = useCallback(() => {
    if (collapsible) {
      setIsCollapsed(prev => !prev);
    }
  }, [collapsible]);

  // Handle item click
  const handleItemClick = useCallback((item: ValidationError) => {
    onErrorClick?.(item);
  }, [onErrorClick]);

  // If no issues, show success state
  if (errors.length === 0 && warnings.length === 0) {
    return (
      <div className={cn(
        'flex items-center gap-2 px-4 py-2',
        'bg-emerald-50 dark:bg-emerald-500/10',
        'border-t border-emerald-200 dark:border-emerald-500/30',
        className
      )}>
        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
        <span className="text-sm text-emerald-700 dark:text-emerald-400">
          All validations passed
        </span>
      </div>
    );
  }

  return (
    <div className={cn(
      'bg-white dark:bg-dark-bg-primary',
      className
    )}>
      {/* Header */}
      <div
        className={cn(
          'flex items-center justify-between px-4 py-2',
          'bg-slate-50 dark:bg-dark-bg-secondary',
          collapsible && 'cursor-pointer hover:bg-slate-100 dark:hover:bg-dark-bg-tertiary'
        )}
        onClick={handleToggleCollapse}
      >
        <div className="flex items-center gap-4">
          {/* Title with counts */}
          <div className="flex items-center gap-2">
            <FileWarning className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-medium text-slate-700 dark:text-dark-text-primary">
              Validation
            </span>
          </div>

          {/* Error count badge */}
          {errors.length > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-500/20">
              <AlertCircle className="w-3 h-3 text-red-600 dark:text-red-400" />
              <span className="text-xs font-medium text-red-700 dark:text-red-400">
                {errors.length}
              </span>
            </div>
          )}

          {/* Warning count badge */}
          {warnings.length > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20">
              <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
              <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
                {warnings.length}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Filter buttons */}
          {!isCollapsed && (
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <FilterButton
                active={filter === 'all'}
                onClick={() => setFilter('all')}
              >
                All
              </FilterButton>
              <FilterButton
                active={filter === 'errors'}
                onClick={() => setFilter('errors')}
                count={errors.length}
                variant="error"
              >
                Errors
              </FilterButton>
              <FilterButton
                active={filter === 'warnings'}
                onClick={() => setFilter('warnings')}
                count={warnings.length}
                variant="warning"
              >
                Warnings
              </FilterButton>
            </div>
          )}

          {/* Collapse toggle */}
          {collapsible && (
            <Button variant="ghost" size="xs" className="ml-2">
              {isCollapsed ? (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      {!isCollapsed && (
        <div
          className="overflow-y-auto"
          style={{ maxHeight }}
        >
          {filteredItems.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-slate-500 dark:text-dark-text-tertiary">
              No {filter === 'all' ? 'issues' : filter} to display
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-dark-border-primary">
              {Array.from(groupedItems.entries()).map(([path, items]) => (
                <div key={path} className="px-4 py-2">
                  {/* Path header */}
                  {path !== 'general' && (
                    <div className="text-xs font-mono text-slate-500 dark:text-dark-text-tertiary mb-1.5">
                      {path}
                    </div>
                  )}

                  {/* Items */}
                  <div className="space-y-1">
                    {items.map((item, idx) => (
                      <ValidationItem
                        key={`${item.path}-${idx}`}
                        item={item}
                        isHovered={hoveredIndex === item.index}
                        onHover={() => setHoveredIndex(item.index)}
                        onLeave={() => setHoveredIndex(null)}
                        onClick={() => handleItemClick(item)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// Filter Button Component
// ============================================

interface FilterButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  count?: number;
  variant?: 'default' | 'error' | 'warning';
}

function FilterButton({ active, onClick, children, count, variant = 'default' }: FilterButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-2 py-1 text-xs font-medium rounded transition-colors',
        active
          ? variant === 'error'
            ? 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400'
            : variant === 'warning'
              ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400'
              : 'bg-slate-200 dark:bg-dark-bg-tertiary text-slate-700 dark:text-dark-text-primary'
          : 'text-slate-500 dark:text-dark-text-tertiary hover:bg-slate-100 dark:hover:bg-dark-bg-tertiary'
      )}
    >
      {children}
      {count !== undefined && count > 0 && (
        <span className="ml-1">({count})</span>
      )}
    </button>
  );
}

// ============================================
// Validation Item Component
// ============================================

interface ValidationItemProps {
  item: ValidationError & { type: 'error' | 'warning'; index: number };
  isHovered: boolean;
  onHover: () => void;
  onLeave: () => void;
  onClick: () => void;
}

function ValidationItem({ item, isHovered, onHover, onLeave, onClick }: ValidationItemProps) {
  const isError = item.type === 'error';

  return (
    <div
      className={cn(
        'flex items-start gap-2 p-2 rounded-lg cursor-pointer transition-colors',
        isHovered
          ? isError
            ? 'bg-red-50 dark:bg-red-500/10'
            : 'bg-amber-50 dark:bg-amber-500/10'
          : 'hover:bg-slate-50 dark:hover:bg-dark-bg-secondary'
      )}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onClick={onClick}
    >
      {/* Icon */}
      {isError ? (
        <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
      ) : (
        <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          'text-sm',
          isError
            ? 'text-red-700 dark:text-red-400'
            : 'text-amber-700 dark:text-amber-400'
        )}>
          {item.message}
        </p>

        {/* Location info */}
        {(item.line !== undefined || item.column !== undefined) && (
          <p className="text-xs text-slate-500 dark:text-dark-text-tertiary mt-0.5">
            {item.line !== undefined && `Line ${item.line}`}
            {item.column !== undefined && `, Column ${item.column}`}
          </p>
        )}
      </div>

      {/* Navigate action */}
      {isHovered && (
        <Button
          variant="ghost"
          size="xs"
          className="flex-shrink-0 opacity-0 group-hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
        >
          <ExternalLink className="w-3 h-3" />
        </Button>
      )}
    </div>
  );
}

// ============================================
// Compact Validation Summary Component
// ============================================

export interface ValidationSummaryProps {
  errors: ValidationError[];
  warnings: ValidationError[];
  className?: string;
  showDetails?: boolean;
}

export function ValidationSummary({
  errors,
  warnings,
  className,
  showDetails = false,
}: ValidationSummaryProps) {
  const isValid = errors.length === 0;
  const hasWarnings = warnings.length > 0;

  if (isValid && !hasWarnings) {
    return (
      <div className={cn('flex items-center gap-1.5', className)}>
        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
        <span className="text-sm text-emerald-600 dark:text-emerald-400">Valid</span>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-3', className)}>
      {errors.length > 0 && (
        <div className="flex items-center gap-1.5">
          <AlertCircle className="w-4 h-4 text-red-500" />
          <span className="text-sm text-red-600 dark:text-red-400">
            {errors.length} error{errors.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="flex items-center gap-1.5">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <span className="text-sm text-amber-600 dark:text-amber-400">
            {warnings.length} warning{warnings.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}
    </div>
  );
}

// ============================================
// Exports
// ============================================

export default ValidationPanel;
