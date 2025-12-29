/**
 * stripe.ts
 * Stripe webhook signature verification
 * Implements stripe-signature header parsing, event type routing, and idempotency handling
 */

import * as crypto from 'crypto';
import { WebhookRequest, VerificationResult } from './generic_hmac';

// ============================================================================
// TYPES
// ============================================================================

export interface StripeWebhookConfig {
  /** Stripe webhook signing secret (whsec_...) */
  signing_secret: string;

  /** Maximum age of webhook in seconds (default: 300 = 5 minutes) */
  max_age_seconds?: number;

  /** Enable test mode detection */
  detect_test_mode?: boolean;

  /** Event handlers by type */
  handlers?: Record<string, StripeEventHandler>;
}

export interface StripeSignatureHeader {
  /** Timestamp when Stripe signed the payload */
  timestamp: number;

  /** v1 signature(s) */
  v1_signatures: string[];

  /** v0 signature (deprecated) */
  v0_signature?: string;
}

export interface StripeEvent {
  /** Unique event ID */
  id: string;

  /** Event type (e.g., 'payment_intent.succeeded') */
  type: string;

  /** API version used to render the event */
  api_version: string;

  /** Time event was created (Unix timestamp) */
  created: number;

  /** Whether this is a livemode event */
  livemode: boolean;

  /** Number of delivery attempts */
  pending_webhooks: number;

  /** Object related to the event */
  data: {
    object: Record<string, unknown>;
    previous_attributes?: Record<string, unknown>;
  };

  /** Request that triggered the event */
  request?: {
    id: string | null;
    idempotency_key: string | null;
  };
}

export interface StripeVerificationResult extends VerificationResult {
  /** Parsed Stripe event */
  event?: StripeEvent;

  /** Whether event is from test mode */
  is_test_mode?: boolean;

  /** Request idempotency key if present */
  idempotency_key?: string;

  /** Stripe signature header details */
  signature_details?: StripeSignatureHeader;
}

export type StripeEventHandler = (event: StripeEvent) => Promise<void> | void;

export interface StripeEventCategory {
  category: string;
  types: string[];
  description: string;
}

// ============================================================================
// EVENT CATEGORIES
// ============================================================================

export const STRIPE_EVENT_CATEGORIES: StripeEventCategory[] = [
  {
    category: 'payment',
    types: [
      'payment_intent.created',
      'payment_intent.succeeded',
      'payment_intent.payment_failed',
      'payment_intent.canceled',
      'payment_intent.processing',
      'payment_intent.requires_action',
      'charge.succeeded',
      'charge.failed',
      'charge.refunded',
      'charge.dispute.created',
      'charge.dispute.closed'
    ],
    description: 'Payment-related events'
  },
  {
    category: 'subscription',
    types: [
      'customer.subscription.created',
      'customer.subscription.updated',
      'customer.subscription.deleted',
      'customer.subscription.trial_will_end',
      'customer.subscription.pending_update_applied',
      'customer.subscription.pending_update_expired'
    ],
    description: 'Subscription lifecycle events'
  },
  {
    category: 'invoice',
    types: [
      'invoice.created',
      'invoice.finalized',
      'invoice.paid',
      'invoice.payment_failed',
      'invoice.payment_action_required',
      'invoice.upcoming',
      'invoice.voided'
    ],
    description: 'Invoice-related events'
  },
  {
    category: 'customer',
    types: [
      'customer.created',
      'customer.updated',
      'customer.deleted',
      'customer.source.created',
      'customer.source.updated',
      'customer.source.deleted'
    ],
    description: 'Customer-related events'
  },
  {
    category: 'checkout',
    types: [
      'checkout.session.completed',
      'checkout.session.expired',
      'checkout.session.async_payment_succeeded',
      'checkout.session.async_payment_failed'
    ],
    description: 'Checkout session events'
  }
];

// ============================================================================
// IDEMPOTENCY STORE
// ============================================================================

interface ProcessedEvent {
  event_id: string;
  processed_at: number;
  idempotency_key?: string;
}

class StripeIdempotencyStore {
  private processed: Map<string, ProcessedEvent> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private maxAge: number;

  constructor(maxAgeSeconds: number = 86400) { // 24 hours default
    this.maxAge = maxAgeSeconds * 1000;
    this.startCleanup();
  }

  /**
   * Check if an event has already been processed
   */
  isProcessed(eventId: string): boolean {
    return this.processed.has(eventId);
  }

