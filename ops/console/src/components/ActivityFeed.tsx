/**
 * ActivityFeed Component
 *
 * Real-time agent activity display with virtual scrolling,
 * filtering, and time-based grouping for the AgentOS Ops Console.
 *
 * Features:
 * - Virtual scrolling for 60fps performance with large datasets
 * - WebSocket integration for real-time updates
 * - Filterable by pack, agent, and status
 * - Time-based grouping (now, 5m ago, 1h ago, etc.)
 * - Expandable detail view per activity
 * - Enterprise-grade accessibility and keyboard navigation
 */

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  memo,
  ReactNode,
  KeyboardEvent,
} from 'react';

// =============================================================================
// Types and Interfaces
// =============================================================================

export type ActivityStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'warning'
  | 'approval_required';

export type ActivityType =
  | 'task_start'
  | 'task_complete'
  | 'error'
  | 'warning'
  | 'approval_request'
  | 'system_event'
  | 'pii_redaction'
  | 'rate_limit'
  | 'deployment';

export interface ActivityItem {
  id: string;
  timestamp: string;
  type: ActivityType;
  status: ActivityStatus;
  pack: string;
  agent: string;
  runId: string;
  title: string;
  description?: string;
  metadata?: Record<string, unknown>;
  relatedActivities?: string[];
  duration?: number;
  priority?: 'low' | 'normal' | 'high' | 'critical';
}

export interface ActivityFeedProps {
  packFilter?: string[];
  agentFilter?: string[];
  statusFilter?: ActivityStatus[];
  limit?: number;
  realtime?: boolean;
  onActivityClick?: (activity: ActivityItem) => void;
  onApprovalAction?: (activityId: string, action: 'approve' | 'reject') => void;
  className?: string;
}

interface TimeGroup {
  label: string;
  activities: ActivityItem[];
  timestamp: Date;
}

interface VirtualScrollState {
  startIndex: number;
  endIndex: number;
  offsetTop: number;
  visibleCount: number;
}

interface WebSocketMessage {
  type: 'activity_added' | 'activity_updated' | 'activity_removed' | 'batch_update';
  payload: ActivityItem | ActivityItem[] | string;
}

// =============================================================================
// Constants
// =============================================================================

const ITEM_HEIGHT = 72;
const EXPANDED_ITEM_HEIGHT = 280;
const BUFFER_SIZE = 5;
const WEBSOCKET_RECONNECT_DELAY = 3000;
const WEBSOCKET_MAX_RETRIES = 5;

const TIME_GROUPS = [
  { label: 'Just now', maxAge: 60 * 1000 },
  { label: '5 minutes ago', maxAge: 5 * 60 * 1000 },
  { label: '15 minutes ago', maxAge: 15 * 60 * 1000 },
  { label: '30 minutes ago', maxAge: 30 * 60 * 1000 },
  { label: '1 hour ago', maxAge: 60 * 60 * 1000 },
  { label: '2 hours ago', maxAge: 2 * 60 * 60 * 1000 },
  { label: '6 hours ago', maxAge: 6 * 60 * 60 * 1000 },
  { label: 'Today', maxAge: 24 * 60 * 60 * 1000 },
  { label: 'Yesterday', maxAge: 48 * 60 * 60 * 1000 },
  { label: 'This week', maxAge: 7 * 24 * 60 * 60 * 1000 },
  { label: 'Older', maxAge: Infinity },
] as const;

const STATUS_CONFIG: Record<ActivityStatus, { color: string; bgColor: string; icon: string }> = {
  pending: { color: 'text-yellow-600', bgColor: 'bg-yellow-100', icon: 'clock' },
  running: { color: 'text-blue-600', bgColor: 'bg-blue-100', icon: 'spinner' },
  completed: { color: 'text-green-600', bgColor: 'bg-green-100', icon: 'check' },
  failed: { color: 'text-red-600', bgColor: 'bg-red-100', icon: 'x-circle' },
  warning: { color: 'text-orange-600', bgColor: 'bg-orange-100', icon: 'alert-triangle' },
  approval_required: { color: 'text-purple-600', bgColor: 'bg-purple-100', icon: 'shield' },
};

const TYPE_CONFIG: Record<ActivityType, { label: string; icon: string }> = {
  task_start: { label: 'Task Started', icon: 'play' },
  task_complete: { label: 'Task Complete', icon: 'check-circle' },
  error: { label: 'Error', icon: 'x-circle' },
  warning: { label: 'Warning', icon: 'alert-triangle' },
  approval_request: { label: 'Approval Request', icon: 'shield-check' },
  system_event: { label: 'System Event', icon: 'cog' },
  pii_redaction: { label: 'PII Redacted', icon: 'eye-off' },
  rate_limit: { label: 'Rate Limit', icon: 'gauge' },
  deployment: { label: 'Deployment', icon: 'rocket' },
};

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Formats a timestamp relative to now with appropriate precision
 */
