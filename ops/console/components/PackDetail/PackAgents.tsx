/**
 * AgentOS Ops Console - Pack Agents Component
 * Displays list of agents belonging to a pack with filtering and actions
 */

'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Bot,
  Search,
  Filter,
  MoreVertical,
  Play,
  Pause,
  RefreshCw,
  Settings,
  ExternalLink,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  CheckCircle,
  AlertCircle,
  PauseCircle,
  XCircle,
  ChevronDown,
  Eye,
} from 'lucide-react';
import { cn, formatNumber, formatPercentage } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { SearchInput } from '@/components/ui/Input';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/Table';
import { EmptyState, NoSearchResults } from '@/components/ui/EmptyState';
import { ProgressBar } from '@/components/ui/Spinner';
import { AgentQuickView, AgentHoverCard } from './AgentQuickView';
import type { PackAgent } from './PackDetail';

// ============================================
// Type Definitions
// ============================================

interface PackAgentsProps {
  agents: PackAgent[];
  packSlug: string;
}

type AuthorityLevel = PackAgent['authorityLevel'];
type AgentStatus = PackAgent['status'];

// ============================================
// Authority Level Badge Component
// ============================================

function AuthorityBadge({ level }: { level: AuthorityLevel }) {
  const config: Record<
    AuthorityLevel,
    { icon: React.ElementType; variant: 'default' | 'warning' | 'error' | 'info'; label: string }
  > = {
    read: {
      icon: ShieldOff,
      variant: 'default',
      label: 'Read',
    },
    write: {
      icon: Shield,
      variant: 'info',
      label: 'Write',
    },
    admin: {
      icon: ShieldCheck,
      variant: 'warning',
      label: 'Admin',
    },
    system: {
      icon: ShieldAlert,
      variant: 'error',
      label: 'System',
    },
  };

  const { icon: Icon, variant, label } = config[level];

  return (
    <Badge variant={variant} size="sm">
      <Icon className="w-3 h-3 mr-1" />
      {label}
    </Badge>
  );
}

// ============================================
// Agent Status Badge Component
// ============================================

function StatusBadge({ status }: { status: AgentStatus }) {
  const config: Record<
    AgentStatus,
    { icon: React.ElementType; variant: 'success' | 'warning' | 'error' | 'default'; label: string }
  > = {
    active: {
      icon: CheckCircle,
      variant: 'success',
      label: 'Active',
    },
    paused: {
      icon: PauseCircle,
      variant: 'warning',
      label: 'Paused',
    },
    stopped: {
      icon: XCircle,
      variant: 'default',
      label: 'Stopped',
    },
    error: {
      icon: AlertCircle,
      variant: 'error',
      label: 'Error',
    },
  };

  const { icon: Icon, variant, label } = config[status];

  return (
    <Badge variant={variant} size="sm" dot dotColor={variant}>
      {label}
    </Badge>
  );
}

// ============================================
// Agent Row Actions Menu
// ============================================

interface AgentActionsMenuProps {
  agent: PackAgent;
  packSlug: string;
  onClose: () => void;
}

function AgentActionsMenu({ agent, packSlug, onClose }: AgentActionsMenuProps) {
  React.useEffect(() => {
    const handleClickOutside = () => onClose();
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [onClose]);

  return (
    <div
      className="dropdown-menu right-0 top-full mt-1 w-44"
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
            <span>Restart</span>
          </button>
        </li>
        <li>
          <Link href={`/agents/${agent.slug}/settings`} className="dropdown-item">
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </Link>
        </li>
      </ul>
    </div>
  );
}

// ============================================
// Agent Card Component (Grid View)
// ============================================

interface AgentCardProps {
  agent: PackAgent;
  packSlug: string;
  onQuickView: (agent: PackAgent) => void;
}

function AgentCard({ agent, packSlug, onQuickView }: AgentCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <AgentHoverCard agent={agent}>
      <Card className="card-hover">
        <CardContent className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <Link
                  href={`/studio/agents/${agent.slug}`}
                  className="font-semibold text-slate-900 dark:text-dark-text-primary hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                >
                  {agent.name}
                </Link>
                <p className="text-xs text-slate-500 dark:text-dark-text-tertiary">
                  v{agent.version}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Quick View Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onQuickView(agent);
                }}
                className="p-1.5 text-slate-400 hover:text-brand-600 dark:text-dark-text-muted dark:hover:text-brand-400 rounded-lg hover:bg-slate-100 dark:hover:bg-dark-bg-tertiary transition-colors"
                aria-label="Quick view"
              >
                <Eye className="w-4 h-4" />
              </button>

              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(!showMenu);
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:text-dark-text-muted dark:hover:text-dark-text-secondary rounded-lg hover:bg-slate-100 dark:hover:bg-dark-bg-tertiary transition-colors"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
                {showMenu && (
                  <AgentActionsMenu
                    agent={agent}
                    packSlug={packSlug}
                    onClose={() => setShowMenu(false)}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Status & Authority */}
          <div className="flex items-center gap-2 mb-3">
            <StatusBadge status={agent.status} />
            <AuthorityBadge level={agent.authorityLevel} />
          </div>

          {/* Description */}
          <p className="text-sm text-slate-600 dark:text-dark-text-secondary line-clamp-2 mb-4">
            {agent.description}
          </p>

          {/* Role Badge */}
          <div className="mb-4">
            <Badge variant="outline" size="sm">
              {agent.role.charAt(0).toUpperCase() + agent.role.slice(1)}
            </Badge>
          </div>

          {/* Metrics */}
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 dark:text-dark-text-tertiary">
                Success Rate
              </span>
              <span
                className={cn(
                  'font-medium',
                  agent.successRate >= 98
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : agent.successRate >= 95
                      ? 'text-blue-600 dark:text-blue-400'
                      : agent.successRate >= 90
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-red-600 dark:text-red-400'
                )}
              >
                {formatPercentage(agent.successRate)}
              </span>
            </div>
            <ProgressBar
              value={agent.successRate}
              size="sm"
              variant={
                agent.successRate >= 95
                  ? 'success'
                  : agent.successRate >= 90
                    ? 'warning'
                    : 'error'
              }
            />

            <div className="flex justify-between text-sm pt-2">
              <span className="text-slate-500 dark:text-dark-text-tertiary">
                Executions
              </span>
              <span className="font-medium text-slate-900 dark:text-dark-text-primary">
                {formatNumber(agent.executionCount)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </AgentHoverCard>
  );
}

