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

// ============================================
// Live Preview Hooks
// ============================================

export {
  // Core Hook
  useLivePreview,

  // Specialized Hooks
  useFormField,
  useSyncWithExternal,
  useLivePreviewShortcuts,

  // Types
  type UseLivePreviewOptions,
  type UseLivePreviewReturn,
} from './useLivePreview';

// ============================================
// Version History Hooks
// ============================================

export {
  // Main Hook
  useVersionHistory,

  // Convenience Hooks
  useVersionSelection,
  useVersionComparison,
  useVersionFilters,
  useVersionRollback,
  useVersionStats,

  // Types
  type ViewMode,
  type UseVersionHistoryOptions,
  type UseVersionHistoryState,
  type UseVersionHistoryActions,
  type UseVersionHistoryReturn,
} from './useVersionHistory';

// ============================================
// Dependency Graph Hooks
// ============================================

export {
  // Main Hook
  useDependencyGraph,

  // Types
  type GraphLayoutType,
  type DependencyGraphState,
  type DependencyGraphActions,
  type UseDependencyGraphResult,
} from './useDependencyGraph';
