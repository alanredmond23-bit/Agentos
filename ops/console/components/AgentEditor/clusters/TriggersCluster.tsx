/**
 * AgentOS Ops Console - Triggers Cluster
 * Configuration for schedules, webhooks, and event triggers
 */

'use client';

import React, { useCallback, useState } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { CronField } from '../fields/CronField';
import { KeyValueEditor, KeyValuePair } from '../fields/KeyValueEditor';
import { MultiSelect, MultiSelectOption } from '../fields/MultiSelect';
import {
  Zap,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Clock,
  Webhook,
  Bell,
  Play,
  Pause,
  Calendar,
  Globe,
  GitBranch,
} from 'lucide-react';

// ============================================
// Types
// ============================================

export type TriggerType = 'schedule' | 'webhook' | 'event';
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface ScheduleTrigger {
  id: string;
  type: 'schedule';
  name: string;
  enabled: boolean;
  cron: string;
  timezone: string;
  payload: KeyValuePair[];
}

export interface WebhookTrigger {
  id: string;
  type: 'webhook';
  name: string;
  enabled: boolean;
  endpoint: string;
  secret: string;
  allowedMethods: HttpMethod[];
  headers: KeyValuePair[];
}

export interface EventTrigger {
  id: string;
  type: 'event';
  name: string;
  enabled: boolean;
  eventTypes: string[];
  filters: KeyValuePair[];
  debounceMs: number;
}

export type Trigger = ScheduleTrigger | WebhookTrigger | EventTrigger;

export interface TriggersClusterValue {
  triggers: Trigger[];
  globalEnabled: boolean;
  maxConcurrentTriggers: number;
}

interface TriggersClusterProps {
  value: TriggersClusterValue;
  onChange: (value: TriggersClusterValue) => void;
  disabled?: boolean;
  className?: string;
}

// ============================================
// Constants
// ============================================

const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Los_Angeles',
  'America/Chicago',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Australia/Sydney',
];

const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

const EVENT_TYPES: MultiSelectOption[] = [
  { value: 'agent.started', label: 'Agent Started', group: 'Agent' },
  { value: 'agent.stopped', label: 'Agent Stopped', group: 'Agent' },
  { value: 'agent.error', label: 'Agent Error', group: 'Agent' },
  { value: 'task.created', label: 'Task Created', group: 'Task' },
  { value: 'task.completed', label: 'Task Completed', group: 'Task' },
  { value: 'task.failed', label: 'Task Failed', group: 'Task' },
  { value: 'file.created', label: 'File Created', group: 'File' },
  { value: 'file.modified', label: 'File Modified', group: 'File' },
  { value: 'file.deleted', label: 'File Deleted', group: 'File' },
  { value: 'git.push', label: 'Git Push', group: 'Git' },
  { value: 'git.pull_request', label: 'Pull Request', group: 'Git' },
  { value: 'git.merge', label: 'Git Merge', group: 'Git' },
];

// ============================================
// Helper Functions
// ============================================

