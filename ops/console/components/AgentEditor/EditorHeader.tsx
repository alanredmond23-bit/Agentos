/**
 * AgentOS Ops Console - EditorHeader Component
 * Header with save/cancel actions and status indicators
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  Save,
  X,
  RotateCcw,
  Eye,
  Code2,
  History,
  MoreHorizontal,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';

// ============================================
// EditorHeader Types
// ============================================

export type EditorMode = 'form' | 'yaml' | 'preview';
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'unsaved';

export interface EditorHeaderProps {
  title?: string;
  subtitle?: string;
  mode: EditorMode;
  onModeChange: (mode: EditorMode) => void;
  saveStatus: SaveStatus;
  isDirty: boolean;
  isValid: boolean;
  onSave: () => void;
  onCancel: () => void;
  onReset?: () => void;
  onShowHistory?: () => void;
  disabled?: boolean;
  className?: string;
}

// ============================================
// EditorHeader Component
// ============================================

export function EditorHeader({
  title = 'Agent Editor',
  subtitle,
  mode,
  onModeChange,
  saveStatus,
  isDirty,
  isValid,
  onSave,
  onCancel,
  onReset,
  onShowHistory,
  disabled = false,
  className,
}: EditorHeaderProps) {
  const getSaveStatusIndicator = () => {
    switch (saveStatus) {
      case 'saving':
        return (
          <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Saving...</span>
          </div>
        );
      case 'saved':
        return (
          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-sm">Saved</span>
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">Save failed</span>
          </div>
        );
      case 'unsaved':
        return (
          <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">Unsaved changes</span>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <header
      className={cn(
        'sticky top-0 z-10 flex items-center justify-between px-6 py-4',
        'bg-white dark:bg-dark-bg-secondary border-b border-slate-200 dark:border-dark-border-primary',
        className
      )}
    >
      {/* Left Section: Title and Status */}
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-dark-text-primary">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-slate-500 dark:text-dark-text-tertiary">
              {subtitle}
            </p>
          )}
        </div>

        {/* Dirty Indicator */}
        {isDirty && (
          <Badge variant="warning" size="sm">
            Modified
          </Badge>
        )}

        {/* Validation Status */}
        {!isValid && (
          <Badge variant="danger" size="sm">
            Has Errors
          </Badge>
        )}
      </div>

      {/* Center Section: Mode Switcher */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-dark-bg-tertiary rounded-lg">
        <button
          type="button"
          onClick={() => onModeChange('form')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
            mode === 'form'
              ? 'bg-white dark:bg-dark-bg-elevated text-slate-900 dark:text-dark-text-primary shadow-sm'
              : 'text-slate-600 dark:text-dark-text-secondary hover:text-slate-900 dark:hover:text-dark-text-primary'
          )}
        >
          <MoreHorizontal className="w-4 h-4" />
          Form
        </button>
        <button
          type="button"
          onClick={() => onModeChange('yaml')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
            mode === 'yaml'
              ? 'bg-white dark:bg-dark-bg-elevated text-slate-900 dark:text-dark-text-primary shadow-sm'
              : 'text-slate-600 dark:text-dark-text-secondary hover:text-slate-900 dark:hover:text-dark-text-primary'
          )}
        >
          <Code2 className="w-4 h-4" />
          YAML
        </button>
        <button
          type="button"
          onClick={() => onModeChange('preview')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
            mode === 'preview'
              ? 'bg-white dark:bg-dark-bg-elevated text-slate-900 dark:text-dark-text-primary shadow-sm'
              : 'text-slate-600 dark:text-dark-text-secondary hover:text-slate-900 dark:hover:text-dark-text-primary'
          )}
        >
          <Eye className="w-4 h-4" />
          Preview
        </button>
      </div>

      {/* Right Section: Actions */}
      <div className="flex items-center gap-3">
        {/* Save Status */}
        {getSaveStatusIndicator()}

        {/* History Button */}
        {onShowHistory && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onShowHistory}
            disabled={disabled}
            leftIcon={<History className="w-4 h-4" />}
          >
            History
          </Button>
        )}

        {/* Reset Button */}
        {onReset && isDirty && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onReset}
            disabled={disabled || saveStatus === 'saving'}
            leftIcon={<RotateCcw className="w-4 h-4" />}
          >
            Reset
          </Button>
        )}

        {/* Cancel Button */}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onCancel}
          disabled={saveStatus === 'saving'}
          leftIcon={<X className="w-4 h-4" />}
        >
          Cancel
        </Button>

        {/* Save Button */}
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={onSave}
          disabled={disabled || !isDirty || !isValid || saveStatus === 'saving'}
          loading={saveStatus === 'saving'}
          loadingText="Saving..."
          leftIcon={<Save className="w-4 h-4" />}
        >
          Save Changes
        </Button>
      </div>
    </header>
  );
}

export default EditorHeader;
