/**
 * AgentOS Ops Console - PermissionMatrix Component
 * Zone access matrix for RED/YELLOW/GREEN zones with granular permissions
 */

'use client';

import React, { useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Shield, AlertTriangle, Check, X, Info, Lock } from 'lucide-react';

// ============================================
// Types
// ============================================

export type Zone = 'red' | 'yellow' | 'green';
export type PermissionLevel = 'none' | 'read' | 'write' | 'admin';

export interface ZonePermission {
  zone: Zone;
  level: PermissionLevel;
  resources: string[];
  requiresApproval: boolean;
  requiresAudit: boolean;
}

export interface PermissionMatrixValue {
  red: ZonePermission;
  yellow: ZonePermission;
  green: ZonePermission;
}

interface PermissionMatrixProps {
  label?: string;
  value: PermissionMatrixValue;
  onChange: (value: PermissionMatrixValue) => void;
  hint?: string;
  error?: string;
  disabled?: boolean;
  showResources?: boolean;
  className?: string;
}

// ============================================
// Zone Configuration
// ============================================

const ZONE_CONFIG: Record<Zone, { label: string; description: string; color: string; icon: React.ElementType; resources: string[] }> = {
  red: {
    label: 'RED Zone',
    description: 'Legal, billing, evidence - Critical operations requiring approval',
    color: 'red',
    icon: Shield,
    resources: ['legal_documents', 'billing_records', 'evidence_chain', 'compliance_data', 'financial_records'],
  },
  yellow: {
    label: 'YELLOW Zone',
    description: 'APIs, core services - Requires tests and review',
    color: 'amber',
    icon: AlertTriangle,
    resources: ['api_endpoints', 'database_schema', 'authentication', 'integrations', 'core_services'],
  },
  green: {
    label: 'GREEN Zone',
    description: 'Features, docs - Full autonomy allowed',
    color: 'emerald',
    icon: Check,
    resources: ['feature_code', 'documentation', 'ui_components', 'tests', 'configs'],
  },
};

const PERMISSION_LEVELS: { value: PermissionLevel; label: string; description: string }[] = [
  { value: 'none', label: 'None', description: 'No access to this zone' },
  { value: 'read', label: 'Read', description: 'Can view but not modify' },
  { value: 'write', label: 'Write', description: 'Can create and modify' },
  { value: 'admin', label: 'Admin', description: 'Full access including delete' },
];

// ============================================
// Helper Functions
// ============================================

function getZoneColorClasses(zone: Zone): { bg: string; border: string; text: string; dot: string } {
  const colors = {
    red: {
      bg: 'bg-red-50 dark:bg-red-500/10',
      border: 'border-red-200 dark:border-red-500/30',
      text: 'text-red-700 dark:text-red-400',
      dot: 'bg-red-500',
    },
    yellow: {
      bg: 'bg-amber-50 dark:bg-amber-500/10',
      border: 'border-amber-200 dark:border-amber-500/30',
      text: 'text-amber-700 dark:text-amber-400',
      dot: 'bg-amber-500',
    },
    green: {
      bg: 'bg-emerald-50 dark:bg-emerald-500/10',
      border: 'border-emerald-200 dark:border-emerald-500/30',
      text: 'text-emerald-700 dark:text-emerald-400',
      dot: 'bg-emerald-500',
    },
  };
  return colors[zone];
}

function getPermissionBadgeClasses(level: PermissionLevel): string {
  const classes = {
    none: 'bg-slate-100 text-slate-500 dark:bg-zinc-700 dark:text-zinc-400',
    read: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
    write: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
    admin: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400',
  };
  return classes[level];
}

// ============================================
// PermissionMatrix Component
// ============================================

