/**
 * AgentOS Ops Console - IdentityCluster Component
 * Cluster for agent identity: name, slug, role, mission, personality
 */

import React, { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { cn } from '@/lib/utils';
import { ChevronDown, User, Sparkles } from 'lucide-react';
import { TextField } from '../fields/TextField';
import { SelectField, SelectOption } from '../fields/SelectField';
import { TagInput } from '../fields/TagInput';

// ============================================
// IdentityCluster Types
// ============================================

export interface IdentityClusterProps {
  isExpanded?: boolean;
  onToggle?: () => void;
  disabled?: boolean;
  className?: string;
}

// ============================================
// Constants
// ============================================

const ROLE_OPTIONS: SelectOption[] = [
  { value: 'executor', label: 'Executor', description: 'Performs tasks and actions' },
  { value: 'analyzer', label: 'Analyzer', description: 'Analyzes data and provides insights' },
  { value: 'coordinator', label: 'Coordinator', description: 'Orchestrates other agents' },
  { value: 'reviewer', label: 'Reviewer', description: 'Reviews and validates work' },
  { value: 'generator', label: 'Generator', description: 'Creates content and artifacts' },
  { value: 'monitor', label: 'Monitor', description: 'Watches and reports on systems' },
  { value: 'assistant', label: 'Assistant', description: 'Helps users with tasks' },
  { value: 'specialist', label: 'Specialist', description: 'Domain-specific expert' },
];

const PERSONALITY_SUGGESTIONS = [
  'professional',
  'friendly',
  'concise',
  'detailed',
  'formal',
  'casual',
  'analytical',
  'creative',
  'empathetic',
  'direct',
  'patient',
  'proactive',
  'cautious',
  'thorough',
];

// ============================================
// IdentityCluster Component
// ============================================

export function IdentityCluster({
  isExpanded = true,
  onToggle,
  disabled = false,
  className,
}: IdentityClusterProps) {
  const [localExpanded, setLocalExpanded] = useState(isExpanded);
  const expanded = onToggle ? isExpanded : localExpanded;
  const handleToggle = onToggle || (() => setLocalExpanded(!localExpanded));

  const { watch, setValue } = useFormContext();
  const nameValue = watch('name');

  // Auto-generate slug from name
  const generateSlug = () => {
    if (nameValue) {
      const slug = nameValue
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
      setValue('slug', slug, { shouldValidate: true });
    }
  };

  return (
    <div className={cn('border border-slate-200 dark:border-dark-border-primary rounded-lg overflow-hidden', className)}>
      {/* Cluster Header */}
      <button
        type="button"
        onClick={handleToggle}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-dark-bg-tertiary hover:bg-slate-100 dark:hover:bg-dark-bg-elevated transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-brand-100 dark:bg-brand-500/20">
            <User className="w-4 h-4 text-brand-600 dark:text-brand-400" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-dark-text-primary">
              Identity
            </h3>
            <p className="text-xs text-slate-500 dark:text-dark-text-tertiary">
              Name, role, mission, and personality
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
          {/* Name */}
          <TextField
            name="name"
            label="Name"
            placeholder="Code Review Agent"
            helpText="A human-readable name for the agent"
            required
            disabled={disabled}
            maxLength={100}
          />

          {/* Slug */}
          <div className="space-y-1.5">
            <TextField
              name="slug"
              label="Slug"
              placeholder="code-review-agent"
              helpText="URL-safe identifier used in APIs and references"
              required
              disabled={disabled}
              pattern={/^[a-z0-9]+(?:-[a-z0-9]+)*$/}
              patternMessage="Must be lowercase letters, numbers, and hyphens only"
            />
            {!disabled && nameValue && (
              <button
                type="button"
                onClick={generateSlug}
                className="text-xs text-brand-600 dark:text-brand-400 hover:underline"
              >
                Generate from name
              </button>
            )}
          </div>

          {/* Role */}
          <SelectField
            name="role"
            label="Role"
            options={ROLE_OPTIONS}
            placeholder="Select agent role"
            helpText="The primary function or responsibility of this agent"
            required
            disabled={disabled}
          />

          {/* Mission */}
          <TextField
            name="mission"
            label="Mission"
            placeholder="Review code changes for quality, security, and best practices..."
            helpText="A clear statement of what this agent is designed to accomplish"
            required
            disabled={disabled}
            multiline
            rows={3}
            maxLength={500}
          />

          {/* Personality Traits */}
          <TagInput
            name="personality"
            label="Personality Traits"
            placeholder="Add personality traits..."
            helpText="Keywords that define the agent's communication style and behavior"
            disabled={disabled}
            suggestions={PERSONALITY_SUGGESTIONS}
            maxTags={10}
            minLength={2}
            maxLength={30}
          />

          {/* Preview Card */}
          <div className="mt-4 p-3 bg-slate-50 dark:bg-dark-bg-tertiary rounded-lg border border-slate-100 dark:border-dark-border-secondary">
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-brand-500 to-brand-600">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-dark-text-primary truncate">
                  {nameValue || 'Agent Name'}
                </p>
                <p className="text-xs text-slate-500 dark:text-dark-text-tertiary">
                  Identity preview
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default IdentityCluster;
