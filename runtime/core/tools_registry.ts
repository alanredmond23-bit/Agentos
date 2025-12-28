/**
 * tools_registry.ts
 * Tool capability inventory and management
 * Tracks available tools, their capabilities, and usage
 */

import { ToolDefinition, ToolInput, ToolOutput } from '../types/agent_yaml';

// ============================================================================
// TYPES
// ============================================================================

export interface ToolCapability {
  /** Tool identifier */
  id: string;

  /** Display name */
  name: string;

  /** Description */
  description: string;

  /** Category */
  category: 'primary' | 'secondary' | 'utility' | 'mcp' | 'custom';

  /** Provider (e.g., 'openai', 'anthropic', 'mcp', 'builtin') */
  provider: string;

  /** Input schema */
  inputs: ToolInput[];

  /** Output schema */
  outputs: Record<string, ToolOutput>;

  /** Zone restrictions */
  allowed_zones: ('red' | 'yellow' | 'green')[];

  /** Requires approval */
  requires_approval: boolean;

  /** Rate limit (calls per minute) */
  rate_limit?: number;

  /** Timeout in ms */
  timeout_ms: number;

  /** Retry configuration */
  retry_config: {
    max_attempts: number;
    backoff_ms: number;
    backoff_multiplier: number;
  };

  /** Whether tool is currently available */
  available: boolean;

  /** Reason if unavailable */
  unavailable_reason?: string;

  /** Usage statistics */
  stats: ToolUsageStats;

  /** Custom metadata */
  metadata?: Record<string, unknown>;
}

export interface ToolUsageStats {
  total_calls: number;
  successful_calls: number;
  failed_calls: number;
  total_duration_ms: number;
  avg_duration_ms: number;
  last_used_at?: string;
  last_error?: string;
}

export interface ToolExecutionResult {
  tool_id: string;
  success: boolean;
  output?: unknown;
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
  duration_ms: number;
  attempt: number;
  timestamp: string;
}

export type ToolHandler = (input: Record<string, unknown>) => Promise<unknown>;

export interface ToolRegistration {
  definition: ToolDefinition;
  handler: ToolHandler;
  provider: string;
  allowed_zones?: ('red' | 'yellow' | 'green')[];
}

// ============================================================================
// TOOLS REGISTRY
// ============================================================================

export class ToolsRegistry {
  private tools: Map<string, ToolCapability> = new Map();
  private handlers: Map<string, ToolHandler> = new Map();

  constructor() {
    // Register built-in tools
    this.registerBuiltinTools();
  }

  // ============================================================================
  // REGISTRATION
  // ============================================================================

  /**
   * Register a tool
   */
  register(registration: ToolRegistration): void {
    const { definition, handler, provider, allowed_zones } = registration;

    const capability: ToolCapability = {
      id: definition.name,
      name: definition.name,
      description: definition.description,
      category: definition.category ?? 'custom',
      provider,
      inputs: definition.inputs,
      outputs: definition.outputs,
      allowed_zones: allowed_zones ?? ['green', 'yellow', 'red'],
      requires_approval: definition.requires_approval ?? false,
      rate_limit: undefined,
      timeout_ms: definition.timeout_ms ?? 30000,
      retry_config: {
        max_attempts: definition.retry_count ?? 3,
        backoff_ms: 1000,
        backoff_multiplier: 2
      },
      available: true,
      stats: {
        total_calls: 0,
        successful_calls: 0,
        failed_calls: 0,
        total_duration_ms: 0,
        avg_duration_ms: 0
      }
    };

    this.tools.set(definition.name, capability);
    this.handlers.set(definition.name, handler);
  }

  /**
   * Register multiple tools
   */
  registerMany(registrations: ToolRegistration[]): void {
    for (const reg of registrations) {
      this.register(reg);
    }
  }

  /**
   * Unregister a tool
   */
  unregister(toolId: string): boolean {
    this.handlers.delete(toolId);
    return this.tools.delete(toolId);
  }

  /**
   * Update tool availability
   */
  setAvailability(toolId: string, available: boolean, reason?: string): void {
    const tool = this.tools.get(toolId);
    if (tool) {
      tool.available = available;
      tool.unavailable_reason = available ? undefined : reason;
    }
  }

  // ============================================================================
  // QUERY
  // ============================================================================

