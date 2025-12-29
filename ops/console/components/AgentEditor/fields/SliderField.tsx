/**
 * AgentOS Ops Console - SliderField Component
 * Range slider with labels, markers, and value display
 */

'use client';

import React, { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

interface SliderMark {
  value: number;
  label: string;
}

interface SliderFieldProps {
  label?: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  marks?: SliderMark[];
  showValue?: boolean;
  valueFormatter?: (value: number) => string;
  hint?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
}

// ============================================
// SliderField Component
// ============================================

export function SliderField({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  marks,
  showValue = true,
  valueFormatter = (v) => String(v),
  hint,
  error,
  disabled = false,
  className,
}: SliderFieldProps) {
  const [isDragging, setIsDragging] = useState(false);

  // Calculate percentage for styling
  const percentage = ((value - min) / (max - min)) * 100;

  // Handle slider change
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = parseFloat(e.target.value);
      onChange(newValue);
    },
    [onChange]
  );

  // Handle mark click
  const handleMarkClick = (markValue: number) => {
    if (!disabled) {
      onChange(markValue);
    }
  };

  return (
    <div className={cn('w-full', className)}>
      {/* Label and Value Display */}
      <div className="flex items-center justify-between mb-2">
        {label && (
          <label className="text-sm font-medium text-slate-700 dark:text-dark-text-secondary">
            {label}
          </label>
        )}
        {showValue && (
          <span
            className={cn(
              'text-sm font-mono px-2 py-0.5 rounded',
              'bg-slate-100 dark:bg-dark-bg-tertiary',
              'text-slate-700 dark:text-dark-text-primary'
            )}
          >
            {valueFormatter(value)}
          </span>
        )}
      </div>

      {/* Slider Container */}
      <div className="relative pt-1 pb-6">
        {/* Track Background */}
        <div className="relative h-2 rounded-full bg-slate-200 dark:bg-dark-bg-tertiary">
          {/* Filled Track */}
          <div
            className={cn(
              'absolute h-full rounded-full',
              disabled ? 'bg-slate-400' : 'bg-brand-500'
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Native Input (for accessibility) */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleChange}
          onMouseDown={() => setIsDragging(true)}
          onMouseUp={() => setIsDragging(false)}
          onTouchStart={() => setIsDragging(true)}
          onTouchEnd={() => setIsDragging(false)}
          disabled={disabled}
          className={cn(
            'absolute inset-0 w-full h-2 opacity-0 cursor-pointer',
            disabled && 'cursor-not-allowed'
          )}
          aria-label={label}
        />

        {/* Thumb */}
        <div
          className={cn(
            'absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full',
            'border-2 shadow-md transition-transform',
            isDragging && 'scale-110',
            disabled
              ? 'bg-slate-300 border-slate-400 cursor-not-allowed'
              : 'bg-white border-brand-500 cursor-grab'
          )}
          style={{
            left: `calc(${percentage}% - 10px)`,
            top: '4px',
          }}
        />

        {/* Marks */}
        {marks && marks.length > 0 && (
          <div className="absolute top-6 left-0 right-0">
            {marks.map((mark) => {
              const markPercentage = ((mark.value - min) / (max - min)) * 100;
              const isActive = value >= mark.value;

              return (
                <div
                  key={mark.value}
                  className="absolute flex flex-col items-center -translate-x-1/2"
                  style={{ left: `${markPercentage}%` }}
                >
                  {/* Mark Dot */}
                  <button
                    type="button"
                    onClick={() => handleMarkClick(mark.value)}
                    disabled={disabled}
                    className={cn(
                      'w-2 h-2 rounded-full -mt-4 mb-1 transition-colors',
                      isActive
                        ? 'bg-brand-500'
                        : 'bg-slate-300 dark:bg-dark-border-secondary',
                      !disabled && 'hover:bg-brand-400 cursor-pointer'
                    )}
                  />
                  {/* Mark Label */}
                  <span
                    className={cn(
                      'text-xs whitespace-nowrap',
                      isActive
                        ? 'text-slate-700 dark:text-dark-text-primary'
                        : 'text-slate-400 dark:text-dark-text-muted'
                    )}
                  >
                    {mark.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Min/Max Labels (if no marks) */}
      {!marks && (
        <div className="flex justify-between text-xs text-slate-400 dark:text-dark-text-muted -mt-4">
          <span>{valueFormatter(min)}</span>
          <span>{valueFormatter(max)}</span>
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

export default SliderField;
