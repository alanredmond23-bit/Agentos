/**
 * openai.ts
 * OpenAI API adapter with full API support
 * Implements LLMAdapter interface for OpenAI models
 */

import { ModelParameters } from '../types/agent_yaml';
import { recordModelUsage } from '../core/model_router';

// ============================================================================
// TYPES
// ============================================================================

export interface OpenAIConfig {
  /** API key (defaults to OPENAI_API_KEY env var) */
  api_key?: string;

  /** Organization ID */
  organization_id?: string;

  /** Base URL for API */
  base_url?: string;

  /** Default model */
  default_model?: string;

  /** Request timeout (ms) */
  timeout_ms?: number;

  /** Maximum retries */
  max_retries?: number;

  /** Enable debug logging */
  debug?: boolean;
}

export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | OpenAIContentPart[];
  name?: string;
  tool_call_id?: string;
  tool_calls?: OpenAIToolCall[];
}

export interface OpenAIContentPart {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: {
    url: string;
    detail?: 'auto' | 'low' | 'high';
  };
}

export interface OpenAIToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface OpenAITool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface OpenAICompletionRequest {
  model: string;
  messages: OpenAIMessage[];
  temperature?: number;
  top_p?: number;
  n?: number;
  stream?: boolean;
  stop?: string | string[];
  max_tokens?: number;
  presence_penalty?: number;
  frequency_penalty?: number;
  logit_bias?: Record<string, number>;
  user?: string;
  tools?: OpenAITool[];
  tool_choice?: 'none' | 'auto' | { type: 'function'; function: { name: string } };
  response_format?: { type: 'text' | 'json_object' };
  seed?: number;
}

export interface OpenAICompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: OpenAIChoice[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  system_fingerprint?: string;
}

export interface OpenAIChoice {
  index: number;
  message: OpenAIMessage;
  finish_reason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | null;
}

export interface OpenAIStreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: Partial<OpenAIMessage>;
    finish_reason: string | null;
  }>;
}

export interface OpenAIError {
  error: {
    message: string;
    type: string;
    param?: string;
    code?: string;
  };
}

export interface CompletionResult {
  content: string;
  tool_calls?: OpenAIToolCall[];
  finish_reason: string;
  input_tokens: number;
  output_tokens: number;
  model: string;
  latency_ms: number;
}

export interface StreamCompletionResult {
  stream: AsyncGenerator<string, void, unknown>;
  getUsage: () => Promise<{ input_tokens: number; output_tokens: number }>;
}

export interface RateLimitStatus {
  remaining_requests?: number;
  remaining_tokens?: number;
  reset_requests?: string;
  reset_tokens?: string;
}

// ============================================================================
// OPENAI ADAPTER
// ============================================================================

export class OpenAIAdapter {
  private config: Required<OpenAIConfig>;
  private rateLimitStatus: RateLimitStatus = {};

  constructor(config: OpenAIConfig = {}) {
    this.config = {
      api_key: config.api_key ?? process.env.OPENAI_API_KEY ?? '',
      organization_id: config.organization_id ?? process.env.OPENAI_ORG_ID ?? '',
      base_url: config.base_url ?? 'https://api.openai.com/v1',
      default_model: config.default_model ?? 'gpt-4o',
      timeout_ms: config.timeout_ms ?? 60000,
      max_retries: config.max_retries ?? 3,
      debug: config.debug ?? false
    };

    if (!this.config.api_key) {
      console.warn('OpenAI API key not configured');
    }
  }

  // ============================================================================
  // COMPLETIONS
  // ============================================================================