export function PermissionMatrix({
  label,
  value,
  onChange,
  hint,
  error,
  disabled = false,
  showResources = true,
  className,
}: PermissionMatrixProps) {
  // Update zone permission
  const updateZonePermission = useCallback(
    (zone: Zone, updates: Partial<ZonePermission>) => {
      onChange({
        ...value,
        [zone]: { ...value[zone], ...updates },
      });
    },
    [value, onChange]
  );

  // Toggle resource
  const toggleResource = useCallback(
    (zone: Zone, resource: string) => {
      const currentResources = value[zone].resources;
      const newResources = currentResources.includes(resource)
        ? currentResources.filter((r) => r !== resource)
        : [...currentResources, resource];
      updateZonePermission(zone, { resources: newResources });
    },
    [value, updateZonePermission]
  );

  return (
    <div className={cn('w-full', className)}>
      {/* Header */}
      {label && (
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-slate-600 dark:text-dark-text-secondary" />
          <label className="text-sm font-medium text-slate-700 dark:text-dark-text-secondary">
            {label}
          </label>
        </div>
      )}

      {/* Zone Cards */}
      <div className="space-y-4">
        {(Object.keys(ZONE_CONFIG) as Zone[]).map((zone) => {
          const config = ZONE_CONFIG[zone];
          const colors = getZoneColorClasses(zone);
          const zoneValue = value[zone];
          const Icon = config.icon;

          return (
            <div
              key={zone}
              className={cn(
                'rounded-lg border p-4',
                colors.bg,
                colors.border,
                disabled && 'opacity-50'
              )}
            >
              {/* Zone Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={cn('p-2 rounded-lg', colors.bg)}>
                    <Icon className={cn('w-5 h-5', colors.text)} />
                  </div>
                  <div>
                    <h4 className={cn('font-semibold', colors.text)}>
                      {config.label}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-dark-text-tertiary">
                      {config.description}
                    </p>
                  </div>
                </div>

                {/* Permission Level Badge */}
                <span
                  className={cn(
                    'px-2 py-1 text-xs font-medium rounded-full',
                    getPermissionBadgeClasses(zoneValue.level)
                  )}
                >
                  {zoneValue.level.toUpperCase()}
                </span>
              </div>

              {/* Permission Level Selector */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-slate-500 dark:text-dark-text-tertiary mb-2">
                  Access Level
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {PERMISSION_LEVELS.map((level) => (
                    <button
                      key={level.value}
                      type="button"
                      onClick={() => updateZonePermission(zone, { level: level.value })}
                      disabled={disabled}
                      className={cn(
                        'px-3 py-2 text-sm rounded-lg border transition-colors',
                        zoneValue.level === level.value
                          ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/20 dark:text-brand-400'
                          : 'border-slate-200 dark:border-dark-border-secondary bg-white dark:bg-dark-bg-secondary text-slate-600 dark:text-dark-text-secondary hover:border-slate-300',
                        disabled && 'cursor-not-allowed'
                      )}
                    >
                      {level.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Approval & Audit Toggles */}
              <div className="flex items-center gap-6 mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={zoneValue.requiresApproval}
                    onChange={(e) =>
                      updateZonePermission(zone, { requiresApproval: e.target.checked })
                    }
                    disabled={disabled || zoneValue.level === 'none'}
                    className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span className="text-sm text-slate-600 dark:text-dark-text-secondary">
                    Requires Approval
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={zoneValue.requiresAudit}
                    onChange={(e) =>
                      updateZonePermission(zone, { requiresAudit: e.target.checked })
                    }
                    disabled={disabled || zoneValue.level === 'none'}
                    className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span className="text-sm text-slate-600 dark:text-dark-text-secondary">
                    Audit Logging
                  </span>
                </label>
              </div>

              {/* Resource Access */}
              {showResources && zoneValue.level !== 'none' && (
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-dark-text-tertiary mb-2">
                    Accessible Resources
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {config.resources.map((resource) => {
                      const isSelected = zoneValue.resources.includes(resource);
                      return (
                        <button
                          key={resource}
                          type="button"
                          onClick={() => toggleResource(zone, resource)}
                          disabled={disabled}
                          className={cn(
                            'flex items-center gap-1.5 px-2.5 py-1 text-sm rounded-full border transition-colors',
                            isSelected
                              ? 'border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-500/50 dark:bg-brand-500/20 dark:text-brand-400'
                              : 'border-slate-200 dark:border-dark-border-secondary bg-white dark:bg-dark-bg-secondary text-slate-500 dark:text-dark-text-tertiary hover:border-slate-300',
                            disabled && 'cursor-not-allowed'
                          )}
                        >
                          {isSelected ? (
                            <Check className="w-3 h-3" />
                          ) : (
                            <X className="w-3 h-3" />
                          )}
                          {resource.replace(/_/g, ' ')}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Warning for RED zone with write/admin access */}
              {zone === 'red' && (zoneValue.level === 'write' || zoneValue.level === 'admin') && (
                <div className="mt-4 p-3 rounded-lg bg-red-100 dark:bg-red-500/20 border border-red-200 dark:border-red-500/30">
                  <div className="flex items-start gap-2">
                    <Lock className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-700 dark:text-red-400">
                        Critical Zone Access
                      </p>
                      <p className="text-xs text-red-600 dark:text-red-400/80 mt-0.5">
                        Write access to RED zone requires multi-party approval and creates permanent audit trail.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="mt-4 p-3 rounded-lg bg-slate-100 dark:bg-dark-bg-tertiary">
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-dark-text-secondary">
          <Info className="w-4 h-4" />
          <span>
            Access: RED ({value.red.level}) / YELLOW ({value.yellow.level}) / GREEN ({value.green.level})
          </span>
        </div>
      </div>

      {/* Error/Hint */}
      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      {hint && !error && (
        <p className="mt-2 text-sm text-slate-500 dark:text-dark-text-tertiary">{hint}</p>
      )}
    </div>
  );
}

export default PermissionMatrix;
