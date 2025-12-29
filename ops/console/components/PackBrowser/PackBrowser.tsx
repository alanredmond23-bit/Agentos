'use client';

/**
 * AgentOS Ops Console - Pack Browser Component
 * Main component for browsing, filtering, and searching agent packs
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Grid3X3,
  List,
  Package,
  SlidersHorizontal,
  ArrowUpDown,
  ChevronDown,
  X,
  CheckCircle,
  Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/Card';
import { Button, ButtonGroup } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Table';
import { EmptyState } from '@/components/ui/EmptyState';
import { PackCard } from './PackCard';
import { PackFilters } from './PackFilters';
import { PackSearch } from './PackSearch';
import { useStudioStore } from '@/stores/studioStore';
import type {
  Pack,
  PackCategory,
  PackLifecycle,
  PackDomain,
} from '@/app/studio/packs/page';

// ============================================
// Types
// ============================================

export type SortOption = 'name' | 'agents' | 'popularity' | 'updated';
export type SortDirection = 'asc' | 'desc';
export type ViewMode = 'grid' | 'list';

export type InstallStatus = 'installed' | 'available';

export interface PackFiltersState {
  categories: PackCategory[];
  lifecycles: PackLifecycle[];
  domains: PackDomain[];
  status: InstallStatus[];
}

interface PackBrowserProps {
  packs: Pack[];
}

// ============================================
// Pack Browser Component
// ============================================

export function PackBrowser({ packs }: PackBrowserProps) {
  // Store integration for pack installation state
  const {
    packs: storePacksState,
    installPack,
    uninstallPack,
    isPackInstalled,
    isPackInstalling,
    isPackUninstalling,
  } = useStudioStore();

  // Local state management
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('popularity');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [showFilters, setShowFilters] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<PackFiltersState>({
    categories: [],
    lifecycles: [],
    domains: [],
    status: [],
  });

  const itemsPerPage = viewMode === 'grid' ? 12 : 10;

  // Get installed pack IDs as array for easier computation
  const installedPackIds = useMemo(
    () => Array.from(storePacksState.installedPackIds),
    [storePacksState.installedPackIds]
  );

  // Fuzzy search matching
  const fuzzyMatch = useCallback((text: string, query: string): boolean => {
    if (!query) return true;
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();

    // Direct substring match
    if (lowerText.includes(lowerQuery)) return true;

    // Fuzzy character matching
    let queryIndex = 0;
    for (let i = 0; i < lowerText.length && queryIndex < lowerQuery.length; i++) {
      if (lowerText[i] === lowerQuery[queryIndex]) {
        queryIndex++;
      }
    }
    return queryIndex === lowerQuery.length;
  }, []);

  // Filter and sort packs
  const filteredAndSortedPacks = useMemo(() => {
    let result = [...packs];

    // Apply search filter
    if (searchQuery) {
      result = result.filter(
        (pack) =>
          fuzzyMatch(pack.name, searchQuery) ||
          fuzzyMatch(pack.description, searchQuery) ||
          pack.tags.some((tag) => fuzzyMatch(tag, searchQuery))
      );
    }

    // Apply category filter
    if (filters.categories.length > 0) {
      result = result.filter((pack) =>
        filters.categories.includes(pack.category)
      );
    }

    // Apply lifecycle filter
    if (filters.lifecycles.length > 0) {
      result = result.filter((pack) =>
        filters.lifecycles.includes(pack.lifecycle)
      );
    }

    // Apply domain filter
    if (filters.domains.length > 0) {
      result = result.filter((pack) => filters.domains.includes(pack.domain));
    }

    // Apply status filter (installed/available)
    if (filters.status.length > 0) {
      result = result.filter((pack) => {
        const packInstalled = storePacksState.installedPackIds.has(pack.id);
        if (filters.status.includes('installed') && packInstalled) return true;
        if (filters.status.includes('available') && !packInstalled) return true;
        return false;
      });
    }

    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'agents':
          comparison = a.agentCount - b.agentCount;
          break;
        case 'popularity':
          comparison = a.popularity - b.popularity;
          break;
        case 'updated':
          comparison =
            new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [packs, searchQuery, filters, sortBy, sortDirection, fuzzyMatch, storePacksState.installedPackIds]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedPacks.length / itemsPerPage);
  const paginatedPacks = filteredAndSortedPacks.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filters, sortBy, sortDirection, viewMode]);

  // Check if any filters are active
  const hasActiveFilters =
    searchQuery ||
    filters.categories.length > 0 ||
    filters.lifecycles.length > 0 ||
    filters.domains.length > 0 ||
    filters.status.length > 0;

  // Clear all filters
  const clearAllFilters = () => {
    setSearchQuery('');
    setFilters({
      categories: [],
      lifecycles: [],
      domains: [],
      status: [],
    });
  };

  // Handle pack install
  const handleInstall = useCallback(
    (packId: string) => {
      installPack(packId);
    },
    [installPack]
  );

  // Handle pack uninstall
  const handleUninstall = useCallback(
    (packId: string) => {
      uninstallPack(packId);
    },
    [uninstallPack]
  );

  // Toggle sort direction or change sort field
  const handleSort = (option: SortOption) => {
    if (sortBy === option) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(option);
      setSortDirection('desc');
    }
  };

  // Stats
  const stats = useMemo(
    () => ({
      total: packs.length,
      installed: packs.filter((p) => storePacksState.installedPackIds.has(p.id)).length,
      production: packs.filter((p) => p.category === 'production').length,
      beta: packs.filter((p) => p.category === 'beta').length,
      alpha: packs.filter((p) => p.category === 'alpha').length,
    }),
    [packs, storePacksState.installedPackIds]
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="page-header mb-0">
          <h1 className="page-title">Pack Browser</h1>
          <p className="page-description">
            Discover and install agent packs for your organization
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="default" size="lg">
            {stats.total} Packs
          </Badge>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <QuickStat label="Total" value={stats.total} color="blue" icon={<Package className="w-4 h-4" />} />
        <QuickStat label="Installed" value={stats.installed} color="emerald" icon={<CheckCircle className="w-4 h-4" />} />
        <QuickStat label="Production" value={stats.production} color="emerald" />
        <QuickStat label="Beta" value={stats.beta} color="amber" />
        <QuickStat label="Alpha" value={stats.alpha} color="purple" />
      </div>

      {/* Main Content */}
      <div className="flex gap-6">
        {/* Filters Sidebar */}
        {showFilters && (
          <aside className="w-64 flex-shrink-0 hidden lg:block">
            <PackFilters filters={filters} onFiltersChange={setFilters} />
          </aside>
        )}

        {/* Pack List */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Toolbar */}
          <Card>
            <CardContent className="py-4">
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                {/* Search */}
                <div className="flex-1 max-w-md">
                  <PackSearch
                    value={searchQuery}
                    onChange={setSearchQuery}
                    packs={packs}
                  />
                </div>

                {/* Sort Options */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500 dark:text-dark-text-tertiary">
                    Sort by:
                  </span>
                  <div className="relative">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as SortOption)}
                      className="input py-2 pr-8 min-w-[140px]"
                    >
                      <option value="popularity">Popularity</option>
                      <option value="name">Name</option>
                      <option value="agents">Agent Count</option>
                      <option value="updated">Last Updated</option>
                    </select>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setSortDirection((prev) =>
                        prev === 'asc' ? 'desc' : 'asc'
                      )
                    }
                    title={sortDirection === 'asc' ? 'Ascending' : 'Descending'}
                  >
                    <ArrowUpDown
                      className={cn(
                        'w-4 h-4 transition-transform',
                        sortDirection === 'asc' && 'rotate-180'
                      )}
                    />
                  </Button>
                </div>

                {/* View Toggle and Filter Toggle */}
                <div className="flex items-center gap-2 ml-auto">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowFilters(!showFilters)}
                    className="lg:hidden"
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                  </Button>

                  <ButtonGroup attached>
                    <Button
                      variant={viewMode === 'grid' ? 'primary' : 'secondary'}
                      size="sm"
                      onClick={() => setViewMode('grid')}
                      title="Grid view"
                    >
                      <Grid3X3 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant={viewMode === 'list' ? 'primary' : 'secondary'}
                      size="sm"
                      onClick={() => setViewMode('list')}
                      title="List view"
                    >
                      <List className="w-4 h-4" />
                    </Button>
                  </ButtonGroup>
                </div>
              </div>

              {/* Active Filters */}
              {hasActiveFilters && (
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-dark-border-primary">
                  <span className="text-sm text-slate-500 dark:text-dark-text-tertiary">
                    Active filters:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {searchQuery && (
                      <Badge
                        variant="info"
                        size="sm"
                        removable
                        onRemove={() => setSearchQuery('')}
                      >
                        Search: {searchQuery}
                      </Badge>
                    )}
                    {filters.categories.map((cat) => (
                      <Badge
                        key={cat}
                        variant="primary"
                        size="sm"
                        removable
                        onRemove={() =>
                          setFilters((prev) => ({
                            ...prev,
                            categories: prev.categories.filter((c) => c !== cat),
                          }))
                        }
                      >
                        {cat}
                      </Badge>
                    ))}
                    {filters.lifecycles.map((lc) => (
                      <Badge
                        key={lc}
                        variant="secondary"
                        size="sm"
                        removable
                        onRemove={() =>
                          setFilters((prev) => ({
                            ...prev,
                            lifecycles: prev.lifecycles.filter((l) => l !== lc),
                          }))
                        }
                      >
                        {lc}
                      </Badge>
                    ))}
                    {filters.domains.map((dom) => (
                      <Badge
                        key={dom}
                        variant="outline"
                        size="sm"
                        removable
                        onRemove={() =>
                          setFilters((prev) => ({
                            ...prev,
                            domains: prev.domains.filter((d) => d !== dom),
                          }))
                        }
                      >
                        {dom}
                      </Badge>
                    ))}
                    {filters.status.map((st) => (
                      <Badge
                        key={st}
                        variant={st === 'installed' ? 'success' : 'default'}
                        size="sm"
                        removable
                        onRemove={() =>
                          setFilters((prev) => ({
                            ...prev,
                            status: prev.status.filter((s) => s !== st),
                          }))
                        }
                      >
                        {st}
                      </Badge>
                    ))}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllFilters}
                    className="ml-auto"
                  >
                    Clear all
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Results */}
          {filteredAndSortedPacks.length === 0 ? (
            <EmptyState
              icon={<Package className="w-12 h-12" />}
              title="No packs found"
              description={
                hasActiveFilters
                  ? 'Try adjusting your filters or search query'
                  : 'No agent packs are available at this time'
              }
              action={
                hasActiveFilters
                  ? {
                      label: 'Clear filters',
                      onClick: clearAllFilters,
                    }
                  : undefined
              }
            />
          ) : viewMode === 'grid' ? (
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
              {paginatedPacks.map((pack) => (
                <PackCard
                  key={pack.id}
                  pack={pack}
                  viewMode="grid"
                  isInstalled={isPackInstalled(pack.id)}
                  isInstalling={isPackInstalling(pack.id)}
                  isUninstalling={isPackUninstalling(pack.id)}
                  onInstall={handleInstall}
                  onUninstall={handleUninstall}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {paginatedPacks.map((pack) => (
                <PackCard
                  key={pack.id}
                  pack={pack}
                  viewMode="list"
                  isInstalled={isPackInstalled(pack.id)}
                  isInstalling={isPackInstalling(pack.id)}
                  isUninstalling={isPackUninstalling(pack.id)}
                  onInstall={handleInstall}
                  onUninstall={handleUninstall}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// Quick Stat Component
// ============================================

function QuickStat({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: number;
  color: 'emerald' | 'amber' | 'purple' | 'blue';
  icon?: React.ReactNode;
}) {
  const colorStyles = {
    emerald: 'text-emerald-600 dark:text-emerald-400',
    amber: 'text-amber-600 dark:text-amber-400',
    purple: 'text-purple-600 dark:text-purple-400',
    blue: 'text-blue-600 dark:text-blue-400',
  };

  const bgColorStyles = {
    emerald: 'bg-emerald-50 dark:bg-emerald-500/10',
    amber: 'bg-amber-50 dark:bg-amber-500/10',
    purple: 'bg-purple-50 dark:bg-purple-500/10',
    blue: 'bg-blue-50 dark:bg-blue-500/10',
  };

  return (
    <div className="p-4 rounded-xl bg-white dark:bg-dark-bg-elevated border border-slate-200 dark:border-dark-border-primary hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 dark:text-dark-text-tertiary">
          {label}
        </p>
        {icon && (
          <div className={cn('p-1.5 rounded-lg', bgColorStyles[color], colorStyles[color])}>
            {icon}
          </div>
        )}
      </div>
      <p className={cn('text-2xl font-bold mt-1', colorStyles[color])}>
        {value}
      </p>
    </div>
  );
}

export default PackBrowser;
