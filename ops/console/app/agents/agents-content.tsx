'use client';

/**
 * AgentOS Ops Console - Agents Content
 * Complete agent management interface
 */

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Bot,
  Search,
  Filter,
  Plus,
  MoreVertical,
  Play,
  Pause,
  RefreshCw,
  Settings,
  Trash2,
  ExternalLink,
  ChevronDown,
  Grid3X3,
  List,
  SlidersHorizontal,
} from 'lucide-react';
import { cn, formatRelativeTime, formatNumber, formatCurrency, snakeToTitle } from '@/lib/utils';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/Card';
import { Button, ButtonGroup } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { AgentStatusBadge } from '@/components/ui/StatusBadge';
import { AgentAvatar } from '@/components/ui/Avatar';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Pagination,
} from '@/components/ui/Table';
import { EmptyState, NoAgents, NoSearchResults } from '@/components/ui/EmptyState';
import { ProgressBar } from '@/components/ui/Spinner';
import type { Agent, AgentStatus, AgentPack } from '@/types';

// ============================================
// Mock Data
// ============================================

const mockAgents: Agent[] = [
  {
    id: '1',
    name: 'DevOps Automation',
    slug: 'devops-automation',
    description: 'Automates CI/CD pipelines, infrastructure management, and deployment processes',
    pack: 'devops',
    status: 'active',
    version: '2.1.0',
    capabilities: [
      { id: 'deploy', name: 'Deploy', description: 'Deploy applications', requires_approval: true, risk_level: 'high' },
      { id: 'scale', name: 'Scale', description: 'Scale resources', requires_approval: true, risk_level: 'medium' },
    ],
    configuration: {} as Agent['configuration'],
    metrics: {
      total_executions: 1523,
      successful_executions: 1498,
      failed_executions: 25,
      average_duration_ms: 4500,
      tokens_consumed: 125000,
      cost_usd: 45.67,
      success_rate: 98.4,
    },
    created_at: '2024-01-15T10:30:00Z',
    updated_at: '2024-12-28T08:45:00Z',
    created_by: 'user-1',
    last_execution_at: '2024-12-28T09:15:00Z',
  },
  {
    id: '2',
    name: 'QA Test Runner',
    slug: 'qa-test-runner',
    description: 'Executes automated test suites, generates reports, and manages test environments',
    pack: 'qa',
    status: 'active',
    version: '1.8.2',
    capabilities: [],
    configuration: {} as Agent['configuration'],
    metrics: {
      total_executions: 892,
      successful_executions: 867,
      failed_executions: 25,
      average_duration_ms: 12000,
      tokens_consumed: 89000,
      cost_usd: 32.10,
      success_rate: 97.2,
    },
    created_at: '2024-02-20T14:00:00Z',
    updated_at: '2024-12-28T07:30:00Z',
    created_by: 'user-1',
    last_execution_at: '2024-12-28T09:00:00Z',
  },
  {
    id: '3',
    name: 'Research Assistant',
    slug: 'research-assistant',
    description: 'Conducts market research, competitive analysis, and trend identification',
    pack: 'research',
    status: 'active',
    version: '1.5.0',
    capabilities: [],
    configuration: {} as Agent['configuration'],
    metrics: {
      total_executions: 234,
      successful_executions: 228,
      failed_executions: 6,
      average_duration_ms: 25000,
      tokens_consumed: 450000,
      cost_usd: 89.50,
      success_rate: 97.4,
    },
    created_at: '2024-03-10T09:00:00Z',
    updated_at: '2024-12-27T16:20:00Z',
    created_by: 'user-2',
    last_execution_at: '2024-12-28T08:30:00Z',
  },
  {
    id: '4',
    name: 'Error Predictor',
    slug: 'error-predictor',
    description: 'Predicts and alerts on potential system failures using ML models',
    pack: 'error_predictor',
    status: 'error',
    version: '0.9.1',
    capabilities: [],
    configuration: {} as Agent['configuration'],
    metrics: {
      total_executions: 567,
      successful_executions: 498,
      failed_executions: 69,
      average_duration_ms: 8000,
      tokens_consumed: 78000,
      cost_usd: 28.90,
      success_rate: 87.8,
    },
    created_at: '2024-04-05T11:30:00Z',
    updated_at: '2024-12-28T09:20:00Z',
    created_by: 'user-1',
    last_execution_at: '2024-12-28T09:18:00Z',
  },
  {
    id: '5',
    name: 'Legal Document Analyzer',
    slug: 'legal-document-analyzer',
    description: 'Analyzes contracts, identifies risks, and extracts key clauses',
    pack: 'legal',
    status: 'paused',
    version: '1.2.0',
    capabilities: [],
    configuration: {} as Agent['configuration'],
    metrics: {
      total_executions: 156,
      successful_executions: 154,
      failed_executions: 2,
      average_duration_ms: 45000,
      tokens_consumed: 320000,
      cost_usd: 67.80,
      success_rate: 98.7,
    },
    created_at: '2024-05-15T08:00:00Z',
    updated_at: '2024-12-26T14:00:00Z',
    created_by: 'user-3',
    last_execution_at: '2024-12-26T13:45:00Z',
  },
  {
    id: '6',
    name: 'Mobile App Tester',
    slug: 'mobile-app-tester',
    description: 'Automated mobile app testing across iOS and Android platforms',
    pack: 'mobile',
    status: 'active',
    version: '2.0.3',
    capabilities: [],
    configuration: {} as Agent['configuration'],
    metrics: {
      total_executions: 445,
      successful_executions: 432,
      failed_executions: 13,
      average_duration_ms: 18000,
      tokens_consumed: 95000,
      cost_usd: 38.20,
      success_rate: 97.1,
    },
    created_at: '2024-06-01T10:00:00Z',
    updated_at: '2024-12-28T08:00:00Z',
    created_by: 'user-1',
    last_execution_at: '2024-12-28T07:55:00Z',
  },
  {
    id: '7',
    name: 'Analytics Reporter',
    slug: 'analytics-reporter',
    description: 'Generates automated analytics reports and insights dashboards',
    pack: 'analytics',
    status: 'active',
    version: '1.4.1',
    capabilities: [],
    configuration: {} as Agent['configuration'],
    metrics: {
      total_executions: 678,
      successful_executions: 665,
      failed_executions: 13,
      average_duration_ms: 15000,
      tokens_consumed: 145000,
      cost_usd: 52.30,
      success_rate: 98.1,
    },
    created_at: '2024-04-20T09:30:00Z',
    updated_at: '2024-12-28T06:00:00Z',
    created_by: 'user-2',
    last_execution_at: '2024-12-28T05:45:00Z',
  },
  {
    id: '8',
    name: 'Marketing Content Generator',
    slug: 'marketing-content-generator',
    description: 'Creates marketing copy, social media posts, and campaign content',
    pack: 'marketing',
    status: 'active',
    version: '1.6.0',
    capabilities: [],
    configuration: {} as Agent['configuration'],
    metrics: {
      total_executions: 389,
      successful_executions: 378,
      failed_executions: 11,
      average_duration_ms: 22000,
      tokens_consumed: 890000,
      cost_usd: 124.50,
      success_rate: 97.2,
    },
    created_at: '2024-07-10T14:00:00Z',
    updated_at: '2024-12-28T09:10:00Z',
    created_by: 'user-4',
    last_execution_at: '2024-12-28T09:05:00Z',
  },
];

