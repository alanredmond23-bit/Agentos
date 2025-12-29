'use client';

/**
 * AgentOS Ops Console - Audit Content
 * Complete audit log interface with filtering and export
 */

import React, { useState, useMemo } from 'react';
import {
  FileText,
  Search,
  Filter,
  Download,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Bot,
  User,
  Server,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  Eye,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { cn, formatDateTime, formatRelativeTime, formatDuration, snakeToTitle } from '@/lib/utils';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/Card';
import { Button, ButtonGroup } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Pagination,
} from '@/components/ui/Table';
import { Avatar } from '@/components/ui/Avatar';
import { NoAuditLogs, NoSearchResults } from '@/components/ui/EmptyState';
import type { AuditLog, AuditEventType, AuditResult } from '@/types';

// ============================================
// Mock Data
// ============================================

const mockAuditLogs: AuditLog[] = [
  {
    id: 'log-1',
    timestamp: '2024-12-28T09:20:15Z',
    event_type: 'agent_execution',
    actor: {
      type: 'agent',
      id: 'agent-1',
      name: 'DevOps Automation',
    },
    resource: {
      type: 'deployment',
      id: 'deploy-123',
      name: 'payment-service',
      path: '/deployments/payment-service',
    },
    action: 'deploy',
    details: {
      version: 'v2.1.4',
      environment: 'staging',
      replicas: 3,
    },
    result: 'success',
    metadata: {
      session_id: 'sess-abc123',
      request_id: 'req-xyz789',
      duration_ms: 45230,
      environment: 'staging',
      version: '2.1.0',
      tags: ['deployment', 'staging'],
    },
  },
  {
    id: 'log-2',
    timestamp: '2024-12-28T09:15:00Z',
    event_type: 'approval_response',
    actor: {
      type: 'user',
      id: 'user-1',
      name: 'Ops Admin',
      ip_address: '192.168.1.100',
      user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    },
    resource: {
      type: 'approval',
      id: 'apr-456',
      name: 'Deploy to Production',
    },
    action: 'approve',
    details: {
      note: 'Approved for production deployment',
      conditions: ['Monitor error rates for 30 minutes'],
    },
    result: 'success',
    metadata: {
      session_id: 'sess-def456',
      request_id: 'req-abc123',
      duration_ms: 2340,
      environment: 'production',
      version: '1.0.0',
      tags: ['approval', 'production'],
    },
  },
  {
    id: 'log-3',
    timestamp: '2024-12-28T09:10:00Z',
    event_type: 'approval_request',
    actor: {
      type: 'agent',
      id: 'agent-1',
      name: 'DevOps Automation',
    },
    resource: {
      type: 'approval',
      id: 'apr-789',
      name: 'Database Migration',
    },
    action: 'request_approval',
    details: {
      action_type: 'database_write',
      risk_level: 'medium',
      priority: 'high',
    },
    result: 'pending',
    metadata: {
      session_id: 'sess-ghi789',
      environment: 'production',
      version: '2.1.0',
      tags: ['approval', 'database'],
    },
  },
  {
    id: 'log-4',
    timestamp: '2024-12-28T09:05:00Z',
    event_type: 'agent_execution',
    actor: {
      type: 'agent',
      id: 'agent-2',
      name: 'QA Test Runner',
    },
    resource: {
      type: 'test_suite',
      id: 'test-001',
      name: 'Integration Tests',
      path: '/tests/integration',
    },
    action: 'execute',
    details: {
      total_tests: 156,
      passed: 152,
      failed: 4,
      skipped: 0,
    },
    result: 'partial',
    metadata: {
      session_id: 'sess-jkl012',
      duration_ms: 125000,
      environment: 'staging',
      version: '1.8.2',
      tags: ['testing', 'integration'],
    },
  },
  {
    id: 'log-5',
    timestamp: '2024-12-28T09:00:00Z',
    event_type: 'configuration_change',
    actor: {
      type: 'user',
      id: 'user-2',
      name: 'System Engineer',
      ip_address: '192.168.1.105',
    },
    resource: {
      type: 'config',
      id: 'config-alerting',
      name: 'alerting.yaml',
      path: '/config/alerting.yaml',
    },
    action: 'update',
    details: {
      changes: [
        { field: 'error_rate_threshold', old: '0.05', new: '0.03' },
        { field: 'latency_p99_threshold', old: '500ms', new: '400ms' },
      ],
    },
    result: 'success',
    metadata: {
      session_id: 'sess-mno345',
      duration_ms: 890,
      environment: 'production',
      version: '1.0.0',
      tags: ['config', 'alerting'],
    },
  },
  {
    id: 'log-6',
    timestamp: '2024-12-28T08:55:00Z',
    event_type: 'security_event',
    actor: {
      type: 'system',
      id: 'system-auth',
      name: 'Auth Service',
    },
    resource: {
      type: 'user_session',
      id: 'sess-old123',
      name: 'User Session',
    },
    action: 'session_expired',
    details: {
      reason: 'timeout',
      idle_duration_ms: 1800000,
    },
    result: 'success',
    metadata: {
      environment: 'production',
      version: '1.0.0',
      tags: ['security', 'session'],
    },
  },
  {
    id: 'log-7',
    timestamp: '2024-12-28T08:50:00Z',
    event_type: 'error',
    actor: {
      type: 'agent',
      id: 'agent-4',
      name: 'Error Predictor',
    },
    resource: {
      type: 'prediction',
      id: 'pred-err001',
      name: 'Anomaly Detection',
    },
    action: 'predict',
    details: {
      error_code: 'MODEL_TIMEOUT',
      error_message: 'ML model inference timed out after 30s',
      retry_count: 3,
    },
    result: 'failure',
    metadata: {
      session_id: 'sess-pqr678',
      duration_ms: 90000,
      environment: 'production',
      version: '0.9.1',
      tags: ['error', 'ml', 'timeout'],
    },
  },
  {
    id: 'log-8',
    timestamp: '2024-12-28T08:45:00Z',
    event_type: 'api_call',
    actor: {
      type: 'agent',
      id: 'agent-3',
      name: 'Research Assistant',
    },
    resource: {
      type: 'external_api',
      id: 'api-bloomberg',
      name: 'Bloomberg API',
      path: 'https://api.bloomberg.com/market-data',
    },
    action: 'fetch',
    details: {
      method: 'GET',
      status_code: 200,
      response_size_bytes: 45678,
      symbols: ['AAPL', 'GOOGL', 'MSFT'],
    },
    result: 'success',
    metadata: {
      session_id: 'sess-stu901',
      duration_ms: 1250,
      environment: 'production',
      version: '1.5.0',
      tags: ['api', 'external', 'market-data'],
    },
  },
  {
    id: 'log-9',
    timestamp: '2024-12-28T08:40:00Z',
    event_type: 'user_action',
    actor: {
      type: 'user',
      id: 'user-1',
      name: 'Ops Admin',
      ip_address: '192.168.1.100',
    },
    resource: {
      type: 'agent',
      id: 'agent-5',
      name: 'Legal Document Analyzer',
    },
    action: 'pause',
    details: {
      reason: 'Scheduled maintenance',
      duration_estimate: '2 hours',
    },
    result: 'success',
    metadata: {
      session_id: 'sess-vwx234',
      duration_ms: 450,
      environment: 'production',
      version: '1.0.0',
      tags: ['agent', 'maintenance'],
    },
  },
  {
    id: 'log-10',
    timestamp: '2024-12-28T08:35:00Z',
    event_type: 'system_event',
    actor: {
      type: 'system',
      id: 'system-scheduler',
      name: 'Task Scheduler',
    },
    resource: {
      type: 'scheduled_task',
      id: 'task-backup',
      name: 'Database Backup',
    },
    action: 'complete',
    details: {
      backup_size_gb: 45.6,
      tables_backed_up: 42,
      destination: 's3://backups/prod/2024-12-28',
    },
    result: 'success',
    metadata: {
      duration_ms: 325000,
      environment: 'production',
      version: '1.0.0',
      tags: ['backup', 'scheduled', 'database'],
    },
  },
];

