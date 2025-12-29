/**
 * runner.ts
 * Production-grade evaluation framework for AgentOS
 *
 * Features:
 * - Parallel test execution with configurable concurrency
 * - Golden task validation with multi-criteria scoring
 * - Metrics collection (latency, accuracy, cost, tokens)
 * - Provider comparison benchmarks
 * - Regression detection with historical baselines
 * - JSON/HTML report generation
 *
 * @module evals/runner
 * @version 1.0.0
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync, statSync } from 'node:fs';
import { join, dirname, relative, basename, extname } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Supported LLM provider types for evaluation
 */
export type ProviderType = 'anthropic' | 'openai' | 'gemini' | 'deepseek' | 'mock';

/**
 * Evaluation case status
 */
export type EvalStatus = 'pending' | 'running' | 'passed' | 'failed' | 'skipped' | 'error' | 'timeout';

/**
 * Severity levels for eval issues
 */
export type IssueSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

/**
 * Output format types
 */
export type OutputFormat = 'json' | 'html' | 'markdown' | 'junit';

/**
 * Comparison operators for assertions
 */
export type ComparisonOperator = 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'not_contains' | 'matches' | 'not_matches';

/**
 * Configuration for the evaluation runner
 */
export interface EvalRunnerConfig {
  /** Maximum concurrent evaluations */
  concurrency: number;

  /** Default timeout per evaluation (ms) */
  timeout_ms: number;

  /** Directory containing eval cases */
  evals_dir: string;

  /** Directory for storing results */
  results_dir: string;

  /** Directory for baseline comparisons */
  baselines_dir: string;

  /** Default provider for evaluations */
  default_provider: ProviderType;

  /** Providers to benchmark against */
  benchmark_providers: ProviderType[];

  /** Enable regression detection */
  enable_regression_detection: boolean;

  /** Regression threshold (percent degradation allowed) */
  regression_threshold_percent: number;

  /** Enable cost tracking */
  track_costs: boolean;

  /** Maximum cost per run (USD) */
  max_cost_usd: number;

  /** Enable verbose logging */
  verbose: boolean;

  /** Retry failed evals */
  retry_count: number;

  /** Retry delay (ms) */
  retry_delay_ms: number;

  /** Output formats */
  output_formats: OutputFormat[];

  /** Tags to filter (include only these) */
  include_tags?: string[];

  /** Tags to exclude */
  exclude_tags?: string[];

  /** Packs to filter */
  include_packs?: string[];

  /** Environment variables for providers */
  env?: Record<string, string>;
}

/**
 * Metadata for an evaluation case
 */
export interface EvalCaseMetadata {
  /** Unique identifier */
  id: string;

  /** Human-readable name */
  name: string;

  /** Agent pack this belongs to */
  pack: string;

  /** Specific agent being tested */
  agent?: string;

  /** Version of the eval case */
  version: string;

  /** Difficulty level */
  difficulty?: 'easy' | 'medium' | 'hard' | 'expert';

  /** Estimated completion time */
  estimated_time?: string;

  /** Author */
  author?: string;

  /** Creation date */
  created_at?: string;

  /** Last update date */
  updated_at?: string;
}

/**
 * Input configuration for an evaluation task
 */
export interface EvalTaskInput {
  /** Text prompt or structured input */
  prompt?: string;

  /** Structured input data */
  data?: Record<string, unknown>;

  /** Context to provide */
  context?: Record<string, unknown>;

  /** System prompt override */
  system_prompt?: string;

  /** Files to include */
  files?: Array<{
    path: string;
    content?: string;
  }>;

  /** Tools to make available */
  tools?: string[];
}

/**
 * Expected output specification for an evaluation
 */
export interface EvalExpectedOutput {
  /** Expected files to be created */
  files?: Array<{
    path: string;
    must_contain?: string[];
    must_not_contain?: string[];
    pattern?: string;
    min_lines?: number;
    max_lines?: number;
  }>;

  /** Expected output text checks */
  output?: {
    contains?: string[];
    not_contains?: string[];
    matches?: string;
    min_length?: number;
    max_length?: number;
  };

  /** Quality checks to perform */
  quality_checks?: Array<{
    name: string;
    threshold: number;
    weight?: number;
  }>;

  /** Behavioral checks */
  behavior_checks?: Array<{
    scenario: string;
    expected: string;
  }>;

  /** Tool call expectations */
  tool_calls?: Array<{
    tool: string;
    min_calls?: number;
    max_calls?: number;
    required_args?: string[];
  }>;
}

/**
 * Scoring configuration for an evaluation
 */
export interface EvalScoringConfig {
  /** Individual score weights (must sum to 1.0) */
  weights?: Record<string, number>;

  /** Minimum score to pass */
  pass_threshold: number;

  /** Penalty for exceeding time limit */
  time_penalty_per_second?: number;

  /** Penalty for exceeding cost limit */
  cost_penalty_per_dollar?: number;

  /** Bonus for completing under time */
  time_bonus_factor?: number;
}

/**
 * Complete evaluation case definition
 */
export interface EvalCase {
  /** Case metadata */
  metadata: EvalCaseMetadata;

  /** Task definition */
  task: {
    description: string;
    input: EvalTaskInput;
  };

  /** Expected output */
  expected_output: EvalExpectedOutput;

  /** Scoring configuration */
  evaluation: {
    scoring: EvalScoringConfig;
  };

  /** Tags for filtering */
  tags?: string[];

  /** Whether to skip this case */
  skip?: boolean;

  /** Skip reason */
  skip_reason?: string;

  /** Custom timeout for this case */
  timeout_ms?: number;

  /** Provider-specific overrides */
  provider_overrides?: Record<ProviderType, Partial<EvalTaskInput>>;
}

/**
 * Individual assertion result
 */
export interface AssertionResult {
  /** Assertion name/description */
  name: string;

  /** Whether it passed */
  passed: boolean;

  /** Expected value */
  expected?: unknown;

  /** Actual value */
  actual?: unknown;

  /** Error message if failed */
  message?: string;

  /** Severity of failure */
  severity: IssueSeverity;

  /** Score contribution (0-1) */
  score: number;

  /** Weight of this assertion */
  weight: number;
}

/**
 * Metrics collected during evaluation
 */
export interface EvalMetrics {
  /** Total execution time (ms) */
  duration_ms: number;

  /** Time to first token (ms) */
  ttft_ms?: number;

  /** Input tokens used */
  input_tokens: number;

  /** Output tokens generated */
  output_tokens: number;

  /** Total tokens */
  total_tokens: number;

  /** Estimated cost (USD) */
  cost_usd: number;

  /** Number of API calls made */
  api_calls: number;

  /** Number of tool calls */
  tool_calls: number;

  /** Number of retries */
  retries: number;

  /** Memory usage (MB) */
  memory_mb?: number;

  /** Throughput (tokens/second) */
  throughput_tps?: number;
}

/**
 * Result of a single evaluation case
 */
export interface EvalResult {
  /** Reference to the case */
  case_id: string;

  /** Case name */
  case_name: string;

  /** Pack name */
  pack: string;

  /** Final status */
  status: EvalStatus;

  /** Provider used */
  provider: ProviderType;

  /** Model used */
  model?: string;

  /** Final score (0-1) */
  score: number;

  /** Whether it passed */
  passed: boolean;

  /** All assertion results */
  assertions: AssertionResult[];

  /** Collected metrics */
  metrics: EvalMetrics;

  /** Raw output from the agent */
  output?: string;

  /** Generated files */
  generated_files?: Array<{ path: string; content: string }>;

  /** Error information */
  error?: {
    code: string;
    message: string;
    stack?: string;
  };

  /** Execution timestamps */
  started_at: string;
  ended_at: string;

  /** Attempt number (1-indexed) */
  attempt: number;

  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Regression analysis result
 */
export interface RegressionResult {
  /** Case ID */
  case_id: string;

  /** Whether regression was detected */
  has_regression: boolean;

  /** Baseline score */
  baseline_score: number;

  /** Current score */
  current_score: number;

  /** Score delta (negative = regression) */
  score_delta: number;

  /** Percent change */
  percent_change: number;

  /** Baseline latency */
  baseline_latency_ms: number;

  /** Current latency */
  current_latency_ms: number;

  /** Latency delta */
  latency_delta_ms: number;

  /** Baseline cost */
  baseline_cost_usd: number;

  /** Current cost */
  current_cost_usd: number;

  /** Cost delta */
  cost_delta_usd: number;

  /** Specific regressions detected */
  regressions: Array<{
    metric: string;
    baseline: number;
    current: number;
    threshold: number;
    severity: IssueSeverity;
  }>;
}

/**
 * Provider benchmark result
 */
export interface ProviderBenchmark {
  /** Provider name */
  provider: ProviderType;