function generateId(): string {
  return `trigger-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function getTriggerIcon(type: TriggerType) {
  switch (type) {
    case 'schedule':
      return <Clock className="w-5 h-5" />;
    case 'webhook':
      return <Webhook className="w-5 h-5" />;
    case 'event':
      return <Bell className="w-5 h-5" />;
  }
}

function getTriggerColor(type: TriggerType) {
  switch (type) {
    case 'schedule':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400';
    case 'webhook':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400';
    case 'event':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400';
  }
}

// ============================================
// Trigger Item Component
// ============================================

interface TriggerItemProps {
  trigger: Trigger;
  onUpdate: (updates: Partial<Trigger>) => void;
  onRemove: () => void;
  disabled?: boolean;
}

function TriggerItem({ trigger, onUpdate, onRemove, disabled }: TriggerItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const renderTriggerConfig = () => {
    switch (trigger.type) {
      case 'schedule':
        return (
          <div className="space-y-4">
            <CronField
              label="Schedule"
              value={trigger.cron}
              onChange={(cron) => onUpdate({ cron })}
              disabled={disabled}
            />

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-dark-text-secondary mb-1.5">
                Timezone
              </label>
              <select
                value={trigger.timezone}
                onChange={(e) => onUpdate({ timezone: e.target.value })}
                disabled={disabled}
                className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-dark-border-secondary bg-white dark:bg-dark-bg-tertiary"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>

            <KeyValueEditor
              label="Payload"
              value={trigger.payload}
              onChange={(payload) => onUpdate({ payload })}
              keyPlaceholder="Key"
              valuePlaceholder="Value"
              disabled={disabled}
              hint="Data passed to the agent when triggered"
            />
          </div>
        );

      case 'webhook':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-dark-text-secondary mb-1.5">
                Webhook Endpoint
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 px-3 py-2 text-sm font-mono rounded-md bg-slate-100 dark:bg-dark-bg-elevated border border-slate-200 dark:border-dark-border-secondary">
                  /api/webhooks/{trigger.endpoint || '[endpoint]'}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => navigator.clipboard.writeText(`/api/webhooks/${trigger.endpoint}`)}
                >
                  Copy
                </Button>
              </div>
            </div>

            <Input
              label="Endpoint Slug"
              value={trigger.endpoint}
              onChange={(e) => onUpdate({ endpoint: e.target.value })}
              placeholder="my-webhook"
              disabled={disabled}
            />

            <Input
              label="Webhook Secret"
              value={trigger.secret}
              onChange={(e) => onUpdate({ secret: e.target.value })}
              placeholder="whsec_..."
              type="password"
              disabled={disabled}
              hint="Used to verify webhook signatures"
            />

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-dark-text-secondary mb-2">
                Allowed Methods
              </label>
              <div className="flex flex-wrap gap-2">
                {HTTP_METHODS.map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => {
                      const current = trigger.allowedMethods;
                      const newMethods = current.includes(method)
                        ? current.filter((m) => m !== method)
                        : [...current, method];
                      onUpdate({ allowedMethods: newMethods });
                    }}
                    disabled={disabled}
                    className={cn(
                      'px-3 py-1.5 text-sm font-mono rounded-lg border transition-colors',
                      trigger.allowedMethods.includes(method)
                        ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/20 dark:text-brand-400'
                        : 'border-slate-200 dark:border-dark-border-secondary hover:border-slate-300'
                    )}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>

            <KeyValueEditor
              label="Required Headers"
              value={trigger.headers}
              onChange={(headers) => onUpdate({ headers })}
              keyPlaceholder="Header name"
              valuePlaceholder="Expected value"
              disabled={disabled}
            />
          </div>
        );

      case 'event':
        return (
          <div className="space-y-4">
            <MultiSelect
              label="Event Types"
              options={EVENT_TYPES}
              value={trigger.eventTypes}
              onChange={(eventTypes) => onUpdate({ eventTypes })}
              disabled={disabled}
              placeholder="Select events to listen for..."
            />

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-dark-text-secondary mb-1.5">
                Debounce (ms)
              </label>
              <input
                type="number"
                value={trigger.debounceMs}
                onChange={(e) => onUpdate({ debounceMs: parseInt(e.target.value) || 0 })}
                min={0}
                max={60000}
                disabled={disabled}
                className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-dark-border-secondary bg-white dark:bg-dark-bg-tertiary"
              />
            </div>

            <KeyValueEditor
              label="Event Filters"
              value={trigger.filters}
              onChange={(filters) => onUpdate({ filters })}
              keyPlaceholder="Property path"
              valuePlaceholder="Match value"
              disabled={disabled}
              hint="Only trigger when event matches these filters"
            />
          </div>
        );
    }
  };

  return (
    <div
      className={cn(
        'border rounded-lg overflow-hidden',
        'border-slate-200 dark:border-dark-border-primary',
        'bg-white dark:bg-dark-bg-secondary',
        !trigger.enabled && 'opacity-60',
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
            onUpdate({ enabled: !trigger.enabled });
          }}
          disabled={disabled}
          className={cn(
            'w-10 h-6 rounded-full transition-colors relative',
            trigger.enabled ? 'bg-brand-600' : 'bg-slate-300 dark:bg-dark-bg-elevated'
          )}
        >
          <span
            className={cn(
              'absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform',
              trigger.enabled ? 'left-5' : 'left-1'
            )}
          />
        </button>

        <div className={cn('p-1.5 rounded-lg', getTriggerColor(trigger.type).split(' ')[0])}>
          {getTriggerIcon(trigger.type)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-900 dark:text-dark-text-primary">
              {trigger.name || 'Unnamed Trigger'}
            </span>
            <Badge size="sm" className={getTriggerColor(trigger.type)}>
              {trigger.type}
            </Badge>
          </div>
          <p className="text-sm text-slate-500 dark:text-dark-text-tertiary">
            {trigger.type === 'schedule' && trigger.cron}
            {trigger.type === 'webhook' && `/api/webhooks/${trigger.endpoint || '...'}`}
            {trigger.type === 'event' && `${trigger.eventTypes.length} event types`}
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
          <Input
            label="Trigger Name"
            value={trigger.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            placeholder="My Trigger"
            disabled={disabled}
          />

          {renderTriggerConfig()}
        </div>
      )}
    </div>
  );
}

// ============================================
// Triggers Cluster Component
// ============================================

export function TriggersCluster({
  value,
  onChange,
  disabled = false,
  className,
}: TriggersClusterProps) {
  const addTrigger = useCallback(
    (type: TriggerType) => {
      let newTrigger: Trigger;

      switch (type) {
        case 'schedule':
          newTrigger = {
            id: generateId(),
            type: 'schedule',
            name: '',
            enabled: true,
            cron: '0 * * * *',
            timezone: 'UTC',
            payload: [],
          };
          break;
        case 'webhook':
          newTrigger = {
            id: generateId(),
            type: 'webhook',
            name: '',
            enabled: true,
            endpoint: '',
            secret: '',
            allowedMethods: ['POST'],
            headers: [],
          };
          break;
        case 'event':
          newTrigger = {
            id: generateId(),
            type: 'event',
            name: '',
            enabled: true,
            eventTypes: [],
            filters: [],
            debounceMs: 0,
          };
          break;
      }

      onChange({ ...value, triggers: [...value.triggers, newTrigger] });
    },
    [value, onChange]
  );

  const updateTrigger = useCallback(
    (id: string, updates: Partial<Trigger>) => {
      onChange({
        ...value,
        triggers: value.triggers.map((trigger) =>
          trigger.id === id ? { ...trigger, ...updates } : trigger
        ) as Trigger[],
      });
    },
    [value, onChange]
  );

  const removeTrigger = useCallback(
    (id: string) => {
      onChange({
        ...value,
        triggers: value.triggers.filter((trigger) => trigger.id !== id),
      });
    },
    [value, onChange]
  );

  const scheduleCount = value.triggers.filter((t) => t.type === 'schedule').length;
  const webhookCount = value.triggers.filter((t) => t.type === 'webhook').length;
  const eventCount = value.triggers.filter((t) => t.type === 'event').length;

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-500/20">
            <Zap className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <CardTitle>Triggers</CardTitle>
            <CardDescription>
              Configure schedules, webhooks, and event-based triggers
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Summary & Global Toggle */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-dark-bg-tertiary">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-500" />
              <span className="text-sm">{scheduleCount} schedules</span>
            </div>
            <div className="flex items-center gap-2">
              <Webhook className="w-4 h-4 text-purple-500" />
              <span className="text-sm">{webhookCount} webhooks</span>
            </div>
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-500" />
              <span className="text-sm">{eventCount} events</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-600 dark:text-dark-text-secondary">
              All Triggers
            </span>
            <button
              type="button"
              onClick={() => onChange({ ...value, globalEnabled: !value.globalEnabled })}
              disabled={disabled}
              className={cn(
                'w-12 h-7 rounded-full transition-colors relative',
                value.globalEnabled ? 'bg-brand-600' : 'bg-slate-300 dark:bg-dark-bg-elevated'
              )}
            >
              <span
                className={cn(
                  'absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform',
                  value.globalEnabled ? 'left-6' : 'left-1'
                )}
              />
            </button>
          </div>
        </div>

        {/* Add Trigger Buttons */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500 dark:text-dark-text-tertiary">Add trigger:</span>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => addTrigger('schedule')}
            disabled={disabled}
            leftIcon={<Clock className="w-4 h-4" />}
          >
            Schedule
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => addTrigger('webhook')}
            disabled={disabled}
            leftIcon={<Webhook className="w-4 h-4" />}
          >
            Webhook
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => addTrigger('event')}
            disabled={disabled}
            leftIcon={<Bell className="w-4 h-4" />}
          >
            Event
          </Button>
        </div>

        {/* Triggers List */}
        <div className="space-y-3">
          {value.triggers.map((trigger) => (
            <TriggerItem
              key={trigger.id}
              trigger={trigger}
              onUpdate={(updates) => updateTrigger(trigger.id, updates)}
              onRemove={() => removeTrigger(trigger.id)}
              disabled={disabled || !value.globalEnabled}
            />
          ))}
        </div>

        {/* Empty State */}
        {value.triggers.length === 0 && (
          <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-dark-border-primary rounded-lg">
            <Zap className="w-12 h-12 text-slate-300 dark:text-dark-text-muted mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 dark:text-dark-text-primary mb-2">
              No Triggers Configured
            </h3>
            <p className="text-sm text-slate-500 dark:text-dark-text-tertiary mb-4">
              Add triggers to automatically activate the agent
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default TriggersCluster;
