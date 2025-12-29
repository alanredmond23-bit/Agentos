/**
 * AgentOS Agent Studio - Graph Builder Utilities
 * Build, analyze, and layout dependency graphs from packs
 * Includes conflict detection and multiple layout algorithms
 */

import type { AgentPack } from '@/types';

// ============================================
// Types
// ============================================

export interface Pack {
  id: string;
  name: string;
  slug: AgentPack;
  version: string;
  description?: string;
  status: 'active' | 'inactive' | 'error' | 'deprecated';
  agents: Agent[];
  dependencies: PackDependency[];
  optionalDependencies?: PackDependency[];
}

export interface Agent {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'error' | 'deprecated';
  pack: AgentPack;
}

export interface PackDependency {
  packId: string;
  versionConstraint?: string;
  required: boolean;
}

export interface GraphNode {
  id: string;
  type: 'pack' | 'agent';
  position: Position;
  data: PackNodeData | AgentNodeData;
}

export interface PackNodeData {
  id: string;
  name: string;
  pack: AgentPack;
  version: string;
  description?: string;
  status: 'active' | 'inactive' | 'error' | 'deprecated';
  agents: AgentInfo[];
  dependencyCount: number;
  hasConflict?: boolean;
  conflictReason?: string;
  isSelected?: boolean;
  highlightConflict?: boolean;
}

export interface AgentNodeData {
  id: string;
  name: string;
  pack: AgentPack;
  status: 'active' | 'inactive' | 'error' | 'deprecated';
  hasConflict?: boolean;
}

export interface AgentInfo {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'error' | 'deprecated';
  hasConflict?: boolean;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: 'dependency' | 'optional' | 'conflict';
  hasConflict?: boolean;
  conflictReason?: string;
  data?: EdgeData;
}

export interface EdgeData {
  type: 'dependency' | 'optional' | 'conflict';
  versionConstraint?: string;
  hasConflict?: boolean;
  conflictReason?: string;
}

export interface Position {
  x: number;
  y: number;
}

export interface DependencyGraphResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
  conflicts: Conflict[];
  stats: GraphStats;
}

export interface Conflict {
  id: string;
  type: 'version_mismatch' | 'circular_dependency' | 'missing_dependency';
  severity: 'warning' | 'error' | 'critical';
  sourcePackId: string;
  targetPackId?: string;
  message: string;
  details?: string;
  resolution?: string;
}

export interface GraphStats {
  packCount: number;
  agentCount: number;
  dependencyCount: number;
  conflictCount: number;
  maxDepth: number;
}

export type LayoutType = 'force' | 'hierarchical' | 'radial' | 'dagre';

// ============================================
// Build Dependency Graph
// ============================================

/**
 * Build a complete dependency graph from a list of packs
 * Includes nodes, edges, and conflict detection
 */