  /** Model used */
  model: string;

  /** Average score across all cases */
  avg_score: number;

  /** Pass rate */
  pass_rate: number;

  /** Average latency */
  avg_latency_ms: number;

  /** P50 latency */
  p50_latency_ms: number;

  /** P95 latency */
  p95_latency_ms: number;

  /** P99 latency */
  p99_latency_ms: number;

  /** Total cost */
  total_cost_usd: number;

  /** Average cost per case */
  avg_cost_usd: number;

  /** Total tokens used */
  total_tokens: number;

  /** Cases run */
  cases_run: number;

  /** Cases passed */
  cases_passed: number;

  /** Cases failed */
  cases_failed: number;

  /** Error rate */
  error_rate: number;
}

/**
 * Complete evaluation run summary
 */
export interface EvalRunSummary {
  /** Unique run ID */
  run_id: string;

  /** Run name */
  name?: string;

  /** Total cases */
  total_cases: number;

  /** Cases passed */
  passed: number;

  /** Cases failed */
  failed: number;

  /** Cases skipped */
  skipped: number;

  /** Cases with errors */
  errors: number;

  /** Cases timed out */
  timeouts: number;

  /** Overall pass rate */
  pass_rate: number;

  /** Average score */
  avg_score: number;

  /** Total duration */
  total_duration_ms: number;

  /** Total cost */
  total_cost_usd: number;

  /** Total tokens */
  total_tokens: number;

  /** Results by pack */
  by_pack: Record<string, {
    total: number;
    passed: number;
    failed: number;
    avg_score: number;
  }>;

  /** Provider benchmarks */
  provider_benchmarks?: ProviderBenchmark[];

  /** Regression analysis */
  regressions?: RegressionResult[];

  /** All individual results */
  results: EvalResult[];

  /** Run metadata */
  started_at: string;
  ended_at: string;

  /** Configuration used */
  config: Partial<EvalRunnerConfig>;

  /** Git commit hash */
  git_commit?: string;

  /** Environment info */
  environment?: {
    node_version: string;
    platform: string;
    arch: string;
  };
}

/**
 * Baseline data for comparison
 */
export interface EvalBaseline {
  /** Baseline ID */
  id: string;

  /** Creation date */
  created_at: string;

  /** Git commit */
  git_commit?: string;

  /** Results by case ID */
  results: Record<string, {
    score: number;
    latency_ms: number;
    cost_usd: number;
    tokens: number;
    passed: boolean;
  }>;
}

/**
 * Event types for progress tracking
 */
export type EvalEventType =
  | 'run_started'
  | 'run_completed'
  | 'case_started'
  | 'case_completed'
  | 'case_failed'
  | 'case_skipped'
  | 'assertion_passed'
  | 'assertion_failed'
  | 'regression_detected'
  | 'progress_update';

/**
 * Progress event data
 */
export interface EvalProgressEvent {
  type: EvalEventType;
  timestamp: string;
  case_id?: string;
  case_name?: string;
  progress?: {
    completed: number;
    total: number;
    percent: number;
  };
  result?: EvalResult;
  message?: string;
}

/**
 * Event handler type
 */
export type EvalEventHandler = (event: EvalProgressEvent) => void | Promise<void>;

// ============================================================================
// YAML PARSER (Simple implementation for eval files)
// ============================================================================

/**
 * Parse YAML content into an object
 * @param content - YAML string content
 * @returns Parsed object
 */
function parseYAML(content: string): Record<string, unknown> {
  const lines = content.split('\n');
  const result: Record<string, unknown> = {};
  const stack: Array<{ obj: Record<string, unknown>; indent: number; key?: string }> = [
    { obj: result, indent: -2 }
  ];

  let currentArrayKey: string | null = null;
  let currentArray: unknown[] = [];
  let multilineKey: string | null = null;
  let multilineValue = '';
  let multilineIndent = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip empty lines and comments
    if (trimmed === '' || trimmed.startsWith('#')) {
      if (multilineKey) {
        multilineValue += '\n';
      }
      continue;
    }

    const indent = line.search(/\S/);

    // Handle multiline strings
    if (multilineKey) {
      if (indent > multilineIndent) {
        multilineValue += (multilineValue ? '\n' : '') + trimmed;
        continue;
      } else {
        // End of multiline
        const parent = stack[stack.length - 1].obj;
        parent[multilineKey] = multilineValue.trim();
        multilineKey = null;
        multilineValue = '';
      }
    }

    // Pop stack for dedent
    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
      const popped = stack.pop()!;
      if (currentArrayKey && popped.key === currentArrayKey) {
        currentArrayKey = null;
      }
    }

    // Handle array items
    if (trimmed.startsWith('- ')) {
      const value = trimmed.slice(2).trim();
      const parent = stack[stack.length - 1].obj;
      const lastKey = Object.keys(parent).pop();

      if (lastKey) {
        if (!Array.isArray(parent[lastKey])) {
          parent[lastKey] = [];
        }

        // Check if it's a key-value item
        const kvMatch = value.match(/^([^:]+):\s*(.*)$/);
        if (kvMatch) {
          const itemObj: Record<string, unknown> = {};
          const [, itemKey, itemValue] = kvMatch;
          if (itemValue) {
            itemObj[itemKey.trim()] = parseValue(itemValue);
          }
          (parent[lastKey] as unknown[]).push(itemObj);
          stack.push({ obj: itemObj, indent, key: lastKey });
        } else {
          (parent[lastKey] as unknown[]).push(parseValue(value));
        }
      }
      continue;
    }

    // Handle key: value pairs
    const match = trimmed.match(/^([^:]+):\s*(.*)$/);
    if (match) {
      const [, key, rawValue] = match;
      const cleanKey = key.trim();
      const parent = stack[stack.length - 1].obj;

      // Handle multiline indicator
      if (rawValue === '|' || rawValue === '>') {
        multilineKey = cleanKey;
        multilineIndent = indent;
        multilineValue = '';
        continue;
      }

      if (rawValue === '' || rawValue === null) {
        // Nested object or array
        const newObj: Record<string, unknown> = {};
        parent[cleanKey] = newObj;
        stack.push({ obj: newObj, indent, key: cleanKey });
      } else {
        parent[cleanKey] = parseValue(rawValue);
      }
    }
  }

  // Handle any remaining multiline content
  if (multilineKey) {
    const parent = stack[stack.length - 1].obj;
    parent[multilineKey] = multilineValue.trim();
  }

  return result;
}

/**
 * Parse a YAML value into the appropriate type
 */
function parseValue(value: string): unknown {
  const trimmed = value.trim();

  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (trimmed === 'null' || trimmed === '~') return null;

  // Number
  if (/^-?\d+$/.test(trimmed)) return parseInt(trimmed, 10);
  if (/^-?\d+\.\d+$/.test(trimmed)) return parseFloat(trimmed);

  // Quoted string
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }

  // Inline array
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    const items = trimmed.slice(1, -1).split(',').map(s => parseValue(s.trim()));
    return items;
  }

  return trimmed;
}

// ============================================================================
// ASSERTION ENGINE
// ============================================================================

/**
 * Engine for evaluating assertions against actual outputs
 */
