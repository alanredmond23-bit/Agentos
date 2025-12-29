/**
 * idempotency.ts
 * Payment-processor grade idempotency layer
 *
 * Provides exactly-once semantics for distributed operations with:
 * - Lock-based concurrent request handling
 * - Multiple storage backends (memory, Redis, PostgreSQL, Supabase)
 * - Result caching and replay
 * - Clock skew tolerance
 * - Process crash recovery
 * - Key collision prevention
 *
 * Zone: YELLOW (core infrastructure - requires tests + review)
 * Impact: A (deployment), B (revenue - prevents duplicate charges)
 */

import * as crypto from 'crypto';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Configuration for the idempotency layer
 */
export interface IdempotencyConfig {
  /** Storage backend type */
  backend: 'memory' | 'redis' | 'postgres' | 'supabase';

  /** Time-to-live for idempotency records in seconds */
  ttl_seconds: number;

  /** Prefix for all idempotency keys */
  key_prefix: string;

  /** Maximum retries for acquiring locks */
  max_retries: number;

  /** Lock timeout in seconds (for stale lock recovery) */
  lock_timeout_seconds?: number;

  /** Enable clock skew tolerance */
  clock_skew_tolerance_ms?: number;

  /** Minimum TTL to prevent too-short expirations */
  min_ttl_seconds?: number;

  /** Maximum TTL to prevent indefinite storage */
  max_ttl_seconds?: number;

  /** Enable request fingerprinting for replay defense */
  enable_fingerprinting?: boolean;

  /** Custom storage backend instance */
  storage?: IdempotencyStorage;

  /** Redis connection options (when backend is 'redis') */
  redis?: RedisConnectionOptions;

  /** PostgreSQL connection options (when backend is 'postgres') */
  postgres?: PostgresConnectionOptions;

  /** Supabase connection options (when backend is 'supabase') */
  supabase?: SupabaseConnectionOptions;
}

/**
 * Redis connection configuration
 */
export interface RedisConnectionOptions {
  host: string;
  port: number;
  password?: string;
  db?: number;
  tls?: boolean;
  cluster?: boolean;
  sentinels?: Array<{ host: string; port: number }>;
  keyPrefix?: string;
}

/**
 * PostgreSQL connection configuration
 */
export interface PostgresConnectionOptions {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean;
  poolSize?: number;
  schema?: string;
  tableName?: string;
}

/**
 * Supabase connection configuration
 */
export interface SupabaseConnectionOptions {
  url: string;
  anonKey: string;
  serviceRoleKey?: string;
  tableName?: string;
  schema?: string;
}

/**
 * Metadata about the incoming request
 */
export interface RequestMetadata {
  /** Original request body/payload fingerprint */
  request_fingerprint?: string;

  /** Actor/user who initiated the request */
  actor_id?: string;

  /** IP address of the requester */
  ip_address?: string;

  /** User agent string */
  user_agent?: string;

  /** Correlation ID for distributed tracing */
  correlation_id?: string;

  /** Session ID if applicable */
  session_id?: string;

  /** Operation being performed */
  operation: string;

  /** Additional custom metadata */
  custom?: Record<string, unknown>;
}

/**
 * Status of an idempotency record
 */
export type IdempotencyStatus =
  | 'pending'      // Operation in progress
  | 'completed'    // Successfully completed
  | 'failed'       // Failed, can be retried
  | 'expired'      // TTL exceeded
  | 'locked';      // Being processed by another request

/**
 * Stored idempotency record
 */
export interface IdempotencyRecord {
  /** Unique record identifier */
  id: string;

  /** The idempotency key (hashed) */
  key_hash: string;

  /** Original key for debugging */
  original_key: string;

  /** Key prefix/namespace */
  namespace: string;

  /** Current status */
  status: IdempotencyStatus;

  /** Request metadata */
  metadata: RequestMetadata;

  /** Stored result (if completed) */
  result?: unknown;

  /** Error information (if failed) */
  error?: IdempotencyError;

  /** Lock holder identifier */
  lock_id?: string;

  /** When the lock was acquired */
  lock_acquired_at?: string;

  /** When the lock expires */
  lock_expires_at?: string;

  /** Record creation timestamp */
  created_at: string;

  /** Last update timestamp */
  updated_at: string;

  /** When this record expires */
  expires_at: string;

  /** Number of processing attempts */
  attempt_count: number;

  /** Version for optimistic locking */
  version: number;

  /** Request fingerprint for replay detection */
  request_fingerprint?: string;

  /** Processing duration in milliseconds */
  processing_duration_ms?: number;
}

/**
 * Result from checking an idempotency key
 */
export interface IdempotencyResult {
  /** Status of the idempotency check */
  status: IdempotencyStatus;

  /** Cached result if available */
  cached_result?: unknown;

  /** The record if found */
  record?: IdempotencyRecord;

  /** Whether the caller should proceed with processing */
  should_proceed: boolean;

  /** Reason for the decision */
  reason: string;

  /** Whether this is a replay of a previous request */
  is_replay: boolean;
}

/**
 * Lock object for tracking in-progress operations
 */
export interface IdempotencyLock {
  /** Unique lock identifier */
  lock_id: string;

  /** The idempotency key */
  key: string;

  /** Hashed key */
  key_hash: string;

  /** Namespace */
  namespace: string;

  /** When the lock was acquired */
  acquired_at: Date;

  /** When the lock expires */
  expires_at: Date;

  /** Associated record ID */
  record_id: string;

  /** Whether the lock is still valid */
  is_valid: boolean;

  /** Metadata for the request */
  metadata: RequestMetadata;
}

/**
 * Error structure for failed operations
 */
export interface IdempotencyError {
  /** Error code */
  code: string;

  /** Human-readable message */
  message: string;

  /** Stack trace (sanitized) */
  stack?: string;

