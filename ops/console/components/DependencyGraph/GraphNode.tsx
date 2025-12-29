/**
 * AgentOS Ops Console - Graph Node Component
 * Custom ReactFlow node for packs and agents
 */

'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { cn } from '@/lib/utils';
import {
  Package,
  Bot,
  AlertTriangle,
  CheckCircle,
  XCircle,
  PauseCircle,
  Clock,
} from 'lucide-react';
import type { GraphNode as GraphNodeData, NodeType } from './DependencyGraph';
import type { AgentPack } from '@/types';

// ============================================
// Types
// ============================================

interface NodeData extends GraphNodeData {
  isSelected?: boolean;
  highlightConflict?: boolean;
}

// ============================================
// Pack Colors
// ============================================

const packColors: Record<AgentPack, { bg: string; border: string; icon: string }> = {
  devops: { bg: 'bg-blue-50 dark:bg-blue-500/10', border: 'border-blue-300 dark:border-blue-500/50', icon: 'text-blue-500' },
  qa: { bg: 'bg-green-50 dark:bg-green-500/10', border: 'border-green-300 dark:border-green-500/50', icon: 'text-green-500' },
  legal: { bg: 'bg-amber-50 dark:bg-amber-500/10', border: 'border-amber-300 dark:border-amber-500/50', icon: 'text-amber-500' },
  mobile: { bg: 'bg-purple-50 dark:bg-purple-500/10', border: 'border-purple-300 dark:border-purple-500/50', icon: 'text-purple-500' },
  research: { bg: 'bg-cyan-50 dark:bg-cyan-500/10', border: 'border-cyan-300 dark:border-cyan-500/50', icon: 'text-cyan-500' },
  planning: { bg: 'bg-orange-50 dark:bg-orange-500/10', border: 'border-orange-300 dark:border-orange-500/50', icon: 'text-orange-500' },
  analytics: { bg: 'bg-indigo-50 dark:bg-indigo-500/10', border: 'border-indigo-300 dark:border-indigo-500/50', icon: 'text-indigo-500' },
  orchestration: { bg: 'bg-rose-50 dark:bg-rose-500/10', border: 'border-rose-300 dark:border-rose-500/50', icon: 'text-rose-500' },
  error_predictor: { bg: 'bg-red-50 dark:bg-red-500/10', border: 'border-red-300 dark:border-red-500/50', icon: 'text-red-500' },
  product: { bg: 'bg-teal-50 dark:bg-teal-500/10', border: 'border-teal-300 dark:border-teal-500/50', icon: 'text-teal-500' },
  marketing: { bg: 'bg-pink-50 dark:bg-pink-500/10', border: 'border-pink-300 dark:border-pink-500/50', icon: 'text-pink-500' },
  supabase: { bg: 'bg-emerald-50 dark:bg-emerald-500/10', border: 'border-emerald-300 dark:border-emerald-500/50', icon: 'text-emerald-500' },
  design: { bg: 'bg-violet-50 dark:bg-violet-500/10', border: 'border-violet-300 dark:border-violet-500/50', icon: 'text-violet-500' },
  engineering: { bg: 'bg-slate-50 dark:bg-slate-500/10', border: 'border-slate-300 dark:border-slate-500/50', icon: 'text-slate-500' },
};

// ============================================
// Status Icons
// ============================================

const StatusIcon: React.FC<{ status?: string }> = ({ status }) => {
  switch (status) {
    case 'active':
      return <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />;
    case 'inactive':
      return <PauseCircle className="w-3.5 h-3.5 text-slate-400" />;
    case 'error':
      return <XCircle className="w-3.5 h-3.5 text-red-500" />;
    case 'deprecated':
      return <Clock className="w-3.5 h-3.5 text-amber-500" />;
    default:
      return null;
  }
};

// ============================================
// Tooltip Component
// ============================================

interface TooltipProps {
  node: NodeData;
  visible: boolean;
}

