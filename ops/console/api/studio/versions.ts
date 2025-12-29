/**
 * AgentOS Studio - Version API Client
 * Version management, comparison, and history tracking
 */

import type {
  Version,
  VersionedEntityType,
  SemanticVersion,
  ChangeType,
  VersionMetadata,
  VersionComparison,
  DiffLine,
  CreateVersionInput,
  StudioApiResponse,
  PaginationOptions,
  UUID,
  Timestamp,
} from '@/types/studio';
import { studioStorage } from '@/lib/studio/storage';

// ============================================
// Version Utilities
// ============================================

function parseSemanticVersion(version: string): SemanticVersion {
  const match = version.match(
    /^(\d+)\.(\d+)\.(\d+)(?:-([a-zA-Z0-9.-]+))?(?:\+([a-zA-Z0-9.-]+))?$/
  );

  if (!match) {
    return { major: 0, minor: 0, patch: 0 };
  }

  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    prerelease: match[4],
    build: match[5],
  };
}

function formatSemanticVersion(sv: SemanticVersion): string {
  let version = `${sv.major}.${sv.minor}.${sv.patch}`;
  if (sv.prerelease) version += `-${sv.prerelease}`;
  if (sv.build) version += `+${sv.build}`;
  return version;
}

function incrementVersion(
  current: SemanticVersion,
  changeType: ChangeType
): SemanticVersion {
  switch (changeType) {
    case 'major':
      return { major: current.major + 1, minor: 0, patch: 0 };
    case 'minor':
      return { major: current.major, minor: current.minor + 1, patch: 0 };
    case 'patch':
    case 'draft':
    default:
      return { major: current.major, minor: current.minor, patch: current.patch + 1 };
  }
}

function compareVersions(a: SemanticVersion, b: SemanticVersion): number {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  return a.patch - b.patch;
}