  /** Whether this error is retryable */
  retryable: boolean;

  /** Suggested retry delay in milliseconds */
  retry_after_ms?: number;
}

// ============================================================================
// STORAGE INTERFACE
// ============================================================================

/**
 * Storage backend interface for idempotency records
 * Implementations must provide atomic operations for consistency
 */
export interface IdempotencyStorage {
  /**
   * Get a record by key hash
   */
  get(keyHash: string, namespace: string): Promise<IdempotencyRecord | null>;

  /**
   * Create a new record with lock (atomic)
   * Returns null if record already exists
   */
  createWithLock(record: IdempotencyRecord): Promise<IdempotencyRecord | null>;

  /**
   * Update an existing record (optimistic locking)
   * Returns false if version mismatch
   */
  update(record: IdempotencyRecord, expectedVersion: number): Promise<boolean>;

  /**
   * Acquire lock on existing record
   * Returns the lock if successful, null if already locked
   */
  acquireLock(
    keyHash: string,
    namespace: string,
    lockId: string,
    expiresAt: Date
  ): Promise<IdempotencyLock | null>;

  /**
   * Release a lock
   */
  releaseLock(lockId: string): Promise<boolean>;

  /**
   * Extend a lock's expiration
   */
  extendLock(lockId: string, newExpiresAt: Date): Promise<boolean>;

  /**
   * Delete a record
   */
  delete(keyHash: string, namespace: string): Promise<boolean>;

  /**
   * Clean up expired records
   * Returns the number of records deleted
   */
  cleanup(olderThan: Date): Promise<number>;

  /**
   * Health check
   */
  ping(): Promise<boolean>;

  /**
   * Close connections
   */
  close(): Promise<void>;
}

// ============================================================================
// IN-MEMORY STORAGE IMPLEMENTATION
// ============================================================================

/**
 * In-memory storage for testing and development
 * NOT suitable for production multi-instance deployments
 */
export class InMemoryIdempotencyStorage implements IdempotencyStorage {
  private records: Map<string, IdempotencyRecord> = new Map();
  private locks: Map<string, IdempotencyLock> = new Map();
  private lockByKey: Map<string, string> = new Map(); // keyHash -> lockId

  private getStorageKey(keyHash: string, namespace: string): string {
    return `${namespace}::${keyHash}`;
  }

  async get(keyHash: string, namespace: string): Promise<IdempotencyRecord | null> {
    const key = this.getStorageKey(keyHash, namespace);
    const record = this.records.get(key);

    if (!record) return null;

    // Check if expired
    if (new Date(record.expires_at) < new Date()) {
      this.records.delete(key);
      return null;
    }

    return { ...record };
  }

  async createWithLock(record: IdempotencyRecord): Promise<IdempotencyRecord | null> {
    const key = this.getStorageKey(record.key_hash, record.namespace);

    // Check if already exists
    if (this.records.has(key)) {
      const existing = this.records.get(key)!;
      // Check if expired
      if (new Date(existing.expires_at) >= new Date()) {
        return null; // Already exists and not expired
      }
      // Expired, allow overwrite
    }

    this.records.set(key, { ...record });

    // Create lock entry
    if (record.lock_id) {
      const lock: IdempotencyLock = {
        lock_id: record.lock_id,
        key: record.original_key,
        key_hash: record.key_hash,
        namespace: record.namespace,
        acquired_at: new Date(record.lock_acquired_at!),
        expires_at: new Date(record.lock_expires_at!),
        record_id: record.id,
        is_valid: true,
        metadata: record.metadata
      };
      this.locks.set(record.lock_id, lock);
      this.lockByKey.set(key, record.lock_id);
    }

    return { ...record };
  }

  async update(record: IdempotencyRecord, expectedVersion: number): Promise<boolean> {
    const key = this.getStorageKey(record.key_hash, record.namespace);
    const existing = this.records.get(key);

    if (!existing) return false;
    if (existing.version !== expectedVersion) return false;

    this.records.set(key, { ...record, version: expectedVersion + 1 });
    return true;
  }

  async acquireLock(
    keyHash: string,
    namespace: string,
    lockId: string,
    expiresAt: Date
  ): Promise<IdempotencyLock | null> {
    const key = this.getStorageKey(keyHash, namespace);
    const record = this.records.get(key);

    if (!record) return null;

    // Check if already locked by another process
    const existingLockId = this.lockByKey.get(key);
    if (existingLockId) {
      const existingLock = this.locks.get(existingLockId);
      if (existingLock && existingLock.expires_at > new Date()) {
        return null; // Already locked and not expired
      }
      // Lock expired, clean up
      this.locks.delete(existingLockId);
    }

    // Create new lock
    const lock: IdempotencyLock = {
      lock_id: lockId,
      key: record.original_key,
      key_hash: keyHash,
      namespace,
      acquired_at: new Date(),
      expires_at: expiresAt,
      record_id: record.id,
      is_valid: true,
      metadata: record.metadata
    };

    this.locks.set(lockId, lock);
    this.lockByKey.set(key, lockId);

    // Update record with lock info
    record.lock_id = lockId;
    record.lock_acquired_at = lock.acquired_at.toISOString();
    record.lock_expires_at = expiresAt.toISOString();
    record.status = 'locked';
    record.updated_at = new Date().toISOString();
    record.version++;

    return lock;
  }

  async releaseLock(lockId: string): Promise<boolean> {
    const lock = this.locks.get(lockId);
    if (!lock) return false;

    const key = this.getStorageKey(lock.key_hash, lock.namespace);

    // Update record
    const record = this.records.get(key);
    if (record && record.lock_id === lockId) {
      record.lock_id = undefined;
      record.lock_acquired_at = undefined;
      record.lock_expires_at = undefined;
      record.updated_at = new Date().toISOString();
      record.version++;
    }

    this.locks.delete(lockId);
    this.lockByKey.delete(key);

    return true;
  }

