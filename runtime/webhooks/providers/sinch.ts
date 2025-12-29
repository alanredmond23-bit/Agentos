/**
 * sinch.ts
 * Sinch webhook verification
 * Handles SMS, Voice, and Conversation API webhook authentication
 */

import * as crypto from 'crypto';
import { WebhookRequest, VerificationResult } from './generic_hmac';

// ============================================================================
// TYPES
// ============================================================================

export interface SinchWebhookConfig {
  /** Sinch Application Key */
  app_key: string;

  /** Sinch Application Secret */
  app_secret: string;

  /** Maximum age of request in seconds (default: 300) */
  max_age_seconds?: number;

  /** Enable Conversation API webhooks */
  enable_conversation_api?: boolean;

  /** Event handlers by type */
  handlers?: Record<string, SinchEventHandler>;
}

export interface SinchVerificationResult extends VerificationResult {
  /** Parsed Sinch event */
  event?: SinchEvent;

  /** Event type */
  event_type?: SinchEventType;

  /** Message ID if applicable */
  message_id?: string;

  /** Webhook type (sms, voice, conversation) */
  webhook_type?: 'sms' | 'voice' | 'conversation';
}

export type SinchEventType =
  // SMS events
  | 'sms.incoming'
  | 'sms.delivery_report'
  // Voice events
  | 'voice.incoming'
  | 'voice.answered'
  | 'voice.disconnected'
  | 'voice.prompt_input'
  // Conversation events
  | 'conversation.message'
  | 'conversation.message_delivery'
  | 'conversation.message_inbound'
  | 'conversation.event_inbound'
  | 'conversation.contact_create'
  | 'conversation.contact_update'
  | 'conversation.contact_delete'
  | 'conversation.capability'
  | 'conversation.opt_in'
  | 'conversation.opt_out'
  | 'unknown';

export interface SinchEvent {
  /** Event type */
  type: SinchEventType;

  /** Webhook type */
  webhook_type: 'sms' | 'voice' | 'conversation';

  /** Message ID (SMS/Conversation) */
  message_id?: string;

  /** From address/number */
  from?: string;

  /** To address/number */
  to?: string;

  /** Message body */
  body?: string;

  /** Delivery status */
  status?: SinchDeliveryStatus;

  /** Error code if failed */
  error_code?: string;

  /** Timestamp */
  timestamp?: string;

  /** Conversation ID (Conversation API) */
  conversation_id?: string;

  /** Contact ID (Conversation API) */
  contact_id?: string;

  /** Channel identity (Conversation API) */
  channel_identity?: {
    channel: string;
    identity: string;
  };

  /** Call ID (Voice) */
  call_id?: string;

  /** Call result (Voice) */
  call_result?: string;

  /** DTMF input (Voice) */
  dtmf?: string;

  /** Raw event payload */
  raw: Record<string, unknown>;
}

export type SinchDeliveryStatus =
  | 'queued'
  | 'dispatched'
  | 'delivered'
  | 'failed'
  | 'expired'
  | 'cancelled'
  | 'unknown';

export type SinchEventHandler = (event: SinchEvent) => Promise<void> | void;

// ============================================================================
// SINCH WEBHOOK VERIFIER
// ============================================================================

export class SinchWebhookVerifier {
  private config: Required<Omit<SinchWebhookConfig, 'handlers'>> & Pick<SinchWebhookConfig, 'handlers'>;
  private handlers: Map<string, SinchEventHandler[]> = new Map();

