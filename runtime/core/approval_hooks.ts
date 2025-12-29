/**
 * approval_hooks.ts
 * Backend hooks for approval workflow lifecycle events
 * Enables real-time notifications, webhooks, and integrations
 */

import * as crypto from 'crypto';
import { ApprovalRequest, ApprovalToken, ApprovalZone } from './approvals';

// ============================================================================
// TYPES
// ============================================================================

export type ApprovalEventType =
  | 'requested'
  | 'approved'
  | 'rejected'
  | 'expired'
  | 'escalated'
  | 'used';

export interface ApprovalHookContext {
  /** Unique hook execution ID */
  execution_id: string;

  /** Event type being processed */
  event_type: ApprovalEventType;

  /** Timestamp of hook execution */
  timestamp: string;

  /** Trace ID for distributed tracing */
  trace_id?: string;

  /** Metadata for hook execution */
  metadata: Record<string, unknown>;
}

export interface ApprovalHookResult {
  /** Hook execution was successful */
  success: boolean;

  /** Error message if failed */
  error?: string;

  /** Duration in milliseconds */
  duration_ms: number;

  /** Additional data returned by hook */
  data?: Record<string, unknown>;
}

/**
 * ApprovalHook interface for lifecycle event handlers
 */
export interface ApprovalHook {
  /** Unique hook identifier */
  readonly id: string;

  /** Hook name for logging */
  readonly name: string;

  /** Priority (lower = earlier execution) */
  readonly priority: number;

  /** Whether this hook is enabled */
  enabled: boolean;

  /** Called when an approval is requested */
  onApprovalRequested?(
    request: ApprovalRequest,
    context: ApprovalHookContext
  ): Promise<ApprovalHookResult>;

  /** Called when an approval is approved */
  onApprovalApproved?(
    request: ApprovalRequest,
    token: string,
    context: ApprovalHookContext
  ): Promise<ApprovalHookResult>;

  /** Called when an approval is rejected */
  onApprovalRejected?(
    request: ApprovalRequest,
    reason: string | undefined,
    context: ApprovalHookContext
  ): Promise<ApprovalHookResult>;

  /** Called when an approval expires */
  onApprovalExpired?(
    request: ApprovalRequest,
    context: ApprovalHookContext
  ): Promise<ApprovalHookResult>;

  /** Called when an approval is escalated */
  onApprovalEscalated?(
    request: ApprovalRequest,
    escalateTo: string,
    context: ApprovalHookContext
  ): Promise<ApprovalHookResult>;
}

export interface HookExecutionMetrics {
  hook_id: string;
  hook_name: string;
  event_type: ApprovalEventType;
  success: boolean;
  duration_ms: number;
  error?: string;
  timestamp: string;
}

export interface ApprovalHooksConfig {
  /** Enable hook execution */
  enabled?: boolean;

  /** Continue on hook failure */
  continue_on_error?: boolean;

  /** Timeout for individual hooks (ms) */
  hook_timeout_ms?: number;

  /** Enable metrics collection */
  enable_metrics?: boolean;

  /** Max metrics history to retain */
  metrics_history_size?: number;

  /** Logger function */
  logger?: HookLogger;

  /** WebSocket configuration */
  websocket?: WebSocketHookConfig;

  /** Webhook configuration */
  webhook?: WebhookHookConfig;

  /** Email configuration */
  email?: EmailHookConfig;

  /** Slack configuration */
  slack?: SlackHookConfig;
}

export interface HookLogger {
  debug(message: string, data?: Record<string, unknown>): void;
  info(message: string, data?: Record<string, unknown>): void;
  warn(message: string, data?: Record<string, unknown>): void;
  error(message: string, data?: Record<string, unknown>): void;
}

// ============================================================================
// HOOK REGISTRY
// ============================================================================

export class ApprovalHookRegistry {
  private hooks: Map<string, ApprovalHook> = new Map();
  private config: Required<Omit<ApprovalHooksConfig, 'websocket' | 'webhook' | 'email' | 'slack'>> & {
    websocket?: WebSocketHookConfig;
    webhook?: WebhookHookConfig;
    email?: EmailHookConfig;
    slack?: SlackHookConfig;
  };
  private metricsHistory: HookExecutionMetrics[] = [];
  private defaultLogger: HookLogger = {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {}
  };

  constructor(config: ApprovalHooksConfig = {}) {
    this.config = {
      enabled: config.enabled ?? true,
      continue_on_error: config.continue_on_error ?? true,
      hook_timeout_ms: config.hook_timeout_ms ?? 5000,
      enable_metrics: config.enable_metrics ?? true,
      metrics_history_size: config.metrics_history_size ?? 1000,
      logger: config.logger ?? this.defaultLogger,
      websocket: config.websocket,
      webhook: config.webhook,
      email: config.email,
      slack: config.slack
    };
  }

