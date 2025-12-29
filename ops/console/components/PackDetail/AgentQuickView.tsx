/**
 * AgentOS Ops Console - Agent Quick View Component
 * Modal popup showing agent details on hover/click
 */

'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  X,
  Bot,
  Shield,
  ShieldCheck,
  ShieldAlert,
  ShieldOff,
  CheckCircle,
  AlertCircle,
  PauseCircle,
  XCircle,
  ExternalLink,
  FileCode2,
  Settings,
  Play,
  Pause,
  Zap,
  TrendingUp,
  Clock,
  Activity,
} from 'lucide-react';
import { cn, formatNumber, formatPercentage } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/Spinner';
import type { PackAgent } from './PackDetail';

// ============================================
// Type Definitions
// ============================================

interface AgentQuickViewProps {
  agent: PackAgent;
  isOpen: boolean;
  onClose: () => void;
  position?: 'center' | 'right';
  packSlug?: string;
}

type AuthorityLevel = PackAgent['authorityLevel'];
type AgentStatus = PackAgent['status'];

// ============================================
// Authority Level Configuration
// ============================================

const authorityConfig: Record<
  AuthorityLevel,
  {
    icon: React.ElementType;
    label: string;
    description: string;
    variant: 'default' | 'info' | 'warning' | 'error';
    color: string;
  }
> = {
  read: {
    icon: ShieldOff,
    label: 'Read Only',
    description: 'Can only view data and reports',
    variant: 'default',
    color: 'text-slate-500 dark:text-slate-400',
  },
  write: {
    icon: Shield,
    label: 'Write Access',
    description: 'Can modify data within designated scope',
    variant: 'info',
    color: 'text-blue-600 dark:text-blue-400',
  },
  admin: {
    icon: ShieldCheck,
    label: 'Admin Access',
    description: 'Full access to pack resources and settings',
    variant: 'warning',
    color: 'text-amber-600 dark:text-amber-400',
  },
  system: {
    icon: ShieldAlert,
    label: 'System Level',
    description: 'Elevated privileges for system operations',
    variant: 'error',
    color: 'text-red-600 dark:text-red-400',
  },
};

// ============================================
// Status Configuration
// ============================================

const statusConfig: Record<
  AgentStatus,
  {
    icon: React.ElementType;
    label: string;
    description: string;
    variant: 'success' | 'warning' | 'error' | 'default';
    bgColor: string;
  }
> = {
  active: {
    icon: CheckCircle,
    label: 'Active',
    description: 'Agent is running and processing tasks',
    variant: 'success',
    bgColor: 'bg-emerald-500',
  },
  paused: {
    icon: PauseCircle,
    label: 'Paused',
    description: 'Agent is temporarily suspended',
    variant: 'warning',
    bgColor: 'bg-amber-500',
  },
  stopped: {
    icon: XCircle,
    label: 'Stopped',
    description: 'Agent is not running',
    variant: 'default',
    bgColor: 'bg-slate-400',
  },
  error: {
    icon: AlertCircle,
    label: 'Error',
    description: 'Agent encountered an error and needs attention',
    variant: 'error',
    bgColor: 'bg-red-500',
  },
};

// ============================================
// Capability Item Component
// ============================================

interface CapabilityItemProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

function CapabilityItem({ icon: Icon, label, value, trend }: CapabilityItemProps) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-dark-text-tertiary">
        <Icon className="w-4 h-4" />
        <span>{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-medium text-slate-900 dark:text-dark-text-primary">
          {value}
        </span>
        {trend && (
          <span
            className={cn(
              'flex items-center text-xs font-medium',
              trend.isPositive
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-red-600 dark:text-red-400'
            )}
          >
            <TrendingUp
              className={cn('w-3 h-3 mr-0.5', !trend.isPositive && 'rotate-180')}
            />
            {trend.value}%
          </span>
        )}
      </div>
    </div>
  );
}

// ============================================
// Agent Quick View Component
// ============================================

