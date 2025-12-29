/**
 * AgentOS Ops Console - Tools Cluster
 * Configuration for allowed tools, forbidden tools, and tool-specific settings
 */

'use client';

import React, { useCallback, useState } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { MultiSelect, MultiSelectOption } from '../fields/MultiSelect';
import { KeyValueEditor, KeyValuePair } from '../fields/KeyValueEditor';
import { SliderField } from '../fields/SliderField';
import {
  Wrench,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Shield,
  Ban,
  Check,
  Settings2,
  Zap,
  AlertTriangle,
} from 'lucide-react';

// ============================================
// Types
// ============================================

export interface ToolConfig {
  id: string;
  name: string;
  enabled: boolean;
  requiresApproval: boolean;
  rateLimit: number;
  rateLimitWindow: number;
  timeout: number;
  parameters: KeyValuePair[];
}

export interface ToolsClusterValue {
  allowedTools: string[];
  forbiddenTools: string[];
  requireApprovalFor: string[];
  toolConfigs: ToolConfig[];
  defaultTimeout: number;
  defaultRateLimit: number;
  allowCustomTools: boolean;
}

interface ToolsClusterProps {
  value: ToolsClusterValue;
  onChange: (value: ToolsClusterValue) => void;
  availableTools?: MultiSelectOption[];
  disabled?: boolean;
  className?: string;
}

// ============================================
// Constants
// ============================================

const DEFAULT_TOOLS: MultiSelectOption[] = [
  { value: 'bash', label: 'Bash', description: 'Execute shell commands', group: 'System' },
  { value: 'read', label: 'Read', description: 'Read file contents', group: 'File System' },
  { value: 'write', label: 'Write', description: 'Write to files', group: 'File System' },
  { value: 'edit', label: 'Edit', description: 'Edit file contents', group: 'File System' },
  { value: 'glob', label: 'Glob', description: 'Find files by pattern', group: 'File System' },
  { value: 'grep', label: 'Grep', description: 'Search file contents', group: 'File System' },
  { value: 'web_fetch', label: 'Web Fetch', description: 'Fetch web content', group: 'Network' },
  { value: 'web_search', label: 'Web Search', description: 'Search the web', group: 'Network' },
  { value: 'mcp', label: 'MCP Tools', description: 'Model Context Protocol tools', group: 'External' },
  { value: 'notebook_edit', label: 'Notebook Edit', description: 'Edit Jupyter notebooks', group: 'Development' },
  { value: 'todo_write', label: 'Todo Write', description: 'Manage task lists', group: 'Productivity' },
];

const DANGEROUS_TOOLS = ['bash', 'write', 'edit', 'mcp'];

// ============================================
// Helper Functions
// ============================================