  async extendLock(lockId: string, newExpiresAt: Date): Promise<boolean> {
    const lock = this.locks.get(lockId);
    if (!lock) return false;
    if (!lock.is_valid) return false;
    if (lock.expires_at < new Date()) return false;

    lock.expires_at = newExpiresAt;

    // Update record
    const key = this.getStorageKey(lock.key_hash, lock.namespace);
    const record = this.records.get(key);
    if (record) {
      record.lock_expires_at = newExpiresAt.toISOString();
      record.updated_at = new Date().toISOString();
    }

    return true;
  }

  async delete(keyHash: string, namespace: string): Promise<boolean> {
    const key = this.getStorageKey(keyHash, namespace);

    // Clean up any associated lock
    const lockId = this.lockByKey.get(key);
    if (lockId) {
      this.locks.delete(lockId);
      this.lockByKey.delete(key);
    }

    return this.records.delete(key);
  }

  async cleanup(olderThan: Date): Promise<number> {
    let count = 0;

    for (const [key, record] of this.records.entries()) {
      if (new Date(record.expires_at) < olderThan) {
        // Clean up associated lock
        const lockId = this.lockByKey.get(key);
        if (lockId) {
          this.locks.delete(lockId);
          this.lockByKey.delete(key);
        }

        this.records.delete(key);
        count++;
      }
    }

    // Also clean up expired locks
    for (const [lockId, lock] of this.locks.entries()) {
      if (lock.expires_at < olderThan) {
        this.locks.delete(lockId);
        const key = this.getStorageKey(lock.key_hash, lock.namespace);
        this.lockByKey.delete(key);
      }
    }

    return count;
  }

  async ping(): Promise<boolean> {
    return true;
  }

  async close(): Promise<void> {
    this.records.clear();
    this.locks.clear();
    this.lockByKey.clear();
  }

  // Test helpers
  getRecordCount(): number {
    return this.records.size;
  }

  getLockCount(): number {
    return this.locks.size;
  }
}

// ============================================================================
// REDIS STORAGE INTERFACE
// ============================================================================

/**
 * Redis storage backend interface
 * Actual implementation would use ioredis or similar
 */
export abstract class RedisIdempotencyStorage implements IdempotencyStorage {
  protected config: RedisConnectionOptions;

  constructor(config: RedisConnectionOptions) {
    this.config = config;
  }

  abstract get(keyHash: string, namespace: string): Promise<IdempotencyRecord | null>;
  abstract createWithLock(record: IdempotencyRecord): Promise<IdempotencyRecord | null>;
  abstract update(record: IdempotencyRecord, expectedVersion: number): Promise<boolean>;
  abstract acquireLock(
    keyHash: string,
    namespace: string,
    lockId: string,
    expiresAt: Date
  ): Promise<IdempotencyLock | null>;
  abstract releaseLock(lockId: string): Promise<boolean>;
  abstract extendLock(lockId: string, newExpiresAt: Date): Promise<boolean>;
  abstract delete(keyHash: string, namespace: string): Promise<boolean>;
  abstract cleanup(olderThan: Date): Promise<number>;
  abstract ping(): Promise<boolean>;
  abstract close(): Promise<void>;

  /**
   * Generate Redis key
   */
  protected getKey(keyHash: string, namespace: string): string {
    const prefix = this.config.keyPrefix ?? 'idempotency';
    return `${prefix}:${namespace}:${keyHash}`;
  }

  /**
   * Generate lock key
   */
  protected getLockKey(keyHash: string, namespace: string): string {
    const prefix = this.config.keyPrefix ?? 'idempotency';
    return `${prefix}:lock:${namespace}:${keyHash}`;
  }

  /**
   * Lua script for atomic create-with-lock
   * This ensures no race conditions when creating records
   */
  protected getCreateWithLockScript(): string {
    return `
      local key = KEYS[1]
      local lockKey = KEYS[2]
      local record = ARGV[1]
      local lockId = ARGV[2]
      local ttl = tonumber(ARGV[3])
      local lockTtl = tonumber(ARGV[4])

      -- Check if key exists
      if redis.call('EXISTS', key) == 1 then
        return nil
      end

      -- Create record
      redis.call('SET', key, record, 'EX', ttl)

      -- Create lock
      redis.call('SET', lockKey, lockId, 'EX', lockTtl)

      return record
    `;
  }
}

// ============================================================================
// POSTGRESQL STORAGE INTERFACE
// ============================================================================

/**
 * PostgreSQL storage backend interface
 * Actual implementation would use pg or similar
 */
export abstract class PostgresIdempotencyStorage implements IdempotencyStorage {
  protected config: PostgresConnectionOptions;

  constructor(config: PostgresConnectionOptions) {
    this.config = config;
  }

  abstract get(keyHash: string, namespace: string): Promise<IdempotencyRecord | null>;
  abstract createWithLock(record: IdempotencyRecord): Promise<IdempotencyRecord | null>;
  abstract update(record: IdempotencyRecord, expectedVersion: number): Promise<boolean>;
  abstract acquireLock(
    keyHash: string,
    namespace: string,
    lockId: string,
    expiresAt: Date
  ): Promise<IdempotencyLock | null>;
  abstract releaseLock(lockId: string): Promise<boolean>;
  abstract extendLock(lockId: string, newExpiresAt: Date): Promise<boolean>;
  abstract delete(keyHash: string, namespace: string): Promise<boolean>;
  abstract cleanup(olderThan: Date): Promise<number>;
  abstract ping(): Promise<boolean>;
  abstract close(): Promise<void>;

  /**
   * Get the table name with schema
   */
  protected getTableName(): string {
    const schema = this.config.schema ?? 'public';
    const table = this.config.tableName ?? 'idempotency_records';
    return `${schema}.${table}`;
  }

