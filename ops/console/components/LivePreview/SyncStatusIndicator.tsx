/**
 * AgentOS Studio - Sync Status Indicator Component
 * Visual indicator for bidirectional sync state between form and YAML
 */

'use client';

import React, { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
  XCircle,
  Loader2,
  ArrowLeftRight,
  Clock,
  Info,
} from 'lucide-react';

// ============================================
// Types
// ============================================

export type SyncStatus = 'synced' | 'syncing' | 'conflict' | 'error' | 'pending' | 'idle';

export interface SyncStatusIndicatorProps {
  status: SyncStatus;
  lastSource?: 'form' | 'yaml' | 'none';
  lastSyncTime?: number;
  isSyncing?: boolean;
  hasConflict?: boolean;
  errorMessage?: string;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showTooltip?: boolean;
  variant?: 'default' | 'compact' | 'minimal';
}

interface StatusConfig {
  icon: React.ElementType;
  label: string;
  description: string;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  pulseClass?: string;
}

// ============================================
// Status Configurations
// ============================================

const STATUS_CONFIG: Record<SyncStatus, StatusConfig> = {
  synced: {
    icon: CheckCircle2,
    label: 'In Sync',
    description: 'Form and YAML are synchronized',
    colorClass: 'text-emerald-500',
    bgClass: 'bg-emerald-50 dark:bg-emerald-500/10',
    borderClass: 'border-emerald-200 dark:border-emerald-500/30',
  },
  syncing: {
    icon: RefreshCw,
    label: 'Syncing...',
    description: 'Synchronizing changes',
    colorClass: 'text-blue-500',
    bgClass: 'bg-blue-50 dark:bg-blue-500/10',
    borderClass: 'border-blue-200 dark:border-blue-500/30',
    pulseClass: 'animate-spin',
  },
  conflict: {
    icon: AlertTriangle,
    label: 'Conflict',
    description: 'Conflicting changes detected',
    colorClass: 'text-amber-500',
    bgClass: 'bg-amber-50 dark:bg-amber-500/10',
    borderClass: 'border-amber-200 dark:border-amber-500/30',
    pulseClass: 'animate-pulse',
  },
  error: {
    icon: XCircle,
    label: 'Error',
    description: 'Sync error occurred',
    colorClass: 'text-red-500',
    bgClass: 'bg-red-50 dark:bg-red-500/10',
    borderClass: 'border-red-200 dark:border-red-500/30',
  },
  pending: {
    icon: Clock,
    label: 'Pending',
    description: 'Changes waiting to sync',
    colorClass: 'text-purple-500',
    bgClass: 'bg-purple-50 dark:bg-purple-500/10',
    borderClass: 'border-purple-200 dark:border-purple-500/30',
  },
  idle: {
    icon: ArrowLeftRight,
    label: 'Ready',
    description: 'Sync ready',
    colorClass: 'text-slate-400',
    bgClass: 'bg-slate-50 dark:bg-slate-500/10',
    borderClass: 'border-slate-200 dark:border-slate-500/30',
  },
};

const SIZE_CLASSES = {
  xs: {
    container: 'px-1.5 py-0.5',
    icon: 'w-3 h-3',
    text: 'text-xs',
    gap: 'gap-1',
  },
  sm: {
    container: 'px-2 py-1',
    icon: 'w-3.5 h-3.5',
    text: 'text-xs',
    gap: 'gap-1.5',
  },
  md: {
    container: 'px-3 py-1.5',
    icon: 'w-4 h-4',
    text: 'text-sm',
    gap: 'gap-2',
  },
  lg: {
    container: 'px-4 py-2',
    icon: 'w-5 h-5',
    text: 'text-base',
    gap: 'gap-2.5',
  },
};

// ============================================
// Sync Status Indicator Component
// ============================================

