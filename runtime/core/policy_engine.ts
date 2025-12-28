/**
 * policy_engine.ts
 * Evaluate policies from ops/policies YAML files
 * Supports gates, killswitches, rate limits, and more
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  Policy,
  PolicySet,
  PolicyEvaluationContext,
  PolicyEvaluationResult,
  PolicySetEvaluationResult,
  GatePolicy,
  KillswitchPolicy,
  RateLimitPolicy,
  evaluateCondition,
  evaluateConditionGroup,
  Condition,
  ConditionGroup,
  isPolicyActive,
  sortPoliciesByPriority,
  PolicyAction
} from '../types/policies';

// ============================================================================
// TYPES
// ============================================================================

export interface PolicyEngineConfig {
  /** Directory containing policy YAML files */
  policies_path: string;

  /** Enable caching of policy evaluations */
  enable_cache?: boolean;

  /** Cache TTL in ms */
  cache_ttl_ms?: number;

  /** Default action when no policies match */
  default_action?: PolicyAction;

  /** On policy violation callback */
  on_violation?: (result: PolicyEvaluationResult, context: PolicyEvaluationContext) => void;
}

export interface RateLimitState {
  resource: string;
  window_start: number;
  request_count: number;
}

// ============================================================================
// POLICY ENGINE
// ============================================================================

export class PolicyEngine {
  private config: Required<PolicyEngineConfig>;
  private policies: Map<string, Policy> = new Map();
  private policySets: Map<string, PolicySet> = new Map();
  private rateLimitStates: Map<string, RateLimitState[]> = new Map();
  private evaluationCache: Map<string, { result: PolicyEvaluationResult; expires_at: number }> = new Map();
  private killswitchStates: Map<string, boolean> = new Map();

  constructor(config: PolicyEngineConfig) {
    this.config = {
      policies_path: config.policies_path,
      enable_cache: config.enable_cache ?? true,
      cache_ttl_ms: config.cache_ttl_ms ?? 5000,
      default_action: config.default_action ?? 'allow',
      on_violation: config.on_violation ?? (() => {})
    };
  }

  // ============================================================================
  // POLICY LOADING
  // ============================================================================

  /**
   * Load all policies from the configured directory
   */
  async loadPolicies(): Promise<void> {
    const files = await this.listPolicyFiles();

    for (const file of files) {
      try {
        const policy = await this.loadPolicyFile(file);
        if (policy) {
          this.policies.set(policy.id, policy);
        }
      } catch (error) {
        console.error(`Failed to load policy from ${file}:`, error);
      }
    }
  }

