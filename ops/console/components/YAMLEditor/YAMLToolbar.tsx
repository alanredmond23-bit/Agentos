/**
 * AgentOS Studio - YAML Editor Toolbar
 * Toolbar component with format, copy, download, full-screen, and other actions
 */

'use client';

import { useRef, useCallback, memo, useState } from 'react';
import {
  Wand2,
  Copy,
  Download,
  Upload,
  Undo2,
  Redo2,
  Search,
  FoldVertical,
  UnfoldVertical,
  Moon,
  Sun,
  AlertCircle,
  AlertTriangle,
  FileCode2,
  CheckCircle,
  Maximize2,
  Minimize2,
  Map,
  MapOff,
  FileText,
  Code2,
  Check,
  Settings2,
  ChevronDown
} from 'lucide-react';

import { Button, IconButton, ButtonGroup } from '@/components/ui/Button';
import { Tooltip } from '@/components/ui/Tooltip';
import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

export interface YAMLToolbarProps {
  onFormat: () => void;
  onCopy: () => void;
  onDownload: () => void;
  onUpload: (content: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  onFind: () => void;
  onFoldAll: () => void;
  onUnfoldAll: () => void;
  onToggleTheme: () => void;
  onToggleFullScreen?: () => void;
  onToggleMinimap?: () => void;
  onGoToLine?: (line: number) => void;
  theme: 'light' | 'dark';
  hasSelection: boolean;
  errorCount: number;
  warningCount: number;
  cursorPosition: { line: number; column: number };
  lineCount: number;
  readOnly?: boolean;
  isFullScreen?: boolean;
  minimapEnabled?: boolean;
  activeTab?: 'form' | 'yaml';
  onTabChange?: (tab: 'form' | 'yaml') => void;
  agentId?: string;
}

// ============================================
// Toolbar Separator Component
// ============================================

function ToolbarSeparator() {
  return (
    <div className="h-6 w-px bg-slate-200 dark:bg-dark-border-primary mx-1" />
  );
}

// ============================================
// Status Indicator Component
// ============================================

interface StatusIndicatorProps {
  errorCount: number;
  warningCount: number;
}

const StatusIndicator = memo(function StatusIndicator({
  errorCount,
  warningCount
}: StatusIndicatorProps) {
  if (errorCount === 0 && warningCount === 0) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400">
        <CheckCircle className="w-4 h-4" />
        <span className="text-xs font-medium">Valid</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {errorCount > 0 && (
        <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400">
          <AlertCircle className="w-4 h-4" />
          <span className="text-xs font-medium">{errorCount}</span>
        </div>
      )}
      {warningCount > 0 && (
        <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400">
          <AlertTriangle className="w-4 h-4" />
          <span className="text-xs font-medium">{warningCount}</span>
        </div>
      )}
    </div>
  );
});

// ============================================
// Tab Toggle Component
// ============================================

interface TabToggleProps {
  activeTab: 'form' | 'yaml';
  onTabChange: (tab: 'form' | 'yaml') => void;
}

const TabToggle = memo(function TabToggle({ activeTab, onTabChange }: TabToggleProps) {
  return (
    <div className="flex items-center bg-slate-100 dark:bg-dark-bg-tertiary rounded-lg p-0.5">
      <button
        onClick={() => onTabChange('form')}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
          activeTab === 'form'
            ? 'bg-white dark:bg-dark-bg-secondary text-slate-900 dark:text-dark-text-primary shadow-sm'
            : 'text-slate-500 dark:text-dark-text-tertiary hover:text-slate-700 dark:hover:text-dark-text-secondary'
        )}
      >
        <FileText className="w-3.5 h-3.5" />
        Form
      </button>
      <button
        onClick={() => onTabChange('yaml')}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
          activeTab === 'yaml'
            ? 'bg-white dark:bg-dark-bg-secondary text-slate-900 dark:text-dark-text-primary shadow-sm'
            : 'text-slate-500 dark:text-dark-text-tertiary hover:text-slate-700 dark:hover:text-dark-text-secondary'
        )}
      >
        <Code2 className="w-3.5 h-3.5" />
        YAML
      </button>
    </div>
  );
});

