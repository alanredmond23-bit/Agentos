/**
 * AgentOS Studio - Individual Version API Routes
 * GET /api/studio/versions/:id - Get version details
 * PUT /api/studio/versions/:id - Update version (publish/tag)
 * DELETE /api/studio/versions/:id - Delete version
 */

import { NextRequest, NextResponse } from 'next/server';
import type {
  Version,
  SemanticVersion,
  StudioApiResponse,
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
  ];

  mockVersions.forEach(v => versions.set(v.id, v));
  initialized = true;
}

// ============================================
// GET Handler - Get Version Details
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<StudioApiResponse<Version>>> {
  initializeMockData();

  try {
    const { id } = await params;

    const version = versions.get(id);
    if (!version) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: {
            code: 'VERSION_NOT_FOUND',
            message: `Version with ID "${id}" not found`,
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: version,
      meta: {
        request_id: generateId(),
      },
    });
  } catch (error) {
    console.error('[API] Error getting version:', error);
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get version',
          details: { error: error instanceof Error ? error.message : 'Unknown error' },
        },
      },
      { status: 500 }
    );
  }
}

// ============================================
// PUT Handler - Update Version
// ============================================

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<StudioApiResponse<Version>>> {
  initializeMockData();

  try {
    const { id } = await params;
    const body = await request.json();

    const version = versions.get(id);
    if (!version) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: {
            code: 'VERSION_NOT_FOUND',
            message: `Version with ID "${id}" not found`,
          },
        },
        { status: 404 }
      );
    }

    const { action, tags, notes } = body as {
      action?: 'publish' | 'unpublish' | 'add_tag' | 'remove_tag';
      tags?: string[];
      notes?: string;
    };

    let updatedVersion = { ...version };

    switch (action) {
      case 'publish':
        updatedVersion = {
          ...updatedVersion,
          is_published: true,
        };
        break;

      case 'unpublish':
        updatedVersion = {
          ...updatedVersion,
          is_published: false,
        };
        break;

      case 'add_tag':
        if (tags && tags.length > 0) {
          const currentTags = updatedVersion.metadata.tags || [];
          updatedVersion = {
            ...updatedVersion,
            metadata: {
              ...updatedVersion.metadata,
              tags: [...new Set([...currentTags, ...tags])],
            },
          };
        }
        break;

      case 'remove_tag':
        if (tags && tags.length > 0) {
          const currentTags = updatedVersion.metadata.tags || [];
          updatedVersion = {
            ...updatedVersion,
            metadata: {
              ...updatedVersion.metadata,
              tags: currentTags.filter(t => !tags.includes(t)),
            },
          };
        }
        break;

      default:
        // General update
        if (notes !== undefined) {
          updatedVersion = {
            ...updatedVersion,
            metadata: {
              ...updatedVersion.metadata,
              notes,
            },
          };
        }
        if (tags !== undefined) {
          updatedVersion = {
            ...updatedVersion,
            metadata: {
              ...updatedVersion.metadata,
              tags,
            },
          };
        }
    }

    versions.set(id, updatedVersion);

    return NextResponse.json({
      success: true,
      data: updatedVersion,
      meta: {
        request_id: generateId(),
      },
    });
  } catch (error) {
    console.error('[API] Error updating version:', error);
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update version',
          details: { error: error instanceof Error ? error.message : 'Unknown error' },
        },
      },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE Handler - Delete Version
