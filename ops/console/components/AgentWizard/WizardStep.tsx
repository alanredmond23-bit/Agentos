/**
 * AgentOS Studio - Wizard Step Component
 * Individual step container with progress indicator
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

export interface WizardStepInfo {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

interface WizardStepProps {
  step: WizardStepInfo;
  stepNumber: number;
  totalSteps: number;
  isActive: boolean;
  isCompleted: boolean;
  children: React.ReactNode;
}

// ============================================
// Wizard Step Container
// ============================================

export function WizardStep({
  step,
  stepNumber,
  totalSteps,
  isActive,
  isCompleted,
  children,
}: WizardStepProps) {
  if (!isActive) return null;

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
      {/* Step Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-900 text-brand-600 dark:text-brand-400">
            {step.icon}
          </span>
          <div>
            <p className="text-xs text-slate-500 dark:text-dark-text-tertiary">
              Step {stepNumber} of {totalSteps}
            </p>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-dark-text-primary">
              {step.title}
            </h2>
          </div>
        </div>
        <p className="text-sm text-slate-600 dark:text-dark-text-secondary ml-[52px]">
          {step.description}
        </p>
      </div>

      {/* Step Content */}
      <div className="ml-[52px]">{children}</div>
    </div>
  );
}

export default WizardStep;
