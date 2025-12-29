/**
 * AgentOS Studio - Pack Selection Step
 * Step 2: Choose a pack or start from a template
 */

'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import type { AgentPack } from '@/types';
import {
  type WizardFormData,
  type AgentTemplate,
  AGENT_TEMPLATES,
  getPopularTemplates,
} from '@/lib/studio/templates';
import {
  Search,
  Server,
  TestTube,
  Scale,
  Smartphone,
  Microscope,
  Calendar,
  BarChart3,
  GitBranch,
  AlertTriangle,
  Package,
  Megaphone,
  Database,
  Palette,
  Code2,
  Sparkles,
  Star,
  Check,
} from 'lucide-react';

// ============================================
// Types
// ============================================

interface PackSelectionStepProps {
  formData: WizardFormData;
  errors: Record<string, string>;
  onUpdate: (updates: Partial<WizardFormData>) => void;
  onTemplateSelect: (template: AgentTemplate) => void;
}

// ============================================
// Pack Definitions
// ============================================

interface PackInfo {
  id: AgentPack;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

const PACKS: PackInfo[] = [
  {
    id: 'devops',
    name: 'DevOps',
    description: 'CI/CD, deployments, infrastructure',
    icon: <Server className="w-5 h-5" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
  },
  {
    id: 'qa',
    name: 'QA',
    description: 'Testing, quality assurance',
    icon: <TestTube className="w-5 h-5" />,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
  },
  {
    id: 'engineering',
    name: 'Engineering',
    description: 'Code reviews, development',
    icon: <Code2 className="w-5 h-5" />,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-100 dark:bg-cyan-900/30',
  },
  {
    id: 'research',
    name: 'Research',
    description: 'Information gathering, analysis',
    icon: <Microscope className="w-5 h-5" />,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
  },
  {
    id: 'analytics',
    name: 'Analytics',
    description: 'Data analysis, reporting',
    icon: <BarChart3 className="w-5 h-5" />,
    color: 'text-pink-600',
    bgColor: 'bg-pink-100 dark:bg-pink-900/30',
  },
  {
    id: 'product',
    name: 'Product',
    description: 'Product management, support',
    icon: <Package className="w-5 h-5" />,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
  },
  {
    id: 'marketing',
    name: 'Marketing',
    description: 'Content, campaigns',
    icon: <Megaphone className="w-5 h-5" />,
    color: 'text-red-600',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
  },
  {
    id: 'legal',
    name: 'Legal',
    description: 'Compliance, contracts',
    icon: <Scale className="w-5 h-5" />,
    color: 'text-slate-600',
    bgColor: 'bg-slate-100 dark:bg-slate-800/50',
  },
  {
    id: 'supabase',
    name: 'Supabase',
    description: 'Database, backend',
    icon: <Database className="w-5 h-5" />,
    color: 'text-green-600',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
  },
  {
    id: 'design',
    name: 'Design',
    description: 'UI/UX, visual design',
    icon: <Palette className="w-5 h-5" />,
    color: 'text-violet-600',
    bgColor: 'bg-violet-100 dark:bg-violet-900/30',
  },
];

// ============================================
// Pack Selection Step Component
// ============================================

export function PackSelectionStep({
  formData,
  errors,
  onUpdate,
  onTemplateSelect,
}: PackSelectionStepProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showTemplates, setShowTemplates] = useState(true);

  // ============================================
  // Computed Values
  // ============================================

  const popularTemplates = useMemo(() => getPopularTemplates(4), []);

