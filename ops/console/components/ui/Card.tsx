/**
 * AgentOS Ops Console - Card Component
 * Flexible card component for content containers
 */

import React from 'react';
import { cn } from '@/lib/utils';

// ============================================
// Card Component
// ============================================

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'glass';
  interactive?: boolean;
}

export function Card({
  className,
  variant = 'default',
  interactive = false,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        'card',
        variant === 'elevated' && 'shadow-lg',
        variant === 'glass' && 'glass',
        interactive && 'card-interactive',
        className
      )}
      {...props}
    />
  );
}

// ============================================
// Card Header
// ============================================

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  action?: React.ReactNode;
}

export function CardHeader({ className, action, children, ...props }: CardHeaderProps) {
  return (
    <div
      className={cn(
        'flex items-start justify-between gap-4 p-6',
        className
      )}
      {...props}
    >
      <div className="flex-1 min-w-0">{children}</div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

// ============================================
// Card Title
// ============================================

interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}

export function CardTitle({
  className,
  as: Component = 'h3',
  ...props
}: CardTitleProps) {
  return (
    <Component
      className={cn(
        'text-lg font-semibold text-slate-900 dark:text-dark-text-primary',
        className
      )}
      {...props}
    />
  );
}

// ============================================
// Card Description
// ============================================

export function CardDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn(
        'text-sm text-slate-500 dark:text-dark-text-tertiary mt-1',
        className
      )}
      {...props}
    />
  );
}

// ============================================
// Card Content
// ============================================

interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  noPadding?: boolean;
}

export function CardContent({ className, noPadding, ...props }: CardContentProps) {
  return (
    <div
      className={cn(!noPadding && 'p-6 pt-0', className)}
      {...props}
    />
  );
}

// ============================================
// Card Footer
// ============================================

interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  bordered?: boolean;
}

export function CardFooter({ className, bordered = true, ...props }: CardFooterProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-4 p-6 pt-0',
        bordered &&
          'border-t border-slate-200 dark:border-dark-border-primary mt-6 pt-6',
        className
      )}
      {...props}
    />
  );
}