  /**
   * SQL for creating the idempotency table
   */
  static getCreateTableSQL(schema = 'public', tableName = 'idempotency_records'): string {
    return `
      CREATE TABLE IF NOT EXISTS ${schema}.${tableName} (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        key_hash VARCHAR(64) NOT NULL,
        original_key TEXT NOT NULL,
        namespace VARCHAR(255) NOT NULL,
        status VARCHAR(20) NOT NULL,
        metadata JSONB NOT NULL,
        result JSONB,
        error JSONB,
        lock_id UUID,
        lock_acquired_at TIMESTAMPTZ,
        lock_expires_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMPTZ NOT NULL,
        attempt_count INTEGER NOT NULL DEFAULT 0,
        version INTEGER NOT NULL DEFAULT 1,
        request_fingerprint VARCHAR(64),
        processing_duration_ms INTEGER,

        CONSTRAINT uq_key_hash_namespace UNIQUE (key_hash, namespace)
      );

      CREATE INDEX IF NOT EXISTS idx_${tableName}_expires_at
        ON ${schema}.${tableName} (expires_at);
      CREATE INDEX IF NOT EXISTS idx_${tableName}_lock_expires_at
        ON ${schema}.${tableName} (lock_expires_at)
        WHERE lock_id IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_${tableName}_status
        ON ${schema}.${tableName} (status);
    `;
  }
}

// ============================================================================
// SUPABASE STORAGE IMPLEMENTATION
// ============================================================================

/**
 * Supabase storage backend
 * Uses Supabase's PostgreSQL with RLS
 */
export class SupabaseIdempotencyStorage implements IdempotencyStorage {
  private config: SupabaseConnectionOptions;
  private tableName: string;

  constructor(config: SupabaseConnectionOptions) {
    this.config = config;
    this.tableName = config.tableName ?? 'idempotency_records';
  }

  private getHeaders(): Record<string, string> {
    const key = this.config.serviceRoleKey ?? this.config.anonKey;
    return {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    };
  }

  private async fetch(
    method: string,
    path: string,
    body?: unknown
  ): Promise<Response> {
    const url = `${this.config.url}/rest/v1/${path}`;
    const options: RequestInit = {
      method,
      headers: this.getHeaders()
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    return fetch(url, options);
  }

  async get(keyHash: string, namespace: string): Promise<IdempotencyRecord | null> {
    const query = `${this.tableName}?key_hash=eq.${keyHash}&namespace=eq.${namespace}&limit=1`;
    const response = await this.fetch('GET', query);

    if (!response.ok) return null;

    const data = await response.json() as IdempotencyRecord[];
    if (data.length === 0) return null;

    const record = data[0];

    // Check if expired
    if (new Date(record.expires_at) < new Date()) {
      await this.delete(keyHash, namespace);
      return null;
    }

    return record;
  }

  async createWithLock(record: IdempotencyRecord): Promise<IdempotencyRecord | null> {
    // Use upsert with conflict handling
    const response = await this.fetch('POST', `${this.tableName}?on_conflict=key_hash,namespace`, record);

    if (!response.ok) {
      // Check if it's a conflict (record already exists)
      if (response.status === 409) return null;
      throw new Error(`Failed to create record: ${response.statusText}`);
    }

    const data = await response.json() as IdempotencyRecord[];
    return data[0] ?? null;
  }

  async update(record: IdempotencyRecord, expectedVersion: number): Promise<boolean> {
    const query = `${this.tableName}?key_hash=eq.${record.key_hash}&namespace=eq.${record.namespace}&version=eq.${expectedVersion}`;

    const response = await this.fetch('PATCH', query, {
      ...record,
      version: expectedVersion + 1,
      updated_at: new Date().toISOString()
    });

    if (!response.ok) return false;

    const data = await response.json() as IdempotencyRecord[];
    return data.length > 0;
  }

  async acquireLock(
    keyHash: string,
    namespace: string,
    lockId: string,
    expiresAt: Date
  ): Promise<IdempotencyLock | null> {
    // Use RPC function for atomic lock acquisition
    const now = new Date();
    const query = `${this.tableName}?key_hash=eq.${keyHash}&namespace=eq.${namespace}&or=(lock_id.is.null,lock_expires_at.lt.${now.toISOString()})`;

    const response = await this.fetch('PATCH', query, {
      lock_id: lockId,
      lock_acquired_at: now.toISOString(),
      lock_expires_at: expiresAt.toISOString(),
      status: 'locked',
      updated_at: now.toISOString()
    });

    if (!response.ok) return null;

    const data = await response.json() as IdempotencyRecord[];
    if (data.length === 0) return null;

    const record = data[0];

    return {
      lock_id: lockId,
      key: record.original_key,
      key_hash: keyHash,
      namespace,
      acquired_at: now,
      expires_at: expiresAt,
      record_id: record.id,
      is_valid: true,
      metadata: record.metadata
    };
  }

  async releaseLock(lockId: string): Promise<boolean> {
    const query = `${this.tableName}?lock_id=eq.${lockId}`;

    const response = await this.fetch('PATCH', query, {
      lock_id: null,
      lock_acquired_at: null,
      lock_expires_at: null,
      updated_at: new Date().toISOString()
    });

    return response.ok;
  }

  async extendLock(lockId: string, newExpiresAt: Date): Promise<boolean> {
    const now = new Date();
    const query = `${this.tableName}?lock_id=eq.${lockId}&lock_expires_at.gt.${now.toISOString()}`;

    const response = await this.fetch('PATCH', query, {
      lock_expires_at: newExpiresAt.toISOString(),
      updated_at: now.toISOString()
    });

    if (!response.ok) return false;

    const data = await response.json() as IdempotencyRecord[];
    return data.length > 0;
  }

  async delete(keyHash: string, namespace: string): Promise<boolean> {
    const query = `${this.tableName}?key_hash=eq.${keyHash}&namespace=eq.${namespace}`;
    const response = await this.fetch('DELETE', query);
    return response.ok;
  }

  async cleanup(olderThan: Date): Promise<number> {
    const query = `${this.tableName}?expires_at=lt.${olderThan.toISOString()}`;
    const response = await this.fetch('DELETE', query);

    if (!response.ok) return 0;

    // Supabase returns deleted records with Prefer: return=representation
    const data = await response.json() as IdempotencyRecord[];
    return data.length;
  }

  async ping(): Promise<boolean> {
    try {
      const response = await this.fetch('GET', `${this.tableName}?limit=0`);
      return response.ok;
    } catch {
      return false;
    }
  }

  async close(): Promise<void> {
    // No persistent connections to close
  }
}

// ============================================================================
// IDEMPOTENCY LAYER IMPLEMENTATION
// ============================================================================

/**
 * Main idempotency layer class
 * Provides payment-processor grade reliability for exactly-once semantics
 */
export class IdempotencyLayer {
  private config: Required<Omit<IdempotencyConfig, 'redis' | 'postgres' | 'supabase' | 'storage'>> & {
    storage: IdempotencyStorage;
  };
  private storage: IdempotencyStorage;

