/**
 * AgentOS Studio - Live Preview Container
 * Real-time preview with bidirectional YAML/Form synchronization
 */

'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { PreviewPane } from './PreviewPane';
import { JSONPreview } from './JSONPreview';
import { ValidationPanel } from './ValidationPanel';
import {
  useFormYamlSync,
  type AgentFormData,
  type SyncState,
  type ValidationError,
} from '@/lib/studio/formYamlSync';
import {
  Eye,
  EyeOff,
  Code2,
  FileJson,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Columns2,
  Columns3,
  Settings2,
  Download,
  Upload,
  Copy,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { SyncStatusIndicator } from './SyncStatusIndicator';

// ============================================
// Types
// ============================================

export interface LivePreviewProps {
  initialData?: Partial<AgentFormData>;
  onSave?: (data: AgentFormData, yaml: string) => Promise<void>;
  onDirtyChange?: (isDirty: boolean) => void;
  className?: string;
  debounceMs?: number;
  showValidation?: boolean;
  showJsonPreview?: boolean;
  defaultLayout?: '2-pane' | '3-pane';
  readOnly?: boolean;
}

export interface PreviewTab {
  id: string;
  label: string;
  icon: React.ReactNode;
}

// ============================================
// Live Preview Component
// ============================================

export function LivePreview({
  initialData,
  onSave,
  onDirtyChange,
  className,
  debounceMs = 300,
  showValidation = true,
  showJsonPreview = true,
  defaultLayout = '3-pane',
  readOnly = false,
}: LivePreviewProps) {
  // State management
  const [layout, setLayout] = useState<'2-pane' | '3-pane'>(defaultLayout);
  const [activePreviewTab, setActivePreviewTab] = useState<'yaml' | 'json'>('yaml');
  const [showPreview, setShowPreview] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Bidirectional sync hook
  const {
    state,
    updateForm,
    updateYaml,
    resolveConflict,
    reset,
    markClean,
  } = useFormYamlSync(initialData, debounceMs);

  // Notify parent of dirty state changes
  React.useEffect(() => {
    onDirtyChange?.(state.isDirty);
  }, [state.isDirty, onDirtyChange]);

  // Validation summary
  const validationSummary = useMemo(() => {
    const { errors, warnings } = state.validation;
    return {
      errorCount: errors.length,
      warningCount: warnings.length,
      isValid: errors.length === 0,
      hasWarnings: warnings.length > 0,
    };
  }, [state.validation]);

  // Handle save
  const handleSave = useCallback(async () => {
    if (!onSave || !state.validation.isValid) return;

    setIsSaving(true);
    try {
      await onSave(state.formData, state.yamlContent);
      markClean();
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setIsSaving(false);
    }
  }, [onSave, state.formData, state.yamlContent, state.validation.isValid, markClean]);

  // Handle YAML editor changes
  const handleYamlChange = useCallback((value: string) => {
    if (!readOnly) {
      updateYaml(value);
    }
  }, [updateYaml, readOnly]);

  // Handle form field changes
  const handleFormChange = useCallback((updates: Partial<AgentFormData>) => {
    if (!readOnly) {
      updateForm(updates);
    }
  }, [updateForm, readOnly]);

  // Toggle layout
  const toggleLayout = useCallback(() => {
    setLayout(prev => prev === '2-pane' ? '3-pane' : '2-pane');
  }, []);

  // Preview tabs configuration
  const previewTabs: PreviewTab[] = useMemo(() => [
    { id: 'yaml', label: 'YAML', icon: <Code2 className="w-4 h-4" /> },
    ...(showJsonPreview ? [{ id: 'json', label: 'JSON', icon: <FileJson className="w-4 h-4" /> }] : []),
  ], [showJsonPreview]);

  return (
    <div className={cn('live-preview flex flex-col h-full', className)}>
      {/* Toolbar */}
      <LivePreviewToolbar
        state={state}
        validationSummary={validationSummary}
        layout={layout}
        showPreview={showPreview}
        isCollapsed={isCollapsed}
        isSaving={isSaving}
        readOnly={readOnly}
        onToggleLayout={toggleLayout}
        onTogglePreview={() => setShowPreview(prev => !prev)}
        onToggleCollapse={() => setIsCollapsed(prev => !prev)}
        onSave={handleSave}
        onReset={() => reset()}
        onResolveConflict={resolveConflict}
      />

      {/* Main Content */}
      <div className="flex-1 min-h-0 flex flex-col">
        {showPreview && !isCollapsed ? (
          <PreviewPane
            layout={layout}
            formData={state.formData}
            yamlContent={state.yamlContent}
            jsonOutput={state.jsonOutput}
            validation={state.validation}
            isSyncing={state.isSyncing}
            lastSource={state.lastSource}
            activeTab={activePreviewTab}
            previewTabs={previewTabs}
            readOnly={readOnly}
            onFormChange={handleFormChange}
            onYamlChange={handleYamlChange}
            onTabChange={(tab) => setActivePreviewTab(tab as 'yaml' | 'json')}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-dark-bg-secondary">
            <div className="text-center">
              <EyeOff className="w-12 h-12 text-slate-300 dark:text-dark-text-muted mx-auto mb-4" />
              <p className="text-slate-500 dark:text-dark-text-tertiary">
                Preview is hidden
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={() => {
                  setShowPreview(true);
                  setIsCollapsed(false);
                }}
              >
                Show Preview
              </Button>
            </div>
          </div>
        )}

        {/* Validation Panel */}
        {showValidation && state.validation.errors.length + state.validation.warnings.length > 0 && (
          <ValidationPanel
            errors={state.validation.errors}
            warnings={state.validation.warnings}
            className="border-t border-slate-200 dark:border-dark-border-primary"
          />
        )}
      </div>
    </div>
  );
}

// ============================================
// Toolbar Component
// ============================================

interface LivePreviewToolbarProps {
  state: SyncState;
  validationSummary: {
    errorCount: number;
    warningCount: number;
    isValid: boolean;
    hasWarnings: boolean;
  };
  layout: '2-pane' | '3-pane';
  showPreview: boolean;
  isCollapsed: boolean;
  isSaving: boolean;
  readOnly: boolean;
  onToggleLayout: () => void;
  onTogglePreview: () => void;
  onToggleCollapse: () => void;
  onSave: () => void;
  onReset: () => void;
  onResolveConflict: (source: 'form' | 'yaml') => void;
}

function LivePreviewToolbar({
  state,
  validationSummary,
  layout,
  showPreview,
  isCollapsed,
  isSaving,
  readOnly,
  onToggleLayout,
  onTogglePreview,
  onToggleCollapse,
  onSave,
  onReset,
  onResolveConflict,
}: LivePreviewToolbarProps) {
  return (
    <div className="flex items-center justify-between px-4 py-2 bg-slate-50 dark:bg-dark-bg-secondary border-b border-slate-200 dark:border-dark-border-primary">
      {/* Left side - Status indicators */}
      <div className="flex items-center gap-4">
        {/* Sync status indicator */}
        <SyncStatusIndicator
          status={state.isSyncing ? 'syncing' : state.hasConflict ? 'conflict' : validationSummary.isValid ? 'synced' : 'error'}
          lastSource={state.lastSource}
          lastSyncTime={state.lastSyncTimestamp}
          isSyncing={state.isSyncing}
          hasConflict={state.hasConflict}
          errorMessage={!validationSummary.isValid ? `${validationSummary.errorCount} error${validationSummary.errorCount !== 1 ? 's' : ''}` : undefined}
          size="sm"
          showLabel={true}
          showTooltip={true}
          variant="default"
        />

        {/* Warnings indicator */}
        {validationSummary.hasWarnings && (
          <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span className="text-xs">
              {validationSummary.warningCount} warning{validationSummary.warningCount !== 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* Dirty indicator */}
        {state.isDirty && (
          <span className="text-xs text-slate-500 dark:text-dark-text-tertiary">
            Unsaved changes
          </span>
        )}

        {/* Conflict indicator */}
        {state.hasConflict && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-red-600 dark:text-red-400 font-medium">
              Sync conflict detected
            </span>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="xs"
                onClick={() => onResolveConflict('form')}
              >
                Use Form
              </Button>
              <Button
                variant="ghost"
                size="xs"
                onClick={() => onResolveConflict('yaml')}
              >
                Use YAML
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Right side - Actions */}
      <div className="flex items-center gap-2">
        {/* Layout toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleLayout}
          title={layout === '2-pane' ? 'Switch to 3-pane' : 'Switch to 2-pane'}
        >
          {layout === '2-pane' ? (
            <Columns3 className="w-4 h-4" />
          ) : (
            <Columns2 className="w-4 h-4" />
          )}
        </Button>

        {/* Preview toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onTogglePreview}
          title={showPreview ? 'Hide preview' : 'Show preview'}
        >
          {showPreview ? (
            <Eye className="w-4 h-4" />
          ) : (
            <EyeOff className="w-4 h-4" />
          )}
        </Button>

        {/* Settings */}
        <Button variant="ghost" size="sm" title="Preview settings">
          <Settings2 className="w-4 h-4" />
        </Button>

        {/* Divider */}
        <div className="w-px h-6 bg-slate-200 dark:bg-dark-border-primary mx-1" />

        {/* Reset button */}
        {!readOnly && state.isDirty && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            disabled={isSaving}
          >
            Reset
          </Button>
        )}

        {/* Save button */}
        {!readOnly && (
          <Button
            variant="primary"
            size="sm"
            onClick={onSave}
            loading={isSaving}
            disabled={!validationSummary.isValid || !state.isDirty}
          >
            Save
          </Button>
        )}
      </div>
    </div>
  );
}

// ============================================
// Exports
// ============================================

export default LivePreview;