  constructor(config: SinchWebhookConfig) {
    this.config = {
      app_key: config.app_key,
      app_secret: config.app_secret,
      max_age_seconds: config.max_age_seconds ?? 300,
      enable_conversation_api: config.enable_conversation_api ?? true,
      handlers: config.handlers
    };

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
   * Verify a Sinch webhook request
   */
  verify(request: WebhookRequest): SinchVerificationResult {
    // Determine webhook type
    const webhookType = this.determineWebhookType(request);

    switch (webhookType) {
      case 'sms':
        return this.verifySMSWebhook(request);
      case 'voice':
        return this.verifyVoiceWebhook(request);
      case 'conversation':
        return this.verifyConversationWebhook(request);
      default:
        return {
          valid: false,
          error: 'Unknown webhook type',
          error_code: 'INVALID_SIGNATURE'
        };
    }
  }

  /**
   * Verify and dispatch event to handlers
   */
  async verifyAndDispatch(request: WebhookRequest): Promise<SinchVerificationResult> {
    const result = this.verify(request);

    if (result.valid && result.event) {
      await this.dispatch(result.event);
    }

    return result;
  }

  /**
   * Register an event handler
   */
  on(eventType: string, handler: SinchEventHandler): void {
    const handlers = this.handlers.get(eventType) ?? [];
    handlers.push(handler);
    this.handlers.set(eventType, handlers);
  }

  /**
   * Register handler for SMS events
   */
  onSMS(handler: SinchEventHandler): void {
    this.on('sms.incoming', handler);
    this.on('sms.delivery_report', handler);
  }

  /**
   * Register handler for Voice events
   */
  onVoice(handler: SinchEventHandler): void {
    this.on('voice.incoming', handler);
    this.on('voice.answered', handler);
    this.on('voice.disconnected', handler);
    this.on('voice.prompt_input', handler);
  }

  /**
   * Register handler for Conversation API events
   */
  onConversation(handler: SinchEventHandler): void {
    this.on('conversation.message', handler);
    this.on('conversation.message_delivery', handler);
    this.on('conversation.message_inbound', handler);
    this.on('conversation.event_inbound', handler);
  }

  /**
   * Register a wildcard handler
   */
  onAll(handler: SinchEventHandler): void {
    this.on('*', handler);
  }

  /**
   * Dispatch event to registered handlers
   */
  async dispatch(event: SinchEvent): Promise<void> {
    const handlers: SinchEventHandler[] = [];

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
   * Generate a test webhook for development
   */
  generateTestWebhook(
    webhookType: 'sms' | 'voice' | 'conversation',
    payload: Record<string, unknown>
  ): { headers: Record<string, string>; body: string } {
    const body = JSON.stringify(payload);
    const timestamp = new Date().toISOString();
    const signature = this.computeSignature(body, timestamp);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Timestamp': timestamp
    };

    if (webhookType === 'conversation') {
      headers['x-sinch-webhook-signature'] = signature;
      headers['x-sinch-webhook-signature-algorithm'] = 'HmacSHA256';
      headers['x-sinch-webhook-signature-nonce'] = crypto.randomBytes(16).toString('hex');
      headers['x-sinch-webhook-signature-timestamp'] = timestamp;
    } else {
      headers['Authorization'] = `Basic ${this.computeBasicAuth()}`;
    }

    return { headers, body };
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.handlers.clear();
  }

  // ============================================================================
  // PRIVATE METHODS - SMS VERIFICATION
  // ============================================================================

  /**
   * Verify SMS webhook using Basic Auth
   */
  private verifySMSWebhook(request: WebhookRequest): SinchVerificationResult {
    // Check Authorization header
    const authHeader = this.getHeader(request.headers, 'Authorization');
    if (!authHeader) {
      return {
        valid: false,
        error: 'Missing Authorization header',
        error_code: 'MISSING_SIGNATURE',
        webhook_type: 'sms'
      };
    }

    // Verify Basic Auth credentials
    if (!this.verifyBasicAuth(authHeader)) {
      return {
        valid: false,
        error: 'Invalid authorization credentials',
        error_code: 'INVALID_SIGNATURE',
        webhook_type: 'sms'
      };
    }

    // Parse event
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(request.body);
    } catch {
      return {
        valid: false,
        error: 'Invalid JSON in webhook body',
        error_code: 'INVALID_SIGNATURE',
        webhook_type: 'sms'
      };
    }

    const event = this.parseSMSEvent(payload);

    return {
      valid: true,
      event,
      event_type: event.type,
      message_id: event.message_id,
      webhook_type: 'sms'
    };
  }

