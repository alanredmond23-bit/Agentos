/**
 * orchestrator.ts
 * Load YAML, create run context, route tasks
 * Main execution engine for agent workflows
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import {
  AgentYAML,
  AgentIdentity,
  ModelConfig,
  ToolsConfig,
  MemoryConfig,
  AuthorityConfig,
  MCPServerConfig,
  BusinessConfig,
  validateAgentYAML,
  getPreset
} from '../types/agent_yaml';
import { AuditEvent, WorkflowEvent, createWorkflowEvent } from '../types/events';
import { getStateStore } from './state_store';
import { getApprovalManager, ApprovalRequiredError } from './approvals';
import { getIdempotencyManager, IdempotencyError } from './idempotency';
import { getAuditLogger } from './audit';
import { getPolicyEngine } from './policy_engine';
import { getGateExecutor, createQualityGate, GateResult } from './gates';
import { getToolsRegistry, ToolExecutionResult } from './tools_registry';
import { getModelRouter, RouteResult, CompletionRequest } from './model_router';

// ============================================================================
// TYPES
// ============================================================================

export type RunStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';

export interface RunContext {
  /** Unique run identifier */
  run_id: string;

  /** Agent YAML configuration */
  agent: AgentYAML;

  /** Current status */
  status: RunStatus;

  /** Current zone */
  zone: 'red' | 'yellow' | 'green';

  /** Task being executed */
  task?: TaskContext;

  /** Parent run (for nested agents) */
  parent_run_id?: string;

  /** Child runs */
  child_run_ids: string[];

  /** Conversation history */
  messages: Message[];

  /** Tool execution history */
  tool_calls: ToolCall[];

  /** Accumulated cost (USD) */
  cost_usd: number;

  /** Token usage */
  tokens: { input: number; output: number };

  /** Start time */
  started_at: string;

  /** End time */
  ended_at?: string;

  /** Error if failed */
  error?: {
    code: string;
    message: string;
    stack?: string;
  };

  /** Metadata */
  metadata: Record<string, unknown>;
}

export interface TaskContext {
  /** Task identifier */
  task_id: string;

  /** Task class from YAML */
  task_class: string;

  /** Execution mode */
  mode: string;

  /** Task input */
  input: unknown;

  /** Expected output type */
  output_type?: string;

  /** Current step */
  current_step: number;

  /** Total steps */
  total_steps: number;

  /** Step results */
  step_results: StepResult[];
}

export interface StepResult {
  step_id: string;
  step_name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  input?: unknown;
  output?: unknown;
  duration_ms: number;
  error?: string;
}

export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | ContentPart[];
  name?: string;
  tool_call_id?: string;
  tool_calls?: ToolCallMessage[];
  timestamp: string;
}

export interface ContentPart {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: { url: string };
}

export interface ToolCall {
  id: string;
  tool_name: string;
  input: Record<string, unknown>;
  output?: unknown;
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'failed';
  duration_ms?: number;
  error?: string;
  timestamp: string;
}

export interface ToolCallMessage {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface OrchestratorConfig {
  /** Default zone for new runs */
  default_zone?: 'red' | 'yellow' | 'green';

  /** Maximum tokens per run */
  max_tokens_per_run?: number;

  /** Maximum cost per run (USD) */
  max_cost_per_run?: number;

  /** Maximum tool calls per run */
  max_tool_calls_per_run?: number;

  /** Maximum run duration (ms) */
  max_run_duration_ms?: number;

  /** Enable quality gates */
  enable_quality_gates?: boolean;

  /** Enable policy checks */
  enable_policy_checks?: boolean;