export class AssertionEngine {
  /**
   * Evaluate all assertions for a case
   * @param expected - Expected output specification
   * @param actual - Actual output from the agent
   * @param files - Generated files
   * @returns Array of assertion results
   */
  evaluate(
    expected: EvalExpectedOutput,
    actual: string,
    files: Array<{ path: string; content: string }> = [],
    toolCalls: Array<{ tool: string; args: Record<string, unknown> }> = []
  ): AssertionResult[] {
    const results: AssertionResult[] = [];

    // Evaluate file expectations
    if (expected.files) {
      for (const fileSpec of expected.files) {
        const file = files.find(f => f.path === fileSpec.path || f.path.endsWith(fileSpec.path));

        if (!file) {
          results.push({
            name: `File exists: ${fileSpec.path}`,
            passed: false,
            expected: 'File should exist',
            actual: 'File not found',
            message: `Expected file ${fileSpec.path} was not generated`,
            severity: 'high',
            score: 0,
            weight: 1
          });
          continue;
        }

        results.push({
          name: `File exists: ${fileSpec.path}`,
          passed: true,
          expected: 'File should exist',
          actual: 'File exists',
          severity: 'info',
          score: 1,
          weight: 0.5
        });

        // Check must_contain
        if (fileSpec.must_contain) {
          for (const pattern of fileSpec.must_contain) {
            const found = file.content.includes(pattern);
            results.push({
              name: `File contains: "${pattern.substring(0, 30)}..."`,
              passed: found,
              expected: `Contains "${pattern}"`,
              actual: found ? 'Found' : 'Not found',
              message: found ? undefined : `Pattern "${pattern}" not found in ${fileSpec.path}`,
              severity: 'medium',
              score: found ? 1 : 0,
              weight: 1
            });
          }
        }

        // Check must_not_contain
        if (fileSpec.must_not_contain) {
          for (const pattern of fileSpec.must_not_contain) {
            const found = file.content.includes(pattern);
            results.push({
              name: `File does not contain: "${pattern.substring(0, 30)}..."`,
              passed: !found,
              expected: `Does not contain "${pattern}"`,
              actual: found ? 'Found (unexpected)' : 'Not found (expected)',
              message: found ? `Unexpected pattern "${pattern}" found in ${fileSpec.path}` : undefined,
              severity: 'medium',
              score: found ? 0 : 1,
              weight: 1
            });
          }
        }

        // Check pattern (regex)
        if (fileSpec.pattern) {
          const regex = new RegExp(fileSpec.pattern, 's');
          const matches = regex.test(file.content);
          results.push({
            name: `File matches pattern: ${fileSpec.pattern.substring(0, 30)}...`,
            passed: matches,
            expected: `Matches /${fileSpec.pattern}/`,
            actual: matches ? 'Matches' : 'Does not match',
            severity: 'medium',
            score: matches ? 1 : 0,
            weight: 1
          });
        }

        // Check line count
        const lineCount = file.content.split('\n').length;
        if (fileSpec.min_lines !== undefined && lineCount < fileSpec.min_lines) {
          results.push({
            name: `File minimum lines: ${fileSpec.path}`,
            passed: false,
            expected: `>= ${fileSpec.min_lines} lines`,
            actual: `${lineCount} lines`,
            message: `File has ${lineCount} lines, expected at least ${fileSpec.min_lines}`,
            severity: 'low',
            score: lineCount / fileSpec.min_lines,
            weight: 0.5
          });
        }

        if (fileSpec.max_lines !== undefined && lineCount > fileSpec.max_lines) {
          results.push({
            name: `File maximum lines: ${fileSpec.path}`,
            passed: false,
            expected: `<= ${fileSpec.max_lines} lines`,
            actual: `${lineCount} lines`,
            message: `File has ${lineCount} lines, expected at most ${fileSpec.max_lines}`,
            severity: 'low',
            score: fileSpec.max_lines / lineCount,
            weight: 0.5
          });
        }
      }
    }

    // Evaluate output text expectations
    if (expected.output) {
      if (expected.output.contains) {
        for (const pattern of expected.output.contains) {
          const found = actual.toLowerCase().includes(pattern.toLowerCase());
          results.push({
            name: `Output contains: "${pattern.substring(0, 30)}..."`,
            passed: found,
            expected: `Contains "${pattern}"`,
            actual: found ? 'Found' : 'Not found',
            message: found ? undefined : `Expected output to contain "${pattern}"`,
            severity: 'medium',
            score: found ? 1 : 0,
            weight: 1
          });
        }
      }

      if (expected.output.not_contains) {
        for (const pattern of expected.output.not_contains) {
          const found = actual.toLowerCase().includes(pattern.toLowerCase());
          results.push({
            name: `Output does not contain: "${pattern.substring(0, 30)}..."`,
            passed: !found,
            expected: `Does not contain "${pattern}"`,
            actual: found ? 'Found (unexpected)' : 'Not found (expected)',
            message: found ? `Unexpected content "${pattern}" found in output` : undefined,
            severity: 'medium',
            score: found ? 0 : 1,
            weight: 1
          });
        }
      }

      if (expected.output.matches) {
        const regex = new RegExp(expected.output.matches, 'is');
        const matches = regex.test(actual);
        results.push({
          name: `Output matches pattern`,
          passed: matches,
          expected: `Matches /${expected.output.matches}/`,
          actual: matches ? 'Matches' : 'Does not match',
          severity: 'medium',
          score: matches ? 1 : 0,
          weight: 1
        });
      }

      if (expected.output.min_length !== undefined) {
        const passed = actual.length >= expected.output.min_length;
        results.push({
          name: `Output minimum length`,
          passed,
          expected: `>= ${expected.output.min_length} chars`,
          actual: `${actual.length} chars`,
          severity: 'low',
          score: passed ? 1 : actual.length / expected.output.min_length,
          weight: 0.5
        });
      }

      if (expected.output.max_length !== undefined) {
        const passed = actual.length <= expected.output.max_length;
        results.push({
          name: `Output maximum length`,
          passed,
          expected: `<= ${expected.output.max_length} chars`,
          actual: `${actual.length} chars`,
          severity: 'low',
          score: passed ? 1 : expected.output.max_length / actual.length,
          weight: 0.5
        });
      }
    }

    // Evaluate tool call expectations
    if (expected.tool_calls) {
      for (const toolSpec of expected.tool_calls) {
        const calls = toolCalls.filter(tc => tc.tool === toolSpec.tool);

        if (toolSpec.min_calls !== undefined) {
          const passed = calls.length >= toolSpec.min_calls;
          results.push({
            name: `Tool ${toolSpec.tool} called >= ${toolSpec.min_calls} times`,
            passed,
            expected: `>= ${toolSpec.min_calls} calls`,
            actual: `${calls.length} calls`,
            severity: 'medium',
            score: passed ? 1 : calls.length / toolSpec.min_calls,
            weight: 1
          });
        }

        if (toolSpec.max_calls !== undefined) {
          const passed = calls.length <= toolSpec.max_calls;
          results.push({
            name: `Tool ${toolSpec.tool} called <= ${toolSpec.max_calls} times`,
            passed,
            expected: `<= ${toolSpec.max_calls} calls`,
            actual: `${calls.length} calls`,
            severity: 'medium',
            score: passed ? 1 : toolSpec.max_calls / calls.length,
            weight: 1
          });
        }

        if (toolSpec.required_args) {
          for (const call of calls) {
            for (const arg of toolSpec.required_args) {
              const hasArg = arg in call.args;
              results.push({
                name: `Tool ${toolSpec.tool} has arg: ${arg}`,
                passed: hasArg,
                expected: `Argument "${arg}" present`,
                actual: hasArg ? 'Present' : 'Missing',
                severity: 'medium',
                score: hasArg ? 1 : 0,
                weight: 0.5
              });
            }
          }
        }
      }
    }

    return results;
  }

  /**
   * Calculate final score from assertion results
   */
  calculateScore(results: AssertionResult[], scoring: EvalScoringConfig): number {
    if (results.length === 0) return 0;

    let totalWeight = 0;
    let weightedScore = 0;

    for (const result of results) {
      totalWeight += result.weight;
      weightedScore += result.score * result.weight;
    }

    return totalWeight > 0 ? weightedScore / totalWeight : 0;
  }
}

// ============================================================================
// MOCK PROVIDER (for offline testing)
// ============================================================================

/**
 * Mock provider for testing without API calls
 */
export class MockProvider {
  private responses: Map<string, string> = new Map();

  /**
   * Set a canned response for a case
   */
  setResponse(caseId: string, response: string): void {
    this.responses.set(caseId, response);
  }

  /**
   * Generate a mock response for an eval case
   */
  async complete(evalCase: EvalCase): Promise<{
    output: string;
    files: Array<{ path: string; content: string }>;
    toolCalls: Array<{ tool: string; args: Record<string, unknown> }>;
    metrics: Partial<EvalMetrics>;
  }> {
    // Check for canned response
    if (this.responses.has(evalCase.metadata.id)) {
      return {
        output: this.responses.get(evalCase.metadata.id)!,
        files: [],
        toolCalls: [],
        metrics: {
          duration_ms: Math.random() * 1000 + 500,
          input_tokens: Math.floor(Math.random() * 1000),
          output_tokens: Math.floor(Math.random() * 500),
          cost_usd: 0,
          api_calls: 1,
          tool_calls: 0
        }
      };
    }

    // Generate mock response based on expected output
    const expected = evalCase.expected_output;
    let output = `Mock response for: ${evalCase.task.description.substring(0, 100)}...`;
    const files: Array<{ path: string; content: string }> = [];

    // Generate expected files with required content
    if (expected.files) {
      for (const fileSpec of expected.files) {
        let content = `# Generated file: ${fileSpec.path}\n`;

        if (fileSpec.must_contain) {
          content += fileSpec.must_contain.join('\n');
        }

        files.push({ path: fileSpec.path, content });
      }
    }

    // Include expected output content
    if (expected.output?.contains) {
      output = expected.output.contains.join(' ');
    }

    // Simulate realistic metrics
    const inputTokens = Math.floor(Math.random() * 2000) + 500;
    const outputTokens = Math.floor(Math.random() * 1000) + 200;

    return {
      output,
      files,
      toolCalls: [],
      metrics: {
        duration_ms: Math.random() * 2000 + 1000,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        total_tokens: inputTokens + outputTokens,
        cost_usd: (inputTokens * 0.003 + outputTokens * 0.015) / 1000,
        api_calls: 1,
        tool_calls: 0
      }
    };
  }
}

