/**
 * AgentOS Ops Console - FinancialLimits Component
 * Financial limit sliders with currency formatting and budget visualization
 */

'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { SliderField } from './SliderField';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Clock,
  Calendar,
  Zap,
  BarChart2,
  Shield,
  Info,
} from 'lucide-react';

// ============================================
// Types
// ============================================

export type Currency = 'USD' | 'EUR' | 'GBP' | 'JPY';
export type BudgetPeriod = 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface FinancialLimitsValue {
  currency: Currency;
  budgetPeriod: BudgetPeriod;
  budgetAmount: number;
  alertThreshold: number;
  hardLimit: boolean;
  costPerRequest: {
    max: number;
    average: number;
    enabled: boolean;
  };
  costPerToken: {
    input: number;
    output: number;
    enabled: boolean;
  };
  estimatedUsage: {
    requestsPerPeriod: number;
    tokensPerRequest: number;
  };
}

interface FinancialLimitsProps {
  label?: string;
  value: FinancialLimitsValue;
  onChange: (value: FinancialLimitsValue) => void;
  hint?: string;
  error?: string;
  disabled?: boolean;
  showEstimates?: boolean;
  showBreakdown?: boolean;
  className?: string;
}

// ============================================
// Constants
// ============================================

const CURRENCIES: { value: Currency; label: string; symbol: string }[] = [
  { value: 'USD', label: 'US Dollar', symbol: '$' },
  { value: 'EUR', label: 'Euro', symbol: '\u20AC' },
  { value: 'GBP', label: 'British Pound', symbol: '\u00A3' },
  { value: 'JPY', label: 'Japanese Yen', symbol: '\u00A5' },
];

const BUDGET_PERIODS: { value: BudgetPeriod; label: string; multiplier: number }[] = [
  { value: 'hourly', label: 'Hourly', multiplier: 720 },
  { value: 'daily', label: 'Daily', multiplier: 30 },
  { value: 'weekly', label: 'Weekly', multiplier: 4 },
  { value: 'monthly', label: 'Monthly', multiplier: 1 },
  { value: 'yearly', label: 'Yearly', multiplier: 1 / 12 },
];

// ============================================
// Helper Functions
// ============================================

