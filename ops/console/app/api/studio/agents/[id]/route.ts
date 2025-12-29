/**
 * AgentOS Studio - Individual Agent API Routes
 * GET /api/studio/agents/:id - Get agent details
 * PUT /api/studio/agents/:id - Update agent
 * DELETE /api/studio/agents/:id - Delete agent
 */

import { NextRequest, NextResponse } from 'next/server';
import type {
  StudioAgent,
  UpdateAgentInput,
  AgentStatus,
  AgentVersion,
  StudioApiResponse,
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
      yaml_content: DEFAULT_AGENT_YAML,
      parsed_config: null,
      status: 'published',
      version: {
        id: 'ver-001',
        agent_id: 'agent-code-reviewer-001',
        version: '2.1.0',
        yaml_content: DEFAULT_AGENT_YAML,
        yaml_hash: 'abc123',
        change_summary: 'Updated model settings',
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

function validateYaml(content: string): ValidationError[] {
  const errors: ValidationError[] = [];

  // Basic YAML validation
  try {
    // Check for required fields
    const requiredFields = ['name', 'slug', 'description', 'version', 'model', 'system_prompt'];
    for (const field of requiredFields) {
      const regex = new RegExp(`^${field}\\s*:`, 'm');
      if (!regex.test(content)) {
        errors.push({
          code: 'MISSING_FIELD',
          message: `Missing required field: ${field}`,
          path: `/${field}`,
          severity: 'error',
        });
      }
    }
  } catch (e) {
    errors.push({
      code: 'PARSE_ERROR',
      message: 'Failed to parse YAML content',
      path: '/',
      severity: 'error',
    });
  }

  return errors;
}

// ============================================
// GET Handler - Get Agent Details
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<StudioApiResponse<StudioAgent>>> {
  initializeMockData();

  try {
    const { id } = await params;

    // Try to find by ID first
    let agent = agents.get(id);

    // If not found by ID, try finding by slug (checking all packs)
    if (!agent) {
      agent = Array.from(agents.values()).find(a => a.slug === id);
    }

    if (!agent) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: {
            code: 'AGENT_NOT_FOUND',
            message: `Agent with ID or slug "${id}" not found`,
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: agent,
      meta: {
        request_id: generateId(),
      },
    });
  } catch (error) {
    console.error('[API] Error getting agent:', error);
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get agent',
          details: { error: error instanceof Error ? error.message : 'Unknown error' },
        },
      },
      { status: 500 }
    );
  }
}

// ============================================
// PUT Handler - Update Agent
// ============================================

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<StudioApiResponse<StudioAgent>>> {
  initializeMockData();

  try {
    const { id } = await params;
    const body = await request.json();
    const input = body as UpdateAgentInput;

    const agent = agents.get(id);
    if (!agent) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: {
            code: 'AGENT_NOT_FOUND',
            message: `Agent with ID "${id}" not found`,
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
            message: 'Invalid agent data',
            details: { errors },
          },
        },
        { status: 400 }
      );
    }

    // Validate YAML if provided
    let validationErrors = agent.validation_errors;
    let status = input.status ?? agent.status;

    if (input.yaml_content && input.yaml_content !== agent.yaml_content) {
      validationErrors = validateYaml(input.yaml_content);
      if (validationErrors.length > 0) {
        status = 'invalid';
      } else if (status === 'invalid') {
        status = 'valid';
      }
    }

    const now = new Date().toISOString();
    const updatedAgent: StudioAgent = {
      ...agent,
      name: input.name ?? agent.name,
      description: input.description ?? agent.description,
      yaml_content: input.yaml_content ?? agent.yaml_content,
      status,
      validation_errors: validationErrors,
      is_dirty: input.yaml_content ? input.yaml_content !== agent.yaml_content : agent.is_dirty,
      updated_at: now,
    };

    agents.set(id, updatedAgent);

    return NextResponse.json({
      success: true,
      data: updatedAgent,
      meta: {
        request_id: generateId(),
      },
    });
  } catch (error) {
    console.error('[API] Error updating agent:', error);
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update agent',
          details: { error: error instanceof Error ? error.message : 'Unknown error' },
        },
      },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE Handler - Delete Agent
