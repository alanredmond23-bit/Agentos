/**
 * AgentOS Studio - Pack API Client
 * CRUD operations and management for agent packs
 */

import type {
  Pack,
  PackSummary,
  PackCategory,
  PackStatus,
  CreatePackInput,
  UpdatePackInput,
  StudioApiResponse,
  PaginationOptions,
  FilterOptions,
  StudioApiMeta,
  StudioAgent,
  UUID,
  Timestamp,
} from '@/types/studio';
import { studioStorage } from '@/lib/studio/storage';

// ============================================
// Mock Data
// ============================================

const generateMockPack = (overrides: Partial<Pack> = {}): Pack => {
  const id = overrides.id || crypto.randomUUID();
  const now = new Date().toISOString();

  return {
    id,
    slug: overrides.slug || `pack-${id.slice(0, 8)}`,
    name: overrides.name || 'Untitled Pack',
    description: overrides.description || 'A new agent pack',
    icon: overrides.icon || 'Package',
    color: overrides.color || '#6366f1',
    version: overrides.version || '1.0.0',
    category: overrides.category || 'custom',
    status: overrides.status || 'draft',
    agents: overrides.agents || [],
    metadata: overrides.metadata || {
      author: 'System',
      license: 'MIT',
      tags: [],
      dependencies: [],
      environment_variables: [],
    },
    permissions: overrides.permissions || {
      can_create_agents: true,
      can_delete_agents: true,
      can_publish: true,
      allowed_tools: ['*'],
      max_agents: 100,
      max_executions_per_day: 10000,
    },
    created_at: overrides.created_at || now,
    updated_at: overrides.updated_at || now,
    created_by: overrides.created_by || 'system',
    ...overrides,
  };
};

const MOCK_PACKS: Pack[] = [
  generateMockPack({
    id: 'pack-devops-001',
    slug: 'devops',
    name: 'DevOps Pack',
    description: 'Infrastructure automation, CI/CD, and deployment agents',
    icon: 'Server',
    color: '#10b981',
    category: 'devops',
    status: 'active',
    metadata: {
      author: 'AgentOS Team',
      license: 'MIT',
      tags: ['infrastructure', 'automation', 'deployment'],
      dependencies: [],
      environment_variables: [
        { key: 'AWS_REGION', description: 'AWS Region', required: true, sensitive: false },
        { key: 'DOCKER_REGISTRY', description: 'Docker Registry URL', required: true, sensitive: false },
      ],
    },
  }),
  generateMockPack({
    id: 'pack-engineering-001',
    slug: 'engineering',
    name: 'Engineering Pack',
    description: 'Code review, testing, and development assistance agents',
    icon: 'Code',
    color: '#6366f1',
    category: 'engineering',
    status: 'active',
    metadata: {
      author: 'AgentOS Team',
      license: 'MIT',
      tags: ['code', 'review', 'testing', 'development'],
      dependencies: [],
      environment_variables: [],
    },
  }),
  generateMockPack({
    id: 'pack-marketing-001',
    slug: 'marketing',
    name: 'Marketing Pack',
    description: 'Content creation, social media, and campaign management agents',
    icon: 'Megaphone',
    color: '#f59e0b',
    category: 'marketing',
    status: 'active',
    metadata: {
      author: 'AgentOS Team',
      license: 'MIT',
      tags: ['content', 'social', 'campaigns'],
      dependencies: [],
      environment_variables: [],
    },
  }),
  generateMockPack({
    id: 'pack-analytics-001',
    slug: 'analytics',
    name: 'Analytics Pack',
    description: 'Data analysis, reporting, and insights generation agents',
    icon: 'BarChart',
    color: '#8b5cf6',
    category: 'analytics',
    status: 'active',
    metadata: {
      author: 'AgentOS Team',
      license: 'MIT',
      tags: ['data', 'analysis', 'reporting'],
      dependencies: [],
      environment_variables: [],
    },
  }),
  generateMockPack({
    id: 'pack-legal-001',
    slug: 'legal',
    name: 'Legal Pack',
    description: 'Contract review, compliance, and legal document agents',
    icon: 'Scale',
    color: '#ef4444',
    category: 'legal',
    status: 'active',
    metadata: {
      author: 'AgentOS Team',
      license: 'MIT',
      tags: ['contracts', 'compliance', 'legal'],
      dependencies: [],
      environment_variables: [],
    },
  }),
];

// ============================================
// API Client Class
// ============================================

class PacksApi {
  private packs: Map<UUID, Pack>;
  private storageKey = 'studio_packs';

