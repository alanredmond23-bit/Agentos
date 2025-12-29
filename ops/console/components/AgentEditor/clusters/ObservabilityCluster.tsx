/**
 * AgentOS Ops Console - Observability Cluster
 * Configuration for logging, metrics, and alerts
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { SliderField } from '../fields/SliderField';
import { MultiSelect, MultiSelectOption } from '../fields/MultiSelect';
import { KeyValueEditor, KeyValuePair } from '../fields/KeyValueEditor';
import { ArrayField, ArrayItem } from '../fields/ArrayField';
import {
  Activity,
  Bell,
  Database,
  Eye,
  LineChart,
  MessageSquare,
  Mail,
  Webhook,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
} from 'lucide-react';

// ============================================
// Types
// ============================================

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';
export type NotificationChannel = 'email' | 'slack' | 'webhook' | 'pagerduty';

export interface LoggingConfig {
  enabled: boolean;
  level: LogLevel;
  includeInputs: boolean;
  includeOutputs: boolean;
  includeMetadata: boolean;
  redactSensitive: boolean;
  retentionDays: number;
  destinations: string[];
}

export interface MetricsConfig {
  enabled: boolean;
  collectLatency: boolean;
  collectTokens: boolean;
  collectCosts: boolean;
  collectErrors: boolean;
  sampleRate: number;
  customMetrics: KeyValuePair[];
}

export interface AlertRule {
  id: string;
  name: string;
  enabled: boolean;
  condition: string;
  threshold: number;
  severity: AlertSeverity;
  channels: NotificationChannel[];
  cooldownMinutes: number;
}

export interface AlertsConfig {
  enabled: boolean;
  rules: AlertRule[];
  defaultChannels: NotificationChannel[];
  escalationPolicy: string;
}

export interface ObservabilityClusterValue {
  logging: LoggingConfig;
  metrics: MetricsConfig;
  alerts: AlertsConfig;
}

interface ObservabilityClusterProps {
  value: ObservabilityClusterValue;
  onChange: (value: ObservabilityClusterValue) => void;
  disabled?: boolean;
  className?: string;
}

// ============================================
// Constants
// ============================================

const LOG_LEVELS: { value: LogLevel; label: string; color: string }[] = [
  { value: 'debug', label: 'Debug', color: 'bg-slate-100 text-slate-700 dark:bg-zinc-700 dark:text-zinc-300' },
  { value: 'info', label: 'Info', color: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400' },
  { value: 'warn', label: 'Warning', color: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' },
  { value: 'error', label: 'Error', color: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400' },
];

const LOG_DESTINATIONS: MultiSelectOption[] = [
  { value: 'console', label: 'Console', description: 'Standard output' },
  { value: 'file', label: 'File', description: 'Local log files' },
  { value: 'elasticsearch', label: 'Elasticsearch', description: 'ELK Stack' },
  { value: 'datadog', label: 'Datadog', description: 'Datadog Logs' },
  { value: 'cloudwatch', label: 'CloudWatch', description: 'AWS CloudWatch' },
  { value: 'loki', label: 'Loki', description: 'Grafana Loki' },
];

const NOTIFICATION_CHANNELS: MultiSelectOption[] = [
  { value: 'email', label: 'Email' },
  { value: 'slack', label: 'Slack' },
  { value: 'webhook', label: 'Webhook' },
  { value: 'pagerduty', label: 'PagerDuty' },
];

const ALERT_CONDITIONS: { value: string; label: string }[] = [
  { value: 'error_rate', label: 'Error Rate' },
  { value: 'latency_p99', label: 'P99 Latency' },
  { value: 'latency_avg', label: 'Average Latency' },
  { value: 'token_usage', label: 'Token Usage' },
  { value: 'cost_per_hour', label: 'Cost per Hour' },
  { value: 'requests_per_minute', label: 'Requests per Minute' },
  { value: 'consecutive_errors', label: 'Consecutive Errors' },
  { value: 'memory_usage', label: 'Memory Usage' },
];

// ============================================
// Helper Functions
// ============================================

function generateId(): string {
  return `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function getSeverityColor(severity: AlertSeverity): string {
  const colors = {
    info: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
    warning: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
    error: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400',
    critical: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400',
  };
  return colors[severity];
}

function getSeverityIcon(severity: AlertSeverity) {
  switch (severity) {
    case 'info':
      return <Info className="w-4 h-4" />;
    case 'warning':
      return <AlertTriangle className="w-4 h-4" />;
    case 'error':
      return <XCircle className="w-4 h-4" />;
    case 'critical':
      return <AlertTriangle className="w-4 h-4" />;
  }
}

// ============================================
// Observability Cluster Component
// ============================================

export function ObservabilityCluster({
  value,
  onChange,
  disabled = false,
  className,
}: ObservabilityClusterProps) {
  const updateLogging = (updates: Partial<LoggingConfig>) => {
    onChange({ ...value, logging: { ...value.logging, ...updates } });
  };

  const updateMetrics = (updates: Partial<MetricsConfig>) => {
    onChange({ ...value, metrics: { ...value.metrics, ...updates } });
  };

  const updateAlerts = (updates: Partial<AlertsConfig>) => {
    onChange({ ...value, alerts: { ...value.alerts, ...updates } });
  };

  const addAlertRule = () => {
    const newRule: AlertRule = {
      id: generateId(),
      name: '',
      enabled: true,
      condition: 'error_rate',
      threshold: 5,
      severity: 'warning',
      channels: value.alerts.defaultChannels,
      cooldownMinutes: 15,
    };
    updateAlerts({ rules: [...value.alerts.rules, newRule] });
  };

  const updateAlertRule = (id: string, updates: Partial<AlertRule>) => {
    updateAlerts({
      rules: value.alerts.rules.map((rule) =>
        rule.id === id ? { ...rule, ...updates } : rule
      ),
    });
  };

  const removeAlertRule = (id: string) => {
    updateAlerts({ rules: value.alerts.rules.filter((rule) => rule.id !== id) });
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-100 dark:bg-cyan-500/20">
            <Activity className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
          </div>
          <div>
            <CardTitle>Observability</CardTitle>
            <CardDescription>
              Configure logging, metrics collection, and alerting
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Logging */}
        <div className="p-4 rounded-lg bg-slate-50 dark:bg-dark-bg-tertiary border border-slate-200 dark:border-dark-border-primary">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-slate-500" />
              <h4 className="font-medium text-slate-900 dark:text-dark-text-primary">
                Logging
              </h4>
            </div>
            <button
              type="button"
              onClick={() => updateLogging({ enabled: !value.logging.enabled })}
              disabled={disabled}
              className={cn(
                'w-12 h-7 rounded-full transition-colors relative',
                value.logging.enabled ? 'bg-brand-600' : 'bg-slate-300 dark:bg-dark-bg-elevated'
              )}
            >
              <span
                className={cn(
                  'absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform',
                  value.logging.enabled ? 'left-6' : 'left-1'
                )}
              />
            </button>
          </div>

          {value.logging.enabled && (
            <div className="space-y-4">
              {/* Log Level */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-dark-text-secondary mb-2">
                  Log Level
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {LOG_LEVELS.map((level) => (
                    <button
                      key={level.value}
                      type="button"
                      onClick={() => updateLogging({ level: level.value })}
                      disabled={disabled}
                      className={cn(
                        'px-3 py-2 text-sm rounded-lg border transition-colors',
                        value.logging.level === level.value
                          ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10'
                          : 'border-slate-200 dark:border-dark-border-secondary'
                      )}
                    >
                      <Badge size="sm" className={level.color}>
                        {level.label}
                      </Badge>
                    </button>
                  ))}
                </div>
              </div>

              {/* Log Options */}
              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 dark:border-dark-border-secondary cursor-pointer hover:bg-white dark:hover:bg-dark-bg-secondary">
                  <input
                    type="checkbox"
                    checked={value.logging.includeInputs}
                    onChange={(e) => updateLogging({ includeInputs: e.target.checked })}
                    disabled={disabled}
                    className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span className="text-sm">Log Inputs</span>
                </label>

                <label className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 dark:border-dark-border-secondary cursor-pointer hover:bg-white dark:hover:bg-dark-bg-secondary">
                  <input
                    type="checkbox"
                    checked={value.logging.includeOutputs}
                    onChange={(e) => updateLogging({ includeOutputs: e.target.checked })}
                    disabled={disabled}
                    className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span className="text-sm">Log Outputs</span>
                </label>

                <label className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 dark:border-dark-border-secondary cursor-pointer hover:bg-white dark:hover:bg-dark-bg-secondary">
                  <input
                    type="checkbox"
                    checked={value.logging.includeMetadata}
                    onChange={(e) => updateLogging({ includeMetadata: e.target.checked })}
                    disabled={disabled}
                    className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span className="text-sm">Include Metadata</span>
                </label>

                <label className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 dark:border-dark-border-secondary cursor-pointer hover:bg-white dark:hover:bg-dark-bg-secondary">
                  <input
                    type="checkbox"
                    checked={value.logging.redactSensitive}
                    onChange={(e) => updateLogging({ redactSensitive: e.target.checked })}
                    disabled={disabled}
                    className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span className="text-sm">Redact Sensitive</span>
                </label>
              </div>

              <SliderField
                label="Retention Period"
                value={value.logging.retentionDays}
                onChange={(retentionDays) => updateLogging({ retentionDays })}
                min={1}
                max={365}
                step={1}
                valueFormatter={(v) => `${v} days`}
                marks={[
                  { value: 7, label: '7d' },
                  { value: 30, label: '30d' },
                  { value: 90, label: '90d' },
                  { value: 365, label: '1y' },
                ]}
                disabled={disabled}
              />

              <MultiSelect
                label="Log Destinations"
                options={LOG_DESTINATIONS}
                value={value.logging.destinations}
                onChange={(destinations) => updateLogging({ destinations })}
                disabled={disabled}
                placeholder="Select destinations..."
              />
            </div>
          )}
        </div>

        {/* Metrics */}
        <div className="p-4 rounded-lg bg-slate-50 dark:bg-dark-bg-tertiary border border-slate-200 dark:border-dark-border-primary">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <LineChart className="w-5 h-5 text-slate-500" />
              <h4 className="font-medium text-slate-900 dark:text-dark-text-primary">
                Metrics
              </h4>
            </div>
            <button
              type="button"
              onClick={() => updateMetrics({ enabled: !value.metrics.enabled })}
              disabled={disabled}
              className={cn(
                'w-12 h-7 rounded-full transition-colors relative',
                value.metrics.enabled ? 'bg-brand-600' : 'bg-slate-300 dark:bg-dark-bg-elevated'
              )}
            >
              <span
                className={cn(
                  'absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform',
                  value.metrics.enabled ? 'left-6' : 'left-1'
                )}
              />
            </button>
          </div>

          {value.metrics.enabled && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 dark:border-dark-border-secondary cursor-pointer hover:bg-white dark:hover:bg-dark-bg-secondary">
                  <input
                    type="checkbox"
                    checked={value.metrics.collectLatency}
                    onChange={(e) => updateMetrics({ collectLatency: e.target.checked })}
                    disabled={disabled}
                    className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span className="text-sm">Collect Latency</span>
                </label>

                <label className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 dark:border-dark-border-secondary cursor-pointer hover:bg-white dark:hover:bg-dark-bg-secondary">
                  <input
                    type="checkbox"
                    checked={value.metrics.collectTokens}
                    onChange={(e) => updateMetrics({ collectTokens: e.target.checked })}
                    disabled={disabled}
                    className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span className="text-sm">Collect Tokens</span>
                </label>

                <label className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 dark:border-dark-border-secondary cursor-pointer hover:bg-white dark:hover:bg-dark-bg-secondary">
                  <input
                    type="checkbox"
                    checked={value.metrics.collectCosts}
                    onChange={(e) => updateMetrics({ collectCosts: e.target.checked })}
                    disabled={disabled}
                    className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span className="text-sm">Collect Costs</span>
                </label>

                <label className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 dark:border-dark-border-secondary cursor-pointer hover:bg-white dark:hover:bg-dark-bg-secondary">
                  <input
                    type="checkbox"
                    checked={value.metrics.collectErrors}
                    onChange={(e) => updateMetrics({ collectErrors: e.target.checked })}
                    disabled={disabled}
                    className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span className="text-sm">Collect Errors</span>
                </label>
              </div>

              <SliderField
                label="Sample Rate"
                value={value.metrics.sampleRate}
                onChange={(sampleRate) => updateMetrics({ sampleRate })}
                min={1}
                max={100}
                step={1}
                valueFormatter={(v) => `${v}%`}
                disabled={disabled}
              />

              <KeyValueEditor
                label="Custom Metrics"
                value={value.metrics.customMetrics}
                onChange={(customMetrics) => updateMetrics({ customMetrics })}
                keyPlaceholder="Metric name"
                valuePlaceholder="Query/expression"
                disabled={disabled}
              />
            </div>
          )}
        </div>

        {/* Alerts */}
        <div className="p-4 rounded-lg bg-slate-50 dark:bg-dark-bg-tertiary border border-slate-200 dark:border-dark-border-primary">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-slate-500" />
              <h4 className="font-medium text-slate-900 dark:text-dark-text-primary">
                Alerts
              </h4>
            </div>
            <button
              type="button"
              onClick={() => updateAlerts({ enabled: !value.alerts.enabled })}
              disabled={disabled}
              className={cn(
                'w-12 h-7 rounded-full transition-colors relative',
                value.alerts.enabled ? 'bg-brand-600' : 'bg-slate-300 dark:bg-dark-bg-elevated'
              )}
            >
              <span
                className={cn(
                  'absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform',
                  value.alerts.enabled ? 'left-6' : 'left-1'
                )}
              />
            </button>
          </div>

          {value.alerts.enabled && (
            <div className="space-y-4">
              <MultiSelect
                label="Default Notification Channels"
                options={NOTIFICATION_CHANNELS}
                value={value.alerts.defaultChannels}
                onChange={(defaultChannels) =>
                  updateAlerts({ defaultChannels: defaultChannels as NotificationChannel[] })
                }
                disabled={disabled}
                placeholder="Select channels..."
              />

              {/* Alert Rules */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-slate-700 dark:text-dark-text-secondary">
                    Alert Rules ({value.alerts.rules.length})
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={addAlertRule}
                    disabled={disabled}
                  >
                    Add Rule
                  </Button>
                </div>

                <div className="space-y-3">
                  {value.alerts.rules.map((rule) => (
                    <div
                      key={rule.id}
                      className={cn(
                        'p-3 rounded-lg border',
                        'border-slate-200 dark:border-dark-border-secondary',
                        'bg-white dark:bg-dark-bg-secondary',
                        !rule.enabled && 'opacity-60'
                      )}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <button
                          type="button"
                          onClick={() => updateAlertRule(rule.id, { enabled: !rule.enabled })}
                          disabled={disabled}
                          className={cn(
                            'w-8 h-5 rounded-full transition-colors relative',
                            rule.enabled ? 'bg-brand-600' : 'bg-slate-300'
                          )}
                        >
                          <span
                            className={cn(
                              'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform',
                              rule.enabled ? 'left-3.5' : 'left-0.5'
                            )}
                          />
                        </button>

                        <input
                          type="text"
                          value={rule.name}
                          onChange={(e) => updateAlertRule(rule.id, { name: e.target.value })}
                          placeholder="Rule name"
                          disabled={disabled}
                          className="flex-1 px-2 py-1 text-sm rounded border border-slate-200 dark:border-dark-border-secondary"
                        />

                        <Badge size="sm" className={getSeverityColor(rule.severity)}>
                          {getSeverityIcon(rule.severity)}
                          <span className="ml-1">{rule.severity}</span>
                        </Badge>

                        <button
                          type="button"
                          onClick={() => removeAlertRule(rule.id)}
                          disabled={disabled}
                          className="p-1 rounded text-slate-400 hover:text-red-500"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-4 gap-2">
                        <select
                          value={rule.condition}
                          onChange={(e) => updateAlertRule(rule.id, { condition: e.target.value })}
                          disabled={disabled}
                          className="px-2 py-1 text-sm rounded border border-slate-200 dark:border-dark-border-secondary"
                        >
                          {ALERT_CONDITIONS.map((c) => (
                            <option key={c.value} value={c.value}>
                              {c.label}
                            </option>
                          ))}
                        </select>

                        <input
                          type="number"
                          value={rule.threshold}
                          onChange={(e) =>
                            updateAlertRule(rule.id, { threshold: parseFloat(e.target.value) || 0 })
                          }
                          placeholder="Threshold"
                          disabled={disabled}
                          className="px-2 py-1 text-sm rounded border border-slate-200 dark:border-dark-border-secondary"
                        />

                        <select
                          value={rule.severity}
                          onChange={(e) =>
                            updateAlertRule(rule.id, { severity: e.target.value as AlertSeverity })
                          }
                          disabled={disabled}
                          className="px-2 py-1 text-sm rounded border border-slate-200 dark:border-dark-border-secondary"
                        >
                          <option value="info">Info</option>
                          <option value="warning">Warning</option>
                          <option value="error">Error</option>
                          <option value="critical">Critical</option>
                        </select>

                        <input
                          type="number"
                          value={rule.cooldownMinutes}
                          onChange={(e) =>
                            updateAlertRule(rule.id, { cooldownMinutes: parseInt(e.target.value) || 0 })
                          }
                          placeholder="Cooldown (min)"
                          disabled={disabled}
                          className="px-2 py-1 text-sm rounded border border-slate-200 dark:border-dark-border-secondary"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {value.alerts.rules.length === 0 && (
                  <div className="text-center py-6 border-2 border-dashed border-slate-200 dark:border-dark-border-primary rounded-lg">
                    <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">No alert rules configured</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default ObservabilityCluster;
