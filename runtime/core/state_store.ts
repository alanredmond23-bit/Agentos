/**
 * state_store.ts
 * File-based state store with immutable audit trail
 * Patterns from stevie_schema.sql adapted for file-based storage
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// ============================================================================
// TYPES
// ============================================================================

export interface StateEntry<T = unknown> {
  id: string;
  key: string;
  value: T;
  version: number;
  environment: string;
  created_at: string;
  created_by: string;
  checksum: string;
  superseded_at?: string;
  superseded_by?: string;
  tags: Record<string, string>;
  ttl?: number; // milliseconds
}

export interface StateAuditEntry {
  id: string;
  state_id: string;
  action: 'READ' | 'CREATE' | 'SUPERSEDE' | 'ROLLBACK' | 'DELETE';
  actor: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface StateStoreConfig {
  base_path: string;
  environment?: string;
  actor?: string;
  enable_audit?: boolean;
  enable_cache?: boolean;
  cache_ttl_ms?: number;
}

export interface StateQuery {
  key?: string;
  environment?: string;
  tags?: Record<string, string>;
  include_superseded?: boolean;
  limit?: number;
  offset?: number;
}

// ============================================================================
// STATE STORE IMPLEMENTATION
// ============================================================================

export class StateStore {
  private config: Required<StateStoreConfig>;
  private cache: Map<string, { entry: StateEntry; expires_at: number }> = new Map();
  private stateDir: string;
  private auditDir: string;

  constructor(config: StateStoreConfig) {
    this.config = {
      base_path: config.base_path,
      environment: config.environment ?? 'production',
      actor: config.actor ?? 'system',
      enable_audit: config.enable_audit ?? true,
      enable_cache: config.enable_cache ?? true,
      cache_ttl_ms: config.cache_ttl_ms ?? 60000 // 1 minute default
    };

    this.stateDir = path.join(this.config.base_path, 'state');
    this.auditDir = path.join(this.config.base_path, 'audit');

    this.ensureDirectories();
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  /**
   * Get the current (non-superseded) value for a key
   */
  async get<T = unknown>(key: string, environment?: string): Promise<T | null> {
    const env = environment ?? this.config.environment;
    const cacheKey = `${env}:${key}`;

    // Check cache first
    if (this.config.enable_cache) {
      const cached = this.cache.get(cacheKey);
      if (cached && cached.expires_at > Date.now()) {
        await this.logAudit(cached.entry.id, 'READ', { cached: true });
        return cached.entry.value as T;
      }
    }

    // Find current entry
    const entry = await this.findCurrentEntry<T>(key, env);
    if (!entry) {
      return null;
    }

    // Check TTL
    if (entry.ttl && Date.now() > new Date(entry.created_at).getTime() + entry.ttl) {
      return null;
    }

    // Update cache
    if (this.config.enable_cache) {
      this.cache.set(cacheKey, {
        entry,
        expires_at: Date.now() + this.config.cache_ttl_ms
      });
    }

    await this.logAudit(entry.id, 'READ', { cached: false });
    return entry.value;
  }

  /**
   * Put a new value (immutable - creates new version, supersedes old)
   */
  async put<T = unknown>(
    key: string,
    value: T,
    options?: {
      environment?: string;
      actor?: string;
      tags?: Record<string, string>;
      ttl?: number;
    }
  ): Promise<StateEntry<T>> {
    const env = options?.environment ?? this.config.environment;
    const actor = options?.actor ?? this.config.actor;

    // Get current version
    const currentEntry = await this.findCurrentEntry(key, env);
    const newVersion = currentEntry ? currentEntry.version + 1 : 1;

    // Calculate checksum
    const checksum = this.calculateChecksum(value);

    // Create new entry
    const newEntry: StateEntry<T> = {
      id: this.generateId(),
      key,
      value,
      version: newVersion,
      environment: env,
      created_at: new Date().toISOString(),
      created_by: actor,
      checksum,
      tags: options?.tags ?? {},
      ttl: options?.ttl
    };

    // Write new entry
    await this.writeEntry(newEntry);

    // Supersede old entry
    if (currentEntry) {
      currentEntry.superseded_at = newEntry.created_at;
      currentEntry.superseded_by = newEntry.id;
      await this.writeEntry(currentEntry);
      await this.logAudit(currentEntry.id, 'SUPERSEDE', { new_id: newEntry.id });
    }

    // Log creation
    await this.logAudit(newEntry.id, 'CREATE');

    // Update cache
    const cacheKey = `${env}:${key}`;
    if (this.config.enable_cache) {
      this.cache.set(cacheKey, {
        entry: newEntry,
        expires_at: Date.now() + this.config.cache_ttl_ms
      });
    }

    return newEntry;
  }

  /**
   * Delete a key (marks as superseded with no replacement)
   */
  async delete(
    key: string,
    options?: { environment?: string; actor?: string }
  ): Promise<boolean> {
    const env = options?.environment ?? this.config.environment;
    const actor = options?.actor ?? this.config.actor;

    const currentEntry = await this.findCurrentEntry(key, env);
    if (!currentEntry) {
      return false;
    }

    currentEntry.superseded_at = new Date().toISOString();
    await this.writeEntry(currentEntry);
    await this.logAudit(currentEntry.id, 'DELETE', { actor });

    // Remove from cache
    const cacheKey = `${env}:${key}`;
    this.cache.delete(cacheKey);

    return true;
  }

  /**
   * Get history of all versions for a key
   */
  async getHistory<T = unknown>(
    key: string,
    environment?: string
  ): Promise<StateEntry<T>[]> {
    const env = environment ?? this.config.environment;
    const entries = await this.findAllEntries<T>(key, env);
    return entries.sort((a, b) => b.version - a.version);
  }

  /**
   * Rollback to a specific version
   */
  async rollback<T = unknown>(
    key: string,
    version: number,
    options?: { environment?: string; actor?: string }
  ): Promise<StateEntry<T> | null> {
    const env = options?.environment ?? this.config.environment;
    const actor = options?.actor ?? this.config.actor;

    const history = await this.getHistory<T>(key, env);
    const targetEntry = history.find((e) => e.version === version);

    if (!targetEntry) {
      return null;
    }

    // Create new entry with old value
    const newEntry = await this.put<T>(key, targetEntry.value, {
      environment: env,
      actor,
      tags: { ...targetEntry.tags, rollback_from_version: String(version) }
    });

    await this.logAudit(newEntry.id, 'ROLLBACK', {
      from_version: version,
      from_id: targetEntry.id
    });

    return newEntry;
  }

  /**
   * Query entries with filters
   */
  async query<T = unknown>(query: StateQuery): Promise<StateEntry<T>[]> {
    const files = await this.listStateFiles();
    let entries: StateEntry<T>[] = [];

    for (const file of files) {
      const entry = await this.readEntry<T>(file);
      if (!entry) continue;

      // Apply filters
      if (query.key && entry.key !== query.key) continue;
      if (query.environment && entry.environment !== query.environment) continue;
      if (!query.include_superseded && entry.superseded_at) continue;

      if (query.tags) {
        const matchesTags = Object.entries(query.tags).every(
          ([k, v]) => entry.tags[k] === v
        );
        if (!matchesTags) continue;
      }

      entries.push(entry);
    }

    // Sort by created_at descending
    entries.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    // Apply pagination
    if (query.offset) {
      entries = entries.slice(query.offset);
    }
    if (query.limit) {
      entries = entries.slice(0, query.limit);
    }

    return entries;
  }

  /**
   * List all unique keys
   */
  async listKeys(environment?: string): Promise<string[]> {
    const env = environment ?? this.config.environment;
    const entries = await this.query({ environment: env, include_superseded: false });
    return [...new Set(entries.map((e) => e.key))];
  }

  /**
   * Get audit trail for an entry
   */
  async getAuditTrail(stateId: string): Promise<StateAuditEntry[]> {
    const auditFiles = await this.listAuditFiles();
    const entries: StateAuditEntry[] = [];

    for (const file of auditFiles) {
      const entry = await this.readAuditEntry(file);
      if (entry && entry.state_id === stateId) {
        entries.push(entry);
      }
    }

    return entries.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Verify entry integrity
   */
  async verifyIntegrity<T = unknown>(entry: StateEntry<T>): Promise<boolean> {
    const calculatedChecksum = this.calculateChecksum(entry.value);
    return calculatedChecksum === entry.checksum;
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private ensureDirectories(): void {
    if (!fs.existsSync(this.stateDir)) {
      fs.mkdirSync(this.stateDir, { recursive: true });
    }
    if (!fs.existsSync(this.auditDir)) {
      fs.mkdirSync(this.auditDir, { recursive: true });
    }
  }

  private generateId(): string {
    return `${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
  }

  private calculateChecksum(value: unknown): string {
    const json = JSON.stringify(value);
    return crypto.createHash('sha256').update(json).digest('hex');
  }

  private getEntryPath(id: string): string {
    return path.join(this.stateDir, `${id}.json`);
  }

  private getAuditPath(id: string): string {
    return path.join(this.auditDir, `${id}.json`);
  }

  private async writeEntry<T>(entry: StateEntry<T>): Promise<void> {
    const filePath = this.getEntryPath(entry.id);
    await fs.promises.writeFile(filePath, JSON.stringify(entry, null, 2), 'utf-8');
  }

  private async readEntry<T>(filePath: string): Promise<StateEntry<T> | null> {
    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      return JSON.parse(content) as StateEntry<T>;
    } catch {
      return null;
    }
  }

  private async listStateFiles(): Promise<string[]> {
    try {
      const files = await fs.promises.readdir(this.stateDir);
      return files
        .filter((f) => f.endsWith('.json'))
        .map((f) => path.join(this.stateDir, f));
    } catch {
      return [];
    }
  }

  private async listAuditFiles(): Promise<string[]> {
    try {
      const files = await fs.promises.readdir(this.auditDir);
      return files
        .filter((f) => f.endsWith('.json'))
        .map((f) => path.join(this.auditDir, f));
    } catch {
      return [];
    }
  }

  private async findCurrentEntry<T>(
    key: string,
    environment: string
  ): Promise<StateEntry<T> | null> {
    const files = await this.listStateFiles();

    for (const file of files) {
      const entry = await this.readEntry<T>(file);
      if (
        entry &&
        entry.key === key &&
        entry.environment === environment &&
        !entry.superseded_at
      ) {
        return entry;
      }
    }

    return null;
  }

  private async findAllEntries<T>(
    key: string,
    environment: string
  ): Promise<StateEntry<T>[]> {
    const files = await this.listStateFiles();
    const entries: StateEntry<T>[] = [];

    for (const file of files) {
      const entry = await this.readEntry<T>(file);
      if (entry && entry.key === key && entry.environment === environment) {
        entries.push(entry);
      }
    }

    return entries;
  }

  private async logAudit(
    stateId: string,
    action: StateAuditEntry['action'],
    metadata?: Record<string, unknown>
  ): Promise<void> {
    if (!this.config.enable_audit) return;

    const entry: StateAuditEntry = {
      id: this.generateId(),
      state_id: stateId,
      action,
      actor: this.config.actor,
      timestamp: new Date().toISOString(),
      metadata
    };

    const filePath = this.getAuditPath(entry.id);
    await fs.promises.writeFile(filePath, JSON.stringify(entry, null, 2), 'utf-8');
  }

  private async readAuditEntry(filePath: string): Promise<StateAuditEntry | null> {
    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      return JSON.parse(content) as StateAuditEntry;
    } catch {
      return null;
    }
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

export function createStateStore(config: StateStoreConfig): StateStore {
  return new StateStore(config);
}

// ============================================================================
// SINGLETON FOR RUNTIME
// ============================================================================

let defaultStore: StateStore | null = null;

export function getDefaultStateStore(): StateStore {
  if (!defaultStore) {
    defaultStore = createStateStore({
      base_path: process.env.AGENTOS_STATE_PATH ?? './data/state',
      environment: process.env.AGENTOS_ENV ?? 'development',
      actor: 'runtime'
    });
  }
  return defaultStore;
}

export function setDefaultStateStore(store: StateStore): void {
  defaultStore = store;
}
