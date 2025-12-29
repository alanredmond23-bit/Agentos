/**
 * AuditLog.tsx - Compliance-Ready Audit Log Viewer
 *
 * Enterprise-grade audit log component for AgentOS Ops Console.
 * Designed for SOC2, ISO 27001, and GDPR compliance requirements.
 *
 * Features:
 * - Full-text search with field-specific queries
 * - Multi-dimensional filtering (agent, pack, action, user, date range)
 * - Export to CSV/JSON with compliance metadata
 * - Tamper-evident hash chain visualization
 * - Retention policy display and enforcement
 * - Real-time integrity verification
 *
 * @version 1.0.0
 * @compliance SOC2-CC6.1, SOC2-CC7.2, ISO27001-A.12.4
 */

import React, {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
  type ChangeEvent,
  type FormEvent,
} from 'react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Actor represents the entity that performed an action.
 * Supports agent, user, and system-initiated actions.
 */
interface Actor {
  type: 'agent' | 'user' | 'system';
  id: string;
  name?: string;
  ip?: string;
  userAgent?: string;
}

/**
 * Resource represents the target of an audit action.
 */
interface Resource {
  type: string;
  id: string;
  name?: string;
  path?: string;
}

/**
 * Core audit entry schema - immutable once created.
 * Hash chain ensures tamper-evidence.
 */
export interface AuditEntry {
  id: string;
  timestamp: Date;
  actor: Actor;
  action: string;
  resource: Resource;
  outcome: 'success' | 'failure' | 'denied';
  metadata: Record<string, unknown>;
  hash: string;
  prev_hash: string;
  // Extended compliance fields
  session_id?: string;
  correlation_id?: string;
  pack?: string;
  agent?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  category?: string;
  compliance_tags?: string[];
}

/**
 * Retention policy configuration
 */
interface RetentionPolicy {
  id: string;
  name: string;
  description: string;
  retentionDays: number;
  actionTypes: string[];
  actorTypes: ('agent' | 'user' | 'system')[];
  archiveEnabled: boolean;
  complianceFramework: string[];
  lastEnforced?: Date;
  nextEnforcement?: Date;
}

/**
 * Filter state for the audit log viewer
 */
interface AuditFilters {
  search: string;
  actorType: 'all' | 'agent' | 'user' | 'system';
  actorId: string;
  pack: string;
  action: string;
  outcome: 'all' | 'success' | 'failure' | 'denied';
  dateFrom: string;
  dateTo: string;
  severity: 'all' | 'low' | 'medium' | 'high' | 'critical';
  category: string;
}

/**
 * Export format options
 */
type ExportFormat = 'csv' | 'json' | 'json-ld';

/**
 * Hash chain integrity status
 */
interface IntegrityStatus {
  verified: boolean;
  brokenAt?: string;
  lastVerified: Date;
  totalEntries: number;
  verifiedEntries: number;
}

/**
 * Component props
 */
interface AuditLogProps {
  entries?: AuditEntry[];
  retentionPolicies?: RetentionPolicy[];
  onExport?: (entries: AuditEntry[], format: ExportFormat) => void;
  onIntegrityCheck?: () => Promise<IntegrityStatus>;
  showRetentionPolicy?: boolean;
  showHashChain?: boolean;
  pageSize?: number;
  className?: string;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format timestamp for display with timezone
 */
function formatTimestamp(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZoneName: 'short',
  }).format(date);
}

/**
 * Format timestamp for ISO compliance export
 */
function formatISO8601(date: Date): string {
  return date.toISOString();
}

/**
 * Generate SHA-256 hash for verification display
 */
function truncateHash(hash: string, length: number = 12): string {
  if (!hash) return 'N/A';
  return `${hash.slice(0, length)}...${hash.slice(-4)}`;
}

/**
 * Verify hash chain integrity between two entries
 */
function verifyHashLink(current: AuditEntry, previous: AuditEntry | null): boolean {
  if (!previous) {
    // Genesis entry - prev_hash should be zeros or empty
    return current.prev_hash === '0'.repeat(64) || current.prev_hash === '';
  }
  return current.prev_hash === previous.hash;
}

/**
 * Convert entries to CSV format with compliance headers
 */
