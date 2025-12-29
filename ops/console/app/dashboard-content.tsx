'use client';

/**
 * AgentOS Ops Console - Dashboard Content
 * Main dashboard with real-time metrics and activity feed
 */

import React from 'react';
import Link from 'next/link';
import {
  Bot,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  Activity,
  AlertTriangle,
  ArrowRight,
  Play,
  Pause,
  RefreshCw,
  Zap,
  DollarSign,
  BarChart3,
} from 'lucide-react';
import { cn, formatRelativeTime, formatNumber, formatCurrency } from '@/lib/utils';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/Card';
import { StatsCard, MiniStatsCard, Sparkline } from '@/components/ui/StatsCard';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { AgentStatusBadge, PriorityBadge, RiskLevelBadge } from '@/components/ui/StatusBadge';
import { AgentAvatar } from '@/components/ui/Avatar';
import type { Agent, ApprovalRequest, AuditLog, DashboardMetrics } from '@/types';

// ============================================
// Mock Data
// ============================================

const mockMetrics: DashboardMetrics = {
  agents: {
    total: 14,
    active: 12,
    paused: 1,
    error: 1,
  },
  approvals: {
    pending: 5,
    approved_today: 23,
    rejected_today: 2,
    average_response_time_ms: 45000,
  },
  executions: {
    total_today: 1247,
    successful_today: 1198,
    failed_today: 49,
    success_rate: 96.1,
  },
  costs: {
    today_usd: 127.45,
    week_usd: 892.30,
    month_usd: 3456.78,
    trend_percentage: -12.5,
  },
};

const mockAgents: Agent[] = [
  {
    id: '1',
    name: 'DevOps Automation',
    slug: 'devops-automation',
    description: 'Automates CI/CD pipelines and infrastructure management',
    pack: 'devops',
    status: 'active',
    version: '2.1.0',
    capabilities: [],
    configuration: {} as Agent['configuration'],
    metrics: {
      total_executions: 1523,
      successful_executions: 1498,
      failed_executions: 25,
      average_duration_ms: 4500,
      tokens_consumed: 125000,
      cost_usd: 45.67,
      success_rate: 98.4,
    },
    created_at: '2024-01-15T10:30:00Z',
    updated_at: '2024-12-28T08:45:00Z',
    created_by: 'user-1',
    last_execution_at: '2024-12-28T09:15:00Z',
  },
  {
    id: '2',
    name: 'QA Test Runner',
    slug: 'qa-test-runner',
    description: 'Executes automated test suites and reports results',
    pack: 'qa',
    status: 'active',
    version: '1.8.2',
    capabilities: [],
    configuration: {} as Agent['configuration'],
    metrics: {
      total_executions: 892,
      successful_executions: 867,
      failed_executions: 25,
      average_duration_ms: 12000,
      tokens_consumed: 89000,
      cost_usd: 32.10,
      success_rate: 97.2,
    },
    created_at: '2024-02-20T14:00:00Z',
    updated_at: '2024-12-28T07:30:00Z',
    created_by: 'user-1',
    last_execution_at: '2024-12-28T09:00:00Z',
  },
  {
    id: '3',
    name: 'Research Assistant',
    slug: 'research-assistant',
    description: 'Conducts market research and competitive analysis',
    pack: 'research',
    status: 'active',
    version: '1.5.0',
    capabilities: [],
    configuration: {} as Agent['configuration'],
    metrics: {
      total_executions: 234,
      successful_executions: 228,
      failed_executions: 6,
      average_duration_ms: 25000,
      tokens_consumed: 450000,
      cost_usd: 89.50,
      success_rate: 97.4,
    },
    created_at: '2024-03-10T09:00:00Z',
    updated_at: '2024-12-27T16:20:00Z',
    created_by: 'user-2',
    last_execution_at: '2024-12-28T08:30:00Z',
  },
  {
    id: '4',
    name: 'Error Predictor',
    slug: 'error-predictor',
    description: 'Predicts and alerts on potential system failures',
    pack: 'error_predictor',
    status: 'error',
    version: '0.9.1',
    capabilities: [],
    configuration: {} as Agent['configuration'],
    metrics: {
      total_executions: 567,
      successful_executions: 498,
      failed_executions: 69,
      average_duration_ms: 8000,
      tokens_consumed: 78000,
      cost_usd: 28.90,
      success_rate: 87.8,
    },
    created_at: '2024-04-05T11:30:00Z',
    updated_at: '2024-12-28T09:20:00Z',
    created_by: 'user-1',
    last_execution_at: '2024-12-28T09:18:00Z',
  },
];