export function buildDependencyGraph(packs: Pack[]): DependencyGraphResult {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const packMap = new Map(packs.map(p => [p.id, p]));

  // Create nodes for each pack
  packs.forEach((pack, index) => {
    const dependencyCount = (pack.dependencies?.length || 0) + (pack.optionalDependencies?.length || 0);

    const agents: AgentInfo[] = pack.agents.map(agent => ({
      id: agent.id,
      name: agent.name,
      status: agent.status,
      hasConflict: false,
    }));

    nodes.push({
      id: `pack-${pack.slug}`,
      type: 'pack',
      position: { x: 0, y: 0 }, // Will be calculated by layout
      data: {
        id: `pack-${pack.slug}`,
        name: pack.name,
        pack: pack.slug,
        version: pack.version,
        description: pack.description,
        status: pack.status,
        agents,
        dependencyCount,
        hasConflict: false,
      },
    });
  });

  // Create edges for dependencies
  let edgeId = 0;
  packs.forEach(pack => {
    // Required dependencies
    pack.dependencies?.forEach(dep => {
      const targetPack = packs.find(p => p.id === dep.packId || `pack-${p.slug}` === dep.packId);
      if (targetPack) {
        edges.push({
          id: `e${++edgeId}`,
          source: `pack-${pack.slug}`,
          target: `pack-${targetPack.slug}`,
          type: 'dependency',
          data: {
            type: 'dependency',
            versionConstraint: dep.versionConstraint,
          },
        });
      }
    });

    // Optional dependencies
    pack.optionalDependencies?.forEach(dep => {
      const targetPack = packs.find(p => p.id === dep.packId || `pack-${p.slug}` === dep.packId);
      if (targetPack) {
        edges.push({
          id: `e${++edgeId}`,
          source: `pack-${pack.slug}`,
          target: `pack-${targetPack.slug}`,
          type: 'optional',
          data: {
            type: 'optional',
            versionConstraint: dep.versionConstraint,
          },
        });
      }
    });
  });

  // Detect conflicts
  const conflicts = detectConflicts(packs);

  // Mark nodes and edges with conflicts
  conflicts.forEach(conflict => {
    const sourceNode = nodes.find(n => n.id === conflict.sourcePackId || n.data.id === conflict.sourcePackId);
    if (sourceNode && sourceNode.data) {
      (sourceNode.data as PackNodeData).hasConflict = true;
      (sourceNode.data as PackNodeData).conflictReason = conflict.message;
    }

    if (conflict.targetPackId) {
      const edge = edges.find(e =>
        e.source === conflict.sourcePackId && e.target === conflict.targetPackId
      );
      if (edge) {
        edge.hasConflict = true;
        edge.conflictReason = conflict.message;
        edge.type = 'conflict';
        if (edge.data) {
          edge.data.hasConflict = true;
          edge.data.conflictReason = conflict.message;
        }
      }
    }
  });

  // Calculate statistics
  const stats: GraphStats = {
    packCount: nodes.filter(n => n.type === 'pack').length,
    agentCount: packs.reduce((sum, p) => sum + p.agents.length, 0),
    dependencyCount: edges.length,
    conflictCount: conflicts.length,
    maxDepth: calculateMaxDepth(nodes, edges),
  };

  return { nodes, edges, conflicts, stats };
}

// ============================================
// Conflict Detection
// ============================================

/**
 * Detect all conflicts in the pack dependency tree
 * Returns version mismatches, circular dependencies, and missing dependencies
 */
export function detectConflicts(packs: Pack[]): Conflict[] {
  const conflicts: Conflict[] = [];
  const packMap = new Map(packs.map(p => [`pack-${p.slug}`, p]));
  let conflictId = 0;

  // Check for version mismatches
  conflicts.push(...detectVersionMismatches(packs, packMap, conflictId));
  conflictId += conflicts.length;

  // Check for circular dependencies
  conflicts.push(...detectCircularDependencies(packs, conflictId));
  conflictId += conflicts.filter(c => c.type === 'circular_dependency').length;

  // Check for missing dependencies
  conflicts.push(...detectMissingDependencies(packs, packMap, conflictId));

  return conflicts;
}

/**
 * Detect version mismatches between pack dependencies
 */
function detectVersionMismatches(
  packs: Pack[],
  packMap: Map<string, Pack>,
  startId: number
): Conflict[] {
  const conflicts: Conflict[] = [];
  let id = startId;

  packs.forEach(pack => {
    pack.dependencies?.forEach(dep => {
      const targetPack = packMap.get(dep.packId) ||
        Array.from(packMap.values()).find(p => `pack-${p.slug}` === dep.packId);

      if (targetPack && dep.versionConstraint) {
        const isCompatible = checkVersionCompatibility(targetPack.version, dep.versionConstraint);
        if (!isCompatible) {
          conflicts.push({
            id: `conflict-${++id}`,
            type: 'version_mismatch',
            severity: 'error',
            sourcePackId: `pack-${pack.slug}`,
            targetPackId: `pack-${targetPack.slug}`,
            message: `Version mismatch: ${pack.name} requires ${targetPack.name} ${dep.versionConstraint} but found ${targetPack.version}`,
            details: `The installed version ${targetPack.version} does not satisfy the constraint ${dep.versionConstraint}`,
            resolution: `Update ${targetPack.name} to a compatible version or update the constraint in ${pack.name}`,
          });
        }
      }
    });
  });

  return conflicts;
}

