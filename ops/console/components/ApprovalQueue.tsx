/**
 * ApprovalQueue Component
 *
 * Enterprise-grade approval workflow management for AgentOS Ops Console.
 * Handles pending approvals, bulk operations, SLA tracking, and escalations.
 *
 * @module ApprovalQueue
 * @version 1.0.0
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export type ActionType = 'financial' | 'data_access' | 'external_api' | 'destructive';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'expired';
export type SortField = 'requested_at' | 'sla_deadline' | 'risk_level' | 'pack' | 'action_type';
export type SortDirection = 'asc' | 'desc';
export type ViewMode = 'queue' | 'history';

export interface ApprovalRequest {
  id: string;
  agent_id: string;
  pack: string;
  action_type: ActionType;
  risk_level: RiskLevel;
  description: string;
  context: Record<string, unknown>;
  requested_at: Date;
  sla_deadline: Date;
  status: ApprovalStatus;
  reviewed_at?: Date;
  reviewed_by?: string;
  review_reason?: string;
  escalation_level?: number;
  escalated_to?: string;
}

export interface ApprovalHistoryEntry {
  id: string;
  approval_id: string;
  action: 'created' | 'approved' | 'rejected' | 'escalated' | 'expired';
  actor: string;
  timestamp: Date;
  reason?: string;
  metadata?: Record<string, unknown>;
}

export interface ApprovalQueueProps {
  approvals?: ApprovalRequest[];
  history?: ApprovalHistoryEntry[];
  currentUser?: string;
  onApprove?: (id: string, reason: string) => Promise<void>;
  onReject?: (id: string, reason: string) => Promise<void>;
  onBulkApprove?: (ids: string[], reason: string) => Promise<void>;
  onBulkReject?: (ids: string[], reason: string) => Promise<void>;
  onEscalate?: (id: string, escalateTo: string) => Promise<void>;
  onRefresh?: () => Promise<void>;
  refreshInterval?: number;
}

interface FilterState {
  status: ApprovalStatus | 'all';
  risk_level: RiskLevel | 'all';
  action_type: ActionType | 'all';
  pack: string | 'all';
  search: string;
  sla_status: 'all' | 'breached' | 'warning' | 'healthy';
}

interface SortState {
  field: SortField;
  direction: SortDirection;
}

// =============================================================================
// CONSTANTS & CONFIGURATION
// =============================================================================

const RISK_LEVEL_PRIORITY: Record<RiskLevel, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

const RISK_LEVEL_COLORS: Record<RiskLevel, { bg: string; text: string; border: string }> = {
  critical: { bg: '#fee2e2', text: '#991b1b', border: '#f87171' },
  high: { bg: '#ffedd5', text: '#9a3412', border: '#fb923c' },
  medium: { bg: '#fef9c3', text: '#854d0e', border: '#facc15' },
  low: { bg: '#dcfce7', text: '#166534', border: '#4ade80' },
};

const STATUS_COLORS: Record<ApprovalStatus, { bg: string; text: string }> = {
  pending: { bg: '#fef3c7', text: '#92400e' },
  approved: { bg: '#d1fae5', text: '#065f46' },
  rejected: { bg: '#fee2e2', text: '#991b1b' },
  expired: { bg: '#e5e7eb', text: '#4b5563' },
};

const ACTION_TYPE_ICONS: Record<ActionType, string> = {
  financial: '$',
  data_access: 'D',
  external_api: 'A',
  destructive: '!',
};

const ACTION_TYPE_LABELS: Record<ActionType, string> = {
  financial: 'Financial Transaction',
  data_access: 'Data Access',
  external_api: 'External API Call',
  destructive: 'Destructive Action',
};

const SLA_WARNING_THRESHOLD_MINUTES = 30;
const SLA_CRITICAL_THRESHOLD_MINUTES = 10;
const DEFAULT_REFRESH_INTERVAL_MS = 30000;

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function calculateSlaStatus(deadline: Date): 'breached' | 'critical' | 'warning' | 'healthy' {
  const now = new Date();
  const diffMs = deadline.getTime() - now.getTime();
  const diffMinutes = diffMs / (1000 * 60);

  if (diffMinutes < 0) return 'breached';
  if (diffMinutes < SLA_CRITICAL_THRESHOLD_MINUTES) return 'critical';
  if (diffMinutes < SLA_WARNING_THRESHOLD_MINUTES) return 'warning';
  return 'healthy';
}

function formatTimeRemaining(deadline: Date): string {
  const now = new Date();
  const diffMs = deadline.getTime() - now.getTime();

  if (diffMs < 0) {
    const overdueMins = Math.abs(diffMs) / (1000 * 60);
    if (overdueMins < 60) return `${Math.floor(overdueMins)}m overdue`;
    const overdueHours = overdueMins / 60;
    if (overdueHours < 24) return `${Math.floor(overdueHours)}h overdue`;
    return `${Math.floor(overdueHours / 24)}d overdue`;
  }

  const minutes = diffMs / (1000 * 60);
  if (minutes < 60) return `${Math.floor(minutes)}m remaining`;
  const hours = minutes / 60;
  if (hours < 24) return `${Math.floor(hours)}h ${Math.floor(minutes % 60)}m remaining`;
  return `${Math.floor(hours / 24)}d ${Math.floor(hours % 24)}h remaining`;
}

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = diffMs / (1000 * 60);

  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${Math.floor(diffMinutes)}m ago`;
  const diffHours = diffMinutes / 60;
  if (diffHours < 24) return `${Math.floor(diffHours)}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}

function getUniquePacks(approvals: ApprovalRequest[]): string[] {
  return Array.from(new Set(approvals.map(a => a.pack))).sort();
}

// =============================================================================
// MOCK DATA GENERATOR
// =============================================================================

function generateMockApprovals(): ApprovalRequest[] {
  const now = new Date();
  const hoursAgo = (hours: number) => new Date(now.getTime() - hours * 60 * 60 * 1000);
  const hoursFromNow = (hours: number) => new Date(now.getTime() + hours * 60 * 60 * 1000);
  const minutesFromNow = (minutes: number) => new Date(now.getTime() + minutes * 60 * 1000);

  return [
    {
      id: 'apr-001',
      agent_id: 'finance-agent-01',
      pack: 'finance',
      action_type: 'financial',
      risk_level: 'critical',
      description: 'Wire transfer of $150,000 to external vendor account for Q4 equipment procurement',
      context: {
        amount: 150000,
        currency: 'USD',
        recipient: 'ACME Industrial Corp',
        account_ending: '****4521',
        invoice_ref: 'INV-2024-Q4-0892',
        department: 'Operations',
      },
      requested_at: hoursAgo(0.5),
      sla_deadline: minutesFromNow(5),
      status: 'pending',
      escalation_level: 1,
    },
    {
      id: 'apr-002',
      agent_id: 'data-agent-03',
      pack: 'analytics',
      action_type: 'data_access',
      risk_level: 'high',
      description: 'Export customer PII dataset for compliance audit report generation',
      context: {
        dataset: 'customers_pii_full',
        record_count: 45000,
        fields: ['name', 'email', 'phone', 'ssn_last4', 'address'],
        destination: 'compliance-audit-system',
        retention_days: 7,
      },
      requested_at: hoursAgo(1),
      sla_deadline: minutesFromNow(45),
      status: 'pending',
    },
    {
      id: 'apr-003',
      agent_id: 'deploy-agent-02',
      pack: 'engineering',
      action_type: 'destructive',
      risk_level: 'critical',
      description: 'Database migration with schema changes affecting 12 production tables',
      context: {
        migration_name: 'v2.4.0_schema_refactor',
        affected_tables: 12,
        estimated_downtime: '15 minutes',
        rollback_available: true,
        environment: 'production',
        change_ticket: 'CHG-2024-1847',
      },
      requested_at: hoursAgo(2),
      sla_deadline: hoursFromNow(2),
      status: 'pending',
    },
    {
      id: 'apr-004',
      agent_id: 'marketing-agent-01',
      pack: 'marketing',
      action_type: 'external_api',
      risk_level: 'medium',
      description: 'Send promotional email campaign to 50,000 subscribers via SendGrid',
      context: {
        campaign_name: 'Winter Sale 2024',
        recipient_count: 50000,
        segment: 'active_customers_6mo',
        scheduled_time: '2024-12-28T14:00:00Z',
        api_provider: 'SendGrid',
      },
      requested_at: hoursAgo(3),
      sla_deadline: hoursFromNow(4),
      status: 'pending',
    },
    {
      id: 'apr-005',
      agent_id: 'finance-agent-02',
      pack: 'finance',
      action_type: 'financial',
      risk_level: 'high',
      description: 'Process batch payroll for 847 employees totaling $2.1M',
      context: {
        payroll_period: '2024-12-15 to 2024-12-28',
        employee_count: 847,
        total_amount: 2100000,
        currency: 'USD',
        includes_bonuses: true,
        tax_withholding: 'calculated',
      },
      requested_at: hoursAgo(4),
      sla_deadline: hoursFromNow(8),
      status: 'pending',
    },
    {
      id: 'apr-006',
      agent_id: 'research-agent-01',
      pack: 'research',
      action_type: 'external_api',
      risk_level: 'low',
      description: 'Query OpenAI API for market research summarization task',
      context: {
        api: 'OpenAI GPT-4',
        estimated_tokens: 15000,
        estimated_cost: 0.45,
        purpose: 'market_analysis',
        data_classification: 'public',
      },
      requested_at: hoursAgo(0.25),
      sla_deadline: hoursFromNow(1),
      status: 'pending',
    },
    {
      id: 'apr-007',
      agent_id: 'devops-agent-01',
      pack: 'devops',
      action_type: 'destructive',
      risk_level: 'high',
      description: 'Terminate 5 EC2 instances in staging environment for cost optimization',
      context: {
        instance_ids: ['i-0abc123', 'i-0def456', 'i-0ghi789', 'i-0jkl012', 'i-0mno345'],
        environment: 'staging',
        monthly_savings: 850,
        approval_ticket: 'COST-2024-0234',
      },
      requested_at: hoursAgo(5),
      sla_deadline: hoursFromNow(12),
      status: 'pending',
    },
    {
      id: 'apr-008',
      agent_id: 'legal-agent-01',
      pack: 'legal',
      action_type: 'data_access',
      risk_level: 'medium',
      description: 'Access litigation hold documents for case discovery preparation',
      context: {
        case_number: 'LIT-2024-0089',
        document_count: 234,
        date_range: '2023-01-01 to 2024-12-01',
        requesting_counsel: 'Smith & Associates',
      },
      requested_at: hoursAgo(6),
      sla_deadline: hoursFromNow(24),
      status: 'pending',
    },
    // Historical (completed) approvals
    {
      id: 'apr-009',
      agent_id: 'finance-agent-01',
      pack: 'finance',
      action_type: 'financial',
      risk_level: 'high',
      description: 'Vendor payment batch processing - November invoices',
      context: {
        batch_id: 'PAY-2024-11-001',
        invoice_count: 45,
        total_amount: 234500,
      },
      requested_at: hoursAgo(48),
      sla_deadline: hoursAgo(44),
      status: 'approved',
      reviewed_at: hoursAgo(46),
      reviewed_by: 'john.smith@company.com',
      review_reason: 'Verified against approved vendor list and budget allocation',
    },
    {
      id: 'apr-010',
      agent_id: 'deploy-agent-01',
      pack: 'engineering',
      action_type: 'destructive',
      risk_level: 'critical',
      description: 'Production hotfix deployment for security vulnerability CVE-2024-XXXX',
      context: {
        cve_id: 'CVE-2024-XXXX',
        severity: 'critical',
        affected_service: 'auth-service',
      },
      requested_at: hoursAgo(72),
      sla_deadline: hoursAgo(71),
      status: 'approved',
      reviewed_at: hoursAgo(71.5),
      reviewed_by: 'security-team@company.com',
      review_reason: 'Emergency security patch - expedited approval',
    },
    {
      id: 'apr-011',
      agent_id: 'marketing-agent-02',
      pack: 'marketing',
      action_type: 'external_api',
      risk_level: 'medium',
      description: 'Social media automation - unauthorized brand account access',
      context: {
        platforms: ['twitter', 'linkedin'],
        post_frequency: 'hourly',
        content_type: 'automated',
      },
      requested_at: hoursAgo(24),
      sla_deadline: hoursAgo(20),
      status: 'rejected',
      reviewed_at: hoursAgo(22),
      reviewed_by: 'brand-team@company.com',
      review_reason: 'Rejected: Hourly posting frequency violates brand guidelines. Resubmit with daily frequency.',
    },
    {
      id: 'apr-012',
      agent_id: 'data-agent-02',
      pack: 'analytics',
      action_type: 'data_access',
      risk_level: 'high',
      description: 'Cross-region data replication request - EU to US transfer',
      context: {
        source_region: 'eu-west-1',
        destination_region: 'us-east-1',
        data_categories: ['analytics', 'user_behavior'],
      },
      requested_at: hoursAgo(36),
      sla_deadline: hoursAgo(12),
      status: 'expired',
      review_reason: 'SLA breached - no reviewer action taken within deadline',
    },
  ];
}

function generateMockHistory(): ApprovalHistoryEntry[] {
  const now = new Date();
  const hoursAgo = (hours: number) => new Date(now.getTime() - hours * 60 * 60 * 1000);

  return [
    {
      id: 'hist-001',
      approval_id: 'apr-009',
      action: 'created',
      actor: 'finance-agent-01',
      timestamp: hoursAgo(48),
    },
    {
      id: 'hist-002',
      approval_id: 'apr-009',
      action: 'approved',
      actor: 'john.smith@company.com',
      timestamp: hoursAgo(46),
      reason: 'Verified against approved vendor list and budget allocation',
    },
    {
      id: 'hist-003',
      approval_id: 'apr-010',
      action: 'created',
      actor: 'deploy-agent-01',
      timestamp: hoursAgo(72),
    },
    {
      id: 'hist-004',
      approval_id: 'apr-010',
      action: 'escalated',
      actor: 'system',
      timestamp: hoursAgo(71.75),
      metadata: { escalated_to: 'security-team@company.com', reason: 'Critical security vulnerability' },
    },
    {
      id: 'hist-005',
      approval_id: 'apr-010',
      action: 'approved',
      actor: 'security-team@company.com',
      timestamp: hoursAgo(71.5),
      reason: 'Emergency security patch - expedited approval',
    },
    {
      id: 'hist-006',
      approval_id: 'apr-011',
      action: 'created',
      actor: 'marketing-agent-02',
      timestamp: hoursAgo(24),
    },
    {
      id: 'hist-007',
      approval_id: 'apr-011',
      action: 'rejected',
      actor: 'brand-team@company.com',
      timestamp: hoursAgo(22),
      reason: 'Rejected: Hourly posting frequency violates brand guidelines.',
    },
    {
      id: 'hist-008',
      approval_id: 'apr-012',
      action: 'created',
      actor: 'data-agent-02',
      timestamp: hoursAgo(36),
    },
    {
      id: 'hist-009',
      approval_id: 'apr-012',
      action: 'expired',
      actor: 'system',
      timestamp: hoursAgo(12),
      reason: 'SLA breached - no reviewer action taken within deadline',
    },
    {
      id: 'hist-010',
      approval_id: 'apr-001',
      action: 'created',
      actor: 'finance-agent-01',
      timestamp: hoursAgo(0.5),
    },
    {
      id: 'hist-011',
      approval_id: 'apr-001',
      action: 'escalated',
      actor: 'system',
      timestamp: hoursAgo(0.25),
      metadata: { escalated_to: 'cfo@company.com', reason: 'Critical financial transaction approaching SLA' },
    },
  ];
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface RiskBadgeProps {
  level: RiskLevel;
  size?: 'sm' | 'md' | 'lg';
}

const RiskBadge: React.FC<RiskBadgeProps> = ({ level, size = 'md' }) => {
  const colors = RISK_LEVEL_COLORS[level];
  const sizeClasses = {
    sm: { padding: '2px 6px', fontSize: '10px' },
    md: { padding: '4px 10px', fontSize: '12px' },
    lg: { padding: '6px 14px', fontSize: '14px' },
  };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        backgroundColor: colors.bg,
        color: colors.text,
        border: `1px solid ${colors.border}`,
        borderRadius: '4px',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        ...sizeClasses[size],
      }}
    >
      {level === 'critical' && (
        <span style={{ fontSize: '10px' }}>!!</span>
      )}
      {level}
    </span>
  );
};

interface StatusBadgeProps {
  status: ApprovalStatus;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const colors = STATUS_COLORS[status];
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '4px 10px',
        backgroundColor: colors.bg,
        color: colors.text,
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: 600,
        textTransform: 'capitalize',
      }}
    >
      {status}
    </span>
  );
};

interface ActionTypeBadgeProps {
  actionType: ActionType;
}

const ActionTypeBadge: React.FC<ActionTypeBadgeProps> = ({ actionType }) => {
  const icon = ACTION_TYPE_ICONS[actionType];
  const label = ACTION_TYPE_LABELS[actionType];

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 10px',
        backgroundColor: '#f3f4f6',
        color: '#374151',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: 500,
      }}
      title={label}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '18px',
          height: '18px',
          backgroundColor: '#e5e7eb',
          borderRadius: '3px',
          fontSize: '11px',
          fontWeight: 700,
        }}
      >
        {icon}
      </span>
      {label}
    </span>
  );
};

interface SlaIndicatorProps {
  deadline: Date;
  status: ApprovalStatus;
}

const SlaIndicator: React.FC<SlaIndicatorProps> = ({ deadline, status }) => {
  if (status !== 'pending') {
    return <span style={{ color: '#6b7280', fontSize: '12px' }}>N/A</span>;
  }

  const slaStatus = calculateSlaStatus(deadline);
  const timeRemaining = formatTimeRemaining(deadline);

  const statusColors = {
    breached: { bg: '#fee2e2', text: '#991b1b', icon: 'X' },
    critical: { bg: '#fef3c7', text: '#92400e', icon: '!' },
    warning: { bg: '#fef9c3', text: '#854d0e', icon: '~' },
    healthy: { bg: '#d1fae5', text: '#065f46', icon: '' },
  };

  const colors = statusColors[slaStatus];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
      }}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '3px 8px',
          backgroundColor: colors.bg,
          color: colors.text,
          borderRadius: '4px',
          fontSize: '11px',
          fontWeight: 600,
        }}
      >
        {colors.icon && <span style={{ fontWeight: 800 }}>{colors.icon}</span>}
        {timeRemaining}
      </span>
      <span style={{ fontSize: '10px', color: '#6b7280' }}>
        Due: {formatDateTime(deadline)}
      </span>
    </div>
  );
};

interface EscalationWarningProps {
  approval: ApprovalRequest;
}

const EscalationWarning: React.FC<EscalationWarningProps> = ({ approval }) => {
  if (!approval.escalation_level || approval.status !== 'pending') {
    return null;
  }

  const slaStatus = calculateSlaStatus(approval.sla_deadline);
  const isUrgent = slaStatus === 'breached' || slaStatus === 'critical';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 12px',
        backgroundColor: isUrgent ? '#fef3c7' : '#eff6ff',
        border: `1px solid ${isUrgent ? '#fcd34d' : '#bfdbfe'}`,
        borderRadius: '6px',
        fontSize: '12px',
        marginBottom: '12px',
      }}
    >
      <span style={{ fontWeight: 700, color: isUrgent ? '#92400e' : '#1e40af' }}>
        ESCALATION LEVEL {approval.escalation_level}
      </span>
      {approval.escalated_to && (
        <span style={{ color: '#6b7280' }}>
          Escalated to: {approval.escalated_to}
        </span>
      )}
      {isUrgent && (
        <span style={{ color: '#dc2626', fontWeight: 600, marginLeft: 'auto' }}>
          IMMEDIATE ACTION REQUIRED
        </span>
      )}
    </div>
  );
};

interface ApprovalDetailPanelProps {
  approval: ApprovalRequest;
  history: ApprovalHistoryEntry[];
  onApprove: (reason: string) => void;
  onReject: (reason: string) => void;
  onEscalate: (escalateTo: string) => void;
  onClose: () => void;
  isProcessing: boolean;
}

const ApprovalDetailPanel: React.FC<ApprovalDetailPanelProps> = ({
  approval,
  history,
  onApprove,
  onReject,
  onEscalate,
  onClose,
  isProcessing,
}) => {
  const [reason, setReason] = useState('');
  const [escalateTo, setEscalateTo] = useState('');
  const [activeAction, setActiveAction] = useState<'approve' | 'reject' | 'escalate' | null>(null);

  const approvalHistory = history.filter(h => h.approval_id === approval.id);

  const handleSubmit = () => {
    if (activeAction === 'approve') {
      onApprove(reason);
    } else if (activeAction === 'reject') {
      onReject(reason);
    } else if (activeAction === 'escalate') {
      onEscalate(escalateTo);
    }
  };

  const contextEntries = Object.entries(approval.context);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: '600px',
        backgroundColor: '#ffffff',
        boxShadow: '-4px 0 20px rgba(0, 0, 0, 0.15)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 24px',
          borderBottom: '1px solid #e5e7eb',
          backgroundColor: '#f9fafb',
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#111827' }}>
            Approval Request
          </h2>
          <span style={{ fontSize: '12px', color: '#6b7280', fontFamily: 'monospace' }}>
            {approval.id}
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            padding: '8px 12px',
            backgroundColor: 'transparent',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            color: '#4b5563',
          }}
        >
          Close
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
        <EscalationWarning approval={approval} />

        {/* Status & Risk */}
        <div
          style={{
            display: 'flex',
            gap: '16px',
            marginBottom: '20px',
          }}
        >
          <div>
            <label style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Status
            </label>
            <div style={{ marginTop: '4px' }}>
              <StatusBadge status={approval.status} />
            </div>
          </div>
          <div>
            <label style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Risk Level
            </label>
            <div style={{ marginTop: '4px' }}>
              <RiskBadge level={approval.risk_level} size="lg" />
            </div>
          </div>
          <div>
            <label style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              SLA Status
            </label>
            <div style={{ marginTop: '4px' }}>
              <SlaIndicator deadline={approval.sla_deadline} status={approval.status} />
            </div>
          </div>
        </div>

        {/* Agent & Pack Info */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px',
            marginBottom: '20px',
            padding: '16px',
            backgroundColor: '#f9fafb',
            borderRadius: '8px',
          }}
        >
          <div>
            <label style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase' }}>Agent</label>
            <div style={{ fontWeight: 600, color: '#111827', marginTop: '2px' }}>{approval.agent_id}</div>
          </div>
          <div>
            <label style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase' }}>Pack</label>
            <div style={{ fontWeight: 600, color: '#111827', marginTop: '2px' }}>{approval.pack}</div>
          </div>
          <div>
            <label style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase' }}>Requested</label>
            <div style={{ fontWeight: 500, color: '#374151', marginTop: '2px' }}>
              {formatDateTime(approval.requested_at)}
            </div>
          </div>
          <div>
            <label style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase' }}>Action Type</label>
            <div style={{ marginTop: '4px' }}>
              <ActionTypeBadge actionType={approval.action_type} />
            </div>
          </div>
        </div>

        {/* Description */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Description
          </label>
          <p style={{ margin: '8px 0 0', color: '#374151', lineHeight: 1.6 }}>
            {approval.description}
          </p>
        </div>

        {/* Context Details */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Context Details
          </label>
          <div
            style={{
              marginTop: '8px',
              padding: '12px',
              backgroundColor: '#f3f4f6',
              borderRadius: '6px',
              fontFamily: 'monospace',
              fontSize: '13px',
            }}
          >
            {contextEntries.map(([key, value]) => (
              <div
                key={key}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '6px 0',
                  borderBottom: '1px solid #e5e7eb',
                }}
              >
                <span style={{ color: '#6b7280' }}>{key}:</span>
                <span style={{ color: '#111827', fontWeight: 500, maxWidth: '300px', textAlign: 'right' }}>
                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* History Timeline */}
        {approvalHistory.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Activity History
            </label>
            <div style={{ marginTop: '12px' }}>
              {approvalHistory.map((entry, index) => (
                <div
                  key={entry.id}
                  style={{
                    display: 'flex',
                    gap: '12px',
                    paddingBottom: index < approvalHistory.length - 1 ? '12px' : 0,
                    marginBottom: index < approvalHistory.length - 1 ? '12px' : 0,
                    borderBottom: index < approvalHistory.length - 1 ? '1px solid #e5e7eb' : 'none',
                  }}
                >
                  <div
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: entry.action === 'approved' ? '#10b981' :
                        entry.action === 'rejected' ? '#ef4444' :
                        entry.action === 'escalated' ? '#f59e0b' : '#6b7280',
                      marginTop: '6px',
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, color: '#374151', textTransform: 'capitalize' }}>
                        {entry.action}
                      </span>
                      <span style={{ fontSize: '11px', color: '#9ca3af' }}>
                        {formatRelativeTime(entry.timestamp)}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                      by {entry.actor}
                    </div>
                    {entry.reason && (
                      <div style={{ fontSize: '12px', color: '#4b5563', marginTop: '4px', fontStyle: 'italic' }}>
                        "{entry.reason}"
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Previous Review Info (for completed approvals) */}
        {approval.status !== 'pending' && approval.reviewed_by && (
          <div
            style={{
              padding: '16px',
              backgroundColor: approval.status === 'approved' ? '#d1fae5' : '#fee2e2',
              borderRadius: '8px',
              marginBottom: '20px',
            }}
          >
            <div style={{ fontWeight: 600, color: '#111827', marginBottom: '8px' }}>
              {approval.status === 'approved' ? 'Approved' : 'Rejected'} by {approval.reviewed_by}
            </div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
              {approval.reviewed_at && formatDateTime(approval.reviewed_at)}
            </div>
            {approval.review_reason && (
              <div style={{ fontSize: '13px', color: '#374151', marginTop: '8px' }}>
                <strong>Reason:</strong> {approval.review_reason}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Footer (only for pending approvals) */}
      {approval.status === 'pending' && (
        <div
          style={{
            padding: '20px 24px',
            borderTop: '1px solid #e5e7eb',
            backgroundColor: '#f9fafb',
          }}
        >
          {activeAction ? (
            <div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>
                  {activeAction === 'escalate' ? 'Escalate To' : 'Reason (Required)'}
                </label>
                {activeAction === 'escalate' ? (
                  <input
                    type="email"
                    value={escalateTo}
                    onChange={(e) => setEscalateTo(e.target.value)}
                    placeholder="Enter email address..."
                    style={{
                      width: '100%',
                      marginTop: '6px',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                    }}
                  />
                ) : (
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder={`Enter reason for ${activeAction}...`}
                    rows={3}
                    style={{
                      width: '100%',
                      marginTop: '6px',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      resize: 'vertical',
                    }}
                  />
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleSubmit}
                  disabled={isProcessing || (activeAction === 'escalate' ? !escalateTo : !reason)}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    backgroundColor: activeAction === 'approve' ? '#10b981' :
                      activeAction === 'reject' ? '#ef4444' : '#3b82f6',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 600,
                    fontSize: '14px',
                    cursor: isProcessing ? 'not-allowed' : 'pointer',
                    opacity: isProcessing ? 0.6 : 1,
                  }}
                >
                  {isProcessing ? 'Processing...' : `Confirm ${activeAction}`}
                </button>
                <button
                  onClick={() => {
                    setActiveAction(null);
                    setReason('');
                    setEscalateTo('');
                  }}
                  style={{
                    padding: '10px 16px',
                    backgroundColor: '#ffffff',
                    color: '#374151',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontWeight: 500,
                    fontSize: '14px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setActiveAction('approve')}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  backgroundColor: '#10b981',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                Approve
              </button>
              <button
                onClick={() => setActiveAction('reject')}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  backgroundColor: '#ef4444',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                Reject
              </button>
              <button
                onClick={() => setActiveAction('escalate')}
                style={{
                  padding: '12px 16px',
                  backgroundColor: '#ffffff',
                  color: '#3b82f6',
                  border: '2px solid #3b82f6',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                Escalate
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface BulkActionModalProps {
  action: 'approve' | 'reject';
  count: number;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  isProcessing: boolean;
}

const BulkActionModal: React.FC<BulkActionModalProps> = ({
  action,
  count,
  onConfirm,
  onCancel,
  isProcessing,
}) => {
  const [reason, setReason] = useState('');

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          width: '480px',
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '20px 24px',
            backgroundColor: action === 'approve' ? '#d1fae5' : '#fee2e2',
            borderBottom: '1px solid #e5e7eb',
          }}
        >
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#111827' }}>
            Bulk {action === 'approve' ? 'Approve' : 'Reject'} {count} Request{count > 1 ? 's' : ''}
          </h3>
        </div>
        <div style={{ padding: '24px' }}>
          <p style={{ margin: '0 0 16px', color: '#4b5563' }}>
            You are about to {action} {count} approval request{count > 1 ? 's' : ''}.
            This action will be logged for audit purposes.
          </p>
          <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>
            Reason (Required)
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={`Enter reason for bulk ${action}...`}
            rows={3}
            style={{
              width: '100%',
              marginTop: '6px',
              padding: '10px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              resize: 'vertical',
              boxSizing: 'border-box',
            }}
          />
        </div>
        <div
          style={{
            display: 'flex',
            gap: '8px',
            padding: '16px 24px',
            borderTop: '1px solid #e5e7eb',
            backgroundColor: '#f9fafb',
          }}
        >
          <button
            onClick={() => onConfirm(reason)}
            disabled={isProcessing || !reason.trim()}
            style={{
              flex: 1,
              padding: '10px 16px',
              backgroundColor: action === 'approve' ? '#10b981' : '#ef4444',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '14px',
              cursor: isProcessing || !reason.trim() ? 'not-allowed' : 'pointer',
              opacity: isProcessing || !reason.trim() ? 0.6 : 1,
            }}
          >
            {isProcessing ? 'Processing...' : `Confirm ${action === 'approve' ? 'Approve' : 'Reject'}`}
          </button>
          <button
            onClick={onCancel}
            style={{
              padding: '10px 24px',
              backgroundColor: '#ffffff',
              color: '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontWeight: 500,
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

interface StatsCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  color?: string;
  trend?: 'up' | 'down' | 'neutral';
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, subtitle, color = '#3b82f6' }) => (
  <div
    style={{
      padding: '16px 20px',
      backgroundColor: '#ffffff',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      borderLeft: `4px solid ${color}`,
    }}
  >
    <div style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
      {title}
    </div>
    <div style={{ fontSize: '28px', fontWeight: 700, color: '#111827', marginTop: '4px' }}>
      {value}
    </div>
    {subtitle && (
      <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
        {subtitle}
      </div>
    )}
  </div>
);

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const ApprovalQueue: React.FC<ApprovalQueueProps> = ({
  approvals: propApprovals,
  history: propHistory,
  currentUser = 'ops-admin@company.com',
  onApprove,
  onReject,
  onBulkApprove,
  onBulkReject,
  onEscalate,
  onRefresh,
  refreshInterval = DEFAULT_REFRESH_INTERVAL_MS,
}) => {
  // Use mock data if no props provided
  const [internalApprovals, setInternalApprovals] = useState<ApprovalRequest[]>(() =>
    propApprovals || generateMockApprovals()
  );
  const [internalHistory, setInternalHistory] = useState<ApprovalHistoryEntry[]>(() =>
    propHistory || generateMockHistory()
  );

  const approvals = propApprovals || internalApprovals;
  const history = propHistory || internalHistory;

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('queue');
  const [selectedApproval, setSelectedApproval] = useState<ApprovalRequest | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Filter & Sort state
  const [filters, setFilters] = useState<FilterState>({
    status: 'pending',
    risk_level: 'all',
    action_type: 'all',
    pack: 'all',
    search: '',
    sla_status: 'all',
  });
  const [sort, setSort] = useState<SortState>({
    field: 'sla_deadline',
    direction: 'asc',
  });

  // Action state
  const [isProcessing, setIsProcessing] = useState(false);
  const [bulkAction, setBulkAction] = useState<{ action: 'approve' | 'reject'; ids: string[] } | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  // Computed values
  const uniquePacks = useMemo(() => getUniquePacks(approvals), [approvals]);

  const filteredApprovals = useMemo(() => {
    return approvals.filter(approval => {
      // Status filter (for history view, show all; for queue view, default to pending)
      if (viewMode === 'queue' && filters.status !== 'all' && approval.status !== filters.status) {
        return false;
      }
      if (viewMode === 'history' && approval.status === 'pending') {
        return false;
      }

      // Risk level filter
      if (filters.risk_level !== 'all' && approval.risk_level !== filters.risk_level) {
        return false;
      }

      // Action type filter
      if (filters.action_type !== 'all' && approval.action_type !== filters.action_type) {
        return false;
      }

      // Pack filter
      if (filters.pack !== 'all' && approval.pack !== filters.pack) {
        return false;
      }

      // SLA status filter (only for pending)
      if (filters.sla_status !== 'all' && approval.status === 'pending') {
        const slaStatus = calculateSlaStatus(approval.sla_deadline);
        if (filters.sla_status === 'breached' && slaStatus !== 'breached') return false;
        if (filters.sla_status === 'warning' && slaStatus !== 'warning' && slaStatus !== 'critical') return false;
        if (filters.sla_status === 'healthy' && slaStatus !== 'healthy') return false;
      }

      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch =
          approval.id.toLowerCase().includes(searchLower) ||
          approval.agent_id.toLowerCase().includes(searchLower) ||
          approval.pack.toLowerCase().includes(searchLower) ||
          approval.description.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      return true;
    });
  }, [approvals, filters, viewMode]);

  const sortedApprovals = useMemo(() => {
    const sorted = [...filteredApprovals];

    sorted.sort((a, b) => {
      let comparison = 0;

      switch (sort.field) {
        case 'requested_at':
          comparison = a.requested_at.getTime() - b.requested_at.getTime();
          break;
        case 'sla_deadline':
          comparison = a.sla_deadline.getTime() - b.sla_deadline.getTime();
          break;
        case 'risk_level':
          comparison = RISK_LEVEL_PRIORITY[b.risk_level] - RISK_LEVEL_PRIORITY[a.risk_level];
          break;
        case 'pack':
          comparison = a.pack.localeCompare(b.pack);
          break;
        case 'action_type':
          comparison = a.action_type.localeCompare(b.action_type);
          break;
        default:
          comparison = 0;
      }

      return sort.direction === 'asc' ? comparison : -comparison;
    });

    // Always prioritize critical/breached SLA items at the top when in queue view
    if (viewMode === 'queue') {
      sorted.sort((a, b) => {
        const aUrgent = a.status === 'pending' &&
          (calculateSlaStatus(a.sla_deadline) === 'breached' || calculateSlaStatus(a.sla_deadline) === 'critical');
        const bUrgent = b.status === 'pending' &&
          (calculateSlaStatus(b.sla_deadline) === 'breached' || calculateSlaStatus(b.sla_deadline) === 'critical');

        if (aUrgent && !bUrgent) return -1;
        if (!aUrgent && bUrgent) return 1;
        return 0;
      });
    }

    return sorted;
  }, [filteredApprovals, sort, viewMode]);

  // Statistics
  const stats = useMemo(() => {
    const pending = approvals.filter(a => a.status === 'pending');
    const breached = pending.filter(a => calculateSlaStatus(a.sla_deadline) === 'breached');
    const critical = pending.filter(a => a.risk_level === 'critical' || a.risk_level === 'high');

    return {
      total_pending: pending.length,
      sla_breached: breached.length,
      critical_risk: critical.length,
      approved_today: approvals.filter(a =>
        a.status === 'approved' &&
        a.reviewed_at &&
        new Date(a.reviewed_at).toDateString() === new Date().toDateString()
      ).length,
      rejected_today: approvals.filter(a =>
        a.status === 'rejected' &&
        a.reviewed_at &&
        new Date(a.reviewed_at).toDateString() === new Date().toDateString()
      ).length,
    };
  }, [approvals]);

  // Auto-refresh
  useEffect(() => {
    if (!onRefresh || refreshInterval <= 0) return;

    const interval = setInterval(() => {
      onRefresh().then(() => setLastRefreshed(new Date()));
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [onRefresh, refreshInterval]);

  // Handlers
  const handleApprove = useCallback(async (id: string, reason: string) => {
    setIsProcessing(true);
    try {
      if (onApprove) {
        await onApprove(id, reason);
      } else {
        // Update internal state for demo
        setInternalApprovals(prev => prev.map(a =>
          a.id === id
            ? { ...a, status: 'approved' as const, reviewed_at: new Date(), reviewed_by: currentUser, review_reason: reason }
            : a
        ));
        setInternalHistory(prev => [...prev, {
          id: `hist-${Date.now()}`,
          approval_id: id,
          action: 'approved' as const,
          actor: currentUser,
          timestamp: new Date(),
          reason,
        }]);
      }
      setSelectedApproval(null);
    } finally {
      setIsProcessing(false);
    }
  }, [onApprove, currentUser]);

  const handleReject = useCallback(async (id: string, reason: string) => {
    setIsProcessing(true);
    try {
      if (onReject) {
        await onReject(id, reason);
      } else {
        setInternalApprovals(prev => prev.map(a =>
          a.id === id
            ? { ...a, status: 'rejected' as const, reviewed_at: new Date(), reviewed_by: currentUser, review_reason: reason }
            : a
        ));
        setInternalHistory(prev => [...prev, {
          id: `hist-${Date.now()}`,
          approval_id: id,
          action: 'rejected' as const,
          actor: currentUser,
          timestamp: new Date(),
          reason,
        }]);
      }
      setSelectedApproval(null);
    } finally {
      setIsProcessing(false);
    }
  }, [onReject, currentUser]);

  const handleEscalate = useCallback(async (id: string, escalateTo: string) => {
    setIsProcessing(true);
    try {
      if (onEscalate) {
        await onEscalate(id, escalateTo);
      } else {
        setInternalApprovals(prev => prev.map(a =>
          a.id === id
            ? { ...a, escalation_level: (a.escalation_level || 0) + 1, escalated_to: escalateTo }
            : a
        ));
        setInternalHistory(prev => [...prev, {
          id: `hist-${Date.now()}`,
          approval_id: id,
          action: 'escalated' as const,
          actor: currentUser,
          timestamp: new Date(),
          metadata: { escalated_to: escalateTo },
        }]);
      }
      setSelectedApproval(null);
    } finally {
      setIsProcessing(false);
    }
  }, [onEscalate, currentUser]);

  const handleBulkAction = useCallback(async (action: 'approve' | 'reject', reason: string) => {
    if (!bulkAction) return;

    setIsProcessing(true);
    try {
      if (action === 'approve' && onBulkApprove) {
        await onBulkApprove(bulkAction.ids, reason);
      } else if (action === 'reject' && onBulkReject) {
        await onBulkReject(bulkAction.ids, reason);
      } else {
        // Update internal state for demo
        const newStatus = action === 'approve' ? 'approved' : 'rejected';
        setInternalApprovals(prev => prev.map(a =>
          bulkAction.ids.includes(a.id)
            ? { ...a, status: newStatus as ApprovalStatus, reviewed_at: new Date(), reviewed_by: currentUser, review_reason: reason }
            : a
        ));
        bulkAction.ids.forEach(id => {
          setInternalHistory(prev => [...prev, {
            id: `hist-${Date.now()}-${id}`,
            approval_id: id,
            action: newStatus as 'approved' | 'rejected',
            actor: currentUser,
            timestamp: new Date(),
            reason,
          }]);
        });
      }
      setSelectedIds(new Set());
      setBulkAction(null);
    } finally {
      setIsProcessing(false);
    }
  }, [bulkAction, onBulkApprove, onBulkReject, currentUser]);

  const toggleSelectAll = useCallback(() => {
    const pendingIds = sortedApprovals.filter(a => a.status === 'pending').map(a => a.id);
    if (selectedIds.size === pendingIds.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingIds));
    }
  }, [sortedApprovals, selectedIds]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleSort = useCallback((field: SortField) => {
    setSort(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  }, []);

  // Render
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#f3f4f6' }}>
      {/* Header */}
      <div
        style={{
          padding: '20px 24px',
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e5e7eb',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#111827' }}>
              Approval Queue
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#6b7280' }}>
              Manage agent approval requests and track SLA compliance
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '12px', color: '#9ca3af' }}>
              Last refreshed: {formatRelativeTime(lastRefreshed)}
            </span>
            <button
              onClick={() => onRefresh?.().then(() => setLastRefreshed(new Date()))}
              style={{
                padding: '8px 16px',
                backgroundColor: '#ffffff',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' }}>
          <StatsCard
            title="Pending Approvals"
            value={stats.total_pending}
            color="#3b82f6"
            subtitle="Awaiting review"
          />
          <StatsCard
            title="SLA Breached"
            value={stats.sla_breached}
            color={stats.sla_breached > 0 ? '#ef4444' : '#10b981'}
            subtitle="Requires immediate action"
          />
          <StatsCard
            title="Critical/High Risk"
            value={stats.critical_risk}
            color="#f59e0b"
            subtitle="Priority review needed"
          />
          <StatsCard
            title="Approved Today"
            value={stats.approved_today}
            color="#10b981"
          />
          <StatsCard
            title="Rejected Today"
            value={stats.rejected_today}
            color="#6b7280"
          />
        </div>
      </div>

      {/* View Toggle & Filters */}
      <div
        style={{
          padding: '16px 24px',
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e5e7eb',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          {/* View Toggle */}
          <div
            style={{
              display: 'flex',
              backgroundColor: '#f3f4f6',
              borderRadius: '8px',
              padding: '4px',
            }}
          >
            <button
              onClick={() => setViewMode('queue')}
              style={{
                padding: '8px 20px',
                backgroundColor: viewMode === 'queue' ? '#ffffff' : 'transparent',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: viewMode === 'queue' ? 600 : 500,
                color: viewMode === 'queue' ? '#111827' : '#6b7280',
                cursor: 'pointer',
                boxShadow: viewMode === 'queue' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
              }}
            >
              Queue ({approvals.filter(a => a.status === 'pending').length})
            </button>
            <button
              onClick={() => setViewMode('history')}
              style={{
                padding: '8px 20px',
                backgroundColor: viewMode === 'history' ? '#ffffff' : 'transparent',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: viewMode === 'history' ? 600 : 500,
                color: viewMode === 'history' ? '#111827' : '#6b7280',
                cursor: 'pointer',
                boxShadow: viewMode === 'history' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
              }}
            >
              History
            </button>
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Search */}
            <input
              type="text"
              placeholder="Search approvals..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              style={{
                width: '240px',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
              }}
            />

            {/* Risk Level Filter */}
            <select
              value={filters.risk_level}
              onChange={(e) => setFilters(prev => ({ ...prev, risk_level: e.target.value as RiskLevel | 'all' }))}
              style={{
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                backgroundColor: '#ffffff',
              }}
            >
              <option value="all">All Risk Levels</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            {/* Action Type Filter */}
            <select
              value={filters.action_type}
              onChange={(e) => setFilters(prev => ({ ...prev, action_type: e.target.value as ActionType | 'all' }))}
              style={{
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                backgroundColor: '#ffffff',
              }}
            >
              <option value="all">All Action Types</option>
              <option value="financial">Financial</option>
              <option value="data_access">Data Access</option>
              <option value="external_api">External API</option>
              <option value="destructive">Destructive</option>
            </select>

            {/* Pack Filter */}
            <select
              value={filters.pack}
              onChange={(e) => setFilters(prev => ({ ...prev, pack: e.target.value }))}
              style={{
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                backgroundColor: '#ffffff',
              }}
            >
              <option value="all">All Packs</option>
              {uniquePacks.map(pack => (
                <option key={pack} value={pack}>{pack}</option>
              ))}
            </select>

            {/* SLA Status Filter (Queue view only) */}
            {viewMode === 'queue' && (
              <select
                value={filters.sla_status}
                onChange={(e) => setFilters(prev => ({ ...prev, sla_status: e.target.value as FilterState['sla_status'] }))}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: '#ffffff',
                }}
              >
                <option value="all">All SLA Status</option>
                <option value="breached">SLA Breached</option>
                <option value="warning">Warning/Critical</option>
                <option value="healthy">Healthy</option>
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Bulk Actions Bar (when items selected) */}
      {selectedIds.size > 0 && viewMode === 'queue' && (
        <div
          style={{
            padding: '12px 24px',
            backgroundColor: '#eff6ff',
            borderBottom: '1px solid #bfdbfe',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <span style={{ fontWeight: 600, color: '#1e40af' }}>
            {selectedIds.size} item{selectedIds.size > 1 ? 's' : ''} selected
          </span>
          <button
            onClick={() => setBulkAction({ action: 'approve', ids: Array.from(selectedIds) })}
            style={{
              padding: '6px 16px',
              backgroundColor: '#10b981',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Bulk Approve
          </button>
          <button
            onClick={() => setBulkAction({ action: 'reject', ids: Array.from(selectedIds) })}
            style={{
              padding: '6px 16px',
              backgroundColor: '#ef4444',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Bulk Reject
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            style={{
              padding: '6px 16px',
              backgroundColor: 'transparent',
              color: '#1e40af',
              border: '1px solid #1e40af',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Clear Selection
          </button>
        </div>
      )}

      {/* Main Content - Table */}
      <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            overflow: 'hidden',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                {viewMode === 'queue' && (
                  <th style={{ width: '40px', padding: '12px 16px' }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.size > 0 && selectedIds.size === sortedApprovals.filter(a => a.status === 'pending').length}
                      onChange={toggleSelectAll}
                      style={{ cursor: 'pointer' }}
                    />
                  </th>
                )}
                <th
                  style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#6b7280',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  Request
                </th>
                <th
                  onClick={() => handleSort('pack')}
                  style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#6b7280',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                >
                  Pack / Agent {sort.field === 'pack' && (sort.direction === 'asc' ? ' ^' : ' v')}
                </th>
                <th
                  onClick={() => handleSort('action_type')}
                  style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#6b7280',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                >
                  Action Type {sort.field === 'action_type' && (sort.direction === 'asc' ? ' ^' : ' v')}
                </th>
                <th
                  onClick={() => handleSort('risk_level')}
                  style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#6b7280',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                >
                  Risk {sort.field === 'risk_level' && (sort.direction === 'asc' ? ' ^' : ' v')}
                </th>
                <th
                  onClick={() => handleSort('sla_deadline')}
                  style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#6b7280',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                >
                  {viewMode === 'queue' ? 'SLA' : 'Reviewed'} {sort.field === 'sla_deadline' && (sort.direction === 'asc' ? ' ^' : ' v')}
                </th>
                <th
                  style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#6b7280',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  Status
                </th>
                <th
                  style={{
                    padding: '12px 16px',
                    textAlign: 'right',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#6b7280',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedApprovals.length === 0 ? (
                <tr>
                  <td
                    colSpan={viewMode === 'queue' ? 8 : 7}
                    style={{
                      padding: '48px',
                      textAlign: 'center',
                      color: '#6b7280',
                    }}
                  >
                    <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>*</div>
                    <div style={{ fontSize: '16px', fontWeight: 600 }}>No approvals found</div>
                    <div style={{ fontSize: '14px', marginTop: '4px' }}>
                      {viewMode === 'queue'
                        ? 'All pending approvals have been processed'
                        : 'No approval history matches your filters'}
                    </div>
                  </td>
                </tr>
              ) : (
                sortedApprovals.map((approval) => {
                  const slaStatus = calculateSlaStatus(approval.sla_deadline);
                  const isUrgent = approval.status === 'pending' &&
                    (slaStatus === 'breached' || slaStatus === 'critical');

                  return (
                    <tr
                      key={approval.id}
                      style={{
                        borderBottom: '1px solid #e5e7eb',
                        backgroundColor: isUrgent ? '#fef2f2' :
                          approval.escalation_level ? '#fffbeb' : 'transparent',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (!isUrgent && !approval.escalation_level) {
                          e.currentTarget.style.backgroundColor = '#f9fafb';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isUrgent && !approval.escalation_level) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }
                      }}
                    >
                      {viewMode === 'queue' && (
                        <td style={{ padding: '16px', width: '40px' }}>
                          {approval.status === 'pending' && (
                            <input
                              type="checkbox"
                              checked={selectedIds.has(approval.id)}
                              onChange={() => toggleSelect(approval.id)}
                              style={{ cursor: 'pointer' }}
                            />
                          )}
                        </td>
                      )}
                      <td style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ fontFamily: 'monospace', fontSize: '12px', color: '#6b7280' }}>
                            {approval.id}
                          </span>
                          <span style={{ fontSize: '14px', color: '#111827', fontWeight: 500, maxWidth: '280px' }}>
                            {truncate(approval.description, 80)}
                          </span>
                          <span style={{ fontSize: '11px', color: '#9ca3af' }}>
                            {formatRelativeTime(approval.requested_at)}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontWeight: 600, color: '#111827', textTransform: 'capitalize' }}>
                            {approval.pack}
                          </span>
                          <span style={{ fontSize: '12px', color: '#6b7280' }}>
                            {approval.agent_id}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <ActionTypeBadge actionType={approval.action_type} />
                      </td>
                      <td style={{ padding: '16px' }}>
                        <RiskBadge level={approval.risk_level} />
                      </td>
                      <td style={{ padding: '16px' }}>
                        {viewMode === 'queue' ? (
                          <SlaIndicator deadline={approval.sla_deadline} status={approval.status} />
                        ) : (
                          <div style={{ fontSize: '13px', color: '#6b7280' }}>
                            {approval.reviewed_at ? formatDateTime(approval.reviewed_at) : 'N/A'}
                            {approval.reviewed_by && (
                              <div style={{ fontSize: '11px', marginTop: '2px' }}>
                                by {approval.reviewed_by}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '16px' }}>
                        <StatusBadge status={approval.status} />
                      </td>
                      <td style={{ padding: '16px', textAlign: 'right' }}>
                        <button
                          onClick={() => setSelectedApproval(approval)}
                          style={{
                            padding: '6px 14px',
                            backgroundColor: approval.status === 'pending' ? '#3b82f6' : '#ffffff',
                            color: approval.status === 'pending' ? '#ffffff' : '#3b82f6',
                            border: approval.status === 'pending' ? 'none' : '1px solid #3b82f6',
                            borderRadius: '6px',
                            fontSize: '13px',
                            fontWeight: 500,
                            cursor: 'pointer',
                          }}
                        >
                          {approval.status === 'pending' ? 'Review' : 'View Details'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Results Summary */}
        {sortedApprovals.length > 0 && (
          <div style={{ marginTop: '16px', textAlign: 'center', fontSize: '13px', color: '#6b7280' }}>
            Showing {sortedApprovals.length} of {approvals.length} total approval requests
          </div>
        )}
      </div>

      {/* Detail Panel */}
      {selectedApproval && (
        <ApprovalDetailPanel
          approval={selectedApproval}
          history={history}
          onApprove={(reason) => handleApprove(selectedApproval.id, reason)}
          onReject={(reason) => handleReject(selectedApproval.id, reason)}
          onEscalate={(escalateTo) => handleEscalate(selectedApproval.id, escalateTo)}
          onClose={() => setSelectedApproval(null)}
          isProcessing={isProcessing}
        />
      )}

      {/* Bulk Action Modal */}
      {bulkAction && (
        <BulkActionModal
          action={bulkAction.action}
          count={bulkAction.ids.length}
          onConfirm={(reason) => handleBulkAction(bulkAction.action, reason)}
          onCancel={() => setBulkAction(null)}
          isProcessing={isProcessing}
        />
      )}
    </div>
  );
};

export default ApprovalQueue;
