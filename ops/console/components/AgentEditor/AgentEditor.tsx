/**
 * AgentOS Ops Console - AgentEditor Component
 * Main container for the agent configuration form editor
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from '@/lib/utils';
import { EditorHeader, EditorMode, SaveStatus } from './EditorHeader';
import { EditorSidebar, ClusterNavItem, DEFAULT_CLUSTERS } from './EditorSidebar';
import { MetaCluster } from './clusters/MetaCluster';
import { IdentityCluster } from './clusters/IdentityCluster';
import { VoiceCluster } from './clusters/VoiceCluster';
import { AuthorityCluster } from './clusters/AuthorityCluster';
import { BusinessCluster } from './clusters/BusinessCluster';
import { TechnicalCluster } from './clusters/TechnicalCluster';
import { McpServersCluster, McpServerConfig } from './clusters/McpServersCluster';
import { AgentsCluster, AgentsClusterValue } from './clusters/AgentsCluster';
import { MemoryCluster, MemoryClusterValue } from './clusters/MemoryCluster';

// ============================================
// Agent Form Schema
// ============================================

const agentFormSchema = z.object({
  // Meta Cluster
  version: z.string().regex(/^\d+\.\d+\.\d+(-[a-zA-Z0-9]+)?$/, 'Invalid version format'),
  pack: z.string().min(1, 'Pack is required'),
  schema_version: z.string().min(1, 'Schema version is required'),

  // Identity Cluster
  name: z.string().min(1, 'Name is required').max(100),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid slug format'),
  role: z.string().min(1, 'Role is required'),
  mission: z.string().min(1, 'Mission is required').max(500),
  personality: z.array(z.string()).optional(),

  // Voice Cluster
  voice: z.object({
    tone: z.string().optional(),
    vocabulary_level: z.string().optional(),
    custom_vocabulary: z.array(z.string()).optional(),
    response_template: z.string().optional(),
    constraints: z.array(z.string()).optional(),
    use_markdown: z.boolean().optional(),
    include_citations: z.boolean().optional(),
    allow_code_snippets: z.boolean().optional(),
  }).optional(),

  // Authority Cluster
  authority: z.object({
    level: z.string().min(1, 'Authority level is required'),
    zone_access: z.array(z.string()).min(1, 'At least one zone is required'),
    resources: z.array(z.string()).optional(),
    financial_limits: z.object({
      per_action: z.number().optional(),
      daily: z.number().optional(),
      monthly: z.number().optional(),
      approval_threshold: z.number().optional(),
    }).optional(),
    require_approval: z.boolean().optional(),
    audit_all_actions: z.boolean().optional(),
    can_spawn_agents: z.boolean().optional(),
  }).optional(),

  // Business Cluster
  business: z.object({
    department: z.string().min(1, 'Department is required'),
    cost_center: z.string().min(1, 'Cost center is required'),
    owner: z.string().email('Invalid email format'),
    team: z.array(z.string()).optional(),
    priority: z.string().optional(),
    tags: z.array(z.string()).optional(),
    project: z.string().optional(),
  }).optional(),

  // Technical Cluster
  technical: z.object({
    model: z.string().min(1, 'Model is required'),
    endpoint: z.string().min(1, 'Endpoint is required'),
    custom_endpoint_url: z.string().url().optional().or(z.literal('')),
    temperature: z.number().min(0).max(2).optional(),
    max_tokens: z.number().min(1).max(128000).optional(),
    context_window: z.number().min(1024).max(200000).optional(),
    tools: z.array(z.string()).optional(),
    system_prompt: z.string().optional(),
    streaming: z.boolean().optional(),
    cache_responses: z.boolean().optional(),
    retry_on_failure: z.boolean().optional(),
    log_prompts: z.boolean().optional(),
  }).optional(),

  // MCP Servers Cluster
  mcp_servers: z.array(z.object({
    id: z.string(),
    name: z.string(),
    command: z.string(),
    args: z.array(z.string()),
    env: z.array(z.object({
      id: z.string(),
      key: z.string(),
      value: z.string(),
    })),
    status: z.enum(['connected', 'disconnected', 'connecting', 'error']),
    enabled: z.boolean(),
    timeout: z.number(),
    retryCount: z.number(),
    lastError: z.string().optional(),
  })).optional(),

  // Agents Cluster
  agents: z.object({
    orchestrationMode: z.enum(['sequential', 'parallel', 'hierarchical', 'swarm']).optional(),
    maxConcurrentAgents: z.number().min(1).max(20).optional(),
    enableHandoff: z.boolean().optional(),
    handoffStrategy: z.enum(['round_robin', 'load_balanced', 'capability_based']).optional(),
    subAgents: z.array(z.object({
      id: z.string(),
      agentId: z.string(),
      name: z.string(),
      role: z.enum(['leader', 'worker', 'specialist', 'validator']),
      priority: z.number(),
      capabilities: z.array(z.string()),
      canDelegate: z.boolean(),
      maxConcurrentTasks: z.number(),
    })).optional(),
  }).optional(),

  // Memory Cluster
  memory: z.object({
    working: z.object({
      enabled: z.boolean(),
      maxTokens: z.number(),
      compressionEnabled: z.boolean(),
      compressionThreshold: z.number(),
    }).optional(),
    session: z.object({
      enabled: z.boolean(),
      ttlMinutes: z.number(),
      maxEntries: z.number(),
      persistOnClose: z.boolean(),
      includeSystemMessages: z.boolean(),
    }).optional(),
    longTerm: z.object({
      enabled: z.boolean(),
      provider: z.enum(['local', 'pinecone', 'weaviate', 'qdrant', 'supabase']),
      indexName: z.string(),
      embeddingModel: z.string(),
      maxRetrievedDocs: z.number(),
      similarityThreshold: z.number(),
      autoIndex: z.boolean(),
      categories: z.array(z.string()),
    }).optional(),
  }).optional(),
});

type AgentFormData = z.infer<typeof agentFormSchema>;

// ============================================
// AgentEditor Types
// ============================================

export interface AgentEditorProps {
  initialData?: Partial<AgentFormData>;
  onSave: (data: AgentFormData) => Promise<void>;
  onCancel: () => void;
  agentId?: string;
  isNew?: boolean;
  disabled?: boolean;
  className?: string;
}

// ============================================
// Default Form Values
// ============================================

const defaultFormValues: Partial<AgentFormData> = {
  version: '1.0.0',
  schema_version: '2.1',
  personality: [],
  voice: {
    tone: 'professional',
    vocabulary_level: 'standard',
    custom_vocabulary: [],
    constraints: [],
    use_markdown: true,
    include_citations: false,
    allow_code_snippets: true,
  },
  authority: {
    level: 'contributor',
    zone_access: ['green'],
    resources: [],
    financial_limits: {
      per_action: 100,
      daily: 1000,
      monthly: 10000,
      approval_threshold: 500,
    },
    require_approval: false,
    audit_all_actions: true,
    can_spawn_agents: false,
  },
  business: {
    department: '',
    cost_center: '',
    owner: '',
    team: [],
    tags: [],
    priority: 'medium',
  },
  technical: {
    model: 'claude-sonnet-4-20250514',
    endpoint: 'anthropic',
    temperature: 0.7,
    max_tokens: 4096,
    context_window: 200000,
    tools: [],
    streaming: true,
    cache_responses: true,
    retry_on_failure: true,
    log_prompts: false,
  },
  mcp_servers: [],
  agents: {
    orchestrationMode: 'sequential',
    maxConcurrentAgents: 5,
    enableHandoff: true,
    handoffStrategy: 'capability_based',
    subAgents: [],
  },
  memory: {
    working: {
      enabled: true,
      maxTokens: 32000,
      compressionEnabled: true,
      compressionThreshold: 80,
    },
    session: {
      enabled: true,
      ttlMinutes: 60,
      maxEntries: 100,
      persistOnClose: true,
      includeSystemMessages: false,
    },
    longTerm: {
      enabled: false,
      provider: 'local',
      indexName: 'agent-memory',
      embeddingModel: 'text-embedding-3-small',
      maxRetrievedDocs: 5,
      similarityThreshold: 0.7,
      autoIndex: true,
      categories: [],
    },
  },
};

// ============================================
// AgentEditor Component
// ============================================

export function AgentEditor({
  initialData,
  onSave,
  onCancel,
  agentId,
  isNew = false,
  disabled = false,
  className,
}: AgentEditorProps) {
  // State
  const [mode, setMode] = useState<EditorMode>('form');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [activeCluster, setActiveCluster] = useState('meta');
  const [expandedClusters, setExpandedClusters] = useState<string[]>(
    DEFAULT_CLUSTERS.map((c) => c.id)
  );

  // Refs for scrolling
  const clusterRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Form setup
  const methods = useForm<AgentFormData>({
    resolver: zodResolver(agentFormSchema),
    defaultValues: { ...defaultFormValues, ...initialData },
    mode: 'onChange',
  });

  const {
    handleSubmit,
    formState: { isDirty, isValid, errors },
    reset,
    watch,
  } = methods;

  // Watch form values for cluster status calculation
  const formValues = watch();

  // Calculate cluster statuses
  const clusterStatuses = useMemo(() => {
    const getFieldStatus = (_allFields: string[], required: string[]): { status: 'complete' | 'incomplete' | 'error' | 'empty'; completed: number; total: number } => {
      let completed = 0;
      let hasError = false;

      for (const field of required) {
        const value = field.split('.').reduce((obj: Record<string, unknown> | undefined, key) => {
          if (obj && typeof obj === 'object') {
            return obj[key] as Record<string, unknown> | undefined;
          }
          return undefined;
        }, formValues as Record<string, unknown>);

        const error = field.split('.').reduce((obj: Record<string, unknown> | undefined, key) => {
          if (obj && typeof obj === 'object') {
            return obj[key] as Record<string, unknown> | undefined;
          }
          return undefined;
        }, errors as unknown as Record<string, unknown>);

        if (error) {
          hasError = true;
        } else if (value !== undefined && value !== '' && value !== null && (!Array.isArray(value) || value.length > 0)) {
          completed++;
        }
      }

      const total = required.length;

      if (hasError) return { status: 'error', completed, total };
      if (completed === 0) return { status: 'empty', completed, total };
      if (completed === total) return { status: 'complete', completed, total };
      return { status: 'incomplete', completed, total };
    };

    return {
      meta: getFieldStatus(['version', 'pack', 'schema_version'], ['version', 'pack', 'schema_version']),
      identity: getFieldStatus(['name', 'slug', 'role', 'mission'], ['name', 'slug', 'role', 'mission']),
      voice: getFieldStatus(['voice.tone'], ['voice.tone']),
      authority: getFieldStatus(['authority.level', 'authority.zone_access'], ['authority.level', 'authority.zone_access']),
      business: getFieldStatus(['business.department', 'business.cost_center', 'business.owner'], ['business.department', 'business.cost_center', 'business.owner']),
      technical: getFieldStatus(['technical.model', 'technical.endpoint'], ['technical.model', 'technical.endpoint']),
      mcp_servers: getFieldStatus(['mcp_servers'], []),
      agents: getFieldStatus(['agents.orchestrationMode'], []),
      memory: getFieldStatus(['memory.working.enabled'], []),
    };
  }, [formValues, errors]);

  // Build cluster navigation items
  const clusters: ClusterNavItem[] = useMemo(() => {
    return DEFAULT_CLUSTERS.map((cluster) => {
      const status = clusterStatuses[cluster.id as keyof typeof clusterStatuses];
      return {
        ...cluster,
        status: status.status,
        requiredFields: status.total,
        completedFields: status.completed,
      };
    });
  }, [clusterStatuses]);

  // Handle save
  const handleSaveForm = useCallback(async (data: AgentFormData) => {
    setSaveStatus('saving');
    try {
      await onSave(data);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Failed to save agent:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  }, [onSave]);

  // Handle reset
  const handleReset = useCallback(() => {
    reset({ ...defaultFormValues, ...initialData });
  }, [reset, initialData]);

  // Handle cluster click - scroll to and expand
  const handleClusterClick = useCallback((clusterId: string) => {
    setActiveCluster(clusterId);

    // Expand if not already
    if (!expandedClusters.includes(clusterId)) {
      setExpandedClusters((prev) => [...prev, clusterId]);
    }

    // Scroll to cluster
    const ref = clusterRefs.current[clusterId];
    if (ref) {
      ref.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [expandedClusters]);

  // Handle toggle cluster expansion
  const handleToggleCluster = useCallback((clusterId: string) => {
    setExpandedClusters((prev) =>
      prev.includes(clusterId)
        ? prev.filter((id) => id !== clusterId)
        : [...prev, clusterId]
    );
  }, []);

  // Handle expand/collapse all
  const handleToggleAll = useCallback((expand: boolean) => {
    setExpandedClusters(expand ? DEFAULT_CLUSTERS.map((c) => c.id) : []);
  }, []);

  // Update save status when dirty
  useEffect(() => {
    if (isDirty && saveStatus === 'idle') {
      setSaveStatus('unsaved');
    }
  }, [isDirty, saveStatus]);

  return (
    <FormProvider {...methods}>
      <div className={cn('flex flex-col h-full bg-slate-100 dark:bg-dark-bg-primary', className)}>
        {/* Header */}
        <EditorHeader
          title={isNew ? 'Create New Agent' : `Edit Agent${agentId ? `: ${agentId}` : ''}`}
          subtitle={formValues.name || 'Untitled Agent'}
          mode={mode}
          onModeChange={setMode}
          saveStatus={saveStatus}
          isDirty={isDirty}
          isValid={isValid}
          onSave={handleSubmit(handleSaveForm)}
          onCancel={onCancel}
          onReset={handleReset}
          disabled={disabled}
        />

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <EditorSidebar
            clusters={clusters}
            activeCluster={activeCluster}
            onClusterClick={handleClusterClick}
            expandedClusters={expandedClusters}
            onToggleAll={handleToggleAll}
          />

          {/* Form Content */}
          <main className="flex-1 overflow-y-auto p-6">
            {mode === 'form' && (
              <form onSubmit={handleSubmit(handleSaveForm)} className="space-y-6 max-w-3xl mx-auto">
                {/* Meta Cluster */}
                <div ref={(el) => { clusterRefs.current['meta'] = el; }}>
                  <MetaCluster
                    isExpanded={expandedClusters.includes('meta')}
                    onToggle={() => handleToggleCluster('meta')}
                    disabled={disabled}
                  />
                </div>

                {/* Identity Cluster */}
                <div ref={(el) => { clusterRefs.current['identity'] = el; }}>
                  <IdentityCluster
                    isExpanded={expandedClusters.includes('identity')}
                    onToggle={() => handleToggleCluster('identity')}
                    disabled={disabled}
                  />
                </div>

                {/* Voice Cluster */}
                <div ref={(el) => { clusterRefs.current['voice'] = el; }}>
                  <VoiceCluster
                    isExpanded={expandedClusters.includes('voice')}
                    onToggle={() => handleToggleCluster('voice')}
                    disabled={disabled}
                  />
                </div>

                {/* Authority Cluster */}
                <div ref={(el) => { clusterRefs.current['authority'] = el; }}>
                  <AuthorityCluster
                    isExpanded={expandedClusters.includes('authority')}
                    onToggle={() => handleToggleCluster('authority')}
                    disabled={disabled}
                  />
                </div>

                {/* Business Cluster */}
                <div ref={(el) => { clusterRefs.current['business'] = el; }}>
                  <BusinessCluster
                    isExpanded={expandedClusters.includes('business')}
                    onToggle={() => handleToggleCluster('business')}
                    disabled={disabled}
                  />
                </div>

                {/* Technical Cluster */}
                <div ref={(el) => { clusterRefs.current['technical'] = el; }}>
                  <TechnicalCluster
                    isExpanded={expandedClusters.includes('technical')}
                    onToggle={() => handleToggleCluster('technical')}
                    disabled={disabled}
                  />
                </div>

                {/* MCP Servers Cluster */}
                <div ref={(el) => { clusterRefs.current['mcp_servers'] = el; }}>
                  <McpServersCluster
                    isExpanded={expandedClusters.includes('mcp_servers')}
                    onToggle={() => handleToggleCluster('mcp_servers')}
                    disabled={disabled}
                    value={formValues.mcp_servers || []}
                    onChange={(servers: McpServerConfig[]) => methods.setValue('mcp_servers', servers, { shouldDirty: true })}
                  />
                </div>

                {/* Agents Cluster */}
                <div ref={(el) => { clusterRefs.current['agents'] = el; }}>
                  <AgentsCluster
                    isExpanded={expandedClusters.includes('agents')}
                    onToggle={() => handleToggleCluster('agents')}
                    disabled={disabled}
                    value={formValues.agents as AgentsClusterValue | undefined}
                    onChange={(agents: AgentsClusterValue) => methods.setValue('agents', agents, { shouldDirty: true })}
                  />
                </div>

                {/* Memory Cluster */}
                <div ref={(el) => { clusterRefs.current['memory'] = el; }}>
                  <MemoryCluster
                    isExpanded={expandedClusters.includes('memory')}
                    onToggle={() => handleToggleCluster('memory')}
                    disabled={disabled}
                    value={formValues.memory as MemoryClusterValue | undefined}
                    onChange={(memory: MemoryClusterValue) => methods.setValue('memory', memory, { shouldDirty: true })}
                  />
                </div>

                {/* Bottom Spacer */}
                <div className="h-20" />
              </form>
            )}

            {mode === 'yaml' && (
              <div className="bg-slate-900 rounded-lg p-4 h-full">
                <pre className="text-sm text-slate-300 font-mono overflow-auto">
                  {`# Agent Configuration YAML
# Generated from form data

version: "${formValues.version || ''}"
pack: "${formValues.pack || ''}"
schema_version: "${formValues.schema_version || ''}"

identity:
  name: "${formValues.name || ''}"
  slug: "${formValues.slug || ''}"
  role: "${formValues.role || ''}"
  mission: |
    ${formValues.mission?.split('\n').join('\n    ') || ''}
  personality: [${(formValues.personality || []).map(p => `"${p}"`).join(', ')}]

voice:
  tone: "${formValues.voice?.tone || ''}"
  vocabulary_level: "${formValues.voice?.vocabulary_level || ''}"
  use_markdown: ${formValues.voice?.use_markdown ?? true}
  include_citations: ${formValues.voice?.include_citations ?? false}
  allow_code_snippets: ${formValues.voice?.allow_code_snippets ?? true}

authority:
  level: "${formValues.authority?.level || ''}"
  zone_access: [${(formValues.authority?.zone_access || []).map(z => `"${z}"`).join(', ')}]
  require_approval: ${formValues.authority?.require_approval ?? false}
  audit_all_actions: ${formValues.authority?.audit_all_actions ?? true}

business:
  department: "${formValues.business?.department || ''}"
  cost_center: "${formValues.business?.cost_center || ''}"
  owner: "${formValues.business?.owner || ''}"
  priority: "${formValues.business?.priority || 'medium'}"

technical:
  model: "${formValues.technical?.model || ''}"
  endpoint: "${formValues.technical?.endpoint || ''}"
  temperature: ${formValues.technical?.temperature ?? 0.7}
  max_tokens: ${formValues.technical?.max_tokens ?? 4096}
  streaming: ${formValues.technical?.streaming ?? true}

mcp_servers:
  count: ${formValues.mcp_servers?.length || 0}
  servers: [${(formValues.mcp_servers || []).map(s => `"${s.name}"`).join(', ')}]

agents:
  orchestration_mode: "${formValues.agents?.orchestrationMode || 'sequential'}"
  max_concurrent: ${formValues.agents?.maxConcurrentAgents ?? 5}
  enable_handoff: ${formValues.agents?.enableHandoff ?? true}
  sub_agents: [${(formValues.agents?.subAgents || []).map(a => `"${a.name}"`).join(', ')}]

memory:
  working:
    enabled: ${formValues.memory?.working?.enabled ?? true}
    max_tokens: ${formValues.memory?.working?.maxTokens ?? 32000}
  session:
    enabled: ${formValues.memory?.session?.enabled ?? true}
    ttl_minutes: ${formValues.memory?.session?.ttlMinutes ?? 60}
  long_term:
    enabled: ${formValues.memory?.longTerm?.enabled ?? false}
    provider: "${formValues.memory?.longTerm?.provider || 'local'}"
`}
                </pre>
              </div>
            )}

            {mode === 'preview' && (
              <div className="bg-white dark:bg-dark-bg-secondary rounded-lg p-6 max-w-2xl mx-auto shadow-sm">
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center text-white text-2xl font-bold">
                    {formValues.name?.charAt(0)?.toUpperCase() || 'A'}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-dark-text-primary">
                      {formValues.name || 'Untitled Agent'}
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-dark-text-tertiary">
                      {formValues.slug || 'no-slug'}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="px-2 py-0.5 text-xs font-medium rounded bg-brand-100 dark:bg-brand-500/20 text-brand-700 dark:text-brand-300">
                        {formValues.role || 'No Role'}
                      </span>
                      <span className="px-2 py-0.5 text-xs font-medium rounded bg-slate-100 dark:bg-dark-bg-tertiary text-slate-600 dark:text-dark-text-secondary">
                        v{formValues.version || '1.0.0'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-dark-text-secondary mb-1">
                      Mission
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-dark-text-tertiary">
                      {formValues.mission || 'No mission defined'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-700 dark:text-dark-text-secondary mb-1">
                        Model
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-dark-text-tertiary">
                        {formValues.technical?.model || 'Not configured'}
                      </p>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-700 dark:text-dark-text-secondary mb-1">
                        Authority Level
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-dark-text-tertiary capitalize">
                        {formValues.authority?.level?.replace('_', ' ') || 'Not set'}
                      </p>
                    </div>
                  </div>

                  {/* Additional clusters preview */}
                  <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-200 dark:border-dark-border-primary">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-700 dark:text-dark-text-secondary mb-1">
                        MCP Servers
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-dark-text-tertiary">
                        {formValues.mcp_servers?.length || 0} configured
                      </p>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-700 dark:text-dark-text-secondary mb-1">
                        Sub-Agents
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-dark-text-tertiary">
                        {formValues.agents?.subAgents?.length || 0} agents
                      </p>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-700 dark:text-dark-text-secondary mb-1">
                        Memory
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-dark-text-tertiary">
                        {formValues.memory?.longTerm?.enabled ? 'Long-term enabled' : 'Session only'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </FormProvider>
  );
}

export default AgentEditor;
