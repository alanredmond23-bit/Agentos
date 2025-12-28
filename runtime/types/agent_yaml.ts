/**
 * agent_yaml.ts
 * TypeScript interfaces for the 250+ parameter Agent YAML schema
 * Covers identity, model params, tools, memory, business metrics, and more
 */

// ============================================================================
// IDENTITY BLOCK
// ============================================================================

export interface AgentIdentity {
  agent_id: string;
  name: string;
  role: string;
  personality?: string;
  mission?: string;
  relationship?: string;
  authority_level: 'principal' | 'delegate' | 'observer' | 'restricted';
  decision_making?: 'autonomous' | 'supervised' | 'manual';
  zone: 'red' | 'yellow' | 'green';
  icon?: string;
  shortcut?: string;
  knowledge_domains?: string[];
  values?: string[];
  communication_style?: string;
  decision_framework?: string;
  profanity_allowed?: boolean;
}

// ============================================================================
// VOICE & COMMUNICATION
// ============================================================================

export interface VoiceConfig {
  model?: string;
  response_time_target?: number;
  personality_preset?: string;
  output_format?: string;
  profanity?: 'none' | 'mild' | 'motivational' | 'full';
}

export interface CommunicationSettings {
  directness_level?: number;
  humor?: boolean;
  sarcasm?: boolean;
  enthusiasm_matching?: 'adaptive' | 'fixed';
  response_length?: 'concise' | 'adaptive' | 'detailed';
  bullet_avoidance?: 'none' | 'moderate' | 'strict';
  interruption_handling?: boolean;
  multi_turn_awareness?: 'none' | 'partial' | 'full';
  wake_words?: string[];
  voice_tone?: string;
}

// ============================================================================
// MODEL PARAMETERS
// ============================================================================

export interface ModelPreset {
  id: string;
  temperature: number;
  top_p: number;
  top_k: number;
  frequency_penalty: number;
  presence_penalty: number;
  max_tokens: number;
  stop_sequences?: string[];
  use_case?: string;
  description?: string;
}

export interface ReasoningConfig {
  reasoning_mode?: 'fast' | 'balanced' | 'strategic' | 'deep';
  think_mode?: 'none' | 'basic' | 'routing' | 'chain';
  extended_thinking?: boolean;
  chain_of_thought?: 'none' | 'basic' | 'delegation' | 'full';
  learning_mode?: 'passive' | 'active' | 'supervised';
  fine_tune_ready?: boolean;
}

export interface ModelConfig {
  primary_model?: string;
  fallback_model?: string;
  presets: Record<string, ModelPreset>;
  default_preset?: string;
  reasoning?: ReasoningConfig;
}

// ============================================================================
// AUTHORITY & PERMISSIONS
// ============================================================================

export type OperationName =
  | 'database_read'
  | 'database_write'
  | 'code_deployment'
  | 'email_sending'
  | 'payment_processing'
  | 'contract_review'
  | 'hiring_evaluation'
  | 'api_integration'
  | 'system_configuration'
  | 'file_read'
  | 'file_write'
  | 'file_delete'
  | 'network_request'
  | 'shell_command'
  | 'secret_access'
  | string;

export interface FinancialLimits {
  auto_execute_limit?: number;
  require_confirmation_min?: number;
  require_confirmation_max?: number;
  absolute_maximum?: number;
  daily_limit?: number;
  monthly_limit?: number;
}

export interface OperationPermission {
  operation: OperationName;
  zone: 'red' | 'yellow' | 'green';
  requires_approval?: boolean;
  requires_2fa?: boolean;
  max_per_hour?: number;
  max_per_day?: number;
}

export interface AuthorityConfig {
  execution_model: 'autonomous' | 'supervised' | 'manual';
  zone_access: {
    red: boolean;
    yellow: boolean;
    green: boolean;
  };
  financial_limits?: FinancialLimits;
  allowed_operations: OperationPermission[];
  forbidden_operations: string[];
}

// ============================================================================
// MCP SERVERS & INTEGRATIONS
// ============================================================================

