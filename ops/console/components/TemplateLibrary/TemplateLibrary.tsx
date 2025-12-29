/**
 * AgentOS Studio - Template Library Component
 * Grid of templates with filtering and search
 */

'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { TemplateCard } from './TemplateCard';
import { TemplatePreview } from './TemplatePreview';
import {
  type AgentTemplate,
  type TemplateCategory,
  AGENT_TEMPLATES,
  CATEGORY_INFO,
  searchTemplates,
  getPopularTemplates,
} from '@/lib/studio/templates';
import type { AgentPack } from '@/types';
import {
  Search,
  Filter,
  Grid3X3,
  List,
  Upload,
  Link2,
  Star,
  Sparkles,
  X,
  ChevronDown,
} from 'lucide-react';

// ============================================
// Types
// ============================================

interface TemplateLibraryProps {
  onSelectTemplate?: (template: AgentTemplate) => void;
  showImportOptions?: boolean;
  selectionMode?: boolean;
  selectedTemplateId?: string | null;
}

type ViewMode = 'grid' | 'list';

// ============================================
// Pack Options
// ============================================

const PACK_OPTIONS: { value: AgentPack | 'all'; label: string }[] = [
  { value: 'all', label: 'All Packs' },
  { value: 'devops', label: 'DevOps' },
  { value: 'qa', label: 'QA' },
  { value: 'engineering', label: 'Engineering' },
  { value: 'research', label: 'Research' },
  { value: 'analytics', label: 'Analytics' },
  { value: 'product', label: 'Product' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'legal', label: 'Legal' },
  { value: 'supabase', label: 'Supabase' },
  { value: 'design', label: 'Design' },
];

// ============================================
// Template Library Component
// ============================================