function formatRelativeTime(timestamp: string | Date): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  if (diffMs < 60 * 1000) {
    const seconds = Math.floor(diffMs / 1000);
    return seconds <= 1 ? 'just now' : `${seconds}s ago`;
  }

  if (diffMs < 60 * 60 * 1000) {
    const minutes = Math.floor(diffMs / (60 * 1000));
    return `${minutes}m ago`;
  }

  if (diffMs < 24 * 60 * 60 * 1000) {
    const hours = Math.floor(diffMs / (60 * 60 * 1000));
    return `${hours}h ago`;
  }

  if (diffMs < 7 * 24 * 60 * 60 * 1000) {
    const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    return `${days}d ago`;
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

/**
 * Formats a duration in milliseconds to a human-readable string
 */
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60 * 1000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 60 * 60 * 1000) {
    const minutes = Math.floor(ms / (60 * 1000));
    const seconds = Math.floor((ms % (60 * 1000)) / 1000);
    return `${minutes}m ${seconds}s`;
  }
  const hours = Math.floor(ms / (60 * 60 * 1000));
  const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  return `${hours}h ${minutes}m`;
}

/**
 * Groups activities by time period
 */
function groupActivitiesByTime(activities: ActivityItem[]): TimeGroup[] {
  const now = new Date();
  const groups: Map<string, ActivityItem[]> = new Map();

  for (const activity of activities) {
    const activityTime = new Date(activity.timestamp);
    const age = now.getTime() - activityTime.getTime();

    const group = TIME_GROUPS.find((g) => age <= g.maxAge);
    const label = group?.label ?? 'Older';

    if (!groups.has(label)) {
      groups.set(label, []);
    }
    groups.get(label)!.push(activity);
  }

  return TIME_GROUPS
    .filter((g) => groups.has(g.label))
    .map((g) => ({
      label: g.label,
      activities: groups.get(g.label)!,
      timestamp: new Date(now.getTime() - g.maxAge),
    }));
}

/**
 * Generates a unique ID for new activities
 */
