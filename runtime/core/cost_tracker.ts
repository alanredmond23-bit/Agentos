/**
 * cost_tracker.ts
 * Cost tracking engine for AgentOS
 * Tracks LLM usage costs across providers with budget management and forecasting
 */

import * as crypto from 'crypto';

// ============================================================================
// TYPES - Core Cost Entry
// ============================================================================

export interface CostEntry {
  /** Unique identifier */
  id: string;

  /** When the cost was incurred */
  timestamp: string;

  /** Agent that incurred the cost */
  agent_id: string;

  /** Pack the agent belongs to */
  pack_id?: string;

  /** Run ID for this execution */
  run_id?: string;

  /** User who initiated the run */
  user_id?: string;

  /** Cost category */
  category: CostCategory;

  /** Provider (openai, anthropic, etc.) */
  provider: CostProvider;

  /** Specific operation (completion, embedding, etc.) */
  operation: CostOperation;

  /** Model used */
  model?: string;

  /** Number of units (tokens, images, etc.) */
  units: number;

  /** Unit type */
  unit_type: UnitType;

  /** Cost per unit in USD */
  unit_cost: number;

  /** Total cost in USD */
  total_cost: number;

  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

export type CostCategory =
  | 'inference'
  | 'embedding'
  | 'image_generation'
  | 'speech'
  | 'fine_tuning'
  | 'storage'
  | 'api_call'
  | 'other';

export type CostProvider =
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'deepseek'
  | 'groq'
  | 'mistral'
  | 'cohere'
  | 'replicate'
  | 'aws_bedrock'
  | 'azure_openai'
  | 'custom';

export type CostOperation =
  | 'completion'
  | 'chat_completion'
  | 'embedding'
  | 'image_create'
  | 'image_edit'
  | 'speech_to_text'
  | 'text_to_speech'
  | 'fine_tune'
  | 'moderation'
  | 'other';

export type UnitType =
  | 'input_tokens'
  | 'output_tokens'
  | 'tokens'
  | 'images'
  | 'minutes'
  | 'characters'
  | 'requests';

// ============================================================================
// TYPES - Budget Configuration
// ============================================================================

export interface CostBudget {
  /** Unique identifier */
  id: string;

  /** Scope of the budget */
  scope: BudgetScope;

  /** ID of the scoped entity (agent_id, pack_id, user_id, or 'global') */
  scope_id: string;

  /** Budget period */
  period: BudgetPeriod;

  /** Spending limit in USD */
  limit: number;

  /** Alert threshold as percentage (0-100) */
  alert_threshold: number;

  /** Action when budget is exceeded */
  action_on_exceed: BudgetAction;

  /** Whether budget is active */
  enabled: boolean;

  /** When budget was created */
  created_at: string;

  /** Optional expiration */
  expires_at?: string;

  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

export type BudgetScope = 'global' | 'agent' | 'pack' | 'user' | 'run';

export type BudgetPeriod = 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'lifetime';

export type BudgetAction = 'warn' | 'throttle' | 'block' | 'notify';

// ============================================================================
// TYPES - Query and Aggregation
// ============================================================================

export interface CostFilters {
  /** Start of time range */
  start_time?: string;

  /** End of time range */
  end_time?: string;

  /** Filter by agent IDs */
  agent_ids?: string[];

  /** Filter by pack IDs */
  pack_ids?: string[];

  /** Filter by user IDs */
  user_ids?: string[];

  /** Filter by run IDs */
  run_ids?: string[];

  /** Filter by categories */
  categories?: CostCategory[];

  /** Filter by providers */
  providers?: CostProvider[];

  /** Filter by operations */
  operations?: CostOperation[];

  /** Filter by models */
  models?: string[];

  /** Minimum cost */
  min_cost?: number;

  /** Maximum cost */
  max_cost?: number;

  /** Pagination limit */
  limit?: number;

  /** Pagination offset */
  offset?: number;

  /** Sort field */
  sort_by?: 'timestamp' | 'total_cost' | 'units';

  /** Sort direction */
  sort_order?: 'asc' | 'desc';
}

export interface CostAggregate {
  /** Group key */
  group_key: string;

  /** Group value */
  group_value: string;

  /** Total cost in USD */
  total_cost: number;

  /** Total units consumed */
  total_units: number;

  /** Number of entries */
  entry_count: number;

  /** Average cost per entry */
  avg_cost: number;

  /** Minimum single cost */
  min_cost: number;

  /** Maximum single cost */
  max_cost: number;

  /** Time range */
  start_time?: string;
  end_time?: string;
}

export type AggregateGroupBy =
  | 'agent_id'
  | 'pack_id'
  | 'user_id'
  | 'provider'
  | 'model'
  | 'category'
  | 'operation'
  | 'hour'
  | 'day'
  | 'week'
  | 'month';

// ============================================================================
// TYPES - Forecasting and Budget Status
// ============================================================================

export interface CostForecast {
  /** Forecast period in days */
  period_days: number;

  /** Projected total cost */
  projected_cost: number;

  /** Confidence level (0-100) */
  confidence: number;

  /** Daily average from historical data */
  daily_average: number;

  /** Trend direction */
  trend: 'increasing' | 'decreasing' | 'stable';

  /** Trend percentage change */
  trend_percentage: number;

  /** Historical data points used */
  data_points: number;

  /** Breakdown by provider */
  by_provider: Record<string, number>;

  /** Breakdown by category */
  by_category: Record<string, number>;

  /** Generated at */
  generated_at: string;
}

export interface BudgetStatus {
  /** Budget being checked */
  budget: CostBudget;

  /** Current spend in period */
  current_spend: number;