  /**
   * Mark an event as processed
   */
  markProcessed(eventId: string, idempotencyKey?: string): void {
    this.processed.set(eventId, {
      event_id: eventId,
      processed_at: Date.now(),
      idempotency_key: idempotencyKey
    });
  }

  /**
   * Check and mark atomically (returns true if first time)
   */
  checkAndMark(eventId: string, idempotencyKey?: string): boolean {
    if (this.isProcessed(eventId)) {
      return false;
    }
    this.markProcessed(eventId, idempotencyKey);
    return true;
  }

  /**
   * Clean up old entries
   */
  cleanup(): number {
    const now = Date.now();
    let count = 0;
    for (const [key, record] of this.processed.entries()) {
      if (now - record.processed_at > this.maxAge) {
        this.processed.delete(key);
        count++;
      }
    }
    return count;
  }

  private startCleanup(): void {
    // Run cleanup every hour
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 3600000);
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.processed.clear();
  }

  get size(): number {
    return this.processed.size;
  }
}

// ============================================================================
// STRIPE WEBHOOK VERIFIER
// ============================================================================

export class StripeWebhookVerifier {
  private config: Required<Omit<StripeWebhookConfig, 'handlers'>> & Pick<StripeWebhookConfig, 'handlers'>;
  private idempotencyStore: StripeIdempotencyStore;
  private handlers: Map<string, StripeEventHandler[]> = new Map();