  /** Auto-save state interval (ms) */
  auto_save_interval_ms?: number;
}

export interface RunResult {
  run_id: string;
  status: RunStatus;
  output?: unknown;
  cost_usd: number;
  tokens: { input: number; output: number };
  duration_ms: number;
  tool_calls: number;
  gate_results?: GateResult[];
  error?: { code: string; message: string };
}

// ============================================================================
// YAML LOADER
// ============================================================================

/**
 * Load and parse agent YAML file
 */
export async function loadAgentYAML(filePath: string): Promise<AgentYAML> {
  const content = await fs.promises.readFile(filePath, 'utf-8');

  // Simple YAML parsing (in production, use a proper YAML parser)
  // For now, support JSON and basic YAML
  let config: unknown;

  if (filePath.endsWith('.json')) {
    config = JSON.parse(content);
  } else {
    // Basic YAML parsing
    config = parseSimpleYAML(content);
  }

  // Validate and return
  const validation = validateAgentYAML(config);
  if (!validation.valid) {
    throw new OrchestratorError(
      `Invalid agent YAML: ${validation.errors.map(e => `${e.field}: ${e.message}`).join(', ')}`,
      'INVALID_YAML'
    );
  }

  return config as AgentYAML;
}

/**
 * Simple YAML parser for basic cases
 */
function parseSimpleYAML(content: string): Record<string, unknown> {
  const lines = content.split('\n');
  const result: Record<string, unknown> = {};
  let currentKey = '';
  let currentIndent = 0;
  const stack: { obj: Record<string, unknown>; indent: number }[] = [{ obj: result, indent: -1 }];

  for (const line of lines) {
    // Skip comments and empty lines
    if (line.trim().startsWith('#') || line.trim() === '') continue;

    const indent = line.search(/\S/);
    const trimmed = line.trim();

    // Handle key: value
    const match = trimmed.match(/^([^:]+):\s*(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value: unknown = match[2].trim();

      // Pop stack to correct level
      while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
        stack.pop();
      }

      const parent = stack[stack.length - 1].obj;

      // Parse value
      if (value === '' || value === null) {
        // Nested object coming
        const newObj: Record<string, unknown> = {};
        parent[key] = newObj;
        stack.push({ obj: newObj, indent });
      } else if (value === 'true') {
        parent[key] = true;
      } else if (value === 'false') {
        parent[key] = false;
      } else if (value === 'null') {
        parent[key] = null;
      } else if (/^-?\d+$/.test(value)) {
        parent[key] = parseInt(value, 10);
      } else if (/^-?\d+\.\d+$/.test(value)) {
        parent[key] = parseFloat(value);
      } else if (value.startsWith('"') && value.endsWith('"')) {
        parent[key] = value.slice(1, -1);
      } else if (value.startsWith("'") && value.endsWith("'")) {
        parent[key] = value.slice(1, -1);
      } else if (value.startsWith('[') && value.endsWith(']')) {
        // Simple array
        const items = value.slice(1, -1).split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));
        parent[key] = items;
      } else {
        parent[key] = value;
      }
    } else if (trimmed.startsWith('- ')) {
      // Array item
      const value = trimmed.slice(2).trim();
      const parent = stack[stack.length - 1].obj;
      const lastKey = Object.keys(parent).pop();
      if (lastKey && !Array.isArray(parent[lastKey])) {
        parent[lastKey] = [];
      }
      if (lastKey && Array.isArray(parent[lastKey])) {
        (parent[lastKey] as unknown[]).push(value.replace(/^["']|["']$/g, ''));
      }
    }
  }

  return result;
}

// ============================================================================
// ORCHESTRATOR
// ============================================================================

export class Orchestrator {
  private config: Required<OrchestratorConfig>;
  private runs: Map<string, RunContext> = new Map();
  private eventHandlers: Map<string, Array<(event: WorkflowEvent) => void>> = new Map();
  private saveTimer: NodeJS.Timeout | null = null;

  constructor(config: OrchestratorConfig = {}) {
    this.config = {
      default_zone: config.default_zone ?? 'green',
      max_tokens_per_run: config.max_tokens_per_run ?? 100000,
      max_cost_per_run: config.max_cost_per_run ?? 10.0,
      max_tool_calls_per_run: config.max_tool_calls_per_run ?? 100,
      max_run_duration_ms: config.max_run_duration_ms ?? 300000, // 5 minutes
      enable_quality_gates: config.enable_quality_gates ?? true,
      enable_policy_checks: config.enable_policy_checks ?? true,
      auto_save_interval_ms: config.auto_save_interval_ms ?? 10000
    };

    this.startAutoSave();
  }

  // ============================================================================
  // RUN LIFECYCLE
  // ============================================================================

  /**
   * Create a new run from an agent YAML file or config
   */
  async createRun(
    agentConfig: AgentYAML | string,
    options?: {
      task_class?: string;
      mode?: string;
      input?: unknown;
      zone?: 'red' | 'yellow' | 'green';
      parent_run_id?: string;
      metadata?: Record<string, unknown>;
    }
  ): Promise<RunContext> {
    // Load YAML if path provided
    const agent = typeof agentConfig === 'string'
      ? await loadAgentYAML(agentConfig)
      : agentConfig;

    // Create run context
    const run: RunContext = {
      run_id: this.generateRunId(),
      agent,
      status: 'pending',
      zone: options?.zone ?? this.config.default_zone,
      parent_run_id: options?.parent_run_id,
      child_run_ids: [],
      messages: [],
      tool_calls: [],
      cost_usd: 0,
      tokens: { input: 0, output: 0 },
      started_at: new Date().toISOString(),
      metadata: options?.metadata ?? {}
    };

    // Set up task context if provided
    if (options?.task_class) {
      run.task = {
        task_id: `task_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
        task_class: options.task_class,
        mode: options.mode ?? 'default',
        input: options.input,
        current_step: 0,
        total_steps: 0,
        step_results: []
      };
    }

    // Add system message from agent config
    if (agent.identity?.system_prompt) {
      run.messages.push({
        role: 'system',
        content: agent.identity.system_prompt,
        timestamp: new Date().toISOString()
      });
    }

    // Store run
    this.runs.set(run.run_id, run);

    // Persist to state store
    await this.saveRun(run);

    // Emit event
    this.emit('run_created', run);

    return run;
  }

  /**
   * Start executing a run
   */
  async startRun(runId: string): Promise<RunContext> {
    const run = this.getRun(runId);
    if (!run) {
      throw new OrchestratorError(`Run ${runId} not found`, 'RUN_NOT_FOUND');
    }

    if (run.status !== 'pending' && run.status !== 'paused') {
      throw new OrchestratorError(`Cannot start run in ${run.status} status`, 'INVALID_STATUS');
    }

    // Check policies
    if (this.config.enable_policy_checks) {
      const policyResult = await getPolicyEngine().evaluate({
        request: {
          agent_id: run.agent.identity?.id ?? 'unknown',
          action: 'start_run',
          resource: run.run_id,
          zone: run.zone,
          timestamp: new Date().toISOString()
        },
        environment: { name: process.env.NODE_ENV ?? 'development' }
      });

      if (policyResult.action === 'deny') {
        throw new OrchestratorError(
          `Policy denied run start: ${policyResult.critical_failures[0]?.failures?.[0]?.message}`,
          'POLICY_DENIED'
        );
      }
    }

    run.status = 'running';
    await this.saveRun(run);

    this.emit('run_started', run);

    return run;
  }

  /**
   * Pause a running run
   */
  async pauseRun(runId: string): Promise<RunContext> {
    const run = this.getRun(runId);
    if (!run) {
      throw new OrchestratorError(`Run ${runId} not found`, 'RUN_NOT_FOUND');
    }

    if (run.status !== 'running') {
      throw new OrchestratorError(`Cannot pause run in ${run.status} status`, 'INVALID_STATUS');
    }

    run.status = 'paused';
    await this.saveRun(run);

    this.emit('run_paused', run);

    return run;
  }

  /**
   * Complete a run successfully
   */
  async completeRun(runId: string, output?: unknown): Promise<RunResult> {
    const run = this.getRun(runId);
    if (!run) {
      throw new OrchestratorError(`Run ${runId} not found`, 'RUN_NOT_FOUND');
    }

    // Run quality gates
    let gateResults: GateResult[] | undefined;
    if (this.config.enable_quality_gates && output !== undefined) {
      const gate = createQualityGate({ noPii: true });
      const result = await getGateExecutor().execute(gate, {
        agent_id: run.agent.identity?.id ?? 'unknown',
        zone: run.zone,
        output
      });
      gateResults = [result];

      if (result.status === 'failed') {
        return this.failRun(runId, {
          code: 'GATE_FAILED',
          message: `Quality gate failed: ${result.blocking_failures.map(f => f.message).join(', ')}`
        });
      }
    }

    run.status = 'completed';
    run.ended_at = new Date().toISOString();
    await this.saveRun(run);

    this.emit('run_completed', run);

    // Log to audit
    await getAuditLogger().logAction(
      'complete',
      { type: 'agent', id: run.agent.identity?.id ?? 'unknown' },
      { type: 'run', id: run.run_id },
      run.zone,
      true,
      {
        duration_ms: Date.now() - new Date(run.started_at).getTime(),
        metadata: { cost_usd: run.cost_usd, tokens: run.tokens }
      }
    );

    return {
      run_id: run.run_id,
      status: 'completed',
      output,
      cost_usd: run.cost_usd,
      tokens: run.tokens,
      duration_ms: Date.now() - new Date(run.started_at).getTime(),
      tool_calls: run.tool_calls.length,
      gate_results: gateResults
    };
  }

  /**
   * Fail a run with an error
   */
  async failRun(runId: string, error: { code: string; message: string }): Promise<RunResult> {
    const run = this.getRun(runId);
    if (!run) {
      throw new OrchestratorError(`Run ${runId} not found`, 'RUN_NOT_FOUND');
    }

    run.status = 'failed';
    run.ended_at = new Date().toISOString();
    run.error = error;
    await this.saveRun(run);

    this.emit('run_failed', run);

    // Log to audit
    await getAuditLogger().logAction(
      'fail',
      { type: 'agent', id: run.agent.identity?.id ?? 'unknown' },
      { type: 'run', id: run.run_id },
      run.zone,
      false,
      {
        error,
        duration_ms: Date.now() - new Date(run.started_at).getTime()
      }
    );

    return {
      run_id: run.run_id,
      status: 'failed',
      cost_usd: run.cost_usd,
      tokens: run.tokens,
      duration_ms: Date.now() - new Date(run.started_at).getTime(),
      tool_calls: run.tool_calls.length,
      error
    };
  }

  /**
   * Cancel a run
   */
  async cancelRun(runId: string, reason?: string): Promise<RunResult> {
    const run = this.getRun(runId);
    if (!run) {
      throw new OrchestratorError(`Run ${runId} not found`, 'RUN_NOT_FOUND');
    }

    run.status = 'cancelled';
    run.ended_at = new Date().toISOString();
    await this.saveRun(run);

    this.emit('run_cancelled', run);

    return {
      run_id: run.run_id,
      status: 'cancelled',
      cost_usd: run.cost_usd,
      tokens: run.tokens,
      duration_ms: Date.now() - new Date(run.started_at).getTime(),
      tool_calls: run.tool_calls.length,
      error: reason ? { code: 'CANCELLED', message: reason } : undefined
    };
  }

  // ============================================================================
  // MESSAGE HANDLING
  // ============================================================================

  /**
   * Add a message to the run
   */
  async addMessage(runId: string, message: Omit<Message, 'timestamp'>): Promise<void> {
    const run = this.getRun(runId);
    if (!run) {
      throw new OrchestratorError(`Run ${runId} not found`, 'RUN_NOT_FOUND');
    }

    run.messages.push({
      ...message,
      timestamp: new Date().toISOString()
    });

    await this.saveRun(run);
  }

  /**
   * Get completion from model router
   */
  async getCompletion(
    runId: string,
    options?: {
      use_case?: string;
      preset?: string;
      tools?: CompletionRequest['tools'];
    }
  ): Promise<{ content: string; tool_calls?: ToolCallMessage[] }> {
    const run = this.getRun(runId);
    if (!run) {
      throw new OrchestratorError(`Run ${runId} not found`, 'RUN_NOT_FOUND');
    }

    // Check limits
    if (run.tokens.input + run.tokens.output >= this.config.max_tokens_per_run) {
      throw new OrchestratorError('Token limit exceeded', 'TOKEN_LIMIT');
    }

    if (run.cost_usd >= this.config.max_cost_per_run) {
      throw new OrchestratorError('Cost limit exceeded', 'COST_LIMIT');
    }

    // Route to model
    const router = getModelRouter();
    const routeResult = await router.route({
      messages: run.messages.map(m => ({
        role: m.role,
        content: m.content,
        name: m.name,
        tool_call_id: m.tool_call_id
      })),
      use_case: options?.use_case,
      preset: options?.preset ?? run.agent.model?.preset,
      tools: options?.tools,
      provider: run.agent.model?.provider as any,
      model: run.agent.model?.model
    });

    // For now, return a mock response
    // In production, this would call the actual LLM adapter
    const mockResponse = {
      content: 'This is a mock response from the orchestrator.',
      input_tokens: 100,
      output_tokens: 50
    };

    // Update usage
    run.tokens.input += mockResponse.input_tokens;
    run.tokens.output += mockResponse.output_tokens;
    run.cost_usd += routeResult.estimated_cost ?? 0;

    // Record usage in router
    router.recordUsage(
      routeResult.endpoint.provider,
      routeResult.endpoint.model,
      mockResponse.input_tokens,
      mockResponse.output_tokens,
      100, // latency
      true
    );

    // Add assistant message
    await this.addMessage(runId, {
      role: 'assistant',
      content: mockResponse.content
    });

    return { content: mockResponse.content };
  }

  // ============================================================================
  // TOOL EXECUTION
  // ============================================================================

  /**
   * Execute a tool call
   */
  async executeTool(
    runId: string,
    toolName: string,
    input: Record<string, unknown>
  ): Promise<ToolExecutionResult> {
    const run = this.getRun(runId);
    if (!run) {
      throw new OrchestratorError(`Run ${runId} not found`, 'RUN_NOT_FOUND');
    }

    // Check tool call limit
    if (run.tool_calls.length >= this.config.max_tool_calls_per_run) {
      throw new OrchestratorError('Tool call limit exceeded', 'TOOL_LIMIT');
    }

    // Create tool call record
    const toolCall: ToolCall = {
      id: `tool_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      tool_name: toolName,
      input,
      status: 'pending',
      timestamp: new Date().toISOString()
    };

    run.tool_calls.push(toolCall);

    // Check if approval is required
    const registry = getToolsRegistry();
    const tool = registry.get(toolName);

    if (tool?.requires_approval || run.zone === 'red') {
      try {
        const approvalManager = getApprovalManager();
        const token = await approvalManager.requestApproval({
          resource_type: 'tool',
          resource_id: toolName,
          action: 'execute',
          zone: run.zone,
          actor_id: run.agent.identity?.id ?? 'unknown',
          metadata: { input }
        });

        // Wait for approval (in production, this might be async)
        toolCall.status = 'approved';
      } catch (error) {
        if (error instanceof ApprovalRequiredError) {
          toolCall.status = 'rejected';
          throw error;
        }
        throw error;
      }
    } else {
      toolCall.status = 'approved';
    }

    // Execute the tool
    const startTime = Date.now();
    const result = await registry.execute(toolName, input, { zone: run.zone });
    toolCall.duration_ms = Date.now() - startTime;

    if (result.success) {
      toolCall.status = 'completed';
      toolCall.output = result.output;
    } else {
      toolCall.status = 'failed';
      toolCall.error = result.error?.message;
    }

    await this.saveRun(run);

    // Add tool result message
    await this.addMessage(runId, {
      role: 'tool',
      content: JSON.stringify(result.output ?? result.error),
      tool_call_id: toolCall.id
    });

    return result;
  }

  // ============================================================================
  // RUN QUERIES
  // ============================================================================

  /**
   * Get a run by ID
   */
  getRun(runId: string): RunContext | undefined {
    return this.runs.get(runId);
  }

  /**
   * List all runs
   */
  listRuns(filter?: {
    status?: RunStatus;
    zone?: 'red' | 'yellow' | 'green';
    agent_id?: string;
  }): RunContext[] {
    let runs = Array.from(this.runs.values());

    if (filter?.status) {
      runs = runs.filter(r => r.status === filter.status);
    }
    if (filter?.zone) {
      runs = runs.filter(r => r.zone === filter.zone);
    }
    if (filter?.agent_id) {
      runs = runs.filter(r => r.agent.identity?.id === filter.agent_id);
    }

    return runs;
  }

  /**
   * Get active runs
   */
  getActiveRuns(): RunContext[] {
    return this.listRuns({ status: 'running' });
  }

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  /**
   * Save run to state store
   */
  private async saveRun(run: RunContext): Promise<void> {
    const store = getStateStore();
    await store.put(`runs/${run.run_id}`, run, {
      actor_id: run.agent.identity?.id ?? 'system',
      metadata: { zone: run.zone }
    });
  }

  /**
   * Load run from state store
   */
  async loadRun(runId: string): Promise<RunContext | null> {
    const store = getStateStore();
    const data = await store.get<RunContext>(`runs/${runId}`);
    if (data) {
      this.runs.set(runId, data);
    }
    return data;
  }

  /**
   * Start auto-save timer
   */
  private startAutoSave(): void {
    this.saveTimer = setInterval(async () => {
      for (const run of this.runs.values()) {
        if (run.status === 'running') {
          await this.saveRun(run);
        }
      }
    }, this.config.auto_save_interval_ms);
  }

  /**
   * Stop auto-save timer
   */
  stopAutoSave(): void {
    if (this.saveTimer) {
      clearInterval(this.saveTimer);
      this.saveTimer = null;
    }
  }

  // ============================================================================
  // EVENT HANDLING
  // ============================================================================

  /**
   * Subscribe to events
   */
  on(event: string, handler: (event: WorkflowEvent) => void): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  /**
   * Unsubscribe from events
   */
  off(event: string, handler: (event: WorkflowEvent) => void): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Emit an event
   */
  private emit(eventType: string, run: RunContext): void {
    const event = createWorkflowEvent(eventType as any, {
      run_id: run.run_id,
      agent_id: run.agent.identity?.id ?? 'unknown',
      task_id: run.task?.task_id,
      metadata: { status: run.status, zone: run.zone }
    });

    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(event);
        } catch (error) {
          console.error(`Error in event handler for ${eventType}:`, error);
        }
      }
    }
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  /**
   * Generate a unique run ID
   */
  private generateRunId(): string {
    return `run_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  /**
   * Get orchestrator statistics
   */
  getStats(): {
    active_runs: number;
    completed_runs: number;
    failed_runs: number;
    total_cost_usd: number;
    total_tokens: { input: number; output: number };
  } {
    const runs = Array.from(this.runs.values());

    return {
      active_runs: runs.filter(r => r.status === 'running').length,
      completed_runs: runs.filter(r => r.status === 'completed').length,
      failed_runs: runs.filter(r => r.status === 'failed').length,
      total_cost_usd: runs.reduce((sum, r) => sum + r.cost_usd, 0),
      total_tokens: {
        input: runs.reduce((sum, r) => sum + r.tokens.input, 0),
        output: runs.reduce((sum, r) => sum + r.tokens.output, 0)
      }
    };
  }

  /**
   * Clean up completed/failed runs older than retention period
   */
  async cleanup(retentionMs: number = 86400000): Promise<number> {
    const cutoff = Date.now() - retentionMs;
    let cleaned = 0;

    for (const [runId, run] of this.runs) {
      if (run.ended_at && new Date(run.ended_at).getTime() < cutoff) {
        this.runs.delete(runId);
        cleaned++;
      }
    }

    return cleaned;
  }
}

// ============================================================================
// ERROR CLASS
// ============================================================================

export class OrchestratorError extends Error {
  public readonly code: string;
  public readonly details?: Record<string, unknown>;

  constructor(message: string, code: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'OrchestratorError';
    this.code = code;
    this.details = details;
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let defaultOrchestrator: Orchestrator | null = null;

export function getOrchestrator(): Orchestrator {
  if (!defaultOrchestrator) {
    defaultOrchestrator = new Orchestrator();
  }
  return defaultOrchestrator;
}

export function setOrchestrator(orchestrator: Orchestrator): void {
  defaultOrchestrator = orchestrator;
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Quick run creation and execution
 */
export async function runAgent(
  agentConfig: AgentYAML | string,
  input: unknown,
  options?: {
    task_class?: string;
    mode?: string;
    zone?: 'red' | 'yellow' | 'green';
  }
): Promise<RunResult> {
  const orchestrator = getOrchestrator();

  const run = await orchestrator.createRun(agentConfig, {
    task_class: options?.task_class ?? 'default',
    mode: options?.mode ?? 'default',
    input,
    zone: options?.zone
  });

  await orchestrator.startRun(run.run_id);

  // Add user input as message
  await orchestrator.addMessage(run.run_id, {
    role: 'user',
    content: typeof input === 'string' ? input : JSON.stringify(input)
  });

  // Get completion
  const response = await orchestrator.getCompletion(run.run_id);

  // Complete run
  return orchestrator.completeRun(run.run_id, response.content);
}

/**
 * Load agent YAML and validate
 */
export async function loadAndValidateAgent(filePath: string): Promise<{
  valid: boolean;
  agent?: AgentYAML;
  errors?: string[];
}> {
  try {
    const agent = await loadAgentYAML(filePath);
    return { valid: true, agent };
  } catch (error) {
    return {
      valid: false,
      errors: [(error as Error).message]
    };
  }
}
