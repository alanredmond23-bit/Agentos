/**
 * AgentOS Ops Console - Graph Tooltip Component
 * Floating tooltip for graph elements with actions
 * Shows detailed info on hover with View/Edit action buttons
 */

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
  GitBranch,
  Activity,
  ExternalLink,
  Edit3,
  Eye,
  Zap,
  ChevronRight,
} from 'lucide-react';
import type { AgentPack } from '@/types';

// ============================================
// Types
// ============================================

export interface TooltipData {
  id: string;
  type: 'pack' | 'agent' | 'edge';
  name: string;
  pack?: AgentPack;
  version?: string;
  description?: string;
  status?: 'active' | 'inactive' | 'error' | 'deprecated';
  agentCount?: number;
  agents?: Array<{ id: string; name: string; status: string }>;
  dependencyCount?: number;
  dependencies?: string[];
  hasConflict?: boolean;
  conflictReason?: string;
  edgeType?: 'dependency' | 'optional' | 'conflict';
  source?: string;
  target?: string;
}

export interface TooltipPosition {
  x: number;
  y: number;
}

export interface GraphTooltipProps {
  data: TooltipData | null;
  position: TooltipPosition | null;
  visible: boolean;
  onView?: (id: string, type: 'pack' | 'agent' | 'edge') => void;
  onEdit?: (id: string, type: 'pack' | 'agent' | 'edge') => void;
  className?: string;
}

// ============================================
// Status Components
// ============================================

const StatusIcon: React.FC<{ status?: string; size?: number }> = ({ status, size = 14 }) => {
  const iconProps = { width: size, height: size };

  switch (status) {
    case 'active':
      return <CheckCircle {...iconProps} className="text-emerald-400" />;
    case 'inactive':
      return <PauseCircle {...iconProps} className="text-slate-400" />;
    case 'error':
      return <XCircle {...iconProps} className="text-red-400" />;
    case 'deprecated':
      return <Clock {...iconProps} className="text-amber-400" />;
    default:
      return null;
  }
};

const StatusBadge: React.FC<{ status?: string }> = ({ status }) => {
  const statusStyles: Record<string, string> = {
    active: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    inactive: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
    error: 'bg-red-500/20 text-red-300 border-red-500/30',
    deprecated: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  };

  if (!status) return null;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border',
        statusStyles[status] || statusStyles.inactive
      )}
    >
      <StatusIcon status={status} size={10} />
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
// Edge Type Badge
// ============================================

const EdgeTypeBadge: React.FC<{ type?: string; hasConflict?: boolean }> = ({ type, hasConflict }) => {
  if (hasConflict) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-500/20 text-red-300 border border-red-500/30">
        <AlertTriangle className="w-3 h-3" />
        Conflict
      </span>
    );
  }

  const typeStyles: Record<string, string> = {
    dependency: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    optional: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border',
        typeStyles[type || 'dependency']
      )}
    >
      <GitBranch className="w-3 h-3" />
      <span className="capitalize">{type || 'dependency'}</span>
    </span>
  );
};

// ============================================
// Agent List Component
// ============================================

interface AgentListProps {
  agents: Array<{ id: string; name: string; status: string }>;
  maxDisplay?: number;
}

