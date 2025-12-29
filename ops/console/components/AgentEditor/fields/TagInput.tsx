/**
 * AgentOS Ops Console - TagInput Component
 * Multi-value tag input field with validation and suggestions
 */

import React, { useState, useRef, KeyboardEvent } from 'react';
import { useFormContext, Controller } from 'react-hook-form';
import { cn } from '@/lib/utils';
import { InfoTooltip } from '@/components/ui/Tooltip';
import { X, Plus } from 'lucide-react';

// ============================================
// TagInput Types
// ============================================

export interface TagInputProps {
  name: string;
  label: string;
  placeholder?: string;
  helpText?: string;
  required?: boolean;
  disabled?: boolean;
  suggestions?: string[];
  maxTags?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  patternMessage?: string;
  allowDuplicates?: boolean;
  className?: string;
}

// ============================================
// TagInput Component
// ============================================

export function TagInput({
  name,
  label,
  placeholder = 'Type and press Enter',
  helpText,
  required = false,
  disabled = false,
  suggestions = [],
  maxTags,
  minLength = 1,
  maxLength = 50,
  pattern,
  patternMessage,
  allowDuplicates = false,
  className,
}: TagInputProps) {
  const { control, formState: { errors }, setError, clearErrors } = useFormContext();
  const fieldError = errors[name];
  const errorMessage = fieldError?.message as string | undefined;
  const inputId = `field-${name}`;

  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateTag = (value: string, currentTags: string[]): string | null => {
    const trimmed = value.trim();

    if (trimmed.length < minLength) {
      return `Tag must be at least ${minLength} character${minLength > 1 ? 's' : ''}`;
    }

    if (trimmed.length > maxLength) {
      return `Tag must be at most ${maxLength} characters`;
    }

    if (pattern && !pattern.test(trimmed)) {
      return patternMessage || 'Invalid tag format';
    }

    if (!allowDuplicates && currentTags.includes(trimmed)) {
      return 'Duplicate tag';
    }

    if (maxTags && currentTags.length >= maxTags) {
      return `Maximum ${maxTags} tags allowed`;
    }

    return null;
  };

  const addTag = (value: string, currentTags: string[], onChange: (value: string[]) => void) => {
    const trimmed = value.trim();
    const validationError = validateTag(trimmed, currentTags);

    if (validationError) {
      setError(name, { type: 'manual', message: validationError });
      return false;
    }

    clearErrors(name);
    onChange([...currentTags, trimmed]);
    setInputValue('');
    return true;
  };

  const removeTag = (index: number, currentTags: string[], onChange: (value: string[]) => void) => {
    const newTags = currentTags.filter((_, i) => i !== index);
    onChange(newTags);
    clearErrors(name);
  };

  const handleKeyDown = (
    e: KeyboardEvent<HTMLInputElement>,
    currentTags: string[],
    onChange: (value: string[]) => void
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (inputValue.trim()) {
        addTag(inputValue, currentTags, onChange);
      }
    } else if (e.key === 'Backspace' && !inputValue && currentTags.length > 0) {
      removeTag(currentTags.length - 1, currentTags, onChange);
    }
  };

  const filteredSuggestions = suggestions.filter(
    s => s.toLowerCase().includes(inputValue.toLowerCase()) && inputValue.length > 0
  );

  return (
    <div className={cn('w-full', className)}>
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

      {/* Tag Input Container */}
      <Controller
        name={name}
        control={control}
        rules={{
          validate: (value) => {
            if (required && (!value || value.length === 0)) {
              return `At least one ${label.toLowerCase()} is required`;
            }
            return true;
          },
        }}
        render={({ field }) => {
          const tags: string[] = field.value || [];

          return (
            <div className="relative">
              <div
                onClick={() => inputRef.current?.focus()}
                className={cn(
                  'input min-h-[42px] h-auto flex flex-wrap gap-1.5 py-1.5 cursor-text',
                  errorMessage && 'input-error',
                  disabled && 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-dark-bg-primary'
                )}
              >
                {/* Tags */}
                {tags.map((tag, index) => (
                  <span
                    key={`${tag}-${index}`}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-brand-100 dark:bg-brand-500/20 text-brand-700 dark:text-brand-300 text-sm"
                  >
                    {tag}
                    {!disabled && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeTag(index, tags, field.onChange);
                        }}
                        className="p-0.5 rounded hover:bg-brand-200 dark:hover:bg-brand-500/30 transition-colors"
                        aria-label={`Remove ${tag}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </span>
                ))}

                {/* Input */}
                {!disabled && (!maxTags || tags.length < maxTags) && (
                  <input
                    ref={inputRef}
                    type="text"
                    id={inputId}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, tags, field.onChange)}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                    placeholder={tags.length === 0 ? placeholder : ''}
                    className="flex-1 min-w-[120px] bg-transparent border-0 outline-none text-sm text-slate-700 dark:text-dark-text-primary placeholder:text-slate-400 dark:placeholder:text-dark-text-muted"
                    aria-invalid={!!errorMessage}
                  />
                )}
              </div>

              {/* Suggestions Dropdown */}
              {showSuggestions && filteredSuggestions.length > 0 && (
                <ul className="absolute z-50 w-full mt-1 bg-white dark:bg-dark-bg-secondary border border-slate-200 dark:border-dark-border-primary rounded-lg shadow-lg max-h-40 overflow-y-auto py-1">
                  {filteredSuggestions.map((suggestion) => (
                    <li
                      key={suggestion}
                      onClick={() => {
                        addTag(suggestion, tags, field.onChange);
                        inputRef.current?.focus();
                      }}
                      className="px-3 py-1.5 text-sm cursor-pointer flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-dark-bg-tertiary text-slate-700 dark:text-dark-text-primary"
                    >
                      <Plus className="w-3.5 h-3.5 text-slate-400" />
                      {suggestion}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        }}
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

      {/* Tag Count */}
      {maxTags && (
        <Controller
          name={name}
          control={control}
          render={({ field }) => (
            <p className="mt-1 text-xs text-slate-400 dark:text-dark-text-muted text-right">
              {(field.value?.length || 0)} / {maxTags} tags
            </p>
          )}
        />
      )}
    </div>
  );
}

export default TagInput;