  constructor(config: IdempotencyConfig) {
    // Initialize storage based on backend
    this.storage = config.storage ?? this.createStorage(config);

    // Set defaults
    this.config = {
      backend: config.backend,
      ttl_seconds: config.ttl_seconds,
      key_prefix: config.key_prefix,
      max_retries: config.max_retries,
      lock_timeout_seconds: config.lock_timeout_seconds ?? 30,
      clock_skew_tolerance_ms: config.clock_skew_tolerance_ms ?? 5000,
      min_ttl_seconds: config.min_ttl_seconds ?? 60,
      max_ttl_seconds: config.max_ttl_seconds ?? 86400 * 7, // 7 days
      enable_fingerprinting: config.enable_fingerprinting ?? true,
      storage: this.storage
    };
  }

  private createStorage(config: IdempotencyConfig): IdempotencyStorage {
    switch (config.backend) {
      case 'memory':
        return new InMemoryIdempotencyStorage();
      case 'supabase':
        if (!config.supabase) {
          throw new IdempotencyConfigError('Supabase configuration required for supabase backend');
        }
        return new SupabaseIdempotencyStorage(config.supabase);
      case 'redis':
        throw new IdempotencyConfigError(
          'Redis backend requires custom storage implementation. ' +
          'Provide a storage instance implementing IdempotencyStorage interface.'
        );
      case 'postgres':
        throw new IdempotencyConfigError(
          'PostgreSQL backend requires custom storage implementation. ' +
          'Provide a storage instance implementing IdempotencyStorage interface.'
        );
      default:
        throw new IdempotencyConfigError(`Unknown backend: ${config.backend}`);
    }
  }

  // ============================================================================
  // KEY GENERATION & HASHING
  // ============================================================================

  /**
   * Generate an idempotency key hash
   * Uses SHA-256 for collision resistance
   */
  generateKeyHash(key: string): string {
    const prefixedKey = `${this.config.key_prefix}:${key}`;
    return crypto.createHash('sha256').update(prefixedKey).digest('hex');
  }

  /**
   * Validate an idempotency key format
   */
  validateKey(key: string): { valid: boolean; error?: string } {
    if (!key || typeof key !== 'string') {
      return { valid: false, error: 'Key must be a non-empty string' };
    }

    if (key.length < 1 || key.length > 512) {
      return { valid: false, error: 'Key length must be between 1 and 512 characters' };
    }

    // Check for valid characters (alphanumeric, hyphens, underscores, dots)
    if (!/^[a-zA-Z0-9\-_.:]+$/.test(key)) {
      return {
        valid: false,
        error: 'Key contains invalid characters. Use alphanumeric, hyphens, underscores, colons, and dots only'
      };
    }

    return { valid: true };
  }

  /**
   * Generate a request fingerprint for replay detection
   */
  generateFingerprint(requestData: unknown): string {
    const normalized = this.normalizeForFingerprint(requestData);
    const json = JSON.stringify(normalized);
    return crypto.createHash('sha256').update(json).digest('hex').substring(0, 32);
  }

  /**
   * Normalize request data for consistent fingerprinting
   */
  private normalizeForFingerprint(data: unknown): unknown {
    if (data === null || data === undefined) return null;

    if (Array.isArray(data)) {
      return data.map(item => this.normalizeForFingerprint(item));
    }

    if (typeof data === 'object') {
      const obj = data as Record<string, unknown>;
      const sorted: Record<string, unknown> = {};

      // Sort keys for consistent hashing
      const keys = Object.keys(obj).sort();
      for (const key of keys) {
        // Skip volatile fields
        if (['timestamp', 'request_id', 'trace_id', 'nonce'].includes(key)) {
          continue;
        }
        sorted[key] = this.normalizeForFingerprint(obj[key]);
      }

      return sorted;
    }

    return data;
  }

  // ============================================================================
  // CORE OPERATIONS
  // ============================================================================

