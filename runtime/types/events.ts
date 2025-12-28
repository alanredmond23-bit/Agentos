/**
 * events.ts
 * Event type definitions for audit, workflow, and system events
 */

// ============================================================================
// BASE EVENT TYPES
// ============================================================================

export type EventSeverity = 'debug' | 'info' | 'warning' | 'error' | 'critical';
export type EventCategory = 'audit' | 'workflow' | 'system' | 'security' | 'performance' | 'billing';

export interface BaseEvent {
  /** Unique event ID (UUID v4) */
  id: string;

  /** ISO 8601 timestamp */
  timestamp: string;

  /** Event type identifier */
  type: string;

  /** Event category */
  category: EventCategory;

  /** Severity level */
  severity: EventSeverity;

  /** Source agent or system component */
  source: string;

  /** Correlation ID for tracing */
  correlation_id?: string;

  /** Parent event ID if part of chain */
  parent_id?: string;

  /** Session or run ID */
  session_id?: string;

  /** Environment (production, staging, development) */
  environment?: string;

  /** Event version for schema evolution */
  version: string;
}

// ============================================================================
// AUDIT EVENTS
// ============================================================================

export type AuditAction =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'execute'
  | 'approve'
  | 'reject'
  | 'login'
  | 'logout'
  | 'escalate'
  | 'delegate'
  | 'supersede'
  | 'rollback';

export interface AuditActor {
  /** Actor type */
  type: 'agent' | 'user' | 'system' | 'api';

  /** Actor identifier */
  id: string;

  /** Display name */
  name?: string;

  /** IP address (if applicable) */
  ip_address?: string;

  /** User agent (if applicable) */
  user_agent?: string;

  /** Authority level at time of action */
  authority_level?: string;
}

export interface AuditResource {
  /** Resource type */
  type: string;

  /** Resource identifier */
  id: string;

  /** Resource name */
  name?: string;

  /** Parent resource */
  parent?: {
    type: string;
    id: string;
  };
}

export interface AuditEvent extends BaseEvent {
  category: 'audit';

  /** Audit action type */
  action: AuditAction;

  /** Actor performing the action */
  actor: AuditActor;

  /** Resource being acted upon */
  resource: AuditResource;

  /** Zone of operation */
  zone: 'red' | 'yellow' | 'green';

  /** Whether action was successful */
  success: boolean;

  /** Error details if failed */
  error?: {
    code: string;
    message: string;
    stack?: string;
  };

  /** Duration of operation in ms */
  duration_ms?: number;

  /** State before action (redacted) */
  before?: Record<string, unknown>;

  /** State after action (redacted) */
  after?: Record<string, unknown>;

  /** Additional metadata */
  metadata?: Record<string, unknown>;

  /** PII fields that were redacted */
  redacted_fields?: string[];

  /** Checksum for integrity */
  checksum?: string;
}

// ============================================================================
// WORKFLOW EVENTS
// ============================================================================

export type WorkflowStatus =
  | 'pending'
  | 'queued'
  | 'running'
  | 'paused'
  | 'waiting_approval'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'timeout';

export type TaskStatus =
  | 'pending'
  | 'scheduled'
  | 'running'
  | 'retrying'
  | 'waiting'
  | 'completed'
  | 'failed'
  | 'skipped'
  | 'cancelled';

export interface WorkflowEvent extends BaseEvent {
  category: 'workflow';

  /** Workflow identifier */
  workflow_id: string;

  /** Workflow name */
  workflow_name: string;

  /** Current status */
  status: WorkflowStatus;

  /** Previous status */
  previous_status?: WorkflowStatus;

  /** Agent executing the workflow */
  agent_id: string;

  /** Task details if task-level event */
  task?: {
    id: string;
    name: string;
    status: TaskStatus;
    attempt: number;
    max_attempts: number;
    started_at?: string;
    completed_at?: string;
    error?: string;
  };

