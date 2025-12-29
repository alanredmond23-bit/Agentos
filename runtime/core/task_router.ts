/**
 * task_router.ts
 * Map task_class/mode to execution steps
 * Routes tasks to appropriate handlers based on configuration
 */

import {
  TaskClass,
  TaskModeMap,
  TaskInput,
  TaskOutput
} from '../types/agent_yaml';

// ============================================================================
// TYPES
// ============================================================================

export type StepType =
  | 'llm_completion'
  | 'tool_call'
  | 'human_input'
  | 'approval'
  | 'gate_check'
  | 'state_update'
  | 'sub_agent'
  | 'conditional'
  | 'parallel'
  | 'loop'
  | 'wait';

export interface ExecutionStep {
  /** Step identifier */
  id: string;

  /** Step name */
  name: string;

  /** Step type */
  type: StepType;

  /** Step configuration */
  config: StepConfig;

  /** Next step ID (for sequential flow) */
  next?: string;

  /** Error handler step ID */
  on_error?: string;

  /** Timeout for this step (ms) */
  timeout_ms?: number;

  /** Retry configuration */
  retry?: {
    max_attempts: number;
    backoff_ms: number;
  };

  /** Skip condition */
  skip_if?: StepCondition;

  /** Required zone for this step */
  required_zone?: 'red' | 'yellow' | 'green';
}

export interface StepConfig {
  /** LLM completion config */
  llm?: {
    preset?: string;
    use_case?: string;
    system_prompt?: string;
    temperature?: number;
    max_tokens?: number;
    tools?: string[];
  };

  /** Tool call config */
  tool?: {
    name: string;
    input_mapping?: Record<string, string>;
    output_key?: string;
  };

  /** Human input config */
  human_input?: {
    prompt: string;
    timeout_ms?: number;
    default_value?: string;
  };

  /** Approval config */
  approval?: {
    reason: string;
    approvers?: string[];
    timeout_ms?: number;
  };

  /** Gate check config */
  gate?: {
    gate_id: string;
    blocking?: boolean;
  };

  /** State update config */
  state?: {
    key: string;
    value_from?: string;
    operation?: 'set' | 'append' | 'increment' | 'delete';
  };

  /** Sub-agent config */
  sub_agent?: {
    agent_id: string;
    input_mapping?: Record<string, string>;
    output_key?: string;
  };

  /** Conditional config */
  conditional?: {
    condition: StepCondition;
    if_true: string;
    if_false: string;
  };

  /** Parallel config */
  parallel?: {
    steps: string[];
    join_mode: 'all' | 'any' | 'majority';
  };

  /** Loop config */
  loop?: {
    over: string;
    step: string;
    collect_to?: string;
    max_iterations?: number;
  };

  /** Wait config */
  wait?: WaitConfig;
}

/**
 * Configuration for wait steps with support for condition-based polling.
 *
 * Wait steps can operate in two modes:
 * 1. **Duration-based**: Simply wait for a fixed duration before proceeding
 * 2. **Condition-based polling**: Repeatedly evaluate a condition until it becomes true
 *
 * When using condition-based polling, the system will:
 * - Poll at configurable intervals (with optional exponential backoff)
 * - Track metrics about polling attempts, duration, and outcomes
 * - Support early cancellation via the `cancellation_token`
 * - Timeout if the condition is not met within `poll_timeout_ms`
 *
 * @example
 * ```typescript
 * // Simple duration wait
 * const waitConfig: WaitConfig = { duration_ms: 5000 };
 *
 * // Condition-based polling with backoff
 * const pollConfig: WaitConfig = {
 *   until: { field: 'state.status', operator: 'eq', value: 'ready' },
 *   poll_interval_ms: 1000,
 *   poll_timeout_ms: 60000,
 *   poll_backoff: {
 *     initial_ms: 500,
 *     max_ms: 10000,
 *     multiplier: 1.5
 *   }
 * };
 * ```
 */
export interface WaitConfig {
  /**
   * Fixed duration to wait in milliseconds.
   * If specified alone, the step will wait for this duration then proceed.
   * If specified with `until`, serves as an initial delay before polling begins.
   */
  duration_ms?: number;

  /**
   * Condition to poll for. When specified, the step will repeatedly evaluate
   * this condition until it returns true or the timeout is reached.
   */
  until?: StepCondition;

  /**
   * Interval between polling attempts in milliseconds.
   * Used when `until` condition is specified.
   * @default 1000
   */
  poll_interval_ms?: number;

  /**
   * Maximum time to poll before timing out in milliseconds.
   * If the condition is not met within this duration, a PollingTimeoutError is thrown.
   * @default 300000 (5 minutes)
   */
  poll_timeout_ms?: number;

  /**
   * Exponential backoff configuration for polling.
   * When specified, the polling interval will increase exponentially
   * between attempts, up to the specified maximum.
   */
  poll_backoff?: PollingBackoffConfig;

  /**
   * Callback invoked after each poll attempt.
   * Useful for logging, metrics, or custom side effects during polling.
   * Receives the current poll attempt number and whether the condition was met.
   *
   * @param attempt - Current attempt number (1-indexed)
   * @param conditionMet - Whether the condition evaluated to true
   * @param context - The current step execution context
   */
  on_poll?: (attempt: number, conditionMet: boolean, context: StepExecutionContext) => void | Promise<void>;

  /**
   * Token for cancelling the polling operation early.
   * When the token's `cancelled` property becomes true, polling stops immediately.
   */
  cancellation_token?: CancellationToken;
}

/**
 * Configuration for exponential backoff during polling.
 *
 * The interval between polls is calculated as:
 * `min(initial_ms * (multiplier ^ attempt), max_ms)`
 *
 * @example
 * ```typescript
 * // Start at 500ms, double each time, cap at 30 seconds
 * const backoff: PollingBackoffConfig = {
 *   initial_ms: 500,
 *   max_ms: 30000,
 *   multiplier: 2.0
 * };
 * ```
 */
export interface PollingBackoffConfig {
  /**
   * Initial polling interval in milliseconds.
   * This is the delay after the first poll attempt.
   */
  initial_ms: number;

  /**
   * Maximum polling interval in milliseconds.
   * The interval will never exceed this value regardless of backoff calculation.
   */
  max_ms: number;

