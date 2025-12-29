/**
 * generic_hmac.ts
 * Generic HMAC-SHA256 webhook signature verification
 * Provides configurable header names, timestamp validation, and replay attack prevention
 */

import * as crypto from 'crypto';

// ============================================================================
// TYPES
// ============================================================================

export interface GenericHMACConfig {
  /** Secret key for HMAC verification */
  secret: string;

  /** Header name containing the signature */
  signature_header: string;

  /** Header name containing the timestamp (optional) */
  timestamp_header?: string;

  /** Signature prefix to strip (e.g., 'sha256=') */
  signature_prefix?: string;

  /** Algorithm to use (default: sha256) */
  algorithm?: 'sha256' | 'sha512' | 'sha1';

  /** Encoding of the signature (default: hex) */
  signature_encoding?: 'hex' | 'base64';

  /** Maximum age of request in seconds (default: 300 = 5 minutes) */
  max_age_seconds?: number;

  /** Whether to include timestamp in signature computation */
  include_timestamp_in_signature?: boolean;

  /** Separator for timestamp + body when computing signature */
  timestamp_separator?: string;
}

export interface VerificationResult {
  /** Whether verification succeeded */
  valid: boolean;

  /** Error message if verification failed */
  error?: string;

  /** Error code for programmatic handling */
  error_code?: 'MISSING_SIGNATURE' | 'INVALID_SIGNATURE' | 'TIMESTAMP_EXPIRED' | 'REPLAY_DETECTED' | 'INVALID_CONFIG';

  /** Parsed timestamp if available */
  timestamp?: Date;

  /** Request age in seconds */
  age_seconds?: number;
}

export interface WebhookRequest {
  /** Request headers (case-insensitive lookup) */
  headers: Record<string, string | string[] | undefined>;

  /** Raw request body as string */
  body: string;

  /** Request URL (optional, some providers need it) */
  url?: string;

  /** HTTP method (optional) */
  method?: string;
}

// ============================================================================
// REPLAY PREVENTION STORE
// ============================================================================

interface NonceRecord {
  signature: string;
  timestamp: number;
  expires_at: number;
}

class ReplayPreventionStore {
  private nonces: Map<string, NonceRecord> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private maxAge: number;

  constructor(maxAgeSeconds: number = 300) {
    this.maxAge = maxAgeSeconds * 1000;
    this.startCleanup();
  }

  /**
   * Check if a signature has been seen before (replay attack)
   */
  check(signature: string): boolean {
    return this.nonces.has(signature);
  }

  /**
   * Record a signature to prevent replay
   */
  record(signature: string): void {
    const now = Date.now();
    this.nonces.set(signature, {
      signature,
      timestamp: now,
      expires_at: now + this.maxAge
    });
  }

  /**
   * Check and record atomically
   */
  checkAndRecord(signature: string): boolean {
    if (this.check(signature)) {
      return false; // Replay detected
    }
    this.record(signature);
    return true; // First time seeing this
  }

  /**
   * Clean up expired entries
   */
  cleanup(): number {
    const now = Date.now();
    let count = 0;
    for (const [key, record] of this.nonces.entries()) {
      if (record.expires_at < now) {
        this.nonces.delete(key);
        count++;
      }
    }
    return count;
  }

  /**
   * Start automatic cleanup
   */
  private startCleanup(): void {
    // Run cleanup every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  /**
   * Stop cleanup and clear store
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.nonces.clear();
  }

  /**
   * Get current size
   */
  get size(): number {
    return this.nonces.size;
  }
}

// ============================================================================
// GENERIC HMAC VERIFIER
// ============================================================================

export class GenericHMACVerifier {
  private config: Required<Omit<GenericHMACConfig, 'timestamp_header'>> & Pick<GenericHMACConfig, 'timestamp_header'>;
  private replayStore: ReplayPreventionStore;