const statusOptions: { value: AgentStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'stopped', label: 'Stopped' },
  { value: 'error', label: 'Error' },
];

const packOptions: { value: AgentPack | 'all'; label: string }[] = [
  { value: 'all', label: 'All Packs' },
  { value: 'devops', label: 'DevOps' },
  { value: 'qa', label: 'QA' },
  { value: 'research', label: 'Research' },
  { value: 'legal', label: 'Legal' },
  { value: 'mobile', label: 'Mobile' },
  { value: 'analytics', label: 'Analytics' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'engineering', label: 'Engineering' },
  { value: 'error_predictor', label: 'Error Predictor' },
];

// ============================================
// Agents Content Component
// ============================================

export function AgentsContent() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<AgentStatus | 'all'>('all');
  const [packFilter, setPackFilter] = useState<AgentPack | 'all'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Filter agents
  const filteredAgents = useMemo(() => {
    return mockAgents.filter((agent) => {
      const matchesSearch =
        searchQuery === '' ||
        agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.pack.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === 'all' || agent.status === statusFilter;

      const matchesPack = packFilter === 'all' || agent.pack === packFilter;

      return matchesSearch && matchesStatus && matchesPack;
    });
  }, [searchQuery, statusFilter, packFilter]);

  // Paginate agents
  const totalPages = Math.ceil(filteredAgents.length / itemsPerPage);
  const paginatedAgents = filteredAgents.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, packFilter]);

  // Stats
  const stats = useMemo(() => ({
    total: mockAgents.length,
    active: mockAgents.filter((a) => a.status === 'active').length,
    paused: mockAgents.filter((a) => a.status === 'paused').length,
    error: mockAgents.filter((a) => a.status === 'error').length,
  }), []);

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setPackFilter('all');
  };

  const hasActiveFilters = searchQuery || statusFilter !== 'all' || packFilter !== 'all';

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="page-header mb-0">
          <h1 className="page-title">Agents</h1>
          <p className="page-description">
            Manage and monitor your AI agents
          </p>
        </div>

        <Button leftIcon={<Plus className="w-4 h-4" />}>
          Deploy Agent
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Agents" value={stats.total} />
        <StatCard label="Active" value={stats.active} color="emerald" />
        <StatCard label="Paused" value={stats.paused} color="amber" />
        <StatCard label="Error" value={stats.error} color="red" />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            {/* Search */}
            <div className="flex-1 max-w-md">
              <SearchInput
                placeholder="Search agents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClear={() => setSearchQuery('')}
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as AgentStatus | 'all')}
                className="input py-2 pr-8 min-w-[140px]"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <select
                value={packFilter}
                onChange={(e) => setPackFilter(e.target.value as AgentPack | 'all')}
                className="input py-2 pr-8 min-w-[140px]"
              >
                {packOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              )}
            </div>

            {/* View Toggle */}
            <div className="flex items-center gap-1 ml-auto">
              <ButtonGroup attached>
                <Button
                  variant={viewMode === 'grid' ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid3X3 className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'table' ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                >
                  <List className="w-4 h-4" />
                </Button>
              </ButtonGroup>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {filteredAgents.length === 0 ? (
        hasActiveFilters ? (
          <NoSearchResults onAction={clearFilters} />
        ) : (
          <NoAgents onAction={() => console.log('Deploy agent')} />
        )
      ) : viewMode === 'grid' ? (
        <>
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
            {paginatedAgents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>

          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          )}
        </>
      ) : (
        <Card>
          <CardContent noPadding>
            <AgentTable agents={paginatedAgents} />
            {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============================================
// Sub-Components
// ============================================

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color?: 'emerald' | 'amber' | 'red';
}) {
  const colorStyles = {
    emerald: 'text-emerald-600 dark:text-emerald-400',
    amber: 'text-amber-600 dark:text-amber-400',
    red: 'text-red-600 dark:text-red-400',
  };

  return (
    <div className="p-4 rounded-xl bg-white dark:bg-dark-bg-elevated border border-slate-200 dark:border-dark-border-primary">
      <p className="text-sm text-slate-500 dark:text-dark-text-tertiary">{label}</p>
      <p
        className={cn(
          'text-2xl font-bold mt-1',
          color
            ? colorStyles[color]
            : 'text-slate-900 dark:text-dark-text-primary'
        )}
      >
        {value}
      </p>
    </div>
  );
}

function AgentCard({ agent }: { agent: Agent }) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <Card className="card-hover">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <AgentAvatar pack={agent.pack} size="lg" />
            <div>
              <Link
                href={`/agents/${agent.slug}`}
                className="text-lg font-semibold text-slate-900 dark:text-dark-text-primary hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
              >
                {agent.name}
              </Link>
              <p className="text-sm text-slate-500 dark:text-dark-text-tertiary">
                v{agent.version}
              </p>
            </div>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 text-slate-400 hover:text-slate-600 dark:text-dark-text-muted dark:hover:text-dark-text-secondary rounded-lg hover:bg-slate-100 dark:hover:bg-dark-bg-tertiary transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMenu && (
              <AgentMenu
                agent={agent}
                onClose={() => setShowMenu(false)}
              />
            )}
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center gap-2 mb-4">
          <AgentStatusBadge status={agent.status} />
          <Badge variant="outline" size="sm">
            {snakeToTitle(agent.pack)}
          </Badge>
        </div>

        {/* Description */}
        <p className="text-sm text-slate-600 dark:text-dark-text-secondary line-clamp-2 mb-4">
          {agent.description}
        </p>

        {/* Metrics */}
        <div className="space-y-3 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500 dark:text-dark-text-tertiary">
              Success Rate
            </span>
            <span className="font-medium text-slate-900 dark:text-dark-text-primary">
              {agent.metrics.success_rate}%
            </span>
          </div>
          <ProgressBar
            value={agent.metrics.success_rate}
            size="sm"
            variant={
              agent.metrics.success_rate >= 95
                ? 'success'
                : agent.metrics.success_rate >= 80
                  ? 'warning'
                  : 'error'
            }
          />

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-500 dark:text-dark-text-tertiary">
                Executions
              </p>
              <p className="font-medium text-slate-900 dark:text-dark-text-primary">
                {formatNumber(agent.metrics.total_executions)}
              </p>
            </div>
            <div>
              <p className="text-slate-500 dark:text-dark-text-tertiary">
                Cost (30d)
              </p>
              <p className="font-medium text-slate-900 dark:text-dark-text-primary">
                {formatCurrency(agent.metrics.cost_usd)}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-100 dark:border-dark-border-primary">
          <p className="text-xs text-slate-400 dark:text-dark-text-muted">
            Last active {formatRelativeTime(agent.last_execution_at || agent.updated_at)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function AgentTable({ agents }: { agents: Agent[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Agent</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Pack</TableHead>
          <TableHead>Success Rate</TableHead>
          <TableHead>Executions</TableHead>
          <TableHead>Cost</TableHead>
          <TableHead>Last Active</TableHead>
          <TableHead className="w-12"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {agents.map((agent) => (
          <TableRow key={agent.id}>
            <TableCell>
              <div className="flex items-center gap-3">
                <AgentAvatar pack={agent.pack} size="sm" />
                <div>
                  <Link
                    href={`/agents/${agent.slug}`}
                    className="font-medium text-slate-900 dark:text-dark-text-primary hover:text-brand-600 dark:hover:text-brand-400"
                  >
                    {agent.name}
                  </Link>
                  <p className="text-xs text-slate-500 dark:text-dark-text-tertiary">
                    v{agent.version}
                  </p>
                </div>
              </div>
            </TableCell>
            <TableCell>
              <AgentStatusBadge status={agent.status} size="sm" />
            </TableCell>
            <TableCell>
              <Badge variant="outline" size="sm">
                {snakeToTitle(agent.pack)}
              </Badge>
            </TableCell>
            <TableCell>
              <span
                className={cn(
                  'font-medium',
                  agent.metrics.success_rate >= 95
                    ? 'text-emerald-600'
                    : agent.metrics.success_rate >= 80
                      ? 'text-amber-600'
                      : 'text-red-600'
                )}
              >
                {agent.metrics.success_rate}%
              </span>
            </TableCell>
            <TableCell>{formatNumber(agent.metrics.total_executions)}</TableCell>
            <TableCell>{formatCurrency(agent.metrics.cost_usd)}</TableCell>
            <TableCell className="text-slate-500 dark:text-dark-text-tertiary">
              {formatRelativeTime(agent.last_execution_at || agent.updated_at)}
            </TableCell>
            <TableCell>
              <button className="p-1 text-slate-400 hover:text-slate-600 dark:text-dark-text-muted dark:hover:text-dark-text-secondary rounded">
                <MoreVertical className="w-4 h-4" />
              </button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function AgentMenu({
  agent,
  onClose,
}: {
  agent: Agent;
  onClose: () => void;
}) {
  React.useEffect(() => {
    const handleClickOutside = () => onClose();
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [onClose]);

  return (
    <div
      className="dropdown-menu right-0 top-full mt-1 w-48"
      onClick={(e) => e.stopPropagation()}
    >
      <ul className="py-1">
        <li>
          <Link href={`/agents/${agent.slug}`} className="dropdown-item">
            <ExternalLink className="w-4 h-4" />
            <span>View Details</span>
          </Link>
        </li>
        <li>
          <button className="dropdown-item w-full">
            {agent.status === 'active' ? (
              <>
                <Pause className="w-4 h-4" />
                <span>Pause Agent</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>Start Agent</span>
              </>
            )}
          </button>
        </li>
        <li>
          <button className="dropdown-item w-full">
            <RefreshCw className="w-4 h-4" />
            <span>Restart Agent</span>
          </button>
        </li>
        <li>
          <Link href={`/agents/${agent.slug}/settings`} className="dropdown-item">
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </Link>
        </li>
      </ul>
      <div className="dropdown-divider" />
      <ul className="py-1">
        <li>
          <button className="dropdown-item danger w-full">
            <Trash2 className="w-4 h-4" />
            <span>Delete Agent</span>
          </button>
        </li>
      </ul>
    </div>
  );
}

export default AgentsContent;