const eventTypeOptions: { value: AuditEventType | 'all'; label: string }[] = [
  { value: 'all', label: 'All Events' },
  { value: 'agent_execution', label: 'Agent Execution' },
  { value: 'approval_request', label: 'Approval Request' },
  { value: 'approval_response', label: 'Approval Response' },
  { value: 'configuration_change', label: 'Configuration Change' },
  { value: 'user_action', label: 'User Action' },
  { value: 'system_event', label: 'System Event' },
  { value: 'security_event', label: 'Security Event' },
  { value: 'error', label: 'Error' },
  { value: 'api_call', label: 'API Call' },
];

const actorTypeOptions = [
  { value: 'all', label: 'All Actors' },
  { value: 'user', label: 'Users' },
  { value: 'agent', label: 'Agents' },
  { value: 'system', label: 'System' },
];

const resultOptions: { value: AuditResult | 'all'; label: string }[] = [
  { value: 'all', label: 'All Results' },
  { value: 'success', label: 'Success' },
  { value: 'failure', label: 'Failure' },
  { value: 'partial', label: 'Partial' },
  { value: 'pending', label: 'Pending' },
];

// ============================================
// Audit Content Component
// ============================================

export function AuditContent() {
  const [searchQuery, setSearchQuery] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState<AuditEventType | 'all'>('all');
  const [actorTypeFilter, setActorTypeFilter] = useState<string>('all');
  const [resultFilter, setResultFilter] = useState<AuditResult | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const itemsPerPage = 10;

  // Filter logs
  const filteredLogs = useMemo(() => {
    return mockAuditLogs.filter((log) => {
      const matchesSearch =
        searchQuery === '' ||
        log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.actor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.resource.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (log.metadata.tags?.some((tag) =>
          tag.toLowerCase().includes(searchQuery.toLowerCase())
        ) ?? false);

      const matchesEventType =
        eventTypeFilter === 'all' || log.event_type === eventTypeFilter;

      const matchesActorType =
        actorTypeFilter === 'all' || log.actor.type === actorTypeFilter;

      const matchesResult =
        resultFilter === 'all' || log.result === resultFilter;

      return matchesSearch && matchesEventType && matchesActorType && matchesResult;
    });
  }, [searchQuery, eventTypeFilter, actorTypeFilter, resultFilter]);

  // Paginate logs
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, eventTypeFilter, actorTypeFilter, resultFilter]);

  const clearFilters = () => {
    setSearchQuery('');
    setEventTypeFilter('all');
    setActorTypeFilter('all');
    setResultFilter('all');
  };

  const hasActiveFilters =
    searchQuery ||
    eventTypeFilter !== 'all' ||
    actorTypeFilter !== 'all' ||
    resultFilter !== 'all';

  const handleExport = () => {
    console.log('Exporting logs...');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="page-header mb-0">
          <h1 className="page-title">Audit Logs</h1>
          <p className="page-description">
            Complete activity trail for compliance and debugging
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            leftIcon={<Download className="w-4 h-4" />}
            onClick={handleExport}
          >
            Export
          </Button>
          <Button variant="secondary" leftIcon={<RefreshCw className="w-4 h-4" />}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Total Events"
          value={mockAuditLogs.length}
          subtext="Last 24 hours"
        />
        <StatCard
          label="Success Rate"
          value={`${((mockAuditLogs.filter((l) => l.result === 'success').length / mockAuditLogs.length) * 100).toFixed(1)}%`}
          subtext="All events"
        />
        <StatCard
          label="Agent Actions"
          value={mockAuditLogs.filter((l) => l.actor.type === 'agent').length}
          subtext="Automated"
        />
        <StatCard
          label="User Actions"
          value={mockAuditLogs.filter((l) => l.actor.type === 'user').length}
          subtext="Manual"
        />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="flex-1 max-w-md">
              <SearchInput
                placeholder="Search logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClear={() => setSearchQuery('')}
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <select
                value={eventTypeFilter}
                onChange={(e) => setEventTypeFilter(e.target.value as AuditEventType | 'all')}
                className="input py-2 pr-8 min-w-[160px]"
              >
                {eventTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <select
                value={actorTypeFilter}
                onChange={(e) => setActorTypeFilter(e.target.value)}
                className="input py-2 pr-8 min-w-[130px]"
              >
                {actorTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <select
                value={resultFilter}
                onChange={(e) => setResultFilter(e.target.value as AuditResult | 'all')}
                className="input py-2 pr-8 min-w-[130px]"
              >
                {resultOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
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

      {/* Results */}
      {filteredLogs.length === 0 ? (
        hasActiveFilters ? (
          <NoSearchResults onAction={clearFilters} />
        ) : (
          <NoAuditLogs onAction={() => console.log('Refresh')} />
        )
      ) : (
        <Card>
          <CardContent noPadding>
            <div className="divide-y divide-slate-100 dark:divide-dark-border-primary">
              {paginatedLogs.map((log) => (
                <AuditLogRow
                  key={log.id}
                  log={log}
                  isExpanded={expandedLog === log.id}
                  onToggle={() =>
                    setExpandedLog(expandedLog === log.id ? null : log.id)
                  }
                />
              ))}
            </div>

            {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============================================
// Sub-Components
// ============================================

function StatCard({
  label,
  value,
  subtext,
}: {
  label: string;
  value: string | number;
  subtext: string;
}) {
  return (
    <div className="p-4 rounded-xl bg-white dark:bg-dark-bg-elevated border border-slate-200 dark:border-dark-border-primary">
      <p className="text-sm text-slate-500 dark:text-dark-text-tertiary">{label}</p>
      <p className="text-2xl font-bold text-slate-900 dark:text-dark-text-primary mt-1">
        {value}
      </p>
      <p className="text-xs text-slate-400 dark:text-dark-text-muted mt-0.5">
        {subtext}
      </p>
    </div>
  );
}

function AuditLogRow({
  log,
  isExpanded,
  onToggle,
}: {
  log: AuditLog;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const ActorIcon = log.actor.type === 'agent' ? Bot : log.actor.type === 'user' ? User : Server;

  const resultStyles: Record<AuditResult, { bg: string; text: string; icon: React.ElementType }> = {
    success: {
      bg: 'bg-emerald-100 dark:bg-emerald-500/20',
      text: 'text-emerald-700 dark:text-emerald-400',
      icon: CheckCircle2,
    },
    failure: {
      bg: 'bg-red-100 dark:bg-red-500/20',
      text: 'text-red-700 dark:text-red-400',
      icon: XCircle,
    },
    partial: {
      bg: 'bg-amber-100 dark:bg-amber-500/20',
      text: 'text-amber-700 dark:text-amber-400',
      icon: AlertTriangle,
    },
    pending: {
      bg: 'bg-blue-100 dark:bg-blue-500/20',
      text: 'text-blue-700 dark:text-blue-400',
      icon: Clock,
    },
  };

  const ResultIcon = resultStyles[log.result].icon;

  return (
    <div>
      <div
        className="flex items-center gap-4 p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-dark-bg-tertiary transition-colors"
        onClick={onToggle}
      >
        {/* Expand Toggle */}
        <button className="text-slate-400 flex-shrink-0">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>

        {/* Timestamp */}
        <div className="w-24 flex-shrink-0 hidden sm:block">
          <p className="text-xs text-slate-500 dark:text-dark-text-tertiary">
            {formatRelativeTime(log.timestamp)}
          </p>
        </div>

        {/* Actor */}
        <div className="flex items-center gap-2 w-40 flex-shrink-0">
          <div
            className={cn(
              'p-1.5 rounded-lg',
              log.actor.type === 'agent'
                ? 'bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400'
                : log.actor.type === 'user'
                  ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400'
                  : 'bg-slate-100 dark:bg-dark-bg-tertiary text-slate-600 dark:text-dark-text-secondary'
            )}
          >
            <ActorIcon className="w-4 h-4" />
          </div>
          <span className="text-sm text-slate-700 dark:text-dark-text-secondary truncate">
            {log.actor.name}
          </span>
        </div>

        {/* Event Type */}
        <Badge variant="outline" size="sm" className="hidden md:inline-flex">
          {snakeToTitle(log.event_type)}
        </Badge>

        {/* Action */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-slate-900 dark:text-dark-text-primary truncate">
            <span className="font-medium">{log.action}</span>
            <span className="text-slate-500 dark:text-dark-text-tertiary ml-2">
              on {log.resource.name}
            </span>
          </p>
        </div>

        {/* Result */}
        <div
          className={cn(
            'flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium flex-shrink-0',
            resultStyles[log.result].bg,
            resultStyles[log.result].text
          )}
        >
          <ResultIcon className="w-3.5 h-3.5" />
          <span className="capitalize hidden sm:inline">{log.result}</span>
        </div>

        {/* Duration */}
        {log.metadata.duration_ms && (
          <span className="text-xs text-slate-400 dark:text-dark-text-muted w-16 text-right hidden lg:block">
            {formatDuration(log.metadata.duration_ms)}
          </span>
        )}
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-4 pb-4 ml-8 border-l-2 border-slate-200 dark:border-dark-border-primary">
          <div className="bg-slate-50 dark:bg-dark-bg-tertiary rounded-lg p-4 space-y-4">
            {/* Metadata Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-slate-500 dark:text-dark-text-tertiary">Timestamp</p>
                <p className="font-medium text-slate-900 dark:text-dark-text-primary">
                  {formatDateTime(log.timestamp)}
                </p>
              </div>
              <div>
                <p className="text-slate-500 dark:text-dark-text-tertiary">Environment</p>
                <Badge
                  variant={log.metadata.environment === 'production' ? 'error' : 'info'}
                  size="sm"
                >
                  {log.metadata.environment}
                </Badge>
              </div>
              <div>
                <p className="text-slate-500 dark:text-dark-text-tertiary">Session ID</p>
                <p className="font-mono text-xs text-slate-700 dark:text-dark-text-secondary">
                  {log.metadata.session_id || 'N/A'}
                </p>
              </div>
              {log.metadata.duration_ms && (
                <div>
                  <p className="text-slate-500 dark:text-dark-text-tertiary">Duration</p>
                  <p className="font-medium text-slate-900 dark:text-dark-text-primary">
                    {formatDuration(log.metadata.duration_ms)}
                  </p>
                </div>
              )}
            </div>

            {/* Resource */}
            <div>
              <p className="text-sm text-slate-500 dark:text-dark-text-tertiary mb-1">
                Resource
              </p>
              <div className="flex items-center gap-2">
                <Badge variant="outline" size="sm">
                  {log.resource.type}
                </Badge>
                <span className="text-sm text-slate-700 dark:text-dark-text-secondary">
                  {log.resource.name}
                </span>
                {log.resource.path && (
                  <span className="text-xs text-slate-400 font-mono">
                    {log.resource.path}
                  </span>
                )}
              </div>
            </div>

            {/* Details */}
            {Object.keys(log.details).length > 0 && (
              <div>
                <p className="text-sm text-slate-500 dark:text-dark-text-tertiary mb-2">
                  Details
                </p>
                <pre className="code-block text-xs overflow-x-auto">
                  {JSON.stringify(log.details, null, 2)}
                </pre>
              </div>
            )}

            {/* Tags */}
            {log.metadata.tags && log.metadata.tags.length > 0 && (
              <div className="flex items-center gap-2">
                <p className="text-sm text-slate-500 dark:text-dark-text-tertiary">
                  Tags:
                </p>
                <div className="flex flex-wrap gap-1">
                  {log.metadata.tags.map((tag) => (
                    <Badge key={tag} variant="outline" size="sm">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Actor Details (for users) */}
            {log.actor.type === 'user' && (log.actor.ip_address || log.actor.user_agent) && (
              <div className="pt-3 border-t border-slate-200 dark:border-dark-border-primary">
                <p className="text-sm text-slate-500 dark:text-dark-text-tertiary mb-2">
                  User Context
                </p>
                <div className="text-xs space-y-1">
                  {log.actor.ip_address && (
                    <p>
                      <span className="text-slate-500">IP:</span>{' '}
                      <span className="font-mono">{log.actor.ip_address}</span>
                    </p>
                  )}
                  {log.actor.user_agent && (
                    <p className="text-slate-500 truncate">
                      <span>UA:</span> {log.actor.user_agent}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 pt-3 border-t border-slate-200 dark:border-dark-border-primary">
              <Button variant="ghost" size="sm" leftIcon={<Copy className="w-3.5 h-3.5" />}>
                Copy Log ID
              </Button>
              <Button variant="ghost" size="sm" leftIcon={<Eye className="w-3.5 h-3.5" />}>
                View Full Log
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AuditContent;