  /**
   * Create a chat completion
   */
  async complete(
    messages: OpenAIMessage[],
    options?: {
      model?: string;
      parameters?: Partial<ModelParameters>;
      tools?: OpenAITool[];
      tool_choice?: OpenAICompletionRequest['tool_choice'];
      response_format?: OpenAICompletionRequest['response_format'];
      user?: string;
    }
  ): Promise<CompletionResult> {
    const startTime = Date.now();
    const model = options?.model ?? this.config.default_model;

    const request: OpenAICompletionRequest = {
      model,
      messages,
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

    const response = await this.makeRequest<OpenAICompletionResponse>(
      '/chat/completions',
      request
    );

    const latency = Date.now() - startTime;
    const choice = response.choices[0];

    // Record usage
    recordModelUsage(
      'openai',
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
      model: response.model,
      latency_ms: latency
    };
  }

  /**
   * Create a streaming chat completion
   */
  async completeStream(
    messages: OpenAIMessage[],
    options?: {
      model?: string;
      parameters?: Partial<ModelParameters>;
      tools?: OpenAITool[];
      tool_choice?: OpenAICompletionRequest['tool_choice'];
      user?: string;
    }
  ): Promise<StreamCompletionResult> {
    const model = options?.model ?? this.config.default_model;
    let inputTokens = 0;
    let outputTokens = 0;

    const request: OpenAICompletionRequest = {
      model,
      messages,
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
                const chunk = JSON.parse(data) as OpenAIStreamChunk;
                const delta = chunk.choices[0]?.delta;

                if (delta?.content) {
                  outputTokens++;
                  yield delta.content;
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

    // Estimate input tokens (rough approximation)
    inputTokens = this.estimateTokens(messages);

    return {
      stream: streamGenerator(),
      getUsage: async () => ({ input_tokens: inputTokens, output_tokens: outputTokens })
    };
  }

  // ============================================================================
  // TOOL EXECUTION
  // ============================================================================

  /**
   * Execute a tool call and continue completion
   */
  async executeToolCall(
    messages: OpenAIMessage[],
    toolCall: OpenAIToolCall,
    toolResult: unknown,
    options?: {
      model?: string;
      parameters?: Partial<ModelParameters>;
      tools?: OpenAITool[];
    }
  ): Promise<CompletionResult> {
    // Add the tool result to messages
    const updatedMessages: OpenAIMessage[] = [
      ...messages,
      {
        role: 'tool',
        content: typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult),
        tool_call_id: toolCall.id
      }
    ];

    return this.complete(updatedMessages, options);
  }

  // ============================================================================
  // EMBEDDINGS
  // ============================================================================

  /**
   * Create embeddings
   */
  async createEmbeddings(
    input: string | string[],
    options?: {
      model?: string;
      dimensions?: number;
      user?: string;
    }
  ): Promise<{
    embeddings: number[][];
    tokens: number;
    model: string;
  }> {
    const response = await this.makeRequest<{
      data: Array<{ embedding: number[]; index: number }>;
      usage: { prompt_tokens: number; total_tokens: number };
      model: string;
    }>('/embeddings', {
      input,
      model: options?.model ?? 'text-embedding-3-small',
      dimensions: options?.dimensions,
      user: options?.user
    });

    return {
      embeddings: response.data.sort((a, b) => a.index - b.index).map(d => d.embedding),
      tokens: response.usage.total_tokens,
      model: response.model
    };
  }

  // ============================================================================
  // MODERATION
  // ============================================================================

  /**
   * Check content for policy violations
   */
  async moderate(input: string | string[]): Promise<{
    flagged: boolean;
    categories: Record<string, boolean>;
    category_scores: Record<string, number>;
  }> {
    const response = await this.makeRequest<{
      results: Array<{
        flagged: boolean;
        categories: Record<string, boolean>;
        category_scores: Record<string, number>;
      }>;
    }>('/moderations', { input });

    const result = response.results[0];
    return {
      flagged: result.flagged,
      categories: result.categories,
      category_scores: result.category_scores
    };
  }

  // ============================================================================
  // TOKEN COUNTING
  // ============================================================================

  /**
   * Estimate token count for messages
   */
  estimateTokens(messages: OpenAIMessage[]): number {
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
   * Count tokens using tiktoken (placeholder - requires tiktoken library)
   */
  countTokens(text: string, model?: string): number {
    // In production, use tiktoken or similar
    return Math.ceil(text.length / 4);
  }

  // ============================================================================
  // COST ESTIMATION
  // ============================================================================

  /**
   * Estimate cost for a completion
   */
  estimateCost(model: string, inputTokens: number, outputTokens: number): number {
    const pricing: Record<string, { input: number; output: number }> = {
      'gpt-4-turbo': { input: 0.01, output: 0.03 },
      'gpt-4o': { input: 0.005, output: 0.015 },
      'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
      'gpt-4': { input: 0.03, output: 0.06 },
      'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 }
    };

    const price = pricing[model] ?? pricing['gpt-4o'];
    return (inputTokens / 1000) * price.input + (outputTokens / 1000) * price.output;
  }

  // ============================================================================
  // AVAILABILITY
  // ============================================================================

  /**
   * Check if OpenAI is available
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
    const response = await this.makeRequest<{ data: Array<{ id: string }> }>('/models', undefined, 'GET');
    return response.data.map(m => m.id).filter(id => id.startsWith('gpt-'));
  }

  // ============================================================================
  // HTTP HELPERS
  // ============================================================================

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.api_key}`
    };

    if (this.config.organization_id) {
      headers['OpenAI-Organization'] = this.config.organization_id;
    }

    return headers;
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
          const error = await response.json() as OpenAIError;
          throw new OpenAIAdapterError(
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
        if (error instanceof OpenAIAdapterError) {
          if (error.statusCode === 401 || error.statusCode === 403) {
            throw error;
          }
          if (error.statusCode === 429) {
            // Rate limited - wait and retry
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

  private async makeStreamRequest(
    endpoint: string,
    body: unknown
  ): Promise<Response> {
    const response = await fetch(`${this.config.base_url}${endpoint}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(this.config.timeout_ms)
    });

    this.updateRateLimitStatus(response.headers);

    if (!response.ok) {
      const error = await response.json() as OpenAIError;
      throw new OpenAIAdapterError(
        error.error.message,
        error.error.type,
        error.error.code,
        response.status
      );
    }

    return response;
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

export class OpenAIAdapterError extends Error {
  public readonly type: string;
  public readonly code?: string;
  public readonly statusCode?: number;

  constructor(message: string, type: string, code?: string, statusCode?: number) {
    super(message);
    this.name = 'OpenAIAdapterError';
    this.type = type;
    this.code = code;
    this.statusCode = statusCode;
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let defaultAdapter: OpenAIAdapter | null = null;

export function getOpenAIAdapter(): OpenAIAdapter {
  if (!defaultAdapter) {
    defaultAdapter = new OpenAIAdapter();
  }
  return defaultAdapter;
}

export function setOpenAIAdapter(adapter: OpenAIAdapter): void {
  defaultAdapter = adapter;
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Quick completion
 */
export async function openaiComplete(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  options?: {
    model?: string;
    temperature?: number;
    max_tokens?: number;
  }
): Promise<string> {
  const adapter = getOpenAIAdapter();
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
 * Quick embedding
 */
export async function openaiEmbed(text: string | string[]): Promise<number[][]> {
  const adapter = getOpenAIAdapter();
  const result = await adapter.createEmbeddings(text);
  return result.embeddings;
}
