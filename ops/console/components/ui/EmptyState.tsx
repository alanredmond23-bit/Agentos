/**
 * AgentOS Ops Console - Empty State Component
 * Informative empty states for lists and pages
 */

import React from 'react';
import { cn } from '@/lib/utils';
import {
  Inbox,
  Search,
  FileText,
  Bot,
  CheckCircle,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { Button } from './Button';

// ============================================
// Empty State Types
// ============================================

type EmptyStateVariant =
  | 'default'
  | 'search'
  | 'no-data'
  | 'no-agents'
  | 'no-approvals'
  | 'no-logs'
  | 'error';

interface EmptyStateAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: EmptyStateVariant;
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  compact?: boolean;
}

// ============================================
// Empty State Component
// ============================================

export function EmptyState({
  className,
  variant = 'default',
  icon,
  title,
  description,
  action,
  secondaryAction,
  compact = false,
  ...props
}: EmptyStateProps) {
  const getDefaultIcon = () => {
    const iconClasses = cn(
      'text-slate-300 dark:text-zinc-600',
      compact ? 'w-12 h-12' : 'w-16 h-16'
    );

    switch (variant) {
      case 'search':
        return <Search className={iconClasses} />;
      case 'no-data':
        return <Inbox className={iconClasses} />;
      case 'no-agents':
        return <Bot className={iconClasses} />;
      case 'no-approvals':
        return <CheckCircle className={iconClasses} />;
      case 'no-logs':
        return <FileText className={iconClasses} />;
      case 'error':
        return <AlertCircle className={cn(iconClasses, 'text-red-300 dark:text-red-700')} />;
      default:
        return <Inbox className={iconClasses} />;
    }
  };

  return (
    <div
      className={cn(
        'empty-state',
        compact ? 'py-8 px-4' : 'py-16 px-8',
        className
      )}
      {...props}
    >
      <div className="mb-4">{icon || getDefaultIcon()}</div>

      <h3
        className={cn(
          'font-medium text-slate-900 dark:text-dark-text-primary',
          compact ? 'text-base' : 'text-lg'
        )}
      >
        {title}
      </h3>

      {description && (
        <p
          className={cn(
            'text-slate-500 dark:text-dark-text-tertiary mt-1 max-w-sm',
            compact ? 'text-sm' : 'text-base'
          )}
        >
          {description}
        </p>
      )}

      {(action || secondaryAction) && (
        <div className="flex items-center gap-3 mt-6">
          {action && (
            <Button
              onClick={action.onClick}
              variant={action.variant || 'primary'}
              size={compact ? 'sm' : 'md'}
            >
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              onClick={secondaryAction.onClick}
              variant={secondaryAction.variant || 'secondary'}
              size={compact ? 'sm' : 'md'}
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// Preset Empty States
// ============================================

interface PresetEmptyStateProps {
  onAction?: () => void;
  compact?: boolean;
  className?: string;
}

export function NoSearchResults({
  onAction,
  compact,
  className,
}: PresetEmptyStateProps) {
  return (
    <EmptyState
      variant="search"
      title="No results found"
      description="Try adjusting your search or filters to find what you're looking for."
      action={
        onAction
          ? {
              label: 'Clear filters',
              onClick: onAction,
              variant: 'secondary',
            }
          : undefined
      }
      compact={compact}
      className={className}
    />
  );
}

export function NoAgents({
  onAction,
  compact,
  className,
}: PresetEmptyStateProps) {
  return (
    <EmptyState
      variant="no-agents"
      title="No agents configured"
      description="Get started by deploying your first agent to the platform."
      action={
        onAction
          ? {
              label: 'Deploy Agent',
              onClick: onAction,
            }
          : undefined
      }
      compact={compact}
      className={className}
    />
  );
}

export function NoPendingApprovals({
  compact,
  className,
}: PresetEmptyStateProps) {
  return (
    <EmptyState
      variant="no-approvals"
      title="All caught up!"
      description="There are no pending approvals at the moment. Check back later."
      compact={compact}
      className={className}
    />
  );
}

export function NoAuditLogs({
  onAction,
  compact,
  className,
}: PresetEmptyStateProps) {
  return (
    <EmptyState
      variant="no-logs"
      title="No audit logs"
      description="Audit logs will appear here once agents start executing actions."
      action={
        onAction
          ? {
              label: 'Refresh',
              onClick: onAction,
              variant: 'secondary',
            }
          : undefined
      }
      compact={compact}
      className={className}
    />
  );
}

export function ErrorState({
  onAction,
  compact,
  className,
}: PresetEmptyStateProps) {
  return (
    <EmptyState
      variant="error"
      title="Something went wrong"
      description="We encountered an error while loading the data. Please try again."
      action={
        onAction
          ? {
              label: 'Retry',
              onClick: onAction,
            }
          : undefined
      }
      icon={
        <div className="relative">
          <AlertCircle
            className={cn(
              'text-red-400 dark:text-red-500',
              compact ? 'w-12 h-12' : 'w-16 h-16'
            )}
          />
          <RefreshCw
            className={cn(
              'absolute -bottom-1 -right-1 text-slate-400',
              compact ? 'w-5 h-5' : 'w-6 h-6'
            )}
          />
        </div>
      }
      compact={compact}
      className={className}
    />
  );
}

export default EmptyState;
