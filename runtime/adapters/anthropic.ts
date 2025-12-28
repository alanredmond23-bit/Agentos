/**
 * anthropic.ts
 * Anthropic Claude API adapter with full API support
 * Implements LLMAdapter interface for Claude models
 */

import { ModelParameters } from '../types/agent_yaml';
import { recordModelUsage } from '../core/model_router';

// ============================================================================
// TYPES
// ============================================================================

export interface AnthropicConfig {
  /** API key (defaults to ANTHROPIC_API_KEY env var) */
  api_key?: string;

  /** Base URL for API */
  base_url?: string;

  /** Default model */
  default_model?: string;

  /** Request timeout (ms) */
  timeout_ms?: number;

  /** Maximum retries */
  max_retries?: number;

  /** API version */
  api_version?: string;

  /** Enable debug logging */
  debug?: boolean;
}

export interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string | AnthropicContentBlock[];
}

export interface AnthropicContentBlock {
  type: 'text' | 'image' | 'tool_use' | 'tool_result';
  text?: string;
  source?: {
    type: 'base64';
    media_type: string;
    data: string;
  };
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  tool_use_id?: string;
  content?: string | AnthropicContentBlock[];
  is_error?: boolean;
}

export interface AnthropicTool {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface AnthropicCompletionRequest {
  model: string;
  messages: AnthropicMessage[];
  max_tokens: number;
  system?: string;
  metadata?: { user_id?: string };
  stop_sequences?: string[];
  stream?: boolean;
  temperature?: number;
  top_p?: number;
  top_k?: number;
  tools?: AnthropicTool[];
  tool_choice?: { type: 'auto' | 'any' | 'tool'; name?: string };
}

export interface AnthropicCompletionResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  content: AnthropicContentBlock[];
  model: string;
  stop_reason: 'end_turn' | 'max_tokens' | 'stop_sequence' | 'tool_use' | null;
  stop_sequence?: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

export interface AnthropicStreamEvent {
  type: string;
  index?: number;
  message?: AnthropicCompletionResponse;
  content_block?: AnthropicContentBlock;
  delta?: {
    type: string;
    text?: string;
    partial_json?: string;
  };
  usage?: {
    output_tokens: number;
  };
}

export interface AnthropicError {
  type: string;
  error: {
    type: string;
    message: string;
  };
}

export interface CompletionResult {
  content: string;
  tool_uses?: Array<{
    id: string;
    name: string;
    input: Record<string, unknown>;
  }>;
  stop_reason: string;
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
  requests_remaining?: number;
  tokens_remaining?: number;
  requests_reset?: string;
  tokens_reset?: string;
}

// ============================================================================
// ANTHROPIC ADAPTER
// ============================================================================

export class AnthropicAdapter {
  private config: Required<AnthropicConfig>;
  private rateLimitStatus: RateLimitStatus = {};

  constructor(config: AnthropicConfig = {}) {
    this.config = {
      api_key: config.api_key ?? process.env.ANTHROPIC_API_KEY ?? '',
      base_url: config.base_url ?? 'https://api.anthropic.com',
      default_model: config.default_model ?? 'claude-3-5-sonnet-20241022',
      timeout_ms: config.timeout_ms ?? 120000,
      max_retries: config.max_retries ?? 3,
      api_version: config.api_version ?? '2023-06-01',
      debug: config.debug ?? false
    };

    if (!this.config.api_key) {
      console.warn('Anthropic API key not configured');
    }
  }

  // ============================================================================
  // COMPLETIONS
  // ============================================================================

  /**
   * Create a chat completion
   */
  async complete(
    messages: AnthropicMessage[],
    options?: {
      model?: string;
      parameters?: Partial<ModelParameters>;
      system?: string;
      tools?: AnthropicTool[];
      tool_choice?: AnthropicCompletionRequest['tool_choice'];
      user_id?: string;
    }
  ): Promise<CompletionResult> {
    const startTime = Date.now();
    const model = options?.model ?? this.config.default_model;

    const request: AnthropicCompletionRequest = {
      model,
      messages,
      max_tokens: options?.parameters?.max_tokens ?? 4096,
      system: options?.system,
      temperature: options?.parameters?.temperature,
      top_p: options?.parameters?.top_p,
      top_k: options?.parameters?.top_k,
      stop_sequences: options?.parameters?.stop_sequences,
      tools: options?.tools,
      tool_choice: options?.tool_choice,
      metadata: options?.user_id ? { user_id: options.user_id } : undefined
    };

    // Remove undefined values
    Object.keys(request).forEach(key => {
      if ((request as Record<string, unknown>)[key] === undefined) {
        delete (request as Record<string, unknown>)[key];
      }
    });

    const response = await this.makeRequest<AnthropicCompletionResponse>(
      '/v1/messages',
      request
    );

    const latency = Date.now() - startTime;

    // Extract text content
    const textContent = response.content
      .filter(block => block.type === 'text')
      .map(block => block.text ?? '')
      .join('');

    // Extract tool uses
    const toolUses = response.content
      .filter(block => block.type === 'tool_use')
      .map(block => ({
        id: block.id!,
        name: block.name!,
        input: block.input!
      }));

    // Record usage
    recordModelUsage(
      'anthropic',
      model,
      response.usage.input_tokens,
      response.usage.output_tokens,
      latency,
      true
    );

    return {
      content: textContent,
      tool_uses: toolUses.length > 0 ? toolUses : undefined,
      stop_reason: response.stop_reason ?? 'end_turn',
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
      model: response.model,
      latency_ms: latency
    };
  }

