/**
 * idempotency.ts
 * Idempotency ledger with key hashing and replay defense
 * Prevents duplicate operations and ensures exactly-once semantics
 */

import * as crypto from 'crypto';

// ============================================================================
// TYPES
// ============================================================================

export type IdempotencyStatus = 'pending' | 'completed' | 'failed' | 'expired';

export interface IdempotencyKey {
  /** The hashed key */
  hash: string;

  /** Original key components for debugging (optional) */
  components?: Record<string, string>;

  /** Namespace for key isolation */
  namespace: string;
}

export interface IdempotencyRecord {
  /** Unique identifier */
  id: string;

  /** Hashed idempotency key */
  key_hash: string;

  /** Namespace */
  namespace: string;

  /** Operation being performed */
  operation: string;

  /** Current status */
  status: IdempotencyStatus;

  /** Request fingerprint for replay detection */
  request_fingerprint: string;

  /** Stored result (if completed successfully) */
  result?: unknown;

  /** Error details (if failed) */
  error?: {
    code: string;
    message: string;
  };

  /** When this record was created */
  created_at: string;

  /** When this record was last updated */
  updated_at: string;

  /** When this record expires */
  expires_at: string;

  /** Number of times this key was attempted */
  attempt_count: number;

  /** Actor who initiated the operation */
  actor_id?: string;

  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

export interface IdempotencyConfig {
  /** Default TTL for idempotency records (ms) */
  default_ttl_ms?: number;

  /** Minimum TTL to prevent too-short expirations */
  min_ttl_ms?: number;

  /** Maximum TTL to prevent stale locks */
  max_ttl_ms?: number;

  /** Default namespace */
  default_namespace?: string;

  /** Storage backend */
  storage?: IdempotencyStorage;

  /** Enable request fingerprinting for replay defense */
  enable_fingerprinting?: boolean;
}

export interface IdempotencyStorage {
  save(record: IdempotencyRecord): Promise<void>;
  get(keyHash: string, namespace: string): Promise<IdempotencyRecord | null>;
  update(record: IdempotencyRecord): Promise<void>;
  delete(keyHash: string, namespace: string): Promise<void>;
  cleanup(before: Date): Promise<number>;
}

export interface IdempotencyCheckResult {
  /** Whether the operation should proceed */
  should_proceed: boolean;

  /** Status of existing record if found */
  existing_status?: IdempotencyStatus;

  /** Stored result if operation already completed */
  cached_result?: unknown;

  /** Record if found */
  record?: IdempotencyRecord;

  /** Reason for not proceeding */
  reason?: string;
}

// ============================================================================
// IN-MEMORY STORAGE
// ============================================================================

class InMemoryIdempotencyStorage implements IdempotencyStorage {
  private records: Map<string, IdempotencyRecord> = new Map();

  private getKey(keyHash: string, namespace: string): string {
    return `${namespace}:${keyHash}`;
  }

  async save(record: IdempotencyRecord): Promise<void> {
    const key = this.getKey(record.key_hash, record.namespace);
    this.records.set(key, { ...record });
  }

  async get(keyHash: string, namespace: string): Promise<IdempotencyRecord | null> {
    const key = this.getKey(keyHash, namespace);
    const record = this.records.get(key);
    return record ? { ...record } : null;
  }

  async update(record: IdempotencyRecord): Promise<void> {
    const key = this.getKey(record.key_hash, record.namespace);
    this.records.set(key, { ...record });
  }

  async delete(keyHash: string, namespace: string): Promise<void> {
    const key = this.getKey(keyHash, namespace);
    this.records.delete(key);
  }

  async cleanup(before: Date): Promise<number> {
    let count = 0;
    for (const [key, record] of this.records.entries()) {
      if (new Date(record.expires_at) < before) {
        this.records.delete(key);
        count++;
      }
    }
    return count;
  }
}

// ============================================================================
// IDEMPOTENCY MANAGER
// ============================================================================

export class IdempotencyManager {
  private config: Required<IdempotencyConfig>;
  private storage: IdempotencyStorage;

