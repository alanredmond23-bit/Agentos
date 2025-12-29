/**
 * AgentOS Ops Console - Graph Canvas Component
 * ReactFlow-based canvas with minimap, dagre layout, and pack nodes
 */

'use client';

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import ReactFlow, {
  Background,
  BackgroundVariant,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  Node,
  Edge,
  NodeTypes,
  EdgeTypes,
  MarkerType,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { PackNode } from './PackNode';
import { AgentNode } from './AgentNode';
import { GraphEdge as CustomGraphEdge } from './GraphEdge';
import type { DependencyGraphData, GraphPackNode, LayoutType } from './DependencyGraph';

// ============================================
// Types
// ============================================

interface GraphCanvasProps {
  data: DependencyGraphData;
  layout: LayoutType;
  selectedNodeId: string | null;
  onNodeSelect: (node: GraphPackNode | null) => void;
  highlightConflicts: boolean;
}

// ============================================
// Node & Edge Type Registration
// ============================================

const nodeTypes: NodeTypes = {
  pack: PackNode,
  agent: AgentNode,
};

const edgeTypes: EdgeTypes = {
  dependency: CustomGraphEdge,
  optional: CustomGraphEdge,
};

// ============================================
// Dagre-like Layout Functions
// ============================================

interface LayoutNode {
  id: string;
  width: number;
  height: number;
}

interface LayoutEdge {
  source: string;
  target: string;
}

interface LayoutPosition {
  x: number;
  y: number;
}

/**
 * Simple dagre-like layout algorithm
 * Assigns levels to nodes based on dependency depth, then spaces them out
 */
function calculateDagreLayout(
  nodes: LayoutNode[],
  edges: LayoutEdge[],
  direction: 'TB' | 'LR' = 'TB'
): Record<string, LayoutPosition> {
  const positions: Record<string, LayoutPosition> = {};
  const levels: Record<string, number> = {};
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  // Build adjacency list (target -> sources)
  const incomingEdges: Record<string, string[]> = {};
  const outgoingEdges: Record<string, string[]> = {};

  nodes.forEach((n) => {
    incomingEdges[n.id] = [];
    outgoingEdges[n.id] = [];
  });

  edges.forEach((e) => {
    if (incomingEdges[e.target]) {
      incomingEdges[e.target].push(e.source);
    }
    if (outgoingEdges[e.source]) {
      outgoingEdges[e.source].push(e.target);
    }
  });

  // Find root nodes (no outgoing edges - they are the targets/dependencies)
  const rootNodes = nodes.filter((n) => outgoingEdges[n.id].length === 0).map((n) => n.id);

  // If no roots found, use nodes with no incoming edges
  if (rootNodes.length === 0) {
    const noIncoming = nodes.filter((n) => incomingEdges[n.id].length === 0).map((n) => n.id);
    rootNodes.push(...noIncoming);
  }

  // Still no roots? Use all nodes
  if (rootNodes.length === 0) {
    rootNodes.push(...nodes.map((n) => n.id));
  }

  // Calculate levels using BFS from root nodes
  // Root nodes (dependencies) are at level 0, dependents are higher levels
  const visited = new Set<string>();
  const queue: Array<{ id: string; level: number }> = [];

  // Start with roots at level 0
  rootNodes.forEach((id) => {
    queue.push({ id, level: 0 });
    levels[id] = 0;
    visited.add(id);
  });

  while (queue.length > 0) {
    const { id, level } = queue.shift()!;

    // Find nodes that depend on this node (incoming edges to this node = nodes that have this as target)
    const dependents = nodes.filter((n) => {
      return edges.some((e) => e.source === n.id && e.target === id);
    });

    dependents.forEach((dep) => {
      const newLevel = level + 1;
      if (!visited.has(dep.id) || (levels[dep.id] !== undefined && levels[dep.id] < newLevel)) {
        levels[dep.id] = newLevel;
        if (!visited.has(dep.id)) {
          visited.add(dep.id);
          queue.push({ id: dep.id, level: newLevel });
        }
      }
    });
  }

  // Assign level 0 to any unvisited nodes
  nodes.forEach((n) => {
    if (levels[n.id] === undefined) {
      levels[n.id] = 0;
    }
  });

  // Group nodes by level
  const levelGroups: Record<number, string[]> = {};
  let maxLevel = 0;

  Object.entries(levels).forEach(([id, level]) => {
    if (!levelGroups[level]) {
      levelGroups[level] = [];
    }
    levelGroups[level].push(id);
    maxLevel = Math.max(maxLevel, level);
  });

  // Calculate positions
  const nodeWidth = 220;
  const nodeHeight = 180;
  const horizontalGap = 80;
  const verticalGap = 100;

  const isHorizontal = direction === 'LR';

  Object.entries(levelGroups).forEach(([levelStr, nodeIds]) => {
    const level = parseInt(levelStr);
    const nodesInLevel = nodeIds.length;

    // Calculate total width/height for this level
    const totalSpan = nodesInLevel * (isHorizontal ? nodeHeight : nodeWidth) +
      (nodesInLevel - 1) * (isHorizontal ? verticalGap : horizontalGap);
    const startOffset = -totalSpan / 2;

    nodeIds.forEach((nodeId, index) => {
      const offset = startOffset + index * (
        (isHorizontal ? nodeHeight : nodeWidth) + (isHorizontal ? verticalGap : horizontalGap)
      ) + (isHorizontal ? nodeHeight : nodeWidth) / 2;

      if (isHorizontal) {
        // LR layout: levels go left to right, nodes spread vertically
        positions[nodeId] = {
          x: level * (nodeWidth + horizontalGap),
          y: offset,
        };
      } else {
        // TB layout: levels go top to bottom, nodes spread horizontally
        positions[nodeId] = {
          x: offset,
          y: level * (nodeHeight + verticalGap),
        };
      }
    });
  });

  return positions;
}

/**
 * Auto layout - uses dagre with TB direction
 */
function calculateAutoLayout(
  nodes: GraphPackNode[],
  edges: DependencyGraphData['edges']
): Record<string, LayoutPosition> {
  const layoutNodes = nodes.map((n) => ({
    id: n.id,
    width: 220,
    height: 180,
  }));

  const layoutEdges = edges.map((e) => ({
    source: e.source,
    target: e.target,
  }));

  return calculateDagreLayout(layoutNodes, layoutEdges, 'TB');
}

/**
 * Horizontal layout - uses dagre with LR direction
 */
function calculateHorizontalLayout(
  nodes: GraphPackNode[],
  edges: DependencyGraphData['edges']
): Record<string, LayoutPosition> {
  const layoutNodes = nodes.map((n) => ({
    id: n.id,
    width: 220,
    height: 180,
  }));

  const layoutEdges = edges.map((e) => ({
    source: e.source,
    target: e.target,
  }));

  return calculateDagreLayout(layoutNodes, layoutEdges, 'LR');
}

/**
 * Vertical layout - same as auto (TB) but with more spacing
 */
function calculateVerticalLayout(
  nodes: GraphPackNode[],
  edges: DependencyGraphData['edges']
): Record<string, LayoutPosition> {
  const positions = calculateAutoLayout(nodes, edges);

  // Add more vertical spacing
  Object.keys(positions).forEach((id) => {
    positions[id].y *= 1.3;
  });

  return positions;
}

// ============================================
// Minimap Node Color Function
// ============================================

function getMinimapNodeColor(node: Node): string {
  const data = node.data;

  if (data.hasConflict) {
    return '#ef4444'; // red-500
  }

  if (data.status === 'error') {
    return '#ef4444';
  }

  if (data.status === 'inactive') {
    return '#94a3b8'; // slate-400
  }

  // Return pack-specific color
  const packColors: Record<string, string> = {
    devops: '#3b82f6', // blue-500
    qa: '#22c55e', // green-500
    legal: '#f59e0b', // amber-500
    mobile: '#a855f7', // purple-500
    research: '#06b6d4', // cyan-500
    planning: '#f97316', // orange-500
    analytics: '#6366f1', // indigo-500
    orchestration: '#f43f5e', // rose-500
    error_predictor: '#ef4444', // red-500
    product: '#14b8a6', // teal-500
    marketing: '#ec4899', // pink-500
    supabase: '#10b981', // emerald-500
    design: '#8b5cf6', // violet-500
    engineering: '#64748b', // slate-500
  };

  return packColors[data.pack] || '#8b5cf6'; // default to purple
}

// ============================================
// Graph Canvas Component
// ============================================

export function GraphCanvas({
  data,
  layout,
  selectedNodeId,
  onNodeSelect,
  highlightConflicts,
}: GraphCanvasProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { fitView, getNodes } = useReactFlow();

  // Calculate layout positions
  const positions = useMemo(() => {
    switch (layout) {
      case 'horizontal':
        return calculateHorizontalLayout(data.nodes, data.edges);
      case 'vertical':
        return calculateVerticalLayout(data.nodes, data.edges);
      case 'auto':
      default:
        return calculateAutoLayout(data.nodes, data.edges);
    }
  }, [data.nodes, data.edges, layout]);

  // Get handle positions based on layout
  const getHandlePositions = useCallback((layout: LayoutType) => {
    switch (layout) {
      case 'horizontal':
        return { source: Position.Right, target: Position.Left };
      case 'vertical':
      case 'auto':
      default:
        return { source: Position.Bottom, target: Position.Top };
    }
  }, []);

  const handlePositions = getHandlePositions(layout);

  // Convert to ReactFlow nodes
  const initialNodes: Node[] = useMemo(() => {
    return data.nodes.map((node) => ({
      id: node.id,
      type: node.type,
      position: positions[node.id] || { x: 0, y: 0 },
      data: {
        ...node.data,
        isSelected: node.id === selectedNodeId,
        highlightConflict: highlightConflicts && node.data.hasConflict,
      },
      sourcePosition: handlePositions.source,
      targetPosition: handlePositions.target,
    }));
  }, [data.nodes, positions, selectedNodeId, highlightConflicts, handlePositions]);

  // Convert to ReactFlow edges
  const initialEdges: Edge[] = useMemo(() => {
    return data.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: edge.type,
      data: {
        type: edge.type,
        hasConflict: edge.hasConflict,
        conflictReason: edge.conflictReason,
        highlightConflict: highlightConflicts && edge.hasConflict,
      },
      animated: edge.type === 'optional',
      style: {
        stroke: highlightConflicts && edge.hasConflict ? '#ef4444' : undefined,
        strokeWidth: highlightConflicts && edge.hasConflict ? 2.5 : 1.5,
        strokeDasharray: edge.type === 'optional' ? '5,5' : undefined,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: highlightConflicts && edge.hasConflict ? '#ef4444' : '#94a3b8',
        width: 20,
        height: 20,
      },
    }));
  }, [data.edges, highlightConflicts]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes when data changes
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  // Fit view on mount and layout change
  useEffect(() => {
    const timer = setTimeout(() => {
      fitView({ padding: 0.15, duration: 400 });
    }, 100);
    return () => clearTimeout(timer);
  }, [layout, fitView]);

  // Handle node click
  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const graphNode = data.nodes.find((n) => n.id === node.id);
      onNodeSelect(graphNode || null);
    },
    [data.nodes, onNodeSelect]
  );

  // Handle pane click (deselect)
  const handlePaneClick = useCallback(() => {
    onNodeSelect(null);
  }, [onNodeSelect]);

  // Handle double-click navigation - handled in node components

  // Export functionality
  const handleExport = useCallback(async (format: 'png' | 'svg') => {
    if (!reactFlowWrapper.current) return;

    const flowElement = reactFlowWrapper.current.querySelector('.react-flow');
    if (!flowElement) return;

    try {
      if (format === 'svg') {
        const svgElement = flowElement.querySelector('svg');
        if (svgElement) {
          // Clone and clean up the SVG
          const clonedSvg = svgElement.cloneNode(true) as SVGElement;
          clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

          const svgData = new XMLSerializer().serializeToString(clonedSvg);
          const blob = new Blob([svgData], { type: 'image/svg+xml' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = 'dependency-graph.svg';
          link.click();
          URL.revokeObjectURL(url);
        }
      } else {
        // PNG export
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const svgElement = flowElement.querySelector('svg');

        if (svgElement && ctx) {
          const rect = svgElement.getBoundingClientRect();
          const scale = 2; // Higher resolution

          canvas.width = rect.width * scale;
          canvas.height = rect.height * scale;

          const svgData = new XMLSerializer().serializeToString(svgElement);
          const img = new Image();
          img.onload = () => {
            ctx.fillStyle = '#f8fafc'; // slate-50 background
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.scale(scale, scale);
            ctx.drawImage(img, 0, 0);
            const url = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = url;
            link.download = 'dependency-graph.png';
            link.click();
          };
          img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
        }
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
  }, []);

  // Expose export function via window
  useEffect(() => {
    (window as any).__exportGraph = handleExport;
    return () => {
      delete (window as any).__exportGraph;
    };
  }, [handleExport]);

  return (
    <div ref={reactFlowWrapper} className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.1}
        maxZoom={2}
        defaultEdgeOptions={{
          type: 'smoothstep',
        }}
        proOptions={{ hideAttribution: true }}
        className="bg-slate-50 dark:bg-dark-bg-primary"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1.5}
          color="rgba(148, 163, 184, 0.4)"
          className="dark:opacity-30"
        />

        {/* Minimap - bottom right */}
        <MiniMap
          nodeColor={getMinimapNodeColor}
          nodeStrokeWidth={3}
          nodeBorderRadius={8}
          maskColor="rgba(241, 245, 249, 0.8)"
          className="!bg-white dark:!bg-dark-bg-secondary !border !border-slate-200 dark:!border-dark-border-primary !rounded-xl !shadow-lg !overflow-hidden"
          style={{
            width: 180,
            height: 120,
          }}
          pannable
          zoomable
        />
      </ReactFlow>
    </div>
  );
}

export default GraphCanvas;
