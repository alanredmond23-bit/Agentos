/**
 * AgentOS Ops Console - Cost Data Hook
 * Data fetching and state management for cost tracking
 */

import { useState, useMemo, useCallback } from 'react';
import type { AgentPack } from '@/types';

// ============================================
// Types
// ============================================

export type TimePeriod = '24h' | '7d' | '30d' | '90d' | 'custom';
export type CostCategory = 'tokens' | 'compute' | 'storage' | 'api' | 'other';

export interface CostEntry {
  id: string;
  timestamp: string;
  agent_id: string;
  agent_name: string;
  pack: AgentPack;
  category: CostCategory;
  amount_usd: number;
  tokens_used: number;
  execution_id: string;
  description: string;
}

export interface CostSummary {
  total: number;
  previous_total: number;
  change_percentage: number;
  by_category: Record<CostCategory, number>;
  by_pack: Record<string, number>;
  by_agent: { agent_id: string; agent_name: string; amount: number }[];
}

export interface TimeSeriesPoint {
  date: string;
  amount: number;
  tokens: number;
}

export interface Budget {
  id: string;
  name: string;
  amount: number;
  spent: number;
  period: 'daily' | 'weekly' | 'monthly';
  category?: CostCategory;
  pack?: AgentPack;
  alert_threshold: number;
  created_at: string;
}

export interface CostFilters {
  period: TimePeriod;
  startDate?: string;
  endDate?: string;
  categories: CostCategory[];
  packs: AgentPack[];
  search: string;
}

// ============================================
// Mock Data Generator
// ============================================

const generateMockCostData = (): {
  entries: CostEntry[];
  summary: CostSummary;
  timeSeries: TimeSeriesPoint[];
  budgets: Budget[];
} => {
  const packs: AgentPack[] = ['devops', 'qa', 'research', 'legal', 'analytics', 'marketing'];
  const categories: CostCategory[] = ['tokens', 'compute', 'storage', 'api', 'other'];
  const agents = [
    { id: '1', name: 'DevOps Automation', pack: 'devops' as AgentPack },
    { id: '2', name: 'QA Test Runner', pack: 'qa' as AgentPack },
    { id: '3', name: 'Research Assistant', pack: 'research' as AgentPack },
    { id: '4', name: 'Legal Analyzer', pack: 'legal' as AgentPack },
    { id: '5', name: 'Analytics Reporter', pack: 'analytics' as AgentPack },
    { id: '6', name: 'Marketing Generator', pack: 'marketing' as AgentPack },
  ];

  // Generate entries
  const entries: CostEntry[] = [];
  const now = new Date();
  for (let i = 0; i < 100; i++) {
    const agent = agents[Math.floor(Math.random() * agents.length)]!;
    const date = new Date(now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000);
    entries.push({
      id: `entry-${i}`,
      timestamp: date.toISOString(),
      agent_id: agent.id,
      agent_name: agent.name,
      pack: agent.pack,
      category: categories[Math.floor(Math.random() * categories.length)]!,
      amount_usd: Math.random() * 10 + 0.5,
      tokens_used: Math.floor(Math.random() * 50000) + 1000,
      execution_id: `exec-${i}`,
      description: `Execution #${i + 1}`,
    });
  }

  // Calculate summary
  const total = entries.reduce((sum, e) => sum + e.amount_usd, 0);
  const byCategory = categories.reduce((acc, cat) => {
    acc[cat] = entries.filter(e => e.category === cat).reduce((s, e) => s + e.amount_usd, 0);
    return acc;
  }, {} as Record<CostCategory, number>);

  const byPack = packs.reduce((acc, pack) => {
    acc[pack] = entries.filter(e => e.pack === pack).reduce((s, e) => s + e.amount_usd, 0);
    return acc;
  }, {} as Record<string, number>);

  const byAgent = agents.map(agent => ({
    agent_id: agent.id,
    agent_name: agent.name,
    amount: entries.filter(e => e.agent_id === agent.id).reduce((s, e) => s + e.amount_usd, 0),
  })).sort((a, b) => b.amount - a.amount);

  const summary: CostSummary = {
    total,
    previous_total: total * 0.85,
    change_percentage: 17.6,
    by_category: byCategory,
    by_pack: byPack,
    by_agent: byAgent,
  };

  // Generate time series
  const timeSeries: TimeSeriesPoint[] = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    timeSeries.push({
      date: date.toISOString().split('T')[0]!,
      amount: Math.random() * 50 + 20,
      tokens: Math.floor(Math.random() * 100000) + 20000,
    });
  }

  // Budgets
  const budgets: Budget[] = [
    { id: '1', name: 'Monthly Total', amount: 1000, spent: 456.78, period: 'monthly', alert_threshold: 80, created_at: '2024-12-01' },
    { id: '2', name: 'DevOps Daily', amount: 50, spent: 32.50, period: 'daily', pack: 'devops', alert_threshold: 90, created_at: '2024-12-15' },
    { id: '3', name: 'Token Budget', amount: 500, spent: 289.30, period: 'weekly', category: 'tokens', alert_threshold: 75, created_at: '2024-12-10' },
  ];

  return { entries, summary, timeSeries, budgets };
};

// ============================================
// Hook
// ============================================

export function useCostData() {
  const [filters, setFilters] = useState<CostFilters>({
    period: '30d',
    categories: [],
    packs: [],
    search: '',
  });
  const [loading, setLoading] = useState(false);

  const mockData = useMemo(() => generateMockCostData(), []);

  const filteredEntries = useMemo(() => {
    return mockData.entries.filter(entry => {
      if (filters.categories.length && !filters.categories.includes(entry.category)) return false;
      if (filters.packs.length && !filters.packs.includes(entry.pack)) return false;
      if (filters.search && !entry.agent_name.toLowerCase().includes(filters.search.toLowerCase())) return false;
      return true;
    });
  }, [mockData.entries, filters]);

  const updateFilters = useCallback((updates: Partial<CostFilters>) => {
    setFilters(prev => ({ ...prev, ...updates }));
  }, []);

  const refreshData = useCallback(async () => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setLoading(false);
  }, []);

  return {
    entries: filteredEntries,
    summary: mockData.summary,
    timeSeries: mockData.timeSeries,
    budgets: mockData.budgets,
    filters,
    updateFilters,
    loading,
    refreshData,
  };
}

export default useCostData;