/**
 * Detect circular dependencies between packs
 */
function detectCircularDependencies(packs: Pack[], startId: number): Conflict[] {
  const conflicts: Conflict[] = [];
  const packMap = new Map(packs.map(p => [`pack-${p.slug}`, p]));
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  let id = startId;

  function dfs(packId: string, path: string[]): string[] | null {
    if (recursionStack.has(packId)) {
      return [...path, packId];
    }
    if (visited.has(packId)) {
      return null;
    }

    visited.add(packId);
    recursionStack.add(packId);

    const pack = packMap.get(packId);
    if (pack) {
      for (const dep of (pack.dependencies || [])) {
        const depId = dep.packId.startsWith('pack-') ? dep.packId : `pack-${dep.packId}`;
        const cycle = dfs(depId, [...path, packId]);
        if (cycle) {
          return cycle;
        }
      }
    }

    recursionStack.delete(packId);
    return null;
  }

  packs.forEach(pack => {
    const packId = `pack-${pack.slug}`;
    if (!visited.has(packId)) {
      const cycle = dfs(packId, []);
      if (cycle) {
        const cycleStart = cycle.indexOf(cycle[cycle.length - 1]);
        const cyclePath = cycle.slice(cycleStart).join(' -> ');
        conflicts.push({
          id: `conflict-${++id}`,
          type: 'circular_dependency',
          severity: 'critical',
          sourcePackId: packId,
          message: `Circular dependency detected: ${cyclePath}`,
          details: `This circular dependency can cause infinite loops during resolution`,
          resolution: `Refactor the dependencies to remove the cycle`,
        });
      }
    }
  });

  return conflicts;
}

/**
 * Detect missing dependencies (referenced but not installed)
 */
function detectMissingDependencies(
  packs: Pack[],
  packMap: Map<string, Pack>,
  startId: number
): Conflict[] {
  const conflicts: Conflict[] = [];
  let id = startId;

  packs.forEach(pack => {
    pack.dependencies?.forEach(dep => {
      const depId = dep.packId.startsWith('pack-') ? dep.packId : `pack-${dep.packId}`;
      const exists = packMap.has(depId) ||
        Array.from(packMap.values()).some(p => `pack-${p.slug}` === depId || p.id === dep.packId);

      if (!exists && dep.required) {
        conflicts.push({
          id: `conflict-${++id}`,
          type: 'missing_dependency',
          severity: 'error',
          sourcePackId: `pack-${pack.slug}`,
          targetPackId: depId,
          message: `Missing required dependency: ${dep.packId}`,
          details: `Pack ${pack.name} requires ${dep.packId} but it is not installed`,
          resolution: `Install the missing pack or remove the dependency`,
        });
      }
    });
  });

  return conflicts;
}

/**
 * Check if a version satisfies a version constraint
 * Supports basic semver constraints: ^, ~, >=, <=, >, <, =
 */