export type MCPTransport = 'stdio' | 'http' | 'websocket' | 'grpc';
export type MCPPriority = 'critical' | 'high' | 'medium' | 'low';
export type MCPFallback = 'mock' | 'error' | 'retry' | 'skip';

export interface MCPServerConfig {
  name: string;
  transport: MCPTransport;
  priority: MCPPriority;
  token_env?: string;
  endpoint?: string;
  rate_limit?: number;
  cache_ttl?: number;
  fallback: MCPFallback;
  timeout_ms?: number;
  retry_count?: number;
  tables?: string[];
  use_case?: string;
}

// ============================================================================
// TOOLS & CAPABILITIES
// ============================================================================

export interface ToolInput {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required?: boolean;
  description?: string;
  default?: unknown;
  enum?: unknown[];
}

export interface ToolOutput {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  category?: 'primary' | 'secondary' | 'utility';
  inputs: ToolInput[];
  outputs: Record<string, ToolOutput>;
  requires_approval?: boolean;
  zone?: 'red' | 'yellow' | 'green';
  timeout_ms?: number;
  retry_count?: number;
}

export interface ToolsConfig {
  browser?: {
    enabled: boolean;
    headless?: boolean;
    timeout_ms?: number;
  };
  terminal?: {
    enabled: boolean;
    shell?: string;
    sudo_enabled?: boolean;
    ssh_enabled?: boolean;
  };
  filesystem?: {
    enabled: boolean;
    read?: boolean;
    write?: boolean;
    execute?: boolean;
    allowed_paths?: string[];
    forbidden_paths?: string[];
  };
  apis?: {
    protocols: ('rest' | 'graphql' | 'websocket' | 'grpc')[];
  };
  databases?: string[];
  communication?: string[];
  payments?: string[];
  calendar?: string[];
  documents?: string[];
  code?: string[];
  custom_tools?: ToolDefinition[];
}

// ============================================================================
// MEMORY & REASONING
// ============================================================================

export type MemoryType = 'ephemeral' | 'session' | 'persistent';
export type IndexingStrategy = 'flat' | 'hierarchical' | 'graph';
export type RetrievalStrategy = 'keyword' | 'semantic' | 'rag' | 'graphrag';

export interface MemoryConfig {
  type: MemoryType;
  retention?: 'session' | 'day' | 'week' | 'month' | 'forever';
  storage?: string;
  vector_dimensions?: number;
  max_context_tokens?: number;
  indexing_strategy?: IndexingStrategy;
  retrieval_strategy?: RetrievalStrategy;
  reasoning_model?: string;
  reasoning_depth?: number;
  confidence_threshold?: number;
  fallback_strategy?: string;
}

// ============================================================================
// BUSINESS METRICS & DECISION MATRIX
// ============================================================================

export interface BusinessMetric {
  name: string;
  target: string | number;
  weight: number;
  unit?: string;
}

export interface TimeBlockExpectation {
  duration: '1min' | '5min' | '10min' | '30min' | '1hr' | '2hr+';
  expectation: string;
  examples?: string[];
  warning?: boolean;
}

export interface BusinessConfig {
  primary_kpi?: string;
  metrics: BusinessMetric[];
  decision_formula?: string;
  time_blocks?: TimeBlockExpectation[];
}

// ============================================================================
// DELEGATION
// ============================================================================

export interface DelegateConfig {
  agent_id: string;
  name: string;
  role: string;
  allocation?: number;
  when_to_use?: string;
  expected_results?: string;
  capabilities?: string[];
}

// ============================================================================
// SAFETY & GUARDRAILS
// ============================================================================

export interface GuardrailConfig {
  name: string;
  enabled: boolean;
  description?: string;
  severity?: 'info' | 'warning' | 'error' | 'critical';
}

export interface EmergencyCommand {
  command: string;
  action: string;
  description?: string;
}

export interface MonitoringSettings {
  alert_threshold?: 'all' | 'warning' | 'error' | 'critical';
  audit_level?: 'minimal' | 'standard' | 'verbose' | 'everything';
  retention?: string;
}

export interface SafetyConfig {
  guardrails: GuardrailConfig[];
  emergency_commands: EmergencyCommand[];
  monitoring?: MonitoringSettings;
}

