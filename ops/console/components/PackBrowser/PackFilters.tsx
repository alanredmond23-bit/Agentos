'use client';

/**
 * AgentOS Ops Console - Pack Filters Component
 * Filter sidebar for category, lifecycle, and domain filtering
 */

import React, { useState } from 'react';
import {
  Filter,
  ChevronDown,
  ChevronUp,
  Check,
  RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import type {
  PackCategory,
  PackLifecycle,
  PackDomain,
} from '@/app/studio/packs/page';
import type { PackFiltersState, InstallStatus } from './PackBrowser';

// ============================================
// Types
// ============================================

interface PackFiltersProps {
  filters: PackFiltersState;
  onFiltersChange: (filters: PackFiltersState) => void;
}

interface FilterOption<T> {
  value: T;
  label: string;
  description?: string;
  count?: number;
}

// ============================================
// Filter Options Data
// ============================================

const categoryOptions: FilterOption<PackCategory>[] = [
  {
    value: 'production',
    label: 'Production',
    description: 'Stable, production-ready packs',
  },
  {
    value: 'beta',
    label: 'Beta',
    description: 'Feature-complete, testing phase',
  },
  {
    value: 'alpha',
    label: 'Alpha',
    description: 'Early development, experimental',
  },
];

const lifecycleOptions: FilterOption<PackLifecycle>[] = [
  {
    value: 'stable',
    label: 'Stable',
    description: 'Actively maintained and supported',
  },
  {
    value: 'maintenance',
    label: 'Maintenance',
    description: 'Bug fixes only, no new features',
  },
  {
    value: 'experimental',
    label: 'Experimental',
    description: 'New features, may change',
  },
  {
    value: 'deprecated',
    label: 'Deprecated',
    description: 'Scheduled for removal',
  },
];

const domainOptions: FilterOption<PackDomain>[] = [
  {
    value: 'engineering',
    label: 'Engineering',
    description: 'Code, development, testing',
  },
  {
    value: 'operations',
    label: 'Operations',
    description: 'DevOps, infrastructure, deployment',
  },
  {
    value: 'analytics',
    label: 'Analytics',
    description: 'Data, reporting, insights',
  },
  {
    value: 'business',
    label: 'Business',
    description: 'Product, marketing, sales',
  },
  {
    value: 'security',
    label: 'Security',
    description: 'Security, compliance, auditing',
  },
  {
    value: 'infrastructure',
    label: 'Infrastructure',
    description: 'Cloud, databases, services',
  },
];

const statusOptions: FilterOption<InstallStatus>[] = [
  {
    value: 'installed',
    label: 'Installed',
    description: 'Packs installed in your organization',
  },
  {
    value: 'available',
    label: 'Available',
    description: 'Packs ready to install',
  },
];

// ============================================
// Filter Section Component
// ============================================

interface FilterSectionProps<T extends string> {
  title: string;
  options: FilterOption<T>[];
  selected: T[];
  onChange: (values: T[]) => void;
  defaultExpanded?: boolean;
}

function FilterSection<T extends string>({
  title,
  options,
  selected,
  onChange,
  defaultExpanded = true,
}: FilterSectionProps<T>) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const handleToggle = (value: T) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const handleSelectAll = () => {
    if (selected.length === options.length) {
      onChange([]);
    } else {
      onChange(options.map((opt) => opt.value));
    }
  };

  return (
    <div className="border-b border-slate-100 dark:border-dark-border-primary last:border-b-0">
      {/* Section Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full py-3 px-1 text-left hover:bg-slate-50 dark:hover:bg-dark-bg-tertiary rounded-lg transition-colors"
      >
        <span className="font-medium text-slate-900 dark:text-dark-text-primary">
          {title}
        </span>
        <div className="flex items-center gap-2">
          {selected.length > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-brand-100 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400">
              {selected.length}
            </span>
          )}
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </button>

      {/* Section Content */}
      {isExpanded && (
        <div className="pb-4 space-y-1">
          {/* Select All */}
          <button
            onClick={handleSelectAll}
            className="flex items-center gap-2 w-full py-1.5 px-2 text-sm text-slate-500 dark:text-dark-text-tertiary hover:text-slate-700 dark:hover:text-dark-text-secondary transition-colors"
          >
            <div
              className={cn(
                'w-4 h-4 rounded border flex items-center justify-center transition-colors',
                selected.length === options.length
                  ? 'bg-brand-600 border-brand-600'
                  : selected.length > 0
                    ? 'bg-brand-100 border-brand-300 dark:bg-brand-500/20 dark:border-brand-500/50'
                    : 'border-slate-300 dark:border-dark-border-secondary'
              )}
            >
              {selected.length === options.length && (
                <Check className="w-3 h-3 text-white" />
              )}
              {selected.length > 0 && selected.length < options.length && (
                <div className="w-2 h-0.5 bg-brand-600 rounded" />
              )}
            </div>
            <span>
              {selected.length === options.length ? 'Deselect all' : 'Select all'}
            </span>
          </button>

          {/* Options */}
          {options.map((option) => {
            const isSelected = selected.includes(option.value);

            return (
              <button
                key={option.value}
                onClick={() => handleToggle(option.value)}
                className={cn(
                  'flex items-start gap-2 w-full py-2 px-2 rounded-lg transition-colors text-left',
                  isSelected
                    ? 'bg-brand-50 dark:bg-brand-500/10'
                    : 'hover:bg-slate-50 dark:hover:bg-dark-bg-tertiary'
                )}
              >
                <div
                  className={cn(
                    'w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors',
                    isSelected
                      ? 'bg-brand-600 border-brand-600'
                      : 'border-slate-300 dark:border-dark-border-secondary'
                  )}
                >
                  {isSelected && <Check className="w-3 h-3 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'text-sm font-medium',
                        isSelected
                          ? 'text-brand-700 dark:text-brand-400'
                          : 'text-slate-700 dark:text-dark-text-secondary'
                      )}
                    >
                      {option.label}
                    </span>
                    {option.count !== undefined && (
                      <span className="text-xs text-slate-400 dark:text-dark-text-muted">
                        ({option.count})
                      </span>
                    )}
                  </div>
                  {option.description && (
                    <p className="text-xs text-slate-500 dark:text-dark-text-tertiary mt-0.5">
                      {option.description}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================
// Pack Filters Component
// ============================================

export function PackFilters({ filters, onFiltersChange }: PackFiltersProps) {
  const hasActiveFilters =
    filters.categories.length > 0 ||
    filters.lifecycles.length > 0 ||
    filters.domains.length > 0 ||
    filters.status.length > 0;

  const handleReset = () => {
    onFiltersChange({
      categories: [],
      lifecycles: [],
      domains: [],
      status: [],
    });
  };

  const totalActiveFilters =
    filters.categories.length +
    filters.lifecycles.length +
    filters.domains.length +
    filters.status.length;

  return (
    <Card className="sticky top-6">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500 dark:text-dark-text-tertiary" />
            <CardTitle className="text-base">Filters</CardTitle>
            {totalActiveFilters > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-brand-100 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400">
                {totalActiveFilters}
              </span>
            )}
          </div>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="xs"
              onClick={handleReset}
              className="text-slate-500 hover:text-slate-700 dark:text-dark-text-tertiary dark:hover:text-dark-text-secondary"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              Reset
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-2">
          {/* Status Filter */}
          <FilterSection
            title="Status"
            options={statusOptions}
            selected={filters.status}
            onChange={(status) =>
              onFiltersChange({ ...filters, status })
            }
          />

          {/* Category Filter */}
          <FilterSection
            title="Category"
            options={categoryOptions}
            selected={filters.categories}
            onChange={(categories) =>
              onFiltersChange({ ...filters, categories })
            }
          />

          {/* Lifecycle Filter */}
          <FilterSection
            title="Lifecycle"
            options={lifecycleOptions}
            selected={filters.lifecycles}
            onChange={(lifecycles) =>
              onFiltersChange({ ...filters, lifecycles })
            }
          />

          {/* Domain Filter */}
          <FilterSection
            title="Domain"
            options={domainOptions}
            selected={filters.domains}
            onChange={(domains) => onFiltersChange({ ...filters, domains })}
          />
        </div>
      </CardContent>
    </Card>
  );
}

export default PackFilters;
