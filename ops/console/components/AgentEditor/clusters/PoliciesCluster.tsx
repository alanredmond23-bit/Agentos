/**
 * AgentOS Ops Console - Policies Cluster
 * Configuration for rate limits, cost limits, and usage policies
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { SliderField } from '../fields/SliderField';
import { KeyValueEditor, KeyValuePair } from '../fields/KeyValueEditor';
import {
  Scale,
  DollarSign,
  Clock,
  Zap,
  AlertTriangle,
  TrendingUp,
  Timer,
  Activity,
  Target,
} from 'lucide-react';

// ============================================
// Types
// ============================================

export type BudgetPeriod = 'hourly' | 'daily' | 'weekly' | 'monthly';
export type ThrottleAction = 'queue' | 'reject' | 'degrade';

export interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
  tokensPerMinute: number;
  tokensPerHour: number;
  tokensPerDay: number;
  concurrentRequests: number;
}

export interface CostLimitConfig {
  enabled: boolean;
  maxCostPerRequest: number;
  budgetAmount: number;
  budgetPeriod: BudgetPeriod;
  alertThreshold: number;
  hardLimit: boolean;
}

export interface UsagePolicyConfig {
  maxSessionDuration: number;
  maxIdleTime: number;
  maxTurnsPerSession: number;
  throttleAction: ThrottleAction;
  priorityLevel: number;
  customPolicies: KeyValuePair[];
}

export interface PoliciesClusterValue {
  rateLimits: RateLimitConfig;
  costLimits: CostLimitConfig;
  usagePolicy: UsagePolicyConfig;
}

interface PoliciesClusterProps {
  value: PoliciesClusterValue;
  onChange: (value: PoliciesClusterValue) => void;
  disabled?: boolean;
  className?: string;
}

// ============================================
// Constants
// ============================================

const BUDGET_PERIODS: { value: BudgetPeriod; label: string }[] = [
  { value: 'hourly', label: 'Hourly' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

const THROTTLE_ACTIONS: { value: ThrottleAction; label: string; description: string }[] = [
  { value: 'queue', label: 'Queue', description: 'Hold requests until capacity available' },
  { value: 'reject', label: 'Reject', description: 'Return error immediately' },
  { value: 'degrade', label: 'Degrade', description: 'Use cheaper/slower model' },
];

// ============================================
// Policies Cluster Component
// ============================================

export function PoliciesCluster({
  value,
  onChange,
  disabled = false,
  className,
}: PoliciesClusterProps) {
  const updateRateLimits = (updates: Partial<RateLimitConfig>) => {
    onChange({ ...value, rateLimits: { ...value.rateLimits, ...updates } });
  };

  const updateCostLimits = (updates: Partial<CostLimitConfig>) => {
    onChange({ ...value, costLimits: { ...value.costLimits, ...updates } });
  };

  const updateUsagePolicy = (updates: Partial<UsagePolicyConfig>) => {
    onChange({ ...value, usagePolicy: { ...value.usagePolicy, ...updates } });
  };

  // Calculate estimated monthly cost based on rate limits
  const estimatedMonthlyCost = (
    (value.rateLimits.tokensPerDay * 30 * 0.00001) + // rough estimate
    (value.rateLimits.requestsPerDay * 30 * 0.001)
  ).toFixed(2);

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-500/20">
            <Scale className="w-5 h-5 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <CardTitle>Policies & Limits</CardTitle>
            <CardDescription>
              Configure rate limits, cost controls, and usage policies
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Rate Limits */}
        <div className="p-4 rounded-lg bg-slate-50 dark:bg-dark-bg-tertiary border border-slate-200 dark:border-dark-border-primary">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-slate-500" />
            <h4 className="font-medium text-slate-900 dark:text-dark-text-primary">
              Rate Limits
            </h4>
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* Request Limits */}
            <div className="space-y-4">
              <h5 className="text-sm font-medium text-slate-600 dark:text-dark-text-secondary">
                Request Limits
              </h5>

              <SliderField
                label="Requests per Minute"
                value={value.rateLimits.requestsPerMinute}
                onChange={(requestsPerMinute) => updateRateLimits({ requestsPerMinute })}
                min={1}
                max={100}
                step={1}
                disabled={disabled}
              />

              <SliderField
                label="Requests per Hour"
                value={value.rateLimits.requestsPerHour}
                onChange={(requestsPerHour) => updateRateLimits({ requestsPerHour })}
                min={10}
                max={1000}
                step={10}
                disabled={disabled}
              />

              <SliderField
                label="Requests per Day"
                value={value.rateLimits.requestsPerDay}
                onChange={(requestsPerDay) => updateRateLimits({ requestsPerDay })}
                min={100}
                max={10000}
                step={100}
                disabled={disabled}
              />
            </div>

            {/* Token Limits */}
            <div className="space-y-4">
              <h5 className="text-sm font-medium text-slate-600 dark:text-dark-text-secondary">
                Token Limits
              </h5>

              <SliderField
                label="Tokens per Minute"
                value={value.rateLimits.tokensPerMinute}
                onChange={(tokensPerMinute) => updateRateLimits({ tokensPerMinute })}
                min={1000}
                max={100000}
                step={1000}
                valueFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
                disabled={disabled}
              />

              <SliderField
                label="Tokens per Hour"
                value={value.rateLimits.tokensPerHour}
                onChange={(tokensPerHour) => updateRateLimits({ tokensPerHour })}
                min={10000}
                max={1000000}
                step={10000}
                valueFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
                disabled={disabled}
              />

              <SliderField
                label="Tokens per Day"
                value={value.rateLimits.tokensPerDay}
                onChange={(tokensPerDay) => updateRateLimits({ tokensPerDay })}
                min={100000}
                max={10000000}
                step={100000}
                valueFormatter={(v) => `${(v / 1000000).toFixed(1)}M`}
                disabled={disabled}
              />
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-dark-border-primary">
            <SliderField
              label="Concurrent Requests"
              value={value.rateLimits.concurrentRequests}
              onChange={(concurrentRequests) => updateRateLimits({ concurrentRequests })}
              min={1}
              max={20}
              step={1}
              disabled={disabled}
            />
          </div>
        </div>

        {/* Cost Limits */}
        <div className="p-4 rounded-lg bg-slate-50 dark:bg-dark-bg-tertiary border border-slate-200 dark:border-dark-border-primary">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-slate-500" />
              <h4 className="font-medium text-slate-900 dark:text-dark-text-primary">
                Cost Limits
              </h4>
            </div>
            <button
              type="button"
              onClick={() => updateCostLimits({ enabled: !value.costLimits.enabled })}
              disabled={disabled}
              className={cn(
                'w-12 h-7 rounded-full transition-colors relative',
                value.costLimits.enabled ? 'bg-brand-600' : 'bg-slate-300 dark:bg-dark-bg-elevated'
              )}
            >
              <span
                className={cn(
                  'absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform',
                  value.costLimits.enabled ? 'left-6' : 'left-1'
                )}
              />
            </button>
          </div>

          {value.costLimits.enabled && (
            <div className="space-y-4">
              {/* Estimated Cost Display */}
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm text-blue-700 dark:text-blue-400">
                      Estimated Monthly Cost
                    </span>
                  </div>
                  <span className="font-mono font-medium text-blue-700 dark:text-blue-400">
                    ${estimatedMonthlyCost}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-dark-text-secondary mb-1.5">
                    Max Cost per Request
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                      $
                    </span>
                    <input
                      type="number"
                      value={value.costLimits.maxCostPerRequest}
                      onChange={(e) =>
                        updateCostLimits({ maxCostPerRequest: parseFloat(e.target.value) || 0 })
                      }
                      min={0}
                      step={0.01}
                      disabled={disabled}
                      className="w-full pl-7 pr-3 py-2 text-sm rounded-md border border-slate-300 dark:border-dark-border-secondary bg-white dark:bg-dark-bg-secondary"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-dark-text-secondary mb-1.5">
                    Budget Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                      $
                    </span>
                    <input
                      type="number"
                      value={value.costLimits.budgetAmount}
                      onChange={(e) =>
                        updateCostLimits({ budgetAmount: parseFloat(e.target.value) || 0 })
                      }
                      min={0}
                      step={1}
                      disabled={disabled}
                      className="w-full pl-7 pr-3 py-2 text-sm rounded-md border border-slate-300 dark:border-dark-border-secondary bg-white dark:bg-dark-bg-secondary"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-dark-text-secondary mb-1.5">
                    Budget Period
                  </label>
                  <select
                    value={value.costLimits.budgetPeriod}
                    onChange={(e) =>
                      updateCostLimits({ budgetPeriod: e.target.value as BudgetPeriod })
                    }
                    disabled={disabled}
                    className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-dark-border-secondary bg-white dark:bg-dark-bg-secondary"
                  >
                    {BUDGET_PERIODS.map((period) => (
                      <option key={period.value} value={period.value}>
                        {period.label}
                      </option>
                    ))}
                  </select>
                </div>

                <SliderField
                  label="Alert Threshold"
                  value={value.costLimits.alertThreshold}
                  onChange={(alertThreshold) => updateCostLimits({ alertThreshold })}
                  min={50}
                  max={100}
                  step={5}
                  valueFormatter={(v) => `${v}%`}
                  disabled={disabled}
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={value.costLimits.hardLimit}
                  onChange={(e) => updateCostLimits({ hardLimit: e.target.checked })}
                  disabled={disabled}
                  className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-sm text-slate-600 dark:text-dark-text-secondary">
                  Hard limit (stop agent when budget exhausted)
                </span>
              </label>
            </div>
          )}
        </div>

        {/* Usage Policy */}
        <div className="p-4 rounded-lg bg-slate-50 dark:bg-dark-bg-tertiary border border-slate-200 dark:border-dark-border-primary">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-slate-500" />
            <h4 className="font-medium text-slate-900 dark:text-dark-text-primary">
              Usage Policy
            </h4>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <SliderField
              label="Max Session Duration"
              value={value.usagePolicy.maxSessionDuration}
              onChange={(maxSessionDuration) => updateUsagePolicy({ maxSessionDuration })}
              min={5}
              max={480}
              step={5}
              valueFormatter={(v) => `${v} min`}
              marks={[
                { value: 30, label: '30m' },
                { value: 120, label: '2h' },
                { value: 240, label: '4h' },
              ]}
              disabled={disabled}
            />

            <SliderField
              label="Max Idle Time"
              value={value.usagePolicy.maxIdleTime}
              onChange={(maxIdleTime) => updateUsagePolicy({ maxIdleTime })}
              min={1}
              max={60}
              step={1}
              valueFormatter={(v) => `${v} min`}
              disabled={disabled}
            />

            <SliderField
              label="Max Turns per Session"
              value={value.usagePolicy.maxTurnsPerSession}
              onChange={(maxTurnsPerSession) => updateUsagePolicy({ maxTurnsPerSession })}
              min={10}
              max={500}
              step={10}
              disabled={disabled}
            />

            <SliderField
              label="Priority Level"
              value={value.usagePolicy.priorityLevel}
              onChange={(priorityLevel) => updateUsagePolicy({ priorityLevel })}
              min={1}
              max={10}
              step={1}
              marks={[
                { value: 1, label: 'Low' },
                { value: 5, label: 'Normal' },
                { value: 10, label: 'High' },
              ]}
              disabled={disabled}
            />
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-700 dark:text-dark-text-secondary mb-2">
              Throttle Action
            </label>
            <div className="grid grid-cols-3 gap-3">
              {THROTTLE_ACTIONS.map((action) => (
                <button
                  key={action.value}
                  type="button"
                  onClick={() => updateUsagePolicy({ throttleAction: action.value })}
                  disabled={disabled}
                  className={cn(
                    'p-3 rounded-lg border text-left transition-colors',
                    value.usagePolicy.throttleAction === action.value
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10'
                      : 'border-slate-200 dark:border-dark-border-secondary hover:border-slate-300'
                  )}
                >
                  <div className="font-medium text-sm text-slate-900 dark:text-dark-text-primary">
                    {action.label}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-dark-text-tertiary mt-1">
                    {action.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-dark-border-primary">
            <KeyValueEditor
              label="Custom Policies"
              value={value.usagePolicy.customPolicies}
              onChange={(customPolicies) => updateUsagePolicy({ customPolicies })}
              keyPlaceholder="Policy name"
              valuePlaceholder="Policy value"
              disabled={disabled}
              hint="Define custom usage policies as key-value pairs"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default PoliciesCluster;