// ============================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<StudioApiResponse<void>>> {
  initializeMockData();

  try {
    const { id } = await params;

    const agent = agents.get(id);
    if (!agent) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: {
            code: 'AGENT_NOT_FOUND',
            message: `Agent with ID "${id}" not found`,
          },
        },
        { status: 404 }
      );
    }

    // Check if agent is published
    if (agent.status === 'published') {
      const { searchParams } = new URL(request.url);
      const force = searchParams.get('force') === 'true';

      if (!force) {
        return NextResponse.json(
          {
            success: false,
            data: null,
            error: {
              code: 'AGENT_PUBLISHED',
              message: 'Cannot delete a published agent. Use ?force=true to override.',
            },
          },
          { status: 409 }
        );
      }
    }

    agents.delete(id);

    return NextResponse.json({
      success: true,
      data: undefined,
      meta: {
        request_id: generateId(),
      },
    });
  } catch (error) {
    console.error('[API] Error deleting agent:', error);
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete agent',
          details: { error: error instanceof Error ? error.message : 'Unknown error' },
        },
      },
      { status: 500 }
    );
  }
}

// ============================================
// PATCH Handler - Partial Update / Actions
// ============================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<StudioApiResponse<StudioAgent>>> {
  initializeMockData();

  try {
    const { id } = await params;
    const body = await request.json();
    const action = body.action as string;

    const agent = agents.get(id);
    if (!agent) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: {
            code: 'AGENT_NOT_FOUND',
            message: `Agent with ID "${id}" not found`,
          },
        },
        { status: 404 }
      );
    }

    const now = new Date().toISOString();
    let updatedAgent: StudioAgent;

    switch (action) {
      case 'publish': {
        if (agent.validation_errors.length > 0) {
          return NextResponse.json(
            {
              success: false,
              data: null,
              error: {
                code: 'INVALID_AGENT',
                message: 'Cannot publish an agent with validation errors',
              },
            },
            { status: 400 }
          );
        }

        updatedAgent = {
          ...agent,
          status: 'published',
          version: {
            ...agent.version,
            is_published: true,
          },
          updated_at: now,
        };
        break;
      }

      case 'deprecate': {
        updatedAgent = {
          ...agent,
          status: 'deprecated',
          updated_at: now,
        };
        break;
      }

      case 'duplicate': {
        const newSlug = body.new_slug as string;
        if (!newSlug) {
          return NextResponse.json(
            {
              success: false,
              data: null,
              error: {
                code: 'VALIDATION_ERROR',
                message: 'new_slug is required for duplicate action',
              },
            },
            { status: 400 }
          );
        }

        const existingAgent = Array.from(agents.values()).find(
          a => a.pack_id === agent.pack_id && a.slug === newSlug
        );
        if (existingAgent) {
          return NextResponse.json(
            {
              success: false,
              data: null,
              error: {
                code: 'SLUG_EXISTS',
                message: `An agent with slug "${newSlug}" already exists in this pack`,
              },
            },
            { status: 409 }
          );
        }

        const newAgentId = generateId();
        updatedAgent = {
          ...agent,
          id: newAgentId,
          slug: newSlug,
          name: `${agent.name} (Copy)`,
          status: 'draft',
          version: {
            id: generateId(),
            agent_id: newAgentId,
            version: '1.0.0',
            yaml_content: agent.yaml_content,
            yaml_hash: generateHash(agent.yaml_content),
            change_summary: `Duplicated from ${agent.slug}`,
            is_published: false,
            created_at: now,
            created_by: 'user',
          },
          versions: [],
          is_dirty: false,
          created_at: now,
          updated_at: now,
        };

        agents.set(newAgentId, updatedAgent);

        return NextResponse.json({
          success: true,
          data: updatedAgent,
          meta: {
            request_id: generateId(),
          },
        });
      }

      case 'create_version': {
        const changeSummary = body.change_summary as string || 'Version update';
        const currentParts = agent.version.version.split('.').map(Number);
        const newVersionNumber = `${currentParts[0]}.${currentParts[1]}.${currentParts[2] + 1}`;

        const newVersion: AgentVersion = {
          id: generateId(),
          agent_id: agent.id,
          version: newVersionNumber,
          yaml_content: agent.yaml_content,
          yaml_hash: generateHash(agent.yaml_content),
          change_summary: changeSummary,
          is_published: false,
          created_at: now,
          created_by: 'user',
        };

        updatedAgent = {
          ...agent,
          version: newVersion,
          versions: [...agent.versions, agent.version],
          is_dirty: false,
          last_saved_at: now,
          updated_at: now,
        };
        break;
      }

      default:
        return NextResponse.json(
          {
            success: false,
            data: null,
            error: {
              code: 'INVALID_ACTION',
              message: `Unknown action: ${action}`,
            },
          },
          { status: 400 }
        );
    }

    agents.set(id, updatedAgent);

    return NextResponse.json({
      success: true,
      data: updatedAgent,
      meta: {
        request_id: generateId(),
      },
    });
  } catch (error) {
    console.error('[API] Error patching agent:', error);
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to patch agent',
          details: { error: error instanceof Error ? error.message : 'Unknown error' },
        },
      },
      { status: 500 }
    );
  }
}
