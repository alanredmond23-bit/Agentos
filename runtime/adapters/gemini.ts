/**
 * gemini.ts
 * Google Gemini API adapter with full API support
 * Implements LLMAdapter interface for Gemini models
 */

import { ModelPreset } from '../types/agent_yaml';
import { recordModelUsage } from '../core/model_router';

// Type alias for compatibility with other adapters
type ModelParameters = ModelPreset;

// ============================================================================
// TYPES
// ============================================================================

export interface GeminiConfig {
  /** API key (defaults to GOOGLE_API_KEY or GEMINI_API_KEY env var) */
  api_key?: string;

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

  /** Default safety settings */
  safety_settings?: GeminiSafetySettings[];

  /** Enable context caching for cost reduction */
  enable_caching?: boolean;

  /** Cache TTL in seconds (max 3600 for most models) */
  cache_ttl_seconds?: number;
}

export interface GeminiSafetySettings {
  category: GeminiHarmCategory;
  threshold: GeminiHarmBlockThreshold;
}

export type GeminiHarmCategory =
  | 'HARM_CATEGORY_HARASSMENT'
  | 'HARM_CATEGORY_HATE_SPEECH'
  | 'HARM_CATEGORY_SEXUALLY_EXPLICIT'
  | 'HARM_CATEGORY_DANGEROUS_CONTENT'
  | 'HARM_CATEGORY_CIVIC_INTEGRITY';

export type GeminiHarmBlockThreshold =
  | 'BLOCK_NONE'
  | 'BLOCK_ONLY_HIGH'
  | 'BLOCK_MEDIUM_AND_ABOVE'
  | 'BLOCK_LOW_AND_ABOVE';

export interface GeminiContent {
  role: 'user' | 'model';
  parts: GeminiPart[];
}

export interface GeminiPart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
  functionCall?: {
    name: string;
    args: Record<string, unknown>;
  };
  functionResponse?: {
    name: string;
    response: Record<string, unknown>;
  };
}

export interface GeminiTool {
  functionDeclarations: GeminiFunctionDeclaration[];
}

export interface GeminiFunctionDeclaration {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface GeminiToolConfig {
  functionCallingConfig?: {
    mode: 'AUTO' | 'ANY' | 'NONE';
    allowedFunctionNames?: string[];
  };
}

export interface GeminiGenerationConfig {
  temperature?: number;
  topP?: number;
  topK?: number;
  maxOutputTokens?: number;
  stopSequences?: string[];
  candidateCount?: number;
  responseMimeType?: 'text/plain' | 'application/json';
}

export interface GeminiGenerateRequest {
  contents: GeminiContent[];
  systemInstruction?: {
    parts: Array<{ text: string }>;
  };
  tools?: GeminiTool[];
  toolConfig?: GeminiToolConfig;
  generationConfig?: GeminiGenerationConfig;
  safetySettings?: GeminiSafetySettings[];
  cachedContent?: string;
}

export interface GeminiGenerateResponse {
  candidates: GeminiCandidate[];
  usageMetadata: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
    cachedContentTokenCount?: number;
  };
  modelVersion?: string;
}

export interface GeminiCandidate {
  content: GeminiContent;
  finishReason: GeminiFinishReason;
  safetyRatings?: GeminiSafetyRating[];
  citationMetadata?: {
    citationSources: Array<{
      startIndex: number;
      endIndex: number;
      uri: string;
      license: string;
    }>;
  };
  index: number;
}

export type GeminiFinishReason =
  | 'FINISH_REASON_UNSPECIFIED'
  | 'STOP'
  | 'MAX_TOKENS'
  | 'SAFETY'
  | 'RECITATION'
  | 'OTHER'
  | 'BLOCKLIST'
  | 'PROHIBITED_CONTENT'
  | 'SPII';

export interface GeminiSafetyRating {
  category: GeminiHarmCategory;
  probability: 'NEGLIGIBLE' | 'LOW' | 'MEDIUM' | 'HIGH';
  blocked: boolean;
}

