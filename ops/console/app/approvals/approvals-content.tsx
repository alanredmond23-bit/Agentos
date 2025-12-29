'use client';

/**
 * AgentOS Ops Console - Approvals Content
 * Complete approval management interface
 */

import React, { useState, useMemo } from 'react';
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Filter,
  RefreshCw,
  Eye,
  ChevronDown,
  ChevronRight,
  Code2,
  FileText,
  Database,
  Zap,
  Shield,
  Users,
  Settings,
  DollarSign,
  X,
} from 'lucide-react';
import { cn, formatRelativeTime, formatDateTime, snakeToTitle } from '@/lib/utils';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/Card';
import { Button, ButtonGroup } from '@/components/ui/Button';
import { SearchInput, Textarea } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import {
  ApprovalStatusBadge,
  PriorityBadge,
  RiskLevelBadge,
} from '@/components/ui/StatusBadge';
import { AgentAvatar } from '@/components/ui/Avatar';
import { NoPendingApprovals, NoSearchResults } from '@/components/ui/EmptyState';
import type { ApprovalRequest, ApprovalStatus, Priority, RiskLevel, ActionType } from '@/types';

// ============================================
// Mock Data
// ============================================

const mockApprovals: ApprovalRequest[] = [
  {
    id: 'apr-1',
    agent_id: '1',
    agent_name: 'DevOps Automation',
    action_type: 'deployment',
    title: 'Deploy Payment Service v2.1.5 to Production',
    description: 'Deploy the latest version of the payment service to the production Kubernetes cluster. This includes database migrations and configuration updates.',
    risk_level: 'high',
    status: 'pending',
    payload: {
      action: 'kubectl apply',
      target: 'payment-service',
      parameters: {
        version: '2.1.5',
        replicas: 3,
        namespace: 'production',
      },
      estimated_impact: 'Brief service interruption during rollout (< 30 seconds)',
      rollback_plan: 'Automatic rollback on health check failure',
      preview: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-service
  namespace: production
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: payment-service
        image: registry.io/payment-service:v2.1.5`,
    },
    context: {
      session_id: 'sess-1',
      conversation_id: null,
      parent_action_id: null,
      triggered_by: 'Scheduled deployment pipeline',
      environment: 'production',
      tags: ['deployment', 'payment-service', 'kubernetes'],
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
    title: 'Access Bloomberg Terminal API',
    description: 'Request access to Bloomberg Terminal API for real-time market data. This is needed for the quarterly market analysis report.',
    risk_level: 'medium',
    status: 'pending',
    payload: {
      action: 'HTTP GET',
      target: 'https://api.bloomberg.com/market-data',
      parameters: {
        symbols: ['AAPL', 'GOOGL', 'MSFT'],
        fields: ['price', 'volume', 'change'],
      },
      estimated_impact: 'API rate limit consumption: ~50 requests/hour',
      rollback_plan: null,
    },
    context: {
      session_id: 'sess-2',
      conversation_id: 'conv-123',
      parent_action_id: null,
      triggered_by: 'Research task: Q4 Market Analysis',
      environment: 'production',
      tags: ['api', 'external', 'market-data', 'bloomberg'],
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
    title: 'Apply Schema Migration to Staging DB',
    description: 'Apply database schema migration to add new columns for user preferences. This is required for the upcoming feature release.',
    risk_level: 'low',
    status: 'pending',
    payload: {
      action: 'SQL Migration',
      target: 'staging-db.users',
      parameters: {
        migration_id: 'M2024122801',
        changes: ['ADD COLUMN preferences JSONB', 'ADD INDEX idx_preferences'],
      },
      estimated_impact: 'Table lock for ~5 seconds during migration',
      rollback_plan: 'DROP COLUMN preferences; DROP INDEX idx_preferences;',
      preview: `ALTER TABLE users
  ADD COLUMN preferences JSONB DEFAULT '{}';

CREATE INDEX idx_preferences ON users USING GIN (preferences);`,
    },
    context: {
      session_id: 'sess-3',
      conversation_id: null,
      parent_action_id: null,
      triggered_by: 'Test suite preparation',
      environment: 'staging',
      tags: ['database', 'migration', 'staging', 'schema'],
    },
    requested_at: '2024-12-28T08:30:00Z',
    responded_at: null,
    responded_by: null,
    response_note: null,
    expires_at: '2024-12-28T09:30:00Z',
    priority: 'low',
  },
  {
    id: 'apr-4',
    agent_id: '4',
    agent_name: 'Error Predictor',
    action_type: 'configuration_change',
    title: 'Update Alert Thresholds',
    description: 'Adjust error rate alert thresholds based on recent traffic patterns. Reduces false positives by 30%.',
    risk_level: 'low',
    status: 'pending',
    payload: {
      action: 'Config Update',
      target: 'alerting.yaml',
      parameters: {
        error_rate_threshold: '0.05 -> 0.03',
        latency_p99_threshold: '500ms -> 400ms',
      },
      estimated_impact: 'More sensitive alerting, potential increase in alerts',
      rollback_plan: 'Revert to previous configuration version',
    },
    context: {
      session_id: 'sess-4',
      conversation_id: null,
      parent_action_id: null,
      triggered_by: 'Automated threshold optimization',
      environment: 'production',
      tags: ['config', 'alerting', 'monitoring'],
    },
    requested_at: '2024-12-28T08:15:00Z',
    responded_at: null,
    responded_by: null,
    response_note: null,
    expires_at: '2024-12-28T09:15:00Z',
    priority: 'low',
  },
  {
    id: 'apr-5',
    agent_id: '1',
    agent_name: 'DevOps Automation',
    action_type: 'security_action',
    title: 'Rotate API Keys for Payment Gateway',
    description: 'Scheduled rotation of API keys for the payment gateway integration. Required for PCI compliance.',
    risk_level: 'critical',
    status: 'pending',
    payload: {
      action: 'Key Rotation',
      target: 'payment-gateway.credentials',
      parameters: {
        key_type: 'API_KEY',
        rotation_strategy: 'ROLLING',
      },
      estimated_impact: 'Brief interruption during key propagation (< 10 seconds)',
      rollback_plan: 'Restore previous keys from secure backup',
    },
    context: {
      session_id: 'sess-5',
      conversation_id: null,
      parent_action_id: null,
      triggered_by: 'Scheduled security rotation (90-day cycle)',
      environment: 'production',
      tags: ['security', 'credentials', 'pci', 'payment'],
    },
    requested_at: '2024-12-28T09:00:00Z',
    responded_at: null,
    responded_by: null,
    response_note: null,
    expires_at: '2024-12-28T10:00:00Z',
    priority: 'urgent',
  },
  // Historical approvals
  {
    id: 'apr-6',
    agent_id: '2',
    agent_name: 'QA Test Runner',
    action_type: 'code_execution',
    title: 'Run Integration Test Suite',
    description: 'Execute full integration test suite against staging environment.',
    risk_level: 'low',
    status: 'approved',
    payload: {} as ApprovalRequest['payload'],
    context: {
      session_id: 'sess-6',
      conversation_id: null,
      parent_action_id: null,
      triggered_by: 'Pre-release verification',
      environment: 'staging',
      tags: ['testing', 'integration'],
    },
    requested_at: '2024-12-28T07:00:00Z',
    responded_at: '2024-12-28T07:15:00Z',
    responded_by: 'user-1',
    response_note: 'Approved for staging execution.',
    expires_at: '2024-12-28T08:00:00Z',
    priority: 'medium',
  },
  {
    id: 'apr-7',
    agent_id: '3',
    agent_name: 'Research Assistant',
    action_type: 'file_modification',
    title: 'Update Research Report Template',
    description: 'Modify the default template for quarterly research reports.',
    risk_level: 'low',
    status: 'rejected',
    payload: {} as ApprovalRequest['payload'],
    context: {
      session_id: 'sess-7',
      conversation_id: null,
      parent_action_id: null,
      triggered_by: 'Template optimization',
      environment: 'production',
      tags: ['template', 'reports'],
    },
    requested_at: '2024-12-28T06:30:00Z',
    responded_at: '2024-12-28T06:45:00Z',
    responded_by: 'user-2',
    response_note: 'Template changes need review by marketing team first.',
    expires_at: '2024-12-28T07:30:00Z',
    priority: 'low',
  },
];

const actionTypeIcons: Record<ActionType, React.ElementType> = {
  code_execution: Code2,
  file_modification: FileText,
  database_write: Database,
  api_call: Zap,
  deployment: Zap,
  configuration_change: Settings,
  user_communication: Users,
  resource_allocation: Settings,
  security_action: Shield,
  billing_action: DollarSign,
};

// ============================================
// Approvals Content Component
// ============================================

export function ApprovalsContent() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ApprovalStatus | 'all'>('pending');
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'all'>('all');
  const [selectedApproval, setSelectedApproval] = useState<ApprovalRequest | null>(null);

  // Filter approvals
  const filteredApprovals = useMemo(() => {
    return mockApprovals.filter((approval) => {
      const matchesSearch =
        searchQuery === '' ||
        approval.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        approval.agent_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        approval.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === 'all' || approval.status === statusFilter;

      const matchesPriority =
        priorityFilter === 'all' || approval.priority === priorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [searchQuery, statusFilter, priorityFilter]);

  const pendingApprovals = filteredApprovals.filter((a) => a.status === 'pending');
  const historicalApprovals = filteredApprovals.filter((a) => a.status !== 'pending');

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('pending');
    setPriorityFilter('all');
  };

  const hasActiveFilters =
    searchQuery || statusFilter !== 'pending' || priorityFilter !== 'all';

  // Stats
  const stats = useMemo(() => ({
    pending: mockApprovals.filter((a) => a.status === 'pending').length,
    urgent: mockApprovals.filter((a) => a.status === 'pending' && a.priority === 'urgent').length,
    approvedToday: mockApprovals.filter((a) => a.status === 'approved').length,
    rejectedToday: mockApprovals.filter((a) => a.status === 'rejected').length,
  }), []);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="page-header mb-0">
          <h1 className="page-title">Approvals</h1>
          <p className="page-description">
            Review and approve agent action requests
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="secondary" leftIcon={<RefreshCw className="w-4 h-4" />}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Pending"
          value={stats.pending}
          icon={<Clock className="w-5 h-5 text-amber-500" />}
        />
        <StatCard
          label="Urgent"
          value={stats.urgent}
          icon={<AlertTriangle className="w-5 h-5 text-red-500" />}
          highlight={stats.urgent > 0}
        />
        <StatCard
          label="Approved Today"
          value={stats.approvedToday}
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-500" />}
        />
        <StatCard
          label="Rejected Today"
          value={stats.rejectedToday}
          icon={<XCircle className="w-5 h-5 text-red-500" />}
        />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="flex-1 max-w-md">
              <SearchInput
                placeholder="Search approvals..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClear={() => setSearchQuery('')}
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as ApprovalStatus | 'all')}
                className="input py-2 pr-8 min-w-[140px]"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="expired">Expired</option>
              </select>

              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value as Priority | 'all')}
                className="input py-2 pr-8 min-w-[140px]"
              >
                <option value="all">All Priority</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>

              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Approval List */}
        <div className="lg:col-span-2 space-y-4">
          {filteredApprovals.length === 0 ? (
            hasActiveFilters ? (
              <NoSearchResults onAction={clearFilters} />
            ) : (
              <NoPendingApprovals />
            )
          ) : (
            <>
              {/* Pending Section */}
              {pendingApprovals.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-sm font-semibold text-slate-700 dark:text-dark-text-secondary uppercase tracking-wider">
                    Pending Approval ({pendingApprovals.length})
                  </h2>
                  {pendingApprovals.map((approval) => (
                    <ApprovalCard
                      key={approval.id}
                      approval={approval}
                      isSelected={selectedApproval?.id === approval.id}
                      onSelect={() => setSelectedApproval(approval)}
                    />
                  ))}
                </div>
              )}

              {/* Historical Section */}
              {historicalApprovals.length > 0 && statusFilter === 'all' && (
                <div className="space-y-3 mt-8">
                  <h2 className="text-sm font-semibold text-slate-700 dark:text-dark-text-secondary uppercase tracking-wider">
                    History ({historicalApprovals.length})
                  </h2>
                  {historicalApprovals.map((approval) => (
                    <ApprovalCard
                      key={approval.id}
                      approval={approval}
                      isSelected={selectedApproval?.id === approval.id}
                      onSelect={() => setSelectedApproval(approval)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Detail Panel */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          {selectedApproval ? (
            <ApprovalDetail
              approval={selectedApproval}
              onClose={() => setSelectedApproval(null)}
            />
          ) : (
            <Card className="text-center py-12">
              <CardContent>
                <Eye className="w-12 h-12 text-slate-300 dark:text-zinc-600 mx-auto mb-4" />
                <p className="text-slate-500 dark:text-dark-text-tertiary">
                  Select an approval to view details
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// Sub-Components
// ============================================

function StatCard({
  label,
  value,
  icon,
  highlight,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        'p-4 rounded-xl border',
        highlight
          ? 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30'
          : 'bg-white dark:bg-dark-bg-elevated border-slate-200 dark:border-dark-border-primary'
      )}
    >
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <p className="text-2xl font-bold text-slate-900 dark:text-dark-text-primary">
            {value}
          </p>
          <p className="text-sm text-slate-500 dark:text-dark-text-tertiary">
            {label}
          </p>
        </div>
      </div>
    </div>
  );
}

function ApprovalCard({
  approval,
  isSelected,
  onSelect,
}: {
  approval: ApprovalRequest;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const Icon = actionTypeIcons[approval.action_type];

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all',
        isSelected
          ? 'ring-2 ring-brand-500 border-brand-500'
          : 'card-hover'
      )}
      onClick={onSelect}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div
            className={cn(
              'p-2.5 rounded-lg flex-shrink-0',
              approval.risk_level === 'critical'
                ? 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400'
                : approval.risk_level === 'high'
                  ? 'bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400'
                  : approval.risk_level === 'medium'
                    ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400'
                    : 'bg-slate-100 dark:bg-dark-bg-tertiary text-slate-600 dark:text-dark-text-secondary'
            )}
          >
            <Icon className="w-5 h-5" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-dark-text-primary line-clamp-1">
                  {approval.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-dark-text-tertiary mt-0.5">
                  {approval.agent_name} - {snakeToTitle(approval.action_type)}
                </p>
              </div>
              <ApprovalStatusBadge status={approval.status} size="sm" />
            </div>

            <p className="text-sm text-slate-600 dark:text-dark-text-secondary mt-2 line-clamp-2">
              {approval.description}
            </p>

            <div className="flex items-center gap-3 mt-3">
              <PriorityBadge priority={approval.priority} size="sm" />
              <RiskLevelBadge level={approval.risk_level} size="sm" />
              <span className="text-xs text-slate-400 dark:text-dark-text-muted">
                {formatRelativeTime(approval.requested_at)}
              </span>
            </div>
          </div>

          <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0" />
        </div>
      </CardContent>
    </Card>
  );
}

function ApprovalDetail({
  approval,
  onClose,
}: {
  approval: ApprovalRequest;
  onClose: () => void;
}) {
  const [responseNote, setResponseNote] = useState('');
  const Icon = actionTypeIcons[approval.action_type];

  const handleApprove = () => {
    console.log('Approve:', approval.id, responseNote);
    onClose();
  };

  const handleReject = () => {
    console.log('Reject:', approval.id, responseNote);
    onClose();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'p-2 rounded-lg',
                approval.risk_level === 'critical'
                  ? 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400'
                  : 'bg-slate-100 dark:bg-dark-bg-tertiary text-slate-600 dark:text-dark-text-secondary'
              )}
            >
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-base">{approval.title}</CardTitle>
              <CardDescription>{approval.agent_name}</CardDescription>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Status Badges */}
        <div className="flex flex-wrap gap-2">
          <ApprovalStatusBadge status={approval.status} />
          <PriorityBadge priority={approval.priority} showIcon />
          <RiskLevelBadge level={approval.risk_level} />
        </div>

        {/* Description */}
        <div>
          <h4 className="text-sm font-medium text-slate-700 dark:text-dark-text-secondary mb-1">
            Description
          </h4>
          <p className="text-sm text-slate-600 dark:text-dark-text-tertiary">
            {approval.description}
          </p>
        </div>

        {/* Context */}
        <div>
          <h4 className="text-sm font-medium text-slate-700 dark:text-dark-text-secondary mb-2">
            Context
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-dark-text-tertiary">Environment</span>
              <Badge variant={approval.context.environment === 'production' ? 'error' : 'info'} size="sm">
                {approval.context.environment}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-dark-text-tertiary">Triggered By</span>
              <span className="text-slate-700 dark:text-dark-text-secondary">{approval.context.triggered_by}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-dark-text-tertiary">Requested</span>
              <span className="text-slate-700 dark:text-dark-text-secondary">{formatDateTime(approval.requested_at)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-dark-text-tertiary">Expires</span>
              <span className="text-slate-700 dark:text-dark-text-secondary">{formatDateTime(approval.expires_at)}</span>
            </div>
          </div>
        </div>

        {/* Tags */}
        {approval.context.tags.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-slate-700 dark:text-dark-text-secondary mb-2">
              Tags
            </h4>
            <div className="flex flex-wrap gap-1">
              {approval.context.tags.map((tag) => (
                <Badge key={tag} variant="outline" size="sm">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Payload Preview */}
        {approval.payload.preview && (
          <div>
            <h4 className="text-sm font-medium text-slate-700 dark:text-dark-text-secondary mb-2">
              Preview
            </h4>
            <pre className="code-block text-xs overflow-x-auto">
              {approval.payload.preview}
            </pre>
          </div>
        )}

        {/* Impact & Rollback */}
        {(approval.payload.estimated_impact || approval.payload.rollback_plan) && (
          <div className="space-y-3 p-3 bg-slate-50 dark:bg-dark-bg-tertiary rounded-lg">
            {approval.payload.estimated_impact && (
              <div>
                <h5 className="text-xs font-medium text-slate-600 dark:text-dark-text-tertiary uppercase tracking-wider mb-1">
                  Estimated Impact
                </h5>
                <p className="text-sm text-slate-700 dark:text-dark-text-secondary">
                  {approval.payload.estimated_impact}
                </p>
              </div>
            )}
            {approval.payload.rollback_plan && (
              <div>
                <h5 className="text-xs font-medium text-slate-600 dark:text-dark-text-tertiary uppercase tracking-wider mb-1">
                  Rollback Plan
                </h5>
                <p className="text-sm text-slate-700 dark:text-dark-text-secondary">
                  {approval.payload.rollback_plan}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Response Actions */}
        {approval.status === 'pending' && (
          <div className="pt-4 border-t border-slate-200 dark:border-dark-border-primary space-y-3">
            <Textarea
              placeholder="Add a note (optional)..."
              value={responseNote}
              onChange={(e) => setResponseNote(e.target.value)}
              className="min-h-[80px]"
            />

            <div className="flex gap-3">
              <Button
                variant="danger"
                className="flex-1"
                leftIcon={<XCircle className="w-4 h-4" />}
                onClick={handleReject}
              >
                Reject
              </Button>
              <Button
                variant="success"
                className="flex-1"
                leftIcon={<CheckCircle2 className="w-4 h-4" />}
                onClick={handleApprove}
              >
                Approve
              </Button>
            </div>
          </div>
        )}

        {/* Historical Response */}
        {approval.status !== 'pending' && approval.response_note && (
          <div className="pt-4 border-t border-slate-200 dark:border-dark-border-primary">
            <h4 className="text-sm font-medium text-slate-700 dark:text-dark-text-secondary mb-2">
              Response Note
            </h4>
            <p className="text-sm text-slate-600 dark:text-dark-text-tertiary">
              {approval.response_note}
            </p>
            <p className="text-xs text-slate-400 dark:text-dark-text-muted mt-2">
              Responded {formatRelativeTime(approval.responded_at!)}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ApprovalsContent;
