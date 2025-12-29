/**
 * twilio.ts
 * Twilio webhook request validation
 * Implements X-Twilio-Signature header verification and status callback handling
 */

import * as crypto from 'crypto';
import { WebhookRequest, VerificationResult } from './generic_hmac';

// ============================================================================
// TYPES
// ============================================================================

export interface TwilioWebhookConfig {
  /** Twilio Auth Token for signature verification */
  auth_token: string;

  /** Base URL for webhook validation (must match configured URL in Twilio) */
  base_url?: string;

  /** Maximum age of request in seconds (default: 300 = 5 minutes) */
  max_age_seconds?: number;

  /** Enable status callback handling */
  enable_status_callbacks?: boolean;

  /** Event handlers by type */
  handlers?: Record<string, TwilioEventHandler>;
}

export interface TwilioVerificationResult extends VerificationResult {
  /** Parsed Twilio event */
  event?: TwilioEvent;

  /** Event type */
  event_type?: TwilioEventType;

  /** Message SID if applicable */
  message_sid?: string;

  /** Call SID if applicable */
  call_sid?: string;

  /** Account SID */
  account_sid?: string;
}

export type TwilioEventType =
  | 'sms.received'
  | 'sms.status'
  | 'voice.incoming'
  | 'voice.status'
  | 'messaging.status'
  | 'unknown';

export interface TwilioEvent {
  /** Event type */
  type: TwilioEventType;

  /** Account SID */
  AccountSid: string;

  /** Message SID (SMS events) */
  MessageSid?: string;

  /** Call SID (Voice events) */
  CallSid?: string;

  /** From phone number */
  From?: string;

  /** To phone number */
  To?: string;

  /** Message body (SMS) */
  Body?: string;

  /** Message status */
  MessageStatus?: TwilioMessageStatus;

  /** Call status */
  CallStatus?: TwilioCallStatus;

  /** Error code if failed */
  ErrorCode?: string;

  /** Error message if failed */
  ErrorMessage?: string;

  /** Number of media attachments */
  NumMedia?: string;

  /** Media URLs */
  MediaUrl?: string[];

  /** All raw parameters */
  raw: Record<string, string>;
}

export type TwilioMessageStatus =
  | 'queued'
  | 'sending'
  | 'sent'
  | 'delivered'
  | 'undelivered'
  | 'failed'
  | 'receiving'
  | 'received'
  | 'accepted'
  | 'read';

export type TwilioCallStatus =
  | 'queued'
  | 'ringing'
  | 'in-progress'
  | 'completed'
  | 'busy'
  | 'failed'
  | 'no-answer'
  | 'canceled';

export type TwilioEventHandler = (event: TwilioEvent) => Promise<void> | void;

// ============================================================================
// STATUS CALLBACK STORE
// ============================================================================

interface StatusRecord {
  sid: string;
  status: string;
  updated_at: number;
  history: Array<{ status: string; timestamp: number }>;
}

class TwilioStatusStore {
  private statuses: Map<string, StatusRecord> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private maxAge: number;

  constructor(maxAgeSeconds: number = 86400) { // 24 hours default
    this.maxAge = maxAgeSeconds * 1000;
    this.startCleanup();
  }

  /**
   * Update status for a SID
   */
  update(sid: string, status: string): StatusRecord {
    const existing = this.statuses.get(sid);
    const now = Date.now();

    if (existing) {
      existing.history.push({ status: existing.status, timestamp: existing.updated_at });
      existing.status = status;
      existing.updated_at = now;
      return existing;
    }

    const record: StatusRecord = {
      sid,
      status,
      updated_at: now,
      history: []
    };
    this.statuses.set(sid, record);
    return record;
  }

  /**
   * Get status for a SID
   */
  get(sid: string): StatusRecord | undefined {
    return this.statuses.get(sid);
  }

  /**
   * Clean up old entries
   */
  cleanup(): number {
    const now = Date.now();
    let count = 0;
    for (const [key, record] of this.statuses.entries()) {
      if (now - record.updated_at > this.maxAge) {
        this.statuses.delete(key);
        count++;
      }
    }
    return count;
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 3600000); // Cleanup every hour
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.statuses.clear();
  }

  get size(): number {
    return this.statuses.size;
  }
}

// ============================================================================
// TWILIO WEBHOOK VERIFIER
// ============================================================================

export class TwilioWebhookVerifier {
  private config: Required<Omit<TwilioWebhookConfig, 'handlers' | 'base_url'>> & Pick<TwilioWebhookConfig, 'handlers' | 'base_url'>;
  private statusStore: TwilioStatusStore;
  private handlers: Map<string, TwilioEventHandler[]> = new Map();

