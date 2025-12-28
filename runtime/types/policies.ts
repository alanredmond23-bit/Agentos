/**
 * policies.ts
 * Policy type definitions for gates, killswitches, and runtime policies
 */

// ============================================================================
// BASE POLICY TYPES
// ============================================================================

export type PolicyVersion = `v${number}`;
export type PolicyStatus = 'active' | 'inactive' | 'deprecated' | 'testing';
export type PolicySeverity = 'info' | 'warning' | 'error' | 'critical';
export type PolicyAction = 'allow' | 'deny' | 'warn' | 'audit' | 'escalate';

export interface PolicyMetadata {
  /** Policy unique identifier */
  id: string;

  /** Policy name */
  name: string;

  /** Version string */
  version: PolicyVersion;

  /** Policy status */
  status: PolicyStatus;

  /** Description */
  description?: string;

  /** Author */
  author?: string;

  /** Creation timestamp */
  created_at: string;

  /** Last update timestamp */
  updated_at: string;

  /** Tags for categorization */
  tags?: string[];

  /** Priority (higher = checked first) */
  priority?: number;
}

// ============================================================================
// CONDITION TYPES
// ============================================================================

export type ConditionOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'in'
  | 'not_in'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'matches'
  | 'exists'
  | 'not_exists';

export interface Condition {
  /** Field path (dot notation) */
  field: string;

  /** Comparison operator */
  operator: ConditionOperator;

  /** Value to compare against */
  value: unknown;

  /** Case-insensitive comparison */
  case_insensitive?: boolean;
}

export interface ConditionGroup {
  /** Logical operator for combining conditions */
  operator: 'and' | 'or';

  /** Conditions in this group */
  conditions: (Condition | ConditionGroup)[];

  /** Negate the entire group */
  negate?: boolean;
}

// ============================================================================
// GATE POLICIES
// ============================================================================

export type GateType =
  | 'quality'
  | 'security'
  | 'compliance'
  | 'finance'
  | 'tcpa_ctia'
  | 'privilege'
  | 'pii'
  | 'custom';

export interface GateCheck {
  /** Check name */
  name: string;

  /** Check description */
  description?: string;

  /** Condition to evaluate */
  condition: Condition | ConditionGroup;

  /** Message on failure */
  failure_message: string;

  /** Severity of failure */
  severity: PolicySeverity;

  /** Whether to block on failure */
  blocking: boolean;
}

export interface GatePolicy extends PolicyMetadata {
  type: 'gate';

  /** Gate type */
  gate_type: GateType;

  /** Zone this gate applies to */
  zone: 'red' | 'yellow' | 'green' | 'all';

  /** Checks to perform */
  checks: GateCheck[];

  /** Default action if all checks pass */
  default_action: PolicyAction;

  /** Timeout for gate evaluation (ms) */
  timeout_ms?: number;

  /** Whether to cache results */
  cache_ttl_seconds?: number;
}

// ============================================================================
// KILLSWITCH POLICIES
// ============================================================================

export type KillswitchScope = 'global' | 'agent' | 'workflow' | 'tool' | 'provider';

export interface KillswitchTrigger {
  /** Trigger name */
  name: string;

  /** Condition that activates the killswitch */
  condition: Condition | ConditionGroup;

  /** Cooldown before re-evaluation (seconds) */
  cooldown_seconds?: number;
}

export interface KillswitchPolicy extends PolicyMetadata {
  type: 'killswitch';

  /** Scope of the killswitch */
  scope: KillswitchScope;

  /** Target (agent_id, workflow_id, tool_name, etc.) */
  target?: string;

  /** Triggers that activate the killswitch */
  triggers: KillswitchTrigger[];

  /** Action when triggered */
  action: 'pause' | 'stop' | 'rollback' | 'failover';

  /** Notification channels */
  notify?: {
    channels: string[];
    message: string;
    urgency: 'low' | 'normal' | 'high' | 'critical';
  };

  /** Auto-recovery settings */
  recovery?: {
    auto_recover: boolean;
    recover_after_seconds?: number;
    max_recoveries?: number;
  };

  /** Currently triggered */
  triggered?: boolean;

  /** Last trigger timestamp */
  last_triggered_at?: string;
}

// ============================================================================
// RATE LIMIT POLICIES
// ============================================================================

export interface RateLimitWindow {
  /** Window duration */
  duration_seconds: number;

  /** Maximum requests in window */
  max_requests: number;

  /** Burst allowance */
  burst?: number;
}

export interface RateLimitPolicy extends PolicyMetadata {
  type: 'rate_limit';

  /** Resource being rate limited */
  resource: string;

  /** Rate limit windows */
  windows: RateLimitWindow[];

