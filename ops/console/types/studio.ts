/**
 * AgentOS Studio - Type Definitions
 * Comprehensive TypeScript types for the Agent Studio module
 */

// ============================================
// Base Types
// ============================================

export type UUID = string;
export type Timestamp = string; // ISO 8601 format
export type Slug = string; // kebab-case identifier

// ============================================
// Pack Types
// ============================================

export interface Pack {
  id: UUID;
  slug: Slug;
  name: string;
  description: string;
  icon: string;
  color: string;
  version: string;
  category: PackCategory;
  status: PackStatus;
  agents: StudioAgent[];
  metadata: PackMetadata;
  permissions: PackPermissions;
  created_at: Timestamp;
  updated_at: Timestamp;
  created_by: UUID;
}

export type PackCategory =
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
  | 'engineering'
  | 'finance'
  | 'hr'
  | 'custom';

export type PackStatus = 'draft' | 'active' | 'deprecated' | 'archived';

export interface PackMetadata {
  author: string;
  license: string;
  repository?: string;
  documentation_url?: string;
  tags: string[];
  dependencies: PackDependency[];
  environment_variables: EnvironmentVariable[];
}

export interface PackDependency {
  pack_id: UUID;
  pack_slug: Slug;
  version_constraint: string;
  optional: boolean;
}

export interface EnvironmentVariable {
  key: string;
  description: string;
  required: boolean;
  default_value?: string;
  sensitive: boolean;
}

export interface PackPermissions {
  can_create_agents: boolean;
  can_delete_agents: boolean;
  can_publish: boolean;
  allowed_tools: string[];
  max_agents: number;
  max_executions_per_day: number;
}

export interface PackSummary {
  id: UUID;
  slug: Slug;
  name: string;
  description: string;
  icon: string;
  color: string;
  version: string;
  category: PackCategory;
  status: PackStatus;
  agent_count: number;
  updated_at: Timestamp;
}

// ============================================
// Agent Types
// ============================================

export interface StudioAgent {
  id: UUID;
  pack_id: UUID;
  slug: Slug;
  name: string;
  description: string;
  yaml_content: string;
  parsed_config: AgentYAML | null;
  status: AgentStatus;
  version: AgentVersion;
  versions: AgentVersion[];
  validation_errors: ValidationError[];
  is_dirty: boolean;
  last_saved_at: Timestamp | null;
  created_at: Timestamp;
  updated_at: Timestamp;
  created_by: UUID;
}

export type AgentStatus =
  | 'draft'
  | 'valid'
  | 'invalid'
  | 'published'
  | 'deprecated';

export interface AgentVersion {
  id: UUID;
  agent_id: UUID;
  version: string;
  yaml_content: string;
  yaml_hash: string;
  change_summary: string;
  is_published: boolean;
  created_at: Timestamp;
  created_by: UUID;
}

export interface AgentSummary {
  id: UUID;
  pack_id: UUID;
  slug: Slug;
  name: string;
  description: string;
  status: AgentStatus;
  version: string;
  has_errors: boolean;
  updated_at: Timestamp;
}

// ============================================
// Agent YAML Configuration Types
// ============================================

export interface AgentYAML {
  name: string;
  slug: string;
  description: string;
  version: string;
  model: ModelConfig;
  system_prompt: string;
  tools: ToolConfig[];
  capabilities: CapabilityConfig[];
  triggers: TriggerConfig[];
  outputs: OutputConfig[];
  error_handling: ErrorHandlingConfig;
  rate_limiting: RateLimitConfig;
  approval: ApprovalConfig;
  metadata: AgentMetadataConfig;
}

export interface ModelConfig {
  provider: 'anthropic' | 'openai' | 'google' | 'local';
  name: string;
  temperature: number;
  max_tokens: number;
  top_p?: number;
  top_k?: number;
  stop_sequences?: string[];
}

export interface ToolConfig {
  name: string;
  type: ToolType;
  description: string;
  enabled: boolean;
  requires_approval: boolean;
  risk_level: RiskLevel;
  parameters: ToolParameter[];
  timeout_ms?: number;
  retry_policy?: RetryPolicy;
}

