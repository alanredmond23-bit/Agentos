/**
 * model_router.ts
 * Multi-provider routing with fallback chains
 * Uses the 75 parameter presets from agent_yaml types
 */

import {
  ModelConfig,
  ModelParameters,
  getPreset,
  getPresetForUseCase,
  MODEL_PRESETS
} from '../types/agent_yaml';

// ============================================================================
// TYPES
// ============================================================================

export type ModelProvider = 'openai' | 'anthropic' | 'gemini' | 'deepseek' | 'groq' | 'mistral' | 'ollama';

export interface ModelEndpoint {
  /** Provider name */
  provider: ModelProvider;

  /** Model ID */
  model: string;

  /** API endpoint URL */
  endpoint?: string;

  /** API key environment variable name */
  api_key_env?: string;

  /** Priority (lower = higher priority) */
  priority: number;

  /** Whether this endpoint is enabled */
  enabled: boolean;

  /** Maximum tokens per minute */
  rate_limit_tpm?: number;

  /** Maximum requests per minute */
  rate_limit_rpm?: number;

  /** Custom headers */
  custom_headers?: Record<string, string>;

  /** Timeout in ms */
  timeout_ms?: number;

  /** Supports streaming */
  supports_streaming?: boolean;

  /** Supports tool calls */
  supports_tools?: boolean;

  /** Supports vision */
  supports_vision?: boolean;

  /** Cost per 1K input tokens (USD) */
  cost_per_1k_input?: number;

  /** Cost per 1K output tokens (USD) */
  cost_per_1k_output?: number;
}

export interface ModelRouterConfig {
  /** Default provider */
  default_provider: ModelProvider;

  /** Default model */
  default_model: string;

  /** Fallback chain (ordered list of providers) */
  fallback_chain: ModelProvider[];

  /** Enable automatic fallback */
  enable_fallback: boolean;

  /** Maximum fallback attempts */
  max_fallback_attempts: number;

  /** Retry delay between fallbacks (ms) */
  fallback_delay_ms: number;

  /** Health check interval (ms) */
  health_check_interval_ms: number;

  /** Cost budget per request (USD) */
  max_cost_per_request?: number;

  /** Cost budget per day (USD) */
  max_cost_per_day?: number;
}

export interface ModelHealth {
  provider: ModelProvider;
  model: string;
  available: boolean;
  latency_ms?: number;
  last_check: string;
  error_rate: number;
  consecutive_failures: number;
  last_error?: string;
}

export interface RouteResult {
  /** Selected endpoint */
  endpoint: ModelEndpoint;

  /** Applied parameters */
  parameters: ModelParameters;

  /** Whether this was a fallback selection */
  is_fallback: boolean;

  /** Number of fallback attempts */
  fallback_attempts: number;

  /** Estimated cost */
  estimated_cost?: number;

  /** Routing reason */
  reason: string;
}

export interface ModelUsageStats {
  provider: ModelProvider;
  model: string;
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cost_usd: number;
  avg_latency_ms: number;
  last_used_at?: string;
}

export interface CompletionRequest {
  /** Messages to send */
  messages: Array<{
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
    name?: string;
    tool_call_id?: string;
  }>;

  /** Model parameters to apply */
  parameters?: Partial<ModelParameters>;

  /** Model preset to use */
  preset?: string;

  /** Override provider */
  provider?: ModelProvider;

  /** Override model */
  model?: string;

  /** Tools available */
  tools?: Array<{
    type: 'function';
    function: {
      name: string;
      description: string;
      parameters: Record<string, unknown>;
    };
  }>;

  /** Force tool choice */
  tool_choice?: 'none' | 'auto' | { type: 'function'; function: { name: string } };

  /** Use case for automatic preset selection */
  use_case?: string;

  /** Estimated input tokens for cost calculation */
  estimated_input_tokens?: number;
}

// ============================================================================
// DEFAULT CONFIGURATIONS
// ============================================================================