  /**
   * Create a streaming chat completion
   */
  async completeStream(
    messages: AnthropicMessage[],
    options?: {
      model?: string;
      parameters?: Partial<ModelParameters>;
      system?: string;
      tools?: AnthropicTool[];
      user_id?: string;
    }
  ): Promise<StreamCompletionResult> {
    const model = options?.model ?? this.config.default_model;
    let inputTokens = 0;
    let outputTokens = 0;

    const request: AnthropicCompletionRequest = {
      model,
      messages,
      max_tokens: options?.parameters?.max_tokens ?? 4096,
      stream: true,
      system: options?.system,
      temperature: options?.parameters?.temperature,
      top_p: options?.parameters?.top_p,
      top_k: options?.parameters?.top_k,
      stop_sequences: options?.parameters?.stop_sequences,
      tools: options?.tools,
      metadata: options?.user_id ? { user_id: options.user_id } : undefined
    };

    // Remove undefined values
    Object.keys(request).forEach(key => {
      if ((request as Record<string, unknown>)[key] === undefined) {
        delete (request as Record<string, unknown>)[key];
      }
    });

    const response = await this.makeStreamRequest('/v1/messages', request);

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
              if (!data) continue;

              try {
                const event = JSON.parse(data) as AnthropicStreamEvent;

                // Handle different event types
                if (event.type === 'message_start' && event.message) {
                  inputTokens = event.message.usage.input_tokens;
                } else if (event.type === 'content_block_delta' && event.delta?.text) {
                  yield event.delta.text;
                } else if (event.type === 'message_delta' && event.usage) {
                  outputTokens = event.usage.output_tokens;
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
    messages: AnthropicMessage[],
    toolUse: { id: string; name: string; input: Record<string, unknown> },
    toolResult: unknown,
    options?: {
      model?: string;
      parameters?: Partial<ModelParameters>;
      system?: string;
      tools?: AnthropicTool[];
      is_error?: boolean;
    }
  ): Promise<CompletionResult> {
    // Build messages with tool result
    const updatedMessages: AnthropicMessage[] = [
      ...messages,
      {
        role: 'user',
        content: [
          {
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult),
            is_error: options?.is_error
          }
        ]
      }
    ];

    return this.complete(updatedMessages, options);
  }

  // ============================================================================
  // MESSAGE CONVERSION
  // ============================================================================

  /**
   * Convert OpenAI-style messages to Anthropic format
   */
  convertFromOpenAI(messages: Array<{
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string;
    name?: string;
    tool_call_id?: string;
  }>): { system?: string; messages: AnthropicMessage[] } {
    let system: string | undefined;
    const anthropicMessages: AnthropicMessage[] = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        system = msg.content;
      } else if (msg.role === 'user' || msg.role === 'assistant') {
        anthropicMessages.push({
          role: msg.role,
          content: msg.content
        });
      } else if (msg.role === 'tool') {
        // Convert tool response
        const lastMsg = anthropicMessages[anthropicMessages.length - 1];
        if (lastMsg?.role === 'user') {
          // Append to existing user message
          const content = Array.isArray(lastMsg.content) ? lastMsg.content : [{ type: 'text' as const, text: lastMsg.content as string }];
          content.push({
            type: 'tool_result',
            tool_use_id: msg.tool_call_id,
            content: msg.content
          });
          lastMsg.content = content;
        } else {
          anthropicMessages.push({
            role: 'user',
            content: [{
              type: 'tool_result',
              tool_use_id: msg.tool_call_id,
              content: msg.content
            }]
          });
        }
      }
    }

    return { system, messages: anthropicMessages };
  }

  // ============================================================================
  // TOKEN COUNTING
  // ============================================================================

  /**
   * Estimate token count for messages
   */
  estimateTokens(messages: AnthropicMessage[], system?: string): number {
    // Rough estimation: ~4 chars per token for English
    let chars = system?.length ?? 0;

    for (const msg of messages) {
      if (typeof msg.content === 'string') {
        chars += msg.content.length;
      } else if (Array.isArray(msg.content)) {
        for (const block of msg.content) {
          if (block.type === 'text' && block.text) {
            chars += block.text.length;
          }
        }
      }
    }

    return Math.ceil(chars / 4);
  }

