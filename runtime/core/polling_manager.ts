/**
 * polling_manager.ts
 * Polling manager with persistence and crash recovery
 *
 * Provides robust polling infrastructure for:
 * - Long-running async operations
 * - External service status checks
 * - Condition-based wait loops
 * - Multi-instance safe distributed polling
 *
 * Zone: YELLOW (core infrastructure - requires tests + review)
 * Impact: A (deployment), C (cost - prevents resource waste)
 */

import * as crypto from 'crypto';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Polling session status
 */
export type PollingStatus =
  | 'pending'      // Session created, not yet started
  | 'polling'      // Actively polling
  | 'paused'       // Temporarily paused
  | 'completed'    // Condition met, polling finished
  | 'failed'       // Max attempts reached or error
  | 'cancelled'    // Manually cancelled
  | 'expired';     // Session expired due to timeout

/**
 * Configuration for polling behavior
 */
export interface PollingConfig {
  /** Initial interval between polls (ms) */
  interval_ms: number;

  /** Maximum number of poll attempts */
  max_attempts: number;

  /** Maximum total duration for polling (ms) */
  max_duration_ms: number;

  /** Backoff multiplier for exponential backoff */
  backoff_multiplier?: number;

  /** Maximum interval after backoff (ms) */
  max_interval_ms?: number;

  /** Jitter percentage to add randomness (0-1) */
  jitter?: number;

  /** Timeout for each individual poll attempt (ms) */
  poll_timeout_ms?: number;

  /** Whether to continue on error */
  continue_on_error?: boolean;

  /** Number of consecutive errors before failing */
  max_consecutive_errors?: number;
}

/**
 * Polling condition definition
 */
export interface PollingCondition {
  /** Type of condition check */
  type: 'status' | 'value' | 'expression' | 'custom';

  /** Field to check (for status/value types) */
  field?: string;

  /** Expected value or status */
  expected?: unknown;

  /** Comparison operator */
  operator?: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'matches';

  /** Custom expression (for expression type) */
  expression?: string;

  /** Name of custom handler (for custom type) */
  handler?: string;

  /** Additional condition parameters */
  params?: Record<string, unknown>;
}

/**
 * State of a polling session
 */
export interface PollingState {
  /** Current interval being used */
  current_interval_ms: number;

  /** Number of consecutive errors */
  consecutive_errors: number;

  /** Last poll result */
  last_result?: unknown;

  /** Last error if any */
  last_error?: PollingError;

  /** Next scheduled poll time */
  next_poll_at?: string;

  /** Lock holder ID for distributed locking */
  lock_holder_id?: string;

  /** Lock expiration time */
  lock_expires_at?: string;
}

/**
 * Polling error structure
 */
export interface PollingError {
  /** Error code */
  code: string;

  /** Error message */
  message: string;

  /** Whether this error is retryable */
  retryable: boolean;

  /** Stack trace (sanitized) */
  stack?: string;

  /** When the error occurred */
  occurred_at: string;
}

/**
 * Complete polling session record
 */
export interface PollingSession {
  /** Unique session identifier */
  id: string;

  /** Associated run ID (from orchestrator) */
  run_id: string;

  /** Associated step ID within the run */
  step_id: string;

  /** Condition to check on each poll */
  condition: PollingCondition;

  /** Polling configuration */
  config: PollingConfig;

  /** Current session state */
  state: PollingState;

  /** Session status */
  status: PollingStatus;

  /** Number of poll attempts made */
  poll_count: number;

  /** Final result when completed */
  result?: unknown;

  /** Error information if failed */
  error?: PollingError;

  /** Session creation time */
  created_at: string;

  /** Last update time */
  updated_at: string;

  /** Session start time (when polling began) */
  started_at?: string;

  /** Session end time */
  ended_at?: string;

  /** Metadata for tracking */
  metadata?: Record<string, unknown>;

  /** Version for optimistic locking */
  version: number;
}

/**
 * Session update payload
 */
export interface PollingSessionUpdate {
  status?: PollingStatus;
  state?: Partial<PollingState>;
  poll_count?: number;
  result?: unknown;
  error?: PollingError;
  metadata?: Record<string, unknown>;
}