const DEFAULT_ENDPOINTS: ModelEndpoint[] = [
  // OpenAI
  {
    provider: 'openai',
    model: 'gpt-4-turbo',
    priority: 1,
    enabled: true,
    api_key_env: 'OPENAI_API_KEY',
    rate_limit_tpm: 800000,
    rate_limit_rpm: 10000,
    timeout_ms: 60000,
    supports_streaming: true,
    supports_tools: true,
    supports_vision: true,
    cost_per_1k_input: 0.01,
    cost_per_1k_output: 0.03
  },
  {
    provider: 'openai',
    model: 'gpt-4o',
    priority: 2,
    enabled: true,
    api_key_env: 'OPENAI_API_KEY',
    rate_limit_tpm: 800000,
    rate_limit_rpm: 10000,
    timeout_ms: 60000,
    supports_streaming: true,
    supports_tools: true,
    supports_vision: true,
    cost_per_1k_input: 0.005,
    cost_per_1k_output: 0.015
  },
  {
    provider: 'openai',
    model: 'gpt-3.5-turbo',
    priority: 10,
    enabled: true,
    api_key_env: 'OPENAI_API_KEY',
    rate_limit_tpm: 2000000,
    rate_limit_rpm: 10000,
    timeout_ms: 30000,
    supports_streaming: true,
    supports_tools: true,
    supports_vision: false,
    cost_per_1k_input: 0.0005,
    cost_per_1k_output: 0.0015
  },

  // Anthropic
  {
    provider: 'anthropic',
    model: 'claude-3-opus-20240229',
    priority: 1,
    enabled: true,
    api_key_env: 'ANTHROPIC_API_KEY',
    rate_limit_tpm: 400000,
    rate_limit_rpm: 4000,
    timeout_ms: 120000,
    supports_streaming: true,
    supports_tools: true,
    supports_vision: true,
    cost_per_1k_input: 0.015,
    cost_per_1k_output: 0.075
  },
  {
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    priority: 2,
    enabled: true,
    api_key_env: 'ANTHROPIC_API_KEY',
    rate_limit_tpm: 400000,
    rate_limit_rpm: 4000,
    timeout_ms: 60000,
    supports_streaming: true,
    supports_tools: true,
    supports_vision: true,
    cost_per_1k_input: 0.003,
    cost_per_1k_output: 0.015
  },
  {
    provider: 'anthropic',
    model: 'claude-3-haiku-20240307',
    priority: 10,
    enabled: true,
    api_key_env: 'ANTHROPIC_API_KEY',
    rate_limit_tpm: 1000000,
    rate_limit_rpm: 4000,
    timeout_ms: 30000,
    supports_streaming: true,
    supports_tools: true,
    supports_vision: true,
    cost_per_1k_input: 0.00025,
    cost_per_1k_output: 0.00125
  },

  // Gemini
  {
    provider: 'gemini',
    model: 'gemini-1.5-pro',
    priority: 3,
    enabled: true,
    api_key_env: 'GOOGLE_API_KEY',
    rate_limit_tpm: 1000000,
    rate_limit_rpm: 360,
    timeout_ms: 60000,
    supports_streaming: true,
    supports_tools: true,
    supports_vision: true,
    cost_per_1k_input: 0.00125,
    cost_per_1k_output: 0.005
  },
  {
    provider: 'gemini',
    model: 'gemini-1.5-flash',
    priority: 8,
    enabled: true,
    api_key_env: 'GOOGLE_API_KEY',
    rate_limit_tpm: 1000000,
    rate_limit_rpm: 1000,
    timeout_ms: 30000,
    supports_streaming: true,
    supports_tools: true,
    supports_vision: true,
    cost_per_1k_input: 0.000075,
    cost_per_1k_output: 0.0003
  },

  // DeepSeek
  {
    provider: 'deepseek',
    model: 'deepseek-coder',
    priority: 5,
    enabled: true,
    api_key_env: 'DEEPSEEK_API_KEY',
    endpoint: 'https://api.deepseek.com/v1',
    rate_limit_tpm: 1000000,
    rate_limit_rpm: 1000,
    timeout_ms: 60000,
    supports_streaming: true,
    supports_tools: true,
    supports_vision: false,
    cost_per_1k_input: 0.00014,
    cost_per_1k_output: 0.00028
  },
  {
    provider: 'deepseek',
    model: 'deepseek-chat',
    priority: 6,
    enabled: true,
    api_key_env: 'DEEPSEEK_API_KEY',
    endpoint: 'https://api.deepseek.com/v1',
    rate_limit_tpm: 1000000,
    rate_limit_rpm: 1000,
    timeout_ms: 60000,
    supports_streaming: true,
    supports_tools: true,
    supports_vision: false,
    cost_per_1k_input: 0.00014,
    cost_per_1k_output: 0.00028
  },

  // Groq (fast inference)
  {
    provider: 'groq',
    model: 'llama-3.1-70b-versatile',
    priority: 7,
    enabled: true,
    api_key_env: 'GROQ_API_KEY',
    endpoint: 'https://api.groq.com/openai/v1',
    rate_limit_tpm: 100000,
    rate_limit_rpm: 30,
    timeout_ms: 30000,
    supports_streaming: true,
    supports_tools: true,
    supports_vision: false,
    cost_per_1k_input: 0.00059,
    cost_per_1k_output: 0.00079
  },
  {
    provider: 'groq',
    model: 'mixtral-8x7b-32768',
    priority: 9,
    enabled: true,
    api_key_env: 'GROQ_API_KEY',
    endpoint: 'https://api.groq.com/openai/v1',
    rate_limit_tpm: 100000,
    rate_limit_rpm: 30,
    timeout_ms: 30000,
    supports_streaming: true,
    supports_tools: false,
    supports_vision: false,
    cost_per_1k_input: 0.00027,
    cost_per_1k_output: 0.00027
  },

  // Mistral
  {
    provider: 'mistral',
    model: 'mistral-large-latest',
    priority: 4,
    enabled: true,
    api_key_env: 'MISTRAL_API_KEY',
    endpoint: 'https://api.mistral.ai/v1',
    rate_limit_tpm: 500000,
    rate_limit_rpm: 500,
    timeout_ms: 60000,
    supports_streaming: true,
    supports_tools: true,
    supports_vision: false,
    cost_per_1k_input: 0.004,
    cost_per_1k_output: 0.012
  }
];