  constructor(config: GenericHMACConfig) {
    this.config = {
      secret: config.secret,
      signature_header: config.signature_header.toLowerCase(),
      timestamp_header: config.timestamp_header?.toLowerCase(),
      signature_prefix: config.signature_prefix ?? '',
      algorithm: config.algorithm ?? 'sha256',
      signature_encoding: config.signature_encoding ?? 'hex',
      max_age_seconds: config.max_age_seconds ?? 300,
      include_timestamp_in_signature: config.include_timestamp_in_signature ?? false,
      timestamp_separator: config.timestamp_separator ?? '.'
    };

    this.replayStore = new ReplayPreventionStore(this.config.max_age_seconds);
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  /**
   * Verify a webhook request
   */
  verify(request: WebhookRequest): VerificationResult {
    // Get signature from headers
    const signature = this.getHeader(request.headers, this.config.signature_header);
    if (!signature) {
      return {
        valid: false,
        error: `Missing signature header: ${this.config.signature_header}`,
        error_code: 'MISSING_SIGNATURE'
      };
    }

    // Strip prefix if configured
    let cleanSignature = signature;
    if (this.config.signature_prefix && signature.startsWith(this.config.signature_prefix)) {
      cleanSignature = signature.slice(this.config.signature_prefix.length);
    }

    // Check timestamp if configured
    let timestamp: Date | undefined;
    let ageSeconds: number | undefined;

    if (this.config.timestamp_header) {
      const timestampStr = this.getHeader(request.headers, this.config.timestamp_header);
      if (timestampStr) {
        const timestampResult = this.validateTimestamp(timestampStr);
        if (!timestampResult.valid) {
          return timestampResult;
        }
        timestamp = timestampResult.timestamp;
        ageSeconds = timestampResult.age_seconds;
      }
    }

    // Compute expected signature
    let payloadToSign = request.body;
    if (this.config.include_timestamp_in_signature && timestamp) {
      const timestampValue = Math.floor(timestamp.getTime() / 1000);
      payloadToSign = `${timestampValue}${this.config.timestamp_separator}${request.body}`;
    }

    const expectedSignature = this.computeSignature(payloadToSign);

    // Timing-safe comparison
    if (!this.secureCompare(cleanSignature, expectedSignature)) {
      return {
        valid: false,
        error: 'Invalid signature',
        error_code: 'INVALID_SIGNATURE'
      };
    }

    // Check for replay attack
    if (!this.replayStore.checkAndRecord(cleanSignature)) {
      return {
        valid: false,
        error: 'Replay attack detected: signature already used',
        error_code: 'REPLAY_DETECTED'
      };
    }

    return {
      valid: true,
      timestamp,
      age_seconds: ageSeconds
    };
  }

  /**
   * Compute HMAC signature for a payload
   */
  computeSignature(payload: string): string {
    const hmac = crypto.createHmac(this.config.algorithm, this.config.secret);
    hmac.update(payload, 'utf8');
    return hmac.digest(this.config.signature_encoding);
  }

  /**
   * Generate a signed request for testing
   */
  sign(body: string, timestamp?: number): { signature: string; timestamp?: string } {
    const ts = timestamp ?? Math.floor(Date.now() / 1000);
    let payloadToSign = body;

    if (this.config.include_timestamp_in_signature) {
      payloadToSign = `${ts}${this.config.timestamp_separator}${body}`;
    }

    const signature = this.computeSignature(payloadToSign);
    const prefixedSignature = this.config.signature_prefix + signature;

    return {
      signature: prefixedSignature,
      timestamp: this.config.timestamp_header ? ts.toString() : undefined
    };
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.replayStore.destroy();
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

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
   * Validate timestamp and check age
   */
  private validateTimestamp(timestampStr: string): VerificationResult {
    let timestamp: Date;

    // Try parsing as Unix timestamp (seconds)
    const unixTs = parseInt(timestampStr, 10);
    if (!isNaN(unixTs)) {
      timestamp = new Date(unixTs * 1000);
    } else {
      // Try parsing as ISO string
      timestamp = new Date(timestampStr);
    }

    if (isNaN(timestamp.getTime())) {
      return {
        valid: false,
        error: 'Invalid timestamp format',
        error_code: 'TIMESTAMP_EXPIRED'
      };
    }

    const now = Date.now();
    const ageMs = now - timestamp.getTime();
    const ageSeconds = Math.floor(ageMs / 1000);

    // Check if request is too old
    if (ageSeconds > this.config.max_age_seconds) {
      return {
        valid: false,
        error: `Request expired: ${ageSeconds}s old (max: ${this.config.max_age_seconds}s)`,
        error_code: 'TIMESTAMP_EXPIRED',
        timestamp,
        age_seconds: ageSeconds
      };
    }

    // Check if request is from the future (clock skew tolerance: 60s)
    if (ageMs < -60000) {
      return {
        valid: false,
        error: 'Request timestamp is in the future',
        error_code: 'TIMESTAMP_EXPIRED',
        timestamp,
        age_seconds: ageSeconds
      };
    }

    return {
      valid: true,
      timestamp,
      age_seconds: ageSeconds
    };
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
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create a GitHub webhook verifier
 */
export function createGitHubVerifier(secret: string): GenericHMACVerifier {
  return new GenericHMACVerifier({
    secret,
    signature_header: 'X-Hub-Signature-256',
    signature_prefix: 'sha256=',
    algorithm: 'sha256',
    signature_encoding: 'hex'
  });
}

/**
 * Create a Shopify webhook verifier
 */
export function createShopifyVerifier(secret: string): GenericHMACVerifier {
  return new GenericHMACVerifier({
    secret,
    signature_header: 'X-Shopify-Hmac-Sha256',
    algorithm: 'sha256',
    signature_encoding: 'base64'
  });
}

/**
 * Create a Slack webhook verifier
 */
export function createSlackVerifier(signingSecret: string): GenericHMACVerifier {
  return new GenericHMACVerifier({
    secret: signingSecret,
    signature_header: 'X-Slack-Signature',
    timestamp_header: 'X-Slack-Request-Timestamp',
    signature_prefix: 'v0=',
    algorithm: 'sha256',
    signature_encoding: 'hex',
    include_timestamp_in_signature: true,
    timestamp_separator: ':'
  });
}

// ============================================================================
// EXPORTS
// ============================================================================

export { ReplayPreventionStore }