// ============================================
// Go To Line Modal Component
// ============================================

interface GoToLineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGoToLine: (line: number) => void;
  lineCount: number;
}

function GoToLineModal({ isOpen, onClose, onGoToLine, lineCount }: GoToLineModalProps) {
  const [lineNumber, setLineNumber] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const line = parseInt(lineNumber, 10);
    if (line >= 1 && line <= lineCount) {
      onGoToLine(line);
      onClose();
      setLineNumber('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-dark-bg-secondary rounded-lg shadow-xl p-4 w-80"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-semibold text-slate-900 dark:text-dark-text-primary mb-3">
          Go to Line
        </h3>
        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="number"
            min={1}
            max={lineCount}
            value={lineNumber}
            onChange={(e) => setLineNumber(e.target.value)}
            placeholder={`Enter line number (1-${lineCount})`}
            className={cn(
              'w-full px-3 py-2 rounded-lg border text-sm',
              'border-slate-200 dark:border-dark-border-primary',
              'bg-white dark:bg-dark-bg-primary',
              'text-slate-900 dark:text-dark-text-primary',
              'placeholder-slate-400 dark:placeholder-dark-text-tertiary',
              'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent'
            )}
            autoFocus
          />
          <div className="flex justify-end gap-2 mt-3">
            <Button variant="ghost" size="sm" onClick={onClose} type="button">
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Go
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================
// Copy Success Toast Component
// ============================================

interface CopyToastProps {
  show: boolean;
}

const CopyToast = memo(function CopyToast({ show }: CopyToastProps) {
  if (!show) return null;

  return (
    <div className={cn(
      'absolute top-12 right-4 flex items-center gap-2 px-3 py-2 rounded-lg',
      'bg-emerald-500 text-white text-sm font-medium shadow-lg',
      'animate-in fade-in slide-in-from-top-2 duration-200'
    )}>
      <Check className="w-4 h-4" />
      Copied!
    </div>
  );
});

// ============================================
// Editor Settings Dropdown
// ============================================

interface EditorSettingsProps {
  minimapEnabled: boolean;
  onToggleMinimap: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

const EditorSettings = memo(function EditorSettings({
  minimapEnabled,
  onToggleMinimap,
  theme,
  onToggleTheme
}: EditorSettingsProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <Tooltip content="Editor Settings">
        <IconButton
          variant="ghost"
          size="sm"
          icon={<Settings2 className="w-4 h-4" />}
          aria-label="Editor settings"
          onClick={() => setIsOpen(!isOpen)}
        />
      </Tooltip>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className={cn(
            'absolute right-0 top-full mt-1 w-56 z-50',
            'bg-white dark:bg-dark-bg-secondary rounded-lg shadow-xl',
            'border border-slate-200 dark:border-dark-border-primary',
            'py-1'
          )}>
            <button
              onClick={() => {
                onToggleMinimap();
              }}
              className={cn(
                'w-full flex items-center justify-between px-3 py-2',
                'text-sm text-slate-700 dark:text-dark-text-secondary',
                'hover:bg-slate-50 dark:hover:bg-dark-bg-tertiary'
              )}
            >
              <span className="flex items-center gap-2">
                {minimapEnabled ? <Map className="w-4 h-4" /> : <MapOff className="w-4 h-4" />}
                Minimap
              </span>
              <span className={cn(
                'w-8 h-4 rounded-full transition-colors relative',
                minimapEnabled
                  ? 'bg-brand-500'
                  : 'bg-slate-200 dark:bg-dark-bg-tertiary'
              )}>
                <span className={cn(
                  'absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform',
                  minimapEnabled ? 'translate-x-4' : 'translate-x-0.5'
                )} />
              </span>
            </button>

            <button
              onClick={() => {
                onToggleTheme();
              }}
              className={cn(
                'w-full flex items-center justify-between px-3 py-2',
                'text-sm text-slate-700 dark:text-dark-text-secondary',
                'hover:bg-slate-50 dark:hover:bg-dark-bg-tertiary'
              )}
            >
              <span className="flex items-center gap-2">
                {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                Dark Mode
              </span>
              <span className={cn(
                'w-8 h-4 rounded-full transition-colors relative',
                theme === 'dark'
                  ? 'bg-brand-500'
                  : 'bg-slate-200 dark:bg-dark-bg-tertiary'
              )}>
                <span className={cn(
                  'absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform',
                  theme === 'dark' ? 'translate-x-4' : 'translate-x-0.5'
                )} />
              </span>
            </button>
          </div>
        </>
      )}
    </div>
  );
});

// ============================================
// YAML Toolbar Component
// ============================================

export const YAMLToolbar = memo(function YAMLToolbar({
  onFormat,
  onCopy,
  onDownload,
  onUpload,
  onUndo,
  onRedo,
  onFind,
  onFoldAll,
  onUnfoldAll,
  onToggleTheme,
  onToggleFullScreen,
  onToggleMinimap,
  onGoToLine,
  theme,
  hasSelection,
  errorCount,
  warningCount,
  cursorPosition,
  lineCount,
  readOnly = false,
  isFullScreen = false,
  minimapEnabled = true,
  activeTab = 'yaml',
  onTabChange,
  agentId
}: YAMLToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showCopyToast, setShowCopyToast] = useState(false);
  const [showGoToLine, setShowGoToLine] = useState(false);

  // Handle file upload
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      onUpload(content);
    };
    reader.readAsText(file);

    // Reset input so same file can be selected again
    event.target.value = '';
  }, [onUpload]);

  // Trigger file input click
  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Handle copy with toast
  const handleCopy = useCallback(async () => {
    await onCopy();
    setShowCopyToast(true);
    setTimeout(() => setShowCopyToast(false), 2000);
  }, [onCopy]);

  // Handle go to line
  const handleGoToLine = useCallback((line: number) => {
    onGoToLine?.(line);
  }, [onGoToLine]);

  return (
    <div className={cn(
      'relative flex items-center justify-between px-4 py-2',
      'border-b border-slate-200 dark:border-dark-border-primary',
      'bg-slate-50 dark:bg-dark-bg-secondary'
    )}>
      <CopyToast show={showCopyToast} />
      <GoToLineModal
        isOpen={showGoToLine}
        onClose={() => setShowGoToLine(false)}
        onGoToLine={handleGoToLine}
        lineCount={lineCount}
      />

      {/* Left Section: Tab Toggle + Actions */}
      <div className="flex items-center gap-3">
        {/* Tab Toggle */}
        {onTabChange && (
          <>
            <TabToggle activeTab={activeTab} onTabChange={onTabChange} />
            <ToolbarSeparator />
          </>
        )}

        {/* Edit Actions */}
        {!readOnly && (
          <>
            <ButtonGroup>
              <Tooltip content="Undo (Cmd+Z)">
                <IconButton
                  variant="ghost"
                  size="sm"
                  icon={<Undo2 className="w-4 h-4" />}
                  aria-label="Undo"
                  onClick={onUndo}
                />
              </Tooltip>
              <Tooltip content="Redo (Cmd+Shift+Z)">
                <IconButton
                  variant="ghost"
                  size="sm"
                  icon={<Redo2 className="w-4 h-4" />}
                  aria-label="Redo"
                  onClick={onRedo}
                />
              </Tooltip>
            </ButtonGroup>

            <ToolbarSeparator />
          </>
        )}

        {/* Format */}
        {!readOnly && (
          <Tooltip content="Format Document (Alt+Shift+F)">
            <Button
              variant="ghost"
              size="sm"
              onClick={onFormat}
              leftIcon={<Wand2 className="w-4 h-4" />}
            >
              Format
            </Button>
          </Tooltip>
        )}

        <ToolbarSeparator />

        {/* Search */}
        <Tooltip content="Find (Cmd+F)">
          <IconButton
            variant="ghost"
            size="sm"
            icon={<Search className="w-4 h-4" />}
            aria-label="Find"
            onClick={onFind}
          />
        </Tooltip>

        {/* Go to Line */}
        {onGoToLine && (
          <Tooltip content="Go to Line (Cmd+G)">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowGoToLine(true)}
              className="text-xs"
            >
              Go to Line
            </Button>
          </Tooltip>
        )}

        {/* Folding */}
        <ButtonGroup>
          <Tooltip content="Fold All">
            <IconButton
              variant="ghost"
              size="sm"
              icon={<FoldVertical className="w-4 h-4" />}
              aria-label="Fold All"
              onClick={onFoldAll}
            />
          </Tooltip>
          <Tooltip content="Unfold All">
            <IconButton
              variant="ghost"
              size="sm"
              icon={<UnfoldVertical className="w-4 h-4" />}
              aria-label="Unfold All"
              onClick={onUnfoldAll}
            />
          </Tooltip>
        </ButtonGroup>

        <ToolbarSeparator />

        {/* Copy */}
        <Tooltip content={hasSelection ? 'Copy Selection' : 'Copy All'}>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            leftIcon={<Copy className="w-4 h-4" />}
          >
            {hasSelection ? 'Copy' : 'Copy All'}
          </Button>
        </Tooltip>

        {/* Download */}
        <Tooltip content="Download as YAML file">
          <IconButton
            variant="ghost"
            size="sm"
            icon={<Download className="w-4 h-4" />}
            aria-label="Download"
            onClick={onDownload}
          />
        </Tooltip>

        {/* Upload */}
        {!readOnly && (
          <>
            <Tooltip content="Upload YAML file">
              <IconButton
                variant="ghost"
                size="sm"
                icon={<Upload className="w-4 h-4" />}
                aria-label="Upload"
                onClick={handleUploadClick}
              />
            </Tooltip>
            <input
              ref={fileInputRef}
              type="file"
              accept=".yaml,.yml"
              onChange={handleFileSelect}
              className="hidden"
            />
          </>
        )}
      </div>

      {/* Right Section: Status + Controls */}
      <div className="flex items-center gap-4">
        {/* Validation Status */}
        <StatusIndicator errorCount={errorCount} warningCount={warningCount} />

        <ToolbarSeparator />

        {/* File Type Indicator */}
        <div className="flex items-center gap-1.5 text-slate-500 dark:text-dark-text-secondary">
          <FileCode2 className="w-4 h-4" />
          <span className="text-xs font-medium">YAML</span>
        </div>

        <ToolbarSeparator />

        {/* Cursor Position */}
        <button
          onClick={() => setShowGoToLine(true)}
          className="text-xs text-slate-500 dark:text-dark-text-secondary font-mono hover:text-slate-700 dark:hover:text-dark-text-primary"
        >
          Ln {cursorPosition.line}, Col {cursorPosition.column}
        </button>

        {/* Line Count */}
        <div className="text-xs text-slate-500 dark:text-dark-text-secondary">
          {lineCount} lines
        </div>

        {/* Read Only Indicator */}
        {readOnly && (
          <>
            <ToolbarSeparator />
            <div className="px-2 py-0.5 rounded bg-slate-100 dark:bg-dark-bg-tertiary text-slate-500 dark:text-dark-text-secondary text-xs font-medium">
              Read Only
            </div>
          </>
        )}

        <ToolbarSeparator />

        {/* Editor Settings */}
        {onToggleMinimap && (
          <EditorSettings
            minimapEnabled={minimapEnabled}
            onToggleMinimap={onToggleMinimap}
            theme={theme}
            onToggleTheme={onToggleTheme}
          />
        )}

        {/* Full Screen Toggle */}
        {onToggleFullScreen && (
          <Tooltip content={isFullScreen ? 'Exit Full Screen (Esc)' : 'Full Screen (F11)'}>
            <IconButton
              variant="ghost"
              size="sm"
              icon={isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              aria-label={isFullScreen ? 'Exit full screen' : 'Full screen'}
              onClick={onToggleFullScreen}
            />
          </Tooltip>
        )}
      </div>
    </div>
  );
});

export default YAMLToolbar;