  const filteredPacks = useMemo(() => {
    if (!searchQuery) return PACKS;
    const query = searchQuery.toLowerCase();
    return PACKS.filter(
      (pack) =>
        pack.name.toLowerCase().includes(query) ||
        pack.description.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const templatesForSelectedPack = useMemo(() => {
    if (!formData.pack) return [];
    return AGENT_TEMPLATES.filter((t) => t.pack === formData.pack);
  }, [formData.pack]);

  // ============================================
  // Handlers
  // ============================================

  const handlePackSelect = useCallback(
    (packId: AgentPack) => {
      onUpdate({ pack: packId, templateId: null });
    },
    [onUpdate]
  );

  const handleTemplateClick = useCallback(
    (template: AgentTemplate) => {
      onTemplateSelect(template);
    },
    [onTemplateSelect]
  );

  // ============================================
  // Render
  // ============================================

  return (
    <div className="space-y-6">
      {/* Quick Start Templates */}
      {showTemplates && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-medium text-slate-900 dark:text-dark-text-primary">
                Quick Start Templates
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setShowTemplates(false)}
              className="text-xs text-slate-500 hover:text-slate-700 dark:text-dark-text-tertiary dark:hover:text-dark-text-secondary"
            >
              Hide
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {popularTemplates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => handleTemplateClick(template)}
                className={cn(
                  'p-3 rounded-lg border text-left transition-all',
                  formData.templateId === template.id
                    ? 'bg-brand-50 dark:bg-brand-900/20 border-brand-300 dark:border-brand-700 ring-2 ring-brand-500/20'
                    : 'bg-white dark:bg-dark-bg-secondary border-slate-200 dark:border-dark-border-primary hover:border-slate-300 dark:hover:border-dark-border-secondary hover:bg-slate-50 dark:hover:bg-dark-bg-tertiary'
                )}
              >
                <div className="flex items-start gap-2">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${template.color}20`, color: template.color }}
                  >
                    <Star className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-medium text-slate-900 dark:text-dark-text-primary truncate">
                        {template.name}
                      </h4>
                      {template.isOfficial && (
                        <Badge size="sm" variant="info">
                          Official
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-dark-text-tertiary line-clamp-1">
                      {template.shortDescription}
                    </p>
                  </div>
                  {formData.templateId === template.id && (
                    <Check className="w-4 h-4 text-brand-600 flex-shrink-0" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div>
        <Input
          placeholder="Search packs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          leftIcon={<Search className="w-4 h-4" />}
        />
      </div>

      {/* Pack Grid */}
      <div>
        <h3 className="text-sm font-medium text-slate-900 dark:text-dark-text-primary mb-3">
          Select a Pack
        </h3>
        {errors.pack && (
          <p className="text-sm text-red-600 dark:text-red-400 mb-2">
            {errors.pack}
          </p>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {filteredPacks.map((pack) => (
            <button
              key={pack.id}
              type="button"
              onClick={() => handlePackSelect(pack.id)}
              className={cn(
                'p-4 rounded-lg border text-left transition-all',
                formData.pack === pack.id
                  ? 'bg-brand-50 dark:bg-brand-900/20 border-brand-300 dark:border-brand-700 ring-2 ring-brand-500/20'
                  : 'bg-white dark:bg-dark-bg-secondary border-slate-200 dark:border-dark-border-primary hover:border-slate-300 dark:hover:border-dark-border-secondary hover:bg-slate-50 dark:hover:bg-dark-bg-tertiary'
              )}
            >
              <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center mb-2', pack.bgColor, pack.color)}>
                {pack.icon}
              </div>
              <h4 className="text-sm font-medium text-slate-900 dark:text-dark-text-primary">
                {pack.name}
              </h4>
              <p className="text-xs text-slate-500 dark:text-dark-text-tertiary mt-0.5">
                {pack.description}
              </p>
              {formData.pack === pack.id && (
                <div className="mt-2 flex items-center gap-1 text-brand-600 dark:text-brand-400">
                  <Check className="w-3 h-3" />
                  <span className="text-xs font-medium">Selected</span>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Templates for Selected Pack */}
      {formData.pack && templatesForSelectedPack.length > 0 && (
        <div className="p-4 rounded-lg bg-slate-50 dark:bg-dark-bg-tertiary border border-slate-200 dark:border-dark-border-primary">
          <h4 className="text-sm font-medium text-slate-900 dark:text-dark-text-primary mb-3">
            Available Templates for {PACKS.find((p) => p.id === formData.pack)?.name}
          </h4>
          <div className="space-y-2">
            {templatesForSelectedPack.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => handleTemplateClick(template)}
                className={cn(
                  'w-full p-3 rounded-lg border text-left transition-all flex items-center gap-3',
                  formData.templateId === template.id
                    ? 'bg-white dark:bg-dark-bg-secondary border-brand-300 dark:border-brand-700'
                    : 'bg-white dark:bg-dark-bg-secondary border-slate-200 dark:border-dark-border-primary hover:border-slate-300 dark:hover:border-dark-border-secondary'
                )}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${template.color}20`, color: template.color }}
                >
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <h5 className="text-sm font-medium text-slate-900 dark:text-dark-text-primary">
                    {template.name}
                  </h5>
                  <p className="text-xs text-slate-500 dark:text-dark-text-tertiary truncate">
                    {template.shortDescription}
                  </p>
                </div>
                {formData.templateId === template.id ? (
                  <Check className="w-4 h-4 text-brand-600 flex-shrink-0" />
                ) : (
                  <span className="text-xs text-brand-600 dark:text-brand-400">
                    Use Template
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default PackSelectionStep;