  /**
   * Multiplier applied to the interval after each attempt.
   * Values > 1.0 increase the interval, values < 1.0 decrease it.
   * Typical values are 1.5 or 2.0 for exponential backoff.
   */
  multiplier: number;
}

/**
 * Token used to signal cancellation of a polling operation.
 *
 * @example
 * ```typescript
 * const token: CancellationToken = { cancelled: false };
 *
 * // Start polling in background
 * pollForCondition(config, context, token);
 *
 * // Cancel after some external event
 * token.cancelled = true;
 * ```
 */
export interface CancellationToken {
  /**
   * When set to true, the polling operation should stop immediately.
   */
  cancelled: boolean;
}

/**
 * Metrics collected during a polling operation.
 *
 * These metrics provide visibility into polling behavior and can be used for:
 * - Debugging slow or failing polling operations
 * - Tuning polling parameters (interval, backoff, timeout)
 * - Monitoring and alerting on polling performance
 */
export interface PollingMetrics {
  /**
   * Total number of polling attempts made.
   */
  attempts: number;

  /**
   * Total duration of the polling operation in milliseconds.
   * Measured from the start of the first poll to completion or failure.
   */
  total_duration_ms: number;

  /**
   * Outcome of the polling operation.
   * - `'success'`: Condition was met within timeout
   * - `'timeout'`: Condition was not met within poll_timeout_ms
   * - `'cancelled'`: Polling was cancelled via cancellation_token
   * - `'error'`: An error occurred during polling
   */
  outcome: 'success' | 'timeout' | 'cancelled' | 'error';

  /**
   * Array of individual poll attempt durations in milliseconds.
   * Useful for identifying slow condition evaluations.
   */
  attempt_durations_ms: number[];

  /**
   * Array of intervals actually used between attempts.
   * May differ from configured interval due to backoff.
   */
  actual_intervals_ms: number[];

  /**
   * If outcome is 'error', contains the error message.
   */
  error_message?: string;
}

/**
 * Result of a polling operation including the final outcome and collected metrics.
 */
export interface PollingResult {
  /**
   * Whether the condition was successfully met.
   */
  condition_met: boolean;

  /**
   * Metrics collected during the polling operation.
   */
  metrics: PollingMetrics;

  /**
   * The final evaluated value of the condition field, if available.
   */
  final_value?: unknown;
}

export interface StepCondition {
  /** Field to check */
  field: string;

  /** Operator */
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'exists' | 'matches';

  /** Value to compare */
  value: unknown;
}

export interface TaskDefinition {
  /** Task class (e.g., 'research', 'code', 'analyze') */
  task_class: string;

  /** Available modes */
  modes: Record<string, ModeDefinition>;

  /** Default mode */
  default_mode: string;

  /** Input schema */
  input_schema?: Record<string, { type: string; required?: boolean; description?: string }>;

  /** Output schema */
  output_schema?: Record<string, { type: string; description?: string }>;

  /** Required capabilities */
  required_capabilities?: string[];

  /** Zone constraints */
  allowed_zones?: ('red' | 'yellow' | 'green')[];
}

export interface ModeDefinition {
  /** Mode name */
  name: string;

  /** Description */
  description: string;

  /** Entry step */
  entry_step: string;

  /** Exit step */
  exit_step: string;

  /** All steps */
  steps: ExecutionStep[];

  /** Expected duration (ms) */
  expected_duration_ms?: number;

  /** Cost estimate (USD) */
  estimated_cost_usd?: number;
}

export interface TaskRoutingResult {
  /** Selected task definition */
  task: TaskDefinition;

  /** Selected mode */
  mode: ModeDefinition;

  /** Execution plan */
  steps: ExecutionStep[];

  /** Entry step */
  entry_step: ExecutionStep;

  /** Estimated duration */
  estimated_duration_ms: number;

  /** Estimated cost */
  estimated_cost_usd: number;
}

export interface StepExecutionContext {
  /** Current step */
  step: ExecutionStep;

  /** Input data */
  input: Record<string, unknown>;

  /** Accumulated state */
  state: Record<string, unknown>;

  /** Previous step results */
  previous_results: Map<string, unknown>;

  /** Current zone */
  zone: 'red' | 'yellow' | 'green';

  /** Parent context (for sub-agents) */
  parent?: StepExecutionContext;
}

export interface StepExecutionResult {
  /** Step ID */
  step_id: string;

  /** Success status */
  success: boolean;

  /** Output data */
  output?: unknown;

  /** Error if failed */
  error?: {
    code: string;
    message: string;
  };

  /** Duration */
  duration_ms: number;

  /** Next step to execute */
  next_step?: string;

  /** State updates */
  state_updates?: Record<string, unknown>;
}

// ============================================================================
// BUILT-IN TASK DEFINITIONS
// ============================================================================

