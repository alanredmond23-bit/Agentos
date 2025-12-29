/**
 * AgentOS Ops Console - Type Definitions
 * Enterprise-grade TypeScript types for the operations dashboard
 */

// ============================================
// Base Types
// ============================================

export type UUID = string;
export type Timestamp = string; // ISO 8601 format
export type Email = string;

// ============================================
// User & Authentication Types
// ============================================

export interface User {
  id: UUID;
  email: Email;
  full_name: string;
  avatar_url: string | null;
  role: UserRole;
  department: string;
  created_at: Timestamp;
  last_login_at: Timestamp | null;
  is_active: boolean;
  preferences: UserPreferences;
}

export type UserRole = 'admin' | 'operator' | 'viewer' | 'auditor';

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  notifications_enabled: boolean;
  email_notifications: boolean;
  timezone: string;
  locale: string;
  sidebar_collapsed: boolean;
}

export interface AuthSession {
  user: User;
  access_token: string;
  refresh_token: string;
  expires_at: Timestamp;
}

// ============================================
// Agent Types
// ============================================

export interface Agent {
  id: UUID;
  name: string;
  slug: string;
  description: string;
  pack: AgentPack;
  status: AgentStatus;
  version: string;
  capabilities: AgentCapability[];
  configuration: AgentConfiguration;
  metrics: AgentMetrics;
  created_at: Timestamp;
  updated_at: Timestamp;
  created_by: UUID;
  last_execution_at: Timestamp | null;
}

export type AgentStatus =
  | 'active'
  | 'paused'
  | 'stopped'
  | 'error'
  | 'initializing'
  | 'updating';

export type AgentPack =
  | 'devops'
  | 'qa'
  | 'legal'
  | 'mobile'
  | 'research'
  | 'planning'
  | 'analytics'
  | 'orchestration'
  | 'error_predictor'
  | 'product'
  | 'marketing'
  | 'supabase'
  | 'design'
  | 'engineering';

export interface AgentCapability {
  id: string;
  name: string;
  description: string;
  requires_approval: boolean;
  risk_level: RiskLevel;
}

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface AgentConfiguration {
  model: string;
  temperature: number;
  max_tokens: number;
  tools_enabled: string[];
  auto_approve_threshold: number;
  rate_limit: RateLimit;
  retry_policy: RetryPolicy;
  environment_variables: Record<string, string>;
}

export interface RateLimit {
  requests_per_minute: number;
  requests_per_hour: number;
  requests_per_day: number;
}

export interface RetryPolicy {
  max_retries: number;
  initial_delay_ms: number;
  max_delay_ms: number;
  backoff_multiplier: number;
}

export interface AgentMetrics {
  total_executions: number;
  successful_executions: number;
  failed_executions: number;
  average_duration_ms: number;
  tokens_consumed: number;
  cost_usd: number;
  success_rate: number;
}

// ============================================
// Approval Types
// ============================================

export interface ApprovalRequest {
  id: UUID;
  agent_id: UUID;
  agent_name: string;
  action_type: ActionType;
  title: string;
  description: string;
  risk_level: RiskLevel;
  status: ApprovalStatus;
  payload: ApprovalPayload;
  context: ApprovalContext;
  requested_at: Timestamp;
  responded_at: Timestamp | null;
  responded_by: UUID | null;
  response_note: string | null;
  expires_at: Timestamp;
  priority: Priority;
}

export type ApprovalStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'expired'
  | 'cancelled';

export type ActionType =
  | 'code_execution'
  | 'file_modification'
  | 'database_write'
  | 'api_call'
  | 'deployment'
  | 'configuration_change'
  | 'user_communication'
  | 'resource_allocation'
  | 'security_action'
  | 'billing_action';

export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export interface ApprovalPayload {
  action: string;
  target: string;
  parameters: Record<string, unknown>;
  estimated_impact: string;
  rollback_plan: string | null;
  preview?: string;
}

export interface ApprovalContext {
  session_id: UUID;
  conversation_id: UUID | null;
  parent_action_id: UUID | null;
  triggered_by: string;
  environment: 'development' | 'staging' | 'production';
  tags: string[];
}

export interface ApprovalResponse {
  request_id: UUID;
  status: 'approved' | 'rejected';
  note: string;
  conditions?: string[];
}

// ============================================
// Audit Types
// ============================================

