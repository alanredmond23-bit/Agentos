/**
 * AgentOS Ops Console - Spinner Component
 * Loading indicators and overlays
 */

import React from 'react';
import { cn } from '@/lib/utils';

// ============================================
// Spinner Types
// ============================================

type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
type SpinnerVariant = 'default' | 'primary' | 'white';

interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: SpinnerSize;
  variant?: SpinnerVariant;
}

// ============================================
// Spinner Component
// ============================================

export function Spinner({
  className,
  size = 'md',
  variant = 'default',
  ...props
}: SpinnerProps) {
  const sizeStyles: Record<SpinnerSize, string> = {
    xs: 'w-3 h-3 border',
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-2',
    xl: 'w-12 h-12 border-[3px]',
  };

  const variantStyles: Record<SpinnerVariant, string> = {
    default: 'border-slate-200 dark:border-dark-border-secondary border-t-slate-600 dark:border-t-dark-text-secondary',
    primary: 'border-brand-200 dark:border-brand-800 border-t-brand-600 dark:border-t-brand-400',
    white: 'border-white/30 border-t-white',
  };

  return (
    <div
      className={cn(
        'inline-block rounded-full animate-spin',
        sizeStyles[size],
        variantStyles[variant],
        className
      )}
      role="status"
      aria-label="Loading"
      {...props}
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}

// ============================================
// Loading Overlay Component
// ============================================

interface LoadingOverlayProps extends React.HTMLAttributes<HTMLDivElement> {
  visible: boolean;
  text?: string;
  spinnerSize?: SpinnerSize;
  blur?: boolean;
}

export function LoadingOverlay({
  visible,
  text,
  spinnerSize = 'lg',
  blur = true,
  className,
  ...props
}: LoadingOverlayProps) {
  if (!visible) return null;

  return (
    <div
      className={cn(
        'absolute inset-0 z-50 flex flex-col items-center justify-center',
        blur
          ? 'bg-white/80 dark:bg-dark-bg-primary/80 backdrop-blur-sm'
          : 'bg-white/90 dark:bg-dark-bg-primary/90',
        className
      )}
      {...props}
    >
      <Spinner size={spinnerSize} variant="primary" />
      {text && (
        <p className="mt-4 text-sm text-slate-600 dark:text-dark-text-secondary">
          {text}
        </p>
      )}
    </div>
  );
}

// ============================================
// Page Loading Component
// ============================================

interface PageLoadingProps {
  text?: string;
}

export function PageLoading({ text = 'Loading...' }: PageLoadingProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px]">
      <Spinner size="xl" variant="primary" />
      <p className="mt-4 text-slate-600 dark:text-dark-text-secondary">{text}</p>
    </div>
  );
}

// ============================================
// Skeleton Loader Components
// ============================================

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
}

export function Skeleton({
  className,
  variant = 'text',
  width,
  height,
  style,
  ...props
}: SkeletonProps) {
  const variantStyles: Record<string, string> = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  return (
    <div
      className={cn('skeleton', variantStyles[variant], className)}
      style={{
        width,
        height,
        ...style,
      }}
      {...props}
    />
  );
}

// ============================================
// Progress Bar Component
// ============================================

interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'warning' | 'error';
}

export function ProgressBar({
  value,
  max = 100,
  showLabel = false,
  size = 'md',
  variant = 'default',
  className,
  ...props
}: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  const sizeStyles: Record<string, string> = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };

  const variantStyles: Record<string, string> = {
    default: 'bg-brand-500',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    error: 'bg-red-500',
  };

  return (
    <div className={cn('w-full', className)} {...props}>
      {showLabel && (
        <div className="flex justify-between text-sm text-slate-600 dark:text-dark-text-secondary mb-1">
          <span>Progress</span>
          <span>{Math.round(percentage)}%</span>
        </div>
      )}
      <div
        className={cn(
          'progress-bar',
          sizeStyles[size]
        )}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div
          className={cn('progress-bar-fill', variantStyles[variant])}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export default Spinner;