const BUILTIN_TASKS: TaskDefinition[] = [
  // Research task
  {
    task_class: 'research',
    modes: {
      quick: {
        name: 'Quick Research',
        description: 'Fast research with single LLM call',
        entry_step: 'research_quick',
        exit_step: 'research_quick',
        steps: [
          {
            id: 'research_quick',
            name: 'Quick Research',
            type: 'llm_completion',
            config: {
              llm: {
                preset: 'research_deep',
                system_prompt: 'You are a research assistant. Provide comprehensive but concise answers.',
                max_tokens: 2000
              }
            }
          }
        ],
        expected_duration_ms: 10000,
        estimated_cost_usd: 0.05
      },
      deep: {
        name: 'Deep Research',
        description: 'Multi-step research with tool usage',
        entry_step: 'plan',
        exit_step: 'synthesize',
        steps: [
          {
            id: 'plan',
            name: 'Plan Research',
            type: 'llm_completion',
            config: {
              llm: {
                preset: 'balanced',
                system_prompt: 'Create a research plan. Output a JSON array of research queries.',
                max_tokens: 500
              }
            },
            next: 'gather'
          },
          {
            id: 'gather',
            name: 'Gather Information',
            type: 'loop',
            config: {
              loop: {
                over: 'plan_output.queries',
                step: 'search',
                collect_to: 'research_results',
                max_iterations: 5
              }
            },
            next: 'synthesize'
          },
          {
            id: 'search',
            name: 'Search',
            type: 'tool_call',
            config: {
              tool: {
                name: 'web_search',
                input_mapping: { query: 'current_item' },
                output_key: 'search_result'
              }
            }
          },
          {
            id: 'synthesize',
            name: 'Synthesize Results',
            type: 'llm_completion',
            config: {
              llm: {
                preset: 'analytical',
                system_prompt: 'Synthesize the research results into a coherent answer.',
                max_tokens: 4000
              }
            }
          }
        ],
        expected_duration_ms: 60000,
        estimated_cost_usd: 0.25
      }
    },
    default_mode: 'quick',
    input_schema: {
      query: { type: 'string', required: true, description: 'Research query' },
      context: { type: 'string', required: false, description: 'Additional context' }
    },
    output_schema: {
      answer: { type: 'string', description: 'Research answer' },
      sources: { type: 'array', description: 'Sources used' }
    }
  },

  // Code task
  {
    task_class: 'code',
    modes: {
      generate: {
        name: 'Generate Code',
        description: 'Generate code from description',
        entry_step: 'analyze',
        exit_step: 'generate',
        steps: [
          {
            id: 'analyze',
            name: 'Analyze Requirements',
            type: 'llm_completion',
            config: {
              llm: {
                preset: 'coding_precise',
                system_prompt: 'Analyze the coding requirements. Identify the language, patterns, and approach.',
                max_tokens: 1000
              }
            },
            next: 'generate'
          },
          {
            id: 'generate',
            name: 'Generate Code',
            type: 'llm_completion',
            config: {
              llm: {
                preset: 'coding_precise',
                temperature: 0.2,
                max_tokens: 4000
              }
            }
          }
        ],
        expected_duration_ms: 30000,
        estimated_cost_usd: 0.15
      },
      review: {
        name: 'Review Code',
        description: 'Review and improve code',
        entry_step: 'review',
        exit_step: 'improve',
        steps: [
          {
            id: 'review',
            name: 'Review Code',
            type: 'llm_completion',
            config: {
              llm: {
                preset: 'coding_review',
                system_prompt: 'Review this code for bugs, security issues, and improvements.',
                max_tokens: 2000
              }
            },
            next: 'improve'
          },
          {
            id: 'improve',
            name: 'Suggest Improvements',
            type: 'llm_completion',
            config: {
              llm: {
                preset: 'coding_precise',
                system_prompt: 'Based on the review, provide improved code.',
                max_tokens: 4000
              }
            }
          }
        ],
        expected_duration_ms: 45000,
        estimated_cost_usd: 0.20
      },
      debug: {
        name: 'Debug Code',
        description: 'Debug and fix code issues',
        entry_step: 'diagnose',
        exit_step: 'fix',
        steps: [
          {
            id: 'diagnose',
            name: 'Diagnose Issue',
            type: 'llm_completion',
            config: {
              llm: {
                preset: 'coding_debug',
                system_prompt: 'Analyze the error and diagnose the root cause.',
                max_tokens: 1500
              }
            },
            next: 'fix'
          },
          {
            id: 'fix',
            name: 'Fix Issue',
            type: 'llm_completion',
            config: {
              llm: {
                preset: 'coding_precise',
                temperature: 0.1,
                max_tokens: 4000
              }
            }
          }
        ],
        expected_duration_ms: 40000,
        estimated_cost_usd: 0.18
      }
    },
    default_mode: 'generate',
    input_schema: {
      code: { type: 'string', required: false, description: 'Existing code' },
      description: { type: 'string', required: true, description: 'Task description' },
      language: { type: 'string', required: false, description: 'Programming language' },
      error: { type: 'string', required: false, description: 'Error message for debug mode' }
    },
    output_schema: {
      code: { type: 'string', description: 'Generated/fixed code' },
      explanation: { type: 'string', description: 'Explanation of changes' }
    }
  },

  // Analyze task
  {
    task_class: 'analyze',
    modes: {
      quick: {
        name: 'Quick Analysis',
        description: 'Fast analysis with single pass',
        entry_step: 'analyze',
        exit_step: 'analyze',
        steps: [
          {
            id: 'analyze',
            name: 'Analyze Content',
            type: 'llm_completion',
            config: {
              llm: {
                preset: 'analytical',
                system_prompt: 'Analyze the provided content and extract key insights.',
                max_tokens: 2000
              }
            }
          }
        ],
        expected_duration_ms: 15000,
        estimated_cost_usd: 0.08
      },
      detailed: {
        name: 'Detailed Analysis',
        description: 'Multi-aspect detailed analysis',
        entry_step: 'structure',
        exit_step: 'report',
        steps: [
          {
            id: 'structure',
            name: 'Structure Analysis',
            type: 'llm_completion',
            config: {
              llm: {
                preset: 'analytical',
                system_prompt: 'Identify the key aspects to analyze.',
                max_tokens: 500
              }
            },
            next: 'aspects'
          },
          {
            id: 'aspects',
            name: 'Analyze Aspects',
            type: 'parallel',
            config: {
              parallel: {
                steps: ['sentiment', 'themes', 'entities'],
                join_mode: 'all'
              }
            },
            next: 'report'
          },
          {
            id: 'sentiment',
            name: 'Sentiment Analysis',
            type: 'llm_completion',
            config: {
              llm: {
                preset: 'analytical',
                system_prompt: 'Analyze the sentiment of the content.',
                max_tokens: 500
              }
            }
          },
          {
            id: 'themes',
            name: 'Theme Extraction',
            type: 'llm_completion',
            config: {
              llm: {
                preset: 'analytical',
                system_prompt: 'Extract the main themes from the content.',
                max_tokens: 500
              }
            }
          },
          {
            id: 'entities',
            name: 'Entity Extraction',
            type: 'llm_completion',
            config: {
              llm: {
                preset: 'analytical',
                system_prompt: 'Extract named entities from the content.',
                max_tokens: 500
              }
            }
          },
          {
            id: 'report',
            name: 'Generate Report',
            type: 'llm_completion',
            config: {
              llm: {
                preset: 'analytical',
                system_prompt: 'Synthesize all analyses into a comprehensive report.',
                max_tokens: 3000
              }
            }
          }
        ],
        expected_duration_ms: 60000,
        estimated_cost_usd: 0.30
      }
    },
    default_mode: 'quick',
    input_schema: {
      content: { type: 'string', required: true, description: 'Content to analyze' },
      focus: { type: 'string', required: false, description: 'Analysis focus area' }
    },
    output_schema: {
      analysis: { type: 'object', description: 'Analysis results' },
      summary: { type: 'string', description: 'Summary of findings' }
    }
  },

  // Conversation task
  {
    task_class: 'conversation',
    modes: {
      chat: {
        name: 'Chat',
        description: 'Conversational interaction',
        entry_step: 'respond',
        exit_step: 'respond',
        steps: [
          {
            id: 'respond',
            name: 'Generate Response',
            type: 'llm_completion',
            config: {
              llm: {
                preset: 'conversational',
                max_tokens: 1000
              }
            }
          }
        ],
        expected_duration_ms: 5000,
        estimated_cost_usd: 0.02
      },
      interview: {
        name: 'Interview',
        description: 'Structured interview with follow-ups',
        entry_step: 'question',
        exit_step: 'conclude',
        steps: [
          {
            id: 'question',
            name: 'Ask Question',
            type: 'llm_completion',
            config: {
              llm: {
                preset: 'conversational',
                system_prompt: 'You are conducting an interview. Ask probing questions.',
                max_tokens: 500
              }
            },
            next: 'wait_response'
          },
          {
            id: 'wait_response',
            name: 'Wait for Response',
            type: 'human_input',
            config: {
              human_input: {
                prompt: 'Your response:',
                timeout_ms: 300000
              }
            },
            next: 'follow_up'
          },
          {
            id: 'follow_up',
            name: 'Follow Up',
            type: 'conditional',
            config: {
              conditional: {
                condition: {
                  field: 'state.question_count',
                  operator: 'lt',
                  value: 5
                },
                if_true: 'question',
                if_false: 'conclude'
              }
            }
          },
          {
            id: 'conclude',
            name: 'Conclude Interview',
            type: 'llm_completion',
            config: {
              llm: {
                preset: 'conversational',
                system_prompt: 'Summarize the interview and provide conclusions.',
                max_tokens: 1000
              }
            }
          }
        ],
        expected_duration_ms: 600000,
        estimated_cost_usd: 0.15
      }
    },
    default_mode: 'chat'
  },

  // Transform task
  {
    task_class: 'transform',
    modes: {
      format: {
        name: 'Format Transform',
        description: 'Transform data format',
        entry_step: 'transform',
        exit_step: 'transform',
        steps: [
          {
            id: 'transform',
            name: 'Transform Data',
            type: 'llm_completion',
            config: {
              llm: {
                preset: 'structured_output',
                system_prompt: 'Transform the input data to the specified format.',
                max_tokens: 4000
              }
            }
          }
        ],
        expected_duration_ms: 10000,
        estimated_cost_usd: 0.05
      },
      summarize: {
        name: 'Summarize',
        description: 'Summarize content',
        entry_step: 'summarize',
        exit_step: 'summarize',
        steps: [
          {
            id: 'summarize',
            name: 'Summarize Content',
            type: 'llm_completion',
            config: {
              llm: {
                preset: 'balanced',
                system_prompt: 'Create a concise summary of the content.',
                max_tokens: 1000
              }
            }
          }
        ],
        expected_duration_ms: 8000,
        estimated_cost_usd: 0.03
      },
      translate: {
        name: 'Translate',
        description: 'Translate content',
        entry_step: 'translate',
        exit_step: 'translate',
        steps: [
          {
            id: 'translate',
            name: 'Translate Content',
            type: 'llm_completion',
            config: {
              llm: {
                preset: 'translation',
                max_tokens: 4000
              }
            }
          }
        ],
        expected_duration_ms: 15000,
        estimated_cost_usd: 0.06
      }
    },
    default_mode: 'format'
  }
];

