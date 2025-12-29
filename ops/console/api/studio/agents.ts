/**
 * AgentOS Studio - Agent API Client
 * Complete CRUD operations for agent management
 */

import type {
  StudioAgent,
  AgentSummary,
  AgentStatus,
  AgentYAML,
  AgentVersion,
  CreateAgentInput,
  UpdateAgentInput,
  StudioApiResponse,
  PaginationOptions,
  FilterOptions,
  ValidationResult,
  UUID,
  Timestamp,
  DEFAULT_MODEL_CONFIG,
  DEFAULT_RATE_LIMIT,
  DEFAULT_APPROVAL_CONFIG,
  DEFAULT_ERROR_HANDLING,
} from '@/types/studio';
import { studioStorage } from '@/lib/studio/storage';
import { yamlParser } from '@/lib/studio/yamlParser';
import { schemaValidator } from '@/lib/studio/schemaValidator';
import { packsApi } from './packs';

// ============================================
// Default YAML Template
// ============================================

const DEFAULT_AGENT_YAML = `name: New Agent
slug: new-agent
description: A new agent created in Studio
version: 1.0.0

model:
  provider: anthropic
  name: claude-3-5-sonnet-20241022
  temperature: 0.7
  max_tokens: 4096

system_prompt: |
  You are a helpful AI assistant.
  Follow user instructions carefully and provide accurate responses.

tools: []

capabilities:
  - name: general_assistance
    description: Provide general assistance and answer questions
    enabled: true
    requires_approval: false
    risk_level: low
    allowed_actions:
      - respond
      - explain

triggers:
  - type: manual
    name: default
    enabled: true
    config: {}

outputs:
  - name: response
    type: text
    format: markdown

error_handling:
  on_error: retry
  max_retries: 3
  notify_on_failure: true
  log_level: info

rate_limiting:
  requests_per_minute: 60
  requests_per_hour: 1000
  requests_per_day: 10000
  tokens_per_minute: 100000
  tokens_per_day: 1000000
  concurrent_executions: 5

approval:
  enabled: true
  auto_approve_threshold: low
  require_approval_for:
    - high
    - critical
  timeout_minutes: 60
  escalation_path: []
  notify_channels: []

metadata:
  author: Studio User
  tags: []
`;

// ============================================
// Mock Data Generator
// ============================================

const generateMockAgent = (overrides: Partial<StudioAgent> = {}): StudioAgent => {
  const id = overrides.id || crypto.randomUUID();
  const now = new Date().toISOString();
  const yamlContent = overrides.yaml_content || DEFAULT_AGENT_YAML;

  return {
    id,
    pack_id: overrides.pack_id || '',
    slug: overrides.slug || `agent-${id.slice(0, 8)}`,
    name: overrides.name || 'New Agent',
    description: overrides.description || 'A new agent',
    yaml_content: yamlContent,
    parsed_config: overrides.parsed_config || null,
    status: overrides.status || 'draft',
    version: overrides.version || {
      id: crypto.randomUUID(),
      agent_id: id,
      version: '1.0.0',
      yaml_content: yamlContent,
      yaml_hash: '',
      change_summary: 'Initial version',
      is_published: false,
      created_at: now,
      created_by: 'system',
    },
    versions: overrides.versions || [],
    validation_errors: overrides.validation_errors || [],
    is_dirty: overrides.is_dirty ?? false,
    last_saved_at: overrides.last_saved_at || null,
    created_at: overrides.created_at || now,
    updated_at: overrides.updated_at || now,
    created_by: overrides.created_by || 'system',
  };
};