export interface GeminiStreamChunk {
  candidates?: GeminiCandidate[];
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

export interface GeminiError {
  error: {
    code: number;
    message: string;
    status: string;
    details?: Array<{
      '@type': string;
      reason?: string;
      domain?: string;
      metadata?: Record<string, string>;
    }>;
  };
}

export interface GeminiCachedContent {
  name: string;
  model: string;
  createTime: string;
  updateTime: string;
  expireTime: string;
  displayName?: string;
  usageMetadata: {
    totalTokenCount: number;
  };
}

export interface CompletionResult {
  content: string;
  function_calls?: Array<{
    name: string;
    args: Record<string, unknown>;
  }>;
  finish_reason: string;
  input_tokens: number;
  output_tokens: number;
  cached_tokens?: number;
  model: string;
  latency_ms: number;
  safety_ratings?: GeminiSafetyRating[];
}

export interface StreamCompletionResult {
  stream: AsyncGenerator<string, void, unknown>;
  getUsage: () => Promise<{ input_tokens: number; output_tokens: number }>;
}

export interface RateLimitStatus {
  requests_remaining?: number;
  tokens_remaining?: number;
  requests_reset?: string;
  retry_after_seconds?: number;
}

// ============================================================================
// DEFAULT SAFETY SETTINGS
// ============================================================================

const DEFAULT_SAFETY_SETTINGS: GeminiSafetySettings[] = [
  { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
  { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
  { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
  { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' }
];

// ============================================================================
// GEMINI ADAPTER
// ============================================================================

export class GeminiAdapter {
  private config: Required<GeminiConfig>;
  private rateLimitStatus: RateLimitStatus = {};
  private cachedContentMap: Map<string, GeminiCachedContent> = new Map();

  constructor(config: GeminiConfig = {}) {
    this.config = {
      api_key: config.api_key ?? process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY ?? '',
      base_url: config.base_url ?? 'https://generativelanguage.googleapis.com/v1beta',
      default_model: config.default_model ?? 'gemini-2.0-flash',
      timeout_ms: config.timeout_ms ?? 60000,
      max_retries: config.max_retries ?? 3,
      debug: config.debug ?? false,
      safety_settings: config.safety_settings ?? DEFAULT_SAFETY_SETTINGS,
      enable_caching: config.enable_caching ?? false,
      cache_ttl_seconds: config.cache_ttl_seconds ?? 3600
    };

    if (!this.config.api_key) {
      console.warn('Gemini API key not configured (set GOOGLE_API_KEY or GEMINI_API_KEY)');
    }
  }

  // ============================================================================
  // COMPLETIONS
  // ============================================================================

  /**
   * Create a chat completion
   */
  async complete(
    messages: GeminiContent[],
    options?: {
      model?: string;
      parameters?: Partial<ModelParameters>;
      system?: string;
      tools?: GeminiTool[];
      tool_config?: GeminiToolConfig;
      safety_settings?: GeminiSafetySettings[];
      cached_content?: string;
    }
  ): Promise<CompletionResult> {
    const startTime = Date.now();
    const model = options?.model ?? this.config.default_model;

    const request: GeminiGenerateRequest = {
      contents: messages,
      generationConfig: this.buildGenerationConfig(options?.parameters),
      safetySettings: options?.safety_settings ?? this.config.safety_settings,
      tools: options?.tools,
      toolConfig: options?.tool_config,
      cachedContent: options?.cached_content
    };

    // Add system instruction if provided
    if (options?.system) {
      request.systemInstruction = {
        parts: [{ text: options.system }]
      };
    }

    // Remove undefined values
    this.cleanRequest(request);

    const response = await this.makeRequest<GeminiGenerateResponse>(
      `/models/${model}:generateContent`,
      request
    );

    const latency = Date.now() - startTime;
    const candidate = response.candidates[0];

    // Extract text content
    const textContent = candidate.content.parts
      .filter(part => part.text !== undefined)
      .map(part => part.text ?? '')
      .join('');

    // Extract function calls
    const functionCalls = candidate.content.parts
      .filter(part => part.functionCall !== undefined)
      .map(part => ({
        name: part.functionCall!.name,
        args: part.functionCall!.args
      }));

    // Record usage
    recordModelUsage(
      'gemini',
      model,
      response.usageMetadata.promptTokenCount,
      response.usageMetadata.candidatesTokenCount,
      latency,
      true
    );

    return {
      content: textContent,
      function_calls: functionCalls.length > 0 ? functionCalls : undefined,
      finish_reason: this.mapFinishReason(candidate.finishReason),
      input_tokens: response.usageMetadata.promptTokenCount,
      output_tokens: response.usageMetadata.candidatesTokenCount,
      cached_tokens: response.usageMetadata.cachedContentTokenCount,
      model,
      latency_ms: latency,
      safety_ratings: candidate.safetyRatings
    };
  }

  /**
   * Create a streaming chat completion
   */
  async completeStream(
    messages: GeminiContent[],
    options?: {
      model?: string;
      parameters?: Partial<ModelParameters>;
      system?: string;
      tools?: GeminiTool[];
      safety_settings?: GeminiSafetySettings[];
    }
  ): Promise<StreamCompletionResult> {
    const model = options?.model ?? this.config.default_model;
    let inputTokens = 0;
    let outputTokens = 0;

    const request: GeminiGenerateRequest = {
      contents: messages,
      generationConfig: this.buildGenerationConfig(options?.parameters),
      safetySettings: options?.safety_settings ?? this.config.safety_settings,
      tools: options?.tools
    };

    if (options?.system) {
      request.systemInstruction = {
        parts: [{ text: options.system }]
      };
    }

    this.cleanRequest(request);

    const response = await this.makeStreamRequest(
      `/models/${model}:streamGenerateContent`,
      request
    );

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

          // Gemini returns JSON array chunks, parse incrementally
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed === '[' || trimmed === ']' || trimmed === ',') continue;

            // Remove leading comma if present
            const jsonStr = trimmed.startsWith(',') ? trimmed.slice(1) : trimmed;

            try {
              const chunk = JSON.parse(jsonStr) as GeminiStreamChunk;

              if (chunk.candidates?.[0]?.content?.parts) {
                for (const part of chunk.candidates[0].content.parts) {
                  if (part.text) {
                    yield part.text;
                  }
                }
              }

              if (chunk.usageMetadata) {
                inputTokens = chunk.usageMetadata.promptTokenCount;
                outputTokens = chunk.usageMetadata.candidatesTokenCount;
              }
            } catch {
              // Ignore incomplete JSON chunks
            }
          }
        }

        // Process remaining buffer
        if (buffer.trim()) {
          const jsonStr = buffer.trim().replace(/^,/, '').replace(/\]$/, '');
          try {
            const chunk = JSON.parse(jsonStr) as GeminiStreamChunk;
            if (chunk.candidates?.[0]?.content?.parts) {
              for (const part of chunk.candidates[0].content.parts) {
                if (part.text) {
                  yield part.text;
                }
              }
            }
            if (chunk.usageMetadata) {
              inputTokens = chunk.usageMetadata.promptTokenCount;
              outputTokens = chunk.usageMetadata.candidatesTokenCount;
            }
          } catch {
            // Ignore
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
   * Execute a function call and continue completion
   */
  async executeFunctionCall(
    messages: GeminiContent[],
    functionCall: { name: string; args: Record<string, unknown> },
    functionResult: unknown,
    options?: {
      model?: string;
      parameters?: Partial<ModelParameters>;
      system?: string;
      tools?: GeminiTool[];
    }
  ): Promise<CompletionResult> {
    // Build messages with function response
    const updatedMessages: GeminiContent[] = [
      ...messages,
      {
        role: 'model',
        parts: [{
          functionCall: {
            name: functionCall.name,
            args: functionCall.args
          }
        }]
      },
      {
        role: 'user',
        parts: [{
          functionResponse: {
            name: functionCall.name,
            response: typeof functionResult === 'object'
              ? functionResult as Record<string, unknown>
              : { result: functionResult }
          }
        }]
      }
    ];

    return this.complete(updatedMessages, options);
  }

  // ============================================================================
  // MESSAGE CONVERSION
  // ============================================================================

  /**
   * Convert OpenAI-style messages to Gemini format
   */
  convertFromOpenAI(messages: Array<{
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
    name?: string;
    tool_call_id?: string;
  }>): { system?: string; contents: GeminiContent[] } {
    let system: string | undefined;
    const contents: GeminiContent[] = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        system = typeof msg.content === 'string' ? msg.content : '';
      } else if (msg.role === 'user') {
        const parts: GeminiPart[] = [];

        if (typeof msg.content === 'string') {
          parts.push({ text: msg.content });
        } else if (Array.isArray(msg.content)) {
          for (const part of msg.content) {
            if (part.type === 'text' && part.text) {
              parts.push({ text: part.text });
            } else if (part.type === 'image_url' && part.image_url) {
              // Handle base64 images
              const url = part.image_url.url;
              if (url.startsWith('data:')) {
                const match = url.match(/^data:([^;]+);base64,(.+)$/);
                if (match) {
                  parts.push({
                    inlineData: {
                      mimeType: match[1],
                      data: match[2]
                    }
                  });
                }
              }
            }
          }
        }

        contents.push({ role: 'user', parts });
      } else if (msg.role === 'assistant') {
        const parts: GeminiPart[] = [];
        if (typeof msg.content === 'string') {
          parts.push({ text: msg.content });
        }
        contents.push({ role: 'model', parts });
      } else if (msg.role === 'tool') {
        // Add function response
        const content = typeof msg.content === 'string' ? msg.content : '';
        let parsed: Record<string, unknown>;
        try {
          parsed = JSON.parse(content);
        } catch {
          parsed = { result: content };
        }
        contents.push({
          role: 'user',
          parts: [{
            functionResponse: {
              name: msg.name ?? 'function',
              response: parsed
            }
          }]
        });
      }
    }

    return { system, contents };
  }

  /**
   * Convert Anthropic-style messages to Gemini format
   */
  convertFromAnthropic(messages: Array<{
    role: 'user' | 'assistant';
    content: string | Array<{
      type: 'text' | 'image' | 'tool_use' | 'tool_result';
      text?: string;
      source?: { type: 'base64'; media_type: string; data: string };
      id?: string;
      name?: string;
      input?: Record<string, unknown>;
      tool_use_id?: string;
      content?: string;
    }>;
  }>): GeminiContent[] {
    const contents: GeminiContent[] = [];

    for (const msg of messages) {
      const parts: GeminiPart[] = [];

      if (typeof msg.content === 'string') {
        parts.push({ text: msg.content });
      } else if (Array.isArray(msg.content)) {
        for (const block of msg.content) {
          if (block.type === 'text' && block.text) {
            parts.push({ text: block.text });
          } else if (block.type === 'image' && block.source) {
            parts.push({
              inlineData: {
                mimeType: block.source.media_type,
                data: block.source.data
              }
            });
          } else if (block.type === 'tool_use' && block.name && block.input) {
            parts.push({
              functionCall: {
                name: block.name,
                args: block.input
              }
            });
          } else if (block.type === 'tool_result' && block.content) {
            let parsed: Record<string, unknown>;
            try {
              parsed = typeof block.content === 'string' ? JSON.parse(block.content) : { result: block.content };
            } catch {
              parsed = { result: block.content };
            }
            parts.push({
              functionResponse: {
                name: block.tool_use_id ?? 'function',
                response: parsed
              }
            });
          }
        }
      }

      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts
      });
    }

    return contents;
  }