// ============================================================================
// TASK ROUTER
// ============================================================================

export class TaskRouter {
  private tasks: Map<string, TaskDefinition> = new Map();
  private stepHandlers: Map<StepType, StepHandler> = new Map();

  constructor() {
    this.registerBuiltinTasks();
    this.registerBuiltinHandlers();
  }

  private registerBuiltinTasks(): void {
    for (const task of BUILTIN_TASKS) {
      this.tasks.set(task.task_class, task);
    }
  }

  private registerBuiltinHandlers(): void {
    // Register handlers for each step type
    this.stepHandlers.set('llm_completion', this.handleLLMCompletion.bind(this));
    this.stepHandlers.set('tool_call', this.handleToolCall.bind(this));
    this.stepHandlers.set('conditional', this.handleConditional.bind(this));
    this.stepHandlers.set('state_update', this.handleStateUpdate.bind(this));
    this.stepHandlers.set('wait', this.handleWait.bind(this));
  }

  // ============================================================================
  // TASK REGISTRATION
  // ============================================================================

  /**
   * Register a custom task definition
   */
  registerTask(task: TaskDefinition): void {
    this.tasks.set(task.task_class, task);
  }

  /**
   * Get a task definition
   */
  getTask(taskClass: string): TaskDefinition | undefined {
    return this.tasks.get(taskClass);
  }

  /**
   * List all task classes
   */
  listTaskClasses(): string[] {
    return Array.from(this.tasks.keys());
  }

  /**
   * List modes for a task
   */
  listModes(taskClass: string): string[] {
    const task = this.tasks.get(taskClass);
    return task ? Object.keys(task.modes) : [];
  }

  // ============================================================================
  // ROUTING
  // ============================================================================

