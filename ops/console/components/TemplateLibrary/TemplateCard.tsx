/**
 * AgentOS Studio - Template Card Component
 * Displays a template in the template library grid
 */

'use client';

import React, { useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { AgentTemplate } from '@/lib/studio/templates';
import { AUTHORITY_LEVELS, ZONE_INFO } from '@/lib/studio/templates';
import {
  Star,
  Sparkles,
  ArrowRight,
  Copy,
  MoreVertical,
  Shield,
  MapPin,
  Wrench,
  Check,
} from 'lucide-react';

// ============================================
// Types
// ============================================

interface TemplateCardProps {
  template: AgentTemplate;
  isSelected?: boolean;
  showActions?: boolean;
  onSelect?: (template: AgentTemplate) => void;
  onUse?: (template: AgentTemplate) => void;
  onClone?: (template: AgentTemplate) => void;
  onPreview?: (template: AgentTemplate) => void;
}

// ============================================
// Template Card Component
// ============================================

export function TemplateCard({
  template,
  isSelected = false,
  showActions = true,
  onSelect,
  onUse,
  onClone,
  onPreview,
}: TemplateCardProps) {
  // ============================================
  // Handlers
  // ============================================

  const handleClick = useCallback(() => {
    onSelect?.(template);
  }, [template, onSelect]);

  const handleUse = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onUse?.(template);
    },
    [template, onUse]
  );

  const handleClone = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onClone?.(template);
    },
    [template, onClone]
  );

  const handlePreview = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onPreview?.(template);
    },
    [template, onPreview]
  );

  // ============================================
  // Render
  // ============================================

  return (
    <div
      onClick={handleClick}
      className={cn(
        'group relative p-4 rounded-xl border transition-all cursor-pointer',
        isSelected
          ? 'bg-brand-50 dark:bg-brand-900/20 border-brand-300 dark:border-brand-700 ring-2 ring-brand-500/20'
          : 'bg-white dark:bg-dark-bg-secondary border-slate-200 dark:border-dark-border-primary hover:border-slate-300 dark:hover:border-dark-border-secondary hover:shadow-md'
      )}
    >
      {/* Selection Indicator */}
      {isSelected && (
        <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-brand-600 flex items-center justify-center">
          <Check className="w-4 h-4 text-white" />
        </div>
      )}

      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${template.color}20`, color: template.color }}
        >
          <Sparkles className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-slate-900 dark:text-dark-text-primary truncate">
              {template.name}
            </h3>
            {template.isOfficial && (
              <Badge variant="info" size="sm">
                Official
              </Badge>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-dark-text-tertiary line-clamp-2">
            {template.shortDescription}
          </p>
        </div>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        <Badge variant="primary" size="sm">
          {template.pack}
        </Badge>
        <Badge variant="default" size="sm">
          {template.category}
        </Badge>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 mb-3 text-xs text-slate-500 dark:text-dark-text-tertiary">
        <div className="flex items-center gap-1">
          <Shield className="w-3.5 h-3.5" />
          <span>{AUTHORITY_LEVELS[template.authorityLevel].label}</span>
        </div>
        <div className="flex items-center gap-1">
          <Wrench className="w-3.5 h-3.5" />
          <span>{template.tools.length} tools</span>
        </div>
        <div className="flex items-center gap-1">
          <Star className="w-3.5 h-3.5 text-amber-500" />
          <span>{template.popularity}%</span>
        </div>
      </div>

      {/* Zone Indicators */}
      <div className="flex items-center gap-1 mb-4">
        {template.zones.map((zone) => {
          const info = ZONE_INFO[zone];
          return (
            <span
              key={zone}
              className={cn(
                'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-2xs font-medium',
                info.bgColor,
                info.color
              )}
            >
              <MapPin className="w-2.5 h-2.5" />
              {zone}
            </span>
          );
        })}
      </div>

      {/* Actions */}
      {showActions && (
        <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-dark-border-primary">
          <Button
            variant="primary"
            size="sm"
            onClick={handleUse}
            className="flex-1"
            rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
          >
            Use Template
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClone}
            title="Clone Template"
          >
            <Copy className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Hover Preview Link */}
      <button
        onClick={handlePreview}
        className={cn(
          'absolute inset-x-0 bottom-0 py-2 text-center text-xs font-medium',
          'bg-gradient-to-t from-white dark:from-dark-bg-secondary via-white/80 dark:via-dark-bg-secondary/80 to-transparent',
          'text-brand-600 dark:text-brand-400 opacity-0 group-hover:opacity-100 transition-opacity',
          'rounded-b-xl'
        )}
        style={{ display: showActions ? 'none' : 'block' }}
      >
        Click to preview
      </button>
    </div>
  );
}

export default TemplateCard;
