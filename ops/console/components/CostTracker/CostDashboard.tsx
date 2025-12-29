/**
 * AgentOS Ops Console - Cost Dashboard Component
 * Main container for cost tracking UI
 */

'use client';

import React, { useState } from 'react';
import { cn, snakeToTitle } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/Card';
import { Button, ButtonGroup } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import {
  DollarSign,
  Calendar,
  Filter,
  Download,
  RefreshCw,
  X,
} from 'lucide-react';

import { CostOverview } from './CostOverview';
import { CostChart } from './CostChart';
import { CostBreakdown } from './CostBreakdown';
import { CostTable } from './CostTable';
import { BudgetManager } from './BudgetManager';
import { useCostData, type TimePeriod, type CostCategory } from './useCostData';
import type { AgentPack } from '@/types';

// ============================================
// Types
// ============================================

type DashboardTab = 'overview' | 'details' | 'budgets';

const periodOptions: { value: TimePeriod; label: string }[] = [
  { value: '24h', label: '24 Hours' },
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: '90d', label: '90 Days' },
];

const categoryOptions: CostCategory[] = ['tokens', 'compute', 'storage', 'api', 'other'];
const packOptions: AgentPack[] = ['devops', 'qa', 'research', 'legal', 'analytics', 'marketing'];

// ============================================
// Component
// ============================================

export function CostDashboard() {
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [showFilters, setShowFilters] = useState(false);

  const {
    entries,
    summary,
    timeSeries,
    budgets,
    filters,
    updateFilters,
    loading,
    refreshData,
  } = useCostData();

  const hasActiveFilters = filters.categories.length > 0 || filters.packs.length > 0 || filters.search;

  const clearFilters = () => {
    updateFilters({ categories: [], packs: [], search: '' });
  };

  const toggleCategory = (category: CostCategory) => {
    const newCategories = filters.categories.includes(category)
      ? filters.categories.filter(c => c !== category)
      : [...filters.categories, category];
    updateFilters({ categories: newCategories });
  };

  const togglePack = (pack: AgentPack) => {
    const newPacks = filters.packs.includes(pack)
      ? filters.packs.filter(p => p !== pack)
      : [...filters.packs, pack];
    updateFilters({ packs: newPacks });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="page-header mb-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-brand-100 dark:bg-brand-500/20">
              <DollarSign className="w-6 h-6 text-brand-600 dark:text-brand-400" />
            </div>
            <div>
              <h1 className="page-title">Cost Tracker</h1>
              <p className="page-description">Monitor and manage agent spending</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />}
            onClick={refreshData}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button variant="secondary" size="sm" leftIcon={<Download className="w-4 h-4" />}>
            Export
          </Button>
        </div>
      </div>

      {/* Tab Navigation & Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            {/* Tabs */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-dark-bg-tertiary rounded-lg">
              {(['overview', 'details', 'budgets'] as DashboardTab[]).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    'px-4 py-2 text-sm font-medium rounded-md transition-colors capitalize',
                    activeTab === tab
                      ? 'bg-white dark:bg-dark-bg-elevated text-slate-900 dark:text-dark-text-primary shadow-sm'
                      : 'text-slate-600 dark:text-dark-text-secondary hover:text-slate-900 dark:hover:text-dark-text-primary'
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Period Selector */}
            <ButtonGroup attached>
              {periodOptions.map(option => (
                <Button
                  key={option.value}
                  variant={filters.period === option.value ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => updateFilters({ period: option.value })}
                >
                  {option.label}
                </Button>
              ))}
            </ButtonGroup>

            {/* Search & Filter Toggle */}
            <div className="flex items-center gap-2 ml-auto">
              {activeTab !== 'budgets' && (
                <>
                  <SearchInput
                    placeholder="Search agents..."
                    value={filters.search}
                    onChange={(e) => updateFilters({ search: e.target.value })}
                    onClear={() => updateFilters({ search: '' })}
                    className="w-48"
                  />
                  <Button
                    variant={showFilters ? 'primary' : 'secondary'}
                    size="sm"
                    leftIcon={<Filter className="w-4 h-4" />}
                    onClick={() => setShowFilters(!showFilters)}
                  >
                    Filters
                    {hasActiveFilters && (
                      <Badge variant="primary" size="sm" className="ml-1">
                        {filters.categories.length + filters.packs.length}
                      </Badge>
                    )}
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Expanded Filters */}
          {showFilters && activeTab !== 'budgets' && (
            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-dark-border-primary">
              <div className="flex flex-wrap gap-4">
                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-dark-text-tertiary mb-2">
                    Categories
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {categoryOptions.map(category => (
                      <Badge
                        key={category}
                        variant={filters.categories.includes(category) ? 'primary' : 'outline'}
                        className="cursor-pointer capitalize"
                        onClick={() => toggleCategory(category)}
                      >
                        {category}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-dark-text-tertiary mb-2">
                    Packs
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {packOptions.map(pack => (
                      <Badge
                        key={pack}
                        variant={filters.packs.includes(pack) ? 'secondary' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => togglePack(pack)}
                      >
                        {snakeToTitle(pack)}
                      </Badge>
                    ))}
                  </div>
                </div>

                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="self-end">
                    <X className="w-4 h-4 mr-1" />
                    Clear all
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <CostOverview summary={summary} timeSeries={timeSeries} loading={loading} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <CostChart data={timeSeries} loading={loading} />
            </div>
            <div>
              <CostBreakdown summary={summary} loading={loading} />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'details' && <CostTable entries={entries} loading={loading} />}

      {activeTab === 'budgets' && (
        <BudgetManager
          budgets={budgets}
          onCreateBudget={(data) => console.log('Create budget:', data)}
          onUpdateBudget={(id, updates) => console.log('Update budget:', id, updates)}
          onDeleteBudget={(id) => console.log('Delete budget:', id)}
          loading={loading}
        />
      )}
    </div>
  );
}

export default CostDashboard;
