/**
 * AgentOS Ops Console - Pack Dependencies Component
 * Displays dependency tree visualization with status indicators
 */

'use client';

import React, { useState, useCallback } from 'react';
import {
  Package,
  ChevronRight,
  ChevronDown,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Download,
  RefreshCw,
  Link as LinkIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import type { PackDependency } from './PackDetail';

// ============================================
// Type Definitions
// ============================================

interface PackDependenciesProps {
  dependencies: PackDependency[];
}

interface DependencyNodeProps {
  dependency: PackDependency;
  depth: number;
  isLast: boolean;
}

// ============================================
// Dependency Status Icon Component
// ============================================

function DependencyStatusIcon({
  installed,
  compatible,
}: {
  installed: boolean;
  compatible: boolean;
}) {
  if (installed && compatible) {
    return (
      <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
    );
  }
  if (installed && !compatible) {
    return (
      <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
    );
  }
  return <XCircle className="w-4 h-4 text-slate-400 dark:text-slate-500" />;
}

// ============================================
// Dependency Type Badge Component
// ============================================

function DependencyTypeBadge({ type }: { type: PackDependency['type'] }) {
  const config: Record<
    PackDependency['type'],
    { variant: 'default' | 'warning' | 'info'; label: string }
  > = {
    required: { variant: 'default', label: 'Required' },
    optional: { variant: 'info', label: 'Optional' },
    peer: { variant: 'warning', label: 'Peer' },
  };

  const { variant, label } = config[type];

  return (
    <Badge variant={variant} size="sm">
      {label}
    </Badge>
  );
}

// ============================================
// Dependency Node Component (Tree View)
// ============================================

function DependencyNode({ dependency, depth, isLast }: DependencyNodeProps) {
  const [isExpanded, setIsExpanded] = useState(depth === 0);
  const hasChildren = dependency.children && dependency.children.length > 0;

  return (
    <div className="relative">
      {/* Tree line connectors */}
      {depth > 0 && (
        <div
          className={cn(
            'absolute left-[-20px] top-0 w-[20px] border-l-2 border-b-2 border-slate-200 dark:border-dark-border-secondary',
            isLast ? 'h-[18px] rounded-bl-md' : 'h-full'
          )}
        />
      )}

      <div
        className={cn(
          'relative flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-slate-50 dark:hover:bg-dark-bg-tertiary transition-colors group',
          depth === 0 && 'bg-white dark:bg-dark-bg-elevated border border-slate-200 dark:border-dark-border-primary mb-2'
        )}
      >
        {/* Expand/Collapse Toggle */}
        {hasChildren ? (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-0.5 text-slate-400 hover:text-slate-600 dark:text-dark-text-muted dark:hover:text-dark-text-secondary transition-colors"
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        ) : (
          <div className="w-5" />
        )}

        {/* Package Icon */}
        <div
          className={cn(
            'p-1.5 rounded',
            dependency.installed && dependency.compatible
              ? 'bg-emerald-100 dark:bg-emerald-500/20'
              : dependency.installed && !dependency.compatible
                ? 'bg-amber-100 dark:bg-amber-500/20'
                : 'bg-slate-100 dark:bg-slate-500/20'
          )}
        >
          <Package
            className={cn(
              'w-4 h-4',
              dependency.installed && dependency.compatible
                ? 'text-emerald-600 dark:text-emerald-400'
                : dependency.installed && !dependency.compatible
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-slate-400 dark:text-slate-500'
            )}
          />
        </div>

        {/* Package Name */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm text-slate-900 dark:text-dark-text-primary truncate">
              {dependency.name}
            </span>
            <Badge variant="outline" size="sm">
              {dependency.version}
            </Badge>
          </div>
        </div>

        {/* Status & Type */}
        <div className="flex items-center gap-3">
          <DependencyTypeBadge type={dependency.type} />
          <DependencyStatusIcon
            installed={dependency.installed}
            compatible={dependency.compatible}
          />
        </div>

        {/* Install Button (for uninstalled deps) */}
        {!dependency.installed && dependency.type !== 'optional' && (
          <Button
            variant="ghost"
            size="xs"
            className="opacity-0 group-hover:opacity-100 transition-opacity"
            leftIcon={<Download className="w-3 h-3" />}
          >
            Install
          </Button>
        )}
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div className="ml-8 pl-4 border-l-2 border-slate-200 dark:border-dark-border-secondary">
          {dependency.children!.map((child, index) => (
            <DependencyNode
              key={child.id}
              dependency={child}
              depth={depth + 1}
              isLast={index === dependency.children!.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// Dependencies Summary Card
// ============================================

interface DependencySummaryProps {
  dependencies: PackDependency[];
}

function DependencySummary({ dependencies }: DependencySummaryProps) {
  // Flatten all dependencies for stats
  const getAllDeps = (deps: PackDependency[]): PackDependency[] => {
    return deps.reduce((acc, dep) => {
      acc.push(dep);
      if (dep.children) {
        acc.push(...getAllDeps(dep.children));
      }
      return acc;
    }, [] as PackDependency[]);
  };

  const allDeps = getAllDeps(dependencies);

  const stats = {
    total: allDeps.length,
    installed: allDeps.filter((d) => d.installed).length,
    compatible: allDeps.filter((d) => d.installed && d.compatible).length,
    incompatible: allDeps.filter((d) => d.installed && !d.compatible).length,
    missing: allDeps.filter((d) => !d.installed && d.type === 'required').length,
    required: allDeps.filter((d) => d.type === 'required').length,
    optional: allDeps.filter((d) => d.type === 'optional').length,
    peer: allDeps.filter((d) => d.type === 'peer').length,
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
      <div className="p-4 rounded-xl bg-white dark:bg-dark-bg-elevated border border-slate-200 dark:border-dark-border-primary">
        <p className="text-sm text-slate-500 dark:text-dark-text-tertiary">
          Total Dependencies
        </p>
        <p className="text-2xl font-bold text-slate-900 dark:text-dark-text-primary">
          {stats.total}
        </p>
      </div>

      <div className="p-4 rounded-xl bg-white dark:bg-dark-bg-elevated border border-slate-200 dark:border-dark-border-primary">
        <p className="text-sm text-slate-500 dark:text-dark-text-tertiary">
          Installed
        </p>
        <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
          {stats.installed}
        </p>
        <p className="text-xs text-slate-400 dark:text-dark-text-muted mt-1">
          {stats.compatible} compatible
        </p>
      </div>

      <div className="p-4 rounded-xl bg-white dark:bg-dark-bg-elevated border border-slate-200 dark:border-dark-border-primary">
        <p className="text-sm text-slate-500 dark:text-dark-text-tertiary">
          Issues
        </p>
        <p
          className={cn(
            'text-2xl font-bold',
            stats.incompatible + stats.missing > 0
              ? 'text-amber-600 dark:text-amber-400'
              : 'text-slate-400 dark:text-slate-500'
          )}
        >
          {stats.incompatible + stats.missing}
        </p>
        {stats.incompatible + stats.missing > 0 && (
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
            {stats.incompatible} incompatible, {stats.missing} missing
          </p>
        )}
      </div>

      <div className="p-4 rounded-xl bg-white dark:bg-dark-bg-elevated border border-slate-200 dark:border-dark-border-primary">
        <p className="text-sm text-slate-500 dark:text-dark-text-tertiary">
          By Type
        </p>
        <div className="flex items-center gap-2 mt-2">
          <Badge variant="default" size="sm">
            {stats.required} required
          </Badge>
          <Badge variant="info" size="sm">
            {stats.optional} optional
          </Badge>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Pack Dependencies Component
// ============================================

export function PackDependencies({ dependencies }: PackDependenciesProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      // Simulate refresh
      await new Promise((resolve) => setTimeout(resolve, 1500));
      console.log('Dependencies refreshed');
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  if (dependencies.length === 0) {
    return (
      <EmptyState
        title="No dependencies"
        description="This pack doesn't have any external dependencies."
        icon={<LinkIcon className="w-16 h-16 text-slate-300 dark:text-zinc-600" />}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <DependencySummary dependencies={dependencies} />

      {/* Actions Bar */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-dark-text-primary">
          Dependency Tree
        </h3>
        <Button
          variant="secondary"
          size="sm"
          leftIcon={
            <RefreshCw className={cn('w-4 h-4', isRefreshing && 'animate-spin')} />
          }
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          {isRefreshing ? 'Checking...' : 'Check Updates'}
        </Button>
      </div>

      {/* Dependency Tree */}
      <div className="space-y-2">
        {dependencies.map((dep, index) => (
          <DependencyNode
            key={dep.id}
            dependency={dep}
            depth={0}
            isLast={index === dependencies.length - 1}
          />
        ))}
      </div>

      {/* Legend */}
      <Card className="mt-6">
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-slate-600 dark:text-dark-text-secondary">
                Installed & Compatible
              </span>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span className="text-slate-600 dark:text-dark-text-secondary">
                Version Mismatch
              </span>
            </div>
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-slate-400 dark:text-slate-500" />
              <span className="text-slate-600 dark:text-dark-text-secondary">
                Not Installed
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default PackDependencies;