  /**
   * Parse SMS event from payload
   */
  private parseSMSEvent(payload: Record<string, unknown>): SinchEvent {
    const isDeliveryReport = 'status' in payload || 'statuses' in payload;

    const event: SinchEvent = {
      type: isDeliveryReport ? 'sms.delivery_report' : 'sms.incoming',
      webhook_type: 'sms',
      raw: payload
    };

    // Handle incoming SMS
    if (!isDeliveryReport) {
      event.message_id = payload.id as string;
      event.from = payload.from as string;
      event.to = payload.to as string;
      event.body = payload.body as string;
      event.timestamp = payload.received_at as string;
    }

    // Handle delivery report
    if (isDeliveryReport) {
      const status = payload.status as Record<string, unknown> | undefined;
      if (status) {
        event.message_id = payload.batch_id as string;
        event.status = this.mapDeliveryStatus(status.status as string);
        event.error_code = status.code as string;
      }

      // Handle batch delivery reports
      const statuses = payload.statuses as Array<Record<string, unknown>> | undefined;
      if (statuses && statuses.length > 0) {
        const firstStatus = statuses[0];
        event.message_id = payload.batch_id as string;
        event.status = this.mapDeliveryStatus(firstStatus.status as string);
        event.error_code = firstStatus.code as string;
      }
    }

    return event;
  }

  // ============================================================================
  // PRIVATE METHODS - VOICE VERIFICATION
  // ============================================================================

  /**
   * Verify Voice webhook using Basic Auth
   */
  private verifyVoiceWebhook(request: WebhookRequest): SinchVerificationResult {
    // Check Authorization header
    const authHeader = this.getHeader(request.headers, 'Authorization');
    if (!authHeader) {
      return {
        valid: false,
        error: 'Missing Authorization header',
        error_code: 'MISSING_SIGNATURE',
        webhook_type: 'voice'
      };
    }

    // Verify Basic Auth credentials
    if (!this.verifyBasicAuth(authHeader)) {
      return {
        valid: false,
        error: 'Invalid authorization credentials',
        error_code: 'INVALID_SIGNATURE',
        webhook_type: 'voice'
      };
    }

    // Parse event
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(request.body);
    } catch {
      return {
        valid: false,
        error: 'Invalid JSON in webhook body',
        error_code: 'INVALID_SIGNATURE',
        webhook_type: 'voice'
      };
    }

    const event = this.parseVoiceEvent(payload);