  /** Remaining budget */
  remaining: number;

  /** Percentage used */
  percentage_used: number;

  /** Whether alert threshold is exceeded */
  alert_triggered: boolean;

  /** Whether limit is exceeded */
  limit_exceeded: boolean;

  /** Recommended action */
  action: BudgetAction | 'none';

  /** Period start */
  period_start: string;

  /** Period end */
  period_end: string;

  /** Projected end-of-period spend */
  projected_spend?: number;
}

// ============================================================================
// TYPES - Alerts and Notifications
// ============================================================================

export interface CostAlert {
  /** Alert ID */
  id: string;

  /** Alert type */
  type: AlertType;

  /** Severity level */
  severity: AlertSeverity;

  /** Budget that triggered alert (if applicable) */
  budget_id?: string;

  /** Scope of the alert */
  scope: BudgetScope;

  /** Scope ID */
  scope_id: string;

  /** Alert message */
  message: string;

  /** Current value that triggered alert */
  current_value: number;

  /** Threshold that was exceeded */
  threshold_value: number;

  /** When alert was created */
  created_at: string;

  /** Whether alert has been acknowledged */
  acknowledged: boolean;

  /** When alert was acknowledged */
  acknowledged_at?: string;

  /** Who acknowledged */
  acknowledged_by?: string;
}

export type AlertType =
  | 'budget_warning'
  | 'budget_exceeded'
  | 'spike_detected'
  | 'unusual_pattern'
  | 'forecast_warning';

export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';

export type AlertHandler = (alert: CostAlert) => void | Promise<void>;

// ============================================================================
// TYPES - Storage Interface
// ============================================================================

export interface CostStorage {
  /** Store a cost entry */
  saveCost(entry: CostEntry): Promise<void>;

  /** Get costs with filters */
  getCosts(filters: CostFilters): Promise<CostEntry[]>;

  /** Get cost count for filters */
  getCostCount(filters: CostFilters): Promise<number>;

  /** Store a budget */
  saveBudget(budget: CostBudget): Promise<void>;

  /** Get a budget by ID */
  getBudget(id: string): Promise<CostBudget | null>;

  /** Get budgets by scope */
  getBudgetsByScope(scope: BudgetScope, scopeId: string): Promise<CostBudget[]>;

  /** Get all budgets */
  getAllBudgets(): Promise<CostBudget[]>;

  /** Delete a budget */
  deleteBudget(id: string): Promise<boolean>;

  /** Store an alert */
  saveAlert(alert: CostAlert): Promise<void>;

  /** Get alerts */
  getAlerts(filters: { acknowledged?: boolean; limit?: number }): Promise<CostAlert[]>;

  /** Acknowledge an alert */
  acknowledgeAlert(id: string, by: string): Promise<boolean>;
}

// ============================================================================
// PROVIDER PRICING
// ============================================================================

export interface ModelPricing {
  /** Cost per 1K input tokens */
  input_per_1k: number;

  /** Cost per 1K output tokens */
  output_per_1k: number;

  /** Cost per image (if applicable) */
  per_image?: number;

  /** Cost per minute (for audio) */
  per_minute?: number;

