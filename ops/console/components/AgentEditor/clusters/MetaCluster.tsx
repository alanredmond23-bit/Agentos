/**
 * AgentOS Ops Console - MetaCluster Component
 * Cluster for agent metadata: version, pack, schema_version
 */

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, Package, Tag, FileCode } from 'lucide-react';
import { TextField } from '../fields/TextField';
import { SelectField, SelectOption } from '../fields/SelectField';

// ============================================
// MetaCluster Types
// ============================================

export interface MetaClusterProps {
  isExpanded?: boolean;
  onToggle?: () => void;
  disabled?: boolean;
  className?: string;
}

// ============================================
// Constants
// ============================================

const SCHEMA_VERSION_OPTIONS: SelectOption[] = [
  { value: '1.0', label: 'v1.0', description: 'Legacy schema format' },
  { value: '2.0', label: 'v2.0', description: 'Current standard schema' },
  { value: '2.1', label: 'v2.1', description: 'Extended schema with clusters' },
  { value: '3.0', label: 'v3.0 (Beta)', description: 'Next-gen schema format' },
];

const PACK_OPTIONS: SelectOption[] = [
  { value: 'engineering', label: 'Engineering', description: 'Software development agents', icon: <FileCode className="w-4 h-4 text-blue-500" /> },
  { value: 'devops', label: 'DevOps', description: 'Infrastructure and CI/CD agents', icon: <Package className="w-4 h-4 text-orange-500" /> },
  { value: 'qa', label: 'QA', description: 'Quality assurance agents', icon: <Tag className="w-4 h-4 text-green-500" /> },
  { value: 'legal', label: 'Legal', description: 'Legal and compliance agents', icon: <FileCode className="w-4 h-4 text-purple-500" /> },
  { value: 'mobile', label: 'Mobile', description: 'Mobile development agents', icon: <Package className="w-4 h-4 text-cyan-500" /> },
  { value: 'research', label: 'Research', description: 'Research and analysis agents', icon: <Tag className="w-4 h-4 text-pink-500" /> },
  { value: 'planning', label: 'Planning', description: 'Project planning agents', icon: <FileCode className="w-4 h-4 text-amber-500" /> },
  { value: 'analytics', label: 'Analytics', description: 'Data analytics agents', icon: <Package className="w-4 h-4 text-indigo-500" /> },
  { value: 'orchestration', label: 'Orchestration', description: 'Workflow orchestration agents', icon: <Tag className="w-4 h-4 text-red-500" /> },
  { value: 'error_predictor', label: 'Error Predictor', description: 'Error prediction agents', icon: <FileCode className="w-4 h-4 text-rose-500" /> },
  { value: 'product', label: 'Product', description: 'Product management agents', icon: <Package className="w-4 h-4 text-teal-500" /> },
  { value: 'marketing', label: 'Marketing', description: 'Marketing and content agents', icon: <Tag className="w-4 h-4 text-lime-500" /> },
  { value: 'supabase', label: 'Supabase', description: 'Database and backend agents', icon: <FileCode className="w-4 h-4 text-emerald-500" /> },
  { value: 'design', label: 'Design', description: 'UI/UX design agents', icon: <Package className="w-4 h-4 text-fuchsia-500" /> },
];

// ============================================
// MetaCluster Component
// ============================================

export function MetaCluster({
  isExpanded = true,
  onToggle,
  disabled = false,
  className,
}: MetaClusterProps) {
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
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-200 dark:bg-dark-bg-elevated">
            <Package className="w-4 h-4 text-slate-600 dark:text-dark-text-secondary" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-dark-text-primary">
              Metadata
            </h3>
            <p className="text-xs text-slate-500 dark:text-dark-text-tertiary">
              Version, pack, and schema configuration
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
          {/* Version */}
          <TextField
            name="version"
            label="Version"
            placeholder="1.0.0"
            helpText="Semantic version of this agent configuration (e.g., 1.0.0, 2.1.3)"
            required
            disabled={disabled}
            pattern={/^\d+\.\d+\.\d+(-[a-zA-Z0-9]+)?$/}
            patternMessage="Must be a valid semantic version (e.g., 1.0.0)"
          />

          {/* Pack */}
          <SelectField
            name="pack"
            label="Pack"
            options={PACK_OPTIONS}
            placeholder="Select agent pack"
            helpText="The functional category or team this agent belongs to"
            required
            disabled={disabled}
            searchable
          />

          {/* Schema Version */}
          <SelectField
            name="schema_version"
            label="Schema Version"
            options={SCHEMA_VERSION_OPTIONS}
            placeholder="Select schema version"
            helpText="The YAML schema version this configuration adheres to"
            required
            disabled={disabled}
          />

          {/* Read-only Info */}
          <div className="pt-2 border-t border-slate-100 dark:border-dark-border-secondary">
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-500 dark:text-dark-text-tertiary">Created:</span>
                <span className="ml-2 text-slate-700 dark:text-dark-text-secondary">Auto-generated</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-dark-text-tertiary">Modified:</span>
                <span className="ml-2 text-slate-700 dark:text-dark-text-secondary">Auto-tracked</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MetaCluster;
