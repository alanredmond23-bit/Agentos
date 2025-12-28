/**
 * approvals.ts
 * Approval token system for side effects
 * Requires explicit approval for operations in red/yellow zones
 */

import * as crypto from 'crypto';

// ============================================================================
// TYPES
// ============================================================================

export type ApprovalZone = 'red' | 'yellow' | 'green';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'expired' | 'used';

export interface ApprovalRequest {
  id: string;
  operation: string;
  resource: string;
  zone: ApprovalZone;
  requester_id: string;
  requester_type: 'agent' | 'user' | 'system';
  justification: string;
  context: Record<string, unknown>;
  created_at: string;
  expires_at: string;
  status: ApprovalStatus;
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
  token?: string;
  used_at?: string;
  metadata?: Record<string, unknown>;
}

export interface ApprovalToken {
  token: string;
  request_id: string;
  operation: string;
  resource: string;
  zone: ApprovalZone;
  issued_at: string;
  expires_at: string;
  single_use: boolean;
  used: boolean;
  checksum: string;
}

export interface ApprovalConfig {
  /** Default expiration for approval requests (ms) */
  request_expiration_ms?: number;

  /** Default expiration for tokens (ms) */
  token_expiration_ms?: number;

  /** Auto-approve green zone operations */
  auto_approve_green?: boolean;

  /** Require 2FA for red zone operations */
  require_2fa_red?: boolean;

  /** Callback for approval notifications */
  on_approval_required?: (request: ApprovalRequest) => Promise<void>;

  /** Callback for approval decisions */
  on_approval_decision?: (request: ApprovalRequest) => Promise<void>;

  /** Storage backend */
  storage?: ApprovalStorage;
}

export interface ApprovalStorage {
  saveRequest(request: ApprovalRequest): Promise<void>;
  getRequest(id: string): Promise<ApprovalRequest | null>;
  updateRequest(request: ApprovalRequest): Promise<void>;
  listPendingRequests(): Promise<ApprovalRequest[]>;
  saveToken(token: ApprovalToken): Promise<void>;
  getToken(tokenString: string): Promise<ApprovalToken | null>;
  invalidateToken(tokenString: string): Promise<void>;
}

// ============================================================================
// IN-MEMORY STORAGE (Default)
// ============================================================================

class InMemoryApprovalStorage implements ApprovalStorage {
  private requests: Map<string, ApprovalRequest> = new Map();
  private tokens: Map<string, ApprovalToken> = new Map();

  async saveRequest(request: ApprovalRequest): Promise<void> {
    this.requests.set(request.id, { ...request });
  }

  async getRequest(id: string): Promise<ApprovalRequest | null> {
    return this.requests.get(id) ?? null;
  }

  async updateRequest(request: ApprovalRequest): Promise<void> {
    this.requests.set(request.id, { ...request });
  }

  async listPendingRequests(): Promise<ApprovalRequest[]> {
    return Array.from(this.requests.values()).filter((r) => r.status === 'pending');
  }

  async saveToken(token: ApprovalToken): Promise<void> {
    this.tokens.set(token.token, { ...token });
  }

  async getToken(tokenString: string): Promise<ApprovalToken | null> {
    return this.tokens.get(tokenString) ?? null;
  }

  async invalidateToken(tokenString: string): Promise<void> {
    const token = this.tokens.get(tokenString);
    if (token) {
      token.used = true;
      this.tokens.set(tokenString, token);
    }
  }
}

// ============================================================================
// APPROVAL MANAGER
// ============================================================================

export class ApprovalManager {
  private config: Required<Omit<ApprovalConfig, 'on_approval_required' | 'on_approval_decision'>> & {
    on_approval_required?: ApprovalConfig['on_approval_required'];
    on_approval_decision?: ApprovalConfig['on_approval_decision'];
  };
  private storage: ApprovalStorage;

  constructor(config: ApprovalConfig = {}) {
    this.storage = config.storage ?? new InMemoryApprovalStorage();
    this.config = {
      request_expiration_ms: config.request_expiration_ms ?? 3600000, // 1 hour
      token_expiration_ms: config.token_expiration_ms ?? 300000, // 5 minutes
      auto_approve_green: config.auto_approve_green ?? true,
      require_2fa_red: config.require_2fa_red ?? true,
      on_approval_required: config.on_approval_required,
      on_approval_decision: config.on_approval_decision,
      storage: this.storage
    };
  }

