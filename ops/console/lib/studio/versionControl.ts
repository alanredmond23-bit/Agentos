/**
 * AgentOS Studio - Version Control System
 * Manages version history, diffs, and rollback functionality for agent configurations
 */

import { diffLines, diffWords, Change } from 'diff';

// ============================================
// Types
// ============================================

export interface VersionAuthor {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface VersionChange {
  field: string;
  type: 'added' | 'removed' | 'modified';
  oldValue?: string;
  newValue?: string;
}

export interface Version {
  id: string;
  agentId: string;
  version: number;
  timestamp: string;
  author: VersionAuthor;
  message: string;
  yamlContent: string;
  changes: VersionChange[];
  tags?: string[];
  isDeployed?: boolean;
  parentVersionId?: string | null;
}

export interface DiffLine {
  type: 'added' | 'removed' | 'unchanged' | 'header';
  content: string;
  lineNumberOld?: number;
  lineNumberNew?: number;
}

export interface DiffResult {
  lines: DiffLine[];
  additions: number;
  deletions: number;
  unchanged: number;
}

export interface FieldDiff {
  path: string;
  type: 'added' | 'removed' | 'modified';
  oldValue: unknown;
  newValue: unknown;
}

export interface ComparisonResult {
  lineDiff: DiffResult;
  fieldDiffs: FieldDiff[];
  summary: {
    added: number;
    removed: number;
    modified: number;
  };
}

// ============================================
// Storage Keys
// ============================================

const STORAGE_KEY_PREFIX = 'agentos_version_history_';
const CURRENT_VERSION_KEY_PREFIX = 'agentos_current_version_';

function getStorageKey(agentId: string): string {
  return `${STORAGE_KEY_PREFIX}${agentId}`;
}

function getCurrentVersionKey(agentId: string): string {
  return `${CURRENT_VERSION_KEY_PREFIX}${agentId}`;
}

// ============================================
// Version CRUD Operations
// ============================================

/**
 * Get all versions for an agent
 */
export function getVersionHistory(agentId: string): Version[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(getStorageKey(agentId));
    if (!stored) return [];

    const versions = JSON.parse(stored) as Version[];
    return versions.sort((a, b) => b.version - a.version);
  } catch (error) {
    console.error('Failed to get version history:', error);
    return [];
  }
}

/**
 * Get a specific version by ID
 */
export function getVersion(agentId: string, versionId: string): Version | null {
  const versions = getVersionHistory(agentId);
  return versions.find(v => v.id === versionId) || null;
}

/**
 * Get the latest version for an agent
 */
export function getLatestVersion(agentId: string): Version | null {
  const versions = getVersionHistory(agentId);
  return versions[0] || null;
}

/**
 * Get the currently deployed version
 */
export function getCurrentVersion(agentId: string): Version | null {
  if (typeof window === 'undefined') return null;

  try {
    const currentId = localStorage.getItem(getCurrentVersionKey(agentId));
    if (!currentId) {
      const latest = getLatestVersion(agentId);
      return latest;
    }
    return getVersion(agentId, currentId);
  } catch {
    return null;
  }
}

/**
 * Save a new version
 */
export function saveVersion(
  agentId: string,
  yamlContent: string,
  author: VersionAuthor,
  message: string,
  tags?: string[]
): Version {
  const versions = getVersionHistory(agentId);
  const latestVersion = versions[0];

  const changes = latestVersion
    ? computeVersionChanges(latestVersion.yamlContent, yamlContent)
    : [{ field: 'initial', type: 'added' as const, newValue: 'Initial version' }];

  const newVersion: Version = {
    id: generateVersionId(),
    agentId,
    version: (latestVersion?.version || 0) + 1,
    timestamp: new Date().toISOString(),
    author,
    message,
    yamlContent,
    changes,
    tags,
    isDeployed: false,
    parentVersionId: latestVersion?.id || null,
  };

  versions.unshift(newVersion);

  try {
    localStorage.setItem(getStorageKey(agentId), JSON.stringify(versions));
  } catch (error) {
    console.error('Failed to save version:', error);
    throw new Error('Failed to save version to storage');
  }

  return newVersion;
}

/**
 * Update version tags
 */
export function updateVersionTags(
  agentId: string,
  versionId: string,
  tags: string[]
): Version | null {
  const versions = getVersionHistory(agentId);
  const versionIndex = versions.findIndex(v => v.id === versionId);

  if (versionIndex === -1) return null;

  versions[versionIndex] = {
    ...versions[versionIndex],
    tags,
  };

  localStorage.setItem(getStorageKey(agentId), JSON.stringify(versions));
  return versions[versionIndex];
}

/**
 * Mark a version as deployed
 */
