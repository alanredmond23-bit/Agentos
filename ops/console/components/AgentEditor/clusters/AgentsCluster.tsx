/**
 * AgentOS Ops Console - Agents Cluster
 * Multi-agent orchestration configuration
 */

'use client';

import React, { useCallback } from 'react';
import { cn } from '@/lib/utils';
// Card components unused after collapsible refactor
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { MultiSelect, MultiSelectOption } from '../fields/MultiSelect';
import {
  Users,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  GitBranch,
  Bot,
} from 'lucide-react';

// ============================================
// Types
// ============================================

export type OrchestrationMode = 'sequential' | 'parallel' | 'hierarchical' | 'swarm';
export type AgentRole = 'leader' | 'worker' | 'specialist' | 'validator';

export interface SubAgent {
  id: string;
  agentId: string;
  name: string;
  role: AgentRole;
  priority: number;
  capabilities: string[];
  canDelegate: boolean;
  maxConcurrentTasks: number;
}

export interface AgentsClusterValue {
  orchestrationMode: OrchestrationMode;
  maxConcurrentAgents: number;
  enableHandoff: boolean;
  handoffStrategy: 'round_robin' | 'load_balanced' | 'capability_based';
  subAgents: SubAgent[];
}

export interface AgentsClusterProps {
  value?: AgentsClusterValue;
  onChange: (value: AgentsClusterValue) => void;
  availableAgents?: MultiSelectOption[];
  isExpanded?: boolean;
  onToggle?: () => void;
  disabled?: boolean;
  className?: string;
}

export type SubAgentConfig = SubAgent;

// ============================================
// Constants
// ============================================

const ORCHESTRATION_MODES: { value: OrchestrationMode; label: string; description: string }[] = [
  { value: 'sequential', label: 'Sequential', description: 'Agents execute one after another' },
  { value: 'parallel', label: 'Parallel', description: 'Agents execute simultaneously' },
  { value: 'hierarchical', label: 'Hierarchical', description: 'Leader delegates to workers' },
  { value: 'swarm', label: 'Swarm', description: 'Self-organizing agent collective' },
];