  // ============================================================================
  // REQUEST MANAGEMENT
  // ============================================================================

  /**
   * Create an approval request
   */
  async requestApproval(params: {
    operation: string;
    resource: string;
    zone: ApprovalZone;
    requester_id: string;
    requester_type: 'agent' | 'user' | 'system';
    justification: string;
    context?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  }): Promise<ApprovalRequest> {
    const now = new Date();
    const request: ApprovalRequest = {
      id: this.generateId(),
      operation: params.operation,
      resource: params.resource,
      zone: params.zone,
      requester_id: params.requester_id,
      requester_type: params.requester_type,
      justification: params.justification,
      context: params.context ?? {},
      created_at: now.toISOString(),
      expires_at: new Date(now.getTime() + this.config.request_expiration_ms).toISOString(),
      status: 'pending',
      metadata: params.metadata
    };

    // Auto-approve green zone if configured
    if (params.zone === 'green' && this.config.auto_approve_green) {
      request.status = 'approved';
      request.reviewed_by = 'system';
      request.reviewed_at = now.toISOString();
      request.review_notes = 'Auto-approved (green zone)';
      request.token = await this.issueToken(request);
    }

    await this.storage.saveRequest(request);

    // Notify if pending
    if (request.status === 'pending' && this.config.on_approval_required) {
      await this.config.on_approval_required(request);
    }

    return request;
  }

  /**
   * Approve a request
   */
  async approve(
    requestId: string,
    reviewer: string,
    notes?: string
  ): Promise<ApprovalRequest | null> {
    const request = await this.storage.getRequest(requestId);
    if (!request) return null;

    if (request.status !== 'pending') {
      throw new Error(`Request ${requestId} is not pending (status: ${request.status})`);
    }

    if (new Date(request.expires_at) < new Date()) {
      request.status = 'expired';
      await this.storage.updateRequest(request);
      throw new Error(`Request ${requestId} has expired`);
    }

    request.status = 'approved';
    request.reviewed_by = reviewer;
    request.reviewed_at = new Date().toISOString();
    request.review_notes = notes;
    request.token = await this.issueToken(request);

    await this.storage.updateRequest(request);

    if (this.config.on_approval_decision) {
      await this.config.on_approval_decision(request);
    }

    return request;
  }

  /**
   * Reject a request
   */
  async reject(
    requestId: string,
    reviewer: string,
    notes?: string
  ): Promise<ApprovalRequest | null> {
    const request = await this.storage.getRequest(requestId);
    if (!request) return null;

    if (request.status !== 'pending') {
      throw new Error(`Request ${requestId} is not pending (status: ${request.status})`);
    }

    request.status = 'rejected';
    request.reviewed_by = reviewer;
    request.reviewed_at = new Date().toISOString();
    request.review_notes = notes;

    await this.storage.updateRequest(request);

    if (this.config.on_approval_decision) {
      await this.config.on_approval_decision(request);
    }

    return request;
  }

  /**
   * Get a request by ID
   */
  async getRequest(requestId: string): Promise<ApprovalRequest | null> {
    return this.storage.getRequest(requestId);
  }

  /**
   * List pending requests
   */
  async listPendingRequests(): Promise<ApprovalRequest[]> {
    const requests = await this.storage.listPendingRequests();
    const now = new Date();

    // Mark expired requests
    for (const request of requests) {
      if (new Date(request.expires_at) < now) {
        request.status = 'expired';
        await this.storage.updateRequest(request);
      }
    }

    return requests.filter((r) => r.status === 'pending');
  }

  // ============================================================================
  // TOKEN MANAGEMENT
  // ============================================================================

