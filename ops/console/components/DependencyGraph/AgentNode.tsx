/**
 * AgentOS Ops Console - Agent Node Component
 * Small circular agent node for ReactFlow (when agents are shown separately)
 */

'use client';

import React, { memo, useCallback } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Bot,
  AlertTriangle,
  CheckCircle,
  XCircle,
  PauseCircle,
  Clock,
  Zap,
} from 'lucide-react';
import { NodeTooltip } from './NodeTooltip';
import type { AgentPack } from '@/types';

// ============================================
// Types
// ============================================

export interface AgentNodeData {
  id: string;
  name: string;
  pack: AgentPack;
  version: string;
  description?: string;
  status: 'active' | 'inactive' | 'error' | 'deprecated';
  hasConflict?: boolean;
  conflictReason?: string;
  isSelected?: boolean;
  highlightConflict?: boolean;
  successRate?: number;
  lastUpdated?: string;
}

// ============================================
// Pack Colors for Agent Nodes
// ============================================

const packColors: Record<AgentPack, { bg: string; border: string; ring: string }> = {
  devops: {
    bg: 'bg-blue-500',
    border: 'border-blue-400',
    ring: 'ring-blue-300',
  },
  qa: {
    bg: 'bg-green-500',
    border: 'border-green-400',
    ring: 'ring-green-300',
  },
  legal: {
    bg: 'bg-amber-500',
    border: 'border-amber-400',
    ring: 'ring-amber-300',
  },
  mobile: {
    bg: 'bg-purple-500',
    border: 'border-purple-400',
    ring: 'ring-purple-300',
  },
  research: {
    bg: 'bg-cyan-500',
    border: 'border-cyan-400',
    ring: 'ring-cyan-300',
  },
  planning: {
    bg: 'bg-orange-500',
    border: 'border-orange-400',
    ring: 'ring-orange-300',
  },
  analytics: {
    bg: 'bg-indigo-500',
    border: 'border-indigo-400',
    ring: 'ring-indigo-300',
  },
  orchestration: {
    bg: 'bg-rose-500',
    border: 'border-rose-400',
    ring: 'ring-rose-300',
  },
  error_predictor: {
    bg: 'bg-red-500',
    border: 'border-red-400',
    ring: 'ring-red-300',
  },
  product: {
    bg: 'bg-teal-500',
    border: 'border-teal-400',
    ring: 'ring-teal-300',
  },
  marketing: {
    bg: 'bg-pink-500',
    border: 'border-pink-400',
    ring: 'ring-pink-300',
  },
  supabase: {
    bg: 'bg-emerald-500',
    border: 'border-emerald-400',
    ring: 'ring-emerald-300',
  },
  design: {
    bg: 'bg-violet-500',
    border: 'border-violet-400',
    ring: 'ring-violet-300',
  },
  engineering: {
    bg: 'bg-slate-500',
    border: 'border-slate-400',
    ring: 'ring-slate-300',
  },
};

// ============================================
// Status Indicator Component
// ============================================

const StatusIndicator: React.FC<{ status: string }> = ({ status }) => {
  const statusConfig = {
    active: { color: 'bg-emerald-400', pulse: true },
    inactive: { color: 'bg-slate-400', pulse: false },
    error: { color: 'bg-red-400', pulse: true },
    deprecated: { color: 'bg-amber-400', pulse: false },
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.inactive;

  return (
    <div
      className={cn(
        'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-800',
        config.color,
        config.pulse && 'animate-pulse'
      )}
    />
  );
};

// ============================================
// Agent Node Component
// ============================================

function AgentNodeComponent({ data, selected }: NodeProps<AgentNodeData>) {
  const router = useRouter();
  const [isHovered, setIsHovered] = React.useState(false);
  const colors = packColors[data.pack] || packColors.engineering;

  const handleDoubleClick = useCallback(() => {
    router.push(`/studio/agents/${data.id}`);
  }, [router, data.id]);

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
          type: 'agent',
          name: data.name,
          pack: data.pack,
          version: data.version,
          description: data.description,
          status: data.status,
          hasConflict: data.hasConflict,
          conflictReason: data.conflictReason,
          successRate: data.successRate,
          lastUpdated: data.lastUpdated,
        }}
        visible={isHovered}
        position="top"
      />

      {/* Agent Circle Container */}
      <div
        className={cn(
          'relative flex flex-col items-center transition-all duration-200',
          'cursor-pointer'
        )}
      >
        {/* Main Circle */}
        <div
          className={cn(
            'relative w-12 h-12 rounded-full',
            'flex items-center justify-center',
            'shadow-lg hover:shadow-xl',
            'transition-all duration-200 hover:scale-110',
            colors.bg,
            // Selection state
            data.isSelected || selected
              ? 'ring-4 ring-brand-500 ring-offset-2 ring-offset-white dark:ring-offset-slate-900'
              : data.highlightConflict
              ? 'ring-4 ring-red-500 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 animate-pulse'
              : `ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 ${colors.ring}`
          )}
        >
          <Bot className="w-5 h-5 text-white" />

          {/* Status Indicator */}
          <StatusIndicator status={data.status} />

          {/* Conflict Badge */}
          {data.highlightConflict && (
            <div className="absolute -top-1 -right-1 p-0.5 bg-red-500 rounded-full shadow-md">
              <AlertTriangle className="w-2.5 h-2.5 text-white" />
            </div>
          )}
        </div>

        {/* Name Label */}
        <div
          className={cn(
            'mt-1.5 px-2 py-0.5 rounded-md',
            'bg-white dark:bg-slate-800',
            'shadow-sm border border-slate-200 dark:border-slate-700',
            'max-w-[100px]'
          )}
        >
          <span className="text-[10px] font-medium text-slate-700 dark:text-slate-300 truncate block text-center">
            {data.name}
          </span>
        </div>

        {/* Pack Badge */}
        <div className="mt-0.5">
          <span className="text-[8px] text-slate-400 dark:text-slate-500 capitalize">
            {data.pack.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* Connection Handles */}
      <Handle
        type="target"
        position={Position.Top}
        className={cn(
          '!w-2.5 !h-2.5 !border-2 !rounded-full',
          '!bg-white dark:!bg-slate-800',
          data.highlightConflict
            ? '!border-red-500'
            : `!border-slate-300 dark:!border-slate-600`,
          '!top-0'
        )}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className={cn(
          '!w-2.5 !h-2.5 !border-2 !rounded-full',
          '!bg-white dark:!bg-slate-800',
          data.highlightConflict
            ? '!border-red-500'
            : `!border-slate-300 dark:!border-slate-600`,
          '!bottom-0'
        )}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left-target"
        className={cn(
          '!w-2.5 !h-2.5 !border-2 !rounded-full',
          '!bg-white dark:!bg-slate-800',
          data.highlightConflict
            ? '!border-red-500'
            : `!border-slate-300 dark:!border-slate-600`,
          '!left-0'
        )}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right-source"
        className={cn(
          '!w-2.5 !h-2.5 !border-2 !rounded-full',
          '!bg-white dark:!bg-slate-800',
          data.highlightConflict
            ? '!border-red-500'
            : `!border-slate-300 dark:!border-slate-600`,
          '!right-0'
        )}
      />
    </div>
  );
}

export const AgentNode = memo(AgentNodeComponent);
export default AgentNode;