  /** Context window size */
  context_window?: number;
}

/**
 * Provider pricing data (prices in USD)
 * Updated: December 2024
 */
export const PROVIDER_PRICING: Record<CostProvider, Record<string, ModelPricing>> = {
  openai: {
    'gpt-4-turbo': { input_per_1k: 0.01, output_per_1k: 0.03, context_window: 128000 },
    'gpt-4-turbo-preview': { input_per_1k: 0.01, output_per_1k: 0.03, context_window: 128000 },
    'gpt-4o': { input_per_1k: 0.005, output_per_1k: 0.015, context_window: 128000 },
    'gpt-4o-mini': { input_per_1k: 0.00015, output_per_1k: 0.0006, context_window: 128000 },
    'gpt-4': { input_per_1k: 0.03, output_per_1k: 0.06, context_window: 8192 },
    'gpt-4-32k': { input_per_1k: 0.06, output_per_1k: 0.12, context_window: 32768 },
    'gpt-3.5-turbo': { input_per_1k: 0.0005, output_per_1k: 0.0015, context_window: 16385 },
    'gpt-3.5-turbo-16k': { input_per_1k: 0.001, output_per_1k: 0.002, context_window: 16385 },
    'text-embedding-3-small': { input_per_1k: 0.00002, output_per_1k: 0 },
    'text-embedding-3-large': { input_per_1k: 0.00013, output_per_1k: 0 },
    'text-embedding-ada-002': { input_per_1k: 0.0001, output_per_1k: 0 },
    'dall-e-3-standard': { input_per_1k: 0, output_per_1k: 0, per_image: 0.04 },
    'dall-e-3-hd': { input_per_1k: 0, output_per_1k: 0, per_image: 0.08 },
    'whisper-1': { input_per_1k: 0, output_per_1k: 0, per_minute: 0.006 },
    'tts-1': { input_per_1k: 0.015, output_per_1k: 0 },
    'tts-1-hd': { input_per_1k: 0.03, output_per_1k: 0 }
  },

  anthropic: {
    'claude-3-opus-20240229': { input_per_1k: 0.015, output_per_1k: 0.075, context_window: 200000 },
    'claude-3-5-opus-20250101': { input_per_1k: 0.015, output_per_1k: 0.075, context_window: 200000 },
    'claude-3-5-sonnet-20241022': { input_per_1k: 0.003, output_per_1k: 0.015, context_window: 200000 },
    'claude-3-5-sonnet-20240620': { input_per_1k: 0.003, output_per_1k: 0.015, context_window: 200000 },
    'claude-3-sonnet-20240229': { input_per_1k: 0.003, output_per_1k: 0.015, context_window: 200000 },
    'claude-3-haiku-20240307': { input_per_1k: 0.00025, output_per_1k: 0.00125, context_window: 200000 },
    'claude-3-5-haiku-20241022': { input_per_1k: 0.001, output_per_1k: 0.005, context_window: 200000 },
    'claude-2.1': { input_per_1k: 0.008, output_per_1k: 0.024, context_window: 200000 },
    'claude-2.0': { input_per_1k: 0.008, output_per_1k: 0.024, context_window: 100000 },
    'claude-instant-1.2': { input_per_1k: 0.0008, output_per_1k: 0.0024, context_window: 100000 }
  },

  google: {
    'gemini-1.5-pro': { input_per_1k: 0.00125, output_per_1k: 0.005, context_window: 2000000 },
    'gemini-1.5-pro-latest': { input_per_1k: 0.00125, output_per_1k: 0.005, context_window: 2000000 },
    'gemini-1.5-flash': { input_per_1k: 0.000075, output_per_1k: 0.0003, context_window: 1000000 },
    'gemini-1.5-flash-latest': { input_per_1k: 0.000075, output_per_1k: 0.0003, context_window: 1000000 },
    'gemini-1.0-pro': { input_per_1k: 0.0005, output_per_1k: 0.0015, context_window: 32760 },
    'gemini-2.0-flash': { input_per_1k: 0.0001, output_per_1k: 0.0004, context_window: 1000000 },
    'gemini-2.0-flash-thinking': { input_per_1k: 0.0001, output_per_1k: 0.0004, context_window: 1000000 }
  },

  deepseek: {
    'deepseek-chat': { input_per_1k: 0.00014, output_per_1k: 0.00028, context_window: 128000 },
    'deepseek-coder': { input_per_1k: 0.00014, output_per_1k: 0.00028, context_window: 128000 },
    'deepseek-v3': { input_per_1k: 0.00027, output_per_1k: 0.0011, context_window: 128000 },
    'deepseek-reasoner': { input_per_1k: 0.00055, output_per_1k: 0.0022, context_window: 128000 }
  },

  groq: {
    'llama-3.1-70b-versatile': { input_per_1k: 0.00059, output_per_1k: 0.00079, context_window: 131072 },
    'llama-3.1-8b-instant': { input_per_1k: 0.00005, output_per_1k: 0.00008, context_window: 131072 },
    'llama-3.2-90b-vision': { input_per_1k: 0.0009, output_per_1k: 0.0009, context_window: 131072 },
    'mixtral-8x7b-32768': { input_per_1k: 0.00027, output_per_1k: 0.00027, context_window: 32768 },
    'gemma-7b-it': { input_per_1k: 0.00007, output_per_1k: 0.00007, context_window: 8192 }
  },

  mistral: {
    'mistral-large-latest': { input_per_1k: 0.004, output_per_1k: 0.012, context_window: 128000 },
    'mistral-medium-latest': { input_per_1k: 0.0027, output_per_1k: 0.0081, context_window: 32000 },
    'mistral-small-latest': { input_per_1k: 0.001, output_per_1k: 0.003, context_window: 32000 },
    'open-mistral-7b': { input_per_1k: 0.00025, output_per_1k: 0.00025, context_window: 32000 },
    'open-mixtral-8x7b': { input_per_1k: 0.0007, output_per_1k: 0.0007, context_window: 32000 },
    'open-mixtral-8x22b': { input_per_1k: 0.002, output_per_1k: 0.006, context_window: 65536 },
    'codestral-latest': { input_per_1k: 0.001, output_per_1k: 0.003, context_window: 32000 }
  },

  cohere: {
    'command-r-plus': { input_per_1k: 0.003, output_per_1k: 0.015, context_window: 128000 },
    'command-r': { input_per_1k: 0.0005, output_per_1k: 0.0015, context_window: 128000 },
    'command': { input_per_1k: 0.001, output_per_1k: 0.002, context_window: 4096 },
    'command-light': { input_per_1k: 0.0003, output_per_1k: 0.0006, context_window: 4096 },
    'embed-english-v3': { input_per_1k: 0.0001, output_per_1k: 0 },
    'embed-multilingual-v3': { input_per_1k: 0.0001, output_per_1k: 0 }
  },

  replicate: {
    'llama-3.1-405b': { input_per_1k: 0.0095, output_per_1k: 0.0095, context_window: 131072 },
    'llama-3.1-70b': { input_per_1k: 0.00065, output_per_1k: 0.00275, context_window: 131072 },
    'sdxl': { input_per_1k: 0, output_per_1k: 0, per_image: 0.0023 },
    'stable-diffusion-3': { input_per_1k: 0, output_per_1k: 0, per_image: 0.035 }
  },

  aws_bedrock: {
    'anthropic.claude-3-opus': { input_per_1k: 0.015, output_per_1k: 0.075, context_window: 200000 },
    'anthropic.claude-3-sonnet': { input_per_1k: 0.003, output_per_1k: 0.015, context_window: 200000 },
    'anthropic.claude-3-haiku': { input_per_1k: 0.00025, output_per_1k: 0.00125, context_window: 200000 },
    'amazon.titan-text-express': { input_per_1k: 0.0002, output_per_1k: 0.0006, context_window: 8192 },
    'amazon.titan-text-lite': { input_per_1k: 0.00015, output_per_1k: 0.0002, context_window: 4096 }
  },

  azure_openai: {
    'gpt-4-turbo': { input_per_1k: 0.01, output_per_1k: 0.03, context_window: 128000 },
    'gpt-4o': { input_per_1k: 0.005, output_per_1k: 0.015, context_window: 128000 },
    'gpt-4': { input_per_1k: 0.03, output_per_1k: 0.06, context_window: 8192 },
    'gpt-35-turbo': { input_per_1k: 0.0005, output_per_1k: 0.0015, context_window: 16385 }
  },

  custom: {}
};

// ============================================================================
// IN-MEMORY STORAGE IMPLEMENTATION
// ============================================================================

export class InMemoryCostStorage implements CostStorage {
  private costs: Map<string, CostEntry> = new Map();
  private budgets: Map<string, CostBudget> = new Map();
  private alerts: Map<string, CostAlert> = new Map();

