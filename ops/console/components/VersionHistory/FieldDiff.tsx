/**
 * AgentOS Studio - Field Diff Component
 * Displays field-level differences between two versions
 * Alternative view to line-by-line diff for semantic understanding
 */

'use client';

import React, { useMemo, useState } from 'react';
import {
  Plus,
  Minus,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Code,
  Hash,
  ToggleLeft,
  Type,
  List,
  Braces,
  AlertCircle,
  Copy,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Tooltip } from '@/components/ui/Tooltip';
import { type FieldDiff as FieldDiffType } from '@/lib/studio/versionControl';

// ============================================
// Types
// ============================================

interface FieldDiffProps {
  diffs: FieldDiffType[];
  className?: string;
  showSummary?: boolean;
  collapsible?: boolean;
  maxDepth?: number;
}

interface FieldDiffItemProps {
  diff: FieldDiffType;
  depth?: number;
  maxDepth?: number;
  collapsible?: boolean;
}

interface ValueDisplayProps {
  value: unknown;
  type: 'old' | 'new';
  className?: string;
}

// ============================================
// Utility Functions
// ============================================

function getValueType(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

function getTypeIcon(value: unknown) {
  const type = getValueType(value);
  switch (type) {
    case 'string':
      return <Type className="w-3 h-3" />;
    case 'number':
      return <Hash className="w-3 h-3" />;
    case 'boolean':
      return <ToggleLeft className="w-3 h-3" />;
    case 'array':
      return <List className="w-3 h-3" />;
    case 'object':
      return <Braces className="w-3 h-3" />;
    default:
      return <Code className="w-3 h-3" />;
  }
}

function formatValue(value: unknown, maxLength: number = 100): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') {
    if (value.length > maxLength) {
      return `"${value.substring(0, maxLength)}..."`;
    }
    return `"${value}"`;
  }
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    if (value.length <= 3) {
      return `[${value.map(v => formatValue(v, 20)).join(', ')}]`;
    }
    return `[${value.length} items]`;
  }
  if (typeof value === 'object') {
    const keys = Object.keys(value);
    if (keys.length === 0) return '{}';
    if (keys.length <= 2) {
      return `{${keys.join(', ')}}`;
    }
    return `{${keys.length} properties}`;
  }
  return String(value);
}

function getFieldDepth(path: string): number {
  return path.split('.').length - 1;
}

// ============================================
// Value Display Component
// ============================================