// ============================================================================
// EXPECTED RESULTS
// ============================================================================

export interface ExpectedResult {
  task_type: string;
  format?: string;
  speed?: string;
  quality?: string;
  output?: Record<string, string>;
  example?: string;
  notes?: string;
}

// ============================================================================
// KNOWLEDGE SOURCES
// ============================================================================

export interface KnowledgeSource {
  source_id: string;
  type: 'reference' | 'legal' | 'technical' | 'financial' | 'research' | 'product' | 'history';
  location: string;
  refresh?: 'realtime' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'manual';
  description?: string;
}

export interface CorpusConfig {
  name: string;
  size?: string;
  purpose?: string;
  quality?: string;
  notes?: string;
}

// ============================================================================
// ROUTING RULES
// ============================================================================

export interface RoutingRule {
  task_pattern: string;
  target_agent: string;
  confidence_threshold?: number;
  fallback_agent?: string;
}

export interface CompositeTaskStep {
  agent: string;
  action: string;
  parallel?: boolean;
  depends_on?: string[];
}

export interface CompositeTask {
  name: string;
  steps: CompositeTaskStep[];
}

export interface RoutingConfig {
  rules: Record<string, Record<string, string>>;
  composite_tasks?: CompositeTask[];
}

// ============================================================================
// ORCHESTRATION MODES
// ============================================================================

export type OrchestrationMode = 'single_agent' | 'parallel_swarm' | 'sequential_pipeline' | 'hybrid';

export interface OrchestrationModeConfig {
  mode: OrchestrationMode;
  description?: string;
  use_when?: string;
  max_parallel?: number;
  default?: boolean;
}

// ============================================================================
// ACTIVATION
// ============================================================================

export interface ActivationConfig {
  keyboard_shortcut?: string;
  voice_command?: string;
  auto_start?: boolean;
  default_mode?: boolean;
  startup_message?: string;
}

// ============================================================================
// MAIN AGENT YAML INTERFACE
// ============================================================================

export interface AgentYAML {
  // Schema version
  schema_version: string;

  // Core identity
  identity: AgentIdentity;

  // Voice and communication
  voice?: VoiceConfig;
  communication?: CommunicationSettings;

  // Model configuration
  model: ModelConfig;

  // Authority and permissions
  authority: AuthorityConfig;

  // MCP servers
  mcp_servers?: MCPServerConfig[];

  // Tools and capabilities
  tools?: ToolsConfig;

  // Memory and reasoning
  memory?: MemoryConfig;

  // Business metrics
  business?: BusinessConfig;

  // Delegation
  delegates?: DelegateConfig[];

  // Safety
  safety?: SafetyConfig;

  // Expected results
  expected_results?: ExpectedResult[];

  // Knowledge sources
  knowledge?: KnowledgeSource[];
  corpus?: CorpusConfig[];

  // Routing
  routing?: RoutingConfig;

  // Orchestration modes
  orchestration_modes?: OrchestrationModeConfig[];

  // Activation
  activation?: ActivationConfig;

  // Metadata
  created_at?: string;
  updated_at?: string;
  version?: string;
  status?: 'draft' | 'testing' | 'production' | 'deprecated';

  // Custom extensions
  extensions?: Record<string, unknown>;
}

// ============================================================================
// PARAMETER PRESETS (from AGENT_MATRIX_MASTER)
// ============================================================================

export const PRESET_CREATIVE_HIGH: ModelPreset = {
  id: 'PRESET-CREATIVE-HIGH',
  temperature: 0.95,
  top_p: 0.98,
  top_k: 100,
  frequency_penalty: 0.30,
  presence_penalty: 0.40,
  max_tokens: 4096,
  use_case: 'UI brainstorming, wild ideation'
};

export const PRESET_CREATIVE_MED: ModelPreset = {
  id: 'PRESET-CREATIVE-MED',
  temperature: 0.80,
  top_p: 0.92,
  top_k: 60,
  frequency_penalty: 0.20,
  presence_penalty: 0.30,
  max_tokens: 4096,
  use_case: 'Design alternatives, feature ideas'
};