const mockPendingApprovals: ApprovalRequest[] = [
  {
    id: 'apr-1',
    agent_id: '1',
    agent_name: 'DevOps Automation',
    action_type: 'deployment',
    title: 'Deploy to Production',
    description: 'Deploy v2.1.5 of the payment service to production cluster',
    risk_level: 'high',
    status: 'pending',
    payload: {} as ApprovalRequest['payload'],
    context: {
      session_id: 'sess-1',
      conversation_id: null,
      parent_action_id: null,
      triggered_by: 'Scheduled deployment',
      environment: 'production',
      tags: ['deployment', 'payment-service'],
    },
    requested_at: '2024-12-28T09:10:00Z',
    responded_at: null,
    responded_by: null,
    response_note: null,
    expires_at: '2024-12-28T10:10:00Z',
    priority: 'high',
  },
  {
    id: 'apr-2',
    agent_id: '3',
    agent_name: 'Research Assistant',
    action_type: 'api_call',
    title: 'Access External API',
    description: 'Request access to Bloomberg Terminal API for market data',
    risk_level: 'medium',
    status: 'pending',
    payload: {} as ApprovalRequest['payload'],
    context: {
      session_id: 'sess-2',
      conversation_id: null,
      parent_action_id: null,
      triggered_by: 'Research task',
      environment: 'production',
      tags: ['api', 'external', 'market-data'],
    },
    requested_at: '2024-12-28T08:45:00Z',
    responded_at: null,
    responded_by: null,
    response_note: null,
    expires_at: '2024-12-28T09:45:00Z',
    priority: 'medium',
  },
  {
    id: 'apr-3',
    agent_id: '2',
    agent_name: 'QA Test Runner',
    action_type: 'database_write',
    title: 'Update Test Database',
    description: 'Apply schema migration to staging test database',
    risk_level: 'low',
    status: 'pending',
    payload: {} as ApprovalRequest['payload'],
    context: {
      session_id: 'sess-3',
      conversation_id: null,
      parent_action_id: null,
      triggered_by: 'Test suite preparation',
      environment: 'staging',
      tags: ['database', 'migration', 'staging'],
    },
    requested_at: '2024-12-28T08:30:00Z',
    responded_at: null,
    responded_by: null,
    response_note: null,
    expires_at: '2024-12-28T09:30:00Z',
    priority: 'low',
  },
];

const executionSparkline = [45, 52, 48, 61, 55, 67, 72, 68, 75, 82, 78, 85];
const costSparkline = [120, 115, 128, 135, 142, 138, 145, 155, 148, 140, 132, 127];

// ============================================
// Dashboard Content Component
// ============================================

