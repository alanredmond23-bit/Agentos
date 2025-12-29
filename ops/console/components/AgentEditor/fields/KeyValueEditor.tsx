/**
 * AgentOS Ops Console - KeyValueEditor Component
 * Dynamic key-value pair editor with validation and type hints
 */

'use client';

import React, { useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Plus, Trash2, GripVertical, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

// ============================================
// Types
// ============================================

export interface KeyValuePair {
  id: string;
  key: string;
  value: string;
  type?: 'string' | 'number' | 'boolean' | 'json';
}

interface KeyValueEditorProps {
  label?: string;
  value: KeyValuePair[];
  onChange: (value: KeyValuePair[]) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  keyLabel?: string;
  valueLabel?: string;
  hint?: string;
  error?: string;
  disabled?: boolean;
  showTypes?: boolean;
  allowDuplicateKeys?: boolean;
  validateKey?: (key: string) => string | undefined;
  validateValue?: (value: string, type?: string) => string | undefined;
  maxPairs?: number;
  className?: string;
}

// ============================================
// Utility Functions
// ============================================

function generateId(): string {
  return `kv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================
// KeyValueEditor Component
// ============================================

export function KeyValueEditor({
  label,
  value,
  onChange,
  keyPlaceholder = 'Key',
  valuePlaceholder = 'Value',
  keyLabel = 'Key',
  valueLabel = 'Value',
  hint,
  error,
  disabled = false,
  showTypes = false,
  allowDuplicateKeys = false,
  validateKey,
  validateValue,
  maxPairs,
  className,
}: KeyValueEditorProps) {
  // Add a new pair
  const addPair = useCallback(() => {
    if (maxPairs && value.length >= maxPairs) return;

    onChange([
      ...value,
      { id: generateId(), key: '', value: '', type: 'string' },
    ]);
  }, [value, onChange, maxPairs]);

  // Remove a pair
  const removePair = useCallback(
    (id: string) => {
      onChange(value.filter((pair) => pair.id !== id));
    },
    [value, onChange]
  );

  // Update a pair
  const updatePair = useCallback(
    (id: string, field: keyof KeyValuePair, newValue: string) => {
      onChange(
        value.map((pair) =>
          pair.id === id ? { ...pair, [field]: newValue } : pair
        )
      );
    },
    [value, onChange]
  );

  // Check for duplicate keys
  const getDuplicateKeys = (): Set<string> => {
    if (allowDuplicateKeys) return new Set();

    const keys = value.map((p) => p.key).filter(Boolean);
    const duplicates = new Set<string>();
    const seen = new Set<string>();

    keys.forEach((key) => {
      if (seen.has(key)) {
        duplicates.add(key);
      }
      seen.add(key);
    });

    return duplicates;
  };

  const duplicateKeys = getDuplicateKeys();

  return (
    <div className={cn('w-full', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        {label && (
          <label className="text-sm font-medium text-slate-700 dark:text-dark-text-secondary">
            {label}
            {maxPairs && (
              <span className="ml-2 text-slate-400 font-normal">
                ({value.length}/{maxPairs})
              </span>
            )}
          </label>
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={addPair}
          disabled={disabled || (maxPairs ? value.length >= maxPairs : false)}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Add
        </Button>
      </div>

      {/* Column Headers */}
      {value.length > 0 && (
        <div className="grid grid-cols-12 gap-2 mb-2 px-1">
          <div className="col-span-1" /> {/* Drag handle space */}
          <div className="col-span-4 text-xs font-medium text-slate-500 dark:text-dark-text-tertiary uppercase tracking-wider">
            {keyLabel}
          </div>
          <div className={cn('text-xs font-medium text-slate-500 dark:text-dark-text-tertiary uppercase tracking-wider', showTypes ? 'col-span-4' : 'col-span-6')}>
            {valueLabel}
          </div>
          {showTypes && (
            <div className="col-span-2 text-xs font-medium text-slate-500 dark:text-dark-text-tertiary uppercase tracking-wider">
              Type
            </div>
          )}
          <div className="col-span-1" /> {/* Delete button space */}
        </div>
      )}

      {/* Key-Value Pairs */}
      <div className="space-y-2">
        {value.map((pair, index) => {
          const keyError = validateKey?.(pair.key);
          const valueError = validateValue?.(pair.value, pair.type);
          const isDuplicate = duplicateKeys.has(pair.key);

          return (
            <div
              key={pair.id}
              className={cn(
                'grid grid-cols-12 gap-2 items-start p-2 rounded-lg',
                'bg-slate-50 dark:bg-dark-bg-tertiary',
                'border border-slate-200 dark:border-dark-border-primary',
                (keyError || valueError || isDuplicate) &&
                  'border-red-300 dark:border-red-500/50'
              )}
            >
              {/* Drag Handle */}
              <div className="col-span-1 flex items-center justify-center py-2">
                <GripVertical className="w-4 h-4 text-slate-400 cursor-grab" />
              </div>

              {/* Key Input */}
              <div className="col-span-4">
                <input
                  type="text"
                  value={pair.key}
                  onChange={(e) => updatePair(pair.id, 'key', e.target.value)}
                  placeholder={keyPlaceholder}
                  disabled={disabled}
                  className={cn(
                    'w-full px-3 py-2 text-sm rounded-md',
                    'bg-white dark:bg-dark-bg-secondary',
                    'border border-slate-300 dark:border-dark-border-secondary',
                    'text-slate-900 dark:text-dark-text-primary',
                    'placeholder:text-slate-400 dark:placeholder:text-dark-text-muted',
                    'focus:outline-none focus:ring-2 focus:ring-brand-500',
                    (keyError || isDuplicate) && 'border-red-500',
                    disabled && 'opacity-50 cursor-not-allowed'
                  )}
                />
                {(keyError || isDuplicate) && (
                  <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {isDuplicate ? 'Duplicate key' : keyError}
                  </p>
                )}
              </div>

              {/* Value Input */}
              <div className={showTypes ? 'col-span-4' : 'col-span-6'}>
                <input
                  type={pair.type === 'number' ? 'number' : 'text'}
                  value={pair.value}
                  onChange={(e) => updatePair(pair.id, 'value', e.target.value)}
                  placeholder={valuePlaceholder}
                  disabled={disabled}
                  className={cn(
                    'w-full px-3 py-2 text-sm rounded-md',
                    'bg-white dark:bg-dark-bg-secondary',
                    'border border-slate-300 dark:border-dark-border-secondary',
                    'text-slate-900 dark:text-dark-text-primary',
                    'placeholder:text-slate-400 dark:placeholder:text-dark-text-muted',
                    'focus:outline-none focus:ring-2 focus:ring-brand-500',
                    valueError && 'border-red-500',
                    disabled && 'opacity-50 cursor-not-allowed'
                  )}
                />
                {valueError && (
                  <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {valueError}
                  </p>
                )}
              </div>

              {/* Type Selector */}
              {showTypes && (
                <div className="col-span-2">
                  <select
                    value={pair.type || 'string'}
                    onChange={(e) => updatePair(pair.id, 'type', e.target.value)}
                    disabled={disabled}
                    className={cn(
                      'w-full px-2 py-2 text-sm rounded-md',
                      'bg-white dark:bg-dark-bg-secondary',
                      'border border-slate-300 dark:border-dark-border-secondary',
                      'text-slate-900 dark:text-dark-text-primary',
                      'focus:outline-none focus:ring-2 focus:ring-brand-500',
                      disabled && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <option value="string">String</option>
                    <option value="number">Number</option>
                    <option value="boolean">Boolean</option>
                    <option value="json">JSON</option>
                  </select>
                </div>
              )}

              {/* Delete Button */}
              <div className="col-span-1 flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => removePair(pair.id)}
                  disabled={disabled}
                  className={cn(
                    'p-2 rounded-md transition-colors',
                    'text-slate-400 hover:text-red-500 hover:bg-red-50',
                    'dark:hover:text-red-400 dark:hover:bg-red-500/10',
                    disabled && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {value.length === 0 && (
        <div className="text-center py-8 border-2 border-dashed border-slate-200 dark:border-dark-border-primary rounded-lg">
          <p className="text-sm text-slate-500 dark:text-dark-text-tertiary mb-2">
            No key-value pairs defined
          </p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={addPair}
            disabled={disabled}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Add First Pair
          </Button>
        </div>
      )}

      {/* Error/Hint */}
      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      {hint && !error && (
        <p className="mt-2 text-sm text-slate-500 dark:text-dark-text-tertiary">{hint}</p>
      )}
    </div>
  );
}

export default KeyValueEditor;
