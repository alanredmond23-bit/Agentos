/**
 * AgentOS Studio - Version Item Component
 * Displays a single version entry in the timeline
 */

'use client';

import React from 'react';
import { Clock, User, RotateCcw, Check, GitBranch, Tag } from 'lucide-react';
import { cn, formatRelativeTime } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Tooltip } from '@/components/ui/Tooltip';
import { formatVersionNumber, type Version } from '@/lib/studio/versionControl';

// ============================================
// Types
// ============================================

interface VersionItemProps {
  version: Version;
  isSelected: boolean;
  isCompare: boolean;
  isCurrent: boolean;
  isCompareMode: boolean;
  onClick: () => void;
  onRollbackClick: () => void;
  className?: string;
}

// ============================================
// Version Item Component
// ============================================

export function VersionItem({
  version,
  isSelected,
  isCompare,
  isCurrent,
  isCompareMode,
  onClick,
  onRollbackClick,
  className,
}: VersionItemProps) {
  const formattedVersion = formatVersionNumber(version.version);
  const timestamp = formatRelativeTime(version.timestamp);

  // Format time for tooltip
  const fullTimestamp = new Date(version.timestamp).toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const handleRollbackClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRollbackClick();
  };

  // Get change summary text
  const getChangeSummary = () => {
    if (!version.changes || version.changes.length === 0) {
      return 'No changes recorded';
    }

    const added = version.changes.filter(c => c.type === 'added').length;
    const removed = version.changes.filter(c => c.type === 'removed').length;
    const modified = version.changes.filter(c => c.type === 'modified').length;

    const parts = [];
    if (added > 0) parts.push(`${added} added`);
    if (removed > 0) parts.push(`${removed} removed`);
    if (modified > 0) parts.push(`${modified} modified`);

    return parts.join(', ') || 'Configuration update';
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        'group relative rounded-lg border transition-all cursor-pointer',
        isSelected
          ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10 shadow-sm'
          : isCompare
            ? 'border-purple-500 bg-purple-50 dark:bg-purple-500/10 shadow-sm'
            : 'border-slate-200 dark:border-dark-border-primary bg-white dark:bg-dark-bg-tertiary hover:border-slate-300 dark:hover:border-dark-border-secondary hover:shadow-sm',
        isCompareMode && !isSelected && 'ring-2 ring-dashed ring-brand-300 dark:ring-brand-700',
        className
      )}
    >
      <div className="p-3">
        {/* Header Row */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            {/* Version Number */}
            <span
              className={cn(
                'text-sm font-mono font-semibold',
                isSelected
                  ? 'text-brand-700 dark:text-brand-400'
                  : isCompare
                    ? 'text-purple-700 dark:text-purple-400'
                    : 'text-slate-700 dark:text-dark-text-primary'
              )}
            >
              {formattedVersion}
            </span>

            {/* Current Badge */}
            {isCurrent && (
              <Badge variant="success" size="sm" dot dotColor="success">
                Current
              </Badge>
            )}

            {/* Compare Badge */}
            {isCompare && (
              <Badge variant="secondary" size="sm">
                <GitBranch className="w-3 h-3 mr-1" />
                Comparing
              </Badge>
            )}

            {/* Deployed Badge */}
            {version.isDeployed && !isCurrent && (
              <Badge variant="info" size="sm">
                <Check className="w-3 h-3 mr-1" />
                Deployed
              </Badge>
            )}
          </div>

          {/* Rollback Button */}
          {!isCurrent && (
            <Tooltip content="Rollback to this version">
              <Button
                variant="ghost"
                size="xs"
                onClick={handleRollbackClick}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </Button>
            </Tooltip>
          )}
        </div>

        {/* Message */}
        <p className="text-sm text-slate-700 dark:text-dark-text-primary mb-2 line-clamp-2">
          {version.message}
        </p>

        {/* Tags */}
        {version.tags && version.tags.length > 0 && (
          <div className="flex items-center gap-1 mb-2 flex-wrap">
            <Tag className="w-3 h-3 text-slate-400" />
            {version.tags.map(tag => (
              <Badge
                key={tag}
                variant="outline"
                size="sm"
                className="text-2xs"
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Change Summary */}
        <p className="text-xs text-slate-500 dark:text-dark-text-tertiary mb-2">
          {getChangeSummary()}
        </p>

        {/* Footer Row */}
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-dark-text-tertiary">
          {/* Author */}
          <div className="flex items-center gap-1.5">
            <Avatar
              name={version.author.name}
              size="xs"
              className="w-4 h-4"
            />
            <span className="truncate max-w-[100px]">
              {version.author.name}
            </span>
          </div>

          {/* Timestamp */}
          <Tooltip content={fullTimestamp}>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{timestamp}</span>
            </div>
          </Tooltip>
        </div>
      </div>

      {/* Selection Indicator */}
      {isSelected && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-brand-500 rounded-r-full" />
      )}
      {isCompare && !isSelected && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-purple-500 rounded-r-full" />
      )}
    </div>
  );
}

export default VersionItem;