  async saveCost(entry: CostEntry): Promise<void> {
    this.costs.set(entry.id, entry);
  }

  async getCosts(filters: CostFilters): Promise<CostEntry[]> {
    let results = Array.from(this.costs.values());

    // Apply filters
    if (filters.start_time) {
      results = results.filter((c) => c.timestamp >= filters.start_time!);
    }
    if (filters.end_time) {
      results = results.filter((c) => c.timestamp <= filters.end_time!);
    }
    if (filters.agent_ids?.length) {
      results = results.filter((c) => filters.agent_ids!.includes(c.agent_id));
    }
    if (filters.pack_ids?.length) {
      results = results.filter((c) => c.pack_id && filters.pack_ids!.includes(c.pack_id));
    }
    if (filters.user_ids?.length) {
      results = results.filter((c) => c.user_id && filters.user_ids!.includes(c.user_id));
    }
    if (filters.run_ids?.length) {
      results = results.filter((c) => c.run_id && filters.run_ids!.includes(c.run_id));
    }
    if (filters.categories?.length) {
      results = results.filter((c) => filters.categories!.includes(c.category));
    }
    if (filters.providers?.length) {
      results = results.filter((c) => filters.providers!.includes(c.provider));
    }
    if (filters.operations?.length) {
      results = results.filter((c) => filters.operations!.includes(c.operation));
    }
    if (filters.models?.length) {
      results = results.filter((c) => c.model && filters.models!.includes(c.model));
    }
    if (filters.min_cost !== undefined) {
      results = results.filter((c) => c.total_cost >= filters.min_cost!);
    }
    if (filters.max_cost !== undefined) {
      results = results.filter((c) => c.total_cost <= filters.max_cost!);
    }

    // Sort
    const sortBy = filters.sort_by ?? 'timestamp';
    const sortOrder = filters.sort_order ?? 'desc';
    results.sort((a, b) => {
      const aVal = a[sortBy] as string | number;
      const bVal = b[sortBy] as string | number;
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortOrder === 'asc' ? cmp : -cmp;
    });

    // Pagination
    if (filters.offset) {
      results = results.slice(filters.offset);
    }
    if (filters.limit) {
      results = results.slice(0, filters.limit);
    }

    return results;
  }

  async getCostCount(filters: CostFilters): Promise<number> {
    const results = await this.getCosts({ ...filters, limit: undefined, offset: undefined });
    return results.length;
  }

  async saveBudget(budget: CostBudget): Promise<void> {
    this.budgets.set(budget.id, budget);
  }

  async getBudget(id: string): Promise<CostBudget | null> {
    return this.budgets.get(id) ?? null;
  }

  async getBudgetsByScope(scope: BudgetScope, scopeId: string): Promise<CostBudget[]> {
    return Array.from(this.budgets.values()).filter(
      (b) => b.scope === scope && b.scope_id === scopeId && b.enabled
    );
  }

  async getAllBudgets(): Promise<CostBudget[]> {
    return Array.from(this.budgets.values());
  }

  async deleteBudget(id: string): Promise<boolean> {
    return this.budgets.delete(id);
  }

  async saveAlert(alert: CostAlert): Promise<void> {
    this.alerts.set(alert.id, alert);
  }

  async getAlerts(filters: { acknowledged?: boolean; limit?: number }): Promise<CostAlert[]> {
    let results = Array.from(this.alerts.values());

    if (filters.acknowledged !== undefined) {
      results = results.filter((a) => a.acknowledged === filters.acknowledged);
    }

    results.sort((a, b) => b.created_at.localeCompare(a.created_at));

    if (filters.limit) {
      results = results.slice(0, filters.limit);
    }

    return results;
  }

  async acknowledgeAlert(id: string, by: string): Promise<boolean> {
    const alert = this.alerts.get(id);
    if (!alert) return false;

    alert.acknowledged = true;
    alert.acknowledged_at = new Date().toISOString();
    alert.acknowledged_by = by;
    return true;
  }

  /** Clear all data (for testing) */
  clear(): void {
    this.costs.clear();
    this.budgets.clear();
    this.alerts.clear();
  }
}

// ============================================================================
// COST CALCULATOR
// ============================================================================

export class CostCalculator {
  private customPricing: Map<string, ModelPricing> = new Map();

  /**
   * Calculate cost for token usage
   */
  calculateTokenCost(
    provider: CostProvider,
    model: string,
    inputTokens: number,
    outputTokens: number
  ): { inputCost: number; outputCost: number; totalCost: number } {
    const pricing = this.getPricing(provider, model);

    const inputCost = (inputTokens / 1000) * pricing.input_per_1k;
    const outputCost = (outputTokens / 1000) * pricing.output_per_1k;

    return {
      inputCost,
      outputCost,
      totalCost: inputCost + outputCost
    };
  }

  /**
   * Calculate cost for image generation
   */
  calculateImageCost(provider: CostProvider, model: string, imageCount: number): number {
    const pricing = this.getPricing(provider, model);
    return imageCount * (pricing.per_image ?? 0);
  }