  /**
   * Register a hook
   */
  register(hook: ApprovalHook): void {
    if (this.hooks.has(hook.id)) {
      throw new Error(`Hook with ID ${hook.id} already registered`);
    }
    this.hooks.set(hook.id, hook);
    this.config.logger!.info('Hook registered', { hook_id: hook.id, hook_name: hook.name });
  }

  /**
   * Unregister a hook
   */
  unregister(hookId: string): boolean {
    const removed = this.hooks.delete(hookId);
    if (removed) {
      this.config.logger!.info('Hook unregistered', { hook_id: hookId });
    }
    return removed;
  }

  /**
   * Get a hook by ID
   */
  get(hookId: string): ApprovalHook | undefined {
    return this.hooks.get(hookId);
  }

  /**
   * List all hooks sorted by priority
   */
  list(): ApprovalHook[] {
    return Array.from(this.hooks.values()).sort((a, b) => a.priority - b.priority);
  }

  /**
   * Enable/disable a hook
   */
  setEnabled(hookId: string, enabled: boolean): boolean {
    const hook = this.hooks.get(hookId);
    if (hook) {
      hook.enabled = enabled;
      this.config.logger!.info('Hook enabled state changed', { hook_id: hookId, enabled });
      return true;
    }
    return false;
  }

  /**
   * Execute hooks for approval requested event
   */
  async onApprovalRequested(request: ApprovalRequest): Promise<void> {
    await this.executeHooks('requested', request, async (hook, context) => {
      if (hook.onApprovalRequested) {
        return hook.onApprovalRequested(request, context);
      }
      return { success: true, duration_ms: 0 };
    });
  }

  /**
   * Execute hooks for approval approved event
   */
  async onApprovalApproved(request: ApprovalRequest, token: string): Promise<void> {
    await this.executeHooks('approved', request, async (hook, context) => {
      if (hook.onApprovalApproved) {
        return hook.onApprovalApproved(request, token, context);
      }
      return { success: true, duration_ms: 0 };
    });
  }

  /**
   * Execute hooks for approval rejected event
   */
  async onApprovalRejected(request: ApprovalRequest, reason?: string): Promise<void> {
    await this.executeHooks('rejected', request, async (hook, context) => {
      if (hook.onApprovalRejected) {
        return hook.onApprovalRejected(request, reason, context);
      }
      return { success: true, duration_ms: 0 };
    });
  }

  /**
   * Execute hooks for approval expired event
   */
  async onApprovalExpired(request: ApprovalRequest): Promise<void> {
    await this.executeHooks('expired', request, async (hook, context) => {
      if (hook.onApprovalExpired) {
        return hook.onApprovalExpired(request, context);
      }
      return { success: true, duration_ms: 0 };
    });
  }

  /**
   * Execute hooks for approval escalated event
   */
  async onApprovalEscalated(request: ApprovalRequest, escalateTo: string): Promise<void> {
    await this.executeHooks('escalated', request, async (hook, context) => {
      if (hook.onApprovalEscalated) {
        return hook.onApprovalEscalated(request, escalateTo, context);
      }
      return { success: true, duration_ms: 0 };
    });
  }

  /**
   * Get metrics history
   */
  getMetrics(): HookExecutionMetrics[] {
    return [...this.metricsHistory];
  }

  /**
   * Get metrics summary
   */
  getMetricsSummary(): {
    total_executions: number;
    success_count: number;
    failure_count: number;
    avg_duration_ms: number;
    by_hook: Record<string, { success: number; failure: number; avg_duration_ms: number }>;
    by_event: Record<string, { success: number; failure: number; avg_duration_ms: number }>;
  } {
    const summary = {
      total_executions: this.metricsHistory.length,
      success_count: 0,
      failure_count: 0,
      avg_duration_ms: 0,
      by_hook: {} as Record<string, { success: number; failure: number; avg_duration_ms: number }>,
      by_event: {} as Record<string, { success: number; failure: number; avg_duration_ms: number }>
    };

    let totalDuration = 0;

    for (const metric of this.metricsHistory) {
      if (metric.success) {
        summary.success_count++;
      } else {
        summary.failure_count++;
      }
      totalDuration += metric.duration_ms;

      // By hook
      if (!summary.by_hook[metric.hook_id]) {
        summary.by_hook[metric.hook_id] = { success: 0, failure: 0, avg_duration_ms: 0 };
      }
      const hookSummary = summary.by_hook[metric.hook_id];
      if (metric.success) {
        hookSummary.success++;
      } else {
        hookSummary.failure++;
      }

      // By event
      if (!summary.by_event[metric.event_type]) {
        summary.by_event[metric.event_type] = { success: 0, failure: 0, avg_duration_ms: 0 };
      }
      const eventSummary = summary.by_event[metric.event_type];
      if (metric.success) {
        eventSummary.success++;
      } else {
        eventSummary.failure++;
      }
    }

    summary.avg_duration_ms = summary.total_executions > 0
      ? totalDuration / summary.total_executions
      : 0;

    return summary;
  }