  constructor(config: IdempotencyConfig = {}) {
    this.storage = config.storage ?? new InMemoryIdempotencyStorage();
    this.config = {
      default_ttl_ms: config.default_ttl_ms ?? 86400000, // 24 hours
      min_ttl_ms: config.min_ttl_ms ?? 60000, // 1 minute
      max_ttl_ms: config.max_ttl_ms ?? 604800000, // 7 days
      default_namespace: config.default_namespace ?? 'default',
      storage: this.storage,
      enable_fingerprinting: config.enable_fingerprinting ?? true
    };
  }

  // ============================================================================
  // KEY GENERATION
  // ============================================================================

  /**
   * Generate an idempotency key from components
   */
  generateKey(
    components: Record<string, string>,
    namespace?: string
  ): IdempotencyKey {
    // Sort keys for consistent hashing
    const sortedKeys = Object.keys(components).sort();
    const data = sortedKeys.map((k) => `${k}:${components[k]}`).join('|');

    const hash = crypto.createHash('sha256').update(data).digest('hex');

    return {
      hash,
      components,
      namespace: namespace ?? this.config.default_namespace
    };
  }

  /**
   * Generate a fingerprint from request data for replay detection
   */
  generateFingerprint(requestData: unknown): string {
    const json = JSON.stringify(requestData, Object.keys(requestData as Record<string, unknown>).sort());
    return crypto.createHash('sha256').update(json).digest('hex').substring(0, 32);
  }

  // ============================================================================
  // IDEMPOTENCY CHECKS
  // ============================================================================

  /**
   * Check if an operation should proceed or return cached result
   */
  async check(
    key: IdempotencyKey,
    requestData?: unknown
  ): Promise<IdempotencyCheckResult> {
    const record = await this.storage.get(key.hash, key.namespace);

    // No existing record - should proceed
    if (!record) {
      return { should_proceed: true };
    }

    // Check if expired
    if (new Date(record.expires_at) < new Date()) {
      await this.storage.delete(key.hash, key.namespace);
      return { should_proceed: true };
    }

    // Check fingerprint if enabled and request data provided
    if (
      this.config.enable_fingerprinting &&
      requestData &&
      record.request_fingerprint
    ) {
      const fingerprint = this.generateFingerprint(requestData);
      if (fingerprint !== record.request_fingerprint) {
        return {
          should_proceed: false,
          existing_status: record.status,
          record,
          reason: 'Request fingerprint mismatch - possible replay attack'
        };
      }
    }

    // Handle based on status
    switch (record.status) {
      case 'completed':
        return {
          should_proceed: false,
          existing_status: 'completed',
          cached_result: record.result,
          record,
          reason: 'Operation already completed'
        };

      case 'pending':
        return {
          should_proceed: false,
          existing_status: 'pending',
          record,
          reason: 'Operation in progress'
        };

      case 'failed':
        // Allow retry of failed operations
        return { should_proceed: true, record };

      case 'expired':
        await this.storage.delete(key.hash, key.namespace);
        return { should_proceed: true };

      default:
        return { should_proceed: true };
    }
  }

  /**
   * Start tracking an idempotent operation
   */
  async start(
    key: IdempotencyKey,
    operation: string,
    options?: {
      requestData?: unknown;
      ttl_ms?: number;
      actor_id?: string;
      metadata?: Record<string, unknown>;
    }
  ): Promise<IdempotencyRecord> {
    // Check first
    const checkResult = await this.check(key, options?.requestData);

    if (!checkResult.should_proceed) {
      if (checkResult.record) {
        return checkResult.record;
      }
      throw new IdempotencyError(
        `Cannot start operation: ${checkResult.reason}`,
        key.hash
      );
    }

    // Calculate TTL
    let ttl = options?.ttl_ms ?? this.config.default_ttl_ms;
    ttl = Math.max(ttl, this.config.min_ttl_ms);
    ttl = Math.min(ttl, this.config.max_ttl_ms);

    const now = new Date();
    const record: IdempotencyRecord = {
      id: this.generateRecordId(),
      key_hash: key.hash,
      namespace: key.namespace,
      operation,
      status: 'pending',
      request_fingerprint: options?.requestData
        ? this.generateFingerprint(options.requestData)
        : '',
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      expires_at: new Date(now.getTime() + ttl).toISOString(),
      attempt_count: (checkResult.record?.attempt_count ?? 0) + 1,
      actor_id: options?.actor_id,
      metadata: options?.metadata
    };

    await this.storage.save(record);
    return record;
  }

