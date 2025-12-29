/**
 * AgentOS Studio - Agents API Routes
 * GET /api/studio/agents - List all agents
 * POST /api/studio/agents - Create a new agent
 */

import { NextRequest, NextResponse } from 'next/server';
import type {
  StudioAgent,
  AgentSummary,
  AgentStatus,
  AgentYAML,
  AgentVersion,
  CreateAgentInput,
  StudioApiResponse,
  PaginationOptions,
  FilterOptions,
  ValidationError,
  UUID,
} from '@/types/studio';

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
// In-Memory Storage
// ============================================

const agents = new Map<UUID, StudioAgent>();
let initialized = false;

function initializeMockData(): void {
  if (initialized) return;

  const now = new Date().toISOString();

  const mockAgents: StudioAgent[] = [
    {
      id: 'agent-code-reviewer-001',
      pack_id: 'pack-engineering-001',
      slug: 'code-reviewer',
      name: 'Code Reviewer',
      description: 'Automated code review agent for pull requests',
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
      parsed_config: null,
      status: 'published',
      version: {
        id: 'ver-001',
        agent_id: 'agent-code-reviewer-001',
        version: '2.1.0',
        yaml_content: '',
        yaml_hash: 'abc123',
        change_summary: 'Updated model and temperature settings',
        is_published: true,
        created_at: now,
        created_by: 'system',
      },
      versions: [],
      validation_errors: [],
      is_dirty: false,
      last_saved_at: now,
      created_at: now,
      updated_at: now,
      created_by: 'system',
    },
    {
      id: 'agent-deploy-001',
      pack_id: 'pack-devops-001',
      slug: 'deploy-agent',
      name: 'Deploy Agent',
      description: 'Automated deployment agent for production releases',
      yaml_content: DEFAULT_AGENT_YAML,
      parsed_config: null,
      status: 'published',
      version: {
        id: 'ver-002',
        agent_id: 'agent-deploy-001',
        version: '1.0.0',
        yaml_content: DEFAULT_AGENT_YAML,
        yaml_hash: 'def456',
        change_summary: 'Initial version',
        is_published: true,
        created_at: now,
        created_by: 'system',
      },
      versions: [],
      validation_errors: [],
      is_dirty: false,
      last_saved_at: now,
      created_at: now,
      updated_at: now,
      created_by: 'system',
    },
    {
      id: 'agent-content-writer-001',
      pack_id: 'pack-marketing-001',
      slug: 'content-writer',
      name: 'Content Writer',
      description: 'AI-powered content generation for marketing materials',
      yaml_content: DEFAULT_AGENT_YAML,
      parsed_config: null,
      status: 'valid',
      version: {
        id: 'ver-003',
        agent_id: 'agent-content-writer-001',
        version: '1.0.0',
        yaml_content: DEFAULT_AGENT_YAML,
        yaml_hash: 'ghi789',
        change_summary: 'Initial version',
        is_published: false,
        created_at: now,
        created_by: 'system',
      },
      versions: [],
      validation_errors: [],
      is_dirty: false,
      last_saved_at: now,
      created_at: now,
      updated_at: now,
      created_by: 'system',
    },
  ];

  mockAgents.forEach(agent => agents.set(agent.id, agent));
  initialized = true;
}

// ============================================
// Utility Functions
// ============================================

function generateId(): UUID {
  return crypto.randomUUID();
}

