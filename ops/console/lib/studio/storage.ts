/**
 * AgentOS Studio - Local Storage Helpers
 * Type-safe localStorage wrapper with expiration, versioning, and drafts
 */

import type {
  StorageItem,
  Draft,
  ExportData,
  ExportMetadata,
  ImportResult,
  Pack,
  StudioAgent,
  UUID,
  Timestamp,
} from '@/types/studio';

// ============================================
// Storage Configuration
// ============================================

const STORAGE_PREFIX = 'agentos_studio_';
const STORAGE_VERSION = '1.0.0';
const MAX_DRAFTS = 50;
const AUTO_SAVE_DEBOUNCE_MS = 2000;

// ============================================
// Type Guards
// ============================================

function isStorageItem<T>(value: unknown): value is StorageItem<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'key' in value &&
    'value' in value &&
    'created_at' in value &&
    'updated_at' in value &&
    'version' in value
  );
}

function isDraft(value: unknown): value is Draft {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'entity_type' in value &&
    'name' in value &&
    'content' in value
  );
}

// ============================================
// Storage Class
// ============================================

class StudioStorage {
  private prefix: string;
  private version: string;
  private autoSaveTimers: Map<string, NodeJS.Timeout>;

  constructor(prefix: string = STORAGE_PREFIX, version: string = STORAGE_VERSION) {
    this.prefix = prefix;
    this.version = version;
    this.autoSaveTimers = new Map();
  }

  // ============================================
  // Core Storage Operations
  // ============================================

  private getKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  private isExpired(item: StorageItem<unknown>): boolean {
    if (!item.expires_at) return false;
    return new Date(item.expires_at) < new Date();
  }

  get<T>(key: string): T | null {
    try {
      if (typeof window === 'undefined') return null;

      const rawValue = localStorage.getItem(this.getKey(key));
      if (!rawValue) return null;

      const parsed = JSON.parse(rawValue);

      if (isStorageItem<T>(parsed)) {
        if (this.isExpired(parsed)) {
          this.remove(key);
          return null;
        }
        return parsed.value;
      }

      return parsed as T;
    } catch (error) {
      console.error(`[StudioStorage] Error reading key "${key}":`, error);
      return null;
    }
  }

  set<T>(
    key: string,
    value: T,
    options?: { expiresIn?: number; version?: number }
  ): boolean {
    try {
      if (typeof window === 'undefined') return false;

      const now = new Date().toISOString();
      const existingItem = this.getItem<T>(key);

      const item: StorageItem<T> = {
        key,
        value,
        created_at: existingItem?.created_at || now,
        updated_at: now,
        expires_at: options?.expiresIn
          ? new Date(Date.now() + options.expiresIn).toISOString()
          : undefined,
        version: options?.version ?? (existingItem?.version ?? 0) + 1,
      };

      localStorage.setItem(this.getKey(key), JSON.stringify(item));
      return true;
    } catch (error) {
      console.error(`[StudioStorage] Error writing key "${key}":`, error);
      return false;
    }
  }

  getItem<T>(key: string): StorageItem<T> | null {
    try {
      if (typeof window === 'undefined') return null;

      const rawValue = localStorage.getItem(this.getKey(key));
      if (!rawValue) return null;

      const parsed = JSON.parse(rawValue);

      if (isStorageItem<T>(parsed)) {
        if (this.isExpired(parsed)) {
          this.remove(key);
          return null;
        }
        return parsed;
      }

      return null;
    } catch (error) {
      console.error(`[StudioStorage] Error reading item "${key}":`, error);
      return null;
    }
  }

  remove(key: string): boolean {
    try {
      if (typeof window === 'undefined') return false;

      localStorage.removeItem(this.getKey(key));
      return true;
    } catch (error) {
      console.error(`[StudioStorage] Error removing key "${key}":`, error);
      return false;
    }
  }