  /**
   * Route a task to its execution plan
   */
  route(
    taskClass: string,
    mode?: string,
    options?: {
      zone?: 'red' | 'yellow' | 'green';
    }
  ): TaskRoutingResult {
    const task = this.tasks.get(taskClass);
    if (!task) {
      throw new TaskRouterError(`Unknown task class: ${taskClass}`, 'UNKNOWN_TASK');
    }

    // Determine mode
    const modeName = mode ?? task.default_mode;
    const modeDefinition = task.modes[modeName];
    if (!modeDefinition) {
      throw new TaskRouterError(
        `Unknown mode '${modeName}' for task '${taskClass}'`,
        'UNKNOWN_MODE'
      );
    }

    // Check zone constraints
    if (options?.zone && task.allowed_zones && !task.allowed_zones.includes(options.zone)) {
      throw new TaskRouterError(
        `Task '${taskClass}' not allowed in ${options.zone} zone`,
        'ZONE_NOT_ALLOWED'
      );
    }

    // Find entry step
    const entryStep = modeDefinition.steps.find((s) => s.id === modeDefinition.entry_step);
    if (!entryStep) {
      throw new TaskRouterError(
        `Entry step '${modeDefinition.entry_step}' not found`,
        'INVALID_ENTRY_STEP'
      );
    }

    return {
      task,
      mode: modeDefinition,
      steps: modeDefinition.steps,
      entry_step: entryStep,
      estimated_duration_ms: modeDefinition.expected_duration_ms ?? 30000,
      estimated_cost_usd: modeDefinition.estimated_cost_usd ?? 0.10
    };
  }

  /**
   * Get the next step in execution
   */
  getNextStep(
    routingResult: TaskRoutingResult,
    currentStepId: string,
    stepResult: StepExecutionResult
  ): ExecutionStep | null {
    // Use explicit next from result if provided
    let nextStepId = stepResult.next_step;

    // Otherwise use the step's default next
    if (!nextStepId) {
      const currentStep = routingResult.steps.find((s) => s.id === currentStepId);
      nextStepId = currentStep?.next;
    }

    // Handle errors
    if (!stepResult.success) {
      const currentStep = routingResult.steps.find((s) => s.id === currentStepId);
      if (currentStep?.on_error) {
        nextStepId = currentStep.on_error;
      } else {
        return null; // Stop execution on error without handler
      }
    }

    // Check if we've reached the exit
    if (!nextStepId || currentStepId === routingResult.mode.exit_step) {
      return null;
    }

    return routingResult.steps.find((s) => s.id === nextStepId) ?? null;
  }

  // ============================================================================
  // STEP HANDLERS
  // ============================================================================

  /**
   * Register a step handler
   */
  registerStepHandler(type: StepType, handler: StepHandler): void {
    this.stepHandlers.set(type, handler);
  }

