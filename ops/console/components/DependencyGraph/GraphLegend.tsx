/**
 * AgentOS Ops Console - Graph Legend Component
 * Enhanced legend showing node types, edge styles, and pack colors
 */

'use client';

import React from 'react';
import { Panel } from 'reactflow';
import { cn } from '@/lib/utils';
import {
  Package,
  Bot,
  AlertTriangle,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Circle,
  CheckCircle,
  PauseCircle,
  XCircle,
} from 'lucide-react';

// ============================================
// Legend Item Component
// ============================================

interface LegendItemProps {
  icon?: React.ReactNode;
  color?: string;
  lineStyle?: 'solid' | 'dashed';
  lineColor?: string;
  label: string;
  description?: string;
}

const LegendItem: React.FC<LegendItemProps> = ({
  icon,
  color,
  lineStyle,
  lineColor = 'bg-slate-400',
  label,
  description,
}) => (
  <div className="flex items-center gap-2.5 py-1">
    {/* Icon or Line */}
    {icon ? (
      <div className={cn('flex items-center justify-center w-6 h-6 rounded-md', color)}>
        {icon}
      </div>
    ) : (
      <div className="flex items-center justify-center w-6 h-4">
        <div
          className={cn(
            'w-4 h-0.5 rounded-full',
            lineColor,
            lineStyle === 'dashed' && 'border-t-2 border-dashed border-current bg-transparent'
          )}
          style={lineStyle === 'dashed' ? { borderColor: 'currentColor' } : undefined}
        />
        <ArrowRight className="w-2.5 h-2.5 text-slate-400 -ml-0.5" />
      </div>
    )}

    {/* Label */}
    <div className="flex-1">
      <span className="text-[11px] font-medium text-slate-700 dark:text-dark-text-secondary">
        {label}
      </span>
      {description && (
        <p className="text-[9px] text-slate-400 dark:text-dark-text-tertiary leading-tight">
          {description}
        </p>
      )}
    </div>
  </div>
);

// ============================================
// Section Component
// ============================================

interface LegendSectionProps {
  title: string;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

const LegendSection: React.FC<LegendSectionProps> = ({
  title,
  children,
  collapsible = false,
  defaultCollapsed = false,
}) => {
  const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed);

  return (
    <div>
      {collapsible ? (
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center justify-between w-full py-1 group"
        >
          <h4 className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 dark:text-dark-text-tertiary">
            {title}
          </h4>
          {isCollapsed ? (
            <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-slate-500" />
          ) : (
            <ChevronUp className="w-3 h-3 text-slate-400 group-hover:text-slate-500" />
          )}
        </button>
      ) : (
        <h4 className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 dark:text-dark-text-tertiary py-1">
          {title}
        </h4>
      )}
      {!isCollapsed && <div className="space-y-0.5">{children}</div>}
    </div>
  );
};

// ============================================
// Status Dot Component
// ============================================

interface StatusDotProps {
  color: string;
  pulse?: boolean;
}

const StatusDot: React.FC<StatusDotProps> = ({ color, pulse = false }) => (
  <div
    className={cn(
      'w-2.5 h-2.5 rounded-full',
      color,
      pulse && 'animate-pulse'
    )}
  />
);

// ============================================
// Graph Legend Component
// ============================================

