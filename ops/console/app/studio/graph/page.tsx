/**
 * AgentOS Ops Console - Dependency Graph Page
 * Interactive visualization of pack and agent dependencies
 * Features: 14 packs, nested agents, minimap, dagre layouts, export
 */

import { Suspense } from 'react';
import type { Metadata } from 'next';
import { DependencyGraph } from '@/components/DependencyGraph/DependencyGraph';
import { Loader2, GitBranch, Package, Bot, AlertTriangle } from 'lucide-react';

// ============================================
// Metadata Configuration
// ============================================

export const metadata: Metadata = {
  title: 'Dependency Graph | AgentOS Studio',
  description: 'Visualize pack and agent dependencies with interactive graph',
};

// ============================================
// Loading Component
// ============================================

function GraphLoading() {
  return (
    <div className="h-full flex items-center justify-center bg-slate-50 dark:bg-dark-bg-primary">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-xl bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center">
            <GitBranch className="w-8 h-8 text-purple-500 animate-pulse" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white dark:bg-dark-bg-secondary shadow-md flex items-center justify-center">
            <Loader2 className="w-4 h-4 text-purple-500 animate-spin" />
          </div>
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-slate-700 dark:text-dark-text-secondary">
            Loading dependency graph...
          </p>
          <p className="text-xs text-slate-500 dark:text-dark-text-tertiary mt-1">
            Analyzing pack relationships
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Graph Stats Header Component
// ============================================

function GraphStatsHeader() {
  // These would normally come from actual data
  const stats = {
    packs: 14,
    agents: 56,
    dependencies: 24,
    conflicts: 1,
  };

  return (
    <div className="flex items-center gap-4 text-sm">
      <div className="flex items-center gap-1.5">
        <Package className="w-4 h-4 text-purple-500" />
        <span className="text-slate-700 dark:text-dark-text-secondary font-medium">{stats.packs}</span>
        <span className="text-slate-500 dark:text-dark-text-tertiary">packs</span>
      </div>
      <div className="w-px h-4 bg-slate-200 dark:bg-dark-border-primary" />
      <div className="flex items-center gap-1.5">
        <Bot className="w-4 h-4 text-blue-500" />
        <span className="text-slate-700 dark:text-dark-text-secondary font-medium">{stats.agents}</span>
        <span className="text-slate-500 dark:text-dark-text-tertiary">agents</span>
      </div>
      <div className="w-px h-4 bg-slate-200 dark:bg-dark-border-primary" />
      <div className="flex items-center gap-1.5">
        <GitBranch className="w-4 h-4 text-slate-500" />
        <span className="text-slate-700 dark:text-dark-text-secondary font-medium">{stats.dependencies}</span>
        <span className="text-slate-500 dark:text-dark-text-tertiary">dependencies</span>
      </div>
      {stats.conflicts > 0 && (
        <>
          <div className="w-px h-4 bg-slate-200 dark:bg-dark-border-primary" />
          <div className="flex items-center gap-1.5 text-red-500">
            <AlertTriangle className="w-4 h-4" />
            <span className="font-medium">{stats.conflicts}</span>
            <span>conflict{stats.conflicts !== 1 ? 's' : ''}</span>
          </div>
        </>
      )}
    </div>
  );
}

// ============================================
// Graph Page Component
// ============================================

export default function GraphPage() {
  return (
    <div className="h-full flex flex-col">
      {/* Page Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-dark-border-primary bg-white dark:bg-dark-bg-secondary">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center">
              <GitBranch className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-slate-900 dark:text-dark-text-primary">
                Dependency Graph
              </h1>
              <p className="text-sm text-slate-500 dark:text-dark-text-tertiary">
                Visualize relationships between packs and agents
              </p>
            </div>
          </div>
        </div>
        <GraphStatsHeader />
      </div>

      {/* Graph Container */}
      <div className="flex-1 relative overflow-hidden">
        <Suspense fallback={<GraphLoading />}>
          <DependencyGraph />
        </Suspense>
      </div>
    </div>
  );
}

// ============================================
// Error Boundary Component
// ============================================

export function ErrorBoundary({ error }: { error: Error }) {
  return (
    <div className="h-full flex items-center justify-center bg-slate-50 dark:bg-dark-bg-primary">
      <div className="text-center p-8 max-w-md">
        <div className="w-16 h-16 rounded-xl bg-red-100 dark:bg-red-500/20 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-dark-text-primary mb-2">
          Failed to load dependency graph
        </h2>
        <p className="text-slate-500 dark:text-dark-text-tertiary mb-6">
          {error.message || 'An unexpected error occurred while loading the graph.'}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
        >
          Retry Loading
        </button>
      </div>
    </div>
  );
}

// ============================================
// Loading Export
// ============================================

export function Loading() {
  return <GraphLoading />;
}
