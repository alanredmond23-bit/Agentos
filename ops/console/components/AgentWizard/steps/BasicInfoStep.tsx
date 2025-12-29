/**
 * AgentOS Studio - Basic Info Step
 * Step 1: Define agent name, role, and description
 */

'use client';

import React, { useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Input, Textarea } from '@/components/ui/Input';
import type { WizardFormData } from '@/lib/studio/templates';
import { Sparkles, Info } from 'lucide-react';

// ============================================
// Types
// ============================================

interface BasicInfoStepProps {
  formData: WizardFormData;
  errors: Record<string, string>;
  onUpdate: (updates: Partial<WizardFormData>) => void;
}

// ============================================
// Suggested Roles
// ============================================

const SUGGESTED_ROLES = [
  { label: 'DevOps Engineer', description: 'Manages deployments and infrastructure' },
  { label: 'QA Specialist', description: 'Ensures code quality and testing' },
  { label: 'Code Reviewer', description: 'Reviews pull requests and code changes' },
  { label: 'Research Assistant', description: 'Gathers and analyzes information' },
  { label: 'Support Agent', description: 'Handles customer inquiries' },
  { label: 'Data Analyst', description: 'Analyzes data and generates reports' },
  { label: 'Content Writer', description: 'Creates marketing and documentation' },
  { label: 'Security Analyst', description: 'Monitors security and compliance' },
];

// ============================================
// Basic Info Step Component
// ============================================

export function BasicInfoStep({
  formData,
  errors,
  onUpdate,
}: BasicInfoStepProps) {
  // ============================================
  // Handlers
  // ============================================

  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onUpdate({ name: e.target.value });
    },
    [onUpdate]
  );

  const handleRoleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onUpdate({ role: e.target.value });
    },
    [onUpdate]
  );

  const handleDescriptionChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onUpdate({ description: e.target.value });
    },
    [onUpdate]
  );

  const handleSuggestedRoleClick = useCallback(
    (role: string) => {
      onUpdate({ role });
    },
    [onUpdate]
  );

  const generateSlug = useCallback((name: string): string => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }, []);

  // ============================================
  // Render
  // ============================================

  return (
    <div className="space-y-6">
      {/* Agent Name */}
      <div>
        <Input
          label="Agent Name"
          placeholder="e.g., Deploy Bot, Code Reviewer, Research Assistant"
          value={formData.name}
          onChange={handleNameChange}
          error={errors.name}
          hint={
            formData.name
              ? `Slug: ${generateSlug(formData.name)}`
              : 'Enter a descriptive name for your agent'
          }
          autoFocus
        />
      </div>

      {/* Agent Role */}
      <div>
        <Input
          label="Agent Role"
          placeholder="e.g., DevOps Engineer, QA Specialist, Research Assistant"
          value={formData.role}
          onChange={handleRoleChange}
          error={errors.role}
          hint="Describe the primary function of this agent"
        />

        {/* Suggested Roles */}
        <div className="mt-3">
          <p className="text-xs text-slate-500 dark:text-dark-text-tertiary mb-2 flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            Suggested roles:
          </p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_ROLES.map((role) => (
              <button
                key={role.label}
                type="button"
                onClick={() => handleSuggestedRoleClick(role.label)}
                className={cn(
                  'px-3 py-1.5 text-xs rounded-full border transition-all',
                  formData.role === role.label
                    ? 'bg-brand-100 dark:bg-brand-900 border-brand-300 dark:border-brand-700 text-brand-700 dark:text-brand-300'
                    : 'bg-slate-50 dark:bg-dark-bg-tertiary border-slate-200 dark:border-dark-border-primary text-slate-600 dark:text-dark-text-secondary hover:bg-slate-100 dark:hover:bg-dark-bg-elevated hover:border-slate-300 dark:hover:border-dark-border-secondary'
                )}
                title={role.description}
              >
                {role.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Agent Description */}
      <div>
        <Textarea
          label="Description (Optional)"
          placeholder="Describe what this agent does, its responsibilities, and any specific behaviors..."
          value={formData.description}
          onChange={handleDescriptionChange}
          error={errors.description}
          hint="Provide detailed context to help the agent understand its purpose"
          rows={4}
        />

        {/* Character Count */}
        <div className="mt-1 flex justify-end">
          <span
            className={cn(
              'text-xs',
              formData.description.length > 500
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-slate-400 dark:text-dark-text-muted'
            )}
          >
            {formData.description.length} / 1000 characters
          </span>
        </div>
      </div>

      {/* Tips Section */}
      <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
        <div className="flex gap-3">
          <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-1">
              Tips for naming your agent
            </h4>
            <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
              <li className="flex items-start gap-2">
                <span className="text-blue-400">-</span>
                Use clear, descriptive names that indicate the agent's purpose
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400">-</span>
                Include the team or project name for organization (e.g., "Platform Deploy Bot")
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400">-</span>
                The role helps define default behaviors and tool access
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Preview Card */}
      {formData.name && (
        <div className="p-4 rounded-lg bg-slate-50 dark:bg-dark-bg-tertiary border border-slate-200 dark:border-dark-border-primary">
          <p className="text-xs text-slate-500 dark:text-dark-text-tertiary mb-2">
            Preview
          </p>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center text-white font-semibold">
              {formData.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-slate-900 dark:text-dark-text-primary">
                {formData.name}
              </h3>
              {formData.role && (
                <p className="text-sm text-slate-600 dark:text-dark-text-secondary">
                  {formData.role}
                </p>
              )}
              {formData.description && (
                <p className="text-xs text-slate-500 dark:text-dark-text-tertiary mt-1 line-clamp-2">
                  {formData.description}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BasicInfoStep;
