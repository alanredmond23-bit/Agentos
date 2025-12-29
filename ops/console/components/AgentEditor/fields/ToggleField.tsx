/**
 * AgentOS Ops Console - ToggleField Component
 * Toggle switch field with label, description, and help tooltip
 */

import React from 'react';
import { useFormContext, Controller } from 'react-hook-form';
import { cn } from '@/lib/utils';
import { InfoTooltip } from '@/components/ui/Tooltip';

// ============================================
// ToggleField Types
// ============================================

export interface ToggleFieldProps {
  name: string;
  label: string;
  description?: string;
  helpText?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// ============================================
// ToggleField Component
// ============================================

export function ToggleField({
  name,
  label,
  description,
  helpText,
  disabled = false,
  size = 'md',
  className,
}: ToggleFieldProps) {
  const { control } = useFormContext();
  const inputId = `field-${name}`;

  const sizeStyles = {
    sm: {
      track: 'w-8 h-4',
      thumb: 'w-3 h-3',
      translate: 'translate-x-4',
    },
    md: {
      track: 'w-11 h-6',
      thumb: 'w-5 h-5',
      translate: 'translate-x-5',
    },
    lg: {
      track: 'w-14 h-7',
      thumb: 'w-6 h-6',
      translate: 'translate-x-7',
    },
  };

  const styles = sizeStyles[size];

  return (
    <div className={cn('flex items-start gap-3', className)}>
      {/* Toggle Switch */}
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <button
            type="button"
            id={inputId}
            role="switch"
            aria-checked={field.value}
            onClick={() => !disabled && field.onChange(!field.value)}
            disabled={disabled}
            className={cn(
              'relative inline-flex flex-shrink-0 rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-dark-bg-primary',
              styles.track,
              field.value
                ? 'bg-brand-600'
                : 'bg-slate-200 dark:bg-dark-bg-elevated',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <span
              className={cn(
                'pointer-events-none inline-block rounded-full bg-white shadow-sm transform transition-transform duration-200 ease-in-out',
                styles.thumb,
                field.value ? styles.translate : 'translate-x-0.5',
                'mt-0.5'
              )}
            />
          </button>
        )}
      />

      {/* Label and Description */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <label
            htmlFor={inputId}
            className={cn(
              'text-sm font-medium text-slate-700 dark:text-dark-text-secondary cursor-pointer',
              disabled && 'cursor-not-allowed'
            )}
          >
            {label}
          </label>
          {helpText && <InfoTooltip content={helpText} position="top" />}
        </div>
        {description && (
          <p className="mt-0.5 text-sm text-slate-500 dark:text-dark-text-tertiary">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

export default ToggleField;
