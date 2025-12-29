/**
 * AgentOS Ops Console - PolicyBuilder Component
 * Visual policy rule builder with conditions and actions
 */

'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  Shield,
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Bell,
  Ban,
  CheckCircle,
  ArrowRight,
  Copy,
  MoreVertical,
  Play,
  Pause,
  Edit2,
  Info,
} from 'lucide-react';

// ============================================
// Types
// ============================================

export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'greater_than'
  | 'less_than'
  | 'greater_than_or_equal'
  | 'less_than_or_equal'
  | 'in'
  | 'not_in'
  | 'starts_with'
  | 'ends_with'
  | 'matches_regex';

export type PolicyAction =
  | 'allow'
  | 'block'
  | 'escalate'
  | 'notify'
  | 'log'
  | 'require_approval'
  | 'rate_limit'
  | 'transform';

export type ConditionField =
  | 'request.user_id'
  | 'request.role'
  | 'request.zone'
  | 'request.action'
  | 'request.resource'
  | 'request.cost_estimate'
  | 'request.token_count'
  | 'agent.name'
  | 'agent.type'
  | 'agent.status'
  | 'context.time_of_day'
  | 'context.day_of_week'
  | 'context.session_duration'
  | 'context.request_count'
  | 'output.contains_pii'
  | 'output.sentiment'
  | 'output.word_count';

export interface PolicyCondition {
  id: string;
  field: ConditionField;
  operator: ConditionOperator;
  value: string;
  valueType: 'string' | 'number' | 'boolean' | 'array';
}

export interface PolicyActionConfig {
  type: PolicyAction;
  config: Record<string, unknown>;
}

export interface PolicyRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  priority: number;
  conditions: PolicyCondition[];
  conditionLogic: 'and' | 'or';
  actions: PolicyActionConfig[];
}

export interface PolicyBuilderValue {
  rules: PolicyRule[];
  defaultAction: PolicyAction;
}

interface PolicyBuilderProps {
  label?: string;
  value: PolicyBuilderValue;
  onChange: (value: PolicyBuilderValue) => void;
  hint?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
}

// ============================================
// Constants
// ============================================

const CONDITION_FIELDS: { value: ConditionField; label: string; category: string }[] = [
  { value: 'request.user_id', label: 'User ID', category: 'Request' },
  { value: 'request.role', label: 'User Role', category: 'Request' },
  { value: 'request.zone', label: 'Zone', category: 'Request' },
  { value: 'request.action', label: 'Action', category: 'Request' },
  { value: 'request.resource', label: 'Resource', category: 'Request' },
  { value: 'request.cost_estimate', label: 'Cost Estimate', category: 'Request' },
  { value: 'request.token_count', label: 'Token Count', category: 'Request' },
  { value: 'agent.name', label: 'Agent Name', category: 'Agent' },
  { value: 'agent.type', label: 'Agent Type', category: 'Agent' },
  { value: 'agent.status', label: 'Agent Status', category: 'Agent' },
  { value: 'context.time_of_day', label: 'Time of Day', category: 'Context' },
  { value: 'context.day_of_week', label: 'Day of Week', category: 'Context' },
  { value: 'context.session_duration', label: 'Session Duration', category: 'Context' },
  { value: 'context.request_count', label: 'Request Count', category: 'Context' },
  { value: 'output.contains_pii', label: 'Contains PII', category: 'Output' },
  { value: 'output.sentiment', label: 'Sentiment', category: 'Output' },
  { value: 'output.word_count', label: 'Word Count', category: 'Output' },
];

const CONDITION_OPERATORS: { value: ConditionOperator; label: string; symbol: string }[] = [
  { value: 'equals', label: 'Equals', symbol: '=' },
  { value: 'not_equals', label: 'Not Equals', symbol: '!=' },
  { value: 'contains', label: 'Contains', symbol: 'has' },
  { value: 'not_contains', label: 'Not Contains', symbol: '!has' },
  { value: 'greater_than', label: 'Greater Than', symbol: '>' },
  { value: 'less_than', label: 'Less Than', symbol: '<' },
  { value: 'greater_than_or_equal', label: 'Greater or Equal', symbol: '>=' },
  { value: 'less_than_or_equal', label: 'Less or Equal', symbol: '<=' },
  { value: 'in', label: 'In List', symbol: 'in' },
  { value: 'not_in', label: 'Not In List', symbol: '!in' },
  { value: 'starts_with', label: 'Starts With', symbol: '^=' },
  { value: 'ends_with', label: 'Ends With', symbol: '$=' },
  { value: 'matches_regex', label: 'Matches Regex', symbol: '~=' },
];

