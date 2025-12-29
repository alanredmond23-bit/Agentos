/**
 * AgentOS Studio - Agent Manager Component
 * Main component for agent list with table/grid toggle, search, and bulk actions
 * Production-ready with full filtering, sorting, and pagination support
 */

'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/Input';
import { Pagination } from '@/components/ui/Table';
import { AgentTable } from './AgentTable';
import { AgentGrid } from './AgentGrid';
import { AgentFilters, type FilterState } from './AgentFilters';
import { BulkActions } from './BulkActions';
import type { AgentPack } from '@/types';
import {
  LayoutGrid,
  List,
  Filter,
  X,
  RefreshCw
} from 'lucide-react';

// ============================================
// Types
// ============================================

export type AuthorityLevel = 'operator' | 'manager' | 'worker' | 'observer';
export type SortField = 'name' | 'pack' | 'authority' | 'status' | 'lastModified' | 'executionCount' | 'version';
export type SortDirection = 'asc' | 'desc';
export type ViewMode = 'table' | 'grid';

export interface StudioAgent {
  id: string;
  name: string;
  role: string;
  pack: AgentPack;
  authority: AuthorityLevel;
  status: 'active' | 'inactive';
  lastModified: string;
  version: string;
  description: string;
  capabilities: string[];
  createdAt: string;
  executionCount: number;
}

interface AgentManagerProps {
  agents: StudioAgent[];
  onBulkAction: (action: string, selectedIds: string[]) => void;
  onAgentAction: (action: string, agentId: string) => void;
}

// ============================================
// Constants
// ============================================

const ITEMS_PER_PAGE = 20;

const DEFAULT_FILTERS: FilterState = {
  packs: [],
  statuses: [],
  authorities: []
};

// ============================================
// Component
// ============================================

