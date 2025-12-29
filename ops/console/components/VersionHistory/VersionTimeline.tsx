/**
 * AgentOS Studio - Version Timeline Component
 * Displays a vertical timeline of version history
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { VersionItem } from './VersionItem';
import { type Version } from '@/lib/studio/versionControl';

// ============================================
// Types
// ============================================

interface VersionTimelineProps {
  versions: Version[];
  selectedVersion: Version | null;
  compareVersion: Version | null;
  currentVersion: Version | null;
  isCompareMode: boolean;
  onVersionSelect: (version: Version) => void;
  onRollbackClick: (version: Version) => void;
  className?: string;
}

// ============================================
// Timeline Connector
// ============================================

interface TimelineConnectorProps {
  isFirst: boolean;
  isLast: boolean;
  isSelected: boolean;
  isCompare: boolean;
  isCurrent: boolean;
}

function TimelineConnector({
  isFirst,
  isLast,
  isSelected,
  isCompare,
  isCurrent,
}: TimelineConnectorProps) {
  const getDotColor = () => {
    if (isCompare) return 'bg-purple-500';
    if (isSelected) return 'bg-brand-500';
    if (isCurrent) return 'bg-emerald-500';
    return 'bg-slate-300 dark:bg-zinc-600';
  };

  const getLineColor = () => {
    if (isSelected || isCompare) return 'bg-brand-200 dark:bg-brand-800';
    return 'bg-slate-200 dark:bg-zinc-700';
  };

  return (
    <div className="absolute left-6 top-0 bottom-0 flex flex-col items-center">
      {/* Top connector line */}
      {!isFirst && (
        <div className={cn('w-0.5 flex-1', getLineColor())} />
      )}

      {/* Dot */}
      <div
        className={cn(
          'relative z-10 w-3 h-3 rounded-full flex-shrink-0 ring-4 ring-white dark:ring-dark-bg-secondary transition-all',
          getDotColor(),
          (isSelected || isCompare) && 'w-4 h-4'
        )}
      >
        {isCurrent && (
          <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500 opacity-50" />
        )}
      </div>

      {/* Bottom connector line */}
      {!isLast && (
        <div className={cn('w-0.5 flex-1', getLineColor())} />
      )}
    </div>
  );
}

// ============================================
// Version Timeline Component
// ============================================

export function VersionTimeline({
  versions,
  selectedVersion,
  compareVersion,
  currentVersion,
  isCompareMode,
  onVersionSelect,
  onRollbackClick,
  className,
}: VersionTimelineProps) {
  if (versions.length === 0) {
    return (
      <div className={cn('flex items-center justify-center h-64', className)}>
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-100 dark:bg-dark-bg-tertiary flex items-center justify-center">
            <svg
              className="w-6 h-6 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
          </div>
          <p className="text-sm text-slate-500 dark:text-dark-text-tertiary">
            No versions found
          </p>
          <p className="text-xs text-slate-400 dark:text-dark-text-quaternary mt-1">
            Save changes to create your first version
          </p>
        </div>
      </div>
    );
  }

  // Group versions by date
  const groupedVersions = groupVersionsByDate(versions);

  return (
    <div className={cn('relative py-4', className)}>
      {Object.entries(groupedVersions).map(([dateLabel, dateVersions]) => (
        <div key={dateLabel} className="mb-6">
          {/* Date Header */}
          <div className="px-4 mb-2 sticky top-0 z-20 bg-white dark:bg-dark-bg-secondary py-1">
            <h3 className="text-xs font-semibold text-slate-500 dark:text-dark-text-tertiary uppercase tracking-wider">
              {dateLabel}
            </h3>
          </div>

          {/* Versions for this date */}
          <div className="relative">
            {dateVersions.map((version, index) => {
              const isSelected = selectedVersion?.id === version.id;
              const isCompare = compareVersion?.id === version.id;
              const isCurrent = currentVersion?.id === version.id;
              const isFirst = index === 0;
              const isLast = index === dateVersions.length - 1;

              return (
                <div
                  key={version.id}
                  className="relative pl-14 pr-4 py-2"
                >
                  {/* Timeline connector */}
                  <TimelineConnector
                    isFirst={isFirst}
                    isLast={isLast}
                    isSelected={isSelected}
                    isCompare={isCompare}
                    isCurrent={isCurrent}
                  />

                  {/* Version Item */}
                  <VersionItem
                    version={version}
                    isSelected={isSelected}
                    isCompare={isCompare}
                    isCurrent={isCurrent}
                    isCompareMode={isCompareMode}
                    onClick={() => onVersionSelect(version)}
                    onRollbackClick={() => onRollbackClick(version)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================
// Utilities
// ============================================

function groupVersionsByDate(versions: Version[]): Record<string, Version[]> {
  const groups: Record<string, Version[]> = {};

  for (const version of versions) {
    const date = new Date(version.timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let label: string;

    if (isSameDay(date, today)) {
      label = 'Today';
    } else if (isSameDay(date, yesterday)) {
      label = 'Yesterday';
    } else if (isWithinDays(date, today, 7)) {
      label = 'This Week';
    } else if (isWithinDays(date, today, 30)) {
      label = 'This Month';
    } else {
      label = formatMonthYear(date);
    }

    if (!groups[label]) {
      groups[label] = [];
    }
    groups[label].push(version);
  }

  return groups;
}

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

function isWithinDays(date: Date, referenceDate: Date, days: number): boolean {
  const diffTime = referenceDate.getTime() - date.getTime();
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= days;
}

function formatMonthYear(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export default VersionTimeline;
