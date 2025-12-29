/**
 * AgentOS Studio - YAML Preview Component
 * Read-only YAML display with syntax highlighting and line-level error markers
 */

'use client';

import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import Editor, { type OnMount } from '@monaco-editor/react';
import { type ValidationResult, type ValidationError } from '@/lib/studio/formYamlSync';
import {
  Code2,
  Copy,
  Check,
  Download,
  Maximize2,
  Minimize2,
  WrapText,
  FileText,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

// ============================================
// Types
// ============================================

export interface YAMLPreviewProps {
  yamlContent: string;
  validation?: ValidationResult;
  className?: string;
  showActions?: boolean;
  showLineNumbers?: boolean;
  showMinimap?: boolean;
  title?: string;
  isSyncing?: boolean;
  isActive?: boolean;
  readOnly?: boolean;
  highlightedLines?: number[];
  onContentChange?: (content: string) => void;
}

interface EditorDecoration {
  range: {
    startLineNumber: number;
    startColumn: number;
    endLineNumber: number;
    endColumn: number;
  };
  options: {
    isWholeLine?: boolean;
    className?: string;
    glyphMarginClassName?: string;
    hoverMessage?: { value: string };
    inlineClassName?: string;
  };
}

// ============================================
// YAML Preview Component
// ============================================

export function YAMLPreview({
  yamlContent,
  validation,
  className,
  showActions = true,
  showLineNumbers = true,
  showMinimap = false,
  title = 'YAML Preview',
  isSyncing = false,
  isActive = false,
  readOnly = true,
  highlightedLines = [],
  onContentChange,
}: YAMLPreviewProps) {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [wordWrap, setWordWrap] = useState(true);
  const editorRef = useRef<any>(null);
  const decorationsRef = useRef<string[]>([]);

  // Calculate line and size stats
  const stats = useMemo(() => {
    const lines = yamlContent.split('\n');
    const bytes = new Blob([yamlContent]).size;
    return {
      lineCount: lines.length,
      size: bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`,
      nonEmptyLines: lines.filter(l => l.trim().length > 0).length,
    };
  }, [yamlContent]);

  // Build error decorations for Monaco editor
  const errorDecorations = useMemo((): EditorDecoration[] => {
    if (!validation) return [];

    const decorations: EditorDecoration[] = [];

    // Add error decorations
    validation.errors.forEach(error => {
      if (error.line !== undefined) {
        decorations.push({
          range: {
            startLineNumber: error.line,
            startColumn: error.column || 1,
            endLineNumber: error.line,
            endColumn: 1000,
          },
          options: {
            isWholeLine: true,
            className: 'yaml-error-line',
            glyphMarginClassName: 'yaml-error-glyph',
            hoverMessage: { value: `Error: ${error.message}` },
          },
        });
      }
    });

    // Add warning decorations
    validation.warnings.forEach(warning => {
      if (warning.line !== undefined) {
        decorations.push({
          range: {
            startLineNumber: warning.line,
            startColumn: warning.column || 1,
            endLineNumber: warning.line,
            endColumn: 1000,
          },
          options: {
            isWholeLine: true,
            className: 'yaml-warning-line',
            glyphMarginClassName: 'yaml-warning-glyph',
            hoverMessage: { value: `Warning: ${warning.message}` },
          },
        });
      }
    });

    // Add highlighted line decorations
    highlightedLines.forEach(lineNum => {
      decorations.push({
        range: {
          startLineNumber: lineNum,
          startColumn: 1,
          endLineNumber: lineNum,
          endColumn: 1000,
        },
        options: {
          isWholeLine: true,
          className: 'yaml-highlighted-line',
        },
      });
    });

    return decorations;
  }, [validation, highlightedLines]);

  // Apply decorations when editor is ready or when decorations change
  useEffect(() => {
    if (editorRef.current) {
      // Clear previous decorations
      if (decorationsRef.current.length > 0) {
        decorationsRef.current = editorRef.current.deltaDecorations(
          decorationsRef.current,
          []
        );
      }

      // Apply new decorations
      if (errorDecorations.length > 0) {
        decorationsRef.current = editorRef.current.deltaDecorations(
          [],
          errorDecorations
        );
      }
    }
  }, [errorDecorations]);

  // Editor mount handler
  const handleEditorMount: OnMount = (editor) => {
    editorRef.current = editor;

    // Apply initial decorations
    if (errorDecorations.length > 0) {
      decorationsRef.current = editor.deltaDecorations([], errorDecorations);
    }
  };

  // Handle content changes (if editable)
  const handleEditorChange = useCallback((value: string | undefined) => {
    if (value !== undefined && onContentChange) {
      onContentChange(value);
    }
  }, [onContentChange]);

  // Copy to clipboard handler
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(yamlContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }, [yamlContent]);

  // Download handler
  const handleDownload = useCallback(() => {
    const blob = new Blob([yamlContent], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'agent.yaml';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [yamlContent]);

  // Toggle word wrap
  const toggleWordWrap = useCallback(() => {
    setWordWrap(prev => !prev);
  }, []);

  // Toggle expand/collapse
  const handleToggleExpand = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  // Validation status
  const validationStatus = useMemo(() => {
    if (!validation) return { status: 'unknown', color: 'slate' };
    if (validation.errors.length > 0) return { status: 'error', color: 'red' };
    if (validation.warnings.length > 0) return { status: 'warning', color: 'amber' };
    return { status: 'valid', color: 'emerald' };
  }, [validation]);

  return (
    <div className={cn(
      'h-full flex flex-col bg-slate-900',
      isExpanded && 'fixed inset-0 z-50',
      className
    )}>
      {/* Header */}
      <div className={cn(
        'flex items-center justify-between px-4 py-2 border-b',
        'border-slate-700',
        isActive && 'bg-brand-900/50'
      )}>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-medium text-slate-300">
              {title}
            </span>
          </div>

          {/* Sync indicator */}
          {isSyncing && (
            <div className="flex items-center gap-1.5">
              <Loader2 className="w-3 h-3 text-blue-400 animate-spin" />
              <span className="text-xs text-blue-400">Syncing...</span>
            </div>
          )}

          {/* Validation status */}
          {validation && !isSyncing && (
            <div className="flex items-center gap-1.5">
              {validationStatus.status === 'valid' ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : validationStatus.status === 'error' ? (
                <AlertCircle className="w-3.5 h-3.5 text-red-400" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span className={cn(
                'text-xs',
                validationStatus.status === 'valid' && 'text-emerald-400',
                validationStatus.status === 'error' && 'text-red-400',
                validationStatus.status === 'warning' && 'text-amber-400'
              )}>
                {validationStatus.status === 'valid'
                  ? 'Valid'
                  : validationStatus.status === 'error'
                    ? `${validation.errors.length} error${validation.errors.length !== 1 ? 's' : ''}`
                    : `${validation.warnings.length} warning${validation.warnings.length !== 1 ? 's' : ''}`}
              </span>
            </div>
          )}

          {/* Active indicator */}
          {isActive && (
            <span className="text-xs text-brand-400 ml-2">Active</span>
          )}
        </div>

        {showActions && (
          <div className="flex items-center gap-1">
            {/* Word wrap toggle */}
            <Button
              variant="ghost"
              size="xs"
              onClick={toggleWordWrap}
              title={wordWrap ? 'Disable word wrap' : 'Enable word wrap'}
              className={cn(
                'text-slate-400 hover:text-slate-200',
                wordWrap && 'text-brand-400'
              )}
            >
              <WrapText className="w-3.5 h-3.5" />
            </Button>

            {/* Copy button */}
            <Button
              variant="ghost"
              size="xs"
              onClick={handleCopy}
              title="Copy to clipboard"
              className="text-slate-400 hover:text-slate-200"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </Button>

            {/* Download button */}
            <Button
              variant="ghost"
              size="xs"
              onClick={handleDownload}
              title="Download YAML"
              className="text-slate-400 hover:text-slate-200"
            >
              <Download className="w-3.5 h-3.5" />
            </Button>

            {/* Expand/Collapse button */}
            <Button
              variant="ghost"
              size="xs"
              onClick={handleToggleExpand}
              title={isExpanded ? 'Collapse' : 'Expand'}
              className="text-slate-400 hover:text-slate-200"
            >
              {isExpanded ? (
                <Minimize2 className="w-3.5 h-3.5" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5" />
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Editor */}
      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          language="yaml"
          value={yamlContent}
          onChange={readOnly ? undefined : handleEditorChange}
          onMount={handleEditorMount}
          options={{
            readOnly,
            minimap: { enabled: showMinimap },
            fontSize: 13,
            fontFamily: 'JetBrains Mono, Menlo, Monaco, monospace',
            lineNumbers: showLineNumbers ? 'on' : 'off',
            scrollBeyondLastLine: false,
            wordWrap: wordWrap ? 'on' : 'off',
            automaticLayout: true,
            tabSize: 2,
            theme: 'vs-dark',
            folding: true,
            foldingStrategy: 'indentation',
            glyphMargin: true,
            renderLineHighlight: readOnly ? 'none' : 'line',
            cursorStyle: readOnly ? 'line' : 'line',
            cursorBlinking: readOnly ? 'solid' : 'blink',
            scrollbar: {
              vertical: 'auto',
              horizontal: 'auto',
              verticalScrollbarSize: 10,
              horizontalScrollbarSize: 10,
            },
            domReadOnly: readOnly,
            contextmenu: !readOnly,
            quickSuggestions: !readOnly,
            parameterHints: { enabled: !readOnly },
            suggestOnTriggerCharacters: !readOnly,
            acceptSuggestionOnEnter: !readOnly ? 'on' : 'off',
          }}
        />
      </div>

      {/* Footer with stats */}
      <div className="flex items-center justify-between px-4 py-1.5 border-t border-slate-700 bg-slate-800/50">
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <FileText className="w-3 h-3" />
            <span>{stats.lineCount} lines</span>
          </div>
          <span>{stats.size}</span>
          {stats.nonEmptyLines !== stats.lineCount && (
            <span className="text-slate-600">
              ({stats.nonEmptyLines} non-empty)
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Error/Warning summary */}
          {validation && (
            <div className="flex items-center gap-2 text-xs">
              {validation.errors.length > 0 && (
                <span className="flex items-center gap-1 text-red-400">
                  <AlertCircle className="w-3 h-3" />
                  {validation.errors.length}
                </span>
              )}
              {validation.warnings.length > 0 && (
                <span className="flex items-center gap-1 text-amber-400">
                  <AlertCircle className="w-3 h-3" />
                  {validation.warnings.length}
                </span>
              )}
              {validation.isValid && validation.warnings.length === 0 && (
                <span className="flex items-center gap-1 text-emerald-400">
                  <CheckCircle2 className="w-3 h-3" />
                  Valid
                </span>
              )}
            </div>
          )}

          {/* Read-only indicator */}
          {readOnly && (
            <span className="text-xs text-slate-500">(read-only)</span>
          )}
        </div>
      </div>

      {/* CSS for custom decorations */}
      <style jsx global>{`
        .yaml-error-line {
          background-color: rgba(239, 68, 68, 0.1);
        }
        .yaml-error-glyph {
          background-color: #ef4444;
          width: 4px !important;
          margin-left: 3px;
          border-radius: 2px;
        }
        .yaml-warning-line {
          background-color: rgba(245, 158, 11, 0.1);
        }
        .yaml-warning-glyph {
          background-color: #f59e0b;
          width: 4px !important;
          margin-left: 3px;
          border-radius: 2px;
        }
        .yaml-highlighted-line {
          background-color: rgba(59, 130, 246, 0.15);
        }
      `}</style>
    </div>
  );
}

// ============================================
// Compact YAML Preview (for smaller displays)
// ============================================

export interface CompactYAMLPreviewProps {
  yamlContent: string;
  maxLines?: number;
  className?: string;
  onExpand?: () => void;
}

export function CompactYAMLPreview({
  yamlContent,
  maxLines = 10,
  className,
  onExpand,
}: CompactYAMLPreviewProps) {
  const lines = yamlContent.split('\n');
  const truncated = lines.length > maxLines;
  const displayContent = truncated
    ? lines.slice(0, maxLines).join('\n') + '\n...'
    : yamlContent;

  return (
    <div className={cn(
      'rounded-lg overflow-hidden border border-slate-700 bg-slate-900',
      className
    )}>
      <pre className="p-3 text-xs font-mono text-slate-300 overflow-x-auto">
        <code>{displayContent}</code>
      </pre>
      {truncated && onExpand && (
        <div className="px-3 py-2 border-t border-slate-700 bg-slate-800/50">
          <Button
            variant="ghost"
            size="xs"
            onClick={onExpand}
            className="text-slate-400 hover:text-slate-200"
          >
            Show all {lines.length} lines
          </Button>
        </div>
      )}
    </div>
  );
}

// ============================================
// Inline YAML Snippet (for embedding)
// ============================================

export interface InlineYAMLSnippetProps {
  yaml: string;
  language?: 'yaml' | 'json';
  className?: string;
}

export function InlineYAMLSnippet({
  yaml,
  language = 'yaml',
  className,
}: InlineYAMLSnippetProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(yaml);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <div className={cn(
      'group relative rounded-md overflow-hidden',
      'border border-slate-200 dark:border-slate-700',
      'bg-slate-50 dark:bg-slate-900',
      className
    )}>
      <pre className="p-3 text-sm font-mono text-slate-700 dark:text-slate-300 overflow-x-auto">
        <code>{yaml}</code>
      </pre>
      <button
        onClick={handleCopy}
        className={cn(
          'absolute top-2 right-2 p-1.5 rounded',
          'bg-slate-200 dark:bg-slate-800',
          'opacity-0 group-hover:opacity-100 transition-opacity',
          'hover:bg-slate-300 dark:hover:bg-slate-700'
        )}
        title="Copy to clipboard"
      >
        {copied ? (
          <Check className="w-3.5 h-3.5 text-emerald-500" />
        ) : (
          <Copy className="w-3.5 h-3.5 text-slate-500" />
        )}
      </button>
    </div>
  );
}

// ============================================
// Exports
// ============================================

export default YAMLPreview;
