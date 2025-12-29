/**
 * AgentOS Ops Console - Pack Overview Component
 * Displays pack metadata, statistics, and key information
 */

'use client';

import React from 'react';
import {
  Package,
  Users,
  Activity,
  TrendingUp,
  Clock,
  Calendar,
  User,
  Mail,
  Shield,
  GitBranch,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  PauseCircle,
  XCircle,
  Zap,
} from 'lucide-react';
import { cn, formatDate, formatRelativeTime, formatNumber, formatPercentage } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/Spinner';
import type { PackData } from './PackDetail';

// ============================================
// Type Definitions
// ============================================

interface PackOverviewProps {
  pack: PackData;
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subValue?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

interface InfoRowProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}

// ============================================
// Stat Card Component
// ============================================

function StatCard({ icon, label, value, subValue, trend, className }: StatCardProps) {
  return (
    <div
      className={cn(
        'p-4 rounded-xl bg-white dark:bg-dark-bg-elevated border border-slate-200 dark:border-dark-border-primary',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="p-2 rounded-lg bg-slate-100 dark:bg-dark-bg-tertiary">
          {icon}
        </div>
        {trend && (
          <div
            className={cn(
              'flex items-center text-xs font-medium',
              trend.isPositive
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-red-600 dark:text-red-400'
            )}
          >
            <TrendingUp
              className={cn('w-3 h-3 mr-1', !trend.isPositive && 'rotate-180')}
            />
            {trend.value}%
          </div>
        )}
      </div>
      <p className="mt-3 text-sm text-slate-500 dark:text-dark-text-tertiary">
        {label}
      </p>
      <p className="text-2xl font-bold text-slate-900 dark:text-dark-text-primary">
        {value}
      </p>
      {subValue && (
        <p className="text-xs text-slate-400 dark:text-dark-text-muted mt-1">
          {subValue}
        </p>
      )}
    </div>
  );
}

// ============================================
// Info Row Component
// ============================================

function InfoRow({ icon, label, value }: InfoRowProps) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-100 dark:border-dark-border-secondary last:border-0">
      <div className="p-1.5 rounded bg-slate-100 dark:bg-dark-bg-tertiary text-slate-500 dark:text-dark-text-tertiary">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-500 dark:text-dark-text-tertiary">
          {label}
        </p>
        <div className="text-sm font-medium text-slate-900 dark:text-dark-text-primary mt-0.5">
          {value}
        </div>
      </div>
    </div>
  );
}

// ============================================
// Agent Status Summary Component
// ============================================

