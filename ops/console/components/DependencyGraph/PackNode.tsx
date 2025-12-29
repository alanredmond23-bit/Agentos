/**
 * AgentOS Ops Console - Pack Node Component
 * Large pack node with nested agent circles for ReactFlow
 */

'use client';

import React, { memo, useCallback } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Package,
  Bot,
  AlertTriangle,
  CheckCircle,
  XCircle,
  PauseCircle,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { NodeTooltip } from './NodeTooltip';
import type { AgentPack } from '@/types';

// ============================================
// Types
// ============================================

export interface PackNodeAgent {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'error' | 'deprecated';
  hasConflict?: boolean;
}

export interface PackNodeData {
  id: string;
  name: string;
  pack: AgentPack;
  version: string;
  description?: string;
  status: 'active' | 'inactive' | 'error' | 'deprecated';
  agents: PackNodeAgent[];
  dependencyCount: number;
  hasConflict?: boolean;
  conflictReason?: string;
  isSelected?: boolean;
  highlightConflict?: boolean;
}

// ============================================
// Pack Colors
// ============================================

const packColors: Record<AgentPack, { bg: string; border: string; accent: string; text: string }> = {
  devops: {
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    border: 'border-blue-300 dark:border-blue-600',
    accent: 'bg-blue-500',
    text: 'text-blue-600 dark:text-blue-400'
  },
  qa: {
    bg: 'bg-green-50 dark:bg-green-950/30',
    border: 'border-green-300 dark:border-green-600',
    accent: 'bg-green-500',
    text: 'text-green-600 dark:text-green-400'
  },
  legal: {
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    border: 'border-amber-300 dark:border-amber-600',
    accent: 'bg-amber-500',
    text: 'text-amber-600 dark:text-amber-400'
  },
  mobile: {
    bg: 'bg-purple-50 dark:bg-purple-950/30',
    border: 'border-purple-300 dark:border-purple-600',
    accent: 'bg-purple-500',
    text: 'text-purple-600 dark:text-purple-400'
  },
  research: {
    bg: 'bg-cyan-50 dark:bg-cyan-950/30',
    border: 'border-cyan-300 dark:border-cyan-600',
    accent: 'bg-cyan-500',
    text: 'text-cyan-600 dark:text-cyan-400'
  },
  planning: {
    bg: 'bg-orange-50 dark:bg-orange-950/30',
    border: 'border-orange-300 dark:border-orange-600',
    accent: 'bg-orange-500',
    text: 'text-orange-600 dark:text-orange-400'
  },
  analytics: {
    bg: 'bg-indigo-50 dark:bg-indigo-950/30',
    border: 'border-indigo-300 dark:border-indigo-600',
    accent: 'bg-indigo-500',
    text: 'text-indigo-600 dark:text-indigo-400'
  },
  orchestration: {
    bg: 'bg-rose-50 dark:bg-rose-950/30',
    border: 'border-rose-300 dark:border-rose-600',
    accent: 'bg-rose-500',
    text: 'text-rose-600 dark:text-rose-400'
  },
  error_predictor: {
    bg: 'bg-red-50 dark:bg-red-950/30',
    border: 'border-red-300 dark:border-red-600',
    accent: 'bg-red-500',
    text: 'text-red-600 dark:text-red-400'
  },
  product: {
    bg: 'bg-teal-50 dark:bg-teal-950/30',
    border: 'border-teal-300 dark:border-teal-600',
    accent: 'bg-teal-500',
    text: 'text-teal-600 dark:text-teal-400'
  },
  marketing: {
    bg: 'bg-pink-50 dark:bg-pink-950/30',
    border: 'border-pink-300 dark:border-pink-600',
    accent: 'bg-pink-500',
    text: 'text-pink-600 dark:text-pink-400'
  },
  supabase: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    border: 'border-emerald-300 dark:border-emerald-600',
    accent: 'bg-emerald-500',
    text: 'text-emerald-600 dark:text-emerald-400'
  },
  design: {
    bg: 'bg-violet-50 dark:bg-violet-950/30',
    border: 'border-violet-300 dark:border-violet-600',
    accent: 'bg-violet-500',
    text: 'text-violet-600 dark:text-violet-400'
  },
  engineering: {
    bg: 'bg-slate-50 dark:bg-slate-900/30',
    border: 'border-slate-300 dark:border-slate-600',
    accent: 'bg-slate-500',
    text: 'text-slate-600 dark:text-slate-400'
  },
};

// ============================================
// Status Badge Component
// ============================================

const PackStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const statusConfig = {
    active: { icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    inactive: { icon: PauseCircle, color: 'text-slate-400', bg: 'bg-slate-500/10' },
    error: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10' },
    deprecated: { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.inactive;
  const Icon = config.icon;

  return (
    <div className={cn('flex items-center gap-1 px-1.5 py-0.5 rounded-md', config.bg)}>
      <Icon className={cn('w-3 h-3', config.color)} />
      <span className={cn('text-[10px] font-medium capitalize', config.color)}>
        {status}
      </span>
    </div>
  );
};

// ============================================
// Agent Circle Component
// ============================================

interface AgentCircleProps {
  agent: PackNodeAgent;
  index: number;
  total: number;
  accentColor: string;
}

const AgentCircle: React.FC<AgentCircleProps> = ({ agent, index, total, accentColor }) => {
  const statusColors = {
    active: 'bg-emerald-500 ring-emerald-300',
    inactive: 'bg-slate-400 ring-slate-300',
    error: 'bg-red-500 ring-red-300',
    deprecated: 'bg-amber-500 ring-amber-300',
  };

  // Calculate position in a grid layout
  const cols = Math.ceil(Math.sqrt(total));
  const row = Math.floor(index / cols);
  const col = index % cols;

  return (
    <div
      className="relative group/agent"
      title={agent.name}
    >
      <div
        className={cn(
          'w-6 h-6 rounded-full flex items-center justify-center',
          'transition-all duration-200',
          'ring-2 ring-offset-1 ring-offset-white dark:ring-offset-slate-800',
          statusColors[agent.status],
          agent.hasConflict && 'ring-red-500 animate-pulse'
        )}
      >
        <Bot className="w-3 h-3 text-white" />
      </div>

      {/* Agent tooltip on hover */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover/agent:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
        {agent.name}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
      </div>
    </div>
  );
};

// ============================================
// Pack Node Component
// ============================================

function PackNodeComponent({ data, selected }: NodeProps<PackNodeData>) {
  const router = useRouter();
  const [isHovered, setIsHovered] = React.useState(false);
  const colors = packColors[data.pack] || packColors.engineering;

  const handleDoubleClick = useCallback(() => {
    router.push(`/studio/packs/${data.pack}`);
  }, [router, data.pack]);

  // Display up to 6 agents, show count for more
  const displayAgents = data.agents.slice(0, 6);
  const remainingAgents = data.agents.length - 6;

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onDoubleClick={handleDoubleClick}
    >
      {/* Tooltip */}
      <NodeTooltip
        data={{
          id: data.id,
          type: 'pack',
          name: data.name,
          pack: data.pack,
          version: data.version,
          description: data.description,
          status: data.status,
          agentCount: data.agents.length,
          dependencyCount: data.dependencyCount,
          hasConflict: data.hasConflict,
          conflictReason: data.conflictReason,
        }}
        visible={isHovered}
        position="top"
      />

      {/* Pack Container */}
      <div
        className={cn(
          'relative rounded-2xl border-2 transition-all duration-200',
          'min-w-[180px] max-w-[240px]',
          'shadow-lg hover:shadow-xl',
          // Background
          colors.bg,
          // Border - purple for packs as specified
          data.isSelected || selected
            ? 'border-purple-500 dark:border-purple-400 ring-4 ring-purple-500/20'
            : data.highlightConflict
            ? 'border-red-500 dark:border-red-400 ring-4 ring-red-500/20'
            : 'border-purple-400 dark:border-purple-500',
          // Cursor
          'cursor-pointer'
        )}
      >
        {/* Conflict Badge */}
        {data.highlightConflict && (
          <div className="absolute -top-2.5 -right-2.5 p-1.5 bg-red-500 rounded-full shadow-lg animate-bounce">
            <AlertTriangle className="w-3.5 h-3.5 text-white" />
          </div>
        )}

        {/* Header */}
        <div className="px-4 py-3 border-b border-purple-200 dark:border-purple-800/50">
          <div className="flex items-center gap-3">
            {/* Pack Icon */}
            <div
              className={cn(
                'flex items-center justify-center w-10 h-10 rounded-xl',
                'bg-purple-500 shadow-md'
              )}
            >
              <Package className="w-5 h-5 text-white" />
            </div>

            {/* Pack Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                  {data.name}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  v{data.version}
                </span>
                <span className="text-slate-300 dark:text-slate-600">|</span>
                <PackStatusBadge status={data.status} />
              </div>
            </div>
          </div>
        </div>

        {/* Agents Section */}
        <div className="px-4 py-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Bot className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
              {data.agents.length} Agent{data.agents.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Agent Grid */}
          {data.agents.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {displayAgents.map((agent, index) => (
                <AgentCircle
                  key={agent.id}
                  agent={agent}
                  index={index}
                  total={displayAgents.length}
                  accentColor={colors.accent}
                />
              ))}
              {remainingAgents > 0 && (
                <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                  <span className="text-[9px] font-bold text-slate-600 dark:text-slate-300">
                    +{remainingAgents}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* No agents placeholder */}
          {data.agents.length === 0 && (
            <div className="text-[10px] text-slate-400 dark:text-slate-500 italic">
              No agents configured
            </div>
          )}
        </div>

        {/* Footer - Dependencies */}
        {data.dependencyCount > 0 && (
          <div className="px-4 py-2 bg-slate-100/50 dark:bg-slate-800/30 border-t border-slate-200 dark:border-slate-700/50 rounded-b-2xl">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-slate-500 dark:text-slate-400">
                Dependencies
              </span>
              <span className="font-medium text-slate-600 dark:text-slate-300">
                {data.dependencyCount}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Connection Handles */}
      <Handle
        type="target"
        position={Position.Top}
        className={cn(
          '!w-4 !h-4 !border-2 !rounded-full',
          '!bg-white dark:!bg-slate-800',
          data.highlightConflict
            ? '!border-red-500'
            : '!border-purple-400 dark:!border-purple-500',
          '!-top-2'
        )}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className={cn(
          '!w-4 !h-4 !border-2 !rounded-full',
          '!bg-white dark:!bg-slate-800',
          data.highlightConflict
            ? '!border-red-500'
            : '!border-purple-400 dark:!border-purple-500',
          '!-bottom-2'
        )}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left-target"
        className={cn(
          '!w-4 !h-4 !border-2 !rounded-full',
          '!bg-white dark:!bg-slate-800',
          data.highlightConflict
            ? '!border-red-500'
            : '!border-purple-400 dark:!border-purple-500',
          '!-left-2'
        )}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right-source"
        className={cn(
          '!w-4 !h-4 !border-2 !rounded-full',
          '!bg-white dark:!bg-slate-800',
          data.highlightConflict
            ? '!border-red-500'
            : '!border-purple-400 dark:!border-purple-500',
          '!-right-2'
        )}
      />
    </div>
  );
}

export const PackNode = memo(PackNodeComponent);
export default PackNode;