export function AgentManager({ agents, onBulkAction, onAgentAction }: AgentManagerProps) {
  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [showFilters, setShowFilters] = useState(false);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

  // Sort state
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);

  // ============================================
  // Filtering Logic
  // ============================================

  const filteredAgents = useMemo(() => {
    return agents.filter(agent => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          agent.name.toLowerCase().includes(query) ||
          agent.role.toLowerCase().includes(query) ||
          agent.description.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Pack filter
      if (filters.packs.length > 0 && !filters.packs.includes(agent.pack)) {
        return false;
      }

      // Status filter
      if (filters.statuses.length > 0 && !filters.statuses.includes(agent.status)) {
        return false;
      }

      // Authority filter
      if (filters.authorities.length > 0 && !filters.authorities.includes(agent.authority)) {
        return false;
      }

      return true;
    });
  }, [agents, searchQuery, filters]);

  // ============================================
  // Sorting Logic
  // ============================================

  const sortedAgents = useMemo(() => {
    return [...filteredAgents].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'pack':
          comparison = a.pack.localeCompare(b.pack);
          break;
        case 'authority':
          const authorityOrder = { operator: 0, manager: 1, worker: 2, observer: 3 };
          comparison = authorityOrder[a.authority] - authorityOrder[b.authority];
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'lastModified':
          comparison = new Date(a.lastModified).getTime() - new Date(b.lastModified).getTime();
          break;
        default:
          comparison = 0;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredAgents, sortField, sortDirection]);

  // ============================================
  // Pagination Logic
  // ============================================

  const totalPages = Math.ceil(sortedAgents.length / ITEMS_PER_PAGE);

  const paginatedAgents = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedAgents.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [sortedAgents, currentPage]);

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filters, sortField, sortDirection]);

  // ============================================
  // Selection Handlers
  // ============================================

  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === paginatedAgents.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedAgents.map(a => a.id)));
    }
  }, [paginatedAgents, selectedIds.size]);

  const handleSelectAgent = useCallback((agentId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(agentId)) {
        next.delete(agentId);
      } else {
        next.add(agentId);
      }
      return next;
    });
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // ============================================
  // Sort Handler
  // ============================================

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }, [sortField]);

  // ============================================
  // Filter Handlers
  // ============================================

  const handleFilterChange = useCallback((newFilters: FilterState) => {
    setFilters(newFilters);
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setSearchQuery('');
  }, []);

  const activeFilterCount = useMemo(() => {
    return filters.packs.length + filters.statuses.length + filters.authorities.length;
  }, [filters]);

  // ============================================
  // Bulk Action Handlers
  // ============================================

  const handleBulkEnable = useCallback(() => {
    onBulkAction('enable', Array.from(selectedIds));
    setSelectedIds(new Set());
  }, [onBulkAction, selectedIds]);

  const handleBulkDisable = useCallback(() => {
    onBulkAction('disable', Array.from(selectedIds));
    setSelectedIds(new Set());
  }, [onBulkAction, selectedIds]);

  const handleBulkDelete = useCallback(() => {
    if (confirm(`Are you sure you want to delete ${selectedIds.size} agents?`)) {
      onBulkAction('delete', Array.from(selectedIds));
      setSelectedIds(new Set());
    }
  }, [onBulkAction, selectedIds]);


  // ============================================
  // Render
  // ============================================

  return (
    <div className="flex gap-6">
      {/* Filters Sidebar */}
      {showFilters && (
        <div className="w-64 flex-shrink-0">
          <AgentFilters
            filters={filters}
            agents={agents}
            onFilterChange={handleFilterChange}
            onClose={() => setShowFilters(false)}
          />
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        <div className="card">
          {/* Toolbar */}
          <div className="p-4 border-b border-slate-200 dark:border-dark-border-primary">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search and Filter Toggle */}
              <div className="flex gap-3 flex-1">
                <div className="relative flex-1 max-w-md">
                  <SearchInput
                    placeholder="Search agents by name or role..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onClear={() => setSearchQuery('')}
                  />
                </div>

                <Button
                  variant={showFilters ? 'primary' : 'secondary'}
                  onClick={() => setShowFilters(!showFilters)}
                  leftIcon={<Filter className="w-4 h-4" />}
                >
                  Filters
                  {activeFilterCount > 0 && (
                    <span className="ml-1.5 px-1.5 py-0.5 bg-white/20 rounded text-xs">
                      {activeFilterCount}
                    </span>
                  )}
                </Button>

                {(activeFilterCount > 0 || searchQuery) && (
                  <Button
                    variant="ghost"
                    onClick={handleClearFilters}
                    leftIcon={<X className="w-4 h-4" />}
                  >
                    Clear
                  </Button>
                )}
              </div>

              {/* View Toggle and Actions */}
              <div className="flex items-center gap-3">
                {/* View Mode Toggle */}
                <div className="flex rounded-lg border border-slate-200 dark:border-dark-border-primary overflow-hidden">
                  <button
                    onClick={() => setViewMode('table')}
                    className={cn(
                      'px-3 py-2 flex items-center gap-2 text-sm transition-colors',
                      viewMode === 'table'
                        ? 'bg-brand-600 text-white'
                        : 'bg-white dark:bg-dark-bg-secondary text-slate-600 dark:text-dark-text-secondary hover:bg-slate-50 dark:hover:bg-dark-bg-tertiary'
                    )}
                  >
                    <List className="w-4 h-4" />
                    <span className="hidden sm:inline">Table</span>
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={cn(
                      'px-3 py-2 flex items-center gap-2 text-sm transition-colors',
                      viewMode === 'grid'
                        ? 'bg-brand-600 text-white'
                        : 'bg-white dark:bg-dark-bg-secondary text-slate-600 dark:text-dark-text-secondary hover:bg-slate-50 dark:hover:bg-dark-bg-tertiary'
                    )}
                  >
                    <LayoutGrid className="w-4 h-4" />
                    <span className="hidden sm:inline">Grid</span>
                  </button>
                </div>

                <Button
                  variant="ghost"
                  onClick={() => window.location.reload()}
                  leftIcon={<RefreshCw className="w-4 h-4" />}
                >
                  <span className="hidden sm:inline">Refresh</span>
                </Button>
              </div>
            </div>

            {/* Bulk Actions Bar - Using dedicated component */}
            {selectedIds.size > 0 && (
              <div className="mt-4">
                <BulkActions
                  selectedCount={selectedIds.size}
                  totalCount={paginatedAgents.length}
                  onEnable={handleBulkEnable}
                  onDisable={handleBulkDisable}
                  onDelete={handleBulkDelete}
                  onExport={(format) => {
                    onBulkAction(`export-${format}`, Array.from(selectedIds));
                  }}
                  onClearSelection={handleClearSelection}
                  onSelectAll={handleSelectAll}
                />
              </div>
            )}
          </div>

          {/* Results Count */}
          <div className="px-4 py-2 bg-slate-50 dark:bg-dark-bg-tertiary border-b border-slate-200 dark:border-dark-border-primary">
            <p className="text-sm text-slate-500 dark:text-dark-text-tertiary">
              Showing {paginatedAgents.length} of {filteredAgents.length} agents
              {filteredAgents.length !== agents.length && (
                <span> (filtered from {agents.length} total)</span>
              )}
            </p>
          </div>

          {/* Content */}
          <div className="min-h-[400px]">
            {paginatedAgents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4">
                <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-dark-bg-tertiary flex items-center justify-center mb-4">
                  <Filter className="w-8 h-8 text-slate-400 dark:text-dark-text-muted" />
                </div>
                <h3 className="text-lg font-medium text-slate-900 dark:text-dark-text-primary mb-1">
                  No agents found
                </h3>
                <p className="text-sm text-slate-500 dark:text-dark-text-tertiary text-center max-w-sm">
                  {searchQuery || activeFilterCount > 0
                    ? 'Try adjusting your search or filter criteria'
                    : 'No agents have been created yet'}
                </p>
                {(searchQuery || activeFilterCount > 0) && (
                  <Button
                    variant="secondary"
                    className="mt-4"
                    onClick={handleClearFilters}
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            ) : viewMode === 'table' ? (
              <AgentTable
                agents={paginatedAgents}
                selectedIds={selectedIds}
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={handleSort}
                onSelectAgent={handleSelectAgent}
                onSelectAll={handleSelectAll}
                onAgentAction={onAgentAction}
              />
            ) : (
              <AgentGrid
                agents={paginatedAgents}
                selectedIds={selectedIds}
                onSelectAgent={handleSelectAgent}
                onAgentAction={onAgentAction}
              />
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="border-t border-slate-200 dark:border-dark-border-primary">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AgentManager;
