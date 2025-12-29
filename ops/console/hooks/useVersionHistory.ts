/**
 * AgentOS Studio - Version History Hook
 * React hook for managing version history state and actions
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getVersionHistory,
  getVersion,
  getCurrentVersion,
  saveVersion,
  updateVersionTags,
  setDeployedVersion,
  rollbackToVersion,
  clearVersionHistory,
  compareVersions,
  filterVersionsByDateRange,
  getDateRangeFromPreset,
  getVersionStats,
  initializeDemoVersionHistory,
  type Version,
  type VersionAuthor,
  type ComparisonResult,
  type DateRangePreset,
  type DateRangeFilter,
  type VersionStats,
} from '@/lib/studio/versionControl';

// ============================================
// Types
// ============================================

export type ViewMode = 'side-by-side' | 'unified' | 'field';

export interface UseVersionHistoryOptions {
  /** Agent ID to track versions for */
  agentId: string;
  /** Auto-initialize demo data if no versions exist */
  initializeDemo?: boolean;
  /** Callback when a version is saved */
  onVersionSaved?: (version: Version) => void;
  /** Callback when rollback completes */
  onRollback?: (version: Version) => void;
  /** Callback when an error occurs */
  onError?: (error: Error) => void;
}

export interface UseVersionHistoryState {
  /** All versions for the agent */
  versions: Version[];
  /** Filtered versions based on current filters */
  filteredVersions: Version[];
  /** Currently selected version for viewing */
  selectedVersion: Version | null;
  /** Version being compared against */
  compareVersion: Version | null;
  /** Current deployed version */
  currentVersion: Version | null;
  /** Comparison result between selected and compare versions */
  comparison: ComparisonResult | null;
  /** Current view mode */
  viewMode: ViewMode;
  /** Whether compare mode is active */
  isCompareMode: boolean;
  /** Search query for filtering */
  searchQuery: string;
  /** Tag filter */
  filterTag: string | null;
  /** Date range preset filter */
  dateRangePreset: DateRangePreset;
  /** Custom date range filter */
  customDateRange: DateRangeFilter;
  /** Version pending rollback confirmation */
  rollbackTarget: Version | null;
  /** Whether a rollback is in progress */
  isRollingBack: boolean;
  /** Whether the history is loading */
  isLoading: boolean;
  /** Version statistics */
  stats: VersionStats | null;
  /** Error state */
  error: Error | null;
}

export interface UseVersionHistoryActions {
  /** Select a version for viewing */
  selectVersion: (version: Version) => void;
  /** Set the version to compare against */
  setCompareVersion: (version: Version | null) => void;
  /** Toggle compare mode */
  toggleCompareMode: () => void;
  /** Clear the comparison */
  clearComparison: () => void;
  /** Set the view mode */
  setViewMode: (mode: ViewMode) => void;
  /** Set search query */
  setSearchQuery: (query: string) => void;
  /** Set tag filter */
  setFilterTag: (tag: string | null) => void;
  /** Set date range preset */
  setDateRangePreset: (preset: DateRangePreset) => void;
  /** Set custom date range */
  setCustomDateRange: (range: DateRangeFilter) => void;
  /** Clear all filters */
  clearFilters: () => void;
  /** Initiate rollback to a version */
  initiateRollback: (version: Version) => void;
  /** Cancel pending rollback */
  cancelRollback: () => void;
  /** Confirm and execute rollback */
  confirmRollback: (author: VersionAuthor) => Promise<Version | null>;
  /** Save a new version */
  saveNewVersion: (
    yamlContent: string,
    author: VersionAuthor,
    message: string,
    tags?: string[]
  ) => Version | null;
  /** Update version tags */
  updateTags: (versionId: string, tags: string[]) => Version | null;
  /** Deploy a version */
  deployVersion: (versionId: string) => void;
  /** Reload version history */
  reload: () => void;
  /** Clear all version history */
  clearHistory: () => void;
  /** Get a specific version by ID */
  getVersionById: (versionId: string) => Version | null;
  /** Export version as YAML */
  exportVersion: (version: Version) => void;
}

export interface UseVersionHistoryReturn {
  state: UseVersionHistoryState;
  actions: UseVersionHistoryActions;
}

// ============================================
// Hook Implementation
// ============================================