const MOCK_AGENTS: StudioAgent[] = [
  generateMockAgent({
    id: 'agent-code-reviewer-001',
    pack_id: 'pack-engineering-001',
    slug: 'code-reviewer',
    name: 'Code Reviewer',
    description: 'Automated code review agent for pull requests',
    status: 'published',
    yaml_content: `name: Code Reviewer
slug: code-reviewer
description: Automated code review agent for pull requests
version: 2.1.0

model:
  provider: anthropic
  name: claude-3-5-sonnet-20241022
  temperature: 0.3
  max_tokens: 8192

system_prompt: |
  You are an expert code reviewer. Analyze code changes for:
  - Code quality and best practices
  - Potential bugs and security issues
  - Performance concerns
  - Documentation completeness

tools:
  - name: github_pr
    type: mcp
    description: Access GitHub pull request data
    enabled: true
    requires_approval: false
    risk_level: low
    parameters: []

capabilities:
  - name: code_analysis
    description: Analyze code for issues
    enabled: true
    requires_approval: false
    risk_level: low
    allowed_actions:
      - read_code
      - analyze
      - suggest

triggers:
  - type: webhook
    name: github_pr_opened
    enabled: true
    config:
      event: pull_request.opened

outputs:
  - name: review
    type: text
    format: markdown

error_handling:
  on_error: retry
  max_retries: 3
  notify_on_failure: true
  log_level: info

rate_limiting:
  requests_per_minute: 30
  requests_per_hour: 500
  requests_per_day: 5000
  tokens_per_minute: 100000
  tokens_per_day: 1000000
  concurrent_executions: 3

approval:
  enabled: false
  auto_approve_threshold: low
  require_approval_for: []
  timeout_minutes: 60
  escalation_path: []
  notify_channels: []

metadata:
  author: Engineering Team
  tags:
    - code-review
    - github
    - automation
`,
  }),
  generateMockAgent({
    id: 'agent-deploy-001',
    pack_id: 'pack-devops-001',
    slug: 'deploy-agent',
    name: 'Deploy Agent',
    description: 'Automated deployment agent for production releases',
    status: 'published',
  }),
  generateMockAgent({
    id: 'agent-content-writer-001',
    pack_id: 'pack-marketing-001',
    slug: 'content-writer',
    name: 'Content Writer',
    description: 'AI-powered content generation for marketing materials',
    status: 'valid',
  }),
];

// ============================================
// API Client Class
// ============================================

class AgentsApi {
  private agents: Map<UUID, StudioAgent>;
  private storageKey = 'studio_agents';

