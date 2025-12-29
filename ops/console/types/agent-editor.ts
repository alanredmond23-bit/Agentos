/**
 * AgentOS Agent Studio - Agent Editor Types
 * Type definitions for the agent configuration editor
 */

import { z } from 'zod';

// ============================================
// Authority Levels
// ============================================

export const AuthorityLevelValues = [
  'observer',
  'participant',
  'operator',
  'admin',
  'super_admin',
] as const;

export type AuthorityLevel = (typeof AuthorityLevelValues)[number];

// ============================================
// Zone Access Types
// ============================================

export const ZoneValues = ['red', 'yellow', 'green'] as const;
export type Zone = (typeof ZoneValues)[number];

export interface ZoneAccess {
  zone: Zone;
  read: boolean;
  write: boolean;
  execute: boolean;
}

// ============================================
// Memory Types
// ============================================

export const MemoryTypeValues = ['ephemeral', 'session', 'persistent'] as const;
export type MemoryType = (typeof MemoryTypeValues)[number];

// ============================================
// Model Types
// ============================================

export const ModelValues = [
  'claude-opus-4-5-20251101',
  'claude-sonnet-4-20250514',
  'claude-3-5-sonnet-20241022',
  'claude-3-5-haiku-20241022',
  'gpt-4-turbo',
  'gpt-4o',
  'gpt-4o-mini',
] as const;

export type Model = (typeof ModelValues)[number];

// ============================================
// MCP Server Types
// ============================================

export interface McpServer {
  id: string;
  name: string;
  url: string;
  auth: {
    type: 'none' | 'api_key' | 'oauth' | 'bearer';
    token?: string;
  };
  enabled: boolean;
}

// ============================================
// KPI Types
// ============================================

export interface KPI {
  id: string;
  key: string;
  value: string;
  target?: string;
}

// ============================================
// Stakeholder Types
// ============================================

export interface Stakeholder {
  id: string;
  name: string;
  role: string;
  contact?: string;
}

// ============================================
// Retry Policy Types
// ============================================

export interface RetryPolicy {
  max_retries: number;
  initial_delay_ms: number;
  max_delay_ms: number;
  backoff_multiplier: number;
}

// ============================================
// Knowledge Base Types
// ============================================

export interface KnowledgeBase {
  id: string;
  name: string;
  type: 'vector' | 'graph' | 'document';
  url?: string;
}

// ============================================
// Cluster 1: Meta
// ============================================

export interface MetaCluster {
  version: string;
  pack: string;
  created: string;
  updated: string;
  author: string;
}

// ============================================
// Cluster 2: Identity
// ============================================

export interface IdentityCluster {
  name: string;
  slug: string;
  role: string;
  purpose: string;
  bio: string;
  avatar: string;
}

// ============================================
// Cluster 3: Voice
// ============================================

export interface VoiceCluster {
  persona: string;
  tone: string;
  style: string;
  language: string;
  prohibited_phrases: string[];
}

// ============================================
// Cluster 4: Authority
// ============================================

export interface AuthorityCluster {
  level: AuthorityLevel;
  zone_access: ZoneAccess[];
  financial_limits: {
    per_transaction: number;
    daily: number;
    monthly: number;
  };
  can_delegate: boolean;
}

// ============================================
// Cluster 5: Business
// ============================================

export interface BusinessCluster {
  domain: string;
  objectives: string[];
  kpis: KPI[];
  stakeholders: Stakeholder[];
}

// ============================================
// Cluster 6: Technical
// ============================================

export interface TechnicalCluster {
  model: Model;
  temperature: number;
  max_tokens: number;
  timeout: number;
  retry_policy: RetryPolicy;
}

// ============================================
// Cluster 7: MCP Servers
// ============================================

export interface McpServersCluster {
  servers: McpServer[];
}

// ============================================
// Cluster 8: Agents
// ============================================

export interface AgentsCluster {
  can_spawn: boolean;
  can_supervise: boolean;
  reporting_to: string[];
  subordinates: string[];
}

