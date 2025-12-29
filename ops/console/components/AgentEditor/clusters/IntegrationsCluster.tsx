/**
 * AgentOS Ops Console - Integrations Cluster
 * Configuration for external service integrations
 */

'use client';

import React, { useCallback, useState } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { KeyValueEditor, KeyValuePair } from '../fields/KeyValueEditor';
import {
  Plug,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  RefreshCw,
  ExternalLink,
  Key,
  Globe,
  Database,
  MessageSquare,
  GitBranch,
  Cloud,
  Zap,
} from 'lucide-react';

// ============================================
// Types
// ============================================

export type IntegrationType =
  | 'api'
  | 'database'
  | 'messaging'
  | 'vcs'
  | 'cloud'
  | 'monitoring'
  | 'custom';

export type AuthType = 'none' | 'api_key' | 'oauth2' | 'basic' | 'bearer' | 'custom';

export interface IntegrationConfig {
  id: string;
  name: string;
  type: IntegrationType;
  enabled: boolean;
  endpoint: string;
  authType: AuthType;
  credentials: KeyValuePair[];
  headers: KeyValuePair[];
  timeout: number;
  retries: number;
  healthCheckUrl?: string;
  lastHealthCheck?: string;
  status?: 'connected' | 'disconnected' | 'error' | 'unknown';
}

export interface IntegrationsClusterValue {
  integrations: IntegrationConfig[];
  globalTimeout: number;
  globalRetries: number;
  enableHealthChecks: boolean;
  healthCheckInterval: number;
}

interface IntegrationsClusterProps {
  value: IntegrationsClusterValue;
  onChange: (value: IntegrationsClusterValue) => void;
  disabled?: boolean;
  className?: string;
}

// ============================================
// Constants
// ============================================