  /**
   * Clear metrics history
   */
  clearMetrics(): void {
    this.metricsHistory = [];
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private async executeHooks(
    eventType: ApprovalEventType,
    request: ApprovalRequest,
    executor: (hook: ApprovalHook, context: ApprovalHookContext) => Promise<ApprovalHookResult>
  ): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    const hooks = this.list().filter((h) => h.enabled);
    const executionId = this.generateExecutionId();

    for (const hook of hooks) {
      const context: ApprovalHookContext = {
        execution_id: executionId,
        event_type: eventType,
        timestamp: new Date().toISOString(),
        trace_id: request.metadata?.trace_id as string | undefined,
        metadata: {
          request_id: request.id,
          zone: request.zone,
          operation: request.operation
        }
      };

      const startTime = Date.now();

      try {
        const result = await this.executeWithTimeout(
          () => executor(hook, context),
          this.config.hook_timeout_ms
        );

        this.recordMetric({
          hook_id: hook.id,
          hook_name: hook.name,
          event_type: eventType,
          success: result.success,
          duration_ms: result.duration_ms || (Date.now() - startTime),
          error: result.error,
          timestamp: context.timestamp
        });

        if (!result.success) {
          this.config.logger!.warn('Hook execution failed', {
            hook_id: hook.id,
            event_type: eventType,
            error: result.error
          });

          if (!this.config.continue_on_error) {
            throw new HookExecutionError(hook.id, eventType, result.error);
          }
        }
      } catch (error) {
        const duration = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : String(error);

        this.recordMetric({
          hook_id: hook.id,
          hook_name: hook.name,
          event_type: eventType,
          success: false,
          duration_ms: duration,
          error: errorMessage,
          timestamp: context.timestamp
        });

        this.config.logger!.error('Hook execution threw error', {
          hook_id: hook.id,
          event_type: eventType,
          error: errorMessage
        });

        if (!this.config.continue_on_error) {
          throw error;
        }
      }
    }
  }