function ValueDisplay({ value, type, className }: ValueDisplayProps) {
  const [copied, setCopied] = useState(false);
  const valueStr = useMemo(() => {
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  }, [value]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(valueStr);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const isMultiline = valueStr.includes('\n') || valueStr.length > 80;
  const displayValue = formatValue(value, 200);

  return (
    <div
      className={cn(
        'group relative flex items-start gap-2 rounded-md p-2 transition-colors',
        type === 'old'
          ? 'bg-red-50 dark:bg-red-500/10'
          : 'bg-emerald-50 dark:bg-emerald-500/10',
        className
      )}
    >
      {/* Type Icon */}
      <span
        className={cn(
          'flex-shrink-0 mt-0.5',
          type === 'old'
            ? 'text-red-500 dark:text-red-400'
            : 'text-emerald-500 dark:text-emerald-400'
        )}
      >
        {type === 'old' ? (
          <Minus className="w-4 h-4" />
        ) : (
          <Plus className="w-4 h-4" />
        )}
      </span>

      {/* Value */}
      <div className="flex-1 min-w-0">
        {isMultiline ? (
          <pre
            className={cn(
              'text-sm font-mono whitespace-pre-wrap break-all',
              type === 'old'
                ? 'text-red-700 dark:text-red-300'
                : 'text-emerald-700 dark:text-emerald-300'
            )}
          >
            {displayValue}
          </pre>
        ) : (
          <code
            className={cn(
              'text-sm font-mono',
              type === 'old'
                ? 'text-red-700 dark:text-red-300'
                : 'text-emerald-700 dark:text-emerald-300'
            )}
          >
            {displayValue}
          </code>
        )}
      </div>

      {/* Copy Button */}
      <Tooltip content={copied ? 'Copied!' : 'Copy value'}>
        <button
          onClick={handleCopy}
          className={cn(
            'flex-shrink-0 opacity-0 group-hover:opacity-100 p-1 rounded transition-all',
            type === 'old'
              ? 'hover:bg-red-100 dark:hover:bg-red-500/20 text-red-500'
              : 'hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-500'
          )}
        >
          {copied ? (
            <Check className="w-3.5 h-3.5" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
        </button>
      </Tooltip>
    </div>
  );
}

// ============================================
// Array Diff Component
// ============================================

interface ArrayDiffProps {
  oldValue: unknown[];
  newValue: unknown[];
}

function ArrayDiff({ oldValue, newValue }: ArrayDiffProps) {
  const oldSet = new Set(oldValue.map(v => JSON.stringify(v)));
  const newSet = new Set(newValue.map(v => JSON.stringify(v)));

  const added = newValue.filter(v => !oldSet.has(JSON.stringify(v)));
  const removed = oldValue.filter(v => !newSet.has(JSON.stringify(v)));
  const unchanged = oldValue.filter(v => newSet.has(JSON.stringify(v)));

  return (
    <div className="space-y-2">
      {/* Removed Items */}
      {removed.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-red-600 dark:text-red-400">
            Removed ({removed.length}):
          </p>
          {removed.map((item, idx) => (
            <ValueDisplay key={`removed-${idx}`} value={item} type="old" />
          ))}
        </div>
      )}

      {/* Added Items */}
      {added.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
            Added ({added.length}):
          </p>
          {added.map((item, idx) => (
            <ValueDisplay key={`added-${idx}`} value={item} type="new" />
          ))}
        </div>
      )}

      {/* Unchanged (collapsed) */}
      {unchanged.length > 0 && (
        <div className="text-xs text-slate-500 dark:text-dark-text-tertiary">
          {unchanged.length} item{unchanged.length !== 1 ? 's' : ''} unchanged
        </div>
      )}
    </div>
  );
}

// ============================================
// Field Diff Item Component
// ============================================

function FieldDiffItem({
  diff,
  depth = 0,
  maxDepth = 5,
  collapsible = true,
}: FieldDiffItemProps) {
  const [isExpanded, setIsExpanded] = useState(depth < 2);
  const hasNestedContent =
    typeof diff.oldValue === 'object' ||
    typeof diff.newValue === 'object' ||
    (typeof diff.oldValue === 'string' && (diff.oldValue as string).includes('\n')) ||
    (typeof diff.newValue === 'string' && (diff.newValue as string).includes('\n'));

  const isArrayDiff =
    Array.isArray(diff.oldValue) && Array.isArray(diff.newValue);

  const getTypeStyles = (type: FieldDiffType['type']) => {
    switch (type) {
      case 'added':
        return {
          badge: 'success' as const,
          bg: 'bg-emerald-50 dark:bg-emerald-500/10',
          border: 'border-emerald-200 dark:border-emerald-500/30',
          icon: <Plus className="w-4 h-4 text-emerald-500" />,
        };
      case 'removed':
        return {
          badge: 'error' as const,
          bg: 'bg-red-50 dark:bg-red-500/10',
          border: 'border-red-200 dark:border-red-500/30',
          icon: <Minus className="w-4 h-4 text-red-500" />,
        };
      case 'modified':
        return {
          badge: 'warning' as const,
          bg: 'bg-amber-50 dark:bg-amber-500/10',
          border: 'border-amber-200 dark:border-amber-500/30',
          icon: <ArrowRight className="w-4 h-4 text-amber-500" />,
        };
    }
  };

  const styles = getTypeStyles(diff.type);

  if (depth > maxDepth) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-dark-text-tertiary">
        <AlertCircle className="w-4 h-4" />
        <span>Max depth reached</span>
      </div>
    );
  }

  return (
    <Card
      className={cn(
        'overflow-hidden border transition-all',
        styles.bg,
        styles.border
      )}
      style={{ marginLeft: depth > 0 ? `${depth * 16}px` : 0 }}
    >
      {/* Header */}
      <div
        className={cn(
          'flex items-center gap-3 px-4 py-3',
          collapsible && hasNestedContent && 'cursor-pointer hover:bg-black/5 dark:hover:bg-white/5'
        )}
        onClick={() => collapsible && hasNestedContent && setIsExpanded(!isExpanded)}
      >
        {/* Expand/Collapse */}
        {collapsible && hasNestedContent && (
          <button className="flex-shrink-0 p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10">
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-slate-400" />
            )}
          </button>
        )}

        {/* Type Icon */}
        <span className="flex-shrink-0">{styles.icon}</span>

        {/* Field Path */}
        <div className="flex-1 min-w-0">
          <code className="text-sm font-mono font-semibold text-slate-800 dark:text-dark-text-primary">
            {diff.path}
          </code>
        </div>

        {/* Value Type Indicator */}
        <Tooltip content={`Type: ${getValueType(diff.newValue ?? diff.oldValue)}`}>
          <span className="flex-shrink-0 text-slate-400">
            {getTypeIcon(diff.newValue ?? diff.oldValue)}
          </span>
        </Tooltip>

        {/* Badge */}
        <Badge variant={styles.badge} size="sm">
          {diff.type}
        </Badge>
      </div>

      {/* Content */}
      {(!collapsible || isExpanded || !hasNestedContent) && (
        <div className="px-4 pb-4 space-y-3">
          {diff.type === 'modified' && (
            <>
              {isArrayDiff ? (
                <ArrayDiff
                  oldValue={diff.oldValue as unknown[]}
                  newValue={diff.newValue as unknown[]}
                />
              ) : (
                <div className="space-y-2">
                  <ValueDisplay value={diff.oldValue} type="old" />
                  <div className="flex items-center gap-2 px-2">
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                    <span className="text-xs text-slate-500 dark:text-dark-text-tertiary">
                      changed to
                    </span>
                  </div>
                  <ValueDisplay value={diff.newValue} type="new" />
                </div>
              )}
            </>
          )}

          {diff.type === 'added' && (
            <ValueDisplay value={diff.newValue} type="new" />
          )}

          {diff.type === 'removed' && (
            <ValueDisplay value={diff.oldValue} type="old" />
          )}
        </div>
      )}
    </Card>
  );
}