export function useVersionHistory(
  options: UseVersionHistoryOptions
): UseVersionHistoryReturn {
  const { agentId, initializeDemo = false, onVersionSaved, onRollback, onError } =
    options;

  // ============================================
  // State
  // ============================================

  const [versions, setVersions] = useState<Version[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);
  const [compareVersion, setCompareVersion] = useState<Version | null>(null);
  const [currentVersion, setCurrentVersion] = useState<Version | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('side-by-side');
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>('all');
  const [customDateRange, setCustomDateRange] = useState<DateRangeFilter>({});
  const [rollbackTarget, setRollbackTarget] = useState<Version | null>(null);
  const [isRollingBack, setIsRollingBack] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // ============================================
  // Computed Values
  // ============================================

  // Filter versions based on current filters
  const filteredVersions = useMemo(() => {
    let result = versions;

    // Apply date range filter
    if (dateRangePreset !== 'all') {
      const dateRange = getDateRangeFromPreset(dateRangePreset);
      result = filterVersionsByDateRange(result, dateRange);
    } else if (customDateRange.startDate || customDateRange.endDate) {
      result = filterVersionsByDateRange(result, customDateRange);
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        version =>
          version.message.toLowerCase().includes(query) ||
          version.author.name.toLowerCase().includes(query) ||
          version.changes?.some(c => c.field.toLowerCase().includes(query)) ||
          version.tags?.some(t => t.toLowerCase().includes(query))
      );
    }

    // Apply tag filter
    if (filterTag) {
      result = result.filter(version => version.tags?.includes(filterTag));
    }

    return result;
  }, [versions, searchQuery, filterTag, dateRangePreset, customDateRange]);

  // Compute comparison when versions change
  const comparison = useMemo(() => {
    if (selectedVersion && compareVersion) {
      return compareVersions(
        compareVersion.yamlContent,
        selectedVersion.yamlContent
      );
    }
    if (
      selectedVersion &&
      currentVersion &&
      selectedVersion.id !== currentVersion.id
    ) {
      return compareVersions(
        currentVersion.yamlContent,
        selectedVersion.yamlContent
      );
    }
    return null;
  }, [selectedVersion, compareVersion, currentVersion]);

  // Get version statistics
  const stats = useMemo(() => {
    if (versions.length === 0) return null;
    return getVersionStats(agentId);
  }, [agentId, versions]);

  // ============================================
  // Load Versions
  // ============================================

  const loadVersions = useCallback(() => {
    setIsLoading(true);
    setError(null);

    try {
      // Initialize demo data if requested
      if (initializeDemo) {
        initializeDemoVersionHistory(agentId);
      }

      const allVersions = getVersionHistory(agentId);
      setVersions(allVersions);

      const current = getCurrentVersion(agentId);
      setCurrentVersion(current);

      // Select first version if none selected
      if (!selectedVersion && allVersions.length > 0) {
        setSelectedVersion(allVersions[0]!);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      onError?.(error);
    } finally {
      setIsLoading(false);
    }
  }, [agentId, initializeDemo, selectedVersion, onError]);

  // Load on mount and when agentId changes
  useEffect(() => {
    loadVersions();
  }, [agentId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ============================================
  // Actions
  // ============================================

  const selectVersion = useCallback((version: Version) => {
    if (isCompareMode && selectedVersion) {
      setCompareVersion(version);
      setIsCompareMode(false);
    } else {
      setSelectedVersion(version);
      setCompareVersion(null);
    }
  }, [isCompareMode, selectedVersion]);

  const toggleCompareMode = useCallback(() => {
    setIsCompareMode(prev => {
      if (prev) {
        setCompareVersion(null);
      }
      return !prev;
    });
  }, []);

  const clearComparison = useCallback(() => {
    setCompareVersion(null);
    setIsCompareMode(false);
  }, []);

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setFilterTag(null);
    setDateRangePreset('all');
    setCustomDateRange({});
  }, []);

  const initiateRollback = useCallback((version: Version) => {
    setRollbackTarget(version);
  }, []);

  const cancelRollback = useCallback(() => {
    setRollbackTarget(null);
  }, []);

  const confirmRollback = useCallback(
    async (author: VersionAuthor): Promise<Version | null> => {
      if (!rollbackTarget) return null;

      setIsRollingBack(true);
      setError(null);

      try {
        const newVersion = rollbackToVersion(agentId, rollbackTarget.id, author);
        loadVersions();
        setSelectedVersion(newVersion);
        setRollbackTarget(null);
        onRollback?.(newVersion);
        return newVersion;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        onError?.(error);
        return null;
      } finally {
        setIsRollingBack(false);
      }
    },
    [agentId, rollbackTarget, loadVersions, onRollback, onError]
  );

  const saveNewVersion = useCallback(
    (
      yamlContent: string,
      author: VersionAuthor,
      message: string,
      tags?: string[]
    ): Version | null => {
      try {
        const newVersion = saveVersion(agentId, yamlContent, author, message, tags);
        loadVersions();
        setSelectedVersion(newVersion);
        onVersionSaved?.(newVersion);
        return newVersion;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        onError?.(error);
        return null;
      }
    },
    [agentId, loadVersions, onVersionSaved, onError]
  );

  const updateTags = useCallback(
    (versionId: string, tags: string[]): Version | null => {
      try {
        const updated = updateVersionTags(agentId, versionId, tags);
        if (updated) {
          loadVersions();
        }
        return updated;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        onError?.(error);
        return null;
      }
    },
    [agentId, loadVersions, onError]
  );

  const deployVersion = useCallback(
    (versionId: string): void => {
      try {
        setDeployedVersion(agentId, versionId);
        loadVersions();
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        onError?.(error);
      }
    },
    [agentId, loadVersions, onError]
  );

  const reload = useCallback(() => {
    loadVersions();
  }, [loadVersions]);

  const clearHistory = useCallback(() => {
    try {
      clearVersionHistory(agentId);
      setVersions([]);
      setSelectedVersion(null);
      setCompareVersion(null);
      setCurrentVersion(null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      onError?.(error);
    }
  }, [agentId, onError]);

  const getVersionById = useCallback(
    (versionId: string): Version | null => {
      return getVersion(agentId, versionId);
    },
    [agentId]
  );

  const exportVersion = useCallback((version: Version): void => {
    const blob = new Blob([version.yamlContent], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `agent-${version.agentId}-v${version.version}.yaml`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

  // ============================================
  // Return
  // ============================================

  const state: UseVersionHistoryState = {
    versions,
    filteredVersions,
    selectedVersion,
    compareVersion,
    currentVersion,
    comparison,
    viewMode,
    isCompareMode,
    searchQuery,
    filterTag,
    dateRangePreset,
    customDateRange,
    rollbackTarget,
    isRollingBack,
    isLoading,
    stats,
    error,
  };

  const actions: UseVersionHistoryActions = {
    selectVersion,
    setCompareVersion,
    toggleCompareMode,
    clearComparison,
    setViewMode,
    setSearchQuery,
    setFilterTag,
    setDateRangePreset,
    setCustomDateRange,
    clearFilters,
    initiateRollback,
    cancelRollback,
    confirmRollback,
    saveNewVersion,
    updateTags,
    deployVersion,
    reload,
    clearHistory,
    getVersionById,
    exportVersion,
  };

  return { state, actions };
}

// ============================================
// Convenience Hooks
// ============================================

/**
 * Hook for just the version list and selection
 */
export function useVersionSelection(agentId: string) {
  const { state, actions } = useVersionHistory({ agentId });

  return {
    versions: state.versions,
    selectedVersion: state.selectedVersion,
    currentVersion: state.currentVersion,
    isLoading: state.isLoading,
    selectVersion: actions.selectVersion,
    reload: actions.reload,
  };
}

/**
 * Hook for version comparison
 */
export function useVersionComparison(agentId: string) {
  const { state, actions } = useVersionHistory({ agentId });

  return {
    selectedVersion: state.selectedVersion,
    compareVersion: state.compareVersion,
    comparison: state.comparison,
    viewMode: state.viewMode,
    isCompareMode: state.isCompareMode,
    selectVersion: actions.selectVersion,
    setCompareVersion: actions.setCompareVersion,
    toggleCompareMode: actions.toggleCompareMode,
    clearComparison: actions.clearComparison,
    setViewMode: actions.setViewMode,
  };
}

/**
 * Hook for version filtering
 */
export function useVersionFilters(agentId: string) {
  const { state, actions } = useVersionHistory({ agentId });

  // Get all unique tags from versions
  const allTags = useMemo(
    () => Array.from(new Set(state.versions.flatMap(v => v.tags || []))),
    [state.versions]
  );

  return {
    versions: state.versions,
    filteredVersions: state.filteredVersions,
    searchQuery: state.searchQuery,
    filterTag: state.filterTag,
    dateRangePreset: state.dateRangePreset,
    allTags,
    setSearchQuery: actions.setSearchQuery,
    setFilterTag: actions.setFilterTag,
    setDateRangePreset: actions.setDateRangePreset,
    clearFilters: actions.clearFilters,
  };
}

/**
 * Hook for rollback operations
 */
export function useVersionRollback(agentId: string) {
  const { state, actions } = useVersionHistory({ agentId });

  return {
    rollbackTarget: state.rollbackTarget,
    isRollingBack: state.isRollingBack,
    currentVersion: state.currentVersion,
    error: state.error,
    initiateRollback: actions.initiateRollback,
    cancelRollback: actions.cancelRollback,
    confirmRollback: actions.confirmRollback,
  };
}

/**
 * Hook for version statistics
 */
export function useVersionStats(agentId: string) {
  const { state } = useVersionHistory({ agentId });

  return {
    stats: state.stats,
    versions: state.versions,
    isLoading: state.isLoading,
  };
}

export default useVersionHistory;