// ============================================
// Cluster 9: Memory
// ============================================

export interface MemoryCluster {
  type: MemoryType;
  capacity: number;
  retention: number;
  knowledge_bases: KnowledgeBase[];
}

// ============================================
// Complete Agent Configuration
// ============================================

export interface AgentConfiguration {
  meta: MetaCluster;
  identity: IdentityCluster;
  voice: VoiceCluster;
  authority: AuthorityCluster;
  business: BusinessCluster;
  technical: TechnicalCluster;
  mcp_servers: McpServersCluster;
  agents: AgentsCluster;
  memory: MemoryCluster;
}

// ============================================
// Zod Schemas for Validation
// ============================================

export const MetaSchema = z.object({
  version: z.string().min(1, 'Version is required'),
  pack: z.string().min(1, 'Pack is required'),
  created: z.string(),
  updated: z.string(),
  author: z.string().min(1, 'Author is required'),
});

export const IdentitySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(50, 'Slug must be less than 50 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  role: z.string().min(1, 'Role is required'),
  purpose: z.string().min(1, 'Purpose is required').max(500, 'Purpose must be less than 500 characters'),
  bio: z.string().max(1000, 'Bio must be less than 1000 characters'),
  avatar: z.string().url('Avatar must be a valid URL').or(z.literal('')),
});

export const VoiceSchema = z.object({
  persona: z.string().min(1, 'Persona is required'),
  tone: z.string().min(1, 'Tone is required'),
  style: z.string().min(1, 'Style is required'),
  language: z.string().min(1, 'Language is required'),
  prohibited_phrases: z.array(z.string()),
});

export const ZoneAccessSchema = z.object({
  zone: z.enum(ZoneValues),
  read: z.boolean(),
  write: z.boolean(),
  execute: z.boolean(),
});

export const AuthoritySchema = z.object({
  level: z.enum(AuthorityLevelValues),
  zone_access: z.array(ZoneAccessSchema),
  financial_limits: z.object({
    per_transaction: z.number().min(0, 'Must be non-negative'),
    daily: z.number().min(0, 'Must be non-negative'),
    monthly: z.number().min(0, 'Must be non-negative'),
  }),
  can_delegate: z.boolean(),
});

export const KPISchema = z.object({
  id: z.string(),
  key: z.string().min(1, 'Key is required'),
  value: z.string().min(1, 'Value is required'),
  target: z.string().optional(),
});

export const StakeholderSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Name is required'),
  role: z.string().min(1, 'Role is required'),
  contact: z.string().optional(),
});

export const BusinessSchema = z.object({
  domain: z.string().min(1, 'Domain is required'),
  objectives: z.array(z.string()),
  kpis: z.array(KPISchema),
  stakeholders: z.array(StakeholderSchema),
});

export const RetryPolicySchema = z.object({
  max_retries: z.number().min(0).max(10),
  initial_delay_ms: z.number().min(100).max(60000),
  max_delay_ms: z.number().min(1000).max(300000),
  backoff_multiplier: z.number().min(1).max(5),
});

export const TechnicalSchema = z.object({
  model: z.enum(ModelValues),
  temperature: z.number().min(0).max(2),
  max_tokens: z.number().min(1).max(200000),
  timeout: z.number().min(1000).max(600000),
  retry_policy: RetryPolicySchema,
});

export const McpServerSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Name is required'),
  url: z.string().url('Must be a valid URL'),
  auth: z.object({
    type: z.enum(['none', 'api_key', 'oauth', 'bearer']),
    token: z.string().optional(),
  }),
  enabled: z.boolean(),
});

export const McpServersSchema = z.object({
  servers: z.array(McpServerSchema),
});

export const AgentsSchema = z.object({
  can_spawn: z.boolean(),
  can_supervise: z.boolean(),
  reporting_to: z.array(z.string()),
  subordinates: z.array(z.string()),
});

export const KnowledgeBaseSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Name is required'),
  type: z.enum(['vector', 'graph', 'document']),
  url: z.string().optional(),
});

