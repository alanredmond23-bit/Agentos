/**
 * AgentOS Ops Console - MultiSelect Field Component
 * Multi-selection dropdown with search, tags display, and keyboard navigation
 */

'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, X, Check, Search } from 'lucide-react';

// ============================================
// Types
// ============================================

export interface MultiSelectOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
  group?: string;
}

interface MultiSelectProps {
  label?: string;
  options: MultiSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  error?: string;
  hint?: string;
  disabled?: boolean;
  searchable?: boolean;
  maxItems?: number;
  className?: string;
}

// ============================================
// MultiSelect Component
// ============================================

export function MultiSelect({
  label,
  options,
  value,
  onChange,
  placeholder = 'Select options...',
  error,
  hint,
  disabled = false,
  searchable = true,
  maxItems,
  className,
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter options based on search query
  const filteredOptions = options.filter(
    (option) =>
      option.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      option.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group options if they have group property
  const groupedOptions = filteredOptions.reduce(
    (acc, option) => {
      const group = option.group || '';
      if (!acc[group]) acc[group] = [];
      acc[group].push(option);
      return acc;
    },
    {} as Record<string, MultiSelectOption[]>
  );

  // Handle option toggle
  const toggleOption = useCallback(
    (optionValue: string) => {
      if (disabled) return;

      const isSelected = value.includes(optionValue);
      if (isSelected) {
        onChange(value.filter((v) => v !== optionValue));
      } else {
        if (maxItems && value.length >= maxItems) return;
        onChange([...value, optionValue]);
      }
    },
    [value, onChange, disabled, maxItems]
  );

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          setHighlightedIndex((prev) =>
            prev < filteredOptions.length - 1 ? prev + 1 : 0
          );
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredOptions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (isOpen && filteredOptions[highlightedIndex]) {
          toggleOption(filteredOptions[highlightedIndex].value);
        } else {
          setIsOpen(true);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSearchQuery('');
        break;
      case 'Backspace':
        if (!searchQuery && value.length > 0) {
          onChange(value.slice(0, -1));
        }
        break;
    }
  };

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset highlighted index when options change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchQuery]);

  const selectedOptions = options.filter((opt) => value.includes(opt.value));

  return (
    <div className={cn('w-full', className)} ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-slate-700 dark:text-dark-text-secondary mb-1.5">
          {label}
          {maxItems && (
            <span className="ml-2 text-slate-400 font-normal">
              ({value.length}/{maxItems})
            </span>
          )}
        </label>
      )}

      <div
        className={cn(
          'relative min-h-[42px] w-full rounded-lg border px-3 py-2',
          'bg-white dark:bg-dark-bg-secondary',
          'border-slate-300 dark:border-dark-border-primary',
          'focus-within:ring-2 focus-within:ring-brand-500 focus-within:border-brand-500',
          error && 'border-red-500 focus-within:ring-red-500',
          disabled && 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-dark-bg-primary'
        )}
        onClick={() => {
          if (!disabled) {
            setIsOpen(true);
            inputRef.current?.focus();
          }
        }}
      >
        <div className="flex flex-wrap gap-1.5 items-center">
          {selectedOptions.map((option) => (
            <span
              key={option.value}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-brand-100 dark:bg-brand-500/20 text-brand-700 dark:text-brand-400 text-sm"
            >
              {option.label}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleOption(option.value);
                }}
                className="hover:bg-brand-200 dark:hover:bg-brand-500/30 rounded p-0.5"
                disabled={disabled}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}

          {searchable && (
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsOpen(true)}
              placeholder={selectedOptions.length === 0 ? placeholder : ''}
              disabled={disabled}
              className={cn(
                'flex-1 min-w-[120px] bg-transparent border-none outline-none',
                'text-sm text-slate-900 dark:text-dark-text-primary',
                'placeholder:text-slate-400 dark:placeholder:text-dark-text-muted'
              )}
            />
          )}

          {!searchable && selectedOptions.length === 0 && (
            <span className="text-sm text-slate-400 dark:text-dark-text-muted">
              {placeholder}
            </span>
          )}
        </div>

        <ChevronDown
          className={cn(
            'absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 transition-transform',
            isOpen && 'rotate-180'
          )}
        />
      </div>

      {/* Dropdown */}
      {isOpen && !disabled && (
        <div className="absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-lg border border-slate-200 dark:border-dark-border-primary bg-white dark:bg-dark-bg-secondary shadow-lg">
          {searchable && (
            <div className="sticky top-0 p-2 border-b border-slate-200 dark:border-dark-border-primary bg-white dark:bg-dark-bg-secondary">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="w-full pl-9 pr-3 py-1.5 text-sm rounded-md border border-slate-200 dark:border-dark-border-primary bg-slate-50 dark:bg-dark-bg-tertiary"
                />
              </div>
            </div>
          )}

          {filteredOptions.length === 0 ? (
            <div className="p-3 text-sm text-slate-500 dark:text-dark-text-tertiary text-center">
              No options found
            </div>
          ) : (
            Object.entries(groupedOptions).map(([group, groupOptions]) => (
              <div key={group}>
                {group && (
                  <div className="px-3 py-1.5 text-xs font-semibold text-slate-500 dark:text-dark-text-tertiary uppercase tracking-wider bg-slate-50 dark:bg-dark-bg-tertiary">
                    {group}
                  </div>
                )}
                {groupOptions.map((option, idx) => {
                  const globalIndex = filteredOptions.indexOf(option);
                  const isSelected = value.includes(option.value);
                  const isHighlighted = globalIndex === highlightedIndex;

                  return (
                    <div
                      key={option.value}
                      onClick={() => !option.disabled && toggleOption(option.value)}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 cursor-pointer',
                        isHighlighted && 'bg-slate-100 dark:bg-dark-bg-tertiary',
                        isSelected && 'bg-brand-50 dark:bg-brand-500/10',
                        option.disabled && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      <div
                        className={cn(
                          'w-4 h-4 rounded border flex items-center justify-center',
                          isSelected
                            ? 'bg-brand-600 border-brand-600'
                            : 'border-slate-300 dark:border-dark-border-secondary'
                        )}
                      >
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-slate-900 dark:text-dark-text-primary">
                          {option.label}
                        </div>
                        {option.description && (
                          <div className="text-xs text-slate-500 dark:text-dark-text-tertiary truncate">
                            {option.description}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      )}

      {error && (
        <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      {hint && !error && (
        <p className="mt-1.5 text-sm text-slate-500 dark:text-dark-text-tertiary">{hint}</p>
      )}
    </div>
  );
}

export default MultiSelect;