export type ToolType =
  | 'mcp'
  | 'function'
  | 'api'
  | 'shell'
  | 'file'
  | 'database'
  | 'browser'
  | 'custom';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface ToolParameter {
  name: string;
  type: ParameterType;
  description: string;
  required: boolean;
  default_value?: unknown;
  validation?: ParameterValidation;
}

export type ParameterType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'array'
  | 'object'
  | 'file'
  | 'date';

export interface ParameterValidation {
  pattern?: string;
  min?: number;
  max?: number;
  min_length?: number;
  max_length?: number;
  enum?: unknown[];
}

export interface RetryPolicy {
  max_retries: number;
  initial_delay_ms: number;
  max_delay_ms: number;
  backoff_multiplier: number;
  retry_on_errors: string[];
}

export interface CapabilityConfig {
  name: string;
  description: string;
  enabled: boolean;
  requires_approval: boolean;
  risk_level: RiskLevel;
  allowed_actions: string[];
}

export interface TriggerConfig {
  type: TriggerType;
  name: string;
  enabled: boolean;
  config: Record<string, unknown>;
  conditions?: TriggerCondition[];
}

export type TriggerType =
  | 'manual'
  | 'schedule'
  | 'webhook'
  | 'event'
  | 'file_watch'
  | 'api';

export interface TriggerCondition {
  field: string;
  operator: ConditionOperator;
  value: unknown;
}

export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'greater_than'
  | 'less_than'
  | 'matches';

export interface OutputConfig {
  name: string;
  type: OutputType;
  format: string;
  destination?: string;
  template?: string;
}

export type OutputType =
  | 'text'
  | 'json'
  | 'file'
  | 'database'
  | 'api'
  | 'notification'
  | 'artifact';

export interface ErrorHandlingConfig {
  on_error: ErrorAction;
  max_retries: number;
  fallback_agent?: string;
  notify_on_failure: boolean;
  log_level: LogLevel;
}

export type ErrorAction =
  | 'stop'
  | 'retry'
  | 'fallback'
  | 'skip'
  | 'escalate';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface RateLimitConfig {
  requests_per_minute: number;
  requests_per_hour: number;
  requests_per_day: number;
  tokens_per_minute: number;
  tokens_per_day: number;
  concurrent_executions: number;
}

export interface ApprovalConfig {
  enabled: boolean;
  auto_approve_threshold: RiskLevel;
  require_approval_for: RiskLevel[];
  timeout_minutes: number;
  escalation_path: string[];
  notify_channels: string[];
}

export interface AgentMetadataConfig {
  author: string;
  tags: string[];
  documentation?: string;
  examples?: AgentExample[];
  changelog?: ChangelogEntry[];
}

export interface AgentExample {
  name: string;
  description: string;
  input: string;
  expected_output: string;
}

export interface ChangelogEntry {
  version: string;
  date: string;
  changes: string[];
}

// ============================================
// Template Types
// ============================================

export interface Template {
  id: UUID;
  slug: Slug;
  name: string;
  description: string;
  category: TemplateCategory;
  icon: string;
  yaml_content: string;
  preview_image?: string;
  difficulty: TemplateDifficulty;
  features: string[];
  use_cases: string[];
  created_at: Timestamp;
  updated_at: Timestamp;
  popularity: number;
  is_official: boolean;
}

export type TemplateCategory =
  | 'starter'
  | 'workflow'
  | 'integration'
  | 'automation'
  | 'analysis'
  | 'communication'
  | 'advanced';

export type TemplateDifficulty = 'beginner' | 'intermediate' | 'advanced';

export interface TemplateSummary {
  id: UUID;
  slug: Slug;
  name: string;
  description: string;
  category: TemplateCategory;
  icon: string;
  difficulty: TemplateDifficulty;
  features: string[];
  popularity: number;
  is_official: boolean;
}

// ============================================
// Version Types
// ============================================

