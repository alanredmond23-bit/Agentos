/**
 * AgentOS Ops Console - Cost Breakdown Component
 * Category and agent cost distribution
 */

'use client';

import React, { useState } from 'react';
import { cn, formatCurrency, formatPercentage, snakeToTitle } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button, ButtonGroup } from '@/components/ui/Button';
import { AgentAvatar } from '@/components/ui/Avatar';
import { Zap, Server, Database, Globe, MoreHorizontal, PieChart, List } from 'lucide-react';
import type { CostSummary, CostCategory } from './useCostData';
import type { AgentPack } from '@/types';

// ============================================
// Types
// ============================================

interface CostBreakdownProps {
  summary: CostSummary;
  loading?: boolean;
}

type BreakdownView = 'category' | 'pack' | 'agent';

// ============================================
// Category Icons
// ============================================

const categoryIcons: Record<CostCategory, React.ReactNode> = {
  tokens: <Zap className="w-4 h-4" />,
  compute: <Server className="w-4 h-4" />,
  storage: <Database className="w-4 h-4" />,
  api: <Globe className="w-4 h-4" />,
  other: <MoreHorizontal className="w-4 h-4" />,
};

const categoryColors: Record<CostCategory, string> = {
  tokens: 'bg-blue-500',
  compute: 'bg-purple-500',
  storage: 'bg-emerald-500',
  api: 'bg-amber-500',
  other: 'bg-slate-400',
};

// ============================================
// Component
// ============================================

export function CostBreakdown({ summary, loading = false }: CostBreakdownProps) {
  const [view, setView] = useState<BreakdownView>('category');

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cost Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="skeleton h-12 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        action={
          <ButtonGroup attached>
            <Button
              variant={view === 'category' ? 'primary' : 'secondary'}
              size="xs"
              onClick={() => setView('category')}
            >
              Category
            </Button>
            <Button
              variant={view === 'pack' ? 'primary' : 'secondary'}
              size="xs"
              onClick={() => setView('pack')}
            >
              Pack
            </Button>
            <Button
              variant={view === 'agent' ? 'primary' : 'secondary'}
              size="xs"
              onClick={() => setView('agent')}
            >
              Agent
            </Button>
          </ButtonGroup>
        }
      >
        <CardTitle>Cost Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        {view === 'category' && <CategoryBreakdown summary={summary} />}
        {view === 'pack' && <PackBreakdown summary={summary} />}
        {view === 'agent' && <AgentBreakdown summary={summary} />}
      </CardContent>
    </Card>
  );
}

// ============================================
// Category Breakdown
// ============================================

function CategoryBreakdown({ summary }: { summary: CostSummary }) {
  const categories = Object.entries(summary.by_category)
    .map(([category, amount]) => ({ category: category as CostCategory, amount }))
    .sort((a, b) => b.amount - a.amount);

  const maxAmount = Math.max(...categories.map(c => c.amount));

  return (
    <div className="space-y-3">
      {categories.map(({ category, amount }) => {
        const percentage = (amount / summary.total) * 100;
        const barWidth = (amount / maxAmount) * 100;

        return (
          <div key={category} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={cn('p-1.5 rounded', categoryColors[category], 'bg-opacity-20')}>
                  <span className={cn('text-current', categoryColors[category].replace('bg-', 'text-'))}>
                    {categoryIcons[category]}
                  </span>
                </div>
                <span className="text-sm font-medium text-slate-700 dark:text-dark-text-secondary capitalize">
                  {category}
                </span>
              </div>
              <div className="text-right">
                <span className="text-sm font-semibold text-slate-900 dark:text-dark-text-primary">
                  {formatCurrency(amount)}
                </span>
                <span className="text-xs text-slate-500 dark:text-dark-text-tertiary ml-2">
                  {formatPercentage(percentage)}
                </span>
              </div>
            </div>
            <div className="h-2 bg-slate-100 dark:bg-dark-bg-tertiary rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all duration-300', categoryColors[category])}
                style={{ width: `${barWidth}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================
// Pack Breakdown
// ============================================

const packColors: Record<string, string> = {
  devops: 'bg-blue-500',
  qa: 'bg-green-500',
  research: 'bg-purple-500',
  legal: 'bg-amber-500',
  analytics: 'bg-cyan-500',
  marketing: 'bg-pink-500',
};

function PackBreakdown({ summary }: { summary: CostSummary }) {
  const packs = Object.entries(summary.by_pack)
    .map(([pack, amount]) => ({ pack: pack as AgentPack, amount }))
    .filter(p => p.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  const maxAmount = Math.max(...packs.map(p => p.amount));

  return (
    <div className="space-y-3">
      {packs.map(({ pack, amount }) => {
        const percentage = (amount / summary.total) * 100;
        const barWidth = (amount / maxAmount) * 100;

        return (
          <div key={pack} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AgentAvatar pack={pack} size="sm" />
                <span className="text-sm font-medium text-slate-700 dark:text-dark-text-secondary">
                  {snakeToTitle(pack)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-sm font-semibold text-slate-900 dark:text-dark-text-primary">
                  {formatCurrency(amount)}
                </span>
                <span className="text-xs text-slate-500 dark:text-dark-text-tertiary ml-2">
                  {formatPercentage(percentage)}
                </span>
              </div>
            </div>
            <div className="h-2 bg-slate-100 dark:bg-dark-bg-tertiary rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all duration-300', packColors[pack] || 'bg-slate-400')}
                style={{ width: `${barWidth}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================
// Agent Breakdown
// ============================================

function AgentBreakdown({ summary }: { summary: CostSummary }) {
  const agents = summary.by_agent.slice(0, 5);
  const maxAmount = Math.max(...agents.map(a => a.amount));

  return (
    <div className="space-y-3">
      {agents.map((agent, index) => {
        const percentage = (agent.amount / summary.total) * 100;
        const barWidth = (agent.amount / maxAmount) * 100;

        return (
          <div key={agent.agent_id} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-400 w-4">#{index + 1}</span>
                <span className="text-sm font-medium text-slate-700 dark:text-dark-text-secondary truncate max-w-[150px]">
                  {agent.agent_name}
                </span>
              </div>
              <div className="text-right">
                <span className="text-sm font-semibold text-slate-900 dark:text-dark-text-primary">
                  {formatCurrency(agent.amount)}
                </span>
                <span className="text-xs text-slate-500 dark:text-dark-text-tertiary ml-2">
                  {formatPercentage(percentage)}
                </span>
              </div>
            </div>
            <div className="h-2 bg-slate-100 dark:bg-dark-bg-tertiary rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-brand-500 transition-all duration-300"
                style={{ width: `${barWidth}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default CostBreakdown;