const DEFAULT_CONFIG: ModelRouterConfig = {
  default_provider: 'anthropic',
  default_model: 'claude-3-5-sonnet-20241022',
  fallback_chain: ['anthropic', 'openai', 'gemini', 'deepseek', 'groq'],
  enable_fallback: true,
  max_fallback_attempts: 3,
  fallback_delay_ms: 1000,
  health_check_interval_ms: 60000,
  max_cost_per_request: 1.0,
  max_cost_per_day: 100.0
};

// ============================================================================
// MODEL ROUTER
// ============================================================================

export class ModelRouter {
  private config: ModelRouterConfig;
  private endpoints: Map<string, ModelEndpoint> = new Map();
  private health: Map<string, ModelHealth> = new Map();
  private usage: Map<string, ModelUsageStats> = new Map();
  private rateLimits: Map<string, { tokens: number; requests: number; window_start: number }> = new Map();
  private dailyCost: number = 0;
  private lastDayCostReset: string = new Date().toISOString().split('T')[0];

  constructor(config?: Partial<ModelRouterConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initializeEndpoints();
  }

  private initializeEndpoints(): void {
    for (const endpoint of DEFAULT_ENDPOINTS) {
      const key = this.getEndpointKey(endpoint.provider, endpoint.model);
      this.endpoints.set(key, endpoint);
      this.initializeHealth(endpoint);
      this.initializeUsage(endpoint);
    }
  }

  private getEndpointKey(provider: ModelProvider, model: string): string {
    return `${provider}:${model}`;
  }

  private initializeHealth(endpoint: ModelEndpoint): void {
    const key = this.getEndpointKey(endpoint.provider, endpoint.model);
    this.health.set(key, {
      provider: endpoint.provider,
      model: endpoint.model,
      available: true,
      last_check: new Date().toISOString(),
      error_rate: 0,
      consecutive_failures: 0
    });
  }

  private initializeUsage(endpoint: ModelEndpoint): void {
    const key = this.getEndpointKey(endpoint.provider, endpoint.model);
    this.usage.set(key, {
      provider: endpoint.provider,
      model: endpoint.model,
      total_requests: 0,
      successful_requests: 0,
      failed_requests: 0,
      total_input_tokens: 0,
      total_output_tokens: 0,
      total_cost_usd: 0,
      avg_latency_ms: 0
    });
  }

