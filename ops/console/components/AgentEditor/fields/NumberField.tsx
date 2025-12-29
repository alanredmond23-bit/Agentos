/**
 * AgentOS Ops Console - NumberField Component
 * Numeric input field with validation, range constraints, and step controls
 */

import React from 'react';
import { useFormContext, Controller } from 'react-hook-form';
import { cn } from '@/lib/utils';
import { InfoTooltip } from '@/components/ui/Tooltip';
import { Minus, Plus } from 'lucide-react';

// ============================================
// NumberField Types
// ============================================

export interface NumberFieldProps {
  name: string;
  label: string;
  placeholder?: string;
  helpText?: string;
  required?: boolean;
  disabled?: boolean;
  min?: number;
  max?: number;
  step?: number;
  showStepper?: boolean;
  suffix?: string;
  prefix?: string;
  className?: string;
  inputClassName?: string;
}

// ============================================
// NumberField Component
// ============================================

export function NumberField({
  name,
  label,
  placeholder,
  helpText,
  required = false,
  disabled = false,
  min,
  max,
  step = 1,
  showStepper = false,
  suffix,
  prefix,
  className,
  inputClassName,
}: NumberFieldProps) {
  const { control, formState: { errors }, setValue, getValues } = useFormContext();
  const fieldError = errors[name];
  const errorMessage = fieldError?.message as string | undefined;
  const inputId = `field-${name}`;

  const handleIncrement = () => {
    const currentValue = getValues(name) || 0;
    const newValue = Number(currentValue) + step;
    if (max === undefined || newValue <= max) {
      setValue(name, newValue, { shouldValidate: true });
    }
  };

  const handleDecrement = () => {
    const currentValue = getValues(name) || 0;
    const newValue = Number(currentValue) - step;
    if (min === undefined || newValue >= min) {
      setValue(name, newValue, { shouldValidate: true });
    }
  };

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

      {/* Input Container */}
      <div className="relative flex">
        {/* Prefix */}
        {prefix && (
          <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-slate-300 dark:border-dark-border-primary bg-slate-50 dark:bg-dark-bg-tertiary text-slate-500 dark:text-dark-text-tertiary text-sm">
            {prefix}
          </span>
        )}

        {/* Stepper Decrement */}
        {showStepper && (
          <button
            type="button"
            onClick={handleDecrement}
            disabled={disabled || (min !== undefined && (getValues(name) || 0) <= min)}
            className={cn(
              'inline-flex items-center justify-center px-3 border border-r-0 border-slate-300 dark:border-dark-border-primary bg-slate-50 dark:bg-dark-bg-tertiary text-slate-500 dark:text-dark-text-tertiary hover:bg-slate-100 dark:hover:bg-dark-bg-elevated transition-colors',
              !prefix && 'rounded-l-lg',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            <Minus className="w-4 h-4" />
          </button>
        )}

        {/* Input Field */}
        <Controller
          name={name}
          control={control}
          rules={{
            required: required ? `${label} is required` : false,
            min: min !== undefined ? { value: min, message: `Minimum value is ${min}` } : undefined,
            max: max !== undefined ? { value: max, message: `Maximum value is ${max}` } : undefined,
          }}
          render={({ field }) => (
            <input
              {...field}
              type="number"
              id={inputId}
              placeholder={placeholder}
              disabled={disabled}
              min={min}
              max={max}
              step={step}
              onChange={(e) => field.onChange(e.target.value === '' ? '' : Number(e.target.value))}
              className={cn(
                'input flex-1 text-center',
                prefix && !showStepper && 'rounded-l-none',
                suffix && !showStepper && 'rounded-r-none',
                showStepper && 'rounded-none',
                errorMessage && 'input-error',
                disabled && 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-dark-bg-primary',
                inputClassName
              )}
              aria-invalid={!!errorMessage}
              aria-describedby={errorMessage ? `${inputId}-error` : undefined}
            />
          )}
        />

        {/* Stepper Increment */}
        {showStepper && (
          <button
            type="button"
            onClick={handleIncrement}
            disabled={disabled || (max !== undefined && (getValues(name) || 0) >= max)}
            className={cn(
              'inline-flex items-center justify-center px-3 border border-l-0 border-slate-300 dark:border-dark-border-primary bg-slate-50 dark:bg-dark-bg-tertiary text-slate-500 dark:text-dark-text-tertiary hover:bg-slate-100 dark:hover:bg-dark-bg-elevated transition-colors',
              !suffix && 'rounded-r-lg',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            <Plus className="w-4 h-4" />
          </button>
        )}

        {/* Suffix */}
        {suffix && (
          <span className="inline-flex items-center px-3 rounded-r-lg border border-l-0 border-slate-300 dark:border-dark-border-primary bg-slate-50 dark:bg-dark-bg-tertiary text-slate-500 dark:text-dark-text-tertiary text-sm">
            {suffix}
          </span>
        )}
      </div>

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

      {/* Range Hint */}
      {(min !== undefined || max !== undefined) && !errorMessage && (
        <p className="mt-1 text-xs text-slate-400 dark:text-dark-text-muted">
          {min !== undefined && max !== undefined
            ? `Range: ${min} - ${max}`
            : min !== undefined
              ? `Minimum: ${min}`
              : `Maximum: ${max}`}
        </p>
      )}
    </div>
  );
}

export default NumberField;