export function DashboardContent() {
  const currentHour = new Date().getHours();
  const greeting =
    currentHour < 12
      ? 'Good morning'
      : currentHour < 18
        ? 'Good afternoon'
        : 'Good evening';

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">{greeting}, Operator</h1>
        <p className="page-description">
          Here's what's happening with your agents today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Active Agents"
          value={mockMetrics.agents.active}
          icon={<Bot className="w-5 h-5" />}
          trend={{
            value: 8.3,
            direction: 'up',
            label: 'from last week',
          }}
        />

        <StatsCard
          title="Pending Approvals"
          value={mockMetrics.approvals.pending}
          icon={<Clock className="w-5 h-5" />}
          trend={{
            value: 2,
            direction: 'down',
            label: 'vs yesterday',
          }}
        />

        <StatsCard
          title="Executions Today"
          value={mockMetrics.executions.total_today}
          format="compact"
          icon={<Activity className="w-5 h-5" />}
          sparkline={executionSparkline}
        />

        <StatsCard
          title="Cost Today"
          value={mockMetrics.costs.today_usd}
          format="currency"
          icon={<DollarSign className="w-5 h-5" />}
          trend={{
            value: Math.abs(mockMetrics.costs.trend_percentage),
            direction: mockMetrics.costs.trend_percentage < 0 ? 'down' : 'up',
            label: 'vs yesterday',
          }}
          sparkline={costSparkline}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Pending Approvals */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader
              action={
                <Link href="/approvals">
                  <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
                    View All
                  </Button>
                </Link>
              }
            >
              <CardTitle>Pending Approvals</CardTitle>
              <CardDescription>
                Actions requiring your review
              </CardDescription>
            </CardHeader>
            <CardContent noPadding>
              <div className="divide-y divide-slate-100 dark:divide-dark-border-primary">
                {mockPendingApprovals.map((approval) => (
                  <ApprovalItem key={approval.id} approval={approval} />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Agent Activity */}
        <div>
          <Card>
            <CardHeader
              action={
                <Link href="/agents">
                  <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
                    View All
                  </Button>
                </Link>
              }
            >
              <CardTitle>Agent Activity</CardTitle>
              <CardDescription>Recently active agents</CardDescription>
            </CardHeader>
            <CardContent noPadding>
              <div className="divide-y divide-slate-100 dark:divide-dark-border-primary">
                {mockAgents.map((agent) => (
                  <AgentActivityItem key={agent.id} agent={agent} />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Performance Overview */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Success Rate Card */}
        <Card>
          <CardHeader>
            <CardTitle>Execution Performance</CardTitle>
            <CardDescription>Success rate and statistics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-4xl font-bold text-slate-900 dark:text-dark-text-primary">
                  {mockMetrics.executions.success_rate}%
                </p>
                <p className="text-sm text-slate-500 dark:text-dark-text-tertiary mt-1">
                  Success rate today
                </p>
              </div>
              <div className="w-32 h-32">
                <SuccessRateChart rate={mockMetrics.executions.success_rate} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <MiniStatsCard
                title="Successful"
                value={formatNumber(mockMetrics.executions.successful_today)}
                icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                trend="up"
              />
              <MiniStatsCard
                title="Failed"
                value={formatNumber(mockMetrics.executions.failed_today)}
                icon={<XCircle className="w-4 h-4 text-red-500" />}
                trend="down"
              />
              <MiniStatsCard
                title="Avg Response"
                value={`${(mockMetrics.approvals.average_response_time_ms / 1000).toFixed(0)}s`}
                icon={<Clock className="w-4 h-4 text-brand-500" />}
                trend="neutral"
              />
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions Card */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common operations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <QuickActionButton
                icon={<Play className="w-5 h-5" />}
                title="Run Agent"
                description="Execute an agent manually"
                color="emerald"
              />
              <QuickActionButton
                icon={<Pause className="w-5 h-5" />}
                title="Pause All"
                description="Pause all active agents"
                color="amber"
              />
              <QuickActionButton
                icon={<RefreshCw className="w-5 h-5" />}
                title="Sync Status"
                description="Refresh agent statuses"
                color="blue"
              />
              <QuickActionButton
                icon={<BarChart3 className="w-5 h-5" />}
                title="View Reports"
                description="Access analytics"
                color="purple"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ============================================
// Sub-Components
// ============================================

function ApprovalItem({ approval }: { approval: ApprovalRequest }) {
  return (
    <div className="flex items-start gap-4 p-4 hover:bg-slate-50 dark:hover:bg-dark-bg-tertiary transition-colors">
      <AgentAvatar
        pack={mockAgents.find((a) => a.id === approval.agent_id)?.pack || 'orchestration'}
        size="md"
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-sm font-medium text-slate-900 dark:text-dark-text-primary truncate">
            {approval.title}
          </p>
          <RiskLevelBadge level={approval.risk_level} size="sm" />
        </div>
        <p className="text-sm text-slate-500 dark:text-dark-text-tertiary line-clamp-1">
          {approval.description}
        </p>
        <div className="flex items-center gap-3 mt-2">
          <span className="text-xs text-slate-400 dark:text-dark-text-muted">
            {approval.agent_name}
          </span>
          <span className="text-xs text-slate-400 dark:text-dark-text-muted">
            {formatRelativeTime(approval.requested_at)}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button size="sm" variant="ghost" className="text-red-600">
          <XCircle className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="primary">
          <CheckCircle2 className="w-4 h-4 mr-1" />
          Approve
        </Button>
      </div>
    </div>
  );
}

function AgentActivityItem({ agent }: { agent: Agent }) {
  return (
    <Link
      href={`/agents/${agent.slug}`}
      className="flex items-center gap-3 p-4 hover:bg-slate-50 dark:hover:bg-dark-bg-tertiary transition-colors"
    >
      <AgentAvatar pack={agent.pack} size="sm" />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900 dark:text-dark-text-primary truncate">
          {agent.name}
        </p>
        <p className="text-xs text-slate-500 dark:text-dark-text-tertiary">
          {agent.last_execution_at
            ? `Last active ${formatRelativeTime(agent.last_execution_at)}`
            : 'No recent activity'}
        </p>
      </div>

      <AgentStatusBadge status={agent.status} size="sm" />
    </Link>
  );
}

function SuccessRateChart({ rate }: { rate: number }) {
  const radius = 50;
  const strokeWidth = 10;
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (rate / 100) * circumference;

  return (
    <svg width="100%" height="100%" viewBox="0 0 100 100">
      {/* Background circle */}
      <circle
        cx="50"
        cy="50"
        r={normalizedRadius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-slate-100 dark:text-dark-bg-tertiary"
      />
      {/* Progress circle */}
      <circle
        cx="50"
        cy="50"
        r={normalizedRadius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        className="text-emerald-500 transition-all duration-1000 ease-out"
        transform="rotate(-90 50 50)"
      />
      {/* Center text */}
      <text
        x="50"
        y="50"
        textAnchor="middle"
        dominantBaseline="central"
        className="text-2xl font-bold fill-slate-900 dark:fill-dark-text-primary"
      >
        {rate}%
      </text>
    </svg>
  );
}

function QuickActionButton({
  icon,
  title,
  description,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: 'emerald' | 'amber' | 'blue' | 'purple';
}) {
  const colorStyles = {
    emerald: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20',
    amber: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-500/20',
    blue: 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20',
    purple: 'bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-500/20',
  };

  return (
    <button
      className={cn(
        'flex flex-col items-center justify-center p-4 rounded-xl transition-colors text-center',
        colorStyles[color]
      )}
    >
      {icon}
      <span className="text-sm font-medium mt-2">{title}</span>
      <span className="text-xs opacity-75 mt-0.5">{description}</span>
    </button>
  );
}

export default DashboardContent;
