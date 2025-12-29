/**
 * AgentOS Ops Console - TextField Component
 * Text input field with validation, help tooltip, and required indicator
 */

import React from 'react';
import { useFormContext, Controller } from 'react-hook-form';
import { cn } from '@/lib/utils';
import { InfoTooltip } from '@/components/ui/Tooltip';

// ============================================
// TextField Types
// ============================================

export interface TextFieldProps {
  name: string;
  label: string;
  placeholder?: string;
  helpText?: string;
  required?: boolean;
  disabled?: boolean;
  multiline?: boolean;
  rows?: number;
  maxLength?: number;
  pattern?: RegExp;
  patternMessage?: string;
  className?: string;
  inputClassName?: string;
}

// ============================================
// TextField Component
// ============================================

export function TextField({
  name,
  label,
  placeholder,
  helpText,
  required = false,
  disabled = false,
  multiline = false,
  rows = 3,
  maxLength,
  pattern,
  patternMessage,
  className,
  inputClassName,
}: TextFieldProps) {
  const { control, formState: { errors } } = useFormContext();
  const fieldError = errors[name];
  const errorMessage = fieldError?.message as string | undefined;
  const inputId = `field-${name}`;

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

      {/* Input Field */}
      <Controller
        name={name}
        control={control}
        rules={{
          required: required ? `${label} is required` : false,
          maxLength: maxLength ? { value: maxLength, message: `Maximum ${maxLength} characters` } : undefined,
          pattern: pattern ? { value: pattern, message: patternMessage || 'Invalid format' } : undefined,
        }}
        render={({ field }) => (
          multiline ? (
            <textarea
              {...field}
              id={inputId}
              placeholder={placeholder}
              disabled={disabled}
              rows={rows}
              maxLength={maxLength}
              className={cn(
                'input min-h-[80px] resize-y',
                errorMessage && 'input-error',
                disabled && 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-dark-bg-primary',
                inputClassName
              )}
              aria-invalid={!!errorMessage}
              aria-describedby={errorMessage ? `${inputId}-error` : undefined}
            />
          ) : (
            <input
              {...field}
              type="text"
              id={inputId}
              placeholder={placeholder}
              disabled={disabled}
              maxLength={maxLength}
              className={cn(
                'input',
                errorMessage && 'input-error',
                disabled && 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-dark-bg-primary',
                inputClassName
              )}
              aria-invalid={!!errorMessage}
              aria-describedby={errorMessage ? `${inputId}-error` : undefined}
            />
          )
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

      {/* Character Count */}
      {maxLength && (
        <Controller
          name={name}
          control={control}
          render={({ field }) => (
            <p className="mt-1 text-xs text-slate-400 dark:text-dark-text-muted text-right">
              {(field.value?.length || 0)} / {maxLength}
            </p>
          )}
        />
      )}
    </div>
  );
}

export default TextField;
