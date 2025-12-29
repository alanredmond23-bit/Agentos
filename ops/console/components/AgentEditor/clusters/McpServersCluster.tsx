/**
 * AgentOS Ops Console - MCP Servers Cluster
 * Configuration cluster for MCP (Model Context Protocol) server settings
 */

'use client';

import React, { useCallback } from 'react';
import { cn } from '@/lib/utils';
// Card components unused after collapsible refactor
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { KeyValueEditor, KeyValuePair } from '../fields/KeyValueEditor';
import {
  Server,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Play,
  Square,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Loader2,
} from 'lucide-react';

// ============================================
// Types
// ============================================

export type McpServerStatus = 'connected' | 'disconnected' | 'connecting' | 'error';

export interface McpServerConfig {
  id: string;
  name: string;
  command: string;
  args: string[];
  env: KeyValuePair[];
  status: McpServerStatus;
  enabled: boolean;
  timeout: number;
  retryCount: number;
  lastError?: string;
}

export interface McpServersClusterProps {
  value: McpServerConfig[];
  onChange: (value: McpServerConfig[]) => void;
  onTestConnection?: (serverId: string) => Promise<boolean>;
  isExpanded?: boolean;
  onToggle?: () => void;
  disabled?: boolean;
  className?: string;
}

export type McpEnvVar = KeyValuePair;

// ============================================
// Helper Functions
// ============================================

