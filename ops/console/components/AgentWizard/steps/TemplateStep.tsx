/**
 * AgentOS Studio - Template Step
 * Step 1: Choose starting point (scratch, template, clone, import)
 */

'use client';

import React, { useState, useCallback, useMemo, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import type { WizardFormData, AgentTemplate } from '@/lib/studio/templates';
import {
  AGENT_TEMPLATES,
  searchTemplates,
  getPopularTemplates,
} from '@/lib/studio/templates';
import {
  Sparkles,
  Zap,
  Copy,
  Upload,
  Link2,
  Search,
  Star,
  Check,
  ArrowRight,
  X,
  FileCode2,
  AlertCircle,
} from 'lucide-react';

// ============================================
// Types
// ============================================

interface TemplateStepProps {
  formData: WizardFormData;
  errors?: Record<string, string>;
  onUpdate: (updates: Partial<WizardFormData>) => void;
  onTemplateSelect: (template: AgentTemplate) => void;
}

type StartingPoint = 'scratch' | 'template' | 'clone' | 'import';

interface ImportState {
  type: 'url' | 'file' | null;
  value: string;
  loading: boolean;
  error: string | null;
}

// ============================================
// Starting Point Options
// ============================================

interface StartingPointOption {
  id: StartingPoint;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

const STARTING_POINTS: StartingPointOption[] = [
  {
    id: 'scratch',
    name: 'Start from Scratch',
    description: 'Create a fully custom agent configuration',
    icon: <Zap className="w-5 h-5" />,
    color: 'text-brand-600 dark:text-brand-400',
    bgColor: 'bg-brand-100 dark:bg-brand-900/30',
  },
  {
    id: 'template',
    name: 'Choose Template',
    description: 'Start with a pre-configured template',
    icon: <Sparkles className="w-5 h-5" />,
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
  },
  {
    id: 'clone',
    name: 'Clone Existing',
    description: 'Duplicate an existing agent as a starting point',
    icon: <Copy className="w-5 h-5" />,
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
  },
  {
    id: 'import',
    name: 'Import',
    description: 'Import from a file or URL',
    icon: <Upload className="w-5 h-5" />,
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
  },
];

// ============================================
// Mock Existing Agents for Clone
// ============================================

const MOCK_EXISTING_AGENTS = [
  {
    id: 'agent-1',
    name: 'Deploy Bot',
    pack: 'devops',
    description: 'Handles CI/CD deployments',
    createdAt: '2024-12-15',
  },
  {
    id: 'agent-2',
    name: 'Test Runner',
    pack: 'qa',
    description: 'Runs automated test suites',
    createdAt: '2024-12-10',
  },
  {
    id: 'agent-3',
    name: 'Code Reviewer',
    pack: 'engineering',
    description: 'Reviews pull requests',
    createdAt: '2024-12-05',
  },
];

// ============================================
// Template Step Component
// ============================================

export function TemplateStep({
  formData,
  onUpdate,
  onTemplateSelect,
}: TemplateStepProps) {
  const [startingPoint, setStartingPoint] = useState<StartingPoint>(
    formData.templateId ? 'template' : 'scratch'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [importState, setImportState] = useState<ImportState>({
    type: null,
    value: '',
    loading: false,
    error: null,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ============================================
  // Computed Values
  // ============================================

  const popularTemplates = useMemo(() => getPopularTemplates(4), []);

  const filteredTemplates = useMemo(() => {
    if (!searchQuery) return AGENT_TEMPLATES;
    return searchTemplates(searchQuery);
  }, [searchQuery]);

  // ============================================
  // Handlers
  // ============================================

  const handleStartingPointChange = useCallback((point: StartingPoint) => {
    setStartingPoint(point);
    if (point === 'scratch') {
      onUpdate({ templateId: null });
    }
  }, [onUpdate]);

  const handleTemplateClick = useCallback(
    (template: AgentTemplate) => {
      onTemplateSelect(template);
    },
    [onTemplateSelect]
  );

  const handleCloneAgent = useCallback(
    (agentId: string) => {
      // In a real app, this would fetch the agent config and populate the form
      console.log('Cloning agent:', agentId);
      // For now, just mark as selected
      onUpdate({ templateId: `clone-${agentId}` });
    },
    [onUpdate]
  );

  const handleImportFromUrl = useCallback(() => {
    setImportState((prev) => ({ ...prev, type: 'url', error: null }));
  }, []);

  const handleImportFromFile = useCallback(() => {
    setImportState((prev) => ({ ...prev, type: 'file', error: null }));
    fileInputRef.current?.click();
  }, []);

  const handleUrlChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setImportState((prev) => ({ ...prev, value: e.target.value, error: null }));
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        if (!file.name.endsWith('.yaml') && !file.name.endsWith('.yml') && !file.name.endsWith('.json')) {
          setImportState((prev) => ({
            ...prev,
            error: 'Please select a .yaml, .yml, or .json file',
          }));
          return;
        }

        setImportState((prev) => ({ ...prev, loading: true, error: null }));

        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const content = event.target?.result as string;
            // In a real app, parse and validate the content
            console.log('Imported file content:', content);
            setImportState((prev) => ({
              ...prev,
              loading: false,
              value: file.name,
            }));
            // Would parse YAML/JSON and update form
          } catch (error) {
            setImportState((prev) => ({
              ...prev,
              loading: false,
              error: 'Failed to parse file. Please ensure it is valid YAML or JSON.',
            }));
          }
        };
        reader.onerror = () => {
          setImportState((prev) => ({
            ...prev,
            loading: false,
            error: 'Failed to read file.',
          }));
        };
        reader.readAsText(file);
      }
    },
    []
  );

  const handleImportUrl = useCallback(async () => {
    if (!importState.value) return;

    setImportState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      // In a real app, fetch and parse the URL
      await new Promise((resolve) => setTimeout(resolve, 1000));
      console.log('Importing from URL:', importState.value);
      setImportState((prev) => ({ ...prev, loading: false }));
    } catch (error) {
      setImportState((prev) => ({
        ...prev,
        loading: false,
        error: 'Failed to fetch from URL. Please check the URL and try again.',
      }));
    }
  }, [importState.value]);

  const handleCancelImport = useCallback(() => {
    setImportState({ type: null, value: '', loading: false, error: null });
  }, []);

  // ============================================
  // Render
  // ============================================

  return (
    <div className="space-y-6">
      {/* Starting Point Options */}
      <div>
        <h3 className="text-sm font-medium text-slate-900 dark:text-dark-text-primary mb-3">
          How would you like to start?
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {STARTING_POINTS.map((point) => {
            const isSelected = startingPoint === point.id;
            return (
              <button
                key={point.id}
                type="button"
                onClick={() => handleStartingPointChange(point.id)}
                className={cn(
                  'p-4 rounded-xl border text-left transition-all',
                  isSelected
                    ? 'bg-brand-50 dark:bg-brand-900/20 border-brand-300 dark:border-brand-700 ring-2 ring-brand-500/20'
                    : 'bg-white dark:bg-dark-bg-secondary border-slate-200 dark:border-dark-border-primary hover:border-slate-300 dark:hover:border-dark-border-secondary hover:shadow-sm'
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
                      point.bgColor,
                      point.color
                    )}
                  >
                    {point.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-medium text-slate-900 dark:text-dark-text-primary">
                        {point.name}
                      </h4>
                      {isSelected && (
                        <Check className="w-4 h-4 text-brand-600 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-dark-text-tertiary mt-0.5">
                      {point.description}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Template Selection */}
      {startingPoint === 'template' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
          {/* Search */}
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
            rightIcon={
              searchQuery ? (
                <button
                  onClick={() => setSearchQuery('')}
                  className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-dark-bg-elevated"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : undefined
            }
          />

          {/* Popular Templates (when no search) */}
          {!searchQuery && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Star className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-medium text-slate-500 dark:text-dark-text-tertiary">
                  Popular Templates
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {popularTemplates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => handleTemplateClick(template)}
                    className={cn(
                      'p-3 rounded-lg border text-left transition-all flex items-center gap-3',
                      formData.templateId === template.id
                        ? 'bg-brand-50 dark:bg-brand-900/20 border-brand-300 dark:border-brand-700'
                        : 'bg-white dark:bg-dark-bg-secondary border-slate-200 dark:border-dark-border-primary hover:border-slate-300 dark:hover:border-dark-border-secondary'
                    )}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${template.color}20`, color: template.color }}
                    >
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h5 className="text-sm font-medium text-slate-900 dark:text-dark-text-primary truncate">
                        {template.name}
                      </h5>
                      <p className="text-xs text-slate-500 dark:text-dark-text-tertiary truncate">
                        {template.shortDescription}
                      </p>
                    </div>
                    {formData.templateId === template.id && (
                      <Check className="w-4 h-4 text-brand-600 flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* All Templates / Search Results */}
          <div>
            <span className="text-xs font-medium text-slate-500 dark:text-dark-text-tertiary mb-2 block">
              {searchQuery ? `Search Results (${filteredTemplates.length})` : 'All Templates'}
            </span>
            <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
              {filteredTemplates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => handleTemplateClick(template)}
                  className={cn(
                    'w-full p-3 rounded-lg border text-left transition-all flex items-center gap-3',
                    formData.templateId === template.id
                      ? 'bg-brand-50 dark:bg-brand-900/20 border-brand-300 dark:border-brand-700'
                      : 'bg-white dark:bg-dark-bg-secondary border-slate-200 dark:border-dark-border-primary hover:border-slate-300 dark:hover:border-dark-border-secondary'
                  )}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${template.color}20`, color: template.color }}
                  >
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h5 className="text-sm font-medium text-slate-900 dark:text-dark-text-primary">
                        {template.name}
                      </h5>
                      {template.isOfficial && (
                        <Badge variant="info" size="sm">
                          Official
                        </Badge>
                      )}
                      <Badge variant="primary" size="sm">
                        {template.pack}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-dark-text-tertiary truncate">
                      {template.shortDescription}
                    </p>
                  </div>
                  {formData.templateId === template.id ? (
                    <Check className="w-4 h-4 text-brand-600 flex-shrink-0" />
                  ) : (
                    <ArrowRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  )}
                </button>
              ))}
              {filteredTemplates.length === 0 && (
                <div className="text-center py-8">
                  <Sparkles className="w-8 h-8 text-slate-300 dark:text-dark-text-muted mx-auto mb-2" />
                  <p className="text-sm text-slate-500 dark:text-dark-text-tertiary">
                    No templates found
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Clone Existing Agent */}
      {startingPoint === 'clone' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <Input
            placeholder="Search your agents..."
            leftIcon={<Search className="w-4 h-4" />}
          />

          <div className="space-y-2">
            <span className="text-xs font-medium text-slate-500 dark:text-dark-text-tertiary">
              Your Agents
            </span>
            {MOCK_EXISTING_AGENTS.map((agent) => (
              <button
                key={agent.id}
                type="button"
                onClick={() => handleCloneAgent(agent.id)}
                className={cn(
                  'w-full p-3 rounded-lg border text-left transition-all flex items-center gap-3',
                  formData.templateId === `clone-${agent.id}`
                    ? 'bg-brand-50 dark:bg-brand-900/20 border-brand-300 dark:border-brand-700'
                    : 'bg-white dark:bg-dark-bg-secondary border-slate-200 dark:border-dark-border-primary hover:border-slate-300 dark:hover:border-dark-border-secondary'
                )}
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                  <Copy className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h5 className="text-sm font-medium text-slate-900 dark:text-dark-text-primary">
                      {agent.name}
                    </h5>
                    <Badge variant="primary" size="sm">
                      {agent.pack}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-dark-text-tertiary">
                    {agent.description}
                  </p>
                </div>
                {formData.templateId === `clone-${agent.id}` ? (
                  <Check className="w-4 h-4 text-brand-600 flex-shrink-0" />
                ) : (
                  <span className="text-xs text-brand-600 dark:text-brand-400">Clone</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Import Options */}
      {startingPoint === 'import' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
          {importState.type === null ? (
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleImportFromUrl}
                className="p-4 rounded-lg border border-dashed border-slate-300 dark:border-dark-border-secondary hover:border-brand-400 dark:hover:border-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-all text-center group"
              >
                <Link2 className="w-8 h-8 text-slate-400 group-hover:text-brand-600 dark:group-hover:text-brand-400 mx-auto mb-2 transition-colors" />
                <h4 className="text-sm font-medium text-slate-900 dark:text-dark-text-primary">
                  Import from URL
                </h4>
                <p className="text-xs text-slate-500 dark:text-dark-text-tertiary mt-1">
                  Paste a URL to a YAML or JSON config
                </p>
              </button>
              <button
                type="button"
                onClick={handleImportFromFile}
                className="p-4 rounded-lg border border-dashed border-slate-300 dark:border-dark-border-secondary hover:border-brand-400 dark:hover:border-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-all text-center group"
              >
                <FileCode2 className="w-8 h-8 text-slate-400 group-hover:text-brand-600 dark:group-hover:text-brand-400 mx-auto mb-2 transition-colors" />
                <h4 className="text-sm font-medium text-slate-900 dark:text-dark-text-primary">
                  Upload File
                </h4>
                <p className="text-xs text-slate-500 dark:text-dark-text-tertiary mt-1">
                  Upload a .yaml, .yml, or .json file
                </p>
              </button>
            </div>
          ) : importState.type === 'url' ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-900 dark:text-dark-text-primary">
                  Import from URL
                </span>
                <button
                  type="button"
                  onClick={handleCancelImport}
                  className="text-xs text-slate-500 hover:text-slate-700 dark:text-dark-text-tertiary dark:hover:text-dark-text-secondary"
                >
                  Cancel
                </button>
              </div>
              <Input
                placeholder="https://example.com/agent-config.yaml"
                value={importState.value}
                onChange={handleUrlChange}
                leftIcon={<Link2 className="w-4 h-4" />}
                {...(importState.error ? { error: importState.error } : {})}
              />
              <Button
                variant="primary"
                onClick={handleImportUrl}
                loading={importState.loading}
                disabled={!importState.value}
                className="w-full"
              >
                Import Configuration
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-900 dark:text-dark-text-primary">
                  Upload File
                </span>
                <button
                  type="button"
                  onClick={handleCancelImport}
                  className="text-xs text-slate-500 hover:text-slate-700 dark:text-dark-text-tertiary dark:hover:text-dark-text-secondary"
                >
                  Cancel
                </button>
              </div>
              {importState.value ? (
                <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 flex items-center gap-3">
                  <FileCode2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-sm text-emerald-800 dark:text-emerald-300">
                    {importState.value}
                  </span>
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 ml-auto" />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleImportFromFile}
                  className="w-full p-8 rounded-lg border border-dashed border-slate-300 dark:border-dark-border-secondary hover:border-brand-400 dark:hover:border-brand-600 transition-colors text-center"
                >
                  <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-500 dark:text-dark-text-tertiary">
                    Click to select a file
                  </p>
                </button>
              )}
              {importState.error && (
                <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                  <AlertCircle className="w-4 h-4" />
                  {importState.error}
                </div>
              )}
            </div>
          )}

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".yaml,.yml,.json"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      )}

      {/* Start from Scratch Message */}
      {startingPoint === 'scratch' && (
        <div className="p-4 rounded-lg bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-start gap-3">
            <Zap className="w-5 h-5 text-brand-600 dark:text-brand-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-brand-900 dark:text-brand-300">
                Starting from scratch
              </h4>
              <p className="text-sm text-brand-700 dark:text-brand-400 mt-1">
                You will configure all settings manually. This gives you full control over your agent's capabilities.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TemplateStep;
