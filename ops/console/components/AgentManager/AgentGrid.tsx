/**
 * AgentOS Studio - Agent Grid Component
 * Card-based grid view for agent management
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { cn, formatRelativeTime, toTitleCase, formatCompactNumber } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { AgentAvatar } from '@/components/ui/Avatar';
import { AgentActions } from './AgentActions';
import type { AgentPack } from '@/types';
import {
  CheckCircle,
  Circle,
  Shield,
  Users,
  Wrench,
  Eye,
  Clock,
  Activity,
  Zap
} from 'lucide-react';

// ============================================
// Types
// ============================================

export type AuthorityLevel = 'operator' | 'manager' | 'worker' | 'observer';

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

interface AgentGridProps {
  agents: StudioAgent[];
  selectedIds: Set<string>;
  onSelectAgent: (agentId: string) => void;
  onAgentAction: (action: string, agentId: string) => void;
}

// ============================================
// Authority Config
// ============================================

const authorityConfig: Record<AuthorityLevel, {
  label: string;
  icon: React.ElementType;
  color: string;
}> = {
  operator: {
    label: 'Operator',
    icon: Shield,
    color: 'text-red-600 dark:text-red-400'
  },
  manager: {
    label: 'Manager',
    icon: Users,
    color: 'text-amber-600 dark:text-amber-400'
  },
  worker: {
    label: 'Worker',
    icon: Wrench,
    color: 'text-blue-600 dark:text-blue-400'
  },
  observer: {
    label: 'Observer',
    icon: Eye,
    color: 'text-slate-500 dark:text-slate-400'
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

// ============================================
// Agent Card Component
// ============================================

interface AgentCardProps {
  agent: StudioAgent;
  isSelected: boolean;
  onSelect: () => void;
  onAction: (action: string) => void;
}

function AgentCard({ agent, isSelected, onSelect, onAction }: AgentCardProps) {
  const authorityInfo = authorityConfig[agent.authority];
  const AuthorityIcon = authorityInfo.icon;

  return (
    <div
      className={cn(
        'card p-4 relative transition-all duration-200',
        'hover:shadow-md dark:hover:shadow-lg dark:hover:shadow-black/20',
        isSelected && 'ring-2 ring-brand-500 dark:ring-brand-400 bg-brand-50/50 dark:bg-brand-500/5'
      )}
    >
      {/* Selection Toggle */}
      <button
        onClick={onSelect}
        className="absolute top-3 left-3 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-dark-bg-elevated transition-colors z-10"
        aria-label={isSelected ? 'Deselect' : 'Select'}
      >
        {isSelected ? (
          <CheckCircle className="w-5 h-5 text-brand-600 dark:text-brand-400" />
        ) : (
          <Circle className="w-5 h-5 text-slate-300 dark:text-dark-border-secondary hover:text-slate-400" />
        )}
      </button>

      {/* Actions Menu */}
      <div className="absolute top-3 right-3 z-10">
        <AgentActions agent={agent} onAction={onAction} />
      </div>

      {/* Card Content */}
      <div className="flex flex-col items-center text-center pt-6 pb-2">
        {/* Agent Avatar - Clickable */}
        <Link href={`/studio/agents/${agent.id}`} className="group/avatar">
          <AgentAvatar pack={agent.pack} name={agent.name} size="lg" />
        </Link>

        {/* Status Badge */}
        <Badge
          variant={agent.status === 'active' ? 'success' : 'default'}
          size="sm"
          dot
          dotColor={agent.status === 'active' ? 'success' : 'default'}
          className="mt-3"
        >
          {toTitleCase(agent.status)}
        </Badge>

        {/* Agent Name & Role - Clickable */}
        <Link
          href={`/studio/agents/${agent.id}`}
          className="mt-3 group/link hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
        >
          <h3 className="font-semibold text-slate-900 dark:text-dark-text-primary truncate max-w-full px-2 group-hover/link:text-brand-600 dark:group-hover/link:text-brand-400">
            {agent.name}
          </h3>
        </Link>
        <p className="text-sm text-slate-500 dark:text-dark-text-tertiary truncate max-w-full px-2">
          {agent.role}
        </p>

        {/* Pack Badge */}
        <Badge variant="outline" size="sm" className="mt-2">
          {packLabels[agent.pack]}
        </Badge>
      </div>

      {/* Divider */}
      <div className="h-px bg-slate-200 dark:bg-dark-border-primary my-4" />

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-2">
        {/* Authority */}
        <div className="text-center p-2 rounded-lg bg-slate-50 dark:bg-dark-bg-tertiary">
          <AuthorityIcon className={cn('w-4 h-4 mx-auto mb-1', authorityInfo.color)} />
          <p className="text-xs text-slate-500 dark:text-dark-text-tertiary">
            {authorityInfo.label}
          </p>
        </div>

        {/* Version */}
        <div className="text-center p-2 rounded-lg bg-slate-50 dark:bg-dark-bg-tertiary">
          <Zap className="w-4 h-4 mx-auto mb-1 text-purple-500" />
          <p className="text-xs text-slate-500 dark:text-dark-text-tertiary font-mono">
            v{agent.version}
          </p>
        </div>

        {/* Executions */}
        <div className="text-center p-2 rounded-lg bg-slate-50 dark:bg-dark-bg-tertiary">
          <Activity className="w-4 h-4 mx-auto mb-1 text-emerald-500" />
          <p className="text-xs text-slate-500 dark:text-dark-text-tertiary tabular-nums">
            {formatCompactNumber(agent.executionCount)}
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 flex items-center justify-center gap-1 text-xs text-slate-400 dark:text-dark-text-muted">
        <Clock className="w-3 h-3" />
        <span>Updated {formatRelativeTime(agent.lastModified)}</span>
      </div>

      {/* Capabilities Preview */}
      {agent.capabilities.length > 0 && (
        <div className="mt-3 flex flex-wrap justify-center gap-1">
          {agent.capabilities.slice(0, 3).map((cap, i) => (
            <span
              key={i}
              className="px-1.5 py-0.5 text-2xs bg-slate-100 dark:bg-dark-bg-tertiary text-slate-500 dark:text-dark-text-tertiary rounded"
            >
              {cap}
            </span>
          ))}
          {agent.capabilities.length > 3 && (
            <span className="px-1.5 py-0.5 text-2xs bg-slate-100 dark:bg-dark-bg-tertiary text-slate-400 dark:text-dark-text-muted rounded">
              +{agent.capabilities.length - 3}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// Grid Component
// ============================================

export function AgentGrid({
  agents,
  selectedIds,
  onSelectAgent,
  onAgentAction
}: AgentGridProps) {
  return (
    <div className="p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
        {agents.map((agent) => (
          <AgentCard
            key={agent.id}
            agent={agent}
            isSelected={selectedIds.has(agent.id)}
            onSelect={() => onSelectAgent(agent.id)}
            onAction={(action) => onAgentAction(action, agent.id)}
          />
        ))}
      </div>
    </div>
  );
}

export default AgentGrid;