export function GraphLegend() {
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  return (
    <Panel position="bottom-right" className="mr-[200px] mb-4">
      <div
        className={cn(
          'bg-white/95 dark:bg-dark-bg-secondary/95 backdrop-blur-sm rounded-xl shadow-lg border border-slate-200 dark:border-dark-border-primary overflow-hidden transition-all duration-200',
          isCollapsed ? 'w-auto' : 'w-52'
        )}
      >
        {/* Header */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center justify-between w-full px-3 py-2 bg-slate-50 dark:bg-dark-bg-tertiary border-b border-slate-200 dark:border-dark-border-primary hover:bg-slate-100 dark:hover:bg-dark-bg-elevated transition-colors"
        >
          <span className="text-xs font-semibold text-slate-700 dark:text-dark-text-secondary">
            Legend
          </span>
          {isCollapsed ? (
            <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          )}
        </button>

        {/* Content */}
        {!isCollapsed && (
          <div className="p-3 space-y-3">
            {/* Node Types */}
            <LegendSection title="Node Types">
              <LegendItem
                icon={<Package className="w-3.5 h-3.5 text-purple-500" />}
                color="bg-purple-100 dark:bg-purple-500/20"
                label="Pack"
                description="Collection of agents"
              />
              <LegendItem
                icon={<Bot className="w-3.5 h-3.5 text-blue-500" />}
                color="bg-blue-100 dark:bg-blue-500/20"
                label="Agent"
                description="Individual AI agent"
              />
            </LegendSection>

            {/* Edge Types */}
            <LegendSection title="Dependencies">
              <LegendItem
                lineColor="bg-slate-400"
                label="Required"
                description="Required dependency"
              />
              <LegendItem
                lineStyle="dashed"
                lineColor="bg-slate-300"
                label="Optional"
                description="Optional dependency"
              />
              <LegendItem
                lineColor="bg-red-500"
                label="Conflict"
                description="Dependency with issues"
              />
            </LegendSection>

            {/* Status */}
            <LegendSection title="Status">
              <div className="grid grid-cols-2 gap-1">
                <div className="flex items-center gap-1.5 py-0.5">
                  <StatusDot color="bg-emerald-500" />
                  <span className="text-[10px] text-slate-600 dark:text-dark-text-secondary">Active</span>
                </div>
                <div className="flex items-center gap-1.5 py-0.5">
                  <StatusDot color="bg-slate-400" />
                  <span className="text-[10px] text-slate-600 dark:text-dark-text-secondary">Inactive</span>
                </div>
                <div className="flex items-center gap-1.5 py-0.5">
                  <StatusDot color="bg-red-500" pulse />
                  <span className="text-[10px] text-slate-600 dark:text-dark-text-secondary">Error</span>
                </div>
                <div className="flex items-center gap-1.5 py-0.5">
                  <StatusDot color="bg-amber-500" />
                  <span className="text-[10px] text-slate-600 dark:text-dark-text-secondary">Deprecated</span>
                </div>
              </div>
            </LegendSection>

            {/* Pack Colors - Collapsible */}
            <LegendSection title="Pack Colors" collapsible defaultCollapsed>
              <div className="grid grid-cols-2 gap-1">
                {[
                  { name: 'devops', color: 'bg-blue-500' },
                  { name: 'qa', color: 'bg-green-500' },
                  { name: 'legal', color: 'bg-amber-500' },
                  { name: 'mobile', color: 'bg-purple-500' },
                  { name: 'research', color: 'bg-cyan-500' },
                  { name: 'planning', color: 'bg-orange-500' },
                  { name: 'analytics', color: 'bg-indigo-500' },
                  { name: 'orchestration', color: 'bg-rose-500' },
                  { name: 'product', color: 'bg-teal-500' },
                  { name: 'marketing', color: 'bg-pink-500' },
                  { name: 'supabase', color: 'bg-emerald-500' },
                  { name: 'design', color: 'bg-violet-500' },
                  { name: 'engineering', color: 'bg-slate-500' },
                  { name: 'error_predictor', color: 'bg-red-500' },
                ].map((pack) => (
                  <div key={pack.name} className="flex items-center gap-1.5 py-0.5">
                    <div className={cn('w-2.5 h-2.5 rounded', pack.color)} />
                    <span className="text-[9px] text-slate-600 dark:text-dark-text-secondary capitalize">
                      {pack.name.replace('_', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            </LegendSection>

            {/* Interactions Hint */}
            <div className="pt-2 border-t border-slate-200 dark:border-dark-border-primary">
              <div className="space-y-1 text-[9px] text-slate-400 dark:text-dark-text-tertiary">
                <div className="flex items-center gap-1.5">
                  <span className="px-1 py-0.5 bg-slate-100 dark:bg-dark-bg-tertiary rounded text-[8px] font-mono">
                    Click
                  </span>
                  <span>Select node</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="px-1 py-0.5 bg-slate-100 dark:bg-dark-bg-tertiary rounded text-[8px] font-mono">
                    Dbl-click
                  </span>
                  <span>Open editor</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="px-1 py-0.5 bg-slate-100 dark:bg-dark-bg-tertiary rounded text-[8px] font-mono">
                    Scroll
                  </span>
                  <span>Zoom in/out</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="px-1 py-0.5 bg-slate-100 dark:bg-dark-bg-tertiary rounded text-[8px] font-mono">
                    Drag
                  </span>
                  <span>Pan canvas</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Panel>
  );
}

export default GraphLegend;