function generateActivityId(): string {
  return `act-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// =============================================================================
// Hooks
// =============================================================================

/**
 * Custom hook for WebSocket connection with auto-reconnect
 */
function useWebSocket(
  url: string | null,
  onMessage: (message: WebSocketMessage) => void,
  enabled: boolean = true
): { connected: boolean; error: Error | null; reconnecting: boolean } {
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [reconnecting, setReconnecting] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    if (!url || !enabled) return;

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        setError(null);
        setReconnecting(false);
        retryCountRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          onMessage(message);
        } catch (err) {
          console.error('[ActivityFeed] Failed to parse WebSocket message:', err);
        }
      };

      ws.onerror = (event) => {
        console.error('[ActivityFeed] WebSocket error:', event);
        setError(new Error('WebSocket connection error'));
      };

      ws.onclose = () => {
        setConnected(false);
        wsRef.current = null;

        if (enabled && retryCountRef.current < WEBSOCKET_MAX_RETRIES) {
          setReconnecting(true);
          retryTimeoutRef.current = setTimeout(() => {
            retryCountRef.current++;
            connect();
          }, WEBSOCKET_RECONNECT_DELAY * Math.pow(2, retryCountRef.current));
        }
      };
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to connect'));
    }
  }, [url, enabled, onMessage]);

  useEffect(() => {
    connect();

    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return { connected, error, reconnecting };
}

/**
 * Custom hook for virtual scrolling
 */
function useVirtualScroll(
  containerRef: React.RefObject<HTMLDivElement>,
  itemCount: number,
  itemHeight: number,
  expandedItems: Set<string>,
  items: ActivityItem[]
): VirtualScrollState {
  const [scrollState, setScrollState] = useState<VirtualScrollState>({
    startIndex: 0,
    endIndex: 20,
    offsetTop: 0,
    visibleCount: 20,
  });

  const calculateItemPosition = useCallback(
    (index: number): number => {
      let position = 0;
      for (let i = 0; i < index && i < items.length; i++) {
        position += expandedItems.has(items[i].id) ? EXPANDED_ITEM_HEIGHT : itemHeight;
      }
      return position;
    },
    [expandedItems, itemHeight, items]
  );

  const getTotalHeight = useCallback((): number => {
    return items.reduce((total, item) => {
      return total + (expandedItems.has(item.id) ? EXPANDED_ITEM_HEIGHT : itemHeight);
    }, 0);
  }, [items, expandedItems, itemHeight]);

  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const scrollTop = container.scrollTop;
    const viewportHeight = container.clientHeight;

    // Binary search for start index
    let startIndex = 0;
    let accumulatedHeight = 0;

    for (let i = 0; i < items.length; i++) {
      const height = expandedItems.has(items[i].id) ? EXPANDED_ITEM_HEIGHT : itemHeight;
      if (accumulatedHeight + height > scrollTop) {
        startIndex = Math.max(0, i - BUFFER_SIZE);
        break;
      }
      accumulatedHeight += height;
    }

    // Calculate end index
    let endHeight = 0;
    let endIndex = startIndex;
    const startPosition = calculateItemPosition(startIndex);

    for (let i = startIndex; i < items.length; i++) {
      const height = expandedItems.has(items[i].id) ? EXPANDED_ITEM_HEIGHT : itemHeight;
      endHeight += height;
      endIndex = i + 1;
      if (endHeight > viewportHeight + 2 * BUFFER_SIZE * itemHeight) {
        break;
      }
    }

    endIndex = Math.min(items.length, endIndex + BUFFER_SIZE);

    setScrollState({
      startIndex,
      endIndex,
      offsetTop: startPosition,
      visibleCount: endIndex - startIndex,
    });
  }, [containerRef, items, expandedItems, itemHeight, calculateItemPosition]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    handleScroll();
    container.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [containerRef, handleScroll]);

  // Recalculate when items or expanded state changes
  useEffect(() => {
    handleScroll();
  }, [itemCount, expandedItems.size, handleScroll]);

  return { ...scrollState, totalHeight: getTotalHeight() } as VirtualScrollState & { totalHeight: number };
}

/**
 * Custom hook for keyboard navigation
 */
function useKeyboardNavigation(
  activities: ActivityItem[],
  expandedItems: Set<string>,
  onToggleExpand: (id: string) => void,
  onSelect: (activity: ActivityItem) => void
): {
  focusedIndex: number;
  setFocusedIndex: (index: number) => void;
  handleKeyDown: (e: KeyboardEvent) => void;
} {
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setFocusedIndex((prev) => Math.min(prev + 1, activities.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setFocusedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          if (focusedIndex >= 0 && focusedIndex < activities.length) {
            onToggleExpand(activities[focusedIndex].id);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setFocusedIndex(-1);
          break;
        case 'Home':
          e.preventDefault();
          setFocusedIndex(0);
          break;
        case 'End':
          e.preventDefault();
          setFocusedIndex(activities.length - 1);
          break;
        default:
          break;
      }
    },
    [activities, focusedIndex, onToggleExpand]
  );

  return { focusedIndex, setFocusedIndex, handleKeyDown };
}

// =============================================================================
// Sub-Components
// =============================================================================

interface StatusIconProps {
  status: ActivityStatus;
  className?: string;
}

const StatusIcon = memo(function StatusIcon({ status, className = '' }: StatusIconProps) {
  const config = STATUS_CONFIG[status];

  const iconPaths: Record<string, ReactNode> = {
    clock: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    ),
    spinner: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    ),
    check: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    ),
    'x-circle': (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    ),
    'alert-triangle': (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    ),
    shield: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    ),
  };

  return (
    <svg
      className={`w-5 h-5 ${config.color} ${className} ${status === 'running' ? 'animate-spin' : ''}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      {iconPaths[config.icon]}
    </svg>
  );
});

interface TypeBadgeProps {
  type: ActivityType;
  priority?: 'low' | 'normal' | 'high' | 'critical';
}

