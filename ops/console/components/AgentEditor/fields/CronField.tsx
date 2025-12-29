/**
 * AgentOS Ops Console - CronField Component
 * Cron expression builder with presets and human-readable descriptions
 */

'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Clock, Calendar, ChevronDown, Info } from 'lucide-react';

// ============================================
// Types
// ============================================

interface CronPreset {
  label: string;
  value: string;
  description: string;
}

interface CronFieldProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  error?: string;
  disabled?: boolean;
  showPresets?: boolean;
  showBuilder?: boolean;
  className?: string;
}

// ============================================
// Cron Presets
// ============================================

const CRON_PRESETS: CronPreset[] = [
  { label: 'Every minute', value: '* * * * *', description: 'Runs every minute' },
  { label: 'Every 5 minutes', value: '*/5 * * * *', description: 'Runs every 5 minutes' },
  { label: 'Every 15 minutes', value: '*/15 * * * *', description: 'Runs every 15 minutes' },
  { label: 'Every 30 minutes', value: '*/30 * * * *', description: 'Runs every 30 minutes' },
  { label: 'Hourly', value: '0 * * * *', description: 'Runs at the start of every hour' },
  { label: 'Every 6 hours', value: '0 */6 * * *', description: 'Runs every 6 hours' },
  { label: 'Daily at midnight', value: '0 0 * * *', description: 'Runs daily at 00:00' },
  { label: 'Daily at 9 AM', value: '0 9 * * *', description: 'Runs daily at 09:00' },
  { label: 'Weekly (Sunday)', value: '0 0 * * 0', description: 'Runs every Sunday at 00:00' },
  { label: 'Monthly (1st)', value: '0 0 1 * *', description: 'Runs on the 1st of each month' },
  { label: 'Quarterly', value: '0 0 1 */3 *', description: 'Runs every 3 months' },
  { label: 'Yearly', value: '0 0 1 1 *', description: 'Runs on January 1st' },
];

// ============================================
// Cron Field Labels
// ============================================

const CRON_FIELDS = [
  { label: 'Minute', range: '0-59', examples: ['*', '0', '*/5', '0,30'] },
  { label: 'Hour', range: '0-23', examples: ['*', '0', '*/6', '9-17'] },
  { label: 'Day of Month', range: '1-31', examples: ['*', '1', '15', '1,15'] },
  { label: 'Month', range: '1-12', examples: ['*', '1', '*/3', '1-6'] },
  { label: 'Day of Week', range: '0-6', examples: ['*', '0', '1-5', '0,6'] },
];

// ============================================
// Helper Functions
// ============================================

function parseCronExpression(cron: string): string[] {
  const parts = cron.trim().split(/\s+/);
  while (parts.length < 5) {
    parts.push('*');
  }
  return parts.slice(0, 5);
}

function describeCronExpression(cron: string): string {
  const preset = CRON_PRESETS.find((p) => p.value === cron);
  if (preset) return preset.description;

  const parts = parseCronExpression(cron);
  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  const descriptions: string[] = [];

  // Minute description
  if (minute === '*') {
    descriptions.push('Every minute');
  } else if (minute?.startsWith('*/')) {
    descriptions.push(`Every ${minute.slice(2)} minutes`);
  } else if (minute === '0') {
    // Will be combined with hour
  } else {
    descriptions.push(`At minute ${minute}`);
  }

  // Hour description
  if (hour === '*') {
    if (minute !== '*') descriptions.push('of every hour');
  } else if (hour?.startsWith('*/')) {
    descriptions.push(`every ${hour.slice(2)} hours`);
  } else {
    descriptions.push(`at ${hour}:${minute?.padStart(2, '0') || '00'}`);
  }

  // Day of month
  if (dayOfMonth !== '*') {
    if (dayOfMonth === '1') {
      descriptions.push('on the 1st');
    } else {
      descriptions.push(`on day ${dayOfMonth}`);
    }
  }

  // Month
  if (month !== '*') {
    const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    if (month?.startsWith('*/')) {
      descriptions.push(`every ${month.slice(2)} months`);
    } else {
      descriptions.push(`in ${monthNames[parseInt(month || '0')] || month}`);
    }
  }

  // Day of week
  if (dayOfWeek !== '*') {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    if (dayOfWeek === '1-5') {
      descriptions.push('on weekdays');
    } else if (dayOfWeek === '0,6') {
      descriptions.push('on weekends');
    } else {
      descriptions.push(`on ${dayNames[parseInt(dayOfWeek || '0')] || dayOfWeek}`);
    }
  }

  return descriptions.join(' ') || 'Custom schedule';
}

function isValidCronPart(value: string, index: number): boolean {
  if (value === '*') return true;
  if (value.startsWith('*/')) {
    const num = parseInt(value.slice(2));
    return !isNaN(num) && num > 0;
  }

  const ranges = [
    [0, 59],   // minute
    [0, 23],   // hour
    [1, 31],   // day of month
    [1, 12],   // month
    [0, 6],    // day of week
  ];

  const [min, max] = ranges[index] || [0, 59];

  // Handle comma-separated values
  const parts = value.split(',');
  for (const part of parts) {
    // Handle ranges
    if (part.includes('-')) {
      const [start, end] = part.split('-').map(Number);
      if (isNaN(start) || isNaN(end) || start < min || end > max || start > end) {
        return false;
      }
    } else {
      const num = parseInt(part);
      if (isNaN(num) || num < min || num > max) {
        return false;
      }
    }
  }

  return true;
}

