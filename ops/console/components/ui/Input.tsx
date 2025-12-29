/**
 * AgentOS Ops Console - Input Component
 * Form input with validation states and icons
 */

import React from 'react';
import { cn } from '@/lib/utils';

// ============================================
// Input Types
// ============================================

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  leftAddon?: React.ReactNode;
  rightAddon?: React.ReactNode;
}

// ============================================
// Input Component
// ============================================

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type = 'text',
      label,
      error,
      hint,
      leftIcon,
      rightIcon,
      leftAddon,
      rightAddon,
      disabled,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-slate-700 dark:text-dark-text-secondary mb-1.5"
          >
            {label}
          </label>
        )}

        <div className="relative flex">
          {/* Left Addon */}
          {leftAddon && (
            <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-slate-300 dark:border-dark-border-primary bg-slate-50 dark:bg-dark-bg-tertiary text-slate-500 dark:text-dark-text-tertiary text-sm">
              {leftAddon}
            </span>
          )}

          {/* Input Container */}
          <div className="relative flex-1">
            {/* Left Icon */}
            {leftIcon && (
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-dark-text-muted pointer-events-none">
                {leftIcon}
              </span>
            )}

            <input
              ref={ref}
              id={inputId}
              type={type}
              disabled={disabled}
              className={cn(
                'input',
                leftIcon && 'pl-10',
                rightIcon && 'pr-10',
                leftAddon && 'rounded-l-none',
                rightAddon && 'rounded-r-none',
                error && 'input-error',
                disabled && 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-dark-bg-primary',
                className
              )}
              aria-invalid={error ? 'true' : 'false'}
              aria-describedby={
                error
                  ? `${inputId}-error`
                  : hint
                    ? `${inputId}-hint`
                    : undefined
              }
              {...props}
            />

            {/* Right Icon */}
            {rightIcon && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-dark-text-muted pointer-events-none">
                {rightIcon}
              </span>
            )}
          </div>

          {/* Right Addon */}
          {rightAddon && (
            <span className="inline-flex items-center px-3 rounded-r-lg border border-l-0 border-slate-300 dark:border-dark-border-primary bg-slate-50 dark:bg-dark-bg-tertiary text-slate-500 dark:text-dark-text-tertiary text-sm">
              {rightAddon}
            </span>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <p
            id={`${inputId}-error`}
            className="mt-1.5 text-sm text-red-600 dark:text-red-400"
            role="alert"
          >
            {error}
          </p>
        )}

        {/* Hint Text */}
        {hint && !error && (
          <p
            id={`${inputId}-hint`}
            className="mt-1.5 text-sm text-slate-500 dark:text-dark-text-tertiary"
          >
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

// ============================================
// Search Input Component
// ============================================

import { Search, X } from 'lucide-react';

interface SearchInputProps extends Omit<InputProps, 'leftIcon'> {
  onClear?: () => void;
}

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, value, onClear, ...props }, ref) => {
    return (
      <Input
        ref={ref}
        type="search"
        leftIcon={<Search className="w-4 h-4" />}
        rightIcon={
          value ? (
            <button
              type="button"
              onClick={onClear}
              className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-dark-bg-elevated transition-colors pointer-events-auto"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : undefined
        }
        className={cn('search-input', className)}
        value={value}
        {...props}
      />
    );
  }
);

SearchInput.displayName = 'SearchInput';

// ============================================
// Textarea Component
// ============================================

interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, hint, disabled, id, ...props }, ref) => {
    const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-sm font-medium text-slate-700 dark:text-dark-text-secondary mb-1.5"
          >
            {label}
          </label>
        )}

        <textarea
          ref={ref}
          id={textareaId}
          disabled={disabled}
          className={cn(
            'input min-h-[120px] resize-y',
            error && 'input-error',
            disabled && 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-dark-bg-primary',
            className
          )}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={
            error
              ? `${textareaId}-error`
              : hint
                ? `${textareaId}-hint`
                : undefined
          }
          {...props}
        />

        {error && (
          <p
            id={`${textareaId}-error`}
            className="mt-1.5 text-sm text-red-600 dark:text-red-400"
            role="alert"
          >
            {error}
          </p>
        )}

        {hint && !error && (
          <p
            id={`${textareaId}-hint`}
            className="mt-1.5 text-sm text-slate-500 dark:text-dark-text-tertiary"
          >
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

export default Input;
