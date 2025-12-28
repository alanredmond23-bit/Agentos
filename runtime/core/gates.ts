/**
 * gates.ts
 * Gate execution and pass/fail logic
 * Quality gates for agent outputs before side effects
 */

import { GatePolicy, GateCheck, PolicySeverity } from '../types/policies';
import { getPolicyEngine } from './policy_engine';
import { getAuditLogger } from './audit';

// ============================================================================
// TYPES
// ============================================================================

export type GateStatus = 'pending' | 'passed' | 'failed' | 'skipped' | 'error';

export interface GateResult {
  gate_id: string;
  gate_name: string;
  gate_type: string;
  status: GateStatus;
  checks: GateCheckResult[];
  passed_count: number;
  failed_count: number;
  skipped_count: number;
  blocking_failures: GateCheckResult[];
  duration_ms: number;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface GateCheckResult {
  check_name: string;
  passed: boolean;
  severity: PolicySeverity;
  message?: string;
  blocking: boolean;
  duration_ms: number;
  details?: Record<string, unknown>;
}

export interface GateContext {
  agent_id: string;
  task_id?: string;
  zone: 'red' | 'yellow' | 'green';
  input?: unknown;
  output?: unknown;
  metadata?: Record<string, unknown>;
}

export interface GateExecutorConfig {
  /** Fail fast on first blocking failure */
  fail_fast?: boolean;

  /** Timeout for each check (ms) */
  check_timeout_ms?: number;

  /** Overall gate timeout (ms) */
  gate_timeout_ms?: number;

  /** Skip gates in development */
  skip_in_dev?: boolean;

  /** Custom check handlers */
  custom_handlers?: Map<string, GateCheckHandler>;
}

export type GateCheckHandler = (
  check: GateCheck,
  context: GateContext
) => Promise<GateCheckResult>;

// ============================================================================
// BUILT-IN CHECK HANDLERS
// ============================================================================

const builtInHandlers: Map<string, GateCheckHandler> = new Map();

// Output not empty
builtInHandlers.set('output_not_empty', async (check, context) => {
  const startTime = Date.now();
  const output = context.output;
  const passed = output !== null && output !== undefined && output !== '';

  return {
    check_name: check.name,
    passed,
    severity: check.severity,
    message: passed ? undefined : 'Output is empty',
    blocking: check.blocking,
    duration_ms: Date.now() - startTime
  };
});

// Output length check
builtInHandlers.set('output_length', async (check, context) => {
  const startTime = Date.now();
  const output = String(context.output ?? '');
  const minLength = (check.condition as unknown as Record<string, number>).min_length ?? 0;
  const maxLength = (check.condition as unknown as Record<string, number>).max_length ?? Infinity;

  const passed = output.length >= minLength && output.length <= maxLength;

  return {
    check_name: check.name,
    passed,
    severity: check.severity,
    message: passed
      ? undefined
      : `Output length ${output.length} not in range [${minLength}, ${maxLength}]`,
    blocking: check.blocking,
    duration_ms: Date.now() - startTime,
    details: { length: output.length, min: minLength, max: maxLength }
  };
});

// Contains required text
builtInHandlers.set('contains_text', async (check, context) => {
  const startTime = Date.now();
  const output = String(context.output ?? '');
  const requiredText = String((check.condition as unknown as Record<string, string>).text ?? '');

  const passed = output.includes(requiredText);

  return {
    check_name: check.name,
    passed,
    severity: check.severity,
    message: passed ? undefined : `Output does not contain required text`,
    blocking: check.blocking,
    duration_ms: Date.now() - startTime
  };
});

// Regex match
builtInHandlers.set('regex_match', async (check, context) => {
  const startTime = Date.now();
  const output = String(context.output ?? '');
  const pattern = String((check.condition as unknown as Record<string, string>).pattern ?? '');

  let passed = false;
  try {
    const regex = new RegExp(pattern);
    passed = regex.test(output);
  } catch {
    passed = false;
  }

  return {
    check_name: check.name,
    passed,
    severity: check.severity,
    message: passed ? undefined : `Output does not match pattern`,
    blocking: check.blocking,
    duration_ms: Date.now() - startTime
  };
});

// JSON valid
builtInHandlers.set('json_valid', async (check, context) => {
  const startTime = Date.now();
  let passed = false;

  try {
    if (typeof context.output === 'string') {
      JSON.parse(context.output);
    } else if (typeof context.output === 'object') {
      JSON.stringify(context.output);
    }
    passed = true;
  } catch {
    passed = false;
  }

  return {
    check_name: check.name,
    passed,
    severity: check.severity,
    message: passed ? undefined : 'Output is not valid JSON',
    blocking: check.blocking,
    duration_ms: Date.now() - startTime
  };
});

// No PII detected
builtInHandlers.set('no_pii', async (check, context) => {
  const startTime = Date.now();
  const output = String(context.output ?? '');

  // Simple PII patterns
  const piiPatterns = [
    /\b\d{3}[-.]?\d{2}[-.]?\d{4}\b/, // SSN
    /\b(?:\d{4}[-\s]?){3}\d{4}\b/, // Credit card
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/ // Email
  ];

  let hasPII = false;
  for (const pattern of piiPatterns) {
    if (pattern.test(output)) {
      hasPII = true;
      break;
    }
  }

  return {
    check_name: check.name,
    passed: !hasPII,
    severity: check.severity,
    message: hasPII ? 'PII detected in output' : undefined,
    blocking: check.blocking,
    duration_ms: Date.now() - startTime
  };
});

// Cost within budget
builtInHandlers.set('cost_within_budget', async (check, context) => {
  const startTime = Date.now();
  const metadata = context.metadata ?? {};
  const cost = (metadata.cost_usd as number) ?? 0;
  const budget = (check.condition as unknown as Record<string, number>).max_cost ?? Infinity;

  const passed = cost <= budget;

  return {
    check_name: check.name,
    passed,
    severity: check.severity,
    message: passed ? undefined : `Cost $${cost} exceeds budget $${budget}`,
    blocking: check.blocking,
    duration_ms: Date.now() - startTime,
    details: { cost, budget }
  };
});

// ============================================================================
// GATE EXECUTOR
// ============================================================================

export class GateExecutor {
  private config: Required<GateExecutorConfig>;
  private handlers: Map<string, GateCheckHandler>;