  /**
   * Count tokens (placeholder - requires tokenizer)
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
  estimateCost(model: string, inputTokens: number, outputTokens: number): number {
    const pricing: Record<string, { input: number; output: number }> = {
      'claude-3-opus-20240229': { input: 0.015, output: 0.075 },
      'claude-3-5-sonnet-20241022': { input: 0.003, output: 0.015 },
      'claude-3-sonnet-20240229': { input: 0.003, output: 0.015 },
      'claude-3-haiku-20240307': { input: 0.00025, output: 0.00125 }
    };

    const price = pricing[model] ?? pricing['claude-3-5-sonnet-20241022'];
    return (inputTokens / 1000) * price.input + (outputTokens / 1000) * price.output;
  }

  // ============================================================================
  // AVAILABILITY
  // ============================================================================

  /**
   * Check if Anthropic is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      // Make a minimal request to check availability
      const response = await fetch(`${this.config.base_url}/v1/messages`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          model: this.config.default_model,
          max_tokens: 1,
          messages: [{ role: 'user', content: 'test' }]
        }),
        signal: AbortSignal.timeout(10000)
      });

      // 200 OK or 400 Bad Request both indicate the API is available
      return response.ok || response.status === 400;
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

  // ============================================================================
  // HTTP HELPERS
  // ============================================================================

  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'x-api-key': this.config.api_key,
      'anthropic-version': this.config.api_version
    };
  }

  private async makeRequest<T>(
    endpoint: string,
    body: unknown
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.max_retries; attempt++) {
      try {
        const response = await fetch(`${this.config.base_url}${endpoint}`, {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(this.config.timeout_ms)
        });

        // Update rate limit status
        this.updateRateLimitStatus(response.headers);

        if (!response.ok) {
          const error = await response.json() as AnthropicError;
          throw new AnthropicAdapterError(
            error.error.message,
            error.error.type,
            response.status
          );
        }

        return await response.json() as T;
      } catch (error) {
        lastError = error as Error;

        // Don't retry on certain errors
        if (error instanceof AnthropicAdapterError) {
          if (error.statusCode === 401 || error.statusCode === 403) {
            throw error;
          }
          if (error.statusCode === 429) {
            // Rate limited - wait and retry
            const waitTime = 1000 * Math.pow(2, attempt);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }
          if (error.statusCode === 529) {
            // Overloaded - wait longer and retry
            const waitTime = 5000 * attempt;
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
      const error = await response.json() as AnthropicError;
      throw new AnthropicAdapterError(
        error.error.message,
        error.error.type,
        response.status
      );
    }

    return response;
  }

  private updateRateLimitStatus(headers: Headers): void {
    const reqRemaining = headers.get('anthropic-ratelimit-requests-remaining');
    const tokRemaining = headers.get('anthropic-ratelimit-tokens-remaining');
    const reqReset = headers.get('anthropic-ratelimit-requests-reset');
    const tokReset = headers.get('anthropic-ratelimit-tokens-reset');

    this.rateLimitStatus = {
      requests_remaining: reqRemaining ? parseInt(reqRemaining, 10) : undefined,
      tokens_remaining: tokRemaining ? parseInt(tokRemaining, 10) : undefined,
      requests_reset: reqReset ?? undefined,
      tokens_reset: tokReset ?? undefined
    };
  }
}

// ============================================================================
// ERROR CLASS
// ============================================================================

export class AnthropicAdapterError extends Error {
  public readonly type: string;
  public readonly statusCode?: number;

  constructor(message: string, type: string, statusCode?: number) {
    super(message);
    this.name = 'AnthropicAdapterError';
    this.type = type;
    this.statusCode = statusCode;
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let defaultAdapter: AnthropicAdapter | null = null;

export function getAnthropicAdapter(): AnthropicAdapter {
  if (!defaultAdapter) {
    defaultAdapter = new AnthropicAdapter();
  }
  return defaultAdapter;
}

export function setAnthropicAdapter(adapter: AnthropicAdapter): void {
  defaultAdapter = adapter;
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Quick completion with Claude
 */
export async function claudeComplete(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  options?: {
    model?: string;
    system?: string;
    temperature?: number;
    max_tokens?: number;
  }
): Promise<string> {
  const adapter = getAnthropicAdapter();
  const result = await adapter.complete(messages, {
    model: options?.model,
    system: options?.system,
    parameters: {
      temperature: options?.temperature,
      max_tokens: options?.max_tokens
    }
  });
  return result.content;
}

/**
 * Quick streaming completion with Claude
 */
export async function* claudeStream(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  options?: {
    model?: string;
    system?: string;
    temperature?: number;
    max_tokens?: number;
  }
): AsyncGenerator<string, void, unknown> {
  const adapter = getAnthropicAdapter();
  const result = await adapter.completeStream(messages, {
    model: options?.model,
    system: options?.system,
    parameters: {
      temperature: options?.temperature,
      max_tokens: options?.max_tokens
    }
  });

  yield* result.stream;
}