function formatCurrency(amount: number, currency: Currency): string {
  const config = CURRENCIES.find((c) => c.value === currency) || CURRENCIES[0];

  if (currency === 'JPY') {
    return `${config.symbol}${Math.round(amount).toLocaleString()}`;
  }

  return `${config.symbol}${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function getPeriodIcon(period: BudgetPeriod) {
  switch (period) {
    case 'hourly':
      return Clock;
    case 'daily':
    case 'weekly':
      return Calendar;
    case 'monthly':
    case 'yearly':
      return BarChart2;
  }
}

function getUsageStatus(percentage: number): { color: string; text: string; icon: React.ElementType } {
  if (percentage >= 100) {
    return { color: 'text-red-600 dark:text-red-400', text: 'Over Budget', icon: AlertTriangle };
  }
  if (percentage >= 90) {
    return { color: 'text-red-500 dark:text-red-400', text: 'Critical', icon: TrendingUp };
  }
  if (percentage >= 75) {
    return { color: 'text-amber-500 dark:text-amber-400', text: 'Warning', icon: TrendingUp };
  }
  if (percentage >= 50) {
    return { color: 'text-blue-500 dark:text-blue-400', text: 'Normal', icon: TrendingUp };
  }
  return { color: 'text-emerald-500 dark:text-emerald-400', text: 'Healthy', icon: TrendingDown };
}

// ============================================
// FinancialLimits Component
// ============================================

export function FinancialLimits({
  label,
  value,
  onChange,
  hint,
  error,
  disabled = false,
  showEstimates = true,
  showBreakdown = true,
  className,
}: FinancialLimitsProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const currencyConfig = useMemo(
    () => CURRENCIES.find((c) => c.value === value.currency) || CURRENCIES[0],
    [value.currency]
  );

  const periodConfig = useMemo(
    () => BUDGET_PERIODS.find((p) => p.value === value.budgetPeriod) || BUDGET_PERIODS[3],
    [value.budgetPeriod]
  );

  // Calculate estimated costs
  const estimatedCost = useMemo(() => {
    if (!showEstimates) return 0;

    const requestCost = value.costPerRequest.enabled
      ? value.estimatedUsage.requestsPerPeriod * value.costPerRequest.average
      : 0;

    const tokenCost = value.costPerToken.enabled
      ? value.estimatedUsage.requestsPerPeriod *
        value.estimatedUsage.tokensPerRequest *
        ((value.costPerToken.input + value.costPerToken.output) / 2)
      : 0;

    return requestCost + tokenCost;
  }, [value, showEstimates]);

  const usagePercentage = value.budgetAmount > 0
    ? (estimatedCost / value.budgetAmount) * 100
    : 0;

  const monthlyEquivalent = value.budgetAmount * periodConfig.multiplier;
  const usageStatus = getUsageStatus(usagePercentage);
  const PeriodIcon = getPeriodIcon(value.budgetPeriod);
  const StatusIcon = usageStatus.icon;

  const updateCostPerRequest = useCallback(
    (updates: Partial<typeof value.costPerRequest>) => {
      onChange({
        ...value,
        costPerRequest: { ...value.costPerRequest, ...updates },
      });
    },
    [value, onChange]
  );

  const updateCostPerToken = useCallback(
    (updates: Partial<typeof value.costPerToken>) => {
      onChange({
        ...value,
        costPerToken: { ...value.costPerToken, ...updates },
      });
    },
    [value, onChange]
  );

  const updateEstimatedUsage = useCallback(
    (updates: Partial<typeof value.estimatedUsage>) => {
      onChange({
        ...value,
        estimatedUsage: { ...value.estimatedUsage, ...updates },
      });
    },
    [value, onChange]
  );

  return (
    <div className={cn('w-full', className)}>
      {/* Header */}
      {label && (
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="w-5 h-5 text-slate-600 dark:text-dark-text-secondary" />
          <label className="text-sm font-medium text-slate-700 dark:text-dark-text-secondary">
            {label}
          </label>
        </div>
      )}

      {/* Budget Overview Card */}
      <div
        className={cn(
          'p-4 rounded-lg border',
          'bg-gradient-to-br from-slate-50 to-slate-100',
          'dark:from-dark-bg-tertiary dark:to-dark-bg-elevated',
          'border-slate-200 dark:border-dark-border-primary'
        )}
      >
        {/* Currency & Period Selectors */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1">
            <label className="block text-xs font-medium text-slate-500 dark:text-dark-text-tertiary mb-1">
              Currency
            </label>
            <select
              value={value.currency}
              onChange={(e) => onChange({ ...value, currency: e.target.value as Currency })}
              disabled={disabled}
              className={cn(
                'w-full px-3 py-2 text-sm rounded-md',
                'bg-white dark:bg-dark-bg-secondary',
                'border border-slate-300 dark:border-dark-border-secondary',
                'focus:outline-none focus:ring-2 focus:ring-brand-500'
              )}
            >
              {CURRENCIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.symbol} {c.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1">
            <label className="block text-xs font-medium text-slate-500 dark:text-dark-text-tertiary mb-1">
              Budget Period
            </label>
            <select
              value={value.budgetPeriod}
              onChange={(e) => onChange({ ...value, budgetPeriod: e.target.value as BudgetPeriod })}
              disabled={disabled}
              className={cn(
                'w-full px-3 py-2 text-sm rounded-md',
                'bg-white dark:bg-dark-bg-secondary',
                'border border-slate-300 dark:border-dark-border-secondary',
                'focus:outline-none focus:ring-2 focus:ring-brand-500'
              )}
            >
              {BUDGET_PERIODS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Budget Amount */}
        <div className="mb-6">
          <label className="block text-xs font-medium text-slate-500 dark:text-dark-text-tertiary mb-2">
            Budget Amount ({value.budgetPeriod})
          </label>
          <div className="flex items-center gap-3">
            <span className="text-3xl font-bold text-slate-900 dark:text-dark-text-primary">
              {currencyConfig.symbol}
            </span>
            <input
              type="number"
              value={value.budgetAmount}
              onChange={(e) => onChange({ ...value, budgetAmount: parseFloat(e.target.value) || 0 })}
              min={0}
              step={value.currency === 'JPY' ? 100 : 1}
              disabled={disabled}
              className={cn(
                'flex-1 px-4 py-3 text-2xl font-semibold rounded-lg',
                'bg-white dark:bg-dark-bg-secondary',
                'border border-slate-300 dark:border-dark-border-secondary',
                'focus:outline-none focus:ring-2 focus:ring-brand-500',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
            />
          </div>
          <div className="mt-2 text-sm text-slate-500 dark:text-dark-text-tertiary">
            Equivalent to {formatCurrency(monthlyEquivalent, value.currency)} per month
          </div>
        </div>

        {/* Usage Visualization */}
        {showEstimates && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-600 dark:text-dark-text-secondary">
                Estimated Usage
              </span>
              <div className={cn('flex items-center gap-1', usageStatus.color)}>
                <StatusIcon className="w-4 h-4" />
                <span className="text-sm font-medium">{usageStatus.text}</span>
              </div>
            </div>

            <div className="h-3 rounded-full bg-slate-200 dark:bg-dark-bg-elevated overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  usagePercentage >= 100
                    ? 'bg-red-500'
                    : usagePercentage >= 90
                    ? 'bg-red-400'
                    : usagePercentage >= 75
                    ? 'bg-amber-500'
                    : usagePercentage >= 50
                    ? 'bg-blue-500'
                    : 'bg-emerald-500'
                )}
                style={{ width: `${Math.min(usagePercentage, 100)}%` }}
              />
            </div>

            <div className="flex items-center justify-between mt-2 text-sm">
              <span className="text-slate-500">
                Est: {formatCurrency(estimatedCost, value.currency)}
              </span>
              <span className="text-slate-500">
                {usagePercentage.toFixed(1)}% of budget
              </span>
            </div>
          </div>
        )}

        {/* Alert Threshold */}
        <SliderField
          label="Alert Threshold"
          value={value.alertThreshold}
          onChange={(alertThreshold) => onChange({ ...value, alertThreshold })}
          min={50}
          max={100}
          step={5}
          valueFormatter={(v) => `${v}%`}
          marks={[
            { value: 50, label: '50%' },
            { value: 75, label: '75%' },
            { value: 90, label: '90%' },
          ]}
          hint="Receive alerts when spending reaches this percentage"
          disabled={disabled}
        />

        {/* Hard Limit Toggle */}
        <label className="flex items-center gap-3 mt-4 p-3 rounded-lg bg-white dark:bg-dark-bg-secondary border border-slate-200 dark:border-dark-border-secondary cursor-pointer">
          <input
            type="checkbox"
            checked={value.hardLimit}
            onChange={(e) => onChange({ ...value, hardLimit: e.target.checked })}
            disabled={disabled}
            className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
          />
          <div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-slate-500" />
              <span className="font-medium text-slate-700 dark:text-dark-text-secondary">
                Hard Limit
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-dark-text-tertiary">
              Stop agent execution when budget is exhausted
            </p>
          </div>
        </label>
      </div>

      {/* Advanced Settings */}
      <div className="mt-4">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-sm text-brand-600 dark:text-brand-400 hover:underline"
        >
          {showAdvanced ? 'Hide' : 'Show'} Advanced Settings
        </button>

        {showAdvanced && (
          <div className="mt-4 p-4 rounded-lg bg-slate-50 dark:bg-dark-bg-tertiary border border-slate-200 dark:border-dark-border-primary space-y-6">
            {/* Cost per Request */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-slate-500" />
                  <span className="font-medium text-slate-700 dark:text-dark-text-secondary">
                    Cost per Request
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => updateCostPerRequest({ enabled: !value.costPerRequest.enabled })}
                  disabled={disabled}
                  className={cn(
                    'w-10 h-6 rounded-full transition-colors relative',
                    value.costPerRequest.enabled ? 'bg-brand-600' : 'bg-slate-300 dark:bg-dark-bg-elevated'
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform',
                      value.costPerRequest.enabled ? 'left-5' : 'left-1'
                    )}
                  />
                </button>
              </div>

              {value.costPerRequest.enabled && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Max per Request</label>
                    <div className="flex items-center gap-1">
                      <span className="text-slate-400">{currencyConfig.symbol}</span>
                      <input
                        type="number"
                        value={value.costPerRequest.max}
                        onChange={(e) => updateCostPerRequest({ max: parseFloat(e.target.value) || 0 })}
                        min={0}
                        step={0.01}
                        disabled={disabled}
                        className="flex-1 px-2 py-1.5 text-sm rounded border border-slate-300 dark:border-dark-border-secondary"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Average per Request</label>
                    <div className="flex items-center gap-1">
                      <span className="text-slate-400">{currencyConfig.symbol}</span>
                      <input
                        type="number"
                        value={value.costPerRequest.average}
                        onChange={(e) => updateCostPerRequest({ average: parseFloat(e.target.value) || 0 })}
                        min={0}
                        step={0.001}
                        disabled={disabled}
                        className="flex-1 px-2 py-1.5 text-sm rounded border border-slate-300 dark:border-dark-border-secondary"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Cost per Token */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-slate-500" />
                  <span className="font-medium text-slate-700 dark:text-dark-text-secondary">
                    Cost per Token
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => updateCostPerToken({ enabled: !value.costPerToken.enabled })}
                  disabled={disabled}
                  className={cn(
                    'w-10 h-6 rounded-full transition-colors relative',
                    value.costPerToken.enabled ? 'bg-brand-600' : 'bg-slate-300 dark:bg-dark-bg-elevated'
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform',
                      value.costPerToken.enabled ? 'left-5' : 'left-1'
                    )}
                  />
                </button>
              </div>

              {value.costPerToken.enabled && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Input Tokens (per 1K)</label>
                    <div className="flex items-center gap-1">
                      <span className="text-slate-400">{currencyConfig.symbol}</span>
                      <input
                        type="number"
                        value={value.costPerToken.input}
                        onChange={(e) => updateCostPerToken({ input: parseFloat(e.target.value) || 0 })}
                        min={0}
                        step={0.0001}
                        disabled={disabled}
                        className="flex-1 px-2 py-1.5 text-sm rounded border border-slate-300 dark:border-dark-border-secondary"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Output Tokens (per 1K)</label>
                    <div className="flex items-center gap-1">
                      <span className="text-slate-400">{currencyConfig.symbol}</span>
                      <input
                        type="number"
                        value={value.costPerToken.output}
                        onChange={(e) => updateCostPerToken({ output: parseFloat(e.target.value) || 0 })}
                        min={0}
                        step={0.0001}
                        disabled={disabled}
                        className="flex-1 px-2 py-1.5 text-sm rounded border border-slate-300 dark:border-dark-border-secondary"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Estimated Usage */}
            {showEstimates && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4 text-slate-500" />
                  <span className="font-medium text-slate-700 dark:text-dark-text-secondary">
                    Estimated Usage
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <SliderField
                    label={`Requests per ${value.budgetPeriod}`}
                    value={value.estimatedUsage.requestsPerPeriod}
                    onChange={(requestsPerPeriod) => updateEstimatedUsage({ requestsPerPeriod })}
                    min={0}
                    max={10000}
                    step={100}
                    disabled={disabled}
                  />
                  <SliderField
                    label="Avg Tokens per Request"
                    value={value.estimatedUsage.tokensPerRequest}
                    onChange={(tokensPerRequest) => updateEstimatedUsage({ tokensPerRequest })}
                    min={100}
                    max={10000}
                    step={100}
                    disabled={disabled}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Cost Breakdown */}
      {showBreakdown && estimatedCost > 0 && (
        <div className="mt-4 p-4 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30">
          <div className="flex items-center gap-2 mb-3">
            <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="font-medium text-blue-700 dark:text-blue-400">
              Cost Breakdown
            </span>
          </div>
          <div className="space-y-2 text-sm text-blue-700 dark:text-blue-300">
            {value.costPerRequest.enabled && (
              <div className="flex items-center justify-between">
                <span>Request costs ({value.estimatedUsage.requestsPerPeriod} requests)</span>
                <span className="font-medium">
                  {formatCurrency(
                    value.estimatedUsage.requestsPerPeriod * value.costPerRequest.average,
                    value.currency
                  )}
                </span>
              </div>
            )}
            {value.costPerToken.enabled && (
              <div className="flex items-center justify-between">
                <span>Token costs (~{(value.estimatedUsage.requestsPerPeriod * value.estimatedUsage.tokensPerRequest / 1000).toFixed(1)}K tokens)</span>
                <span className="font-medium">
                  {formatCurrency(
                    value.estimatedUsage.requestsPerPeriod *
                      value.estimatedUsage.tokensPerRequest *
                      ((value.costPerToken.input + value.costPerToken.output) / 2) / 1000,
                    value.currency
                  )}
                </span>
              </div>
            )}
            <div className="pt-2 border-t border-blue-200 dark:border-blue-500/30 flex items-center justify-between font-semibold">
              <span>Total Estimated</span>
              <span>{formatCurrency(estimatedCost, value.currency)}</span>
            </div>
          </div>
        </div>
      )}

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

export default FinancialLimits;
