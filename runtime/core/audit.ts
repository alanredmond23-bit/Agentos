/**
 * audit.ts
 * Append-only audit log with PII redaction
 * Immutable audit trail for compliance and debugging
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { AuditEvent, AuditActor, AuditResource, AuditAction, createAuditEvent } from '../types/events';

// ============================================================================
// TYPES
// ============================================================================

export interface AuditLogConfig {
  /** Base path for audit logs */
  log_path: string;

  /** Enable PII redaction */
  enable_pii_redaction?: boolean;

  /** Custom PII patterns */
  pii_patterns?: PIIPattern[];

  /** Maximum file size before rotation (bytes) */
  max_file_size?: number;

  /** Number of files to retain */
  retention_count?: number;

  /** Enable checksum verification */
  enable_checksums?: boolean;

  /** Async write (better performance, less durability) */
  async_write?: boolean;

  /** Flush interval for async writes (ms) */
  flush_interval_ms?: number;
}

export interface PIIPattern {
  name: string;
  pattern: RegExp;
  replacement: string;
}

export interface AuditQuery {
  start_time?: string;
  end_time?: string;
  actions?: AuditAction[];
  actor_ids?: string[];
  resource_types?: string[];
  zones?: ('red' | 'yellow' | 'green')[];
  success?: boolean;
  limit?: number;
  offset?: number;
}

export interface AuditStats {
  total_events: number;
  by_action: Record<string, number>;
  by_zone: Record<string, number>;
  by_success: { success: number; failure: number };
  time_range: { start: string; end: string };
}

// ============================================================================
// DEFAULT PII PATTERNS
// ============================================================================