/**
 * Distributed lock for multi-instance safety
 */
export interface PollingLock {
  /** Lock identifier */
  lock_id: string;

  /** Session being locked */
  session_id: string;

  /** Instance that holds the lock */
  holder_id: string;

  /** When lock was acquired */
  acquired_at: Date;

  /** When lock expires */
  expires_at: Date;

  /** Whether lock is still valid */
  is_valid: boolean;
}

// ============================================================================
// STORAGE INTERFACE
// ============================================================================

/**
 * Storage backend interface for polling sessions
 * Implementations: memory, Redis, PostgreSQL
 */
export interface PollingStorage {
  /**
   * Create a new polling session
   */
  create(session: PollingSession): Promise<PollingSession>;

  /**
   * Get a session by ID
   */
  get(id: string): Promise<PollingSession | null>;

  /**
   * Update an existing session (optimistic locking)
   */
  update(
    id: string,
    updates: PollingSessionUpdate,
    expectedVersion: number
  ): Promise<boolean>;

  /**
   * Delete a session
   */
  delete(id: string): Promise<boolean>;

  /**
   * List sessions by status
   */
  listByStatus(status: PollingStatus): Promise<PollingSession[]>;

  /**
   * List sessions by run ID
   */
  listByRunId(runId: string): Promise<PollingSession[]>;

  /**
   * Find sessions ready for polling
   * (status=polling, next_poll_at <= now, no active lock or expired lock)
   */
  findReadyForPolling(limit?: number): Promise<PollingSession[]>;

  /**
   * Acquire distributed lock on a session
   */
  acquireLock(
    sessionId: string,
    holderId: string,
    durationMs: number
  ): Promise<PollingLock | null>;

  /**
   * Release a lock
   */
  releaseLock(lockId: string, holderId: string): Promise<boolean>;

  /**
   * Extend a lock's duration
   */
  extendLock(lockId: string, holderId: string, additionalMs: number): Promise<boolean>;

  /**
   * Clean up expired sessions
   */
  cleanup(maxAgeMs: number): Promise<number>;

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
 * In-memory storage for polling sessions
 * Suitable for single-instance deployments and testing
 */
export class InMemoryPollingStorage implements PollingStorage {
  private sessions: Map<string, PollingSession> = new Map();
  private locks: Map<string, PollingLock> = new Map();
  private sessionLocks: Map<string, string> = new Map(); // sessionId -> lockId

  async create(session: PollingSession): Promise<PollingSession> {
    if (this.sessions.has(session.id)) {
      throw new PollingStorageError(
        `Session ${session.id} already exists`,
        'SESSION_EXISTS'
      );
    }

    const storedSession = { ...session };
    this.sessions.set(session.id, storedSession);

    return { ...storedSession };
  }

  async get(id: string): Promise<PollingSession | null> {
    const session = this.sessions.get(id);
    if (!session) return null;

    return { ...session };
  }

  async update(
    id: string,
    updates: PollingSessionUpdate,
    expectedVersion: number
  ): Promise<boolean> {
    const session = this.sessions.get(id);
    if (!session) return false;

    if (session.version !== expectedVersion) {
      return false; // Optimistic lock failed
    }

    // Apply updates
    const updatedSession: PollingSession = {
      ...session,
      ...updates,
      state: updates.state
        ? { ...session.state, ...updates.state }
        : session.state,
      metadata: updates.metadata
        ? { ...session.metadata, ...updates.metadata }
        : session.metadata,
      updated_at: new Date().toISOString(),
      version: expectedVersion + 1
    };

    // Handle status transitions
    if (updates.status) {
      if (updates.status === 'polling' && !session.started_at) {
        updatedSession.started_at = new Date().toISOString();
      }
      if (['completed', 'failed', 'cancelled', 'expired'].includes(updates.status)) {
        updatedSession.ended_at = new Date().toISOString();
      }
    }

    this.sessions.set(id, updatedSession);
    return true;
  }