  /**
   * Execute a step
   */
  async executeStep(
    step: ExecutionStep,
    context: StepExecutionContext
  ): Promise<StepExecutionResult> {
    const startTime = Date.now();

    // Check skip condition
    if (step.skip_if && this.evaluateCondition(step.skip_if, context)) {
      return {
        step_id: step.id,
        success: true,
        duration_ms: Date.now() - startTime,
        next_step: step.next
      };
    }

    // Check zone requirement
    if (step.required_zone && context.zone !== step.required_zone) {
      return {
        step_id: step.id,
        success: false,
        error: {
          code: 'ZONE_MISMATCH',
          message: `Step requires ${step.required_zone} zone but current zone is ${context.zone}`
        },
        duration_ms: Date.now() - startTime
      };
    }

    // Get handler
    const handler = this.stepHandlers.get(step.type);
    if (!handler) {
      return {
        step_id: step.id,
        success: false,
        error: {
          code: 'NO_HANDLER',
          message: `No handler for step type: ${step.type}`
        },
        duration_ms: Date.now() - startTime
      };
    }

    // Execute with retries
    const maxAttempts = step.retry?.max_attempts ?? 1;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await this.executeWithTimeout(
          () => handler(step, context),
          step.timeout_ms ?? 60000
        );
        return result;
      } catch (error) {
        lastError = error as Error;
        if (attempt < maxAttempts) {
          const backoff = (step.retry?.backoff_ms ?? 1000) * attempt;
          await new Promise((resolve) => setTimeout(resolve, backoff));
        }
      }
    }

    return {
      step_id: step.id,
      success: false,
      error: {
        code: 'EXECUTION_FAILED',
        message: lastError?.message ?? 'Unknown error'
      },
      duration_ms: Date.now() - startTime
    };
  }

  /**
   * Execute with timeout
   */
  private async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Step timeout')), timeoutMs)
      )
    ]);
  }

  // ============================================================================
  // BUILT-IN STEP HANDLERS
  // ============================================================================

  private async handleLLMCompletion(
    step: ExecutionStep,
    context: StepExecutionContext
  ): Promise<StepExecutionResult> {
    const startTime = Date.now();

    // In production, this would call the model router and LLM adapter
    // For now, return a mock result
    const mockOutput = `Mock LLM completion for step: ${step.name}`;

    return {
      step_id: step.id,
      success: true,
      output: mockOutput,
      duration_ms: Date.now() - startTime,
      next_step: step.next,
      state_updates: {
        [`${step.id}_output`]: mockOutput
      }
    };
  }

  private async handleToolCall(
    step: ExecutionStep,
    context: StepExecutionContext
  ): Promise<StepExecutionResult> {
    const startTime = Date.now();
    const toolConfig = step.config.tool;

    if (!toolConfig) {
      return {
        step_id: step.id,
        success: false,
        error: { code: 'NO_TOOL_CONFIG', message: 'Tool configuration missing' },
        duration_ms: Date.now() - startTime
      };
    }

    // In production, this would use the tools registry
    // For now, return a mock result
    return {
      step_id: step.id,
      success: true,
      output: { mock: 'tool result' },
      duration_ms: Date.now() - startTime,
      next_step: step.next,
      state_updates: toolConfig.output_key
        ? { [toolConfig.output_key]: { mock: 'tool result' } }
        : undefined
    };
  }

  private async handleConditional(
    step: ExecutionStep,
    context: StepExecutionContext
  ): Promise<StepExecutionResult> {
    const startTime = Date.now();
    const condConfig = step.config.conditional;

    if (!condConfig) {
      return {
        step_id: step.id,
        success: false,
        error: { code: 'NO_COND_CONFIG', message: 'Conditional configuration missing' },
        duration_ms: Date.now() - startTime
      };
    }

    const result = this.evaluateCondition(condConfig.condition, context);

    return {
      step_id: step.id,
      success: true,
      output: { condition_result: result },
      duration_ms: Date.now() - startTime,
      next_step: result ? condConfig.if_true : condConfig.if_false
    };
  }

  private async handleStateUpdate(
    step: ExecutionStep,
    context: StepExecutionContext
  ): Promise<StepExecutionResult> {
    const startTime = Date.now();
    const stateConfig = step.config.state;

    if (!stateConfig) {
      return {
        step_id: step.id,
        success: false,
        error: { code: 'NO_STATE_CONFIG', message: 'State configuration missing' },
        duration_ms: Date.now() - startTime
      };
    }

    const value = stateConfig.value_from
      ? this.resolveValue(stateConfig.value_from, context)
      : undefined;

    return {
      step_id: step.id,
      success: true,
      duration_ms: Date.now() - startTime,
      next_step: step.next,
      state_updates: { [stateConfig.key]: value }
    };
  }

  /**
   * Handles wait steps with support for both fixed duration waits and condition-based polling.
   *
   * This handler supports two primary modes:
   *
   * 1. **Duration-based wait**: When only `duration_ms` is specified, the step simply
   *    waits for that duration before proceeding.
   *
   * 2. **Condition-based polling**: When `until` is specified, the step polls the
   *    condition at regular intervals until it evaluates to true or the timeout is reached.
   *
   * When both `duration_ms` and `until` are specified, the duration serves as an
   * initial delay before polling begins.
   *
   * @param step - The execution step containing wait configuration
   * @param context - The current step execution context
   * @returns Step execution result including polling metrics if applicable
   *
   * @throws {PollingTimeoutError} When the polling timeout is exceeded
   * @throws {PollingCancelledError} When polling is cancelled via cancellation token
   *
   * @example
   * ```typescript
   * // Simple duration wait
   * const step: ExecutionStep = {
   *   id: 'wait_step',
   *   name: 'Wait 5 seconds',
   *   type: 'wait',
   *   config: {
   *     wait: { duration_ms: 5000 }
   *   }
   * };
   *
   * // Condition-based polling with exponential backoff
   * const pollingStep: ExecutionStep = {
   *   id: 'poll_step',
   *   name: 'Wait for ready state',
   *   type: 'wait',
   *   config: {
   *     wait: {
   *       until: { field: 'state.status', operator: 'eq', value: 'ready' },
   *       poll_interval_ms: 500,
   *       poll_timeout_ms: 30000,
   *       poll_backoff: { initial_ms: 500, max_ms: 5000, multiplier: 1.5 }
   *     }
   *   }
   * };
   * ```
   */
  private async handleWait(
    step: ExecutionStep,
    context: StepExecutionContext
  ): Promise<StepExecutionResult> {
    const startTime = Date.now();
    const waitConfig = step.config.wait;

    // If no config, just return immediately
    if (!waitConfig) {
      return {
        step_id: step.id,
        success: true,
        duration_ms: Date.now() - startTime,
        next_step: step.next
      };
    }

    // Handle initial duration wait (if specified with condition, serves as pre-poll delay)
    if (waitConfig.duration_ms) {
      await new Promise((resolve) => setTimeout(resolve, waitConfig.duration_ms));
    }

    // If no condition to poll for, we're done
    if (!waitConfig.until) {
      return {
        step_id: step.id,
        success: true,
        duration_ms: Date.now() - startTime,
        next_step: step.next
      };
    }

    // Perform condition-based polling
    try {
      const pollingResult = await this.pollForCondition(waitConfig, context);

      return {
        step_id: step.id,
        success: pollingResult.condition_met,
        output: {
          polling_result: pollingResult,
          final_value: pollingResult.final_value
        },
        duration_ms: Date.now() - startTime,
        next_step: step.next,
        state_updates: {
          [`${step.id}_polling_metrics`]: pollingResult.metrics,
          [`${step.id}_condition_met`]: pollingResult.condition_met
        }
      };
    } catch (error) {
      if (error instanceof PollingTimeoutError) {
        return {
          step_id: step.id,
          success: false,
          error: {
            code: 'POLLING_TIMEOUT',
            message: error.message
          },
          output: {
            polling_metrics: error.metrics
          },
          duration_ms: Date.now() - startTime,
          state_updates: {
            [`${step.id}_polling_metrics`]: error.metrics
          }
        };
      }

      if (error instanceof PollingCancelledError) {
        return {
          step_id: step.id,
          success: false,
          error: {
            code: 'POLLING_CANCELLED',
            message: error.message
          },
          output: {
            polling_metrics: error.metrics
          },
          duration_ms: Date.now() - startTime,
          state_updates: {
            [`${step.id}_polling_metrics`]: error.metrics
          }
        };
      }

      // Re-throw unexpected errors
      throw error;
    }
  }

  // ============================================================================
  // POLLING IMPLEMENTATION
  // ============================================================================

  /**
   * Polls for a condition to become true with configurable intervals, backoff, and timeout.
   *
   * This method implements a robust polling mechanism with the following features:
   *
   * - **Configurable polling interval**: Control how frequently the condition is checked
   * - **Exponential backoff**: Optionally increase interval between attempts to reduce load
   * - **Timeout handling**: Throws `PollingTimeoutError` if condition not met in time
   * - **Cancellation support**: Early exit when `cancellation_token.cancelled` becomes true
   * - **Metrics tracking**: Collects detailed metrics about the polling operation
   * - **Callback support**: Optional `on_poll` callback invoked after each attempt
   *
   * @param config - The wait configuration containing polling parameters
   * @param context - The step execution context used for condition evaluation
   * @returns A `PollingResult` containing success status and detailed metrics
   *
   * @throws {PollingTimeoutError} When `poll_timeout_ms` is exceeded without condition being met
   * @throws {PollingCancelledError} When `cancellation_token.cancelled` becomes true
   *
   * @example
   * ```typescript
   * const config: WaitConfig = {
   *   until: { field: 'state.jobStatus', operator: 'eq', value: 'complete' },
   *   poll_interval_ms: 2000,
   *   poll_timeout_ms: 120000,
   *   poll_backoff: { initial_ms: 1000, max_ms: 10000, multiplier: 1.5 },
   *   on_poll: (attempt, met, ctx) => {
   *     console.log(`Poll attempt ${attempt}: condition met = ${met}`);
   *   }
   * };
   *
   * const result = await router.pollForCondition(config, context);
   * console.log(`Completed in ${result.metrics.attempts} attempts`);
   * ```
   */
  private async pollForCondition(
    config: WaitConfig,
    context: StepExecutionContext
  ): Promise<PollingResult> {
    // Extract configuration with defaults
    const condition = config.until!;
    const pollIntervalMs = config.poll_interval_ms ?? 1000;
    const pollTimeoutMs = config.poll_timeout_ms ?? 300000;
    const backoffConfig = config.poll_backoff;
    const onPoll = config.on_poll;
    const cancellationToken = config.cancellation_token;

    // Initialize metrics tracking
    const metrics: PollingMetrics = {
      attempts: 0,
      total_duration_ms: 0,
      outcome: 'success',
      attempt_durations_ms: [],
      actual_intervals_ms: []
    };

    const pollingStartTime = Date.now();
    let currentInterval = backoffConfig?.initial_ms ?? pollIntervalMs;
    let conditionMet = false;
    let finalValue: unknown;

    // Main polling loop
    while (true) {
      // Check for cancellation before each poll attempt
      if (cancellationToken?.cancelled) {
        metrics.outcome = 'cancelled';
        metrics.total_duration_ms = Date.now() - pollingStartTime;
        throw new PollingCancelledError(
          `Polling cancelled after ${metrics.attempts} attempts`,
          metrics
        );
      }

      // Check for timeout
      const elapsedMs = Date.now() - pollingStartTime;
      if (elapsedMs >= pollTimeoutMs) {
        metrics.outcome = 'timeout';
        metrics.total_duration_ms = elapsedMs;
        throw new PollingTimeoutError(
          `Polling timed out after ${metrics.attempts} attempts (${elapsedMs}ms elapsed, timeout: ${pollTimeoutMs}ms)`,
          metrics,
          condition,
          pollTimeoutMs
        );
      }

      // Perform the poll attempt
      const attemptStartTime = Date.now();
      metrics.attempts++;

      try {
        // Evaluate the condition
        conditionMet = this.evaluateCondition(condition, context);
        finalValue = this.resolveValue(condition.field, context);
      } catch (error) {
        // Record error in metrics but continue polling
        metrics.attempt_durations_ms.push(Date.now() - attemptStartTime);
        const errorMessage = error instanceof Error ? error.message : String(error);

        // If this is a critical error (not just a transient evaluation failure), track it
        if (!metrics.error_message) {
          metrics.error_message = errorMessage;
        }

        // Continue to next poll attempt after interval
        conditionMet = false;
      }

      const attemptDuration = Date.now() - attemptStartTime;
      metrics.attempt_durations_ms.push(attemptDuration);

      // Invoke on_poll callback if provided
      if (onPoll) {
        try {
          await Promise.resolve(onPoll(metrics.attempts, conditionMet, context));
        } catch (callbackError) {
          // Log callback errors but don't fail the polling operation
          // In production, this would integrate with the logging system
          console.error('on_poll callback error:', callbackError);
        }
      }

      // Check if condition is met
      if (conditionMet) {
        metrics.outcome = 'success';
        metrics.total_duration_ms = Date.now() - pollingStartTime;
        return {
          condition_met: true,
          metrics,
          final_value: finalValue
        };
      }

      // Calculate next interval (with backoff if configured)
      let nextInterval = currentInterval;
      if (backoffConfig) {
        // Apply exponential backoff: interval = initial * (multiplier ^ (attempts - 1))
        // But cap at max_ms
        nextInterval = Math.min(
          backoffConfig.initial_ms * Math.pow(backoffConfig.multiplier, metrics.attempts - 1),
          backoffConfig.max_ms
        );
        currentInterval = nextInterval;
      }

      // Record the actual interval that will be used
      metrics.actual_intervals_ms.push(nextInterval);

      // Check if waiting for the full interval would exceed timeout
      const timeRemaining = pollTimeoutMs - (Date.now() - pollingStartTime);
      if (timeRemaining <= 0) {
        // Already timed out, will be caught on next iteration
        continue;
      }

      // Wait for the interval (or remaining time, whichever is smaller)
      const waitTime = Math.min(nextInterval, timeRemaining);

      // Interruptible wait that checks cancellation periodically
      await this.interruptibleWait(waitTime, cancellationToken);
    }
  }

  /**
   * Performs a wait that can be interrupted by a cancellation token.
   *
   * Rather than using a single `setTimeout`, this method breaks the wait into
   * smaller chunks and checks the cancellation token between each chunk.
   * This ensures responsive cancellation even during long wait intervals.
   *
   * @param durationMs - Total duration to wait in milliseconds
   * @param cancellationToken - Optional token to check for cancellation
   * @param checkIntervalMs - How often to check the cancellation token (default: 100ms)
   *
   * @example
   * ```typescript
   * const token = { cancelled: false };
   *
   * // Start waiting
   * const waitPromise = this.interruptibleWait(5000, token);
   *
   * // Cancel after 2 seconds
   * setTimeout(() => { token.cancelled = true; }, 2000);
   *
   * await waitPromise; // Returns after ~2 seconds instead of 5
   * ```
   */
  private async interruptibleWait(
    durationMs: number,
    cancellationToken?: CancellationToken,
    checkIntervalMs: number = 100
  ): Promise<void> {
    if (!cancellationToken) {
      // No cancellation support needed, just wait the full duration
      await new Promise((resolve) => setTimeout(resolve, durationMs));
      return;
    }

    const startTime = Date.now();
    const endTime = startTime + durationMs;

    while (Date.now() < endTime) {
      // Check for cancellation
      if (cancellationToken.cancelled) {
        return;
      }

      // Wait for a small interval or remaining time, whichever is smaller
      const remainingTime = endTime - Date.now();
      const waitTime = Math.min(checkIntervalMs, remainingTime);

      if (waitTime > 0) {
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }
  }

  /**
   * Calculates the polling interval for a given attempt with exponential backoff.
   *
   * This is a utility method that can be used to preview or debug the backoff
   * progression without actually performing polling.
   *
   * @param attempt - The attempt number (1-indexed)
   * @param config - The backoff configuration
   * @returns The interval in milliseconds for the given attempt
   *
   * @example
   * ```typescript
   * const backoff = { initial_ms: 1000, max_ms: 30000, multiplier: 2.0 };
   *
   * calculateBackoffInterval(1, backoff); // 1000
   * calculateBackoffInterval(2, backoff); // 2000
   * calculateBackoffInterval(3, backoff); // 4000
   * calculateBackoffInterval(4, backoff); // 8000
   * calculateBackoffInterval(5, backoff); // 16000
   * calculateBackoffInterval(6, backoff); // 30000 (capped at max)
   * calculateBackoffInterval(7, backoff); // 30000 (capped at max)
   * ```
   */
  public calculateBackoffInterval(attempt: number, config: PollingBackoffConfig): number {
    if (attempt < 1) {
      return config.initial_ms;
    }
    return Math.min(
      config.initial_ms * Math.pow(config.multiplier, attempt - 1),
      config.max_ms
    );
  }

  /**
   * Creates a default cancellation token.
   *
   * This is a convenience method for creating cancellation tokens
   * that can be passed to polling operations.
   *
   * @returns A new cancellation token with `cancelled` set to false
   *
   * @example
   * ```typescript
   * const token = router.createCancellationToken();
   *
   * // Pass to polling config
   * const config: WaitConfig = {
   *   until: someCondition,
   *   cancellation_token: token
   * };
   *
   * // Later, to cancel:
   * token.cancelled = true;
   * ```
   */
  public createCancellationToken(): CancellationToken {
    return { cancelled: false };
  }

  // ============================================================================
  // CONDITION EVALUATION
  // ============================================================================

  /**
   * Evaluate a step condition
   */
  private evaluateCondition(condition: StepCondition, context: StepExecutionContext): boolean {
    const fieldValue = this.resolveValue(condition.field, context);

    switch (condition.operator) {
      case 'eq':
        return fieldValue === condition.value;
      case 'neq':
        return fieldValue !== condition.value;
      case 'gt':
        return (fieldValue as number) > (condition.value as number);
      case 'lt':
        return (fieldValue as number) < (condition.value as number);
      case 'gte':
        return (fieldValue as number) >= (condition.value as number);
      case 'lte':
        return (fieldValue as number) <= (condition.value as number);
      case 'contains':
        return String(fieldValue).includes(String(condition.value));
      case 'exists':
        return fieldValue !== undefined && fieldValue !== null;
      case 'matches':
        return new RegExp(String(condition.value)).test(String(fieldValue));
      default:
        return false;
    }
  }

  /**
   * Resolve a field value from context
   */
  private resolveValue(path: string, context: StepExecutionContext): unknown {
    const parts = path.split('.');
    let value: unknown = context;

    for (const part of parts) {
      if (value === undefined || value === null) return undefined;

      if (part === 'input') {
        value = context.input;
      } else if (part === 'state') {
        value = context.state;
      } else if (part === 'previous') {
        // Get from previous results
        const [, stepId, ...rest] = parts;
        value = context.previous_results.get(stepId);
        if (rest.length > 0) {
          for (const r of rest) {
            if (value === undefined || value === null) return undefined;
            value = (value as Record<string, unknown>)[r];
          }
        }
        return value;
      } else {
        value = (value as Record<string, unknown>)[part];
      }
    }

    return value;
  }
}