const AGENT_ROLES: { value: AgentRole; label: string; color: string }[] = [
  { value: 'leader', label: 'Leader', color: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400' },
  { value: 'worker', label: 'Worker', color: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400' },
  { value: 'specialist', label: 'Specialist', color: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' },
  { value: 'validator', label: 'Validator', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' },
];

const CAPABILITY_OPTIONS: MultiSelectOption[] = [
  { value: 'code_generation', label: 'Code Generation' },
  { value: 'code_review', label: 'Code Review' },
  { value: 'testing', label: 'Testing' },
  { value: 'documentation', label: 'Documentation' },
  { value: 'planning', label: 'Planning' },
  { value: 'research', label: 'Research' },
  { value: 'data_analysis', label: 'Data Analysis' },
  { value: 'deployment', label: 'Deployment' },
];

// ============================================
// Helper Functions
// ============================================

function generateId(): string {
  return `agent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================
// Sub Agent Item Component
// ============================================

interface SubAgentItemProps {
  agent: SubAgent;
  onUpdate: (updates: Partial<SubAgent>) => void;
  onRemove: () => void;
  disabled?: boolean;
}

function SubAgentItem({ agent, onUpdate, onRemove, disabled }: SubAgentItemProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const roleConfig = AGENT_ROLES.find((r) => r.value === agent.role);

  return (
    <div
      className={cn(
        'border rounded-lg overflow-hidden',
        'border-slate-200 dark:border-dark-border-primary',
        'bg-white dark:bg-dark-bg-secondary',
        disabled && 'opacity-50'
      )}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-dark-bg-tertiary"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <Bot className="w-5 h-5 text-slate-400" />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-900 dark:text-dark-text-primary truncate">
              {agent.name || 'Unnamed Agent'}
            </span>
            <Badge size="sm" className={roleConfig?.color}>
              {roleConfig?.label}
            </Badge>
          </div>
          <p className="text-sm text-slate-500 dark:text-dark-text-tertiary">
            Priority: {agent.priority} | Max Tasks: {agent.maxConcurrentTasks}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            disabled={disabled}
            className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-500/10 text-slate-400 hover:text-red-500"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-slate-200 dark:border-dark-border-primary p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Agent Name"
              value={agent.name}
              onChange={(e) => onUpdate({ name: e.target.value })}
              placeholder="Display name"
              disabled={disabled}
            />
            <Input
              label="Agent ID"
              value={agent.agentId}
              onChange={(e) => onUpdate({ agentId: e.target.value })}
              placeholder="agent-uuid"
              disabled={disabled}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-dark-text-secondary mb-1.5">
                Role
              </label>
              <select
                value={agent.role}
                onChange={(e) => onUpdate({ role: e.target.value as AgentRole })}
                disabled={disabled}
                className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-dark-border-secondary bg-white dark:bg-dark-bg-tertiary"
              >
                {AGENT_ROLES.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-dark-text-secondary mb-1.5">
                Priority
              </label>
              <input
                type="number"
                value={agent.priority}
                onChange={(e) => onUpdate({ priority: parseInt(e.target.value) || 1 })}
                min={1}
                max={100}
                disabled={disabled}
                className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-dark-border-secondary bg-white dark:bg-dark-bg-tertiary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-dark-text-secondary mb-1.5">
                Max Concurrent Tasks
              </label>
              <input
                type="number"
                value={agent.maxConcurrentTasks}
                onChange={(e) => onUpdate({ maxConcurrentTasks: parseInt(e.target.value) || 1 })}
                min={1}
                max={10}
                disabled={disabled}
                className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-dark-border-secondary bg-white dark:bg-dark-bg-tertiary"
              />
            </div>
          </div>

          <MultiSelect
            label="Capabilities"
            options={CAPABILITY_OPTIONS}
            value={agent.capabilities}
            onChange={(capabilities) => onUpdate({ capabilities })}
            disabled={disabled}
            placeholder="Select capabilities..."
          />

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={agent.canDelegate}
              onChange={(e) => onUpdate({ canDelegate: e.target.checked })}
              disabled={disabled}
              className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            <span className="text-sm text-slate-600 dark:text-dark-text-secondary">
              Can delegate tasks to other agents
            </span>
          </label>
        </div>
      )}
    </div>
  );
}

// ============================================
// Agents Cluster Component
// ============================================

// Default value for initialization
const DEFAULT_AGENTS_VALUE: AgentsClusterValue = {
  orchestrationMode: 'sequential',
  maxConcurrentAgents: 5,
  enableHandoff: true,
  handoffStrategy: 'capability_based',
  subAgents: [],
};

export function AgentsCluster({
  value: externalValue,
  onChange,
  availableAgents = [],
  isExpanded: controlledExpanded = true,
  onToggle,
  disabled = false,
  className,
}: AgentsClusterProps) {
  const [localExpanded, setLocalExpanded] = React.useState(true);
  const isExpanded = onToggle ? controlledExpanded : localExpanded;
  const handleToggle = onToggle || (() => setLocalExpanded(!localExpanded));

  // Use external value or default
  const value = externalValue || DEFAULT_AGENTS_VALUE;

  const addAgent = useCallback(() => {
    const newAgent: SubAgent = {
      id: generateId(),
      agentId: '',
      name: '',
      role: 'worker',
      priority: 50,
      capabilities: [],
      canDelegate: false,
      maxConcurrentTasks: 1,
    };
    onChange({ ...value, subAgents: [...value.subAgents, newAgent] });
  }, [value, onChange]);

  const updateAgent = useCallback(
    (id: string, updates: Partial<SubAgent>) => {
      onChange({
        ...value,
        subAgents: value.subAgents.map((agent) =>
          agent.id === id ? { ...agent, ...updates } : agent
        ),
      });
    },
    [value, onChange]
  );

  const removeAgent = useCallback(
    (id: string) => {
      onChange({
        ...value,
        subAgents: value.subAgents.filter((agent) => agent.id !== id),
      });
    },
    [value, onChange]
  );

  return (
    <div className={cn('border border-slate-200 dark:border-dark-border-primary rounded-lg overflow-hidden', className)}>
      {/* Cluster Header */}
      <button
        type="button"
        onClick={handleToggle}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-dark-bg-tertiary hover:bg-slate-100 dark:hover:bg-dark-bg-elevated transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-500/20">
            <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-dark-text-primary">
              Multi-Agent Orchestration
            </h3>
            <p className="text-xs text-slate-500 dark:text-dark-text-tertiary">
              Sub-agents and coordination ({value.subAgents?.length || 0} agents)
            </p>
          </div>
        </div>
        <ChevronDown
          className={cn(
            'w-5 h-5 text-slate-400 transition-transform duration-200',
            isExpanded && 'rotate-180'
          )}
        />
      </button>

      {/* Cluster Content */}
      {isExpanded && (
        <div className="px-4 py-4 bg-white dark:bg-dark-bg-secondary space-y-6">
          {/* Action Button */}
          <div className="flex justify-end">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={addAgent}
              disabled={disabled}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Add Agent
            </Button>
          </div>
        {/* Orchestration Settings */}
        <div className="p-4 rounded-lg bg-slate-50 dark:bg-dark-bg-tertiary border border-slate-200 dark:border-dark-border-primary">
          <div className="flex items-center gap-2 mb-4">
            <GitBranch className="w-5 h-5 text-slate-500" />
            <h4 className="font-medium text-slate-900 dark:text-dark-text-primary">
              Orchestration Mode
            </h4>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            {ORCHESTRATION_MODES.map((mode) => (
              <button
                key={mode.value}
                type="button"
                onClick={() => onChange({ ...value, orchestrationMode: mode.value })}
                disabled={disabled}
                className={cn(
                  'p-3 rounded-lg border text-left transition-colors',
                  value.orchestrationMode === mode.value
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10'
                    : 'border-slate-200 dark:border-dark-border-secondary hover:border-slate-300'
                )}
              >
                <div className="font-medium text-slate-900 dark:text-dark-text-primary">
                  {mode.label}
                </div>
                <div className="text-xs text-slate-500 dark:text-dark-text-tertiary">
                  {mode.description}
                </div>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-dark-text-secondary mb-1.5">
                Max Concurrent Agents
              </label>
              <input
                type="number"
                value={value.maxConcurrentAgents}
                onChange={(e) =>
                  onChange({ ...value, maxConcurrentAgents: parseInt(e.target.value) || 1 })
                }
                min={1}
                max={20}
                disabled={disabled}
                className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-dark-border-secondary bg-white dark:bg-dark-bg-secondary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-dark-text-secondary mb-1.5">
                Handoff Strategy
              </label>
              <select
                value={value.handoffStrategy}
                onChange={(e) =>
                  onChange({ ...value, handoffStrategy: e.target.value as any })
                }
                disabled={disabled || !value.enableHandoff}
                className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-dark-border-secondary bg-white dark:bg-dark-bg-secondary"
              >
                <option value="round_robin">Round Robin</option>
                <option value="load_balanced">Load Balanced</option>
                <option value="capability_based">Capability Based</option>
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2 mt-4 cursor-pointer">
            <input
              type="checkbox"
              checked={value.enableHandoff}
              onChange={(e) => onChange({ ...value, enableHandoff: e.target.checked })}
              disabled={disabled}
              className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            <span className="text-sm text-slate-600 dark:text-dark-text-secondary">
              Enable task handoff between agents
            </span>
          </label>
        </div>

        {/* Sub-Agents List */}
        <div>
          <h4 className="font-medium text-slate-900 dark:text-dark-text-primary mb-3">
            Sub-Agents ({value.subAgents.length})
          </h4>

          <div className="space-y-3">
            {value.subAgents.map((agent) => (
              <SubAgentItem
                key={agent.id}
                agent={agent}
                onUpdate={(updates) => updateAgent(agent.id, updates)}
                onRemove={() => removeAgent(agent.id)}
                disabled={disabled}
              />
            ))}
          </div>

          {value.subAgents.length === 0 && (
            <div className="text-center py-8 border-2 border-dashed border-slate-200 dark:border-dark-border-primary rounded-lg">
              <Users className="w-10 h-10 text-slate-300 dark:text-dark-text-muted mx-auto mb-3" />
              <p className="text-sm text-slate-500 dark:text-dark-text-tertiary mb-3">
                No sub-agents configured
              </p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={addAgent}
                disabled={disabled}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Add Sub-Agent
              </Button>
            </div>
          )}
        </div>
        </div>
      )}
    </div>
  );
}

export default AgentsCluster;