export function setDeployedVersion(agentId: string, versionId: string): void {
  const versions = getVersionHistory(agentId);

  const updatedVersions = versions.map(v => ({
    ...v,
    isDeployed: v.id === versionId,
  }));

  localStorage.setItem(getStorageKey(agentId), JSON.stringify(updatedVersions));
  localStorage.setItem(getCurrentVersionKey(agentId), versionId);
}

/**
 * Rollback to a specific version
 */
export function rollbackToVersion(
  agentId: string,
  versionId: string,
  author: VersionAuthor
): Version {
  const targetVersion = getVersion(agentId, versionId);

  if (!targetVersion) {
    throw new Error(`Version ${versionId} not found`);
  }

  const newVersion = saveVersion(
    agentId,
    targetVersion.yamlContent,
    author,
    `Rollback to version ${targetVersion.version}`,
    ['rollback']
  );

  setDeployedVersion(agentId, newVersion.id);

  return newVersion;
}

/**
 * Delete all versions for an agent (use with caution)
 */
export function clearVersionHistory(agentId: string): void {
  localStorage.removeItem(getStorageKey(agentId));
  localStorage.removeItem(getCurrentVersionKey(agentId));
}

// ============================================
// Diff Computation
// ============================================

/**
 * Compute line-by-line diff between two YAML contents
 */
export function computeLineDiff(oldContent: string, newContent: string): DiffResult {
  const changes = diffLines(oldContent, newContent);
  const lines: DiffLine[] = [];
  let additions = 0;
  let deletions = 0;
  let unchanged = 0;
  let lineNumberOld = 1;
  let lineNumberNew = 1;

  for (const change of changes) {
    const contentLines = change.value.split('\n').filter((line, idx, arr) => {
      // Keep empty strings except the last one (from trailing newline)
      return idx < arr.length - 1 || line !== '';
    });

    for (const content of contentLines) {
      if (change.added) {
        lines.push({
          type: 'added',
          content,
          lineNumberNew: lineNumberNew++,
        });
        additions++;
      } else if (change.removed) {
        lines.push({
          type: 'removed',
          content,
          lineNumberOld: lineNumberOld++,
        });
        deletions++;
      } else {
        lines.push({
          type: 'unchanged',
          content,
          lineNumberOld: lineNumberOld++,
          lineNumberNew: lineNumberNew++,
        });
        unchanged++;
      }
    }
  }

  return { lines, additions, deletions, unchanged };
}

/**
 * Compute word-level diff for a single line
 */
export function computeWordDiff(oldLine: string, newLine: string): Change[] {
  return diffWords(oldLine, newLine);
}

/**
 * Parse YAML to extract fields (simplified parser)
 */
function parseYamlFields(yaml: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const lines = yaml.split('\n');
  let currentPath: string[] = [];
  let currentIndent = 0;

  for (const line of lines) {
    if (!line.trim() || line.trim().startsWith('#')) continue;

    const indent = line.search(/\S/);
    const match = line.match(/^(\s*)([^:]+):\s*(.*)$/);

    if (!match) continue;

    const [, spaces, key, value] = match;
    const newIndent = spaces?.length || 0;

    while (currentPath.length > 0 && newIndent <= currentIndent) {
      currentPath.pop();
      currentIndent -= 2;
    }

    if (key) {
      const path = [...currentPath, key.trim()].join('.');
      result[path] = value?.trim() || '';

      if (!value?.trim()) {
        currentPath.push(key.trim());
        currentIndent = newIndent;
      }
    }
  }

  return result;
}

/**
 * Compute field-level diffs between two YAML contents
 */
export function computeFieldDiffs(oldContent: string, newContent: string): FieldDiff[] {
  const oldFields = parseYamlFields(oldContent);
  const newFields = parseYamlFields(newContent);
  const diffs: FieldDiff[] = [];

  const allKeys = new Set([...Object.keys(oldFields), ...Object.keys(newFields)]);

  for (const key of allKeys) {
    const oldValue = oldFields[key];
    const newValue = newFields[key];

    if (oldValue === undefined && newValue !== undefined) {
      diffs.push({ path: key, type: 'added', oldValue: undefined, newValue });
    } else if (oldValue !== undefined && newValue === undefined) {
      diffs.push({ path: key, type: 'removed', oldValue, newValue: undefined });
    } else if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      diffs.push({ path: key, type: 'modified', oldValue, newValue });
    }
  }

  return diffs;
}

/**
 * Compare two versions
 */
export function compareVersions(
  oldContent: string,
  newContent: string
): ComparisonResult {
  const lineDiff = computeLineDiff(oldContent, newContent);
  const fieldDiffs = computeFieldDiffs(oldContent, newContent);

  const summary = {
    added: fieldDiffs.filter(d => d.type === 'added').length,
    removed: fieldDiffs.filter(d => d.type === 'removed').length,
    modified: fieldDiffs.filter(d => d.type === 'modified').length,
  };

  return { lineDiff, fieldDiffs, summary };
}