  /**
   * Calculate cost for audio (speech-to-text/text-to-speech)
   */
  calculateAudioCost(provider: CostProvider, model: string, minutes: number): number {
    const pricing = this.getPricing(provider, model);
    return minutes * (pricing.per_minute ?? 0);
  }

  /**
   * Get pricing for a model
   */
  getPricing(provider: CostProvider, model: string): ModelPricing {
    // Check custom pricing first
    const customKey = `${provider}:${model}`;
    if (this.customPricing.has(customKey)) {
      return this.customPricing.get(customKey)!;
    }

    // Look up in provider pricing
    const providerPricing = PROVIDER_PRICING[provider];
    if (providerPricing && providerPricing[model]) {
      return providerPricing[model];
    }

    // Try partial match (for versioned models)
    for (const [key, pricing] of Object.entries(providerPricing ?? {})) {
      if (model.startsWith(key) || key.startsWith(model)) {
        return pricing;
      }
    }

    // Default fallback
    return { input_per_1k: 0, output_per_1k: 0 };
  }

  /**
   * Register custom pricing
   */
  setCustomPricing(provider: CostProvider, model: string, pricing: ModelPricing): void {
    this.customPricing.set(`${provider}:${model}`, pricing);
  }

  /**
   * Estimate cost before execution
   */
  estimateCost(
    provider: CostProvider,
    model: string,
    estimatedInputTokens: number,
    estimatedOutputTokens: number
  ): number {
    const { totalCost } = this.calculateTokenCost(
      provider,
      model,
      estimatedInputTokens,
      estimatedOutputTokens
    );
    return totalCost;
  }
}

// ============================================================================
// COST TRACKER
// ============================================================================

export interface CostTrackerConfig {
  /** Storage implementation */
  storage?: CostStorage;

  /** Alert handlers */
  alertHandlers?: AlertHandler[];

  /** Enable spike detection */
  enableSpikeDetection?: boolean;

  /** Spike threshold multiplier (e.g., 3 = 3x average triggers spike) */
  spikeThreshold?: number;

  /** Time window for spike detection (ms) */
  spikeWindowMs?: number;
}

export class CostTracker {
  private storage: CostStorage;
  private calculator: CostCalculator;
  private alertHandlers: AlertHandler[] = [];
  private config: Required<CostTrackerConfig>;

  constructor(config: CostTrackerConfig = {}) {
    this.storage = config.storage ?? new InMemoryCostStorage();
    this.calculator = new CostCalculator();
    this.alertHandlers = config.alertHandlers ?? [];
    this.config = {
      storage: this.storage,
      alertHandlers: this.alertHandlers,
      enableSpikeDetection: config.enableSpikeDetection ?? true,
      spikeThreshold: config.spikeThreshold ?? 3,
      spikeWindowMs: config.spikeWindowMs ?? 3600000 // 1 hour
    };
  }

  // ============================================================================
  // COST RECORDING
  // ============================================================================

  /**
   * Record a cost entry
   */
  async recordCost(entry: Omit<CostEntry, 'id' | 'timestamp'>): Promise<CostEntry> {
    const fullEntry: CostEntry = {
      ...entry,
      id: this.generateId(),
      timestamp: new Date().toISOString()
    };

    await this.storage.saveCost(fullEntry);

    // Check budgets
    await this.checkBudgetsForEntry(fullEntry);

    // Check for spikes
    if (this.config.enableSpikeDetection) {
      await this.checkForSpikes(fullEntry);
    }

    return fullEntry;
  }

  /**
   * Record token usage from LLM completion
   */
  async recordTokenUsage(
    provider: CostProvider,
    model: string,
    inputTokens: number,
    outputTokens: number,
    context: {
      agent_id: string;
      pack_id?: string;
      run_id?: string;
      user_id?: string;
      metadata?: Record<string, unknown>;
    }
  ): Promise<CostEntry> {
    const { inputCost, outputCost, totalCost } = this.calculator.calculateTokenCost(
      provider,
      model,
      inputTokens,
      outputTokens
    );

    return this.recordCost({
      agent_id: context.agent_id,
      pack_id: context.pack_id,
      run_id: context.run_id,
      user_id: context.user_id,
      category: 'inference',
      provider,
      operation: 'chat_completion',
      model,
      units: inputTokens + outputTokens,
      unit_type: 'tokens',
      unit_cost: totalCost / (inputTokens + outputTokens),
      total_cost: totalCost,
      metadata: {
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        input_cost: inputCost,
        output_cost: outputCost,
        ...context.metadata
      }
    });
  }

  // ============================================================================
  // COST QUERIES
  // ============================================================================

  /**
   * Get costs with filtering
   */
  async getCosts(filters: CostFilters = {}): Promise<CostEntry[]> {
    return this.storage.getCosts(filters);
  }

  /**
   * Get total cost for filters
   */
  async getTotalCost(filters: CostFilters = {}): Promise<number> {
    const costs = await this.storage.getCosts({ ...filters, limit: undefined, offset: undefined });
    return costs.reduce((sum, c) => sum + c.total_cost, 0);
  }