// ============================================================================
// REGRESSION ANALYZER
// ============================================================================

/**
 * Analyzes evaluation results for regressions against baselines
 */
export class RegressionAnalyzer {
  private baselines: Map<string, EvalBaseline> = new Map();
  private thresholdPercent: number;

  constructor(thresholdPercent: number = 5) {
    this.thresholdPercent = thresholdPercent;
  }

  /**
   * Load baseline from file
   */
  loadBaseline(filePath: string): void {
    if (!existsSync(filePath)) return;

    const content = readFileSync(filePath, 'utf-8');
    const baseline = JSON.parse(content) as EvalBaseline;
    this.baselines.set(baseline.id, baseline);
  }

  /**
   * Save current results as a new baseline
   */
  saveBaseline(results: EvalResult[], filePath: string): void {
    const baseline: EvalBaseline = {
      id: `baseline_${Date.now()}`,
      created_at: new Date().toISOString(),
      results: {}
    };

    for (const result of results) {
      baseline.results[result.case_id] = {
        score: result.score,
        latency_ms: result.metrics.duration_ms,
        cost_usd: result.metrics.cost_usd,
        tokens: result.metrics.total_tokens,
        passed: result.passed
      };
    }

    writeFileSync(filePath, JSON.stringify(baseline, null, 2));
    this.baselines.set(baseline.id, baseline);
  }

  /**
   * Analyze results against baseline
   */
  analyze(results: EvalResult[], baselineId?: string): RegressionResult[] {
    const baseline = baselineId
      ? this.baselines.get(baselineId)
      : Array.from(this.baselines.values()).pop();

    if (!baseline) return [];

    const regressions: RegressionResult[] = [];

    for (const result of results) {
      const baselineResult = baseline.results[result.case_id];
      if (!baselineResult) continue;

      const scoreDelta = result.score - baselineResult.score;
      const scorePercentChange = (scoreDelta / baselineResult.score) * 100;

      const latencyDelta = result.metrics.duration_ms - baselineResult.latency_ms;
      const latencyPercentChange = (latencyDelta / baselineResult.latency_ms) * 100;

      const costDelta = result.metrics.cost_usd - baselineResult.cost_usd;

      const regressionItems: RegressionResult['regressions'] = [];

      // Check for score regression
      if (scorePercentChange < -this.thresholdPercent) {
        regressionItems.push({
          metric: 'score',
          baseline: baselineResult.score,
          current: result.score,
          threshold: this.thresholdPercent,
          severity: scorePercentChange < -20 ? 'critical' : scorePercentChange < -10 ? 'high' : 'medium'
        });
      }

      // Check for latency regression (>20% slower)
      if (latencyPercentChange > 20) {
        regressionItems.push({
          metric: 'latency_ms',
          baseline: baselineResult.latency_ms,
          current: result.metrics.duration_ms,
          threshold: 20,
          severity: latencyPercentChange > 50 ? 'high' : 'medium'
        });
      }

      // Check for cost regression (>50% more expensive)
      const costPercentChange = baselineResult.cost_usd > 0
        ? (costDelta / baselineResult.cost_usd) * 100
        : 0;

      if (costPercentChange > 50) {
        regressionItems.push({
          metric: 'cost_usd',
          baseline: baselineResult.cost_usd,
          current: result.metrics.cost_usd,
          threshold: 50,
          severity: costPercentChange > 100 ? 'high' : 'medium'
        });
      }

      // Check for pass/fail regression
      if (baselineResult.passed && !result.passed) {
        regressionItems.push({
          metric: 'pass_status',
          baseline: 1,
          current: 0,
          threshold: 0,
          severity: 'critical'
        });
      }

      regressions.push({
        case_id: result.case_id,
        has_regression: regressionItems.length > 0,
        baseline_score: baselineResult.score,
        current_score: result.score,
        score_delta: scoreDelta,
        percent_change: scorePercentChange,
        baseline_latency_ms: baselineResult.latency_ms,
        current_latency_ms: result.metrics.duration_ms,
        latency_delta_ms: latencyDelta,
        baseline_cost_usd: baselineResult.cost_usd,
        current_cost_usd: result.metrics.cost_usd,
        cost_delta_usd: costDelta,
        regressions: regressionItems
      });
    }

    return regressions;
  }

  /**
   * Get latest baseline
   */
  getLatestBaseline(): EvalBaseline | undefined {
    return Array.from(this.baselines.values()).pop();
  }
}

// ============================================================================
// REPORT GENERATOR
// ============================================================================

/**
 * Generates evaluation reports in various formats
 */
export class ReportGenerator {
  /**
   * Generate JSON report
   */
  generateJSON(summary: EvalRunSummary): string {
    return JSON.stringify(summary, null, 2);
  }

