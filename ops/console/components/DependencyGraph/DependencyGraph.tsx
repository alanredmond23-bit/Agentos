/**
 * AgentOS Ops Console - Dependency Graph Main Component
 * Orchestrates the dependency visualization with controls and details panel
 * Features 16 packs with realistic dependencies
 */

'use client';

import React from 'react';
import { ReactFlowProvider } from 'reactflow';
import { cn } from '@/lib/utils';
import { GraphCanvas } from './GraphCanvas';
import { GraphControls } from './GraphControls';
import { GraphLegend } from './GraphLegend';
import {
  X,
  Package,
  Bot,
  AlertTriangle,
  ExternalLink,
  Clock,
  GitBranch,
  Activity,
  CheckCircle,
  XCircle,
  PauseCircle,
  Zap,
} from 'lucide-react';
import type { AgentPack } from '@/types';
import type { PackNodeData, PackNodeAgent } from './PackNode';

// ============================================
// Types
// ============================================

export type LayoutType = 'auto' | 'horizontal' | 'vertical';

export interface GraphPackNode {
  id: string;
  type: 'pack';
  data: PackNodeData;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: 'dependency' | 'optional';
  hasConflict?: boolean;
  conflictReason?: string;
}

export interface DependencyGraphData {
  nodes: GraphPackNode[];
  edges: GraphEdge[];
}

// ============================================
// Mock Data - 16 Packs with Realistic Dependencies
// ============================================

const createAgents = (packName: string, count: number, hasConflict: number = -1): PackNodeAgent[] => {
  const agentNames: Record<string, string[]> = {
    devops: ['CI Runner', 'Deploy Bot', 'Infra Monitor', 'Config Manager', 'Secret Rotator'],
    qa: ['Test Runner', 'E2E Tester', 'Load Tester', 'Security Scanner'],
    legal: ['Contract Analyzer', 'Compliance Checker', 'Risk Assessor'],
    mobile: ['iOS Builder', 'Android Builder', 'React Native Bot', 'Flutter Agent'],
    research: ['Paper Analyzer', 'Data Miner', 'Trend Spotter', 'Citation Bot'],
    planning: ['Sprint Planner', 'Resource Allocator', 'Roadmap Builder'],
    analytics: ['Metric Collector', 'Dashboard Builder', 'Report Generator', 'Anomaly Detector'],
    orchestration: ['Workflow Manager', 'Task Scheduler', 'Agent Coordinator', 'Load Balancer', 'Health Monitor'],
    error_predictor: ['Log Analyzer', 'Pattern Detector', 'Alert Manager'],
    product: ['Feature Tracker', 'Feedback Analyzer', 'Prioritizer', 'UX Researcher'],
    marketing: ['Campaign Manager', 'Social Bot', 'Content Generator', 'SEO Optimizer'],
    supabase: ['DB Migrator', 'Schema Manager', 'Query Optimizer'],
    design: ['Asset Manager', 'Style Enforcer', 'Component Builder', 'Accessibility Checker'],
    engineering: ['Code Reviewer', 'Refactor Bot', 'Doc Generator', 'Dependency Updater', 'Performance Analyzer', 'Security Auditor'],
  };

  const names = agentNames[packName] || [];
  return names.slice(0, count).map((name, i) => ({
    id: `agent-${packName}-${i}`,
    name,
    status: i === hasConflict ? 'error' : (i % 3 === 0 ? 'active' : i % 3 === 1 ? 'active' : 'active') as PackNodeAgent['status'],
    hasConflict: i === hasConflict,
  }));
};