  constructor() {
    this.agents = new Map();
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const stored = studioStorage.get<StudioAgent[]>(this.storageKey);
      if (stored && stored.length > 0) {
        stored.forEach((agent) => this.agents.set(agent.id, agent));
      } else {
        MOCK_AGENTS.forEach((agent) => this.agents.set(agent.id, agent));
        this.saveToStorage();
      }
    } catch {
      MOCK_AGENTS.forEach((agent) => this.agents.set(agent.id, agent));
    }
  }

  private saveToStorage(): void {
    studioStorage.set(this.storageKey, Array.from(this.agents.values()));
  }

  private simulateDelay(ms: number = 100): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private generateHash(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }

  // ============================================
  // CRUD Operations
  // ============================================

  async list(
    options?: PaginationOptions & FilterOptions & { pack_id?: UUID }
  ): Promise<StudioApiResponse<AgentSummary[]>> {
    await this.simulateDelay();

    let agents = Array.from(this.agents.values());

    // Filter by pack
    if (options?.pack_id) {
      agents = agents.filter((a) => a.pack_id === options.pack_id);
    }

    // Apply search filter
    if (options?.search) {
      const search = options.search.toLowerCase();
      agents = agents.filter(
        (a) =>
          a.name.toLowerCase().includes(search) ||
          a.description.toLowerCase().includes(search) ||
          a.slug.toLowerCase().includes(search)
      );
    }

    // Filter by status
    if (options?.status && options.status.length > 0) {
      agents = agents.filter((a) => options.status!.includes(a.status));
    }

    // Apply sorting
    const sortBy = options?.sort_by || 'updated_at';
    const sortOrder = options?.sort_order || 'desc';
    agents.sort((a, b) => {
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
    const total = agents.length;
    const startIndex = (page - 1) * perPage;
    const paginatedAgents = agents.slice(startIndex, startIndex + perPage);

    // Map to summaries
    const summaries: AgentSummary[] = paginatedAgents.map((a) => ({
      id: a.id,
      pack_id: a.pack_id,
      slug: a.slug,
      name: a.name,
      description: a.description,
      status: a.status,
      version: a.version.version,
      has_errors: a.validation_errors.length > 0,
      updated_at: a.updated_at,
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

  async get(id: UUID): Promise<StudioApiResponse<StudioAgent>> {
    await this.simulateDelay();

    const agent = this.agents.get(id);
    if (!agent) {
      return {
        success: false,
        data: null,
        error: {
          code: 'AGENT_NOT_FOUND',
          message: `Agent with ID ${id} not found`,
        },
      };
    }

    return { success: true, data: agent };
  }

  async getBySlug(
    packId: UUID,
    slug: string
  ): Promise<StudioApiResponse<StudioAgent>> {
    await this.simulateDelay();

    const agent = Array.from(this.agents.values()).find(
      (a) => a.pack_id === packId && a.slug === slug
    );

    if (!agent) {
      return {
        success: false,
        data: null,
        error: {
          code: 'AGENT_NOT_FOUND',
          message: `Agent with slug ${slug} not found in pack`,
        },
      };
    }

    return { success: true, data: agent };
  }

  async create(input: CreateAgentInput): Promise<StudioApiResponse<StudioAgent>> {
    await this.simulateDelay();

    // Validate pack exists
    const packResult = await packsApi.get(input.pack_id);
    if (!packResult.success) {
      return {
        success: false,
        data: null,
        error: {
          code: 'PACK_NOT_FOUND',
          message: `Pack with ID ${input.pack_id} not found`,
        },
      };
    }

    // Validate slug uniqueness within pack
    const existingSlug = Array.from(this.agents.values()).find(
      (a) => a.pack_id === input.pack_id && a.slug === input.slug
    );
    if (existingSlug) {
      return {
        success: false,
        data: null,
        error: {
          code: 'SLUG_EXISTS',
          message: `An agent with slug "${input.slug}" already exists in this pack`,
        },
      };
    }

    // Use template YAML if provided
    let yamlContent = input.yaml_content || DEFAULT_AGENT_YAML;

    // Replace placeholders in YAML
    yamlContent = yamlContent
      .replace(/name:\s*.+/m, `name: ${input.name}`)
      .replace(/slug:\s*.+/m, `slug: ${input.slug}`)
      .replace(/description:\s*.+/m, `description: ${input.description}`);

    // Parse and validate YAML
    const parseResult = yamlParser.parse<AgentYAML>(yamlContent);
    const validationResult = parseResult.success
      ? await schemaValidator.validateAgentYAML(parseResult.data!)
      : { is_valid: false, errors: [], warnings: [], info: [], validated_at: new Date().toISOString() };

    const agent = generateMockAgent({
      pack_id: input.pack_id,
      name: input.name,
      slug: input.slug,
      description: input.description,
      yaml_content: yamlContent,
      parsed_config: parseResult.data,
      status: validationResult.is_valid ? 'valid' : 'invalid',
      validation_errors: validationResult.errors,
    });

    this.agents.set(agent.id, agent);
    this.saveToStorage();

    // Add agent to pack
    await packsApi.addAgent(input.pack_id, agent);

    return { success: true, data: agent };
  }

  async update(
    id: UUID,
    input: UpdateAgentInput
  ): Promise<StudioApiResponse<StudioAgent>> {
    await this.simulateDelay();

    const agent = this.agents.get(id);
    if (!agent) {
      return {
        success: false,
        data: null,
        error: {
          code: 'AGENT_NOT_FOUND',
          message: `Agent with ID ${id} not found`,
        },
      };
    }

    let parsed_config = agent.parsed_config;
    let validation_errors = agent.validation_errors;
    let status = input.status ?? agent.status;

    // Re-parse and validate if YAML content changed
    if (input.yaml_content && input.yaml_content !== agent.yaml_content) {
      const parseResult = yamlParser.parse<AgentYAML>(input.yaml_content);
      parsed_config = parseResult.data;

      if (parseResult.success && parsed_config) {
        const validationResult = await schemaValidator.validateAgentYAML(parsed_config);
        validation_errors = validationResult.errors;
        status = validationResult.is_valid ? 'valid' : 'invalid';
      } else {
        validation_errors = parseResult.errors.map((e) => ({
          code: e.code,
          message: e.message,
          path: '',
          line: e.line,
          column: e.column,
          severity: 'error' as const,
        }));
        status = 'invalid';
      }
    }

    const updatedAgent: StudioAgent = {
      ...agent,
      name: input.name ?? agent.name,
      description: input.description ?? agent.description,
      yaml_content: input.yaml_content ?? agent.yaml_content,
      parsed_config,
      status,
      validation_errors,
      is_dirty: input.yaml_content !== agent.yaml_content,
      updated_at: new Date().toISOString(),
    };

    this.agents.set(id, updatedAgent);
    this.saveToStorage();

    return { success: true, data: updatedAgent };
  }

  async delete(id: UUID): Promise<StudioApiResponse<void>> {
    await this.simulateDelay();

    const agent = this.agents.get(id);
    if (!agent) {
      return {
        success: false,
        data: null,
        error: {
          code: 'AGENT_NOT_FOUND',
          message: `Agent with ID ${id} not found`,
        },
      };
    }

    // Remove from pack
    await packsApi.removeAgent(agent.pack_id, id);

    this.agents.delete(id);
    this.saveToStorage();

    return { success: true, data: undefined };
  }

  // ============================================
  // Validation Operations
  // ============================================

  async validate(id: UUID): Promise<StudioApiResponse<ValidationResult>> {
    await this.simulateDelay();

    const agent = this.agents.get(id);
    if (!agent) {
      return {
        success: false,
        data: null,
        error: {
          code: 'AGENT_NOT_FOUND',
          message: `Agent with ID ${id} not found`,
        },
      };
    }

    const parseResult = yamlParser.parse<AgentYAML>(agent.yaml_content);
    if (!parseResult.success || !parseResult.data) {
      const validationResult: ValidationResult = {
        is_valid: false,
        errors: parseResult.errors.map((e) => ({
          code: e.code,
          message: e.message,
          path: '',
          line: e.line,
          column: e.column,
          severity: 'error' as const,
        })),
        warnings: [],
        info: [],
        validated_at: new Date().toISOString(),
      };

      return { success: true, data: validationResult };
    }

    const validationResult = await schemaValidator.validateAgentYAML(parseResult.data);

    // Update agent with validation results
    const updatedAgent: StudioAgent = {
      ...agent,
      parsed_config: parseResult.data,
      status: validationResult.is_valid ? 'valid' : 'invalid',
      validation_errors: validationResult.errors,
      updated_at: new Date().toISOString(),
    };

    this.agents.set(id, updatedAgent);
    this.saveToStorage();

    return { success: true, data: validationResult };
  }

  async validateYAML(yamlContent: string): Promise<StudioApiResponse<ValidationResult>> {
    await this.simulateDelay(50);

    const parseResult = yamlParser.parse<AgentYAML>(yamlContent);
    if (!parseResult.success || !parseResult.data) {
      const validationResult: ValidationResult = {
        is_valid: false,
        errors: parseResult.errors.map((e) => ({
          code: e.code,
          message: e.message,
          path: '',
          line: e.line,
          column: e.column,
          severity: 'error' as const,
        })),
        warnings: parseResult.warnings.map((w) => ({
          code: w.code,
          message: w.message,
          path: '',
          line: w.line,
          column: w.column,
          severity: 'warning' as const,
        })),
        info: [],
        validated_at: new Date().toISOString(),
      };

      return { success: true, data: validationResult };
    }

    const validationResult = await schemaValidator.validateAgentYAML(parseResult.data);
    return { success: true, data: validationResult };
  }

  // ============================================
  // Version Operations
  // ============================================

  async createVersion(
    id: UUID,
    changeSummary: string
  ): Promise<StudioApiResponse<AgentVersion>> {
    await this.simulateDelay();

    const agent = this.agents.get(id);
    if (!agent) {
      return {
        success: false,
        data: null,
        error: {
          code: 'AGENT_NOT_FOUND',
          message: `Agent with ID ${id} not found`,
        },
      };
    }

    // Parse current version
    const currentVersionParts = agent.version.version.split('.').map(Number);
    const newVersion = `${currentVersionParts[0]}.${currentVersionParts[1]}.${currentVersionParts[2] + 1}`;

    const version: AgentVersion = {
      id: crypto.randomUUID(),
      agent_id: id,
      version: newVersion,
      yaml_content: agent.yaml_content,
      yaml_hash: this.generateHash(agent.yaml_content),
      change_summary: changeSummary,
      is_published: false,
      created_at: new Date().toISOString(),
      created_by: 'user',
    };

    const updatedAgent: StudioAgent = {
      ...agent,
      version,
      versions: [...agent.versions, agent.version],
      is_dirty: false,
      last_saved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.agents.set(id, updatedAgent);
    this.saveToStorage();

    return { success: true, data: version };
  }

  async getVersions(id: UUID): Promise<StudioApiResponse<AgentVersion[]>> {
    await this.simulateDelay();

    const agent = this.agents.get(id);
    if (!agent) {
      return {
        success: false,
        data: null,
        error: {
          code: 'AGENT_NOT_FOUND',
          message: `Agent with ID ${id} not found`,
        },
      };
    }

    const allVersions = [...agent.versions, agent.version].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return { success: true, data: allVersions };
  }

  async restoreVersion(
    id: UUID,
    versionId: UUID
  ): Promise<StudioApiResponse<StudioAgent>> {
    await this.simulateDelay();

    const agent = this.agents.get(id);
    if (!agent) {
      return {
        success: false,
        data: null,
        error: {
          code: 'AGENT_NOT_FOUND',
          message: `Agent with ID ${id} not found`,
        },
      };
    }

    const targetVersion = agent.versions.find((v) => v.id === versionId);
    if (!targetVersion) {
      return {
        success: false,
        data: null,
        error: {
          code: 'VERSION_NOT_FOUND',
          message: `Version with ID ${versionId} not found`,
        },
      };
    }

    // Restore the version
    const parseResult = yamlParser.parse<AgentYAML>(targetVersion.yaml_content);

    const updatedAgent: StudioAgent = {
      ...agent,
      yaml_content: targetVersion.yaml_content,
      parsed_config: parseResult.data,
      is_dirty: true,
      updated_at: new Date().toISOString(),
    };

    this.agents.set(id, updatedAgent);
    this.saveToStorage();

    return { success: true, data: updatedAgent };
  }

  // ============================================
  // Publishing Operations
  // ============================================

  async publish(id: UUID): Promise<StudioApiResponse<StudioAgent>> {
    await this.simulateDelay();

    const agent = this.agents.get(id);
    if (!agent) {
      return {
        success: false,
        data: null,
        error: {
          code: 'AGENT_NOT_FOUND',
          message: `Agent with ID ${id} not found`,
        },
      };
    }

    if (agent.status === 'invalid') {
      return {
        success: false,
        data: null,
        error: {
          code: 'INVALID_AGENT',
          message: 'Cannot publish an agent with validation errors',
        },
      };
    }

    const publishedVersion: AgentVersion = {
      ...agent.version,
      is_published: true,
    };

    const updatedAgent: StudioAgent = {
      ...agent,
      status: 'published',
      version: publishedVersion,
      updated_at: new Date().toISOString(),
    };

    this.agents.set(id, updatedAgent);
    this.saveToStorage();

    return { success: true, data: updatedAgent };
  }

  async deprecate(id: UUID): Promise<StudioApiResponse<StudioAgent>> {
    return this.update(id, { status: 'deprecated' });
  }

  // ============================================
  // Utility Operations
  // ============================================

  async duplicate(
    id: UUID,
    newSlug: string,
    newPackId?: UUID
  ): Promise<StudioApiResponse<StudioAgent>> {
    await this.simulateDelay();

    const agent = this.agents.get(id);
    if (!agent) {
      return {
        success: false,
        data: null,
        error: {
          code: 'AGENT_NOT_FOUND',
          message: `Agent with ID ${id} not found`,
        },
      };
    }

    const targetPackId = newPackId || agent.pack_id;

    return this.create({
      pack_id: targetPackId,
      name: `${agent.name} (Copy)`,
      slug: newSlug,
      description: agent.description,
      yaml_content: agent.yaml_content,
    });
  }

  async getDefaultYAML(): Promise<StudioApiResponse<string>> {
    return { success: true, data: DEFAULT_AGENT_YAML };
  }

  // Reset to mock data (for development)
  async reset(): Promise<void> {
    this.agents.clear();
    MOCK_AGENTS.forEach((agent) => this.agents.set(agent.id, agent));
    this.saveToStorage();
  }
}

// Export singleton instance
export const agentsApi = new AgentsApi();
export type { AgentsApi };