export const PRESET_CREATIVE_LOW: ModelPreset = {
  id: 'PRESET-CREATIVE-LOW',
  temperature: 0.60,
  top_p: 0.85,
  top_k: 40,
  frequency_penalty: 0.10,
  presence_penalty: 0.20,
  max_tokens: 4096,
  use_case: 'Polishing copy, variations'
};

export const PRESET_ANALYTICAL_STRICT: ModelPreset = {
  id: 'PRESET-ANALYTICAL-STRICT',
  temperature: 0.10,
  top_p: 0.70,
  top_k: 10,
  frequency_penalty: 0.00,
  presence_penalty: 0.00,
  max_tokens: 8192,
  use_case: 'Legal research, privilege detection'
};

export const PRESET_ANALYTICAL_MOD: ModelPreset = {
  id: 'PRESET-ANALYTICAL-MOD',
  temperature: 0.30,
  top_p: 0.80,
  top_k: 20,
  frequency_penalty: 0.05,
  presence_penalty: 0.05,
  max_tokens: 8192,
  use_case: 'Architecture review, test gen'
};

export const PRESET_ANALYTICAL_FLEX: ModelPreset = {
  id: 'PRESET-ANALYTICAL-FLEX',
  temperature: 0.50,
  top_p: 0.85,
  top_k: 30,
  frequency_penalty: 0.10,
  presence_penalty: 0.10,
  max_tokens: 8192,
  use_case: 'Strategy suggestions, alternatives'
};

export const PRESET_CODING_PRECISE: ModelPreset = {
  id: 'PRESET-CODING-PRECISE',
  temperature: 0.15,
  top_p: 0.75,
  top_k: 15,
  frequency_penalty: 0.00,
  presence_penalty: 0.00,
  max_tokens: 16384,
  use_case: 'Bug fixes, refactoring, types'
};

export const PRESET_CODING_BALANCED: ModelPreset = {
  id: 'PRESET-CODING-BALANCED',
  temperature: 0.30,
  top_p: 0.85,
  top_k: 25,
  frequency_penalty: 0.05,
  presence_penalty: 0.05,
  max_tokens: 16384,
  use_case: 'Feature implementation, APIs'
};

export const PRESET_CODING_EXPLORE: ModelPreset = {
  id: 'PRESET-CODING-EXPLORE',
  temperature: 0.50,
  top_p: 0.90,
  top_k: 40,
  frequency_penalty: 0.10,
  presence_penalty: 0.15,
  max_tokens: 16384,
  use_case: 'Algorithm design, POCs'
};

export const PRESET_LEGAL_RESEARCH: ModelPreset = {
  id: 'PRESET-LEGAL-RESEARCH',
  temperature: 0.20,
  top_p: 0.80,
  top_k: 20,
  frequency_penalty: 0.00,
  presence_penalty: 0.00,
  max_tokens: 8192,
  use_case: 'Case law, statute research'
};

export const PRESET_LEGAL_DRAFTING: ModelPreset = {
  id: 'PRESET-LEGAL-DRAFTING',
  temperature: 0.35,
  top_p: 0.85,
  top_k: 30,
  frequency_penalty: 0.05,
  presence_penalty: 0.10,
  max_tokens: 16384,
  use_case: 'Motion drafting, contracts'
};

export const PRESET_LEGAL_PRIVILEGE: ModelPreset = {
  id: 'PRESET-LEGAL-PRIVILEGE',
  temperature: 0.05,
  top_p: 0.60,
  top_k: 5,
  frequency_penalty: 0.00,
  presence_penalty: 0.00,
  max_tokens: 2048,
  use_case: 'Privilege detection (CRITICAL)'
};

export const PRESET_LEGAL_STRATEGY: ModelPreset = {
  id: 'PRESET-LEGAL-STRATEGY',
  temperature: 0.55,
  top_p: 0.88,
  top_k: 35,
  frequency_penalty: 0.10,
  presence_penalty: 0.15,
  max_tokens: 8192,
  use_case: 'Case strategy, settlement'
};

export const PRESET_CONVO_NATURAL: ModelPreset = {
  id: 'PRESET-CONVO-NATURAL',
  temperature: 0.70,
  top_p: 0.90,
  top_k: 50,
  frequency_penalty: 0.20,
  presence_penalty: 0.30,
  max_tokens: 2048,
  use_case: 'User assistance, explanations'
};