  private async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Hook execution timed out')), timeoutMs)
      )
    ]);
  }

  private generateExecutionId(): string {
    return `hook_exec_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  private recordMetric(metric: HookExecutionMetrics): void {
    if (!this.config.enable_metrics) {
      return;
    }

    this.metricsHistory.push(metric);

    // Trim history if needed
    if (this.metricsHistory.length > this.config.metrics_history_size) {
      this.metricsHistory = this.metricsHistory.slice(-this.config.metrics_history_size);
    }
  }
}

// ============================================================================
// HOOK EXECUTION ERROR
// ============================================================================

export class HookExecutionError extends Error {
  public readonly hookId: string;
  public readonly eventType: ApprovalEventType;

  constructor(hookId: string, eventType: ApprovalEventType, reason?: string) {
    super(reason ?? `Hook ${hookId} failed during ${eventType} event`);
    this.name = 'HookExecutionError';
    this.hookId = hookId;
    this.eventType = eventType;
  }
}

// ============================================================================
// WEBSOCKET APPROVAL HOOK
// ============================================================================

export interface WebSocketHookConfig {
  /** Broadcast function for WebSocket server */
  broadcast?: (channel: string, event: string, data: unknown) => Promise<void>;

  /** Channel prefix for approval events */
  channel_prefix?: string;

  /** Include full request in broadcast */
  include_full_request?: boolean;
}

export class WebSocketApprovalHook implements ApprovalHook {
  readonly id = 'websocket-approval-hook';
  readonly name = 'WebSocket Approval Hook';
  readonly priority = 10;
  enabled = true;

  private config: Required<WebSocketHookConfig>;

  constructor(config: WebSocketHookConfig = {}) {
    this.config = {
      broadcast: config.broadcast ?? (async () => {}),
      channel_prefix: config.channel_prefix ?? 'approvals',
      include_full_request: config.include_full_request ?? false
    };
  }

  async onApprovalRequested(
    request: ApprovalRequest,
    context: ApprovalHookContext
  ): Promise<ApprovalHookResult> {
    const startTime = Date.now();
    try {
      await this.config.broadcast(
        `${this.config.channel_prefix}:${request.zone}`,
        'approval:requested',
        this.buildPayload(request, context)
      );
      return { success: true, duration_ms: Date.now() - startTime };
    } catch (error) {
      return {
        success: false,
        duration_ms: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async onApprovalApproved(
    request: ApprovalRequest,
    token: string,
    context: ApprovalHookContext
  ): Promise<ApprovalHookResult> {
    const startTime = Date.now();
    try {
      await this.config.broadcast(
        `${this.config.channel_prefix}:${request.zone}`,
        'approval:approved',
        { ...this.buildPayload(request, context), has_token: true }
      );
      return { success: true, duration_ms: Date.now() - startTime };
    } catch (error) {
      return {
        success: false,
        duration_ms: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async onApprovalRejected(
    request: ApprovalRequest,
    reason: string | undefined,
    context: ApprovalHookContext
  ): Promise<ApprovalHookResult> {
    const startTime = Date.now();
    try {
      await this.config.broadcast(
        `${this.config.channel_prefix}:${request.zone}`,
        'approval:rejected',
        { ...this.buildPayload(request, context), reason }
      );
      return { success: true, duration_ms: Date.now() - startTime };
    } catch (error) {
      return {
        success: false,
        duration_ms: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async onApprovalExpired(
    request: ApprovalRequest,
    context: ApprovalHookContext
  ): Promise<ApprovalHookResult> {
    const startTime = Date.now();
    try {
      await this.config.broadcast(
        `${this.config.channel_prefix}:${request.zone}`,
        'approval:expired',
        this.buildPayload(request, context)
      );
      return { success: true, duration_ms: Date.now() - startTime };
    } catch (error) {
      return {
        success: false,
        duration_ms: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async onApprovalEscalated(
    request: ApprovalRequest,
    escalateTo: string,
    context: ApprovalHookContext
  ): Promise<ApprovalHookResult> {
    const startTime = Date.now();
    try {
      await this.config.broadcast(
        `${this.config.channel_prefix}:${request.zone}`,
        'approval:escalated',
        { ...this.buildPayload(request, context), escalate_to: escalateTo }
      );
      return { success: true, duration_ms: Date.now() - startTime };
    } catch (error) {
      return {
        success: false,
        duration_ms: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private buildPayload(request: ApprovalRequest, context: ApprovalHookContext): Record<string, unknown> {
    if (this.config.include_full_request) {
      return { request, context };
    }
    return {
      request_id: request.id,
      operation: request.operation,
      resource: request.resource,
      zone: request.zone,
      requester_id: request.requester_id,
      status: request.status,
      created_at: request.created_at,
      expires_at: request.expires_at,
      execution_id: context.execution_id
    };
  }
}

// ============================================================================
// WEBHOOK APPROVAL HOOK
// ============================================================================

export interface WebhookHookConfig {
  /** Webhook URL */
  url?: string;

  /** HTTP method */
  method?: 'POST' | 'PUT';

  /** Additional headers */
  headers?: Record<string, string>;

  /** Secret for HMAC signature */
  secret?: string;

  /** Timeout in milliseconds */
  timeout_ms?: number;

  /** Retry count on failure */
  retry_count?: number;

  /** Events to send webhooks for */
  events?: ApprovalEventType[];
}

export class WebhookApprovalHook implements ApprovalHook {
  readonly id = 'webhook-approval-hook';
  readonly name = 'Webhook Approval Hook';
  readonly priority = 20;
  enabled = true;

  private config: Required<WebhookHookConfig>;

  constructor(config: WebhookHookConfig = {}) {
    this.config = {
      url: config.url ?? '',
      method: config.method ?? 'POST',
      headers: config.headers ?? {},
      secret: config.secret ?? '',
      timeout_ms: config.timeout_ms ?? 5000,
      retry_count: config.retry_count ?? 2,
      events: config.events ?? ['requested', 'approved', 'rejected', 'expired', 'escalated']
    };
  }

  async onApprovalRequested(
    request: ApprovalRequest,
    context: ApprovalHookContext
  ): Promise<ApprovalHookResult> {
    if (!this.config.events.includes('requested')) {
      return { success: true, duration_ms: 0 };
    }
    return this.sendWebhook('requested', { request }, context);
  }

  async onApprovalApproved(
    request: ApprovalRequest,
    token: string,
    context: ApprovalHookContext
  ): Promise<ApprovalHookResult> {
    if (!this.config.events.includes('approved')) {
      return { success: true, duration_ms: 0 };
    }
    // Never send the actual token in webhooks for security
    return this.sendWebhook('approved', { request, has_token: true }, context);
  }

  async onApprovalRejected(
    request: ApprovalRequest,
    reason: string | undefined,
    context: ApprovalHookContext
  ): Promise<ApprovalHookResult> {
    if (!this.config.events.includes('rejected')) {
      return { success: true, duration_ms: 0 };
    }
    return this.sendWebhook('rejected', { request, reason }, context);
  }

  async onApprovalExpired(
    request: ApprovalRequest,
    context: ApprovalHookContext
  ): Promise<ApprovalHookResult> {
    if (!this.config.events.includes('expired')) {
      return { success: true, duration_ms: 0 };
    }
    return this.sendWebhook('expired', { request }, context);
  }

  async onApprovalEscalated(
    request: ApprovalRequest,
    escalateTo: string,
    context: ApprovalHookContext
  ): Promise<ApprovalHookResult> {
    if (!this.config.events.includes('escalated')) {
      return { success: true, duration_ms: 0 };
    }
    return this.sendWebhook('escalated', { request, escalate_to: escalateTo }, context);
  }

  private async sendWebhook(
    eventType: ApprovalEventType,
    payload: Record<string, unknown>,
    context: ApprovalHookContext
  ): Promise<ApprovalHookResult> {
    if (!this.config.url) {
      return { success: true, duration_ms: 0, data: { skipped: 'no_url' } };
    }

    const startTime = Date.now();
    const body = JSON.stringify({
      event: `approval.${eventType}`,
      timestamp: context.timestamp,
      execution_id: context.execution_id,
      ...payload
    });

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Approval-Event': eventType,
      'X-Execution-ID': context.execution_id,
      ...this.config.headers
    };

    // Add HMAC signature if secret is configured
    if (this.config.secret) {
      const signature = crypto
        .createHmac('sha256', this.config.secret)
        .update(body)
        .digest('hex');
      headers['X-Signature-256'] = `sha256=${signature}`;
    }

    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= this.config.retry_count; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.config.timeout_ms);

        const response = await fetch(this.config.url, {
          method: this.config.method,
          headers,
          body,
          signal: controller.signal
        });

        clearTimeout(timeout);

        if (response.ok) {
          return {
            success: true,
            duration_ms: Date.now() - startTime,
            data: { status: response.status, attempt }
          };
        }

        lastError = new Error(`Webhook returned ${response.status}: ${response.statusText}`);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
      }

      // Wait before retry (exponential backoff)
      if (attempt < this.config.retry_count) {
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 100));
      }
    }

    return {
      success: false,
      duration_ms: Date.now() - startTime,
      error: lastError?.message ?? 'Unknown error'
    };
  }
}

// ============================================================================
// EMAIL APPROVAL HOOK
// ============================================================================

export interface EmailHookConfig {
  /** Email sending function */
  sendEmail?: (params: {
    to: string[];
    subject: string;
    body: string;
    html?: string;
  }) => Promise<void>;

  /** Recipients for approval notifications */
  recipients?: string[];

  /** Recipients by zone */
  recipients_by_zone?: {
    red?: string[];
    yellow?: string[];
    green?: string[];
  };

  /** Email subject prefix */
  subject_prefix?: string;

  /** Events to send emails for */
  events?: ApprovalEventType[];
}

export class EmailApprovalHook implements ApprovalHook {
  readonly id = 'email-approval-hook';
  readonly name = 'Email Approval Hook';
  readonly priority = 30;
  enabled = true;

  private config: Required<EmailHookConfig>;

  constructor(config: EmailHookConfig = {}) {
    this.config = {
      sendEmail: config.sendEmail ?? (async () => {}),
      recipients: config.recipients ?? [],
      recipients_by_zone: config.recipients_by_zone ?? {},
      subject_prefix: config.subject_prefix ?? '[AgentOS Approval]',
      events: config.events ?? ['requested', 'escalated']
    };
  }

  async onApprovalRequested(
    request: ApprovalRequest,
    context: ApprovalHookContext
  ): Promise<ApprovalHookResult> {
    if (!this.config.events.includes('requested')) {
      return { success: true, duration_ms: 0 };
    }

    const recipients = this.getRecipients(request.zone);
    if (recipients.length === 0) {
      return { success: true, duration_ms: 0, data: { skipped: 'no_recipients' } };
    }

    return this.sendNotification(
      recipients,
      `Approval Required: ${request.operation}`,
      this.buildRequestedBody(request),
      this.buildRequestedHtml(request)
    );
  }

  async onApprovalApproved(
    request: ApprovalRequest,
    token: string,
    context: ApprovalHookContext
  ): Promise<ApprovalHookResult> {
    if (!this.config.events.includes('approved')) {
      return { success: true, duration_ms: 0 };
    }

    const recipients = this.getRecipients(request.zone);
    if (recipients.length === 0) {
      return { success: true, duration_ms: 0, data: { skipped: 'no_recipients' } };
    }

    return this.sendNotification(
      recipients,
      `Approved: ${request.operation}`,
      `Request ${request.id} has been approved by ${request.reviewed_by}.`,
      undefined
    );
  }

  async onApprovalRejected(
    request: ApprovalRequest,
    reason: string | undefined,
    context: ApprovalHookContext
  ): Promise<ApprovalHookResult> {
    if (!this.config.events.includes('rejected')) {
      return { success: true, duration_ms: 0 };
    }

    const recipients = this.getRecipients(request.zone);
    if (recipients.length === 0) {
      return { success: true, duration_ms: 0, data: { skipped: 'no_recipients' } };
    }

    return this.sendNotification(
      recipients,
      `Rejected: ${request.operation}`,
      `Request ${request.id} has been rejected by ${request.reviewed_by}.\nReason: ${reason ?? 'No reason provided'}`,
      undefined
    );
  }

  async onApprovalExpired(
    request: ApprovalRequest,
    context: ApprovalHookContext
  ): Promise<ApprovalHookResult> {
    if (!this.config.events.includes('expired')) {
      return { success: true, duration_ms: 0 };
    }

    const recipients = this.getRecipients(request.zone);
    if (recipients.length === 0) {
      return { success: true, duration_ms: 0, data: { skipped: 'no_recipients' } };
    }

    return this.sendNotification(
      recipients,
      `Expired: ${request.operation}`,
      `Request ${request.id} has expired without a decision.`,
      undefined
    );
  }

  async onApprovalEscalated(
    request: ApprovalRequest,
    escalateTo: string,
    context: ApprovalHookContext
  ): Promise<ApprovalHookResult> {
    if (!this.config.events.includes('escalated')) {
      return { success: true, duration_ms: 0 };
    }

    // For escalation, send to the escalation target
    const recipients = [escalateTo, ...this.getRecipients(request.zone)];
    const uniqueRecipients = [...new Set(recipients)];

    return this.sendNotification(
      uniqueRecipients,
      `ESCALATION: ${request.operation}`,
      this.buildEscalatedBody(request, escalateTo),
      this.buildEscalatedHtml(request, escalateTo)
    );
  }

  private getRecipients(zone: ApprovalZone): string[] {
    const zoneRecipients = this.config.recipients_by_zone[zone] ?? [];
    return [...new Set([...this.config.recipients, ...zoneRecipients])];
  }

  private async sendNotification(
    recipients: string[],
    subject: string,
    body: string,
    html?: string
  ): Promise<ApprovalHookResult> {
    const startTime = Date.now();
    try {
      await this.config.sendEmail({
        to: recipients,
        subject: `${this.config.subject_prefix} ${subject}`,
        body,
        html
      });
      return { success: true, duration_ms: Date.now() - startTime };
    } catch (error) {
      return {
        success: false,
        duration_ms: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private buildRequestedBody(request: ApprovalRequest): string {
    return [
      `Approval Request: ${request.id}`,
      ``,
      `Operation: ${request.operation}`,
      `Resource: ${request.resource}`,
      `Zone: ${request.zone.toUpperCase()}`,
      `Requester: ${request.requester_id} (${request.requester_type})`,
      ``,
      `Justification:`,
      request.justification,
      ``,
      `Expires: ${request.expires_at}`,
      ``,
      `Please review and approve/reject this request.`
    ].join('\n');
  }

  private buildRequestedHtml(request: ApprovalRequest): string {
    const zoneColor = request.zone === 'red' ? '#dc2626' : request.zone === 'yellow' ? '#ca8a04' : '#16a34a';
    return `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1f2937;">Approval Request</h2>
        <div style="background: ${zoneColor}; color: white; padding: 8px 16px; border-radius: 4px; display: inline-block; margin-bottom: 16px;">
          ${request.zone.toUpperCase()} ZONE
        </div>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Request ID</strong></td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${request.id}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Operation</strong></td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${request.operation}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Resource</strong></td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${request.resource}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Requester</strong></td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${request.requester_id} (${request.requester_type})</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Expires</strong></td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${request.expires_at}</td></tr>
        </table>
        <div style="margin-top: 16px; padding: 16px; background: #f3f4f6; border-radius: 4px;">
          <strong>Justification:</strong><br>${request.justification}
        </div>
      </div>
    `;
  }

  private buildEscalatedBody(request: ApprovalRequest, escalateTo: string): string {
    return [
      `ESCALATED APPROVAL REQUEST: ${request.id}`,
      ``,
      `This request has been escalated to: ${escalateTo}`,
      ``,
      `Operation: ${request.operation}`,
      `Resource: ${request.resource}`,
      `Zone: ${request.zone.toUpperCase()}`,
      `Requester: ${request.requester_id} (${request.requester_type})`,
      ``,
      `Justification:`,
      request.justification,
      ``,
      `Expires: ${request.expires_at}`,
      ``,
      `URGENT: Please review and take action immediately.`
    ].join('\n');
  }

  private buildEscalatedHtml(request: ApprovalRequest, escalateTo: string): string {
    const zoneColor = request.zone === 'red' ? '#dc2626' : request.zone === 'yellow' ? '#ca8a04' : '#16a34a';
    return `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #dc2626; color: white; padding: 12px 16px; border-radius: 4px; margin-bottom: 16px;">
          <strong>ESCALATED APPROVAL REQUEST</strong>
        </div>
        <p style="color: #dc2626; font-weight: bold;">Escalated to: ${escalateTo}</p>
        <div style="background: ${zoneColor}; color: white; padding: 8px 16px; border-radius: 4px; display: inline-block; margin-bottom: 16px;">
          ${request.zone.toUpperCase()} ZONE
        </div>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Request ID</strong></td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${request.id}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Operation</strong></td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${request.operation}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Resource</strong></td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${request.resource}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Requester</strong></td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${request.requester_id} (${request.requester_type})</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Expires</strong></td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${request.expires_at}</td></tr>
        </table>
        <div style="margin-top: 16px; padding: 16px; background: #fef2f2; border: 1px solid #dc2626; border-radius: 4px;">
          <strong>Justification:</strong><br>${request.justification}
        </div>
        <p style="color: #dc2626; margin-top: 16px;"><strong>URGENT: Please review and take action immediately.</strong></p>
      </div>
    `;
  }
}

// ============================================================================
// SLACK APPROVAL HOOK
// ============================================================================

export interface SlackHookConfig {
  /** Slack webhook URL */
  webhook_url?: string;

  /** Slack API token for interactive messages */
  api_token?: string;

  /** Default channel for notifications */
  channel?: string;

  /** Channels by zone */
  channels_by_zone?: {
    red?: string;
    yellow?: string;
    green?: string;
  };

  /** Events to send Slack notifications for */
  events?: ApprovalEventType[];

  /** Include action buttons (requires api_token) */
  include_actions?: boolean;
}

export class SlackApprovalHook implements ApprovalHook {
  readonly id = 'slack-approval-hook';
  readonly name = 'Slack Approval Hook';
  readonly priority = 25;
  enabled = true;

  private config: Required<SlackHookConfig>;

  constructor(config: SlackHookConfig = {}) {
    this.config = {
      webhook_url: config.webhook_url ?? '',
      api_token: config.api_token ?? '',
      channel: config.channel ?? '',
      channels_by_zone: config.channels_by_zone ?? {},
      events: config.events ?? ['requested', 'approved', 'rejected', 'escalated'],
      include_actions: config.include_actions ?? false
    };
  }

  async onApprovalRequested(
    request: ApprovalRequest,
    context: ApprovalHookContext
  ): Promise<ApprovalHookResult> {
    if (!this.config.events.includes('requested')) {
      return { success: true, duration_ms: 0 };
    }
    return this.sendSlackMessage(
      request.zone,
      this.buildRequestedBlocks(request, context)
    );
  }

  async onApprovalApproved(
    request: ApprovalRequest,
    token: string,
    context: ApprovalHookContext
  ): Promise<ApprovalHookResult> {
    if (!this.config.events.includes('approved')) {
      return { success: true, duration_ms: 0 };
    }
    return this.sendSlackMessage(
      request.zone,
      this.buildDecisionBlocks(request, 'approved', context)
    );
  }

  async onApprovalRejected(
    request: ApprovalRequest,
    reason: string | undefined,
    context: ApprovalHookContext
  ): Promise<ApprovalHookResult> {
    if (!this.config.events.includes('rejected')) {
      return { success: true, duration_ms: 0 };
    }
    return this.sendSlackMessage(
      request.zone,
      this.buildDecisionBlocks(request, 'rejected', context, reason)
    );
  }

  async onApprovalExpired(
    request: ApprovalRequest,
    context: ApprovalHookContext
  ): Promise<ApprovalHookResult> {
    if (!this.config.events.includes('expired')) {
      return { success: true, duration_ms: 0 };
    }
    return this.sendSlackMessage(
      request.zone,
      this.buildExpiredBlocks(request, context)
    );
  }

  async onApprovalEscalated(
    request: ApprovalRequest,
    escalateTo: string,
    context: ApprovalHookContext
  ): Promise<ApprovalHookResult> {
    if (!this.config.events.includes('escalated')) {
      return { success: true, duration_ms: 0 };
    }
    return this.sendSlackMessage(
      request.zone,
      this.buildEscalatedBlocks(request, escalateTo, context)
    );
  }

  private getChannel(zone: ApprovalZone): string {
    return this.config.channels_by_zone[zone] ?? this.config.channel;
  }

  private async sendSlackMessage(
    zone: ApprovalZone,
    blocks: unknown[]
  ): Promise<ApprovalHookResult> {
    if (!this.config.webhook_url) {
      return { success: true, duration_ms: 0, data: { skipped: 'no_webhook_url' } };
    }

    const startTime = Date.now();
    const channel = this.getChannel(zone);

    try {
      const response = await fetch(this.config.webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: channel || undefined,
          blocks
        })
      });

      if (!response.ok) {
        throw new Error(`Slack returned ${response.status}`);
      }

      return { success: true, duration_ms: Date.now() - startTime };
    } catch (error) {
      return {
        success: false,
        duration_ms: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private getZoneEmoji(zone: ApprovalZone): string {
    switch (zone) {
      case 'red': return ':red_circle:';
      case 'yellow': return ':large_yellow_circle:';
      case 'green': return ':large_green_circle:';
    }
  }

  private buildRequestedBlocks(request: ApprovalRequest, context: ApprovalHookContext): unknown[] {
    const blocks: unknown[] = [
      {
        type: 'header',
        text: { type: 'plain_text', text: `${this.getZoneEmoji(request.zone)} Approval Required`, emoji: true }
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Operation:*\n${request.operation}` },
          { type: 'mrkdwn', text: `*Resource:*\n${request.resource}` },
          { type: 'mrkdwn', text: `*Zone:*\n${request.zone.toUpperCase()}` },
          { type: 'mrkdwn', text: `*Requester:*\n${request.requester_id}` }
        ]
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `*Justification:*\n${request.justification}` }
      },
      {
        type: 'context',
        elements: [
          { type: 'mrkdwn', text: `Request ID: \`${request.id}\` | Expires: ${request.expires_at}` }
        ]
      }
    ];

    if (this.config.include_actions && this.config.api_token) {
      blocks.push({
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: 'Approve', emoji: true },
            style: 'primary',
            action_id: `approve_${request.id}`
          },
          {
            type: 'button',
            text: { type: 'plain_text', text: 'Reject', emoji: true },
            style: 'danger',
            action_id: `reject_${request.id}`
          }
        ]
      });
    }

    return blocks;
  }

  private buildDecisionBlocks(
    request: ApprovalRequest,
    decision: 'approved' | 'rejected',
    context: ApprovalHookContext,
    reason?: string
  ): unknown[] {
    const emoji = decision === 'approved' ? ':white_check_mark:' : ':x:';
    const color = decision === 'approved' ? 'good' : 'danger';

    return [
      {
        type: 'header',
        text: { type: 'plain_text', text: `${emoji} Request ${decision.charAt(0).toUpperCase() + decision.slice(1)}`, emoji: true }
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Operation:*\n${request.operation}` },
          { type: 'mrkdwn', text: `*Reviewed by:*\n${request.reviewed_by}` }
        ]
      },
      ...(reason ? [{
        type: 'section',
        text: { type: 'mrkdwn', text: `*Reason:*\n${reason}` }
      }] : []),
      {
        type: 'context',
        elements: [
          { type: 'mrkdwn', text: `Request ID: \`${request.id}\`` }
        ]
      }
    ];
  }

  private buildExpiredBlocks(request: ApprovalRequest, context: ApprovalHookContext): unknown[] {
    return [
      {
        type: 'header',
        text: { type: 'plain_text', text: ':hourglass: Request Expired', emoji: true }
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Operation:*\n${request.operation}` },
          { type: 'mrkdwn', text: `*Resource:*\n${request.resource}` }
        ]
      },
      {
        type: 'context',
        elements: [
          { type: 'mrkdwn', text: `Request ID: \`${request.id}\` | Expired at: ${request.expires_at}` }
        ]
      }
    ];
  }

  private buildEscalatedBlocks(
    request: ApprovalRequest,
    escalateTo: string,
    context: ApprovalHookContext
  ): unknown[] {
    return [
      {
        type: 'header',
        text: { type: 'plain_text', text: ':rotating_light: ESCALATED Approval Request', emoji: true }
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `*Escalated to:* <@${escalateTo}>` }
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Operation:*\n${request.operation}` },
          { type: 'mrkdwn', text: `*Resource:*\n${request.resource}` },
          { type: 'mrkdwn', text: `*Zone:*\n${request.zone.toUpperCase()}` },
          { type: 'mrkdwn', text: `*Requester:*\n${request.requester_id}` }
        ]
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `*Justification:*\n${request.justification}` }
      },
      {
        type: 'context',
        elements: [
          { type: 'mrkdwn', text: `Request ID: \`${request.id}\` | Expires: ${request.expires_at}` }
        ]
      }
    ];
  }
}