export interface AuditLog {
  id: UUID;
  timestamp: Timestamp;
  event_type: AuditEventType;
  actor: AuditActor;
  resource: AuditResource;
  action: string;
  details: Record<string, unknown>;
  result: AuditResult;
  metadata: AuditMetadata;
}

export type AuditEventType =
  | 'agent_execution'
  | 'approval_request'
  | 'approval_response'
  | 'configuration_change'
  | 'user_action'
  | 'system_event'
  | 'security_event'
  | 'error'
  | 'api_call';

export interface AuditActor {
  type: 'user' | 'agent' | 'system';
  id: UUID;
  name: string;
  ip_address?: string;
  user_agent?: string;
}

export interface AuditResource {
  type: string;
  id: UUID;
  name: string;
  path?: string;
}

export type AuditResult = 'success' | 'failure' | 'partial' | 'pending';

export interface AuditMetadata {
  session_id?: UUID;
  request_id?: UUID;
  correlation_id?: UUID;
  duration_ms?: number;
  environment: string;
  version: string;
  tags: string[];
}

export interface AuditFilter {
  event_types?: AuditEventType[];
  actor_types?: Array<'user' | 'agent' | 'system'>;
  actor_ids?: UUID[];
  resource_types?: string[];
  results?: AuditResult[];
  start_date?: Timestamp;
  end_date?: Timestamp;
  search?: string;
}

// ============================================
// Dashboard Types
// ============================================

export interface DashboardMetrics {
  agents: {
    total: number;
    active: number;
    paused: number;
    error: number;
  };
  approvals: {
    pending: number;
    approved_today: number;
    rejected_today: number;
    average_response_time_ms: number;
  };
  executions: {
    total_today: number;
    successful_today: number;
    failed_today: number;
    success_rate: number;
  };
  costs: {
    today_usd: number;
    week_usd: number;
    month_usd: number;
    trend_percentage: number;
  };
}

export interface TimeSeriesDataPoint {
  timestamp: Timestamp;
  value: number;
}

export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

export interface ChartDataset {
  label: string;
  data: number[];
  color?: string;
  fill?: boolean;
}

// ============================================
// WebSocket Types
// ============================================

export interface WebSocketMessage {
  type: WebSocketMessageType;
  payload: unknown;
  timestamp: Timestamp;
  correlation_id?: UUID;
}

export type WebSocketMessageType =
  | 'agent_status_changed'
  | 'approval_request_created'
  | 'approval_status_changed'
  | 'execution_started'
  | 'execution_completed'
  | 'metrics_updated'
  | 'error'
  | 'heartbeat';

export interface WebSocketConfig {
  url: string;
  reconnect_interval_ms: number;
  max_reconnect_attempts: number;
  heartbeat_interval_ms: number;
}

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T> {
  data: T;
  meta?: ApiMeta;
  error?: ApiError;
}

export interface ApiMeta {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface PaginationParams {
  page: number;
  per_page: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

// ============================================
// Notification Types
// ============================================

export interface Notification {
  id: UUID;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  action_url?: string;
  created_at: Timestamp;
  expires_at?: Timestamp;
}

export type NotificationType =
  | 'info'
  | 'success'
  | 'warning'
  | 'error'
  | 'approval_required'
  | 'agent_alert';

// ============================================
// Filter & Search Types
// ============================================

export interface FilterState {
  search: string;
  status: string[];
  pack: string[];
  risk_level: string[];
  date_range: DateRange | null;
}

export interface DateRange {
  start: Timestamp;
  end: Timestamp;
}

export interface SortState {
  field: string;
  direction: 'asc' | 'desc';
}

// ============================================
// Component Props Types
// ============================================

export interface TableColumn<T> {
  key: keyof T | string;
  header: string;
  width?: string;
  sortable?: boolean;
  render?: (value: unknown, row: T) => React.ReactNode;
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export interface ToastConfig {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// ============================================
// Feature Flags
// ============================================

export interface FeatureFlags {
  enable_dark_mode: boolean;
  enable_real_time_updates: boolean;
  enable_advanced_filters: boolean;
  enable_export: boolean;
  enable_bulk_actions: boolean;
  enable_audit_export: boolean;
  max_agents_per_page: number;
  websocket_enabled: boolean;
}

// ============================================
// Environment Configuration
// ============================================

export interface EnvironmentConfig {
  api_base_url: string;
  websocket_url: string;
  supabase_url: string;
  supabase_anon_key: string;
  environment: 'development' | 'staging' | 'production';
  version: string;
  feature_flags: FeatureFlags;
}