export interface Version {
  id: UUID;
  entity_type: VersionedEntityType;
  entity_id: UUID;
  version: string;
  semantic_version: SemanticVersion;
  content_hash: string;
  content: string;
  change_type: ChangeType;
  change_summary: string;
  is_published: boolean;
  is_latest: boolean;
  created_at: Timestamp;
  created_by: UUID;
  metadata: VersionMetadata;
}

export type VersionedEntityType = 'agent' | 'pack' | 'template';

export interface SemanticVersion {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
  build?: string;
}

export type ChangeType = 'major' | 'minor' | 'patch' | 'draft';

export interface VersionMetadata {
  parent_version_id?: UUID;
  tags: string[];
  notes?: string;
  breaking_changes?: string[];
  deprecated_features?: string[];
}

export interface VersionComparison {
  from_version: Version;
  to_version: Version;
  additions: DiffLine[];
  deletions: DiffLine[];
  modifications: DiffLine[];
  summary: string;
}

export interface DiffLine {
  line_number: number;
  content: string;
  type: 'add' | 'remove' | 'modify';
}

// ============================================
// Validation Types
// ============================================

export interface ValidationResult {
  is_valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  info: ValidationInfo[];
  validated_at: Timestamp;
}

export interface ValidationError {
  code: string;
  message: string;
  path: string;
  line?: number;
  column?: number;
  severity: 'error';
  suggestion?: string;
}

export interface ValidationWarning {
  code: string;
  message: string;
  path: string;
  line?: number;
  column?: number;
  severity: 'warning';
  suggestion?: string;
}

export interface ValidationInfo {
  code: string;
  message: string;
  path: string;
  severity: 'info';
}

// ============================================
// YAML Parser Types
// ============================================

export interface YAMLParseResult<T = unknown> {
  success: boolean;
  data: T | null;
  errors: YAMLParseError[];
  warnings: YAMLParseWarning[];
}

export interface YAMLParseError {
  message: string;
  line: number;
  column: number;
  snippet?: string;
  code: string;
}

export interface YAMLParseWarning {
  message: string;
  line: number;
  column: number;
  code: string;
}

// ============================================
// Storage Types
// ============================================

export interface StorageItem<T = unknown> {
  key: string;
  value: T;
  created_at: Timestamp;
  updated_at: Timestamp;
  expires_at?: Timestamp;
  version: number;
}

export interface Draft {
  id: UUID;
  entity_type: 'agent' | 'pack';
  entity_id: UUID | null;
  name: string;
  content: string;
  is_auto_saved: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface ExportData {
  version: string;
  exported_at: Timestamp;
  type: 'agent' | 'pack' | 'full';
  data: Pack | StudioAgent | Pack[];
  metadata: ExportMetadata;
}

export interface ExportMetadata {
  source: string;
  author?: string;
  description?: string;
  checksum: string;
}

export interface ImportResult {
  success: boolean;
  imported: Array<{ type: string; id: UUID; name: string }>;
  skipped: Array<{ type: string; name: string; reason: string }>;
  errors: Array<{ type: string; name: string; error: string }>;
}

// ============================================
// File System Types
// ============================================

export interface VirtualFile {
  id: UUID;
  path: string;
  name: string;
  extension: string;
  content: string;
  size: number;
  mime_type: string;
  is_directory: boolean;
  parent_id: UUID | null;
  children?: VirtualFile[];
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface FileOperationResult {
  success: boolean;
  path: string;
  error?: string;
}

export interface FileTreeNode {
  id: UUID;
  name: string;
  path: string;
  type: 'file' | 'directory';
  expanded?: boolean;
  children?: FileTreeNode[];
  metadata?: {
    size?: number;
    modified?: Timestamp;
    agent_id?: UUID;
  };
}

// ============================================
// API Types
// ============================================

export interface StudioApiResponse<T> {
  success: boolean;
  data: T | null;
  error?: StudioApiError;
  meta?: StudioApiMeta;
}

export interface StudioApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  stack?: string;
}

export interface StudioApiMeta {
  page?: number;
  per_page?: number;
  total?: number;
  total_pages?: number;
  request_id?: string;
  duration_ms?: number;
}

export interface PaginationOptions {
  page: number;
  per_page: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface FilterOptions {
  search?: string;
  status?: string[];
  category?: string[];
  tags?: string[];
  created_after?: Timestamp;
  created_before?: Timestamp;
}

// ============================================
// Store Types
// ============================================

export interface StudioState {
  // Packs
  packs: Pack[];
  selectedPack: Pack | null;
  packLoading: boolean;
  packError: string | null;