const INTEGRATION_TYPES: { value: IntegrationType; label: string; icon: React.ElementType; color: string }[] = [
  { value: 'api', label: 'REST API', icon: Globe, color: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400' },
  { value: 'database', label: 'Database', icon: Database, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' },
  { value: 'messaging', label: 'Messaging', icon: MessageSquare, color: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400' },
  { value: 'vcs', label: 'Version Control', icon: GitBranch, color: 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400' },
  { value: 'cloud', label: 'Cloud Service', icon: Cloud, color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-400' },
  { value: 'monitoring', label: 'Monitoring', icon: Zap, color: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' },
  { value: 'custom', label: 'Custom', icon: Plug, color: 'bg-slate-100 text-slate-700 dark:bg-zinc-700 dark:text-zinc-300' },
];

const AUTH_TYPES: { value: AuthType; label: string }[] = [
  { value: 'none', label: 'No Auth' },
  { value: 'api_key', label: 'API Key' },
  { value: 'oauth2', label: 'OAuth 2.0' },
  { value: 'basic', label: 'Basic Auth' },
  { value: 'bearer', label: 'Bearer Token' },
  { value: 'custom', label: 'Custom' },
];

const PRESET_INTEGRATIONS = [
  { name: 'GitHub', type: 'vcs' as IntegrationType, endpoint: 'https://api.github.com', authType: 'bearer' as AuthType },
  { name: 'Slack', type: 'messaging' as IntegrationType, endpoint: 'https://slack.com/api', authType: 'bearer' as AuthType },
  { name: 'PostgreSQL', type: 'database' as IntegrationType, endpoint: 'postgresql://', authType: 'basic' as AuthType },
  { name: 'AWS', type: 'cloud' as IntegrationType, endpoint: 'https://aws.amazon.com', authType: 'api_key' as AuthType },
  { name: 'Datadog', type: 'monitoring' as IntegrationType, endpoint: 'https://api.datadoghq.com', authType: 'api_key' as AuthType },
];

// ============================================
// Helper Functions
// ============================================

function generateId(): string {
  return `int-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function getTypeConfig(type: IntegrationType) {
  return INTEGRATION_TYPES.find((t) => t.value === type) || INTEGRATION_TYPES[6];
}

function getStatusColor(status?: string): string {
  const colors: Record<string, string> = {
    connected: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
    disconnected: 'bg-slate-100 text-slate-700 dark:bg-zinc-700 dark:text-zinc-300',
    error: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400',
    unknown: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
  };
  return colors[status || 'unknown'] || colors.unknown;
}

// ============================================
// Integration Item Component
// ============================================

interface IntegrationItemProps {
  integration: IntegrationConfig;
  onUpdate: (updates: Partial<IntegrationConfig>) => void;
  onRemove: () => void;
  onTestConnection: () => void;
  disabled?: boolean;
}

function IntegrationItem({ integration, onUpdate, onRemove, onTestConnection, disabled }: IntegrationItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const typeConfig = getTypeConfig(integration.type);
  const TypeIcon = typeConfig.icon;

  return (
    <div
      className={cn(
        'border rounded-lg overflow-hidden',
        'border-slate-200 dark:border-dark-border-primary',
        'bg-white dark:bg-dark-bg-secondary',
        !integration.enabled && 'opacity-60',
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
            onUpdate({ enabled: !integration.enabled });
          }}
          disabled={disabled}
          className={cn(
            'w-10 h-6 rounded-full transition-colors relative',
            integration.enabled ? 'bg-brand-600' : 'bg-slate-300 dark:bg-dark-bg-elevated'
          )}
        >
          <span
            className={cn(
              'absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform',
              integration.enabled ? 'left-5' : 'left-1'
            )}
          />
        </button>

        <div className={cn('p-1.5 rounded-lg', typeConfig.color.split(' ')[0])}>
          <TypeIcon className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-900 dark:text-dark-text-primary">
              {integration.name || 'Unnamed Integration'}
            </span>
            <Badge size="sm" className={typeConfig.color}>
              {typeConfig.label}
            </Badge>
            <Badge size="sm" className={getStatusColor(integration.status)}>
              {integration.status || 'unknown'}
            </Badge>
          </div>
          <p className="text-sm text-slate-500 dark:text-dark-text-tertiary truncate">
            {integration.endpoint || 'No endpoint configured'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onTestConnection();
            }}
            disabled={disabled || !integration.endpoint}
            className="p-1.5 rounded hover:bg-blue-50 dark:hover:bg-blue-500/10 text-slate-400 hover:text-blue-500"
            title="Test Connection"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

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
              label="Integration Name"
              value={integration.name}
              onChange={(e) => onUpdate({ name: e.target.value })}
              placeholder="My Integration"
              disabled={disabled}
            />

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-dark-text-secondary mb-1.5">
                Type
              </label>
              <select
                value={integration.type}
                onChange={(e) => onUpdate({ type: e.target.value as IntegrationType })}
                disabled={disabled}
                className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-dark-border-secondary bg-white dark:bg-dark-bg-tertiary"
              >
                {INTEGRATION_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Input
            label="Endpoint URL"
            value={integration.endpoint}
            onChange={(e) => onUpdate({ endpoint: e.target.value })}
            placeholder="https://api.example.com"
            disabled={disabled}
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-dark-text-secondary mb-1.5">
                Authentication
              </label>
              <select
                value={integration.authType}
                onChange={(e) => onUpdate({ authType: e.target.value as AuthType })}
                disabled={disabled}
                className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-dark-border-secondary bg-white dark:bg-dark-bg-tertiary"
              >
                {AUTH_TYPES.map((auth) => (
                  <option key={auth.value} value={auth.value}>
                    {auth.label}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Health Check URL"
              value={integration.healthCheckUrl || ''}
              onChange={(e) => onUpdate({ healthCheckUrl: e.target.value })}
              placeholder="/health"
              disabled={disabled}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-dark-text-secondary mb-1.5">
                Timeout (ms)
              </label>
              <input
                type="number"
                value={integration.timeout}
                onChange={(e) => onUpdate({ timeout: parseInt(e.target.value) || 30000 })}
                min={1000}
                max={120000}
                disabled={disabled}
                className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-dark-border-secondary bg-white dark:bg-dark-bg-tertiary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-dark-text-secondary mb-1.5">
                Retries
              </label>
              <input
                type="number"
                value={integration.retries}
                onChange={(e) => onUpdate({ retries: parseInt(e.target.value) || 3 })}
                min={0}
                max={10}
                disabled={disabled}
                className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-dark-border-secondary bg-white dark:bg-dark-bg-tertiary"
              />
            </div>
          </div>

          {integration.authType !== 'none' && (
            <KeyValueEditor
              label="Credentials"
              value={integration.credentials}
              onChange={(credentials) => onUpdate({ credentials })}
              keyPlaceholder="Credential key"
              valuePlaceholder="Credential value"
              disabled={disabled}
              hint="Store sensitive credentials like API keys"
            />
          )}

          <KeyValueEditor
            label="Custom Headers"
            value={integration.headers}
            onChange={(headers) => onUpdate({ headers })}
            keyPlaceholder="Header name"
            valuePlaceholder="Header value"
            disabled={disabled}
          />
        </div>
      )}
    </div>
  );
}

// ============================================
// Integrations Cluster Component
// ============================================

export function IntegrationsCluster({
  value,
  onChange,
  disabled = false,
  className,
}: IntegrationsClusterProps) {
  const [showPresets, setShowPresets] = useState(false);

  const addIntegration = useCallback(
    (preset?: typeof PRESET_INTEGRATIONS[0]) => {
      const newIntegration: IntegrationConfig = {
        id: generateId(),
        name: preset?.name || '',
        type: preset?.type || 'api',
        enabled: true,
        endpoint: preset?.endpoint || '',
        authType: preset?.authType || 'none',
        credentials: [],
        headers: [],
        timeout: value.globalTimeout,
        retries: value.globalRetries,
        status: 'unknown',
      };
      onChange({ ...value, integrations: [...value.integrations, newIntegration] });
      setShowPresets(false);
    },
    [value, onChange]
  );

  const updateIntegration = useCallback(
    (id: string, updates: Partial<IntegrationConfig>) => {
      onChange({
        ...value,
        integrations: value.integrations.map((integration) =>
          integration.id === id ? { ...integration, ...updates } : integration
        ),
      });
    },
    [value, onChange]
  );

  const removeIntegration = useCallback(
    (id: string) => {
      onChange({
        ...value,
        integrations: value.integrations.filter((integration) => integration.id !== id),
      });
    },
    [value, onChange]
  );

  const testConnection = useCallback((id: string) => {
    // Simulate connection test
    updateIntegration(id, {
      status: 'connected',
      lastHealthCheck: new Date().toISOString()
    });
  }, [updateIntegration]);

  const connectedCount = value.integrations.filter((i) => i.status === 'connected').length;
  const enabledCount = value.integrations.filter((i) => i.enabled).length;

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-500/20">
            <Plug className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <CardTitle>Integrations</CardTitle>
            <CardDescription>
              Configure external service connections and APIs
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="flex items-center gap-6 p-3 rounded-lg bg-slate-50 dark:bg-dark-bg-tertiary">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-500" />
            <span className="text-sm">
              {connectedCount} connected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            <span className="text-sm">
              {enabledCount} enabled
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Plug className="w-4 h-4 text-slate-400" />
            <span className="text-sm">
              {value.integrations.length} total
            </span>
          </div>
        </div>

        {/* Global Settings */}
        <div className="p-4 rounded-lg bg-slate-50 dark:bg-dark-bg-tertiary border border-slate-200 dark:border-dark-border-primary">
          <h4 className="font-medium text-slate-900 dark:text-dark-text-primary mb-4">
            Global Settings
          </h4>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-dark-text-secondary mb-1.5">
                Default Timeout (ms)
              </label>
              <input
                type="number"
                value={value.globalTimeout}
                onChange={(e) => onChange({ ...value, globalTimeout: parseInt(e.target.value) || 30000 })}
                min={1000}
                max={120000}
                disabled={disabled}
                className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-dark-border-secondary bg-white dark:bg-dark-bg-secondary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-dark-text-secondary mb-1.5">
                Default Retries
              </label>
              <input
                type="number"
                value={value.globalRetries}
                onChange={(e) => onChange({ ...value, globalRetries: parseInt(e.target.value) || 3 })}
                min={0}
                max={10}
                disabled={disabled}
                className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-dark-border-secondary bg-white dark:bg-dark-bg-secondary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-dark-text-secondary mb-1.5">
                Health Check Interval (s)
              </label>
              <input
                type="number"
                value={value.healthCheckInterval}
                onChange={(e) => onChange({ ...value, healthCheckInterval: parseInt(e.target.value) || 60 })}
                min={10}
                max={3600}
                disabled={disabled}
                className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-dark-border-secondary bg-white dark:bg-dark-bg-secondary"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 mt-4 cursor-pointer">
            <input
              type="checkbox"
              checked={value.enableHealthChecks}
              onChange={(e) => onChange({ ...value, enableHealthChecks: e.target.checked })}
              disabled={disabled}
              className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            <span className="text-sm text-slate-600 dark:text-dark-text-secondary">
              Enable automatic health checks
            </span>
          </label>
        </div>

        {/* Add Integration */}
        <div className="relative">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => addIntegration()}
              disabled={disabled}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Add Custom
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowPresets(!showPresets)}
              disabled={disabled}
            >
              Use Preset
              <ChevronDown className={cn('w-4 h-4 ml-1 transition-transform', showPresets && 'rotate-180')} />
            </Button>
          </div>

          {/* Presets Dropdown */}
          {showPresets && (
            <div className="absolute z-10 mt-2 w-64 rounded-lg border border-slate-200 dark:border-dark-border-primary bg-white dark:bg-dark-bg-secondary shadow-lg">
              {PRESET_INTEGRATIONS.map((preset) => {
                const typeConfig = getTypeConfig(preset.type);
                const TypeIcon = typeConfig.icon;
                return (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => addIntegration(preset)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-dark-bg-tertiary text-left"
                  >
                    <TypeIcon className={cn('w-5 h-5', typeConfig.color.split(' ').slice(1).join(' '))} />
                    <div>
                      <div className="font-medium text-slate-900 dark:text-dark-text-primary">
                        {preset.name}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-dark-text-tertiary">
                        {typeConfig.label}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Integrations List */}
        <div className="space-y-3">
          {value.integrations.map((integration) => (
            <IntegrationItem
              key={integration.id}
              integration={integration}
              onUpdate={(updates) => updateIntegration(integration.id, updates)}
              onRemove={() => removeIntegration(integration.id)}
              onTestConnection={() => testConnection(integration.id)}
              disabled={disabled}
            />
          ))}
        </div>

        {/* Empty State */}
        {value.integrations.length === 0 && (
          <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-dark-border-primary rounded-lg">
            <Plug className="w-12 h-12 text-slate-300 dark:text-dark-text-muted mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 dark:text-dark-text-primary mb-2">
              No Integrations Configured
            </h3>
            <p className="text-sm text-slate-500 dark:text-dark-text-tertiary mb-4">
              Connect external services to extend agent capabilities
            </p>
            <div className="flex justify-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => addIntegration()}
                disabled={disabled}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Add Integration
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default IntegrationsCluster;
