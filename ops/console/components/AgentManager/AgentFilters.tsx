/**
 * AgentOS Studio - Agent Filters Component
 * Sidebar filter panel for filtering agents by pack, status, and authority
 */

'use client';

import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import type { AgentPack } from '@/types';
import {
  X,
  ChevronDown,
  ChevronRight,
  Package,
  ToggleLeft,
  Shield
} from 'lucide-react';

// ============================================
// Types
// ============================================

export type AuthorityLevel = 'operator' | 'manager' | 'worker' | 'observer';

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

export interface FilterState {
  packs: AgentPack[];
  statuses: Array<'active' | 'inactive'>;
  authorities: AuthorityLevel[];
}

interface AgentFiltersProps {
  filters: FilterState;
  agents: StudioAgent[];
  onFilterChange: (filters: FilterState) => void;
  onClose: () => void;
}

// ============================================
// Pack Display Config
// ============================================

const packLabels: Record<AgentPack, string> = {
  devops: 'DevOps',
  qa: 'QA',
  legal: 'Legal',
  mobile: 'Mobile',
  research: 'Research',
  planning: 'Planning',
  analytics: 'Analytics',
  orchestration: 'Orchestration',
  error_predictor: 'Error Predictor',
  product: 'Product',
  marketing: 'Marketing',
  supabase: 'Supabase',
  design: 'Design',
  engineering: 'Engineering'
};

const authorityLabels: Record<AuthorityLevel, string> = {
  operator: 'Operator',
  manager: 'Manager',
  worker: 'Worker',
  observer: 'Observer'
};

// ============================================
// Filter Section Component
// ============================================

