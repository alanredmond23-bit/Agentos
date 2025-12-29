/**
 * AgentOS Ops Console - BusinessCluster Component
 * Cluster for business context: department, cost_center, owner
 */

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, Building2, Users, DollarSign } from 'lucide-react';
import { TextField } from '../fields/TextField';
import { SelectField, SelectOption } from '../fields/SelectField';
import { TagInput } from '../fields/TagInput';

// ============================================
// BusinessCluster Types
// ============================================

export interface BusinessClusterProps {
  isExpanded?: boolean;
  onToggle?: () => void;
  disabled?: boolean;
  className?: string;
}

// ============================================
// Constants
// ============================================

const DEPARTMENT_OPTIONS: SelectOption[] = [
  { value: 'engineering', label: 'Engineering', description: 'Software development and infrastructure' },
  { value: 'product', label: 'Product', description: 'Product management and strategy' },
  { value: 'design', label: 'Design', description: 'UX/UI and visual design' },
  { value: 'marketing', label: 'Marketing', description: 'Marketing and growth' },
  { value: 'sales', label: 'Sales', description: 'Sales and business development' },
  { value: 'customer_success', label: 'Customer Success', description: 'Customer support and success' },
  { value: 'finance', label: 'Finance', description: 'Financial operations' },
  { value: 'legal', label: 'Legal', description: 'Legal and compliance' },
  { value: 'hr', label: 'Human Resources', description: 'People operations' },
  { value: 'operations', label: 'Operations', description: 'Business operations' },
  { value: 'security', label: 'Security', description: 'Information security' },
  { value: 'data', label: 'Data', description: 'Data science and analytics' },
];

const COST_CENTER_OPTIONS: SelectOption[] = [
  { value: 'CC-1000', label: 'CC-1000: R&D', description: 'Research and Development' },
  { value: 'CC-2000', label: 'CC-2000: Infrastructure', description: 'Cloud and infrastructure' },
  { value: 'CC-3000', label: 'CC-3000: Operations', description: 'Business operations' },
  { value: 'CC-4000', label: 'CC-4000: Marketing', description: 'Marketing spend' },
  { value: 'CC-5000', label: 'CC-5000: Sales', description: 'Sales operations' },
  { value: 'CC-6000', label: 'CC-6000: Support', description: 'Customer support' },
  { value: 'CC-7000', label: 'CC-7000: G&A', description: 'General and administrative' },
  { value: 'CC-8000', label: 'CC-8000: Legal', description: 'Legal expenses' },
];

const PRIORITY_OPTIONS: SelectOption[] = [
  { value: 'critical', label: 'Critical', description: 'Business-critical, highest priority' },
  { value: 'high', label: 'High', description: 'Important for key objectives' },
  { value: 'medium', label: 'Medium', description: 'Standard priority' },
  { value: 'low', label: 'Low', description: 'Nice to have, lower priority' },
];

const TAG_SUGGESTIONS = [
  'production',
  'staging',
  'development',
  'internal',
  'external',
  'customer-facing',
  'automated',
  'manual',
  'poc',
  'pilot',
  'core',
  'experimental',
];

// ============================================
// BusinessCluster Component
// ============================================

export function BusinessCluster({
  isExpanded = true,
  onToggle,
  disabled = false,
  className,
}: BusinessClusterProps) {
  const [localExpanded, setLocalExpanded] = useState(isExpanded);
  const expanded = onToggle ? isExpanded : localExpanded;
  const handleToggle = onToggle || (() => setLocalExpanded(!localExpanded));

  return (
    <div className={cn('border border-slate-200 dark:border-dark-border-primary rounded-lg overflow-hidden', className)}>
      {/* Cluster Header */}
      <button
        type="button"
        onClick={handleToggle}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-dark-bg-tertiary hover:bg-slate-100 dark:hover:bg-dark-bg-elevated transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-500/20">
            <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-dark-text-primary">
              Business Context
            </h3>
            <p className="text-xs text-slate-500 dark:text-dark-text-tertiary">
              Department, cost center, and ownership
            </p>
          </div>
        </div>
        <ChevronDown
          className={cn(
            'w-5 h-5 text-slate-400 transition-transform duration-200',
            expanded && 'rotate-180'
          )}
        />
      </button>

      {/* Cluster Content */}
      {expanded && (
        <div className="px-4 py-4 space-y-4 bg-white dark:bg-dark-bg-secondary">
          {/* Department */}
          <SelectField
            name="business.department"
            label="Department"
            options={DEPARTMENT_OPTIONS}
            placeholder="Select department"
            helpText="The organizational department this agent serves"
            required
            searchable
            disabled={disabled}
          />

          {/* Cost Center */}
          <SelectField
            name="business.cost_center"
            label="Cost Center"
            options={COST_CENTER_OPTIONS}
            placeholder="Select cost center"
            helpText="Budget allocation for this agent's operational costs"
            required
            disabled={disabled}
          />

          {/* Owner */}
          <div className="flex items-start gap-2">
            <Users className="w-4 h-4 text-slate-400 mt-7" />
            <div className="flex-1">
              <TextField
                name="business.owner"
                label="Owner"
                placeholder="john.smith@company.com"
                helpText="Primary person responsible for this agent"
                required
                disabled={disabled}
                pattern={/^[^\s@]+@[^\s@]+\.[^\s@]+$/}
                patternMessage="Must be a valid email address"
              />
            </div>
          </div>

          {/* Team */}
          <TagInput
            name="business.team"
            label="Team Members"
            placeholder="Add team member emails..."
            helpText="Additional team members with access to this agent"
            disabled={disabled}
            maxTags={10}
          />

          {/* Priority */}
          <SelectField
            name="business.priority"
            label="Business Priority"
            options={PRIORITY_OPTIONS}
            placeholder="Select priority level"
            helpText="The business importance of this agent"
            disabled={disabled}
          />

          {/* Tags */}
          <TagInput
            name="business.tags"
            label="Tags"
            placeholder="Add organizational tags..."
            helpText="Labels for categorization and filtering"
            disabled={disabled}
            suggestions={TAG_SUGGESTIONS}
            maxTags={10}
          />

          {/* Project */}
          <TextField
            name="business.project"
            label="Project"
            placeholder="Project Alpha"
            helpText="Associated project or initiative"
            disabled={disabled}
          />

          {/* Budget Info */}
          <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg border border-emerald-100 dark:border-emerald-500/20">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                Cost Tracking
              </span>
            </div>
            <p className="text-xs text-emerald-600 dark:text-emerald-400">
              Usage costs will be tracked against the selected cost center. Monthly reports are sent to the owner.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default BusinessCluster;
