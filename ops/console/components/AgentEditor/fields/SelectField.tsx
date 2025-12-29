/**
 * AgentOS Ops Console - SelectField Component
 * Dropdown select field with validation, search, and custom rendering
 */

import React, { useState, useRef, useEffect } from 'react';
import { useFormContext, Controller } from 'react-hook-form';
import { cn } from '@/lib/utils';
import { InfoTooltip } from '@/components/ui/Tooltip';
import { ChevronDown, Check, Search } from 'lucide-react';

// ============================================
// SelectField Types
// ============================================

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
  icon?: React.ReactNode;
}

export interface SelectFieldProps {
  name: string;
  label: string;
  options: SelectOption[];
  placeholder?: string;
  helpText?: string;
  required?: boolean;
  disabled?: boolean;
  searchable?: boolean;
  multiple?: boolean;
  className?: string;
}

// ============================================
// SelectField Component
// ============================================

export function SelectField({
  name,
  label,
  options,
  placeholder = 'Select an option',
  helpText,
  required = false,
  disabled = false,
  searchable = false,
  multiple = false,
  className,
}: SelectFieldProps) {
  const { control, formState: { errors } } = useFormContext();
  const fieldError = errors[name];
  const errorMessage = fieldError?.message as string | undefined;
  const inputId = `field-${name}`;

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen, searchable]);

  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    option.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getDisplayValue = (value: string | string[] | undefined) => {
    if (!value || (Array.isArray(value) && value.length === 0)) {
      return placeholder;
    }

    if (multiple && Array.isArray(value)) {
      const selectedLabels = value
        .map(v => options.find(o => o.value === v)?.label)
        .filter(Boolean);
      return selectedLabels.length > 0 ? selectedLabels.join(', ') : placeholder;
    }

    const selectedOption = options.find(o => o.value === value);
    return selectedOption?.label || placeholder;
  };

  return (
    <div className={cn('w-full', className)} ref={containerRef}>
      {/* Label Row */}
      <div className="flex items-center gap-1.5 mb-1.5">
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-slate-700 dark:text-dark-text-secondary"
        >
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        {helpText && <InfoTooltip content={helpText} position="top" />}
      </div>

      {/* Select Container */}
      <Controller
        name={name}
        control={control}
        rules={{
          required: required ? `${label} is required` : false,
        }}
        render={({ field }) => (
          <div className="relative">
            {/* Trigger Button */}
            <button
              type="button"
              id={inputId}
              onClick={() => !disabled && setIsOpen(!isOpen)}
              disabled={disabled}
              className={cn(
                'input w-full flex items-center justify-between cursor-pointer',
                errorMessage && 'input-error',
                disabled && 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-dark-bg-primary',
                isOpen && 'ring-2 ring-brand-500 border-brand-500'
              )}
              aria-haspopup="listbox"
              aria-expanded={isOpen}
              aria-invalid={!!errorMessage}
            >
              <span className={cn(
                'truncate',
                (!field.value || (Array.isArray(field.value) && field.value.length === 0)) &&
                  'text-slate-400 dark:text-dark-text-muted'
              )}>
                {getDisplayValue(field.value)}
              </span>
              <ChevronDown
                className={cn(
                  'w-4 h-4 text-slate-400 transition-transform flex-shrink-0 ml-2',
                  isOpen && 'rotate-180'
                )}
              />
            </button>

            {/* Dropdown */}
            {isOpen && (
              <div className="absolute z-50 w-full mt-1 bg-white dark:bg-dark-bg-secondary border border-slate-200 dark:border-dark-border-primary rounded-lg shadow-lg max-h-60 overflow-hidden">
                {/* Search Input */}
                {searchable && (
                  <div className="p-2 border-b border-slate-200 dark:border-dark-border-primary">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        ref={searchInputRef}
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search..."
                        className="input pl-9 py-1.5 text-sm"
                      />
                    </div>
                  </div>
                )}

                {/* Options List */}
                <ul
                  role="listbox"
                  className="overflow-y-auto max-h-48 py-1"
                  aria-labelledby={inputId}
                >
                  {filteredOptions.length === 0 ? (
                    <li className="px-3 py-2 text-sm text-slate-500 dark:text-dark-text-muted">
                      No options found
                    </li>
                  ) : (
                    filteredOptions.map((option) => {
                      const isSelected = multiple
                        ? Array.isArray(field.value) && field.value.includes(option.value)
                        : field.value === option.value;

                      return (
                        <li
                          key={option.value}
                          role="option"
                          aria-selected={isSelected}
                          onClick={() => {
                            if (option.disabled) return;

                            if (multiple) {
                              const currentValue = Array.isArray(field.value) ? field.value : [];
                              const newValue = isSelected
                                ? currentValue.filter(v => v !== option.value)
                                : [...currentValue, option.value];
                              field.onChange(newValue);
                            } else {
                              field.onChange(option.value);
                              setIsOpen(false);
                              setSearchQuery('');
                            }
                          }}
                          className={cn(
                            'px-3 py-2 cursor-pointer flex items-center gap-2',
                            'hover:bg-slate-100 dark:hover:bg-dark-bg-tertiary',
                            isSelected && 'bg-brand-50 dark:bg-brand-500/10',
                            option.disabled && 'opacity-50 cursor-not-allowed'
                          )}
                        >
                          {option.icon && (
                            <span className="flex-shrink-0">{option.icon}</span>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className={cn(
                              'text-sm truncate',
                              isSelected
                                ? 'text-brand-600 dark:text-brand-400 font-medium'
                                : 'text-slate-700 dark:text-dark-text-primary'
                            )}>
                              {option.label}
                            </p>
                            {option.description && (
                              <p className="text-xs text-slate-500 dark:text-dark-text-tertiary truncate">
                                {option.description}
                              </p>
                            )}
                          </div>
                          {isSelected && (
                            <Check className="w-4 h-4 text-brand-600 dark:text-brand-400 flex-shrink-0" />
                          )}
                        </li>
                      );
                    })
                  )}
                </ul>
              </div>
            )}
          </div>
        )}
      />

      {/* Error Message */}
      {errorMessage && (
        <p
          id={`${inputId}-error`}
          className="mt-1.5 text-sm text-red-600 dark:text-red-400"
          role="alert"
        >
          {errorMessage}
        </p>
      )}
    </div>
  );
}

export default SelectField;