  // Agents
  agents: StudioAgent[];
  selectedAgent: StudioAgent | null;
  agentLoading: boolean;
  agentError: string | null;

  // Editor
  editorContent: string;
  editorDirty: boolean;
  editorCursor: EditorCursor;
  editorValidation: ValidationResult | null;

  // Templates
  templates: Template[];
  templateLoading: boolean;

  // UI State
  sidebarCollapsed: boolean;
  activeTab: StudioTab;
  searchQuery: string;
  filters: FilterOptions;

  // Drafts
  drafts: Draft[];
  currentDraft: Draft | null;
}

export interface EditorCursor {
  line: number;
  column: number;
}

export type StudioTab =
  | 'agents'
  | 'editor'
  | 'templates'
  | 'versions'
  | 'settings';

// ============================================
// Action Types
// ============================================

export interface CreateAgentInput {
  pack_id: UUID;
  name: string;
  slug: Slug;
  description: string;
  yaml_content?: string;
  template_id?: UUID;
}

export interface UpdateAgentInput {
  name?: string;
  description?: string;
  yaml_content?: string;
  status?: AgentStatus;
}

export interface CreatePackInput {
  name: string;
  slug: Slug;
  description: string;
  icon?: string;
  color?: string;
  category: PackCategory;
}

export interface UpdatePackInput {
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
  status?: PackStatus;
  metadata?: Partial<PackMetadata>;
}

export interface CreateVersionInput {
  entity_type: VersionedEntityType;
  entity_id: UUID;
  version: string;
  change_type: ChangeType;
  change_summary: string;
  content: string;
}

// ============================================
// Event Types
// ============================================

export interface StudioEvent {
  type: StudioEventType;
  timestamp: Timestamp;
  payload: unknown;
  source: 'user' | 'system' | 'auto';
}

export type StudioEventType =
  | 'agent_created'
  | 'agent_updated'
  | 'agent_deleted'
  | 'agent_published'
  | 'pack_created'
  | 'pack_updated'
  | 'pack_deleted'
  | 'version_created'
  | 'draft_saved'
  | 'draft_restored'
  | 'validation_completed'
  | 'import_completed'
  | 'export_completed';

// ============================================
// Constants
// ============================================

export const PACK_CATEGORIES: PackCategory[] = [
  'devops',
  'qa',
  'legal',
  'mobile',
  'research',
  'planning',
  'analytics',
  'orchestration',
  'error_predictor',
  'product',
  'marketing',
  'supabase',
  'design',
  'engineering',
  'finance',
  'hr',
  'custom',
];

export const RISK_LEVELS: RiskLevel[] = ['low', 'medium', 'high', 'critical'];

export const TOOL_TYPES: ToolType[] = [
  'mcp',
  'function',
  'api',
  'shell',
  'file',
  'database',
  'browser',
  'custom',
];

export const TRIGGER_TYPES: TriggerType[] = [
  'manual',
  'schedule',
  'webhook',
  'event',
  'file_watch',
  'api',
];

export const DEFAULT_MODEL_CONFIG: ModelConfig = {
  provider: 'anthropic',
  name: 'claude-3-5-sonnet-20241022',
  temperature: 0.7,
  max_tokens: 4096,
};

export const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  requests_per_minute: 60,
  requests_per_hour: 1000,
  requests_per_day: 10000,
  tokens_per_minute: 100000,
  tokens_per_day: 1000000,
  concurrent_executions: 5,
};

export const DEFAULT_APPROVAL_CONFIG: ApprovalConfig = {
  enabled: true,
  auto_approve_threshold: 'low',
  require_approval_for: ['high', 'critical'],
  timeout_minutes: 60,
  escalation_path: [],
  notify_channels: [],
};

export const DEFAULT_ERROR_HANDLING: ErrorHandlingConfig = {
  on_error: 'retry',
  max_retries: 3,
  notify_on_failure: true,
  log_level: 'info',
};

// ============================================
// Agent Form Data Types (for Studio Editor)
// ============================================

/**
 * AgentFormData - Complete form data structure for editing agents
 * Maps 1:1 with YAML structure for bidirectional sync
 */
export interface AgentFormData {
  meta: MetaCluster;
  identity: IdentityCluster;
  voice?: VoiceCluster;
  authority: AuthorityCluster;
  business?: BusinessCluster;
  technical?: TechnicalCluster;
  mcp_servers?: McpServersCluster;
  agents?: AgentsCluster;
  memory?: MemoryCluster;
  reasoning?: ReasoningCluster;
  tools?: ToolsCluster;
  safety?: SafetyCluster;
  policies?: PoliciesCluster;
  triggers?: TriggersCluster;
  integrations?: IntegrationsCluster;
  observability?: ObservabilityCluster;
  context?: ContextCluster;
  evals?: EvalsCluster;
}

// Meta Cluster
export interface MetaCluster {
  name: string;
  slug: string;
  version: string;
  description: string;
  author?: string;
  license?: string;
  repository?: string;
  documentation_url?: string;
  tags: string[];
}

// Identity Cluster
export interface IdentityCluster {
  role: string;
  persona?: string;
  goals: string[];
  constraints: string[];
  expertise_areas: string[];
}

// Voice Cluster
export interface VoiceCluster {
  tone: VoiceTone;
  formality: 'casual' | 'professional' | 'formal';
  verbosity: 'concise' | 'balanced' | 'detailed';
  language: string;
  custom_instructions?: string;
}

export type VoiceTone =
  | 'friendly'
  | 'professional'
  | 'casual'
  | 'authoritative'
  | 'empathetic'
  | 'neutral';

// Authority Cluster
export interface AuthorityCluster {
  level: AuthorityLevel;
  permissions: Permission[];
  restrictions: Restriction[];
  escalation_rules: EscalationRule[];
}

export type AuthorityLevel =
  | 'observer'
  | 'participant'
  | 'operator'
  | 'admin'
  | 'super_admin';

export interface Permission {
  resource: string;
  actions: string[];
  conditions?: PermissionCondition[];
}

export interface PermissionCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'in' | 'not_in';
  value: unknown;
}