function checkVersionCompatibility(version: string, constraint: string): boolean {
  const [major, minor, patch] = version.split('.').map(Number);

  // Handle caret (^) - allows minor and patch updates
  if (constraint.startsWith('^')) {
    const [cMajor] = constraint.slice(1).split('.').map(Number);
    return major === cMajor;
  }

  // Handle tilde (~) - allows patch updates
  if (constraint.startsWith('~')) {
    const [cMajor, cMinor] = constraint.slice(1).split('.').map(Number);
    return major === cMajor && minor === cMinor;
  }

  // Handle >= operator
  if (constraint.startsWith('>=')) {
    const [cMajor, cMinor, cPatch] = constraint.slice(2).split('.').map(Number);
    return major > cMajor ||
      (major === cMajor && minor > cMinor) ||
      (major === cMajor && minor === cMinor && (patch || 0) >= (cPatch || 0));
  }

  // Handle <= operator
  if (constraint.startsWith('<=')) {
    const [cMajor, cMinor, cPatch] = constraint.slice(2).split('.').map(Number);
    return major < cMajor ||
      (major === cMajor && minor < cMinor) ||
      (major === cMajor && minor === cMinor && (patch || 0) <= (cPatch || 0));
  }

  // Handle > operator
  if (constraint.startsWith('>') && !constraint.startsWith('>=')) {
    const [cMajor, cMinor, cPatch] = constraint.slice(1).split('.').map(Number);
    return major > cMajor ||
      (major === cMajor && minor > cMinor) ||
      (major === cMajor && minor === cMinor && (patch || 0) > (cPatch || 0));
  }

  // Handle < operator
  if (constraint.startsWith('<') && !constraint.startsWith('<=')) {
    const [cMajor, cMinor, cPatch] = constraint.slice(1).split('.').map(Number);
    return major < cMajor ||
      (major === cMajor && minor < cMinor) ||
      (major === cMajor && minor === cMinor && (patch || 0) < (cPatch || 0));
  }

  // Handle exact match (= or no prefix)
  const cleanConstraint = constraint.startsWith('=') ? constraint.slice(1) : constraint;
  return version === cleanConstraint;
}

/**
 * Calculate the maximum depth of the dependency tree
 */
function calculateMaxDepth(nodes: GraphNode[], edges: GraphEdge[]): number {
  const adjacency = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  nodes.forEach(n => {
    adjacency.set(n.id, []);
    inDegree.set(n.id, 0);
  });

  edges.forEach(e => {
    const deps = adjacency.get(e.source) || [];
    deps.push(e.target);
    adjacency.set(e.source, deps);
    inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1);
  });

  // Find root nodes (no incoming edges)
  const roots = nodes.filter(n => (inDegree.get(n.id) || 0) === 0).map(n => n.id);

  let maxDepth = 0;
  const visited = new Set<string>();

  function dfs(nodeId: string, depth: number) {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    maxDepth = Math.max(maxDepth, depth);

    const deps = adjacency.get(nodeId) || [];
    deps.forEach(dep => dfs(dep, depth + 1));
  }

  roots.forEach(root => dfs(root, 0));

  return maxDepth;
}

// ============================================
// Layout Algorithms
// ============================================

/**
 * Apply a layout algorithm to position nodes
 */
export function layoutGraph(
  nodes: GraphNode[],
  edges: GraphEdge[],
  layout: LayoutType,
  options?: LayoutOptions
): GraphNode[] {
  switch (layout) {
    case 'hierarchical':
      return hierarchicalLayout(nodes, edges, options);
    case 'radial':
      return radialLayout(nodes, edges, options);
    case 'force':
      return forceDirectedLayout(nodes, edges, options);
    case 'dagre':
    default:
      return dagreLayout(nodes, edges, options);
  }
}

export interface LayoutOptions {
  nodeWidth?: number;
  nodeHeight?: number;
  horizontalSpacing?: number;
  verticalSpacing?: number;
  direction?: 'TB' | 'BT' | 'LR' | 'RL';
  centerX?: number;
  centerY?: number;
  radius?: number;
}

const defaultOptions: Required<LayoutOptions> = {
  nodeWidth: 220,
  nodeHeight: 180,
  horizontalSpacing: 100,
  verticalSpacing: 120,
  direction: 'TB',
  centerX: 0,
  centerY: 0,
  radius: 300,
};

/**
 * Dagre-like hierarchical layout (top-to-bottom or left-to-right)
 */
function dagreLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
  options?: LayoutOptions
): GraphNode[] {
  const opts = { ...defaultOptions, ...options };
  const { nodeWidth, nodeHeight, horizontalSpacing, verticalSpacing, direction } = opts;

  // Build adjacency lists
  const incomingEdges = new Map<string, string[]>();
  const outgoingEdges = new Map<string, string[]>();

  nodes.forEach(n => {
    incomingEdges.set(n.id, []);
    outgoingEdges.set(n.id, []);
  });

  edges.forEach(e => {
    const incoming = incomingEdges.get(e.target) || [];
    incoming.push(e.source);
    incomingEdges.set(e.target, incoming);

    const outgoing = outgoingEdges.get(e.source) || [];
    outgoing.push(e.target);
    outgoingEdges.set(e.source, outgoing);
  });

  // Calculate levels using topological sort
  const levels = new Map<string, number>();
  const visited = new Set<string>();

  // Find root nodes (nodes that are targets but not sources)
  const rootNodes = nodes.filter(n => {
    const outgoing = outgoingEdges.get(n.id) || [];
    return outgoing.length === 0;
  }).map(n => n.id);

  // If no roots found, use nodes with no incoming edges
  if (rootNodes.length === 0) {
    const noIncoming = nodes.filter(n => {
      const incoming = incomingEdges.get(n.id) || [];
      return incoming.length === 0;
    });
    rootNodes.push(...noIncoming.map(n => n.id));
  }

  // BFS to assign levels
  rootNodes.forEach(id => levels.set(id, 0));

  const queue = [...rootNodes.map(id => ({ id, level: 0 }))];

  while (queue.length > 0) {
    const { id, level } = queue.shift()!;

    if (visited.has(id)) continue;
    visited.add(id);

    // Find dependents (nodes that have this as a target)
    const dependents = nodes.filter(n => {
      return edges.some(e => e.source === n.id && e.target === id);
    });

    dependents.forEach(dep => {
      const newLevel = level + 1;
      const currentLevel = levels.get(dep.id);
      if (currentLevel === undefined || currentLevel < newLevel) {
        levels.set(dep.id, newLevel);
        queue.push({ id: dep.id, level: newLevel });
      }
    });
  }

  // Assign level 0 to any unvisited nodes
  nodes.forEach(n => {
    if (!levels.has(n.id)) {
      levels.set(n.id, 0);
    }
  });

  // Group nodes by level
  const levelGroups = new Map<number, string[]>();
  let maxLevel = 0;

  levels.forEach((level, id) => {
    const group = levelGroups.get(level) || [];
    group.push(id);
    levelGroups.set(level, group);
    maxLevel = Math.max(maxLevel, level);
  });

  // Calculate positions
  const isHorizontal = direction === 'LR' || direction === 'RL';
  const isReversed = direction === 'BT' || direction === 'RL';

  const positionedNodes = nodes.map(node => {
    const level = levels.get(node.id) || 0;
    const adjustedLevel = isReversed ? maxLevel - level : level;
    const levelNodes = levelGroups.get(level) || [];
    const indexInLevel = levelNodes.indexOf(node.id);

    const totalWidth = levelNodes.length * (isHorizontal ? nodeHeight : nodeWidth) +
      (levelNodes.length - 1) * (isHorizontal ? verticalSpacing : horizontalSpacing);
    const startOffset = -totalWidth / 2;

    const offset = startOffset + indexInLevel * (
      (isHorizontal ? nodeHeight : nodeWidth) + (isHorizontal ? verticalSpacing : horizontalSpacing)
    ) + (isHorizontal ? nodeHeight : nodeWidth) / 2;

    return {
      ...node,
      position: isHorizontal
        ? { x: adjustedLevel * (nodeWidth + horizontalSpacing), y: offset }
        : { x: offset, y: adjustedLevel * (nodeHeight + verticalSpacing) },
    };
  });

  return positionedNodes;
}

/**
 * Hierarchical tree layout with clear parent-child relationships
 */
function hierarchicalLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
  options?: LayoutOptions
): GraphNode[] {
  const opts = { ...defaultOptions, ...options };
  const { nodeWidth, nodeHeight, horizontalSpacing, verticalSpacing } = opts;

  // Build parent-child relationships
  const children = new Map<string, string[]>();
  const hasParent = new Set<string>();

  nodes.forEach(n => children.set(n.id, []));

  edges.forEach(e => {
    const childList = children.get(e.target) || [];
    childList.push(e.source);
    children.set(e.target, childList);
    hasParent.add(e.source);
  });

  // Find root nodes
  const roots = nodes.filter(n => !hasParent.has(n.id)).map(n => n.id);

  // Calculate subtree widths
  const subtreeWidth = new Map<string, number>();

  function calcWidth(nodeId: string): number {
    const childNodes = children.get(nodeId) || [];
    if (childNodes.length === 0) {
      subtreeWidth.set(nodeId, nodeWidth);
      return nodeWidth;
    }

    const width = childNodes.reduce((sum, child) => sum + calcWidth(child), 0) +
      (childNodes.length - 1) * horizontalSpacing;
    subtreeWidth.set(nodeId, Math.max(width, nodeWidth));
    return subtreeWidth.get(nodeId)!;
  }

  roots.forEach(calcWidth);

  // Position nodes
  const positions = new Map<string, Position>();

  function positionNode(nodeId: string, x: number, y: number) {
    positions.set(nodeId, { x, y });

    const childNodes = children.get(nodeId) || [];
    if (childNodes.length === 0) return;

    const totalWidth = childNodes.reduce((sum, child) => sum + (subtreeWidth.get(child) || nodeWidth), 0) +
      (childNodes.length - 1) * horizontalSpacing;

    let currentX = x - totalWidth / 2;

    childNodes.forEach(child => {
      const childWidth = subtreeWidth.get(child) || nodeWidth;
      positionNode(child, currentX + childWidth / 2, y + nodeHeight + verticalSpacing);
      currentX += childWidth + horizontalSpacing;
    });
  }

  // Position each root tree
  let startX = 0;
  roots.forEach(root => {
    const width = subtreeWidth.get(root) || nodeWidth;
    positionNode(root, startX + width / 2, 0);
    startX += width + horizontalSpacing * 2;
  });

  return nodes.map(node => ({
    ...node,
    position: positions.get(node.id) || { x: 0, y: 0 },
  }));
}

/**
 * Radial layout with nodes arranged in concentric circles
 */
function radialLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
  options?: LayoutOptions
): GraphNode[] {
  const opts = { ...defaultOptions, ...options };
  const { centerX, centerY, radius, verticalSpacing } = opts;

  // Calculate levels (same as dagre)
  const incomingEdges = new Map<string, string[]>();

  nodes.forEach(n => incomingEdges.set(n.id, []));

  edges.forEach(e => {
    const incoming = incomingEdges.get(e.target) || [];
    incoming.push(e.source);
    incomingEdges.set(e.target, incoming);
  });

  const levels = new Map<string, number>();
  const visited = new Set<string>();

  // Find center nodes (no outgoing dependencies - they are targets)
  const centerNodes = nodes.filter(n => {
    return !edges.some(e => e.source === n.id);
  }).map(n => n.id);

  centerNodes.forEach(id => levels.set(id, 0));

  const queue = [...centerNodes.map(id => ({ id, level: 0 }))];

  while (queue.length > 0) {
    const { id, level } = queue.shift()!;

    if (visited.has(id)) continue;
    visited.add(id);

    const dependents = nodes.filter(n => edges.some(e => e.source === n.id && e.target === id));

    dependents.forEach(dep => {
      const newLevel = level + 1;
      if (!levels.has(dep.id) || (levels.get(dep.id) || 0) < newLevel) {
        levels.set(dep.id, newLevel);
        queue.push({ id: dep.id, level: newLevel });
      }
    });
  }

  // Assign level 0 to unvisited
  nodes.forEach(n => {
    if (!levels.has(n.id)) levels.set(n.id, 0);
  });

  // Group by level
  const levelGroups = new Map<number, string[]>();
  let maxLevel = 0;

  levels.forEach((level, id) => {
    const group = levelGroups.get(level) || [];
    group.push(id);
    levelGroups.set(level, group);
    maxLevel = Math.max(maxLevel, level);
  });

  // Position nodes in concentric circles
  return nodes.map(node => {
    const level = levels.get(node.id) || 0;
    const levelNodes = levelGroups.get(level) || [];
    const indexInLevel = levelNodes.indexOf(node.id);

    const r = level === 0 ? 0 : radius + (level - 1) * verticalSpacing;
    const angle = (2 * Math.PI * indexInLevel) / levelNodes.length - Math.PI / 2;

    return {
      ...node,
      position: {
        x: centerX + r * Math.cos(angle),
        y: centerY + r * Math.sin(angle),
      },
    };
  });
}

