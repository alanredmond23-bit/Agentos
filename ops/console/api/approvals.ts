/**
 * AgentOS Ops Console - Approvals API Client
 * API client for approval workflow operations
 */

import type {
  ApprovalRequest,
  ApprovalResponse,
  ApprovalStatus,
  Priority,
  RiskLevel,
  ApiResponse,
  ApiMeta,
  UUID,
} from '@/types';

// ============================================
// API Configuration
// ============================================

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

// ============================================
// Types
// ============================================

export interface ApprovalFilters {
  status?: ApprovalStatus[];
  priority?: Priority[];
  riskLevel?: RiskLevel[];
  agentId?: UUID;
  search?: string;
  startDate?: string;
  endDate?: string;
}

export interface ApprovalStats {
  pending: number;
  approved_today: number;
  rejected_today: number;
  expired_today: number;
  average_response_time_ms: number;
  by_priority: Record<Priority, number>;
  by_risk_level: Record<RiskLevel, number>;
}

export interface PaginationParams {
  page?: number;
  per_page?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface ApprovalActionPayload {
  note?: string;
  conditions?: string[];
}

export interface BulkActionPayload {
  ids: UUID[];
  note?: string;
}

export interface BulkActionResult {
  success: UUID[];
  failed: Array<{ id: UUID; error: string }>;
}

// ============================================
// API Error Handling
// ============================================

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new ApiError(
      response.status,
      errorData.error?.code || 'UNKNOWN_ERROR',
      errorData.error?.message || 'An unknown error occurred',
      errorData.error?.details
    );
  }
  return response.json();
}

function buildQueryString(params: Record<string, unknown>): string {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        value.forEach((v) => searchParams.append(key, String(v)));
      } else {
        searchParams.set(key, String(value));
      }
    }
  });
  return searchParams.toString();
}

// ============================================
// Approval API Functions
// ============================================

/**
 * Fetch approvals with optional filters and pagination
 */
export async function fetchApprovals(
  filters?: ApprovalFilters,
  pagination?: PaginationParams
): Promise<ApiResponse<ApprovalRequest[]>> {
  const queryParams = {
    ...filters,
    ...pagination,
  };
  const queryString = buildQueryString(queryParams);
  const url = `${API_BASE_URL}/approvals${queryString ? `?${queryString}` : ''}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  return handleResponse<ApiResponse<ApprovalRequest[]>>(response);
}

/**
 * Fetch a single approval by ID
 */
export async function fetchApproval(id: UUID): Promise<ApiResponse<ApprovalRequest>> {
  const response = await fetch(`${API_BASE_URL}/approvals/${id}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  return handleResponse<ApiResponse<ApprovalRequest>>(response);
}

/**
 * Approve an approval request
 */
export async function approveRequest(
  id: UUID,
  payload?: ApprovalActionPayload
): Promise<ApiResponse<ApprovalRequest>> {
  const response = await fetch(`${API_BASE_URL}/approvals/${id}/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(payload || {}),
  });

  return handleResponse<ApiResponse<ApprovalRequest>>(response);
}

/**
 * Reject an approval request
 */
export async function rejectRequest(
  id: UUID,
  payload?: ApprovalActionPayload
): Promise<ApiResponse<ApprovalRequest>> {
  const response = await fetch(`${API_BASE_URL}/approvals/${id}/reject`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(payload || {}),
  });

  return handleResponse<ApiResponse<ApprovalRequest>>(response);
}

/**
 * Escalate an approval request
 */
export async function escalateRequest(
  id: UUID,
  payload?: ApprovalActionPayload & { escalate_to?: UUID }
): Promise<ApiResponse<ApprovalRequest>> {
  const response = await fetch(`${API_BASE_URL}/approvals/${id}/escalate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(payload || {}),
  });

  return handleResponse<ApiResponse<ApprovalRequest>>(response);
}

/**
 * Bulk approve multiple requests
 */
export async function bulkApprove(
  payload: BulkActionPayload
): Promise<ApiResponse<BulkActionResult>> {
  const response = await fetch(`${API_BASE_URL}/approvals/bulk/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  return handleResponse<ApiResponse<BulkActionResult>>(response);
}

/**
 * Bulk reject multiple requests
 */
export async function bulkReject(
  payload: BulkActionPayload
): Promise<ApiResponse<BulkActionResult>> {
  const response = await fetch(`${API_BASE_URL}/approvals/bulk/reject`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  return handleResponse<ApiResponse<BulkActionResult>>(response);
}

/**
 * Fetch approval statistics
 */
export async function fetchApprovalStats(): Promise<ApiResponse<ApprovalStats>> {
  const response = await fetch(`${API_BASE_URL}/approvals/stats`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  return handleResponse<ApiResponse<ApprovalStats>>(response);
}

/**
 * Fetch approval history for a specific agent
 */
export async function fetchAgentApprovalHistory(
  agentId: UUID,
  pagination?: PaginationParams
): Promise<ApiResponse<ApprovalRequest[]>> {
  const queryString = pagination ? buildQueryString(pagination) : '';
  const url = `${API_BASE_URL}/agents/${agentId}/approvals${queryString ? `?${queryString}` : ''}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  return handleResponse<ApiResponse<ApprovalRequest[]>>(response);
}

// ============================================
// Export Types
// ============================================

export type {
  ApprovalRequest,
  ApprovalResponse,
  ApprovalStatus,
  Priority,
  RiskLevel,
  ApiResponse,
  ApiMeta,
  UUID,
};