  /** Workflow progress */
  progress?: {
    current_step: number;
    total_steps: number;
    percent_complete: number;
  };

  /** Input parameters (redacted) */
  input?: Record<string, unknown>;

  /** Output results (redacted) */
  output?: Record<string, unknown>;

  /** Resource utilization */
  resources?: {
    tokens_used?: number;
    api_calls?: number;
    duration_ms?: number;
    cost_usd?: number;
  };
}

// ============================================================================
// SYSTEM EVENTS
// ============================================================================

export type SystemEventType =
  | 'startup'
  | 'shutdown'
  | 'health_check'
  | 'config_change'
  | 'deployment'
  | 'migration'
  | 'cache_clear'
  | 'rate_limit'
  | 'circuit_breaker'
  | 'failover';

export interface SystemEvent extends BaseEvent {
  category: 'system';

  /** System event type */
  event_type: SystemEventType;

  /** Component affected */
  component: string;

  /** Current health status */
  health?: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    latency_ms?: number;
    error_rate?: number;
    uptime_seconds?: number;
  };

  /** Configuration changes */
  config_change?: {
    key: string;
    old_value?: unknown;
    new_value?: unknown;
  };

  /** Rate limit details */
  rate_limit?: {
    limit: number;
    remaining: number;
    reset_at: string;
    resource: string;
  };

  /** Circuit breaker state */
  circuit_breaker?: {
    state: 'closed' | 'open' | 'half_open';
    failure_count: number;
    success_count: number;
    last_failure?: string;
  };
}

// ============================================================================
// SECURITY EVENTS
// ============================================================================

export type SecurityEventType =
  | 'auth_success'
  | 'auth_failure'
  | 'permission_denied'
  | 'token_refresh'
  | 'token_revoke'
  | 'secret_access'
  | 'pii_access'
  | 'anomaly_detected'
  | 'intrusion_attempt'
  | 'policy_violation';

export interface SecurityEvent extends BaseEvent {
  category: 'security';

  /** Security event type */
  event_type: SecurityEventType;

  /** Actor involved */
  actor?: AuditActor;

  /** Threat level */
  threat_level?: 'low' | 'medium' | 'high' | 'critical';

  /** Authentication details */
  auth?: {
    method: string;
    success: boolean;
    failure_reason?: string;
    mfa_used?: boolean;
  };

  /** Access control details */
  access?: {
    resource: string;
    permission: string;
    granted: boolean;
    policy?: string;
  };

  /** Anomaly detection details */
  anomaly?: {
    type: string;
    score: number;
    threshold: number;
    indicators: string[];
  };

  /** Remediation actions taken */
  remediation?: {
    action: string;
    automated: boolean;
    success: boolean;
  };
}

// ============================================================================
// PERFORMANCE EVENTS
// ============================================================================

export interface PerformanceEvent extends BaseEvent {
  category: 'performance';

  /** Metric name */
  metric: string;

  /** Metric value */
  value: number;

  /** Metric unit */
  unit: string;

  /** Resource measured */
  resource: string;

  /** Threshold breached (if any) */
  threshold?: {
    warning?: number;
    critical?: number;
    breached?: 'warning' | 'critical';
  };

  /** Statistical context */
  stats?: {
    min?: number;
    max?: number;
    avg?: number;
    p50?: number;
    p95?: number;
    p99?: number;
  };
}

// ============================================================================
// BILLING EVENTS
// ============================================================================

export interface BillingEvent extends BaseEvent {
  category: 'billing';

  /** Transaction type */
  transaction_type: 'charge' | 'credit' | 'refund' | 'estimate';

  /** Amount in USD */
  amount_usd: number;

  /** Currency (always USD for now) */
  currency: 'USD';

  /** Resource being billed */
  resource: {
    type: 'tokens' | 'api_call' | 'storage' | 'compute';
    provider: string;
    model?: string;
    quantity: number;
    unit: string;
  };

