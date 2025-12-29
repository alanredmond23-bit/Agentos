/**
 * AgentOS Ops Console - Approval Hooks
 * React hooks for approval workflow UI
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useWebSocket, subscribeToApprovals, createMessage } from '@/lib/websocket';
import { useApprovalsStore, useNotificationsStore } from '@/lib/store';
import {
  fetchApprovals,
  fetchApproval,
  fetchApprovalStats,
  approveRequest,
  rejectRequest,
  escalateRequest,
  bulkApprove,
  bulkReject,
  type ApprovalFilters,
  type PaginationParams,
  type ApprovalActionPayload,
  type BulkActionPayload,
  type ApprovalStats,
  type ApiError,
} from '@/api/approvals';
import type {
  ApprovalRequest,
  ApprovalStatus,
  Priority,
  RiskLevel,
  WebSocketMessage,
  UUID,
} from '@/types';

// ============================================
// Query Keys
// ============================================

export const approvalKeys = {
  all: ['approvals'] as const,
  lists: () => [...approvalKeys.all, 'list'] as const,
  list: (filters: ApprovalFilters, pagination?: PaginationParams) =>
    [...approvalKeys.lists(), { filters, pagination }] as const,
  details: () => [...approvalKeys.all, 'detail'] as const,
  detail: (id: UUID) => [...approvalKeys.details(), id] as const,
  stats: () => [...approvalKeys.all, 'stats'] as const,
};

// ============================================
// useApprovalQueue Hook
// ============================================

interface UseApprovalQueueOptions {
  filters?: ApprovalFilters;
  pagination?: PaginationParams;
  autoRefresh?: boolean;
  refreshInterval?: number;
  enableWebSocket?: boolean;
}

interface UseApprovalQueueReturn {
  approvals: ApprovalRequest[];
  isLoading: boolean;
  isRefetching: boolean;
  error: Error | null;
  refetch: () => void;
  hasMore: boolean;
  totalCount: number;
  loadMore: () => void;
}

export function useApprovalQueue(
  options: UseApprovalQueueOptions = {}
): UseApprovalQueueReturn {
  const {
    filters = {},
    pagination = { page: 1, per_page: 20 },
    autoRefresh = true,
    refreshInterval = 30000,
    enableWebSocket = true,
  } = options;

  const queryClient = useQueryClient();
  const { addApproval, updateApproval, setApprovals } = useApprovalsStore();
  const { addNotification } = useNotificationsStore();
  const [currentPage, setCurrentPage] = useState(pagination.page || 1);

  // Fetch approvals query
  const {
    data,
    isLoading,
    isRefetching,
    error,
    refetch,
  } = useQuery({
    queryKey: approvalKeys.list(filters, { ...pagination, page: currentPage }),
    queryFn: () => fetchApprovals(filters, { ...pagination, page: currentPage }),
    refetchInterval: autoRefresh ? refreshInterval : false,
    staleTime: 10000,
  });

  // WebSocket handler for real-time updates
  const handleWebSocketMessage = useCallback(
    (message: WebSocketMessage) => {
      if (message.type === 'approval_request_created') {
        const newApproval = message.payload as ApprovalRequest;

        // Add to store
        addApproval(newApproval);

        // Invalidate query to refresh list
        queryClient.invalidateQueries({ queryKey: approvalKeys.lists() });

        // Show notification
        addNotification({
          id: crypto.randomUUID(),
          type: 'approval_required',
          title: 'New Approval Request',
          message: `${newApproval.agent_name}: ${newApproval.title}`,
          read: false,
          created_at: new Date().toISOString(),
          action_url: `/approvals?id=${newApproval.id}`,
        });
      }

      if (message.type === 'approval_status_changed') {
        const { id, status } = message.payload as { id: UUID; status: ApprovalStatus };

        // Update in store
        updateApproval(id, { status });

        // Invalidate queries
        queryClient.invalidateQueries({ queryKey: approvalKeys.lists() });
        queryClient.invalidateQueries({ queryKey: approvalKeys.detail(id) });
      }
    },
    [addApproval, updateApproval, addNotification, queryClient]
  );

  // Set up WebSocket subscription
  const { send, isConnected } = useWebSocket({
    autoConnect: enableWebSocket,
    onMessage: handleWebSocketMessage,
  });

  // Subscribe to approval updates on mount
  useEffect(() => {
    if (enableWebSocket && isConnected) {
      send(subscribeToApprovals());
    }
  }, [enableWebSocket, isConnected, send]);

  // Sync query data to store
  useEffect(() => {
    if (data?.data) {
      setApprovals(data.data);
    }
  }, [data, setApprovals]);

  // Load more handler
  const loadMore = useCallback(() => {
    if (data?.meta && currentPage < (data.meta.total_pages || 1)) {
      setCurrentPage((prev) => prev + 1);
    }
  }, [data?.meta, currentPage]);

  return {
    approvals: data?.data || [],
    isLoading,
    isRefetching,
    error: error as Error | null,
    refetch,
    hasMore: data?.meta ? currentPage < (data.meta.total_pages || 1) : false,
    totalCount: data?.meta?.total || 0,
    loadMore,
  };
}

// ============================================
// useApprovalActions Hook
// ============================================

interface UseApprovalActionsReturn {
  approve: (id: UUID, payload?: ApprovalActionPayload) => Promise<void>;
  reject: (id: UUID, payload?: ApprovalActionPayload) => Promise<void>;
  escalate: (id: UUID, payload?: ApprovalActionPayload & { escalate_to?: UUID }) => Promise<void>;
  bulkApprove: (ids: UUID[], note?: string) => Promise<void>;
  bulkReject: (ids: UUID[], note?: string) => Promise<void>;
  isProcessing: boolean;
  processingIds: Set<UUID>;
  error: Error | null;
  clearError: () => void;
}

export function useApprovalActions(): UseApprovalActionsReturn {
  const queryClient = useQueryClient();
  const { updateApproval } = useApprovalsStore();
  const { addNotification } = useNotificationsStore();
  const [processingIds, setProcessingIds] = useState<Set<UUID>>(new Set());
  const [error, setError] = useState<Error | null>(null);

  // Optimistic update helper
  const optimisticUpdate = useCallback(
    (id: UUID, status: ApprovalStatus) => {
      updateApproval(id, {
        status,
        responded_at: new Date().toISOString(),
      });
    },
    [updateApproval]
  );

  // Rollback helper
  const rollbackUpdate = useCallback(
    (id: UUID) => {
      updateApproval(id, { status: 'pending', responded_at: null });
    },
    [updateApproval]
  );

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: ({ id, payload }: { id: UUID; payload?: ApprovalActionPayload }) =>
      approveRequest(id, payload),
    onMutate: async ({ id }) => {
      setProcessingIds((prev) => new Set(prev).add(id));
      optimisticUpdate(id, 'approved');
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: approvalKeys.lists() });
      queryClient.invalidateQueries({ queryKey: approvalKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: approvalKeys.stats() });
      addNotification({
        id: crypto.randomUUID(),
        type: 'success',
        title: 'Request Approved',
        message: 'The approval request has been approved.',
        read: false,
        created_at: new Date().toISOString(),
      });
    },
    onError: (err, { id }) => {
      rollbackUpdate(id);
      setError(err as Error);
      addNotification({
        id: crypto.randomUUID(),
        type: 'error',
        title: 'Approval Failed',
        message: (err as Error).message || 'Failed to approve the request.',
        read: false,
        created_at: new Date().toISOString(),
      });
    },
    onSettled: (_, __, { id }) => {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: ({ id, payload }: { id: UUID; payload?: ApprovalActionPayload }) =>
      rejectRequest(id, payload),
    onMutate: async ({ id }) => {
      setProcessingIds((prev) => new Set(prev).add(id));
      optimisticUpdate(id, 'rejected');
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: approvalKeys.lists() });
      queryClient.invalidateQueries({ queryKey: approvalKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: approvalKeys.stats() });
      addNotification({
        id: crypto.randomUUID(),
        type: 'success',
        title: 'Request Rejected',
        message: 'The approval request has been rejected.',
        read: false,
        created_at: new Date().toISOString(),
      });
    },
    onError: (err, { id }) => {
      rollbackUpdate(id);
      setError(err as Error);
      addNotification({
        id: crypto.randomUUID(),
        type: 'error',
        title: 'Rejection Failed',
        message: (err as Error).message || 'Failed to reject the request.',
        read: false,
        created_at: new Date().toISOString(),
      });
    },
    onSettled: (_, __, { id }) => {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    },
  });

  // Escalate mutation
  const escalateMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: UUID;
      payload?: ApprovalActionPayload & { escalate_to?: UUID };
    }) => escalateRequest(id, payload),
    onMutate: async ({ id }) => {
      setProcessingIds((prev) => new Set(prev).add(id));
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: approvalKeys.lists() });
      queryClient.invalidateQueries({ queryKey: approvalKeys.detail(id) });
      addNotification({
        id: crypto.randomUUID(),
        type: 'info',
        title: 'Request Escalated',
        message: 'The approval request has been escalated.',
        read: false,
        created_at: new Date().toISOString(),
      });
    },
    onError: (err) => {
      setError(err as Error);
      addNotification({
        id: crypto.randomUUID(),
        type: 'error',
        title: 'Escalation Failed',
        message: (err as Error).message || 'Failed to escalate the request.',
        read: false,
        created_at: new Date().toISOString(),
      });
    },
    onSettled: (_, __, { id }) => {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    },
  });

  // Bulk approve mutation
  const bulkApproveMutation = useMutation({
    mutationFn: (payload: BulkActionPayload) => bulkApprove(payload),
    onMutate: async ({ ids }) => {
      setProcessingIds((prev) => new Set([...prev, ...ids]));
      ids.forEach((id) => optimisticUpdate(id, 'approved'));
    },
    onSuccess: (result, { ids }) => {
      queryClient.invalidateQueries({ queryKey: approvalKeys.lists() });
      queryClient.invalidateQueries({ queryKey: approvalKeys.stats() });

      const successCount = result.data.success.length;
      const failCount = result.data.failed.length;

      addNotification({
        id: crypto.randomUUID(),
        type: failCount > 0 ? 'warning' : 'success',
        title: 'Bulk Approval Complete',
        message: `${successCount} approved${failCount > 0 ? `, ${failCount} failed` : ''}`,
        read: false,
        created_at: new Date().toISOString(),
      });
    },
    onError: (err, { ids }) => {
      ids.forEach((id) => rollbackUpdate(id));
      setError(err as Error);
    },
    onSettled: (_, __, { ids }) => {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
    },
  });

  // Bulk reject mutation
  const bulkRejectMutation = useMutation({
    mutationFn: (payload: BulkActionPayload) => bulkReject(payload),
    onMutate: async ({ ids }) => {
      setProcessingIds((prev) => new Set([...prev, ...ids]));
      ids.forEach((id) => optimisticUpdate(id, 'rejected'));
    },
    onSuccess: (result, { ids }) => {
      queryClient.invalidateQueries({ queryKey: approvalKeys.lists() });
      queryClient.invalidateQueries({ queryKey: approvalKeys.stats() });

      const successCount = result.data.success.length;
      const failCount = result.data.failed.length;

      addNotification({
        id: crypto.randomUUID(),
        type: failCount > 0 ? 'warning' : 'success',
        title: 'Bulk Rejection Complete',
        message: `${successCount} rejected${failCount > 0 ? `, ${failCount} failed` : ''}`,
        read: false,
        created_at: new Date().toISOString(),
      });
    },
    onError: (err, { ids }) => {
      ids.forEach((id) => rollbackUpdate(id));
      setError(err as Error);
    },
    onSettled: (_, __, { ids }) => {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
    },
  });

  const isProcessing =
    approveMutation.isPending ||
    rejectMutation.isPending ||
    escalateMutation.isPending ||
    bulkApproveMutation.isPending ||
    bulkRejectMutation.isPending;

  return {
    approve: async (id, payload) => {
      await approveMutation.mutateAsync({ id, payload });
    },
    reject: async (id, payload) => {
      await rejectMutation.mutateAsync({ id, payload });
    },
    escalate: async (id, payload) => {
      await escalateMutation.mutateAsync({ id, payload });
    },
    bulkApprove: async (ids, note) => {
      await bulkApproveMutation.mutateAsync({ ids, note });
    },
    bulkReject: async (ids, note) => {
      await bulkRejectMutation.mutateAsync({ ids, note });
    },
    isProcessing,
    processingIds,
    error,
    clearError: () => setError(null),
  };
}

// ============================================
// useApprovalFilters Hook
// ============================================

interface UseApprovalFiltersReturn {
  filters: ApprovalFilters;
  setFilter: <K extends keyof ApprovalFilters>(key: K, value: ApprovalFilters[K]) => void;
  setFilters: (filters: Partial<ApprovalFilters>) => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;
  activeFilterCount: number;
}

const DEFAULT_FILTERS: ApprovalFilters = {
  status: ['pending'],
  priority: undefined,
  riskLevel: undefined,
  agentId: undefined,
  search: undefined,
  startDate: undefined,
  endDate: undefined,
};

export function useApprovalFilters(
  initialFilters: ApprovalFilters = DEFAULT_FILTERS
): UseApprovalFiltersReturn {
  const [filters, setFiltersState] = useState<ApprovalFilters>(initialFilters);

  const setFilter = useCallback(
    <K extends keyof ApprovalFilters>(key: K, value: ApprovalFilters[K]) => {
      setFiltersState((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const setFilters = useCallback((newFilters: Partial<ApprovalFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...newFilters }));
  }, []);

  const clearFilters = useCallback(() => {
    setFiltersState(DEFAULT_FILTERS);
  }, []);

  const hasActiveFilters = useMemo(() => {
    return Object.entries(filters).some(([key, value]) => {
      if (key === 'status' && Array.isArray(value) && value.length === 1 && value[0] === 'pending') {
        return false; // Default filter, not considered "active"
      }
      if (Array.isArray(value)) return value.length > 0;
      return value !== undefined && value !== '';
    });
  }, [filters]);

  const activeFilterCount = useMemo(() => {
    return Object.entries(filters).filter(([key, value]) => {
      if (key === 'status' && Array.isArray(value) && value.length === 1 && value[0] === 'pending') {
        return false;
      }
      if (Array.isArray(value)) return value.length > 0;
      return value !== undefined && value !== '';
    }).length;
  }, [filters]);

  return {
    filters,
    setFilter,
    setFilters,
    clearFilters,
    hasActiveFilters,
    activeFilterCount,
  };
}

// ============================================
// useApprovalStats Hook
// ============================================

interface UseApprovalStatsOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UseApprovalStatsReturn {
  stats: ApprovalStats | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useApprovalStats(
  options: UseApprovalStatsOptions = {}
): UseApprovalStatsReturn {
  const { autoRefresh = true, refreshInterval = 60000 } = options;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: approvalKeys.stats(),
    queryFn: fetchApprovalStats,
    refetchInterval: autoRefresh ? refreshInterval : false,
    staleTime: 30000,
  });

  return {
    stats: data?.data || null,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}

// ============================================
// useApprovalNotifications Hook
// ============================================

interface ApprovalNotification {
  id: string;
  type: 'new_request' | 'status_changed' | 'expiring_soon' | 'expired';
  approval: ApprovalRequest;
  timestamp: string;
  read: boolean;
}

interface UseApprovalNotificationsOptions {
  expirationWarningMinutes?: number;
  enableSound?: boolean;
  enableDesktopNotifications?: boolean;
}

interface UseApprovalNotificationsReturn {
  notifications: ApprovalNotification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotification: (id: string) => void;
  clearAll: () => void;
}

export function useApprovalNotifications(
  options: UseApprovalNotificationsOptions = {}
): UseApprovalNotificationsReturn {
  const {
    expirationWarningMinutes = 10,
    enableSound = false,
    enableDesktopNotifications = false,
  } = options;

  const [notifications, setNotifications] = useState<ApprovalNotification[]>([]);
  const soundRef = useRef<HTMLAudioElement | null>(null);
  const { approvals } = useApprovalsStore();

  // Initialize notification sound
  useEffect(() => {
    if (enableSound && typeof window !== 'undefined') {
      soundRef.current = new Audio('/sounds/notification.mp3');
    }
  }, [enableSound]);

  // Request desktop notification permission
  useEffect(() => {
    if (enableDesktopNotifications && typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, [enableDesktopNotifications]);

  // Check for expiring approvals
  useEffect(() => {
    const checkExpiring = () => {
      const now = new Date();
      const warningThreshold = expirationWarningMinutes * 60 * 1000;

      approvals
        .filter((a) => a.status === 'pending')
        .forEach((approval) => {
          const expiresAt = new Date(approval.expires_at);
          const timeUntilExpiry = expiresAt.getTime() - now.getTime();

          if (timeUntilExpiry > 0 && timeUntilExpiry <= warningThreshold) {
            const existingNotification = notifications.find(
              (n) => n.approval.id === approval.id && n.type === 'expiring_soon'
            );

            if (!existingNotification) {
              const newNotification: ApprovalNotification = {
                id: crypto.randomUUID(),
                type: 'expiring_soon',
                approval,
                timestamp: new Date().toISOString(),
                read: false,
              };

              setNotifications((prev) => [newNotification, ...prev]);
              playNotificationSound();
              showDesktopNotification(
                'Approval Expiring Soon',
                `"${approval.title}" expires in ${Math.round(timeUntilExpiry / 60000)} minutes`
              );
            }
          }
        });
    };

    const interval = setInterval(checkExpiring, 60000);
    checkExpiring();

    return () => clearInterval(interval);
  }, [approvals, expirationWarningMinutes, notifications]);

  const playNotificationSound = useCallback(() => {
    if (enableSound && soundRef.current) {
      soundRef.current.play().catch(() => {
        // Ignore audio play errors (user hasn't interacted with page yet)
      });
    }
  }, [enableSound]);

  const showDesktopNotification = useCallback(
    (title: string, body: string) => {
      if (
        enableDesktopNotifications &&
        typeof window !== 'undefined' &&
        'Notification' in window &&
        Notification.permission === 'granted'
      ) {
        new Notification(title, { body, icon: '/favicon.ico' });
      }
    },
    [enableDesktopNotifications]
  );

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAll,
  };
}

// ============================================
// useApprovalDetail Hook
// ============================================

interface UseApprovalDetailOptions {
  id: UUID | null;
  enabled?: boolean;
}

interface UseApprovalDetailReturn {
  approval: ApprovalRequest | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useApprovalDetail(
  options: UseApprovalDetailOptions
): UseApprovalDetailReturn {
  const { id, enabled = true } = options;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: approvalKeys.detail(id!),
    queryFn: () => fetchApproval(id!),
    enabled: enabled && !!id,
  });

  return {
    approval: data?.data || null,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}

// ============================================
// Export Types
// ============================================

export type {
  ApprovalFilters,
  ApprovalStats,
  ApprovalNotification,
  UseApprovalQueueOptions,
  UseApprovalQueueReturn,
  UseApprovalActionsReturn,
  UseApprovalFiltersReturn,
  UseApprovalStatsOptions,
  UseApprovalStatsReturn,
  UseApprovalNotificationsOptions,
  UseApprovalNotificationsReturn,
  UseApprovalDetailOptions,
  UseApprovalDetailReturn,
};
