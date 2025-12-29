/**
 * AgentOS Studio - Wizard Progress Component
 * Progress indicator showing steps completion status
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import type { WizardStepInfo } from './WizardStep';

// ============================================
// Types
// ============================================

interface WizardProgressProps {
  steps: WizardStepInfo[];
  currentStep: number;
  completedSteps: number[];
  onStepClick?: (stepIndex: number) => void;
}

// ============================================
// Wizard Progress Indicator
// ============================================

export function WizardProgress({
  steps,
  currentStep,
  completedSteps,
  onStepClick,
}: WizardProgressProps) {
  return (
    <nav aria-label="Progress" className="mb-8">
      <ol className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = completedSteps.includes(index);
          const isCurrent = index === currentStep;
          const isPast = index < currentStep;
          const isClickable = isCompleted || isPast;

          return (
            <li key={step.id} className="relative flex-1">
              {/* Connector Line */}
              {index > 0 && (
                <div
                  className={cn(
                    'absolute left-0 top-4 -translate-y-1/2 w-full h-0.5 -ml-[50%]',
                    isPast || isCompleted
                      ? 'bg-brand-500'
                      : 'bg-slate-200 dark:bg-dark-border-primary'
                  )}
                  aria-hidden="true"
                />
              )}

              {/* Step Circle */}
              <button
                type="button"
                onClick={() => isClickable && onStepClick?.(index)}
                disabled={!isClickable}
                className={cn(
                  'relative flex flex-col items-center group',
                  isClickable ? 'cursor-pointer' : 'cursor-default'
                )}
              >
                <span
                  className={cn(
                    'w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium transition-all z-10',
                    isCurrent &&
                      'bg-brand-600 text-white ring-4 ring-brand-100 dark:ring-brand-900',
                    isCompleted &&
                      'bg-brand-600 text-white',
                    !isCurrent &&
                      !isCompleted &&
                      'bg-slate-100 dark:bg-dark-bg-tertiary text-slate-500 dark:text-dark-text-tertiary',
                    isClickable &&
                      !isCurrent &&
                      'hover:bg-brand-100 dark:hover:bg-brand-900'
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </span>

                {/* Step Label */}
                <span
                  className={cn(
                    'mt-2 text-xs font-medium text-center transition-colors',
                    isCurrent && 'text-brand-600 dark:text-brand-400',
                    !isCurrent &&
                      'text-slate-500 dark:text-dark-text-tertiary'
                  )}
                >
                  {step.title}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default WizardProgress;