  // ============================================================================
  // ENDPOINT MANAGEMENT
  // ============================================================================

  /**
   * Register a custom endpoint
   */
  registerEndpoint(endpoint: ModelEndpoint): void {
    const key = this.getEndpointKey(endpoint.provider, endpoint.model);
    this.endpoints.set(key, endpoint);
    this.initializeHealth(endpoint);
    this.initializeUsage(endpoint);
  }

  /**
   * Get endpoint by provider and model
   */
  getEndpoint(provider: ModelProvider, model: string): ModelEndpoint | undefined {
    const key = this.getEndpointKey(provider, model);
    return this.endpoints.get(key);
  }

  /**
   * List all endpoints
   */
  listEndpoints(): ModelEndpoint[] {
    return Array.from(this.endpoints.values());
  }

  /**
   * List endpoints by provider
   */
  listEndpointsByProvider(provider: ModelProvider): ModelEndpoint[] {
    return this.listEndpoints().filter((e) => e.provider === provider);
  }

  /**
   * Enable/disable an endpoint
   */
  setEndpointEnabled(provider: ModelProvider, model: string, enabled: boolean): void {
    const endpoint = this.getEndpoint(provider, model);
    if (endpoint) {
      endpoint.enabled = enabled;
    }
  }

  // ============================================================================
  // ROUTING
  // ============================================================================

  /**
   * Route a completion request to the best available endpoint
   */
  async route(request: CompletionRequest): Promise<RouteResult> {
    // Get parameters (from preset, request, or defaults)
    const parameters = this.resolveParameters(request);

    // Determine provider and model
    const targetProvider = request.provider ?? this.config.default_provider;
    const targetModel = request.model ?? this.getDefaultModel(targetProvider);

    // Check if we need specific capabilities
    const needsTools = request.tools && request.tools.length > 0;
    const needsVision = this.hasVisionContent(request.messages);

    // Get available endpoints
    const candidates = this.getCandidateEndpoints(targetProvider, targetModel, {
      needs_tools: needsTools,
      needs_vision: needsVision
    });

    // Try to route
    let fallbackAttempts = 0;
    for (const endpoint of candidates) {
      // Check health
      const health = this.health.get(this.getEndpointKey(endpoint.provider, endpoint.model));
      if (health && !health.available && health.consecutive_failures > 3) {
        fallbackAttempts++;
        continue;
      }

      // Check rate limits
      if (!this.checkRateLimit(endpoint)) {
        fallbackAttempts++;
        continue;
      }

      // Check cost budget
      const estimatedCost = this.estimateCost(endpoint, request.estimated_input_tokens ?? 1000, parameters.max_tokens ?? 4096);
      if (this.config.max_cost_per_request && estimatedCost > this.config.max_cost_per_request) {
        continue;
      }

      // Check daily budget
      this.resetDailyCostIfNeeded();
      if (this.config.max_cost_per_day && (this.dailyCost + estimatedCost) > this.config.max_cost_per_day) {
        continue;
      }

      return {
        endpoint,
        parameters,
        is_fallback: fallbackAttempts > 0,
        fallback_attempts: fallbackAttempts,
        estimated_cost: estimatedCost,
        reason: fallbackAttempts > 0
          ? `Fallback to ${endpoint.provider}/${endpoint.model} after ${fallbackAttempts} attempts`
          : `Primary route to ${endpoint.provider}/${endpoint.model}`
      };
    }

    // No available endpoint
    throw new ModelRouterError(
      'No available model endpoint found',
      'NO_AVAILABLE_ENDPOINT',
      { targetProvider, targetModel, fallbackAttempts }
    );
  }