  constructor() {
    this.packs = new Map();
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const stored = studioStorage.get<Pack[]>(this.storageKey);
      if (stored && stored.length > 0) {
        stored.forEach((pack) => this.packs.set(pack.id, pack));
      } else {
        // Initialize with mock data
        MOCK_PACKS.forEach((pack) => this.packs.set(pack.id, pack));
        this.saveToStorage();
      }
    } catch {
      MOCK_PACKS.forEach((pack) => this.packs.set(pack.id, pack));
    }
  }

  private saveToStorage(): void {
    studioStorage.set(this.storageKey, Array.from(this.packs.values()));
  }

  private simulateDelay(ms: number = 100): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ============================================
  // CRUD Operations
  // ============================================

  async list(
    options?: PaginationOptions & FilterOptions
  ): Promise<StudioApiResponse<PackSummary[]>> {
    await this.simulateDelay();

    let packs = Array.from(this.packs.values());

    // Apply filters
    if (options?.search) {
      const search = options.search.toLowerCase();
      packs = packs.filter(
        (p) =>
          p.name.toLowerCase().includes(search) ||
          p.description.toLowerCase().includes(search) ||
          p.slug.toLowerCase().includes(search)
      );
    }

    if (options?.category && options.category.length > 0) {
      packs = packs.filter((p) =>
        options.category!.includes(p.category)
      );
    }

    if (options?.status && options.status.length > 0) {
      packs = packs.filter((p) =>
        options.status!.includes(p.status)
      );
    }

    if (options?.tags && options.tags.length > 0) {
      packs = packs.filter((p) =>
        options.tags!.some((tag) => p.metadata.tags.includes(tag))
      );
    }

    // Apply sorting
    const sortBy = options?.sort_by || 'updated_at';
    const sortOrder = options?.sort_order || 'desc';
    packs.sort((a, b) => {
      const aVal = (a as Record<string, unknown>)[sortBy];
      const bVal = (b as Record<string, unknown>)[sortBy];
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortOrder === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      return 0;
    });

    // Apply pagination
    const page = options?.page || 1;
    const perPage = options?.per_page || 20;
    const total = packs.length;
    const startIndex = (page - 1) * perPage;
    const paginatedPacks = packs.slice(startIndex, startIndex + perPage);

    // Map to summaries
    const summaries: PackSummary[] = paginatedPacks.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      description: p.description,
      icon: p.icon,
      color: p.color,
      version: p.version,
      category: p.category,
      status: p.status,
      agent_count: p.agents.length,
      updated_at: p.updated_at,
    }));

    return {
      success: true,
      data: summaries,
      meta: {
        page,
        per_page: perPage,
        total,
        total_pages: Math.ceil(total / perPage),
      },
    };
  }

  async get(id: UUID): Promise<StudioApiResponse<Pack>> {
    await this.simulateDelay();

    const pack = this.packs.get(id);
    if (!pack) {
      return {
        success: false,
        data: null,
        error: {
          code: 'PACK_NOT_FOUND',
          message: `Pack with ID ${id} not found`,
        },
      };
    }

    return { success: true, data: pack };
  }

  async getBySlug(slug: string): Promise<StudioApiResponse<Pack>> {
    await this.simulateDelay();

    const pack = Array.from(this.packs.values()).find((p) => p.slug === slug);
    if (!pack) {
      return {
        success: false,
        data: null,
        error: {
          code: 'PACK_NOT_FOUND',
          message: `Pack with slug ${slug} not found`,
        },
      };
    }

    return { success: true, data: pack };
  }

  async create(input: CreatePackInput): Promise<StudioApiResponse<Pack>> {
    await this.simulateDelay();

    // Validate slug uniqueness
    const existingSlug = Array.from(this.packs.values()).find(
      (p) => p.slug === input.slug
    );
    if (existingSlug) {
      return {
        success: false,
        data: null,
        error: {
          code: 'SLUG_EXISTS',
          message: `A pack with slug "${input.slug}" already exists`,
        },
      };
    }

    const pack = generateMockPack({
      name: input.name,
      slug: input.slug,
      description: input.description,
      icon: input.icon,
      color: input.color,
      category: input.category,
      status: 'draft',
    });

    this.packs.set(pack.id, pack);
    this.saveToStorage();

    return { success: true, data: pack };
  }

  async update(
    id: UUID,
    input: UpdatePackInput
  ): Promise<StudioApiResponse<Pack>> {
    await this.simulateDelay();

    const pack = this.packs.get(id);
    if (!pack) {
      return {
        success: false,
        data: null,
        error: {
          code: 'PACK_NOT_FOUND',
          message: `Pack with ID ${id} not found`,
        },
      };
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

    this.packs.set(id, updatedPack);
    this.saveToStorage();

    return { success: true, data: updatedPack };
  }

  async delete(id: UUID): Promise<StudioApiResponse<void>> {
    await this.simulateDelay();

    const pack = this.packs.get(id);
    if (!pack) {
      return {
        success: false,
        data: null,
        error: {
          code: 'PACK_NOT_FOUND',
          message: `Pack with ID ${id} not found`,
        },
      };
    }

    // Check if pack has agents
    if (pack.agents.length > 0) {
      return {
        success: false,
        data: null,
        error: {
          code: 'PACK_HAS_AGENTS',
          message: 'Cannot delete pack with existing agents. Remove all agents first.',
        },
      };
    }

    this.packs.delete(id);
    this.saveToStorage();

    return { success: true, data: undefined };
  }

  // ============================================
  // Additional Operations
  // ============================================

  async duplicate(id: UUID, newSlug: string): Promise<StudioApiResponse<Pack>> {
    await this.simulateDelay();

    const pack = this.packs.get(id);
    if (!pack) {
      return {
        success: false,
        data: null,
        error: {
          code: 'PACK_NOT_FOUND',
          message: `Pack with ID ${id} not found`,
        },
      };
    }

    const duplicatedPack = generateMockPack({
      ...pack,
      id: crypto.randomUUID(),
      slug: newSlug,
      name: `${pack.name} (Copy)`,
      status: 'draft',
      agents: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    this.packs.set(duplicatedPack.id, duplicatedPack);
    this.saveToStorage();

    return { success: true, data: duplicatedPack };
  }

  async publish(id: UUID): Promise<StudioApiResponse<Pack>> {
    return this.update(id, { status: 'active' });
  }

  async archive(id: UUID): Promise<StudioApiResponse<Pack>> {
    return this.update(id, { status: 'archived' });
  }

  async getCategories(): Promise<StudioApiResponse<PackCategory[]>> {
    await this.simulateDelay(50);

    const categories: PackCategory[] = [
      'devops',
      'qa',
      'legal',
      'mobile',
      'research',
      'planning',
      'analytics',
      'orchestration',
      'error_predictor',
      'product',
      'marketing',
      'supabase',
      'design',
      'engineering',
      'finance',
      'hr',
      'custom',
    ];

    return { success: true, data: categories };
  }

  async getStats(): Promise<
    StudioApiResponse<{
      total: number;
      by_status: Record<PackStatus, number>;
      by_category: Record<PackCategory, number>;
    }>
  > {
    await this.simulateDelay(50);

    const packs = Array.from(this.packs.values());
    const byStatus: Record<string, number> = {};
    const byCategory: Record<string, number> = {};

    packs.forEach((pack) => {
      byStatus[pack.status] = (byStatus[pack.status] || 0) + 1;
      byCategory[pack.category] = (byCategory[pack.category] || 0) + 1;
    });

    return {
      success: true,
      data: {
        total: packs.length,
        by_status: byStatus as Record<PackStatus, number>,
        by_category: byCategory as Record<PackCategory, number>,
      },
    };
  }

  // ============================================
  // Agent Association
  // ============================================

  async addAgent(packId: UUID, agent: StudioAgent): Promise<StudioApiResponse<Pack>> {
    await this.simulateDelay();

    const pack = this.packs.get(packId);
    if (!pack) {
      return {
        success: false,
        data: null,
        error: {
          code: 'PACK_NOT_FOUND',
          message: `Pack with ID ${packId} not found`,
        },
      };
    }

    const updatedPack: Pack = {
      ...pack,
      agents: [...pack.agents, agent],
      updated_at: new Date().toISOString(),
    };

    this.packs.set(packId, updatedPack);
    this.saveToStorage();

    return { success: true, data: updatedPack };
  }

  async removeAgent(packId: UUID, agentId: UUID): Promise<StudioApiResponse<Pack>> {
    await this.simulateDelay();

    const pack = this.packs.get(packId);
    if (!pack) {
      return {
        success: false,
        data: null,
        error: {
          code: 'PACK_NOT_FOUND',
          message: `Pack with ID ${packId} not found`,
        },
      };
    }

    const updatedPack: Pack = {
      ...pack,
      agents: pack.agents.filter((a) => a.id !== agentId),
      updated_at: new Date().toISOString(),
    };

    this.packs.set(packId, updatedPack);
    this.saveToStorage();

    return { success: true, data: updatedPack };
  }

  // Reset to mock data (for development)
  async reset(): Promise<void> {
    this.packs.clear();
    MOCK_PACKS.forEach((pack) => this.packs.set(pack.id, pack));
    this.saveToStorage();
  }
}

// Export singleton instance
export const packsApi = new PacksApi();
export type { PacksApi };
