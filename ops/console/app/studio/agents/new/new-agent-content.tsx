/**
 * AgentOS Studio - New Agent Page Content
 * Client-side content with the agent creation wizard
 */

'use client';

import React, { useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AgentWizard } from '@/components/AgentWizard/AgentWizard';
import { getTemplateById, type WizardFormData } from '@/lib/studio/templates';

// ============================================
// New Agent Page Content Component
// ============================================

export function NewAgentPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get template from URL params
  const templateId = searchParams.get('template');
  const initialTemplate = useMemo(() => {
    if (templateId) {
      return getTemplateById(templateId);
    }
    return undefined;
  }, [templateId]);

  // ============================================
  // Handlers
  // ============================================

  const handleCancel = useCallback(() => {
    router.push('/studio/agents');
  }, [router]);

  const handleComplete = useCallback(
    async (data: WizardFormData) => {
      // Here you would typically make an API call to create the agent
      console.log('Creating agent with data:', data);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Redirect to agents list on success
      router.push('/studio/agents');
    },
    [router]
  );

  // ============================================
  // Render
  // ============================================

  return (
    <AgentWizard
      initialTemplate={initialTemplate}
      onCancel={handleCancel}
      onComplete={handleComplete}
    />
  );
}

export default NewAgentPageContent;