export const PRESET_CONVO_PRO: ModelPreset = {
  id: 'PRESET-CONVO-PRO',
  temperature: 0.50,
  top_p: 0.85,
  top_k: 35,
  frequency_penalty: 0.10,
  presence_penalty: 0.20,
  max_tokens: 4096,
  use_case: 'Client communication, formal'
};

export const PRESET_CONVO_CONCISE: ModelPreset = {
  id: 'PRESET-CONVO-CONCISE',
  temperature: 0.40,
  top_p: 0.80,
  top_k: 25,
  frequency_penalty: 0.15,
  presence_penalty: 0.10,
  max_tokens: 1024,
  use_case: 'Quick answers, confirmations'
};

export const PRESET_FAST_CHEAP: ModelPreset = {
  id: 'PRESET-FAST-CHEAP',
  temperature: 0.30,
  top_p: 0.80,
  top_k: 20,
  frequency_penalty: 0.00,
  presence_penalty: 0.00,
  max_tokens: 1024,
  use_case: 'Quick classifications, batch'
};

export const PRESET_BALANCED: ModelPreset = {
  id: 'PRESET-BALANCED',
  temperature: 0.40,
  top_p: 0.85,
  top_k: 30,
  frequency_penalty: 0.00,
  presence_penalty: 0.00,
  max_tokens: 4096,
  use_case: 'General tasks, daily work'
};

export const PRESET_MAX_QUALITY: ModelPreset = {
  id: 'PRESET-MAX-QUALITY',
  temperature: 0.30,
  top_p: 0.90,
  top_k: 40,
  frequency_penalty: 0.00,
  presence_penalty: 0.00,
  max_tokens: 16384,
  use_case: 'Critical decisions, legal'
};

export const PRESET_CLASSIFY: ModelPreset = {
  id: 'PRESET-CLASSIFY',
  temperature: 0.05,
  top_p: 0.60,
  top_k: 5,
  frequency_penalty: 0.00,
  presence_penalty: 0.00,
  max_tokens: 512,
  use_case: 'Document classification'
};

export const PRESET_JSON: ModelPreset = {
  id: 'PRESET-JSON',
  temperature: 0.00,
  top_p: 0.50,
  top_k: 1,
  frequency_penalty: 0.00,
  presence_penalty: 0.00,
  max_tokens: 4096,
  use_case: 'Structured JSON output'
};

export const PRESET_REASON_CHAIN: ModelPreset = {
  id: 'PRESET-REASON-CHAIN',
  temperature: 0.20,
  top_p: 0.80,
  top_k: 20,
  frequency_penalty: 0.00,
  presence_penalty: 0.00,
  max_tokens: 8192,
  use_case: 'Step-by-step reasoning'
};

export const PRESET_QA: ModelPreset = {
  id: 'PRESET-QA',
  temperature: 0.15,
  top_p: 0.75,
  top_k: 15,
  frequency_penalty: 0.00,
  presence_penalty: 0.00,
  max_tokens: 2048,
  use_case: 'Document Q&A'
};

export const PRESET_SUMMARY_EXTRACT: ModelPreset = {
  id: 'PRESET-SUMMARY-EXTRACT',
  temperature: 0.10,
  top_p: 0.70,
  top_k: 10,
  frequency_penalty: 0.30,
  presence_penalty: 0.00,
  max_tokens: 1024,
  use_case: 'Key point extraction'
};

export const PRESET_SUMMARY_ABSTRACT: ModelPreset = {
  id: 'PRESET-SUMMARY-ABSTRACT',
  temperature: 0.40,
  top_p: 0.85,
  top_k: 30,
  frequency_penalty: 0.20,
  presence_penalty: 0.10,
  max_tokens: 2048,
  use_case: 'Executive summaries'
};