function generateHash(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

function agentToSummary(agent: StudioAgent): AgentSummary {
  return {
    id: agent.id,
    pack_id: agent.pack_id,
    slug: agent.slug,
    name: agent.name,
    description: agent.description,
    status: agent.status,
    version: agent.version.version,
    has_errors: agent.validation_errors.length > 0,
    updated_at: agent.updated_at,
  };
}

function validateAgentInput(input: Partial<CreateAgentInput>): string[] {
  const errors: string[] = [];

  if (!input.pack_id) {
    errors.push('Pack ID is required');
  }

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

  return errors;
}

// ============================================
// GET Handler - List Agents
// ============================================

export async function GET(request: NextRequest): Promise<NextResponse<StudioApiResponse<AgentSummary[]>>> {
  initializeMockData();

  try {
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1', 10);
    const perPage = Math.min(parseInt(searchParams.get('per_page') || '20', 10), 100);
    const search = searchParams.get('search') || '';
    const packId = searchParams.get('pack_id');
    const statuses = searchParams.get('status')?.split(',').filter(Boolean) || [];
    const sortBy = searchParams.get('sort_by') || 'updated_at';
    const sortOrder = (searchParams.get('sort_order') || 'desc') as 'asc' | 'desc';

    let agentsArray = Array.from(agents.values());

    // Apply pack filter
    if (packId) {
      agentsArray = agentsArray.filter(agent => agent.pack_id === packId);
    }

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      agentsArray = agentsArray.filter(
        agent =>
          agent.name.toLowerCase().includes(searchLower) ||
          agent.description.toLowerCase().includes(searchLower) ||
          agent.slug.toLowerCase().includes(searchLower)
      );
    }

    // Apply status filter
    if (statuses.length > 0) {
      agentsArray = agentsArray.filter(agent => statuses.includes(agent.status));
    }

    // Apply sorting
    agentsArray.sort((a, b) => {
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
    const total = agentsArray.length;
    const totalPages = Math.ceil(total / perPage);
    const startIndex = (page - 1) * perPage;
    const paginatedAgents = agentsArray.slice(startIndex, startIndex + perPage);

    // Convert to summaries
    const summaries = paginatedAgents.map(agentToSummary);

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
    console.error('[API] Error listing agents:', error);
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to list agents',
          details: { error: error instanceof Error ? error.message : 'Unknown error' },
        },
      },
      { status: 500 }
    );
  }
}

// ============================================
// POST Handler - Create Agent
// ============================================

export async function POST(request: NextRequest): Promise<NextResponse<StudioApiResponse<StudioAgent>>> {
  initializeMockData();

  try {
    const body = await request.json();
    const input = body as CreateAgentInput;

    // Validate input
    const errors = validateAgentInput(input);
    if (errors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid agent data',
            details: { errors },
          },
        },
        { status: 400 }
      );
    }

    // Check for duplicate slug within pack
    const existingAgent = Array.from(agents.values()).find(
      a => a.pack_id === input.pack_id && a.slug === input.slug
    );
    if (existingAgent) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: {
            code: 'SLUG_EXISTS',
            message: `An agent with slug "${input.slug}" already exists in this pack`,
          },
        },
        { status: 409 }
      );
    }

    const now = new Date().toISOString();
    const agentId = generateId();

    // Use template YAML or default
    let yamlContent = input.yaml_content || DEFAULT_AGENT_YAML;

    // Replace placeholders in YAML
    yamlContent = yamlContent
      .replace(/name:\s*.+/m, `name: ${input.name}`)
      .replace(/slug:\s*.+/m, `slug: ${input.slug}`)
      .replace(/description:\s*.+/m, `description: ${input.description}`);

    const newAgent: StudioAgent = {
      id: agentId,
      pack_id: input.pack_id,
      slug: input.slug,
      name: input.name,
      description: input.description,
      yaml_content: yamlContent,
      parsed_config: null,
      status: 'draft',
      version: {
        id: generateId(),
        agent_id: agentId,
        version: '1.0.0',
        yaml_content: yamlContent,
        yaml_hash: generateHash(yamlContent),
        change_summary: 'Initial version',
        is_published: false,
        created_at: now,
        created_by: 'user',
      },
      versions: [],
      validation_errors: [],
      is_dirty: false,
      last_saved_at: now,
      created_at: now,
      updated_at: now,
      created_by: 'user',
    };

    agents.set(agentId, newAgent);

    return NextResponse.json(
      {
        success: true,
        data: newAgent,
        meta: {
          request_id: generateId(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[API] Error creating agent:', error);
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create agent',
          details: { error: error instanceof Error ? error.message : 'Unknown error' },
        },
      },
      { status: 500 }
    );
  }
}
