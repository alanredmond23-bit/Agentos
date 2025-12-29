/**
 * deepseek.ts
 * DeepSeek API adapter with full API support
 * Implements LLMAdapter interface for DeepSeek models
 *
 * Features:
 * - OpenAI-compatible API at api.deepseek.com
 * - Context caching for 90% cost reduction
 * - FIM (Fill-in-Middle) for code completion
 * - Streaming responses with token counting
 * - Tool/function calling support
 * - Proper error handling with retries
 * - Rate limiting with exponential backoff
 */

import { ModelParameters } from '../types/agent_yaml';
import { recordModelUsage } from '../core/model_router';

// ============================================================================
// TYPES
// ============================================================================

export interface DeepSeekConfig {
  /** API key (defaults to DEEPSEEK_API_KEY env var) */
  api_key?: string;

  /** Base URL for API */
  base_url?: string;

  /** Default model */
  default_model?: string;

  /** Request timeout (ms) */
  timeout_ms?: number;

  /** Maximum retries */
  max_retries?: number;

  /** Enable context caching (90% cost reduction) */
  enable_cache?: boolean;

  /** Cache TTL in seconds */
  cache_ttl_seconds?: number;

  /** Enable debug logging */
  debug?: boolean;
}

export interface DeepSeekMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | DeepSeekContentPart[];
  name?: string;
  tool_call_id?: string;
  tool_calls?: DeepSeekToolCall[];
  /** Prefix content for cache optimization */
  prefix?: boolean;
}

export interface DeepSeekContentPart {
  type: 'text';
  text: string;
}

export interface DeepSeekToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface DeepSeekTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface DeepSeekCompletionRequest {
  model: string;
  messages: DeepSeekMessage[];
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  stream?: boolean;
  stop?: string | string[];
  presence_penalty?: number;
  frequency_penalty?: number;
  logprobs?: boolean;
  top_logprobs?: number;
  tools?: DeepSeekTool[];
  tool_choice?: 'none' | 'auto' | 'required' | { type: 'function'; function: { name: string } };
  response_format?: { type: 'text' | 'json_object' };
  user?: string;
}

export interface DeepSeekFIMRequest {
  model: string;
  prompt: string;
  suffix?: string;
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  stop?: string | string[];
  stream?: boolean;
}

export interface DeepSeekCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: DeepSeekChoice[];
  usage: DeepSeekUsage;
  system_fingerprint?: string;
}

export interface DeepSeekChoice {
  index: number;
  message: DeepSeekMessage;
  finish_reason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | null;
  logprobs?: {
    content: Array<{
      token: string;
      logprob: number;
      top_logprobs?: Array<{ token: string; logprob: number }>;
    }>;
  };
}

export interface DeepSeekUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  /** Cached tokens (available with context caching) */
  prompt_cache_hit_tokens?: number;
  prompt_cache_miss_tokens?: number;
}

export interface DeepSeekStreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: Partial<DeepSeekMessage>;
    finish_reason: string | null;
    logprobs?: DeepSeekChoice['logprobs'];
  }>;
  usage?: DeepSeekUsage;
}

export interface DeepSeekFIMResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    text: string;
    finish_reason: string;
  }>;
  usage: DeepSeekUsage;
}

export interface DeepSeekError {
  error: {
    message: string;
    type: string;
    param?: string;
    code?: string;
  };
}

export interface CompletionResult {
  content: string;
  tool_calls?: DeepSeekToolCall[];
  finish_reason: string;
  input_tokens: number;
  output_tokens: number;
  cached_tokens?: number;
  model: string;
  latency_ms: number;
}

export interface FIMResult {
  completion: string;
  finish_reason: string;
  input_tokens: number;
  output_tokens: number;
  model: string;
  latency_ms: number;
}

export interface StreamCompletionResult {
  stream: AsyncGenerator<string, void, unknown>;
  getUsage: () => Promise<{ input_tokens: number; output_tokens: number; cached_tokens?: number }>;
}

export interface RateLimitStatus {
  remaining_requests?: number;
  remaining_tokens?: number;
  reset_requests?: string;
  reset_tokens?: string;
}