  /** Action when limit exceeded */
  exceeded_action: 'reject' | 'queue' | 'throttle';

  /** Response code when rejected */
  reject_status?: number;

  /** Queue settings if action is queue */
  queue?: {
    max_size: number;
    timeout_seconds: number;
  };

  /** Bypass conditions */
  bypass?: ConditionGroup;
}

// ============================================================================
// ACCESS CONTROL POLICIES
// ============================================================================

export interface Permission {
  /** Resource pattern (supports wildcards) */
  resource: string;

  /** Allowed actions */
  actions: string[];

  /** Conditions for this permission */
  conditions?: ConditionGroup;
}

export interface Role {
  /** Role name */
  name: string;

  /** Role description */
  description?: string;

  /** Permissions granted by this role */
  permissions: Permission[];

  /** Inherits from these roles */
  inherits?: string[];
}

export interface AccessControlPolicy extends PolicyMetadata {
  type: 'access_control';

  /** Roles defined by this policy */
  roles: Role[];

  /** Default role for unauthenticated */
  default_role?: string;

  /** Super admin bypass */
  super_admin_principals?: string[];
}

// ============================================================================
// DATA RETENTION POLICIES
// ============================================================================

export interface RetentionRule {
  /** Data type */
  data_type: string;

  /** Retention period in days */
  retention_days: number;

  /** Archive before delete */
  archive: boolean;

  /** Archive location */
  archive_location?: string;

  /** Anonymize instead of delete */
  anonymize?: boolean;

  /** Fields to anonymize */
  anonymize_fields?: string[];
}

export interface DataRetentionPolicy extends PolicyMetadata {
  type: 'data_retention';

  /** Retention rules */
  rules: RetentionRule[];

  /** Schedule for cleanup (cron format) */
  cleanup_schedule?: string;

  /** Notify before deletion */
  notify_before_days?: number;
}

// ============================================================================
// PII PROTECTION POLICIES
// ============================================================================

export type PIICategory =
  | 'email'
  | 'phone'
  | 'ssn'
  | 'credit_card'
  | 'address'
  | 'name'
  | 'dob'
  | 'ip_address'
  | 'health'
  | 'financial'
  | 'biometric'
  | 'custom';

export interface PIIRule {
  /** Category of PII */
  category: PIICategory;

  /** Custom pattern (regex) for custom category */
  pattern?: string;

  /** Action to take */
  action: 'redact' | 'hash' | 'encrypt' | 'mask' | 'audit';

  /** Replacement value for redaction */
  replacement?: string;

  /** Log access */
  audit_access: boolean;
}

export interface PIIProtectionPolicy extends PolicyMetadata {
  type: 'pii_protection';

  /** PII rules */
  rules: PIIRule[];

  /** Zones where PII protection applies */
  zones: ('red' | 'yellow' | 'green')[];

  /** Allow PII in these fields (whitelist) */
  allowed_fields?: string[];

  /** Block PII in these fields (blacklist) */
  blocked_fields?: string[];
}

// ============================================================================
// COMPLIANCE POLICIES
// ============================================================================

export type ComplianceFramework =
  | 'GDPR'
  | 'HIPAA'
  | 'SOC2'
  | 'PCI_DSS'
  | 'CCPA'
  | 'TCPA'
  | 'CTIA'
  | 'FRCP'
  | 'custom';

export interface ComplianceRequirement {
  /** Requirement ID */
  id: string;

  /** Requirement description */
  description: string;

  /** Control to implement */
  control: string;

  /** Evidence required */
  evidence?: string[];

  /** Verification method */
  verification?: 'automated' | 'manual' | 'hybrid';
}

export interface CompliancePolicy extends PolicyMetadata {
  type: 'compliance';

  /** Framework */
  framework: ComplianceFramework;

  /** Requirements */
  requirements: ComplianceRequirement[];

  /** Audit frequency (cron format) */
  audit_schedule?: string;

  /** Last audit timestamp */
  last_audit_at?: string;

  /** Compliance status */
  compliance_status?: 'compliant' | 'non_compliant' | 'pending_review';
}

// ============================================================================
// BUDGET POLICIES
// ============================================================================

export interface BudgetLimit {
  /** Resource type */
  resource: 'tokens' | 'api_calls' | 'storage' | 'compute' | 'total';

  /** Provider (optional) */
  provider?: string;

  /** Time period */
  period: 'hourly' | 'daily' | 'weekly' | 'monthly';

  /** Limit in USD */
  limit_usd: number;

  /** Warning threshold (percentage) */
  warning_threshold?: number;
}

export interface BudgetPolicy extends PolicyMetadata {
  type: 'budget';

