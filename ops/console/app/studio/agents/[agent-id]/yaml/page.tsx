/**
 * AgentOS Studio - YAML Editor Page
 * Monaco-based YAML editor for agent configuration
 * Features: Form/YAML tab toggle, fullscreen mode, save, version history
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Save,
  RotateCcw,
  History,
  AlertCircle,
  Play,
  Pause,
  GitBranch,
  ExternalLink,
  Check,
  X,
  Loader2
} from 'lucide-react';

import { YAMLEditor } from '@/components/YAMLEditor/YAMLEditor';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { Tooltip } from '@/components/ui/Tooltip';
import { defaultAgentYAML } from '@/lib/studio/yamlSchema';
import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

interface AgentConfig {
  id: string;
  name: string;
  yaml: string;
  version: string;
  lastModified: string;
  status: 'draft' | 'published' | 'archived' | 'active' | 'paused';
  author?: string;
}

interface ValidationError {
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

// ============================================
// Save Toast Component
// ============================================

interface SaveToastProps {
  show: boolean;
  success: boolean;
  message: string;
  onClose: () => void;
}

function SaveToast({ show, success, message, onClose }: SaveToastProps) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(onClose, 3000);
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  if (!show) return null;

  return (
    <div className={cn(
      'fixed bottom-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg',
      'animate-in fade-in slide-in-from-bottom-4 duration-300',
      success
        ? 'bg-emerald-500 text-white'
        : 'bg-red-500 text-white'
    )}>
      {success ? (
        <Check className="w-5 h-5" />
      ) : (
        <X className="w-5 h-5" />
      )}
      <span className="text-sm font-medium">{message}</span>
      <button
        onClick={onClose}
        className="ml-2 p-1 rounded hover:bg-white/20 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ============================================
// Unsaved Changes Modal
// ============================================

interface UnsavedChangesModalProps {
  isOpen: boolean;
  onDiscard: () => void;
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
}

function UnsavedChangesModal({
  isOpen,
  onDiscard,
  onSave,
  onCancel,
  isSaving
}: UnsavedChangesModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-dark-bg-secondary rounded-lg shadow-xl p-6 w-[400px]">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-dark-text-primary mb-2">
          Unsaved Changes
        </h3>
        <p className="text-sm text-slate-600 dark:text-dark-text-secondary mb-6">
          You have unsaved changes. Would you like to save them before leaving?
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="secondary" size="sm" onClick={onDiscard}>
            Discard
          </Button>
          <Button variant="primary" size="sm" onClick={onSave} loading={isSaving}>
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// YAML Editor Page Component
// ============================================

export default function YAMLEditorPage() {
  const params = useParams();
  const router = useRouter();
  const agentId = params['agent-id'] as string;

  // State
  const [yaml, setYaml] = useState<string>('');
  const [originalYaml, setOriginalYaml] = useState<string>('');
  const [agent, setAgent] = useState<AgentConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const [saveToast, setSaveToast] = useState<{
    show: boolean;
    success: boolean;
    message: string;
  }>({ show: false, success: true, message: '' });

  // Load agent configuration
  useEffect(() => {
    async function loadAgent() {
      setLoading(true);
      try {
        // Simulate API call - replace with actual API
        await new Promise(resolve => setTimeout(resolve, 500));

        if (agentId === 'new') {
          setYaml(defaultAgentYAML);
          setOriginalYaml(defaultAgentYAML);
          setAgent({
            id: 'new',
            name: 'New Agent',
            yaml: defaultAgentYAML,
            version: '0.1.0',
            lastModified: new Date().toISOString(),
            status: 'draft'
          });
        } else {
          // Mock data - replace with API call
          const mockYaml = defaultAgentYAML.replace('my-agent', `agent-${agentId}`);
          setYaml(mockYaml);
          setOriginalYaml(mockYaml);
          setAgent({
            id: agentId,
            name: `Agent ${agentId}`,
            yaml: mockYaml,
            version: '1.0.0',
            lastModified: new Date().toISOString(),
            status: 'published'
          });
        }
      } catch (error) {
        console.error('Failed to load agent:', error);
        setSaveToast({
          show: true,
          success: false,
          message: 'Failed to load agent configuration'
        });
      } finally {
        setLoading(false);
      }
    }

    loadAgent();
  }, [agentId]);

  // Track changes
  useEffect(() => {
    setHasChanges(yaml !== originalYaml);
  }, [yaml, originalYaml]);

  // Handle YAML change
  const handleYAMLChange = useCallback((value: string) => {
    setYaml(value);
  }, []);

  // Handle validation errors
  const handleValidationChange = useCallback((errors: ValidationError[]) => {
    setValidationErrors(errors);
  }, []);

  // Handle tab change (Form/YAML toggle)
  const handleTabChange = useCallback((tab: 'form' | 'yaml') => {
    if (tab === 'form') {
      if (hasChanges) {
        setPendingNavigation(`/studio/agents/${agentId}`);
        setShowUnsavedModal(true);
      } else {
        router.push(`/studio/agents/${agentId}`);
      }
    }
  }, [agentId, hasChanges, router]);

  // Save changes
  const handleSave = async () => {
    const errorCount = validationErrors.filter(e => e.severity === 'error').length;
    if (errorCount > 0) {
      setSaveToast({
        show: true,
        success: false,
        message: `Cannot save: ${errorCount} error${errorCount > 1 ? 's' : ''} found`
      });
      return;
    }

    setSaving(true);
    try {
      // Simulate API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 1000));
      setOriginalYaml(yaml);
      setHasChanges(false);
      setSaveToast({
        show: true,
        success: true,
        message: 'Changes saved successfully'
      });

      // If there was a pending navigation, execute it
      if (pendingNavigation) {
        router.push(pendingNavigation);
        setPendingNavigation(null);
      }
    } catch (error) {
      console.error('Failed to save:', error);
      setSaveToast({
        show: true,
        success: false,
        message: 'Failed to save changes'
      });
    } finally {
      setSaving(false);
      setShowUnsavedModal(false);
    }
  };

  // Reset changes
  const handleReset = () => {
    setYaml(originalYaml);
    setSaveToast({
      show: true,
      success: true,
      message: 'Changes discarded'
    });
  };

  // Navigate back
  const handleBack = () => {
    if (hasChanges) {
      setPendingNavigation('/studio/agents');
      setShowUnsavedModal(true);
    } else {
      router.push('/studio/agents');
    }
  };

  // Handle discard from modal
  const handleDiscard = () => {
    if (pendingNavigation) {
      router.push(pendingNavigation);
      setPendingNavigation(null);
    }
    setShowUnsavedModal(false);
  };

  // Handle cancel from modal
  const handleCancelModal = () => {
    setPendingNavigation(null);
    setShowUnsavedModal(false);
  };

  // Toggle agent status
  const handleToggleStatus = async () => {
    if (!agent) return;

    const newStatus = agent.status === 'active' ? 'paused' : 'active';
    setAgent({ ...agent, status: newStatus as AgentConfig['status'] });
    setSaveToast({
      show: true,
      success: true,
      message: `Agent ${newStatus === 'active' ? 'activated' : 'paused'}`
    });
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)] bg-slate-50 dark:bg-dark-bg-primary">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-brand-500 animate-spin mx-auto mb-4" />
          <p className="text-sm text-slate-600 dark:text-dark-text-secondary">
            Loading agent configuration...
          </p>
        </div>
      </div>
    );
  }

  const errorCount = validationErrors.filter(e => e.severity === 'error').length;
  const warningCount = validationErrors.filter(e => e.severity === 'warning').length;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-slate-50 dark:bg-dark-bg-primary">
      {/* Header */}
      <header className="flex-shrink-0 flex items-center justify-between px-6 py-3 border-b border-slate-200 dark:border-dark-border-primary bg-white dark:bg-dark-bg-secondary">
        <div className="flex items-center gap-4">
          {/* Back Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Back
          </Button>

          <div className="h-6 w-px bg-slate-200 dark:bg-dark-border-primary" />

          {/* Agent Info */}
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-semibold text-slate-900 dark:text-dark-text-primary">
                  {agent?.name || 'Agent Configuration'}
                </h1>
                {hasChanges && (
                  <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                    (unsaved)
                  </span>
                )}
              </div>
              {agent && (
                <p className="text-xs text-slate-500 dark:text-dark-text-tertiary">
                  v{agent.version} - Last modified {new Date(agent.lastModified).toLocaleDateString()}
                </p>
              )}
            </div>

            {/* Status Badge */}
            <StatusBadge status={agent?.status || 'draft'} />
          </div>
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center gap-3">
          {/* Validation Status */}
          {(errorCount > 0 || warningCount > 0) && (
            <div className="flex items-center gap-2 mr-2">
              {errorCount > 0 && (
                <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-xs font-medium">{errorCount} error{errorCount > 1 ? 's' : ''}</span>
                </div>
              )}
              {warningCount > 0 && (
                <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-xs font-medium">{warningCount} warning{warningCount > 1 ? 's' : ''}</span>
                </div>
              )}
            </div>
          )}

          {/* History Button */}
          <Tooltip content="View version history">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/studio/agents/${agentId}/history`)}
              leftIcon={<History className="w-4 h-4" />}
            >
              History
            </Button>
          </Tooltip>

          {/* Versions Button */}
          {agentId !== 'new' && (
            <Tooltip content="Manage versions">
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<GitBranch className="w-4 h-4" />}
              >
                Versions
              </Button>
            </Tooltip>
          )}

          <div className="h-6 w-px bg-slate-200 dark:bg-dark-border-primary" />

          {/* Status Toggle */}
          {agentId !== 'new' && (
            <Tooltip content={agent?.status === 'active' ? 'Pause agent' : 'Activate agent'}>
              <Button
                variant={agent?.status === 'active' ? 'secondary' : 'success'}
                size="sm"
                onClick={handleToggleStatus}
                leftIcon={agent?.status === 'active'
                  ? <Pause className="w-4 h-4" />
                  : <Play className="w-4 h-4" />
                }
              >
                {agent?.status === 'active' ? 'Pause' : 'Activate'}
              </Button>
            </Tooltip>
          )}

          {/* Reset Button */}
          <Tooltip content="Discard all changes">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleReset}
              disabled={!hasChanges}
              leftIcon={<RotateCcw className="w-4 h-4" />}
            >
              Reset
            </Button>
          </Tooltip>

          {/* Save Button */}
          <Tooltip content={errorCount > 0 ? 'Fix errors before saving' : 'Save changes'}>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              loading={saving}
              disabled={!hasChanges || errorCount > 0}
              leftIcon={<Save className="w-4 h-4" />}
            >
              Save
            </Button>
          </Tooltip>
        </div>
      </header>

      {/* Editor */}
      <div className="flex-1 overflow-hidden p-4">
        <YAMLEditor
          value={yaml}
          onChange={handleYAMLChange}
          onValidationChange={handleValidationChange}
          onSave={handleSave}
          readOnly={false}
          className="h-full"
          activeTab="yaml"
          onTabChange={handleTabChange}
          agentId={agentId}
          agentName={agent?.name}
        />
      </div>

      {/* Modals and Toasts */}
      <UnsavedChangesModal
        isOpen={showUnsavedModal}
        onDiscard={handleDiscard}
        onSave={handleSave}
        onCancel={handleCancelModal}
        isSaving={saving}
      />

      <SaveToast
        show={saveToast.show}
        success={saveToast.success}
        message={saveToast.message}
        onClose={() => setSaveToast(prev => ({ ...prev, show: false }))}
      />
    </div>
  );
}

// ============================================
// Status Badge Component
// ============================================

interface StatusBadgeProps {
  status: AgentConfig['status'];
}

function StatusBadge({ status }: StatusBadgeProps) {
  const statusConfig = {
    draft: {
      color: 'bg-slate-100 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400',
      dotColor: 'bg-slate-400',
      label: 'Draft'
    },
    published: {
      color: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
      dotColor: 'bg-blue-500',
      label: 'Published'
    },
    active: {
      color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400',
      dotColor: 'bg-emerald-500 animate-pulse',
      label: 'Active'
    },
    paused: {
      color: 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400',
      dotColor: 'bg-amber-500',
      label: 'Paused'
    },
    archived: {
      color: 'bg-slate-100 text-slate-500 dark:bg-slate-500/20 dark:text-slate-500',
      dotColor: 'bg-slate-400',
      label: 'Archived'
    }
  };

  const config = statusConfig[status];

  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
      config.color
    )}>
      <span className={cn('w-1.5 h-1.5 rounded-full mr-1.5', config.dotColor)} />
      {config.label}
    </span>
  );
}
