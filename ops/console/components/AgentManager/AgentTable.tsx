/**
 * AgentOS Studio - Agent Table Component
 * Sortable data table with selection for agent management
 * Features: Sticky header, zebra striping, purple accent for Studio
 */

'use client';

import React, { useCallback } from 'react';
import Link from 'next/link';
import { cn, formatRelativeTime, toTitleCase, formatCompactNumber } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { AgentAvatar } from '@/components/ui/Avatar';
import { AgentActions } from './AgentActions';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell
} from '@/components/ui/Table';
import type { AgentPack } from '@/types';
import {
  CheckSquare,
  Square,
  MinusSquare,
  Shield,
  Users,
  Wrench,
  Eye,
  ExternalLink
} from 'lucide-react';

// ============================================
// Types
// ============================================

export type AuthorityLevel = 'operator' | 'manager' | 'worker' | 'observer';
export type SortField = 'name' | 'pack' | 'authority' | 'status' | 'lastModified' | 'executionCount' | 'version';
export type SortDirection = 'asc' | 'desc';

export interface StudioAgent {
  id: string;
  name: string;
  role: string;
  pack: AgentPack;
  authority: AuthorityLevel;
  status: 'active' | 'inactive';
  lastModified: string;
  version: string;
  description: string;
  capabilities: string[];
  createdAt: string;
  executionCount: number;
}

interface AgentTableProps {
  agents: StudioAgent[];
  selectedIds: Set<string>;
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
  onSelectAgent: (agentId: string) => void;
  onSelectAll: () => void;
  onAgentAction: (action: string, agentId: string) => void;
  compact?: boolean;
  stickyHeader?: boolean;
}

// ============================================
// Authority Config
// ============================================

const authorityConfig: Record<AuthorityLevel, {
  label: string;
  icon: React.ElementType;
  variant: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'outline';
  order: number;
}> = {
  operator: {
    label: 'Operator',
    icon: Shield,
    variant: 'error',
    order: 0
  },
  manager: {
    label: 'Manager',
    icon: Users,
    variant: 'warning',
    order: 1
  },
  worker: {
    label: 'Worker',
    icon: Wrench,
    variant: 'info',
    order: 2
  },
  observer: {
    label: 'Observer',
    icon: Eye,
    variant: 'default',
    order: 3
  }
};

// ============================================
// Pack Display Config
// ============================================

const packLabels: Record<AgentPack, string> = {
  devops: 'DevOps',
  qa: 'QA',
  legal: 'Legal',
  mobile: 'Mobile',
  research: 'Research',
  planning: 'Planning',
  analytics: 'Analytics',
  orchestration: 'Orchestration',
  error_predictor: 'Error Predictor',
  product: 'Product',
  marketing: 'Marketing',
  supabase: 'Supabase',
  design: 'Design',
  engineering: 'Engineering'
};

const packColors: Record<AgentPack, string> = {
  devops: 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400',
  qa: 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400',
  legal: 'bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-400',
  mobile: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400',
  research: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
  planning: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
  analytics: 'bg-pink-100 text-pink-700 dark:bg-pink-500/20 dark:text-pink-400',
  orchestration: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400',
  error_predictor: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400',
  product: 'bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-400',
  marketing: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/20 dark:text-fuchsia-400',
  supabase: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
  design: 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-400',
  engineering: 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-400',
};

// ============================================
// Component
// ============================================