  /**
   * Check if a request was already processed
   * Returns cached result if available
   */
  async check(key: string): Promise<IdempotencyResult | null> {
    // Validate key
    const validation = this.validateKey(key);
    if (!validation.valid) {
      throw new IdempotencyValidationError(validation.error!);
    }

    const keyHash = this.generateKeyHash(key);
    const record = await this.storage.get(keyHash, this.config.key_prefix);

    if (!record) {
      return null;
    }

    // Apply clock skew tolerance for expiration check
    const now = new Date();
    const expiresAt = new Date(record.expires_at);
    const adjustedExpiry = new Date(expiresAt.getTime() + this.config.clock_skew_tolerance_ms);

    if (now > adjustedExpiry) {
      // Record has expired
      await this.storage.delete(keyHash, this.config.key_prefix);
      return null;
    }

    // Check lock expiration for stale locks
    if (record.status === 'locked' && record.lock_expires_at) {
      const lockExpires = new Date(record.lock_expires_at);
      if (now > lockExpires) {
        // Stale lock - treat as failed (retryable)
        return {
          status: 'failed',
          record,
          should_proceed: true,
          reason: 'Previous processing timed out (stale lock recovered)',
          is_replay: false
        };
      }
    }

    // Build result based on status
    switch (record.status) {
      case 'completed':
        return {
          status: 'completed',
          cached_result: record.result,
          record,
          should_proceed: false,
          reason: 'Request already completed successfully',
          is_replay: true
        };

      case 'pending':
      case 'locked':
        return {
          status: record.status,
          record,
          should_proceed: false,
          reason: 'Request is currently being processed',
          is_replay: false
        };

      case 'failed':
        return {
          status: 'failed',
          record,
          should_proceed: true,
          reason: 'Previous attempt failed, retry allowed',
          is_replay: false
        };

      default:
        return null;
    }
  }

  /**
   * Start processing a request (acquire lock)
   */
  async start(key: string, metadata: RequestMetadata): Promise<IdempotencyLock> {
    // Validate key
    const validation = this.validateKey(key);
    if (!validation.valid) {
      throw new IdempotencyValidationError(validation.error!);
    }

    const keyHash = this.generateKeyHash(key);
    const lockId = this.generateLockId();
    const now = new Date();

    // Calculate TTL (within bounds)
    let ttlSeconds = this.config.ttl_seconds;
    ttlSeconds = Math.max(ttlSeconds, this.config.min_ttl_seconds);
    ttlSeconds = Math.min(ttlSeconds, this.config.max_ttl_seconds);

    const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);
    const lockExpiresAt = new Date(now.getTime() + this.config.lock_timeout_seconds * 1000);

    // Generate request fingerprint if enabled
    const fingerprint = this.config.enable_fingerprinting && metadata.custom
      ? this.generateFingerprint(metadata.custom)
      : undefined;

    // Check for existing record
    const existing = await this.storage.get(keyHash, this.config.key_prefix);

    if (existing) {
      // Handle based on status
      switch (existing.status) {
        case 'completed':
          throw new IdempotencyConflictError(
            'Request already completed',
            key,
            existing.result
          );

        case 'pending':
        case 'locked':
          // Check if lock is stale
          if (existing.lock_expires_at && new Date(existing.lock_expires_at) < now) {
            // Stale lock - try to acquire
            const lock = await this.acquireLockWithRetry(keyHash, lockId, lockExpiresAt);
            if (lock) {
              return lock;
            }
          }
          throw new IdempotencyConflictError(
            'Request is currently being processed',
            key
          );

        case 'failed':
          // Retry allowed - try to acquire lock
          const lock = await this.acquireLockWithRetry(keyHash, lockId, lockExpiresAt);
          if (lock) {
            return lock;
          }
          throw new IdempotencyConflictError(
            'Failed to acquire lock for retry',
            key
          );

        default:
          // Unknown status - treat as conflict
          throw new IdempotencyConflictError(
            `Unexpected record status: ${existing.status}`,
            key
          );
      }
    }

    // Create new record with lock
    const record: IdempotencyRecord = {
      id: this.generateRecordId(),
      key_hash: keyHash,
      original_key: key,
      namespace: this.config.key_prefix,
      status: 'pending',
      metadata,
      lock_id: lockId,
      lock_acquired_at: now.toISOString(),
      lock_expires_at: lockExpiresAt.toISOString(),
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      attempt_count: 1,
      version: 1,
      request_fingerprint: fingerprint
    };

    const created = await this.storage.createWithLock(record);

    if (!created) {
      // Race condition - another process created the record
      // Try to check and handle
      const raceResult = await this.check(key);
      if (raceResult && !raceResult.should_proceed) {
        throw new IdempotencyConflictError(
          raceResult.reason,
          key,
          raceResult.cached_result
        );
      }

      // Retry with lock acquisition
      const lock = await this.acquireLockWithRetry(keyHash, lockId, lockExpiresAt);
      if (lock) {
        return lock;
      }

      throw new IdempotencyConflictError(
        'Failed to create record due to race condition',
        key
      );
    }

    return {
      lock_id: lockId,
      key,
      key_hash: keyHash,
      namespace: this.config.key_prefix,
      acquired_at: now,
      expires_at: lockExpiresAt,
      record_id: record.id,
      is_valid: true,
      metadata
    };
  }

  /**
   * Complete processing with result
   */
  async complete(lock: IdempotencyLock, result: unknown): Promise<void> {
    if (!lock.is_valid) {
      throw new IdempotencyLockError('Lock is no longer valid');
    }

    const record = await this.storage.get(lock.key_hash, lock.namespace);

    if (!record) {
      throw new IdempotencyLockError('Record not found');
    }

    if (record.lock_id !== lock.lock_id) {
      throw new IdempotencyLockError('Lock has been acquired by another process');
    }

    // Calculate processing duration
    const processingDuration = Date.now() - lock.acquired_at.getTime();

    // Update record
    const now = new Date();
    const updatedRecord: IdempotencyRecord = {
      ...record,
      status: 'completed',
      result,
      lock_id: undefined,
      lock_acquired_at: undefined,
      lock_expires_at: undefined,
      updated_at: now.toISOString(),
      processing_duration_ms: processingDuration
    };

    const success = await this.storage.update(updatedRecord, record.version);

    if (!success) {
      throw new IdempotencyLockError('Failed to update record - version mismatch');
    }

    // Mark lock as invalid
    lock.is_valid = false;
  }

