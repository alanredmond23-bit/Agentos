/**
 * AgentOS Ops Console - Button Component
 * Versatile button with multiple variants and states
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Spinner } from './Spinner';

// ============================================
// Button Types
// ============================================

type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'danger'
  | 'success'
  | 'outline'
  | 'link';

type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  loadingText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

// ============================================
// Button Component
// ============================================

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      loading = false,
      loadingText,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const variantStyles: Record<ButtonVariant, string> = {
      primary:
        'bg-brand-600 text-white hover:bg-brand-700 focus-visible:ring-brand-500 shadow-sm active:bg-brand-800',
      secondary:
        'bg-slate-100 dark:bg-dark-bg-tertiary text-slate-700 dark:text-dark-text-primary border border-slate-200 dark:border-dark-border-primary hover:bg-slate-200 dark:hover:bg-dark-bg-elevated focus-visible:ring-slate-400',
      ghost:
        'text-slate-600 dark:text-dark-text-secondary hover:bg-slate-100 dark:hover:bg-dark-bg-tertiary focus-visible:ring-slate-400',
      danger:
        'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500 shadow-sm active:bg-red-800',
      success:
        'bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-500 shadow-sm active:bg-emerald-800',
      outline:
        'bg-transparent border-2 border-brand-600 text-brand-600 dark:border-brand-500 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-500/10 focus-visible:ring-brand-500',
      link: 'text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 underline-offset-4 hover:underline',
    };

    const sizeStyles: Record<ButtonSize, string> = {
      xs: 'px-2 py-1 text-xs gap-1',
      sm: 'px-3 py-1.5 text-sm gap-1.5',
      md: 'px-4 py-2 text-sm gap-2',
      lg: 'px-6 py-3 text-base gap-2.5',
      xl: 'px-8 py-4 text-lg gap-3',
    };

    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        className={cn(
          'btn',
          variantStyles[variant],
          sizeStyles[size],
          fullWidth && 'w-full',
          isDisabled && 'opacity-50 cursor-not-allowed pointer-events-none',
          className
        )}
        disabled={isDisabled}
        {...props}
      >
        {loading ? (
          <>
            <Spinner size="sm" />
            {loadingText || children}
          </>
        ) : (
          <>
            {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

// ============================================
// Icon Button Component
// ============================================

interface IconButtonProps
  extends Omit<ButtonProps, 'leftIcon' | 'rightIcon' | 'children'> {
  icon: React.ReactNode;
  'aria-label': string;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, size = 'md', icon, ...props }, ref) => {
    const sizeStyles: Record<ButtonSize, string> = {
      xs: 'w-6 h-6',
      sm: 'w-8 h-8',
      md: 'w-10 h-10',
      lg: 'w-12 h-12',
      xl: 'w-14 h-14',
    };

    return (
      <Button
        ref={ref}
        className={cn('!p-0', sizeStyles[size], className)}
        size={size}
        {...props}
      >
        {icon}
      </Button>
    );
  }
);

IconButton.displayName = 'IconButton';

// ============================================
// Button Group Component
// ============================================

interface ButtonGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  attached?: boolean;
}

export function ButtonGroup({
  className,
  attached = false,
  children,
  ...props
}: ButtonGroupProps) {
  return (
    <div
      className={cn(
        'inline-flex',
        attached
          ? '[&>button]:rounded-none [&>button:first-child]:rounded-l-lg [&>button:last-child]:rounded-r-lg [&>button:not(:first-child)]:-ml-px'
          : 'gap-2',
        className
      )}
      role="group"
      {...props}
    >
      {children}
    </div>
  );
}

export default Button;