  constructor(config: TwilioWebhookConfig) {
    this.config = {
      auth_token: config.auth_token,
      base_url: config.base_url,
      max_age_seconds: config.max_age_seconds ?? 300,
      enable_status_callbacks: config.enable_status_callbacks ?? true,
      handlers: config.handlers
    };

    this.statusStore = new TwilioStatusStore();

    // Register initial handlers
    if (config.handlers) {
      for (const [eventType, handler] of Object.entries(config.handlers)) {
        this.on(eventType, handler);
      }
    }
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  /**
   * Verify a Twilio webhook request
   */
  verify(request: WebhookRequest): TwilioVerificationResult {
    // Get X-Twilio-Signature header
    const signature = this.getHeader(request.headers, 'X-Twilio-Signature');
    if (!signature) {
      return {
        valid: false,
        error: 'Missing X-Twilio-Signature header',
        error_code: 'MISSING_SIGNATURE'
      };
    }

    // Construct the URL for validation
    const url = this.constructValidationUrl(request);
    if (!url) {
      return {
        valid: false,
        error: 'Cannot determine webhook URL for validation',
        error_code: 'INVALID_CONFIG'
      };
    }

    // Parse the request body
    const params = this.parseFormData(request.body);

    // Compute expected signature
    const expectedSignature = this.computeSignature(url, params);

    // Compare signatures
    if (!this.secureCompare(signature, expectedSignature)) {
      return {
        valid: false,
        error: 'Invalid Twilio signature',
        error_code: 'INVALID_SIGNATURE'
      };
    }

    // Parse event
    const event = this.parseEvent(params);

    // Update status tracking
    if (this.config.enable_status_callbacks) {
      const sid = event.MessageSid ?? event.CallSid;
      const status = event.MessageStatus ?? event.CallStatus;
      if (sid && status) {
        this.statusStore.update(sid, status);
      }
    }

    return {
      valid: true,
      event,
      event_type: event.type,
      message_sid: event.MessageSid,
      call_sid: event.CallSid,
      account_sid: event.AccountSid
    };
  }

  /**
   * Verify and dispatch event to handlers
   */
  async verifyAndDispatch(request: WebhookRequest): Promise<TwilioVerificationResult> {
    const result = this.verify(request);

    if (result.valid && result.event) {
      await this.dispatch(result.event);
    }

    return result;
  }

  /**
   * Register an event handler
   */
  on(eventType: string, handler: TwilioEventHandler): void {
    const handlers = this.handlers.get(eventType) ?? [];
    handlers.push(handler);
    this.handlers.set(eventType, handlers);
  }

  /**
   * Register handler for SMS events
   */
  onSMS(handler: TwilioEventHandler): void {
    this.on('sms.received', handler);
    this.on('sms.status', handler);
  }

  /**
   * Register handler for Voice events
   */
  onVoice(handler: TwilioEventHandler): void {
    this.on('voice.incoming', handler);
    this.on('voice.status', handler);
  }

  /**
   * Register a wildcard handler
   */
  onAll(handler: TwilioEventHandler): void {
    this.on('*', handler);
  }

  /**
   * Dispatch event to registered handlers
   */
  async dispatch(event: TwilioEvent): Promise<void> {
    const handlers: TwilioEventHandler[] = [];

    // Get specific handlers
    const specificHandlers = this.handlers.get(event.type);
    if (specificHandlers) {
      handlers.push(...specificHandlers);
    }

    // Get wildcard handlers
    const wildcardHandlers = this.handlers.get('*');
    if (wildcardHandlers) {
      handlers.push(...wildcardHandlers);
    }

    // Execute all handlers
    for (const handler of handlers) {
      await handler(event);
    }
  }

  /**
   * Get status history for a SID
   */
  getStatusHistory(sid: string): StatusRecord | undefined {
    return this.statusStore.get(sid);
  }

  /**
   * Generate a test webhook for development
   */
  generateTestWebhook(params: Record<string, string>, url?: string): { headers: Record<string, string>; body: string } {
    const webhookUrl = url ?? this.config.base_url ?? 'https://example.com/webhook';
    const signature = this.computeSignature(webhookUrl, params);
    const body = this.encodeFormData(params);

    return {
      headers: {
        'X-Twilio-Signature': signature,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body
    };
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.statusStore.destroy();
    this.handlers.clear();
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  /**
   * Construct the full URL for signature validation
   */
  private constructValidationUrl(request: WebhookRequest): string | null {
    // Try to use the request URL if provided
    if (request.url) {
      // If it's a full URL, use it
      if (request.url.startsWith('http')) {
        return request.url;
      }

      // If base URL is configured, combine them
      if (this.config.base_url) {
        const base = this.config.base_url.replace(/\/$/, '');
        const path = request.url.startsWith('/') ? request.url : `/${request.url}`;
        return `${base}${path}`;
      }
    }

    // Fall back to base URL alone
    return this.config.base_url ?? null;
  }

  /**
   * Compute Twilio signature
   * Twilio uses HMAC-SHA1 with base64 encoding
   */
  private computeSignature(url: string, params: Record<string, string>): string {
    // Sort params alphabetically and append to URL
    const sortedKeys = Object.keys(params).sort();
    let data = url;

    for (const key of sortedKeys) {
      data += key + params[key];
    }

    return crypto
      .createHmac('sha1', this.config.auth_token)
      .update(data, 'utf8')
      .digest('base64');
  }

  /**
   * Parse URL-encoded form data
   */
  private parseFormData(body: string): Record<string, string> {
    const params: Record<string, string> = {};

    if (!body) {
      return params;
    }

    const pairs = body.split('&');
    for (const pair of pairs) {
      const [key, value] = pair.split('=');
      if (key) {
        params[decodeURIComponent(key)] = decodeURIComponent(value ?? '');
      }
    }

    return params;
  }

  /**
   * Encode params as form data
   */
  private encodeFormData(params: Record<string, string>): string {
    return Object.entries(params)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&');
  }

  /**
   * Parse Twilio event from parameters
   */
  private parseEvent(params: Record<string, string>): TwilioEvent {
    const event: TwilioEvent = {
      type: this.determineEventType(params),
      AccountSid: params.AccountSid ?? '',
      raw: params
    };

    // SMS fields
    if (params.MessageSid) {
      event.MessageSid = params.MessageSid;
    }
    if (params.Body) {
      event.Body = params.Body;
    }
    if (params.MessageStatus) {
      event.MessageStatus = params.MessageStatus as TwilioMessageStatus;
    }

    // Voice fields
    if (params.CallSid) {
      event.CallSid = params.CallSid;
    }
    if (params.CallStatus) {
      event.CallStatus = params.CallStatus as TwilioCallStatus;
    }

    // Common fields
    if (params.From) {
      event.From = params.From;
    }
    if (params.To) {
      event.To = params.To;
    }
    if (params.ErrorCode) {
      event.ErrorCode = params.ErrorCode;
    }
    if (params.ErrorMessage) {
      event.ErrorMessage = params.ErrorMessage;
    }

    // Media attachments
    if (params.NumMedia) {
      event.NumMedia = params.NumMedia;
      const numMedia = parseInt(params.NumMedia, 10);
      if (numMedia > 0) {
        event.MediaUrl = [];
        for (let i = 0; i < numMedia; i++) {
          const mediaUrl = params[`MediaUrl${i}`];
          if (mediaUrl) {
            event.MediaUrl.push(mediaUrl);
          }
        }
      }
    }

    return event;
  }

  /**
   * Determine event type from parameters
   */
  private determineEventType(params: Record<string, string>): TwilioEventType {
    // SMS received (incoming message)
    if (params.MessageSid && params.Body && !params.MessageStatus) {
      return 'sms.received';
    }

    // SMS status callback
    if (params.MessageSid && params.MessageStatus) {
      return 'sms.status';
    }

    // Voice incoming
    if (params.CallSid && !params.CallStatus) {
      return 'voice.incoming';
    }

    // Voice status callback
    if (params.CallSid && params.CallStatus) {
      return 'voice.status';
    }

    // Messaging service status
    if (params.MessagingServiceSid && params.MessageStatus) {
      return 'messaging.status';
    }

    return 'unknown';
  }

  /**
   * Get header value (case-insensitive)
   */
  private getHeader(headers: Record<string, string | string[] | undefined>, name: string): string | undefined {
    const lowerName = name.toLowerCase();
    for (const [key, value] of Object.entries(headers)) {
      if (key.toLowerCase() === lowerName) {
        return Array.isArray(value) ? value[0] : value;
      }
    }
    return undefined;
  }

  /**
   * Timing-safe string comparison
   */
  private secureCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    const bufA = Buffer.from(a, 'utf8');
    const bufB = Buffer.from(b, 'utf8');

    return crypto.timingSafeEqual(bufA, bufB);
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create a Twilio webhook verifier from environment
 */
export function createTwilioVerifier(authToken?: string, baseUrl?: string): TwilioWebhookVerifier {
  const token = authToken ?? process.env.TWILIO_AUTH_TOKEN;
  if (!token) {
    throw new Error('Twilio auth token is required');
  }

  return new TwilioWebhookVerifier({
    auth_token: token,
    base_url: baseUrl ?? process.env.TWILIO_WEBHOOK_URL
  });
}

// ============================================================================
// EXPORTS
// ============================================================================

export { TwilioStatusStore }