/**
 * Compute version changes summary
 */
function computeVersionChanges(oldContent: string, newContent: string): VersionChange[] {
  const fieldDiffs = computeFieldDiffs(oldContent, newContent);

  return fieldDiffs.map(diff => ({
    field: diff.path,
    type: diff.type,
    oldValue: diff.oldValue !== undefined ? String(diff.oldValue) : undefined,
    newValue: diff.newValue !== undefined ? String(diff.newValue) : undefined,
  }));
}

// ============================================
// Utilities
// ============================================

/**
 * Generate a unique version ID
 */
function generateVersionId(): string {
  return `v_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Format version number for display
 */
export function formatVersionNumber(version: number): string {
  return `v${version.toString().padStart(3, '0')}`;
}

/**
 * Get versions between two version numbers
 */
export function getVersionRange(
  agentId: string,
  fromVersion: number,
  toVersion: number
): Version[] {
  const versions = getVersionHistory(agentId);
  return versions.filter(v => v.version >= fromVersion && v.version <= toVersion);
}

/**
 * Search versions by message or author
 */
export function searchVersions(agentId: string, query: string): Version[] {
  const versions = getVersionHistory(agentId);
  const lowerQuery = query.toLowerCase();

  return versions.filter(v =>
    v.message.toLowerCase().includes(lowerQuery) ||
    v.author.name.toLowerCase().includes(lowerQuery) ||
    v.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Get versions with a specific tag
 */
export function getVersionsByTag(agentId: string, tag: string): Version[] {
  const versions = getVersionHistory(agentId);
  return versions.filter(v => v.tags?.includes(tag));
}

/**
 * Filter versions by date range
 */
export interface DateRangeFilter {
  startDate?: Date | null;
  endDate?: Date | null;
}

export function filterVersionsByDateRange(
  versions: Version[],
  dateRange: DateRangeFilter
): Version[] {
  const { startDate, endDate } = dateRange;

  return versions.filter(version => {
    const versionDate = new Date(version.timestamp);

    if (startDate && versionDate < startDate) {
      return false;
    }

    if (endDate) {
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      if (versionDate > endOfDay) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Get versions within the last N days
 */
export function getVersionsWithinDays(agentId: string, days: number): Version[] {
  const versions = getVersionHistory(agentId);
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  return versions.filter(v => new Date(v.timestamp) >= cutoffDate);
}

/**
 * Get version statistics for an agent
 */
export interface VersionStats {
  totalVersions: number;
  versionsToday: number;
  versionsThisWeek: number;
  versionsThisMonth: number;
  mostActiveAuthor: { name: string; count: number } | null;
  averageChangesPerVersion: number;
}

export function getVersionStats(agentId: string): VersionStats {
  const versions = getVersionHistory(agentId);

  if (versions.length === 0) {
    return {
      totalVersions: 0,
      versionsToday: 0,
      versionsThisWeek: 0,
      versionsThisMonth: 0,
      mostActiveAuthor: null,
      averageChangesPerVersion: 0,
    };
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const versionsToday = versions.filter(v => new Date(v.timestamp) >= todayStart).length;
  const versionsThisWeek = versions.filter(v => new Date(v.timestamp) >= weekAgo).length;
  const versionsThisMonth = versions.filter(v => new Date(v.timestamp) >= monthAgo).length;

  // Calculate most active author
  const authorCounts: Record<string, { name: string; count: number }> = {};
  for (const version of versions) {
    const authorId = version.author.id;
    if (!authorCounts[authorId]) {
      authorCounts[authorId] = { name: version.author.name, count: 0 };
    }
    authorCounts[authorId].count++;
  }

  const mostActiveAuthor = Object.values(authorCounts).reduce(
    (max, author) => (author.count > (max?.count ?? 0) ? author : max),
    null as { name: string; count: number } | null
  );

  // Calculate average changes per version
  const totalChanges = versions.reduce((sum, v) => sum + (v.changes?.length ?? 0), 0);
  const averageChangesPerVersion = totalChanges / versions.length;

  return {
    totalVersions: versions.length,
    versionsToday,
    versionsThisWeek,
    versionsThisMonth,
    mostActiveAuthor,
    averageChangesPerVersion: Math.round(averageChangesPerVersion * 10) / 10,
  };
}

/**
 * Get preset date ranges for filtering
 */
export type DateRangePreset = 'today' | 'yesterday' | 'last7days' | 'last30days' | 'thisMonth' | 'lastMonth' | 'all';

export function getDateRangeFromPreset(preset: DateRangePreset): DateRangeFilter {
  const now = new Date();

  switch (preset) {
    case 'today': {
      const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return { startDate, endDate: now };
    }
    case 'yesterday': {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const startDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
      const endDate = new Date(startDate);
      endDate.setHours(23, 59, 59, 999);
      return { startDate, endDate };
    }
    case 'last7days': {
      const startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 7);
      return { startDate, endDate: now };
    }
    case 'last30days': {
      const startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 30);
      return { startDate, endDate: now };
    }
    case 'thisMonth': {
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      return { startDate, endDate: now };
    }
    case 'lastMonth': {
      const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endDate = new Date(now.getFullYear(), now.getMonth(), 0);
      endDate.setHours(23, 59, 59, 999);
      return { startDate, endDate };
    }
    case 'all':
    default:
      return { startDate: null, endDate: null };
  }
}

/**
 * Get preset label for display
 */
export function getDateRangePresetLabel(preset: DateRangePreset): string {
  const labels: Record<DateRangePreset, string> = {
    today: 'Today',
    yesterday: 'Yesterday',
    last7days: 'Last 7 days',
    last30days: 'Last 30 days',
    thisMonth: 'This month',
    lastMonth: 'Last month',
    all: 'All time',
  };
  return labels[preset];
}

/**
 * Initialize demo data for testing
 */
export function initializeDemoVersionHistory(agentId: string): void {
  const existingVersions = getVersionHistory(agentId);
  if (existingVersions.length > 0) return;

  const demoAuthor: VersionAuthor = {
    id: 'demo-user',
    name: 'Demo User',
    email: 'demo@example.com',
  };

  const demoVersions: Omit<Version, 'id'>[] = [
    {
      agentId,
      version: 1,
      timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      author: demoAuthor,
      message: 'Initial agent configuration',
      yamlContent: `name: demo-agent
description: A demo agent for testing
model: gpt-4
temperature: 0.7
maxTokens: 2000
systemPrompt: |
  You are a helpful assistant.
tools:
  - name: search
    enabled: true`,
      changes: [{ field: 'initial', type: 'added', newValue: 'Initial version' }],
      tags: ['initial'],
      isDeployed: false,
      parentVersionId: null,
    },
    {
      agentId,
      version: 2,
      timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      author: { ...demoAuthor, name: 'Jane Smith', id: 'jane' },
      message: 'Updated system prompt for better responses',
      yamlContent: `name: demo-agent
description: A demo agent for testing
model: gpt-4
temperature: 0.7
maxTokens: 2000
systemPrompt: |
  You are a helpful and knowledgeable assistant.
  Always provide accurate and concise answers.
tools:
  - name: search
    enabled: true`,
      changes: [{ field: 'systemPrompt', type: 'modified', oldValue: 'You are...', newValue: 'You are a helpful...' }],
      tags: ['prompt-update'],
      isDeployed: false,
      parentVersionId: null,
    },
    {
      agentId,
      version: 3,
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      author: demoAuthor,
      message: 'Added new tool and increased token limit',
      yamlContent: `name: demo-agent
description: A demo agent for testing with enhanced capabilities
model: gpt-4
temperature: 0.7
maxTokens: 4000
systemPrompt: |
  You are a helpful and knowledgeable assistant.
  Always provide accurate and concise answers.
tools:
  - name: search
    enabled: true
  - name: calculator
    enabled: true`,
      changes: [
        { field: 'maxTokens', type: 'modified', oldValue: '2000', newValue: '4000' },
        { field: 'tools', type: 'modified', oldValue: '1 tool', newValue: '2 tools' },
      ],
      tags: ['feature'],
      isDeployed: true,
      parentVersionId: null,
    },
  ];

  const versionsWithIds = demoVersions.map(v => ({
    ...v,
    id: generateVersionId(),
  }));

  localStorage.setItem(getStorageKey(agentId), JSON.stringify(versionsWithIds.reverse()));

  const latestVersion = versionsWithIds.find(v => v.isDeployed);
  if (latestVersion) {
    localStorage.setItem(getCurrentVersionKey(agentId), latestVersion.id);
  }
}

export default {
  getVersionHistory,
  getVersion,
  getLatestVersion,
  getCurrentVersion,
  saveVersion,
  updateVersionTags,
  setDeployedVersion,
  rollbackToVersion,
  clearVersionHistory,
  computeLineDiff,
  computeWordDiff,
  computeFieldDiffs,
  compareVersions,
  formatVersionNumber,
  getVersionRange,
  searchVersions,
  getVersionsByTag,
  filterVersionsByDateRange,
  getVersionsWithinDays,
  getVersionStats,
  getDateRangeFromPreset,
  getDateRangePresetLabel,
  initializeDemoVersionHistory,
};