/**
 * Simple force-directed layout simulation
 */
function forceDirectedLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
  options?: LayoutOptions
): GraphNode[] {
  const opts = { ...defaultOptions, ...options };
  const { nodeWidth, nodeHeight } = opts;

  // Initialize random positions
  const positions = new Map<string, Position>();
  nodes.forEach((node, i) => {
    const angle = (2 * Math.PI * i) / nodes.length;
    const r = 300;
    positions.set(node.id, {
      x: r * Math.cos(angle),
      y: r * Math.sin(angle),
    });
  });

  // Build edge lookup
  const edgeSet = new Set(edges.map(e => `${e.source}-${e.target}`));

  // Simulation parameters
  const repulsion = 5000;
  const attraction = 0.1;
  const damping = 0.9;
  const iterations = 50;

  const velocities = new Map<string, Position>();
  nodes.forEach(n => velocities.set(n.id, { x: 0, y: 0 }));

  for (let iter = 0; iter < iterations; iter++) {
    // Calculate forces
    const forces = new Map<string, Position>();
    nodes.forEach(n => forces.set(n.id, { x: 0, y: 0 }));

    // Repulsion between all pairs
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const p1 = positions.get(nodes[i].id)!;
        const p2 = positions.get(nodes[j].id)!;

        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);

        const force = repulsion / (dist * dist);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        const f1 = forces.get(nodes[i].id)!;
        const f2 = forces.get(nodes[j].id)!;

        f1.x -= fx;
        f1.y -= fy;
        f2.x += fx;
        f2.y += fy;
      }
    }

    // Attraction along edges
    edges.forEach(edge => {
      const p1 = positions.get(edge.source);
      const p2 = positions.get(edge.target);
      if (!p1 || !p2) return;

      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const idealDist = nodeWidth + nodeHeight;
      const force = (dist - idealDist) * attraction;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;

      const f1 = forces.get(edge.source)!;
      const f2 = forces.get(edge.target)!;

      f1.x += fx;
      f1.y += fy;
      f2.x -= fx;
      f2.y -= fy;
    });

    // Apply forces with damping
    nodes.forEach(node => {
      const force = forces.get(node.id)!;
      const velocity = velocities.get(node.id)!;
      const position = positions.get(node.id)!;

      velocity.x = (velocity.x + force.x) * damping;
      velocity.y = (velocity.y + force.y) * damping;

      position.x += velocity.x;
      position.y += velocity.y;
    });
  }

  return nodes.map(node => ({
    ...node,
    position: positions.get(node.id) || { x: 0, y: 0 },
  }));
}

// ============================================
// Path Highlighting
// ============================================

/**
 * Find and highlight all nodes and edges connected to a given node
 */