// ============================================
// Pack Agents Component
// ============================================

export function PackAgents({ agents, packSlug }: PackAgentsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<AgentStatus | 'all'>('all');
  const [authorityFilter, setAuthorityFilter] = useState<AuthorityLevel | 'all'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [quickViewAgent, setQuickViewAgent] = useState<PackAgent | null>(null);

  // Filter agents
  const filteredAgents = useMemo(() => {
    return agents.filter((agent) => {
      const matchesSearch =
        searchQuery === '' ||
        agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        agent.role.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'all' || agent.status === statusFilter;
      const matchesAuthority =
        authorityFilter === 'all' || agent.authorityLevel === authorityFilter;

      return matchesSearch && matchesStatus && matchesAuthority;
    });
  }, [agents, searchQuery, statusFilter, authorityFilter]);

  const hasActiveFilters =
    searchQuery !== '' || statusFilter !== 'all' || authorityFilter !== 'all';

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setAuthorityFilter('all');
  };

  const statusOptions: { value: AgentStatus | 'all'; label: string }[] = [
    { value: 'all', label: 'All Statuses' },
    { value: 'active', label: 'Active' },
    { value: 'paused', label: 'Paused' },
    { value: 'stopped', label: 'Stopped' },
    { value: 'error', label: 'Error' },
  ];

  const authorityOptions: { value: AuthorityLevel | 'all'; label: string }[] = [
    { value: 'all', label: 'All Levels' },
    { value: 'read', label: 'Read' },
    { value: 'write', label: 'Write' },
    { value: 'admin', label: 'Admin' },
    { value: 'system', label: 'System' },
  ];

  return (
    <div className="space-y-6">
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
                value={authorityFilter}
                onChange={(e) => setAuthorityFilter(e.target.value as AuthorityLevel | 'all')}
                className="input py-2 pr-8 min-w-[140px]"
              >
                {authorityOptions.map((option) => (
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
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {filteredAgents.length === 0 ? (
        hasActiveFilters ? (
          <NoSearchResults onAction={clearFilters} />
        ) : (
          <EmptyState
            variant="no-agents"
            title="No agents in this pack"
            description="This pack doesn't contain any agents yet."
          />
        )
      ) : (
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {filteredAgents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              packSlug={packSlug}
              onQuickView={setQuickViewAgent}
            />
          ))}
        </div>
      )}

      {/* Agent Quick View Modal */}
      {quickViewAgent && (
        <AgentQuickView
          agent={quickViewAgent}
          isOpen={!!quickViewAgent}
          onClose={() => setQuickViewAgent(null)}
          packSlug={packSlug}
        />
      )}

      {/* Summary Stats */}
      {filteredAgents.length > 0 && (
        <div className="flex items-center justify-between text-sm text-slate-500 dark:text-dark-text-tertiary pt-4 border-t border-slate-200 dark:border-dark-border-primary">
          <span>
            Showing {filteredAgents.length} of {agents.length} agents
          </span>
          <div className="flex items-center gap-4">
            <span>
              {agents.filter((a) => a.status === 'active').length} active
            </span>
            <span>
              Avg. success rate:{' '}
              {formatPercentage(
                filteredAgents.reduce((sum, a) => sum + a.successRate, 0) /
                  filteredAgents.length
              )}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default PackAgents;