const AgentList: React.FC<AgentListProps> = ({ agents, maxDisplay = 4 }) => {
  const displayAgents = agents.slice(0, maxDisplay);
  const remaining = agents.length - maxDisplay;

  return (
    <div className="space-y-1">
      {displayAgents.map((agent) => (
        <div
          key={agent.id}
          className="flex items-center justify-between px-2 py-1 bg-slate-700/50 rounded"
        >
          <div className="flex items-center gap-1.5">
            <Bot className="w-3 h-3 text-slate-400" />
            <span className="text-[10px] text-slate-300">{agent.name}</span>
          </div>
          <div
            className={cn(
              'w-2 h-2 rounded-full',
              agent.status === 'active' ? 'bg-emerald-500' :
              agent.status === 'error' ? 'bg-red-500' :
              'bg-slate-500'
            )}
          />
        </div>
      ))}
      {remaining > 0 && (
        <div className="text-[10px] text-slate-500 text-center py-0.5">
          +{remaining} more agent{remaining !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
};

// ============================================
// Graph Tooltip Component
// ============================================

export function GraphTooltip({
  data,
  position,
  visible,
  onView,
  onEdit,
  className,
}: GraphTooltipProps) {
  const router = useRouter();
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [adjustedPosition, setAdjustedPosition] = useState<TooltipPosition | null>(null);
  const [mounted, setMounted] = useState(false);

  // Handle SSR
  useEffect(() => {
    setMounted(true);
  }, []);

  // Adjust position to stay within viewport
  useEffect(() => {
    if (!position || !tooltipRef.current || !visible) {
      setAdjustedPosition(null);
      return;
    }

    const tooltip = tooltipRef.current;
    const rect = tooltip.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let x = position.x;
    let y = position.y;

    // Offset from cursor
    x += 16;
    y -= 8;

    // Adjust horizontal position
    if (x + rect.width > viewportWidth - 20) {
      x = position.x - rect.width - 16;
    }

    // Adjust vertical position
    if (y + rect.height > viewportHeight - 20) {
      y = viewportHeight - rect.height - 20;
    }

    if (y < 20) {
      y = 20;
    }

    setAdjustedPosition({ x, y });
  }, [position, visible]);

  // Handle view action
  const handleView = useCallback(() => {
    if (!data) return;

    if (onView) {
      onView(data.id, data.type);
    } else if (data.type === 'pack' && data.pack) {
      router.push(`/studio/packs/${data.pack}`);
    }
  }, [data, onView, router]);

  // Handle edit action
  const handleEdit = useCallback(() => {
    if (!data) return;

    if (onEdit) {
      onEdit(data.id, data.type);
    } else if (data.type === 'pack' && data.pack) {
      router.push(`/studio/packs/${data.pack}/edit`);
    }
  }, [data, onEdit, router]);

  // Don't render on server or if not visible
  if (!mounted || !visible || !data || !position) {
    return null;
  }

  const isPack = data.type === 'pack';
  const isAgent = data.type === 'agent';
  const isEdge = data.type === 'edge';

  // Render tooltip content
  const tooltipContent = (
    <div
      ref={tooltipRef}
      className={cn(
        'fixed z-[100] pointer-events-auto',
        'animate-in fade-in-0 zoom-in-95',
        'transition-all duration-150',
        className
      )}
      style={{
        left: adjustedPosition?.x ?? position.x,
        top: adjustedPosition?.y ?? position.y,
      }}
    >
      <div
        className={cn(
          'bg-slate-800/95 dark:bg-zinc-900/95 backdrop-blur-sm',
          'rounded-xl shadow-2xl',
          'border border-slate-700/50 dark:border-zinc-700/50',
          'overflow-hidden min-w-[260px] max-w-[320px]'
        )}
      >
        {/* Header */}
        <div
          className={cn(
            'flex items-center gap-3 px-4 py-3',
            'border-b border-slate-700/50 dark:border-zinc-700/50',
            isPack && 'bg-purple-500/10',
            isAgent && 'bg-blue-500/10',
            isEdge && (data.hasConflict ? 'bg-red-500/10' : 'bg-slate-700/30')
          )}
        >
          {/* Icon */}
          <div
            className={cn(
              'flex items-center justify-center w-9 h-9 rounded-lg',
              isPack && 'bg-purple-500/20 text-purple-400',
              isAgent && 'bg-blue-500/20 text-blue-400',
              isEdge && (data.hasConflict ? 'bg-red-500/20 text-red-400' : 'bg-slate-600/50 text-slate-400')
            )}
          >
            {isPack && <Package className="w-5 h-5" />}
            {isAgent && <Bot className="w-5 h-5" />}
            {isEdge && <GitBranch className="w-5 h-5" />}
          </div>

          {/* Title & Meta */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white truncate">
                {data.name}
              </span>
              {data.version && (
                <span className="text-[10px] text-slate-400 bg-slate-700/50 px-1.5 py-0.5 rounded shrink-0">
                  v{data.version}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-slate-400 capitalize">{data.type}</span>
              {data.pack && !isPack && (
                <>
                  <ChevronRight className="w-3 h-3 text-slate-600" />
                  <span className="text-[10px] text-slate-400 capitalize">{data.pack}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 py-3 space-y-3">
          {/* Description */}
          {data.description && (
            <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
              {data.description}
            </p>
          )}

          {/* Status Row */}
          {data.status && !isEdge && (
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400">Status</span>
              <StatusBadge status={data.status} />
            </div>
          )}

          {/* Edge Type */}
          {isEdge && (
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400">Type</span>
              <EdgeTypeBadge type={data.edgeType} hasConflict={data.hasConflict} />
            </div>
          )}

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
            {(isPack || isAgent) && data.dependencyCount !== undefined && (
              <InfoRow
                icon={<GitBranch className="w-3 h-3" />}
                label="Dependencies"
                value={data.dependencyCount}
              />
            )}
            {isEdge && data.source && data.target && (
              <>
                <InfoRow
                  icon={<Package className="w-3 h-3" />}
                  label="From"
                  value={data.source.replace('pack-', '')}
                />
                <InfoRow
                  icon={<Package className="w-3 h-3" />}
                  label="To"
                  value={data.target.replace('pack-', '')}
                />
              </>
            )}
          </div>

          {/* Agents List */}
          {isPack && data.agents && data.agents.length > 0 && (
            <>
              <div className="h-px bg-slate-700/50" />
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Bot className="w-3 h-3 text-slate-400" />
                  <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                    Agents
                  </span>
                </div>
                <AgentList agents={data.agents} maxDisplay={4} />
              </div>
            </>
          )}

          {/* Conflict Warning */}
          {data.hasConflict && (
            <>
              <div className="h-px bg-slate-700/50" />
              <div className="flex items-start gap-2 p-2.5 bg-red-500/10 rounded-lg border border-red-500/20">
                <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[11px] font-medium text-red-300">
                    Conflict Detected
                  </p>
                  {data.conflictReason && (
                    <p className="text-[10px] text-red-400/80 mt-0.5 leading-relaxed">
                      {data.conflictReason}
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        {(isPack || isAgent) && (
          <div className="flex items-center gap-2 px-4 py-3 bg-slate-700/30 border-t border-slate-700/50">
            <button
              onClick={handleView}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg',
                'text-[11px] font-medium',
                'bg-purple-600 hover:bg-purple-700 text-white',
                'transition-colors'
              )}
            >
              <Eye className="w-3.5 h-3.5" />
              View Details
            </button>
            <button
              onClick={handleEdit}
              className={cn(
                'flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg',
                'text-[11px] font-medium',
                'bg-slate-600 hover:bg-slate-500 text-slate-200',
                'transition-colors'
              )}
            >
              <Edit3 className="w-3.5 h-3.5" />
              Edit
            </button>
          </div>
        )}

        {/* Hint */}
        <div className="px-4 py-2 bg-slate-700/20 border-t border-slate-700/30">
          <p className="text-[9px] text-slate-500 text-center">
            {isPack || isAgent ? 'Double-click to open' : 'Click edge to see dependency details'}
          </p>
        </div>
      </div>
    </div>
  );

  // Render in portal for proper z-index handling
  return createPortal(tooltipContent, document.body);
}

// ============================================
// Hook for Tooltip State Management
// ============================================

export interface UseGraphTooltipResult {
  tooltipData: TooltipData | null;
  tooltipPosition: TooltipPosition | null;
  tooltipVisible: boolean;
  showTooltip: (data: TooltipData, position: TooltipPosition) => void;
  hideTooltip: () => void;
  updatePosition: (position: TooltipPosition) => void;
}

export function useGraphTooltip(delay: number = 200): UseGraphTooltipResult {
  const [tooltipData, setTooltipData] = useState<TooltipData | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition | null>(null);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showTooltip = useCallback((data: TooltipData, position: TooltipPosition) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setTooltipData(data);
    setTooltipPosition(position);

    timeoutRef.current = setTimeout(() => {
      setTooltipVisible(true);
    }, delay);
  }, [delay]);

  const hideTooltip = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setTooltipVisible(false);

    // Delay clearing data to allow fade out animation
    timeoutRef.current = setTimeout(() => {
      setTooltipData(null);
      setTooltipPosition(null);
    }, 150);
  }, []);

  const updatePosition = useCallback((position: TooltipPosition) => {
    setTooltipPosition(position);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    tooltipData,
    tooltipPosition,
    tooltipVisible,
    showTooltip,
    hideTooltip,
    updatePosition,
  };
}

export default GraphTooltip;