// ============================================
// Summary Card Component
// ============================================

interface SummaryCardProps {
  diffs: FieldDiffType[];
}

function SummaryCard({ diffs }: SummaryCardProps) {
  const summary = useMemo(() => {
    const added = diffs.filter(d => d.type === 'added').length;
    const removed = diffs.filter(d => d.type === 'removed').length;
    const modified = diffs.filter(d => d.type === 'modified').length;

    // Group by top-level field
    const byTopLevel: Record<string, FieldDiffType[]> = {};
    for (const diff of diffs) {
      const topLevel = diff.path.split('.')[0] ?? diff.path;
      if (!byTopLevel[topLevel]) {
        byTopLevel[topLevel] = [];
      }
      byTopLevel[topLevel]!.push(diff);
    }

    return { added, removed, modified, byTopLevel };
  }, [diffs]);

  return (
    <Card className="p-4 mb-4 bg-white dark:bg-dark-bg-secondary">
      <h3 className="text-sm font-semibold text-slate-700 dark:text-dark-text-primary mb-3">
        Change Summary
      </h3>

      {/* Stats */}
      <div className="flex items-center gap-4 mb-4">
        <Badge variant="success" size="sm">
          <Plus className="w-3 h-3 mr-1" />
          {summary.added} added
        </Badge>
        <Badge variant="error" size="sm">
          <Minus className="w-3 h-3 mr-1" />
          {summary.removed} removed
        </Badge>
        <Badge variant="warning" size="sm">
          <ArrowRight className="w-3 h-3 mr-1" />
          {summary.modified} modified
        </Badge>
      </div>

      {/* Affected Sections */}
      <div className="text-xs text-slate-600 dark:text-dark-text-secondary">
        <span className="font-medium">Affected sections: </span>
        {Object.keys(summary.byTopLevel).join(', ')}
      </div>
    </Card>
  );
}

