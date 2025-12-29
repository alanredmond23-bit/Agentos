/**
 * AgentOS Agent Studio - useDependencyGraph Hook
 * React hook for managing dependency graph state and interactions
 * Provides graph data, layout control, selection, filtering, and export
 */

'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import type { Node, Edge } from 'reactflow';
import type { AgentPack } from '@/types';
import {
  buildDependencyGraph,
  layoutGraph,
  highlightPath,
  searchNodes,
  filterByPack,
  filterEdges,
  exportGraphAsJson,
  exportGraphAsDot,
  detectConflicts,
  type Pack,
  type GraphNode,
  type GraphEdge,
  type DependencyGraphResult,
  type Conflict,
  type GraphStats,
  type LayoutType,
  type LayoutOptions,
} from '@/lib/studio/graphBuilder';

// ============================================
// Types
// ============================================

export type GraphLayoutType = 'auto' | 'horizontal' | 'vertical' | 'force' | 'radial';

export interface DependencyGraphState {
  // Core data
  nodes: Node[];
  edges: Edge[];
  conflicts: Conflict[];
  stats: GraphStats;

  // UI State
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  highlightedNodeIds: Set<string>;
  highlightedEdgeIds: Set<string>;

  // View settings
  layout: GraphLayoutType;
  highlightConflicts: boolean;
  showAgents: boolean;
  zoom: number;

  // Filters
  searchQuery: string;
  visiblePacks: AgentPack[];
  hiddenNodeIds: Set<string>;

  // Loading states
  isLoading: boolean;
  isExporting: boolean;
  error: Error | null;
}

export interface DependencyGraphActions {
  // Selection
  selectNode: (nodeId: string | null) => void;
  hoverNode: (nodeId: string | null) => void;
  clearSelection: () => void;

  // Layout
  setLayout: (layout: GraphLayoutType) => void;
  fitView: () => void;
  centerOnNode: (nodeId: string) => void;

  // View settings
  toggleConflictHighlight: () => void;
  setHighlightConflicts: (value: boolean) => void;
  toggleShowAgents: () => void;
  setZoom: (zoom: number) => void;

  // Filtering
  setSearchQuery: (query: string) => void;
  setVisiblePacks: (packs: AgentPack[]) => void;
  togglePackVisibility: (pack: AgentPack) => void;
  hideNode: (nodeId: string) => void;
  showNode: (nodeId: string) => void;
  showAllNodes: () => void;

  // Path highlighting
  highlightNodePath: (nodeId: string) => void;
  clearPathHighlight: () => void;

  // Export
  exportAsPng: () => Promise<void>;
  exportAsSvg: () => Promise<void>;
  exportAsJson: () => string;
  exportAsDot: () => string;

  // Data refresh
  refresh: () => void;
  loadPacks: (packs: Pack[]) => void;
}

export interface UseDependencyGraphResult {
  state: DependencyGraphState;
  actions: DependencyGraphActions;
}

// ============================================
// Mock Data (for development/demo)
// ============================================

