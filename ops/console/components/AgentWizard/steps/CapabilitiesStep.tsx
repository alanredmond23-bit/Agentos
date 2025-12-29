/**
 * AgentOS Studio - Capabilities Step
 * Step 3: Configure tools, authority level, and zones
 */

'use client';

import React, { useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import type { RiskLevel } from '@/types';
import {
  type WizardFormData,
  type AuthorityLevel,
  type Zone,
  AVAILABLE_TOOLS,
  AUTHORITY_LEVELS,
  ZONE_INFO,
} from '@/lib/studio/templates';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  ShieldOff,
  Check,
  AlertTriangle,
  Info,
  Lock,
  Unlock,
  Eye,
} from 'lucide-react';

// ============================================
// Types
// ============================================

interface CapabilitiesStepProps {
  formData: WizardFormData;
  errors: Record<string, string>;
  onUpdate: (updates: Partial<WizardFormData>) => void;
}

// ============================================
// Risk Level Colors
// ============================================

const RISK_COLORS: Record<RiskLevel, { bg: string; text: string; badge: 'success' | 'warning' | 'error' }> = {
  low: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', badge: 'success' },
  medium: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', badge: 'warning' },
  high: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-400', badge: 'warning' },
  critical: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', badge: 'error' },
};

const AUTHORITY_ICONS: Record<AuthorityLevel, React.ReactNode> = {
  read_only: <Eye className="w-5 h-5" />,
  suggest: <Shield className="w-5 h-5" />,
  execute: <ShieldCheck className="w-5 h-5" />,
  autonomous: <ShieldAlert className="w-5 h-5" />,
};

// ============================================
// Capabilities Step Component
// ============================================

