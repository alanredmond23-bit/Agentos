/**
 * AgentOS Studio - Agent Editor Page
 * 3-pane layout for editing agent configurations with live preview
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LivePreview } from '@/components/LivePreview/LivePreview';
import { type AgentFormData, DEFAULT_FORM_DATA } from '@/lib/studio/formYamlSync';
import {
  ArrowLeft,
  Save,
  History,
  Settings,
  Play,
  Pause,
  MoreVertical,
  GitBranch,
  ExternalLink,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

// ============================================
// Types
// ============================================

interface AgentEditorPageProps {
  params: { 'agent-id': string };
}

interface AgentMetadata {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'stopped' | 'error';
  version: string;
  lastModified: string;
  createdBy: string;
}

// ============================================
// Agent Editor Page Component
// ============================================

export default function AgentEditorPage() {
  const params = useParams();
  const router = useRouter();
  const agentId = params['agent-id'] as string;

  // State management
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [agentData, setAgentData] = useState<AgentFormData | null>(null);
  const [metadata, setMetadata] = useState<AgentMetadata | null>(null);

  // Determine if this is a new agent
  const isNewAgent = agentId === 'new';

  // Fetch agent data
  useEffect(() => {
    async function fetchAgent() {
      if (isNewAgent) {
        setAgentData(DEFAULT_FORM_DATA);
        setMetadata({
          id: 'new',
          name: 'New Agent',
          status: 'stopped',
          version: '1.0.0',
          lastModified: new Date().toISOString(),
          createdBy: 'Current User',
        });
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Simulated API call - replace with actual API
        await new Promise(resolve => setTimeout(resolve, 500));

        // Mock data for demonstration
        const mockAgent: AgentFormData = {
          id: agentId,
          name: 'Engineering Assistant',
          slug: 'engineering-assistant',
          description: 'An AI assistant for engineering tasks including code review, documentation, and debugging.',
          pack: 'engineering',
          version: '1.2.0',
          model: 'claude-3-opus-20240229',
          temperature: 0.7,
          maxTokens: 8192,
          systemPrompt: 'You are an expert software engineer. Help with code reviews, debugging, and documentation tasks.',
          tools: [
            { id: '1', name: 'code_review', enabled: true },
            { id: '2', name: 'run_tests', enabled: true },
            { id: '3', name: 'generate_docs', enabled: false },
          ],
          capabilities: [
            { id: '1', name: 'Read Files', description: 'Read source code files', requiresApproval: false, riskLevel: 'low' },
            { id: '2', name: 'Modify Files', description: 'Make changes to source code', requiresApproval: true, riskLevel: 'high' },
          ],
          rateLimit: {
            requestsPerMinute: 60,
            requestsPerHour: 1000,
            requestsPerDay: 10000,
          },
          retryPolicy: {
            maxRetries: 3,
            initialDelayMs: 1000,
            maxDelayMs: 30000,
            backoffMultiplier: 2,
          },
          autoApproveThreshold: 0.85,
          environmentVariables: {
            GITHUB_TOKEN: '***',
            JIRA_API_KEY: '***',
          },
        };

        setAgentData(mockAgent);
        setMetadata({
          id: agentId,
          name: mockAgent.name,
          status: 'active',
          version: mockAgent.version,
          lastModified: new Date().toISOString(),
          createdBy: 'John Doe',
        });
      } catch (err) {
        setError('Failed to load agent configuration');
        console.error('Error loading agent:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchAgent();
  }, [agentId, isNewAgent]);

  // Handle save
  const handleSave = useCallback(async (data: AgentFormData, yaml: string) => {
    setIsSaving(true);
    try {
      // Simulated API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log('Saving agent:', { data, yaml });

      // Update metadata
      if (metadata) {
        setMetadata({
          ...metadata,
          name: data.name,
          version: data.version,
          lastModified: new Date().toISOString(),
        });
      }

      setIsDirty(false);
    } catch (err) {
      console.error('Failed to save:', err);
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [metadata]);

  // Handle back navigation with unsaved changes prompt
  const handleBack = useCallback(() => {
    if (isDirty) {
      const confirmed = window.confirm('You have unsaved changes. Are you sure you want to leave?');
      if (!confirmed) return;
    }
    router.push('/studio/agents');
  }, [isDirty, router]);

  // Handle agent actions
  const handleToggleStatus = useCallback(async () => {
    if (!metadata) return;

    const newStatus = metadata.status === 'active' ? 'paused' : 'active';
    setMetadata({ ...metadata, status: newStatus });
  }, [metadata]);

  // Loading state
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50 dark:bg-dark-bg-primary">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-brand-500 animate-spin mx-auto mb-4" />
          <p className="text-sm text-slate-600 dark:text-dark-text-secondary">
            Loading agent configuration...
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50 dark:bg-dark-bg-primary">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-dark-text-primary mb-2">
            Failed to Load Agent
          </h2>
          <p className="text-sm text-slate-600 dark:text-dark-text-secondary mb-4">
            {error}
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button variant="secondary" onClick={handleBack}>
              Go Back
            </Button>
            <Button variant="primary" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-50 dark:bg-dark-bg-primary">
      {/* Header */}
      <AgentEditorHeader
        metadata={metadata}
        isDirty={isDirty}
        isSaving={isSaving}
        isNewAgent={isNewAgent}
        onBack={handleBack}
        onToggleStatus={handleToggleStatus}
      />

      {/* Main Content - Live Preview */}
      <div className="flex-1 min-h-0">
        <LivePreview
          initialData={agentData || undefined}
          onSave={handleSave}
          onDirtyChange={setIsDirty}
          className="h-full"
          debounceMs={300}
          showValidation={true}
          showJsonPreview={true}
          defaultLayout="3-pane"
        />
      </div>
    </div>
  );
}

