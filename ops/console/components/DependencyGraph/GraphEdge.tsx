/**
 * AgentOS Ops Console - Graph Edge Component
 * Custom ReactFlow edge for dependency connections
 */

'use client';

import React, { memo } from 'react';
import {
  EdgeProps,
  getBezierPath,
  EdgeLabelRenderer,
  BaseEdge,
} from 'reactflow';
import { cn } from '@/lib/utils';
import { AlertTriangle } from 'lucide-react';
// Edge type - dependency or optional
type EdgeType = 'dependency' | 'optional';

// ============================================
// Types
// ============================================

interface EdgeData {
  type: EdgeType;
  hasConflict?: boolean;
  conflictReason?: string;
  highlightConflict?: boolean;
}

// ============================================
// Edge Styles
// ============================================

const getEdgeStyles = (type: EdgeType, hasConflict: boolean, highlighted: boolean) => {
  if (hasConflict && highlighted) {
    return {
      stroke: '#ef4444', // red-500
      strokeWidth: 2,
      strokeDasharray: '0',
    };
  }

  switch (type) {
    case 'dependency':
      return {
        stroke: '#94a3b8', // slate-400
        strokeWidth: 1.5,
        strokeDasharray: '0',
      };
    case 'optional':
      return {
        stroke: '#cbd5e1', // slate-300
        strokeWidth: 1.5,
        strokeDasharray: '5,5',
      };
    default:
      return {
        stroke: '#94a3b8',
        strokeWidth: 1.5,
        strokeDasharray: '0',
      };
  }
};

// ============================================
// Conflict Label Component
// ============================================

interface ConflictLabelProps {
  labelX: number;
  labelY: number;
  reason?: string;
}

const ConflictLabel: React.FC<ConflictLabelProps> = ({ labelX, labelY, reason }) => {
  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <EdgeLabelRenderer>
      <div
        className="absolute pointer-events-auto nodrag nopan"
        style={{
          transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Conflict Icon */}
        <div className="relative">
          <div className="flex items-center justify-center w-6 h-6 bg-red-500 rounded-full shadow-md cursor-pointer">
            <AlertTriangle className="w-3.5 h-3.5 text-white" />
          </div>

          {/* Tooltip */}
          {isHovered && reason && (
            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-50">
              <div className="bg-slate-900 dark:bg-zinc-800 text-white px-3 py-2 rounded-lg shadow-xl text-xs whitespace-nowrap">
                <div className="font-medium text-red-400">Dependency Conflict</div>
                <div className="text-slate-300 dark:text-zinc-400 mt-1 max-w-[200px]">
                  {reason}
                </div>
                {/* Arrow */}
                <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-slate-900 dark:border-t-zinc-800" />
              </div>
            </div>
          )}
        </div>
      </div>
    </EdgeLabelRenderer>
  );
};

// ============================================
// Edge Type Label Component
// ============================================

interface EdgeTypeLabelProps {
  labelX: number;
  labelY: number;
  type: EdgeType;
}

const EdgeTypeLabel: React.FC<EdgeTypeLabelProps> = ({ labelX, labelY, type }) => {
  if (type !== 'optional') return null;

  return (
    <EdgeLabelRenderer>
      <div
        className="absolute pointer-events-none nodrag nopan"
        style={{
          transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
        }}
      >
        <span
          className={cn(
            'px-2 py-0.5 text-[10px] font-medium rounded-full',
            'bg-slate-100 dark:bg-dark-bg-tertiary',
            'text-slate-500 dark:text-dark-text-tertiary',
            'border border-slate-200 dark:border-dark-border-secondary'
          )}
        >
          optional
        </span>
      </div>
    </EdgeLabelRenderer>
  );
};

// ============================================
// Graph Edge Component
// ============================================

function GraphEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
  style,
}: EdgeProps<EdgeData>) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    curvature: 0.25,
  });

  const edgeType = data?.type || 'dependency';
  const hasConflict = data?.hasConflict || false;
  const highlightConflict = data?.highlightConflict || false;
  const conflictReason = data?.conflictReason;

  const edgeStyles = getEdgeStyles(edgeType, hasConflict, highlightConflict);

  return (
    <>
      {/* Main Edge Path */}
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          ...edgeStyles,
        }}
      />

      {/* Animated overlay for optional edges */}
      {edgeType === 'optional' && !hasConflict && (
        <path
          d={edgePath}
          fill="none"
          stroke="url(#animated-gradient)"
          strokeWidth={1.5}
          strokeDasharray="5,5"
          className="animate-dash"
        />
      )}

      {/* Conflict glow effect */}
      {hasConflict && highlightConflict && (
        <path
          d={edgePath}
          fill="none"
          stroke="#ef4444"
          strokeWidth={6}
          strokeOpacity={0.2}
          className="pointer-events-none"
        />
      )}

      {/* Labels */}
      {hasConflict && highlightConflict && (
        <ConflictLabel
          labelX={labelX}
          labelY={labelY}
          reason={conflictReason}
        />
      )}

      {!hasConflict && (
        <EdgeTypeLabel labelX={labelX} labelY={labelY} type={edgeType} />
      )}

      {/* SVG Definitions for animations */}
      <defs>
        <linearGradient id="animated-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#cbd5e1">
            <animate
              attributeName="offset"
              values="0;1"
              dur="1.5s"
              repeatCount="indefinite"
            />
          </stop>
          <stop offset="50%" stopColor="#94a3b8">
            <animate
              attributeName="offset"
              values="0;1"
              dur="1.5s"
              repeatCount="indefinite"
            />
          </stop>
          <stop offset="100%" stopColor="#cbd5e1">
            <animate
              attributeName="offset"
              values="0;1"
              dur="1.5s"
              repeatCount="indefinite"
            />
          </stop>
        </linearGradient>
      </defs>
    </>
  );
}

export const GraphEdge = memo(GraphEdgeComponent);
export default GraphEdge;