  // ============================================================================
  // CONTEXT CACHING
  // ============================================================================

  /**
   * Create a cached content entry for cost reduction on repeated prompts
   */
  async createCachedContent(
    contents: GeminiContent[],
    options?: {
      model?: string;
      system?: string;
      display_name?: string;
      ttl_seconds?: number;
    }
  ): Promise<GeminiCachedContent> {
    const model = options?.model ?? this.config.default_model;

    const request: Record<string, unknown> = {
      model: `models/${model}`,
      contents,
      ttl: `${options?.ttl_seconds ?? this.config.cache_ttl_seconds}s`
    };

    if (options?.system) {
      request.systemInstruction = {
        parts: [{ text: options.system }]
      };
    }

    if (options?.display_name) {
      request.displayName = options.display_name;
    }

    const response = await this.makeRequest<GeminiCachedContent>(
      '/cachedContents',
      request
    );

    // Store in local map for reference
    this.cachedContentMap.set(response.name, response);

    return response;
  }

  /**
   * Get cached content by name
   */
  async getCachedContent(name: string): Promise<GeminiCachedContent | null> {
    try {
      const response = await this.makeRequest<GeminiCachedContent>(
        `/${name}`,
        undefined,
        'GET'
      );
      return response;
    } catch {
      return null;
    }
  }