export interface CacheStats {
  total_requests: number;
  cache_hits: number;
  cache_misses: number;
  tokens_saved: number;
  cost_savings_usd: number;
}

// ============================================================================
// MODEL DEFINITIONS
// ============================================================================

export const DEEPSEEK_MODELS = {
  // Chat model - general purpose
  'deepseek-chat': {
    id: 'deepseek-chat',
    name: 'DeepSeek Chat',
    context_length: 64000,
    supports_tools: true,
    supports_fim: false,
    supports_cache: true,
    cost_per_1k_input: 0.00014,
    cost_per_1k_output: 0.00028,
    cost_per_1k_cache_hit: 0.000014 // 90% reduction
  },
  // Coder model - optimized for code
  'deepseek-coder': {
    id: 'deepseek-coder',
    name: 'DeepSeek Coder',
    context_length: 64000,
    supports_tools: true,
    supports_fim: true,
    supports_cache: true,
    cost_per_1k_input: 0.00014,
    cost_per_1k_output: 0.00028,
    cost_per_1k_cache_hit: 0.000014
  },
  // Reasoner model - chain-of-thought reasoning
  'deepseek-reasoner': {
    id: 'deepseek-reasoner',
    name: 'DeepSeek Reasoner',
    context_length: 64000,
    supports_tools: true,
    supports_fim: false,
    supports_cache: true,
    cost_per_1k_input: 0.00055,
    cost_per_1k_output: 0.00219,
    cost_per_1k_cache_hit: 0.000055
  }
} as const;

export type DeepSeekModel = keyof typeof DEEPSEEK_MODELS;

// ============================================================================
// DEEPSEEK ADAPTER
// ============================================================================

export class DeepSeekAdapter {
  private config: Required<DeepSeekConfig>;
  private rateLimitStatus: RateLimitStatus = {};
  private cacheStats: CacheStats = {
    total_requests: 0,
    cache_hits: 0,
    cache_misses: 0,
    tokens_saved: 0,
    cost_savings_usd: 0
  };

  constructor(config: DeepSeekConfig = {}) {
    this.config = {
      api_key: config.api_key ?? process.env.DEEPSEEK_API_KEY ?? '',
      base_url: config.base_url ?? 'https://api.deepseek.com/v1',
      default_model: config.default_model ?? 'deepseek-chat',
      timeout_ms: config.timeout_ms ?? 60000,
      max_retries: config.max_retries ?? 3,
      enable_cache: config.enable_cache ?? true,
      cache_ttl_seconds: config.cache_ttl_seconds ?? 3600,
      debug: config.debug ?? false
    };

    if (!this.config.api_key) {
      console.warn('DeepSeek API key not configured');
    }
  }

  // ============================================================================
  // COMPLETIONS
  // ============================================================================

  /**
   * Create a chat completion
   */
  async complete(
    messages: DeepSeekMessage[],
    options?: {
      model?: string;
      parameters?: Partial<ModelParameters>;
      tools?: DeepSeekTool[];
      tool_choice?: DeepSeekCompletionRequest['tool_choice'];
      response_format?: DeepSeekCompletionRequest['response_format'];
      user?: string;
      enable_cache?: boolean;
    }
  ): Promise<CompletionResult> {
    const startTime = Date.now();
    const model = options?.model ?? this.config.default_model;

    // Prepare messages with cache optimization
    const optimizedMessages = this.config.enable_cache && options?.enable_cache !== false
      ? this.optimizeForCache(messages)
      : messages;

    const request: DeepSeekCompletionRequest = {
      model,
      messages: optimizedMessages,
      temperature: options?.parameters?.temperature,
      top_p: options?.parameters?.top_p,
      max_tokens: options?.parameters?.max_tokens,
      presence_penalty: options?.parameters?.presence_penalty,
      frequency_penalty: options?.parameters?.frequency_penalty,
      stop: options?.parameters?.stop_sequences,
      tools: options?.tools,
      tool_choice: options?.tool_choice,
      response_format: options?.response_format,
      user: options?.user
    };

    // Remove undefined values
    Object.keys(request).forEach(key => {
      if ((request as Record<string, unknown>)[key] === undefined) {
        delete (request as Record<string, unknown>)[key];
      }
    });

    const response = await this.makeRequest<DeepSeekCompletionResponse>(
      '/chat/completions',
      request
    );

    const latency = Date.now() - startTime;
    const choice = response.choices[0];

    // Track cache statistics
    this.updateCacheStats(response.usage, model);

    // Record usage
    recordModelUsage(
      'deepseek',
      model,
      response.usage.prompt_tokens,
      response.usage.completion_tokens,
      latency,
      true
    );

    return {
      content: typeof choice.message.content === 'string'
        ? choice.message.content
        : choice.message.content?.map(p => p.text ?? '').join('') ?? '',
      tool_calls: choice.message.tool_calls,
      finish_reason: choice.finish_reason ?? 'stop',
      input_tokens: response.usage.prompt_tokens,
      output_tokens: response.usage.completion_tokens,
      cached_tokens: response.usage.prompt_cache_hit_tokens,
      model: response.model,
      latency_ms: latency
    };
  }