function generateId(): string {
  return `tool-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================
// Tool Config Item Component
// ============================================

interface ToolConfigItemProps {
  config: ToolConfig;
  onUpdate: (updates: Partial<ToolConfig>) => void;
  onRemove: () => void;
  disabled?: boolean;
}

function ToolConfigItem({ config, onUpdate, onRemove, disabled }: ToolConfigItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      className={cn(
        'border rounded-lg overflow-hidden',
        'border-slate-200 dark:border-dark-border-primary',
        'bg-white dark:bg-dark-bg-secondary',
        !config.enabled && 'opacity-60',
        disabled && 'opacity-50'
      )}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-dark-bg-tertiary"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onUpdate({ enabled: !config.enabled });
          }}
          disabled={disabled}
          className={cn(
            'w-10 h-6 rounded-full transition-colors relative',
            config.enabled ? 'bg-brand-600' : 'bg-slate-300 dark:bg-dark-bg-elevated'
          )}
        >
          <span
            className={cn(
              'absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform',
              config.enabled ? 'left-5' : 'left-1'
            )}
          />
        </button>

        <Wrench className="w-5 h-5 text-slate-400" />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-900 dark:text-dark-text-primary">
              {config.name}
            </span>
            {config.requiresApproval && (
              <Badge size="sm" variant="warning">
                Requires Approval
              </Badge>
            )}
            {DANGEROUS_TOOLS.includes(config.name) && (
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            )}
          </div>
          <p className="text-sm text-slate-500 dark:text-dark-text-tertiary">
            Rate: {config.rateLimit}/{config.rateLimitWindow}s | Timeout: {config.timeout}ms
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
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-dark-text-secondary mb-1.5">
                Rate Limit
              </label>
              <input
                type="number"
                value={config.rateLimit}
                onChange={(e) => onUpdate({ rateLimit: parseInt(e.target.value) || 10 })}
                min={1}
                max={1000}
                disabled={disabled}
                className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-dark-border-secondary bg-white dark:bg-dark-bg-tertiary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-dark-text-secondary mb-1.5">
                Window (seconds)
              </label>
              <input
                type="number"
                value={config.rateLimitWindow}
                onChange={(e) => onUpdate({ rateLimitWindow: parseInt(e.target.value) || 60 })}
                min={1}
                max={3600}
                disabled={disabled}
                className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-dark-border-secondary bg-white dark:bg-dark-bg-tertiary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-dark-text-secondary mb-1.5">
                Timeout (ms)
              </label>
              <input
                type="number"
                value={config.timeout}
                onChange={(e) => onUpdate({ timeout: parseInt(e.target.value) || 30000 })}
                min={1000}
                max={600000}
                disabled={disabled}
                className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-dark-border-secondary bg-white dark:bg-dark-bg-tertiary"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={config.requiresApproval}
              onChange={(e) => onUpdate({ requiresApproval: e.target.checked })}
              disabled={disabled}
              className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            <span className="text-sm text-slate-600 dark:text-dark-text-secondary">
              Require approval before execution
            </span>
          </label>

          <KeyValueEditor
            label="Tool Parameters"
            value={config.parameters}
            onChange={(parameters) => onUpdate({ parameters })}
            keyPlaceholder="Parameter name"
            valuePlaceholder="Default value"
            disabled={disabled}
            hint="Default parameters passed to the tool"
          />
        </div>
      )}
    </div>
  );
}

// ============================================
// Tools Cluster Component
// ============================================

export function ToolsCluster({
  value,
  onChange,
  availableTools = DEFAULT_TOOLS,
  disabled = false,
  className,
}: ToolsClusterProps) {
  const addToolConfig = useCallback(() => {
    const newConfig: ToolConfig = {
      id: generateId(),
      name: '',
      enabled: true,
      requiresApproval: false,
      rateLimit: 10,
      rateLimitWindow: 60,
      timeout: 30000,
      parameters: [],
    };
    onChange({ ...value, toolConfigs: [...value.toolConfigs, newConfig] });
  }, [value, onChange]);

  const updateToolConfig = useCallback(
    (id: string, updates: Partial<ToolConfig>) => {
      onChange({
        ...value,
        toolConfigs: value.toolConfigs.map((config) =>
          config.id === id ? { ...config, ...updates } : config
        ),
      });
    },
    [value, onChange]
  );

  const removeToolConfig = useCallback(
    (id: string) => {
      onChange({
        ...value,
        toolConfigs: value.toolConfigs.filter((config) => config.id !== id),
      });
    },
    [value, onChange]
  );

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-500/20">
            <Wrench className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <CardTitle>Tools Configuration</CardTitle>
            <CardDescription>
              Configure allowed tools, restrictions, and tool-specific settings
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Allowed vs Forbidden Tools */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30">
            <div className="flex items-center gap-2 mb-3">
              <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h4 className="font-medium text-emerald-700 dark:text-emerald-400">
                Allowed Tools
              </h4>
            </div>
            <MultiSelect
              options={availableTools}
              value={value.allowedTools}
              onChange={(allowedTools) => onChange({ ...value, allowedTools })}
              disabled={disabled}
              placeholder="Select allowed tools..."
            />
          </div>

          <div className="p-4 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30">
            <div className="flex items-center gap-2 mb-3">
              <Ban className="w-5 h-5 text-red-600 dark:text-red-400" />
              <h4 className="font-medium text-red-700 dark:text-red-400">
                Forbidden Tools
              </h4>
            </div>
            <MultiSelect
              options={availableTools}
              value={value.forbiddenTools}
              onChange={(forbiddenTools) => onChange({ ...value, forbiddenTools })}
              disabled={disabled}
              placeholder="Select forbidden tools..."
            />
          </div>
        </div>

        {/* Approval Required */}
        <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <h4 className="font-medium text-amber-700 dark:text-amber-400">
              Require Approval For
            </h4>
          </div>
          <MultiSelect
            options={availableTools.filter((t) => !value.forbiddenTools.includes(t.value))}
            value={value.requireApprovalFor}
            onChange={(requireApprovalFor) => onChange({ ...value, requireApprovalFor })}
            disabled={disabled}
            placeholder="Select tools requiring approval..."
            hint="These tools will require human approval before execution"
          />
        </div>

        {/* Default Settings */}
        <div className="p-4 rounded-lg bg-slate-50 dark:bg-dark-bg-tertiary border border-slate-200 dark:border-dark-border-primary">
          <div className="flex items-center gap-2 mb-4">
            <Settings2 className="w-5 h-5 text-slate-500" />
            <h4 className="font-medium text-slate-900 dark:text-dark-text-primary">
              Default Settings
            </h4>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <SliderField
              label="Default Timeout"
              value={value.defaultTimeout}
              onChange={(defaultTimeout) => onChange({ ...value, defaultTimeout })}
              min={5000}
              max={300000}
              step={5000}
              valueFormatter={(v) => `${(v / 1000).toFixed(0)}s`}
              disabled={disabled}
            />
            <SliderField
              label="Default Rate Limit"
              value={value.defaultRateLimit}
              onChange={(defaultRateLimit) => onChange({ ...value, defaultRateLimit })}
              min={1}
              max={100}
              step={1}
              valueFormatter={(v) => `${v}/min`}
              disabled={disabled}
            />
          </div>

          <label className="flex items-center gap-2 mt-4 cursor-pointer">
            <input
              type="checkbox"
              checked={value.allowCustomTools}
              onChange={(e) => onChange({ ...value, allowCustomTools: e.target.checked })}
              disabled={disabled}
              className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            <span className="text-sm text-slate-600 dark:text-dark-text-secondary">
              Allow custom tools (MCP, plugins)
            </span>
          </label>
        </div>

        {/* Tool Configurations */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-slate-900 dark:text-dark-text-primary">
              Tool Configurations ({value.toolConfigs.length})
            </h4>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={addToolConfig}
              disabled={disabled}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Add Config
            </Button>
          </div>

          <div className="space-y-3">
            {value.toolConfigs.map((config) => (
              <ToolConfigItem
                key={config.id}
                config={config}
                onUpdate={(updates) => updateToolConfig(config.id, updates)}
                onRemove={() => removeToolConfig(config.id)}
                disabled={disabled}
              />
            ))}
          </div>

          {value.toolConfigs.length === 0 && (
            <div className="text-center py-8 border-2 border-dashed border-slate-200 dark:border-dark-border-primary rounded-lg">
              <Wrench className="w-10 h-10 text-slate-300 dark:text-dark-text-muted mx-auto mb-3" />
              <p className="text-sm text-slate-500 dark:text-dark-text-tertiary mb-3">
                No custom tool configurations
              </p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={addToolConfig}
                disabled={disabled}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Add Tool Config
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default ToolsCluster;