export const mockGraphData: DependencyGraphData = {
  nodes: [
    // Core Infrastructure Packs
    {
      id: 'pack-engineering',
      type: 'pack',
      data: {
        id: 'pack-engineering',
        name: 'Engineering',
        pack: 'engineering',
        version: '3.0.1',
        description: 'Core engineering utilities and code quality tools',
        status: 'active',
        agents: createAgents('engineering', 6),
        dependencyCount: 0,
      },
    },
    {
      id: 'pack-devops',
      type: 'pack',
      data: {
        id: 'pack-devops',
        name: 'DevOps',
        pack: 'devops',
        version: '2.1.0',
        description: 'Infrastructure and deployment automation',
        status: 'active',
        agents: createAgents('devops', 5),
        dependencyCount: 1,
      },
    },
    {
      id: 'pack-supabase',
      type: 'pack',
      data: {
        id: 'pack-supabase',
        name: 'Supabase',
        pack: 'supabase',
        version: '2.0.0',
        description: 'Supabase database integration and management',
        status: 'active',
        agents: createAgents('supabase', 3, 0),
        dependencyCount: 1,
        hasConflict: true,
        conflictReason: 'Version mismatch with engineering pack v3.x requires supabase-js v2.45+',
      },
    },

    // Quality & Testing
    {
      id: 'pack-qa',
      type: 'pack',
      data: {
        id: 'pack-qa',
        name: 'QA',
        pack: 'qa',
        version: '1.8.0',
        description: 'Quality assurance and automated testing',
        status: 'active',
        agents: createAgents('qa', 4),
        dependencyCount: 2,
      },
    },
    {
      id: 'pack-error_predictor',
      type: 'pack',
      data: {
        id: 'pack-error_predictor',
        name: 'Error Predictor',
        pack: 'error_predictor',
        version: '1.3.0',
        description: 'Proactive error detection and prevention',
        status: 'active',
        agents: createAgents('error_predictor', 3),
        dependencyCount: 2,
      },
    },

    // Development Packs
    {
      id: 'pack-mobile',
      type: 'pack',
      data: {
        id: 'pack-mobile',
        name: 'Mobile',
        pack: 'mobile',
        version: '1.5.2',
        description: 'Mobile app development and build automation',
        status: 'active',
        agents: createAgents('mobile', 4),
        dependencyCount: 2,
      },
    },
    {
      id: 'pack-design',
      type: 'pack',
      data: {
        id: 'pack-design',
        name: 'Design',
        pack: 'design',
        version: '1.2.0',
        description: 'UI/UX design system and asset management',
        status: 'inactive',
        agents: createAgents('design', 4),
        dependencyCount: 1,
      },
    },

    // Data & Intelligence
    {
      id: 'pack-analytics',
      type: 'pack',
      data: {
        id: 'pack-analytics',
        name: 'Analytics',
        pack: 'analytics',
        version: '1.5.0',
        description: 'Data analysis, metrics, and reporting',
        status: 'active',
        agents: createAgents('analytics', 4),
        dependencyCount: 2,
      },
    },
    {
      id: 'pack-research',
      type: 'pack',
      data: {
        id: 'pack-research',
        name: 'Research',
        pack: 'research',
        version: '1.1.0',
        description: 'Research analysis and data mining',
        status: 'active',
        agents: createAgents('research', 4),
        dependencyCount: 1,
      },
    },

    // Business & Product
    {
      id: 'pack-product',
      type: 'pack',
      data: {
        id: 'pack-product',
        name: 'Product',
        pack: 'product',
        version: '1.4.0',
        description: 'Product management and feature tracking',
        status: 'active',
        agents: createAgents('product', 4),
        dependencyCount: 2,
      },
    },
    {
      id: 'pack-marketing',
      type: 'pack',
      data: {
        id: 'pack-marketing',
        name: 'Marketing',
        pack: 'marketing',
        version: '1.2.1',
        description: 'Marketing automation and content',
        status: 'active',
        agents: createAgents('marketing', 4),
        dependencyCount: 2,
      },
    },
    {
      id: 'pack-legal',
      type: 'pack',
      data: {
        id: 'pack-legal',
        name: 'Legal',
        pack: 'legal',
        version: '1.0.5',
        description: 'Legal document processing and compliance',
        status: 'active',
        agents: createAgents('legal', 3),
        dependencyCount: 0,
      },
    },

    // Planning & Coordination
    {
      id: 'pack-planning',
      type: 'pack',
      data: {
        id: 'pack-planning',
        name: 'Planning',
        pack: 'planning',
        version: '1.3.0',
        description: 'Sprint planning and resource allocation',
        status: 'active',
        agents: createAgents('planning', 3),
        dependencyCount: 2,
      },
    },
    {
      id: 'pack-orchestration',
      type: 'pack',
      data: {
        id: 'pack-orchestration',
        name: 'Orchestration',
        pack: 'orchestration',
        version: '2.3.0',
        description: 'Multi-agent coordination and workflow management',
        status: 'active',
        agents: createAgents('orchestration', 5),
        dependencyCount: 6,
      },
    },
  ],
  edges: [
    // Engineering is the core - DevOps depends on it
    { id: 'e1', source: 'pack-devops', target: 'pack-engineering', type: 'dependency' },

    // Supabase depends on engineering (with conflict)
    { id: 'e2', source: 'pack-supabase', target: 'pack-engineering', type: 'dependency', hasConflict: true, conflictReason: 'Version mismatch: requires engineering ^2.x but found 3.0.1' },

    // QA depends on devops and engineering
    { id: 'e3', source: 'pack-qa', target: 'pack-devops', type: 'dependency' },
    { id: 'e4', source: 'pack-qa', target: 'pack-engineering', type: 'dependency' },

    // Error predictor depends on analytics and engineering
    { id: 'e5', source: 'pack-error_predictor', target: 'pack-analytics', type: 'dependency' },
    { id: 'e6', source: 'pack-error_predictor', target: 'pack-engineering', type: 'dependency' },

    // Mobile depends on design and engineering
    { id: 'e7', source: 'pack-mobile', target: 'pack-design', type: 'dependency' },
    { id: 'e8', source: 'pack-mobile', target: 'pack-engineering', type: 'dependency' },

    // Design depends on engineering
    { id: 'e9', source: 'pack-design', target: 'pack-engineering', type: 'optional' },

    // Analytics depends on research and supabase
    { id: 'e10', source: 'pack-analytics', target: 'pack-research', type: 'dependency' },
    { id: 'e11', source: 'pack-analytics', target: 'pack-supabase', type: 'dependency' },

    // Research depends on engineering
    { id: 'e12', source: 'pack-research', target: 'pack-engineering', type: 'dependency' },

    // Product depends on analytics and planning
    { id: 'e13', source: 'pack-product', target: 'pack-analytics', type: 'dependency' },
    { id: 'e14', source: 'pack-product', target: 'pack-planning', type: 'optional' },

    // Marketing depends on analytics and design
    { id: 'e15', source: 'pack-marketing', target: 'pack-analytics', type: 'dependency' },
    { id: 'e16', source: 'pack-marketing', target: 'pack-design', type: 'optional' },

    // Planning depends on analytics and product
    { id: 'e17', source: 'pack-planning', target: 'pack-analytics', type: 'dependency' },
    { id: 'e18', source: 'pack-planning', target: 'pack-product', type: 'optional' },

    // Orchestration depends on many packs (hub)
    { id: 'e19', source: 'pack-orchestration', target: 'pack-devops', type: 'dependency' },
    { id: 'e20', source: 'pack-orchestration', target: 'pack-engineering', type: 'dependency' },
    { id: 'e21', source: 'pack-orchestration', target: 'pack-qa', type: 'dependency' },
    { id: 'e22', source: 'pack-orchestration', target: 'pack-analytics', type: 'dependency' },
    { id: 'e23', source: 'pack-orchestration', target: 'pack-planning', type: 'dependency' },
    { id: 'e24', source: 'pack-orchestration', target: 'pack-error_predictor', type: 'optional' },
  ],
};