  /**
   * Get candidate endpoints for routing
   */
  private getCandidateEndpoints(
    preferredProvider: ModelProvider,
    preferredModel: string,
    requirements: { needs_tools?: boolean; needs_vision?: boolean }
  ): ModelEndpoint[] {
    const candidates: ModelEndpoint[] = [];

    // First, try preferred endpoint
    const preferredKey = this.getEndpointKey(preferredProvider, preferredModel);
    const preferred = this.endpoints.get(preferredKey);
    if (preferred && preferred.enabled && this.meetsRequirements(preferred, requirements)) {
      candidates.push(preferred);
    }

    // Add fallback endpoints
    if (this.config.enable_fallback) {
      for (const provider of this.config.fallback_chain) {
        const providerEndpoints = this.listEndpointsByProvider(provider)
          .filter((e) => e.enabled && this.meetsRequirements(e, requirements))
          .sort((a, b) => a.priority - b.priority);

        for (const endpoint of providerEndpoints) {
          const key = this.getEndpointKey(endpoint.provider, endpoint.model);
          if (key !== preferredKey) {
            candidates.push(endpoint);
          }
        }
      }
    }

    return candidates.slice(0, this.config.max_fallback_attempts + 1);
  }

  /**
   * Check if endpoint meets capability requirements
   */
  private meetsRequirements(
    endpoint: ModelEndpoint,
    requirements: { needs_tools?: boolean; needs_vision?: boolean }
  ): boolean {
    if (requirements.needs_tools && !endpoint.supports_tools) {
      return false;
    }
    if (requirements.needs_vision && !endpoint.supports_vision) {
      return false;
    }
    return true;
  }

  /**
   * Get default model for a provider
   */
  private getDefaultModel(provider: ModelProvider): string {
    const models: Record<ModelProvider, string> = {
      openai: 'gpt-4o',
      anthropic: 'claude-3-5-sonnet-20241022',
      gemini: 'gemini-1.5-pro',
      deepseek: 'deepseek-chat',
      groq: 'llama-3.1-70b-versatile',
      mistral: 'mistral-large-latest',
      ollama: 'llama3'
    };
    return models[provider];
  }

  /**
   * Check if messages contain vision content
   */
  private hasVisionContent(messages: CompletionRequest['messages']): boolean {
    for (const msg of messages) {
      if (Array.isArray(msg.content)) {
        for (const part of msg.content) {
          if (part.type === 'image_url') {
            return true;
          }
        }
      }
    }
    return false;
  }

  // ============================================================================
  // PARAMETER RESOLUTION
  // ============================================================================

  /**
   * Resolve parameters from preset, request, or defaults
   */
  resolveParameters(request: CompletionRequest): ModelParameters {
    // Start with default preset
    let params = getPreset('balanced') ?? MODEL_PRESETS.balanced;

    // Apply use-case preset if specified
    if (request.use_case) {
      const useCasePreset = getPresetForUseCase(request.use_case);
      if (useCasePreset) {
        params = useCasePreset;
      }
    }

    // Apply named preset if specified
    if (request.preset) {
      const namedPreset = getPreset(request.preset);
      if (namedPreset) {
        params = namedPreset;
      }
    }

    // Apply request overrides
    if (request.parameters) {
      params = { ...params, ...request.parameters };
    }

    return params;
  }

  /**
   * Get preset by name
   */
  getPreset(name: string): ModelParameters | undefined {
    return getPreset(name);
  }

  /**
   * Get preset for use case
   */
  getPresetForUseCase(useCase: string): ModelParameters | undefined {
    return getPresetForUseCase(useCase);
  }

  /**
   * List all available presets
   */
  listPresets(): string[] {
    return Object.keys(MODEL_PRESETS);
  }

  // ============================================================================
  // RATE LIMITING
  // ============================================================================

  /**
   * Check if endpoint is within rate limits
   */
  private checkRateLimit(endpoint: ModelEndpoint): boolean {
    const key = this.getEndpointKey(endpoint.provider, endpoint.model);
    const now = Date.now();
    const windowSize = 60000; // 1 minute

    let state = this.rateLimits.get(key);
    if (!state || (now - state.window_start) > windowSize) {
      state = { tokens: 0, requests: 0, window_start: now };
      this.rateLimits.set(key, state);
    }

    // Check request rate
    if (endpoint.rate_limit_rpm && state.requests >= endpoint.rate_limit_rpm) {
      return false;
    }

    return true;
  }

