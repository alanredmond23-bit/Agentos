// Mock data for AgentOS Ops Console

export interface Approval {
  id: string;
  pack: string;
  agent: string;
  action: string;
  riskLevel: 'low' | 'medium' | 'high';
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  context: Record<string, unknown>;
}

export interface PackStatus {
  id: string;
  name: string;
  enabled: boolean;
  agentCount: number;
  activeRuns: number;
  lastActivity?: string;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  pack: string;
  agent: string;
  eventType: string;
  runId: string;
  message: string;
  metadata?: Record<string, unknown>;
}

// Generate timestamps relative to now
const now = new Date();
const hoursAgo = (hours: number) => new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString();
const minutesAgo = (minutes: number) => new Date(now.getTime() - minutes * 60 * 1000).toISOString();

export const mockApprovals: Approval[] = [
  {
    id: 'apr-001',
    pack: 'marketing',
    agent: 'content-writer',
    action: 'publish_blog_post',
    riskLevel: 'medium',
    status: 'pending',
    requestedAt: minutesAgo(15),
    context: { postId: 'blog-2024-12-28', wordCount: 1500 },
  },
  {
    id: 'apr-002',
    pack: 'finance',
    agent: 'invoice-processor',
    action: 'approve_payment',
    riskLevel: 'high',
    status: 'pending',
    requestedAt: minutesAgo(30),
    context: { amount: 15000, vendor: 'ACME Corp', invoiceId: 'INV-2024-0892' },
  },
  {
    id: 'apr-003',
    pack: 'engineering',
    agent: 'deploy-agent',
    action: 'deploy_to_production',
    riskLevel: 'high',
    status: 'pending',
    requestedAt: hoursAgo(1),
    context: { service: 'api-gateway', version: '2.3.1', environment: 'production' },
  },
  {
    id: 'apr-004',
    pack: 'lead_faucet',
    agent: 'outreach-agent',
    action: 'send_bulk_email',
    riskLevel: 'medium',
    status: 'pending',
    requestedAt: hoursAgo(2),
    context: { recipientCount: 500, campaignId: 'winter-promo-2024' },
  },
  {
    id: 'apr-005',
    pack: 'legal',
    agent: 'contract-reviewer',
    action: 'flag_for_legal_review',
    riskLevel: 'low',
    status: 'approved',
    requestedAt: hoursAgo(4),
    reviewedAt: hoursAgo(3),
    reviewedBy: 'legal-admin',
    context: { contractId: 'CON-2024-0456', vendor: 'TechPartner Inc' },
  },
  {
    id: 'apr-006',
    pack: 'devops',
    agent: 'infrastructure-agent',
    action: 'scale_cluster',
    riskLevel: 'high',
    status: 'rejected',
    requestedAt: hoursAgo(6),
    reviewedAt: hoursAgo(5),
    reviewedBy: 'devops-lead',
    context: { cluster: 'prod-east', targetNodes: 10, currentNodes: 3 },
  },
];

export const mockPackStatus: PackStatus[] = [
  {
    id: 'marketing',
    name: 'Marketing Pack',
    enabled: true,
    agentCount: 5,
    activeRuns: 3,
    lastActivity: minutesAgo(5),
  },
  {
    id: 'engineering',
    name: 'Engineering Pack',
    enabled: true,
    agentCount: 8,
    activeRuns: 12,
    lastActivity: minutesAgo(1),
  },
  {
    id: 'finance',
    name: 'Finance Pack',
    enabled: true,
    agentCount: 4,
    activeRuns: 1,
    lastActivity: hoursAgo(1),
  },
  {
    id: 'lead_faucet',
    name: 'Lead Faucet Pack',
    enabled: true,
    agentCount: 6,
    activeRuns: 8,
    lastActivity: minutesAgo(3),
  },
  {
    id: 'legal',
    name: 'Legal Pack',
    enabled: true,
    agentCount: 3,
    activeRuns: 0,
    lastActivity: hoursAgo(2),
  },
  {
    id: 'devops',
    name: 'DevOps Pack',
    enabled: false,
    agentCount: 7,
    activeRuns: 0,
    lastActivity: hoursAgo(5),
  },
  {
    id: 'research',
    name: 'Research Pack',
    enabled: true,
    agentCount: 4,
    activeRuns: 2,
    lastActivity: minutesAgo(15),
  },
  {
    id: 'product',
    name: 'Product Pack',
    enabled: true,
    agentCount: 5,
    activeRuns: 4,
    lastActivity: minutesAgo(8),
  },
];

