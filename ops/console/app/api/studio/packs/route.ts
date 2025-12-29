/**
 * AgentOS Studio - Packs API Routes
 * GET /api/studio/packs - List all packs
 * POST /api/studio/packs - Create a new pack or install from registry
 */

import { NextRequest, NextResponse } from 'next/server';
import type {
  Pack,
  PackSummary,
  CreatePackInput,
  PackCategory,
  PackStatus,
  StudioApiResponse,
  PaginationOptions,
  FilterOptions,
  StudioApiMeta,
  UUID,
} from '@/types/studio';

// ============================================
// In-Memory Storage (Replace with DB in production)
// ============================================

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
        repository: 'https://github.com/agentos/devops-pack',
        documentation_url: 'https://docs.agentos.dev/packs/devops',
        tags: ['infrastructure', 'automation', 'deployment', 'ci-cd'],
        dependencies: [],
        environment_variables: [
          { key: 'AWS_REGION', description: 'AWS Region', required: true, sensitive: false },
          { key: 'DOCKER_REGISTRY', description: 'Docker Registry URL', required: true, sensitive: false },
        ],
      },
      permissions: {
        can_create_agents: true,
        can_delete_agents: true,
        can_publish: true,
        allowed_tools: ['shell', 'api', 'file'],
        max_agents: 50,
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
        tags: ['code', 'review', 'testing', 'development'],
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
    {
      id: 'pack-marketing-001',
      slug: 'marketing',
      name: 'Marketing Pack',
      description: 'Content creation, social media, and campaign management agents',
      icon: 'Megaphone',
      color: '#f59e0b',
      version: '1.2.0',
      category: 'marketing',
      status: 'active',
      agents: [],
      metadata: {
        author: 'AgentOS Team',
        license: 'MIT',
        tags: ['content', 'social', 'campaigns', 'marketing'],
        dependencies: [],
        environment_variables: [],
      },
      permissions: {
        can_create_agents: true,
        can_delete_agents: true,
        can_publish: true,
        allowed_tools: ['api', 'function'],
        max_agents: 25,
        max_executions_per_day: 5000,
      },
      created_at: now,
      updated_at: now,
      created_by: 'system',
    },
    {
      id: 'pack-analytics-001',
      slug: 'analytics',
      name: 'Analytics Pack',
      description: 'Data analysis, reporting, and insights generation agents',
      icon: 'BarChart',
      color: '#8b5cf6',
      version: '1.0.0',
      category: 'analytics',
      status: 'active',
      agents: [],
      metadata: {
        author: 'AgentOS Team',
        license: 'MIT',
        tags: ['data', 'analysis', 'reporting', 'insights'],
        dependencies: [],
        environment_variables: [],
      },
      permissions: {
        can_create_agents: true,
        can_delete_agents: true,
        can_publish: true,
        allowed_tools: ['database', 'api', 'function'],
        max_agents: 30,
        max_executions_per_day: 20000,
      },
      created_at: now,
      updated_at: now,
      created_by: 'system',
    },
    {
      id: 'pack-legal-001',
      slug: 'legal',
      name: 'Legal Pack',
      description: 'Contract review, compliance, and legal document agents',
      icon: 'Scale',
      color: '#ef4444',
      version: '1.0.0',
      category: 'legal',
      status: 'active',
      agents: [],
      metadata: {
        author: 'AgentOS Team',
        license: 'MIT',
        tags: ['contracts', 'compliance', 'legal', 'documents'],
        dependencies: [],
        environment_variables: [],
      },
      permissions: {
        can_create_agents: true,
        can_delete_agents: true,
        can_publish: false,
        allowed_tools: ['file', 'function'],
        max_agents: 10,
        max_executions_per_day: 1000,
      },
      created_at: now,
      updated_at: now,
      created_by: 'system',
    },
  ];

  mockPacks.forEach(pack => packs.set(pack.id, pack));
  initialized = true;
}

// ============================================
// Utility Functions
// ============================================

function generateId(): UUID {
  return crypto.randomUUID();
}

function packToSummary(pack: Pack): PackSummary {
  return {
    id: pack.id,
    slug: pack.slug,
    name: pack.name,
    description: pack.description,
    icon: pack.icon,
    color: pack.color,
    version: pack.version,
    category: pack.category,
    status: pack.status,
    agent_count: pack.agents.length,
    updated_at: pack.updated_at,
  };
}