export const MemorySchema = z.object({
  type: z.enum(MemoryTypeValues),
  capacity: z.number().min(1).max(100000),
  retention: z.number().min(0).max(365),
  knowledge_bases: z.array(KnowledgeBaseSchema),
});

export const AgentConfigurationSchema = z.object({
  meta: MetaSchema,
  identity: IdentitySchema,
  voice: VoiceSchema,
  authority: AuthoritySchema,
  business: BusinessSchema,
  technical: TechnicalSchema,
  mcp_servers: McpServersSchema,
  agents: AgentsSchema,
  memory: MemorySchema,
});

// ============================================
// Cluster Metadata
// ============================================

export interface ClusterMeta {
  id: string;
  name: string;
  description: string;
  icon: string;
  required: boolean;
  order: number;
}

export const CLUSTERS: ClusterMeta[] = [
  {
    id: 'meta',
    name: 'Meta',
    description: 'Version, pack, and authorship information',
    icon: 'FileText',
    required: true,
    order: 1,
  },
  {
    id: 'identity',
    name: 'Identity',
    description: 'Agent name, role, and purpose',
    icon: 'User',
    required: true,
    order: 2,
  },
  {
    id: 'voice',
    name: 'Voice',
    description: 'Communication style and persona',
    icon: 'MessageSquare',
    required: false,
    order: 3,
  },
  {
    id: 'authority',
    name: 'Authority',
    description: 'Permissions and access control',
    icon: 'Shield',
    required: false,
    order: 4,
  },
  {
    id: 'business',
    name: 'Business',
    description: 'Domain, objectives, and KPIs',
    icon: 'Briefcase',
    required: false,
    order: 5,
  },
  {
    id: 'technical',
    name: 'Technical',
    description: 'Model settings and parameters',
    icon: 'Settings',
    required: false,
    order: 6,
  },
  {
    id: 'mcp_servers',
    name: 'MCP Servers',
    description: 'Connected MCP servers',
    icon: 'Server',
    required: false,
    order: 7,
  },
  {
    id: 'agents',
    name: 'Agents',
    description: 'Agent relationships and hierarchy',
    icon: 'Users',
    required: false,
    order: 8,
  },
  {
    id: 'memory',
    name: 'Memory',
    description: 'Memory type and knowledge bases',
    icon: 'Database',
    required: false,
    order: 9,
  },
];

// ============================================
// Default Values
// ============================================

export const DEFAULT_AGENT_CONFIG: AgentConfiguration = {
  meta: {
    version: '1.0.0',
    pack: 'engineering',
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
    author: '',
  },
  identity: {
    name: '',
    slug: '',
    role: '',
    purpose: '',
    bio: '',
    avatar: '',
  },
  voice: {
    persona: 'professional',
    tone: 'helpful',
    style: 'concise',
    language: 'en',
    prohibited_phrases: [],
  },
  authority: {
    level: 'participant',
    zone_access: [
      { zone: 'green', read: true, write: true, execute: true },
      { zone: 'yellow', read: true, write: false, execute: false },
      { zone: 'red', read: false, write: false, execute: false },
    ],
    financial_limits: {
      per_transaction: 0,
      daily: 0,
      monthly: 0,
    },
    can_delegate: false,
  },
  business: {
    domain: '',
    objectives: [],
    kpis: [],
    stakeholders: [],
  },
  technical: {
    model: 'claude-sonnet-4-20250514',
    temperature: 0.7,
    max_tokens: 4096,
    timeout: 30000,
    retry_policy: {
      max_retries: 3,
      initial_delay_ms: 1000,
      max_delay_ms: 30000,
      backoff_multiplier: 2,
    },
  },
  mcp_servers: {
    servers: [],
  },
  agents: {
    can_spawn: false,
    can_supervise: false,
    reporting_to: [],
    subordinates: [],
  },
  memory: {
    type: 'session',
    capacity: 1000,
    retention: 7,
    knowledge_bases: [],
  },
};
