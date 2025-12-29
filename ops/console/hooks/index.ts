/**
 * AgentOS Ops Console - Hooks Barrel Export
 * Central export for all custom React hooks
 */

// ============================================
// Approval Hooks
// ============================================

export {
  // Core Hooks
  useApprovalQueue,
  useApprovalActions,
  useApprovalFilters,
  useApprovalStats,
  useApprovalNotifications,
  useApprovalDetail,

  // Query Keys
  approvalKeys,

  // Types
  type ApprovalFilters,
  type ApprovalStats,
  type ApprovalNotification,
  type UseApprovalQueueOptions,
  type UseApprovalQueueReturn,
  type UseApprovalActionsReturn,
  type UseApprovalFiltersReturn,
  type UseApprovalStatsOptions,
  type UseApprovalStatsReturn,
  type UseApprovalNotificationsOptions,
  type UseApprovalNotificationsReturn,
  type UseApprovalDetailOptions,
  type UseApprovalDetailReturn,
} from './useApprovals';