// ============================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<StudioApiResponse<void>>> {
  initializeMockData();

  try {
    const { id } = await params;

    const version = versions.get(id);
    if (!version) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: {
            code: 'VERSION_NOT_FOUND',
            message: `Version with ID "${id}" not found`,
          },
        },
        { status: 404 }
      );
    }

    // Prevent deleting published versions
    if (version.is_published) {
      const { searchParams } = new URL(request.url);
      const force = searchParams.get('force') === 'true';

      if (!force) {
        return NextResponse.json(
          {
            success: false,
            data: null,
            error: {
              code: 'CANNOT_DELETE_PUBLISHED',
              message: 'Cannot delete a published version. Use ?force=true to override.',
            },
          },
          { status: 409 }
        );
      }
    }

    // If this was the latest, find and mark the previous version as latest
    if (version.is_latest) {
      const entityVersions = Array.from(versions.values())
        .filter(
          v =>
            v.entity_type === version.entity_type &&
            v.entity_id === version.entity_id &&
            v.id !== id
        )
        .sort((a, b) => compareVersions(b.semantic_version, a.semantic_version));

      if (entityVersions.length > 0) {
        const newLatest = { ...entityVersions[0], is_latest: true };
        versions.set(newLatest.id, newLatest);
      }
    }

    versions.delete(id);

    return NextResponse.json({
      success: true,
      data: undefined,
      meta: {
        request_id: generateId(),
      },
    });
  } catch (error) {
    console.error('[API] Error deleting version:', error);
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete version',
          details: { error: error instanceof Error ? error.message : 'Unknown error' },
        },
      },
      { status: 500 }
    );
  }
}

// ============================================
// PATCH Handler - Rollback to Version
// ============================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<StudioApiResponse<Version>>> {
  initializeMockData();

  try {
    const { id } = await params;
    const body = await request.json();
    const { action } = body as { action: 'rollback' };

    if (action !== 'rollback') {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: {
            code: 'INVALID_ACTION',
            message: 'Only rollback action is supported',
          },
        },
        { status: 400 }
      );
    }

    const version = versions.get(id);
    if (!version) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: {
            code: 'VERSION_NOT_FOUND',
            message: `Version with ID "${id}" not found`,
          },
        },
        { status: 404 }
      );
    }

    // Find current latest
    const currentLatest = Array.from(versions.values()).find(
      v =>
        v.entity_type === version.entity_type &&
        v.entity_id === version.entity_id &&
        v.is_latest
    );

    // Create new version based on rollback target
    const now = new Date().toISOString();
    const newVersionId = generateId();

    // Increment version number
    const latestVersions = Array.from(versions.values())
      .filter(v => v.entity_type === version.entity_type && v.entity_id === version.entity_id)
      .sort((a, b) => compareVersions(b.semantic_version, a.semantic_version));

    const highestVersion = latestVersions[0]?.semantic_version || { major: 0, minor: 0, patch: 0 };
    const newSemVer = {
      major: highestVersion.major,
      minor: highestVersion.minor,
      patch: highestVersion.patch + 1,
    };

    const newVersion: Version = {
      id: newVersionId,
      entity_type: version.entity_type,
      entity_id: version.entity_id,
      version: `${newSemVer.major}.${newSemVer.minor}.${newSemVer.patch}`,
      semantic_version: newSemVer,
      content: version.content,
      content_hash: version.content_hash,
      change_type: 'patch',
      change_summary: `Rollback to version ${version.version}`,
      is_published: false,
      is_latest: true,
      created_at: now,
      created_by: 'user',
      metadata: {
        parent_version_id: currentLatest?.id,
        tags: ['rollback'],
        notes: `Rolled back from version ${currentLatest?.version || 'unknown'} to ${version.version}`,
      },
    };

    // Update current latest to not be latest
    if (currentLatest) {
      const updatedOldLatest = { ...currentLatest, is_latest: false };
      versions.set(currentLatest.id, updatedOldLatest);
    }

    versions.set(newVersionId, newVersion);

    return NextResponse.json({
      success: true,
      data: newVersion,
      meta: {
        request_id: generateId(),
      },
    });
  } catch (error) {
    console.error('[API] Error rolling back version:', error);
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to rollback version',
          details: { error: error instanceof Error ? error.message : 'Unknown error' },
        },
      },
      { status: 500 }
    );
  }
}