// ============================================
// CronField Component
// ============================================

export function CronField({
  label,
  value,
  onChange,
  hint,
  error,
  disabled = false,
  showPresets = true,
  showBuilder = true,
  className,
}: CronFieldProps) {
  const [showPresetsDropdown, setShowPresetsDropdown] = useState(false);
  const [builderMode, setBuilderMode] = useState(false);

  const cronParts = useMemo(() => parseCronExpression(value), [value]);
  const description = useMemo(() => describeCronExpression(value), [value]);

  // Update a specific cron part
  const updateCronPart = useCallback(
    (index: number, partValue: string) => {
      const newParts = [...cronParts];
      newParts[index] = partValue;
      onChange(newParts.join(' '));
    },
    [cronParts, onChange]
  );

  // Validate the entire expression
  const isValid = useMemo(() => {
    return cronParts.every((part, index) => isValidCronPart(part, index));
  }, [cronParts]);

  return (
    <div className={cn('w-full', className)}>
      {/* Label */}
      {label && (
        <label className="block text-sm font-medium text-slate-700 dark:text-dark-text-secondary mb-1.5">
          {label}
        </label>
      )}

      {/* Main Input */}
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          <Clock className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="* * * * *"
          disabled={disabled}
          className={cn(
            'w-full pl-10 pr-24 py-2 text-sm font-mono rounded-lg',
            'bg-white dark:bg-dark-bg-secondary',
            'border border-slate-300 dark:border-dark-border-primary',
            'text-slate-900 dark:text-dark-text-primary',
            'placeholder:text-slate-400 dark:placeholder:text-dark-text-muted',
            'focus:outline-none focus:ring-2 focus:ring-brand-500',
            !isValid && 'border-red-500',
            error && 'border-red-500',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        />

        {/* Toggle Buttons */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
          {showBuilder && (
            <button
              type="button"
              onClick={() => setBuilderMode(!builderMode)}
              disabled={disabled}
              className={cn(
                'px-2 py-1 text-xs rounded transition-colors',
                builderMode
                  ? 'bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-400'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-dark-bg-tertiary dark:text-dark-text-secondary'
              )}
            >
              Builder
            </button>
          )}
          {showPresets && (
            <button
              type="button"
              onClick={() => setShowPresetsDropdown(!showPresetsDropdown)}
              disabled={disabled}
              className={cn(
                'px-2 py-1 text-xs rounded flex items-center gap-1 transition-colors',
                'bg-slate-100 text-slate-600 hover:bg-slate-200',
                'dark:bg-dark-bg-tertiary dark:text-dark-text-secondary'
              )}
            >
              Presets
              <ChevronDown className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Human-readable Description */}
      <div className="mt-2 flex items-center gap-2 text-sm">
        <Calendar className="w-4 h-4 text-slate-400" />
        <span className={cn(
          isValid ? 'text-slate-600 dark:text-dark-text-secondary' : 'text-red-500'
        )}>
          {isValid ? description : 'Invalid cron expression'}
        </span>
      </div>

      {/* Presets Dropdown */}
      {showPresetsDropdown && (
        <div className="absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-lg border border-slate-200 dark:border-dark-border-primary bg-white dark:bg-dark-bg-secondary shadow-lg">
          {CRON_PRESETS.map((preset) => (
            <button
              key={preset.value}
              type="button"
              onClick={() => {
                onChange(preset.value);
                setShowPresetsDropdown(false);
              }}
              className={cn(
                'w-full px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-dark-bg-tertiary',
                value === preset.value && 'bg-brand-50 dark:bg-brand-500/10'
              )}
            >
              <div className="text-sm font-medium text-slate-900 dark:text-dark-text-primary">
                {preset.label}
              </div>
              <div className="text-xs text-slate-500 dark:text-dark-text-tertiary">
                {preset.value} - {preset.description}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Builder Mode */}
      {builderMode && (
        <div className="mt-4 p-4 rounded-lg bg-slate-50 dark:bg-dark-bg-tertiary border border-slate-200 dark:border-dark-border-primary">
          <div className="grid grid-cols-5 gap-3">
            {CRON_FIELDS.map((field, index) => (
              <div key={field.label}>
                <label className="block text-xs font-medium text-slate-500 dark:text-dark-text-tertiary mb-1">
                  {field.label}
                </label>
                <input
                  type="text"
                  value={cronParts[index] || '*'}
                  onChange={(e) => updateCronPart(index, e.target.value)}
                  disabled={disabled}
                  className={cn(
                    'w-full px-2 py-1.5 text-sm font-mono text-center rounded',
                    'bg-white dark:bg-dark-bg-secondary',
                    'border border-slate-300 dark:border-dark-border-secondary',
                    'focus:outline-none focus:ring-2 focus:ring-brand-500',
                    !isValidCronPart(cronParts[index] || '*', index) && 'border-red-500'
                  )}
                />
                <div className="mt-1 text-2xs text-slate-400 text-center">
                  {field.range}
                </div>
              </div>
            ))}
          </div>

          {/* Examples */}
          <div className="mt-3 p-2 rounded bg-slate-100 dark:bg-dark-bg-elevated">
            <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-dark-text-tertiary">
              <Info className="w-3 h-3" />
              <span>Examples: * (every), */5 (every 5), 0,30 (specific), 1-5 (range)</span>
            </div>
          </div>
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

export default CronField;
