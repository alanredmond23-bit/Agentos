'use client';

/**
 * AgentOS Agent Studio - Dashboard Component
 * Overview with stats cards, recent activity, quick access to packs, and system health
 * Provides a comprehensive view of the agent ecosystem
 */

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Package,
  Bot,
  GitCommit,
  FileCode2,
  ArrowRight,
  Clock,
  CheckCircle2,
  PlusCircle,
  Edit3,
  Archive,
  Rocket,
  Terminal,
  Search,
  BarChart2,
  Scale,
  Smartphone,
  TrendingUp,
  Layers,
  AlertTriangle,
  Activity,
  Zap,
  Eye,
  Download,
  ExternalLink,
  Star,
  Users,
  Calendar,
  GitBranch,
  Settings,
  RefreshCw,
} from 'lucide-react';
import { cn, formatRelativeTime } from '@/lib/utils';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import type { StudioStats, RecentActivity, PackSummary } from '@/app/studio/page';

// ============================================
// Dashboard Props
// ============================================

interface StudioDashboardProps {
  stats: StudioStats;
  recentActivity: RecentActivity[];
  packs: PackSummary[];
}

// ============================================
// Pack Icon Mapping
// ============================================

const packIcons: Record<string, React.ElementType> = {
  terminal: Terminal,
  'check-circle': CheckCircle2,
  search: Search,
  'bar-chart': BarChart2,
  scale: Scale,
  smartphone: Smartphone,
};

// ============================================
// Activity Type Configuration
// ============================================

const activityConfig: Record<
  RecentActivity['type'],
  { icon: React.ElementType; color: string; label: string }
> = {
  created: {
    icon: PlusCircle,
    color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10',
    label: 'Created',
  },
  updated: {
    icon: Edit3,
    color: 'text-blue-500 bg-blue-50 dark:bg-blue-500/10',
    label: 'Updated',
  },
  deployed: {
    icon: Rocket,
    color: 'text-purple-500 bg-purple-50 dark:bg-purple-500/10',
    label: 'Deployed',
  },
  archived: {
    icon: Archive,
    color: 'text-slate-500 bg-slate-50 dark:bg-slate-500/10',
    label: 'Archived',
  },
};

// ============================================
// System Health Mock Data
// ============================================

interface SystemHealth {
  status: 'healthy' | 'warning' | 'error';
  uptime: string;
  lastDeployment: string;
  activeAgents: number;
  totalAgents: number;
  errorRate: number;
  avgResponseTime: number;
}

const mockSystemHealth: SystemHealth = {
  status: 'healthy',
  uptime: '99.9%',
  lastDeployment: '2024-12-28T09:15:00Z',
  activeAgents: 94,
  totalAgents: 98,
  errorRate: 0.02,
  avgResponseTime: 145,
};

// ============================================
// Trending Templates Mock Data
// ============================================

interface TrendingTemplate {
  id: string;
  name: string;
  category: string;
  downloads: number;
  stars: number;
}

const trendingTemplates: TrendingTemplate[] = [
  { id: '1', name: 'Customer Success Agent', category: 'Support', downloads: 1240, stars: 87 },
  { id: '2', name: 'Code Review Bot', category: 'DevOps', downloads: 980, stars: 72 },
  { id: '3', name: 'Data Pipeline Agent', category: 'Analytics', downloads: 856, stars: 64 },
  { id: '4', name: 'Security Scanner', category: 'Security', downloads: 723, stars: 58 },
];

// ============================================
// Studio Dashboard Component
// ============================================