// ============================================
// Group Header Component
// ============================================

interface GroupHeaderProps {
  path: string;
  count: number;
  isExpanded: boolean;
  onToggle: () => void;
}

function GroupHeader({ path, count, isExpanded, onToggle }: GroupHeaderProps) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-2 px-3 py-2 text-left bg-slate-100 dark:bg-dark-bg-tertiary rounded-lg hover:bg-slate-200 dark:hover:bg-dark-bg-elevated transition-colors"
    >
      {isExpanded ? (
        <ChevronDown className="w-4 h-4 text-slate-500" />
      ) : (
        <ChevronRight className="w-4 h-4 text-slate-500" />
      )}
      <Braces className="w-4 h-4 text-brand-500" />
      <code className="flex-1 text-sm font-mono font-medium text-slate-700 dark:text-dark-text-primary">
        {path}
      </code>
      <Badge variant="default" size="sm">
        {count} change{count !== 1 ? 's' : ''}
      </Badge>
    </button>
  );
}

// ============================================
// Main Field Diff Component
// ============================================

export function FieldDiff({
  diffs,
  className,
  showSummary = true,
  collapsible = true,
  maxDepth = 5,
}: FieldDiffProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(['identity', 'model', 'tools']) // Common sections expanded by default
  );

  // Group diffs by top-level field
  const groupedDiffs = useMemo(() => {
    const groups: Record<string, FieldDiffType[]> = {};

    for (const diff of diffs) {
      const topLevel = diff.path.split('.')[0] ?? diff.path;
      if (!groups[topLevel]) {
        groups[topLevel] = [];
      }
      groups[topLevel]!.push(diff);
    }

    // Sort groups alphabetically
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [diffs]);

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupName)) {
        next.delete(groupName);
      } else {
        next.add(groupName);
      }
      return next;
    });
  };

  if (diffs.length === 0) {
    return (
      <div className={cn('flex items-center justify-center h-full', className)}>
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-dark-text-quaternary" />
          <p className="text-slate-500 dark:text-dark-text-tertiary">
            No field-level changes detected
          </p>
          <p className="text-sm text-slate-400 dark:text-dark-text-quaternary mt-1">
            The configurations are identical
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('h-full overflow-auto p-4', className)}>
      {/* Summary */}
      {showSummary && <SummaryCard diffs={diffs} />}

      {/* Grouped Diffs */}
      <div className="space-y-4">
        {groupedDiffs.map(([groupName, groupDiffs]) => {
          const isExpanded = expandedGroups.has(groupName);

          return (
            <div key={groupName}>
              {/* Group Header */}
              <GroupHeader
                path={groupName}
                count={groupDiffs.length}
                isExpanded={isExpanded}
                onToggle={() => toggleGroup(groupName)}
              />

              {/* Group Content */}
              {isExpanded && (
                <div className="mt-2 space-y-2 ml-6">
                  {groupDiffs.map((diff, idx) => (
                    <FieldDiffItem
                      key={`${diff.path}-${idx}`}
                      diff={diff}
                      depth={getFieldDepth(diff.path)}
                      maxDepth={maxDepth}
                      collapsible={collapsible}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Expand/Collapse All */}
      <div className="flex items-center justify-center gap-4 mt-6 pt-4 border-t border-slate-200 dark:border-dark-border-primary">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpandedGroups(new Set(groupedDiffs.map(([name]) => name)))}
        >
          Expand All
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpandedGroups(new Set())}
        >
          Collapse All
        </Button>
      </div>
    </div>
  );
}

export default FieldDiff;