// ============================================
// Header Component
// ============================================

interface AgentEditorHeaderProps {
  metadata: AgentMetadata | null;
  isDirty: boolean;
  isSaving: boolean;
  isNewAgent: boolean;
  onBack: () => void;
  onToggleStatus: () => void;
}

function AgentEditorHeader({
  metadata,
  isDirty,
  isSaving,
  isNewAgent,
  onBack,
  onToggleStatus,
}: AgentEditorHeaderProps) {
  return (
    <header className="flex-shrink-0 h-14 flex items-center justify-between px-4 bg-white dark:bg-dark-bg-secondary border-b border-slate-200 dark:border-dark-border-primary">
      {/* Left side */}
      <div className="flex items-center gap-4">
        {/* Back button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          leftIcon={<ArrowLeft className="w-4 h-4" />}
        >
          Back
        </Button>

        {/* Divider */}
        <div className="w-px h-6 bg-slate-200 dark:bg-dark-border-primary" />

        {/* Agent info */}
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold text-slate-900 dark:text-dark-text-primary">
                {metadata?.name || 'New Agent'}
              </h1>
              {isDirty && (
                <span className="text-xs text-amber-600 dark:text-amber-400">
                  (unsaved)
                </span>
              )}
            </div>
            {metadata && !isNewAgent && (
              <p className="text-xs text-slate-500 dark:text-dark-text-tertiary">
                v{metadata.version} - Last modified {new Date(metadata.lastModified).toLocaleDateString()}
              </p>
            )}
          </div>

          {/* Status badge */}
          {metadata && !isNewAgent && (
            <StatusBadge status={metadata.status} />
          )}
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Version control */}
        {!isNewAgent && (
          <>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<History className="w-4 h-4" />}
            >
              History
            </Button>

            <Button
              variant="ghost"
              size="sm"
              leftIcon={<GitBranch className="w-4 h-4" />}
            >
              Versions
            </Button>

            {/* Divider */}
            <div className="w-px h-6 bg-slate-200 dark:bg-dark-border-primary mx-1" />

            {/* Run/Pause toggle */}
            <Button
              variant={metadata?.status === 'active' ? 'secondary' : 'success'}
              size="sm"
              onClick={onToggleStatus}
              leftIcon={metadata?.status === 'active'
                ? <Pause className="w-4 h-4" />
                : <Play className="w-4 h-4" />
              }
            >
              {metadata?.status === 'active' ? 'Pause' : 'Activate'}
            </Button>
          </>
        )}

        {/* Settings */}
        <Button
          variant="ghost"
          size="sm"
        >
          <Settings className="w-4 h-4" />
        </Button>

        {/* More options */}
        <Button
          variant="ghost"
          size="sm"
        >
          <MoreVertical className="w-4 h-4" />
        </Button>
      </div>
    </header>
  );
}

// ============================================
// Status Badge Component
// ============================================

interface StatusBadgeProps {
  status: AgentMetadata['status'];
}

function StatusBadge({ status }: StatusBadgeProps) {
  const statusConfig = {
    active: { color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400', label: 'Active' },
    paused: { color: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400', label: 'Paused' },
    stopped: { color: 'bg-slate-100 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400', label: 'Stopped' },
    error: { color: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400', label: 'Error' },
  };

  const config = statusConfig[status];

  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
      config.color
    )}>
      <span className={cn(
        'w-1.5 h-1.5 rounded-full mr-1.5',
        status === 'active' && 'bg-emerald-500 animate-pulse',
        status === 'paused' && 'bg-amber-500',
        status === 'stopped' && 'bg-slate-400',
        status === 'error' && 'bg-red-500'
      )} />
      {config.label}
    </span>
  );
}