  /**
   * Create a streaming chat completion
   */
  async completeStream(
    messages: DeepSeekMessage[],
    options?: {
      model?: string;
      parameters?: Partial<ModelParameters>;
      tools?: DeepSeekTool[];
      tool_choice?: DeepSeekCompletionRequest['tool_choice'];
      user?: string;
      enable_cache?: boolean;
    }
  ): Promise<StreamCompletionResult> {
    const model = options?.model ?? this.config.default_model;
    let inputTokens = 0;
    let outputTokens = 0;
    let cachedTokens = 0;

    // Prepare messages with cache optimization
    const optimizedMessages = this.config.enable_cache && options?.enable_cache !== false
      ? this.optimizeForCache(messages)
      : messages;

    const request: DeepSeekCompletionRequest = {
      model,
      messages: optimizedMessages,
      stream: true,
      temperature: options?.parameters?.temperature,
      top_p: options?.parameters?.top_p,
      max_tokens: options?.parameters?.max_tokens,
      presence_penalty: options?.parameters?.presence_penalty,
      frequency_penalty: options?.parameters?.frequency_penalty,
      stop: options?.parameters?.stop_sequences,
      tools: options?.tools,
      tool_choice: options?.tool_choice
    };

    // Remove undefined values
    Object.keys(request).forEach(key => {
      if ((request as Record<string, unknown>)[key] === undefined) {
        delete (request as Record<string, unknown>)[key];
      }
    });

    const response = await this.makeStreamRequest('/chat/completions', request);

    const self = this;
    async function* streamGenerator(): AsyncGenerator<string, void, unknown> {
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;

              try {
                const chunk = JSON.parse(data) as DeepSeekStreamChunk;
                const delta = chunk.choices[0]?.delta;

                if (delta?.content) {
                  outputTokens++;
                  yield typeof delta.content === 'string'
                    ? delta.content
                    : delta.content.map(p => p.text).join('');
                }

                // Capture usage from final chunk
                if (chunk.usage) {
                  inputTokens = chunk.usage.prompt_tokens;
                  outputTokens = chunk.usage.completion_tokens;
                  cachedTokens = chunk.usage.prompt_cache_hit_tokens ?? 0;
                }
              } catch {
                // Ignore parse errors for incomplete chunks
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    }

    // Estimate input tokens if not provided in stream
    if (inputTokens === 0) {
      inputTokens = this.estimateTokens(messages);
    }

    return {
      stream: streamGenerator(),
      getUsage: async () => ({
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        cached_tokens: cachedTokens > 0 ? cachedTokens : undefined
      })
    };
  }

  // ============================================================================
  // FIM (FILL-IN-MIDDLE) CODE COMPLETION
  // ============================================================================

  /**
   * Create a FIM code completion (deepseek-coder only)
   *
   * @param prompt - Code before the cursor
   * @param suffix - Code after the cursor
   * @param options - Completion options
   * @returns FIM completion result
   */
  async fillInMiddle(
    prompt: string,
    suffix?: string,
    options?: {
      model?: string;
      max_tokens?: number;
      temperature?: number;
      top_p?: number;
      stop?: string[];
      stream?: false;
    }
  ): Promise<FIMResult> {
    const startTime = Date.now();
    const model = options?.model ?? 'deepseek-coder';

    // Validate model supports FIM
    const modelInfo = DEEPSEEK_MODELS[model as DeepSeekModel];
    if (modelInfo && !modelInfo.supports_fim) {
      throw new DeepSeekAdapterError(
        `Model ${model} does not support FIM. Use deepseek-coder.`,
        'unsupported_model'
      );
    }

    const request: DeepSeekFIMRequest = {
      model,
      prompt,
      suffix,
      max_tokens: options?.max_tokens ?? 256,
      temperature: options?.temperature ?? 0.0,
      top_p: options?.top_p,
      stop: options?.stop
    };

    // Remove undefined values
    Object.keys(request).forEach(key => {
      if ((request as Record<string, unknown>)[key] === undefined) {
        delete (request as Record<string, unknown>)[key];
      }
    });

    const response = await this.makeRequest<DeepSeekFIMResponse>(
      '/completions',
      request
    );

    const latency = Date.now() - startTime;

    // Record usage
    recordModelUsage(
      'deepseek',
      model,
      response.usage.prompt_tokens,
      response.usage.completion_tokens,
      latency,
      true
    );

    return {
      completion: response.choices[0]?.text ?? '',
      finish_reason: response.choices[0]?.finish_reason ?? 'stop',
      input_tokens: response.usage.prompt_tokens,
      output_tokens: response.usage.completion_tokens,
      model: response.model,
      latency_ms: latency
    };
  }

  /**
   * Stream FIM code completion
   */
  async fillInMiddleStream(
    prompt: string,
    suffix?: string,
    options?: {
      model?: string;
      max_tokens?: number;
      temperature?: number;
      top_p?: number;
      stop?: string[];
    }
  ): Promise<AsyncGenerator<string, void, unknown>> {
    const model = options?.model ?? 'deepseek-coder';

    const request: DeepSeekFIMRequest = {
      model,
      prompt,
      suffix,
      max_tokens: options?.max_tokens ?? 256,
      temperature: options?.temperature ?? 0.0,
      top_p: options?.top_p,
      stop: options?.stop,
      stream: true
    };

    // Remove undefined values
    Object.keys(request).forEach(key => {
      if ((request as Record<string, unknown>)[key] === undefined) {
        delete (request as Record<string, unknown>)[key];
      }
    });

    const response = await this.makeStreamRequest('/completions', request);

    async function* streamGenerator(): AsyncGenerator<string, void, unknown> {
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;

              try {
                const chunk = JSON.parse(data);
                if (chunk.choices?.[0]?.text) {
                  yield chunk.choices[0].text;
                }
              } catch {
                // Ignore parse errors
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    }

    return streamGenerator();
  }

  // ============================================================================
  // TOOL EXECUTION
  // ============================================================================

  /**
   * Execute a tool call and continue completion
   */
  async executeToolCall(
    messages: DeepSeekMessage[],
    toolCall: DeepSeekToolCall,
    toolResult: unknown,
    options?: {
      model?: string;
      parameters?: Partial<ModelParameters>;
      tools?: DeepSeekTool[];
    }
  ): Promise<CompletionResult> {
    // Add the tool result to messages
    const updatedMessages: DeepSeekMessage[] = [
      ...messages,
      {
        role: 'tool',
        content: typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult),
        tool_call_id: toolCall.id
      }
    ];

    return this.complete(updatedMessages, options);
  }

  /**
   * Execute multiple tool calls in parallel
   */
  async executeToolCalls(
    messages: DeepSeekMessage[],
    toolCalls: DeepSeekToolCall[],
    toolResults: Map<string, unknown>,
    options?: {
      model?: string;
      parameters?: Partial<ModelParameters>;
      tools?: DeepSeekTool[];
    }
  ): Promise<CompletionResult> {
    // Add all tool results to messages
    const toolMessages: DeepSeekMessage[] = toolCalls.map(call => ({
      role: 'tool' as const,
      content: typeof toolResults.get(call.id) === 'string'
        ? toolResults.get(call.id) as string
        : JSON.stringify(toolResults.get(call.id)),
      tool_call_id: call.id
    }));

    const updatedMessages: DeepSeekMessage[] = [...messages, ...toolMessages];

    return this.complete(updatedMessages, options);
  }

  // ============================================================================
  // CONTEXT CACHING
  // ============================================================================

  /**
   * Optimize messages for context caching
   * Marks system prompts and early context as cacheable
   */
  private optimizeForCache(messages: DeepSeekMessage[]): DeepSeekMessage[] {
    if (messages.length === 0) return messages;

    const optimized = [...messages];

    // Mark system message as prefix for caching
    if (optimized[0]?.role === 'system') {
      optimized[0] = { ...optimized[0], prefix: true };
    }

    // Mark early context messages as cacheable (first few user/assistant pairs)
    let cacheableCount = 0;
    const maxCacheable = 4; // Cache up to 4 messages

    for (let i = 0; i < optimized.length && cacheableCount < maxCacheable; i++) {
      if (optimized[i].role !== 'system') {
        optimized[i] = { ...optimized[i], prefix: true };
        cacheableCount++;
      }
    }

    return optimized;
  }

  /**
   * Update cache statistics
   */
  private updateCacheStats(usage: DeepSeekUsage, model: string): void {
    this.cacheStats.total_requests++;

    const cacheHits = usage.prompt_cache_hit_tokens ?? 0;
    const cacheMisses = usage.prompt_cache_miss_tokens ?? usage.prompt_tokens;

    if (cacheHits > 0) {
      this.cacheStats.cache_hits++;
      this.cacheStats.tokens_saved += cacheHits;

      // Calculate cost savings (90% reduction on cached tokens)
      const modelInfo = DEEPSEEK_MODELS[model as DeepSeekModel] ?? DEEPSEEK_MODELS['deepseek-chat'];
      const normalCost = (cacheHits / 1000) * modelInfo.cost_per_1k_input;
      const cachedCost = (cacheHits / 1000) * modelInfo.cost_per_1k_cache_hit;
      this.cacheStats.cost_savings_usd += normalCost - cachedCost;
    } else {
      this.cacheStats.cache_misses++;
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): CacheStats {
    return { ...this.cacheStats };
  }

  /**
   * Reset cache statistics
   */
  resetCacheStats(): void {
    this.cacheStats = {
      total_requests: 0,
      cache_hits: 0,
      cache_misses: 0,
      tokens_saved: 0,
      cost_savings_usd: 0
    };
  }

  // ============================================================================
  // TOKEN COUNTING
  // ============================================================================

  /**
   * Estimate token count for messages
   */
  estimateTokens(messages: DeepSeekMessage[]): number {
    // Rough estimation: ~4 chars per token for English
    let chars = 0;
    for (const msg of messages) {
      if (typeof msg.content === 'string') {
        chars += msg.content.length;
      } else if (Array.isArray(msg.content)) {
        for (const part of msg.content) {
          if (part.text) chars += part.text.length;
        }
      }
    }
    return Math.ceil(chars / 4);
  }

  /**
   * Count tokens in text (placeholder - requires tokenizer)
   */
  countTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  // ============================================================================
  // COST ESTIMATION
  // ============================================================================

  /**
   * Estimate cost for a completion
   */
  estimateCost(
    model: string,
    inputTokens: number,
    outputTokens: number,
    cachedTokens?: number
  ): number {
    const modelInfo = DEEPSEEK_MODELS[model as DeepSeekModel] ?? DEEPSEEK_MODELS['deepseek-chat'];

    // Calculate input cost (cached vs non-cached)
    const cachedInputTokens = cachedTokens ?? 0;
    const nonCachedInputTokens = inputTokens - cachedInputTokens;

    const inputCost =
      (nonCachedInputTokens / 1000) * modelInfo.cost_per_1k_input +
      (cachedInputTokens / 1000) * modelInfo.cost_per_1k_cache_hit;

    const outputCost = (outputTokens / 1000) * modelInfo.cost_per_1k_output;

    return inputCost + outputCost;
  }

  /**
   * Get pricing for a model
   */
  getModelPricing(model: string): {
    input: number;
    output: number;
    cache_hit: number;
  } {
    const modelInfo = DEEPSEEK_MODELS[model as DeepSeekModel] ?? DEEPSEEK_MODELS['deepseek-chat'];
    return {
      input: modelInfo.cost_per_1k_input,
      output: modelInfo.cost_per_1k_output,
      cache_hit: modelInfo.cost_per_1k_cache_hit
    };
  }

  // ============================================================================
  // AVAILABILITY
  // ============================================================================

  /**
   * Check if DeepSeek is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.base_url}/models`, {
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(5000)
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get rate limit status from last request
   */
  getRateLimitStatus(): RateLimitStatus {
    return { ...this.rateLimitStatus };
  }

  /**
   * List available models
   */
  async listModels(): Promise<string[]> {
    try {
      const response = await this.makeRequest<{ data: Array<{ id: string }> }>('/models', undefined, 'GET');
      return response.data.map(m => m.id);
    } catch {
      // Return known models if API call fails
      return Object.keys(DEEPSEEK_MODELS);
    }
  }

  /**
   * Get model information
   */
  getModelInfo(model: string): typeof DEEPSEEK_MODELS[DeepSeekModel] | undefined {
    return DEEPSEEK_MODELS[model as DeepSeekModel];
  }

  // ============================================================================
  // HTTP HELPERS
  // ============================================================================

  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.api_key}`
    };
  }

  private async makeRequest<T>(
    endpoint: string,
    body?: unknown,
    method: 'GET' | 'POST' = 'POST'
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.max_retries; attempt++) {
      try {
        const response = await fetch(`${this.config.base_url}${endpoint}`, {
          method,
          headers: this.getHeaders(),
          body: body ? JSON.stringify(body) : undefined,
          signal: AbortSignal.timeout(this.config.timeout_ms)
        });

        // Update rate limit status
        this.updateRateLimitStatus(response.headers);

        if (!response.ok) {
          const error = await response.json() as DeepSeekError;
          throw new DeepSeekAdapterError(
            error.error.message,
            error.error.type,
            error.error.code,
            response.status
          );
        }

        return await response.json() as T;
      } catch (error) {
        lastError = error as Error;

        // Don't retry on certain errors
        if (error instanceof DeepSeekAdapterError) {
          if (error.statusCode === 401 || error.statusCode === 403) {
            throw error;
          }
          if (error.statusCode === 400) {
            // Bad request - don't retry
            throw error;
          }
          if (error.statusCode === 429) {
            // Rate limited - wait and retry with exponential backoff
            const waitTime = this.calculateBackoff(attempt);
            if (this.config.debug) {
              console.log(`DeepSeek rate limited. Waiting ${waitTime}ms before retry ${attempt}`);
            }
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }
          if (error.statusCode === 500 || error.statusCode === 502 || error.statusCode === 503) {
            // Server error - retry with backoff
            const waitTime = 1000 * Math.pow(2, attempt);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }
        }

        if (attempt < this.config.max_retries) {
          const waitTime = 1000 * Math.pow(2, attempt - 1);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }

    throw lastError ?? new Error('Request failed');
  }

  private calculateBackoff(attempt: number): number {
    // Default exponential backoff
    return Math.min(1000 * Math.pow(2, attempt), 32000);
  }

  private async makeStreamRequest(
    endpoint: string,
    body: unknown
  ): Promise<Response> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.max_retries; attempt++) {
      try {
        const response = await fetch(`${this.config.base_url}${endpoint}`, {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(this.config.timeout_ms)
        });

        this.updateRateLimitStatus(response.headers);

        if (!response.ok) {
          const error = await response.json() as DeepSeekError;
          throw new DeepSeekAdapterError(
            error.error.message,
            error.error.type,
            error.error.code,
            response.status
          );
        }

        return response;
      } catch (error) {
        lastError = error as Error;

        if (error instanceof DeepSeekAdapterError) {
          if (error.statusCode === 401 || error.statusCode === 403 || error.statusCode === 400) {
            throw error;
          }
          if (error.statusCode === 429) {
            const waitTime = this.calculateBackoff(attempt);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }
        }

        if (attempt < this.config.max_retries) {
          const waitTime = 1000 * Math.pow(2, attempt - 1);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }

    throw lastError ?? new Error('Stream request failed');
  }

  private updateRateLimitStatus(headers: Headers): void {
    const remaining = headers.get('x-ratelimit-remaining-requests');
    const remainingTokens = headers.get('x-ratelimit-remaining-tokens');
    const resetRequests = headers.get('x-ratelimit-reset-requests');
    const resetTokens = headers.get('x-ratelimit-reset-tokens');

    this.rateLimitStatus = {
      remaining_requests: remaining ? parseInt(remaining, 10) : undefined,
      remaining_tokens: remainingTokens ? parseInt(remainingTokens, 10) : undefined,
      reset_requests: resetRequests ?? undefined,
      reset_tokens: resetTokens ?? undefined
    };
  }
}

// ============================================================================
// ERROR CLASS
// ============================================================================

export class DeepSeekAdapterError extends Error {
  public readonly type: string;
  public readonly code?: string;
  public readonly statusCode?: number;

  constructor(message: string, type: string, code?: string, statusCode?: number) {
    super(message);
    this.name = 'DeepSeekAdapterError';
    this.type = type;
    this.code = code;
    this.statusCode = statusCode;
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let defaultAdapter: DeepSeekAdapter | null = null;

export function getDeepSeekAdapter(): DeepSeekAdapter {
  if (!defaultAdapter) {
    defaultAdapter = new DeepSeekAdapter();
  }
  return defaultAdapter;
}

export function setDeepSeekAdapter(adapter: DeepSeekAdapter): void {
  defaultAdapter = adapter;
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Quick completion with DeepSeek
 */
export async function deepseekComplete(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  options?: {
    model?: string;
    temperature?: number;
    max_tokens?: number;
  }
): Promise<string> {
  const adapter = getDeepSeekAdapter();
  const result = await adapter.complete(messages, {
    model: options?.model,
    parameters: {
      temperature: options?.temperature,
      max_tokens: options?.max_tokens
    }
  });
  return result.content;
}

/**
 * Quick streaming completion with DeepSeek
 */
export async function* deepseekStream(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  options?: {
    model?: string;
    temperature?: number;
    max_tokens?: number;
  }
): AsyncGenerator<string, void, unknown> {
  const adapter = getDeepSeekAdapter();
  const result = await adapter.completeStream(messages, {
    model: options?.model,
    parameters: {
      temperature: options?.temperature,
      max_tokens: options?.max_tokens
    }
  });

  yield* result.stream;
}

/**
 * Quick code completion with DeepSeek FIM
 */
export async function deepseekFIM(
  prompt: string,
  suffix?: string,
  options?: {
    max_tokens?: number;
    temperature?: number;
  }
): Promise<string> {
  const adapter = getDeepSeekAdapter();
  const result = await adapter.fillInMiddle(prompt, suffix, {
    model: 'deepseek-coder',
    max_tokens: options?.max_tokens,
    temperature: options?.temperature
  });
  return result.completion;
}

/**
 * Complete with tools/function calling
 */
export async function deepseekWithTools(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  tools: DeepSeekTool[],
  options?: {
    model?: string;
    temperature?: number;
    max_tokens?: number;
    tool_choice?: DeepSeekCompletionRequest['tool_choice'];
  }
): Promise<CompletionResult> {
  const adapter = getDeepSeekAdapter();
  return adapter.complete(messages, {
    model: options?.model,
    tools,
    tool_choice: options?.tool_choice ?? 'auto',
    parameters: {
      temperature: options?.temperature,
      max_tokens: options?.max_tokens
    }
  });
}

/**
 * Get cache statistics
 */
export function getDeepSeekCacheStats(): CacheStats {
  const adapter = getDeepSeekAdapter();
  return adapter.getCacheStats();
}