  /**
   * Delete cached content
   */
  async deleteCachedContent(name: string): Promise<void> {
    await this.makeRequest<void>(`/${name}`, undefined, 'DELETE');
    this.cachedContentMap.delete(name);
  }

  /**
   * List all cached contents
   */
  async listCachedContents(): Promise<GeminiCachedContent[]> {
    const response = await this.makeRequest<{ cachedContents: GeminiCachedContent[] }>(
      '/cachedContents',
      undefined,
      'GET'
    );
    return response.cachedContents ?? [];
  }

  // ============================================================================
  // TOKEN COUNTING
  // ============================================================================

  /**
   * Count tokens for contents using the API
   */
  async countTokens(
    contents: GeminiContent[],
    options?: {
      model?: string;
      system?: string;
    }
  ): Promise<{ total_tokens: number }> {
    const model = options?.model ?? this.config.default_model;

    const request: Record<string, unknown> = { contents };
    if (options?.system) {
      request.systemInstruction = {
        parts: [{ text: options.system }]
      };
    }

    const response = await this.makeRequest<{ totalTokens: number }>(
      `/models/${model}:countTokens`,
      request
    );

    return { total_tokens: response.totalTokens };
  }

  /**
   * Estimate token count (offline estimation)
   */
  estimateTokens(contents: GeminiContent[], system?: string): number {
    // Rough estimation: ~4 chars per token for English
    let chars = system?.length ?? 0;

    for (const content of contents) {
      for (const part of content.parts) {
        if (part.text) {
          chars += part.text.length;
        }
      }
    }

    return Math.ceil(chars / 4);
  }