// All presets as a map
export const ALL_PRESETS: Record<string, ModelPreset> = {
  'PRESET-CREATIVE-HIGH': PRESET_CREATIVE_HIGH,
  'PRESET-CREATIVE-MED': PRESET_CREATIVE_MED,
  'PRESET-CREATIVE-LOW': PRESET_CREATIVE_LOW,
  'PRESET-ANALYTICAL-STRICT': PRESET_ANALYTICAL_STRICT,
  'PRESET-ANALYTICAL-MOD': PRESET_ANALYTICAL_MOD,
  'PRESET-ANALYTICAL-FLEX': PRESET_ANALYTICAL_FLEX,
  'PRESET-CODING-PRECISE': PRESET_CODING_PRECISE,
  'PRESET-CODING-BALANCED': PRESET_CODING_BALANCED,
  'PRESET-CODING-EXPLORE': PRESET_CODING_EXPLORE,
  'PRESET-LEGAL-RESEARCH': PRESET_LEGAL_RESEARCH,
  'PRESET-LEGAL-DRAFTING': PRESET_LEGAL_DRAFTING,
  'PRESET-LEGAL-PRIVILEGE': PRESET_LEGAL_PRIVILEGE,
  'PRESET-LEGAL-STRATEGY': PRESET_LEGAL_STRATEGY,
  'PRESET-CONVO-NATURAL': PRESET_CONVO_NATURAL,
  'PRESET-CONVO-PRO': PRESET_CONVO_PRO,
  'PRESET-CONVO-CONCISE': PRESET_CONVO_CONCISE,
  'PRESET-FAST-CHEAP': PRESET_FAST_CHEAP,
  'PRESET-BALANCED': PRESET_BALANCED,
  'PRESET-MAX-QUALITY': PRESET_MAX_QUALITY,
  'PRESET-CLASSIFY': PRESET_CLASSIFY,
  'PRESET-JSON': PRESET_JSON,
  'PRESET-REASON-CHAIN': PRESET_REASON_CHAIN,
  'PRESET-QA': PRESET_QA,
  'PRESET-SUMMARY-EXTRACT': PRESET_SUMMARY_EXTRACT,
  'PRESET-SUMMARY-ABSTRACT': PRESET_SUMMARY_ABSTRACT
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function validateAgentYAML(config: unknown): config is AgentYAML {
  if (typeof config !== 'object' || config === null) return false;
  const c = config as Record<string, unknown>;

  // Required fields
  if (typeof c.schema_version !== 'string') return false;
  if (typeof c.identity !== 'object' || c.identity === null) return false;
  if (typeof c.model !== 'object' || c.model === null) return false;
  if (typeof c.authority !== 'object' || c.authority === null) return false;

  return true;
}

export function getPreset(id: string): ModelPreset | undefined {
  return ALL_PRESETS[id];
}

export function getPresetForUseCase(useCase: string): ModelPreset {
  // Match use case to preset
  const lowerCase = useCase.toLowerCase();

  if (lowerCase.includes('legal') && lowerCase.includes('research')) {
    return PRESET_LEGAL_RESEARCH;
  }
  if (lowerCase.includes('legal') && lowerCase.includes('draft')) {
    return PRESET_LEGAL_DRAFTING;
  }
  if (lowerCase.includes('privilege')) {
    return PRESET_LEGAL_PRIVILEGE;
  }
  if (lowerCase.includes('cod') && lowerCase.includes('precise')) {
    return PRESET_CODING_PRECISE;
  }
  if (lowerCase.includes('cod') || lowerCase.includes('program')) {
    return PRESET_CODING_BALANCED;
  }
  if (lowerCase.includes('creative') || lowerCase.includes('brainstorm')) {
    return PRESET_CREATIVE_MED;
  }
  if (lowerCase.includes('analytic') || lowerCase.includes('analysis')) {
    return PRESET_ANALYTICAL_MOD;
  }
  if (lowerCase.includes('json') || lowerCase.includes('structured')) {
    return PRESET_JSON;
  }
  if (lowerCase.includes('classif')) {
    return PRESET_CLASSIFY;
  }
  if (lowerCase.includes('summar')) {
    return PRESET_SUMMARY_ABSTRACT;
  }
  if (lowerCase.includes('fast') || lowerCase.includes('quick')) {
    return PRESET_FAST_CHEAP;
  }

  // Default to balanced
  return PRESET_BALANCED;
}