interface FilterSectionProps {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function FilterSection({ title, icon: Icon, children, defaultOpen = true }: FilterSectionProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  return (
    <div className="border-b border-slate-200 dark:border-dark-border-primary last:border-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-dark-bg-tertiary transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-slate-400 dark:text-dark-text-muted" />
          <span className="font-medium text-sm text-slate-700 dark:text-dark-text-secondary">
            {title}
          </span>
        </div>
        {isOpen ? (
          <ChevronDown className="w-4 h-4 text-slate-400 dark:text-dark-text-muted" />
        ) : (
          <ChevronRight className="w-4 h-4 text-slate-400 dark:text-dark-text-muted" />
        )}
      </button>

      {isOpen && (
        <div className="px-3 pb-3">
          {children}
        </div>
      )}
    </div>
  );
}

// ============================================
// Filter Checkbox Component
// ============================================

interface FilterCheckboxProps {
  label: string;
  checked: boolean;
  count: number;
  onChange: (checked: boolean) => void;
}

function FilterCheckbox({ label, checked, count, onChange }: FilterCheckboxProps) {
  return (
    <label className="flex items-center gap-2 py-1.5 cursor-pointer group">
      <div className="relative">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <div
          className={cn(
            'w-4 h-4 rounded border-2 transition-colors',
            checked
              ? 'bg-brand-600 border-brand-600 dark:bg-brand-500 dark:border-brand-500'
              : 'border-slate-300 dark:border-dark-border-secondary group-hover:border-slate-400 dark:group-hover:border-dark-border-primary'
          )}
        >
          {checked && (
            <svg
              className="w-full h-full text-white"
              viewBox="0 0 16 16"
              fill="none"
            >
              <path
                d="M12 5L6.5 10.5L4 8"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>
      </div>
      <span
        className={cn(
          'text-sm flex-1 truncate',
          checked
            ? 'text-slate-900 dark:text-dark-text-primary font-medium'
            : 'text-slate-600 dark:text-dark-text-secondary'
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          'text-xs tabular-nums px-1.5 py-0.5 rounded',
          checked
            ? 'bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-400'
            : 'bg-slate-100 text-slate-500 dark:bg-dark-bg-tertiary dark:text-dark-text-muted'
        )}
      >
        {count}
      </span>
    </label>
  );
}

// ============================================
// Main Component
// ============================================

export function AgentFilters({
  filters,
  agents,
  onFilterChange,
  onClose
}: AgentFiltersProps) {
  // Calculate counts for each filter option
  const packCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    agents.forEach((agent) => {
      counts[agent.pack] = (counts[agent.pack] || 0) + 1;
    });
    return counts;
  }, [agents]);

  const statusCounts = useMemo(() => ({
    active: agents.filter((a) => a.status === 'active').length,
    inactive: agents.filter((a) => a.status === 'inactive').length
  }), [agents]);

  const authorityCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    agents.forEach((agent) => {
      counts[agent.authority] = (counts[agent.authority] || 0) + 1;
    });
    return counts;
  }, [agents]);

  // Get available packs (only those with agents)
  const availablePacks = useMemo(() => {
    return Object.keys(packCounts).sort() as AgentPack[];
  }, [packCounts]);

  // Filter handlers
  const handlePackToggle = (pack: AgentPack, checked: boolean) => {
    const newPacks = checked
      ? [...filters.packs, pack]
      : filters.packs.filter((p) => p !== pack);
    onFilterChange({ ...filters, packs: newPacks });
  };

  const handleStatusToggle = (status: 'active' | 'inactive', checked: boolean) => {
    const newStatuses = checked
      ? [...filters.statuses, status]
      : filters.statuses.filter((s) => s !== status);
    onFilterChange({ ...filters, statuses: newStatuses });
  };

  const handleAuthorityToggle = (authority: AuthorityLevel, checked: boolean) => {
    const newAuthorities = checked
      ? [...filters.authorities, authority]
      : filters.authorities.filter((a) => a !== authority);
    onFilterChange({ ...filters, authorities: newAuthorities });
  };

  const handleClearAll = () => {
    onFilterChange({
      packs: [],
      statuses: [],
      authorities: []
    });
  };

  const totalActiveFilters =
    filters.packs.length + filters.statuses.length + filters.authorities.length;

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-dark-border-primary">
        <div>
          <h3 className="font-semibold text-slate-900 dark:text-dark-text-primary">
            Filters
          </h3>
          {totalActiveFilters > 0 && (
            <p className="text-xs text-slate-500 dark:text-dark-text-tertiary mt-0.5">
              {totalActiveFilters} active
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:text-dark-text-muted dark:hover:text-dark-text-secondary dark:hover:bg-dark-bg-tertiary transition-colors"
          aria-label="Close filters"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Filter Sections */}
      <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
        {/* Pack Filter */}
        <FilterSection title="Pack" icon={Package}>
          <div className="space-y-0.5">
            {availablePacks.map((pack) => (
              <FilterCheckbox
                key={pack}
                label={packLabels[pack]}
                checked={filters.packs.includes(pack)}
                count={packCounts[pack] || 0}
                onChange={(checked) => handlePackToggle(pack, checked)}
              />
            ))}
          </div>
        </FilterSection>

        {/* Status Filter */}
        <FilterSection title="Status" icon={ToggleLeft}>
          <div className="space-y-0.5">
            <FilterCheckbox
              label="Active"
              checked={filters.statuses.includes('active')}
              count={statusCounts.active}
              onChange={(checked) => handleStatusToggle('active', checked)}
            />
            <FilterCheckbox
              label="Inactive"
              checked={filters.statuses.includes('inactive')}
              count={statusCounts.inactive}
              onChange={(checked) => handleStatusToggle('inactive', checked)}
            />
          </div>
        </FilterSection>

        {/* Authority Filter */}
        <FilterSection title="Authority Level" icon={Shield}>
          <div className="space-y-0.5">
            {(['operator', 'manager', 'worker', 'observer'] as AuthorityLevel[]).map(
              (authority) => (
                <FilterCheckbox
                  key={authority}
                  label={authorityLabels[authority]}
                  checked={filters.authorities.includes(authority)}
                  count={authorityCounts[authority] || 0}
                  onChange={(checked) => handleAuthorityToggle(authority, checked)}
                />
              )
            )}
          </div>
        </FilterSection>
      </div>

      {/* Footer */}
      {totalActiveFilters > 0 && (
        <div className="p-3 border-t border-slate-200 dark:border-dark-border-primary">
          <Button
            variant="ghost"
            size="sm"
            fullWidth
            onClick={handleClearAll}
            leftIcon={<X className="w-3.5 h-3.5" />}
          >
            Clear All Filters
          </Button>
        </div>
      )}
    </div>
  );
}

export default AgentFilters;