  // ============================================================================
  // COST ESTIMATION
  // ============================================================================

  /**
   * Estimate cost for a completion
   */
  estimateCost(model: string, inputTokens: number, outputTokens: number): number {
    // Pricing per 1K tokens (as of 2024)
    const pricing: Record<string, { input: number; output: number }> = {
      'gemini-2.0-flash': { input: 0.0001, output: 0.0004 },
      'gemini-2.0-flash-exp': { input: 0.0, output: 0.0 },
      'gemini-1.5-pro': { input: 0.00125, output: 0.005 },
      'gemini-1.5-flash': { input: 0.000075, output: 0.0003 },
      'gemini-1.5-flash-8b': { input: 0.0000375, output: 0.00015 },
      'gemini-1.0-pro': { input: 0.0005, output: 0.0015 }
    };

    const price = pricing[model] ?? pricing['gemini-1.5-flash'];
    return (inputTokens / 1000) * price.input + (outputTokens / 1000) * price.output;
  }

  // ============================================================================
  // AVAILABILITY & MODELS
  // ============================================================================

  /**
   * Check if Gemini API is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.config.base_url}/models?key=${this.config.api_key}`,
        { signal: AbortSignal.timeout(10000) }
      );
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * List available models
   */
  async listModels(): Promise<Array<{ name: string; displayName: string; supportedMethods: string[] }>> {
    const response = await this.makeRequest<{
      models: Array<{
        name: string;
        displayName: string;
        supportedGenerationMethods: string[];
      }>;
    }>('/models', undefined, 'GET');

    return response.models.map(m => ({
      name: m.name.replace('models/', ''),
      displayName: m.displayName,
      supportedMethods: m.supportedGenerationMethods
    }));
  }

  /**
   * Get rate limit status from last request
   */
  getRateLimitStatus(): RateLimitStatus {
    return { ...this.rateLimitStatus };
  }

  // ============================================================================
  // SAFETY SETTINGS
  // ============================================================================

  /**
   * Set default safety settings
   */
  setSafetySettings(settings: GeminiSafetySettings[]): void {
    this.config.safety_settings = settings;
  }

  /**
   * Get permissive safety settings (for less restricted content)
   */
  static getPermissiveSafetySettings(): GeminiSafetySettings[] {
    return [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' }
    ];
  }