  /**
   * Get a tool by ID
   */
  get(toolId: string): ToolCapability | undefined {
    return this.tools.get(toolId);
  }

  /**
   * Check if a tool exists
   */
  has(toolId: string): boolean {
    return this.tools.has(toolId);
  }

  /**
   * List all tools
   */
  list(): ToolCapability[] {
    return Array.from(this.tools.values());
  }

  /**
   * List tools by category
   */
  listByCategory(category: ToolCapability['category']): ToolCapability[] {
    return this.list().filter((t) => t.category === category);
  }

  /**
   * List tools by provider
   */
  listByProvider(provider: string): ToolCapability[] {
    return this.list().filter((t) => t.provider === provider);
  }

  /**
   * List available tools for a zone
   */
  listForZone(zone: 'red' | 'yellow' | 'green'): ToolCapability[] {
    return this.list().filter(
      (t) => t.available && t.allowed_zones.includes(zone)
    );
  }

  /**
   * Search tools
   */
  search(query: string): ToolCapability[] {
    const lowerQuery = query.toLowerCase();
    return this.list().filter(
      (t) =>
        t.name.toLowerCase().includes(lowerQuery) ||
        t.description.toLowerCase().includes(lowerQuery)
    );
  }

  // ============================================================================
  // EXECUTION
  // ============================================================================