const createMockPacks = (): Pack[] => {
  const packDefinitions: Array<{
    slug: AgentPack;
    name: string;
    version: string;
    description: string;
    agentCount: number;
    deps: string[];
    optionalDeps?: string[];
  }> = [
    { slug: 'engineering', name: 'Engineering', version: '3.0.1', description: 'Core engineering utilities', agentCount: 6, deps: [] },
    { slug: 'devops', name: 'DevOps', version: '2.1.0', description: 'Infrastructure and deployment', agentCount: 5, deps: ['engineering'] },
    { slug: 'supabase', name: 'Supabase', version: '2.0.0', description: 'Database management', agentCount: 3, deps: ['engineering'] },
    { slug: 'qa', name: 'QA', version: '1.8.0', description: 'Quality assurance', agentCount: 4, deps: ['devops', 'engineering'] },
    { slug: 'error_predictor', name: 'Error Predictor', version: '1.3.0', description: 'Error detection', agentCount: 3, deps: ['analytics', 'engineering'] },
    { slug: 'mobile', name: 'Mobile', version: '1.5.2', description: 'Mobile development', agentCount: 4, deps: ['design', 'engineering'] },
    { slug: 'design', name: 'Design', version: '1.2.0', description: 'Design system', agentCount: 4, deps: [], optionalDeps: ['engineering'] },
    { slug: 'analytics', name: 'Analytics', version: '1.5.0', description: 'Data analytics', agentCount: 4, deps: ['research', 'supabase'] },
    { slug: 'research', name: 'Research', version: '1.1.0', description: 'Research analysis', agentCount: 4, deps: ['engineering'] },
    { slug: 'product', name: 'Product', version: '1.4.0', description: 'Product management', agentCount: 4, deps: ['analytics'], optionalDeps: ['planning'] },
    { slug: 'marketing', name: 'Marketing', version: '1.2.1', description: 'Marketing automation', agentCount: 4, deps: ['analytics'], optionalDeps: ['design'] },
    { slug: 'legal', name: 'Legal', version: '1.0.5', description: 'Legal processing', agentCount: 3, deps: [] },
    { slug: 'planning', name: 'Planning', version: '1.3.0', description: 'Sprint planning', agentCount: 3, deps: ['analytics'], optionalDeps: ['product'] },
    { slug: 'orchestration', name: 'Orchestration', version: '2.3.0', description: 'Agent coordination', agentCount: 5, deps: ['devops', 'engineering', 'qa', 'analytics', 'planning'], optionalDeps: ['error_predictor'] },
  ];

  const agentNames: Record<string, string[]> = {
    engineering: ['Code Reviewer', 'Refactor Bot', 'Doc Generator', 'Dependency Updater', 'Performance Analyzer', 'Security Auditor'],
    devops: ['CI Runner', 'Deploy Bot', 'Infra Monitor', 'Config Manager', 'Secret Rotator'],
    supabase: ['DB Migrator', 'Schema Manager', 'Query Optimizer'],
    qa: ['Test Runner', 'E2E Tester', 'Load Tester', 'Security Scanner'],
    error_predictor: ['Log Analyzer', 'Pattern Detector', 'Alert Manager'],
    mobile: ['iOS Builder', 'Android Builder', 'React Native Bot', 'Flutter Agent'],
    design: ['Asset Manager', 'Style Enforcer', 'Component Builder', 'Accessibility Checker'],
    analytics: ['Metric Collector', 'Dashboard Builder', 'Report Generator', 'Anomaly Detector'],
    research: ['Paper Analyzer', 'Data Miner', 'Trend Spotter', 'Citation Bot'],
    product: ['Feature Tracker', 'Feedback Analyzer', 'Prioritizer', 'UX Researcher'],
    marketing: ['Campaign Manager', 'Social Bot', 'Content Generator', 'SEO Optimizer'],
    legal: ['Contract Analyzer', 'Compliance Checker', 'Risk Assessor'],
    planning: ['Sprint Planner', 'Resource Allocator', 'Roadmap Builder'],
    orchestration: ['Workflow Manager', 'Task Scheduler', 'Agent Coordinator', 'Load Balancer', 'Health Monitor'],
  };

  return packDefinitions.map(def => ({
    id: `pack-${def.slug}`,
    name: def.name,
    slug: def.slug,
    version: def.version,
    description: def.description,
    status: 'active' as const,
    agents: (agentNames[def.slug] || []).slice(0, def.agentCount).map((name, i) => ({
      id: `agent-${def.slug}-${i}`,
      name,
      status: 'active' as const,
      pack: def.slug,
    })),
    dependencies: def.deps.map(d => ({ packId: `pack-${d}`, required: true })),
    optionalDependencies: def.optionalDeps?.map(d => ({ packId: `pack-${d}`, required: false })),
  }));
};

// ============================================
// Layout Conversion
// ============================================

function convertLayoutType(layout: GraphLayoutType): LayoutType {
  switch (layout) {
    case 'auto':
    case 'vertical':
      return 'dagre';
    case 'horizontal':
      return 'dagre';
    case 'force':
      return 'force';
    case 'radial':
      return 'radial';
    default:
      return 'dagre';
  }
}

function getLayoutDirection(layout: GraphLayoutType): 'TB' | 'LR' {
  return layout === 'horizontal' ? 'LR' : 'TB';
}

// ============================================
// Hook Implementation
// ============================================

