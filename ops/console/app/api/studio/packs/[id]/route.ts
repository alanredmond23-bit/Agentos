/**
 * AgentOS Studio - Individual Pack API Routes
 * GET /api/studio/packs/:id - Get pack details
 * PUT /api/studio/packs/:id - Update pack
 * DELETE /api/studio/packs/:id - Delete pack
 */

import { NextRequest, NextResponse } from 'next/server';
import type {
  Pack,
  UpdatePackInput,
  StudioApiResponse,
  UUID,
} from '@/types/studio';

// ============================================
// In-Memory Storage (Shared with parent route)
// ============================================

// Note: In production, this would be replaced with database calls
const packs = new Map<UUID, Pack>();
let initialized = false;

function initializeMockData(): void {
  if (initialized) return;

  const now = new Date().toISOString();

  const mockPacks: Pack[] = [
    {
      id: 'pack-devops-001',
      slug: 'devops',
      name: 'DevOps Pack',
      description: 'Infrastructure automation, CI/CD, and deployment agents',
      icon: 'Server',
      color: '#10b981',
      version: '2.1.0',
      category: 'devops',
      status: 'active',
      agents: [],
      metadata: {
        author: 'AgentOS Team',
        license: 'MIT',
        tags: ['infrastructure', 'automation', 'deployment'],
        dependencies: [],
        environment_variables: [],
      },
      permissions: {
        can_create_agents: true,
        can_delete_agents: true,
        can_publish: true,
        allowed_tools: ['*'],
        max_agents: 100,
        max_executions_per_day: 10000,
      },
      created_at: now,
      updated_at: now,
      created_by: 'system',
    },
    {
      id: 'pack-engineering-001',
      slug: 'engineering',
      name: 'Engineering Pack',
      description: 'Code review, testing, and development assistance agents',
      icon: 'Code',
      color: '#6366f1',
      version: '1.5.0',
      category: 'engineering',
      status: 'active',
      agents: [],
      metadata: {
        author: 'AgentOS Team',
        license: 'MIT',
        tags: ['code', 'review', 'testing'],
        dependencies: [],
        environment_variables: [],
      },
      permissions: {
        can_create_agents: true,
        can_delete_agents: true,
        can_publish: true,
        allowed_tools: ['*'],
        max_agents: 100,
        max_executions_per_day: 50000,
      },
      created_at: now,
      updated_at: now,
      created_by: 'system',
    },
  ];

  mockPacks.forEach(pack => packs.set(pack.id, pack));
  initialized = true;
}

function generateId(): UUID {
  return crypto.randomUUID();
}

// ============================================
// GET Handler - Get Pack Details
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<StudioApiResponse<Pack>>> {
  initializeMockData();

  try {
    const { id } = await params;

    // Try to find by ID first
    let pack = packs.get(id);

    // If not found by ID, try by slug
    if (!pack) {
      pack = Array.from(packs.values()).find(p => p.slug === id);
    }

    if (!pack) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: {
            code: 'PACK_NOT_FOUND',
            message: `Pack with ID or slug "${id}" not found`,
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: pack,
      meta: {
        request_id: generateId(),
      },
    });
  } catch (error) {
    console.error('[API] Error getting pack:', error);
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get pack',
          details: { error: error instanceof Error ? error.message : 'Unknown error' },
        },
      },
      { status: 500 }
    );
  }
}

// ============================================
// PUT Handler - Update Pack
// ============================================

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<StudioApiResponse<Pack>>> {
  initializeMockData();

  try {
    const { id } = await params;
    const body = await request.json();
    const input = body as UpdatePackInput;

    const pack = packs.get(id);
    if (!pack) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: {
            code: 'PACK_NOT_FOUND',
            message: `Pack with ID "${id}" not found`,
          },
        },
        { status: 404 }
      );
    }

    // Validate input
    const errors: string[] = [];

    if (input.name !== undefined) {
      if (input.name.trim().length === 0) {
        errors.push('Name cannot be empty');
      } else if (input.name.length > 100) {
        errors.push('Name must be 100 characters or less');
      }
    }

    if (input.description !== undefined && input.description.length > 500) {
      errors.push('Description must be 500 characters or less');
    }

    if (errors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid pack data',
            details: { errors },
          },
        },
        { status: 400 }
      );
    }

    const updatedPack: Pack = {
      ...pack,
      name: input.name ?? pack.name,
      description: input.description ?? pack.description,
      icon: input.icon ?? pack.icon,
      color: input.color ?? pack.color,
      status: input.status ?? pack.status,
      metadata: input.metadata
        ? { ...pack.metadata, ...input.metadata }
        : pack.metadata,
      updated_at: new Date().toISOString(),
    };

    packs.set(id, updatedPack);

    return NextResponse.json({
      success: true,
      data: updatedPack,
      meta: {
        request_id: generateId(),
      },
    });
  } catch (error) {
    console.error('[API] Error updating pack:', error);
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update pack',
          details: { error: error instanceof Error ? error.message : 'Unknown error' },
        },
      },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE Handler - Delete Pack
// ============================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<StudioApiResponse<void>>> {
  initializeMockData();

  try {
    const { id } = await params;

    const pack = packs.get(id);
    if (!pack) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: {
            code: 'PACK_NOT_FOUND',
            message: `Pack with ID "${id}" not found`,
          },
        },
        { status: 404 }
      );
    }

    // Check if pack has agents
    if (pack.agents.length > 0) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: {
            code: 'PACK_HAS_AGENTS',
            message: 'Cannot delete pack with existing agents. Remove all agents first.',
          },
        },
        { status: 409 }
      );
    }

    packs.delete(id);

    return NextResponse.json({
      success: true,
      data: undefined,
      meta: {
        request_id: generateId(),
      },
    });
  } catch (error) {
    console.error('[API] Error deleting pack:', error);
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete pack',
          details: { error: error instanceof Error ? error.message : 'Unknown error' },
        },
      },
      { status: 500 }
    );
  }
}