  /**
   * Mark processing as failed (allow retry)
   */
  async fail(lock: IdempotencyLock, error: Error): Promise<void> {
    if (!lock.is_valid) {
      throw new IdempotencyLockError('Lock is no longer valid');
    }

    const record = await this.storage.get(lock.key_hash, lock.namespace);

    if (!record) {
      throw new IdempotencyLockError('Record not found');
    }

    if (record.lock_id !== lock.lock_id) {
      throw new IdempotencyLockError('Lock has been acquired by another process');
    }

    // Calculate processing duration
    const processingDuration = Date.now() - lock.acquired_at.getTime();

    // Determine if error is retryable
    const retryable = this.isRetryableError(error);

    // Update record
    const now = new Date();
    const updatedRecord: IdempotencyRecord = {
      ...record,
      status: 'failed',
      error: {
        code: error.name ?? 'UNKNOWN_ERROR',
        message: error.message ?? 'Unknown error occurred',
        stack: this.sanitizeStack(error.stack),
        retryable,
        retry_after_ms: retryable ? this.calculateRetryDelay(record.attempt_count) : undefined
      },
      lock_id: undefined,
      lock_acquired_at: undefined,
      lock_expires_at: undefined,
      updated_at: now.toISOString(),
      processing_duration_ms: processingDuration
    };

    const success = await this.storage.update(updatedRecord, record.version);

    if (!success) {
      throw new IdempotencyLockError('Failed to update record - version mismatch');
    }

    // Mark lock as invalid
    lock.is_valid = false;
  }

  /**
   * Force cleanup of expired records
   */
  async cleanup(olderThan: Date): Promise<number> {
    return this.storage.cleanup(olderThan);
  }

  // ============================================================================
  // LOCK MANAGEMENT
  // ============================================================================

  /**
   * Extend a lock's expiration
   */
  async extendLock(lock: IdempotencyLock, additionalSeconds: number): Promise<boolean> {
    if (!lock.is_valid) {
      return false;
    }

    const newExpiresAt = new Date(Date.now() + additionalSeconds * 1000);
    const success = await this.storage.extendLock(lock.lock_id, newExpiresAt);

    if (success) {
      lock.expires_at = newExpiresAt;
    }

    return success;
  }

  /**
   * Check if a lock is still valid
   */
  async isLockValid(lock: IdempotencyLock): Promise<boolean> {
    if (!lock.is_valid) {
      return false;
    }

    if (lock.expires_at < new Date()) {
      lock.is_valid = false;
      return false;
    }

    const record = await this.storage.get(lock.key_hash, lock.namespace);
    if (!record || record.lock_id !== lock.lock_id) {
      lock.is_valid = false;
      return false;
    }

    return true;
  }