function validatePackInput(input: Partial<CreatePackInput>): string[] {
  const errors: string[] = [];

  if (!input.name || input.name.trim().length === 0) {
    errors.push('Name is required');
  } else if (input.name.length > 100) {
    errors.push('Name must be 100 characters or less');
  }

  if (!input.slug || input.slug.trim().length === 0) {
    errors.push('Slug is required');
  } else if (!/^[a-z][a-z0-9-]*$/.test(input.slug)) {
    errors.push('Slug must be lowercase alphanumeric with hyphens, starting with a letter');
  } else if (input.slug.length > 50) {
    errors.push('Slug must be 50 characters or less');
  }

  if (!input.description || input.description.trim().length === 0) {
    errors.push('Description is required');
  } else if (input.description.length > 500) {
    errors.push('Description must be 500 characters or less');
  }

  if (!input.category) {
    errors.push('Category is required');
  }

  return errors;
}

// ============================================
// GET Handler - List Packs
// ============================================

export async function GET(request: NextRequest): Promise<NextResponse<StudioApiResponse<PackSummary[]>>> {
  initializeMockData();

  try {
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1', 10);
    const perPage = Math.min(parseInt(searchParams.get('per_page') || '20', 10), 100);
    const search = searchParams.get('search') || '';
    const categories = searchParams.get('category')?.split(',').filter(Boolean) || [];
    const statuses = searchParams.get('status')?.split(',').filter(Boolean) || [];
    const tags = searchParams.get('tags')?.split(',').filter(Boolean) || [];
    const sortBy = searchParams.get('sort_by') || 'updated_at';
    const sortOrder = (searchParams.get('sort_order') || 'desc') as 'asc' | 'desc';

    let packsArray = Array.from(packs.values());

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      packsArray = packsArray.filter(
        pack =>
          pack.name.toLowerCase().includes(searchLower) ||
          pack.description.toLowerCase().includes(searchLower) ||
          pack.slug.toLowerCase().includes(searchLower)
      );
    }

    // Apply category filter
    if (categories.length > 0) {
      packsArray = packsArray.filter(pack => categories.includes(pack.category));
    }

    // Apply status filter
    if (statuses.length > 0) {
      packsArray = packsArray.filter(pack => statuses.includes(pack.status));
    }

    // Apply tags filter
    if (tags.length > 0) {
      packsArray = packsArray.filter(pack =>
        tags.some(tag => pack.metadata.tags.includes(tag))
      );
    }

    // Apply sorting
    packsArray.sort((a, b) => {
      const aVal = (a as Record<string, unknown>)[sortBy];
      const bVal = (b as Record<string, unknown>)[sortBy];

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortOrder === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      return 0;
    });

    // Calculate pagination
    const total = packsArray.length;
    const totalPages = Math.ceil(total / perPage);
    const startIndex = (page - 1) * perPage;
    const paginatedPacks = packsArray.slice(startIndex, startIndex + perPage);

    // Convert to summaries
    const summaries = paginatedPacks.map(packToSummary);

    return NextResponse.json({
      success: true,
      data: summaries,
      meta: {
        page,
        per_page: perPage,
        total,
        total_pages: totalPages,
        request_id: generateId(),
      },
    });
  } catch (error) {
    console.error('[API] Error listing packs:', error);
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to list packs',
          details: { error: error instanceof Error ? error.message : 'Unknown error' },
        },
      },
      { status: 500 }
    );
  }
}

// ============================================
// POST Handler - Create Pack
// ============================================

export async function POST(request: NextRequest): Promise<NextResponse<StudioApiResponse<Pack>>> {
  initializeMockData();

  try {
    const body = await request.json();
    const input = body as CreatePackInput;

    // Validate input
    const errors = validatePackInput(input);
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

    // Check for duplicate slug
    const existingPack = Array.from(packs.values()).find(p => p.slug === input.slug);
    if (existingPack) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: {
            code: 'SLUG_EXISTS',
            message: `A pack with slug "${input.slug}" already exists`,
          },
        },
        { status: 409 }
      );
    }

    const now = new Date().toISOString();
    const packId = generateId();

    const newPack: Pack = {
      id: packId,
      slug: input.slug,
      name: input.name,
      description: input.description,
      icon: input.icon || 'Package',
      color: input.color || '#6366f1',
      version: '1.0.0',
      category: input.category,
      status: 'draft',
      agents: [],
      metadata: {
        author: 'Studio User',
        license: 'MIT',
        tags: [],
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
      created_by: 'user', // Would come from auth in production
    };

    packs.set(packId, newPack);

    return NextResponse.json(
      {
        success: true,
        data: newPack,
        meta: {
          request_id: generateId(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[API] Error creating pack:', error);
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create pack',
          details: { error: error instanceof Error ? error.message : 'Unknown error' },
        },
      },
      { status: 500 }
    );
  }
}
