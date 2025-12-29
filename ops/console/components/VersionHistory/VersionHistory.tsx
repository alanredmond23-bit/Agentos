/**
 * AgentOS Studio - Version History Component
 * Main container for version history, timeline, and diff viewer
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { GitBranch, GitCompare, Search, Filter, X, Calendar, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { VersionTimeline } from './VersionTimeline';
import { DiffViewer } from './DiffViewer';
import { RollbackModal } from './RollbackModal';
import { CompareSelector } from './CompareSelector';
import {
  getVersionHistory,
  getCurrentVersion,
  rollbackToVersion,
  compareVersions,
  filterVersionsByDateRange,
  getDateRangeFromPreset,
  getDateRangePresetLabel,
  type Version,
  type VersionAuthor,
  type ComparisonResult,
  type DateRangePreset,
} from '@/lib/studio/versionControl';

// ============================================
// Types
// ============================================

interface VersionHistoryProps {
  agentId: string;
  onRollback?: (versionId: string) => void;
  className?: string;
}

type ViewMode = 'side-by-side' | 'unified' | 'field';

// ============================================
// Version History Component
// ============================================

export function VersionHistory({
  agentId,
  onRollback,
  className,
}: VersionHistoryProps) {
  // State
  const [versions, setVersions] = useState<Version[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);
  const [compareVersion, setCompareVersion] = useState<Version | null>(null);
  const [currentVersion, setCurrentVersion] = useState<Version | null>(null);
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('side-by-side');
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>('all');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [rollbackTarget, setRollbackTarget] = useState<Version | null>(null);
  const [isRollingBack, setIsRollingBack] = useState(false);

  // Load versions on mount
  useEffect(() => {
    loadVersions();
  }, [agentId]);

  // Compute comparison when versions change
  useEffect(() => {
    if (selectedVersion && compareVersion) {
      const result = compareVersions(
        compareVersion.yamlContent,
        selectedVersion.yamlContent
      );
      setComparison(result);
    } else if (selectedVersion && currentVersion && selectedVersion.id !== currentVersion.id) {
      const result = compareVersions(
        currentVersion.yamlContent,
        selectedVersion.yamlContent
      );
      setComparison(result);
    } else {
      setComparison(null);
    }
  }, [selectedVersion, compareVersion, currentVersion]);

  const loadVersions = useCallback(() => {
    const allVersions = getVersionHistory(agentId);
    setVersions(allVersions);

    const current = getCurrentVersion(agentId);
    setCurrentVersion(current);

    if (!selectedVersion && allVersions.length > 0) {
      setSelectedVersion(allVersions[0]);
    }
  }, [agentId, selectedVersion]);

  // Filter versions
  const filteredVersions = React.useMemo(() => {
    let result = versions;

    // Apply date range filter
    if (dateRangePreset !== 'all') {
      const dateRange = getDateRangeFromPreset(dateRangePreset);
      result = filterVersionsByDateRange(result, dateRange);
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(version =>
        version.message.toLowerCase().includes(query) ||
        version.author.name.toLowerCase().includes(query) ||
        version.changes?.some(c => c.field.toLowerCase().includes(query))
      );
    }

    // Apply tag filter
    if (filterTag) {
      result = result.filter(version => version.tags?.includes(filterTag));
    }

    return result;
  }, [versions, searchQuery, filterTag, dateRangePreset]);

  // Get all unique tags
  const allTags = Array.from(
    new Set(versions.flatMap(v => v.tags || []))
  );

  // Handle version selection
  const handleVersionSelect = (version: Version) => {
    if (isCompareMode && selectedVersion) {
      setCompareVersion(version);
      setIsCompareMode(false);
    } else {
      setSelectedVersion(version);
      setCompareVersion(null);
    }
  };

  // Handle compare mode toggle
  const handleCompareClick = () => {
    if (isCompareMode) {
      setIsCompareMode(false);
      setCompareVersion(null);
    } else {
      setIsCompareMode(true);
    }
  };

  // Handle rollback
  const handleRollback = async () => {
    if (!rollbackTarget) return;

    setIsRollingBack(true);

    try {
      const author: VersionAuthor = {
        id: 'current-user',
        name: 'Current User',
        email: 'user@example.com',
      };

      const newVersion = rollbackToVersion(agentId, rollbackTarget.id, author);
      loadVersions();
      setSelectedVersion(newVersion);
      setRollbackTarget(null);
      onRollback?.(rollbackTarget.id);
    } catch (error) {
      console.error('Rollback failed:', error);
    } finally {
      setIsRollingBack(false);
    }
  };

  // Handle clear comparison
  const handleClearComparison = () => {
    setCompareVersion(null);
  };

  return (
    <div className={cn('flex h-full', className)}>
      {/* Left Panel - Timeline */}
      <div className="w-96 flex-shrink-0 border-r border-slate-200 dark:border-dark-border-primary bg-white dark:bg-dark-bg-secondary overflow-hidden flex flex-col">
        {/* Search and Filters */}
        <div className="p-4 border-b border-slate-200 dark:border-dark-border-primary space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search versions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 dark:border-dark-border-primary rounded-lg bg-white dark:bg-dark-bg-tertiary text-slate-900 dark:text-dark-text-primary placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Date Range Filter */}
          <div className="relative">
            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="w-full flex items-center justify-between px-3 py-2 text-sm border border-slate-200 dark:border-dark-border-primary rounded-lg bg-white dark:bg-dark-bg-tertiary text-slate-700 dark:text-dark-text-primary hover:bg-slate-50 dark:hover:bg-dark-bg-elevated transition-colors"
            >
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span>{getDateRangePresetLabel(dateRangePreset)}</span>
              </div>
              <ChevronDown className={cn('w-4 h-4 text-slate-400 transition-transform', showDatePicker && 'rotate-180')} />
            </button>

            {/* Date Range Dropdown */}
            {showDatePicker && (
              <div className="absolute z-50 top-full left-0 mt-1 w-full bg-white dark:bg-dark-bg-secondary rounded-lg shadow-xl border border-slate-200 dark:border-dark-border-primary overflow-hidden">
                {(['all', 'today', 'yesterday', 'last7days', 'last30days', 'thisMonth', 'lastMonth'] as DateRangePreset[]).map(preset => (
                  <button
                    key={preset}
                    onClick={() => {
                      setDateRangePreset(preset);
                      setShowDatePicker(false);
                    }}
                    className={cn(
                      'w-full px-3 py-2 text-sm text-left transition-colors',
                      dateRangePreset === preset
                        ? 'bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-400'
                        : 'text-slate-700 dark:text-dark-text-primary hover:bg-slate-50 dark:hover:bg-dark-bg-tertiary'
                    )}
                  >
                    {getDateRangePresetLabel(preset)}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Tag Filters */}
          {allTags.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="w-4 h-4 text-slate-400" />
              {allTags.map(tag => (
                <Badge
                  key={tag}
                  variant={filterTag === tag ? 'primary' : 'outline'}
                  size="sm"
                  className="cursor-pointer"
                  onClick={() => setFilterTag(filterTag === tag ? null : tag)}
                >
                  {tag}
                </Badge>
              ))}
              {filterTag && (
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => setFilterTag(null)}
                  leftIcon={<X className="w-3 h-3" />}
                >
                  Clear
                </Button>
              )}
            </div>
          )}

          {/* Compare Mode Toggle */}
          <div className="flex items-center gap-2">
            <Button
              variant={isCompareMode ? 'primary' : 'outline'}
              size="sm"
              onClick={handleCompareClick}
              leftIcon={<GitCompare className="w-4 h-4" />}
              className="flex-1"
            >
              {isCompareMode ? 'Select version to compare' : 'Compare versions'}
            </Button>
          </div>

          {/* Comparison Info */}
          {compareVersion && (
            <Card className="p-2 bg-brand-50 dark:bg-brand-500/10 border-brand-200 dark:border-brand-500/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <GitBranch className="w-4 h-4 text-brand-600" />
                  <span className="text-brand-700 dark:text-brand-400">
                    Comparing v{compareVersion.version} with v{selectedVersion?.version}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={handleClearComparison}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </Card>
          )}
        </div>

        {/* Version Timeline */}
        <div className="flex-1 overflow-y-auto">
          <VersionTimeline
            versions={filteredVersions}
            selectedVersion={selectedVersion}
            compareVersion={compareVersion}
            currentVersion={currentVersion}
            isCompareMode={isCompareMode}
            onVersionSelect={handleVersionSelect}
            onRollbackClick={setRollbackTarget}
          />
        </div>

        {/* Version Count */}
        <div className="p-3 border-t border-slate-200 dark:border-dark-border-primary bg-slate-50 dark:bg-dark-bg-tertiary">
          <p className="text-xs text-slate-500 dark:text-dark-text-tertiary text-center">
            {filteredVersions.length} of {versions.length} versions
          </p>
        </div>
      </div>

      {/* Right Panel - Diff Viewer */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-dark-border-primary bg-white dark:bg-dark-bg-secondary">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500 dark:text-dark-text-tertiary">
                View:
              </span>
              <div className="flex items-center rounded-lg border border-slate-200 dark:border-dark-border-primary overflow-hidden">
                {(['side-by-side', 'unified', 'field'] as ViewMode[]).map(mode => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={cn(
                      'px-3 py-1.5 text-xs font-medium transition-colors',
                      viewMode === mode
                        ? 'bg-brand-600 text-white'
                        : 'bg-white dark:bg-dark-bg-tertiary text-slate-600 dark:text-dark-text-secondary hover:bg-slate-100 dark:hover:bg-dark-bg-elevated'
                    )}
                  >
                    {mode === 'side-by-side' ? 'Side by Side' : mode === 'unified' ? 'Unified' : 'Fields'}
                  </button>
                ))}
              </div>
            </div>

            {/* Compare Selector */}
            <CompareSelector
              versions={versions}
              selectedVersion={selectedVersion}
              compareVersion={compareVersion}
              currentVersion={currentVersion}
              onCompareSelect={setCompareVersion}
            />
          </div>

          {/* Diff Stats */}
          {comparison && (
            <div className="flex items-center gap-3 text-sm">
              <span className="text-emerald-600 dark:text-emerald-400">
                +{comparison.lineDiff.additions}
              </span>
              <span className="text-red-600 dark:text-red-400">
                -{comparison.lineDiff.deletions}
              </span>
              <span className="text-slate-500 dark:text-dark-text-tertiary">
                ~{comparison.lineDiff.unchanged}
              </span>
            </div>
          )}
        </div>

        {/* Diff Content */}
        <div className="flex-1 overflow-auto">
          {selectedVersion ? (
            <DiffViewer
              version={selectedVersion}
              compareVersion={compareVersion || currentVersion}
              comparison={comparison}
              viewMode={viewMode}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-slate-500 dark:text-dark-text-tertiary">
                Select a version to view details
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Rollback Modal */}
      <RollbackModal
        isOpen={!!rollbackTarget}
        version={rollbackTarget}
        currentVersion={currentVersion}
        isLoading={isRollingBack}
        onConfirm={handleRollback}
        onCancel={() => setRollbackTarget(null)}
      />
    </div>
  );
}

export default VersionHistory;
