/**
 * AgentOS Studio - Review Step
 * Step 4: Review configuration and create agent
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { WizardFormData } from '@/lib/studio/templates';
import {
  AVAILABLE_TOOLS,
  AUTHORITY_LEVELS,
  ZONE_INFO,
  getTemplateById,
} from '@/lib/studio/templates';
import {
  User,
  Package,
  Settings,
  Wrench,
  Shield,
  MapPin,
  Pencil,
  Cpu,
  Thermometer,
  Hash,
  Check,
  AlertTriangle,
} from 'lucide-react';

// ============================================
// Types
// ============================================

interface ReviewStepProps {
  formData: WizardFormData;
  errors: Record<string, string>;
  onEdit: (stepIndex: number) => void;
}

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  stepIndex: number;
  onEdit: (stepIndex: number) => void;
  children: React.ReactNode;
}

// ============================================
// Section Component
// ============================================

function Section({ title, icon, stepIndex, onEdit, children }: SectionProps) {
  return (
    <div className="p-4 rounded-lg bg-slate-50 dark:bg-dark-bg-tertiary border border-slate-200 dark:border-dark-border-primary">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-slate-500 dark:text-dark-text-tertiary">
            {icon}
          </span>
          <h4 className="text-sm font-medium text-slate-900 dark:text-dark-text-primary">
            {title}
          </h4>
        </div>
        <Button
          variant="ghost"
          size="xs"
          onClick={() => onEdit(stepIndex)}
          leftIcon={<Pencil className="w-3 h-3" />}
        >
          Edit
        </Button>
      </div>
      {children}
    </div>
  );
}

// ============================================
// Review Step Component
// ============================================

export function ReviewStep({
  formData,
  errors,
  onEdit,
}: ReviewStepProps) {
  // Get template if selected
  const template = formData.templateId
    ? getTemplateById(formData.templateId)
    : null;

  // Get enabled tools details
  const enabledTools = formData.enabledTools
    .map((id) => AVAILABLE_TOOLS.find((t) => t.id === id))
    .filter(Boolean);

  const highRiskTools = enabledTools.filter(
    (t) => t && (t.riskLevel === 'high' || t.riskLevel === 'critical')
  );

  // ============================================
  // Render
  // ============================================

  return (
    <div className="space-y-4">
      {/* Summary Header */}
      <div className="p-4 rounded-lg bg-gradient-to-br from-brand-50 to-brand-100 dark:from-brand-900/30 dark:to-brand-800/30 border border-brand-200 dark:border-brand-800">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center text-white font-bold text-lg">
            {formData.name ? formData.name.charAt(0).toUpperCase() : 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-dark-text-primary">
              {formData.name || 'Unnamed Agent'}
            </h3>
            <p className="text-sm text-slate-600 dark:text-dark-text-secondary">
              {formData.role || 'No role specified'}
            </p>
            {template && (
              <div className="mt-2 flex items-center gap-2">
                <Badge variant="info" size="sm">
                  Template: {template.name}
                </Badge>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Basic Info Section */}
      <Section
        title="Basic Information"
        icon={<User className="w-4 h-4" />}
        stepIndex={0}
        onEdit={onEdit}
      >
        <dl className="space-y-2">
          <div className="flex justify-between">
            <dt className="text-sm text-slate-500 dark:text-dark-text-tertiary">Name</dt>
            <dd className="text-sm font-medium text-slate-900 dark:text-dark-text-primary">
              {formData.name || '-'}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sm text-slate-500 dark:text-dark-text-tertiary">Role</dt>
            <dd className="text-sm font-medium text-slate-900 dark:text-dark-text-primary">
              {formData.role || '-'}
            </dd>
          </div>
          {formData.description && (
            <div>
              <dt className="text-sm text-slate-500 dark:text-dark-text-tertiary mb-1">
                Description
              </dt>
              <dd className="text-sm text-slate-700 dark:text-dark-text-secondary">
                {formData.description}
              </dd>
            </div>
          )}
        </dl>
      </Section>

      {/* Pack Section */}
      <Section
        title="Pack Configuration"
        icon={<Package className="w-4 h-4" />}
        stepIndex={1}
        onEdit={onEdit}
      >
        <dl className="space-y-2">
          <div className="flex justify-between items-center">
            <dt className="text-sm text-slate-500 dark:text-dark-text-tertiary">Pack</dt>
            <dd>
              <Badge variant="primary" size="sm">
                {formData.pack || 'Not selected'}
              </Badge>
            </dd>
          </div>
          {template && (
            <div className="flex justify-between items-center">
              <dt className="text-sm text-slate-500 dark:text-dark-text-tertiary">
                Based on Template
              </dt>
              <dd className="text-sm font-medium text-slate-900 dark:text-dark-text-primary">
                {template.name}
              </dd>
            </div>
          )}
        </dl>
      </Section>

      {/* Capabilities Section */}
      <Section
        title="Capabilities"
        icon={<Settings className="w-4 h-4" />}
        stepIndex={2}
        onEdit={onEdit}
      >
        <div className="space-y-4">
          {/* Authority Level */}
          <div>
            <dt className="text-sm text-slate-500 dark:text-dark-text-tertiary mb-1">
              Authority Level
            </dt>
            <dd className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-medium text-slate-900 dark:text-dark-text-primary">
                {AUTHORITY_LEVELS[formData.authorityLevel].label}
              </span>
            </dd>
          </div>

          {/* Zones */}
          <div>
            <dt className="text-sm text-slate-500 dark:text-dark-text-tertiary mb-2">
              Zone Access
            </dt>
            <dd className="flex flex-wrap gap-2">
              {formData.zones.map((zone) => {
                const info = ZONE_INFO[zone];
                return (
                  <span
                    key={zone}
                    className={cn(
                      'inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium',
                      info.bgColor,
                      info.color
                    )}
                  >
                    <MapPin className="w-3 h-3" />
                    {info.label}
                  </span>
                );
              })}
            </dd>
          </div>

          {/* Tools */}
          <div>
            <dt className="text-sm text-slate-500 dark:text-dark-text-tertiary mb-2">
              Enabled Tools ({enabledTools.length})
            </dt>
            <dd className="flex flex-wrap gap-1.5">
              {enabledTools.slice(0, 8).map((tool) => (
                <Badge
                  key={tool!.id}
                  variant={
                    tool!.riskLevel === 'critical' || tool!.riskLevel === 'high'
                      ? 'warning'
                      : 'default'
                  }
                  size="sm"
                >
                  {tool!.name}
                </Badge>
              ))}
              {enabledTools.length > 8 && (
                <Badge variant="default" size="sm">
                  +{enabledTools.length - 8} more
                </Badge>
              )}
            </dd>
          </div>
        </div>
      </Section>

      {/* Configuration Section */}
      <Section
        title="Model Configuration"
        icon={<Cpu className="w-4 h-4" />}
        stepIndex={2}
        onEdit={onEdit}
      >
        <dl className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-slate-400" />
            <div>
              <dt className="text-xs text-slate-500 dark:text-dark-text-tertiary">Model</dt>
              <dd className="text-sm font-medium text-slate-900 dark:text-dark-text-primary truncate">
                {formData.model.split('-').slice(0, 2).join(' ')}
              </dd>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Thermometer className="w-4 h-4 text-slate-400" />
            <div>
              <dt className="text-xs text-slate-500 dark:text-dark-text-tertiary">Temperature</dt>
              <dd className="text-sm font-medium text-slate-900 dark:text-dark-text-primary">
                {formData.temperature}
              </dd>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Hash className="w-4 h-4 text-slate-400" />
            <div>
              <dt className="text-xs text-slate-500 dark:text-dark-text-tertiary">Max Tokens</dt>
              <dd className="text-sm font-medium text-slate-900 dark:text-dark-text-primary">
                {formData.maxTokens.toLocaleString()}
              </dd>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-slate-400" />
            <div>
              <dt className="text-xs text-slate-500 dark:text-dark-text-tertiary">
                Auto-Approve
              </dt>
              <dd className="text-sm font-medium text-slate-900 dark:text-dark-text-primary">
                {(formData.autoApproveThreshold * 100).toFixed(0)}%
              </dd>
            </div>
          </div>
        </dl>
      </Section>

      {/* Warnings */}
      {highRiskTools.length > 0 && (
        <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <div className="flex gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-amber-900 dark:text-amber-300">
                High-Risk Tools Enabled
              </h4>
              <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                This agent has access to {highRiskTools.length} high-risk tool
                {highRiskTools.length > 1 ? 's' : ''}:{' '}
                {highRiskTools.map((t) => t!.name).join(', ')}.
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                These actions will require manual approval before execution.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Pre-flight Checklist */}
      <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
        <h4 className="text-sm font-medium text-emerald-900 dark:text-emerald-300 mb-3">
          Pre-flight Checklist
        </h4>
        <ul className="space-y-2">
          <li className="flex items-center gap-2 text-sm">
            <div
              className={cn(
                'w-5 h-5 rounded-full flex items-center justify-center',
                formData.name
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-200 dark:bg-dark-bg-tertiary text-slate-400'
              )}
            >
              {formData.name ? (
                <Check className="w-3 h-3" />
              ) : (
                <span className="text-xs">1</span>
              )}
            </div>
            <span
              className={cn(
                formData.name
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-slate-500 dark:text-dark-text-tertiary'
              )}
            >
              Agent name and role defined
            </span>
          </li>
          <li className="flex items-center gap-2 text-sm">
            <div
              className={cn(
                'w-5 h-5 rounded-full flex items-center justify-center',
                formData.pack
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-200 dark:bg-dark-bg-tertiary text-slate-400'
              )}
            >
              {formData.pack ? (
                <Check className="w-3 h-3" />
              ) : (
                <span className="text-xs">2</span>
              )}
            </div>
            <span
              className={cn(
                formData.pack
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-slate-500 dark:text-dark-text-tertiary'
              )}
            >
              Pack selected
            </span>
          </li>
          <li className="flex items-center gap-2 text-sm">
            <div
              className={cn(
                'w-5 h-5 rounded-full flex items-center justify-center',
                formData.enabledTools.length > 0
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-200 dark:bg-dark-bg-tertiary text-slate-400'
              )}
            >
              {formData.enabledTools.length > 0 ? (
                <Check className="w-3 h-3" />
              ) : (
                <span className="text-xs">3</span>
              )}
            </div>
            <span
              className={cn(
                formData.enabledTools.length > 0
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-slate-500 dark:text-dark-text-tertiary'
              )}
            >
              Tools and capabilities configured
            </span>
          </li>
          <li className="flex items-center gap-2 text-sm">
            <div
              className={cn(
                'w-5 h-5 rounded-full flex items-center justify-center',
                formData.zones.length > 0
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-200 dark:bg-dark-bg-tertiary text-slate-400'
              )}
            >
              {formData.zones.length > 0 ? (
                <Check className="w-3 h-3" />
              ) : (
                <span className="text-xs">4</span>
              )}
            </div>
            <span
              className={cn(
                formData.zones.length > 0
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-slate-500 dark:text-dark-text-tertiary'
              )}
            >
              Zone access defined
            </span>
          </li>
        </ul>
      </div>

      {/* Errors */}
      {Object.keys(errors).length > 0 && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <h4 className="text-sm font-medium text-red-900 dark:text-red-300 mb-2">
            Please fix the following errors:
          </h4>
          <ul className="space-y-1">
            {Object.entries(errors).map(([field, error]) => (
              <li key={field} className="text-sm text-red-700 dark:text-red-400">
                - {error}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default ReviewStep;