  /**
   * Get strict safety settings
   */
  static getStrictSafetySettings(): GeminiSafetySettings[] {
    return [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_LOW_AND_ABOVE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_LOW_AND_ABOVE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_LOW_AND_ABOVE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_LOW_AND_ABOVE' }
    ];
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private buildGenerationConfig(params?: Partial<ModelParameters>): GeminiGenerationConfig | undefined {
    if (!params) return undefined;

    const config: GeminiGenerationConfig = {};

    if (params.temperature !== undefined) config.temperature = params.temperature;
    if (params.top_p !== undefined) config.topP = params.top_p;
    if (params.top_k !== undefined) config.topK = params.top_k;
    if (params.max_tokens !== undefined) config.maxOutputTokens = params.max_tokens;
    if (params.stop_sequences !== undefined) config.stopSequences = params.stop_sequences;

    return Object.keys(config).length > 0 ? config : undefined;
  }

  private mapFinishReason(reason: GeminiFinishReason): string {
    const mapping: Record<GeminiFinishReason, string> = {
      'FINISH_REASON_UNSPECIFIED': 'unknown',
      'STOP': 'stop',
      'MAX_TOKENS': 'length',
      'SAFETY': 'content_filter',
      'RECITATION': 'recitation',
      'OTHER': 'other',
      'BLOCKLIST': 'blocklist',
      'PROHIBITED_CONTENT': 'content_filter',
      'SPII': 'content_filter'
    };
    return mapping[reason] ?? 'unknown';
  }

  private cleanRequest(request: Record<string, unknown>): void {
    Object.keys(request).forEach(key => {
      if (request[key] === undefined) {
        delete request[key];
      }
    });
  }

  private getUrl(endpoint: string): string {
    const separator = endpoint.includes('?') ? '&' : '?';
    return `${this.config.base_url}${endpoint}${separator}key=${this.config.api_key}`;
  }

  private async makeRequest<T>(
    endpoint: string,
    body?: unknown,
    method: 'GET' | 'POST' | 'DELETE' = 'POST'
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.max_retries; attempt++) {
      try {
        const url = this.getUrl(endpoint);

        const options: RequestInit = {
          method,
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(this.config.timeout_ms)
        };

        if (body && method !== 'GET') {
          options.body = JSON.stringify(body);
        }

        if (this.config.debug) {
          console.log(`[Gemini] ${method} ${endpoint}`);
          if (body) console.log('[Gemini] Request:', JSON.stringify(body, null, 2));
        }

        const response = await fetch(url, options);

        // Update rate limit status
        this.updateRateLimitStatus(response.headers);

        if (!response.ok) {
          const errorBody = await response.json() as GeminiError;
          throw new GeminiAdapterError(
            errorBody.error.message,
            errorBody.error.status,
            errorBody.error.code,
            response.status
          );
        }

        const result = await response.json() as T;

        if (this.config.debug) {
          console.log('[Gemini] Response:', JSON.stringify(result, null, 2));
        }

        return result;
      } catch (error) {
        lastError = error as Error;

        // Don't retry on certain errors
        if (error instanceof GeminiAdapterError) {
          if (error.httpStatus === 401 || error.httpStatus === 403) {
            throw error;
          }
          if (error.httpStatus === 429) {
            // Rate limited - wait and retry with exponential backoff
            const retryAfter = this.rateLimitStatus.retry_after_seconds ?? (Math.pow(2, attempt) * 1000);
            const waitTime = typeof retryAfter === 'number' ? retryAfter * 1000 : 1000 * Math.pow(2, attempt);
            if (this.config.debug) {
              console.log(`[Gemini] Rate limited, waiting ${waitTime}ms before retry ${attempt}/${this.config.max_retries}`);
            }
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }
          if (error.httpStatus === 503 || error.httpStatus === 500) {
            // Server error - wait and retry
            const waitTime = 2000 * attempt;
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
    const url = this.getUrl(endpoint) + '&alt=sse';

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(this.config.timeout_ms)
    });

    this.updateRateLimitStatus(response.headers);

    if (!response.ok) {
      const error = await response.json() as GeminiError;
      throw new GeminiAdapterError(
        error.error.message,
        error.error.status,
        error.error.code,
        response.status
      );
    }

    return response;
  }

  private updateRateLimitStatus(headers: Headers): void {
    const retryAfter = headers.get('retry-after');
    const remaining = headers.get('x-ratelimit-remaining-requests');
    const remainingTokens = headers.get('x-ratelimit-remaining-tokens');

    this.rateLimitStatus = {
      retry_after_seconds: retryAfter ? parseInt(retryAfter, 10) : undefined,
      requests_remaining: remaining ? parseInt(remaining, 10) : undefined,
      tokens_remaining: remainingTokens ? parseInt(remainingTokens, 10) : undefined
    };
  }
}

// ============================================================================
// ERROR CLASS
// ============================================================================

export class GeminiAdapterError extends Error {
  public readonly status: string;
  public readonly code: number;
  public readonly httpStatus?: number;

  constructor(message: string, status: string, code: number, httpStatus?: number) {
    super(message);
    this.name = 'GeminiAdapterError';
    this.status = status;
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let defaultAdapter: GeminiAdapter | null = null;

export function getGeminiAdapter(): GeminiAdapter {
  if (!defaultAdapter) {
    defaultAdapter = new GeminiAdapter();
  }
  return defaultAdapter;
}

export function setGeminiAdapter(adapter: GeminiAdapter): void {
  defaultAdapter = adapter;
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Quick completion with Gemini
 */
export async function geminiComplete(
  messages: Array<{ role: 'user' | 'model'; content: string }>,
  options?: {
    model?: string;
    system?: string;
    temperature?: number;
    max_tokens?: number;
  }
): Promise<string> {
  const adapter = getGeminiAdapter();

  // Convert simple messages to Gemini format
  const contents: GeminiContent[] = messages.map(msg => ({
    role: msg.role,
    parts: [{ text: msg.content }]
  }));

  const result = await adapter.complete(contents, {
    model: options?.model,
    system: options?.system,
    parameters: {
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.max_tokens ?? 4096,
      top_p: 0.95,
      top_k: 40,
      frequency_penalty: 0,
      presence_penalty: 0,
      id: 'default'
    }
  });

  return result.content;
}

/**
 * Quick streaming completion with Gemini
 */
export async function* geminiStream(
  messages: Array<{ role: 'user' | 'model'; content: string }>,
  options?: {
    model?: string;
    system?: string;
    temperature?: number;
    max_tokens?: number;
  }
): AsyncGenerator<string, void, unknown> {
  const adapter = getGeminiAdapter();

  const contents: GeminiContent[] = messages.map(msg => ({
    role: msg.role,
    parts: [{ text: msg.content }]
  }));

  const result = await adapter.completeStream(contents, {
    model: options?.model,
    system: options?.system,
    parameters: {
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.max_tokens ?? 4096,
      top_p: 0.95,
      top_k: 40,
      frequency_penalty: 0,
      presence_penalty: 0,
      id: 'default'
    }
  });

  yield* result.stream;
}

/**
 * Quick image analysis with Gemini
 */
export async function geminiAnalyzeImage(
  imageBase64: string,
  mimeType: string,
  prompt: string,
  options?: {
    model?: string;
    system?: string;
  }
): Promise<string> {
  const adapter = getGeminiAdapter();

  const contents: GeminiContent[] = [{
    role: 'user',
    parts: [
      {
        inlineData: {
          mimeType,
          data: imageBase64
        }
      },
      { text: prompt }
    ]
  }];

  const result = await adapter.complete(contents, {
    model: options?.model ?? 'gemini-1.5-pro',
    system: options?.system
  });

  return result.content;
}

/**
 * Quick function calling with Gemini
 */
export async function geminiWithTools(
  messages: Array<{ role: 'user' | 'model'; content: string }>,
  tools: GeminiFunctionDeclaration[],
  options?: {
    model?: string;
    system?: string;
  }
): Promise<CompletionResult> {
  const adapter = getGeminiAdapter();

  const contents: GeminiContent[] = messages.map(msg => ({
    role: msg.role,
    parts: [{ text: msg.content }]
  }));

  return adapter.complete(contents, {
    model: options?.model,
    system: options?.system,
    tools: [{ functionDeclarations: tools }],
    tool_config: {
      functionCallingConfig: { mode: 'AUTO' }
    }
  });
}
