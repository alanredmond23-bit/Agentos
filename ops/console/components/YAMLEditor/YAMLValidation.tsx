/**
 * AgentOS Studio - YAML Validation Panel
 * Error panel showing validation issues with click-to-navigate
 */

'use client';

import { memo, useMemo, useState, useCallback } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Info,
  X,
  ChevronDown,
  ChevronRight,
  FileWarning,
  CheckCircle2,
  Filter
} from 'lucide-react';

import { Button, IconButton } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

export interface ValidationError {
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
  source: 'yaml' | 'schema';
  path?: string;
}

export interface YAMLValidationProps {
  errors: ValidationError[];
  onErrorClick: (error: ValidationError) => void;
  onClose: () => void;
}

type SeverityFilter = 'all' | 'error' | 'warning' | 'info';

// ============================================
// Severity Icon Component
// ============================================

interface SeverityIconProps {
  severity: ValidationError['severity'];
  className?: string;
}

const SeverityIcon = memo(function SeverityIcon({ severity, className }: SeverityIconProps) {
  switch (severity) {
    case 'error':
      return <AlertCircle className={cn('w-4 h-4 text-red-500', className)} />;
    case 'warning':
      return <AlertTriangle className={cn('w-4 h-4 text-amber-500', className)} />;
    case 'info':
      return <Info className={cn('w-4 h-4 text-blue-500', className)} />;
    default:
      return null;
  }
});

// ============================================
// Error Item Component
// ============================================

interface ErrorItemProps {
  error: ValidationError;
  onClick: () => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

const ErrorItem = memo(function ErrorItem({
  error,
  onClick,
  isExpanded,
  onToggleExpand
}: ErrorItemProps) {
  const severityColors = {
    error: 'border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20',
    warning: 'border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-900/10 hover:bg-amber-100 dark:hover:bg-amber-900/20',
    info: 'border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-900/10 hover:bg-blue-100 dark:hover:bg-blue-900/20'
  };

  const hasDetails = error.path || error.message.length > 80;

  return (
    <div
      className={cn(
        'border rounded-lg transition-colors cursor-pointer',
        severityColors[error.severity]
      )}
    >
      {/* Main Error Row */}
      <div
        className="flex items-start gap-3 p-3"
        onClick={onClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
          }
        }}
      >
        <SeverityIcon severity={error.severity} className="flex-shrink-0 mt-0.5" />

        <div className="flex-1 min-w-0">
          {/* Error Message */}
          <p className={cn(
            'text-sm font-medium',
            error.severity === 'error' && 'text-red-700 dark:text-red-400',
            error.severity === 'warning' && 'text-amber-700 dark:text-amber-400',
            error.severity === 'info' && 'text-blue-700 dark:text-blue-400'
          )}>
            {isExpanded ? error.message : truncateMessage(error.message, 80)}
          </p>

          {/* Location Info */}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-slate-500 dark:text-dark-text-tertiary font-mono">
              Line {error.line}:{error.column}
            </span>
            <span className="text-xs text-slate-400 dark:text-dark-text-tertiary">
              ({error.source === 'yaml' ? 'Syntax' : 'Schema'})
            </span>
          </div>
        </div>

        {/* Expand Toggle */}
        {hasDetails && (
          <button
            className="flex-shrink-0 p-1 rounded hover:bg-black/5 dark:hover:bg-white/5"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand();
            }}
            aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-slate-400" />
            )}
          </button>
        )}
      </div>

      {/* Expanded Details */}
      {isExpanded && error.path && (
        <div className="px-3 pb-3 pt-0">
          <div className="text-xs text-slate-500 dark:text-dark-text-tertiary bg-slate-100 dark:bg-dark-bg-tertiary px-2 py-1 rounded font-mono">
            Path: {error.path}
          </div>
        </div>
      )}
    </div>
  );
});

// ============================================
// Helper Functions
// ============================================

function truncateMessage(message: string, maxLength: number): string {
  if (message.length <= maxLength) return message;
  return message.slice(0, maxLength - 3) + '...';
}

// ============================================
// YAML Validation Panel Component
// ============================================