export function AgentTable({
  agents,
  selectedIds,
  sortField,
  sortDirection,
  onSort,
  onSelectAgent,
  onSelectAll,
  onAgentAction,
  compact = false,
  stickyHeader = true
}: AgentTableProps) {
  const allSelected = agents.length > 0 && selectedIds.size === agents.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < agents.length;

  const getSortDirection = useCallback((field: SortField): 'asc' | 'desc' | null => {
    if (sortField === field) {
      return sortDirection;
    }
    return null;
  }, [sortField, sortDirection]);

  const handleSort = useCallback((field: SortField) => {
    onSort(field);
  }, [onSort]);

  const SelectionIcon = allSelected
    ? CheckSquare
    : someSelected
      ? MinusSquare
      : Square;

  return (
    <div className="overflow-x-auto">
      <Table hoverable striped compact={compact}>
        <TableHeader>
          <TableRow
            className={cn(
              'bg-slate-50 dark:bg-dark-bg-tertiary',
              stickyHeader && 'sticky top-0 z-10'
            )}
          >
            {/* Selection Column */}
            <TableHead className="w-12 !py-3">
              <button
                onClick={onSelectAll}
                className={cn(
                  'p-1.5 rounded-lg transition-all duration-150',
                  'hover:bg-slate-200 dark:hover:bg-dark-bg-elevated',
                  (allSelected || someSelected) && 'bg-purple-100 dark:bg-purple-500/20'
                )}
                aria-label={allSelected ? 'Deselect all' : 'Select all'}
              >
                <SelectionIcon
                  className={cn(
                    'w-5 h-5 transition-colors',
                    allSelected || someSelected
                      ? 'text-purple-600 dark:text-purple-400'
                      : 'text-slate-400 dark:text-dark-text-muted hover:text-slate-500'
                  )}
                />
              </button>
            </TableHead>

            {/* Name Column */}
            <TableHead
              sortable
              sortDirection={getSortDirection('name')}
              onSort={() => handleSort('name')}
              className="min-w-[280px]"
            >
              Agent
            </TableHead>

            {/* Pack Column */}
            <TableHead
              sortable
              sortDirection={getSortDirection('pack')}
              onSort={() => handleSort('pack')}
              className="w-36"
            >
              Pack
            </TableHead>

            {/* Authority Column */}
            <TableHead
              sortable
              sortDirection={getSortDirection('authority')}
              onSort={() => handleSort('authority')}
              className="w-32"
            >
              Authority
            </TableHead>

            {/* Status Column */}
            <TableHead
              sortable
              sortDirection={getSortDirection('status')}
              onSort={() => handleSort('status')}
              className="w-28"
            >
              Status
            </TableHead>

            {/* Last Modified Column */}
            <TableHead
              sortable
              sortDirection={getSortDirection('lastModified')}
              onSort={() => handleSort('lastModified')}
              className="w-40"
            >
              Last Modified
            </TableHead>

            {/* Version Column */}
            <TableHead
              sortable
              sortDirection={getSortDirection('version')}
              onSort={() => handleSort('version')}
              className="w-24"
            >
              Version
            </TableHead>

            {/* Executions Column */}
            <TableHead
              sortable
              sortDirection={getSortDirection('executionCount')}
              onSort={() => handleSort('executionCount')}
              className="w-24 text-right"
            >
              Runs
            </TableHead>

            {/* Actions Column */}
            <TableHead className="w-16 text-right">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {agents.map((agent) => {
            const isSelected = selectedIds.has(agent.id);
            const authorityInfo = authorityConfig[agent.authority];
            const AuthorityIcon = authorityInfo.icon;

            return (
              <TableRow
                key={agent.id}
                selected={isSelected}
                className={cn(
                  'group transition-all duration-150',
                  isSelected && 'bg-purple-50/50 dark:bg-purple-500/5'
                )}
              >
                {/* Selection Cell */}
                <TableCell className="!py-3">
                  <button
                    onClick={() => onSelectAgent(agent.id)}
                    className={cn(
                      'p-1.5 rounded-lg transition-all duration-150',
                      'hover:bg-slate-200 dark:hover:bg-dark-bg-elevated',
                      isSelected && 'bg-purple-100 dark:bg-purple-500/20 scale-105'
                    )}
                    aria-label={isSelected ? 'Deselect agent' : 'Select agent'}
                  >
                    {isSelected ? (
                      <CheckSquare className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    ) : (
                      <Square className="w-5 h-5 text-slate-300 dark:text-dark-text-muted group-hover:text-slate-400 dark:group-hover:text-dark-text-tertiary transition-colors" />
                    )}
                  </button>
                </TableCell>

                {/* Agent Info Cell */}
                <TableCell>
                  <Link
                    href={`/studio/agents/${agent.id}`}
                    className="flex items-center gap-3 group/link"
                  >
                    <AgentAvatar
                      pack={agent.pack}
                      name={agent.name}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-slate-900 dark:text-dark-text-primary truncate group-hover/link:text-purple-600 dark:group-hover/link:text-purple-400 transition-colors">
                          {agent.name}
                        </p>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400 dark:text-dark-text-muted opacity-0 group-hover/link:opacity-100 transition-opacity flex-shrink-0" />
                      </div>
                      <p className="text-sm text-slate-500 dark:text-dark-text-tertiary truncate">
                        {agent.role}
                      </p>
                    </div>
                  </Link>
                </TableCell>

                {/* Pack Cell */}
                <TableCell>
                  <span
                    className={cn(
                      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                      packColors[agent.pack]
                    )}
                  >
                    {packLabels[agent.pack]}
                  </span>
                </TableCell>

                {/* Authority Cell */}
                <TableCell>
                  <Badge
                    variant={authorityInfo.variant}
                    size="sm"
                  >
                    <AuthorityIcon className="w-3 h-3 mr-1" />
                    {authorityInfo.label}
                  </Badge>
                </TableCell>

                {/* Status Cell */}
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'w-2 h-2 rounded-full flex-shrink-0',
                        agent.status === 'active'
                          ? 'bg-emerald-500 animate-pulse'
                          : 'bg-slate-400 dark:bg-zinc-500'
                      )}
                    />
                    <span
                      className={cn(
                        'text-sm font-medium',
                        agent.status === 'active'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-slate-500 dark:text-dark-text-tertiary'
                      )}
                    >
                      {toTitleCase(agent.status)}
                    </span>
                  </div>
                </TableCell>

                {/* Last Modified Cell */}
                <TableCell>
                  <span className="text-sm text-slate-600 dark:text-dark-text-secondary">
                    {formatRelativeTime(agent.lastModified)}
                  </span>
                </TableCell>

                {/* Version Cell */}
                <TableCell>
                  <span className="inline-flex items-center px-2 py-0.5 bg-slate-100 dark:bg-dark-bg-tertiary rounded text-xs font-mono text-slate-600 dark:text-dark-text-secondary">
                    v{agent.version}
                  </span>
                </TableCell>

                {/* Executions Cell */}
                <TableCell className="text-right">
                  <span className="text-sm tabular-nums font-medium text-slate-700 dark:text-dark-text-secondary">
                    {formatCompactNumber(agent.executionCount)}
                  </span>
                </TableCell>

                {/* Actions Cell */}
                <TableCell className="text-right">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                    <AgentActions
                      agent={agent}
                      onAction={(action) => onAgentAction(action, agent.id)}
                    />
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

export default AgentTable;