  /**
   * Get aggregated cost report
   */
  async getAggregate(
    groupBy: AggregateGroupBy,
    filters: CostFilters = {}
  ): Promise<CostAggregate[]> {
    const costs = await this.storage.getCosts({ ...filters, limit: undefined, offset: undefined });

    const groups = new Map<string, CostEntry[]>();

    for (const cost of costs) {
      const key = this.getGroupKey(cost, groupBy);
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(cost);
    }

    const aggregates: CostAggregate[] = [];

    for (const [key, entries] of groups) {
      const totalCost = entries.reduce((sum, e) => sum + e.total_cost, 0);
      const totalUnits = entries.reduce((sum, e) => sum + e.units, 0);
      const costs = entries.map((e) => e.total_cost);

      aggregates.push({
        group_key: groupBy,
        group_value: key,
        total_cost: totalCost,
        total_units: totalUnits,
        entry_count: entries.length,
        avg_cost: totalCost / entries.length,
        min_cost: Math.min(...costs),
        max_cost: Math.max(...costs),
        start_time: entries.reduce(
          (min, e) => (e.timestamp < min ? e.timestamp : min),
          entries[0]?.timestamp
        ),
        end_time: entries.reduce(
          (max, e) => (e.timestamp > max ? e.timestamp : max),
          entries[0]?.timestamp
        )
      });
    }

    return aggregates.sort((a, b) => b.total_cost - a.total_cost);
  }

  private getGroupKey(entry: CostEntry, groupBy: AggregateGroupBy): string {
    switch (groupBy) {
      case 'agent_id':
        return entry.agent_id;
      case 'pack_id':
        return entry.pack_id ?? 'unknown';
      case 'user_id':
        return entry.user_id ?? 'unknown';
      case 'provider':
        return entry.provider;
      case 'model':
        return entry.model ?? 'unknown';
      case 'category':
        return entry.category;
      case 'operation':
        return entry.operation;
      case 'hour':
        return entry.timestamp.substring(0, 13); // YYYY-MM-DDTHH
      case 'day':
        return entry.timestamp.substring(0, 10); // YYYY-MM-DD
      case 'week': {
        const date = new Date(entry.timestamp);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        return weekStart.toISOString().substring(0, 10);
      }
      case 'month':
        return entry.timestamp.substring(0, 7); // YYYY-MM
      default:
        return 'all';
    }
  }

  // ============================================================================
  // BUDGET MANAGEMENT
  // ============================================================================

  /**
   * Set or update a budget
   */
  async setBudget(budget: Omit<CostBudget, 'id' | 'created_at'>): Promise<CostBudget> {
    const fullBudget: CostBudget = {
      ...budget,
      id: this.generateId(),
      created_at: new Date().toISOString()
    };

    await this.storage.saveBudget(fullBudget);
    return fullBudget;
  }

  /**
   * Get a budget by ID
   */
  async getBudget(id: string): Promise<CostBudget | null> {
    return this.storage.getBudget(id);
  }

  /**
   * Check budget status for a scope
   */
  async checkBudget(scope: BudgetScope, scopeId: string): Promise<BudgetStatus[]> {
    const budgets = await this.storage.getBudgetsByScope(scope, scopeId);
    const statuses: BudgetStatus[] = [];

    for (const budget of budgets) {
      const status = await this.calculateBudgetStatus(budget);
      statuses.push(status);
    }

    return statuses;
  }

  /**
   * Check all budgets
   */
  async checkAllBudgets(): Promise<BudgetStatus[]> {
    const budgets = await this.storage.getAllBudgets();
    const statuses: BudgetStatus[] = [];

    for (const budget of budgets) {
      if (budget.enabled) {
        const status = await this.calculateBudgetStatus(budget);
        statuses.push(status);
      }
    }

    return statuses;
  }

  private async calculateBudgetStatus(budget: CostBudget): Promise<BudgetStatus> {
    const { start, end } = this.getPeriodBounds(budget.period);

    // Get costs for this period and scope
    const filters: CostFilters = {
      start_time: start,
      end_time: end
    };

    switch (budget.scope) {
      case 'agent':
        filters.agent_ids = [budget.scope_id];
        break;
      case 'pack':
        filters.pack_ids = [budget.scope_id];
        break;
      case 'user':
        filters.user_ids = [budget.scope_id];
        break;
      case 'run':
        filters.run_ids = [budget.scope_id];
        break;
      // 'global' has no filter
    }

    const currentSpend = await this.getTotalCost(filters);
    const percentageUsed = (currentSpend / budget.limit) * 100;
    const alertTriggered = percentageUsed >= budget.alert_threshold;
    const limitExceeded = currentSpend >= budget.limit;

    // Calculate projected spend
    const periodDurationMs = new Date(end).getTime() - new Date(start).getTime();
    const elapsedMs = Date.now() - new Date(start).getTime();
    const projectedSpend = elapsedMs > 0 ? (currentSpend / elapsedMs) * periodDurationMs : 0;

    let action: BudgetAction | 'none' = 'none';
    if (limitExceeded) {
      action = budget.action_on_exceed;
    } else if (alertTriggered) {
      action = 'warn';
    }

    return {
      budget,
      current_spend: currentSpend,
      remaining: Math.max(0, budget.limit - currentSpend),
      percentage_used: percentageUsed,
      alert_triggered: alertTriggered,
      limit_exceeded: limitExceeded,
      action,
      period_start: start,
      period_end: end,
      projected_spend: projectedSpend
    };
  }

  private getPeriodBounds(period: BudgetPeriod): { start: string; end: string } {
    const now = new Date();
    let start: Date;
    let end: Date;

    switch (period) {
      case 'hourly':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
        end = new Date(start.getTime() + 3600000);
        break;
      case 'daily':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        end = new Date(start.getTime() + 86400000);
        break;
      case 'weekly':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
        end = new Date(start.getTime() + 604800000);
        break;
      case 'monthly':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        break;
      case 'yearly':
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear() + 1, 0, 1);
        break;
      case 'lifetime':
        start = new Date(0);
        end = new Date('2099-12-31');
        break;
    }