function generateContentHash(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

function computeDiff(fromContent: string, toContent: string): {
  additions: DiffLine[];
  deletions: DiffLine[];
  modifications: DiffLine[];
} {
  const fromLines = fromContent.split('\n');
  const toLines = toContent.split('\n');
  const additions: DiffLine[] = [];
  const deletions: DiffLine[] = [];
  const modifications: DiffLine[] = [];

  // Simple line-by-line diff
  const maxLines = Math.max(fromLines.length, toLines.length);

  for (let i = 0; i < maxLines; i++) {
    const fromLine = fromLines[i];
    const toLine = toLines[i];

    if (fromLine === undefined && toLine !== undefined) {
      additions.push({
        line_number: i + 1,
        content: toLine,
        type: 'add',
      });
    } else if (fromLine !== undefined && toLine === undefined) {
      deletions.push({
        line_number: i + 1,
        content: fromLine,
        type: 'remove',
      });
    } else if (fromLine !== toLine) {
      modifications.push({
        line_number: i + 1,
        content: `- ${fromLine}\n+ ${toLine}`,
        type: 'modify',
      });
    }
  }

  return { additions, deletions, modifications };
}

// ============================================
// Mock Data Generator
// ============================================

const generateMockVersion = (overrides: Partial<Version> = {}): Version => {
  const id = overrides.id || crypto.randomUUID();
  const now = new Date().toISOString();

  return {
    id,
    entity_type: overrides.entity_type || 'agent',
    entity_id: overrides.entity_id || crypto.randomUUID(),
    version: overrides.version || '1.0.0',
    semantic_version: overrides.semantic_version || parseSemanticVersion(overrides.version || '1.0.0'),
    content_hash: overrides.content_hash || generateContentHash(overrides.content || ''),
    content: overrides.content || '',
    change_type: overrides.change_type || 'patch',
    change_summary: overrides.change_summary || 'Initial version',
    is_published: overrides.is_published ?? false,
    is_latest: overrides.is_latest ?? true,
    created_at: overrides.created_at || now,
    created_by: overrides.created_by || 'system',
    metadata: overrides.metadata || {
      tags: [],
    },
  };
};

// ============================================
// API Client Class
// ============================================

class VersionsApi {
  private versions: Map<UUID, Version>;
  private storageKey = 'studio_versions';

  constructor() {
    this.versions = new Map();
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const stored = studioStorage.get<Version[]>(this.storageKey);
      if (stored && stored.length > 0) {
        stored.forEach((version) => this.versions.set(version.id, version));
      }
    } catch {
      // Start with empty versions
    }
  }

  private saveToStorage(): void {
    studioStorage.set(this.storageKey, Array.from(this.versions.values()));
  }

  private simulateDelay(ms: number = 100): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ============================================
  // CRUD Operations
  // ============================================

  async list(
    entityType: VersionedEntityType,
    entityId: UUID,
    options?: PaginationOptions
  ): Promise<StudioApiResponse<Version[]>> {
    await this.simulateDelay();

    let versions = Array.from(this.versions.values()).filter(
      (v) => v.entity_type === entityType && v.entity_id === entityId
    );

    // Sort by version descending
    versions.sort((a, b) => compareVersions(b.semantic_version, a.semantic_version));

    // Apply pagination
    const page = options?.page || 1;
    const perPage = options?.per_page || 20;
    const total = versions.length;
    const startIndex = (page - 1) * perPage;
    const paginatedVersions = versions.slice(startIndex, startIndex + perPage);

    return {
      success: true,
      data: paginatedVersions,
      meta: {
        page,
        per_page: perPage,
        total,
        total_pages: Math.ceil(total / perPage),
      },
    };
  }

  async get(id: UUID): Promise<StudioApiResponse<Version>> {
    await this.simulateDelay();

    const version = this.versions.get(id);
    if (!version) {
      return {
        success: false,
        data: null,
        error: {
          code: 'VERSION_NOT_FOUND',
          message: `Version with ID ${id} not found`,
        },
      };
    }

    return { success: true, data: version };
  }

  async getLatest(
    entityType: VersionedEntityType,
    entityId: UUID
  ): Promise<StudioApiResponse<Version | null>> {
    await this.simulateDelay();

    const versions = Array.from(this.versions.values()).filter(
      (v) => v.entity_type === entityType && v.entity_id === entityId && v.is_latest
    );

    if (versions.length === 0) {
      return { success: true, data: null };
    }

    return { success: true, data: versions[0] };
  }

  async getByVersion(
    entityType: VersionedEntityType,
    entityId: UUID,
    version: string
  ): Promise<StudioApiResponse<Version | null>> {
    await this.simulateDelay();

    const found = Array.from(this.versions.values()).find(
      (v) =>
        v.entity_type === entityType &&
        v.entity_id === entityId &&
        v.version === version
    );

    if (!found) {
      return { success: true, data: null };
    }

    return { success: true, data: found };
  }

  async create(input: CreateVersionInput): Promise<StudioApiResponse<Version>> {
    await this.simulateDelay();

    // Get current latest version
    const latestResult = await this.getLatest(input.entity_type, input.entity_id);
    const latestVersion = latestResult.data;

    // Calculate new version number
    let newVersionNumber: string;
    if (latestVersion) {
      const newSemVer = incrementVersion(
        latestVersion.semantic_version,
        input.change_type
      );
      newVersionNumber = formatSemanticVersion(newSemVer);

      // Mark old latest as not latest
      const updatedOldLatest: Version = {
        ...latestVersion,
        is_latest: false,
      };
      this.versions.set(latestVersion.id, updatedOldLatest);
    } else {
      newVersionNumber = input.version || '1.0.0';
    }

    const version = generateMockVersion({
      entity_type: input.entity_type,
      entity_id: input.entity_id,
      version: newVersionNumber,
      semantic_version: parseSemanticVersion(newVersionNumber),
      content: input.content,
      content_hash: generateContentHash(input.content),
      change_type: input.change_type,
      change_summary: input.change_summary,
      is_latest: true,
      is_published: false,
      metadata: {
        parent_version_id: latestVersion?.id,
        tags: [],
      },
    });

    this.versions.set(version.id, version);
    this.saveToStorage();

    return { success: true, data: version };
  }

  async publish(id: UUID): Promise<StudioApiResponse<Version>> {
    await this.simulateDelay();

    const version = this.versions.get(id);
    if (!version) {
      return {
        success: false,
        data: null,
        error: {
          code: 'VERSION_NOT_FOUND',
          message: `Version with ID ${id} not found`,
        },
      };
    }

    const updatedVersion: Version = {
      ...version,
      is_published: true,
    };

    this.versions.set(id, updatedVersion);
    this.saveToStorage();

    return { success: true, data: updatedVersion };
  }

  async delete(id: UUID): Promise<StudioApiResponse<void>> {
    await this.simulateDelay();

    const version = this.versions.get(id);
    if (!version) {
      return {
        success: false,
        data: null,
        error: {
          code: 'VERSION_NOT_FOUND',
          message: `Version with ID ${id} not found`,
        },
      };
    }

    if (version.is_published) {
      return {
        success: false,
        data: null,
        error: {
          code: 'CANNOT_DELETE_PUBLISHED',
          message: 'Cannot delete a published version',
        },
      };
    }

    // If this was latest, mark parent as latest
    if (version.is_latest && version.metadata.parent_version_id) {
      const parentVersion = this.versions.get(version.metadata.parent_version_id);
      if (parentVersion) {
        const updatedParent: Version = {
          ...parentVersion,
          is_latest: true,
        };
        this.versions.set(parentVersion.id, updatedParent);
      }
    }

    this.versions.delete(id);
    this.saveToStorage();

    return { success: true, data: undefined };
  }

  // ============================================
  // Comparison Operations
  // ============================================

  async compare(
    fromVersionId: UUID,
    toVersionId: UUID
  ): Promise<StudioApiResponse<VersionComparison>> {
    await this.simulateDelay();

    const fromVersion = this.versions.get(fromVersionId);
    const toVersion = this.versions.get(toVersionId);

    if (!fromVersion) {
      return {
        success: false,
        data: null,
        error: {
          code: 'VERSION_NOT_FOUND',
          message: `From version with ID ${fromVersionId} not found`,
        },
      };
    }

    if (!toVersion) {
      return {
        success: false,
        data: null,
        error: {
          code: 'VERSION_NOT_FOUND',
          message: `To version with ID ${toVersionId} not found`,
        },
      };
    }

    const diff = computeDiff(fromVersion.content, toVersion.content);

    const comparison: VersionComparison = {
      from_version: fromVersion,
      to_version: toVersion,
      additions: diff.additions,
      deletions: diff.deletions,
      modifications: diff.modifications,
      summary: `${diff.additions.length} additions, ${diff.deletions.length} deletions, ${diff.modifications.length} modifications`,
    };

    return { success: true, data: comparison };
  }

  async getHistory(
    entityType: VersionedEntityType,
    entityId: UUID
  ): Promise<StudioApiResponse<Version[]>> {
    await this.simulateDelay();

    const versions = Array.from(this.versions.values())
      .filter((v) => v.entity_type === entityType && v.entity_id === entityId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return { success: true, data: versions };
  }

  // ============================================
  // Tag Operations
  // ============================================

  async addTag(id: UUID, tag: string): Promise<StudioApiResponse<Version>> {
    await this.simulateDelay();

    const version = this.versions.get(id);
    if (!version) {
      return {
        success: false,
        data: null,
        error: {
          code: 'VERSION_NOT_FOUND',
          message: `Version with ID ${id} not found`,
        },
      };
    }

    const updatedVersion: Version = {
      ...version,
      metadata: {
        ...version.metadata,
        tags: [...new Set([...version.metadata.tags, tag])],
      },
    };

    this.versions.set(id, updatedVersion);
    this.saveToStorage();

    return { success: true, data: updatedVersion };
  }

  async removeTag(id: UUID, tag: string): Promise<StudioApiResponse<Version>> {
    await this.simulateDelay();

    const version = this.versions.get(id);
    if (!version) {
      return {
        success: false,
        data: null,
        error: {
          code: 'VERSION_NOT_FOUND',
          message: `Version with ID ${id} not found`,
        },
      };
    }

    const updatedVersion: Version = {
      ...version,
      metadata: {
        ...version.metadata,
        tags: version.metadata.tags.filter((t) => t !== tag),
      },
    };

    this.versions.set(id, updatedVersion);
    this.saveToStorage();

    return { success: true, data: updatedVersion };
  }

  // ============================================
  // Utility Functions
  // ============================================

  parseVersion(version: string): SemanticVersion {
    return parseSemanticVersion(version);
  }

  formatVersion(semver: SemanticVersion): string {
    return formatSemanticVersion(semver);
  }

  nextVersion(current: string, changeType: ChangeType): string {
    const semver = parseSemanticVersion(current);
    const next = incrementVersion(semver, changeType);
    return formatSemanticVersion(next);
  }

  async reset(): Promise<void> {
    this.versions.clear();
    this.saveToStorage();
  }
}

// Export singleton instance
export const versionsApi = new VersionsApi();
export type { VersionsApi };
