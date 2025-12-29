/**
 * AgentOS Ops Console - CodeField Component
 * Inline code editor with syntax highlighting and line numbers
 */

'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Copy, Check, Maximize2, Minimize2 } from 'lucide-react';

// ============================================
// Types
// ============================================

type CodeLanguage = 'json' | 'javascript' | 'typescript' | 'yaml' | 'python' | 'bash' | 'text';

interface CodeFieldProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  language?: CodeLanguage;
  placeholder?: string;
  hint?: string;
  error?: string;
  disabled?: boolean;
  readOnly?: boolean;
  showLineNumbers?: boolean;
  showCopyButton?: boolean;
  expandable?: boolean;
  minHeight?: number;
  maxHeight?: number;
  className?: string;
}

// ============================================
// Syntax Highlighting (basic)
// ============================================

const languagePatterns: Record<CodeLanguage, { pattern: RegExp; className: string }[]> = {
  json: [
    { pattern: /"[^"]*"(?=\s*:)/g, className: 'text-blue-600 dark:text-blue-400' }, // keys
    { pattern: /"[^"]*"(?!\s*:)/g, className: 'text-emerald-600 dark:text-emerald-400' }, // strings
    { pattern: /\b(true|false|null)\b/g, className: 'text-purple-600 dark:text-purple-400' }, // keywords
    { pattern: /\b\d+\.?\d*\b/g, className: 'text-orange-600 dark:text-orange-400' }, // numbers
  ],
  javascript: [
    { pattern: /\b(const|let|var|function|return|if|else|for|while|class|import|export|from|async|await)\b/g, className: 'text-purple-600 dark:text-purple-400' },
    { pattern: /"[^"]*"|'[^']*'|`[^`]*`/g, className: 'text-emerald-600 dark:text-emerald-400' },
    { pattern: /\/\/.*/g, className: 'text-slate-400 italic' },
    { pattern: /\b\d+\.?\d*\b/g, className: 'text-orange-600 dark:text-orange-400' },
  ],
  typescript: [
    { pattern: /\b(const|let|var|function|return|if|else|for|while|class|import|export|from|async|await|type|interface|extends|implements)\b/g, className: 'text-purple-600 dark:text-purple-400' },
    { pattern: /"[^"]*"|'[^']*'|`[^`]*`/g, className: 'text-emerald-600 dark:text-emerald-400' },
    { pattern: /\/\/.*/g, className: 'text-slate-400 italic' },
    { pattern: /:\s*\w+/g, className: 'text-blue-600 dark:text-blue-400' },
  ],
  yaml: [
    { pattern: /^[\w-]+(?=:)/gm, className: 'text-blue-600 dark:text-blue-400' },
    { pattern: /"[^"]*"|'[^']*'/g, className: 'text-emerald-600 dark:text-emerald-400' },
    { pattern: /#.*/g, className: 'text-slate-400 italic' },
    { pattern: /\b(true|false|null|yes|no)\b/g, className: 'text-purple-600 dark:text-purple-400' },
  ],
  python: [
    { pattern: /\b(def|class|import|from|return|if|elif|else|for|while|try|except|with|as|lambda|and|or|not|in|is)\b/g, className: 'text-purple-600 dark:text-purple-400' },
    { pattern: /"[^"]*"|'[^']*'/g, className: 'text-emerald-600 dark:text-emerald-400' },
    { pattern: /#.*/g, className: 'text-slate-400 italic' },
  ],
  bash: [
    { pattern: /\b(if|then|else|fi|for|do|done|while|case|esac|function|return|export|source)\b/g, className: 'text-purple-600 dark:text-purple-400' },
    { pattern: /"[^"]*"|'[^']*'/g, className: 'text-emerald-600 dark:text-emerald-400' },
    { pattern: /#.*/g, className: 'text-slate-400 italic' },
    { pattern: /\$\w+|\$\{[^}]+\}/g, className: 'text-blue-600 dark:text-blue-400' },
  ],
  text: [],
};

// ============================================
// CodeField Component
// ============================================

export function CodeField({
  label,
  value,
  onChange,
  language = 'text',
  placeholder = 'Enter code...',
  hint,
  error,
  disabled = false,
  readOnly = false,
  showLineNumbers = true,
  showCopyButton = true,
  expandable = true,
  minHeight = 120,
  maxHeight = 400,
  className,
}: CodeFieldProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [lineCount, setLineCount] = useState(1);

  // Calculate line count
  useEffect(() => {
    const lines = value.split('\n').length;
    setLineCount(Math.max(lines, 1));
  }, [value]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      const height = isExpanded
        ? scrollHeight
        : Math.min(Math.max(scrollHeight, minHeight), maxHeight);
      textareaRef.current.style.height = `${height}px`;
    }
  }, [value, isExpanded, minHeight, maxHeight]);

  // Handle copy
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [value]);

  // Handle tab key
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const target = e.target as HTMLTextAreaElement;
        const start = target.selectionStart;
        const end = target.selectionEnd;
        const newValue = value.substring(0, start) + '  ' + value.substring(end);
        onChange(newValue);

        // Set cursor position after state update
        setTimeout(() => {
          target.selectionStart = target.selectionEnd = start + 2;
        }, 0);
      }
    },
    [value, onChange]
  );

  // Line numbers
  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1);

  return (
    <div className={cn('w-full', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-1.5">
        {label && (
          <label className="text-sm font-medium text-slate-700 dark:text-dark-text-secondary">
            {label}
          </label>
        )}
        <div className="flex items-center gap-2">
          {/* Language Badge */}
          <span className="px-2 py-0.5 text-xs font-mono rounded bg-slate-100 dark:bg-dark-bg-tertiary text-slate-600 dark:text-dark-text-secondary">
            {language}
          </span>

          {/* Expand/Collapse */}
          {expandable && (
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-dark-text-primary dark:hover:bg-dark-bg-tertiary"
            >
              {isExpanded ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>
          )}

          {/* Copy Button */}
          {showCopyButton && (
            <button
              type="button"
              onClick={handleCopy}
              className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-dark-text-primary dark:hover:bg-dark-bg-tertiary"
            >
              {copied ? (
                <Check className="w-4 h-4 text-emerald-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Editor Container */}
      <div
        className={cn(
          'relative flex rounded-lg overflow-hidden',
          'border border-slate-300 dark:border-dark-border-primary',
          'bg-slate-50 dark:bg-dark-bg-tertiary',
          error && 'border-red-500',
          disabled && 'opacity-50'
        )}
      >
        {/* Line Numbers */}
        {showLineNumbers && (
          <div className="flex-shrink-0 py-3 px-2 bg-slate-100 dark:bg-dark-bg-elevated border-r border-slate-200 dark:border-dark-border-primary select-none">
            {lineNumbers.map((num) => (
              <div
                key={num}
                className="text-right text-xs font-mono leading-6 text-slate-400 dark:text-dark-text-muted"
              >
                {num}
              </div>
            ))}
          </div>
        )}

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          spellCheck={false}
          className={cn(
            'flex-1 p-3 text-sm font-mono leading-6 resize-none',
            'bg-transparent',
            'text-slate-900 dark:text-dark-text-primary',
            'placeholder:text-slate-400 dark:placeholder:text-dark-text-muted',
            'focus:outline-none',
            disabled && 'cursor-not-allowed',
            readOnly && 'cursor-default'
          )}
          style={{
            minHeight: isExpanded ? undefined : minHeight,
            tabSize: 2,
          }}
        />
      </div>

      {/* Error/Hint */}
      {error && (
        <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      {hint && !error && (
        <p className="mt-1.5 text-sm text-slate-500 dark:text-dark-text-tertiary">{hint}</p>
      )}
    </div>
  );
}

export default CodeField;