export function CapabilitiesStep({
  formData,
  errors,
  onUpdate,
}: CapabilitiesStepProps) {
  // ============================================
  // Computed Values
  // ============================================

  const toolsByRisk = useMemo(() => {
    return {
      low: AVAILABLE_TOOLS.filter((t) => t.riskLevel === 'low'),
      medium: AVAILABLE_TOOLS.filter((t) => t.riskLevel === 'medium'),
      high: AVAILABLE_TOOLS.filter((t) => t.riskLevel === 'high'),
      critical: AVAILABLE_TOOLS.filter((t) => t.riskLevel === 'critical'),
    };
  }, []);

  const enabledToolsCount = formData.enabledTools.length;
  const highRiskToolsEnabled = formData.enabledTools.filter((id) => {
    const tool = AVAILABLE_TOOLS.find((t) => t.id === id);
    return tool && (tool.riskLevel === 'high' || tool.riskLevel === 'critical');
  }).length;

  // ============================================
  // Handlers
  // ============================================

  const handleAuthorityChange = useCallback(
    (level: AuthorityLevel) => {
      onUpdate({ authorityLevel: level });
    },
    [onUpdate]
  );

  const handleZoneToggle = useCallback(
    (zone: Zone) => {
      const newZones = formData.zones.includes(zone)
        ? formData.zones.filter((z) => z !== zone)
        : [...formData.zones, zone];
      onUpdate({ zones: newZones });
    },
    [formData.zones, onUpdate]
  );

  const handleToolToggle = useCallback(
    (toolId: string) => {
      const newTools = formData.enabledTools.includes(toolId)
        ? formData.enabledTools.filter((id) => id !== toolId)
        : [...formData.enabledTools, toolId];
      onUpdate({ enabledTools: newTools });
    },
    [formData.enabledTools, onUpdate]
  );

  const handleSelectAllTools = useCallback(
    (riskLevel: RiskLevel) => {
      const toolsAtLevel = toolsByRisk[riskLevel];
      const allSelected = toolsAtLevel.every((t) =>
        formData.enabledTools.includes(t.id)
      );
      const newTools = allSelected
        ? formData.enabledTools.filter(
            (id) => !toolsAtLevel.some((t) => t.id === id)
          )
        : [...new Set([...formData.enabledTools, ...toolsAtLevel.map((t) => t.id)])];
      onUpdate({ enabledTools: newTools });
    },
    [formData.enabledTools, toolsByRisk, onUpdate]
  );

  // ============================================
  // Render
  // ============================================

  return (
    <div className="space-y-8">
      {/* Authority Level */}
      <div>
        <h3 className="text-sm font-medium text-slate-900 dark:text-dark-text-primary mb-1">
          Authority Level
        </h3>
        <p className="text-xs text-slate-500 dark:text-dark-text-tertiary mb-3">
          Define how much autonomy this agent has
        </p>
        <div className="grid grid-cols-2 gap-3">
          {(Object.keys(AUTHORITY_LEVELS) as AuthorityLevel[]).map((level) => {
            const info = AUTHORITY_LEVELS[level];
            const isSelected = formData.authorityLevel === level;
            return (
              <button
                key={level}
                type="button"
                onClick={() => handleAuthorityChange(level)}
                className={cn(
                  'p-4 rounded-lg border text-left transition-all',
                  isSelected
                    ? 'bg-brand-50 dark:bg-brand-900/20 border-brand-300 dark:border-brand-700 ring-2 ring-brand-500/20'
                    : 'bg-white dark:bg-dark-bg-secondary border-slate-200 dark:border-dark-border-primary hover:border-slate-300 dark:hover:border-dark-border-secondary'
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
                      isSelected
                        ? 'bg-brand-100 dark:bg-brand-900 text-brand-600 dark:text-brand-400'
                        : 'bg-slate-100 dark:bg-dark-bg-tertiary text-slate-500 dark:text-dark-text-tertiary'
                    )}
                  >
                    {AUTHORITY_ICONS[level]}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-slate-900 dark:text-dark-text-primary">
                      {info.label}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-dark-text-tertiary mt-0.5">
                      {info.description}
                    </p>
                  </div>
                  {isSelected && (
                    <Check className="w-4 h-4 text-brand-600 flex-shrink-0" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Zone Access */}
      <div>
        <h3 className="text-sm font-medium text-slate-900 dark:text-dark-text-primary mb-1">
          Zone Access
        </h3>
        <p className="text-xs text-slate-500 dark:text-dark-text-tertiary mb-3">
          Define which areas of the codebase this agent can access
        </p>
        {errors.zones && (
          <p className="text-sm text-red-600 dark:text-red-400 mb-2">
            {errors.zones}
          </p>
        )}
        <div className="space-y-2">
          {(Object.keys(ZONE_INFO) as Zone[]).map((zone) => {
            const info = ZONE_INFO[zone];
            const isSelected = formData.zones.includes(zone);
            return (
              <button
                key={zone}
                type="button"
                onClick={() => handleZoneToggle(zone)}
                className={cn(
                  'w-full p-3 rounded-lg border text-left transition-all flex items-center gap-3',
                  isSelected
                    ? 'bg-white dark:bg-dark-bg-secondary border-slate-300 dark:border-dark-border-secondary'
                    : 'bg-slate-50 dark:bg-dark-bg-tertiary border-slate-200 dark:border-dark-border-primary hover:bg-white dark:hover:bg-dark-bg-secondary'
                )}
              >
                <div
                  className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                    info.bgColor,
                    info.color
                  )}
                >
                  {zone === 'green' && <Unlock className="w-4 h-4" />}
                  {zone === 'yellow' && <AlertTriangle className="w-4 h-4" />}
                  {zone === 'red' && <Lock className="w-4 h-4" />}
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-slate-900 dark:text-dark-text-primary">
                    {info.label}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-dark-text-tertiary">
                    {info.description}
                  </p>
                </div>
                <div
                  className={cn(
                    'w-5 h-5 rounded border-2 flex items-center justify-center transition-all',
                    isSelected
                      ? 'bg-brand-600 border-brand-600'
                      : 'bg-white dark:bg-dark-bg-primary border-slate-300 dark:border-dark-border-secondary'
                  )}
                >
                  {isSelected && <Check className="w-3 h-3 text-white" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tools */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-medium text-slate-900 dark:text-dark-text-primary">
            Tools & Capabilities
          </h3>
          <span className="text-xs text-slate-500 dark:text-dark-text-tertiary">
            {enabledToolsCount} selected
          </span>
        </div>
        <p className="text-xs text-slate-500 dark:text-dark-text-tertiary mb-3">
          Select the tools this agent can use
        </p>
        {errors.tools && (
          <p className="text-sm text-red-600 dark:text-red-400 mb-2">
            {errors.tools}
          </p>
        )}

        {/* Tools by Risk Level */}
        <div className="space-y-4">
          {(['low', 'medium', 'high', 'critical'] as RiskLevel[]).map((riskLevel) => {
            const tools = toolsByRisk[riskLevel];
            if (tools.length === 0) return null;

            const allSelected = tools.every((t) =>
              formData.enabledTools.includes(t.id)
            );
            const someSelected = tools.some((t) =>
              formData.enabledTools.includes(t.id)
            );
            const colors = RISK_COLORS[riskLevel];

            return (
              <div key={riskLevel} className="rounded-lg border border-slate-200 dark:border-dark-border-primary overflow-hidden">
                {/* Header */}
                <div className={cn('px-4 py-2 flex items-center justify-between', colors.bg)}>
                  <div className="flex items-center gap-2">
                    <span className={cn('text-sm font-medium capitalize', colors.text)}>
                      {riskLevel} Risk
                    </span>
                    <Badge variant={colors.badge} size="sm">
                      {tools.length}
                    </Badge>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSelectAllTools(riskLevel)}
                    className={cn('text-xs font-medium', colors.text)}
                  >
                    {allSelected ? 'Deselect All' : 'Select All'}
                  </button>
                </div>

                {/* Tools */}
                <div className="p-2 grid grid-cols-2 gap-2">
                  {tools.map((tool) => {
                    const isSelected = formData.enabledTools.includes(tool.id);
                    return (
                      <button
                        key={tool.id}
                        type="button"
                        onClick={() => handleToolToggle(tool.id)}
                        className={cn(
                          'p-2 rounded-md border text-left transition-all flex items-start gap-2',
                          isSelected
                            ? 'bg-brand-50 dark:bg-brand-900/20 border-brand-200 dark:border-brand-800'
                            : 'bg-white dark:bg-dark-bg-secondary border-slate-200 dark:border-dark-border-primary hover:border-slate-300 dark:hover:border-dark-border-secondary'
                        )}
                      >
                        <div
                          className={cn(
                            'w-4 h-4 rounded border flex-shrink-0 mt-0.5 flex items-center justify-center',
                            isSelected
                              ? 'bg-brand-600 border-brand-600'
                              : 'border-slate-300 dark:border-dark-border-secondary'
                          )}
                        >
                          {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h5 className="text-xs font-medium text-slate-900 dark:text-dark-text-primary">
                            {tool.name}
                          </h5>
                          <p className="text-2xs text-slate-500 dark:text-dark-text-tertiary truncate">
                            {tool.description}
                          </p>
                          {tool.requiresApproval && (
                            <span className="inline-flex items-center gap-0.5 text-2xs text-amber-600 dark:text-amber-400 mt-0.5">
                              <Lock className="w-2.5 h-2.5" />
                              Requires approval
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Warning for high-risk tools */}
        {highRiskToolsEnabled > 0 && (
          <div className="mt-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <div className="flex gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-amber-800 dark:text-amber-300">
                  You have enabled {highRiskToolsEnabled} high-risk tool{highRiskToolsEnabled > 1 ? 's' : ''}.
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                  These tools will require approval before execution.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CapabilitiesStep;