function entriesToCSV(entries: AuditEntry[]): string {
  const headers = [
    'ID',
    'Timestamp (ISO 8601)',
    'Actor Type',
    'Actor ID',
    'Actor Name',
    'Action',
    'Resource Type',
    'Resource ID',
    'Resource Name',
    'Outcome',
    'Severity',
    'Category',
    'Pack',
    'Agent',
    'Session ID',
    'Correlation ID',
    'Compliance Tags',
    'Hash',
    'Previous Hash',
    'Metadata (JSON)',
  ];

  const rows = entries.map((entry) => [
    entry.id,
    formatISO8601(entry.timestamp),
    entry.actor.type,
    entry.actor.id,
    entry.actor.name || '',
    entry.action,
    entry.resource.type,
    entry.resource.id,
    entry.resource.name || '',
    entry.outcome,
    entry.severity || '',
    entry.category || '',
    entry.pack || '',
    entry.agent || '',
    entry.session_id || '',
    entry.correlation_id || '',
    (entry.compliance_tags || []).join(';'),
    entry.hash,
    entry.prev_hash,
    JSON.stringify(entry.metadata),
  ]);

  const escapeCSV = (value: string): string => {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  const csvContent = [
    headers.map(escapeCSV).join(','),
    ...rows.map((row) => row.map(escapeCSV).join(',')),
  ].join('\n');

  // Add BOM for Excel compatibility
  return '\uFEFF' + csvContent;
}

/**
 * Convert entries to JSON-LD format for compliance
 */
function entriesToJSONLD(entries: AuditEntry[]): string {
  const jsonLD = {
    '@context': {
      '@vocab': 'https://schema.org/',
      'audit': 'https://agentos.io/audit#',
      'soc2': 'https://aicpa.org/soc2#',
      'iso27001': 'https://iso.org/27001#',
    },
    '@type': 'audit:AuditLog',
    'audit:exportedAt': formatISO8601(new Date()),
    'audit:exportedBy': 'AgentOS Ops Console',
    'audit:version': '1.0.0',
    'audit:complianceFrameworks': ['SOC2', 'ISO27001', 'GDPR'],
    'audit:totalEntries': entries.length,
    'audit:entries': entries.map((entry) => ({
      '@type': 'audit:AuditEntry',
      '@id': `urn:agentos:audit:${entry.id}`,
      'audit:timestamp': formatISO8601(entry.timestamp),
      'audit:actor': {
        '@type': `audit:${entry.actor.type.charAt(0).toUpperCase() + entry.actor.type.slice(1)}Actor`,
        'audit:id': entry.actor.id,
        'audit:name': entry.actor.name,
      },
      'audit:action': entry.action,
      'audit:resource': {
        '@type': entry.resource.type,
        '@id': entry.resource.id,
        'name': entry.resource.name,
      },
      'audit:outcome': entry.outcome,
      'audit:severity': entry.severity,
      'audit:category': entry.category,
      'audit:hash': entry.hash,
      'audit:previousHash': entry.prev_hash,
      'audit:metadata': entry.metadata,
    })),
  };

  return JSON.stringify(jsonLD, null, 2);
}

/**
 * Download file helper
 */
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ============================================================================
// MOCK DATA GENERATORS
// ============================================================================

/**
 * Generate mock audit entries for demonstration
 */
function generateMockEntries(count: number = 100): AuditEntry[] {
  const actions = [
    'agent.started',
    'agent.completed',
    'agent.failed',
    'task.created',
    'task.assigned',
    'task.completed',
    'approval.requested',
    'approval.granted',
    'approval.denied',
    'resource.accessed',
    'resource.modified',
    'resource.deleted',
    'config.changed',
    'secret.accessed',
    'user.login',
    'user.logout',
    'pack.enabled',
    'pack.disabled',
    'killswitch.activated',
    'killswitch.deactivated',
  ];

  const actorTypes: ('agent' | 'user' | 'system')[] = ['agent', 'user', 'system'];
  const outcomes: ('success' | 'failure' | 'denied')[] = ['success', 'failure', 'denied'];
  const severities: ('low' | 'medium' | 'high' | 'critical')[] = ['low', 'medium', 'high', 'critical'];
  const categories = ['security', 'operations', 'compliance', 'access', 'data', 'configuration'];
  const packs = ['marketing', 'engineering', 'finance', 'legal', 'devops', 'research', 'product', 'lead_faucet'];
  const agents = [
    'content-writer',
    'code-reviewer',
    'deploy-agent',
    'invoice-processor',
    'contract-reviewer',
    'data-analyst',
    'monitoring-agent',
  ];

  const entries: AuditEntry[] = [];
  let prevHash = '0'.repeat(64);

  const now = new Date();

  for (let i = 0; i < count; i++) {
    const timestamp = new Date(now.getTime() - i * 1000 * 60 * Math.random() * 60);
    const actorType = actorTypes[Math.floor(Math.random() * actorTypes.length)];
    const action = actions[Math.floor(Math.random() * actions.length)];
    const outcome = outcomes[Math.floor(Math.random() * outcomes.length)];
    const severity = severities[Math.floor(Math.random() * severities.length)];
    const category = categories[Math.floor(Math.random() * categories.length)];
    const pack = packs[Math.floor(Math.random() * packs.length)];
    const agent = agents[Math.floor(Math.random() * agents.length)];

    // Generate a mock hash (in production, use actual SHA-256)
    const hash = Array.from({ length: 64 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('');

    const entry: AuditEntry = {
      id: `audit-${String(count - i).padStart(6, '0')}`,
      timestamp,
      actor: {
        type: actorType,
        id: actorType === 'agent' ? `${pack}/${agent}` : actorType === 'user' ? `user-${Math.floor(Math.random() * 100)}` : 'system',
        name: actorType === 'agent' ? agent : actorType === 'user' ? `User ${Math.floor(Math.random() * 100)}` : 'System',
        ip: actorType === 'user' ? `192.168.1.${Math.floor(Math.random() * 255)}` : undefined,
      },
      action,
      resource: {
        type: action.split('.')[0],
        id: `res-${Math.floor(Math.random() * 10000)}`,
        name: `${action.split('.')[0]} resource`,
      },
      outcome,
      metadata: {
        duration_ms: Math.floor(Math.random() * 5000),
        request_id: `req-${Math.random().toString(36).substring(7)}`,
      },
      hash,
      prev_hash: prevHash,
      session_id: `sess-${Math.random().toString(36).substring(7)}`,
      correlation_id: `corr-${Math.random().toString(36).substring(7)}`,
      pack,
      agent: actorType === 'agent' ? agent : undefined,
      severity,
      category,
      compliance_tags: Math.random() > 0.5 ? ['SOC2', 'ISO27001'] : ['GDPR'],
    };

    entries.push(entry);
    prevHash = hash;
  }

  return entries.reverse();
}

/**
 * Generate mock retention policies
 */
function generateMockRetentionPolicies(): RetentionPolicy[] {
  return [
    {
      id: 'pol-security',
      name: 'Security Events',
      description: 'Security-related audit events including access control and authentication',
      retentionDays: 2555, // 7 years
      actionTypes: ['user.login', 'user.logout', 'secret.accessed', 'approval.denied'],
      actorTypes: ['user', 'system'],
      archiveEnabled: true,
      complianceFramework: ['SOC2', 'ISO27001', 'GDPR'],
      lastEnforced: new Date(Date.now() - 24 * 60 * 60 * 1000),
      nextEnforcement: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
    {
      id: 'pol-operations',
      name: 'Operational Events',
      description: 'Day-to-day operational events from agents and tasks',
      retentionDays: 365,
      actionTypes: ['agent.started', 'agent.completed', 'task.created', 'task.completed'],
      actorTypes: ['agent', 'system'],
      archiveEnabled: true,
      complianceFramework: ['SOC2'],
      lastEnforced: new Date(Date.now() - 24 * 60 * 60 * 1000),
      nextEnforcement: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
    {
      id: 'pol-compliance',
      name: 'Compliance Events',
      description: 'Events required for regulatory compliance reporting',
      retentionDays: 3650, // 10 years
      actionTypes: ['approval.granted', 'approval.denied', 'config.changed', 'killswitch.activated'],
      actorTypes: ['user', 'agent', 'system'],
      archiveEnabled: true,
      complianceFramework: ['SOC2', 'ISO27001', 'HIPAA', 'GDPR'],
      lastEnforced: new Date(Date.now() - 24 * 60 * 60 * 1000),
      nextEnforcement: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  ];
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Filter panel component
 */
interface FilterPanelProps {
  filters: AuditFilters;
  onFilterChange: (filters: Partial<AuditFilters>) => void;
  uniquePacks: string[];
  uniqueActions: string[];
  uniqueCategories: string[];
}

function FilterPanel({
  filters,
  onFilterChange,
  uniquePacks,
  uniqueActions,
  uniqueCategories,
}: FilterPanelProps): ReactNode {
  const handleChange = (field: keyof AuditFilters) => (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    onFilterChange({ [field]: e.target.value });
  };

  const handleReset = () => {
    onFilterChange({
      search: '',
      actorType: 'all',
      actorId: '',
      pack: '',
      action: '',
      outcome: 'all',
      dateFrom: '',
      dateTo: '',
      severity: 'all',
      category: '',
    });
  };

  return (
    <div className="audit-filter-panel">
      <div className="audit-filter-header">
        <h3>Filters</h3>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={handleReset}
          title="Reset all filters"
        >
          Reset
        </button>
      </div>

      <div className="audit-filter-grid">
        {/* Search */}
        <div className="audit-filter-group audit-filter-search">
          <label htmlFor="audit-search">Search</label>
          <input
            id="audit-search"
            type="text"
            className="form-input"
            placeholder="Search entries..."
            value={filters.search}
            onChange={handleChange('search')}
          />
        </div>

        {/* Actor Type */}
        <div className="audit-filter-group">
          <label htmlFor="audit-actor-type">Actor Type</label>
          <select
            id="audit-actor-type"
            className="form-select"
            value={filters.actorType}
            onChange={handleChange('actorType')}
          >
            <option value="all">All Types</option>
            <option value="agent">Agent</option>
            <option value="user">User</option>
            <option value="system">System</option>
          </select>
        </div>

        {/* Actor ID */}
        <div className="audit-filter-group">
          <label htmlFor="audit-actor-id">Actor ID</label>
          <input
            id="audit-actor-id"
            type="text"
            className="form-input"
            placeholder="Filter by actor..."
            value={filters.actorId}
            onChange={handleChange('actorId')}
          />
        </div>

        {/* Pack */}
        <div className="audit-filter-group">
          <label htmlFor="audit-pack">Pack</label>
          <select
            id="audit-pack"
            className="form-select"
            value={filters.pack}
            onChange={handleChange('pack')}
          >
            <option value="">All Packs</option>
            {uniquePacks.map((pack) => (
              <option key={pack} value={pack}>
                {pack}
              </option>
            ))}
          </select>
        </div>

        {/* Action */}
        <div className="audit-filter-group">
          <label htmlFor="audit-action">Action</label>
          <select
            id="audit-action"
            className="form-select"
            value={filters.action}
            onChange={handleChange('action')}
          >
            <option value="">All Actions</option>
            {uniqueActions.map((action) => (
              <option key={action} value={action}>
                {action}
              </option>
            ))}
          </select>
        </div>

        {/* Outcome */}
        <div className="audit-filter-group">
          <label htmlFor="audit-outcome">Outcome</label>
          <select
            id="audit-outcome"
            className="form-select"
            value={filters.outcome}
            onChange={handleChange('outcome')}
          >
            <option value="all">All Outcomes</option>
            <option value="success">Success</option>
            <option value="failure">Failure</option>
            <option value="denied">Denied</option>
          </select>
        </div>

        {/* Severity */}
        <div className="audit-filter-group">
          <label htmlFor="audit-severity">Severity</label>
          <select
            id="audit-severity"
            className="form-select"
            value={filters.severity}
            onChange={handleChange('severity')}
          >
            <option value="all">All Severities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>

        {/* Category */}
        <div className="audit-filter-group">
          <label htmlFor="audit-category">Category</label>
          <select
            id="audit-category"
            className="form-select"
            value={filters.category}
            onChange={handleChange('category')}
          >
            <option value="">All Categories</option>
            {uniqueCategories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Date From */}
        <div className="audit-filter-group">
          <label htmlFor="audit-date-from">From Date</label>
          <input
            id="audit-date-from"
            type="datetime-local"
            className="form-input"
            value={filters.dateFrom}
            onChange={handleChange('dateFrom')}
          />
        </div>

        {/* Date To */}
        <div className="audit-filter-group">
          <label htmlFor="audit-date-to">To Date</label>
          <input
            id="audit-date-to"
            type="datetime-local"
            className="form-input"
            value={filters.dateTo}
            onChange={handleChange('dateTo')}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Hash chain visualization component
 */
interface HashChainProps {
  entries: AuditEntry[];
  integrityStatus?: IntegrityStatus;
  onVerify?: () => void;
}

function HashChainVisualization({ entries, integrityStatus, onVerify }: HashChainProps): ReactNode {
  const recentEntries = entries.slice(-5);

  return (
    <div className="audit-hash-chain">
      <div className="audit-hash-chain-header">
        <h3>Tamper-Evident Hash Chain</h3>
        {onVerify && (
          <button type="button" className="btn btn-outline btn-sm" onClick={onVerify}>
            Verify Integrity
          </button>
        )}
      </div>

      {integrityStatus && (
        <div
          className={`audit-integrity-status ${
            integrityStatus.verified ? 'audit-integrity-valid' : 'audit-integrity-invalid'
          }`}
        >
          <div className="audit-integrity-icon">
            {integrityStatus.verified ? (
              <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
              </svg>
            )}
          </div>
          <div className="audit-integrity-details">
            <strong>
              {integrityStatus.verified ? 'Chain Integrity Verified' : 'Chain Integrity Compromised'}
            </strong>
            <span>
              {integrityStatus.verifiedEntries} / {integrityStatus.totalEntries} entries verified
            </span>
            <span className="audit-integrity-time">
              Last verified: {formatTimestamp(integrityStatus.lastVerified)}
            </span>
            {integrityStatus.brokenAt && (
              <span className="audit-integrity-broken">
                Chain broken at: {integrityStatus.brokenAt}
              </span>
            )}
          </div>
        </div>
      )}

      <div className="audit-hash-chain-visual">
        <div className="audit-hash-chain-label">Recent Chain Links:</div>
        <div className="audit-hash-chain-links">
          {recentEntries.map((entry, index) => {
            const prevEntry = index > 0 ? recentEntries[index - 1] : null;
            const isValid = verifyHashLink(entry, prevEntry);

            return (
              <React.Fragment key={entry.id}>
                {index > 0 && (
                  <div className={`audit-hash-link ${isValid ? 'valid' : 'invalid'}`}>
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                      <path d="M16.01 11H4v2h12.01v3L20 12l-3.99-4z" />
                    </svg>
                  </div>
                )}
                <div className="audit-hash-block" title={`Full hash: ${entry.hash}`}>
                  <div className="audit-hash-id">{entry.id}</div>
                  <div className="audit-hash-value">{truncateHash(entry.hash)}</div>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <div className="audit-hash-chain-info">
        <p>
          Each audit entry contains a cryptographic hash of its contents and a reference to the
          previous entry's hash, creating an immutable chain. Any modification to historical
          entries would break the chain and be immediately detectable.
        </p>
      </div>
    </div>
  );
}

/**
 * Retention policy display component
 */
interface RetentionPolicyDisplayProps {
  policies: RetentionPolicy[];
}

function RetentionPolicyDisplay({ policies }: RetentionPolicyDisplayProps): ReactNode {
  return (
    <div className="audit-retention-policies">
      <div className="audit-retention-header">
        <h3>Data Retention Policies</h3>
        <span className="audit-retention-badge">
          {policies.length} active {policies.length === 1 ? 'policy' : 'policies'}
        </span>
      </div>

      <div className="audit-retention-list">
        {policies.map((policy) => (
          <div key={policy.id} className="audit-retention-card">
            <div className="audit-retention-card-header">
              <h4>{policy.name}</h4>
              <span className="audit-retention-days">
                {policy.retentionDays} days
                {policy.retentionDays >= 365 && ` (${(policy.retentionDays / 365).toFixed(1)} years)`}
              </span>
            </div>

            <p className="audit-retention-description">{policy.description}</p>

            <div className="audit-retention-details">
              <div className="audit-retention-detail">
                <span className="audit-retention-label">Action Types:</span>
                <span className="audit-retention-value">
                  {policy.actionTypes.length > 3
                    ? `${policy.actionTypes.slice(0, 3).join(', ')} +${policy.actionTypes.length - 3} more`
                    : policy.actionTypes.join(', ')}
                </span>
              </div>

              <div className="audit-retention-detail">
                <span className="audit-retention-label">Actor Types:</span>
                <span className="audit-retention-value">{policy.actorTypes.join(', ')}</span>
              </div>

              <div className="audit-retention-detail">
                <span className="audit-retention-label">Compliance:</span>
                <span className="audit-retention-value">
                  {policy.complianceFramework.map((framework) => (
                    <span key={framework} className="audit-compliance-tag">
                      {framework}
                    </span>
                  ))}
                </span>
              </div>

              <div className="audit-retention-detail">
                <span className="audit-retention-label">Archive:</span>
                <span className="audit-retention-value">
                  {policy.archiveEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>

              {policy.lastEnforced && (
                <div className="audit-retention-detail">
                  <span className="audit-retention-label">Last Enforced:</span>
                  <span className="audit-retention-value">
                    {formatTimestamp(policy.lastEnforced)}
                  </span>
                </div>
              )}

              {policy.nextEnforcement && (
                <div className="audit-retention-detail">
                  <span className="audit-retention-label">Next Enforcement:</span>
                  <span className="audit-retention-value">
                    {formatTimestamp(policy.nextEnforcement)}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Export modal component
 */
interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (format: ExportFormat) => void;
  entryCount: number;
}

function ExportModal({ isOpen, onClose, onExport, entryCount }: ExportModalProps): ReactNode {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('csv');
  const [includeMetadata, setIncludeMetadata] = useState(true);

  if (!isOpen) return null;

  const handleExport = () => {
    onExport(selectedFormat);
    onClose();
  };

  return (
    <div className="audit-modal-overlay" onClick={onClose}>
      <div className="audit-modal" onClick={(e) => e.stopPropagation()}>
        <div className="audit-modal-header">
          <h2>Export Audit Log</h2>
          <button type="button" className="audit-modal-close" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="audit-modal-body">
          <p className="audit-export-summary">
            Exporting <strong>{entryCount}</strong> audit {entryCount === 1 ? 'entry' : 'entries'}{' '}
            with current filters applied.
          </p>

          <div className="audit-export-options">
            <div className="audit-export-format">
              <label>Export Format:</label>
              <div className="audit-format-options">
                <label className="audit-format-option">
                  <input
                    type="radio"
                    name="format"
                    value="csv"
                    checked={selectedFormat === 'csv'}
                    onChange={() => setSelectedFormat('csv')}
                  />
                  <span className="audit-format-label">
                    <strong>CSV</strong>
                    <small>Spreadsheet compatible, SOC2 audit-ready</small>
                  </span>
                </label>

                <label className="audit-format-option">
                  <input
                    type="radio"
                    name="format"
                    value="json"
                    checked={selectedFormat === 'json'}
                    onChange={() => setSelectedFormat('json')}
                  />
                  <span className="audit-format-label">
                    <strong>JSON</strong>
                    <small>Structured data, machine-readable</small>
                  </span>
                </label>

                <label className="audit-format-option">
                  <input
                    type="radio"
                    name="format"
                    value="json-ld"
                    checked={selectedFormat === 'json-ld'}
                    onChange={() => setSelectedFormat('json-ld')}
                  />
                  <span className="audit-format-label">
                    <strong>JSON-LD</strong>
                    <small>Linked data format, compliance-optimized</small>
                  </span>
                </label>
              </div>
            </div>

            <div className="audit-export-checkbox">
              <label>
                <input
                  type="checkbox"
                  checked={includeMetadata}
                  onChange={(e) => setIncludeMetadata(e.target.checked)}
                />
                Include full metadata in export
              </label>
            </div>
          </div>

          <div className="audit-export-compliance">
            <h4>Compliance Information</h4>
            <p>
              This export includes all fields required for SOC2 CC6.1 (Logical Access Controls) and
              ISO 27001 A.12.4 (Logging and Monitoring) compliance. The export will include:
            </p>
            <ul>
              <li>Full timestamp with timezone (ISO 8601)</li>
              <li>Actor identification and authentication context</li>
              <li>Action details and resource affected</li>
              <li>Outcome status and severity classification</li>
              <li>Hash chain for tamper-evidence verification</li>
              <li>Correlation IDs for request tracing</li>
            </ul>
          </div>
        </div>

        <div className="audit-modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={handleExport}>
            Export {selectedFormat.toUpperCase()}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Entry detail modal component
 */
interface EntryDetailModalProps {
  entry: AuditEntry | null;
  onClose: () => void;
}

function EntryDetailModal({ entry, onClose }: EntryDetailModalProps): ReactNode {
  if (!entry) return null;

  return (
    <div className="audit-modal-overlay" onClick={onClose}>
      <div className="audit-modal audit-modal-large" onClick={(e) => e.stopPropagation()}>
        <div className="audit-modal-header">
          <h2>Audit Entry Details</h2>
          <button type="button" className="audit-modal-close" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="audit-modal-body">
          <div className="audit-detail-grid">
            <div className="audit-detail-section">
              <h3>Entry Information</h3>
              <dl className="audit-detail-list">
                <dt>Entry ID</dt>
                <dd className="font-mono">{entry.id}</dd>

                <dt>Timestamp</dt>
                <dd>{formatTimestamp(entry.timestamp)}</dd>

                <dt>Outcome</dt>
                <dd>
                  <span className={`audit-outcome-badge audit-outcome-${entry.outcome}`}>
                    {entry.outcome}
                  </span>
                </dd>

                <dt>Severity</dt>
                <dd>
                  <span className={`audit-severity-badge audit-severity-${entry.severity || 'low'}`}>
                    {entry.severity || 'N/A'}
                  </span>
                </dd>

                <dt>Category</dt>
                <dd>{entry.category || 'N/A'}</dd>
              </dl>
            </div>

            <div className="audit-detail-section">
              <h3>Actor</h3>
              <dl className="audit-detail-list">
                <dt>Type</dt>
                <dd>{entry.actor.type}</dd>

                <dt>ID</dt>
                <dd className="font-mono">{entry.actor.id}</dd>

                <dt>Name</dt>
                <dd>{entry.actor.name || 'N/A'}</dd>

                {entry.actor.ip && (
                  <>
                    <dt>IP Address</dt>
                    <dd className="font-mono">{entry.actor.ip}</dd>
                  </>
                )}
              </dl>
            </div>

            <div className="audit-detail-section">
              <h3>Action</h3>
              <dl className="audit-detail-list">
                <dt>Action</dt>
                <dd className="font-mono">{entry.action}</dd>

                <dt>Pack</dt>
                <dd>{entry.pack || 'N/A'}</dd>

                <dt>Agent</dt>
                <dd>{entry.agent || 'N/A'}</dd>
              </dl>
            </div>

            <div className="audit-detail-section">
              <h3>Resource</h3>
              <dl className="audit-detail-list">
                <dt>Type</dt>
                <dd>{entry.resource.type}</dd>

                <dt>ID</dt>
                <dd className="font-mono">{entry.resource.id}</dd>

                <dt>Name</dt>
                <dd>{entry.resource.name || 'N/A'}</dd>

                {entry.resource.path && (
                  <>
                    <dt>Path</dt>
                    <dd className="font-mono">{entry.resource.path}</dd>
                  </>
                )}
              </dl>
            </div>

            <div className="audit-detail-section">
              <h3>Tracing</h3>
              <dl className="audit-detail-list">
                <dt>Session ID</dt>
                <dd className="font-mono">{entry.session_id || 'N/A'}</dd>

                <dt>Correlation ID</dt>
                <dd className="font-mono">{entry.correlation_id || 'N/A'}</dd>

                <dt>Compliance Tags</dt>
                <dd>
                  {entry.compliance_tags?.length ? (
                    entry.compliance_tags.map((tag) => (
                      <span key={tag} className="audit-compliance-tag">
                        {tag}
                      </span>
                    ))
                  ) : (
                    'None'
                  )}
                </dd>
              </dl>
            </div>

            <div className="audit-detail-section">
              <h3>Hash Chain</h3>
              <dl className="audit-detail-list">
                <dt>Entry Hash</dt>
                <dd className="font-mono audit-hash-full">{entry.hash}</dd>

                <dt>Previous Hash</dt>
                <dd className="font-mono audit-hash-full">{entry.prev_hash}</dd>
              </dl>
            </div>

            <div className="audit-detail-section audit-detail-full-width">
              <h3>Metadata</h3>
              <pre className="audit-metadata-json">
                {JSON.stringify(entry.metadata, null, 2)}
              </pre>
            </div>
          </div>
        </div>

        <div className="audit-modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Pagination component
 */
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
}: PaginationProps): ReactNode {
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  const getPageNumbers = (): (number | string)[] => {
    const pages: (number | string)[] = [];
    const maxVisible = 7;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      if (currentPage > 3) {
        pages.push('...');
      }

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push('...');
      }

      pages.push(totalPages);
    }

    return pages;
  };

  if (totalPages <= 1) return null;

  return (
    <div className="audit-pagination">
      <div className="audit-pagination-info">
        Showing {startItem} to {endItem} of {totalItems} entries
      </div>

      <div className="audit-pagination-controls">
        <button
          type="button"
          className="audit-pagination-btn"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          title="First page"
        >
          &laquo;
        </button>

        <button
          type="button"
          className="audit-pagination-btn"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          title="Previous page"
        >
          &lsaquo;
        </button>

        {getPageNumbers().map((page, index) =>
          typeof page === 'number' ? (
            <button
              key={page}
              type="button"
              className={`audit-pagination-btn ${currentPage === page ? 'active' : ''}`}
              onClick={() => onPageChange(page)}
            >
              {page}
            </button>
          ) : (
            <span key={`ellipsis-${index}`} className="audit-pagination-ellipsis">
              {page}
            </span>
          )
        )}

        <button
          type="button"
          className="audit-pagination-btn"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          title="Next page"
        >
          &rsaquo;
        </button>

        <button
          type="button"
          className="audit-pagination-btn"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          title="Last page"
        >
          &raquo;
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * AuditLog - Enterprise-grade audit log viewer component
 *
 * Provides comprehensive audit trail visualization with:
 * - Full-text and field-specific search
 * - Multi-dimensional filtering
 * - CSV/JSON/JSON-LD export with compliance metadata
 * - Tamper-evident hash chain visualization
 * - Retention policy display
 * - Real-time integrity verification
 */
export function AuditLog({
  entries: propEntries,
  retentionPolicies: propPolicies,
  onExport,
  onIntegrityCheck,
  showRetentionPolicy = true,
  showHashChain = true,
  pageSize = 25,
  className = '',
}: AuditLogProps): ReactNode {
  // Use mock data if no entries provided
  const entries = useMemo(
    () => propEntries || generateMockEntries(100),
    [propEntries]
  );

  const retentionPolicies = useMemo(
    () => propPolicies || generateMockRetentionPolicies(),
    [propPolicies]
  );

  // State
  const [filters, setFilters] = useState<AuditFilters>({
    search: '',
    actorType: 'all',
    actorId: '',
    pack: '',
    action: '',
    outcome: 'all',
    dateFrom: '',
    dateTo: '',
    severity: 'all',
    category: '',
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [selectedEntry, setSelectedEntry] = useState<AuditEntry | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [integrityStatus, setIntegrityStatus] = useState<IntegrityStatus | null>(null);
  const [activeTab, setActiveTab] = useState<'logs' | 'policies' | 'chain'>('logs');

  // Extract unique values for filter dropdowns
  const uniquePacks = useMemo(
    () => [...new Set(entries.map((e) => e.pack).filter(Boolean) as string[])].sort(),
    [entries]
  );

  const uniqueActions = useMemo(
    () => [...new Set(entries.map((e) => e.action))].sort(),
    [entries]
  );

  const uniqueCategories = useMemo(
    () => [...new Set(entries.map((e) => e.category).filter(Boolean) as string[])].sort(),
    [entries]
  );

  // Filter entries
  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const searchableFields = [
          entry.id,
          entry.action,
          entry.actor.id,
          entry.actor.name,
          entry.resource.id,
          entry.resource.name,
          entry.pack,
          entry.agent,
          entry.category,
          JSON.stringify(entry.metadata),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        if (!searchableFields.includes(searchLower)) {
          return false;
        }
      }

      // Actor type filter
      if (filters.actorType !== 'all' && entry.actor.type !== filters.actorType) {
        return false;
      }

      // Actor ID filter
      if (filters.actorId && !entry.actor.id.toLowerCase().includes(filters.actorId.toLowerCase())) {
        return false;
      }

      // Pack filter
      if (filters.pack && entry.pack !== filters.pack) {
        return false;
      }

      // Action filter
      if (filters.action && entry.action !== filters.action) {
        return false;
      }

      // Outcome filter
      if (filters.outcome !== 'all' && entry.outcome !== filters.outcome) {
        return false;
      }

      // Severity filter
      if (filters.severity !== 'all' && entry.severity !== filters.severity) {
        return false;
      }

      // Category filter
      if (filters.category && entry.category !== filters.category) {
        return false;
      }

      // Date range filter
      if (filters.dateFrom) {
        const fromDate = new Date(filters.dateFrom);
        if (entry.timestamp < fromDate) {
          return false;
        }
      }

      if (filters.dateTo) {
        const toDate = new Date(filters.dateTo);
        if (entry.timestamp > toDate) {
          return false;
        }
      }

      return true;
    });
  }, [entries, filters]);

  // Pagination
  const totalPages = Math.ceil(filteredEntries.length / pageSize);
  const paginatedEntries = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredEntries.slice(start, start + pageSize);
  }, [filteredEntries, currentPage, pageSize]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  // Handlers
  const handleFilterChange = useCallback((newFilters: Partial<AuditFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  }, []);

  const handleExport = useCallback(
    (format: ExportFormat) => {
      if (onExport) {
        onExport(filteredEntries, format);
        return;
      }

      const timestamp = formatISO8601(new Date()).replace(/[:.]/g, '-');

      switch (format) {
        case 'csv': {
          const csv = entriesToCSV(filteredEntries);
          downloadFile(csv, `audit-log-${timestamp}.csv`, 'text/csv;charset=utf-8');
          break;
        }
        case 'json': {
          const json = JSON.stringify(filteredEntries, null, 2);
          downloadFile(json, `audit-log-${timestamp}.json`, 'application/json');
          break;
        }
        case 'json-ld': {
          const jsonLD = entriesToJSONLD(filteredEntries);
          downloadFile(jsonLD, `audit-log-${timestamp}.jsonld`, 'application/ld+json');
          break;
        }
      }
    },
    [filteredEntries, onExport]
  );

  const handleIntegrityCheck = useCallback(async () => {
    if (onIntegrityCheck) {
      const status = await onIntegrityCheck();
      setIntegrityStatus(status);
      return;
    }

    // Mock integrity check
    let brokenAt: string | undefined;
    let verified = true;

    for (let i = 0; i < entries.length; i++) {
      const prevEntry = i > 0 ? entries[i - 1] : null;
      if (!verifyHashLink(entries[i], prevEntry)) {
        verified = false;
        brokenAt = entries[i].id;
        break;
      }
    }

    setIntegrityStatus({
      verified,
      brokenAt,
      lastVerified: new Date(),
      totalEntries: entries.length,
      verifiedEntries: verified ? entries.length : entries.findIndex((e) => e.id === brokenAt),
    });
  }, [entries, onIntegrityCheck]);

  // Stats
  const stats = useMemo(() => ({
    total: filteredEntries.length,
    success: filteredEntries.filter((e) => e.outcome === 'success').length,
    failure: filteredEntries.filter((e) => e.outcome === 'failure').length,
    denied: filteredEntries.filter((e) => e.outcome === 'denied').length,
    critical: filteredEntries.filter((e) => e.severity === 'critical').length,
    high: filteredEntries.filter((e) => e.severity === 'high').length,
  }), [filteredEntries]);

  return (
    <div className={`audit-log ${className}`}>
      {/* Header */}
      <div className="audit-log-header">
        <div className="audit-log-title">
          <h1>Audit Log</h1>
          <p>
            Compliance-ready audit trail with tamper-evident hash chain verification.
            Supports SOC2, ISO 27001, and GDPR requirements.
          </p>
        </div>

        <div className="audit-log-actions">
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => setIsExportModalOpen(true)}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
            </svg>
            Export
          </button>

          <button type="button" className="btn btn-outline" onClick={handleIntegrityCheck}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
            </svg>
            Verify Integrity
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="audit-stats-bar">
        <div className="audit-stat">
          <span className="audit-stat-value">{stats.total}</span>
          <span className="audit-stat-label">Total Entries</span>
        </div>
        <div className="audit-stat audit-stat-success">
          <span className="audit-stat-value">{stats.success}</span>
          <span className="audit-stat-label">Success</span>
        </div>
        <div className="audit-stat audit-stat-failure">
          <span className="audit-stat-value">{stats.failure}</span>
          <span className="audit-stat-label">Failures</span>
        </div>
        <div className="audit-stat audit-stat-denied">
          <span className="audit-stat-value">{stats.denied}</span>
          <span className="audit-stat-label">Denied</span>
        </div>
        <div className="audit-stat audit-stat-critical">
          <span className="audit-stat-value">{stats.critical}</span>
          <span className="audit-stat-label">Critical</span>
        </div>
        <div className="audit-stat audit-stat-high">
          <span className="audit-stat-value">{stats.high}</span>
          <span className="audit-stat-label">High Severity</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="audit-tabs">
        <button
          type="button"
          className={`audit-tab ${activeTab === 'logs' ? 'active' : ''}`}
          onClick={() => setActiveTab('logs')}
        >
          Audit Logs
        </button>
        {showRetentionPolicy && (
          <button
            type="button"
            className={`audit-tab ${activeTab === 'policies' ? 'active' : ''}`}
            onClick={() => setActiveTab('policies')}
          >
            Retention Policies
          </button>
        )}
        {showHashChain && (
          <button
            type="button"
            className={`audit-tab ${activeTab === 'chain' ? 'active' : ''}`}
            onClick={() => setActiveTab('chain')}
          >
            Hash Chain
          </button>
        )}
      </div>

      {/* Tab Content */}
      <div className="audit-tab-content">
        {activeTab === 'logs' && (
          <>
            {/* Filters */}
            <FilterPanel
              filters={filters}
              onFilterChange={handleFilterChange}
              uniquePacks={uniquePacks}
              uniqueActions={uniqueActions}
              uniqueCategories={uniqueCategories}
            />

            {/* Table */}
            <div className="audit-table-container">
              <table className="audit-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Actor</th>
                    <th>Action</th>
                    <th>Resource</th>
                    <th>Outcome</th>
                    <th>Severity</th>
                    <th>Pack</th>
                    <th>Hash</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedEntries.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="audit-table-empty">
                        No audit entries match your filters.
                      </td>
                    </tr>
                  ) : (
                    paginatedEntries.map((entry) => (
                      <tr key={entry.id} className={`audit-row audit-row-${entry.outcome}`}>
                        <td className="audit-cell-timestamp">
                          <span className="font-mono">{formatTimestamp(entry.timestamp)}</span>
                        </td>
                        <td className="audit-cell-actor">
                          <span className={`audit-actor-badge audit-actor-${entry.actor.type}`}>
                            {entry.actor.type}
                          </span>
                          <span className="audit-actor-id" title={entry.actor.id}>
                            {entry.actor.name || entry.actor.id}
                          </span>
                        </td>
                        <td className="audit-cell-action">
                          <code>{entry.action}</code>
                        </td>
                        <td className="audit-cell-resource">
                          <span className="audit-resource-type">{entry.resource.type}</span>
                          <span className="audit-resource-id" title={entry.resource.id}>
                            {entry.resource.name || entry.resource.id}
                          </span>
                        </td>
                        <td className="audit-cell-outcome">
                          <span className={`audit-outcome-badge audit-outcome-${entry.outcome}`}>
                            {entry.outcome}
                          </span>
                        </td>
                        <td className="audit-cell-severity">
                          {entry.severity && (
                            <span className={`audit-severity-badge audit-severity-${entry.severity}`}>
                              {entry.severity}
                            </span>
                          )}
                        </td>
                        <td className="audit-cell-pack">{entry.pack || '-'}</td>
                        <td className="audit-cell-hash">
                          <span className="font-mono" title={entry.hash}>
                            {truncateHash(entry.hash, 8)}
                          </span>
                        </td>
                        <td className="audit-cell-actions">
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => setSelectedEntry(entry)}
                            title="View details"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredEntries.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
            />
          </>
        )}

        {activeTab === 'policies' && showRetentionPolicy && (
          <RetentionPolicyDisplay policies={retentionPolicies} />
        )}

        {activeTab === 'chain' && showHashChain && (
          <HashChainVisualization
            entries={filteredEntries}
            integrityStatus={integrityStatus || undefined}
            onVerify={handleIntegrityCheck}
          />
        )}
      </div>

      {/* Modals */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onExport={handleExport}
        entryCount={filteredEntries.length}
      />

      <EntryDetailModal entry={selectedEntry} onClose={() => setSelectedEntry(null)} />

      {/* Component Styles */}
      <style>{`
        .audit-log {
          --audit-primary: #3b82f6;
          --audit-success: #10b981;
          --audit-failure: #ef4444;
          --audit-denied: #f59e0b;
          --audit-critical: #dc2626;
          --audit-high: #f97316;
          --audit-medium: #eab308;
          --audit-low: #22c55e;
          --audit-border: #e5e7eb;
          --audit-bg: #f9fafb;
          --audit-text: #1f2937;
          --audit-text-muted: #6b7280;

          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
          color: var(--audit-text);
        }

        .audit-log-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid var(--audit-border);
        }

        .audit-log-title h1 {
          margin: 0 0 0.5rem 0;
          font-size: 1.75rem;
          font-weight: 600;
        }

        .audit-log-title p {
          margin: 0;
          color: var(--audit-text-muted);
          font-size: 0.875rem;
        }

        .audit-log-actions {
          display: flex;
          gap: 0.75rem;
        }

        .audit-log-actions .btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        /* Stats Bar */
        .audit-stats-bar {
          display: flex;
          gap: 1rem;
          padding: 1rem;
          background: var(--audit-bg);
          border-radius: 0.5rem;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
        }

        .audit-stat {
          display: flex;
          flex-direction: column;
          padding: 0.5rem 1rem;
          background: white;
          border-radius: 0.375rem;
          border: 1px solid var(--audit-border);
          min-width: 100px;
        }

        .audit-stat-value {
          font-size: 1.5rem;
          font-weight: 600;
        }

        .audit-stat-label {
          font-size: 0.75rem;
          color: var(--audit-text-muted);
          text-transform: uppercase;
        }

        .audit-stat-success .audit-stat-value { color: var(--audit-success); }
        .audit-stat-failure .audit-stat-value { color: var(--audit-failure); }
        .audit-stat-denied .audit-stat-value { color: var(--audit-denied); }
        .audit-stat-critical .audit-stat-value { color: var(--audit-critical); }
        .audit-stat-high .audit-stat-value { color: var(--audit-high); }

        /* Tabs */
        .audit-tabs {
          display: flex;
          gap: 0;
          border-bottom: 1px solid var(--audit-border);
          margin-bottom: 1.5rem;
        }

        .audit-tab {
          padding: 0.75rem 1.5rem;
          border: none;
          background: none;
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--audit-text-muted);
          cursor: pointer;
          border-bottom: 2px solid transparent;
          margin-bottom: -1px;
          transition: all 0.15s ease;
        }

        .audit-tab:hover {
          color: var(--audit-text);
        }

        .audit-tab.active {
          color: var(--audit-primary);
          border-bottom-color: var(--audit-primary);
        }

        /* Filter Panel */
        .audit-filter-panel {
          background: var(--audit-bg);
          border-radius: 0.5rem;
          padding: 1rem;
          margin-bottom: 1.5rem;
        }

        .audit-filter-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .audit-filter-header h3 {
          margin: 0;
          font-size: 0.875rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--audit-text-muted);
        }

        .audit-filter-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 1rem;
        }

        .audit-filter-group {
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
        }

        .audit-filter-group label {
          font-size: 0.75rem;
          font-weight: 500;
          color: var(--audit-text-muted);
        }

        .audit-filter-search {
          grid-column: span 2;
        }

        .form-input,
        .form-select {
          width: 100%;
          padding: 0.5rem 0.75rem;
          border: 1px solid var(--audit-border);
          border-radius: 0.375rem;
          font-size: 0.875rem;
          background: white;
        }

        .form-input:focus,
        .form-select:focus {
          outline: none;
          border-color: var(--audit-primary);
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        /* Table */
        .audit-table-container {
          overflow-x: auto;
          border: 1px solid var(--audit-border);
          border-radius: 0.5rem;
          margin-bottom: 1rem;
        }

        .audit-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.875rem;
        }

        .audit-table th {
          background: var(--audit-bg);
          padding: 0.75rem 1rem;
          text-align: left;
          font-weight: 600;
          color: var(--audit-text-muted);
          border-bottom: 1px solid var(--audit-border);
          white-space: nowrap;
        }

        .audit-table td {
          padding: 0.75rem 1rem;
          border-bottom: 1px solid var(--audit-border);
          vertical-align: middle;
        }

        .audit-table tbody tr:last-child td {
          border-bottom: none;
        }

        .audit-table tbody tr:hover {
          background: rgba(59, 130, 246, 0.04);
        }

        .audit-row-failure {
          background: rgba(239, 68, 68, 0.04);
        }

        .audit-row-denied {
          background: rgba(245, 158, 11, 0.04);
        }

        .audit-table-empty {
          text-align: center;
          padding: 3rem 1rem !important;
          color: var(--audit-text-muted);
        }

        /* Cell Styles */
        .audit-cell-timestamp {
          white-space: nowrap;
          font-size: 0.75rem;
        }

        .audit-cell-actor {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .audit-actor-badge {
          display: inline-block;
          padding: 0.125rem 0.5rem;
          border-radius: 9999px;
          font-size: 0.625rem;
          font-weight: 600;
          text-transform: uppercase;
          width: fit-content;
        }

        .audit-actor-agent { background: #dbeafe; color: #1e40af; }
        .audit-actor-user { background: #dcfce7; color: #166534; }
        .audit-actor-system { background: #f3e8ff; color: #7c3aed; }

        .audit-actor-id {
          font-size: 0.75rem;
          color: var(--audit-text-muted);
          max-width: 150px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .audit-cell-action code {
          background: var(--audit-bg);
          padding: 0.25rem 0.5rem;
          border-radius: 0.25rem;
          font-size: 0.75rem;
        }

        .audit-cell-resource {
          display: flex;
          flex-direction: column;
          gap: 0.125rem;
        }

        .audit-resource-type {
          font-size: 0.625rem;
          text-transform: uppercase;
          color: var(--audit-text-muted);
        }

        .audit-resource-id {
          font-size: 0.75rem;
          max-width: 120px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .audit-outcome-badge,
        .audit-severity-badge {
          display: inline-block;
          padding: 0.25rem 0.5rem;
          border-radius: 0.25rem;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .audit-outcome-success { background: #dcfce7; color: #166534; }
        .audit-outcome-failure { background: #fee2e2; color: #991b1b; }
        .audit-outcome-denied { background: #fef3c7; color: #92400e; }

        .audit-severity-low { background: #dcfce7; color: #166534; }
        .audit-severity-medium { background: #fef3c7; color: #92400e; }
        .audit-severity-high { background: #ffedd5; color: #c2410c; }
        .audit-severity-critical { background: #fee2e2; color: #991b1b; }

        .audit-cell-hash {
          font-size: 0.75rem;
          color: var(--audit-text-muted);
        }

        .font-mono {
          font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
        }

        /* Pagination */
        .audit-pagination {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 0;
        }

        .audit-pagination-info {
          font-size: 0.875rem;
          color: var(--audit-text-muted);
        }

        .audit-pagination-controls {
          display: flex;
          gap: 0.25rem;
        }

        .audit-pagination-btn {
          min-width: 2rem;
          height: 2rem;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--audit-border);
          background: white;
          border-radius: 0.25rem;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .audit-pagination-btn:hover:not(:disabled) {
          background: var(--audit-bg);
        }

        .audit-pagination-btn.active {
          background: var(--audit-primary);
          border-color: var(--audit-primary);
          color: white;
        }

        .audit-pagination-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .audit-pagination-ellipsis {
          min-width: 2rem;
          height: 2rem;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--audit-text-muted);
        }

        /* Hash Chain */
        .audit-hash-chain {
          background: var(--audit-bg);
          border-radius: 0.5rem;
          padding: 1.5rem;
        }

        .audit-hash-chain-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .audit-hash-chain-header h3 {
          margin: 0;
          font-size: 1.125rem;
          font-weight: 600;
        }

        .audit-integrity-status {
          display: flex;
          gap: 1rem;
          padding: 1rem;
          border-radius: 0.5rem;
          margin-bottom: 1.5rem;
        }

        .audit-integrity-valid {
          background: #dcfce7;
          border: 1px solid #86efac;
        }

        .audit-integrity-invalid {
          background: #fee2e2;
          border: 1px solid #fca5a5;
        }

        .audit-integrity-valid .audit-integrity-icon { color: #16a34a; }
        .audit-integrity-invalid .audit-integrity-icon { color: #dc2626; }

        .audit-integrity-details {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .audit-integrity-time,
        .audit-integrity-broken {
          font-size: 0.875rem;
          color: var(--audit-text-muted);
        }

        .audit-integrity-broken {
          color: #dc2626;
          font-weight: 500;
        }

        .audit-hash-chain-visual {
          margin-bottom: 1.5rem;
        }

        .audit-hash-chain-label {
          font-size: 0.875rem;
          font-weight: 500;
          margin-bottom: 0.75rem;
          color: var(--audit-text-muted);
        }

        .audit-hash-chain-links {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          overflow-x: auto;
          padding: 0.5rem 0;
        }

        .audit-hash-block {
          flex-shrink: 0;
          padding: 0.75rem 1rem;
          background: white;
          border: 1px solid var(--audit-border);
          border-radius: 0.5rem;
          text-align: center;
        }

        .audit-hash-id {
          font-size: 0.75rem;
          font-weight: 600;
          margin-bottom: 0.25rem;
        }

        .audit-hash-value {
          font-family: ui-monospace, SFMono-Regular, monospace;
          font-size: 0.625rem;
          color: var(--audit-text-muted);
        }

        .audit-hash-link {
          flex-shrink: 0;
        }

        .audit-hash-link.valid { color: var(--audit-success); }
        .audit-hash-link.invalid { color: var(--audit-failure); }

        .audit-hash-chain-info {
          padding: 1rem;
          background: white;
          border-radius: 0.375rem;
          border: 1px solid var(--audit-border);
        }

        .audit-hash-chain-info p {
          margin: 0;
          font-size: 0.875rem;
          color: var(--audit-text-muted);
          line-height: 1.6;
        }

        /* Retention Policies */
        .audit-retention-policies {
          background: var(--audit-bg);
          border-radius: 0.5rem;
          padding: 1.5rem;
        }

        .audit-retention-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .audit-retention-header h3 {
          margin: 0;
          font-size: 1.125rem;
          font-weight: 600;
        }

        .audit-retention-badge {
          padding: 0.25rem 0.75rem;
          background: var(--audit-primary);
          color: white;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .audit-retention-list {
          display: grid;
          gap: 1rem;
        }

        .audit-retention-card {
          background: white;
          border: 1px solid var(--audit-border);
          border-radius: 0.5rem;
          padding: 1.25rem;
        }

        .audit-retention-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.75rem;
        }

        .audit-retention-card-header h4 {
          margin: 0;
          font-size: 1rem;
          font-weight: 600;
        }

        .audit-retention-days {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--audit-primary);
        }

        .audit-retention-description {
          margin: 0 0 1rem 0;
          font-size: 0.875rem;
          color: var(--audit-text-muted);
        }

        .audit-retention-details {
          display: grid;
          gap: 0.5rem;
        }

        .audit-retention-detail {
          display: flex;
          gap: 0.5rem;
          font-size: 0.875rem;
        }

        .audit-retention-label {
          color: var(--audit-text-muted);
          min-width: 120px;
        }

        .audit-compliance-tag {
          display: inline-block;
          padding: 0.125rem 0.5rem;
          background: #e0e7ff;
          color: #3730a3;
          border-radius: 0.25rem;
          font-size: 0.75rem;
          font-weight: 500;
          margin-right: 0.25rem;
        }

        /* Modal */
        .audit-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 2rem;
        }

        .audit-modal {
          background: white;
          border-radius: 0.75rem;
          width: 100%;
          max-width: 32rem;
          max-height: 90vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        }

        .audit-modal-large {
          max-width: 56rem;
        }

        .audit-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid var(--audit-border);
        }

        .audit-modal-header h2 {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 600;
        }

        .audit-modal-close {
          width: 2rem;
          height: 2rem;
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          background: none;
          font-size: 1.5rem;
          color: var(--audit-text-muted);
          cursor: pointer;
          border-radius: 0.25rem;
        }

        .audit-modal-close:hover {
          background: var(--audit-bg);
        }

        .audit-modal-body {
          padding: 1.5rem;
          overflow-y: auto;
        }

        .audit-modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          padding: 1.25rem 1.5rem;
          border-top: 1px solid var(--audit-border);
        }

        /* Export Modal */
        .audit-export-summary {
          margin: 0 0 1.5rem 0;
          font-size: 0.875rem;
        }

        .audit-export-format label:first-child {
          display: block;
          font-weight: 500;
          margin-bottom: 0.75rem;
        }

        .audit-format-options {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .audit-format-option {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 0.75rem;
          border: 1px solid var(--audit-border);
          border-radius: 0.5rem;
          cursor: pointer;
        }

        .audit-format-option:hover {
          background: var(--audit-bg);
        }

        .audit-format-option input[type="radio"] {
          margin-top: 0.25rem;
        }

        .audit-format-label {
          display: flex;
          flex-direction: column;
          gap: 0.125rem;
        }

        .audit-format-label small {
          color: var(--audit-text-muted);
        }

        .audit-export-checkbox {
          margin-top: 1.5rem;
        }

        .audit-export-checkbox label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          cursor: pointer;
        }

        .audit-export-compliance {
          margin-top: 1.5rem;
          padding: 1rem;
          background: var(--audit-bg);
          border-radius: 0.5rem;
        }

        .audit-export-compliance h4 {
          margin: 0 0 0.5rem 0;
          font-size: 0.875rem;
          font-weight: 600;
        }

        .audit-export-compliance p {
          margin: 0 0 0.75rem 0;
          font-size: 0.875rem;
          color: var(--audit-text-muted);
        }

        .audit-export-compliance ul {
          margin: 0;
          padding-left: 1.25rem;
          font-size: 0.875rem;
          color: var(--audit-text-muted);
        }

        .audit-export-compliance li {
          margin-bottom: 0.25rem;
        }

        /* Detail Modal */
        .audit-detail-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1.5rem;
        }

        .audit-detail-section {
          background: var(--audit-bg);
          padding: 1rem;
          border-radius: 0.5rem;
        }

        .audit-detail-section h3 {
          margin: 0 0 0.75rem 0;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--audit-text-muted);
        }

        .audit-detail-full-width {
          grid-column: span 2;
        }

        .audit-detail-list {
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 0.5rem 1rem;
          margin: 0;
        }

        .audit-detail-list dt {
          font-size: 0.75rem;
          color: var(--audit-text-muted);
        }

        .audit-detail-list dd {
          margin: 0;
          font-size: 0.875rem;
        }

        .audit-hash-full {
          word-break: break-all;
          font-size: 0.75rem;
        }

        .audit-metadata-json {
          margin: 0;
          padding: 0.75rem;
          background: white;
          border: 1px solid var(--audit-border);
          border-radius: 0.375rem;
          font-family: ui-monospace, SFMono-Regular, monospace;
          font-size: 0.75rem;
          overflow-x: auto;
          white-space: pre-wrap;
        }

        /* Buttons */
        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.5rem 1rem;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
          border: 1px solid transparent;
        }

        .btn-primary {
          background: var(--audit-primary);
          color: white;
        }

        .btn-primary:hover {
          background: #2563eb;
        }

        .btn-outline {
          background: white;
          border-color: var(--audit-border);
          color: var(--audit-text);
        }

        .btn-outline:hover {
          background: var(--audit-bg);
        }

        .btn-ghost {
          background: transparent;
          color: var(--audit-text-muted);
        }

        .btn-ghost:hover {
          background: var(--audit-bg);
          color: var(--audit-text);
        }

        .btn-sm {
          padding: 0.25rem 0.75rem;
          font-size: 0.75rem;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .audit-log-header {
            flex-direction: column;
            gap: 1rem;
          }

          .audit-stats-bar {
            gap: 0.5rem;
          }

          .audit-stat {
            min-width: 80px;
            padding: 0.375rem 0.75rem;
          }

          .audit-stat-value {
            font-size: 1.25rem;
          }

          .audit-filter-grid {
            grid-template-columns: 1fr;
          }

          .audit-filter-search {
            grid-column: span 1;
          }

          .audit-detail-grid {
            grid-template-columns: 1fr;
          }

          .audit-detail-full-width {
            grid-column: span 1;
          }

          .audit-pagination {
            flex-direction: column;
            gap: 1rem;
          }
        }
      `}</style>
    </div>
  );
}

export default AuditLog;