function generateId(): string {
  return `mcp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function getStatusColor(status: McpServerStatus): { bg: string; text: string; dot: string } {
  const colors = {
    connected: { bg: 'bg-emerald-100 dark:bg-emerald-500/20', text: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500' },
    disconnected: { bg: 'bg-slate-100 dark:bg-zinc-700', text: 'text-slate-600 dark:text-zinc-300', dot: 'bg-slate-400' },
    connecting: { bg: 'bg-blue-100 dark:bg-blue-500/20', text: 'text-blue-700 dark:text-blue-400', dot: 'bg-blue-500' },
    error: { bg: 'bg-red-100 dark:bg-red-500/20', text: 'text-red-700 dark:text-red-400', dot: 'bg-red-500' },
  };
  return colors[status];
}

// ============================================
// MCP Server Item Component
// ============================================

interface McpServerItemProps {
  server: McpServerConfig;
  onUpdate: (updates: Partial<McpServerConfig>) => void;
  onRemove: () => void;
  onTestConnection?: () => Promise<boolean>;
  disabled?: boolean;
}

function McpServerItem({
  server,
  onUpdate,
  onRemove,
  onTestConnection,
  disabled = false,
}: McpServerItemProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [isTesting, setIsTesting] = React.useState(false);
  const statusColors = getStatusColor(server.status);

  const handleTestConnection = async () => {
    if (!onTestConnection) return;
    setIsTesting(true);
    try {
      const success = await onTestConnection();
      onUpdate({ status: success ? 'connected' : 'error' });
    } catch (err) {
      onUpdate({ status: 'error', lastError: String(err) });
    } finally {
      setIsTesting(false);
    }
  };

  const handleAddArg = () => {
    onUpdate({ args: [...server.args, ''] });
  };

  const handleUpdateArg = (index: number, value: string) => {
    const newArgs = [...server.args];
    newArgs[index] = value;
    onUpdate({ args: newArgs });
  };

  const handleRemoveArg = (index: number) => {
    onUpdate({ args: server.args.filter((_, i) => i !== index) });
  };

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
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onUpdate({ enabled: !server.enabled });
          }}
          disabled={disabled}
          className={cn(
            'w-10 h-6 rounded-full transition-colors relative',
            server.enabled ? 'bg-brand-600' : 'bg-slate-300 dark:bg-dark-bg-elevated'
          )}
        >
          <span
            className={cn(
              'absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform',
              server.enabled ? 'left-5' : 'left-1'
            )}
          />
        </button>

        <Server className="w-5 h-5 text-slate-400" />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-900 dark:text-dark-text-primary truncate">
              {server.name || 'Unnamed Server'}
            </span>
            <Badge
              size="sm"
              className={cn(statusColors.bg, statusColors.text)}
              dot
              dotColor={statusColors.dot}
            >
              {server.status}
            </Badge>
          </div>
          <p className="text-sm text-slate-500 dark:text-dark-text-tertiary font-mono truncate">
            {server.command}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isTesting ? (
            <Loader2 className="w-4 h-4 animate-spin text-brand-500" />
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleTestConnection();
              }}
              disabled={disabled}
              className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-dark-bg-tertiary text-slate-400 hover:text-slate-600"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}

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
          {/* Error Display */}
          {server.status === 'error' && server.lastError && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 mt-0.5" />
                <p className="text-sm text-red-700 dark:text-red-400">{server.lastError}</p>
              </div>
            </div>
          )}

          {/* Basic Settings */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Server Name"
              value={server.name}
              onChange={(e) => onUpdate({ name: e.target.value })}
              placeholder="e.g., github-mcp"
              disabled={disabled}
            />
            <Input
              label="Command"
              value={server.command}
              onChange={(e) => onUpdate({ command: e.target.value })}
              placeholder="e.g., npx -y @modelcontextprotocol/server-github"
              disabled={disabled}
            />
          </div>

          {/* Arguments */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-700 dark:text-dark-text-secondary">
                Arguments
              </label>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={handleAddArg}
                disabled={disabled}
                leftIcon={<Plus className="w-3 h-3" />}
              >
                Add
              </Button>
            </div>
            <div className="space-y-2">
              {server.args.map((arg, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={arg}
                    onChange={(e) => handleUpdateArg(index, e.target.value)}
                    placeholder={`Argument ${index + 1}`}
                    disabled={disabled}
                    className="flex-1 px-3 py-2 text-sm font-mono rounded-md border border-slate-300 dark:border-dark-border-secondary bg-white dark:bg-dark-bg-tertiary"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveArg(index)}
                    disabled={disabled}
                    className="p-2 rounded hover:bg-red-50 dark:hover:bg-red-500/10 text-slate-400 hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {server.args.length === 0 && (
                <p className="text-sm text-slate-400 dark:text-dark-text-muted italic">
                  No arguments configured
                </p>
              )}
            </div>
          </div>

          {/* Environment Variables */}
          <KeyValueEditor
            label="Environment Variables"
            value={server.env}
            onChange={(env) => onUpdate({ env })}
            keyPlaceholder="Variable name"
            valuePlaceholder="Value"
            disabled={disabled}
            hint="These variables will be passed to the MCP server process"
          />

          {/* Advanced Settings */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-dark-text-secondary mb-1.5">
                Connection Timeout (ms)
              </label>
              <input
                type="number"
                value={server.timeout}
                onChange={(e) => onUpdate({ timeout: parseInt(e.target.value) || 30000 })}
                min={1000}
                max={300000}
                disabled={disabled}
                className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-dark-border-secondary bg-white dark:bg-dark-bg-tertiary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-dark-text-secondary mb-1.5">
                Retry Count
              </label>
              <input
                type="number"
                value={server.retryCount}
                onChange={(e) => onUpdate({ retryCount: parseInt(e.target.value) || 3 })}
                min={0}
                max={10}
                disabled={disabled}
                className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-dark-border-secondary bg-white dark:bg-dark-bg-tertiary"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// MCP Servers Cluster Component
// ============================================

export function McpServersCluster({
  value,
  onChange,
  onTestConnection,
  isExpanded: controlledExpanded = true,
  onToggle,
  disabled = false,
  className,
}: McpServersClusterProps) {
  const [localExpanded, setLocalExpanded] = React.useState(true);
  const isExpanded = onToggle ? controlledExpanded : localExpanded;
  const handleToggle = onToggle || (() => setLocalExpanded(!localExpanded));

  const addServer = useCallback(() => {
    const newServer: McpServerConfig = {
      id: generateId(),
      name: '',
      command: '',
      args: [],
      env: [],
      status: 'disconnected',
      enabled: true,
      timeout: 30000,
      retryCount: 3,
    };
    onChange([...value, newServer]);
  }, [value, onChange]);

  const updateServer = useCallback(
    (id: string, updates: Partial<McpServerConfig>) => {
      onChange(
        value.map((server) =>
          server.id === id ? { ...server, ...updates } : server
        )
      );
    },
    [value, onChange]
  );

  const removeServer = useCallback(
    (id: string) => {
      onChange(value.filter((server) => server.id !== id));
    },
    [value, onChange]
  );

  const connectedCount = value.filter((s) => s.status === 'connected').length;
  const enabledCount = value.filter((s) => s.enabled).length;

  return (
    <div className={cn('border border-slate-200 dark:border-dark-border-primary rounded-lg overflow-hidden', className)}>
      {/* Cluster Header */}
      <button
        type="button"
        onClick={handleToggle}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-dark-bg-tertiary hover:bg-slate-100 dark:hover:bg-dark-bg-elevated transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-500/20">
            <Server className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-dark-text-primary">
              MCP Servers
            </h3>
            <p className="text-xs text-slate-500 dark:text-dark-text-tertiary">
              Model Context Protocol server connections ({value.length} configured)
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
        <div className="px-4 py-4 bg-white dark:bg-dark-bg-secondary">
          {/* Action Button */}
          <div className="flex justify-end mb-4">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={addServer}
              disabled={disabled}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Add Server
            </Button>
          </div>
        {/* Summary */}
        <div className="flex items-center gap-4 mb-4 p-3 rounded-lg bg-slate-50 dark:bg-dark-bg-tertiary">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            <span className="text-sm text-slate-600 dark:text-dark-text-secondary">
              {connectedCount} connected
            </span>
          </div>
          <div className="w-px h-4 bg-slate-200 dark:bg-dark-border-primary" />
          <div className="flex items-center gap-2">
            <Play className="w-4 h-4 text-blue-500" />
            <span className="text-sm text-slate-600 dark:text-dark-text-secondary">
              {enabledCount} enabled
            </span>
          </div>
          <div className="w-px h-4 bg-slate-200 dark:bg-dark-border-primary" />
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-slate-400" />
            <span className="text-sm text-slate-600 dark:text-dark-text-secondary">
              {value.length} total
            </span>
          </div>
        </div>

        {/* Server List */}
        <div className="space-y-3">
          {value.map((server) => (
            <McpServerItem
              key={server.id}
              server={server}
              onUpdate={(updates) => updateServer(server.id, updates)}
              onRemove={() => removeServer(server.id)}
              onTestConnection={
                onTestConnection ? () => onTestConnection(server.id) : undefined
              }
              disabled={disabled}
            />
          ))}
        </div>

        {/* Empty State */}
        {value.length === 0 && (
          <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-dark-border-primary rounded-lg">
            <Server className="w-12 h-12 text-slate-300 dark:text-dark-text-muted mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 dark:text-dark-text-primary mb-2">
              No MCP Servers
            </h3>
            <p className="text-sm text-slate-500 dark:text-dark-text-tertiary mb-4">
              Add MCP servers to extend agent capabilities
            </p>
            <Button
              type="button"
              variant="primary"
              onClick={addServer}
              disabled={disabled}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Add First Server
            </Button>
          </div>
        )}
        </div>
      )}
    </div>
  );
}

export default McpServersCluster;