  constructor(config: GateExecutorConfig = {}) {
    this.config = {
      fail_fast: config.fail_fast ?? true,
      check_timeout_ms: config.check_timeout_ms ?? 5000,
      gate_timeout_ms: config.gate_timeout_ms ?? 30000,
      skip_in_dev: config.skip_in_dev ?? false,
      custom_handlers: config.custom_handlers ?? new Map()
    };

    // Merge built-in and custom handlers
    this.handlers = new Map([...builtInHandlers, ...this.config.custom_handlers]);
  }

  /**
   * Execute a gate policy
   */
  async execute(gate: GatePolicy, context: GateContext): Promise<GateResult> {
    const startTime = Date.now();

    // Skip in development if configured
    if (this.config.skip_in_dev && process.env.NODE_ENV === 'development') {
      return {
        gate_id: gate.id,
        gate_name: gate.name,
        gate_type: gate.gate_type,
        status: 'skipped',
        checks: [],
        passed_count: 0,
        failed_count: 0,
        skipped_count: gate.checks.length,
        blocking_failures: [],
        duration_ms: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };
    }

    const checkResults: GateCheckResult[] = [];
    const blockingFailures: GateCheckResult[] = [];

    // Execute each check
    for (const check of gate.checks) {
      try {
        const result = await this.executeCheck(check, context);
        checkResults.push(result);

        if (!result.passed && result.blocking) {
          blockingFailures.push(result);

          if (this.config.fail_fast) {
            break;
          }
        }
      } catch (error) {
        const errorResult: GateCheckResult = {
          check_name: check.name,
          passed: false,
          severity: 'error',
          message: (error as Error).message,
          blocking: check.blocking,
          duration_ms: 0
        };
        checkResults.push(errorResult);

        if (check.blocking && this.config.fail_fast) {
          blockingFailures.push(errorResult);
          break;
        }
      }
    }

    const passedCount = checkResults.filter((r) => r.passed).length;
    const failedCount = checkResults.filter((r) => !r.passed).length;
    const status: GateStatus =
      blockingFailures.length > 0 ? 'failed' : failedCount > 0 ? 'passed' : 'passed';

    const result: GateResult = {
      gate_id: gate.id,
      gate_name: gate.name,
      gate_type: gate.gate_type,
      status,
      checks: checkResults,
      passed_count: passedCount,
      failed_count: failedCount,
      skipped_count: gate.checks.length - checkResults.length,
      blocking_failures: blockingFailures,
      duration_ms: Date.now() - startTime,
      timestamp: new Date().toISOString(),
      metadata: context.metadata
    };

    // Log to audit
    await this.logGateResult(result, context);

    return result;
  }

  /**
   * Execute a single check
   */
  private async executeCheck(
    check: GateCheck,
    context: GateContext
  ): Promise<GateCheckResult> {
    const startTime = Date.now();

    // Find handler
    const handlerName = check.name.split('.')[0]; // e.g., "output_length.min" -> "output_length"
    const handler = this.handlers.get(handlerName);

    if (!handler) {
      // Use default condition-based check
      return this.executeConditionCheck(check, context, startTime);
    }

    // Execute with timeout
    return Promise.race([
      handler(check, context),
      new Promise<GateCheckResult>((_, reject) =>
        setTimeout(() => reject(new Error('Check timeout')), this.config.check_timeout_ms)
      )
    ]);
  }

