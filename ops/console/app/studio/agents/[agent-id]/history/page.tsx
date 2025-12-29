/**
 * AgentOS Studio - Version History Page
 * Displays version history and diff viewer for agent configurations
 */

'use client';

import React, { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { VersionHistory } from '@/components/VersionHistory/VersionHistory';
import { initializeDemoVersionHistory } from '@/lib/studio/versionControl';

// ============================================
// History Page Component
// ============================================

export default function HistoryPage() {
  const params = useParams();
  const router = useRouter();
  const agentId = params?.['agent-id'] as string;

  // Initialize demo data on first load
  useEffect(() => {
    if (agentId) {
      initializeDemoVersionHistory(agentId);
    }
  }, [agentId]);

  const handleBack = () => {
    router.push(`/studio/agents/${agentId}/yaml`);
  };

  const handleRollback = (versionId: string) => {
    console.log('Rolled back to version:', versionId);
    // In production, this would trigger a refresh or navigation
  };

  if (!agentId) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-slate-500 dark:text-dark-text-tertiary">
          Agent ID not found
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-dark-bg-primary">
      {/* Header */}
      <header className="flex items-center gap-4 px-6 py-4 border-b border-slate-200 dark:border-dark-border-primary bg-white dark:bg-dark-bg-secondary">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
          leftIcon={<ArrowLeft className="w-4 h-4" />}
        >
          Back to Editor
        </Button>

        <div className="h-6 w-px bg-slate-200 dark:bg-dark-border-primary" />

        <div>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-dark-text-primary">
            Version History
          </h1>
          <p className="text-sm text-slate-500 dark:text-dark-text-tertiary">
            Agent: {agentId}
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        <VersionHistory
          agentId={agentId}
          onRollback={handleRollback}
        />
      </main>
    </div>
  );
}
