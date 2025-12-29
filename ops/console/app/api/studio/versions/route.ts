/**
 * AgentOS Studio - Versions API Routes
 * GET /api/studio/versions - Get version history
 * POST /api/studio/versions - Create a new version
 */

import { NextRequest, NextResponse } from 'next/server';
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
} from '@/types/studio';

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
// In-Memory Storage
// ============================================

const versions = new Map<UUID, Version>();
let initialized = false;

function generateId(): UUID {
  return crypto.randomUUID();
}

function initializeMockData(): void {
  if (initialized) return;

  const now = new Date().toISOString();
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const mockVersions: Version[] = [
    {
      id: 'version-001',
      entity_type: 'agent',
      entity_id: 'agent-code-reviewer-001',
      version: '2.1.0',
      semantic_version: { major: 2, minor: 1, patch: 0 },
      content_hash: generateContentHash('content-v2.1.0'),
      content: `name: Code Reviewer
slug: code-reviewer
version: 2.1.0
description: Updated code review agent`,
      change_type: 'minor',
      change_summary: 'Updated model temperature and added new capabilities',
      is_published: true,
      is_latest: true,
      created_at: now,
      created_by: 'user-001',
      metadata: {
        tags: ['stable', 'production'],
      },
    },
    {
      id: 'version-002',
      entity_type: 'agent',
      entity_id: 'agent-code-reviewer-001',
      version: '2.0.0',
      semantic_version: { major: 2, minor: 0, patch: 0 },
      content_hash: generateContentHash('content-v2.0.0'),
      content: `name: Code Reviewer
slug: code-reviewer
version: 2.0.0
description: Major refactor of code review agent`,
      change_type: 'major',
      change_summary: 'Major version with breaking changes to API',
      is_published: true,
      is_latest: false,
      created_at: yesterday,
      created_by: 'user-001',
      metadata: {
        parent_version_id: 'version-003',
        tags: ['stable'],
        breaking_changes: ['Changed output format', 'Renamed capabilities'],
      },
    },
    {
      id: 'version-003',
      entity_type: 'agent',
      entity_id: 'agent-code-reviewer-001',
      version: '1.0.0',
      semantic_version: { major: 1, minor: 0, patch: 0 },
      content_hash: generateContentHash('content-v1.0.0'),
      content: `name: Code Reviewer
slug: code-reviewer
version: 1.0.0
description: Initial code review agent`,
      change_type: 'major',
      change_summary: 'Initial release',
      is_published: true,
      is_latest: false,
      created_at: lastWeek,
      created_by: 'system',
      metadata: {
        tags: ['legacy'],
      },
    },
  ];

  mockVersions.forEach(v => versions.set(v.id, v));
  initialized = true;
}

// ============================================
// GET Handler - List Versions
// ============================================

export async function GET(request: NextRequest): Promise<NextResponse<StudioApiResponse<Version[] | VersionComparison>>> {
  initializeMockData();

  try {
    const { searchParams } = new URL(request.url);

    // Check for comparison request
    const fromId = searchParams.get('from');
    const toId = searchParams.get('to');

    if (fromId && toId) {
      // Compare two versions
      const fromVersion = versions.get(fromId);
      const toVersion = versions.get(toId);

      if (!fromVersion) {
        return NextResponse.json(
          {
            success: false,
            data: null,
            error: {
              code: 'VERSION_NOT_FOUND',
              message: `From version not found: ${fromId}`,
            },
          },
          { status: 404 }
        );
      }

      if (!toVersion) {
        return NextResponse.json(
          {
            success: false,
            data: null,
            error: {
              code: 'VERSION_NOT_FOUND',
              message: `To version not found: ${toId}`,
            },
          },
          { status: 404 }
        );
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

      return NextResponse.json({
        success: true,
        data: comparison,
        meta: {
          request_id: generateId(),
        },
      });
    }

    // List versions
    const entityType = searchParams.get('entity_type') as VersionedEntityType | null;
    const entityId = searchParams.get('entity_id');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const perPage = Math.min(parseInt(searchParams.get('per_page') || '20', 10), 100);
    const publishedOnly = searchParams.get('published_only') === 'true';

    if (!entityType || !entityId) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'entity_type and entity_id are required',
          },
        },
        { status: 400 }
      );
    }

    let versionList = Array.from(versions.values()).filter(
      v => v.entity_type === entityType && v.entity_id === entityId
    );

    if (publishedOnly) {
      versionList = versionList.filter(v => v.is_published);
    }

    // Sort by version descending
    versionList.sort((a, b) => compareVersions(b.semantic_version, a.semantic_version));

    // Pagination
    const total = versionList.length;
    const totalPages = Math.ceil(total / perPage);
    const startIndex = (page - 1) * perPage;
    const paginatedVersions = versionList.slice(startIndex, startIndex + perPage);

    return NextResponse.json({
      success: true,
      data: paginatedVersions,
      meta: {
        page,
        per_page: perPage,
        total,
        total_pages: totalPages,
        request_id: generateId(),
      },
    });
  } catch (error) {
    console.error('[API] Error listing versions:', error);
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to list versions',
          details: { error: error instanceof Error ? error.message : 'Unknown error' },
        },
      },
      { status: 500 }
    );
  }
}