  constructor(config: StripeWebhookConfig) {
    this.config = {
      signing_secret: config.signing_secret,
      max_age_seconds: config.max_age_seconds ?? 300,
      detect_test_mode: config.detect_test_mode ?? true,
      handlers: config.handlers
    };

    this.idempotencyStore = new StripeIdempotencyStore();

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
   * Verify a Stripe webhook request
   */
  verify(request: WebhookRequest): StripeVerificationResult {
    // Get stripe-signature header
    const signatureHeader = this.getHeader(request.headers, 'stripe-signature');
    if (!signatureHeader) {
      return {
        valid: false,
        error: 'Missing stripe-signature header',
        error_code: 'MISSING_SIGNATURE'
      };
    }

    // Parse signature header
    const signatureDetails = this.parseSignatureHeader(signatureHeader);
    if (!signatureDetails) {
      return {
        valid: false,
        error: 'Invalid stripe-signature header format',
        error_code: 'INVALID_SIGNATURE'
      };
    }

    // Check timestamp
    const now = Math.floor(Date.now() / 1000);
    const age = now - signatureDetails.timestamp;

    if (age > this.config.max_age_seconds) {
      return {
        valid: false,
        error: `Webhook expired: ${age}s old (max: ${this.config.max_age_seconds}s)`,
        error_code: 'TIMESTAMP_EXPIRED',
        signature_details: signatureDetails
      };
    }

    if (age < -60) { // Allow 60s clock skew into the future
      return {
        valid: false,
        error: 'Webhook timestamp is in the future',
        error_code: 'TIMESTAMP_EXPIRED',
        signature_details: signatureDetails
      };
    }

    // Compute expected signature
    const payload = `${signatureDetails.timestamp}.${request.body}`;
    const expectedSignature = this.computeSignature(payload);

    // Check against all v1 signatures
    let signatureValid = false;
    for (const sig of signatureDetails.v1_signatures) {
      if (this.secureCompare(sig, expectedSignature)) {
        signatureValid = true;
        break;
      }
    }

    if (!signatureValid) {
      return {
        valid: false,
        error: 'Invalid webhook signature',
        error_code: 'INVALID_SIGNATURE',
        signature_details: signatureDetails
      };
    }

    // Parse event
    let event: StripeEvent;
    try {
      event = JSON.parse(request.body) as StripeEvent;
    } catch {
      return {
        valid: false,
        error: 'Invalid JSON in webhook body',
        error_code: 'INVALID_SIGNATURE',
        signature_details: signatureDetails
      };
    }

    // Check for duplicate processing
    const idempotencyKey = event.request?.idempotency_key ?? undefined;
    if (!this.idempotencyStore.checkAndMark(event.id, idempotencyKey)) {
      return {
        valid: true,
        event,
        is_test_mode: !event.livemode,
        idempotency_key: idempotencyKey,
        signature_details: signatureDetails,
        error: 'Event already processed (duplicate)',
        error_code: 'REPLAY_DETECTED'
      };
    }

    return {
      valid: true,
      event,
      is_test_mode: !event.livemode,
      idempotency_key: idempotencyKey,
      signature_details: signatureDetails,
      timestamp: new Date(signatureDetails.timestamp * 1000),
      age_seconds: age
    };
  }

  /**
   * Verify and dispatch event to handlers
   */
  async verifyAndDispatch(request: WebhookRequest): Promise<StripeVerificationResult> {
    const result = this.verify(request);

    if (result.valid && result.event && result.error_code !== 'REPLAY_DETECTED') {
      await this.dispatch(result.event);
    }

    return result;
  }

  /**
   * Register an event handler
   */
  on(eventType: string, handler: StripeEventHandler): void {
    const handlers = this.handlers.get(eventType) ?? [];
    handlers.push(handler);
    this.handlers.set(eventType, handlers);
  }

  /**
   * Register handler for all events in a category
   */
  onCategory(category: string, handler: StripeEventHandler): void {
    const cat = STRIPE_EVENT_CATEGORIES.find((c) => c.category === category);
    if (cat) {
      for (const eventType of cat.types) {
        this.on(eventType, handler);
      }
    }
  }

  /**
   * Register a wildcard handler for all events
   */
  onAll(handler: StripeEventHandler): void {
    this.on('*', handler);
  }

  /**
   * Dispatch event to registered handlers
   */
  async dispatch(event: StripeEvent): Promise<void> {
    const handlers: StripeEventHandler[] = [];

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
   * Check if event is from test mode
   */
  isTestMode(event: StripeEvent): boolean {
    return !event.livemode;
  }

  /**
   * Get event category
   */
  getEventCategory(eventType: string): string | undefined {
    for (const cat of STRIPE_EVENT_CATEGORIES) {
      if (cat.types.includes(eventType)) {
        return cat.category;
      }
    }
    return undefined;
  }

  /**
   * Generate a test webhook for development
   */
  generateTestWebhook(event: Partial<StripeEvent>): { headers: Record<string, string>; body: string } {
    const fullEvent: StripeEvent = {
      id: event.id ?? `evt_test_${Date.now()}`,
      type: event.type ?? 'payment_intent.succeeded',
      api_version: event.api_version ?? '2023-10-16',
      created: event.created ?? Math.floor(Date.now() / 1000),
      livemode: event.livemode ?? false,
      pending_webhooks: event.pending_webhooks ?? 1,
      data: event.data ?? { object: {} },
      request: event.request
    };

    const body = JSON.stringify(fullEvent);
    const timestamp = Math.floor(Date.now() / 1000);
    const payload = `${timestamp}.${body}`;
    const signature = this.computeSignature(payload);

    return {
      headers: {
        'stripe-signature': `t=${timestamp},v1=${signature}`,
        'content-type': 'application/json'
      },
      body
    };
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.idempotencyStore.destroy();
    this.handlers.clear();
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  /**
   * Parse stripe-signature header
   */
  private parseSignatureHeader(header: string): StripeSignatureHeader | null {
    const parts = header.split(',');
    let timestamp: number | undefined;
    const v1Signatures: string[] = [];
    let v0Signature: string | undefined;

    for (const part of parts) {
      const [key, value] = part.split('=');
      if (key === 't') {
        timestamp = parseInt(value, 10);
        if (isNaN(timestamp)) {
          return null;
        }
      } else if (key === 'v1') {
        v1Signatures.push(value);
      } else if (key === 'v0') {
        v0Signature = value;
      }
    }

    if (timestamp === undefined || v1Signatures.length === 0) {
      return null;
    }

    return {
      timestamp,
      v1_signatures: v1Signatures,
      v0_signature: v0Signature
    };
  }

  /**
   * Compute HMAC-SHA256 signature
   */
  private computeSignature(payload: string): string {
    return crypto
      .createHmac('sha256', this.config.signing_secret)
      .update(payload, 'utf8')
      .digest('hex');
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
 * Create a Stripe webhook verifier from environment
 */
export function createStripeVerifier(signingSecret?: string): StripeWebhookVerifier {
  const secret = signingSecret ?? process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error('Stripe webhook signing secret is required');
  }

  return new StripeWebhookVerifier({
    signing_secret: secret
  });
}

// ============================================================================
// EXPORTS
// ============================================================================

export { StripeIdempotencyStore }