  /**
   * Validate a token and optionally consume it
   */
  async validateToken(
    tokenString: string,
    operation: string,
    resource: string,
    consume: boolean = true
  ): Promise<{ valid: boolean; reason?: string; request?: ApprovalRequest }> {
    const token = await this.storage.getToken(tokenString);

    if (!token) {
      return { valid: false, reason: 'Token not found' };
    }

    // Check if already used
    if (token.used) {
      return { valid: false, reason: 'Token already used' };
    }

    // Check expiration
    if (new Date(token.expires_at) < new Date()) {
      return { valid: false, reason: 'Token expired' };
    }

    // Verify operation and resource match
    if (token.operation !== operation) {
      return { valid: false, reason: 'Operation mismatch' };
    }

    // Allow wildcard resource or exact match
    if (token.resource !== '*' && token.resource !== resource) {
      return { valid: false, reason: 'Resource mismatch' };
    }

    // Verify checksum
    const expectedChecksum = this.calculateTokenChecksum(token);
    if (expectedChecksum !== token.checksum) {
      return { valid: false, reason: 'Token integrity check failed' };
    }

    // Consume token if single-use
    if (consume && token.single_use) {
      await this.storage.invalidateToken(tokenString);

      // Update request
      const request = await this.storage.getRequest(token.request_id);
      if (request) {
        request.status = 'used';
        request.used_at = new Date().toISOString();
        await this.storage.updateRequest(request);
        return { valid: true, request };
      }
    }

    const request = await this.storage.getRequest(token.request_id);
    return { valid: true, request: request ?? undefined };
  }

  /**
   * Check if an operation requires approval
   */
  requiresApproval(zone: ApprovalZone): boolean {
    if (zone === 'green' && this.config.auto_approve_green) {
      return false;
    }
    return true;
  }

  /**
   * Quick check: can proceed with operation?
   */
  async canProceed(
    token: string | undefined,
    operation: string,
    resource: string,
    zone: ApprovalZone
  ): Promise<{ allowed: boolean; reason?: string }> {
    // Green zone with auto-approve doesn't need token
    if (zone === 'green' && this.config.auto_approve_green) {
      return { allowed: true };
    }

    // Must have token for yellow/red
    if (!token) {
      return { allowed: false, reason: `Approval token required for ${zone} zone operation` };
    }

    const result = await this.validateToken(token, operation, resource, true);
    return {
      allowed: result.valid,
      reason: result.reason
    };
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private generateId(): string {
    return `apr_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  private async issueToken(request: ApprovalRequest): Promise<string> {
    const now = new Date();
    const tokenString = `tok_${crypto.randomBytes(32).toString('hex')}`;

    const token: ApprovalToken = {
      token: tokenString,
      request_id: request.id,
      operation: request.operation,
      resource: request.resource,
      zone: request.zone,
      issued_at: now.toISOString(),
      expires_at: new Date(now.getTime() + this.config.token_expiration_ms).toISOString(),
      single_use: true,
      used: false,
      checksum: '' // Will be set below
    };

    token.checksum = this.calculateTokenChecksum(token);
    await this.storage.saveToken(token);

    return tokenString;
  }

  private calculateTokenChecksum(token: ApprovalToken): string {
    const data = `${token.token}:${token.request_id}:${token.operation}:${token.resource}:${token.issued_at}`;
    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let defaultManager: ApprovalManager | null = null;

export function getApprovalManager(): ApprovalManager {
  if (!defaultManager) {
    defaultManager = new ApprovalManager();
  }
  return defaultManager;
}

export function setApprovalManager(manager: ApprovalManager): void {
  defaultManager = manager;
}

// ============================================================================
// DECORATORS / HELPERS
// ============================================================================

/**
 * Check approval before executing an operation
 */
export async function withApproval<T>(
  zone: ApprovalZone,
  operation: string,
  resource: string,
  token: string | undefined,
  fn: () => Promise<T>
): Promise<T> {
  const manager = getApprovalManager();
  const result = await manager.canProceed(token, operation, resource, zone);

  if (!result.allowed) {
    throw new ApprovalRequiredError(operation, resource, zone, result.reason);
  }

  return fn();
}

/**
 * Error thrown when approval is required but not provided
 */
export class ApprovalRequiredError extends Error {
  public readonly operation: string;
  public readonly resource: string;
  public readonly zone: ApprovalZone;

  constructor(operation: string, resource: string, zone: ApprovalZone, reason?: string) {
    super(reason ?? `Approval required for ${operation} on ${resource} in ${zone} zone`);
    this.name = 'ApprovalRequiredError';
    this.operation = operation;
    this.resource = resource;
    this.zone = zone;
  }
}