export const YAMLValidation = memo(function YAMLValidation({
  errors,
  onErrorClick,
  onClose
}: YAMLValidationProps) {
  const [filter, setFilter] = useState<SeverityFilter>('all');
  const [expandedErrors, setExpandedErrors] = useState<Set<number>>(new Set());

  // Count errors by severity
  const counts = useMemo(() => {
    return errors.reduce(
      (acc, error) => {
        acc[error.severity]++;
        acc.total++;
        return acc;
      },
      { error: 0, warning: 0, info: 0, total: 0 }
    );
  }, [errors]);

  // Filter errors
  const filteredErrors = useMemo(() => {
    if (filter === 'all') return errors;
    return errors.filter(error => error.severity === filter);
  }, [errors, filter]);

  // Group errors by line
  const groupedErrors = useMemo(() => {
    const groups = new Map<number, ValidationError[]>();
    filteredErrors.forEach(error => {
      const existing = groups.get(error.line) || [];
      existing.push(error);
      groups.set(error.line, existing);
    });
    return groups;
  }, [filteredErrors]);

  // Toggle error expansion
  const toggleExpand = useCallback((index: number) => {
    setExpandedErrors(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  // If no errors, show success state
  if (errors.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-4" />
        <h3 className="text-lg font-semibold text-slate-900 dark:text-dark-text-primary mb-2">
          No Issues Found
        </h3>
        <p className="text-sm text-slate-500 dark:text-dark-text-secondary">
          Your YAML configuration is valid and ready to use.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-dark-border-primary">
        <div className="flex items-center gap-2">
          <FileWarning className="w-5 h-5 text-slate-500 dark:text-dark-text-secondary" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-dark-text-primary">
            Validation Issues
          </h3>
          <span className="text-xs text-slate-500 dark:text-dark-text-tertiary">
            ({counts.total})
          </span>
        </div>
        <IconButton
          variant="ghost"
          size="xs"
          icon={<X className="w-4 h-4" />}
          aria-label="Close validation panel"
          onClick={onClose}
        />
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-200 dark:border-dark-border-primary bg-slate-50 dark:bg-dark-bg-tertiary">
        <Filter className="w-4 h-4 text-slate-400" />
        <div className="flex gap-1">
          <FilterButton
            active={filter === 'all'}
            onClick={() => setFilter('all')}
            count={counts.total}
            label="All"
          />
          <FilterButton
            active={filter === 'error'}
            onClick={() => setFilter('error')}
            count={counts.error}
            label="Errors"
            color="red"
          />
          <FilterButton
            active={filter === 'warning'}
            onClick={() => setFilter('warning')}
            count={counts.warning}
            label="Warnings"
            color="amber"
          />
        </div>
      </div>

      {/* Error List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filteredErrors.map((error, index) => (
          <ErrorItem
            key={`${error.line}-${error.column}-${index}`}
            error={error}
            onClick={() => onErrorClick(error)}
            isExpanded={expandedErrors.has(index)}
            onToggleExpand={() => toggleExpand(index)}
          />
        ))}
      </div>

      {/* Footer with Summary */}
      <div className="px-4 py-2 border-t border-slate-200 dark:border-dark-border-primary bg-slate-50 dark:bg-dark-bg-tertiary">
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-dark-text-tertiary">
          <span>
            {filteredErrors.length} issue{filteredErrors.length !== 1 ? 's' : ''} shown
          </span>
          <span>
            Click to navigate to line
          </span>
        </div>
      </div>
    </div>
  );
});

// ============================================
// Filter Button Component
// ============================================

interface FilterButtonProps {
  active: boolean;
  onClick: () => void;
  count: number;
  label: string;
  color?: 'red' | 'amber' | 'blue';
}

const FilterButton = memo(function FilterButton({
  active,
  onClick,
  count,
  label,
  color
}: FilterButtonProps) {
  const colorClasses = {
    red: active
      ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800'
      : 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20',
    amber: active
      ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
      : 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20',
    blue: active
      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800'
      : 'text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
  };

  const defaultClasses = active
    ? 'bg-slate-200 dark:bg-dark-bg-elevated text-slate-700 dark:text-dark-text-primary border-slate-300 dark:border-dark-border-secondary'
    : 'text-slate-600 dark:text-dark-text-secondary hover:bg-slate-100 dark:hover:bg-dark-bg-tertiary';

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-colors',
        'border border-transparent',
        color ? colorClasses[color] : defaultClasses
      )}
    >
      {label}
      {count > 0 && (
        <span className={cn(
          'px-1.5 py-0.5 rounded-full text-[10px] font-semibold',
          active ? 'bg-white/50 dark:bg-black/20' : 'bg-slate-100 dark:bg-dark-bg-tertiary'
        )}>
          {count}
        </span>
      )}
    </button>
  );
});

export default YAMLValidation;