export function SyncStatusIndicator({
  status,
  lastSource = 'none',
  lastSyncTime,
  isSyncing = false,
  hasConflict = false,
  errorMessage,
  className,
  size = 'sm',
  showLabel = true,
  showTooltip = true,
  variant = 'default',
}: SyncStatusIndicatorProps) {
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);

  // Determine effective status based on props
  const effectiveStatus = useMemo((): SyncStatus => {
    if (isSyncing) return 'syncing';
    if (hasConflict) return 'conflict';
    if (errorMessage) return 'error';
    return status;
  }, [status, isSyncing, hasConflict, errorMessage]);

  const config = STATUS_CONFIG[effectiveStatus];
  const sizeConfig = SIZE_CLASSES[size];
  const Icon = config.icon;

  // Format last sync time
  const formattedTime = useMemo(() => {
    if (!lastSyncTime) return null;
    const now = Date.now();
    const diff = now - lastSyncTime;

    if (diff < 1000) return 'Just now';
    if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return new Date(lastSyncTime).toLocaleTimeString();
  }, [lastSyncTime]);

  // Source indicator text
  const sourceText = useMemo(() => {
    switch (lastSource) {
      case 'form':
        return 'Last: Form';
      case 'yaml':
        return 'Last: YAML';
      default:
        return null;
    }
  }, [lastSource]);

  // Tooltip content
  const tooltipContent = useMemo(() => {
    const lines = [config.description];

    if (errorMessage) {
      lines.push(`Error: ${errorMessage}`);
    }

    if (formattedTime) {
      lines.push(`Synced: ${formattedTime}`);
    }

    if (sourceText) {
      lines.push(sourceText);
    }

    return lines.join('\n');
  }, [config.description, errorMessage, formattedTime, sourceText]);

  // Render minimal variant (just the icon)
  if (variant === 'minimal') {
    return (
      <div
        className={cn('relative inline-flex', className)}
        onMouseEnter={() => setIsTooltipVisible(true)}
        onMouseLeave={() => setIsTooltipVisible(false)}
      >
        <Icon className={cn(sizeConfig.icon, config.colorClass, config.pulseClass)} />

        {showTooltip && isTooltipVisible && (
          <SyncTooltip content={tooltipContent} />
        )}
      </div>
    );
  }

  // Render compact variant (icon + optional label, no background)
  if (variant === 'compact') {
    return (
      <div
        className={cn(
          'inline-flex items-center',
          sizeConfig.gap,
          className
        )}
        onMouseEnter={() => setIsTooltipVisible(true)}
        onMouseLeave={() => setIsTooltipVisible(false)}
      >
        <Icon className={cn(sizeConfig.icon, config.colorClass, config.pulseClass)} />

        {showLabel && (
          <span className={cn(sizeConfig.text, config.colorClass, 'font-medium')}>
            {config.label}
          </span>
        )}

        {showTooltip && isTooltipVisible && (
          <SyncTooltip content={tooltipContent} />
        )}
      </div>
    );
  }

  // Render default variant (full badge with background)
  return (
    <div
      className={cn(
        'relative inline-flex items-center rounded-full border transition-colors',
        sizeConfig.container,
        sizeConfig.gap,
        config.bgClass,
        config.borderClass,
        className
      )}
      onMouseEnter={() => setIsTooltipVisible(true)}
      onMouseLeave={() => setIsTooltipVisible(false)}
    >
      <Icon className={cn(sizeConfig.icon, config.colorClass, config.pulseClass)} />

      {showLabel && (
        <span className={cn(sizeConfig.text, config.colorClass, 'font-medium')}>
          {config.label}
        </span>
      )}

      {formattedTime && !showLabel && (
        <span className={cn('text-xs', config.colorClass, 'opacity-75')}>
          {formattedTime}
        </span>
      )}

      {showTooltip && isTooltipVisible && (
        <SyncTooltip content={tooltipContent} />
      )}
    </div>
  );
}

// ============================================
// Sync Tooltip Component
// ============================================

interface SyncTooltipProps {
  content: string;
}

function SyncTooltip({ content }: SyncTooltipProps) {
  return (
    <div
      className={cn(
        'absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50',
        'px-3 py-2 rounded-lg shadow-lg',
        'bg-slate-900 dark:bg-slate-800',
        'text-xs text-white whitespace-pre-line',
        'animate-in fade-in-0 zoom-in-95 duration-150',
        'pointer-events-none'
      )}
    >
      {content}
      <div
        className={cn(
          'absolute top-full left-1/2 -translate-x-1/2',
          'border-4 border-transparent border-t-slate-900 dark:border-t-slate-800'
        )}
      />
    </div>
  );
}

// ============================================
// Sync Activity Indicator
// ============================================

export interface SyncActivityIndicatorProps {
  isActive: boolean;
  direction?: 'form-to-yaml' | 'yaml-to-form' | 'both';
  className?: string;
}