export function AgentQuickView({
  agent,
  isOpen,
  onClose,
  position = 'center',
  packSlug,
}: AgentQuickViewProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const authority = authorityConfig[agent.authorityLevel];
  const status = statusConfig[agent.status];
  const AuthorityIcon = authority.icon;
  const StatusIcon = status.icon;

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={modalRef}
        className={cn(
          'relative w-full max-w-lg bg-white dark:bg-dark-bg-elevated rounded-2xl shadow-2xl animate-scale-in',
          position === 'right' && 'ml-auto mr-6'
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="agent-quick-view-title"
      >
        {/* Header */}
        <div className="flex items-start gap-4 p-6 border-b border-slate-200 dark:border-dark-border-primary">
          {/* Agent Icon */}
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-brand-600 flex items-center justify-center shadow-lg">
            <Bot className="w-7 h-7 text-white" />
          </div>

          {/* Agent Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <h2
                id="agent-quick-view-title"
                className="text-xl font-bold text-slate-900 dark:text-dark-text-primary truncate"
              >
                {agent.name}
              </h2>
              <Badge variant={status.variant} size="sm" dot dotColor={status.variant}>
                {status.label}
              </Badge>
            </div>
            <p className="text-sm text-slate-500 dark:text-dark-text-tertiary mt-1">
              v{agent.version}
            </p>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:text-dark-text-muted dark:hover:text-dark-text-secondary rounded-lg hover:bg-slate-100 dark:hover:bg-dark-bg-tertiary transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Description */}
          <div>
            <h3 className="text-sm font-medium text-slate-900 dark:text-dark-text-primary mb-2">
              Description
            </h3>
            <p className="text-sm text-slate-600 dark:text-dark-text-secondary leading-relaxed">
              {agent.description}
            </p>
          </div>

          {/* Role & Authority */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-dark-bg-tertiary">
              <p className="text-xs font-medium text-slate-500 dark:text-dark-text-tertiary uppercase tracking-wider mb-2">
                Role
              </p>
              <Badge variant="outline" size="sm">
                {agent.role.charAt(0).toUpperCase() + agent.role.slice(1)}
              </Badge>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-dark-bg-tertiary">
              <p className="text-xs font-medium text-slate-500 dark:text-dark-text-tertiary uppercase tracking-wider mb-2">
                Authority Level
              </p>
              <div className="flex items-center gap-2">
                <AuthorityIcon className={cn('w-4 h-4', authority.color)} />
                <span className={cn('text-sm font-medium', authority.color)}>
                  {authority.label}
                </span>
              </div>
            </div>
          </div>

          {/* Authority Description */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-dark-bg-tertiary border-l-4 border-l-purple-500">
            <p className="text-sm text-slate-600 dark:text-dark-text-secondary">
              <strong className="font-medium text-slate-900 dark:text-dark-text-primary">
                {authority.label}:
              </strong>{' '}
              {authority.description}
            </p>
          </div>

          {/* Key Metrics */}
          <div>
            <h3 className="text-sm font-medium text-slate-900 dark:text-dark-text-primary mb-3">
              Key Capabilities
            </h3>
            <div className="divide-y divide-slate-100 dark:divide-dark-border-secondary">
              <CapabilityItem
                icon={Zap}
                label="Total Executions"
                value={formatNumber(agent.executionCount)}
              />
              <CapabilityItem
                icon={Activity}
                label="Success Rate"
                value={formatPercentage(agent.successRate)}
                trend={{ value: 2.1, isPositive: true }}
              />
              <CapabilityItem
                icon={Clock}
                label="Avg. Response Time"
                value="1.2s"
              />
            </div>
          </div>

          {/* Success Rate Progress */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-500 dark:text-dark-text-tertiary">
                Performance Score
              </span>
              <span
                className={cn(
                  'font-semibold',
                  agent.successRate >= 98
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : agent.successRate >= 95
                      ? 'text-blue-600 dark:text-blue-400'
                      : agent.successRate >= 90
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-red-600 dark:text-red-400'
                )}
              >
                {formatPercentage(agent.successRate)}
              </span>
            </div>
            <ProgressBar
              value={agent.successRate}
              size="md"
              variant={
                agent.successRate >= 95
                  ? 'success'
                  : agent.successRate >= 90
                    ? 'warning'
                    : 'error'
              }
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center gap-3 p-6 border-t border-slate-200 dark:border-dark-border-primary bg-slate-50 dark:bg-dark-bg-tertiary rounded-b-2xl">
          <Link href={`/studio/agents/${agent.slug}`} className="flex-1">
            <Button
              variant="primary"
              fullWidth
              leftIcon={<Settings className="w-4 h-4" />}
            >
              Edit Agent
            </Button>
          </Link>
          <Link href={`/studio/agents/${agent.slug}/yaml`} className="flex-1">
            <Button
              variant="secondary"
              fullWidth
              leftIcon={<FileCode2 className="w-4 h-4" />}
            >
              View YAML
            </Button>
          </Link>
          {agent.status === 'active' ? (
            <Button
              variant="ghost"
              leftIcon={<Pause className="w-4 h-4" />}
              aria-label="Pause Agent"
            />
          ) : (
            <Button
              variant="ghost"
              leftIcon={<Play className="w-4 h-4" />}
              aria-label="Start Agent"
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// Hover Quick View Component
// ============================================

interface AgentHoverCardProps {
  agent: PackAgent;
  children: React.ReactNode;
}

export function AgentHoverCard({ agent, children }: AgentHoverCardProps) {
  const [isVisible, setIsVisible] = React.useState(false);
  const [position, setPosition] = React.useState({ top: 0, left: 0 });
  const triggerRef = React.useRef<HTMLDivElement>(null);
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const authority = authorityConfig[agent.authorityLevel];
  const status = statusConfig[agent.status];
  const StatusIcon = status.icon;

  const showCard = () => {
    timeoutRef.current = setTimeout(() => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        setPosition({
          top: rect.bottom + 8,
          left: Math.min(rect.left, window.innerWidth - 320),
        });
      }
      setIsVisible(true);
    }, 400);
  };

  const hideCard = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={triggerRef}
      className="relative inline-block"
      onMouseEnter={showCard}
      onMouseLeave={hideCard}
    >
      {children}

      {isVisible && (
        <div
          className="fixed z-[var(--z-popover)] w-80 p-4 bg-white dark:bg-dark-bg-elevated rounded-xl shadow-xl border border-slate-200 dark:border-dark-border-primary animate-fade-in"
          style={{ top: position.top, left: position.left }}
          onMouseEnter={() => setIsVisible(true)}
          onMouseLeave={hideCard}
        >
          {/* Agent Header */}
          <div className="flex items-start gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-brand-600 flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-slate-900 dark:text-dark-text-primary truncate">
                {agent.name}
              </h4>
              <p className="text-xs text-slate-500 dark:text-dark-text-tertiary">
                v{agent.version}
              </p>
            </div>
            <Badge variant={status.variant} size="sm">
              {status.label}
            </Badge>
          </div>

          {/* Description */}
          <p className="text-sm text-slate-600 dark:text-dark-text-secondary line-clamp-2 mb-3">
            {agent.description}
          </p>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="p-2 rounded-lg bg-slate-50 dark:bg-dark-bg-tertiary">
              <p className="text-xs text-slate-500 dark:text-dark-text-tertiary">
                Authority
              </p>
              <p className={cn('text-sm font-medium', authority.color)}>
                {authority.label}
              </p>
            </div>
            <div className="p-2 rounded-lg bg-slate-50 dark:bg-dark-bg-tertiary">
              <p className="text-xs text-slate-500 dark:text-dark-text-tertiary">
                Success Rate
              </p>
              <p className="text-sm font-medium text-slate-900 dark:text-dark-text-primary">
                {formatPercentage(agent.successRate)}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-dark-border-secondary">
            <Link
              href={`/studio/agents/${agent.slug}`}
              className="flex items-center gap-1 text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline"
            >
              <ExternalLink className="w-3 h-3" />
              View Details
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default AgentQuickView;
