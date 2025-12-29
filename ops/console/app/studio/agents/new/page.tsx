/**
 * AgentOS Studio - New Agent Page
 * Create a new agent using the wizard
 */

import type { Metadata } from 'next';
import { Suspense } from 'react';
import { NewAgentPageContent } from './new-agent-content';

// ============================================
// Metadata
// ============================================

export const metadata: Metadata = {
  title: 'Create New Agent',
  description: 'Create a new AI agent with the step-by-step wizard',
};

// ============================================
// Loading Component
// ============================================

function LoadingWizard() {
  return (
    <div className="max-w-4xl mx-auto">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="h-8 w-48 bg-slate-200 dark:bg-dark-bg-tertiary rounded animate-pulse" />
          <div className="h-4 w-64 bg-slate-100 dark:bg-dark-bg-secondary rounded animate-pulse mt-2" />
        </div>
        <div className="h-9 w-20 bg-slate-200 dark:bg-dark-bg-tertiary rounded animate-pulse" />
      </div>

      {/* Progress Skeleton */}
      <div className="flex items-center justify-between mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex flex-col items-center flex-1">
            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-dark-bg-tertiary animate-pulse" />
            <div className="h-3 w-16 bg-slate-100 dark:bg-dark-bg-secondary rounded animate-pulse mt-2" />
          </div>
        ))}
      </div>

      {/* Content Skeleton */}
      <div className="bg-white dark:bg-dark-bg-secondary rounded-xl border border-slate-200 dark:border-dark-border-primary p-6 mb-6">
        <div className="space-y-4">
          <div className="h-6 w-32 bg-slate-200 dark:bg-dark-bg-tertiary rounded animate-pulse" />
          <div className="h-10 w-full bg-slate-100 dark:bg-dark-bg-primary rounded animate-pulse" />
          <div className="h-10 w-full bg-slate-100 dark:bg-dark-bg-primary rounded animate-pulse" />
          <div className="h-24 w-full bg-slate-100 dark:bg-dark-bg-primary rounded animate-pulse" />
        </div>
      </div>

      {/* Navigation Skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-10 w-24 bg-slate-200 dark:bg-dark-bg-tertiary rounded animate-pulse" />
        <div className="h-10 w-28 bg-brand-200 dark:bg-brand-900 rounded animate-pulse" />
      </div>
    </div>
  );
}

// ============================================
// New Agent Page
// ============================================

export default function NewAgentPage() {
  return (
    <Suspense fallback={<LoadingWizard />}>
      <NewAgentPageContent />
    </Suspense>
  );
}
