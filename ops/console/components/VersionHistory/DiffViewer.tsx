/**
 * AgentOS Studio - Diff Viewer Component
 * Displays side-by-side, unified, and field-level diffs
 */

'use client';

import React, { useMemo } from 'react';
import { FileCode, Plus, Minus, ArrowRight, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import {
  formatVersionNumber,
  computeWordDiff,
  type Version,
  type ComparisonResult,
  type DiffLine,
  type FieldDiff,
} from '@/lib/studio/versionControl';

// ============================================
// Types
// ============================================

interface DiffViewerProps {
  version: Version;
  compareVersion: Version | null;
  comparison: ComparisonResult | null;
  viewMode: 'side-by-side' | 'unified' | 'field';
  className?: string;
}

// ============================================
// Line Number Component
// ============================================

interface LineNumberProps {
  number?: number;
  className?: string;
}

function LineNumber({ number, className }: LineNumberProps) {
  return (
    <span
      className={cn(
        'select-none w-10 text-right pr-3 text-xs text-slate-400 dark:text-dark-text-quaternary flex-shrink-0',
        className
      )}
    >
      {number ?? ''}
    </span>
  );
}

// ============================================
// Diff Line Component
// ============================================

interface DiffLineContentProps {
  line: DiffLine;
  showWordDiff?: boolean;
  compareLine?: string;
}

function DiffLineContent({ line, showWordDiff, compareLine }: DiffLineContentProps) {
  const getLineStyles = () => {
    switch (line.type) {
      case 'added':
        return 'bg-emerald-50 dark:bg-emerald-500/10 border-l-2 border-emerald-500';
      case 'removed':
        return 'bg-red-50 dark:bg-red-500/10 border-l-2 border-red-500';
      default:
        return 'bg-transparent';
    }
  };

  const getTextStyles = () => {
    switch (line.type) {
      case 'added':
        return 'text-emerald-800 dark:text-emerald-300';
      case 'removed':
        return 'text-red-800 dark:text-red-300';
      default:
        return 'text-slate-700 dark:text-dark-text-primary';
    }
  };

  const getIcon = () => {
    switch (line.type) {
      case 'added':
        return <Plus className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />;
      case 'removed':
        return <Minus className="w-3 h-3 text-red-600 dark:text-red-400" />;
      default:
        return <span className="w-3 h-3" />;
    }
  };

  // Render word-level diff if enabled
  const renderContent = () => {
    if (showWordDiff && compareLine && line.type !== 'unchanged') {
      const wordDiffs = computeWordDiff(compareLine, line.content);
      return (
        <>
          {wordDiffs.map((part, idx) => (
            <span
              key={idx}
              className={cn(
                part.added && 'bg-emerald-200 dark:bg-emerald-700 rounded px-0.5',
                part.removed && 'bg-red-200 dark:bg-red-700 rounded px-0.5 line-through'
              )}
            >
              {part.value}
            </span>
          ))}
        </>
      );
    }
    return line.content || '\u00A0';
  };

  return (
    <div className={cn('flex items-start min-h-[24px] group', getLineStyles())}>
      <span className="flex-shrink-0 w-5 flex items-center justify-center py-0.5">
        {getIcon()}
      </span>
      <pre className={cn('flex-1 px-2 py-0.5 text-sm font-mono whitespace-pre-wrap break-all', getTextStyles())}>
        {renderContent()}
      </pre>
    </div>
  );
}

// ============================================
// Side by Side View
// ============================================

interface SideBySideViewProps {
  comparison: ComparisonResult;
  oldVersion: Version;
  newVersion: Version;
}

function SideBySideView({ comparison, oldVersion, newVersion }: SideBySideViewProps) {
  const { leftLines, rightLines } = useMemo(() => {
    const left: (DiffLine | null)[] = [];
    const right: (DiffLine | null)[] = [];

    for (const line of comparison.lineDiff.lines) {
      if (line.type === 'unchanged') {
        left.push(line);
        right.push(line);
      } else if (line.type === 'removed') {
        left.push(line);
        right.push(null);
      } else if (line.type === 'added') {
        left.push(null);
        right.push(line);
      }
    }

    // Compact consecutive nulls
    const compactedLeft: (DiffLine | null)[] = [];
    const compactedRight: (DiffLine | null)[] = [];

    let i = 0;
    while (i < Math.max(left.length, right.length)) {
      const l = left[i] || null;
      const r = right[i] || null;

      // Try to pair removed with added
      if (l?.type === 'removed' && r === null) {
        let j = i + 1;
        while (j < right.length && right[j] === null && left[j]?.type === 'removed') {
          j++;
        }
        // Check if there are additions following
        if (j < right.length && right[j]?.type === 'added') {
          let addCount = 0;
          let k = j;
          while (k < right.length && right[k]?.type === 'added') {
            addCount++;
            k++;
          }

          const removeCount = j - i;
          const pairCount = Math.min(removeCount, addCount);

          // Pair up removals and additions
          for (let p = 0; p < pairCount; p++) {
            compactedLeft.push(left[i + p]);
            compactedRight.push(right[j + p]);
          }

          // Add remaining removals
          for (let p = pairCount; p < removeCount; p++) {
            compactedLeft.push(left[i + p]);
            compactedRight.push(null);
          }

          // Add remaining additions
          for (let p = pairCount; p < addCount; p++) {
            compactedLeft.push(null);
            compactedRight.push(right[j + p]);
          }

          i = k;
          continue;
        }
      }

      compactedLeft.push(l);
      compactedRight.push(r);
      i++;
    }

    return { leftLines: compactedLeft, rightLines: compactedRight };
  }, [comparison]);

  return (
    <div className="flex h-full">
      {/* Left Panel (Old) */}
      <div className="flex-1 overflow-auto border-r border-slate-200 dark:border-dark-border-primary">
        <div className="sticky top-0 z-10 flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-dark-bg-tertiary border-b border-slate-200 dark:border-dark-border-primary">
          <FileCode className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-medium text-slate-700 dark:text-dark-text-primary">
            {formatVersionNumber(oldVersion.version)}
          </span>
          <span className="text-xs text-slate-500 dark:text-dark-text-tertiary">
            (older)
          </span>
        </div>
        <div className="font-mono text-sm">
          {leftLines.map((line, idx) => (
            <div key={idx} className="flex">
              <LineNumber number={line?.lineNumberOld} />
              {line ? (
                <DiffLineContent line={line} />
              ) : (
                <div className="flex-1 bg-slate-50 dark:bg-dark-bg-tertiary min-h-[24px]" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel (New) */}
      <div className="flex-1 overflow-auto">
        <div className="sticky top-0 z-10 flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-dark-bg-tertiary border-b border-slate-200 dark:border-dark-border-primary">
          <FileCode className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-medium text-slate-700 dark:text-dark-text-primary">
            {formatVersionNumber(newVersion.version)}
          </span>
          <span className="text-xs text-slate-500 dark:text-dark-text-tertiary">
            (newer)
          </span>
        </div>
        <div className="font-mono text-sm">
          {rightLines.map((line, idx) => (
            <div key={idx} className="flex">
              <LineNumber number={line?.lineNumberNew} />
              {line ? (
                <DiffLineContent line={line} />
              ) : (
                <div className="flex-1 bg-slate-50 dark:bg-dark-bg-tertiary min-h-[24px]" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================
// Unified View
// ============================================

interface UnifiedViewProps {
  comparison: ComparisonResult;
  oldVersion: Version;
  newVersion: Version;
}

function UnifiedView({ comparison, oldVersion, newVersion }: UnifiedViewProps) {
  return (
    <div className="h-full overflow-auto">
      <div className="sticky top-0 z-10 flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-dark-bg-tertiary border-b border-slate-200 dark:border-dark-border-primary">
        <FileCode className="w-4 h-4 text-slate-500" />
        <span className="text-sm text-slate-700 dark:text-dark-text-primary">
          {formatVersionNumber(oldVersion.version)}
        </span>
        <ArrowRight className="w-4 h-4 text-slate-400" />
        <span className="text-sm text-slate-700 dark:text-dark-text-primary">
          {formatVersionNumber(newVersion.version)}
        </span>
      </div>
      <div className="font-mono text-sm">
        {comparison.lineDiff.lines.map((line, idx) => (
          <div key={idx} className="flex">
            <LineNumber number={line.lineNumberOld} className="border-r border-slate-200 dark:border-dark-border-primary" />
            <LineNumber number={line.lineNumberNew} />
            <DiffLineContent line={line} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// Field View
// ============================================

interface FieldViewProps {
  comparison: ComparisonResult;
}

function FieldView({ comparison }: FieldViewProps) {
  const { fieldDiffs, summary } = comparison;

  if (fieldDiffs.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Info className="w-8 h-8 mx-auto mb-2 text-slate-400" />
          <p className="text-slate-500 dark:text-dark-text-tertiary">
            No field-level changes detected
          </p>
        </div>
      </div>
    );
  }

  const getFieldTypeStyles = (type: FieldDiff['type']) => {
    switch (type) {
      case 'added':
        return {
          badge: 'success' as const,
          bg: 'bg-emerald-50 dark:bg-emerald-500/10',
          border: 'border-emerald-200 dark:border-emerald-500/30',
        };
      case 'removed':
        return {
          badge: 'error' as const,
          bg: 'bg-red-50 dark:bg-red-500/10',
          border: 'border-red-200 dark:border-red-500/30',
        };
      case 'modified':
        return {
          badge: 'warning' as const,
          bg: 'bg-amber-50 dark:bg-amber-500/10',
          border: 'border-amber-200 dark:border-amber-500/30',
        };
    }
  };

  return (
    <div className="h-full overflow-auto p-4">
      {/* Summary */}
      <Card className="p-4 mb-4">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-dark-text-primary mb-3">
          Change Summary
        </h3>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Badge variant="success" size="sm">
              <Plus className="w-3 h-3 mr-1" />
              {summary.added} added
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="error" size="sm">
              <Minus className="w-3 h-3 mr-1" />
              {summary.removed} removed
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="warning" size="sm">
              <ArrowRight className="w-3 h-3 mr-1" />
              {summary.modified} modified
            </Badge>
          </div>
        </div>
      </Card>

      {/* Field Changes */}
      <div className="space-y-3">
        {fieldDiffs.map((diff, idx) => {
          const styles = getFieldTypeStyles(diff.type);

          return (
            <Card
              key={idx}
              className={cn('p-4 border', styles.bg, styles.border)}
            >
              <div className="flex items-start justify-between mb-2">
                <code className="text-sm font-mono font-semibold text-slate-800 dark:text-dark-text-primary">
                  {diff.path}
                </code>
                <Badge variant={styles.badge} size="sm">
                  {diff.type}
                </Badge>
              </div>

              {diff.type === 'modified' && (
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <Minus className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <pre className="text-sm font-mono text-red-700 dark:text-red-400 whitespace-pre-wrap break-all">
                      {String(diff.oldValue)}
                    </pre>
                  </div>
                  <div className="flex items-start gap-2">
                    <Plus className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <pre className="text-sm font-mono text-emerald-700 dark:text-emerald-400 whitespace-pre-wrap break-all">
                      {String(diff.newValue)}
                    </pre>
                  </div>
                </div>
              )}

              {diff.type === 'added' && (
                <div className="flex items-start gap-2">
                  <Plus className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <pre className="text-sm font-mono text-emerald-700 dark:text-emerald-400 whitespace-pre-wrap break-all">
                    {String(diff.newValue)}
                  </pre>
                </div>
              )}

              {diff.type === 'removed' && (
                <div className="flex items-start gap-2">
                  <Minus className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <pre className="text-sm font-mono text-red-700 dark:text-red-400 whitespace-pre-wrap break-all">
                    {String(diff.oldValue)}
                  </pre>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ============================================
// Main Diff Viewer Component
// ============================================

export function DiffViewer({
  version,
  compareVersion,
  comparison,
  viewMode,
  className,
}: DiffViewerProps) {
  // If no comparison, show single version content
  if (!comparison || !compareVersion) {
    return (
      <div className={cn('h-full overflow-auto', className)}>
        <div className="sticky top-0 z-10 flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-dark-bg-tertiary border-b border-slate-200 dark:border-dark-border-primary">
          <FileCode className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-medium text-slate-700 dark:text-dark-text-primary">
            {formatVersionNumber(version.version)}
          </span>
          <Badge variant="default" size="sm">
            {version.isDeployed ? 'Deployed' : 'Draft'}
          </Badge>
        </div>
        <pre className="p-4 font-mono text-sm text-slate-700 dark:text-dark-text-primary whitespace-pre-wrap">
          {version.yamlContent}
        </pre>
      </div>
    );
  }

  // Ensure older version is on the left
  const [oldVersion, newVersion] =
    version.version > compareVersion.version
      ? [compareVersion, version]
      : [version, compareVersion];

  return (
    <div className={cn('h-full', className)}>
      {viewMode === 'side-by-side' && (
        <SideBySideView
          comparison={comparison}
          oldVersion={oldVersion}
          newVersion={newVersion}
        />
      )}
      {viewMode === 'unified' && (
        <UnifiedView
          comparison={comparison}
          oldVersion={oldVersion}
          newVersion={newVersion}
        />
      )}
      {viewMode === 'field' && <FieldView comparison={comparison} />}
    </div>
  );
}

export default DiffViewer;