// ============================================
// POST Handler - Create Version
// ============================================

export async function POST(request: NextRequest): Promise<NextResponse<StudioApiResponse<Version>>> {
  initializeMockData();

  try {
    const body = await request.json();
    const input = body as CreateVersionInput;

    // Validate input
    const errors: string[] = [];

    if (!input.entity_type) {
      errors.push('entity_type is required');
    } else if (!['agent', 'pack', 'template'].includes(input.entity_type)) {
      errors.push('entity_type must be agent, pack, or template');
    }

    if (!input.entity_id) {
      errors.push('entity_id is required');
    }

    if (!input.change_type) {
      errors.push('change_type is required');
    } else if (!['major', 'minor', 'patch', 'draft'].includes(input.change_type)) {
      errors.push('change_type must be major, minor, patch, or draft');
    }

    if (!input.change_summary || input.change_summary.trim().length === 0) {
      errors.push('change_summary is required');
    }

    if (!input.content || input.content.trim().length === 0) {
      errors.push('content is required');
    }

    if (errors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid version data',
            details: { errors },
          },
        },
        { status: 400 }
      );
    }

    // Get current latest version
    const existingVersions = Array.from(versions.values())
      .filter(v => v.entity_type === input.entity_type && v.entity_id === input.entity_id)
      .sort((a, b) => compareVersions(b.semantic_version, a.semantic_version));

    const latestVersion = existingVersions[0];

    // Calculate new version number
    let newVersionNumber: string;
    let newSemVer: SemanticVersion;

    if (latestVersion) {
      newSemVer = incrementVersion(latestVersion.semantic_version, input.change_type);
      newVersionNumber = formatSemanticVersion(newSemVer);

      // Mark old latest as not latest
      const updatedOldLatest: Version = {
        ...latestVersion,
        is_latest: false,
      };
      versions.set(latestVersion.id, updatedOldLatest);
    } else {
      newVersionNumber = input.version || '1.0.0';
      newSemVer = parseSemanticVersion(newVersionNumber);
    }

    const now = new Date().toISOString();
    const versionId = generateId();

    const newVersion: Version = {
      id: versionId,
      entity_type: input.entity_type,
      entity_id: input.entity_id,
      version: newVersionNumber,
      semantic_version: newSemVer,
      content: input.content,
      content_hash: generateContentHash(input.content),
      change_type: input.change_type,
      change_summary: input.change_summary,
      is_published: false,
      is_latest: true,
      created_at: now,
      created_by: 'user', // Would come from auth
      metadata: {
        parent_version_id: latestVersion?.id,
        tags: [],
      },
    };

    versions.set(versionId, newVersion);

    return NextResponse.json(
      {
        success: true,
        data: newVersion,
        meta: {
          request_id: generateId(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[API] Error creating version:', error);
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create version',
          details: { error: error instanceof Error ? error.message : 'Unknown error' },
        },
      },
      { status: 500 }
    );
  }
}