  /**
   * Record usage for rate limiting
   */
  recordUsage(
    provider: ModelProvider,
    model: string,
    inputTokens: number,
    outputTokens: number,
    latencyMs: number,
    success: boolean
  ): void {
    const key = this.getEndpointKey(provider, model);
    const endpoint = this.endpoints.get(key);
    const stats = this.usage.get(key);

    if (stats) {
      stats.total_requests++;
      if (success) {
        stats.successful_requests++;
      } else {
        stats.failed_requests++;
      }
      stats.total_input_tokens += inputTokens;
      stats.total_output_tokens += outputTokens;
      stats.last_used_at = new Date().toISOString();

      // Update average latency
      const totalLatency = stats.avg_latency_ms * (stats.total_requests - 1) + latencyMs;
      stats.avg_latency_ms = totalLatency / stats.total_requests;

      // Calculate cost
      if (endpoint) {
        const cost =
          (inputTokens / 1000) * (endpoint.cost_per_1k_input ?? 0) +
          (outputTokens / 1000) * (endpoint.cost_per_1k_output ?? 0);
        stats.total_cost_usd += cost;
        this.dailyCost += cost;
      }
    }

    // Update rate limit state
    const state = this.rateLimits.get(key);
    if (state) {
      state.requests++;
      state.tokens += inputTokens + outputTokens;
    }

    // Update health
    this.updateHealth(provider, model, success, latencyMs);
  }

  // ============================================================================
  // HEALTH TRACKING
  // ============================================================================

  /**
   * Update endpoint health
   */
  private updateHealth(
    provider: ModelProvider,
    model: string,
    success: boolean,
    latencyMs: number,
    error?: string
  ): void {
    const key = this.getEndpointKey(provider, model);
    const health = this.health.get(key);

    if (health) {
      health.last_check = new Date().toISOString();
      health.latency_ms = latencyMs;

      if (success) {
        health.consecutive_failures = 0;
        health.available = true;
      } else {
        health.consecutive_failures++;
        health.last_error = error;

        // Mark unavailable after 3 consecutive failures
        if (health.consecutive_failures >= 3) {
          health.available = false;
        }
      }

      // Update error rate (rolling average)
      const totalCalls = (this.usage.get(key)?.total_requests ?? 0);
      const failedCalls = (this.usage.get(key)?.failed_requests ?? 0);
      health.error_rate = totalCalls > 0 ? failedCalls / totalCalls : 0;
    }
  }

  /**
   * Mark endpoint as available
   */
  markAvailable(provider: ModelProvider, model: string): void {
    const key = this.getEndpointKey(provider, model);
    const health = this.health.get(key);
    if (health) {
      health.available = true;
      health.consecutive_failures = 0;
      health.last_check = new Date().toISOString();
    }
  }

  /**
   * Mark endpoint as unavailable
   */
  markUnavailable(provider: ModelProvider, model: string, reason: string): void {
    const key = this.getEndpointKey(provider, model);
    const health = this.health.get(key);
    if (health) {
      health.available = false;
      health.last_error = reason;
      health.last_check = new Date().toISOString();
    }
  }

  /**
   * Get health status for all endpoints
   */
  getHealthStatus(): ModelHealth[] {
    return Array.from(this.health.values());
  }

  /**
   * Get health for specific endpoint
   */
  getEndpointHealth(provider: ModelProvider, model: string): ModelHealth | undefined {
    const key = this.getEndpointKey(provider, model);
    return this.health.get(key);
  }

  // ============================================================================
  // COST ESTIMATION
  // ============================================================================

  /**
   * Estimate cost for a request
   */
  estimateCost(
    endpoint: ModelEndpoint,
    inputTokens: number,
    outputTokens: number
  ): number {
    return (
      (inputTokens / 1000) * (endpoint.cost_per_1k_input ?? 0) +
      (outputTokens / 1000) * (endpoint.cost_per_1k_output ?? 0)
    );
  }

  /**
   * Get cheapest endpoint for requirements
   */
  getCheapestEndpoint(requirements?: {
    needs_tools?: boolean;
    needs_vision?: boolean;
    min_quality?: 'low' | 'medium' | 'high';
  }): ModelEndpoint | undefined {
    const enabled = this.listEndpoints()
      .filter((e) => e.enabled)
      .filter((e) => !requirements?.needs_tools || e.supports_tools)
      .filter((e) => !requirements?.needs_vision || e.supports_vision);

    if (enabled.length === 0) return undefined;

    return enabled.reduce((cheapest, current) => {
      const cheapestCost = (cheapest.cost_per_1k_input ?? 0) + (cheapest.cost_per_1k_output ?? 0);
      const currentCost = (current.cost_per_1k_input ?? 0) + (current.cost_per_1k_output ?? 0);
      return currentCost < cheapestCost ? current : cheapest;
    });
  }