export const DEFAULT_PII_PATTERNS: PIIPattern[] = [
  {
    name: 'email',
    pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    replacement: '[EMAIL_REDACTED]'
  },
  {
    name: 'phone_us',
    pattern: /(\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/g,
    replacement: '[PHONE_REDACTED]'
  },
  {
    name: 'ssn',
    pattern: /\b\d{3}[-.]?\d{2}[-.]?\d{4}\b/g,
    replacement: '[SSN_REDACTED]'
  },
  {
    name: 'credit_card',
    pattern: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
    replacement: '[CC_REDACTED]'
  },
  {
    name: 'ip_address',
    pattern: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
    replacement: '[IP_REDACTED]'
  },
  {
    name: 'api_key',
    pattern: /\b(sk_|pk_|api_|key_|token_)[a-zA-Z0-9]{16,}\b/gi,
    replacement: '[API_KEY_REDACTED]'
  },
  {
    name: 'jwt',
    pattern: /eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/g,
    replacement: '[JWT_REDACTED]'
  }
];

// ============================================================================
// AUDIT LOGGER
// ============================================================================

export class AuditLogger {
  private config: Required<AuditLogConfig>;
  private currentLogFile: string;
  private writeBuffer: AuditEvent[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private lineCount: number = 0;

  constructor(config: AuditLogConfig) {
    this.config = {
      log_path: config.log_path,
      enable_pii_redaction: config.enable_pii_redaction ?? true,
      pii_patterns: config.pii_patterns ?? DEFAULT_PII_PATTERNS,
      max_file_size: config.max_file_size ?? 10 * 1024 * 1024, // 10MB
      retention_count: config.retention_count ?? 30,
      enable_checksums: config.enable_checksums ?? true,
      async_write: config.async_write ?? true,
      flush_interval_ms: config.flush_interval_ms ?? 1000
    };

    this.ensureLogDirectory();
    this.currentLogFile = this.getLogFileName();

    if (this.config.async_write) {
      this.startFlushTimer();
    }
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  /**
   * Log an audit event
   */
  async log(event: AuditEvent): Promise<void> {
    // Apply PII redaction
    const redactedEvent = this.config.enable_pii_redaction
      ? this.redactPII(event)
      : event;

    // Add checksum
    if (this.config.enable_checksums) {
      redactedEvent.checksum = this.calculateChecksum(redactedEvent);
    }

    if (this.config.async_write) {
      this.writeBuffer.push(redactedEvent);
    } else {
      await this.writeEvent(redactedEvent);
    }
  }

  /**
   * Create and log an audit event
   */
  async logAction(
    action: AuditAction,
    actor: AuditActor,
    resource: AuditResource,
    zone: 'red' | 'yellow' | 'green',
    success: boolean,
    options?: {
      error?: { code: string; message: string };
      duration_ms?: number;
      before?: Record<string, unknown>;
      after?: Record<string, unknown>;
      metadata?: Record<string, unknown>;
      correlation_id?: string;
      session_id?: string;
    }
  ): Promise<AuditEvent> {
    const event = createAuditEvent(action, actor, resource, zone, success, options);
    await this.log(event);
    return event;
  }

  /**
   * Query audit logs
   */
  async query(query: AuditQuery): Promise<AuditEvent[]> {
    const events: AuditEvent[] = [];
    const logFiles = await this.listLogFiles();

    for (const file of logFiles) {
      const fileEvents = await this.readLogFile(file);

      for (const event of fileEvents) {
        if (this.matchesQuery(event, query)) {
          events.push(event);
        }
      }
    }

    // Sort by timestamp descending
    events.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Apply pagination
    let result = events;
    if (query.offset) {
      result = result.slice(query.offset);
    }
    if (query.limit) {
      result = result.slice(0, query.limit);
    }

    return result;
  }

  /**
   * Get audit statistics
   */
  async getStats(startTime?: string, endTime?: string): Promise<AuditStats> {
    const events = await this.query({ start_time: startTime, end_time: endTime });

    const stats: AuditStats = {
      total_events: events.length,
      by_action: {},
      by_zone: {},
      by_success: { success: 0, failure: 0 },
      time_range: {
        start: events[events.length - 1]?.timestamp ?? '',
        end: events[0]?.timestamp ?? ''
      }
    };

    for (const event of events) {
      stats.by_action[event.action] = (stats.by_action[event.action] ?? 0) + 1;
      stats.by_zone[event.zone] = (stats.by_zone[event.zone] ?? 0) + 1;

      if (event.success) {
        stats.by_success.success++;
      } else {
        stats.by_success.failure++;
      }
    }

    return stats;
  }

  /**
   * Verify event integrity
   */
  verifyEvent(event: AuditEvent): boolean {
    if (!event.checksum) return true; // No checksum to verify

    const eventCopy = { ...event };
    delete eventCopy.checksum;
    const calculated = this.calculateChecksum(eventCopy);
    return calculated === event.checksum;
  }

  /**
   * Verify all events in a file
   */
  async verifyFile(filePath: string): Promise<{
    valid: boolean;
    total: number;
    invalid: number;
    invalidEvents: string[];
  }> {
    const events = await this.readLogFile(filePath);
    const invalidEvents: string[] = [];

    for (const event of events) {
      if (!this.verifyEvent(event)) {
        invalidEvents.push(event.id);
      }
    }

    return {
      valid: invalidEvents.length === 0,
      total: events.length,
      invalid: invalidEvents.length,
      invalidEvents
    };
  }

  /**
   * Force flush buffered events
   */
  async flush(): Promise<void> {
    if (this.writeBuffer.length === 0) return;

    const eventsToWrite = [...this.writeBuffer];
    this.writeBuffer = [];

    for (const event of eventsToWrite) {
      await this.writeEvent(event);
    }
  }

  /**
   * Rotate logs if needed
   */
  async rotateIfNeeded(): Promise<boolean> {
    try {
      const stats = await fs.promises.stat(this.currentLogFile);
      if (stats.size >= this.config.max_file_size) {
        await this.rotateLogs();
        return true;
      }
    } catch {
      // File doesn't exist yet
    }
    return false;
  }

  /**
   * Close the logger (flush pending writes)
   */
  async close(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    await this.flush();
  }

  // ============================================================================
  // PII REDACTION
  // ============================================================================

  /**
   * Redact PII from an event
   */
  private redactPII(event: AuditEvent): AuditEvent {
    const redacted = JSON.parse(JSON.stringify(event)) as AuditEvent;
    const redactedFields: string[] = [];

    const redactObject = (obj: unknown, path: string): unknown => {
      if (obj === null || obj === undefined) return obj;

      if (typeof obj === 'string') {
        let result = obj;
        for (const pattern of this.config.pii_patterns) {
          if (pattern.pattern.test(result)) {
            redactedFields.push(`${path}:${pattern.name}`);
            result = result.replace(pattern.pattern, pattern.replacement);
          }
          // Reset lastIndex for global patterns
          pattern.pattern.lastIndex = 0;
        }
        return result;
      }

      if (Array.isArray(obj)) {
        return obj.map((item, index) => redactObject(item, `${path}[${index}]`));
      }

      if (typeof obj === 'object') {
        const result: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(obj)) {
          result[key] = redactObject(value, `${path}.${key}`);
        }
        return result;
      }

      return obj;
    };

    redactObject(redacted, 'event');
    redacted.redacted_fields = redactedFields;

    return redacted;
  }

  // ============================================================================
  // FILE OPERATIONS
  // ============================================================================

  private ensureLogDirectory(): void {
    if (!fs.existsSync(this.config.log_path)) {
      fs.mkdirSync(this.config.log_path, { recursive: true });
    }
  }

  private getLogFileName(date?: Date): string {
    const d = date ?? new Date();
    const dateStr = d.toISOString().split('T')[0];
    return path.join(this.config.log_path, `audit-${dateStr}.jsonl`);
  }

  private async writeEvent(event: AuditEvent): Promise<void> {
    const line = JSON.stringify(event) + '\n';

    // Check if we need to rotate
    await this.rotateIfNeeded();

    // Append to log file
    await fs.promises.appendFile(this.currentLogFile, line, 'utf-8');
    this.lineCount++;
  }

  private async readLogFile(filePath: string): Promise<AuditEvent[]> {
    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      const lines = content.trim().split('\n').filter((l) => l);
      return lines.map((line) => JSON.parse(line) as AuditEvent);
    } catch {
      return [];
    }
  }

  private async listLogFiles(): Promise<string[]> {
    try {
      const files = await fs.promises.readdir(this.config.log_path);
      return files
        .filter((f) => f.startsWith('audit-') && f.endsWith('.jsonl'))
        .map((f) => path.join(this.config.log_path, f))
        .sort()
        .reverse();
    } catch {
      return [];
    }
  }

  private async rotateLogs(): Promise<void> {
    // Create new log file
    this.currentLogFile = this.getLogFileName();
    this.lineCount = 0;

    // Clean up old files if needed
    const files = await this.listLogFiles();
    if (files.length > this.config.retention_count) {
      const filesToDelete = files.slice(this.config.retention_count);
      for (const file of filesToDelete) {
        await fs.promises.unlink(file);
      }
    }
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush().catch(console.error);
    }, this.config.flush_interval_ms);
  }

  // ============================================================================
  // QUERY HELPERS
  // ============================================================================

  private matchesQuery(event: AuditEvent, query: AuditQuery): boolean {
    if (query.start_time) {
      if (new Date(event.timestamp) < new Date(query.start_time)) return false;
    }

    if (query.end_time) {
      if (new Date(event.timestamp) > new Date(query.end_time)) return false;
    }

    if (query.actions && query.actions.length > 0) {
      if (!query.actions.includes(event.action)) return false;
    }

    if (query.actor_ids && query.actor_ids.length > 0) {
      if (!query.actor_ids.includes(event.actor.id)) return false;
    }

    if (query.resource_types && query.resource_types.length > 0) {
      if (!query.resource_types.includes(event.resource.type)) return false;
    }

    if (query.zones && query.zones.length > 0) {
      if (!query.zones.includes(event.zone)) return false;
    }

    if (query.success !== undefined) {
      if (event.success !== query.success) return false;
    }

    return true;
  }

  // ============================================================================
  // CHECKSUM
  // ============================================================================

  private calculateChecksum(event: Partial<AuditEvent>): string {
    const data = JSON.stringify(event);
    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let defaultLogger: AuditLogger | null = null;

export function getAuditLogger(): AuditLogger {
  if (!defaultLogger) {
    defaultLogger = new AuditLogger({
      log_path: process.env.AGENTOS_AUDIT_PATH ?? './data/audit'
    });
  }
  return defaultLogger;
}

export function setAuditLogger(logger: AuditLogger): void {
  defaultLogger = logger;
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Quick audit log
 */
export async function audit(
  action: AuditAction,
  actor: AuditActor,
  resource: AuditResource,
  zone: 'red' | 'yellow' | 'green',
  success: boolean,
  options?: {
    error?: { code: string; message: string };
    duration_ms?: number;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  await getAuditLogger().logAction(action, actor, resource, zone, success, options);
}
