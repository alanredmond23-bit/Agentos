/**
 * AgentOS Ops Console - RichTextField Component
 * Multiline text editor for system prompts with character count and formatting
 */

'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Code,
  Quote,
  Undo,
  Redo,
  Copy,
  Check,
  Maximize2,
  Minimize2,
  FileText,
  AlertCircle,
} from 'lucide-react';

// ============================================
// Types
// ============================================

interface RichTextFieldProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
  error?: string;
  disabled?: boolean;
  readOnly?: boolean;
  minHeight?: number;
  maxHeight?: number;
  showCharacterCount?: boolean;
  maxCharacters?: number;
  showToolbar?: boolean;
  expandable?: boolean;
  required?: boolean;
  className?: string;
}

interface TextHistory {
  past: string[];
  future: string[];
}

// ============================================
// RichTextField Component
// ============================================

export function RichTextField({
  label,
  value,
  onChange,
  placeholder = 'Enter text...',
  hint,
  error,
  disabled = false,
  readOnly = false,
  minHeight = 150,
  maxHeight = 400,
  showCharacterCount = true,
  maxCharacters,
  showToolbar = true,
  expandable = true,
  required = false,
  className,
}: RichTextFieldProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [history, setHistory] = useState<TextHistory>({ past: [], future: [] });
  const [isFocused, setIsFocused] = useState(false);

  // Calculate character stats
  const characterCount = value.length;
  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;
  const lineCount = value.split('\n').length;
  const isOverLimit = maxCharacters ? characterCount > maxCharacters : false;
  const characterPercentage = maxCharacters ? (characterCount / maxCharacters) * 100 : 0;

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

  // Handle text change with history
  const handleChange = useCallback(
    (newValue: string) => {
      setHistory((prev) => ({
        past: [...prev.past.slice(-50), value],
        future: [],
      }));
      onChange(newValue);
    },
    [value, onChange]
  );

  // Undo
  const handleUndo = useCallback(() => {
    if (history.past.length === 0) return;
    const previous = history.past[history.past.length - 1];
    setHistory((prev) => ({
      past: prev.past.slice(0, -1),
      future: [value, ...prev.future],
    }));
    onChange(previous);
  }, [history, value, onChange]);

  // Redo
  const handleRedo = useCallback(() => {
    if (history.future.length === 0) return;
    const next = history.future[0];
    setHistory((prev) => ({
      past: [...prev.past, value],
      future: prev.future.slice(1),
    }));
    onChange(next);
  }, [history, value, onChange]);

  // Insert formatting
  const insertFormatting = useCallback(
    (prefix: string, suffix: string = prefix) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = value.substring(start, end);

      const newValue =
        value.substring(0, start) +
        prefix +
        selectedText +
        suffix +
        value.substring(end);

      handleChange(newValue);

      // Set cursor position
      setTimeout(() => {
        textarea.focus();
        const newStart = start + prefix.length;
        const newEnd = newStart + selectedText.length;
        textarea.setSelectionRange(newStart, newEnd);
      }, 0);
    },
    [value, handleChange]
  );

  // Insert list
  const insertList = useCallback(
    (ordered: boolean) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const lineStart = value.lastIndexOf('\n', start - 1) + 1;
      const prefix = ordered ? '1. ' : '- ';

      const newValue =
        value.substring(0, lineStart) +
        prefix +
        value.substring(lineStart);

      handleChange(newValue);
    },
    [value, handleChange]
  );

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

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.metaKey || e.ctrlKey) {
        switch (e.key) {
          case 'b':
            e.preventDefault();
            insertFormatting('**');
            break;
          case 'i':
            e.preventDefault();
            insertFormatting('*');
            break;
          case 'z':
            e.preventDefault();
            if (e.shiftKey) {
              handleRedo();
            } else {
              handleUndo();
            }
            break;
          case 'y':
            e.preventDefault();
            handleRedo();
            break;
        }
      }

      // Tab for indentation
      if (e.key === 'Tab') {
        e.preventDefault();
        const target = e.target as HTMLTextAreaElement;
        const start = target.selectionStart;
        const end = target.selectionEnd;
        const newValue = value.substring(0, start) + '  ' + value.substring(end);
        handleChange(newValue);

        setTimeout(() => {
          target.selectionStart = target.selectionEnd = start + 2;
        }, 0);
      }
    },
    [value, handleChange, handleUndo, handleRedo, insertFormatting]
  );

  return (
    <div className={cn('w-full', className)}>
      {/* Label */}
      {label && (
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-sm font-medium text-slate-700 dark:text-dark-text-secondary">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <div className="flex items-center gap-2">
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
            <button
              type="button"
              onClick={handleCopy}
              disabled={!value}
              className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-dark-text-primary dark:hover:bg-dark-bg-tertiary disabled:opacity-50"
            >
              {copied ? (
                <Check className="w-4 h-4 text-emerald-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* Editor Container */}
      <div
        className={cn(
          'rounded-lg overflow-hidden',
          'border border-slate-300 dark:border-dark-border-primary',
          'bg-white dark:bg-dark-bg-secondary',
          isFocused && 'ring-2 ring-brand-500 border-brand-500',
          error && 'border-red-500',
          isOverLimit && 'border-amber-500',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        {/* Toolbar */}
        {showToolbar && !disabled && !readOnly && (
          <div className="flex items-center gap-1 px-2 py-1.5 border-b border-slate-200 dark:border-dark-border-primary bg-slate-50 dark:bg-dark-bg-tertiary">
            <button
              type="button"
              onClick={() => insertFormatting('**')}
              className="p-1.5 rounded text-slate-500 hover:text-slate-700 hover:bg-slate-200 dark:hover:text-dark-text-primary dark:hover:bg-dark-bg-elevated"
              title="Bold (Cmd+B)"
            >
              <Bold className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('*')}
              className="p-1.5 rounded text-slate-500 hover:text-slate-700 hover:bg-slate-200 dark:hover:text-dark-text-primary dark:hover:bg-dark-bg-elevated"
              title="Italic (Cmd+I)"
            >
              <Italic className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('`')}
              className="p-1.5 rounded text-slate-500 hover:text-slate-700 hover:bg-slate-200 dark:hover:text-dark-text-primary dark:hover:bg-dark-bg-elevated"
              title="Inline Code"
            >
              <Code className="w-4 h-4" />
            </button>

            <div className="w-px h-5 bg-slate-300 dark:bg-dark-border-primary mx-1" />

            <button
              type="button"
              onClick={() => insertList(false)}
              className="p-1.5 rounded text-slate-500 hover:text-slate-700 hover:bg-slate-200 dark:hover:text-dark-text-primary dark:hover:bg-dark-bg-elevated"
              title="Bullet List"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => insertList(true)}
              className="p-1.5 rounded text-slate-500 hover:text-slate-700 hover:bg-slate-200 dark:hover:text-dark-text-primary dark:hover:bg-dark-bg-elevated"
              title="Numbered List"
            >
              <ListOrdered className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('\n> ', '\n')}
              className="p-1.5 rounded text-slate-500 hover:text-slate-700 hover:bg-slate-200 dark:hover:text-dark-text-primary dark:hover:bg-dark-bg-elevated"
              title="Quote"
            >
              <Quote className="w-4 h-4" />
            </button>

            <div className="w-px h-5 bg-slate-300 dark:bg-dark-border-primary mx-1" />

            <button
              type="button"
              onClick={handleUndo}
              disabled={history.past.length === 0}
              className="p-1.5 rounded text-slate-500 hover:text-slate-700 hover:bg-slate-200 dark:hover:text-dark-text-primary dark:hover:bg-dark-bg-elevated disabled:opacity-30"
              title="Undo (Cmd+Z)"
            >
              <Undo className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={history.future.length === 0}
              className="p-1.5 rounded text-slate-500 hover:text-slate-700 hover:bg-slate-200 dark:hover:text-dark-text-primary dark:hover:bg-dark-bg-elevated disabled:opacity-30"
              title="Redo (Cmd+Shift+Z)"
            >
              <Redo className="w-4 h-4" />
            </button>

            <div className="flex-1" />

            {/* Stats */}
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span>{wordCount} words</span>
              <span>{lineCount} lines</span>
            </div>
          </div>
        )}

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          spellCheck
          className={cn(
            'w-full p-3 text-sm leading-relaxed resize-none',
            'bg-transparent',
            'text-slate-900 dark:text-dark-text-primary',
            'placeholder:text-slate-400 dark:placeholder:text-dark-text-muted',
            'focus:outline-none',
            disabled && 'cursor-not-allowed',
            readOnly && 'cursor-default'
          )}
          style={{
            minHeight: isExpanded ? undefined : minHeight,
          }}
        />

        {/* Character Count Bar */}
        {showCharacterCount && (
          <div className="px-3 py-2 border-t border-slate-200 dark:border-dark-border-primary bg-slate-50 dark:bg-dark-bg-tertiary">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-400" />
                <span
                  className={cn(
                    'text-sm',
                    isOverLimit
                      ? 'text-red-600 dark:text-red-400 font-medium'
                      : 'text-slate-500 dark:text-dark-text-tertiary'
                  )}
                >
                  {characterCount.toLocaleString()}
                  {maxCharacters && ` / ${maxCharacters.toLocaleString()}`}
                  {' characters'}
                </span>
                {isOverLimit && (
                  <AlertCircle className="w-4 h-4 text-red-500" />
                )}
              </div>

              {maxCharacters && (
                <div className="flex items-center gap-2">
                  <div className="w-24 h-1.5 rounded-full bg-slate-200 dark:bg-dark-bg-elevated overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        characterPercentage > 100
                          ? 'bg-red-500'
                          : characterPercentage > 90
                          ? 'bg-amber-500'
                          : characterPercentage > 75
                          ? 'bg-blue-500'
                          : 'bg-emerald-500'
                      )}
                      style={{ width: `${Math.min(characterPercentage, 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-400">
                    {Math.round(characterPercentage)}%
                  </span>
                </div>
              )}
            </div>

            {/* Token estimate */}
            <div className="mt-1 text-xs text-slate-400">
              Estimated tokens: ~{Math.ceil(characterCount / 4).toLocaleString()}
            </div>
          </div>
        )}
      </div>

      {/* Error/Hint */}
      {error && (
        <p className="mt-1.5 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
          <AlertCircle className="w-4 h-4" />
          {error}
        </p>
      )}
      {hint && !error && (
        <p className="mt-1.5 text-sm text-slate-500 dark:text-dark-text-tertiary">{hint}</p>
      )}
    </div>
  );
}

export default RichTextField;
