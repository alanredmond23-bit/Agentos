/**
 * AgentOS Ops Console - EditorSidebar Component
 * Navigation sidebar for cluster sections with progress indicators
 */

import React from 'react';
import { cn } from '@/lib/utils';
import {
  Package,
  User,
  MessageSquare,
  Shield,
  Building2,
  Cpu,
  Server,
  Users,
  Brain,
  CheckCircle2,
  AlertCircle,
  Circle,
  ChevronRight,
} from 'lucide-react';

// ============================================
// EditorSidebar Types
// ============================================

export type ClusterStatus = 'complete' | 'incomplete' | 'error' | 'empty';

export interface ClusterNavItem {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  status: ClusterStatus;
  requiredFields: number;
  completedFields: number;
}

export interface EditorSidebarProps {
  clusters: ClusterNavItem[];
  activeCluster: string;
  onClusterClick: (clusterId: string) => void;
  expandedClusters: string[];
  onToggleAll: (expand: boolean) => void;
  className?: string;
}

// ============================================
// Default Cluster Configuration
// ============================================

export const DEFAULT_CLUSTERS: Omit<ClusterNavItem, 'status' | 'requiredFields' | 'completedFields'>[] = [
  {
    id: 'meta',
    label: 'Metadata',
    description: 'Version, pack, schema',
    icon: <Package className="w-4 h-4" />,
  },
  {
    id: 'identity',
    label: 'Identity',
    description: 'Name, role, mission',
    icon: <User className="w-4 h-4" />,
  },
  {
    id: 'voice',
    label: 'Voice',
    description: 'Tone, vocabulary, constraints',
    icon: <MessageSquare className="w-4 h-4" />,
  },
  {
    id: 'authority',
    label: 'Authority',
    description: 'Permissions and limits',
    icon: <Shield className="w-4 h-4" />,
  },
  {
    id: 'business',
    label: 'Business',
    description: 'Department, cost center',
    icon: <Building2 className="w-4 h-4" />,
  },
  {
    id: 'technical',
    label: 'Technical',
    description: 'Model, endpoint, settings',
    icon: <Cpu className="w-4 h-4" />,
  },
  {
    id: 'mcp_servers',
    label: 'MCP Servers',
    description: 'Connected MCP servers',
    icon: <Server className="w-4 h-4" />,
  },
  {
    id: 'agents',
    label: 'Agents',
    description: 'Sub-agents, orchestration',
    icon: <Users className="w-4 h-4" />,
  },
  {
    id: 'memory',
    label: 'Memory',
    description: 'Working, session, long-term',
    icon: <Brain className="w-4 h-4" />,
  },
];

// ============================================
// EditorSidebar Component
// ============================================

