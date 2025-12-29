/**
 * AgentOS Ops Console - AuthorityCluster Component
 * Cluster for agent authority: level, zone_access, financial_limits
 */

import React, { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { cn } from '@/lib/utils';
import { ChevronDown, Shield, AlertTriangle, Lock } from 'lucide-react';
import { SelectField, SelectOption } from '../fields/SelectField';
import { NumberField } from '../fields/NumberField';
import { ToggleField } from '../fields/ToggleField';
import { TagInput } from '../fields/TagInput';

// ============================================
// AuthorityCluster Types
// ============================================

export interface AuthorityClusterProps {
  isExpanded?: boolean;
  onToggle?: () => void;
  disabled?: boolean;
  className?: string;
}

// ============================================
// Constants
// ============================================

const AUTHORITY_LEVEL_OPTIONS: SelectOption[] = [
  {
    value: 'read_only',
    label: 'Read Only',
    description: 'Can view but not modify any resources',
    icon: <Shield className="w-4 h-4 text-slate-400" />
  },
  {
    value: 'contributor',
    label: 'Contributor',
    description: 'Can create and modify non-critical resources',
    icon: <Shield className="w-4 h-4 text-blue-500" />
  },
  {
    value: 'operator',
    label: 'Operator',
    description: 'Can execute workflows and manage agents',
    icon: <Shield className="w-4 h-4 text-amber-500" />
  },
  {
    value: 'admin',
    label: 'Admin',
    description: 'Full access to most resources',
    icon: <Shield className="w-4 h-4 text-orange-500" />
  },
  {
    value: 'superadmin',
    label: 'Superadmin',
    description: 'Unrestricted access (use with caution)',
    icon: <Shield className="w-4 h-4 text-red-500" />
  },
];

const ZONE_OPTIONS: SelectOption[] = [
  {
    value: 'green',
    label: 'Green Zone',
    description: 'Features, docs - Full autonomy',
    icon: <div className="w-3 h-3 rounded-full bg-emerald-500" />
  },
  {
    value: 'yellow',
    label: 'Yellow Zone',
    description: 'APIs, core services - Needs tests + review',
    icon: <div className="w-3 h-3 rounded-full bg-amber-500" />
  },
  {
    value: 'red',
    label: 'Red Zone',
    description: 'Legal, billing, evidence - NO EDITS without approval',
    icon: <div className="w-3 h-3 rounded-full bg-red-500" />
  },
];

const RESOURCE_SUGGESTIONS = [
  'github-repos',
  'supabase-db',
  'stripe-api',
  'aws-s3',
  'slack-channels',
  'email-send',
  'file-system',
  'api-endpoints',
  'user-data',
  'logs',
  'metrics',
  'secrets',
];

// ============================================
// AuthorityCluster Component
// ============================================

export function AuthorityCluster({
  isExpanded = true,
  onToggle,
  disabled = false,
  className,
}: AuthorityClusterProps) {
  const [localExpanded, setLocalExpanded] = useState(isExpanded);
  const expanded = onToggle ? isExpanded : localExpanded;
  const handleToggle = onToggle || (() => setLocalExpanded(!localExpanded));

  const { watch } = useFormContext();
  const authorityLevel = watch('authority.level');
  const zoneAccess = watch('authority.zone_access') || [];

  const isHighRisk = authorityLevel === 'admin' || authorityLevel === 'superadmin' || zoneAccess.includes('red');

  return (
    <div className={cn('border border-slate-200 dark:border-dark-border-primary rounded-lg overflow-hidden', className)}>
      {/* Cluster Header */}
      <button
        type="button"
        onClick={handleToggle}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-dark-bg-tertiary hover:bg-slate-100 dark:hover:bg-dark-bg-elevated transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            'flex items-center justify-center w-8 h-8 rounded-lg',
            isHighRisk
              ? 'bg-red-100 dark:bg-red-500/20'
              : 'bg-amber-100 dark:bg-amber-500/20'
          )}>
            <Shield className={cn(
              'w-4 h-4',
              isHighRisk
                ? 'text-red-600 dark:text-red-400'
                : 'text-amber-600 dark:text-amber-400'
            )} />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-dark-text-primary">
              Authority
            </h3>
            <p className="text-xs text-slate-500 dark:text-dark-text-tertiary">
              Access level, zones, and financial limits
            </p>
          </div>
          {isHighRisk && (
            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400">
              High Risk
            </span>
          )}
        </div>
        <ChevronDown
          className={cn(
            'w-5 h-5 text-slate-400 transition-transform duration-200',
            expanded && 'rotate-180'
          )}
        />
      </button>

      {/* Cluster Content */}
      {expanded && (
        <div className="px-4 py-4 space-y-4 bg-white dark:bg-dark-bg-secondary">
          {/* High Risk Warning */}
          {isHighRisk && (
            <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-500/10 rounded-lg border border-red-200 dark:border-red-500/20">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800 dark:text-red-300">
                  High-Risk Configuration
                </p>
                <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                  This agent has elevated privileges. Ensure proper oversight and approval workflows are in place.
                </p>
              </div>
            </div>
          )}

          {/* Authority Level */}
          <SelectField
            name="authority.level"
            label="Authority Level"
            options={AUTHORITY_LEVEL_OPTIONS}
            placeholder="Select authority level"
            helpText="The base permission level for this agent"
            required
            disabled={disabled}
          />

          {/* Zone Access */}
          <SelectField
            name="authority.zone_access"
            label="Zone Access"
            options={ZONE_OPTIONS}
            placeholder="Select accessible zones"
            helpText="Which security zones this agent can operate in"
            required
            multiple
            disabled={disabled}
          />

          {/* Resource Access */}
          <TagInput
            name="authority.resources"
            label="Resource Access"
            placeholder="Add resources this agent can access..."
            helpText="Specific resources or services the agent is permitted to use"
            disabled={disabled}
            suggestions={RESOURCE_SUGGESTIONS}
            maxTags={20}
          />

          {/* Financial Limits */}
          <div className="pt-4 border-t border-slate-100 dark:border-dark-border-secondary">
            <div className="flex items-center gap-2 mb-3">
              <Lock className="w-4 h-4 text-slate-400" />
              <h4 className="text-sm font-medium text-slate-700 dark:text-dark-text-secondary">
                Financial Limits
              </h4>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <NumberField
                name="authority.financial_limits.per_action"
                label="Per Action Limit"
                placeholder="0"
                helpText="Maximum spend per single action"
                min={0}
                max={1000000}
                step={100}
                prefix="$"
                disabled={disabled}
              />

              <NumberField
                name="authority.financial_limits.daily"
                label="Daily Limit"
                placeholder="0"
                helpText="Maximum daily spend"
                min={0}
                max={10000000}
                step={1000}
                prefix="$"
                disabled={disabled}
              />

              <NumberField
                name="authority.financial_limits.monthly"
                label="Monthly Limit"
                placeholder="0"
                helpText="Maximum monthly spend"
                min={0}
                max={100000000}
                step={10000}
                prefix="$"
                disabled={disabled}
              />

              <NumberField
                name="authority.financial_limits.approval_threshold"
                label="Approval Threshold"
                placeholder="0"
                helpText="Amount requiring human approval"
                min={0}
                max={1000000}
                step={100}
                prefix="$"
                disabled={disabled}
              />
            </div>
          </div>

          {/* Authority Options */}
          <div className="pt-4 border-t border-slate-100 dark:border-dark-border-secondary space-y-3">
            <ToggleField
              name="authority.require_approval"
              label="Require Approval"
              description="All actions must be approved by a human"
              disabled={disabled}
            />

            <ToggleField
              name="authority.audit_all_actions"
              label="Audit All Actions"
              description="Log every action for compliance review"
              disabled={disabled}
            />

            <ToggleField
              name="authority.can_spawn_agents"
              label="Can Spawn Agents"
              description="Allow creating or invoking other agents"
              disabled={disabled}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default AuthorityCluster;