function AgentStatusSummary({ agents }: { agents: PackData['agents'] }) {
  const statusCounts = agents.reduce(
    (acc, agent) => {
      acc[agent.status] = (acc[agent.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const statusConfig = [
    {
      status: 'active',
      label: 'Active',
      icon: CheckCircle,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-100 dark:bg-emerald-500/20',
    },
    {
      status: 'paused',
      label: 'Paused',
      icon: PauseCircle,
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-100 dark:bg-amber-500/20',
    },
    {
      status: 'stopped',
      label: 'Stopped',
      icon: XCircle,
      color: 'text-slate-600 dark:text-slate-400',
      bgColor: 'bg-slate-100 dark:bg-slate-500/20',
    },
    {
      status: 'error',
      label: 'Error',
      icon: AlertCircle,
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-100 dark:bg-red-500/20',
    },
  ];

  return (
    <div className="space-y-3">
      {statusConfig.map(({ status, label, icon: Icon, color, bgColor }) => {
        const count = statusCounts[status] || 0;
        const percentage = agents.length > 0 ? (count / agents.length) * 100 : 0;

        return (
          <div key={status} className="flex items-center gap-3">
            <div className={cn('p-1.5 rounded', bgColor)}>
              <Icon className={cn('w-4 h-4', color)} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-slate-600 dark:text-dark-text-secondary">
                  {label}
                </span>
                <span className="text-sm font-medium text-slate-900 dark:text-dark-text-primary">
                  {count}
                </span>
              </div>
              <ProgressBar
                value={percentage}
                size="sm"
                variant={
                  status === 'active'
                    ? 'success'
                    : status === 'error'
                      ? 'error'
                      : status === 'paused'
                        ? 'warning'
                        : 'default'
                }
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================
// Pack Overview Component
// ============================================

export function PackOverview({ pack }: PackOverviewProps) {
  const averageSuccessRate =
    pack.agents.length > 0
      ? pack.agents.reduce((sum, agent) => sum + agent.successRate, 0) / pack.agents.length
      : 0;

  const totalExecutions = pack.agents.reduce(
    (sum, agent) => sum + agent.executionCount,
    0
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Content - Left Column */}
      <div className="lg:col-span-2 space-y-6">
        {/* Key Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            icon={<Users className="w-5 h-5 text-brand-600 dark:text-brand-400" />}
            label="Total Agents"
            value={pack.totalAgents}
            subValue={`${pack.activeAgents} active`}
          />
          <StatCard
            icon={<Activity className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
            label="Success Rate"
            value={formatPercentage(pack.successRate)}
            trend={{ value: 2.4, isPositive: true }}
          />
          <StatCard
            icon={<Zap className="w-5 h-5 text-purple-600 dark:text-purple-400" />}
            label="Executions"
            value={formatNumber(totalExecutions)}
            subValue="All time"
          />
          <StatCard
            icon={<Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />}
            label="Last Updated"
            value={formatRelativeTime(pack.updatedAt)}
          />
        </div>

        {/* Agent Status Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Agent Status</CardTitle>
          </CardHeader>
          <CardContent>
            <AgentStatusSummary agents={pack.agents} />
          </CardContent>
        </Card>

        {/* Top Performing Agents */}
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Agents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...pack.agents]
                .sort((a, b) => b.successRate - a.successRate)
                .slice(0, 5)
                .map((agent, index) => (
                  <div
                    key={agent.id}
                    className="flex items-center gap-4 p-3 rounded-lg bg-slate-50 dark:bg-dark-bg-tertiary"
                  >
                    <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-500/20 flex items-center justify-center text-sm font-semibold text-brand-600 dark:text-brand-400">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 dark:text-dark-text-primary truncate">
                        {agent.name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-dark-text-tertiary">
                        {formatNumber(agent.executionCount)} executions
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className={cn(
                          'font-semibold',
                          agent.successRate >= 98
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : agent.successRate >= 95
                              ? 'text-blue-600 dark:text-blue-400'
                              : 'text-amber-600 dark:text-amber-400'
                        )}
                      >
                        {formatPercentage(agent.successRate)}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-dark-text-muted">
                        success rate
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sidebar - Right Column */}
      <div className="space-y-6">
        {/* Pack Information */}
        <Card>
          <CardHeader>
            <CardTitle>Pack Information</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <InfoRow
              icon={<Package className="w-4 h-4" />}
              label="Version"
              value={
                <div className="flex items-center gap-2">
                  <span>v{pack.version}</span>
                  <Badge
                    variant={pack.lifecycle === 'stable' ? 'success' : 'warning'}
                    size="sm"
                  >
                    {pack.lifecycle}
                  </Badge>
                </div>
              }
            />
            <InfoRow
              icon={<User className="w-4 h-4" />}
              label="Author"
              value={pack.author.name}
            />
            <InfoRow
              icon={<Mail className="w-4 h-4" />}
              label="Contact"
              value={
                <a
                  href={`mailto:${pack.author.email}`}
                  className="text-brand-600 dark:text-brand-400 hover:underline"
                >
                  {pack.author.email}
                </a>
              }
            />
            <InfoRow
              icon={<Shield className="w-4 h-4" />}
              label="License"
              value={pack.license}
            />
            {pack.repository && (
              <InfoRow
                icon={<GitBranch className="w-4 h-4" />}
                label="Repository"
                value={
                  <a
                    href={pack.repository}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
                  >
                    View on GitHub
                    <ExternalLink className="w-3 h-3" />
                  </a>
                }
              />
            )}
            <InfoRow
              icon={<Calendar className="w-4 h-4" />}
              label="Created"
              value={formatDate(pack.createdAt)}
            />
            {pack.installedAt && (
              <InfoRow
                icon={<CheckCircle className="w-4 h-4" />}
                label="Installed"
                value={formatDate(pack.installedAt)}
              />
            )}
          </CardContent>
        </Card>

        {/* Dependencies Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Dependencies</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {pack.dependencies.slice(0, 5).map((dep) => (
                <div
                  key={dep.id}
                  className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-dark-border-secondary last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'w-2 h-2 rounded-full',
                        dep.installed && dep.compatible
                          ? 'bg-emerald-500'
                          : dep.installed && !dep.compatible
                            ? 'bg-amber-500'
                            : 'bg-slate-300'
                      )}
                    />
                    <span className="text-sm text-slate-700 dark:text-dark-text-secondary font-mono">
                      {dep.name}
                    </span>
                  </div>
                  <Badge
                    variant={dep.type === 'required' ? 'default' : 'outline'}
                    size="sm"
                  >
                    {dep.version}
                  </Badge>
                </div>
              ))}
              {pack.dependencies.length > 5 && (
                <p className="text-sm text-slate-500 dark:text-dark-text-tertiary text-center pt-2">
                  +{pack.dependencies.length - 5} more dependencies
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default PackOverview;