  /**
   * Load a single policy file
   */
  private async loadPolicyFile(filePath: string): Promise<Policy | null> {
    const content = await fs.promises.readFile(filePath, 'utf-8');

    // Simple YAML-like parsing (in production, use a proper YAML parser)
    // For now, treat as JSON for simplicity
    try {
      const policy = JSON.parse(content) as Policy;
      return policy;
    } catch {
      // Try parsing as simple YAML
      const lines = content.split('\n');
      const obj: Record<string, unknown> = {};

      for (const line of lines) {
        const match = line.match(/^(\w+):\s*(.+)$/);
        if (match) {
          obj[match[1]] = match[2].replace(/^["']|["']$/g, '');
        }
      }

      if (Object.keys(obj).length > 0) {
        return obj as unknown as Policy;
      }
    }

    return null;
  }

  /**
   * List all policy files in the directory
   */
  private async listPolicyFiles(): Promise<string[]> {
    try {
      const files = await fs.promises.readdir(this.config.policies_path);
      return files
        .filter((f) => f.endsWith('.yaml') || f.endsWith('.yml') || f.endsWith('.json'))
        .map((f) => path.join(this.config.policies_path, f));
    } catch {
      return [];
    }
  }

  /**
   * Register a policy programmatically
   */
  registerPolicy(policy: Policy): void {
    this.policies.set(policy.id, policy);
  }

  /**
   * Get a policy by ID
   */
  getPolicy(id: string): Policy | undefined {
    return this.policies.get(id);
  }

  /**
   * List all policies
   */
  listPolicies(): Policy[] {
    return Array.from(this.policies.values());
  }

  // ============================================================================
  // POLICY EVALUATION
  // ============================================================================

  /**
   * Evaluate all applicable policies for a context
   */
  async evaluate(context: PolicyEvaluationContext): Promise<PolicySetEvaluationResult> {
    const startTime = Date.now();
    const results: PolicyEvaluationResult[] = [];
    const applicablePolicies = this.getApplicablePolicies(context);

    // Sort by priority
    const sortedPolicies = sortPoliciesByPriority(applicablePolicies);

    for (const policy of sortedPolicies) {
      // Check cache
      const cacheKey = this.getCacheKey(policy.id, context);
      if (this.config.enable_cache) {
        const cached = this.evaluationCache.get(cacheKey);
        if (cached && cached.expires_at > Date.now()) {
          results.push({ ...cached.result, cached: true });
          continue;
        }
      }

      // Evaluate policy
      const result = await this.evaluatePolicy(policy, context);
      results.push(result);

      // Cache result
      if (this.config.enable_cache && result.passed) {
        this.evaluationCache.set(cacheKey, {
          result,
          expires_at: Date.now() + this.config.cache_ttl_ms
        });
      }

      // Call violation callback if needed
      if (!result.passed && this.config.on_violation) {
        this.config.on_violation(result, context);
      }
    }

    // Determine overall action
    const criticalFailures = results.filter(
      (r) => !r.passed && r.failures?.some((f) => f.severity === 'critical')
    );

    const allPassed = results.every((r) => r.passed);
    const overallAction: PolicyAction = criticalFailures.length > 0
      ? 'deny'
      : allPassed
        ? 'allow'
        : 'warn';

    return {
      results,
      action: overallAction,
      all_passed: allPassed,
      critical_failures: criticalFailures,
      total_duration_ms: Date.now() - startTime
    };
  }

  /**
   * Evaluate a single policy
   */
  private async evaluatePolicy(
    policy: Policy,
    context: PolicyEvaluationContext
  ): Promise<PolicyEvaluationResult> {
    const startTime = Date.now();

    if (!isPolicyActive(policy)) {
      return {
        policy_id: policy.id,
        policy_name: policy.name,
        passed: true,
        action: 'allow',
        duration_ms: Date.now() - startTime
      };
    }

    switch (policy.type) {
      case 'gate':
        return this.evaluateGatePolicy(policy, context, startTime);

      case 'killswitch':
        return this.evaluateKillswitchPolicy(policy, context, startTime);

      case 'rate_limit':
        return this.evaluateRateLimitPolicy(policy, context, startTime);

      default:
        return {
          policy_id: policy.id,
          policy_name: policy.name,
          passed: true,
          action: 'allow',
          duration_ms: Date.now() - startTime
        };
    }
  }

  /**
   * Evaluate a gate policy
   */
  private evaluateGatePolicy(
    policy: GatePolicy,
    context: PolicyEvaluationContext,
    startTime: number
  ): PolicyEvaluationResult {
    const failures: PolicyEvaluationResult['failures'] = [];

    // Check if zone matches
    if (policy.zone !== 'all' && policy.zone !== context.request.zone) {
      return {
        policy_id: policy.id,
        policy_name: policy.name,
        passed: true,
        action: 'allow',
        duration_ms: Date.now() - startTime
      };
    }

    // Evaluate all checks
    for (const check of policy.checks) {
      const data = {
        request: context.request,
        actor: context.actor,
        environment: context.environment,
        ...context.data
      };

      const conditionPassed = 'conditions' in check.condition
        ? evaluateConditionGroup(check.condition as ConditionGroup, data)
        : evaluateCondition(check.condition as Condition, data);

      if (!conditionPassed) {
        failures.push({
          check: check.name,
          message: check.failure_message,
          severity: check.severity
        });

        // If blocking, we can stop here
        if (check.blocking && check.severity === 'critical') {
          break;
        }
      }
    }

    const passed = failures.length === 0 ||
      !failures.some((f) => f.severity === 'critical' || f.severity === 'error');

    return {
      policy_id: policy.id,
      policy_name: policy.name,
      passed,
      action: passed ? policy.default_action : 'deny',
      failures: failures.length > 0 ? failures : undefined,
      duration_ms: Date.now() - startTime
    };
  }

  /**
   * Evaluate a killswitch policy
   */
  private evaluateKillswitchPolicy(
    policy: KillswitchPolicy,
    context: PolicyEvaluationContext,
    startTime: number
  ): PolicyEvaluationResult {
    // Check if already triggered
    if (this.killswitchStates.get(policy.id)) {
      return {
        policy_id: policy.id,
        policy_name: policy.name,
        passed: false,
        action: 'deny',
        failures: [{
          check: 'killswitch_active',
          message: `Killswitch ${policy.name} is active`,
          severity: 'critical'
        }],
        duration_ms: Date.now() - startTime
      };
    }

    // Evaluate triggers
    const data = {
      request: context.request,
      actor: context.actor,
      environment: context.environment,
      ...context.data
    };

    for (const trigger of policy.triggers) {
      const triggered = 'conditions' in trigger.condition
        ? evaluateConditionGroup(trigger.condition as ConditionGroup, data)
        : evaluateCondition(trigger.condition as Condition, data);

      if (triggered) {
        // Activate killswitch
        this.killswitchStates.set(policy.id, true);

        return {
          policy_id: policy.id,
          policy_name: policy.name,
          passed: false,
          action: 'deny',
          failures: [{
            check: trigger.name,
            message: `Killswitch triggered: ${trigger.name}`,
            severity: 'critical'
          }],
          duration_ms: Date.now() - startTime
        };
      }
    }

    return {
      policy_id: policy.id,
      policy_name: policy.name,
      passed: true,
      action: 'allow',
      duration_ms: Date.now() - startTime
    };
  }

  /**
   * Evaluate a rate limit policy
   */
  private evaluateRateLimitPolicy(
    policy: RateLimitPolicy,
    context: PolicyEvaluationContext,
    startTime: number
  ): PolicyEvaluationResult {
    const now = Date.now();
    const resourceKey = `${policy.resource}:${context.actor?.id ?? 'anonymous'}`;

    // Get or create rate limit states
    let states = this.rateLimitStates.get(resourceKey);
    if (!states) {
      states = [];
      this.rateLimitStates.set(resourceKey, states);
    }

    // Check each window
    for (const window of policy.windows) {
      const windowStart = now - (window.duration_seconds * 1000);

      // Find or create state for this window
      let state = states.find((s) => s.window_start >= windowStart);
      if (!state) {
        state = {
          resource: policy.resource,
          window_start: now,
          request_count: 0
        };
        states.push(state);
      }

      // Check if over limit
      if (state.request_count >= window.max_requests) {
        return {
          policy_id: policy.id,
          policy_name: policy.name,
          passed: false,
          action: 'deny',
          failures: [{
            check: 'rate_limit_exceeded',
            message: `Rate limit exceeded: ${state.request_count}/${window.max_requests} in ${window.duration_seconds}s`,
            severity: 'error'
          }],
          duration_ms: Date.now() - startTime
        };
      }

      // Increment count
      state.request_count++;
    }

    // Cleanup old states
    this.rateLimitStates.set(
      resourceKey,
      states.filter((s) => s.window_start > now - 86400000) // Keep last 24 hours
    );

    return {
      policy_id: policy.id,
      policy_name: policy.name,
      passed: true,
      action: 'allow',
      duration_ms: Date.now() - startTime
    };
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  /**
   * Get policies applicable to a context
   */
  private getApplicablePolicies(context: PolicyEvaluationContext): Policy[] {
    const applicable: Policy[] = [];

    for (const policy of this.policies.values()) {
      // Check zone applicability for gate policies
      if (policy.type === 'gate') {
        const gatePolicy = policy as GatePolicy;
        if (gatePolicy.zone !== 'all' && gatePolicy.zone !== context.request.zone) {
          continue;
        }
      }

      // Check scope for killswitch policies
      if (policy.type === 'killswitch') {
        const ksPolicy = policy as KillswitchPolicy;
        if (ksPolicy.target && ksPolicy.target !== context.request.agent_id) {
          continue;
        }
      }

      applicable.push(policy);
    }

    return applicable;
  }

  /**
   * Generate cache key for policy evaluation
   */
  private getCacheKey(policyId: string, context: PolicyEvaluationContext): string {
    return `${policyId}:${context.request.agent_id}:${context.request.action}:${context.request.resource}`;
  }

  // ============================================================================
  // KILLSWITCH MANAGEMENT
  // ============================================================================

  /**
   * Manually trigger a killswitch
   */
  triggerKillswitch(policyId: string): void {
    this.killswitchStates.set(policyId, true);
  }

  /**
   * Reset a killswitch
   */
  resetKillswitch(policyId: string): void {
    this.killswitchStates.set(policyId, false);
  }

  /**
   * Check if a killswitch is active
   */
  isKillswitchActive(policyId: string): boolean {
    return this.killswitchStates.get(policyId) ?? false;
  }

  /**
   * List all active killswitches
   */
  getActiveKillswitches(): string[] {
    return Array.from(this.killswitchStates.entries())
      .filter(([, active]) => active)
      .map(([id]) => id);
  }

  // ============================================================================
  // CACHE MANAGEMENT
  // ============================================================================

  /**
   * Clear evaluation cache
   */
  clearCache(): void {
    this.evaluationCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.evaluationCache.size,
      hitRate: 0 // Would need to track hits/misses for this
    };
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let defaultEngine: PolicyEngine | null = null;

export function getPolicyEngine(): PolicyEngine {
  if (!defaultEngine) {
    defaultEngine = new PolicyEngine({
      policies_path: process.env.AGENTOS_POLICIES_PATH ?? './ops/policies'
    });
  }
  return defaultEngine;
}

export function setPolicyEngine(engine: PolicyEngine): void {
  defaultEngine = engine;
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Quick policy check
 */
export async function checkPolicy(
  agentId: string,
  action: string,
  resource: string,
  zone: 'red' | 'yellow' | 'green'
): Promise<{ allowed: boolean; reason?: string }> {
  const engine = getPolicyEngine();
  const result = await engine.evaluate({
    request: {
      agent_id: agentId,
      action,
      resource,
      zone,
      timestamp: new Date().toISOString()
    },
    environment: {
      name: process.env.NODE_ENV ?? 'development'
    }
  });

  return {
    allowed: result.action !== 'deny',
    reason: result.critical_failures[0]?.failures?.[0]?.message
  };
}