  async delete(id: string): Promise<boolean> {
    // Clean up associated lock
    const lockId = this.sessionLocks.get(id);
    if (lockId) {
      this.locks.delete(lockId);
      this.sessionLocks.delete(id);
    }

    return this.sessions.delete(id);
  }

  async listByStatus(status: PollingStatus): Promise<PollingSession[]> {
    const results: PollingSession[] = [];

    for (const session of this.sessions.values()) {
      if (session.status === status) {
        results.push({ ...session });
      }
    }

    return results.sort((a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }

  async listByRunId(runId: string): Promise<PollingSession[]> {
    const results: PollingSession[] = [];

    for (const session of this.sessions.values()) {
      if (session.run_id === runId) {
        results.push({ ...session });
      }
    }

    return results;
  }

  async findReadyForPolling(limit: number = 100): Promise<PollingSession[]> {
    const now = new Date();
    const results: PollingSession[] = [];

    for (const session of this.sessions.values()) {
      if (session.status !== 'polling') continue;

      // Check if next poll time has passed
      if (session.state.next_poll_at) {
        const nextPoll = new Date(session.state.next_poll_at);
        if (nextPoll > now) continue;
      }

      // Check if lock is held by another process
      const lockId = this.sessionLocks.get(session.id);
      if (lockId) {
        const lock = this.locks.get(lockId);
        if (lock && lock.expires_at > now) continue; // Lock still active
      }

      results.push({ ...session });

      if (results.length >= limit) break;
    }

    return results;
  }

  async acquireLock(
    sessionId: string,
    holderId: string,
    durationMs: number
  ): Promise<PollingLock | null> {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const now = new Date();

    // Check for existing lock
    const existingLockId = this.sessionLocks.get(sessionId);
    if (existingLockId) {
      const existingLock = this.locks.get(existingLockId);
      if (existingLock && existingLock.expires_at > now) {
        // Lock is still active
        if (existingLock.holder_id === holderId) {
          // Same holder - extend lock
          existingLock.expires_at = new Date(now.getTime() + durationMs);
          return { ...existingLock };
        }
        return null; // Lock held by another process
      }
      // Expired lock - clean up
      this.locks.delete(existingLockId);
    }

    // Create new lock
    const lock: PollingLock = {
      lock_id: `lock_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      session_id: sessionId,
      holder_id: holderId,
      acquired_at: now,
      expires_at: new Date(now.getTime() + durationMs),
      is_valid: true
    };

    this.locks.set(lock.lock_id, lock);
    this.sessionLocks.set(sessionId, lock.lock_id);

    // Update session with lock info
    session.state.lock_holder_id = holderId;
    session.state.lock_expires_at = lock.expires_at.toISOString();
    session.updated_at = now.toISOString();

    return { ...lock };
  }

  async releaseLock(lockId: string, holderId: string): Promise<boolean> {
    const lock = this.locks.get(lockId);
    if (!lock) return false;

    if (lock.holder_id !== holderId) return false;

    // Update session
    const session = this.sessions.get(lock.session_id);
    if (session) {
      session.state.lock_holder_id = undefined;
      session.state.lock_expires_at = undefined;
      session.updated_at = new Date().toISOString();
    }

    this.sessionLocks.delete(lock.session_id);
    this.locks.delete(lockId);
    lock.is_valid = false;

    return true;
  }

  async extendLock(
    lockId: string,
    holderId: string,
    additionalMs: number
  ): Promise<boolean> {
    const lock = this.locks.get(lockId);
    if (!lock) return false;

    if (lock.holder_id !== holderId) return false;

    const now = new Date();
    if (lock.expires_at < now) return false; // Already expired

    lock.expires_at = new Date(lock.expires_at.getTime() + additionalMs);

    // Update session
    const session = this.sessions.get(lock.session_id);
    if (session) {
      session.state.lock_expires_at = lock.expires_at.toISOString();
      session.updated_at = now.toISOString();
    }

    return true;
  }

  async cleanup(maxAgeMs: number): Promise<number> {
    const cutoff = new Date(Date.now() - maxAgeMs);
    let count = 0;

    for (const [id, session] of this.sessions) {
      const endedAt = session.ended_at ? new Date(session.ended_at) : null;

      // Clean up completed/failed/cancelled sessions past retention
      if (
        ['completed', 'failed', 'cancelled', 'expired'].includes(session.status) &&
        endedAt &&
        endedAt < cutoff
      ) {
        await this.delete(id);
        count++;
        continue;
      }

      // Clean up sessions that have been running too long (expired)
      if (session.status === 'polling' && session.started_at) {
        const startedAt = new Date(session.started_at);
        const maxDuration = session.config.max_duration_ms;
        if (Date.now() - startedAt.getTime() > maxDuration) {
          session.status = 'expired';
          session.ended_at = new Date().toISOString();
          session.updated_at = new Date().toISOString();
          session.error = {
            code: 'SESSION_EXPIRED',
            message: `Polling session exceeded max duration of ${maxDuration}ms`,
            retryable: false,
            occurred_at: new Date().toISOString()
          };
          count++;
        }
      }
    }

    // Clean up expired locks
    const now = new Date();
    for (const [lockId, lock] of this.locks) {
      if (lock.expires_at < now) {
        await this.releaseLock(lockId, lock.holder_id);
      }
    }

    return count;
  }

  async ping(): Promise<boolean> {
    return true;
  }

  async close(): Promise<void> {
    this.sessions.clear();
    this.locks.clear();
    this.sessionLocks.clear();
  }

  // Test helpers
  getSessionCount(): number {
    return this.sessions.size;
  }

  getLockCount(): number {
    return this.locks.size;
  }
}

// ============================================================================
// POLLING MANAGER
// ============================================================================

/**
 * Configuration for PollingManager
 */
export interface PollingManagerConfig {
  /** Storage backend */
  storage?: PollingStorage;

  /** Instance ID for distributed locking */
  instance_id?: string;

  /** Default lock duration (ms) */
  default_lock_duration_ms?: number;

  /** Poll executor for condition checks */
  executor?: PollingExecutor;

  /** Enable automatic cleanup */
  enable_auto_cleanup?: boolean;

  /** Cleanup interval (ms) */
  cleanup_interval_ms?: number;

  /** Maximum session age for cleanup (ms) */
  max_session_age_ms?: number;
}

/**
 * Executor interface for running poll checks
 */
export interface PollingExecutor {
  /**
   * Execute a poll and check condition
   * Returns the result of the poll and whether condition is met
   */
  execute(session: PollingSession): Promise<{
    result: unknown;
    conditionMet: boolean;
    error?: Error;
  }>;
}

/**
 * Default polling executor with basic condition checking
 */
export class DefaultPollingExecutor implements PollingExecutor {
  async execute(session: PollingSession): Promise<{
    result: unknown;
    conditionMet: boolean;
    error?: Error;
  }> {
    // This is a placeholder - real implementation would call external services
    // For now, simulate based on poll count
    const condition = session.condition;
    let conditionMet = false;

    switch (condition.type) {
      case 'status':
        // Check if value matches expected status
        conditionMet = session.state.last_result === condition.expected;
        break;

      case 'value':
        // Check field value against expected
        if (session.state.last_result && typeof session.state.last_result === 'object') {
          const value = (session.state.last_result as Record<string, unknown>)[condition.field ?? ''];
          conditionMet = this.compareValues(value, condition.expected, condition.operator ?? 'eq');
        }
        break;

      case 'expression':
        // Expression evaluation would go here
        conditionMet = false;
        break;

      case 'custom':
        // Custom handler would be called here
        conditionMet = false;
        break;
    }

    return {
      result: session.state.last_result,
      conditionMet
    };
  }

  private compareValues(value: unknown, expected: unknown, operator: string): boolean {
    switch (operator) {
      case 'eq':
        return value === expected;
      case 'neq':
        return value !== expected;
      case 'gt':
        return (value as number) > (expected as number);
      case 'gte':
        return (value as number) >= (expected as number);
      case 'lt':
        return (value as number) < (expected as number);
      case 'lte':
        return (value as number) <= (expected as number);
      case 'contains':
        return String(value).includes(String(expected));
      case 'matches':
        return new RegExp(String(expected)).test(String(value));
      default:
        return false;
    }
  }
}

/**
 * Main polling manager class
 * Handles session lifecycle, distributed locking, and crash recovery
 */
export class PollingManager {
  private config: Required<PollingManagerConfig>;
  private storage: PollingStorage;
  private executor: PollingExecutor;
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(config: PollingManagerConfig = {}) {
    this.storage = config.storage ?? new InMemoryPollingStorage();
    this.executor = config.executor ?? new DefaultPollingExecutor();

    this.config = {
      storage: this.storage,
      instance_id: config.instance_id ?? `instance_${crypto.randomBytes(4).toString('hex')}`,
      default_lock_duration_ms: config.default_lock_duration_ms ?? 30000,
      executor: this.executor,
      enable_auto_cleanup: config.enable_auto_cleanup ?? true,
      cleanup_interval_ms: config.cleanup_interval_ms ?? 60000,
      max_session_age_ms: config.max_session_age_ms ?? 86400000 // 24 hours
    };

    if (this.config.enable_auto_cleanup) {
      this.startCleanupTimer();
    }
  }

  // ============================================================================
  // SESSION LIFECYCLE
  // ============================================================================

  /**
   * Start a new polling session
   */
  async startPolling(params: {
    run_id: string;
    step_id: string;
    condition: PollingCondition;
    config: Partial<PollingConfig>;
    metadata?: Record<string, unknown>;
  }): Promise<PollingSession> {
    // Build config with defaults
    const config: PollingConfig = {
      interval_ms: params.config.interval_ms ?? 1000,
      max_attempts: params.config.max_attempts ?? 100,
      max_duration_ms: params.config.max_duration_ms ?? 300000,
      backoff_multiplier: params.config.backoff_multiplier ?? 1.5,
      max_interval_ms: params.config.max_interval_ms ?? 30000,
      jitter: params.config.jitter ?? 0.1,
      poll_timeout_ms: params.config.poll_timeout_ms ?? 5000,
      continue_on_error: params.config.continue_on_error ?? true,
      max_consecutive_errors: params.config.max_consecutive_errors ?? 3
    };

    const now = new Date();
    const session: PollingSession = {
      id: this.generateSessionId(),
      run_id: params.run_id,
      step_id: params.step_id,
      condition: params.condition,
      config,
      state: {
        current_interval_ms: config.interval_ms,
        consecutive_errors: 0,
        next_poll_at: now.toISOString()
      },
      status: 'polling',
      poll_count: 0,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      started_at: now.toISOString(),
      metadata: params.metadata,
      version: 1
    };

    const created = await this.storage.create(session);

    return created;
  }

  /**
   * Get a polling session by ID
   */
  async getSession(id: string): Promise<PollingSession | null> {
    return this.storage.get(id);
  }

  /**
   * Update a polling session
   */
  async updateSession(
    id: string,
    updates: PollingSessionUpdate
  ): Promise<boolean> {
    const session = await this.storage.get(id);
    if (!session) {
      throw new PollingManagerError(
        `Session ${id} not found`,
        'SESSION_NOT_FOUND'
      );
    }

    return this.storage.update(id, updates, session.version);
  }

  /**
   * Cancel an active polling session
   */
  async cancelPolling(id: string, reason?: string): Promise<boolean> {
    const session = await this.storage.get(id);
    if (!session) {
      throw new PollingManagerError(
        `Session ${id} not found`,
        'SESSION_NOT_FOUND'
      );
    }

    if (!['pending', 'polling', 'paused'].includes(session.status)) {
      return false; // Already in terminal state
    }

    const updates: PollingSessionUpdate = {
      status: 'cancelled',
      metadata: {
        ...session.metadata,
        cancel_reason: reason
      }
    };

    return this.storage.update(id, updates, session.version);
  }

  /**
   * Resume a polling session after crash/pause
   */
  async resumePolling(id: string): Promise<PollingSession | null> {
    const session = await this.storage.get(id);
    if (!session) {
      throw new PollingManagerError(
        `Session ${id} not found`,
        'SESSION_NOT_FOUND'
      );
    }

    // Only resume paused or crashed (polling with expired lock) sessions
    if (session.status === 'paused') {
      const updates: PollingSessionUpdate = {
        status: 'polling',
        state: {
          next_poll_at: new Date().toISOString()
        }
      };

      await this.storage.update(id, updates, session.version);
      return this.storage.get(id);
    }

    // Check if this is a crashed session (polling but lock expired)
    if (session.status === 'polling' && session.state.lock_expires_at) {
      const lockExpires = new Date(session.state.lock_expires_at);
      if (lockExpires < new Date()) {
        // Lock expired - session can be resumed
        const updates: PollingSessionUpdate = {
          state: {
            lock_holder_id: undefined,
            lock_expires_at: undefined,
            next_poll_at: new Date().toISOString()
          }
        };

        await this.storage.update(id, updates, session.version);
        return this.storage.get(id);
      }
    }

    return session;
  }

  /**
   * List all active (polling/paused) sessions
   */
  async listActiveSessions(): Promise<PollingSession[]> {
    const polling = await this.storage.listByStatus('polling');
    const paused = await this.storage.listByStatus('paused');
    const pending = await this.storage.listByStatus('pending');

    return [...polling, ...paused, ...pending];
  }

  /**
   * List sessions for a specific run
   */
  async listSessionsByRun(runId: string): Promise<PollingSession[]> {
    return this.storage.listByRunId(runId);
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpired(maxAgeMs?: number): Promise<number> {
    const age = maxAgeMs ?? this.config.max_session_age_ms;
    return this.storage.cleanup(age);
  }

  // ============================================================================
  // POLLING EXECUTION
  // ============================================================================

  /**
   * Execute a single poll for a session
   * Returns whether the session is complete
   */
  async executePoll(id: string): Promise<{
    complete: boolean;
    result?: unknown;
    error?: PollingError;
  }> {
    const session = await this.storage.get(id);
    if (!session) {
      throw new PollingManagerError(
        `Session ${id} not found`,
        'SESSION_NOT_FOUND'
      );
    }

    if (session.status !== 'polling') {
      return { complete: true };
    }

    // Check max attempts
    if (session.poll_count >= session.config.max_attempts) {
      const error: PollingError = {
        code: 'MAX_ATTEMPTS_REACHED',
        message: `Maximum polling attempts (${session.config.max_attempts}) reached`,
        retryable: false,
        occurred_at: new Date().toISOString()
      };

      await this.storage.update(id, {
        status: 'failed',
        error
      }, session.version);

      return { complete: true, error };
    }

    // Check max duration
    if (session.started_at) {
      const elapsed = Date.now() - new Date(session.started_at).getTime();
      if (elapsed >= session.config.max_duration_ms) {
        const error: PollingError = {
          code: 'MAX_DURATION_EXCEEDED',
          message: `Maximum polling duration (${session.config.max_duration_ms}ms) exceeded`,
          retryable: false,
          occurred_at: new Date().toISOString()
        };

        await this.storage.update(id, {
          status: 'expired',
          error
        }, session.version);

        return { complete: true, error };
      }
    }

    // Acquire lock
    const lock = await this.storage.acquireLock(
      id,
      this.config.instance_id,
      this.config.default_lock_duration_ms
    );

    if (!lock) {
      // Another instance is processing this session
      return { complete: false };
    }

    try {
      // Execute the poll
      const pollResult = await this.executor.execute(session);

      // Calculate next interval with backoff and jitter
      let nextInterval = session.state.current_interval_ms;
      if (!pollResult.conditionMet && !pollResult.error) {
        nextInterval = Math.min(
          nextInterval * (session.config.backoff_multiplier ?? 1),
          session.config.max_interval_ms ?? 30000
        );

        // Add jitter
        const jitter = session.config.jitter ?? 0;
        if (jitter > 0) {
          const jitterAmount = nextInterval * jitter * (Math.random() * 2 - 1);
          nextInterval = Math.max(100, nextInterval + jitterAmount);
        }
      }

      // Update session
      const updates: PollingSessionUpdate = {
        poll_count: session.poll_count + 1,
        state: {
          current_interval_ms: nextInterval,
          last_result: pollResult.result,
          consecutive_errors: pollResult.error ? session.state.consecutive_errors + 1 : 0,
          next_poll_at: new Date(Date.now() + nextInterval).toISOString()
        }
      };

      if (pollResult.error) {
        updates.state!.last_error = {
          code: pollResult.error.name ?? 'POLL_ERROR',
          message: pollResult.error.message,
          retryable: session.config.continue_on_error ?? true,
          occurred_at: new Date().toISOString()
        };

        // Check max consecutive errors
        if (
          session.state.consecutive_errors + 1 >=
          (session.config.max_consecutive_errors ?? 3)
        ) {
          updates.status = 'failed';
          updates.error = {
            code: 'MAX_CONSECUTIVE_ERRORS',
            message: `Maximum consecutive errors (${session.config.max_consecutive_errors}) reached`,
            retryable: false,
            occurred_at: new Date().toISOString()
          };

          await this.storage.update(id, updates, session.version);
          return { complete: true, error: updates.error };
        }
      }

      if (pollResult.conditionMet) {
        updates.status = 'completed';
        updates.result = pollResult.result;

        await this.storage.update(id, updates, session.version);
        return { complete: true, result: pollResult.result };
      }

      await this.storage.update(id, updates, session.version);
      return { complete: false };

    } finally {
      // Release lock
      await this.storage.releaseLock(lock.lock_id, this.config.instance_id);
    }
  }

  /**
   * Find and process sessions ready for polling
   */
  async processReadySessions(limit: number = 10): Promise<{
    processed: number;
    completed: number;
    failed: number;
  }> {
    const sessions = await this.storage.findReadyForPolling(limit);
    let processed = 0;
    let completed = 0;
    let failed = 0;

    for (const session of sessions) {
      try {
        const result = await this.executePoll(session.id);
        processed++;

        if (result.complete) {
          if (result.error) {
            failed++;
          } else {
            completed++;
          }
        }
      } catch (error) {
        // Log error but continue processing other sessions
        console.error(`Error processing session ${session.id}:`, error);
      }
    }

    return { processed, completed, failed };
  }

  // ============================================================================
  // DISTRIBUTED LOCKING
  // ============================================================================

  /**
   * Acquire a lock on a session
   */
  async acquireLock(
    sessionId: string,
    durationMs?: number
  ): Promise<PollingLock | null> {
    return this.storage.acquireLock(
      sessionId,
      this.config.instance_id,
      durationMs ?? this.config.default_lock_duration_ms
    );
  }

  /**
   * Release a lock
   */
  async releaseLock(lockId: string): Promise<boolean> {
    return this.storage.releaseLock(lockId, this.config.instance_id);
  }

  /**
   * Extend a lock's duration
   */
  async extendLock(lockId: string, additionalMs: number): Promise<boolean> {
    return this.storage.extendLock(lockId, this.config.instance_id, additionalMs);
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    return `poll_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  /**
   * Start cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(async () => {
      try {
        await this.cleanupExpired();
      } catch (error) {
        console.error('Error during polling cleanup:', error);
      }
    }, this.config.cleanup_interval_ms);
  }

  /**
   * Stop cleanup timer
   */
  stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Get manager statistics
   */
  async getStats(): Promise<{
    active_sessions: number;
    completed_sessions: number;
    failed_sessions: number;
    pending_sessions: number;
  }> {
    const polling = await this.storage.listByStatus('polling');
    const completed = await this.storage.listByStatus('completed');
    const failed = await this.storage.listByStatus('failed');
    const pending = await this.storage.listByStatus('pending');

    return {
      active_sessions: polling.length,
      completed_sessions: completed.length,
      failed_sessions: failed.length,
      pending_sessions: pending.length
    };
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    latency_ms: number;
    instance_id: string;
  }> {
    const start = Date.now();
    const healthy = await this.storage.ping();
    const latency = Date.now() - start;

    return {
      healthy,
      latency_ms: latency,
      instance_id: this.config.instance_id
    };
  }

  /**
   * Close manager and clean up resources
   */
  async close(): Promise<void> {
    this.stopCleanupTimer();
    await this.storage.close();
  }

  /**
   * Get the storage instance
   */
  getStorage(): PollingStorage {
    return this.storage;
  }

  /**
   * Get the instance ID
   */
  getInstanceId(): string {
    return this.config.instance_id;
  }
}

// ============================================================================
// ERROR CLASSES
// ============================================================================

/**
 * Base error for polling operations
 */
export class PollingBaseError extends Error {
  public readonly timestamp: string;

  constructor(message: string) {
    super(message);
    this.name = 'PollingBaseError';
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Error from polling manager operations
 */
export class PollingManagerError extends PollingBaseError {
  public readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'PollingManagerError';
    this.code = code;
  }
}

/**
 * Error from storage operations
 */
export class PollingStorageError extends PollingBaseError {
  public readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'PollingStorageError';
    this.code = code;
  }
}

// ============================================================================
// SINGLETON & FACTORY
// ============================================================================

let defaultManager: PollingManager | null = null;

/**
 * Get the default polling manager instance
 */
export function getPollingManager(): PollingManager {
  if (!defaultManager) {
    defaultManager = new PollingManager();
  }
  return defaultManager;
}

/**
 * Set the default polling manager instance
 */
export function setPollingManager(manager: PollingManager): void {
  defaultManager = manager;
}

/**
 * Create a new polling manager with configuration
 */
export function createPollingManager(config: PollingManagerConfig): PollingManager {
  return new PollingManager(config);
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Poll until a condition is met
 */
export async function pollUntil<T>(
  checkFn: () => Promise<{ done: boolean; result?: T }>,
  options?: Partial<PollingConfig>
): Promise<T> {
  const config: PollingConfig = {
    interval_ms: options?.interval_ms ?? 1000,
    max_attempts: options?.max_attempts ?? 100,
    max_duration_ms: options?.max_duration_ms ?? 300000,
    backoff_multiplier: options?.backoff_multiplier ?? 1,
    max_interval_ms: options?.max_interval_ms ?? 10000,
    jitter: options?.jitter ?? 0,
    poll_timeout_ms: options?.poll_timeout_ms ?? 5000,
    continue_on_error: options?.continue_on_error ?? false,
    max_consecutive_errors: options?.max_consecutive_errors ?? 3
  };

  let attempts = 0;
  let interval = config.interval_ms;
  const startTime = Date.now();

  while (attempts < config.max_attempts) {
    // Check duration
    if (Date.now() - startTime >= config.max_duration_ms) {
      throw new PollingManagerError(
        `Polling exceeded max duration of ${config.max_duration_ms}ms`,
        'MAX_DURATION_EXCEEDED'
      );
    }

    try {
      const result = await checkFn();

      if (result.done) {
        return result.result as T;
      }
    } catch (error) {
      if (!config.continue_on_error) {
        throw error;
      }
    }

    attempts++;

    // Wait for next interval
    await sleep(interval);

    // Apply backoff
    interval = Math.min(
      interval * (config.backoff_multiplier ?? 1),
      config.max_interval_ms ?? 10000
    );

    // Add jitter
    if (config.jitter && config.jitter > 0) {
      const jitterAmount = interval * config.jitter * (Math.random() * 2 - 1);
      interval = Math.max(100, interval + jitterAmount);
    }
  }

  throw new PollingManagerError(
    `Polling exceeded max attempts of ${config.max_attempts}`,
    'MAX_ATTEMPTS_EXCEEDED'
  );
}

/**
 * Wait for a specific status
 */
export async function waitForStatus<T extends { status: string }>(
  fetchFn: () => Promise<T>,
  expectedStatus: string | string[],
  options?: Partial<PollingConfig>
): Promise<T> {
  const statuses = Array.isArray(expectedStatus) ? expectedStatus : [expectedStatus];

  return pollUntil(async () => {
    const result = await fetchFn();
    return {
      done: statuses.includes(result.status),
      result
    };
  }, options);
}

/**
 * Helper sleep function
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