  /** Cost breakdown */
  breakdown?: {
    input_tokens?: number;
    output_tokens?: number;
    input_cost?: number;
    output_cost?: number;
    base_cost?: number;
    markup?: number;
  };

  /** Budget impact */
  budget?: {
    daily_limit?: number;
    daily_used?: number;
    monthly_limit?: number;
    monthly_used?: number;
  };
}

// ============================================================================
// EVENT UNIONS AND UTILITIES
// ============================================================================

export type RuntimeEvent =
  | AuditEvent
  | WorkflowEvent
  | SystemEvent
  | SecurityEvent
  | PerformanceEvent
  | BillingEvent;

export interface EventFilter {
  categories?: EventCategory[];
  severities?: EventSeverity[];
  sources?: string[];
  types?: string[];
  start_time?: string;
  end_time?: string;
  correlation_id?: string;
  session_id?: string;
  limit?: number;
  offset?: number;
}

export interface EventSubscription {
  id: string;
  filter: EventFilter;
  callback: (event: RuntimeEvent) => void | Promise<void>;
  created_at: string;
  active: boolean;
}

// ============================================================================
// EVENT FACTORY FUNCTIONS
// ============================================================================

export function createEventId(): string {
  // UUID v4 generation
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function createBaseEvent(
  type: string,
  category: EventCategory,
  severity: EventSeverity,
  source: string
): BaseEvent {
  return {
    id: createEventId(),
    timestamp: new Date().toISOString(),
    type,
    category,
    severity,
    source,
    version: '1.0.0'
  };
}

export function createAuditEvent(
  action: AuditAction,
  actor: AuditActor,
  resource: AuditResource,
  zone: 'red' | 'yellow' | 'green',
  success: boolean,
  options?: Partial<AuditEvent>
): AuditEvent {
  return {
    ...createBaseEvent(`audit.${action}`, 'audit', success ? 'info' : 'error', actor.id),
    action,
    actor,
    resource,
    zone,
    success,
    ...options
  } as AuditEvent;
}

export function createWorkflowEvent(
  workflow_id: string,
  workflow_name: string,
  status: WorkflowStatus,
  agent_id: string,
  options?: Partial<WorkflowEvent>
): WorkflowEvent {
  return {
    ...createBaseEvent(`workflow.${status}`, 'workflow', 'info', agent_id),
    workflow_id,
    workflow_name,
    status,
    agent_id,
    ...options
  } as WorkflowEvent;
}

export function createSecurityEvent(
  event_type: SecurityEventType,
  severity: EventSeverity,
  source: string,
  options?: Partial<SecurityEvent>
): SecurityEvent {
  return {
    ...createBaseEvent(`security.${event_type}`, 'security', severity, source),
    event_type,
    ...options
  } as SecurityEvent;
}

export function createBillingEvent(
  transaction_type: 'charge' | 'credit' | 'refund' | 'estimate',
  amount_usd: number,
  resource: BillingEvent['resource'],
  source: string,
  options?: Partial<BillingEvent>
): BillingEvent {
  return {
    ...createBaseEvent(`billing.${transaction_type}`, 'billing', 'info', source),
    transaction_type,
    amount_usd,
    currency: 'USD',
    resource,
    ...options
  } as BillingEvent;
}

// ============================================================================
// EVENT SERIALIZATION
// ============================================================================

export function serializeEvent(event: RuntimeEvent): string {
  return JSON.stringify(event);
}

export function deserializeEvent(json: string): RuntimeEvent {
  return JSON.parse(json) as RuntimeEvent;
}

export function formatEventForLog(event: RuntimeEvent): string {
  const base = `[${event.timestamp}] [${event.severity.toUpperCase()}] [${event.category}] ${event.type}`;
  const meta = event.correlation_id ? ` (${event.correlation_id})` : '';
  return `${base}${meta}`;
}