export const mockAuditEvents: AuditEvent[] = [
  {
    id: 'evt-001',
    timestamp: minutesAgo(2),
    level: 'info',
    pack: 'marketing',
    agent: 'content-writer',
    eventType: 'task.started',
    runId: 'run-abc123def456',
    message: 'Started content generation task for blog post',
    metadata: { taskId: 'task-001', priority: 'normal' },
  },
  {
    id: 'evt-002',
    timestamp: minutesAgo(5),
    level: 'info',
    pack: 'engineering',
    agent: 'code-reviewer',
    eventType: 'artifact.created',
    runId: 'run-xyz789abc123',
    message: 'Code review completed, artifact saved',
    metadata: { prNumber: 1234, filesReviewed: 12 },
  },
  {
    id: 'evt-003',
    timestamp: minutesAgo(10),
    level: 'warn',
    pack: 'lead_faucet',
    agent: 'email-sender',
    eventType: 'rate_limit.approaching',
    runId: 'run-email456789',
    message: 'Approaching email rate limit (80% of quota)',
    metadata: { currentUsage: 800, limit: 1000 },
  },
  {
    id: 'evt-004',
    timestamp: minutesAgo(15),
    level: 'error',
    pack: 'finance',
    agent: 'invoice-processor',
    eventType: 'validation.failed',
    runId: 'run-fin987654321',
    message: 'Invoice validation failed: missing required fields',
    metadata: { invoiceId: 'INV-2024-0891', missingFields: ['vendorId', 'taxRate'] },
  },
  {
    id: 'evt-005',
    timestamp: minutesAgo(20),
    level: 'info',
    pack: 'engineering',
    agent: 'deploy-agent',
    eventType: 'approval.requested',
    runId: 'run-deploy123456',
    message: 'Deployment approval requested for production',
    metadata: { service: 'api-gateway', version: '2.3.1' },
  },
  {
    id: 'evt-006',
    timestamp: minutesAgo(25),
    level: 'info',
    pack: 'research',
    agent: 'data-analyst',
    eventType: 'task.completed',
    runId: 'run-research789',
    message: 'Market analysis report generated successfully',
    metadata: { reportId: 'RPT-2024-12-28', pageCount: 24 },
  },
  {
    id: 'evt-007',
    timestamp: minutesAgo(30),
    level: 'warn',
    pack: 'devops',
    agent: 'monitoring-agent',
    eventType: 'threshold.exceeded',
    runId: 'run-monitor456',
    message: 'CPU usage exceeded 85% on prod-east cluster',
    metadata: { cluster: 'prod-east', cpuUsage: 87.5, threshold: 85 },
  },
  {
    id: 'evt-008',
    timestamp: hoursAgo(1),
    level: 'error',
    pack: 'marketing',
    agent: 'social-poster',
    eventType: 'api.error',
    runId: 'run-social789123',
    message: 'Failed to post to social media: API rate limited',
    metadata: { platform: 'twitter', retryAfter: 3600 },
  },
  {
    id: 'evt-009',
    timestamp: hoursAgo(2),
    level: 'info',
    pack: 'legal',
    agent: 'contract-reviewer',
    eventType: 'pii.redacted',
    runId: 'run-legal456789',
    message: 'PII redacted from contract analysis: [REDACTED: email], [REDACTED: phone]',
    metadata: { contractId: 'CON-2024-0456', redactedCount: 3 },
  },
  {
    id: 'evt-010',
    timestamp: hoursAgo(3),
    level: 'info',
    pack: 'product',
    agent: 'feedback-analyzer',
    eventType: 'batch.completed',
    runId: 'run-product123456',
    message: 'Processed 150 customer feedback items',
    metadata: { positive: 98, negative: 32, neutral: 20 },
  },
  {
    id: 'evt-011',
    timestamp: hoursAgo(4),
    level: 'warn',
    pack: 'finance',
    agent: 'expense-tracker',
    eventType: 'anomaly.detected',
    runId: 'run-expense789',
    message: 'Unusual expense pattern detected for department',
    metadata: { department: 'Engineering', variance: 45.2 },
  },
  {
    id: 'evt-012',
    timestamp: hoursAgo(6),
    level: 'info',
    pack: 'engineering',
    agent: 'test-runner',
    eventType: 'tests.passed',
    runId: 'run-test456789',
    message: 'All 342 tests passed successfully',
    metadata: { duration: 125.4, coverage: 87.3 },
  },
];