// ============================================================================
// TYPES FOR HANDLERS
// ============================================================================

export type StepHandler = (
  step: ExecutionStep,
  context: StepExecutionContext
) => Promise<StepExecutionResult>;

// ============================================================================
// ERROR CLASS
// ============================================================================

export class TaskRouterError extends Error {
  public readonly code: string;
  public readonly details?: Record<string, unknown>;

  constructor(message: string, code: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'TaskRouterError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Error thrown when a polling operation exceeds its configured timeout.
 *
 * This error includes detailed metrics about the polling operation,
 * which can be used for debugging and tuning polling parameters.
 *
 * @example
 * ```typescript
 * try {
 *   await pollForCondition(config, context);
 * } catch (error) {
 *   if (error instanceof PollingTimeoutError) {
 *     console.log(`Polling timed out after ${error.metrics.attempts} attempts`);
 *     console.log(`Total duration: ${error.metrics.total_duration_ms}ms`);
 *   }
 * }
 * ```
 */
export class PollingTimeoutError extends Error {
  /**
   * Error code for programmatic error handling.
   */
  public readonly code: string = 'POLLING_TIMEOUT';

  /**
   * Metrics collected during the polling operation before timeout.
   */
  public readonly metrics: PollingMetrics;

  /**
   * The condition that was being polled for.
   */
  public readonly condition: StepCondition;

  /**
   * The configured timeout in milliseconds.
   */
  public readonly timeout_ms: number;

  constructor(
    message: string,
    metrics: PollingMetrics,
    condition: StepCondition,
    timeout_ms: number
  ) {
    super(message);
    this.name = 'PollingTimeoutError';
    this.metrics = metrics;
    this.condition = condition;
    this.timeout_ms = timeout_ms;
  }
}

/**
 * Error thrown when a polling operation is cancelled via cancellation token.
 *
 * This is a controlled termination, not a failure. The metrics included
 * can help understand the state at the time of cancellation.
 */
export class PollingCancelledError extends Error {
  /**
   * Error code for programmatic error handling.
   */
  public readonly code: string = 'POLLING_CANCELLED';

  /**
   * Metrics collected during the polling operation before cancellation.
   */
  public readonly metrics: PollingMetrics;

  constructor(message: string, metrics: PollingMetrics) {
    super(message);
    this.name = 'PollingCancelledError';
    this.metrics = metrics;
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let defaultRouter: TaskRouter | null = null;

export function getTaskRouter(): TaskRouter {
  if (!defaultRouter) {
    defaultRouter = new TaskRouter();
  }
  return defaultRouter;
}

export function setTaskRouter(router: TaskRouter): void {
  defaultRouter = router;
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Route a task
 */
export function routeTask(
  taskClass: string,
  mode?: string,
  options?: { zone?: 'red' | 'yellow' | 'green' }
): TaskRoutingResult {
  return getTaskRouter().route(taskClass, mode, options);
}

/**
 * Get available task classes
 */
export function getAvailableTaskClasses(): string[] {
  return getTaskRouter().listTaskClasses();
}

/**
 * Get modes for a task
 */
export function getTaskModes(taskClass: string): string[] {
  return getTaskRouter().listModes(taskClass);
}