  clear(): boolean {
    try {
      if (typeof window === 'undefined') return false;

      const keys = Object.keys(localStorage).filter((k) =>
        k.startsWith(this.prefix)
      );
      keys.forEach((key) => localStorage.removeItem(key));
      return true;
    } catch (error) {
      console.error('[StudioStorage] Error clearing storage:', error);
      return false;
    }
  }

  keys(): string[] {
    try {
      if (typeof window === 'undefined') return [];

      return Object.keys(localStorage)
        .filter((k) => k.startsWith(this.prefix))
        .map((k) => k.replace(this.prefix, ''));
    } catch {
      return [];
    }
  }

  size(): number {
    try {
      if (typeof window === 'undefined') return 0;

      let size = 0;
      Object.keys(localStorage)
        .filter((k) => k.startsWith(this.prefix))
        .forEach((key) => {
          const value = localStorage.getItem(key);
          if (value) size += key.length + value.length;
        });
      return size;
    } catch {
      return 0;
    }
  }

  // ============================================
  // Draft Operations
  // ============================================

  private getDraftsKey(): string {
    return 'drafts';
  }

  getDrafts(): Draft[] {
    const drafts = this.get<Draft[]>(this.getDraftsKey());
    return drafts || [];
  }

  getDraft(id: UUID): Draft | null {
    const drafts = this.getDrafts();
    return drafts.find((d) => d.id === id) || null;
  }

  getDraftsByEntity(entityType: 'agent' | 'pack', entityId: UUID | null): Draft[] {
    const drafts = this.getDrafts();
    return drafts.filter(
      (d) => d.entity_type === entityType && d.entity_id === entityId
    );
  }

  saveDraft(draft: Omit<Draft, 'id' | 'created_at' | 'updated_at'>): Draft {
    const drafts = this.getDrafts();
    const now = new Date().toISOString();

    const newDraft: Draft = {
      id: crypto.randomUUID(),
      ...draft,
      created_at: now,
      updated_at: now,
    };

    // Keep only the most recent drafts
    const updatedDrafts = [newDraft, ...drafts].slice(0, MAX_DRAFTS);
    this.set(this.getDraftsKey(), updatedDrafts);

    return newDraft;
  }

  updateDraft(id: UUID, updates: Partial<Pick<Draft, 'name' | 'content'>>): Draft | null {
    const drafts = this.getDrafts();
    const index = drafts.findIndex((d) => d.id === id);

    if (index === -1) return null;

    const updatedDraft: Draft = {
      ...drafts[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };

    drafts[index] = updatedDraft;
    this.set(this.getDraftsKey(), drafts);

    return updatedDraft;
  }

  deleteDraft(id: UUID): boolean {
    const drafts = this.getDrafts();
    const filtered = drafts.filter((d) => d.id !== id);

    if (filtered.length === drafts.length) return false;

    this.set(this.getDraftsKey(), filtered);
    return true;
  }

  deleteOldDrafts(olderThan: Date): number {
    const drafts = this.getDrafts();
    const filtered = drafts.filter(
      (d) => new Date(d.updated_at) >= olderThan
    );
    const deleted = drafts.length - filtered.length;

    if (deleted > 0) {
      this.set(this.getDraftsKey(), filtered);
    }

    return deleted;
  }

  // ============================================
  // Auto-Save Operations
  // ============================================

  scheduleAutoSave(
    entityType: 'agent' | 'pack',
    entityId: UUID | null,
    name: string,
    content: string,
    callback?: (draft: Draft) => void
  ): void {
    const key = `autosave_${entityType}_${entityId || 'new'}`;

    // Clear existing timer
    const existingTimer = this.autoSaveTimers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Schedule new auto-save
    const timer = setTimeout(() => {
      const draft = this.saveDraft({
        entity_type: entityType,
        entity_id: entityId,
        name: `[Auto-saved] ${name}`,
        content,
        is_auto_saved: true,
      });

      if (callback) callback(draft);
      this.autoSaveTimers.delete(key);
    }, AUTO_SAVE_DEBOUNCE_MS);

    this.autoSaveTimers.set(key, timer);
  }

  cancelAutoSave(entityType: 'agent' | 'pack', entityId: UUID | null): void {
    const key = `autosave_${entityType}_${entityId || 'new'}`;
    const timer = this.autoSaveTimers.get(key);

    if (timer) {
      clearTimeout(timer);
      this.autoSaveTimers.delete(key);
    }
  }

  // ============================================
  // Export/Import Operations
  // ============================================

  private generateChecksum(data: unknown): string {
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }

  exportAgent(agent: StudioAgent): ExportData {
    const now = new Date().toISOString();
    return {
      version: this.version,
      exported_at: now,
      type: 'agent',
      data: agent,
      metadata: {
        source: 'agentos-studio',
        author: agent.created_by,
        description: `Export of agent: ${agent.name}`,
        checksum: this.generateChecksum(agent),
      },
    };
  }

  exportPack(pack: Pack): ExportData {
    const now = new Date().toISOString();
    return {
      version: this.version,
      exported_at: now,
      type: 'pack',
      data: pack,
      metadata: {
        source: 'agentos-studio',
        author: pack.created_by,
        description: `Export of pack: ${pack.name}`,
        checksum: this.generateChecksum(pack),
      },
    };
  }

  exportAll(packs: Pack[]): ExportData {
    const now = new Date().toISOString();
    return {
      version: this.version,
      exported_at: now,
      type: 'full',
      data: packs,
      metadata: {
        source: 'agentos-studio',
        description: `Full export of ${packs.length} packs`,
        checksum: this.generateChecksum(packs),
      },
    };
  }

  validateImport(data: unknown): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data || typeof data !== 'object') {
      errors.push('Invalid export data format');
      return { valid: false, errors };
    }

