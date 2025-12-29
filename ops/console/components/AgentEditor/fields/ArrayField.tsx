/**
 * AgentOS Ops Console - ArrayField Component
 * Dynamic array editor with add/remove, reordering, and validation
 */

'use client';

import React, { useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Plus, Trash2, GripVertical, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/Button';

// ============================================
// Types
// ============================================

export interface ArrayItem {
  id: string;
  value: string;
}

interface ArrayFieldProps {
  label?: string;
  value: ArrayItem[];
  onChange: (value: ArrayItem[]) => void;
  placeholder?: string;
  hint?: string;
  error?: string;
  disabled?: boolean;
  maxItems?: number;
  minItems?: number;
  allowDuplicates?: boolean;
  validateItem?: (value: string) => string | undefined;
  renderItem?: (
    item: ArrayItem,
    index: number,
    onChange: (value: string) => void,
    onRemove: () => void
  ) => React.ReactNode;
  className?: string;
}

// ============================================
// Utility Functions
// ============================================

function generateId(): string {
  return `arr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================
// ArrayField Component
// ============================================

export function ArrayField({
  label,
  value,
  onChange,
  placeholder = 'Enter value...',
  hint,
  error,
  disabled = false,
  maxItems,
  minItems = 0,
  allowDuplicates = true,
  validateItem,
  renderItem,
  className,
}: ArrayFieldProps) {
  // Add a new item
  const addItem = useCallback(() => {
    if (maxItems && value.length >= maxItems) return;

    onChange([...value, { id: generateId(), value: '' }]);
  }, [value, onChange, maxItems]);

  // Remove an item
  const removeItem = useCallback(
    (id: string) => {
      if (value.length <= minItems) return;
      onChange(value.filter((item) => item.id !== id));
    },
    [value, onChange, minItems]
  );

  // Update an item
  const updateItem = useCallback(
    (id: string, newValue: string) => {
      onChange(
        value.map((item) =>
          item.id === id ? { ...item, value: newValue } : item
        )
      );
    },
    [value, onChange]
  );

  // Move item up
  const moveUp = useCallback(
    (index: number) => {
      if (index === 0) return;
      const newValue = [...value];
      [newValue[index - 1], newValue[index]] = [newValue[index], newValue[index - 1]];
      onChange(newValue);
    },
    [value, onChange]
  );

  // Move item down
  const moveDown = useCallback(
    (index: number) => {
      if (index === value.length - 1) return;
      const newValue = [...value];
      [newValue[index], newValue[index + 1]] = [newValue[index + 1], newValue[index]];
      onChange(newValue);
    },
    [value, onChange]
  );

  // Check for duplicates
  const getDuplicates = (): Set<string> => {
    if (allowDuplicates) return new Set();

    const values = value.map((item) => item.value).filter(Boolean);
    const duplicates = new Set<string>();
    const seen = new Set<string>();

    values.forEach((val) => {
      if (seen.has(val)) {
        duplicates.add(val);
      }
      seen.add(val);
    });

    return duplicates;
  };

  const duplicates = getDuplicates();

  return (
    <div className={cn('w-full', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        {label && (
          <label className="text-sm font-medium text-slate-700 dark:text-dark-text-secondary">
            {label}
            {maxItems && (
              <span className="ml-2 text-slate-400 font-normal">
                ({value.length}/{maxItems})
              </span>
            )}
          </label>
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={addItem}
          disabled={disabled || (maxItems ? value.length >= maxItems : false)}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Add Item
        </Button>
      </div>

      {/* Items List */}
      <div className="space-y-2">
        {value.map((item, index) => {
          const itemError = validateItem?.(item.value);
          const isDuplicate = duplicates.has(item.value);
          const canRemove = value.length > minItems;

          // Custom render function
          if (renderItem) {
            return (
              <div key={item.id}>
                {renderItem(
                  item,
                  index,
                  (newValue) => updateItem(item.id, newValue),
                  () => removeItem(item.id)
                )}
              </div>
            );
          }

          // Default render
          return (
            <div
              key={item.id}
              className={cn(
                'flex items-center gap-2 p-2 rounded-lg',
                'bg-slate-50 dark:bg-dark-bg-tertiary',
                'border border-slate-200 dark:border-dark-border-primary',
                (itemError || isDuplicate) && 'border-red-300 dark:border-red-500/50'
              )}
            >
              {/* Drag Handle */}
              <div className="flex-shrink-0 cursor-grab">
                <GripVertical className="w-4 h-4 text-slate-400" />
              </div>

              {/* Index Badge */}
              <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-slate-200 dark:bg-dark-bg-elevated text-xs font-medium text-slate-600 dark:text-dark-text-secondary">
                {index + 1}
              </span>

              {/* Input */}
              <div className="flex-1">
                <input
                  type="text"
                  value={item.value}
                  onChange={(e) => updateItem(item.id, e.target.value)}
                  placeholder={placeholder}
                  disabled={disabled}
                  className={cn(
                    'w-full px-3 py-2 text-sm rounded-md',
                    'bg-white dark:bg-dark-bg-secondary',
                    'border border-slate-300 dark:border-dark-border-secondary',
                    'text-slate-900 dark:text-dark-text-primary',
                    'placeholder:text-slate-400 dark:placeholder:text-dark-text-muted',
                    'focus:outline-none focus:ring-2 focus:ring-brand-500',
                    (itemError || isDuplicate) && 'border-red-500',
                    disabled && 'opacity-50 cursor-not-allowed'
                  )}
                />
                {(itemError || isDuplicate) && (
                  <p className="mt-1 text-xs text-red-500">
                    {isDuplicate ? 'Duplicate value' : itemError}
                  </p>
                )}
              </div>

              {/* Reorder Buttons */}
              <div className="flex flex-col gap-0.5">
                <button
                  type="button"
                  onClick={() => moveUp(index)}
                  disabled={disabled || index === 0}
                  className={cn(
                    'p-1 rounded transition-colors',
                    'text-slate-400 hover:text-slate-600 hover:bg-slate-200',
                    'dark:hover:text-dark-text-primary dark:hover:bg-dark-bg-elevated',
                    (disabled || index === 0) && 'opacity-30 cursor-not-allowed'
                  )}
                >
                  <ChevronUp className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => moveDown(index)}
                  disabled={disabled || index === value.length - 1}
                  className={cn(
                    'p-1 rounded transition-colors',
                    'text-slate-400 hover:text-slate-600 hover:bg-slate-200',
                    'dark:hover:text-dark-text-primary dark:hover:bg-dark-bg-elevated',
                    (disabled || index === value.length - 1) &&
                      'opacity-30 cursor-not-allowed'
                  )}
                >
                  <ChevronDown className="w-3 h-3" />
                </button>
              </div>

              {/* Delete Button */}
              <button
                type="button"
                onClick={() => removeItem(item.id)}
                disabled={disabled || !canRemove}
                className={cn(
                  'p-2 rounded-md transition-colors',
                  'text-slate-400 hover:text-red-500 hover:bg-red-50',
                  'dark:hover:text-red-400 dark:hover:bg-red-500/10',
                  (disabled || !canRemove) && 'opacity-30 cursor-not-allowed'
                )}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {value.length === 0 && (
        <div className="text-center py-8 border-2 border-dashed border-slate-200 dark:border-dark-border-primary rounded-lg">
          <p className="text-sm text-slate-500 dark:text-dark-text-tertiary mb-2">
            No items added yet
          </p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={addItem}
            disabled={disabled}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Add First Item
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

export default ArrayField;