  /**
   * Get fastest endpoint
   */
  getFastestEndpoint(requirements?: {
    needs_tools?: boolean;
    needs_vision?: boolean;
  }): ModelEndpoint | undefined {
    const healthy = this.getHealthStatus()
      .filter((h) => h.available && h.latency_ms !== undefined)
      .sort((a, b) => (a.latency_ms ?? Infinity) - (b.latency_ms ?? Infinity));

    for (const h of healthy) {
      const endpoint = this.getEndpoint(h.provider, h.model);
      if (endpoint && endpoint.enabled) {
        if (requirements?.needs_tools && !endpoint.supports_tools) continue;
        if (requirements?.needs_vision && !endpoint.supports_vision) continue;
        return endpoint;
      }
    }

    return undefined;
  }

  /**
   * Reset daily cost if new day
   */
  private resetDailyCostIfNeeded(): void {
    const today = new Date().toISOString().split('T')[0];
    if (today !== this.lastDayCostReset) {
      this.dailyCost = 0;
      this.lastDayCostReset = today;
    }
  }

  /**
   * Get current daily cost
   */
  getDailyCost(): number {
    this.resetDailyCostIfNeeded();
    return this.dailyCost;
  }

  // ============================================================================
  // STATISTICS
  // ============================================================================

  /**
   * Get usage statistics
   */
  getUsageStats(): ModelUsageStats[] {
    return Array.from(this.usage.values());
  }

  /**
   * Get usage for specific endpoint
   */
  getEndpointUsage(provider: ModelProvider, model: string): ModelUsageStats | undefined {
    const key = this.getEndpointKey(provider, model);
    return this.usage.get(key);
  }

  /**
   * Get total cost across all endpoints
   */
  getTotalCost(): number {
    return Array.from(this.usage.values()).reduce((sum, stats) => sum + stats.total_cost_usd, 0);
  }

  /**
   * Get total token usage
   */
  getTotalTokens(): { input: number; output: number; total: number } {
    const stats = Array.from(this.usage.values());
    const input = stats.reduce((sum, s) => sum + s.total_input_tokens, 0);
    const output = stats.reduce((sum, s) => sum + s.total_output_tokens, 0);
    return { input, output, total: input + output };
  }

  /**
   * Reset all statistics
   */
  resetStats(): void {
    for (const key of this.usage.keys()) {
      const endpoint = this.endpoints.get(key);
      if (endpoint) {
        this.initializeUsage(endpoint);
      }
    }
    this.dailyCost = 0;
  }
}

// ============================================================================
// ERROR CLASS
// ============================================================================

export class ModelRouterError extends Error {
  public readonly code: string;
  public readonly details?: Record<string, unknown>;

  constructor(message: string, code: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'ModelRouterError';
    this.code = code;
    this.details = details;
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let defaultRouter: ModelRouter | null = null;

export function getModelRouter(): ModelRouter {
  if (!defaultRouter) {
    defaultRouter = new ModelRouter();
  }
  return defaultRouter;
}

export function setModelRouter(router: ModelRouter): void {
  defaultRouter = router;
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Quick route to best available endpoint
 */
export async function routeCompletion(request: CompletionRequest): Promise<RouteResult> {
  const router = getModelRouter();
  return router.route(request);
}

/**
 * Get parameters for a use case
 */
export function getParametersForUseCase(useCase: string): ModelParameters | undefined {
  return getPresetForUseCase(useCase);
}

/**
 * Record model usage
 */
export function recordModelUsage(
  provider: ModelProvider,
  model: string,
  inputTokens: number,
  outputTokens: number,
  latencyMs: number,
  success: boolean
): void {
  const router = getModelRouter();
  router.recordUsage(provider, model, inputTokens, outputTokens, latencyMs, success);
}
