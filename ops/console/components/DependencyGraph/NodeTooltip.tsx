/**
 * AgentOS Ops Console - Node Tooltip Component
 * Detailed hover tooltip for graph nodes
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import {
  Package,
  Bot,
  AlertTriangle,
  CheckCircle,
  XCircle,
  PauseCircle,
  Clock,
  GitBranch,
  Zap,
  Activity,
} from 'lucide-react';
import type { AgentPack } from '@/types';

// ============================================
// Types
// ============================================

export interface TooltipData {
  id: string;
  type: 'pack' | 'agent';
  name: string;
  pack?: AgentPack;
  version?: string;
  description?: string;
  status?: 'active' | 'inactive' | 'error' | 'deprecated';
  agentCount?: number;
  dependencyCount?: number;
  hasConflict?: boolean;
  conflictReason?: string;
  lastUpdated?: string;
  successRate?: number;
}

interface NodeTooltipProps {
  data: TooltipData;
  visible: boolean;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

// ============================================
// Status Icon Component
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
// Status Badge Component
// ============================================

const StatusBadge: React.FC<{ status?: string }> = ({ status }) => {
  const statusStyles = {
    active: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    inactive: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    error: 'bg-red-500/20 text-red-400 border-red-500/30',
    deprecated: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  };

  if (!status) return null;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border',
        statusStyles[status as keyof typeof statusStyles] || statusStyles.inactive
      )}
    >
      <StatusIcon status={status} />
      <span className="capitalize">{status}</span>
    </span>
  );
};

// ============================================
// Info Row Component
// ============================================

interface InfoRowProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}

const InfoRow: React.FC<InfoRowProps> = ({ icon, label, value }) => (
  <div className="flex items-center justify-between gap-4">
    <div className="flex items-center gap-1.5 text-slate-400">
      {icon}
      <span className="text-[10px]">{label}</span>
    </div>
    <span className="text-[11px] font-medium text-slate-200">{value}</span>
  </div>
);

// ============================================
// Node Tooltip Component
// ============================================

export function NodeTooltip({
  data,
  visible,
  position = 'top',
  className,
}: NodeTooltipProps) {
  if (!visible) return null;

  const isPack = data.type === 'pack';

  // Position classes
  const positionClasses = {
    top: 'left-1/2 -translate-x-1/2 bottom-full mb-3',
    bottom: 'left-1/2 -translate-x-1/2 top-full mt-3',
    left: 'right-full mr-3 top-1/2 -translate-y-1/2',
    right: 'left-full ml-3 top-1/2 -translate-y-1/2',
  };

  // Arrow classes
  const arrowClasses = {
    top: 'left-1/2 -translate-x-1/2 top-full border-l-transparent border-r-transparent border-b-transparent border-t-slate-800',
    bottom: 'left-1/2 -translate-x-1/2 bottom-full border-l-transparent border-r-transparent border-t-transparent border-b-slate-800',
    left: 'left-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-slate-800',
    right: 'right-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-slate-800',
  };

  return (
    <div
      className={cn(
        'absolute z-50 pointer-events-none',
        positionClasses[position],
        className
      )}
    >
      <div className="bg-slate-800 dark:bg-zinc-900 rounded-lg shadow-xl border border-slate-700 dark:border-zinc-700 overflow-hidden min-w-[220px] max-w-[280px]">
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2 bg-slate-700/50 dark:bg-zinc-800/50 border-b border-slate-700 dark:border-zinc-700">
          <div
            className={cn(
              'flex items-center justify-center w-7 h-7 rounded-lg',
              isPack
                ? 'bg-purple-500/20 text-purple-400'
                : 'bg-blue-500/20 text-blue-400'
            )}
          >
            {isPack ? (
              <Package className="w-4 h-4" />
            ) : (
              <Bot className="w-4 h-4" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white truncate">
                {data.name}
              </span>
              {data.version && (
                <span className="text-[10px] text-slate-400 bg-slate-700/50 px-1.5 py-0.5 rounded">
                  v{data.version}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 text-[10px] text-slate-400">
              <span className="capitalize">{data.type}</span>
              {data.pack && !isPack && (
                <>
                  <span className="text-slate-600">|</span>
                  <span className="capitalize">{data.pack}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-3 py-2 space-y-2">
          {/* Description */}
          {data.description && (
            <p className="text-[11px] text-slate-300 line-clamp-2">
              {data.description}
            </p>
          )}

          {/* Status */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400">Status</span>
            <StatusBadge status={data.status} />
          </div>

          {/* Divider */}
          <div className="h-px bg-slate-700/50" />

          {/* Stats */}
          <div className="space-y-1.5">
            {isPack && data.agentCount !== undefined && (
              <InfoRow
                icon={<Bot className="w-3 h-3" />}
                label="Agents"
                value={data.agentCount}
              />
            )}
            {data.dependencyCount !== undefined && (
              <InfoRow
                icon={<GitBranch className="w-3 h-3" />}
                label="Dependencies"
                value={data.dependencyCount}
              />
            )}
            {data.successRate !== undefined && (
              <InfoRow
                icon={<Activity className="w-3 h-3" />}
                label="Success Rate"
                value={`${data.successRate}%`}
              />
            )}
            {data.lastUpdated && (
              <InfoRow
                icon={<Clock className="w-3 h-3" />}
                label="Updated"
                value={data.lastUpdated}
              />
            )}
          </div>

          {/* Conflict Warning */}
          {data.hasConflict && (
            <>
              <div className="h-px bg-slate-700/50" />
              <div className="flex items-start gap-2 p-2 bg-red-500/10 rounded-md border border-red-500/20">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[11px] font-medium text-red-400">
                    Conflict Detected
                  </p>
                  {data.conflictReason && (
                    <p className="text-[10px] text-red-400/80 mt-0.5">
                      {data.conflictReason}
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-3 py-1.5 bg-slate-700/30 border-t border-slate-700/50">
          <p className="text-[9px] text-slate-500 text-center">
            Click to select | Double-click to edit
          </p>
        </div>
      </div>

      {/* Arrow */}
      <div
        className={cn(
          'absolute w-0 h-0 border-[6px]',
          arrowClasses[position]
        )}
      />
    </div>
  );
}

export default NodeTooltip;