  /** Budget limits */
  limits: BudgetLimit[];

  /** Action when budget exceeded */
  exceeded_action: 'warn' | 'throttle' | 'block';

  /** Notification settings */
  notifications?: {
    email?: string[];
    slack?: string[];
    webhook?: string;
  };

  /** Current spend tracking */
  current_spend?: Record<string, number>;
}

// ============================================================================
// POLICY UNIONS AND COLLECTIONS
// ============================================================================

export type Policy =
  | GatePolicy
  | KillswitchPolicy
  | RateLimitPolicy
  | AccessControlPolicy
  | DataRetentionPolicy
  | PIIProtectionPolicy
  | CompliancePolicy
  | BudgetPolicy;

export interface PolicySet {
  /** Policy set name */
  name: string;

  /** Policies in this set */
  policies: Policy[];

  /** Evaluation order */
  evaluation_order: 'priority' | 'sequential' | 'parallel';

  /** Stop on first match */
  stop_on_match?: boolean;
}

// ============================================================================
// POLICY EVALUATION
// ============================================================================

export interface PolicyEvaluationContext {
  /** Request being evaluated */
  request: {
    agent_id: string;
    action: string;
    resource: string;
    zone: 'red' | 'yellow' | 'green';
    timestamp: string;
  };

  /** Actor performing the action */
  actor?: {
    id: string;
    type: string;
    roles?: string[];
  };

  /** Environment context */
  environment: {
    name: string;
    region?: string;
  };

  /** Additional data */
  data?: Record<string, unknown>;
}

export interface PolicyEvaluationResult {
  /** Policy that was evaluated */
  policy_id: string;

  /** Policy name */
  policy_name: string;

  /** Whether policy passed */
  passed: boolean;

  /** Action to take */
  action: PolicyAction;

  /** Failure reasons */
  failures?: {
    check: string;
    message: string;
    severity: PolicySeverity;
  }[];

  /** Evaluation duration (ms) */
  duration_ms: number;

  /** Cached result */
  cached?: boolean;
}

export interface PolicySetEvaluationResult {
  /** All results */
  results: PolicyEvaluationResult[];

  /** Overall action */
  action: PolicyAction;

  /** Whether all policies passed */
  all_passed: boolean;

  /** Critical failures */
  critical_failures: PolicyEvaluationResult[];

  /** Total evaluation time */
  total_duration_ms: number;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function createPolicyId(type: string, name: string): string {
  return `${type}.${name}.${Date.now()}`;
}

export function evaluateCondition(
  condition: Condition,
  data: Record<string, unknown>
): boolean {
  const fieldValue = getFieldValue(data, condition.field);

  switch (condition.operator) {
    case 'eq':
      return fieldValue === condition.value;
    case 'neq':
      return fieldValue !== condition.value;
    case 'gt':
      return (fieldValue as number) > (condition.value as number);
    case 'gte':
      return (fieldValue as number) >= (condition.value as number);
    case 'lt':
      return (fieldValue as number) < (condition.value as number);
    case 'lte':
      return (fieldValue as number) <= (condition.value as number);
    case 'in':
      return (condition.value as unknown[]).includes(fieldValue);
    case 'not_in':
      return !(condition.value as unknown[]).includes(fieldValue);
    case 'contains':
      return String(fieldValue).includes(String(condition.value));
    case 'not_contains':
      return !String(fieldValue).includes(String(condition.value));
    case 'starts_with':
      return String(fieldValue).startsWith(String(condition.value));
    case 'ends_with':
      return String(fieldValue).endsWith(String(condition.value));
    case 'matches':
      return new RegExp(String(condition.value)).test(String(fieldValue));
    case 'exists':
      return fieldValue !== undefined && fieldValue !== null;
    case 'not_exists':
      return fieldValue === undefined || fieldValue === null;
    default:
      return false;
  }
}

export function evaluateConditionGroup(
  group: ConditionGroup,
  data: Record<string, unknown>
): boolean {
  const results = group.conditions.map((cond) => {
    if ('operator' in cond && ('conditions' in cond)) {
      return evaluateConditionGroup(cond as ConditionGroup, data);
    }
    return evaluateCondition(cond as Condition, data);
  });

  let result: boolean;
  if (group.operator === 'and') {
    result = results.every((r) => r);
  } else {
    result = results.some((r) => r);
  }

  return group.negate ? !result : result;
}

function getFieldValue(data: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = data;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    if (typeof current === 'object') {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }

  return current;
}

export function isPolicyActive(policy: PolicyMetadata): boolean {
  return policy.status === 'active';
}

export function sortPoliciesByPriority(policies: Policy[]): Policy[] {
  return [...policies].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
}