export interface Restriction {
  resource: string;
  actions: string[];
  reason?: string;
}

export interface EscalationRule {
  trigger: string;
  action: 'notify' | 'require_approval' | 'block';
  recipients?: string[];
  timeout_minutes?: number;
}

// Business Cluster
export interface BusinessCluster {
  department?: string;
  cost_center?: string;
  budget_limit_usd?: number;
  billing_code?: string;
  sla_requirements?: SlaRequirement[];
}

export interface SlaRequirement {
  metric: string;
  threshold: number;
  unit: string;
}

// Technical Cluster
export interface TechnicalCluster {
  model: TechnicalModelConfig;
  runtime: RuntimeConfig;
  resources: ResourceConfig;
}

export interface TechnicalModelConfig {
  provider: 'anthropic' | 'openai' | 'google' | 'azure' | 'local';
  name: string;
  version?: string;
  temperature: number;
  max_tokens: number;
  top_p?: number;
  top_k?: number;
  stop_sequences?: string[];
}

export interface RuntimeConfig {
  environment: 'development' | 'staging' | 'production';
  timeout_seconds: number;
  max_concurrent: number;
  retry_policy: RetryPolicyConfig;
}

export interface RetryPolicyConfig {
  max_retries: number;
  initial_delay_ms: number;
  max_delay_ms: number;
  backoff_multiplier: number;
}

export interface ResourceConfig {
  memory_mb?: number;
  cpu_cores?: number;
  gpu?: boolean;
}