// ============================================
// Details Panel Component
// ============================================

interface DetailsPanelProps {
  node: GraphPackNode | null;
  onClose: () => void;
  onNavigate: (packId: string) => void;
}

function DetailsPanel({ node, onClose, onNavigate }: DetailsPanelProps) {
  if (!node) return null;

  const { data } = node;

  const statusColors = {
    active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
    inactive: 'bg-slate-100 text-slate-600 dark:bg-zinc-700 dark:text-zinc-300',
    error: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400',
    deprecated: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
  };

  const StatusIcon = ({ status }: { status: string }) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-3.5 h-3.5" />;
      case 'inactive': return <PauseCircle className="w-3.5 h-3.5" />;
      case 'error': return <XCircle className="w-3.5 h-3.5" />;
      default: return <Clock className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="absolute right-4 top-4 w-80 bg-white dark:bg-dark-bg-secondary rounded-xl shadow-xl border border-slate-200 dark:border-dark-border-primary z-20 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-dark-border-primary bg-slate-50 dark:bg-dark-bg-tertiary">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-purple-500" />
          <span className="font-semibold text-slate-900 dark:text-dark-text-primary">
            Pack Details
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-dark-bg-elevated transition-colors"
          aria-label="Close details"
        >
          <X className="w-4 h-4 text-slate-500 dark:text-dark-text-tertiary" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Name and Status */}
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-dark-text-primary">
            {data.name}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span className={cn('flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full', statusColors[data.status])}>
              <StatusIcon status={data.status} />
              {data.status}
            </span>
            <span className="text-xs text-slate-500 dark:text-dark-text-tertiary">
              v{data.version}
            </span>
          </div>
        </div>

        {/* Description */}
        {data.description && (
          <p className="text-sm text-slate-600 dark:text-dark-text-secondary">
            {data.description}
          </p>
        )}

        {/* Conflict Warning */}
        {data.hasConflict && (
          <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-500/10 rounded-lg border border-red-200 dark:border-red-500/30">
            <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-700 dark:text-red-400">
                Conflict Detected
              </p>
              <p className="text-xs text-red-600 dark:text-red-400/80 mt-0.5">
                {data.conflictReason || 'Dependency conflict detected'}
              </p>
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Bot className="w-4 h-4 text-slate-400" />
            <span className="text-slate-500 dark:text-dark-text-tertiary">Agents:</span>
            <span className="text-slate-700 dark:text-dark-text-secondary">
              {data.agents.length}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <GitBranch className="w-4 h-4 text-slate-400" />
            <span className="text-slate-500 dark:text-dark-text-tertiary">Dependencies:</span>
            <span className="text-slate-700 dark:text-dark-text-secondary">
              {data.dependencyCount}
            </span>
          </div>
        </div>

        {/* Agents List */}
        {data.agents.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-slate-500 dark:text-dark-text-tertiary uppercase tracking-wider mb-2">
              Agents
            </h4>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {data.agents.map((agent) => (
                <div
                  key={agent.id}
                  className="flex items-center justify-between px-2 py-1.5 bg-slate-50 dark:bg-dark-bg-tertiary rounded-md"
                >
                  <div className="flex items-center gap-2">
                    <Bot className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-xs text-slate-700 dark:text-dark-text-secondary">
                      {agent.name}
                    </span>
                  </div>
                  <span className={cn(
                    'w-2 h-2 rounded-full',
                    agent.status === 'active' ? 'bg-emerald-500' :
                    agent.status === 'error' ? 'bg-red-500' :
                    agent.status === 'inactive' ? 'bg-slate-400' :
                    'bg-amber-500'
                  )} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="pt-2 border-t border-slate-200 dark:border-dark-border-primary">
          <button
            onClick={() => onNavigate(data.pack)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
          >
            <ExternalLink className="w-4 h-4" />
            View Pack Details
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Main Dependency Graph Component
// ============================================

export function DependencyGraph() {
  const [selectedNode, setSelectedNode] = React.useState<GraphPackNode | null>(null);
  const [layout, setLayout] = React.useState<LayoutType>('auto');
  const [highlightConflicts, setHighlightConflicts] = React.useState(true);

  // Filter data based on settings
  const filteredData = React.useMemo(() => {
    return mockGraphData;
  }, []);

  const handleNodeSelect = React.useCallback((node: GraphPackNode | null) => {
    setSelectedNode(node);
  }, []);

  const handleNavigate = React.useCallback((packId: string) => {
    window.location.href = `/studio/packs/${packId}`;
  }, []);

  const handleExport = React.useCallback((format: 'png' | 'svg') => {
    // Export functionality is handled by GraphCanvas
    console.log(`Exporting as ${format}`);
  }, []);

  // Stats calculation
  const stats = React.useMemo(() => {
    const packCount = filteredData.nodes.length;
    const agentCount = filteredData.nodes.reduce((acc, n) => acc + n.data.agents.length, 0);
    const dependencyCount = filteredData.edges.length;
    const conflictCount = filteredData.nodes.filter((n) => n.data.hasConflict).length;

    return { packCount, agentCount, dependencyCount, conflictCount };
  }, [filteredData]);

  return (
    <ReactFlowProvider>
      <div className="relative w-full h-full bg-slate-50 dark:bg-dark-bg-primary">
        {/* Graph Canvas */}
        <GraphCanvas
          data={filteredData}
          layout={layout}
          selectedNodeId={selectedNode?.id || null}
          onNodeSelect={handleNodeSelect}
          highlightConflicts={highlightConflicts}
        />

        {/* Controls */}
        <GraphControls
          layout={layout}
          onLayoutChange={setLayout}
          highlightConflicts={highlightConflicts}
          onHighlightConflictsChange={setHighlightConflicts}
          onExport={handleExport}
        />

        {/* Legend */}
        <GraphLegend />

        {/* Details Panel */}
        <DetailsPanel
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
          onNavigate={handleNavigate}
        />

        {/* Stats Badge */}
        <div className="absolute bottom-4 left-4 flex items-center gap-2 px-3 py-2 bg-white dark:bg-dark-bg-secondary rounded-lg shadow-md border border-slate-200 dark:border-dark-border-primary text-sm">
          <div className="flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5 text-purple-500" />
            <span className="text-slate-700 dark:text-dark-text-secondary font-medium">
              {stats.packCount}
            </span>
            <span className="text-slate-500 dark:text-dark-text-tertiary">packs</span>
          </div>
          <span className="text-slate-300 dark:text-dark-border-secondary">|</span>
          <div className="flex items-center gap-1.5">
            <Bot className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-slate-700 dark:text-dark-text-secondary font-medium">
              {stats.agentCount}
            </span>
            <span className="text-slate-500 dark:text-dark-text-tertiary">agents</span>
          </div>
          <span className="text-slate-300 dark:text-dark-border-secondary">|</span>
          <div className="flex items-center gap-1.5">
            <GitBranch className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-700 dark:text-dark-text-secondary font-medium">
              {stats.dependencyCount}
            </span>
            <span className="text-slate-500 dark:text-dark-text-tertiary">deps</span>
          </div>
          {stats.conflictCount > 0 && (
            <>
              <span className="text-slate-300 dark:text-dark-border-secondary">|</span>
              <div className="flex items-center gap-1.5 text-red-500">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span className="font-medium">{stats.conflictCount}</span>
                <span>conflict{stats.conflictCount !== 1 ? 's' : ''}</span>
              </div>
            </>
          )}
        </div>
      </div>
    </ReactFlowProvider>
  );
}

export default DependencyGraph;