    return {
      valid: true,
      event,
      event_type: event.type,
      webhook_type: 'voice'
    };
  }

  /**
   * Parse Voice event from payload
   */
  private parseVoiceEvent(payload: Record<string, unknown>): SinchEvent {
    const eventName = payload.event as string | undefined;
    let eventType: SinchEventType = 'unknown';

    switch (eventName) {
      case 'ice':
        eventType = 'voice.incoming';
        break;
      case 'ace':
        eventType = 'voice.answered';
        break;
      case 'dice':
        eventType = 'voice.disconnected';
        break;
      case 'pie':
        eventType = 'voice.prompt_input';
        break;
    }

    const event: SinchEvent = {
      type: eventType,
      webhook_type: 'voice',
      raw: payload
    };

    event.call_id = payload.callid as string;
    event.timestamp = payload.timestamp as string;

    // Parse CLI (caller ID)
    const cli = payload.cli as Record<string, unknown> | undefined;
    if (cli) {
      event.from = cli.identity as string;
    }

    // Parse To
    const to = payload.to as Record<string, unknown> | undefined;
    if (to) {
      event.to = to.endpoint as string;
    }

    // Parse DTMF input
    if (eventType === 'voice.prompt_input') {
      const menuResult = payload.menuResult as Record<string, unknown> | undefined;
      if (menuResult) {
        event.dtmf = menuResult.value as string;
      }
    }

    // Parse call result for disconnected events
    if (eventType === 'voice.disconnected') {
      event.call_result = payload.result as string;
    }

    return event;
  }

  // ============================================================================
  // PRIVATE METHODS - CONVERSATION API VERIFICATION
  // ============================================================================

  /**
   * Verify Conversation API webhook using HMAC signature
   */
  private verifyConversationWebhook(request: WebhookRequest): SinchVerificationResult {
    // Get signature components
    const signature = this.getHeader(request.headers, 'x-sinch-webhook-signature');
    const timestamp = this.getHeader(request.headers, 'x-sinch-webhook-signature-timestamp');
    const nonce = this.getHeader(request.headers, 'x-sinch-webhook-signature-nonce');
    const algorithm = this.getHeader(request.headers, 'x-sinch-webhook-signature-algorithm');

    if (!signature) {
      return {
        valid: false,
        error: 'Missing x-sinch-webhook-signature header',
        error_code: 'MISSING_SIGNATURE',
        webhook_type: 'conversation'
      };
    }

    // Validate timestamp
    if (timestamp) {
      const timestampDate = new Date(timestamp);
      const now = Date.now();
      const ageSeconds = Math.floor((now - timestampDate.getTime()) / 1000);

      if (ageSeconds > this.config.max_age_seconds) {
        return {
          valid: false,
          error: `Webhook expired: ${ageSeconds}s old (max: ${this.config.max_age_seconds}s)`,
          error_code: 'TIMESTAMP_EXPIRED',
          webhook_type: 'conversation'
        };
      }
    }

    // Compute expected signature
    const signedPayload = this.buildConversationSignedPayload(request.body, nonce ?? '', timestamp ?? '');
    const expectedSignature = this.computeConversationSignature(signedPayload, algorithm ?? 'HmacSHA256');

    // Compare signatures
    if (!this.secureCompare(signature, expectedSignature)) {
      return {
        valid: false,
        error: 'Invalid webhook signature',
        error_code: 'INVALID_SIGNATURE',
        webhook_type: 'conversation'
      };
    }

    // Parse event
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(request.body);
    } catch {
      return {
        valid: false,
        error: 'Invalid JSON in webhook body',
        error_code: 'INVALID_SIGNATURE',
        webhook_type: 'conversation'
      };
    }

    const event = this.parseConversationEvent(payload);

    return {
      valid: true,
      event,
      event_type: event.type,
      message_id: event.message_id,
      webhook_type: 'conversation',
      timestamp: timestamp ? new Date(timestamp) : undefined
    };
  }

  /**
   * Build the signed payload for Conversation API
   */
  private buildConversationSignedPayload(body: string, nonce: string, timestamp: string): string {
    return `${nonce}.${timestamp}.${body}`;
  }

  /**
   * Compute Conversation API signature
   */
  private computeConversationSignature(payload: string, algorithm: string): string {
    const algo = algorithm === 'HmacSHA256' ? 'sha256' : 'sha1';
    return crypto
      .createHmac(algo, this.config.app_secret)
      .update(payload, 'utf8')
      .digest('base64');
  }

  /**
   * Parse Conversation API event from payload
   */
  private parseConversationEvent(payload: Record<string, unknown>): SinchEvent {
    const eventType = this.mapConversationEventType(payload);

    const event: SinchEvent = {
      type: eventType,
      webhook_type: 'conversation',
      raw: payload
    };

    // Parse common fields
    event.timestamp = payload.event_time as string;

    // Parse message fields
    const message = payload.message as Record<string, unknown> | undefined;
    if (message) {
      event.message_id = message.id as string;

      const contactMessage = message.contact_message as Record<string, unknown> | undefined;
      if (contactMessage) {
        const textMessage = contactMessage.text_message as Record<string, unknown> | undefined;
        if (textMessage) {
          event.body = textMessage.text as string;
        }
      }
    }

    // Parse contact fields
    event.contact_id = payload.contact_id as string;
    event.conversation_id = payload.conversation_id as string;

    // Parse channel identity
    const channelIdentity = payload.channel_identity as Record<string, unknown> | undefined;
    if (channelIdentity) {
      event.channel_identity = {
        channel: channelIdentity.channel as string,
        identity: channelIdentity.identity as string
      };
    }

    return event;
  }

  /**
   * Map Conversation API event type
   */
  private mapConversationEventType(payload: Record<string, unknown>): SinchEventType {
    if (payload.message_delivery_report) {
      return 'conversation.message_delivery';
    }
    if (payload.message) {
      const direction = (payload.message as Record<string, unknown>).direction;
      return direction === 'TO_APP' ? 'conversation.message_inbound' : 'conversation.message';
    }
    if (payload.event) {
      return 'conversation.event_inbound';
    }
    if (payload.contact_create_notification) {
      return 'conversation.contact_create';
    }
    if (payload.contact_update_notification) {
      return 'conversation.contact_update';
    }
    if (payload.contact_delete_notification) {
      return 'conversation.contact_delete';
    }
    if (payload.capability_notification) {
      return 'conversation.capability';
    }
    if (payload.opt_in_notification) {
      return 'conversation.opt_in';
    }
    if (payload.opt_out_notification) {
      return 'conversation.opt_out';
    }

    return 'unknown';
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Determine webhook type from request
   */
  private determineWebhookType(request: WebhookRequest): 'sms' | 'voice' | 'conversation' | undefined {
    // Check for Conversation API headers
    if (this.getHeader(request.headers, 'x-sinch-webhook-signature')) {
      return 'conversation';
    }

    // Try to parse body to determine type
    try {
      const payload = JSON.parse(request.body);

      // Voice webhooks have 'event' field with ice/ace/dice/pie
      if (payload.event && ['ice', 'ace', 'dice', 'pie'].includes(payload.event)) {
        return 'voice';
      }

      // SMS webhooks
      if (payload.from && payload.to && payload.body) {
        return 'sms';
      }

      // SMS delivery reports
      if (payload.batch_id || payload.statuses) {
        return 'sms';
      }

      // Default to SMS for auth-based webhooks
      return 'sms';
    } catch {
      return undefined;
    }
  }

  /**
   * Verify Basic Auth header
   */
  private verifyBasicAuth(authHeader: string): boolean {
    if (!authHeader.startsWith('Basic ')) {
      return false;
    }

    const encoded = authHeader.slice(6);
    const decoded = Buffer.from(encoded, 'base64').toString('utf8');
    const [username, password] = decoded.split(':');

    return username === this.config.app_key && password === this.config.app_secret;
  }

  /**
   * Compute Basic Auth header value
   */
  private computeBasicAuth(): string {
    return Buffer.from(`${this.config.app_key}:${this.config.app_secret}`).toString('base64');
  }

  /**
   * Compute HMAC signature for SMS/Voice webhooks
   */
  private computeSignature(body: string, timestamp: string): string {
    const payload = `${timestamp}.${body}`;
    return crypto
      .createHmac('sha256', this.config.app_secret)
      .update(payload, 'utf8')
      .digest('base64');
  }

  /**
   * Map delivery status to normalized type
   */
  private mapDeliveryStatus(status: string): SinchDeliveryStatus {
    const statusMap: Record<string, SinchDeliveryStatus> = {
      Queued: 'queued',
      Dispatched: 'dispatched',
      Delivered: 'delivered',
      Failed: 'failed',
      Expired: 'expired',
      Cancelled: 'cancelled'
    };

    return statusMap[status] ?? 'unknown';
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
 * Create a Sinch webhook verifier from environment
 */
export function createSinchVerifier(appKey?: string, appSecret?: string): SinchWebhookVerifier {
  const key = appKey ?? process.env.SINCH_APP_KEY;
  const secret = appSecret ?? process.env.SINCH_APP_SECRET;

  if (!key || !secret) {
    throw new Error('Sinch app key and secret are required');
  }

  return new SinchWebhookVerifier({
    app_key: key,
    app_secret: secret
  });
}