// MCP Servers Cluster
export interface McpServersCluster {
  servers: McpServerConfig[];
  default_timeout_ms: number;
  connection_pool_size: number;
}

export interface McpServerConfig {
  name: string;
  url: string;
  protocol: 'stdio' | 'http' | 'websocket';
  auth?: McpAuthConfig;
  tools_enabled: string[];
  health_check_interval_ms?: number;
}

export interface McpAuthConfig {
  type: 'none' | 'api_key' | 'oauth' | 'basic';
  credentials_ref?: string;
}

// Agents Cluster (for orchestrators)
export interface AgentsCluster {
  managed_agents: ManagedAgentRef[];
  delegation_rules: DelegationRule[];
  coordination_strategy: 'sequential' | 'parallel' | 'adaptive';
}

export interface ManagedAgentRef {
  agent_id: string;
  agent_slug: string;
  role_in_workflow: string;
  priority: number;
}

export interface DelegationRule {
  task_pattern: string;
  delegate_to: string;
  conditions?: string[];
}

// Memory Cluster
export interface MemoryCluster {
  short_term: ShortTermMemoryConfig;
  long_term?: LongTermMemoryConfig;
  shared?: SharedMemoryConfig;
}

export interface ShortTermMemoryConfig {
  enabled: boolean;
  max_tokens: number;
  strategy: 'fifo' | 'lifo' | 'importance';
}

export interface LongTermMemoryConfig {
  enabled: boolean;
  provider: 'supabase' | 'pinecone' | 'weaviate' | 'local';
  collection_name?: string;
  embedding_model?: string;
}

export interface SharedMemoryConfig {
  enabled: boolean;
  namespace: string;
  permissions: 'read' | 'write' | 'read_write';
}

// Reasoning Cluster
export interface ReasoningCluster {
  chain_of_thought: boolean;
  self_reflection: boolean;
  planning_horizon: 'immediate' | 'short' | 'medium' | 'long';
  uncertainty_handling: 'stop' | 'ask' | 'assume' | 'escalate';
}

// Tools Cluster
export interface ToolsCluster {
  enabled_tools: ToolDefinition[];
  tool_restrictions: ToolRestriction[];
  custom_tools: CustomToolDefinition[];
}

export interface ToolDefinition {
  name: string;
  type: 'mcp' | 'function' | 'api' | 'shell' | 'file' | 'database';
  enabled: boolean;
  requires_approval: boolean;
  risk_level: RiskLevel;
  description?: string;
}

export interface ToolRestriction {
  tool_name: string;
  allowed_operations: string[];
  blocked_patterns?: string[];
}

export interface CustomToolDefinition {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
  implementation: string;
  requires_approval: boolean;
}

// Safety Cluster
export interface SafetyCluster {
  content_filtering: ContentFilterConfig;
  rate_limiting: SafetyRateLimitConfig;
  guardrails: GuardrailConfig[];
}

export interface ContentFilterConfig {
  enabled: boolean;
  categories: string[];
  threshold: 'strict' | 'moderate' | 'permissive';
}

export interface SafetyRateLimitConfig {
  requests_per_minute: number;
  requests_per_hour: number;
  tokens_per_minute: number;
  cost_per_day_usd?: number;
}

export interface GuardrailConfig {
  name: string;
  type: 'input' | 'output' | 'both';
  rule: string;
  action: 'warn' | 'block' | 'modify';
}

// Policies Cluster
export interface PoliciesCluster {
  data_retention_days: number;
  logging_level: LogLevel;
  compliance: string[];
  audit_enabled: boolean;
}

// Triggers Cluster
export interface TriggersCluster {
  manual: boolean;
  schedule?: ScheduleTriggerConfig;
  webhook?: WebhookTriggerConfig;
  event?: EventTriggerConfig[];
}

export interface ScheduleTriggerConfig {
  enabled: boolean;
  cron: string;
  timezone?: string;
}

export interface WebhookTriggerConfig {
  enabled: boolean;
  path: string;
  methods: ('GET' | 'POST' | 'PUT' | 'DELETE')[];
  auth_required: boolean;
}

