/**
 * AgentOS Ops Console - Status Badge Component
 * Status indicators for agents, approvals, and other entities
 */

import React from 'react';
import { cn, agentStatusColors, approvalStatusColors, priorityColors, riskLevelColors } from '@/lib/utils';
import type { AgentStatus, ApprovalStatus, Priority, RiskLevel } from '@/types';

// ============================================
// Agent Status Badge
// ============================================

interface AgentStatusBadgeProps {
  status: AgentStatus;
  showDot?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function AgentStatusBadge({
  status,
  showDot = true,
  size = 'md',
  className,
}: AgentStatusBadgeProps) {
  const colors = agentStatusColors[status];
  const labels: Record<AgentStatus, string> = {
    active: 'Active',
    paused: 'Paused',
    stopped: 'Stopped',
    error: 'Error',
    initializing: 'Initializing',
    updating: 'Updating',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-medium rounded-full',
        colors.bg,
        colors.text,
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs',
        className
      )}
    >
      {showDot && (
        <span
          className={cn(
            'w-1.5 h-1.5 rounded-full flex-shrink-0',
            colors.dot,
            status === 'active' && 'animate-pulse-subtle'
          )}
        />
      )}
      {labels[status]}
    </span>
  );
}

// ============================================
// Approval Status Badge
// ============================================

interface ApprovalStatusBadgeProps {
  status: ApprovalStatus;
  size?: 'sm' | 'md';
  className?: string;
}

export function ApprovalStatusBadge({
  status,
  size = 'md',
  className,
}: ApprovalStatusBadgeProps) {
  const colors = approvalStatusColors[status];
  const labels: Record<ApprovalStatus, string> = {
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
    expired: 'Expired',
    cancelled: 'Cancelled',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full',
        colors.bg,
        colors.text,
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs',
        className
      )}
    >
      {labels[status]}
    </span>
  );
}

// ============================================
// Priority Badge
// ============================================

interface PriorityBadgeProps {
  priority: Priority;
  showIcon?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function PriorityBadge({
  priority,
  showIcon = false,
  size = 'md',
  className,
}: PriorityBadgeProps) {
  const colors = priorityColors[priority];
  const labels: Record<Priority, string> = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    urgent: 'Urgent',
  };

  const icons: Record<Priority, React.ReactNode> = {
    low: (
      <svg className="w-3 h-3" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 14a1 1 0 01-1-1V3a1 1 0 012 0v10a1 1 0 01-1 1z" />
      </svg>
    ),
    medium: (
      <svg className="w-3 h-3" viewBox="0 0 16 16" fill="currentColor">
        <path d="M5 14a1 1 0 01-1-1V3a1 1 0 012 0v10a1 1 0 01-1 1zM11 14a1 1 0 01-1-1V3a1 1 0 012 0v10a1 1 0 01-1 1z" />
      </svg>
    ),
    high: (
      <svg className="w-3 h-3" viewBox="0 0 16 16" fill="currentColor">
        <path d="M3 14a1 1 0 01-1-1V3a1 1 0 012 0v10a1 1 0 01-1 1zM8 14a1 1 0 01-1-1V3a1 1 0 012 0v10a1 1 0 01-1 1zM13 14a1 1 0 01-1-1V3a1 1 0 012 0v10a1 1 0 01-1 1z" />
      </svg>
    ),
    urgent: (
      <svg className="w-3 h-3" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 1a1 1 0 011 1v6a1 1 0 01-2 0V2a1 1 0 011-1zM8 11a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" />
      </svg>
    ),
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-medium rounded-full',
        colors.bg,
        colors.text,
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs',
        className
      )}
    >
      {showIcon && icons[priority]}
      {labels[priority]}
    </span>
  );
}

// ============================================
// Risk Level Badge
// ============================================

interface RiskLevelBadgeProps {
  level: RiskLevel;
  showLabel?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function RiskLevelBadge({
  level,
  showLabel = true,
  size = 'md',
  className,
}: RiskLevelBadgeProps) {
  const colors = riskLevelColors[level];
  const labels: Record<RiskLevel, string> = {
    low: 'Low Risk',
    medium: 'Medium Risk',
    high: 'High Risk',
    critical: 'Critical',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-medium rounded-full',
        colors.bg,
        colors.text,
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs',
        className
      )}
    >
      <span
        className={cn(
          'w-1.5 h-1.5 rounded-full flex-shrink-0',
          level === 'low' && 'bg-emerald-500',
          level === 'medium' && 'bg-amber-500',
          level === 'high' && 'bg-orange-500',
          level === 'critical' && 'bg-red-500 animate-pulse'
        )}
      />
      {showLabel && labels[level]}
    </span>
  );
}

// ============================================
// Connection Status Badge
// ============================================

interface ConnectionStatusBadgeProps {
  connected: boolean;
  className?: string;
}

export function ConnectionStatusBadge({
  connected,
  className,
}: ConnectionStatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-full',
        connected
          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
          : 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400',
        className
      )}
    >
      <span
        className={cn(
          'w-1.5 h-1.5 rounded-full',
          connected ? 'bg-emerald-500 animate-pulse-subtle' : 'bg-red-500'
        )}
      />
      {connected ? 'Connected' : 'Disconnected'}
    </span>
  );
}

// ============================================
// Generic Status Badge
// ============================================

export interface StatusBadgeProps {
  variant: 'success' | 'warning' | 'error' | 'info' | 'neutral';
  label: string;
  dot?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function StatusBadge({
  variant,
  label,
  dot = false,
  size = 'md',
  className,
}: StatusBadgeProps) {
  const variantStyles = {
    success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
    warning: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
    error: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400',
    info: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
    neutral: 'bg-slate-100 text-slate-700 dark:bg-zinc-700 dark:text-zinc-300',
  };

  const dotColors = {
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
    neutral: 'bg-slate-400',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-medium rounded-full',
        variantStyles[variant],
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs',
        className
      )}
    >
      {dot && (
        <span className={cn('w-1.5 h-1.5 rounded-full', dotColors[variant])} />
      )}
      {label}
    </span>
  );
}

export default StatusBadge;