export function highlightPath(
  nodeId: string,
  nodes: GraphNode[],
  edges: GraphEdge[]
): { nodes: GraphNode[]; edges: GraphEdge[]; pathNodeIds: Set<string>; pathEdgeIds: Set<string> } {
  const pathNodeIds = new Set<string>();
  const pathEdgeIds = new Set<string>();

  // Find all connected nodes via BFS
  const visited = new Set<string>();
  const queue = [nodeId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (visited.has(currentId)) continue;
    visited.add(currentId);
    pathNodeIds.add(currentId);

    // Find connected edges
    edges.forEach(edge => {
      if (edge.source === currentId && !visited.has(edge.target)) {
        pathEdgeIds.add(edge.id);
        queue.push(edge.target);
      }
      if (edge.target === currentId && !visited.has(edge.source)) {
        pathEdgeIds.add(edge.id);
        queue.push(edge.source);
      }
    });
  }

  // Mark nodes and edges as highlighted
  const highlightedNodes = nodes.map(node => ({
    ...node,
    data: {
      ...node.data,
      isHighlighted: pathNodeIds.has(node.id),
      isDimmed: !pathNodeIds.has(node.id),
    },
  }));

  const highlightedEdges = edges.map(edge => ({
    ...edge,
    data: {
      ...edge.data,
      isHighlighted: pathEdgeIds.has(edge.id),
      isDimmed: !pathEdgeIds.has(edge.id),
    },
  }));

  return { nodes: highlightedNodes, edges: highlightedEdges, pathNodeIds, pathEdgeIds };
}

// ============================================
// Search and Filter
// ============================================

/**
 * Find nodes matching a search query
 */
export function searchNodes(nodes: GraphNode[], query: string): GraphNode[] {
  const lowerQuery = query.toLowerCase().trim();
  if (!lowerQuery) return [];

  return nodes.filter(node => {
    const data = node.data as PackNodeData;
    return (
      data.name.toLowerCase().includes(lowerQuery) ||
      data.pack?.toLowerCase().includes(lowerQuery) ||
      data.description?.toLowerCase().includes(lowerQuery) ||
      data.version?.includes(lowerQuery)
    );
  });
}

/**
 * Filter nodes by pack type
 */
export function filterByPack(nodes: GraphNode[], packs: AgentPack[]): GraphNode[] {
  if (packs.length === 0) return nodes;
  return nodes.filter(node => {
    const data = node.data as PackNodeData;
    return packs.includes(data.pack);
  });
}

/**
 * Filter edges to only include those between visible nodes
 */
export function filterEdges(edges: GraphEdge[], visibleNodeIds: Set<string>): GraphEdge[] {
  return edges.filter(edge =>
    visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)
  );
}

// ============================================
// Export Utilities
// ============================================

/**
 * Export graph data as JSON
 */
export function exportGraphAsJson(result: DependencyGraphResult): string {
  return JSON.stringify({
    nodes: result.nodes.map(n => ({
      id: n.id,
      type: n.type,
      position: n.position,
      data: {
        name: (n.data as PackNodeData).name,
        pack: (n.data as PackNodeData).pack,
        version: (n.data as PackNodeData).version,
        status: (n.data as PackNodeData).status,
        agentCount: (n.data as PackNodeData).agents?.length || 0,
      },
    })),
    edges: result.edges.map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      type: e.type,
      hasConflict: e.hasConflict,
    })),
    conflicts: result.conflicts,
    stats: result.stats,
  }, null, 2);
}

/**
 * Export graph data as DOT format (for Graphviz)
 */
export function exportGraphAsDot(result: DependencyGraphResult): string {
  const lines: string[] = ['digraph DependencyGraph {'];
  lines.push('  rankdir=TB;');
  lines.push('  node [shape=box, style=rounded];');
  lines.push('');

  // Add nodes
  result.nodes.forEach(node => {
    const data = node.data as PackNodeData;
    const color = data.hasConflict ? 'red' : 'black';
    lines.push(`  "${node.id}" [label="${data.name}\\nv${data.version}", color="${color}"];`);
  });

  lines.push('');

  // Add edges
  result.edges.forEach(edge => {
    const style = edge.type === 'optional' ? 'dashed' : 'solid';
    const color = edge.hasConflict ? 'red' : 'gray';
    lines.push(`  "${edge.source}" -> "${edge.target}" [style="${style}", color="${color}"];`);
  });

  lines.push('}');

  return lines.join('\n');
}