  /**
   * Execute a tool
   */
  async execute(
    toolId: string,
    input: Record<string, unknown>,
    options?: {
      zone?: 'red' | 'yellow' | 'green';
      timeout_ms?: number;
      max_retries?: number;
    }
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    const tool = this.tools.get(toolId);

    if (!tool) {
      return {
        tool_id: toolId,
        success: false,
        error: {
          code: 'TOOL_NOT_FOUND',
          message: `Tool ${toolId} not found`,
          retryable: false
        },
        duration_ms: 0,
        attempt: 0,
        timestamp: new Date().toISOString()
      };
    }

    if (!tool.available) {
      return {
        tool_id: toolId,
        success: false,
        error: {
          code: 'TOOL_UNAVAILABLE',
          message: tool.unavailable_reason ?? 'Tool is unavailable',
          retryable: true
        },
        duration_ms: 0,
        attempt: 0,
        timestamp: new Date().toISOString()
      };
    }

    // Check zone
    const zone = options?.zone ?? 'green';
    if (!tool.allowed_zones.includes(zone)) {
      return {
        tool_id: toolId,
        success: false,
        error: {
          code: 'ZONE_NOT_ALLOWED',
          message: `Tool ${toolId} not allowed in ${zone} zone`,
          retryable: false
        },
        duration_ms: 0,
        attempt: 0,
        timestamp: new Date().toISOString()
      };
    }

    const handler = this.handlers.get(toolId);
    if (!handler) {
      return {
        tool_id: toolId,
        success: false,
        error: {
          code: 'NO_HANDLER',
          message: `No handler registered for ${toolId}`,
          retryable: false
        },
        duration_ms: 0,
        attempt: 0,
        timestamp: new Date().toISOString()
      };
    }

    // Execute with retries
    const maxAttempts = options?.max_retries ?? tool.retry_config.max_attempts;
    const timeout = options?.timeout_ms ?? tool.timeout_ms;

    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const output = await Promise.race([
          handler(input),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), timeout)
          )
        ]);

        const duration = Date.now() - startTime;
        this.updateStats(tool, true, duration);

        return {
          tool_id: toolId,
          success: true,
          output,
          duration_ms: duration,
          attempt,
          timestamp: new Date().toISOString()
        };
      } catch (error) {
        lastError = error as Error;

        if (attempt < maxAttempts) {
          // Exponential backoff
          const backoff =
            tool.retry_config.backoff_ms *
            Math.pow(tool.retry_config.backoff_multiplier, attempt - 1);
          await new Promise((resolve) => setTimeout(resolve, backoff));
        }
      }
    }

    const duration = Date.now() - startTime;
    this.updateStats(tool, false, duration, lastError?.message);

    return {
      tool_id: toolId,
      success: false,
      error: {
        code: lastError?.name ?? 'EXECUTION_ERROR',
        message: lastError?.message ?? 'Unknown error',
        retryable: true
      },
      duration_ms: duration,
      attempt: maxAttempts,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Update tool stats
   */
  private updateStats(
    tool: ToolCapability,
    success: boolean,
    duration_ms: number,
    error?: string
  ): void {
    tool.stats.total_calls++;
    tool.stats.total_duration_ms += duration_ms;
    tool.stats.avg_duration_ms =
      tool.stats.total_duration_ms / tool.stats.total_calls;
    tool.stats.last_used_at = new Date().toISOString();

    if (success) {
      tool.stats.successful_calls++;
    } else {
      tool.stats.failed_calls++;
      tool.stats.last_error = error;
    }
  }

  // ============================================================================
  // BUILT-IN TOOLS
  // ============================================================================

  private registerBuiltinTools(): void {
    // File read tool
    this.register({
      definition: {
        name: 'file_read',
        description: 'Read contents of a file',
        category: 'utility',
        inputs: [
          { name: 'path', type: 'string', required: true, description: 'File path' }
        ],
        outputs: {
          content: { name: 'content', type: 'string', description: 'File contents' }
        },
        zone: 'yellow'
      },
      handler: async (input) => {
        const fs = await import('fs');
        return { content: await fs.promises.readFile(input.path as string, 'utf-8') };
      },
      provider: 'builtin',
      allowed_zones: ['yellow', 'green']
    });

    // HTTP request tool
    this.register({
      definition: {
        name: 'http_request',
        description: 'Make an HTTP request',
        category: 'utility',
        inputs: [
          { name: 'url', type: 'string', required: true },
          { name: 'method', type: 'string', required: false, default: 'GET' },
          { name: 'headers', type: 'object', required: false },
          { name: 'body', type: 'string', required: false }
        ],
        outputs: {
          status: { name: 'status', type: 'number' },
          body: { name: 'body', type: 'string' }
        },
        zone: 'yellow'
      },
      handler: async (input) => {
        const response = await fetch(input.url as string, {
          method: (input.method as string) ?? 'GET',
          headers: input.headers as Record<string, string> | undefined,
          body: input.body as string | undefined
        });
        return {
          status: response.status,
          body: await response.text()
        };
      },
      provider: 'builtin',
      allowed_zones: ['yellow', 'green']
    });

    // JSON parse tool
    this.register({
      definition: {
        name: 'json_parse',
        description: 'Parse a JSON string',
        category: 'utility',
        inputs: [{ name: 'json', type: 'string', required: true }],
        outputs: {
          data: { name: 'data', type: 'object' }
        }
      },
      handler: async (input) => ({ data: JSON.parse(input.json as string) }),
      provider: 'builtin',
      allowed_zones: ['green', 'yellow', 'red']
    });

    // Current time tool
    this.register({
      definition: {
        name: 'current_time',
        description: 'Get current date and time',
        category: 'utility',
        inputs: [
          { name: 'timezone', type: 'string', required: false, default: 'UTC' }
        ],
        outputs: {
          iso: { name: 'iso', type: 'string' },
          unix: { name: 'unix', type: 'number' }
        }
      },
      handler: async () => ({
        iso: new Date().toISOString(),
        unix: Date.now()
      }),
      provider: 'builtin',
      allowed_zones: ['green', 'yellow', 'red']
    });
  }

  // ============================================================================
  // EXPORT/IMPORT
  // ============================================================================

  /**
   * Export tool definitions for LLM consumption
   */
  exportForLLM(zone: 'red' | 'yellow' | 'green' = 'green'): object[] {
    return this.listForZone(zone).map((tool) => ({
      type: 'function',
      function: {
        name: tool.id,
        description: tool.description,
        parameters: {
          type: 'object',
          properties: Object.fromEntries(
            tool.inputs.map((input) => [
              input.name,
              {
                type: input.type,
                description: input.description,
                enum: input.enum
              }
            ])
          ),
          required: tool.inputs.filter((i) => i.required).map((i) => i.name)
        }
      }
    }));
  }

  /**
   * Get stats summary
   */
  getStatsSummary(): Record<string, ToolUsageStats> {
    const summary: Record<string, ToolUsageStats> = {};
    for (const [id, tool] of this.tools) {
      summary[id] = { ...tool.stats };
    }
    return summary;
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let defaultRegistry: ToolsRegistry | null = null;

export function getToolsRegistry(): ToolsRegistry {
  if (!defaultRegistry) {
    defaultRegistry = new ToolsRegistry();
  }
  return defaultRegistry;
}

export function setToolsRegistry(registry: ToolsRegistry): void {
  defaultRegistry = registry;
}