  /**
   * Execute a condition-based check
   */
  private async executeConditionCheck(
    check: GateCheck,
    context: GateContext,
    startTime: number
  ): Promise<GateCheckResult> {
    // For condition-based checks, use the policy engine
    const engine = getPolicyEngine();
    const result = await engine.evaluate({
      request: {
        agent_id: context.agent_id,
        action: 'gate_check',
        resource: check.name,
        zone: context.zone,
        timestamp: new Date().toISOString()
      },
      environment: { name: process.env.NODE_ENV ?? 'development' },
      data: { input: context.input, output: context.output, ...context.metadata }
    });

    const passed = result.all_passed;

    return {
      check_name: check.name,
      passed,
      severity: check.severity,
      message: passed ? undefined : check.failure_message,
      blocking: check.blocking,
      duration_ms: Date.now() - startTime
    };
  }

  /**
   * Register a custom check handler
   */
  registerHandler(name: string, handler: GateCheckHandler): void {
    this.handlers.set(name, handler);
  }

  /**
   * Log gate result to audit
   */
  private async logGateResult(result: GateResult, context: GateContext): Promise<void> {
    const logger = getAuditLogger();
    await logger.logAction(
      'execute',
      { type: 'agent', id: context.agent_id },
      { type: 'gate', id: result.gate_id, name: result.gate_name },
      context.zone,
      result.status === 'passed',
      {
        duration_ms: result.duration_ms,
        metadata: {
          gate_type: result.gate_type,
          passed_count: result.passed_count,
          failed_count: result.failed_count,
          blocking_failures: result.blocking_failures.map((f) => f.check_name)
        }
      }
    );
  }
}

// ============================================================================
// PREDEFINED GATE POLICIES
// ============================================================================

export function createQualityGate(options?: {
  minLength?: number;
  maxLength?: number;
  requireJson?: boolean;
  noPii?: boolean;
}): GatePolicy {
  const checks: GateCheck[] = [];

  checks.push({
    name: 'output_not_empty',
    description: 'Ensure output is not empty',
    condition: { field: 'output', operator: 'exists', value: true },
    failure_message: 'Output cannot be empty',
    severity: 'error',
    blocking: true
  });

  if (options?.minLength || options?.maxLength) {
    checks.push({
      name: 'output_length',
      description: 'Check output length',
      condition: {
        field: 'output',
        operator: 'exists',
        value: true
      },
      failure_message: 'Output length out of range',
      severity: 'error',
      blocking: true
    });
  }

  if (options?.requireJson) {
    checks.push({
      name: 'json_valid',
      description: 'Ensure output is valid JSON',
      condition: { field: 'output', operator: 'exists', value: true },
      failure_message: 'Output must be valid JSON',
      severity: 'error',
      blocking: true
    });
  }

  if (options?.noPii) {
    checks.push({
      name: 'no_pii',
      description: 'Ensure no PII in output',
      condition: { field: 'output', operator: 'exists', value: true },
      failure_message: 'Output contains PII',
      severity: 'critical',
      blocking: true
    });
  }

  return {
    id: `gate.quality.${Date.now()}`,
    name: 'Quality Gate',
    version: 'v1',
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    type: 'gate',
    gate_type: 'quality',
    zone: 'all',
    checks,
    default_action: 'allow'
  };
}

export function createSecurityGate(): GatePolicy {
  return {
    id: `gate.security.${Date.now()}`,
    name: 'Security Gate',
    version: 'v1',
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    type: 'gate',
    gate_type: 'security',
    zone: 'all',
    checks: [
      {
        name: 'no_pii',
        description: 'No PII in output',
        condition: { field: 'output', operator: 'exists', value: true },
        failure_message: 'PII detected in output',
        severity: 'critical',
        blocking: true
      }
    ],
    default_action: 'allow'
  };
}

// ============================================================================
// SINGLETON
// ============================================================================

let defaultExecutor: GateExecutor | null = null;

export function getGateExecutor(): GateExecutor {
  if (!defaultExecutor) {
    defaultExecutor = new GateExecutor();
  }
  return defaultExecutor;
}

export function setGateExecutor(executor: GateExecutor): void {
  defaultExecutor = executor;
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Run a gate check on output
 */
export async function runGate(
  gate: GatePolicy,
  agentId: string,
  output: unknown,
  zone: 'red' | 'yellow' | 'green'
): Promise<GateResult> {
  const executor = getGateExecutor();
  return executor.execute(gate, { agent_id: agentId, output, zone });
}

/**
 * Quick quality check
 */
export async function checkQuality(
  agentId: string,
  output: unknown,
  zone: 'red' | 'yellow' | 'green'
): Promise<{ passed: boolean; failures: string[] }> {
  const gate = createQualityGate({ noPii: true });
  const result = await runGate(gate, agentId, output, zone);

  return {
    passed: result.status === 'passed',
    failures: result.blocking_failures.map((f) => f.message ?? f.check_name)
  };
}