const POLICY_ACTIONS: { value: PolicyAction; label: string; icon: React.ElementType; color: string; description: string }[] = [
  { value: 'allow', label: 'Allow', icon: CheckCircle, color: 'emerald', description: 'Permit the action to proceed' },
  { value: 'block', label: 'Block', icon: Ban, color: 'red', description: 'Prevent the action from executing' },
  { value: 'escalate', label: 'Escalate', icon: AlertTriangle, color: 'amber', description: 'Send to human for review' },
  { value: 'notify', label: 'Notify', icon: Bell, color: 'blue', description: 'Send notification to specified channels' },
  { value: 'log', label: 'Log', icon: Edit2, color: 'slate', description: 'Record for audit trail' },
  { value: 'require_approval', label: 'Require Approval', icon: Shield, color: 'purple', description: 'Wait for explicit approval' },
  { value: 'rate_limit', label: 'Rate Limit', icon: Pause, color: 'orange', description: 'Apply rate limiting' },
  { value: 'transform', label: 'Transform', icon: Play, color: 'cyan', description: 'Modify the request/response' },
];

// ============================================
// Helper Functions
// ============================================

function generateId(): string {
  return `policy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function getActionConfig(action: PolicyAction) {
  return POLICY_ACTIONS.find((a) => a.value === action) || POLICY_ACTIONS[0];
}

function getActionColorClasses(color: string) {
  const colors: Record<string, { bg: string; text: string; border: string }> = {
    emerald: { bg: 'bg-emerald-100 dark:bg-emerald-500/20', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-500/30' },
    red: { bg: 'bg-red-100 dark:bg-red-500/20', text: 'text-red-700 dark:text-red-400', border: 'border-red-200 dark:border-red-500/30' },
    amber: { bg: 'bg-amber-100 dark:bg-amber-500/20', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-500/30' },
    blue: { bg: 'bg-blue-100 dark:bg-blue-500/20', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-500/30' },
    slate: { bg: 'bg-slate-100 dark:bg-slate-500/20', text: 'text-slate-700 dark:text-slate-400', border: 'border-slate-200 dark:border-slate-500/30' },
    purple: { bg: 'bg-purple-100 dark:bg-purple-500/20', text: 'text-purple-700 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-500/30' },
    orange: { bg: 'bg-orange-100 dark:bg-orange-500/20', text: 'text-orange-700 dark:text-orange-400', border: 'border-orange-200 dark:border-orange-500/30' },
    cyan: { bg: 'bg-cyan-100 dark:bg-cyan-500/20', text: 'text-cyan-700 dark:text-cyan-400', border: 'border-cyan-200 dark:border-cyan-500/30' },
  };
  return colors[color] || colors.slate;
}

function createDefaultCondition(): PolicyCondition {
  return {
    id: generateId(),
    field: 'request.zone',
    operator: 'equals',
    value: '',
    valueType: 'string',
  };
}

function createDefaultRule(): PolicyRule {
  return {
    id: generateId(),
    name: '',
    description: '',
    enabled: true,
    priority: 0,
    conditions: [createDefaultCondition()],
    conditionLogic: 'and',
    actions: [{ type: 'allow', config: {} }],
  };
}

// ============================================
// Condition Row Component
// ============================================

interface ConditionRowProps {
  condition: PolicyCondition;
  onUpdate: (updates: Partial<PolicyCondition>) => void;
  onRemove: () => void;
  disabled?: boolean;
  showLogic?: boolean;
  logic?: 'and' | 'or';
}

function ConditionRow({ condition, onUpdate, onRemove, disabled, showLogic, logic }: ConditionRowProps) {
  return (
    <div className="flex items-center gap-2">
      {showLogic && (
        <span className="w-12 text-xs font-medium text-slate-400 uppercase">
          {logic}
        </span>
      )}

      {/* Field Selector */}
      <select
        value={condition.field}
        onChange={(e) => onUpdate({ field: e.target.value as ConditionField })}
        disabled={disabled}
        className={cn(
          'flex-1 px-3 py-2 text-sm rounded-md',
          'bg-white dark:bg-dark-bg-secondary',
          'border border-slate-300 dark:border-dark-border-secondary',
          'focus:outline-none focus:ring-2 focus:ring-brand-500'
        )}
      >
        {Object.entries(
          CONDITION_FIELDS.reduce((acc, field) => {
            if (!acc[field.category]) acc[field.category] = [];
            acc[field.category].push(field);
            return acc;
          }, {} as Record<string, typeof CONDITION_FIELDS>)
        ).map(([category, fields]) => (
          <optgroup key={category} label={category}>
            {fields.map((field) => (
              <option key={field.value} value={field.value}>
                {field.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>

      {/* Operator Selector */}
      <select
        value={condition.operator}
        onChange={(e) => onUpdate({ operator: e.target.value as ConditionOperator })}
        disabled={disabled}
        className={cn(
          'w-36 px-3 py-2 text-sm rounded-md',
          'bg-white dark:bg-dark-bg-secondary',
          'border border-slate-300 dark:border-dark-border-secondary',
          'focus:outline-none focus:ring-2 focus:ring-brand-500'
        )}
      >
        {CONDITION_OPERATORS.map((op) => (
          <option key={op.value} value={op.value}>
            {op.symbol} {op.label}
          </option>
        ))}
      </select>

      {/* Value Input */}
      <input
        type="text"
        value={condition.value}
        onChange={(e) => onUpdate({ value: e.target.value })}
        placeholder="Value"
        disabled={disabled}
        className={cn(
          'flex-1 px-3 py-2 text-sm rounded-md',
          'bg-white dark:bg-dark-bg-secondary',
          'border border-slate-300 dark:border-dark-border-secondary',
          'focus:outline-none focus:ring-2 focus:ring-brand-500',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      />

      {/* Remove Button */}
      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        className="p-2 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
        aria-label="Remove condition"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

// ============================================
// Action Badge Component
// ============================================

interface ActionBadgeProps {
  action: PolicyActionConfig;
  onRemove: () => void;
  disabled?: boolean;
}

function ActionBadge({ action, onRemove, disabled }: ActionBadgeProps) {
  const config = getActionConfig(action.type);
  const colors = getActionColorClasses(config.color);
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-full border',
        colors.bg,
        colors.border
      )}
    >
      <Icon className={cn('w-4 h-4', colors.text)} />
      <span className={cn('text-sm font-medium', colors.text)}>
        {config.label}
      </span>
      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        className={cn(
          'ml-1 p-0.5 rounded-full hover:bg-white/50',
          colors.text
        )}
        aria-label={`Remove ${config.label} action`}
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  );
}

// ============================================
// Rule Card Component
// ============================================

interface RuleCardProps {
  rule: PolicyRule;
  index: number;
  onUpdate: (updates: Partial<PolicyRule>) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
  disabled?: boolean;
}

function RuleCard({
  rule,
  index,
  onUpdate,
  onRemove,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  disabled,
}: RuleCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showActionMenu, setShowActionMenu] = useState(false);

  const addCondition = () => {
    onUpdate({
      conditions: [...rule.conditions, createDefaultCondition()],
    });
  };

  const updateCondition = (conditionId: string, updates: Partial<PolicyCondition>) => {
    onUpdate({
      conditions: rule.conditions.map((c) =>
        c.id === conditionId ? { ...c, ...updates } : c
      ),
    });
  };

  const removeCondition = (conditionId: string) => {
    if (rule.conditions.length > 1) {
      onUpdate({
        conditions: rule.conditions.filter((c) => c.id !== conditionId),
      });
    }
  };

  const addAction = (actionType: PolicyAction) => {
    onUpdate({
      actions: [...rule.actions, { type: actionType, config: {} }],
    });
    setShowActionMenu(false);
  };

  const removeAction = (actionIndex: number) => {
    if (rule.actions.length > 1) {
      onUpdate({
        actions: rule.actions.filter((_, i) => i !== actionIndex),
      });
    }
  };

  return (
    <div
      className={cn(
        'border rounded-lg overflow-hidden transition-all',
        'border-slate-200 dark:border-dark-border-primary',
        'bg-white dark:bg-dark-bg-secondary',
        !rule.enabled && 'opacity-60',
        disabled && 'opacity-50'
      )}
    >
      {/* Rule Header */}
      <div
        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-dark-bg-tertiary"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Drag Handle */}
        <div className="text-slate-400 cursor-grab">
          <GripVertical className="w-5 h-5" />
        </div>

        {/* Enable Toggle */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onUpdate({ enabled: !rule.enabled });
          }}
          disabled={disabled}
          className={cn(
            'w-10 h-6 rounded-full transition-colors relative shrink-0',
            rule.enabled ? 'bg-brand-600' : 'bg-slate-300 dark:bg-dark-bg-elevated'
          )}
        >
          <span
            className={cn(
              'absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform',
              rule.enabled ? 'left-5' : 'left-1'
            )}
          />
        </button>

        {/* Priority Badge */}
        <span className="px-2 py-0.5 text-xs font-medium rounded bg-slate-100 dark:bg-dark-bg-tertiary text-slate-500">
          #{index + 1}
        </span>

        {/* Rule Name */}
        <div className="flex-1 min-w-0">
          <input
            type="text"
            value={rule.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            onClick={(e) => e.stopPropagation()}
            placeholder="Rule name"
            disabled={disabled}
            className={cn(
              'w-full px-2 py-1 text-sm font-medium rounded',
              'bg-transparent hover:bg-slate-100 dark:hover:bg-dark-bg-tertiary',
              'border border-transparent focus:border-brand-500',
              'text-slate-900 dark:text-dark-text-primary',
              'placeholder:text-slate-400',
              'focus:outline-none'
            )}
          />
        </div>

        {/* Action Preview */}
        <div className="flex items-center gap-1.5">
          {rule.actions.slice(0, 2).map((action, i) => {
            const config = getActionConfig(action.type);
            const colors = getActionColorClasses(config.color);
            const Icon = config.icon;
            return (
              <div
                key={i}
                className={cn('p-1 rounded', colors.bg)}
                title={config.label}
              >
                <Icon className={cn('w-4 h-4', colors.text)} />
              </div>
            );
          })}
          {rule.actions.length > 2 && (
            <span className="text-xs text-slate-400">
              +{rule.actions.length - 2}
            </span>
          )}
        </div>

        {/* Actions Menu */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMoveUp();
            }}
            disabled={disabled || isFirst}
            className="p-1.5 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-dark-bg-tertiary disabled:opacity-30"
            aria-label="Move up"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMoveDown();
            }}
            disabled={disabled || isLast}
            className="p-1.5 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-dark-bg-tertiary disabled:opacity-30"
            aria-label="Move down"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate();
            }}
            disabled={disabled}
            className="p-1.5 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-dark-bg-tertiary"
            aria-label="Duplicate rule"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            disabled={disabled}
            className="p-1.5 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
            aria-label="Delete rule"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* Expand Icon */}
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-slate-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-slate-400" />
        )}
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-slate-200 dark:border-dark-border-primary p-4 space-y-4">
          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-dark-text-tertiary mb-1.5">
              Description
            </label>
            <input
              type="text"
              value={rule.description}
              onChange={(e) => onUpdate({ description: e.target.value })}
              placeholder="Describe what this rule does..."
              disabled={disabled}
              className={cn(
                'w-full px-3 py-2 text-sm rounded-md',
                'bg-slate-50 dark:bg-dark-bg-tertiary',
                'border border-slate-200 dark:border-dark-border-secondary',
                'focus:outline-none focus:ring-2 focus:ring-brand-500'
              )}
            />
          </div>

          {/* Conditions Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-xs font-medium text-slate-500 dark:text-dark-text-tertiary">
                Conditions
              </label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Match</span>
                <select
                  value={rule.conditionLogic}
                  onChange={(e) => onUpdate({ conditionLogic: e.target.value as 'and' | 'or' })}
                  disabled={disabled}
                  className="px-2 py-1 text-xs rounded border border-slate-200 dark:border-dark-border-secondary bg-white dark:bg-dark-bg-secondary"
                >
                  <option value="and">ALL conditions (AND)</option>
                  <option value="or">ANY condition (OR)</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              {rule.conditions.map((condition, i) => (
                <ConditionRow
                  key={condition.id}
                  condition={condition}
                  onUpdate={(updates) => updateCondition(condition.id, updates)}
                  onRemove={() => removeCondition(condition.id)}
                  disabled={disabled}
                  showLogic={i > 0}
                  logic={rule.conditionLogic}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={addCondition}
              disabled={disabled}
              className={cn(
                'mt-3 flex items-center gap-2 px-3 py-2 text-sm rounded-md',
                'text-brand-600 dark:text-brand-400',
                'hover:bg-brand-50 dark:hover:bg-brand-500/10',
                'transition-colors'
              )}
            >
              <Plus className="w-4 h-4" />
              Add Condition
            </button>
          </div>

          {/* Arrow */}
          <div className="flex items-center justify-center py-2">
            <ArrowRight className="w-5 h-5 text-slate-300" />
          </div>

          {/* Actions Section */}
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-dark-text-tertiary mb-3">
              Then perform these actions
            </label>

            <div className="flex flex-wrap gap-2 mb-3">
              {rule.actions.map((action, i) => (
                <ActionBadge
                  key={i}
                  action={action}
                  onRemove={() => removeAction(i)}
                  disabled={disabled}
                />
              ))}
            </div>

            {/* Add Action Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowActionMenu(!showActionMenu)}
                disabled={disabled}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 text-sm rounded-md',
                  'text-brand-600 dark:text-brand-400',
                  'hover:bg-brand-50 dark:hover:bg-brand-500/10',
                  'transition-colors'
                )}
              >
                <Plus className="w-4 h-4" />
                Add Action
              </button>

              {showActionMenu && (
                <div className="absolute z-10 mt-1 w-64 rounded-lg border border-slate-200 dark:border-dark-border-primary bg-white dark:bg-dark-bg-secondary shadow-lg">
                  {POLICY_ACTIONS.map((action) => {
                    const Icon = action.icon;
                    const colors = getActionColorClasses(action.color);
                    return (
                      <button
                        key={action.value}
                        type="button"
                        onClick={() => addAction(action.value)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-dark-bg-tertiary text-left"
                      >
                        <div className={cn('p-1.5 rounded', colors.bg)}>
                          <Icon className={cn('w-4 h-4', colors.text)} />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-slate-900 dark:text-dark-text-primary">
                            {action.label}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-dark-text-tertiary">
                            {action.description}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// PolicyBuilder Component
// ============================================

export function PolicyBuilder({
  label,
  value,
  onChange,
  hint,
  error,
  disabled = false,
  className,
}: PolicyBuilderProps) {
  const addRule = useCallback(() => {
    onChange({
      ...value,
      rules: [...value.rules, createDefaultRule()],
    });
  }, [value, onChange]);

  const updateRule = useCallback(
    (ruleId: string, updates: Partial<PolicyRule>) => {
      onChange({
        ...value,
        rules: value.rules.map((r) => (r.id === ruleId ? { ...r, ...updates } : r)),
      });
    },
    [value, onChange]
  );

  const removeRule = useCallback(
    (ruleId: string) => {
      onChange({
        ...value,
        rules: value.rules.filter((r) => r.id !== ruleId),
      });
    },
    [value, onChange]
  );

  const duplicateRule = useCallback(
    (ruleId: string) => {
      const ruleToDuplicate = value.rules.find((r) => r.id === ruleId);
      if (ruleToDuplicate) {
        const duplicated: PolicyRule = {
          ...ruleToDuplicate,
          id: generateId(),
          name: `${ruleToDuplicate.name} (copy)`,
          conditions: ruleToDuplicate.conditions.map((c) => ({ ...c, id: generateId() })),
        };
        const index = value.rules.findIndex((r) => r.id === ruleId);
        const newRules = [...value.rules];
        newRules.splice(index + 1, 0, duplicated);
        onChange({ ...value, rules: newRules });
      }
    },
    [value, onChange]
  );

  const moveRule = useCallback(
    (ruleId: string, direction: 'up' | 'down') => {
      const index = value.rules.findIndex((r) => r.id === ruleId);
      if (
        (direction === 'up' && index > 0) ||
        (direction === 'down' && index < value.rules.length - 1)
      ) {
        const newRules = [...value.rules];
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        [newRules[index], newRules[newIndex]] = [newRules[newIndex], newRules[index]];
        onChange({ ...value, rules: newRules });
      }
    },
    [value, onChange]
  );

  const activeRulesCount = value.rules.filter((r) => r.enabled).length;

  return (
    <div className={cn('w-full', className)}>
      {/* Header */}
      {label && (
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-slate-600 dark:text-dark-text-secondary" />
          <label className="text-sm font-medium text-slate-700 dark:text-dark-text-secondary">
            {label}
          </label>
        </div>
      )}

      {/* Summary Bar */}
      <div className="flex items-center justify-between p-3 mb-4 rounded-lg bg-slate-100 dark:bg-dark-bg-tertiary">
        <div className="flex items-center gap-4">
          <div>
            <span className="text-2xl font-bold text-slate-900 dark:text-dark-text-primary">
              {activeRulesCount}
            </span>
            <span className="text-sm text-slate-500 ml-1">
              active rule{activeRulesCount !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="text-sm text-slate-500">
            of {value.rules.length} total
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-sm text-slate-500 dark:text-dark-text-tertiary">
            Default Action:
          </label>
          <select
            value={value.defaultAction}
            onChange={(e) => onChange({ ...value, defaultAction: e.target.value as PolicyAction })}
            disabled={disabled}
            className={cn(
              'px-3 py-1.5 text-sm rounded-md',
              'bg-white dark:bg-dark-bg-secondary',
              'border border-slate-300 dark:border-dark-border-secondary',
              'focus:outline-none focus:ring-2 focus:ring-brand-500'
            )}
          >
            {POLICY_ACTIONS.map((action) => (
              <option key={action.value} value={action.value}>
                {action.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Rules List */}
      <div className="space-y-3">
        {value.rules.map((rule, index) => (
          <RuleCard
            key={rule.id}
            rule={rule}
            index={index}
            onUpdate={(updates) => updateRule(rule.id, updates)}
            onRemove={() => removeRule(rule.id)}
            onDuplicate={() => duplicateRule(rule.id)}
            onMoveUp={() => moveRule(rule.id, 'up')}
            onMoveDown={() => moveRule(rule.id, 'down')}
            isFirst={index === 0}
            isLast={index === value.rules.length - 1}
            disabled={disabled}
          />
        ))}
      </div>

      {/* Empty State */}
      {value.rules.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-slate-200 dark:border-dark-border-primary rounded-lg">
          <Shield className="w-12 h-12 text-slate-300 dark:text-dark-text-muted mb-3" />
          <p className="text-sm text-slate-500 dark:text-dark-text-tertiary mb-4">
            No policy rules defined
          </p>
          <button
            type="button"
            onClick={addRule}
            disabled={disabled}
            className={cn(
              'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg',
              'bg-brand-600 text-white',
              'hover:bg-brand-700',
              'transition-colors',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <Plus className="w-4 h-4" />
            Create First Rule
          </button>
        </div>
      )}

      {/* Add Rule Button */}
      {value.rules.length > 0 && (
        <button
          type="button"
          onClick={addRule}
          disabled={disabled}
          className={cn(
            'mt-4 w-full flex items-center justify-center gap-2 px-4 py-3',
            'text-sm font-medium rounded-lg',
            'border-2 border-dashed border-slate-300 dark:border-dark-border-primary',
            'text-slate-500 dark:text-dark-text-tertiary',
            'hover:border-brand-500 hover:text-brand-600 dark:hover:text-brand-400',
            'transition-colors',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          <Plus className="w-4 h-4" />
          Add Rule
        </button>
      )}

      {/* Info Panel */}
      <div className="mt-4 p-4 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div className="text-sm text-blue-700 dark:text-blue-300">
            <p className="font-medium mb-1">How Policy Rules Work</p>
            <ul className="list-disc list-inside space-y-1 text-blue-600 dark:text-blue-400">
              <li>Rules are evaluated in order from top to bottom</li>
              <li>The first matching rule determines the action taken</li>
              <li>If no rules match, the default action is applied</li>
              <li>Drag rules to reorder priority</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Error/Hint */}
      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
          <AlertTriangle className="w-4 h-4" />
          {error}
        </p>
      )}
      {hint && !error && (
        <p className="mt-2 text-sm text-slate-500 dark:text-dark-text-tertiary">{hint}</p>
      )}
    </div>
  );
}

export default PolicyBuilder;