const NodeTooltip: React.FC<TooltipProps> = ({ node, visible }) => {
  if (!visible) return null;

  return (
    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-50 pointer-events-none">
      <div className="bg-slate-900 dark:bg-zinc-800 text-white px-3 py-2 rounded-lg shadow-xl text-sm whitespace-nowrap">
        <div className="font-medium">{node.name}</div>
        {node.description && (
          <div className="text-slate-300 dark:text-zinc-400 text-xs mt-1 max-w-[200px] truncate">
            {node.description}
          </div>
        )}
        {node.version && (
          <div className="text-slate-400 dark:text-zinc-500 text-xs mt-1">
            Version: {node.version}
          </div>
        )}
        {node.hasConflict && (
          <div className="text-red-400 text-xs mt-1 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            {node.conflictReason || 'Conflict detected'}
          </div>
        )}
        {/* Arrow */}
        <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-slate-900 dark:border-t-zinc-800" />
      </div>
    </div>
  );
};

// ============================================
// Graph Node Component
// ============================================

function GraphNodeComponent({ data, selected }: NodeProps<NodeData>) {
  const [isHovered, setIsHovered] = React.useState(false);
  const isPack = data.type === 'pack';
  const colors = data.pack ? packColors[data.pack] : packColors.engineering;

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Tooltip */}
      <NodeTooltip node={data} visible={isHovered} />

      {/* Node Container */}
      <div
        className={cn(
          'relative px-4 py-3 rounded-xl border-2 transition-all duration-200',
          'min-w-[160px] max-w-[220px]',
          isPack ? 'rounded-xl' : 'rounded-lg',
          // Background
          colors.bg,
          // Border
          data.isSelected || selected
            ? 'border-brand-500 dark:border-brand-400 ring-2 ring-brand-500/30'
            : data.highlightConflict
            ? 'border-red-500 dark:border-red-400 ring-2 ring-red-500/30'
            : colors.border,
          // Shadow
          'shadow-sm hover:shadow-md',
          // Hover
          'hover:scale-[1.02]',
          // Cursor
          'cursor-pointer'
        )}
      >
        {/* Conflict Badge */}
        {data.highlightConflict && (
          <div className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full shadow-md">
            <AlertTriangle className="w-3 h-3 text-white" />
          </div>
        )}

        {/* Header */}
        <div className="flex items-center gap-2">
          {/* Icon */}
          <div
            className={cn(
              'flex items-center justify-center w-8 h-8 rounded-lg',
              isPack
                ? 'bg-white/80 dark:bg-dark-bg-secondary/80'
                : 'bg-white/60 dark:bg-dark-bg-secondary/60'
            )}
          >
            {isPack ? (
              <Package className={cn('w-4 h-4', colors.icon)} />
            ) : (
              <Bot className={cn('w-4 h-4', colors.icon)} />
            )}
          </div>

          {/* Name and Status */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-slate-800 dark:text-dark-text-primary truncate">
                {data.name}
              </span>
              <StatusIcon status={data.status} />
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-dark-text-tertiary">
              <span className="capitalize">{data.type}</span>
              {data.version && (
                <>
                  <span className="text-slate-300 dark:text-dark-border-secondary">|</span>
                  <span>v{data.version}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Agent Count (for packs) */}
        {isPack && data.agentCount !== undefined && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 dark:text-dark-text-tertiary">
            <Bot className="w-3 h-3" />
            <span>{data.agentCount} agents</span>
          </div>
        )}

        {/* Pack Badge (for agents) */}
        {!isPack && data.pack && (
          <div className="mt-2">
            <span
              className={cn(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                'bg-white/60 dark:bg-dark-bg-secondary/60',
                'text-slate-600 dark:text-dark-text-secondary'
              )}
            >
              <Package className="w-3 h-3" />
              {data.pack}
            </span>
          </div>
        )}
      </div>

      {/* Connection Handles */}
      <Handle
        type="target"
        position={Position.Top}
        className={cn(
          '!w-3 !h-3 !border-2 !rounded-full',
          '!bg-white dark:!bg-dark-bg-secondary',
          data.highlightConflict
            ? '!border-red-500'
            : '!border-slate-300 dark:!border-dark-border-secondary'
        )}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className={cn(
          '!w-3 !h-3 !border-2 !rounded-full',
          '!bg-white dark:!bg-dark-bg-secondary',
          data.highlightConflict
            ? '!border-red-500'
            : '!border-slate-300 dark:!border-dark-border-secondary'
        )}
      />
    </div>
  );
}

export const GraphNode = memo(GraphNodeComponent);
export default GraphNode;