export function StudioDashboard({
  stats,
  recentActivity,
  packs,
}: StudioDashboardProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-dark-text-primary">
            Agent Studio
          </h1>
          <p className="text-slate-500 dark:text-dark-text-tertiary mt-1">
            Build, configure, and manage your AI agent packs
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" leftIcon={<RefreshCw className="w-4 h-4" />}>
            Sync
          </Button>
          <Link href="/studio/agents/new">
            <Button variant="primary" leftIcon={<Bot className="w-4 h-4" />}>
              New Agent
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        <StatsCard
          title="Total Packs"
          value={stats.totalPacks}
          icon={<Package className="w-5 h-5" />}
          color="purple"
          href="/studio/packs"
          trend={{ value: 2, positive: true }}
        />
        <StatsCard
          title="Total Agents"
          value={stats.totalAgents}
          icon={<Bot className="w-5 h-5" />}
          color="purple"
          href="/studio/agents"
          trend={{ value: 8, positive: true }}
        />
        <StatsCard
          title="Active Packs"
          value={stats.activePacks}
          subtitle={`${stats.draftPacks} drafts`}
          icon={<Zap className="w-5 h-5" />}
          color="emerald"
        />
        <StatsCard
          title="Recent Changes"
          value={stats.recentChanges}
          subtitle="Last 7 days"
          icon={<GitCommit className="w-5 h-5" />}
          color="blue"
        />
        <StatsCard
          title="Templates"
          value={stats.templatesAvailable}
          subtitle="Available"
          icon={<FileCode2 className="w-5 h-5" />}
          color="amber"
          href="/studio/templates"
        />
        <StatsCard
          title="Dependencies"
          value={42}
          subtitle="Resolved"
          icon={<GitBranch className="w-5 h-5" />}
          color="purple"
          href="/studio/graph"
        />
      </div>

      {/* System Health Banner */}
      <SystemHealthBanner health={mockSystemHealth} />

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Activity - Takes 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader
              action={
                <Link href="/studio/activity">
                  <Button
                    variant="ghost"
                    size="sm"
                    rightIcon={<ArrowRight className="w-4 h-4" />}
                  >
                    View All
                  </Button>
                </Link>
              }
            >
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest changes across your packs</CardDescription>
            </CardHeader>
            <CardContent noPadding>
              <div className="divide-y divide-slate-100 dark:divide-dark-border-primary">
                {recentActivity.map((activity) => (
                  <ActivityItem key={activity.id} activity={activity} />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Trending Templates */}
          <Card>
            <CardHeader
              action={
                <Link href="/studio/templates">
                  <Button
                    variant="ghost"
                    size="sm"
                    rightIcon={<ArrowRight className="w-4 h-4" />}
                  >
                    Browse All
                  </Button>
                </Link>
              }
            >
              <CardTitle>Trending Templates</CardTitle>
              <CardDescription>Popular templates from the community</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                {trendingTemplates.map((template) => (
                  <TrendingTemplateCard key={template.id} template={template} />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Quick Actions & Info */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common tasks and shortcuts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <QuickActionButton
                  icon={<Bot className="w-5 h-5" />}
                  title="Create New Agent"
                  description="Start from scratch"
                  href="/studio/agents/new"
                  shortcut="N"
                />
                <QuickActionButton
                  icon={<Package className="w-5 h-5" />}
                  title="Browse Packs"
                  description={`View all ${stats.totalPacks} packs`}
                  href="/studio/packs"
                  shortcut="P"
                />
                <QuickActionButton
                  icon={<FileCode2 className="w-5 h-5" />}
                  title="Import YAML"
                  description="Import configuration"
                  shortcut="I"
                />
                <QuickActionButton
                  icon={<Layers className="w-5 h-5" />}
                  title="Visual Builder"
                  description="Drag and drop editor"
                  href="/studio/builder"
                  badge="Beta"
                />
                <QuickActionButton
                  icon={<GitBranch className="w-5 h-5" />}
                  title="View Graph"
                  description="Dependency visualization"
                  href="/studio/graph"
                  shortcut="G"
                />
              </div>
            </CardContent>
          </Card>

          {/* Getting Started */}
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-500/10 dark:to-purple-500/5 border-purple-200 dark:border-purple-500/30">
            <CardHeader>
              <CardTitle className="text-purple-900 dark:text-purple-100">
                Getting Started
              </CardTitle>
              <CardDescription className="text-purple-700 dark:text-purple-300">
                New to Agent Studio? Start here.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                <GettingStartedItem
                  completed
                  label="Create your first pack"
                />
                <GettingStartedItem
                  completed
                  label="Configure an agent"
                />
                <GettingStartedItem
                  completed={false}
                  label="Set up MCP servers"
                />
                <GettingStartedItem
                  completed={false}
                  label="Deploy to production"
                />
              </ul>
            </CardContent>
            <CardFooter bordered={false}>
              <Link href="/docs/studio/getting-started" className="w-full">
                <Button variant="outline" fullWidth rightIcon={<ExternalLink className="w-4 h-4" />}>
                  View Documentation
                </Button>
              </Link>
            </CardFooter>
          </Card>

          {/* Keyboard Shortcuts */}
          <Card>
            <CardHeader>
              <CardTitle>Keyboard Shortcuts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <ShortcutRow keys={['Cmd', 'K']} label="Search" />
                <ShortcutRow keys={['N']} label="New Agent" />
                <ShortcutRow keys={['P']} label="Browse Packs" />
                <ShortcutRow keys={['G', 'D']} label="Go to Dashboard" />
                <ShortcutRow keys={['?']} label="Show all shortcuts" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Packs Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-dark-text-primary">
              Your Packs
            </h2>
            <p className="text-sm text-slate-500 dark:text-dark-text-tertiary">
              {stats.activePacks} active, {stats.draftPacks} drafts
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-slate-100 dark:bg-dark-bg-tertiary rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  'p-1.5 rounded transition-colors',
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-dark-bg-elevated shadow-sm'
                    : 'text-slate-500 dark:text-dark-text-tertiary hover:text-slate-700 dark:hover:text-dark-text-secondary'
                )}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  'p-1.5 rounded transition-colors',
                  viewMode === 'list'
                    ? 'bg-white dark:bg-dark-bg-elevated shadow-sm'
                    : 'text-slate-500 dark:text-dark-text-tertiary hover:text-slate-700 dark:hover:text-dark-text-secondary'
                )}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
            <Link href="/studio/packs">
              <Button
                variant="ghost"
                size="sm"
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                View All
              </Button>
            </Link>
          </div>
        </div>

        {viewMode === 'grid' ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {packs.map((pack) => (
              <PackCard key={pack.id} pack={pack} />
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-dark-bg-primary rounded-xl border border-slate-200 dark:border-dark-border-primary overflow-hidden">
            {packs.map((pack, index) => (
              <PackListItem key={pack.id} pack={pack} isLast={index === packs.length - 1} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// Stats Card Component
// ============================================

interface StatsCardProps {
  title: string;
  value: number;
  subtitle?: string;
  icon: React.ReactNode;
  color: 'purple' | 'blue' | 'emerald' | 'amber';
  href?: string;
  trend?: { value: number; positive: boolean };
}

function StatsCard({ title, value, subtitle, icon, color, href, trend }: StatsCardProps) {
  const colorStyles = {
    purple: 'bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400',
    blue: 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400',
    emerald: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    amber: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400',
  };

  const content = (
    <div className={cn(
      'p-4 rounded-xl bg-white dark:bg-dark-bg-primary border border-slate-200 dark:border-dark-border-primary transition-all',
      href && 'hover:shadow-md hover:border-purple-200 dark:hover:border-purple-500/30 cursor-pointer'
    )}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-dark-text-tertiary">
            {title}
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <p className="text-2xl font-bold text-slate-900 dark:text-dark-text-primary">
              {value}
            </p>
            {trend && (
              <span className={cn(
                'text-xs font-medium flex items-center gap-0.5',
                trend.positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
              )}>
                <TrendingUp className={cn('w-3 h-3', !trend.positive && 'rotate-180')} />
                +{trend.value}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-slate-400 dark:text-dark-text-muted mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
        <div className={cn('p-2 rounded-lg', colorStyles[color])}>
          {icon}
        </div>
      </div>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}

// ============================================
// System Health Banner Component
// ============================================

function SystemHealthBanner({ health }: { health: SystemHealth }) {
  const statusConfig = {
    healthy: {
      color: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/30',
      icon: 'text-emerald-500',
      label: 'All Systems Operational',
    },
    warning: {
      color: 'bg-amber-50 border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/30',
      icon: 'text-amber-500',
      label: 'Some Issues Detected',
    },
    error: {
      color: 'bg-red-50 border-red-200 dark:bg-red-500/10 dark:border-red-500/30',
      icon: 'text-red-500',
      label: 'System Issues',
    },
  };

  const config = statusConfig[health.status];

  return (
    <div className={cn('rounded-xl border p-4', config.color)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={cn('p-2 rounded-lg bg-white dark:bg-dark-bg-elevated', config.icon)}>
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <p className="font-medium text-slate-900 dark:text-dark-text-primary">
              {config.label}
            </p>
            <p className="text-sm text-slate-500 dark:text-dark-text-tertiary">
              Last deployment: {formatRelativeTime(health.lastDeployment)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-center">
            <p className="text-sm font-medium text-slate-900 dark:text-dark-text-primary">{health.uptime}</p>
            <p className="text-xs text-slate-500 dark:text-dark-text-tertiary">Uptime</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-slate-900 dark:text-dark-text-primary">
              {health.activeAgents}/{health.totalAgents}
            </p>
            <p className="text-xs text-slate-500 dark:text-dark-text-tertiary">Active Agents</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-slate-900 dark:text-dark-text-primary">
              {health.avgResponseTime}ms
            </p>
            <p className="text-xs text-slate-500 dark:text-dark-text-tertiary">Avg Response</p>
          </div>
          <Link href="/studio/health">
            <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
              Details
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Activity Item Component
// ============================================

function ActivityItem({ activity }: { activity: RecentActivity }) {
  const config = activityConfig[activity.type];
  const Icon = config.icon;

  return (
    <div className="flex items-start gap-4 p-4 hover:bg-slate-50 dark:hover:bg-dark-bg-tertiary transition-colors">
      <div className={cn('p-2 rounded-lg', config.color)}>
        <Icon className="w-4 h-4" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-900 dark:text-dark-text-primary">
            {config.label}
          </span>
          <span className="text-sm text-slate-500 dark:text-dark-text-tertiary">
            {activity.agentName ? (
              <>
                <span className="font-medium">{activity.agentName}</span>
                <span className="mx-1">in</span>
              </>
            ) : null}
            <Link
              href={`/studio/packs/${activity.packName}`}
              className="font-medium text-purple-600 dark:text-purple-400 hover:underline"
            >
              {activity.packName}
            </Link>
          </span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-slate-400 dark:text-dark-text-muted">
            {activity.user}
          </span>
          <span className="text-xs text-slate-300 dark:text-dark-border-secondary">
            |
          </span>
          <span className="text-xs text-slate-400 dark:text-dark-text-muted flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatRelativeTime(activity.timestamp)}
          </span>
        </div>
      </div>

      <Link
        href={`/studio/packs/${activity.packName}`}
        className="p-2 text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-500/10 transition-colors"
      >
        <Eye className="w-4 h-4" />
      </Link>
    </div>
  );
}

// ============================================
// Quick Action Button Component
// ============================================

interface QuickActionButtonProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  href?: string;
  badge?: string;
  shortcut?: string;
}

function QuickActionButton({
  icon,
  title,
  description,
  href,
  badge,
  shortcut,
}: QuickActionButtonProps) {
  const content = (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-dark-bg-tertiary hover:bg-purple-50 dark:hover:bg-purple-500/10 transition-colors cursor-pointer group">
      <div className="p-2 rounded-lg bg-white dark:bg-dark-bg-elevated text-purple-600 dark:text-purple-400 shadow-sm group-hover:shadow-md transition-shadow">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-slate-900 dark:text-dark-text-primary">
            {title}
          </p>
          {badge && (
            <span className="px-1.5 py-0.5 text-2xs font-semibold rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
              {badge}
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500 dark:text-dark-text-tertiary">
          {description}
        </p>
      </div>
      {shortcut ? (
        <kbd className="px-1.5 py-0.5 text-2xs font-medium bg-white dark:bg-dark-bg-elevated rounded border border-slate-200 dark:border-dark-border-primary text-slate-400 dark:text-dark-text-muted">
          {shortcut}
        </kbd>
      ) : (
        <ArrowRight className="w-4 h-4 text-slate-400 dark:text-dark-text-muted group-hover:text-purple-500 dark:group-hover:text-purple-400 transition-colors" />
      )}
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return <button className="w-full text-left">{content}</button>;
}

// ============================================
// Trending Template Card Component
// ============================================

function TrendingTemplateCard({ template }: { template: TrendingTemplate }) {
  return (
    <Link
      href={`/studio/templates/${template.id}`}
      className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-dark-bg-tertiary hover:bg-purple-50 dark:hover:bg-purple-500/10 transition-colors group"
    >
      <div className="p-2 rounded-lg bg-white dark:bg-dark-bg-elevated text-purple-600 dark:text-purple-400 shadow-sm">
        <FileCode2 className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900 dark:text-dark-text-primary truncate">
          {template.name}
        </p>
        <p className="text-xs text-slate-500 dark:text-dark-text-tertiary">
          {template.category}
        </p>
      </div>
      <div className="flex items-center gap-3 text-xs text-slate-400 dark:text-dark-text-muted">
        <span className="flex items-center gap-1">
          <Download className="w-3 h-3" />
          {template.downloads}
        </span>
        <span className="flex items-center gap-1">
          <Star className="w-3 h-3" />
          {template.stars}
        </span>
      </div>
    </Link>
  );
}

// ============================================
// Getting Started Item Component
// ============================================

function GettingStartedItem({ completed, label }: { completed: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2">
      <div className={cn(
        'w-5 h-5 rounded-full flex items-center justify-center',
        completed
          ? 'bg-purple-600 text-white'
          : 'border-2 border-purple-300 dark:border-purple-500/50'
      )}>
        {completed && <CheckCircle2 className="w-3 h-3" />}
      </div>
      <span className={cn(
        'text-sm',
        completed
          ? 'text-slate-500 dark:text-dark-text-tertiary line-through'
          : 'text-purple-900 dark:text-purple-100'
      )}>
        {label}
      </span>
    </li>
  );
}

// ============================================
// Shortcut Row Component
// ============================================

function ShortcutRow({ keys, label }: { keys: string[]; label: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-600 dark:text-dark-text-secondary">{label}</span>
      <div className="flex items-center gap-1">
        {keys.map((key, index) => (
          <React.Fragment key={index}>
            <kbd className="px-1.5 py-0.5 text-2xs font-medium bg-slate-100 dark:bg-dark-bg-tertiary rounded text-slate-500 dark:text-dark-text-tertiary">
              {key}
            </kbd>
            {index < keys.length - 1 && <span className="text-slate-400">+</span>}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

// ============================================
// Pack Card Component
// ============================================

function PackCard({ pack }: { pack: PackSummary }) {
  const IconComponent = packIcons[pack.icon] || Package;

  return (
    <Link href={`/studio/packs/${pack.slug}`}>
      <div className="p-4 rounded-xl bg-white dark:bg-dark-bg-primary border border-slate-200 dark:border-dark-border-primary hover:shadow-md hover:border-purple-200 dark:hover:border-purple-500/30 transition-all group">
        <div className="flex items-start justify-between mb-3">
          <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400">
            <IconComponent className="w-5 h-5" />
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                'w-2 h-2 rounded-full',
                pack.status === 'active' && 'bg-emerald-500',
                pack.status === 'draft' && 'bg-amber-500',
                pack.status === 'archived' && 'bg-slate-400'
              )}
            />
            <span className="text-xs text-slate-500 dark:text-dark-text-tertiary capitalize">
              {pack.status}
            </span>
          </div>
        </div>

        <h3 className="text-sm font-semibold text-slate-900 dark:text-dark-text-primary group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
          {pack.name}
        </h3>
        <p className="text-xs text-slate-500 dark:text-dark-text-tertiary mt-1 line-clamp-2">
          {pack.description}
        </p>

        <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-dark-border-primary">
          <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-dark-text-tertiary">
            <Bot className="w-3.5 h-3.5" />
            <span>{pack.agentCount} agents</span>
          </div>
          <span className="text-xs text-slate-400 dark:text-dark-text-muted">
            {formatRelativeTime(pack.lastUpdated)}
          </span>
        </div>
      </div>
    </Link>
  );
}

// ============================================
// Pack List Item Component
// ============================================

function PackListItem({ pack, isLast }: { pack: PackSummary; isLast: boolean }) {
  const IconComponent = packIcons[pack.icon] || Package;

  return (
    <Link
      href={`/studio/packs/${pack.slug}`}
      className={cn(
        'flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-dark-bg-tertiary transition-colors',
        !isLast && 'border-b border-slate-100 dark:border-dark-border-primary'
      )}
    >
      <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400">
        <IconComponent className="w-5 h-5" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-dark-text-primary">
            {pack.name}
          </h3>
          <span
            className={cn(
              'px-2 py-0.5 text-2xs font-semibold rounded-full',
              pack.status === 'active' && 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
              pack.status === 'draft' && 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
              pack.status === 'archived' && 'bg-slate-100 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400'
            )}
          >
            {pack.status}
          </span>
        </div>
        <p className="text-xs text-slate-500 dark:text-dark-text-tertiary mt-0.5 truncate">
          {pack.description}
        </p>
      </div>

      <div className="flex items-center gap-6 text-xs text-slate-500 dark:text-dark-text-tertiary">
        <div className="flex items-center gap-1">
          <Bot className="w-3.5 h-3.5" />
          <span>{pack.agentCount} agents</span>
        </div>
        <div className="w-24 text-right">
          {formatRelativeTime(pack.lastUpdated)}
        </div>
      </div>

      <ArrowRight className="w-4 h-4 text-slate-400 dark:text-dark-text-muted" />
    </Link>
  );
}

export default StudioDashboard;