// ============================================================================
// FACTORY AND SINGLETON
// ============================================================================

let defaultRegistry: ApprovalHookRegistry | null = null;

/**
 * Get the default approval hook registry
 */
export function getApprovalHookRegistry(): ApprovalHookRegistry {
  if (!defaultRegistry) {
    defaultRegistry = new ApprovalHookRegistry();
  }
  return defaultRegistry;
}

/**
 * Set the default approval hook registry
 */
export function setApprovalHookRegistry(registry: ApprovalHookRegistry): void {
  defaultRegistry = registry;
}

/**
 * Create a configured hook registry from environment/config
 */
export function createApprovalHookRegistry(config: ApprovalHooksConfig = {}): ApprovalHookRegistry {
  const registry = new ApprovalHookRegistry(config);

  // Register WebSocket hook if configured
  if (config.websocket) {
    registry.register(new WebSocketApprovalHook(config.websocket));
  }

  // Register Webhook hook if configured
  if (config.webhook?.url) {
    registry.register(new WebhookApprovalHook(config.webhook));
  }

  // Register Email hook if configured
  if (config.email?.sendEmail || config.email?.recipients?.length) {
    registry.register(new EmailApprovalHook(config.email));
  }

  // Register Slack hook if configured
  if (config.slack?.webhook_url) {
    registry.register(new SlackApprovalHook(config.slack));
  }

  return registry;
}

/**
 * Wire approval hooks to ApprovalManager callbacks
 */
export function wireApprovalHooks(
  registry: ApprovalHookRegistry
): {
  on_approval_required: (request: ApprovalRequest) => Promise<void>;
  on_approval_decision: (request: ApprovalRequest) => Promise<void>;
} {
  return {
    on_approval_required: async (request: ApprovalRequest) => {
      await registry.onApprovalRequested(request);
    },
    on_approval_decision: async (request: ApprovalRequest) => {
      if (request.status === 'approved' && request.token) {
        await registry.onApprovalApproved(request, request.token);
      } else if (request.status === 'rejected') {
        await registry.onApprovalRejected(request, request.review_notes);
      } else if (request.status === 'expired') {
        await registry.onApprovalExpired(request);
      }
    }
  };
}