export interface EventTriggerConfig {
  event_type: string;
  source: string;
  filters?: Record<string, unknown>;
}

// Integrations Cluster
export interface IntegrationsCluster {
  enabled_integrations: IntegrationConfig[];
  oauth_connections: OAuthConnection[];
}

export interface IntegrationConfig {
  name: string;
  type: string;
  config: Record<string, unknown>;
  enabled: boolean;
}

export interface OAuthConnection {
  provider: string;
  scopes: string[];
  credential_ref: string;
}

// Observability Cluster
export interface ObservabilityCluster {
  logging: LoggingConfig;
  metrics: MetricsConfig;
  tracing: TracingConfig;
  alerting: AlertingConfig;
}

export interface LoggingConfig {
  level: LogLevel;
  destinations: string[];
  include_prompts: boolean;
  include_responses: boolean;
}

export interface MetricsConfig {
  enabled: boolean;
  provider: 'prometheus' | 'datadog' | 'custom';
  custom_metrics: string[];
}

export interface TracingConfig {
  enabled: boolean;
  provider: 'jaeger' | 'zipkin' | 'otel';
  sample_rate: number;
}

export interface AlertingConfig {
  enabled: boolean;
  channels: string[];
  rules: AlertRule[];
}

export interface AlertRule {
  name: string;
  condition: string;
  threshold: number;
  severity: 'info' | 'warning' | 'error' | 'critical';
}

// Context Cluster
export interface ContextCluster {
  static_context: string;
  dynamic_context_sources: ContextSource[];
  context_window_strategy: 'truncate' | 'summarize' | 'split';
}

export interface ContextSource {
  name: string;
  type: 'file' | 'api' | 'database' | 'memory';
  config: Record<string, unknown>;
  refresh_interval_ms?: number;
}

// Evals Cluster
export interface EvalsCluster {
  enabled: boolean;
  test_cases: TestCase[];
  metrics: EvalMetric[];
  schedule?: string;
}

export interface TestCase {
  name: string;
  input: string;
  expected_output?: string;
  assertions: TestAssertion[];
}

export interface TestAssertion {
  type: 'contains' | 'not_contains' | 'regex' | 'json_path' | 'custom';
  value: string;
}

export interface EvalMetric {
  name: string;
  type: 'latency' | 'cost' | 'quality' | 'custom';
  threshold?: number;
}

// ============================================
// Additional Field Types
// ============================================

export interface FieldChange {
  path: string;
  oldValue: unknown;
  newValue: unknown;
  type: 'added' | 'removed' | 'modified';
}

export interface StudioPreferences {
  defaultView: 'grid' | 'list' | 'table';
  editorFontSize: number;
  editorTabSize: number;
  showMinimap: boolean;
  wordWrap: boolean;
  theme: 'light' | 'dark' | 'system';
  autoSaveEnabled: boolean;
  autoSaveDelayMs: number;
  showLineNumbers: boolean;
  highlightActiveLine: boolean;
}

export const DEFAULT_STUDIO_PREFERENCES: StudioPreferences = {
  defaultView: 'grid',
  editorFontSize: 14,
  editorTabSize: 2,
  showMinimap: true,
  wordWrap: true,
  theme: 'system',
  autoSaveEnabled: true,
  autoSaveDelayMs: 2000,
  showLineNumbers: true,
  highlightActiveLine: true,
};

// ============================================
// File Info Type
// ============================================

export interface FileInfo {
  name: string;
  path: string;
  size: number;
  type: 'file' | 'directory';
  extension?: string;
  modified: string;
  created: string;
}

// ============================================
// Diff Types
// ============================================

export interface Diff {
  additions: DiffHunk[];
  deletions: DiffHunk[];
  modifications: DiffHunk[];
  stats: DiffStats;
}

export interface DiffHunk {
  lineNumber: number;
  content: string;
  context?: string[];
}

export interface DiffStats {
  additions: number;
  deletions: number;
  modifications: number;
  totalChanges: number;
}