    return { start: start.toISOString(), end: end.toISOString() };
  }

  private async checkBudgetsForEntry(entry: CostEntry): Promise<void> {
    // Check global budgets
    const globalBudgets = await this.storage.getBudgetsByScope('global', 'global');
    for (const budget of globalBudgets) {
      await this.checkAndAlertBudget(budget);
    }

    // Check agent budgets
    const agentBudgets = await this.storage.getBudgetsByScope('agent', entry.agent_id);
    for (const budget of agentBudgets) {
      await this.checkAndAlertBudget(budget);
    }

    // Check pack budgets
    if (entry.pack_id) {
      const packBudgets = await this.storage.getBudgetsByScope('pack', entry.pack_id);
      for (const budget of packBudgets) {
        await this.checkAndAlertBudget(budget);
      }
    }

    // Check user budgets
    if (entry.user_id) {
      const userBudgets = await this.storage.getBudgetsByScope('user', entry.user_id);
      for (const budget of userBudgets) {
        await this.checkAndAlertBudget(budget);
      }
    }
  }

  private async checkAndAlertBudget(budget: CostBudget): Promise<void> {
    const status = await this.calculateBudgetStatus(budget);

    if (status.limit_exceeded) {
      await this.createAlert({
        type: 'budget_exceeded',
        severity: 'critical',
        budget_id: budget.id,
        scope: budget.scope,
        scope_id: budget.scope_id,
        message: `Budget "${budget.id}" exceeded: $${status.current_spend.toFixed(2)} / $${budget.limit.toFixed(2)}`,
        current_value: status.current_spend,
        threshold_value: budget.limit
      });
    } else if (status.alert_triggered) {
      await this.createAlert({
        type: 'budget_warning',
        severity: 'warning',
        budget_id: budget.id,
        scope: budget.scope,
        scope_id: budget.scope_id,
        message: `Budget "${budget.id}" at ${status.percentage_used.toFixed(1)}% of limit`,
        current_value: status.current_spend,
        threshold_value: budget.limit * (budget.alert_threshold / 100)
      });
    }
  }

  // ============================================================================
  // FORECASTING
  // ============================================================================

  /**
   * Forecast costs for the next N days
   */
  async forecast(days: number, filters: CostFilters = {}): Promise<CostForecast> {
    // Get historical data for analysis (use 2x the forecast period for trend)
    const historyDays = Math.max(days * 2, 30);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - historyDays);

    const historicalCosts = await this.storage.getCosts({
      ...filters,
      start_time: startDate.toISOString(),
      limit: undefined,
      offset: undefined
    });

    if (historicalCosts.length === 0) {
      return {
        period_days: days,
        projected_cost: 0,
        confidence: 0,
        daily_average: 0,
        trend: 'stable',
        trend_percentage: 0,
        data_points: 0,
        by_provider: {},
        by_category: {},
        generated_at: new Date().toISOString()
      };
    }

    // Calculate daily averages
    const dailyCosts = new Map<string, number>();
    for (const cost of historicalCosts) {
      const day = cost.timestamp.substring(0, 10);
      dailyCosts.set(day, (dailyCosts.get(day) ?? 0) + cost.total_cost);
    }

    const sortedDays = Array.from(dailyCosts.keys()).sort();
    const dailyValues = sortedDays.map((d) => dailyCosts.get(d)!);

    // Calculate metrics
    const dailyAverage = dailyValues.reduce((a, b) => a + b, 0) / dailyValues.length;
    const projectedCost = dailyAverage * days;

    // Calculate trend
    const midpoint = Math.floor(dailyValues.length / 2);
    const firstHalfAvg = dailyValues.slice(0, midpoint).reduce((a, b) => a + b, 0) / midpoint;
    const secondHalfAvg =
      dailyValues.slice(midpoint).reduce((a, b) => a + b, 0) / (dailyValues.length - midpoint);
    const trendPercentage =
      firstHalfAvg > 0 ? ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100 : 0;

    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (trendPercentage > 10) trend = 'increasing';
    else if (trendPercentage < -10) trend = 'decreasing';

    // Calculate confidence based on data variance and sample size
    const variance =
      dailyValues.reduce((sum, val) => sum + Math.pow(val - dailyAverage, 2), 0) /
      dailyValues.length;
    const cv = Math.sqrt(variance) / (dailyAverage || 1);
    const confidence = Math.max(0, Math.min(100, 100 - cv * 50));

    // Breakdown by provider
    const byProvider: Record<string, number> = {};
    const byCategory: Record<string, number> = {};

    for (const cost of historicalCosts) {
      byProvider[cost.provider] = (byProvider[cost.provider] ?? 0) + cost.total_cost;
      byCategory[cost.category] = (byCategory[cost.category] ?? 0) + cost.total_cost;
    }

    // Project forward
    const totalHistorical = historicalCosts.reduce((sum, c) => sum + c.total_cost, 0);
    for (const provider of Object.keys(byProvider)) {
      byProvider[provider] = (byProvider[provider] / totalHistorical) * projectedCost;
    }
    for (const category of Object.keys(byCategory)) {
      byCategory[category] = (byCategory[category] / totalHistorical) * projectedCost;
    }

    return {
      period_days: days,
      projected_cost: projectedCost,
      confidence,
      daily_average: dailyAverage,
      trend,
      trend_percentage: trendPercentage,
      data_points: historicalCosts.length,
      by_provider: byProvider,
      by_category: byCategory,
      generated_at: new Date().toISOString()
    };
  }

  // ============================================================================
  // SPIKE DETECTION
  // ============================================================================