export function SyncActivityIndicator({
  isActive,
  direction = 'both',
  className,
}: SyncActivityIndicatorProps) {
  if (!isActive) return null;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="relative flex items-center">
        {/* Left dot (form) */}
        <div
          className={cn(
            'w-2 h-2 rounded-full',
            direction === 'form-to-yaml' || direction === 'both'
              ? 'bg-purple-500 animate-pulse'
              : 'bg-slate-300 dark:bg-slate-600'
          )}
        />

        {/* Connecting line with animation */}
        <div className="w-8 h-0.5 mx-1 relative overflow-hidden bg-slate-200 dark:bg-slate-700">
          <div
            className={cn(
              'absolute inset-0 bg-purple-500',
              direction === 'form-to-yaml' && 'animate-slide-right',
              direction === 'yaml-to-form' && 'animate-slide-left',
              direction === 'both' && 'animate-pulse'
            )}
            style={{
              transform: direction === 'form-to-yaml'
                ? 'translateX(-100%)'
                : direction === 'yaml-to-form'
                  ? 'translateX(100%)'
                  : 'none',
            }}
          />
        </div>

        {/* Right dot (yaml) */}
        <div
          className={cn(
            'w-2 h-2 rounded-full',
            direction === 'yaml-to-form' || direction === 'both'
              ? 'bg-purple-500 animate-pulse'
              : 'bg-slate-300 dark:bg-slate-600'
          )}
        />
      </div>

      <span className="text-xs text-slate-500 dark:text-slate-400">
        {direction === 'form-to-yaml'
          ? 'Form to YAML'
          : direction === 'yaml-to-form'
            ? 'YAML to Form'
            : 'Syncing'}
      </span>
    </div>
  );
}

// ============================================
// Sync Progress Bar
// ============================================

export interface SyncProgressBarProps {
  progress: number; // 0-100
  status: SyncStatus;
  className?: string;
}

export function SyncProgressBar({
  progress,
  status,
  className,
}: SyncProgressBarProps) {
  const config = STATUS_CONFIG[status];

  return (
    <div className={cn('w-full h-1 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden', className)}>
      <div
        className={cn(
          'h-full rounded-full transition-all duration-300',
          status === 'synced' && 'bg-emerald-500',
          status === 'syncing' && 'bg-blue-500',
          status === 'conflict' && 'bg-amber-500',
          status === 'error' && 'bg-red-500',
          status === 'pending' && 'bg-purple-500',
          status === 'idle' && 'bg-slate-400'
        )}
        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
      />
    </div>
  );
}

// ============================================
// Detailed Sync Status Panel
// ============================================

export interface DetailedSyncStatusProps {
  status: SyncStatus;
  lastSource: 'form' | 'yaml' | 'none';
  lastSyncTime?: number;
  pendingChanges?: number;
  errorMessage?: string;
  className?: string;
  onRetry?: () => void;
}

export function DetailedSyncStatus({
  status,
  lastSource,
  lastSyncTime,
  pendingChanges = 0,
  errorMessage,
  className,
  onRetry,
}: DetailedSyncStatusProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  const formattedTime = useMemo(() => {
    if (!lastSyncTime) return 'Never';
    return new Date(lastSyncTime).toLocaleTimeString();
  }, [lastSyncTime]);

  return (
    <div
      className={cn(
        'rounded-lg border p-4',
        config.bgClass,
        config.borderClass,
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className={cn('w-5 h-5', config.colorClass, config.pulseClass)} />
          <span className={cn('font-semibold', config.colorClass)}>
            {config.label}
          </span>
        </div>

        {status === 'error' && onRetry && (
          <button
            onClick={onRetry}
            className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 flex items-center gap-1"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </button>
        )}
      </div>

      {/* Description */}
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
        {errorMessage || config.description}
      </p>

      {/* Details Grid */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <span className="text-slate-500 dark:text-slate-500">Last Source</span>
          <p className="font-medium text-slate-700 dark:text-slate-300 capitalize">
            {lastSource === 'none' ? 'None' : lastSource}
          </p>
        </div>

        <div>
          <span className="text-slate-500 dark:text-slate-500">Last Sync</span>
          <p className="font-medium text-slate-700 dark:text-slate-300">
            {formattedTime}
          </p>
        </div>

        {pendingChanges > 0 && (
          <div className="col-span-2">
            <span className="text-slate-500 dark:text-slate-500">Pending Changes</span>
            <p className="font-medium text-purple-600 dark:text-purple-400">
              {pendingChanges} change{pendingChanges !== 1 ? 's' : ''} waiting
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// CSS Animation Styles
// ============================================

const animationStyles = `
  @keyframes slide-right {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }

  @keyframes slide-left {
    0% { transform: translateX(100%); }
    100% { transform: translateX(-100%); }
  }

  .animate-slide-right {
    animation: slide-right 1s ease-in-out infinite;
  }

  .animate-slide-left {
    animation: slide-left 1s ease-in-out infinite;
  }
`;

// Inject styles (in a real app, this would be in a CSS file)
if (typeof document !== 'undefined') {
  const styleId = 'sync-status-indicator-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = animationStyles;
    document.head.appendChild(style);
  }
}

// ============================================
// Exports
// ============================================

export default SyncStatusIndicator;