export function useDependencyGraph(initialPacks?: Pack[]): UseDependencyGraphResult {
  // Initialize with mock data if no packs provided
  const [packs, setPacks] = useState<Pack[]>(initialPacks || createMockPacks);

  // Core graph data
  const [graphResult, setGraphResult] = useState<DependencyGraphResult | null>(null);

  // UI State
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [highlightedNodeIds, setHighlightedNodeIds] = useState<Set<string>>(new Set());
  const [highlightedEdgeIds, setHighlightedEdgeIds] = useState<Set<string>>(new Set());

  // View settings
  const [layout, setLayoutState] = useState<GraphLayoutType>('auto');
  const [highlightConflicts, setHighlightConflictsState] = useState(true);
  const [showAgents, setShowAgents] = useState(true);
  const [zoom, setZoomState] = useState(1);

  // Filters
  const [searchQuery, setSearchQueryState] = useState('');
  const [visiblePacks, setVisiblePacksState] = useState<AgentPack[]>([]);
  const [hiddenNodeIds, setHiddenNodeIds] = useState<Set<string>>(new Set());

  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Build graph when packs change
  useEffect(() => {
    try {
      setIsLoading(true);
      setError(null);

      const result = buildDependencyGraph(packs);
      const layoutType = convertLayoutType(layout);
      const direction = getLayoutDirection(layout);

      const positionedNodes = layoutGraph(result.nodes, result.edges, layoutType, {
        direction,
        nodeWidth: 220,
        nodeHeight: 180,
        horizontalSpacing: 100,
        verticalSpacing: 120,
      });

      setGraphResult({
        ...result,
        nodes: positionedNodes,
      });
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to build graph'));
    } finally {
      setIsLoading(false);
    }
  }, [packs, layout]);

  // Convert to ReactFlow format with filters applied
  const { nodes, edges } = useMemo(() => {
    if (!graphResult) {
      return { nodes: [], edges: [] };
    }

    let filteredNodes = graphResult.nodes;
    let filteredEdges = graphResult.edges;

    // Apply search filter
    if (searchQuery) {
      const matchingNodes = searchNodes(filteredNodes, searchQuery);
      const matchingIds = new Set(matchingNodes.map(n => n.id));

      // Include all nodes but mark non-matches as dimmed
      filteredNodes = filteredNodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          isDimmed: !matchingIds.has(node.id),
          isSearchMatch: matchingIds.has(node.id),
        },
      }));
    }

    // Apply pack filter
    if (visiblePacks.length > 0) {
      filteredNodes = filterByPack(filteredNodes, visiblePacks);
    }

    // Apply hidden nodes filter
    if (hiddenNodeIds.size > 0) {
      filteredNodes = filteredNodes.filter(n => !hiddenNodeIds.has(n.id));
    }

    // Filter edges to match visible nodes
    const visibleNodeIds = new Set(filteredNodes.map(n => n.id));
    filteredEdges = filterEdges(filteredEdges, visibleNodeIds);

    // Convert to ReactFlow format
    const rfNodes: Node[] = filteredNodes.map(node => ({
      id: node.id,
      type: 'pack',
      position: node.position,
      data: {
        ...node.data,
        isSelected: node.id === selectedNodeId,
        isHovered: node.id === hoveredNodeId,
        isHighlighted: highlightedNodeIds.has(node.id),
        highlightConflict: highlightConflicts && (node.data as any).hasConflict,
      },
    }));

    const rfEdges: Edge[] = filteredEdges.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: edge.type === 'optional' ? 'optional' : 'dependency',
      data: {
        ...edge.data,
        isHighlighted: highlightedEdgeIds.has(edge.id),
        highlightConflict: highlightConflicts && edge.hasConflict,
      },
      animated: edge.type === 'optional',
      style: {
        stroke: highlightConflicts && edge.hasConflict ? '#ef4444' : undefined,
        strokeWidth: highlightConflicts && edge.hasConflict ? 2.5 : 1.5,
        strokeDasharray: edge.type === 'optional' ? '5,5' : undefined,
      },
    }));

    return { nodes: rfNodes, edges: rfEdges };
  }, [
    graphResult,
    selectedNodeId,
    hoveredNodeId,
    highlightedNodeIds,
    highlightedEdgeIds,
    highlightConflicts,
    searchQuery,
    visiblePacks,
    hiddenNodeIds,
  ]);

  // Selection actions
  const selectNode = useCallback((nodeId: string | null) => {
    setSelectedNodeId(nodeId);
  }, []);

  const hoverNode = useCallback((nodeId: string | null) => {
    setHoveredNodeId(nodeId);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedNodeId(null);
    setHoveredNodeId(null);
  }, []);

  // Layout actions
  const setLayout = useCallback((newLayout: GraphLayoutType) => {
    setLayoutState(newLayout);
  }, []);

  const fitView = useCallback(() => {
    // This should be called externally via ReactFlow's fitView
    // The hook just exposes it for coordination
    if (typeof window !== 'undefined' && (window as any).__fitGraphView) {
      (window as any).__fitGraphView();
    }
  }, []);

  const centerOnNode = useCallback((nodeId: string) => {
    if (typeof window !== 'undefined' && (window as any).__centerOnNode) {
      (window as any).__centerOnNode(nodeId);
    }
  }, []);

  // View settings actions
  const toggleConflictHighlight = useCallback(() => {
    setHighlightConflictsState(prev => !prev);
  }, []);

  const setHighlightConflicts = useCallback((value: boolean) => {
    setHighlightConflictsState(value);
  }, []);

  const toggleShowAgents = useCallback(() => {
    setShowAgents(prev => !prev);
  }, []);

  const setZoom = useCallback((newZoom: number) => {
    setZoomState(newZoom);
  }, []);

  // Filter actions
  const setSearchQuery = useCallback((query: string) => {
    setSearchQueryState(query);
  }, []);

  const setVisiblePacks = useCallback((newPacks: AgentPack[]) => {
    setVisiblePacksState(newPacks);
  }, []);

  const togglePackVisibility = useCallback((pack: AgentPack) => {
    setVisiblePacksState(prev => {
      if (prev.includes(pack)) {
        return prev.filter(p => p !== pack);
      }
      return [...prev, pack];
    });
  }, []);

  const hideNode = useCallback((nodeId: string) => {
    setHiddenNodeIds(prev => new Set([...prev, nodeId]));
  }, []);

  const showNode = useCallback((nodeId: string) => {
    setHiddenNodeIds(prev => {
      const next = new Set(prev);
      next.delete(nodeId);
      return next;
    });
  }, []);

  const showAllNodes = useCallback(() => {
    setHiddenNodeIds(new Set());
    setVisiblePacksState([]);
    setSearchQueryState('');
  }, []);

  // Path highlighting actions
  const highlightNodePath = useCallback((nodeId: string) => {
    if (!graphResult) return;

    const { pathNodeIds, pathEdgeIds } = highlightPath(
      nodeId,
      graphResult.nodes,
      graphResult.edges
    );

    setHighlightedNodeIds(pathNodeIds);
    setHighlightedEdgeIds(pathEdgeIds);
  }, [graphResult]);

  const clearPathHighlight = useCallback(() => {
    setHighlightedNodeIds(new Set());
    setHighlightedEdgeIds(new Set());
  }, []);

  // Export actions
  const exportAsPng = useCallback(async () => {
    setIsExporting(true);
    try {
      if (typeof window !== 'undefined' && (window as any).__exportGraph) {
        await (window as any).__exportGraph('png');
      }
    } finally {
      setIsExporting(false);
    }
  }, []);

  const exportAsSvg = useCallback(async () => {
    setIsExporting(true);
    try {
      if (typeof window !== 'undefined' && (window as any).__exportGraph) {
        await (window as any).__exportGraph('svg');
      }
    } finally {
      setIsExporting(false);
    }
  }, []);

  const exportAsJson = useCallback((): string => {
    if (!graphResult) return '{}';
    return exportGraphAsJson(graphResult);
  }, [graphResult]);

  const exportAsDot = useCallback((): string => {
    if (!graphResult) return '';
    return exportGraphAsDot(graphResult);
  }, [graphResult]);

  // Data refresh
  const refresh = useCallback(() => {
    const newPacks = createMockPacks();
    setPacks(newPacks);
  }, []);

  const loadPacks = useCallback((newPacks: Pack[]) => {
    setPacks(newPacks);
  }, []);

  // Assemble state
  const state: DependencyGraphState = {
    nodes,
    edges,
    conflicts: graphResult?.conflicts || [],
    stats: graphResult?.stats || {
      packCount: 0,
      agentCount: 0,
      dependencyCount: 0,
      conflictCount: 0,
      maxDepth: 0,
    },
    selectedNodeId,
    hoveredNodeId,
    highlightedNodeIds,
    highlightedEdgeIds,
    layout,
    highlightConflicts,
    showAgents,
    zoom,
    searchQuery,
    visiblePacks,
    hiddenNodeIds,
    isLoading,
    isExporting,
    error,
  };

  // Assemble actions
  const actions: DependencyGraphActions = {
    selectNode,
    hoverNode,
    clearSelection,
    setLayout,
    fitView,
    centerOnNode,
    toggleConflictHighlight,
    setHighlightConflicts,
    toggleShowAgents,
    setZoom,
    setSearchQuery,
    setVisiblePacks,
    togglePackVisibility,
    hideNode,
    showNode,
    showAllNodes,
    highlightNodePath,
    clearPathHighlight,
    exportAsPng,
    exportAsSvg,
    exportAsJson,
    exportAsDot,
    refresh,
    loadPacks,
  };

  return { state, actions };
}

export default useDependencyGraph;