  /**
   * Try to acquire lock with retries
   */
  private async acquireLockWithRetry(
    keyHash: string,
    lockId: string,
    expiresAt: Date
  ): Promise<IdempotencyLock | null> {
    for (let attempt = 0; attempt < this.config.max_retries; attempt++) {
      const lock = await this.storage.acquireLock(
        keyHash,
        this.config.key_prefix,
        lockId,
        expiresAt
      );

      if (lock) {
        return lock;
      }

      // Exponential backoff
      const delay = Math.min(100 * Math.pow(2, attempt), 1000);
      await this.sleep(delay);
    }

    return null;
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private generateRecordId(): string {
    return `idem_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  private generateLockId(): string {
    return `lock_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  private sanitizeStack(stack?: string): string | undefined {
    if (!stack) return undefined;

    // Remove potentially sensitive file paths
    return stack
      .split('\n')
      .slice(0, 5) // Only keep first 5 lines
      .map(line => {
        // Remove full paths, keep only filename
        return line.replace(/\(\/[^)]+\/([^/]+)\)/, '($1)');
      })
      .join('\n');
  }

  private isRetryableError(error: Error): boolean {
    // Common retryable error patterns
    const retryablePatterns = [
      /timeout/i,
      /ETIMEDOUT/,
      /ECONNRESET/,
      /ECONNREFUSED/,
      /EPIPE/,
      /network/i,
      /temporarily unavailable/i,
      /rate limit/i,
      /too many requests/i,
      /503/,
      /429/
    ];

    const errorString = `${error.name} ${error.message}`;
    return retryablePatterns.some(pattern => pattern.test(errorString));
  }

  private calculateRetryDelay(attemptCount: number): number {
    // Exponential backoff with jitter
    const baseDelay = 1000; // 1 second
    const maxDelay = 60000; // 1 minute
    const exponentialDelay = baseDelay * Math.pow(2, attemptCount);
    const jitter = Math.random() * 1000;

    return Math.min(exponentialDelay + jitter, maxDelay);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Get the underlying storage backend
   */
  getStorage(): IdempotencyStorage {
    return this.storage;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ healthy: boolean; latency_ms: number }> {
    const start = Date.now();
    const healthy = await this.storage.ping();
    const latency = Date.now() - start;

    return { healthy, latency_ms: latency };
  }

  /**
   * Close connections
   */
  async close(): Promise<void> {
    await this.storage.close();
  }
}

// ============================================================================
// ERROR CLASSES
// ============================================================================

/**
 * Base error class for idempotency operations
 */
export class IdempotencyBaseError extends Error {
  public readonly timestamp: string;

  constructor(message: string) {
    super(message);
    this.name = 'IdempotencyBaseError';
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Configuration error
 */
export class IdempotencyConfigError extends IdempotencyBaseError {
  constructor(message: string) {
    super(message);
    this.name = 'IdempotencyConfigError';
  }
}

/**
 * Validation error for invalid keys
 */
export class IdempotencyValidationError extends IdempotencyBaseError {
  constructor(message: string) {
    super(message);
    this.name = 'IdempotencyValidationError';
  }
}

/**
 * Conflict error when operation already exists
 */
export class IdempotencyConflictError extends IdempotencyBaseError {
  public readonly key: string;
  public readonly cached_result?: unknown;

  constructor(message: string, key: string, cached_result?: unknown) {
    super(message);
    this.name = 'IdempotencyConflictError';
    this.key = key;
    this.cached_result = cached_result;
  }
}

/**
 * Lock error for lock-related failures
 */
export class IdempotencyLockError extends IdempotencyBaseError {
  constructor(message: string) {
    super(message);
    this.name = 'IdempotencyLockError';
  }
}

// ============================================================================
// SINGLETON & FACTORY
// ============================================================================

let defaultLayer: IdempotencyLayer | null = null;

/**
 * Get the default idempotency layer instance
 */
export function getIdempotencyLayer(): IdempotencyLayer {
  if (!defaultLayer) {
    defaultLayer = new IdempotencyLayer({
      backend: 'memory',
      ttl_seconds: 86400, // 24 hours
      key_prefix: 'agentos',
      max_retries: 3
    });
  }
  return defaultLayer;
}

/**
 * Set the default idempotency layer instance
 */
export function setIdempotencyLayer(layer: IdempotencyLayer): void {
  defaultLayer = layer;
}

/**
 * Create a new idempotency layer with configuration
 */
export function createIdempotencyLayer(config: IdempotencyConfig): IdempotencyLayer {
  return new IdempotencyLayer(config);
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Execute an operation with idempotency guarantees
 */
export async function withIdempotency<T>(
  key: string,
  operation: string,
  fn: () => Promise<T>,
  options?: {
    ttl_seconds?: number;
    actor_id?: string;
    requestData?: unknown;
  }
): Promise<{ result: T; cached: boolean }> {
  const layer = getIdempotencyLayer();

  // Check for existing result
  const existing = await layer.check(key);
  if (existing && existing.status === 'completed' && existing.cached_result !== undefined) {
    return { result: existing.cached_result as T, cached: true };
  }

  // Start processing
  const lock = await layer.start(key, {
    operation,
    actor_id: options?.actor_id,
    custom: options?.requestData
  });

  try {
    const result = await fn();
    await layer.complete(lock, result);
    return { result, cached: false };
  } catch (error) {
    await layer.fail(lock, error as Error);
    throw error;
  }
}

/**
 * Generate a composite idempotency key from components
 */
export function composeKey(components: Record<string, string>): string {
  const sortedKeys = Object.keys(components).sort();
  return sortedKeys.map(k => `${k}:${components[k]}`).join('|');
}

/**
 * Generate a time-bounded idempotency key
 * Useful for preventing duplicate submissions within a time window
 */
export function timeBoundedKey(
  baseKey: string,
  windowSeconds: number
): string {
  const windowStart = Math.floor(Date.now() / (windowSeconds * 1000));
  return `${baseKey}:window:${windowStart}`;
}

// ============================================================================
// BACKWARDS COMPATIBILITY - LEGACY API
// ============================================================================

/**
 * @deprecated Use IdempotencyLayer instead
 * Legacy idempotency manager for backwards compatibility
 */
export class IdempotencyManager {
  private layer: IdempotencyLayer;

  constructor(config: {
    default_ttl_ms?: number;
    min_ttl_ms?: number;
    max_ttl_ms?: number;
    default_namespace?: string;
    storage?: IdempotencyStorage;
    enable_fingerprinting?: boolean;
  } = {}) {
    this.layer = new IdempotencyLayer({
      backend: 'memory',
      ttl_seconds: (config.default_ttl_ms ?? 86400000) / 1000,
      key_prefix: config.default_namespace ?? 'default',
      max_retries: 3,
      min_ttl_seconds: config.min_ttl_ms ? config.min_ttl_ms / 1000 : undefined,
      max_ttl_seconds: config.max_ttl_ms ? config.max_ttl_ms / 1000 : undefined,
      enable_fingerprinting: config.enable_fingerprinting,
      storage: config.storage
    });
  }

  generateKey(
    components: Record<string, string>,
    namespace?: string
  ): { hash: string; components: Record<string, string>; namespace: string } {
    const key = composeKey(components);
    return {
      hash: this.layer.generateKeyHash(key),
      components,
      namespace: namespace ?? 'default'
    };
  }

  generateFingerprint(requestData: unknown): string {
    return this.layer.generateFingerprint(requestData);
  }

  async check(
    key: { hash: string; namespace: string },
    requestData?: unknown
  ): Promise<{
    should_proceed: boolean;
    existing_status?: string;
    cached_result?: unknown;
    record?: IdempotencyRecord;
    reason?: string;
  }> {
    // Reconstruct original key from hash (best effort)
    const originalKey = `legacy:${key.hash}`;
    const result = await this.layer.check(originalKey);

    if (!result) {
      return { should_proceed: true };
    }

    return {
      should_proceed: result.should_proceed,
      existing_status: result.status,
      cached_result: result.cached_result,
      record: result.record,
      reason: result.reason
    };
  }

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
    const key = composeKey(keyComponents);
    return withIdempotency(key, operation, fn, {
      ttl_seconds: options?.ttl_ms ? options.ttl_ms / 1000 : undefined,
      actor_id: options?.actor_id,
      requestData: options?.requestData
    });
  }

  async cleanup(): Promise<number> {
    return this.layer.cleanup(new Date());
  }
}

/**
 * @deprecated Use getIdempotencyLayer instead
 */
export function getIdempotencyManager(): IdempotencyManager {
  return new IdempotencyManager();
}

/**
 * @deprecated Use withIdempotency instead
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
  const key = composeKey(keyComponents);
  const { result } = await withIdempotency(key, operation, fn, {
    ttl_seconds: options?.ttl_ms ? options.ttl_ms / 1000 : undefined,
    requestData: options?.requestData
  });
  return result;
}

/**
 * @deprecated Use composeKey instead
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
