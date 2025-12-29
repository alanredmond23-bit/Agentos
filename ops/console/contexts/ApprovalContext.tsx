'use client';

/**
 * AgentOS Ops Console - Approval Context
 * Context provider for approval workflow state management
 */

import React, {
  createContext,
  useContext,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import {
  useApprovalQueue,
  useApprovalActions,
  useApprovalFilters,
  useApprovalStats,
  useApprovalNotifications,
  type ApprovalFilters,
  type ApprovalStats,
  type ApprovalNotification,
} from '@/hooks/useApprovals';
import type { ApprovalRequest, UUID } from '@/types';

// ============================================
// Context Types
// ============================================

interface ApprovalContextValue {
  // Queue state
  approvals: ApprovalRequest[];
  isLoading: boolean;
  isRefetching: boolean;
  error: Error | null;
  totalCount: number;
  hasMore: boolean;

  // Actions
  approve: (id: UUID, note?: string) => Promise<void>;
  reject: (id: UUID, note?: string) => Promise<void>;
  escalate: (id: UUID, note?: string, escalateTo?: UUID) => Promise<void>;
  bulkApprove: (ids: UUID[], note?: string) => Promise<void>;
  bulkReject: (ids: UUID[], note?: string) => Promise<void>;
  isProcessing: boolean;
  processingIds: Set<UUID>;

  // Filters
  filters: ApprovalFilters;
  setFilter: <K extends keyof ApprovalFilters>(key: K, value: ApprovalFilters[K]) => void;
  setFilters: (filters: Partial<ApprovalFilters>) => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;
  activeFilterCount: number;

  // Stats
  stats: ApprovalStats | null;
  statsLoading: boolean;

  // Notifications
  notifications: ApprovalNotification[];
  unreadNotificationCount: number;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  clearNotification: (id: string) => void;
  clearAllNotifications: () => void;

  // Utilities
  refetch: () => void;
  loadMore: () => void;
  getApprovalById: (id: UUID) => ApprovalRequest | undefined;
  getPendingApprovals: () => ApprovalRequest[];
  getUrgentApprovals: () => ApprovalRequest[];
}

// ============================================
// Context Creation
// ============================================

const ApprovalContext = createContext<ApprovalContextValue | null>(null);

// ============================================
// Provider Props
// ============================================

interface ApprovalProviderProps {
  children: ReactNode;
  initialFilters?: ApprovalFilters;
  autoRefresh?: boolean;
  refreshInterval?: number;
  enableWebSocket?: boolean;
  enableNotificationSound?: boolean;
  enableDesktopNotifications?: boolean;
  expirationWarningMinutes?: number;
}

// ============================================
// Provider Component
// ============================================

export function ApprovalProvider({
  children,
  initialFilters,
  autoRefresh = true,
  refreshInterval = 30000,
  enableWebSocket = true,
  enableNotificationSound = false,
  enableDesktopNotifications = false,
  expirationWarningMinutes = 10,
}: ApprovalProviderProps) {
  // Initialize filters hook
  const {
    filters,
    setFilter,
    setFilters,
    clearFilters,
    hasActiveFilters,
    activeFilterCount,
  } = useApprovalFilters(initialFilters);

  // Initialize queue hook with current filters
  const {
    approvals,
    isLoading,
    isRefetching,
    error,
    refetch,
    hasMore,
    totalCount,
    loadMore,
  } = useApprovalQueue({
    filters,
    autoRefresh,
    refreshInterval,
    enableWebSocket,
  });

  // Initialize actions hook
  const {
    approve: approveAction,
    reject: rejectAction,
    escalate: escalateAction,
    bulkApprove: bulkApproveAction,
    bulkReject: bulkRejectAction,
    isProcessing,
    processingIds,
  } = useApprovalActions();

  // Initialize stats hook
  const { stats, isLoading: statsLoading } = useApprovalStats({
    autoRefresh,
    refreshInterval: refreshInterval * 2, // Stats refresh less frequently
  });

  // Initialize notifications hook
  const {
    notifications,
    unreadCount: unreadNotificationCount,
    markAsRead: markNotificationAsRead,
    markAllAsRead: markAllNotificationsAsRead,
    clearNotification,
    clearAll: clearAllNotifications,
  } = useApprovalNotifications({
    expirationWarningMinutes,
    enableSound: enableNotificationSound,
    enableDesktopNotifications,
  });

  // Action wrappers with simplified API
  const approve = useCallback(
    async (id: UUID, note?: string) => {
      await approveAction(id, note ? { note } : undefined);
    },
    [approveAction]
  );

  const reject = useCallback(
    async (id: UUID, note?: string) => {
      await rejectAction(id, note ? { note } : undefined);
    },
    [rejectAction]
  );

  const escalate = useCallback(
    async (id: UUID, note?: string, escalateTo?: UUID) => {
      await escalateAction(id, { note, escalate_to: escalateTo });
    },
    [escalateAction]
  );

  const bulkApprove = useCallback(
    async (ids: UUID[], note?: string) => {
      await bulkApproveAction(ids, note);
    },
    [bulkApproveAction]
  );

  const bulkReject = useCallback(
    async (ids: UUID[], note?: string) => {
      await bulkRejectAction(ids, note);
    },
    [bulkRejectAction]
  );

  // Utility functions
  const getApprovalById = useCallback(
    (id: UUID) => approvals.find((a) => a.id === id),
    [approvals]
  );

  const getPendingApprovals = useCallback(
    () => approvals.filter((a) => a.status === 'pending'),
    [approvals]
  );

  const getUrgentApprovals = useCallback(
    () => approvals.filter((a) => a.status === 'pending' && a.priority === 'urgent'),
    [approvals]
  );

  // Memoize context value
  const value = useMemo<ApprovalContextValue>(
    () => ({
      // Queue state
      approvals,
      isLoading,
      isRefetching,
      error,
      totalCount,
      hasMore,

      // Actions
      approve,
      reject,
      escalate,
      bulkApprove,
      bulkReject,
      isProcessing,
      processingIds,

      // Filters
      filters,
      setFilter,
      setFilters,
      clearFilters,
      hasActiveFilters,
      activeFilterCount,

      // Stats
      stats,
      statsLoading,

      // Notifications
      notifications,
      unreadNotificationCount,
      markNotificationAsRead,
      markAllNotificationsAsRead,
      clearNotification,
      clearAllNotifications,

      // Utilities
      refetch,
      loadMore,
      getApprovalById,
      getPendingApprovals,
      getUrgentApprovals,
    }),
    [
      approvals,
      isLoading,
      isRefetching,
      error,
      totalCount,
      hasMore,
      approve,
      reject,
      escalate,
      bulkApprove,
      bulkReject,
      isProcessing,
      processingIds,
      filters,
      setFilter,
      setFilters,
      clearFilters,
      hasActiveFilters,
      activeFilterCount,
      stats,
      statsLoading,
      notifications,
      unreadNotificationCount,
      markNotificationAsRead,
      markAllNotificationsAsRead,
      clearNotification,
      clearAllNotifications,
      refetch,
      loadMore,
      getApprovalById,
      getPendingApprovals,
      getUrgentApprovals,
    ]
  );

  return (
    <ApprovalContext.Provider value={value}>{children}</ApprovalContext.Provider>
  );
}

// ============================================
// Custom Hook
// ============================================

export function useApprovalContext(): ApprovalContextValue {
  const context = useContext(ApprovalContext);

  if (!context) {
    throw new Error('useApprovalContext must be used within an ApprovalProvider');
  }

  return context;
}

// ============================================
// Selector Hooks
// ============================================

/**
 * Hook to select only approval queue data
 */
export function useApprovalQueueContext() {
  const { approvals, isLoading, isRefetching, error, totalCount, hasMore, refetch, loadMore } =
    useApprovalContext();

  return { approvals, isLoading, isRefetching, error, totalCount, hasMore, refetch, loadMore };
}

/**
 * Hook to select only approval actions
 */
export function useApprovalActionsContext() {
  const { approve, reject, escalate, bulkApprove, bulkReject, isProcessing, processingIds } =
    useApprovalContext();

  return { approve, reject, escalate, bulkApprove, bulkReject, isProcessing, processingIds };
}

/**
 * Hook to select only approval filters
 */
export function useApprovalFiltersContext() {
  const { filters, setFilter, setFilters, clearFilters, hasActiveFilters, activeFilterCount } =
    useApprovalContext();

  return { filters, setFilter, setFilters, clearFilters, hasActiveFilters, activeFilterCount };
}

/**
 * Hook to select only approval stats
 */
export function useApprovalStatsContext() {
  const { stats, statsLoading } = useApprovalContext();
  return { stats, statsLoading };
}

/**
 * Hook to select only approval notifications
 */
export function useApprovalNotificationsContext() {
  const {
    notifications,
    unreadNotificationCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    clearNotification,
    clearAllNotifications,
  } = useApprovalContext();

  return {
    notifications,
    unreadNotificationCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    clearNotification,
    clearAllNotifications,
  };
}

// ============================================
// Export Types
// ============================================

export type { ApprovalContextValue, ApprovalProviderProps };