const TypeBadge = memo(function TypeBadge({ type, priority }: TypeBadgeProps) {
  const config = TYPE_CONFIG[type];

  const priorityColors = {
    low: 'bg-gray-100 text-gray-600',
    normal: 'bg-blue-100 text-blue-700',
    high: 'bg-orange-100 text-orange-700',
    critical: 'bg-red-100 text-red-700',
  };

  const baseColor = priority ? priorityColors[priority] : 'bg-gray-100 text-gray-700';

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${baseColor}`}
      title={config.label}
    >
      {config.label}
    </span>
  );
});

interface ActivityItemRowProps {
  activity: ActivityItem;
  isExpanded: boolean;
  isFocused: boolean;
  onToggleExpand: () => void;
  onApprovalAction?: (action: 'approve' | 'reject') => void;
  style?: React.CSSProperties;
}

const ActivityItemRow = memo(function ActivityItemRow({
  activity,
  isExpanded,
  isFocused,
  onToggleExpand,
  onApprovalAction,
  style,
}: ActivityItemRowProps) {
  const statusConfig = STATUS_CONFIG[activity.status];
  const rowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isFocused && rowRef.current) {
      rowRef.current.focus();
    }
  }, [isFocused]);

  return (
    <div
      ref={rowRef}
      role="row"
      tabIndex={isFocused ? 0 : -1}
      aria-expanded={isExpanded}
      className={`
        border-b border-gray-100 transition-all duration-200 ease-out
        ${isFocused ? 'ring-2 ring-blue-500 ring-inset' : ''}
        ${isExpanded ? 'bg-gray-50' : 'hover:bg-gray-50'}
        cursor-pointer select-none
      `}
      style={style}
      onClick={onToggleExpand}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggleExpand();
        }
      }}
    >
      {/* Collapsed View */}
      <div className="flex items-center px-4 py-3 min-h-[72px]">
        {/* Status Indicator */}
        <div className={`flex-shrink-0 w-10 h-10 rounded-full ${statusConfig.bgColor} flex items-center justify-center mr-3`}>
          <StatusIcon status={activity.status} />
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-gray-900 truncate">{activity.title}</span>
            <TypeBadge type={activity.type} priority={activity.priority} />
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">{activity.pack}</span>
            <span className="text-gray-300">/</span>
            <span className="truncate">{activity.agent}</span>
          </div>
        </div>

        {/* Timestamp & Duration */}
        <div className="flex-shrink-0 text-right ml-4">
          <div className="text-sm text-gray-600">{formatRelativeTime(activity.timestamp)}</div>
          {activity.duration && (
            <div className="text-xs text-gray-400">{formatDuration(activity.duration)}</div>
          )}
        </div>

        {/* Expand Indicator */}
        <div className="flex-shrink-0 ml-3">
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Expanded Detail View */}
      {isExpanded && (
        <div
          className="px-4 pb-4 animate-in slide-in-from-top-2 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="ml-13 pl-3 border-l-2 border-gray-200">
            {/* Description */}
            {activity.description && (
              <div className="mb-4">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Description</h4>
                <p className="text-sm text-gray-700">{activity.description}</p>
              </div>
            )}

            {/* Run ID */}
            <div className="mb-4">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Run ID</h4>
              <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">{activity.runId}</code>
            </div>

            {/* Metadata */}
            {activity.metadata && Object.keys(activity.metadata).length > 0 && (
              <div className="mb-4">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Metadata</h4>
                <div className="bg-gray-900 rounded-lg p-3 overflow-x-auto">
                  <pre className="text-sm text-gray-100 font-mono">
                    {JSON.stringify(activity.metadata, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {/* Related Activities */}
            {activity.relatedActivities && activity.relatedActivities.length > 0 && (
              <div className="mb-4">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Related Activities</h4>
                <div className="flex flex-wrap gap-2">
                  {activity.relatedActivities.map((relId) => (
                    <span key={relId} className="text-xs font-mono bg-gray-100 px-2 py-1 rounded text-gray-600">
                      {relId}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Actions for Approval Requests */}
            {activity.type === 'approval_request' && activity.status === 'approval_required' && onApprovalAction && (
              <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200">
                <button
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium text-sm"
                  onClick={() => onApprovalAction('approve')}
                >
                  Approve
                </button>
                <button
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors font-medium text-sm"
                  onClick={() => onApprovalAction('reject')}
                >
                  Reject
                </button>
              </div>
            )}

            {/* Full Timestamp */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <span className="text-xs text-gray-400">
                {new Date(activity.timestamp).toLocaleString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  timeZoneName: 'short',
                })}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

interface TimeGroupHeaderProps {
  label: string;
  count: number;
}

const TimeGroupHeader = memo(function TimeGroupHeader({ label, count }: TimeGroupHeaderProps) {
  return (
    <div className="sticky top-0 z-10 bg-gray-100 border-b border-gray-200 px-4 py-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-600">{label}</span>
        <span className="text-xs text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full">{count}</span>
      </div>
    </div>
  );
});

interface FilterBarProps {
  packs: string[];
  agents: string[];
  selectedPacks: string[];
  selectedAgents: string[];
  selectedStatuses: ActivityStatus[];
  onPackChange: (packs: string[]) => void;
  onAgentChange: (agents: string[]) => void;
  onStatusChange: (statuses: ActivityStatus[]) => void;
  onClearFilters: () => void;
  totalCount: number;
  filteredCount: number;
}

const FilterBar = memo(function FilterBar({
  packs,
  agents,
  selectedPacks,
  selectedAgents,
  selectedStatuses,
  onPackChange,
  onAgentChange,
  onStatusChange,
  onClearFilters,
  totalCount,
  filteredCount,
}: FilterBarProps) {
  const hasActiveFilters = selectedPacks.length > 0 || selectedAgents.length > 0 || selectedStatuses.length > 0;

  const handlePackToggle = (pack: string) => {
    if (selectedPacks.includes(pack)) {
      onPackChange(selectedPacks.filter((p) => p !== pack));
    } else {
      onPackChange([...selectedPacks, pack]);
    }
  };

  const handleAgentToggle = (agent: string) => {
    if (selectedAgents.includes(agent)) {
      onAgentChange(selectedAgents.filter((a) => a !== agent));
    } else {
      onAgentChange([...selectedAgents, agent]);
    }
  };

  const handleStatusToggle = (status: ActivityStatus) => {
    if (selectedStatuses.includes(status)) {
      onStatusChange(selectedStatuses.filter((s) => s !== status));
    } else {
      onStatusChange([...selectedStatuses, status]);
    }
  };

  const allStatuses: ActivityStatus[] = ['pending', 'running', 'completed', 'failed', 'warning', 'approval_required'];

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex flex-wrap items-center gap-4">
        {/* Pack Filter */}
        <div className="filter-group">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Pack</label>
          <div className="flex flex-wrap gap-1">
            {packs.map((pack) => (
              <button
                key={pack}
                className={`px-2 py-1 text-xs rounded-md transition-colors ${
                  selectedPacks.includes(pack)
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                onClick={() => handlePackToggle(pack)}
              >
                {pack}
              </button>
            ))}
          </div>
        </div>

        {/* Agent Filter */}
        <div className="filter-group">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Agent</label>
          <select
            className="text-sm border border-gray-300 rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={selectedAgents.length === 1 ? selectedAgents[0] : ''}
            onChange={(e) => onAgentChange(e.target.value ? [e.target.value] : [])}
          >
            <option value="">All Agents</option>
            {agents.map((agent) => (
              <option key={agent} value={agent}>{agent}</option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div className="filter-group">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Status</label>
          <div className="flex flex-wrap gap-1">
            {allStatuses.map((status) => {
              const config = STATUS_CONFIG[status];
              return (
                <button
                  key={status}
                  className={`px-2 py-1 text-xs rounded-md transition-colors ${
                    selectedStatuses.includes(status)
                      ? `${config.bgColor} ${config.color} ring-2 ring-offset-1`
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  onClick={() => handleStatusToggle(status)}
                >
                  {status.replace('_', ' ')}
                </button>
              );
            })}
          </div>
        </div>

        {/* Clear & Stats */}
        <div className="flex-1 flex items-center justify-end gap-4">
          {hasActiveFilters && (
            <button
              className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
              onClick={onClearFilters}
            >
              Clear filters
            </button>
          )}
          <span className="text-sm text-gray-500">
            {filteredCount === totalCount ? (
              <>{totalCount} activities</>
            ) : (
              <>{filteredCount} of {totalCount} activities</>
            )}
          </span>
        </div>
      </div>
    </div>
  );
});

interface ConnectionStatusProps {
  connected: boolean;
  reconnecting: boolean;
  error: Error | null;
}

const ConnectionStatus = memo(function ConnectionStatus({ connected, reconnecting, error }: ConnectionStatusProps) {
  if (error) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-md">
        <div className="w-2 h-2 bg-red-500 rounded-full" />
        <span className="text-xs text-red-700">Connection error</span>
      </div>
    );
  }

  if (reconnecting) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-50 border border-yellow-200 rounded-md">
        <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
        <span className="text-xs text-yellow-700">Reconnecting...</span>
      </div>
    );
  }

  if (connected) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-md">
        <div className="w-2 h-2 bg-green-500 rounded-full" />
        <span className="text-xs text-green-700">Live</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-md">
      <div className="w-2 h-2 bg-gray-400 rounded-full" />
      <span className="text-xs text-gray-600">Offline</span>
    </div>
  );
});

interface EmptyStateProps {
  hasFilters: boolean;
  onClearFilters: () => void;
}

const EmptyState = memo(function EmptyState({ hasFilters, onClearFilters }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <svg
        className="w-16 h-16 text-gray-300 mb-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
        />
      </svg>
      <h3 className="text-lg font-medium text-gray-900 mb-1">
        {hasFilters ? 'No matching activities' : 'No activities yet'}
      </h3>
      <p className="text-sm text-gray-500 text-center max-w-sm mb-4">
        {hasFilters
          ? 'Try adjusting your filters to see more results.'
          : 'Activities from your agents will appear here in real-time.'}
      </p>
      {hasFilters && (
        <button
          className="px-4 py-2 text-sm text-blue-600 hover:text-blue-800 transition-colors"
          onClick={onClearFilters}
        >
          Clear all filters
        </button>
      )}
    </div>
  );
});

// =============================================================================
// Mock Data Generator (for development/demo)
// =============================================================================

function generateMockActivities(count: number = 100): ActivityItem[] {
  const packs = ['marketing', 'engineering', 'finance', 'lead_faucet', 'legal', 'devops', 'research', 'product'];
  const agents = [
    'content-writer', 'code-reviewer', 'invoice-processor', 'email-sender',
    'deploy-agent', 'contract-reviewer', 'data-analyst', 'test-runner',
    'monitoring-agent', 'social-poster', 'feedback-analyzer', 'expense-tracker'
  ];
  const types: ActivityType[] = [
    'task_start', 'task_complete', 'error', 'warning',
    'approval_request', 'system_event', 'pii_redaction', 'rate_limit', 'deployment'
  ];
  const statuses: ActivityStatus[] = ['pending', 'running', 'completed', 'failed', 'warning', 'approval_required'];
  const priorities: ('low' | 'normal' | 'high' | 'critical')[] = ['low', 'normal', 'high', 'critical'];

  const titles = [
    'Processing customer feedback batch',
    'Generating marketing report',
    'Code review for PR #1234',
    'Deploying to staging environment',
    'Analyzing contract terms',
    'Sending email campaign',
    'Running integration tests',
    'Monitoring system health',
    'Processing invoice payment',
    'Indexing search database',
    'Generating weekly analytics',
    'Syncing CRM data',
  ];

  const activities: ActivityItem[] = [];
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const timestamp = new Date(now - Math.random() * 7 * 24 * 60 * 60 * 1000);
    const type = types[Math.floor(Math.random() * types.length)];
    const status = type === 'error' ? 'failed'
      : type === 'warning' ? 'warning'
      : type === 'approval_request' ? 'approval_required'
      : statuses[Math.floor(Math.random() * statuses.length)];

    activities.push({
      id: `act-${i.toString().padStart(4, '0')}`,
      timestamp: timestamp.toISOString(),
      type,
      status,
      pack: packs[Math.floor(Math.random() * packs.length)],
      agent: agents[Math.floor(Math.random() * agents.length)],
      runId: `run-${Math.random().toString(36).substring(2, 14)}`,
      title: titles[Math.floor(Math.random() * titles.length)],
      description: Math.random() > 0.5 ? 'Detailed description of what this activity is doing and why it matters for the overall system operation.' : undefined,
      metadata: Math.random() > 0.3 ? {
        taskId: `task-${Math.floor(Math.random() * 10000)}`,
        attempts: Math.floor(Math.random() * 3) + 1,
        memoryUsage: `${(Math.random() * 512).toFixed(0)}MB`,
        cpuTime: `${(Math.random() * 1000).toFixed(0)}ms`,
      } : undefined,
      duration: status === 'completed' || status === 'failed' ? Math.floor(Math.random() * 300000) : undefined,
      priority: priorities[Math.floor(Math.random() * priorities.length)],
    });
  }

  return activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

// =============================================================================
// Main Component
// =============================================================================

export function ActivityFeed({
  packFilter = [],
  agentFilter = [],
  statusFilter = [],
  limit = 1000,
  realtime = true,
  onActivityClick,
  onApprovalAction,
  className = '',
}: ActivityFeedProps): JSX.Element {
  // State
  const [activities, setActivities] = useState<ActivityItem[]>(() => generateMockActivities(200));
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [selectedPacks, setSelectedPacks] = useState<string[]>(packFilter);
  const [selectedAgents, setSelectedAgents] = useState<string[]>(agentFilter);
  const [selectedStatuses, setSelectedStatuses] = useState<ActivityStatus[]>(statusFilter);
  const [isLoading, setIsLoading] = useState(false);

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollPositionRef = useRef(0);

  // WebSocket handling
  const handleWebSocketMessage = useCallback((message: WebSocketMessage) => {
    switch (message.type) {
      case 'activity_added':
        setActivities((prev) => {
          const newActivity = message.payload as ActivityItem;
          // Maintain sort order (newest first)
          const updated = [newActivity, ...prev];
          return updated.slice(0, limit);
        });
        break;
      case 'activity_updated':
        setActivities((prev) => {
          const updatedActivity = message.payload as ActivityItem;
          return prev.map((a) => (a.id === updatedActivity.id ? updatedActivity : a));
        });
        break;
      case 'activity_removed':
        setActivities((prev) => {
          const removedId = message.payload as string;
          return prev.filter((a) => a.id !== removedId);
        });
        break;
      case 'batch_update':
        setActivities((prev) => {
          const newActivities = message.payload as ActivityItem[];
          const existingIds = new Set(prev.map((a) => a.id));
          const uniqueNew = newActivities.filter((a) => !existingIds.has(a.id));
          return [...uniqueNew, ...prev].slice(0, limit);
        });
        break;
    }
  }, [limit]);

  // WebSocket connection (disabled in demo - would use actual URL in production)
  const wsUrl = realtime ? null : null; // Replace with actual WebSocket URL
  const { connected, error: wsError, reconnecting } = useWebSocket(wsUrl, handleWebSocketMessage, realtime);

  // Extract unique packs and agents for filter options
  const availablePacks = useMemo(() => {
    return [...new Set(activities.map((a) => a.pack))].sort();
  }, [activities]);

  const availableAgents = useMemo(() => {
    return [...new Set(activities.map((a) => a.agent))].sort();
  }, [activities]);

  // Filtered activities
  const filteredActivities = useMemo(() => {
    return activities.filter((activity) => {
      if (selectedPacks.length > 0 && !selectedPacks.includes(activity.pack)) {
        return false;
      }
      if (selectedAgents.length > 0 && !selectedAgents.includes(activity.agent)) {
        return false;
      }
      if (selectedStatuses.length > 0 && !selectedStatuses.includes(activity.status)) {
        return false;
      }
      return true;
    });
  }, [activities, selectedPacks, selectedAgents, selectedStatuses]);

  // Grouped activities
  const groupedActivities = useMemo(() => {
    return groupActivitiesByTime(filteredActivities);
  }, [filteredActivities]);

  // Flattened list for virtual scrolling
  const flattenedItems = useMemo(() => {
    const items: { type: 'header' | 'activity'; data: TimeGroup | ActivityItem }[] = [];
    for (const group of groupedActivities) {
      items.push({ type: 'header', data: group });
      for (const activity of group.activities) {
        items.push({ type: 'activity', data: activity });
      }
    }
    return items;
  }, [groupedActivities]);

  // Virtual scroll state
  const virtualScrollState = useVirtualScroll(
    containerRef,
    flattenedItems.length,
    ITEM_HEIGHT,
    expandedItems,
    filteredActivities
  );

  // Keyboard navigation
  const { focusedIndex, setFocusedIndex, handleKeyDown } = useKeyboardNavigation(
    filteredActivities,
    expandedItems,
    (id) => toggleExpand(id),
    (activity) => onActivityClick?.(activity)
  );

  // Handlers
  const toggleExpand = useCallback((id: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleClearFilters = useCallback(() => {
    setSelectedPacks([]);
    setSelectedAgents([]);
    setSelectedStatuses([]);
  }, []);

  const handleApprovalAction = useCallback((activityId: string, action: 'approve' | 'reject') => {
    onApprovalAction?.(activityId, action);
    // Optimistic update
    setActivities((prev) =>
      prev.map((a) =>
        a.id === activityId
          ? { ...a, status: action === 'approve' ? 'completed' : 'failed' as ActivityStatus }
          : a
      )
    );
  }, [onApprovalAction]);

  // Sync external filters
  useEffect(() => {
    setSelectedPacks(packFilter);
  }, [packFilter]);

  useEffect(() => {
    setSelectedAgents(agentFilter);
  }, [agentFilter]);

  useEffect(() => {
    setSelectedStatuses(statusFilter);
  }, [statusFilter]);

  // Preserve scroll position on updates
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = scrollPositionRef.current;
    }
  }, [filteredActivities]);

  const hasActiveFilters = selectedPacks.length > 0 || selectedAgents.length > 0 || selectedStatuses.length > 0;

  // Calculate total height for virtual scroll container
  const totalHeight = useMemo(() => {
    let height = 0;
    for (const item of flattenedItems) {
      if (item.type === 'header') {
        height += 36; // Header height
      } else {
        const activity = item.data as ActivityItem;
        height += expandedItems.has(activity.id) ? EXPANDED_ITEM_HEIGHT : ITEM_HEIGHT;
      }
    }
    return height;
  }, [flattenedItems, expandedItems]);

  return (
    <div
      className={`flex flex-col bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden ${className}`}
      role="feed"
      aria-label="Agent activity feed"
      aria-busy={isLoading}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-gray-900">Activity Feed</h2>
          {realtime && <ConnectionStatus connected={connected} reconnecting={reconnecting} error={wsError} />}
        </div>
        <div className="flex items-center gap-2">
          <button
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
            title="Refresh"
            onClick={() => {
              setIsLoading(true);
              setTimeout(() => {
                setActivities(generateMockActivities(200));
                setIsLoading(false);
              }, 500);
            }}
          >
            <svg className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <FilterBar
        packs={availablePacks}
        agents={availableAgents}
        selectedPacks={selectedPacks}
        selectedAgents={selectedAgents}
        selectedStatuses={selectedStatuses}
        onPackChange={setSelectedPacks}
        onAgentChange={setSelectedAgents}
        onStatusChange={setSelectedStatuses}
        onClearFilters={handleClearFilters}
        totalCount={activities.length}
        filteredCount={filteredActivities.length}
      />

      {/* Activity List with Virtual Scrolling */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto"
        style={{ minHeight: '400px', maxHeight: '800px' }}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="list"
        aria-label="Activity list"
      >
        {filteredActivities.length === 0 ? (
          <EmptyState hasFilters={hasActiveFilters} onClearFilters={handleClearFilters} />
        ) : (
          <div style={{ height: totalHeight, position: 'relative' }}>
            {/* Render visible items */}
            {(() => {
              const visibleItems: JSX.Element[] = [];
              let currentOffset = 0;
              let activityIndex = 0;

              for (let i = 0; i < flattenedItems.length; i++) {
                const item = flattenedItems[i];
                const itemHeight = item.type === 'header'
                  ? 36
                  : (expandedItems.has((item.data as ActivityItem).id) ? EXPANDED_ITEM_HEIGHT : ITEM_HEIGHT);

                // Check if item is in visible range
                const containerHeight = containerRef.current?.clientHeight ?? 600;
                const scrollTop = containerRef.current?.scrollTop ?? 0;
                const isVisible = currentOffset + itemHeight > scrollTop - 200 && currentOffset < scrollTop + containerHeight + 200;

                if (isVisible) {
                  if (item.type === 'header') {
                    const group = item.data as TimeGroup;
                    visibleItems.push(
                      <div
                        key={`header-${group.label}`}
                        style={{ position: 'absolute', top: currentOffset, left: 0, right: 0 }}
                      >
                        <TimeGroupHeader label={group.label} count={group.activities.length} />
                      </div>
                    );
                  } else {
                    const activity = item.data as ActivityItem;
                    visibleItems.push(
                      <div
                        key={activity.id}
                        style={{ position: 'absolute', top: currentOffset, left: 0, right: 0 }}
                      >
                        <ActivityItemRow
                          activity={activity}
                          isExpanded={expandedItems.has(activity.id)}
                          isFocused={focusedIndex === activityIndex}
                          onToggleExpand={() => {
                            toggleExpand(activity.id);
                            onActivityClick?.(activity);
                          }}
                          onApprovalAction={
                            activity.type === 'approval_request'
                              ? (action) => handleApprovalAction(activity.id, action)
                              : undefined
                          }
                        />
                      </div>
                    );
                    activityIndex++;
                  }
                }

                currentOffset += itemHeight;
                if (item.type === 'activity') {
                  activityIndex++;
                }
              }

              return visibleItems;
            })()}
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
        <div className="flex items-center justify-between">
          <span>
            {expandedItems.size > 0 && `${expandedItems.size} expanded`}
          </span>
          <span>
            Last updated: {new Date().toLocaleTimeString()}
          </span>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Exports
// =============================================================================

export default ActivityFeed;

// Export utility functions for external use
export {
  formatRelativeTime,
  formatDuration,
  groupActivitiesByTime,
  generateActivityId,
  generateMockActivities,
};

// Export constants for theming/customization
export {
  STATUS_CONFIG,
  TYPE_CONFIG,
  TIME_GROUPS,
  ITEM_HEIGHT,
  EXPANDED_ITEM_HEIGHT,
};

// Export sub-components for composition
export {
  StatusIcon,
  TypeBadge,
  ActivityItemRow,
  TimeGroupHeader,
  FilterBar,
  ConnectionStatus,
  EmptyState,
};

// Export hooks for custom implementations
export {
  useWebSocket,
  useVirtualScroll,
  useKeyboardNavigation,
};