  /**
   * Mark operation as completed successfully
   */
  async complete<T>(key: IdempotencyKey, result: T): Promise<IdempotencyRecord> {
    const record = await this.storage.get(key.hash, key.namespace);

    if (!record) {
      throw new IdempotencyError('No active idempotency record found', key.hash);
    }

    record.status = 'completed';
    record.result = result;
    record.updated_at = new Date().toISOString();

    await this.storage.update(record);
    return record;
  }

  /**
   * Mark operation as failed
   */
  async fail(
    key: IdempotencyKey,
    error: { code: string; message: string }
  ): Promise<IdempotencyRecord> {
    const record = await this.storage.get(key.hash, key.namespace);

    if (!record) {
      throw new IdempotencyError('No active idempotency record found', key.hash);
    }

    record.status = 'failed';
    record.error = error;
    record.updated_at = new Date().toISOString();

    await this.storage.update(record);
    return record;
  }

  /**
   * Clear an idempotency key (for testing or admin)
   */
  async clear(key: IdempotencyKey): Promise<void> {
    await this.storage.delete(key.hash, key.namespace);
  }

  /**
   * Cleanup expired records
   */
  async cleanup(): Promise<number> {
    return this.storage.cleanup(new Date());
  }

  /**
   * Get record by key
   */
  async getRecord(key: IdempotencyKey): Promise<IdempotencyRecord | null> {
    return this.storage.get(key.hash, key.namespace);
  }

  // ============================================================================
  // WRAPPER FOR IDEMPOTENT OPERATIONS
  // ============================================================================

  /**
   * Execute an operation with idempotency guarantees
   */
  async execute<T>(
    keyComponents: Record<string, string>,
    operation: string,
    fn: () => Promise<T>,
    options?: {
      namespace?: string;
      requestData?: unknown;
      ttl_ms?: number;
      actor_id?: string;
      metadata?: Record<string, unknown>;
    }
  ): Promise<{ result: T; cached: boolean }> {
    const key = this.generateKey(keyComponents, options?.namespace);

    // Check for existing result
    const checkResult = await this.check(key, options?.requestData);

    if (!checkResult.should_proceed) {
      if (checkResult.existing_status === 'completed' && checkResult.cached_result !== undefined) {
        return { result: checkResult.cached_result as T, cached: true };
      }

      if (checkResult.existing_status === 'pending') {
        throw new IdempotencyError('Operation already in progress', key.hash);
      }

      throw new IdempotencyError(checkResult.reason ?? 'Cannot proceed', key.hash);
    }

    // Start tracking
    await this.start(key, operation, options);

    try {
      // Execute the operation
      const result = await fn();

      // Mark complete
      await this.complete(key, result);

      return { result, cached: false };
    } catch (error) {
      // Mark failed
      await this.fail(key, {
        code: (error as Error).name ?? 'UNKNOWN_ERROR',
        message: (error as Error).message ?? 'Unknown error'
      });

      throw error;
    }
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private generateRecordId(): string {
    return `idem_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }
}

// ============================================================================
// ERROR CLASS
// ============================================================================

export class IdempotencyError extends Error {
  public readonly keyHash: string;

  constructor(message: string, keyHash: string) {
    super(message);
    this.name = 'IdempotencyError';
    this.keyHash = keyHash;
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let defaultManager: IdempotencyManager | null = null;

export function getIdempotencyManager(): IdempotencyManager {
  if (!defaultManager) {
    defaultManager = new IdempotencyManager();
  }
  return defaultManager;
}

export function setIdempotencyManager(manager: IdempotencyManager): void {
  defaultManager = manager;
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Quick idempotent execution
 */
export async function idempotent<T>(
  keyComponents: Record<string, string>,
  operation: string,
  fn: () => Promise<T>,
  options?: {
    namespace?: string;
    requestData?: unknown;
    ttl_ms?: number;
  }
): Promise<T> {
  const manager = getIdempotencyManager();
  const { result } = await manager.execute(keyComponents, operation, fn, options);
  return result;
}

/**
 * Generate a unique operation key including timestamp
 */
export function operationKey(
  operation: string,
  resourceId: string,
  additionalComponents?: Record<string, string>
): Record<string, string> {
  return {
    operation,
    resource_id: resourceId,
    ...additionalComponents
  };
}