  /**
   * Generate HTML report
   */
  generateHTML(summary: EvalRunSummary): string {
    const passRate = (summary.pass_rate * 100).toFixed(1);
    const avgScore = (summary.avg_score * 100).toFixed(1);
    const statusColor = summary.pass_rate >= 0.9 ? '#22c55e' : summary.pass_rate >= 0.7 ? '#eab308' : '#ef4444';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AgentOS Eval Report - ${summary.run_id}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #e2e8f0; line-height: 1.6; }
    .container { max-width: 1400px; margin: 0 auto; padding: 2rem; }
    header { margin-bottom: 2rem; border-bottom: 1px solid #334155; padding-bottom: 1rem; }
    h1 { font-size: 2rem; font-weight: 700; color: #f1f5f9; }
    h2 { font-size: 1.5rem; font-weight: 600; color: #f1f5f9; margin: 2rem 0 1rem; }
    h3 { font-size: 1.25rem; font-weight: 600; color: #cbd5e1; margin: 1rem 0 0.5rem; }
    .meta { color: #94a3b8; font-size: 0.875rem; margin-top: 0.5rem; }
    .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin: 1.5rem 0; }
    .stat-card { background: #1e293b; border-radius: 0.75rem; padding: 1.5rem; border: 1px solid #334155; }
    .stat-value { font-size: 2rem; font-weight: 700; color: #f1f5f9; }
    .stat-label { color: #94a3b8; font-size: 0.875rem; text-transform: uppercase; letter-spacing: 0.05em; }
    .stat-value.success { color: #22c55e; }
    .stat-value.warning { color: #eab308; }
    .stat-value.error { color: #ef4444; }
    .progress-bar { height: 8px; background: #334155; border-radius: 4px; overflow: hidden; margin-top: 0.5rem; }
    .progress-fill { height: 100%; background: ${statusColor}; transition: width 0.3s ease; }
    table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
    th, td { text-align: left; padding: 0.75rem 1rem; border-bottom: 1px solid #334155; }
    th { background: #1e293b; color: #f1f5f9; font-weight: 600; }
    tr:hover { background: #1e293b; }
    .status { display: inline-block; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; }
    .status.passed { background: #166534; color: #bbf7d0; }
    .status.failed { background: #991b1b; color: #fecaca; }
    .status.skipped { background: #854d0e; color: #fef08a; }
    .status.error { background: #7f1d1d; color: #fecaca; }
    .score { font-weight: 600; font-family: monospace; }
    .metrics { display: flex; gap: 1rem; flex-wrap: wrap; }
    .metric { background: #1e293b; padding: 0.5rem 1rem; border-radius: 0.5rem; font-size: 0.875rem; }
    .pack-section { background: #1e293b; border-radius: 0.75rem; padding: 1.5rem; margin: 1rem 0; border: 1px solid #334155; }
    .regression { background: #7f1d1d; border: 1px solid #ef4444; padding: 1rem; border-radius: 0.5rem; margin: 0.5rem 0; }
    .benchmark-table { margin: 1rem 0; }
    footer { margin-top: 3rem; padding-top: 1rem; border-top: 1px solid #334155; color: #64748b; font-size: 0.875rem; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>AgentOS Evaluation Report</h1>
      <div class="meta">
        Run ID: ${summary.run_id} | Started: ${summary.started_at} | Duration: ${(summary.total_duration_ms / 1000).toFixed(1)}s
        ${summary.git_commit ? ` | Commit: ${summary.git_commit.substring(0, 8)}` : ''}
      </div>
    </header>

    <section>
      <div class="summary-grid">
        <div class="stat-card">
          <div class="stat-value ${summary.pass_rate >= 0.9 ? 'success' : summary.pass_rate >= 0.7 ? 'warning' : 'error'}">${passRate}%</div>
          <div class="stat-label">Pass Rate</div>
          <div class="progress-bar"><div class="progress-fill" style="width: ${passRate}%"></div></div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${avgScore}%</div>
          <div class="stat-label">Avg Score</div>
        </div>
        <div class="stat-card">
          <div class="stat-value success">${summary.passed}</div>
          <div class="stat-label">Passed</div>
        </div>
        <div class="stat-card">
          <div class="stat-value error">${summary.failed}</div>
          <div class="stat-label">Failed</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${summary.total_cases}</div>
          <div class="stat-label">Total Cases</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">$${summary.total_cost_usd.toFixed(4)}</div>
          <div class="stat-label">Total Cost</div>
        </div>
      </div>
    </section>

    ${summary.regressions && summary.regressions.filter(r => r.has_regression).length > 0 ? `
    <section>
      <h2>Regressions Detected</h2>
      ${summary.regressions.filter(r => r.has_regression).map(r => `
        <div class="regression">
          <strong>${r.case_id}</strong>
          <div>Score: ${(r.baseline_score * 100).toFixed(1)}% -> ${(r.current_score * 100).toFixed(1)}% (${r.percent_change >= 0 ? '+' : ''}${r.percent_change.toFixed(1)}%)</div>
          ${r.regressions.map(reg => `<div>${reg.metric}: ${reg.baseline.toFixed(2)} -> ${reg.current.toFixed(2)} [${reg.severity}]</div>`).join('')}
        </div>
      `).join('')}
    </section>
    ` : ''}

    ${summary.provider_benchmarks && summary.provider_benchmarks.length > 0 ? `
    <section>
      <h2>Provider Benchmarks</h2>
      <table class="benchmark-table">
        <thead>
          <tr>
            <th>Provider</th>
            <th>Model</th>
            <th>Pass Rate</th>
            <th>Avg Score</th>
            <th>Avg Latency</th>
            <th>P95 Latency</th>
            <th>Avg Cost</th>
            <th>Error Rate</th>
          </tr>
        </thead>
        <tbody>
          ${summary.provider_benchmarks.map(b => `
            <tr>
              <td>${b.provider}</td>
              <td>${b.model}</td>
              <td>${(b.pass_rate * 100).toFixed(1)}%</td>
              <td>${(b.avg_score * 100).toFixed(1)}%</td>
              <td>${b.avg_latency_ms.toFixed(0)}ms</td>
              <td>${b.p95_latency_ms.toFixed(0)}ms</td>
              <td>$${b.avg_cost_usd.toFixed(4)}</td>
              <td>${(b.error_rate * 100).toFixed(1)}%</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </section>
    ` : ''}

    <section>
      <h2>Results by Pack</h2>
      ${Object.entries(summary.by_pack).map(([pack, stats]) => `
        <div class="pack-section">
          <h3>${pack}</h3>
          <div class="metrics">
            <div class="metric">Total: ${stats.total}</div>
            <div class="metric">Passed: ${stats.passed}</div>
            <div class="metric">Failed: ${stats.total - stats.passed}</div>
            <div class="metric">Avg Score: ${(stats.avg_score * 100).toFixed(1)}%</div>
          </div>
        </div>
      `).join('')}
    </section>

    <section>
      <h2>All Results</h2>
      <table>
        <thead>
          <tr>
            <th>Case</th>
            <th>Pack</th>
            <th>Status</th>
            <th>Score</th>
            <th>Duration</th>
            <th>Tokens</th>
            <th>Cost</th>
          </tr>
        </thead>
        <tbody>
          ${summary.results.map(r => `
            <tr>
              <td>${r.case_name}</td>
              <td>${r.pack}</td>
              <td><span class="status ${r.status}">${r.status}</span></td>
              <td class="score">${(r.score * 100).toFixed(1)}%</td>
              <td>${r.metrics.duration_ms.toFixed(0)}ms</td>
              <td>${r.metrics.total_tokens}</td>
              <td>$${r.metrics.cost_usd.toFixed(4)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </section>

    <footer>
      Generated by AgentOS Eval Runner v1.0.0 | ${new Date().toISOString()}
    </footer>
  </div>
</body>
</html>`;
  }

  /**
   * Generate Markdown report
   */
  generateMarkdown(summary: EvalRunSummary): string {
    const lines: string[] = [
      `# AgentOS Evaluation Report`,
      ``,
      `**Run ID:** ${summary.run_id}`,
      `**Started:** ${summary.started_at}`,
      `**Duration:** ${(summary.total_duration_ms / 1000).toFixed(1)}s`,
      summary.git_commit ? `**Commit:** ${summary.git_commit}` : '',
      ``,
      `## Summary`,
      ``,
      `| Metric | Value |`,
      `|--------|-------|`,
      `| Total Cases | ${summary.total_cases} |`,
      `| Passed | ${summary.passed} |`,
      `| Failed | ${summary.failed} |`,
      `| Skipped | ${summary.skipped} |`,
      `| Errors | ${summary.errors} |`,
      `| Pass Rate | ${(summary.pass_rate * 100).toFixed(1)}% |`,
      `| Avg Score | ${(summary.avg_score * 100).toFixed(1)}% |`,
      `| Total Cost | $${summary.total_cost_usd.toFixed(4)} |`,
      `| Total Tokens | ${summary.total_tokens} |`,
      ``
    ];

    // Regressions
    if (summary.regressions && summary.regressions.filter(r => r.has_regression).length > 0) {
      lines.push(`## Regressions Detected`, ``);
      for (const r of summary.regressions.filter(reg => reg.has_regression)) {
        lines.push(`### ${r.case_id}`);
        lines.push(`- Score: ${(r.baseline_score * 100).toFixed(1)}% -> ${(r.current_score * 100).toFixed(1)}% (${r.percent_change >= 0 ? '+' : ''}${r.percent_change.toFixed(1)}%)`);
        for (const reg of r.regressions) {
          lines.push(`- ${reg.metric}: ${reg.baseline.toFixed(2)} -> ${reg.current.toFixed(2)} [${reg.severity}]`);
        }
        lines.push(``);
      }
    }

    // Provider benchmarks
    if (summary.provider_benchmarks && summary.provider_benchmarks.length > 0) {
      lines.push(`## Provider Benchmarks`, ``);
      lines.push(`| Provider | Model | Pass Rate | Avg Score | Avg Latency | P95 Latency | Avg Cost |`);
      lines.push(`|----------|-------|-----------|-----------|-------------|-------------|----------|`);
      for (const b of summary.provider_benchmarks) {
        lines.push(`| ${b.provider} | ${b.model} | ${(b.pass_rate * 100).toFixed(1)}% | ${(b.avg_score * 100).toFixed(1)}% | ${b.avg_latency_ms.toFixed(0)}ms | ${b.p95_latency_ms.toFixed(0)}ms | $${b.avg_cost_usd.toFixed(4)} |`);
      }
      lines.push(``);
    }

    // Results by pack
    lines.push(`## Results by Pack`, ``);
    for (const [pack, stats] of Object.entries(summary.by_pack)) {
      lines.push(`### ${pack}`);
      lines.push(`- Total: ${stats.total}`);
      lines.push(`- Passed: ${stats.passed}`);
      lines.push(`- Failed: ${stats.total - stats.passed}`);
      lines.push(`- Avg Score: ${(stats.avg_score * 100).toFixed(1)}%`);
      lines.push(``);
    }

    // All results
    lines.push(`## All Results`, ``);
    lines.push(`| Case | Pack | Status | Score | Duration | Tokens | Cost |`);
    lines.push(`|------|------|--------|-------|----------|--------|------|`);
    for (const r of summary.results) {
      lines.push(`| ${r.case_name} | ${r.pack} | ${r.status} | ${(r.score * 100).toFixed(1)}% | ${r.metrics.duration_ms.toFixed(0)}ms | ${r.metrics.total_tokens} | $${r.metrics.cost_usd.toFixed(4)} |`);
    }

    return lines.filter(l => l !== '').join('\n');
  }

  /**
   * Generate JUnit XML report (for CI integration)
   */
  generateJUnit(summary: EvalRunSummary): string {
    const escapeXml = (str: string) => str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

    const lines: string[] = [
      `<?xml version="1.0" encoding="UTF-8"?>`,
      `<testsuites name="AgentOS Evals" tests="${summary.total_cases}" failures="${summary.failed}" errors="${summary.errors}" skipped="${summary.skipped}" time="${(summary.total_duration_ms / 1000).toFixed(3)}">`
    ];

    // Group by pack
    for (const [pack, stats] of Object.entries(summary.by_pack)) {
      const packResults = summary.results.filter(r => r.pack === pack);
      const packDuration = packResults.reduce((sum, r) => sum + r.metrics.duration_ms, 0);

      lines.push(`  <testsuite name="${escapeXml(pack)}" tests="${stats.total}" failures="${stats.total - stats.passed}" errors="0" skipped="0" time="${(packDuration / 1000).toFixed(3)}">`);

      for (const result of packResults) {
        lines.push(`    <testcase name="${escapeXml(result.case_name)}" classname="${escapeXml(pack)}" time="${(result.metrics.duration_ms / 1000).toFixed(3)}">`);

        if (result.status === 'failed') {
          const failedAssertions = result.assertions.filter(a => !a.passed);
          const message = failedAssertions.map(a => a.message || a.name).join('; ');
          lines.push(`      <failure message="${escapeXml(message)}" type="AssertionError">`);
          lines.push(`Score: ${(result.score * 100).toFixed(1)}%`);
          lines.push(`Failed assertions:`);
          for (const a of failedAssertions) {
            lines.push(`- ${a.name}: expected ${a.expected}, got ${a.actual}`);
          }
          lines.push(`      </failure>`);
        } else if (result.status === 'error') {
          lines.push(`      <error message="${escapeXml(result.error?.message || 'Unknown error')}" type="${escapeXml(result.error?.code || 'Error')}">`);
          if (result.error?.stack) {
            lines.push(escapeXml(result.error.stack));
          }
          lines.push(`      </error>`);
        } else if (result.status === 'skipped') {
          lines.push(`      <skipped/>`);
        }

        // System output with metrics
        lines.push(`      <system-out>`);
        lines.push(`Duration: ${result.metrics.duration_ms}ms`);
        lines.push(`Tokens: ${result.metrics.total_tokens} (in: ${result.metrics.input_tokens}, out: ${result.metrics.output_tokens})`);
        lines.push(`Cost: $${result.metrics.cost_usd.toFixed(4)}`);
        lines.push(`Score: ${(result.score * 100).toFixed(1)}%`);
        lines.push(`      </system-out>`);

        lines.push(`    </testcase>`);
      }

      lines.push(`  </testsuite>`);
    }

    lines.push(`</testsuites>`);

    return lines.join('\n');
  }
}

// ============================================================================
// EVAL RUNNER
// ============================================================================

/**
 * Main evaluation runner class
 */
export class EvalRunner {
  private config: EvalRunnerConfig;
  private assertionEngine: AssertionEngine;
  private regressionAnalyzer: RegressionAnalyzer;
  private reportGenerator: ReportGenerator;
  private mockProvider: MockProvider;
  private eventHandlers: Set<EvalEventHandler> = new Set();
  private abortController: AbortController | null = null;

  /**
   * Create a new evaluation runner
   * @param config - Runner configuration
   */
  constructor(config: Partial<EvalRunnerConfig> = {}) {
    this.config = {
      concurrency: config.concurrency ?? 4,
      timeout_ms: config.timeout_ms ?? 300000, // 5 minutes
      evals_dir: config.evals_dir ?? './evals',
      results_dir: config.results_dir ?? './evals/results',
      baselines_dir: config.baselines_dir ?? './evals/baselines',
      default_provider: config.default_provider ?? 'mock',
      benchmark_providers: config.benchmark_providers ?? ['mock'],
      enable_regression_detection: config.enable_regression_detection ?? true,
      regression_threshold_percent: config.regression_threshold_percent ?? 5,
      track_costs: config.track_costs ?? true,
      max_cost_usd: config.max_cost_usd ?? 100,
      verbose: config.verbose ?? false,
      retry_count: config.retry_count ?? 2,
      retry_delay_ms: config.retry_delay_ms ?? 1000,
      output_formats: config.output_formats ?? ['json', 'html'],
      include_tags: config.include_tags,
      exclude_tags: config.exclude_tags,
      include_packs: config.include_packs,
      env: config.env
    };

    this.assertionEngine = new AssertionEngine();
    this.regressionAnalyzer = new RegressionAnalyzer(this.config.regression_threshold_percent);
    this.reportGenerator = new ReportGenerator();
    this.mockProvider = new MockProvider();

    // Ensure directories exist
    this.ensureDirectories();

    // Load baselines
    this.loadBaselines();
  }

  /**
   * Ensure required directories exist
   */
  private ensureDirectories(): void {
    const dirs = [this.config.results_dir, this.config.baselines_dir];
    for (const dir of dirs) {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    }
  }

  /**
   * Load existing baselines
   */
  private loadBaselines(): void {
    if (!existsSync(this.config.baselines_dir)) return;

    const files = readdirSync(this.config.baselines_dir);
    for (const file of files) {
      if (file.endsWith('.json')) {
        this.regressionAnalyzer.loadBaseline(join(this.config.baselines_dir, file));
      }
    }
  }

  /**
   * Subscribe to evaluation events
   */
  on(handler: EvalEventHandler): () => void {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }

  /**
   * Emit an event to all handlers
   */
  private async emit(event: EvalProgressEvent): Promise<void> {
    for (const handler of this.eventHandlers) {
      try {
        await handler(event);
      } catch (error) {
        console.error('Error in event handler:', error);
      }
    }
  }

  /**
   * Abort the current run
   */
  abort(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  /**
   * Discover all evaluation cases
   */
  async discoverCases(): Promise<EvalCase[]> {
    const cases: EvalCase[] = [];
    const evalsDir = this.config.evals_dir;

    if (!existsSync(evalsDir)) {
      return cases;
    }

    // Scan golden_tasks directory
    const goldenDir = join(evalsDir, 'golden_tasks');
    if (existsSync(goldenDir)) {
      cases.push(...this.scanDirectory(goldenDir));
    }

    // Scan adversarial directory
    const adversarialDir = join(evalsDir, 'adversarial');
    if (existsSync(adversarialDir)) {
      cases.push(...this.scanDirectory(adversarialDir));
    }

    // Apply filters
    return cases.filter(c => this.shouldIncludeCase(c));
  }

  /**
   * Scan a directory for eval case files
   */
  private scanDirectory(dir: string): EvalCase[] {
    const cases: EvalCase[] = [];

    if (!existsSync(dir)) return cases;

    const entries = readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        // Recurse into subdirectories
        cases.push(...this.scanDirectory(fullPath));
      } else if (entry.isFile() && (entry.name.endsWith('.yaml') || entry.name.endsWith('.yml'))) {
        try {
          const content = readFileSync(fullPath, 'utf-8');
          const parsed = parseYAML(content) as unknown as EvalCase;

          // Set pack from directory name if not specified
          if (!parsed.metadata?.pack) {
            const packDir = dirname(fullPath);
            const packName = basename(packDir);
            if (parsed.metadata) {
              parsed.metadata.pack = packName;
            }
          }

          if (parsed.metadata?.id) {
            cases.push(parsed);
          }
        } catch (error) {
          if (this.config.verbose) {
            console.error(`Failed to parse ${fullPath}:`, error);
          }
        }
      }
    }

    return cases;
  }

  /**
   * Check if a case should be included based on filters
   */
  private shouldIncludeCase(evalCase: EvalCase): boolean {
    // Check skip flag
    if (evalCase.skip) return false;

    // Check pack filter
    if (this.config.include_packs && this.config.include_packs.length > 0) {
      if (!this.config.include_packs.includes(evalCase.metadata.pack)) {
        return false;
      }
    }

    // Check tag filters
    const caseTags = evalCase.tags || [];

    if (this.config.include_tags && this.config.include_tags.length > 0) {
      const hasIncludedTag = caseTags.some(t => this.config.include_tags!.includes(t));
      if (!hasIncludedTag) return false;
    }

    if (this.config.exclude_tags && this.config.exclude_tags.length > 0) {
      const hasExcludedTag = caseTags.some(t => this.config.exclude_tags!.includes(t));
      if (hasExcludedTag) return false;
    }

    return true;
  }

  /**
   * Run a single evaluation case
   */
  async runCase(
    evalCase: EvalCase,
    provider: ProviderType = this.config.default_provider,
    attempt: number = 1
  ): Promise<EvalResult> {
    const startedAt = new Date().toISOString();
    const startTime = Date.now();

    const result: EvalResult = {
      case_id: evalCase.metadata.id,
      case_name: evalCase.metadata.name,
      pack: evalCase.metadata.pack,
      status: 'pending',
      provider,
      score: 0,
      passed: false,
      assertions: [],
      metrics: {
        duration_ms: 0,
        input_tokens: 0,
        output_tokens: 0,
        total_tokens: 0,
        cost_usd: 0,
        api_calls: 0,
        tool_calls: 0,
        retries: attempt - 1
      },
      started_at: startedAt,
      ended_at: '',
      attempt
    };

    try {
      // Emit case started event
      await this.emit({
        type: 'case_started',
        timestamp: startedAt,
        case_id: evalCase.metadata.id,
        case_name: evalCase.metadata.name
      });

      result.status = 'running';

      // Get response from provider
      const timeout = evalCase.timeout_ms || this.config.timeout_ms;
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('TIMEOUT')), timeout);
      });

      let completion: Awaited<ReturnType<MockProvider['complete']>>;

      if (provider === 'mock') {
        completion = await Promise.race([
          this.mockProvider.complete(evalCase),
          timeoutPromise
        ]);
      } else {
        // In production, this would call the actual provider
        // For now, fall back to mock
        completion = await Promise.race([
          this.mockProvider.complete(evalCase),
          timeoutPromise
        ]);
      }

      result.output = completion.output;
      result.generated_files = completion.files;

      // Update metrics
      Object.assign(result.metrics, completion.metrics);
      result.metrics.total_tokens = result.metrics.input_tokens + result.metrics.output_tokens;

      // Run assertions
      result.assertions = this.assertionEngine.evaluate(
        evalCase.expected_output,
        completion.output,
        completion.files,
        completion.toolCalls
      );

      // Calculate score
      result.score = this.assertionEngine.calculateScore(
        result.assertions,
        evalCase.evaluation.scoring
      );

      // Determine pass/fail
      result.passed = result.score >= evalCase.evaluation.scoring.pass_threshold;
      result.status = result.passed ? 'passed' : 'failed';

    } catch (error) {
      const err = error as Error;

      if (err.message === 'TIMEOUT') {
        result.status = 'timeout';
        result.error = {
          code: 'TIMEOUT',
          message: `Case timed out after ${evalCase.timeout_ms || this.config.timeout_ms}ms`
        };
      } else {
        result.status = 'error';
        result.error = {
          code: 'EXECUTION_ERROR',
          message: err.message,
          stack: err.stack
        };
      }
    }

    // Finalize metrics
    result.metrics.duration_ms = Date.now() - startTime;
    result.ended_at = new Date().toISOString();

    // Emit completion event
    await this.emit({
      type: result.passed ? 'case_completed' : 'case_failed',
      timestamp: result.ended_at,
      case_id: evalCase.metadata.id,
      case_name: evalCase.metadata.name,
      result
    });

    return result;
  }

  /**
   * Run all evaluation cases
   */
  async run(options?: {
    cases?: EvalCase[];
    providers?: ProviderType[];
    name?: string;
  }): Promise<EvalRunSummary> {
    const runId = `eval_${Date.now()}_${randomUUID().substring(0, 8)}`;
    const startedAt = new Date().toISOString();
    const startTime = Date.now();

    this.abortController = new AbortController();

    // Discover or use provided cases
    const cases = options?.cases ?? await this.discoverCases();
    const providers = options?.providers ?? [this.config.default_provider];

    // Emit run started event
    await this.emit({
      type: 'run_started',
      timestamp: startedAt,
      message: `Starting evaluation run ${runId} with ${cases.length} cases`
    });

    // Results storage
    const allResults: EvalResult[] = [];
    let completed = 0;
    let totalCost = 0;

    // Run cases with concurrency limit
    const runWithRetry = async (evalCase: EvalCase, provider: ProviderType): Promise<EvalResult> => {
      let result: EvalResult | null = null;

      for (let attempt = 1; attempt <= this.config.retry_count + 1; attempt++) {
        result = await this.runCase(evalCase, provider, attempt);

        // Don't retry if passed or skipped
        if (result.passed || result.status === 'skipped') {
          break;
        }

        // Don't retry on last attempt
        if (attempt <= this.config.retry_count) {
          await new Promise(resolve => setTimeout(resolve, this.config.retry_delay_ms));
        }
      }

      return result!;
    };

    // Create work queue
    const queue: Array<{ case: EvalCase; provider: ProviderType }> = [];
    for (const evalCase of cases) {
      for (const provider of providers) {
        queue.push({ case: evalCase, provider });
      }
    }

    // Process queue with concurrency
    const workers: Promise<void>[] = [];
    const processNext = async (): Promise<void> => {
      while (queue.length > 0) {
        if (this.abortController?.signal.aborted) {
          break;
        }

        const item = queue.shift();
        if (!item) break;

        // Check cost limit
        if (this.config.track_costs && totalCost >= this.config.max_cost_usd) {
          console.warn(`Cost limit reached ($${totalCost.toFixed(2)} >= $${this.config.max_cost_usd})`);
          break;
        }

        const result = await runWithRetry(item.case, item.provider);
        allResults.push(result);
        completed++;
        totalCost += result.metrics.cost_usd;

        // Emit progress
        await this.emit({
          type: 'progress_update',
          timestamp: new Date().toISOString(),
          progress: {
            completed,
            total: queue.length + completed,
            percent: (completed / (queue.length + completed)) * 100
          }
        });
      }
    };

    // Start workers
    for (let i = 0; i < this.config.concurrency; i++) {
      workers.push(processNext());
    }

    // Wait for all workers
    await Promise.all(workers);

    // Build summary
    const summary = this.buildSummary(runId, options?.name, allResults, startedAt, startTime, providers);

    // Save reports
    await this.saveReports(summary);

    // Emit run completed
    await this.emit({
      type: 'run_completed',
      timestamp: summary.ended_at,
      message: `Evaluation run ${runId} completed. Pass rate: ${(summary.pass_rate * 100).toFixed(1)}%`
    });

    this.abortController = null;

    return summary;
  }

  /**
   * Build the run summary from results
   */
  private buildSummary(
    runId: string,
    name: string | undefined,
    results: EvalResult[],
    startedAt: string,
    startTime: number,
    providers: ProviderType[]
  ): EvalRunSummary {
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => r.status === 'failed').length;
    const skipped = results.filter(r => r.status === 'skipped').length;
    const errors = results.filter(r => r.status === 'error').length;
    const timeouts = results.filter(r => r.status === 'timeout').length;

    // Calculate averages
    const scores = results.filter(r => r.status !== 'skipped').map(r => r.score);
    const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

    // Group by pack
    const byPack: EvalRunSummary['by_pack'] = {};
    for (const result of results) {
      if (!byPack[result.pack]) {
        byPack[result.pack] = { total: 0, passed: 0, failed: 0, avg_score: 0 };
      }
      byPack[result.pack].total++;
      if (result.passed) byPack[result.pack].passed++;
      byPack[result.pack].failed = byPack[result.pack].total - byPack[result.pack].passed;
    }

    // Calculate pack averages
    for (const pack of Object.keys(byPack)) {
      const packResults = results.filter(r => r.pack === pack);
      const packScores = packResults.filter(r => r.status !== 'skipped').map(r => r.score);
      byPack[pack].avg_score = packScores.length > 0
        ? packScores.reduce((a, b) => a + b, 0) / packScores.length
        : 0;
    }

    // Build provider benchmarks
    const providerBenchmarks: ProviderBenchmark[] = [];
    for (const provider of providers) {
      const providerResults = results.filter(r => r.provider === provider);
      if (providerResults.length === 0) continue;

      const latencies = providerResults.map(r => r.metrics.duration_ms).sort((a, b) => a - b);
      const providerScores = providerResults.filter(r => r.status !== 'skipped').map(r => r.score);

      providerBenchmarks.push({
        provider,
        model: providerResults[0].model || 'unknown',
        avg_score: providerScores.length > 0
          ? providerScores.reduce((a, b) => a + b, 0) / providerScores.length
          : 0,
        pass_rate: providerResults.filter(r => r.passed).length / providerResults.length,
        avg_latency_ms: latencies.reduce((a, b) => a + b, 0) / latencies.length,
        p50_latency_ms: latencies[Math.floor(latencies.length * 0.5)] || 0,
        p95_latency_ms: latencies[Math.floor(latencies.length * 0.95)] || 0,
        p99_latency_ms: latencies[Math.floor(latencies.length * 0.99)] || 0,
        total_cost_usd: providerResults.reduce((sum, r) => sum + r.metrics.cost_usd, 0),
        avg_cost_usd: providerResults.reduce((sum, r) => sum + r.metrics.cost_usd, 0) / providerResults.length,
        total_tokens: providerResults.reduce((sum, r) => sum + r.metrics.total_tokens, 0),
        cases_run: providerResults.length,
        cases_passed: providerResults.filter(r => r.passed).length,
        cases_failed: providerResults.filter(r => !r.passed).length,
        error_rate: providerResults.filter(r => r.status === 'error').length / providerResults.length
      });
    }

    // Run regression analysis
    let regressions: RegressionResult[] | undefined;
    if (this.config.enable_regression_detection) {
      regressions = this.regressionAnalyzer.analyze(results);

      // Emit regression events
      for (const regression of regressions.filter(r => r.has_regression)) {
        this.emit({
          type: 'regression_detected',
          timestamp: new Date().toISOString(),
          case_id: regression.case_id,
          message: `Regression detected: score ${(regression.baseline_score * 100).toFixed(1)}% -> ${(regression.current_score * 100).toFixed(1)}%`
        });
      }
    }

    return {
      run_id: runId,
      name,
      total_cases: results.length,
      passed,
      failed,
      skipped,
      errors,
      timeouts,
      pass_rate: results.length > 0 ? passed / results.length : 0,
      avg_score: avgScore,
      total_duration_ms: Date.now() - startTime,
      total_cost_usd: results.reduce((sum, r) => sum + r.metrics.cost_usd, 0),
      total_tokens: results.reduce((sum, r) => sum + r.metrics.total_tokens, 0),
      by_pack: byPack,
      provider_benchmarks: providerBenchmarks.length > 0 ? providerBenchmarks : undefined,
      regressions: regressions?.filter(r => r.has_regression).length ? regressions : undefined,
      results,
      started_at: startedAt,
      ended_at: new Date().toISOString(),
      config: {
        concurrency: this.config.concurrency,
        timeout_ms: this.config.timeout_ms,
        default_provider: this.config.default_provider,
        enable_regression_detection: this.config.enable_regression_detection
      },
      environment: {
        node_version: process.version,
        platform: process.platform,
        arch: process.arch
      }
    };
  }

  /**
   * Save reports in configured formats
   */
  private async saveReports(summary: EvalRunSummary): Promise<void> {
    const timestamp = summary.run_id;

    for (const format of this.config.output_formats) {
      let content: string;
      let extension: string;

      switch (format) {
        case 'json':
          content = this.reportGenerator.generateJSON(summary);
          extension = 'json';
          break;
        case 'html':
          content = this.reportGenerator.generateHTML(summary);
          extension = 'html';
          break;
        case 'markdown':
          content = this.reportGenerator.generateMarkdown(summary);
          extension = 'md';
          break;
        case 'junit':
          content = this.reportGenerator.generateJUnit(summary);
          extension = 'xml';
          break;
        default:
          continue;
      }

      const filePath = join(this.config.results_dir, `${timestamp}.${extension}`);
      writeFileSync(filePath, content);

      if (this.config.verbose) {
        console.log(`Report saved: ${filePath}`);
      }
    }
  }

  /**
   * Save current results as a baseline
   */
  saveBaseline(results: EvalResult[], name?: string): string {
    const timestamp = Date.now();
    const fileName = name ? `${name}.json` : `baseline_${timestamp}.json`;
    const filePath = join(this.config.baselines_dir, fileName);

    this.regressionAnalyzer.saveBaseline(results, filePath);

    return filePath;
  }

  /**
   * Get the current configuration
   */
  getConfig(): Readonly<EvalRunnerConfig> {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<EvalRunnerConfig>): void {
    Object.assign(this.config, updates);
  }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create an evaluation runner with default configuration
 */
export function createEvalRunner(config?: Partial<EvalRunnerConfig>): EvalRunner {
  return new EvalRunner(config);
}

/**
 * Run evaluations with a simple interface
 */
export async function runEvals(options?: {
  evalsDir?: string;
  providers?: ProviderType[];
  concurrency?: number;
  verbose?: boolean;
  outputFormats?: OutputFormat[];
  includePacks?: string[];
  includeTags?: string[];
  excludeTags?: string[];
}): Promise<EvalRunSummary> {
  const runner = createEvalRunner({
    evals_dir: options?.evalsDir,
    benchmark_providers: options?.providers,
    concurrency: options?.concurrency,
    verbose: options?.verbose,
    output_formats: options?.outputFormats,
    include_packs: options?.includePacks,
    include_tags: options?.includeTags,
    exclude_tags: options?.excludeTags
  });

  return runner.run({ providers: options?.providers });
}

// ============================================================================
// CLI SUPPORT
// ============================================================================

/**
 * Parse command line arguments for eval runner
 */
export function parseCliArgs(args: string[]): Partial<EvalRunnerConfig> & { help?: boolean } {
  const config: Partial<EvalRunnerConfig> & { help?: boolean } = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--help':
      case '-h':
        config.help = true;
        break;
      case '--concurrency':
      case '-c':
        config.concurrency = parseInt(args[++i], 10);
        break;
      case '--timeout':
      case '-t':
        config.timeout_ms = parseInt(args[++i], 10);
        break;
      case '--evals-dir':
        config.evals_dir = args[++i];
        break;
      case '--results-dir':
        config.results_dir = args[++i];
        break;
      case '--provider':
      case '-p':
        config.default_provider = args[++i] as ProviderType;
        break;
      case '--verbose':
      case '-v':
        config.verbose = true;
        break;
      case '--format':
      case '-f':
        config.output_formats = args[++i].split(',') as OutputFormat[];
        break;
      case '--pack':
        config.include_packs = config.include_packs || [];
        config.include_packs.push(args[++i]);
        break;
      case '--tag':
        config.include_tags = config.include_tags || [];
        config.include_tags.push(args[++i]);
        break;
      case '--exclude-tag':
        config.exclude_tags = config.exclude_tags || [];
        config.exclude_tags.push(args[++i]);
        break;
      case '--no-regression':
        config.enable_regression_detection = false;
        break;
      case '--max-cost':
        config.max_cost_usd = parseFloat(args[++i]);
        break;
    }
  }

  return config;
}

/**
 * Print CLI help
 */
export function printCliHelp(): void {
  console.log(`
AgentOS Eval Runner

Usage: npx tsx evals/runner.ts [options]

Options:
  -h, --help              Show this help message
  -c, --concurrency <n>   Maximum concurrent evaluations (default: 4)
  -t, --timeout <ms>      Timeout per evaluation in ms (default: 300000)
  --evals-dir <path>      Directory containing eval cases (default: ./evals)
  --results-dir <path>    Directory for storing results (default: ./evals/results)
  -p, --provider <name>   Default provider (mock, anthropic, openai, gemini, deepseek)
  -v, --verbose           Enable verbose output
  -f, --format <formats>  Output formats (comma-separated: json,html,markdown,junit)
  --pack <name>           Filter to specific pack (can be repeated)
  --tag <name>            Include only cases with this tag (can be repeated)
  --exclude-tag <name>    Exclude cases with this tag (can be repeated)
  --no-regression         Disable regression detection
  --max-cost <usd>        Maximum cost limit in USD (default: 100)

Examples:
  npx tsx evals/runner.ts                           # Run all evals
  npx tsx evals/runner.ts --pack devops             # Run only devops pack
  npx tsx evals/runner.ts -c 8 -v                   # Run with 8 workers, verbose
  npx tsx evals/runner.ts --tag cicd --format json  # Run cicd tagged tests, JSON output
`);
}

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

/**
 * Main entry point for CLI usage
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const config = parseCliArgs(args);

  if (config.help) {
    printCliHelp();
    process.exit(0);
  }

  const runner = createEvalRunner(config);

  // Add console logger
  runner.on((event) => {
    if (config.verbose) {
      const timestamp = new Date().toISOString().substring(11, 19);

      switch (event.type) {
        case 'run_started':
        case 'run_completed':
          console.log(`[${timestamp}] ${event.message}`);
          break;
        case 'case_started':
          console.log(`[${timestamp}] Starting: ${event.case_name}`);
          break;
        case 'case_completed':
          console.log(`[${timestamp}] PASS: ${event.case_name} (${(event.result!.score * 100).toFixed(1)}%)`);
          break;
        case 'case_failed':
          console.log(`[${timestamp}] FAIL: ${event.case_name} (${(event.result!.score * 100).toFixed(1)}%)`);
          break;
        case 'regression_detected':
          console.log(`[${timestamp}] REGRESSION: ${event.case_id} - ${event.message}`);
          break;
        case 'progress_update':
          if (event.progress) {
            process.stdout.write(`\r[${timestamp}] Progress: ${event.progress.completed}/${event.progress.total} (${event.progress.percent.toFixed(1)}%)`);
          }
          break;
      }
    }
  });

  try {
    const summary = await runner.run();

    console.log('\n');
    console.log('='.repeat(60));
    console.log(`Evaluation Complete: ${summary.run_id}`);
    console.log('='.repeat(60));
    console.log(`Total Cases: ${summary.total_cases}`);
    console.log(`Passed: ${summary.passed} (${(summary.pass_rate * 100).toFixed(1)}%)`);
    console.log(`Failed: ${summary.failed}`);
    console.log(`Skipped: ${summary.skipped}`);
    console.log(`Errors: ${summary.errors}`);
    console.log(`Avg Score: ${(summary.avg_score * 100).toFixed(1)}%`);
    console.log(`Duration: ${(summary.total_duration_ms / 1000).toFixed(1)}s`);
    console.log(`Total Cost: $${summary.total_cost_usd.toFixed(4)}`);
    console.log('='.repeat(60));

    // Exit with error code if failures
    if (summary.failed > 0 || summary.errors > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Evaluation failed:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  parseYAML,
  parseValue
};
