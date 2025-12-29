/**
 * AgentOS Ops Console - Badge Component
 * Status indicators and labels
 */

import React from 'react';
import { cn } from '@/lib/utils';

// ============================================
// Badge Types
// ============================================

type BadgeVariant =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'outline';

type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  dotColor?: string;
  removable?: boolean;
  onRemove?: () => void;
}

// ============================================
// Badge Component
// ============================================

export function Badge({
  className,
  variant = 'default',
  size = 'md',
  dot,
  dotColor,
  removable,
  onRemove,
  children,
  ...props
}: BadgeProps) {
  const variantStyles: Record<BadgeVariant, string> = {
    default: 'bg-slate-100 text-slate-700 dark:bg-zinc-700 dark:text-zinc-300',
    primary: 'bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-400',
    secondary: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400',
    success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
    warning: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
    error: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400',
    info: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
    outline: 'bg-transparent border border-slate-300 text-slate-700 dark:border-dark-border-secondary dark:text-dark-text-secondary',
  };

  const sizeStyles: Record<BadgeSize, string> = {
    sm: 'px-1.5 py-0.5 text-2xs',
    md: 'px-2 py-0.5 text-xs',
    lg: 'px-2.5 py-1 text-sm',
  };

  const dotColorStyles: Record<string, string> = {
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
    default: 'bg-slate-400',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-medium rounded-full',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn(
            'w-1.5 h-1.5 rounded-full flex-shrink-0',
            dotColorStyles[dotColor ?? 'default'] ?? dotColor
          )}
        />
      )}
      {children}
      {removable && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove?.();
          }}
          className="ml-0.5 -mr-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
        >
          <svg
            className="w-2.5 h-2.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </span>
  );
}

export default Badge;