    const exportData = data as Partial<ExportData>;

    if (!exportData.version) {
      errors.push('Missing version field');
    }

    if (!exportData.type || !['agent', 'pack', 'full'].includes(exportData.type)) {
      errors.push('Invalid or missing type field');
    }

    if (!exportData.data) {
      errors.push('Missing data field');
    }

    if (!exportData.metadata?.checksum) {
      errors.push('Missing checksum in metadata');
    } else {
      const expectedChecksum = this.generateChecksum(exportData.data);
      if (exportData.metadata.checksum !== expectedChecksum) {
        errors.push('Checksum mismatch - data may be corrupted');
      }
    }

    return { valid: errors.length === 0, errors };
  }

  parseImport(jsonString: string): { data: ExportData | null; error: string | null } {
    try {
      const parsed = JSON.parse(jsonString);
      const validation = this.validateImport(parsed);

      if (!validation.valid) {
        return { data: null, error: validation.errors.join('; ') };
      }

      return { data: parsed as ExportData, error: null };
    } catch (error) {
      return {
        data: null,
        error: `Failed to parse JSON: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  // ============================================
  // Utility Operations
  // ============================================

  getStorageInfo(): {
    used: number;
    available: number;
    itemCount: number;
    draftCount: number;
  } {
    const used = this.size();
    const drafts = this.getDrafts();

    // localStorage limit is typically 5MB
    const limit = 5 * 1024 * 1024;

    return {
      used,
      available: Math.max(0, limit - used),
      itemCount: this.keys().length,
      draftCount: drafts.length,
    };
  }

  cleanup(): { removed: number; freed: number } {
    const beforeSize = this.size();
    let removed = 0;

    // Remove expired items
    this.keys().forEach((key) => {
      const item = this.getItem(key);
      if (item && this.isExpired(item)) {
        this.remove(key);
        removed++;
      }
    });

    // Remove old auto-saved drafts (older than 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    removed += this.deleteOldDrafts(sevenDaysAgo);

    return {
      removed,
      freed: beforeSize - this.size(),
    };
  }
}

// Export singleton instance
export const studioStorage = new StudioStorage();
export type { StudioStorage };