export function TemplateLibrary({
  onSelectTemplate,
  showImportOptions = true,
  selectionMode = false,
  selectedTemplateId = null,
}: TemplateLibraryProps) {
  const router = useRouter();

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPack, setSelectedPack] = useState<AgentPack | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | 'all'>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<AgentTemplate | null>(null);

  // ============================================
  // Computed Values
  // ============================================

  const filteredTemplates = useMemo(() => {
    let templates = AGENT_TEMPLATES;

    // Filter by search query
    if (searchQuery) {
      templates = searchTemplates(searchQuery);
    }

    // Filter by pack
    if (selectedPack !== 'all') {
      templates = templates.filter((t) => t.pack === selectedPack);
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      templates = templates.filter((t) => t.category === selectedCategory);
    }

    return templates;
  }, [searchQuery, selectedPack, selectedCategory]);

  const popularTemplates = useMemo(() => getPopularTemplates(3), []);

  const categories = Object.keys(CATEGORY_INFO) as TemplateCategory[];

  // ============================================
  // Handlers
  // ============================================

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  const handlePackChange = useCallback((pack: AgentPack | 'all') => {
    setSelectedPack(pack);
  }, []);

  const handleCategoryChange = useCallback((category: TemplateCategory | 'all') => {
    setSelectedCategory(category);
  }, []);

  const handleTemplateSelect = useCallback(
    (template: AgentTemplate) => {
      onSelectTemplate?.(template);
    },
    [onSelectTemplate]
  );

  const handleUseTemplate = useCallback(
    (template: AgentTemplate) => {
      router.push(`/studio/agents/new?template=${template.id}`);
    },
    [router]
  );

  const handleCloneTemplate = useCallback((template: AgentTemplate) => {
    console.log('Cloning template:', template.id);
    // TODO: Implement clone functionality
  }, []);

  const handlePreviewTemplate = useCallback((template: AgentTemplate) => {
    setPreviewTemplate(template);
  }, []);

  const handleClosePreview = useCallback(() => {
    setPreviewTemplate(null);
  }, []);

  const handleImportFromUrl = useCallback(() => {
    console.log('Import from URL');
    // TODO: Implement URL import
  }, []);

  const handleImportFromFile = useCallback(() => {
    console.log('Import from file');
    // TODO: Implement file import
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedPack('all');
    setSelectedCategory('all');
  }, []);

  // ============================================
  // Render
  // ============================================

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Search */}
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={handleSearchChange}
            leftIcon={<Search className="w-4 h-4" />}
            rightIcon={
              searchQuery ? (
                <button
                  onClick={handleClearSearch}
                  className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-dark-bg-elevated"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : undefined
            }
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center p-1 rounded-lg bg-slate-100 dark:bg-dark-bg-tertiary">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-1.5 rounded transition-colors',
                viewMode === 'grid'
                  ? 'bg-white dark:bg-dark-bg-secondary shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:text-dark-text-tertiary dark:hover:text-dark-text-secondary'
              )}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'p-1.5 rounded transition-colors',
                viewMode === 'list'
                  ? 'bg-white dark:bg-dark-bg-secondary shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:text-dark-text-tertiary dark:hover:text-dark-text-secondary'
              )}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Filter Toggle */}
          <Button
            variant={showFilters ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            leftIcon={<Filter className="w-4 h-4" />}
          >
            Filters
            {(selectedPack !== 'all' || selectedCategory !== 'all') && (
              <Badge variant="primary" size="sm" className="ml-1">
                {[selectedPack !== 'all', selectedCategory !== 'all'].filter(Boolean).length}
              </Badge>
            )}
          </Button>

          {/* Import Options */}
          {showImportOptions && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleImportFromUrl}
                leftIcon={<Link2 className="w-4 h-4" />}
              >
                Import URL
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleImportFromFile}
                leftIcon={<Upload className="w-4 h-4" />}
              >
                Upload
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card className="animate-in fade-in slide-in-from-top-2 duration-200">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4">
              {/* Pack Filter */}
              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-dark-text-tertiary mb-2 block">
                  Pack
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {PACK_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handlePackChange(option.value)}
                      className={cn(
                        'px-2.5 py-1 text-xs rounded-full border transition-colors',
                        selectedPack === option.value
                          ? 'bg-brand-100 dark:bg-brand-900 border-brand-300 dark:border-brand-700 text-brand-700 dark:text-brand-300'
                          : 'bg-white dark:bg-dark-bg-secondary border-slate-200 dark:border-dark-border-primary text-slate-600 dark:text-dark-text-secondary hover:border-slate-300 dark:hover:border-dark-border-secondary'
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category Filter */}
              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-dark-text-tertiary mb-2 block">
                  Category
                </label>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => handleCategoryChange('all')}
                    className={cn(
                      'px-2.5 py-1 text-xs rounded-full border transition-colors',
                      selectedCategory === 'all'
                        ? 'bg-brand-100 dark:bg-brand-900 border-brand-300 dark:border-brand-700 text-brand-700 dark:text-brand-300'
                        : 'bg-white dark:bg-dark-bg-secondary border-slate-200 dark:border-dark-border-primary text-slate-600 dark:text-dark-text-secondary hover:border-slate-300 dark:hover:border-dark-border-secondary'
                    )}
                  >
                    All Categories
                  </button>
                  {categories.map((category) => (
                    <button
                      key={category}
                      onClick={() => handleCategoryChange(category)}
                      className={cn(
                        'px-2.5 py-1 text-xs rounded-full border transition-colors',
                        selectedCategory === category
                          ? 'bg-brand-100 dark:bg-brand-900 border-brand-300 dark:border-brand-700 text-brand-700 dark:text-brand-300'
                          : 'bg-white dark:bg-dark-bg-secondary border-slate-200 dark:border-dark-border-primary text-slate-600 dark:text-dark-text-secondary hover:border-slate-300 dark:hover:border-dark-border-secondary'
                      )}
                    >
                      {CATEGORY_INFO[category].label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Clear Filters */}
              {(selectedPack !== 'all' || selectedCategory !== 'all' || searchQuery) && (
                <div className="flex items-end">
                  <Button variant="ghost" size="sm" onClick={handleClearFilters}>
                    Clear Filters
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Popular Templates (when no filters) */}
      {!searchQuery && selectedPack === 'all' && selectedCategory === 'all' && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Star className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-medium text-slate-900 dark:text-dark-text-primary">
              Popular Templates
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {popularTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                isSelected={selectedTemplateId === template.id}
                showActions={!selectionMode}
                onSelect={selectionMode ? handleTemplateSelect : undefined}
                onUse={handleUseTemplate}
                onClone={handleCloneTemplate}
                onPreview={handlePreviewTemplate}
              />
            ))}
          </div>
        </div>
      )}

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 dark:text-dark-text-tertiary">
          {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''} found
        </p>
      </div>

      {/* Template Grid */}
      {filteredTemplates.length > 0 ? (
        <div
          className={cn(
            viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
              : 'space-y-3'
          )}
        >
          {filteredTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              isSelected={selectedTemplateId === template.id}
              showActions={!selectionMode}
              onSelect={selectionMode ? handleTemplateSelect : undefined}
              onUse={handleUseTemplate}
              onClone={handleCloneTemplate}
              onPreview={handlePreviewTemplate}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Sparkles className="w-12 h-12 text-slate-300 dark:text-dark-text-muted mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 dark:text-dark-text-primary mb-1">
            No templates found
          </h3>
          <p className="text-sm text-slate-500 dark:text-dark-text-tertiary mb-4">
            Try adjusting your search or filters
          </p>
          <Button variant="secondary" onClick={handleClearFilters}>
            Clear Filters
          </Button>
        </div>
      )}

      {/* Template Preview Modal */}
      {previewTemplate && (
        <TemplatePreview
          template={previewTemplate}
          isOpen={true}
          onClose={handleClosePreview}
          onUseTemplate={handleUseTemplate}
        />
      )}
    </div>
  );
}

export default TemplateLibrary;
