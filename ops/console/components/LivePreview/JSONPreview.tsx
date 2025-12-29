/**
 * AgentOS Studio - JSON Preview Component
 * Read-only JSON output preview with syntax highlighting
 */

'use client';

import React, { useMemo, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import Editor from '@monaco-editor/react';
import { type ValidationResult } from '@/lib/studio/formYamlSync';
import {
  FileJson,
  Copy,
  Check,
  Download,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

// ============================================
// Types
// ============================================

export interface JSONPreviewProps {
  jsonContent: string;
  validation: ValidationResult;
  className?: string;
  showActions?: boolean;
  title?: string;
}

// ============================================
// JSON Preview Component
// ============================================

export function JSONPreview({
  jsonContent,
  validation,
  className,
  showActions = true,
  title = 'JSON Output',
}: JSONPreviewProps) {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Parse JSON for validation
  const parsedJson = useMemo(() => {
    try {
      return JSON.parse(jsonContent);
    } catch {
      return null;
    }
  }, [jsonContent]);

  // Copy to clipboard handler
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(jsonContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }, [jsonContent]);

  // Download handler
  const handleDownload = useCallback(() => {
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'agent-config.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [jsonContent]);

  // Toggle expand/collapse
  const handleToggleExpand = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  return (
    <div className={cn(
      'h-full flex flex-col bg-slate-900',
      isExpanded && 'fixed inset-0 z-50',
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <FileJson className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-medium text-slate-300">
            {title}
          </span>
          {parsedJson && (
            <span className="text-xs text-slate-500">
              (readonly)
            </span>
          )}
        </div>

        {showActions && (
          <div className="flex items-center gap-1">
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
              title="Download JSON"
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
          language="json"
          value={jsonContent}
          options={{
            readOnly: true,
            minimap: { enabled: false },
            fontSize: 13,
            fontFamily: 'JetBrains Mono, monospace',
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            automaticLayout: true,
            tabSize: 2,
            theme: 'vs-dark',
            folding: true,
            renderLineHighlight: 'none',
            scrollbar: {
              vertical: 'auto',
              horizontal: 'auto',
              verticalScrollbarSize: 10,
              horizontalScrollbarSize: 10,
            },
            domReadOnly: true,
            cursorStyle: 'line',
            cursorBlinking: 'solid',
          }}
        />
      </div>

      {/* Footer with stats */}
      <div className="flex items-center justify-between px-4 py-1.5 border-t border-slate-700 bg-slate-800/50">
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span>
            {jsonContent.split('\n').length} lines
          </span>
          <span>
            {(new Blob([jsonContent]).size / 1024).toFixed(1)} KB
          </span>
        </div>
        <div className="flex items-center gap-2">
          {validation.isValid ? (
            <span className="text-xs text-emerald-400">Valid</span>
          ) : (
            <span className="text-xs text-red-400">
              {validation.errors.length} errors
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// Exports
// ============================================

export default JSONPreview;
