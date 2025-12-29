/**
 * AgentOS Ops Console - Cost Overview Component
 * Summary cards for cost metrics
 */

'use client';

import React from 'react';
import { DollarSign, TrendingUp, TrendingDown, Zap, Database, Server } from 'lucide-react';
import { cn, formatCurrency, formatPercentage, formatCompactNumber } from '@/lib/utils';
import { StatsCard } from '@/components/ui/StatsCard';
import type { CostSummary, TimeSeriesPoint } from './useCostData';

// ============================================
// Types
// ============================================

interface CostOverviewProps {
  summary: CostSummary;
  timeSeries: TimeSeriesPoint[];
  loading?: boolean;
}

// ============================================
// Component
// ============================================

export function CostOverview({ summary, timeSeries, loading = false }: CostOverviewProps) {
  const sparklineData = timeSeries.map(p => p.amount);
  const tokenSparkline = timeSeries.map(p => p.tokens);

  const totalTokens = timeSeries.reduce((sum, p) => sum + p.tokens, 0);
  const avgDailyCost = summary.total / 30;
  const projectedMonthly = avgDailyCost * 30;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatsCard
        title="Total Spend (30d)"
        value={summary.total}
        previousValue={summary.previous_total}
        format="currency"
        icon={<DollarSign className="w-5 h-5" />}
        sparkline={sparklineData}
        loading={loading}
      />

      <StatsCard
        title="Daily Average"
        value={avgDailyCost}
        format="currency"
        icon={<TrendingUp className="w-5 h-5" />}
        trend={{
          value: summary.change_percentage,
          direction: summary.change_percentage > 0 ? 'up' : 'down',
          label: 'vs last period',
        }}
        loading={loading}
      />

      <StatsCard
        title="Tokens Used"
        value={totalTokens}
        format="compact"
        icon={<Zap className="w-5 h-5" />}
        sparkline={tokenSparkline}
        loading={loading}
      />

      <StatsCard
        title="Projected Monthly"
        value={projectedMonthly}
        format="currency"
        icon={<Server className="w-5 h-5" />}
        footer={
          <p className="text-xs text-slate-500 dark:text-dark-text-tertiary">
            Based on current usage
          </p>
        }
        loading={loading}
      />
    </div>
  );
}

// ============================================
// Mini Cost Cards
// ============================================

interface MiniCostCardsProps {
  summary: CostSummary;
}

export function MiniCostCards({ summary }: MiniCostCardsProps) {
  const categories = [
    { key: 'tokens', label: 'Tokens', icon: Zap, color: 'text-blue-500' },
    { key: 'compute', label: 'Compute', icon: Server, color: 'text-purple-500' },
    { key: 'storage', label: 'Storage', icon: Database, color: 'text-emerald-500' },
  ] as const;

  return (
    <div className="grid grid-cols-3 gap-3">
      {categories.map(({ key, label, icon: Icon, color }) => (
        <div
          key={key}
          className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-dark-bg-tertiary"
        >
          <div className={cn('p-2 rounded-md bg-white dark:bg-dark-bg-elevated shadow-sm', color)}>
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-dark-text-tertiary">{label}</p>
            <p className="text-sm font-semibold text-slate-900 dark:text-dark-text-primary">
              {formatCurrency(summary.by_category[key] || 0)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default CostOverview;