export function EditorSidebar({
  clusters,
  activeCluster,
  onClusterClick,
  expandedClusters,
  onToggleAll,
  className,
}: EditorSidebarProps) {
  const totalRequired = clusters.reduce((acc, c) => acc + c.requiredFields, 0);
  const totalCompleted = clusters.reduce((acc, c) => acc + c.completedFields, 0);
  const completionPercentage = totalRequired > 0 ? Math.round((totalCompleted / totalRequired) * 100) : 0;

  const getStatusIcon = (status: ClusterStatus) => {
    switch (status) {
      case 'complete':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'incomplete':
        return <Circle className="w-4 h-4 text-amber-500 fill-amber-500/20" />;
      default:
        return <Circle className="w-4 h-4 text-slate-300 dark:text-dark-text-muted" />;
    }
  };

  const getStatusColor = (status: ClusterStatus) => {
    switch (status) {
      case 'complete':
        return 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10';
      case 'error':
        return 'border-red-500 bg-red-50 dark:bg-red-500/10';
      case 'incomplete':
        return 'border-amber-500 bg-amber-50 dark:bg-amber-500/10';
      default:
        return 'border-slate-200 dark:border-dark-border-primary';
    }
  };

  return (
    <aside
      className={cn(
        'w-64 flex-shrink-0 bg-slate-50 dark:bg-dark-bg-tertiary border-r border-slate-200 dark:border-dark-border-primary',
        className
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-dark-border-primary">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-dark-text-primary">
          Configuration Clusters
        </h2>
        <p className="text-xs text-slate-500 dark:text-dark-text-tertiary mt-0.5">
          {clusters.length} sections
        </p>
      </div>

      {/* Progress Bar */}
      <div className="px-4 py-3 border-b border-slate-200 dark:border-dark-border-primary">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-medium text-slate-600 dark:text-dark-text-secondary">
            Completion
          </span>
          <span className="text-xs font-semibold text-slate-900 dark:text-dark-text-primary">
            {completionPercentage}%
          </span>
        </div>
        <div className="h-2 bg-slate-200 dark:bg-dark-bg-elevated rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-300',
              completionPercentage === 100
                ? 'bg-emerald-500'
                : completionPercentage >= 50
                  ? 'bg-brand-500'
                  : 'bg-amber-500'
            )}
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
        <p className="text-xs text-slate-500 dark:text-dark-text-tertiary mt-1.5">
          {totalCompleted} of {totalRequired} required fields
        </p>
      </div>

      {/* Expand/Collapse All */}
      <div className="px-4 py-2 flex items-center justify-between border-b border-slate-200 dark:border-dark-border-primary">
        <button
          type="button"
          onClick={() => onToggleAll(true)}
          className="text-xs text-brand-600 dark:text-brand-400 hover:underline"
        >
          Expand All
        </button>
        <span className="text-xs text-slate-300 dark:text-dark-text-muted">|</span>
        <button
          type="button"
          onClick={() => onToggleAll(false)}
          className="text-xs text-brand-600 dark:text-brand-400 hover:underline"
        >
          Collapse All
        </button>
      </div>

      {/* Cluster Navigation */}
      <nav className="p-2 space-y-1">
        {clusters.map((cluster) => {
          const isActive = activeCluster === cluster.id;
          const isExpanded = expandedClusters.includes(cluster.id);

          return (
            <button
              key={cluster.id}
              type="button"
              onClick={() => onClusterClick(cluster.id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors',
                'border-l-2',
                isActive
                  ? getStatusColor(cluster.status)
                  : 'border-transparent hover:bg-slate-100 dark:hover:bg-dark-bg-elevated'
              )}
            >
              {/* Icon */}
              <div
                className={cn(
                  'flex items-center justify-center w-8 h-8 rounded-lg',
                  isActive
                    ? 'bg-white dark:bg-dark-bg-secondary shadow-sm'
                    : 'bg-slate-100 dark:bg-dark-bg-elevated'
                )}
              >
                <span
                  className={cn(
                    isActive
                      ? 'text-brand-600 dark:text-brand-400'
                      : 'text-slate-500 dark:text-dark-text-tertiary'
                  )}
                >
                  {cluster.icon}
                </span>
              </div>

              {/* Label and Description */}
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    'text-sm font-medium truncate',
                    isActive
                      ? 'text-slate-900 dark:text-dark-text-primary'
                      : 'text-slate-700 dark:text-dark-text-secondary'
                  )}
                >
                  {cluster.label}
                </p>
                <p className="text-xs text-slate-500 dark:text-dark-text-tertiary truncate">
                  {cluster.description}
                </p>
              </div>

              {/* Status and Expand Indicator */}
              <div className="flex items-center gap-1.5">
                {getStatusIcon(cluster.status)}
                <ChevronRight
                  className={cn(
                    'w-4 h-4 text-slate-400 transition-transform',
                    isExpanded && 'rotate-90'
                  )}
                />
              </div>
            </button>
          );
        })}
      </nav>

      {/* Help Section */}
      <div className="mt-auto p-4 border-t border-slate-200 dark:border-dark-border-primary">
        <div className="p-3 bg-blue-50 dark:bg-blue-500/10 rounded-lg">
          <h3 className="text-xs font-semibold text-blue-800 dark:text-blue-300 mb-1">
            Need Help?
          </h3>
          <p className="text-xs text-blue-600 dark:text-blue-400">
            Click on any cluster to view and edit its fields. Required fields are marked with a red asterisk.
          </p>
        </div>
      </div>
    </aside>
  );
}

export default EditorSidebar;