  private async checkForSpikes(entry: CostEntry): Promise<void> {
    const windowStart = new Date(Date.now() - this.config.spikeWindowMs).toISOString();

    const recentCosts = await this.storage.getCosts({
      agent_ids: [entry.agent_id],
      start_time: windowStart,
      limit: 1000
    });

    if (recentCosts.length < 10) return; // Not enough data

    const averageCost =
      recentCosts.slice(0, -1).reduce((sum, c) => sum + c.total_cost, 0) /
      (recentCosts.length - 1);

    if (entry.total_cost > averageCost * this.config.spikeThreshold) {
      await this.createAlert({
        type: 'spike_detected',
        severity: 'warning',
        scope: 'agent',
        scope_id: entry.agent_id,
        message: `Cost spike detected: $${entry.total_cost.toFixed(4)} (${(entry.total_cost / averageCost).toFixed(1)}x average)`,
        current_value: entry.total_cost,
        threshold_value: averageCost * this.config.spikeThreshold
      });
    }
  }

  // ============================================================================
  // ALERTS
  // ============================================================================

  private async createAlert(
    alertData: Omit<CostAlert, 'id' | 'created_at' | 'acknowledged'>
  ): Promise<void> {
    const alert: CostAlert = {
      ...alertData,
      id: this.generateId(),
      created_at: new Date().toISOString(),
      acknowledged: false
    };

    await this.storage.saveAlert(alert);

    // Notify handlers
    for (const handler of this.alertHandlers) {
      try {
        await handler(alert);
      } catch (error) {
        console.error('Alert handler error:', error);
      }
    }
  }

  /**
   * Register an alert handler
   */
  onAlert(handler: AlertHandler): void {
    this.alertHandlers.push(handler);
  }

  /**
   * Get alerts
   */
  async getAlerts(filters: { acknowledged?: boolean; limit?: number } = {}): Promise<CostAlert[]> {
    return this.storage.getAlerts(filters);
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<boolean> {
    return this.storage.acknowledgeAlert(alertId, acknowledgedBy);
  }

  // ============================================================================
  // EXPORT
  // ============================================================================

  /**
   * Export cost report in specified format
   */
  async exportReport(
    format: 'json' | 'csv',
    filters: CostFilters = {}
  ): Promise<string> {
    const costs = await this.storage.getCosts({ ...filters, limit: undefined, offset: undefined });

    if (format === 'json') {
      return JSON.stringify(
        {
          generated_at: new Date().toISOString(),
          filters,
          total_cost: costs.reduce((sum, c) => sum + c.total_cost, 0),
          entry_count: costs.length,
          entries: costs
        },
        null,
        2
      );
    }

    // CSV format
    const headers = [
      'id',
      'timestamp',
      'agent_id',
      'pack_id',
      'run_id',
      'user_id',
      'category',
      'provider',
      'operation',
      'model',
      'units',
      'unit_type',
      'unit_cost',
      'total_cost'
    ];

    const rows = [headers.join(',')];

    for (const cost of costs) {
      const row = [
        cost.id,
        cost.timestamp,
        cost.agent_id,
        cost.pack_id ?? '',
        cost.run_id ?? '',
        cost.user_id ?? '',
        cost.category,
        cost.provider,
        cost.operation,
        cost.model ?? '',
        cost.units.toString(),
        cost.unit_type,
        cost.unit_cost.toFixed(8),
        cost.total_cost.toFixed(8)
      ];
      rows.push(row.map((v) => `"${v}"`).join(','));
    }

    return rows.join('\n');
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  private generateId(): string {
    return `cost_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
  }

  /**
   * Get the cost calculator for manual calculations
   */
  getCalculator(): CostCalculator {
    return this.calculator;
  }

  /**
   * Delete a budget
   */
  async deleteBudget(id: string): Promise<boolean> {
    return this.storage.deleteBudget(id);
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let defaultTracker: CostTracker | null = null;

export function getCostTracker(): CostTracker {
  if (!defaultTracker) {
    defaultTracker = new CostTracker();
  }
  return defaultTracker;
}

export function setCostTracker(tracker: CostTracker): void {
  defaultTracker = tracker;
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Quick cost recording
 */
export async function recordCost(
  provider: CostProvider,
  model: string,
  inputTokens: number,
  outputTokens: number,
  context: {
    agent_id: string;
    pack_id?: string;
    run_id?: string;
    user_id?: string;
  }
): Promise<CostEntry> {
  return getCostTracker().recordTokenUsage(
    provider,
    model,
    inputTokens,
    outputTokens,
    context
  );
}

/**
 * Quick budget check
 */
export async function checkBudget(
  scope: BudgetScope,
  scopeId: string
): Promise<{ allowed: boolean; reason?: string }> {
  const statuses = await getCostTracker().checkBudget(scope, scopeId);

  for (const status of statuses) {
    if (status.limit_exceeded && status.budget.action_on_exceed === 'block') {
      return {
        allowed: false,
        reason: `Budget exceeded: ${status.current_spend.toFixed(2)} / ${status.budget.limit.toFixed(2)}`
      };
    }
  }

  return { allowed: true };
}

/**
 * Estimate cost before execution
 */
export function estimateCost(
  provider: CostProvider,
  model: string,
  estimatedInputTokens: number,
  estimatedOutputTokens: number
): number {
  return getCostTracker()
    .getCalculator()
    .estimateCost(provider, model, estimatedInputTokens, estimatedOutputTokens);
}

// ============================================================================
// ERROR CLASS
// ============================================================================

export class CostTrackerError extends Error {
  public readonly code: string;
  public readonly details?: Record<string, unknown>;

  constructor(message: string, code: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'CostTrackerError';
    this.code = code;
    this.details = details;
  }
}
