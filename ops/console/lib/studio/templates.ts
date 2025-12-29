/**
 * AgentOS Studio - Template Definitions
 * Pre-built agent templates for quick creation
 */

import type { AgentPack, RiskLevel } from '@/types';

// ============================================
// Template Types
// ============================================

export type TemplateCategory =
  | 'automation'
  | 'development'
  | 'operations'
  | 'research'
  | 'communication'
  | 'analytics';

export type AuthorityLevel = 'read_only' | 'suggest' | 'execute' | 'autonomous';

export type Zone = 'green' | 'yellow' | 'red';

export interface TemplateTool {
  id: string;
  name: string;
  description: string;
  riskLevel: RiskLevel;
  requiresApproval: boolean;
}

export interface TemplateCapability {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  tools: string[];
}

export interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  shortDescription: string;
  category: TemplateCategory;
  pack: AgentPack;
  icon: string;
  color: string;
  authorityLevel: AuthorityLevel;
  zones: Zone[];
  capabilities: TemplateCapability[];
  tools: TemplateTool[];
  defaultConfiguration: TemplateConfiguration;
  tags: string[];
  popularity: number;
  isOfficial: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateConfiguration {
  model: string;
  temperature: number;
  maxTokens: number;
  autoApproveThreshold: number;
  rateLimitPerMinute: number;
  rateLimitPerHour: number;
  retryMaxAttempts: number;
  retryInitialDelayMs: number;
}

export interface WizardFormData {
  // Step 1: Basic Info
  name: string;
  description: string;
  role: string;

  // Step 2: Pack Selection
  pack: AgentPack | null;
  templateId: string | null;

  // Step 3: Capabilities
  authorityLevel: AuthorityLevel;
  zones: Zone[];
  enabledTools: string[];
  enabledCapabilities: string[];

  // Step 4: Configuration
  model: string;
  temperature: number;
  maxTokens: number;
  autoApproveThreshold: number;
}

// ============================================
// Default Configuration
// ============================================

export const DEFAULT_CONFIGURATION: TemplateConfiguration = {
  model: 'claude-opus-4-5-20251101',
  temperature: 0.7,
  maxTokens: 4096,
  autoApproveThreshold: 0.8,
  rateLimitPerMinute: 10,
  rateLimitPerHour: 100,
  retryMaxAttempts: 3,
  retryInitialDelayMs: 1000,
};

// ============================================
// Available Tools
// ============================================

export const AVAILABLE_TOOLS: TemplateTool[] = [
  {
    id: 'file_read',
    name: 'File Read',
    description: 'Read files from the filesystem',
    riskLevel: 'low',
    requiresApproval: false,
  },
  {
    id: 'file_write',
    name: 'File Write',
    description: 'Write files to the filesystem',
    riskLevel: 'medium',
    requiresApproval: true,
  },
  {
    id: 'file_delete',
    name: 'File Delete',
    description: 'Delete files from the filesystem',
    riskLevel: 'high',
    requiresApproval: true,
  },
  {
    id: 'shell_execute',
    name: 'Shell Execute',
    description: 'Execute shell commands',
    riskLevel: 'critical',
    requiresApproval: true,
  },
  {
    id: 'git_operations',
    name: 'Git Operations',
    description: 'Perform git operations (commit, push, pull)',
    riskLevel: 'medium',
    requiresApproval: true,
  },
  {
    id: 'api_call',
    name: 'API Call',
    description: 'Make HTTP API calls',
    riskLevel: 'medium',
    requiresApproval: false,
  },
  {
    id: 'database_read',
    name: 'Database Read',
    description: 'Query databases',
    riskLevel: 'low',
    requiresApproval: false,
  },
  {
    id: 'database_write',
    name: 'Database Write',
    description: 'Write to databases',
    riskLevel: 'high',
    requiresApproval: true,
  },
  {
    id: 'web_search',
    name: 'Web Search',
    description: 'Search the web for information',
    riskLevel: 'low',
    requiresApproval: false,
  },
  {
    id: 'email_send',
    name: 'Email Send',
    description: 'Send emails',
    riskLevel: 'medium',
    requiresApproval: true,
  },
  {
    id: 'slack_message',
    name: 'Slack Message',
    description: 'Send Slack messages',
    riskLevel: 'low',
    requiresApproval: false,
  },
  {
    id: 'deployment',
    name: 'Deployment',
    description: 'Deploy applications',
    riskLevel: 'critical',
    requiresApproval: true,
  },
  {
    id: 'code_analysis',
    name: 'Code Analysis',
    description: 'Analyze code for issues',
    riskLevel: 'low',
    requiresApproval: false,
  },
  {
    id: 'test_execution',
    name: 'Test Execution',
    description: 'Run test suites',
    riskLevel: 'low',
    requiresApproval: false,
  },
  {
    id: 'document_generation',
    name: 'Document Generation',
    description: 'Generate documentation',
    riskLevel: 'low',
    requiresApproval: false,
  },
];

// ============================================
// Pre-built Templates
// ============================================

export const AGENT_TEMPLATES: AgentTemplate[] = [
  // DevOps Agent
  {
    id: 'devops-agent',
    name: 'DevOps Agent',
    description: 'Automates CI/CD pipelines, monitors infrastructure, and manages deployments. Handles infrastructure as code, container orchestration, and automated testing pipelines.',
    shortDescription: 'Automate deployments and infrastructure',
    category: 'operations',
    pack: 'devops',
    icon: 'Server',
    color: '#3b82f6',
    authorityLevel: 'execute',
    zones: ['green', 'yellow'],
    capabilities: [
      {
        id: 'cicd',
        name: 'CI/CD Management',
        description: 'Manage continuous integration and deployment',
        enabled: true,
        tools: ['git_operations', 'shell_execute', 'deployment'],
      },
      {
        id: 'monitoring',
        name: 'Infrastructure Monitoring',
        description: 'Monitor and alert on infrastructure health',
        enabled: true,
        tools: ['api_call', 'slack_message'],
      },
    ],
    tools: AVAILABLE_TOOLS.filter((t) =>
      ['git_operations', 'shell_execute', 'deployment', 'api_call', 'file_read', 'file_write'].includes(t.id)
    ),
    defaultConfiguration: {
      ...DEFAULT_CONFIGURATION,
      autoApproveThreshold: 0.6,
    },
    tags: ['devops', 'automation', 'deployment', 'infrastructure'],
    popularity: 95,
    isOfficial: true,
    createdAt: '2024-01-15T00:00:00Z',
    updatedAt: '2024-12-20T00:00:00Z',
  },

  // QA Agent
  {
    id: 'qa-agent',
    name: 'QA Agent',
    description: 'Automates testing workflows, generates test cases, and validates code quality. Integrates with testing frameworks and provides comprehensive test coverage analysis.',
    shortDescription: 'Automate testing and quality assurance',
    category: 'development',
    pack: 'qa',
    icon: 'TestTube',
    color: '#10b981',
    authorityLevel: 'execute',
    zones: ['green'],
    capabilities: [
      {
        id: 'test_generation',
        name: 'Test Generation',
        description: 'Generate test cases from requirements',
        enabled: true,
        tools: ['file_read', 'file_write', 'code_analysis'],
      },
      {
        id: 'test_execution',
        name: 'Test Execution',
        description: 'Run and monitor test suites',
        enabled: true,
        tools: ['test_execution', 'shell_execute'],
      },
    ],
    tools: AVAILABLE_TOOLS.filter((t) =>
      ['file_read', 'file_write', 'code_analysis', 'test_execution', 'shell_execute'].includes(t.id)
    ),
    defaultConfiguration: {
      ...DEFAULT_CONFIGURATION,
      autoApproveThreshold: 0.9,
    },
    tags: ['testing', 'quality', 'automation', 'ci'],
    popularity: 88,
    isOfficial: true,
    createdAt: '2024-02-01T00:00:00Z',
    updatedAt: '2024-12-18T00:00:00Z',
  },

  // Research Agent
  {
    id: 'research-agent',
    name: 'Research Agent',
    description: 'Gathers, analyzes, and synthesizes information from multiple sources. Creates comprehensive research reports and maintains knowledge bases.',
    shortDescription: 'Research and information synthesis',
    category: 'research',
    pack: 'research',
    icon: 'Search',
    color: '#8b5cf6',
    authorityLevel: 'suggest',
    zones: ['green'],
    capabilities: [
      {
        id: 'web_research',
        name: 'Web Research',
        description: 'Search and analyze web content',
        enabled: true,
        tools: ['web_search', 'api_call'],
      },
      {
        id: 'report_generation',
        name: 'Report Generation',
        description: 'Create comprehensive research reports',
        enabled: true,
        tools: ['document_generation', 'file_write'],
      },
    ],
    tools: AVAILABLE_TOOLS.filter((t) =>
      ['web_search', 'api_call', 'document_generation', 'file_read', 'file_write'].includes(t.id)
    ),
    defaultConfiguration: {
      ...DEFAULT_CONFIGURATION,
      temperature: 0.5,
      maxTokens: 8192,
    },
    tags: ['research', 'analysis', 'documentation', 'knowledge'],
    popularity: 82,
    isOfficial: true,
    createdAt: '2024-01-20T00:00:00Z',
    updatedAt: '2024-12-15T00:00:00Z',
  },

  // Customer Support Agent
  {
    id: 'support-agent',
    name: 'Customer Support Agent',
    description: 'Handles customer inquiries, creates support tickets, and provides automated responses. Integrates with help desk systems and knowledge bases.',
    shortDescription: 'Automate customer support workflows',
    category: 'communication',
    pack: 'product',
    icon: 'Headphones',
    color: '#f59e0b',
    authorityLevel: 'execute',
    zones: ['green'],
    capabilities: [
      {
        id: 'ticket_management',
        name: 'Ticket Management',
        description: 'Create and manage support tickets',
        enabled: true,
        tools: ['api_call', 'database_read', 'database_write'],
      },
      {
        id: 'auto_response',
        name: 'Automated Responses',
        description: 'Send automated support responses',
        enabled: true,
        tools: ['email_send', 'slack_message'],
      },
    ],
    tools: AVAILABLE_TOOLS.filter((t) =>
      ['api_call', 'database_read', 'email_send', 'slack_message'].includes(t.id)
    ),
    defaultConfiguration: {
      ...DEFAULT_CONFIGURATION,
      temperature: 0.3,
    },
    tags: ['support', 'customer', 'automation', 'helpdesk'],
    popularity: 76,
    isOfficial: true,
    createdAt: '2024-03-01T00:00:00Z',
    updatedAt: '2024-12-10T00:00:00Z',
  },

  // Analytics Agent
  {
    id: 'analytics-agent',
    name: 'Analytics Agent',
    description: 'Analyzes data patterns, generates insights, and creates visualizations. Monitors KPIs and provides automated reporting.',
    shortDescription: 'Data analysis and insights',
    category: 'analytics',
    pack: 'analytics',
    icon: 'BarChart3',
    color: '#ec4899',
    authorityLevel: 'suggest',
    zones: ['green'],
    capabilities: [
      {
        id: 'data_analysis',
        name: 'Data Analysis',
        description: 'Analyze data and generate insights',
        enabled: true,
        tools: ['database_read', 'api_call'],
      },
      {
        id: 'reporting',
        name: 'Automated Reporting',
        description: 'Generate and distribute reports',
        enabled: true,
        tools: ['document_generation', 'email_send'],
      },
    ],
    tools: AVAILABLE_TOOLS.filter((t) =>
      ['database_read', 'api_call', 'document_generation', 'email_send', 'slack_message'].includes(t.id)
    ),
    defaultConfiguration: {
      ...DEFAULT_CONFIGURATION,
      temperature: 0.4,
      maxTokens: 8192,
    },
    tags: ['analytics', 'data', 'reporting', 'insights'],
    popularity: 79,
    isOfficial: true,
    createdAt: '2024-02-15T00:00:00Z',
    updatedAt: '2024-12-12T00:00:00Z',
  },

  // Engineering Agent
  {
    id: 'engineering-agent',
    name: 'Engineering Agent',
    description: 'Assists with code reviews, generates boilerplate code, and provides architectural suggestions. Integrates with development workflows.',
    shortDescription: 'Code assistance and reviews',
    category: 'development',
    pack: 'engineering',
    icon: 'Code2',
    color: '#06b6d4',
    authorityLevel: 'execute',
    zones: ['green', 'yellow'],
    capabilities: [
      {
        id: 'code_review',
        name: 'Code Review',
        description: 'Review code and suggest improvements',
        enabled: true,
        tools: ['file_read', 'code_analysis', 'git_operations'],
      },
      {
        id: 'code_generation',
        name: 'Code Generation',
        description: 'Generate code from specifications',
        enabled: true,
        tools: ['file_write', 'file_read'],
      },
    ],
    tools: AVAILABLE_TOOLS.filter((t) =>
      ['file_read', 'file_write', 'code_analysis', 'git_operations', 'test_execution'].includes(t.id)
    ),
    defaultConfiguration: {
      ...DEFAULT_CONFIGURATION,
      temperature: 0.6,
    },
    tags: ['engineering', 'code', 'development', 'review'],
    popularity: 91,
    isOfficial: true,
    createdAt: '2024-01-10T00:00:00Z',
    updatedAt: '2024-12-22T00:00:00Z',
  },

  // Legal Agent
  {
    id: 'legal-agent',
    name: 'Legal Agent',
    description: 'Analyzes contracts, ensures compliance, and manages legal document workflows. Provides risk assessments and policy recommendations.',
    shortDescription: 'Contract and compliance analysis',
    category: 'research',
    pack: 'legal',
    icon: 'Scale',
    color: '#64748b',
    authorityLevel: 'suggest',
    zones: ['green'],
    capabilities: [
      {
        id: 'contract_analysis',
        name: 'Contract Analysis',
        description: 'Analyze and review contracts',
        enabled: true,
        tools: ['file_read', 'document_generation'],
      },
      {
        id: 'compliance_check',
        name: 'Compliance Monitoring',
        description: 'Monitor regulatory compliance',
        enabled: true,
        tools: ['database_read', 'api_call'],
      },
    ],
    tools: AVAILABLE_TOOLS.filter((t) =>
      ['file_read', 'document_generation', 'database_read', 'api_call'].includes(t.id)
    ),
    defaultConfiguration: {
      ...DEFAULT_CONFIGURATION,
      temperature: 0.2,
      maxTokens: 8192,
    },
    tags: ['legal', 'compliance', 'contracts', 'risk'],
    popularity: 65,
    isOfficial: true,
    createdAt: '2024-03-15T00:00:00Z',
    updatedAt: '2024-12-05T00:00:00Z',
  },

  // Marketing Agent
  {
    id: 'marketing-agent',
    name: 'Marketing Agent',
    description: 'Creates content, manages campaigns, and analyzes marketing performance. Automates social media and email marketing workflows.',
    shortDescription: 'Content creation and campaigns',
    category: 'communication',
    pack: 'marketing',
    icon: 'Megaphone',
    color: '#f97316',
    authorityLevel: 'execute',
    zones: ['green'],
    capabilities: [
      {
        id: 'content_creation',
        name: 'Content Creation',
        description: 'Create marketing content',
        enabled: true,
        tools: ['document_generation', 'file_write'],
      },
      {
        id: 'campaign_management',
        name: 'Campaign Management',
        description: 'Manage marketing campaigns',
        enabled: true,
        tools: ['api_call', 'email_send', 'slack_message'],
      },
    ],
    tools: AVAILABLE_TOOLS.filter((t) =>
      ['document_generation', 'file_write', 'api_call', 'email_send', 'web_search'].includes(t.id)
    ),
    defaultConfiguration: {
      ...DEFAULT_CONFIGURATION,
      temperature: 0.8,
    },
    tags: ['marketing', 'content', 'campaigns', 'social'],
    popularity: 73,
    isOfficial: true,
    createdAt: '2024-02-20T00:00:00Z',
    updatedAt: '2024-12-08T00:00:00Z',
  },

  // Planning Agent
  {
    id: 'planning-agent',
    name: 'Planning Agent',
    description: 'Assists with project planning, sprint management, and roadmap creation. Integrates with project management tools and tracks milestones.',
    shortDescription: 'Project planning and sprint management',
    category: 'automation',
    pack: 'planning',
    icon: 'Calendar',
    color: '#14b8a6',
    authorityLevel: 'suggest',
    zones: ['green'],
    capabilities: [
      {
        id: 'sprint_planning',
        name: 'Sprint Planning',
        description: 'Create and manage sprint plans',
        enabled: true,
        tools: ['api_call', 'database_read', 'database_write'],
      },
      {
        id: 'roadmap_generation',
        name: 'Roadmap Generation',
        description: 'Generate and maintain product roadmaps',
        enabled: true,
        tools: ['document_generation', 'file_write'],
      },
    ],
    tools: AVAILABLE_TOOLS.filter((t) =>
      ['api_call', 'database_read', 'document_generation', 'file_read', 'file_write', 'slack_message'].includes(t.id)
    ),
    defaultConfiguration: {
      ...DEFAULT_CONFIGURATION,
      temperature: 0.5,
    },
    tags: ['planning', 'project', 'sprint', 'roadmap', 'agile'],
    popularity: 71,
    isOfficial: true,
    createdAt: '2024-03-10T00:00:00Z',
    updatedAt: '2024-12-14T00:00:00Z',
  },

  // Orchestration Agent
  {
    id: 'orchestration-agent',
    name: 'Orchestration Agent',
    description: 'Coordinates multi-agent workflows, manages task distribution, and handles inter-agent communication. Acts as the central coordinator for complex operations.',
    shortDescription: 'Multi-agent workflow coordination',
    category: 'automation',
    pack: 'orchestration',
    icon: 'GitBranch',
    color: '#6366f1',
    authorityLevel: 'execute',
    zones: ['green', 'yellow'],
    capabilities: [
      {
        id: 'workflow_coordination',
        name: 'Workflow Coordination',
        description: 'Coordinate tasks across multiple agents',
        enabled: true,
        tools: ['api_call', 'database_read', 'database_write'],
      },
      {
        id: 'task_distribution',
        name: 'Task Distribution',
        description: 'Distribute and balance workloads',
        enabled: true,
        tools: ['api_call', 'slack_message'],
      },
    ],
    tools: AVAILABLE_TOOLS.filter((t) =>
      ['api_call', 'database_read', 'database_write', 'slack_message', 'email_send'].includes(t.id)
    ),
    defaultConfiguration: {
      ...DEFAULT_CONFIGURATION,
      temperature: 0.4,
      autoApproveThreshold: 0.7,
    },
    tags: ['orchestration', 'workflow', 'coordination', 'multi-agent'],
    popularity: 68,
    isOfficial: true,
    createdAt: '2024-04-01T00:00:00Z',
    updatedAt: '2024-12-16T00:00:00Z',
  },

  // Error Predictor Agent
  {
    id: 'error-predictor-agent',
    name: 'Error Predictor Agent',
    description: 'Analyzes code patterns and historical data to predict potential bugs and errors before they occur. Provides proactive recommendations for code improvements.',
    shortDescription: 'Proactive bug prediction and prevention',
    category: 'development',
    pack: 'error_predictor',
    icon: 'AlertTriangle',
    color: '#ef4444',
    authorityLevel: 'suggest',
    zones: ['green'],
    capabilities: [
      {
        id: 'pattern_analysis',
        name: 'Pattern Analysis',
        description: 'Analyze code patterns for potential issues',
        enabled: true,
        tools: ['file_read', 'code_analysis'],
      },
      {
        id: 'risk_assessment',
        name: 'Risk Assessment',
        description: 'Assess risk levels of code changes',
        enabled: true,
        tools: ['code_analysis', 'database_read'],
      },
    ],
    tools: AVAILABLE_TOOLS.filter((t) =>
      ['file_read', 'code_analysis', 'database_read', 'document_generation'].includes(t.id)
    ),
    defaultConfiguration: {
      ...DEFAULT_CONFIGURATION,
      temperature: 0.3,
      maxTokens: 8192,
    },
    tags: ['prediction', 'bugs', 'quality', 'proactive', 'analysis'],
    popularity: 64,
    isOfficial: true,
    createdAt: '2024-05-01T00:00:00Z',
    updatedAt: '2024-12-18T00:00:00Z',
  },

  // Mobile Agent
  {
    id: 'mobile-agent',
    name: 'Mobile Agent',
    description: 'Specialized in mobile development workflows including iOS and Android. Manages app builds, testing, and app store deployments.',
    shortDescription: 'iOS and Android development automation',
    category: 'development',
    pack: 'mobile',
    icon: 'Smartphone',
    color: '#a855f7',
    authorityLevel: 'execute',
    zones: ['green', 'yellow'],
    capabilities: [
      {
        id: 'app_build',
        name: 'App Build Management',
        description: 'Build and sign mobile applications',
        enabled: true,
        tools: ['shell_execute', 'file_read', 'file_write'],
      },
      {
        id: 'store_deployment',
        name: 'Store Deployment',
        description: 'Deploy to App Store and Play Store',
        enabled: true,
        tools: ['api_call', 'deployment'],
      },
    ],
    tools: AVAILABLE_TOOLS.filter((t) =>
      ['shell_execute', 'file_read', 'file_write', 'api_call', 'deployment', 'test_execution'].includes(t.id)
    ),
    defaultConfiguration: {
      ...DEFAULT_CONFIGURATION,
      autoApproveThreshold: 0.6,
    },
    tags: ['mobile', 'ios', 'android', 'app', 'deployment'],
    popularity: 70,
    isOfficial: true,
    createdAt: '2024-02-28T00:00:00Z',
    updatedAt: '2024-12-20T00:00:00Z',
  },

  // Design Agent
  {
    id: 'design-agent',
    name: 'Design Agent',
    description: 'Assists with UI/UX design tasks, generates design specifications, and reviews design implementations. Integrates with design tools like Figma.',
    shortDescription: 'UI/UX design assistance and review',
    category: 'research',
    pack: 'design',
    icon: 'Palette',
    color: '#f472b6',
    authorityLevel: 'suggest',
    zones: ['green'],
    capabilities: [
      {
        id: 'design_review',
        name: 'Design Review',
        description: 'Review designs for consistency and accessibility',
        enabled: true,
        tools: ['api_call', 'file_read'],
      },
      {
        id: 'spec_generation',
        name: 'Specification Generation',
        description: 'Generate design specifications and documentation',
        enabled: true,
        tools: ['document_generation', 'file_write'],
      },
    ],
    tools: AVAILABLE_TOOLS.filter((t) =>
      ['api_call', 'file_read', 'file_write', 'document_generation', 'web_search'].includes(t.id)
    ),
    defaultConfiguration: {
      ...DEFAULT_CONFIGURATION,
      temperature: 0.6,
    },
    tags: ['design', 'ui', 'ux', 'figma', 'accessibility'],
    popularity: 62,
    isOfficial: true,
    createdAt: '2024-04-15T00:00:00Z',
    updatedAt: '2024-12-10T00:00:00Z',
  },

  // Supabase Agent
  {
    id: 'supabase-agent',
    name: 'Supabase Agent',
    description: 'Specialized agent for Supabase operations including database management, Edge Functions, and authentication setup. Integrates with Supabase MCP.',
    shortDescription: 'Supabase database and backend management',
    category: 'operations',
    pack: 'supabase',
    icon: 'Database',
    color: '#22c55e',
    authorityLevel: 'execute',
    zones: ['green', 'yellow'],
    capabilities: [
      {
        id: 'database_management',
        name: 'Database Management',
        description: 'Manage Supabase databases and migrations',
        enabled: true,
        tools: ['database_read', 'database_write', 'api_call'],
      },
      {
        id: 'edge_functions',
        name: 'Edge Functions',
        description: 'Deploy and manage Edge Functions',
        enabled: true,
        tools: ['file_write', 'deployment', 'api_call'],
      },
    ],
    tools: AVAILABLE_TOOLS.filter((t) =>
      ['database_read', 'database_write', 'api_call', 'file_read', 'file_write', 'deployment'].includes(t.id)
    ),
    defaultConfiguration: {
      ...DEFAULT_CONFIGURATION,
      autoApproveThreshold: 0.7,
    },
    tags: ['supabase', 'database', 'postgres', 'edge-functions', 'backend'],
    popularity: 77,
    isOfficial: true,
    createdAt: '2024-03-20T00:00:00Z',
    updatedAt: '2024-12-22T00:00:00Z',
  },
];

// ============================================
// Template Utility Functions
// ============================================

export function getTemplateById(id: string): AgentTemplate | undefined {
  return AGENT_TEMPLATES.find((t) => t.id === id);
}

export function getTemplatesByCategory(category: TemplateCategory): AgentTemplate[] {
  return AGENT_TEMPLATES.filter((t) => t.category === category);
}

export function getTemplatesByPack(pack: AgentPack): AgentTemplate[] {
  return AGENT_TEMPLATES.filter((t) => t.pack === pack);
}

export function getOfficialTemplates(): AgentTemplate[] {
  return AGENT_TEMPLATES.filter((t) => t.isOfficial);
}

export function getPopularTemplates(limit: number = 5): AgentTemplate[] {
  return [...AGENT_TEMPLATES].sort((a, b) => b.popularity - a.popularity).slice(0, limit);
}

export function searchTemplates(query: string): AgentTemplate[] {
  const lowerQuery = query.toLowerCase();
  return AGENT_TEMPLATES.filter(
    (t) =>
      t.name.toLowerCase().includes(lowerQuery) ||
      t.description.toLowerCase().includes(lowerQuery) ||
      t.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
  );
}

export function getToolById(id: string): TemplateTool | undefined {
  return AVAILABLE_TOOLS.find((t) => t.id === id);
}

export function getToolsByRiskLevel(riskLevel: RiskLevel): TemplateTool[] {
  return AVAILABLE_TOOLS.filter((t) => t.riskLevel === riskLevel);
}

export function createEmptyFormData(): WizardFormData {
  return {
    name: '',
    description: '',
    role: '',
    pack: null,
    templateId: null,
    authorityLevel: 'suggest',
    zones: ['green'],
    enabledTools: [],
    enabledCapabilities: [],
    model: DEFAULT_CONFIGURATION.model,
    temperature: DEFAULT_CONFIGURATION.temperature,
    maxTokens: DEFAULT_CONFIGURATION.maxTokens,
    autoApproveThreshold: DEFAULT_CONFIGURATION.autoApproveThreshold,
  };
}

export function createFormDataFromTemplate(template: AgentTemplate): WizardFormData {
  return {
    name: '',
    description: template.description,
    role: template.shortDescription,
    pack: template.pack,
    templateId: template.id,
    authorityLevel: template.authorityLevel,
    zones: template.zones,
    enabledTools: template.tools.map((t) => t.id),
    enabledCapabilities: template.capabilities.filter((c) => c.enabled).map((c) => c.id),
    model: template.defaultConfiguration.model,
    temperature: template.defaultConfiguration.temperature,
    maxTokens: template.defaultConfiguration.maxTokens,
    autoApproveThreshold: template.defaultConfiguration.autoApproveThreshold,
  };
}

// ============================================
// Category Information
// ============================================

export const CATEGORY_INFO: Record<TemplateCategory, { label: string; description: string; icon: string }> = {
  automation: {
    label: 'Automation',
    description: 'Automate repetitive tasks and workflows',
    icon: 'Zap',
  },
  development: {
    label: 'Development',
    description: 'Assist with coding and development tasks',
    icon: 'Code',
  },
  operations: {
    label: 'Operations',
    description: 'Manage infrastructure and deployments',
    icon: 'Server',
  },
  research: {
    label: 'Research',
    description: 'Gather and analyze information',
    icon: 'Search',
  },
  communication: {
    label: 'Communication',
    description: 'Handle messaging and outreach',
    icon: 'MessageSquare',
  },
  analytics: {
    label: 'Analytics',
    description: 'Analyze data and generate insights',
    icon: 'BarChart',
  },
};

export const AUTHORITY_LEVELS: Record<AuthorityLevel, { label: string; description: string; color: string }> = {
  read_only: {
    label: 'Read Only',
    description: 'Can only read information, cannot make changes',
    color: 'text-slate-600 bg-slate-100',
  },
  suggest: {
    label: 'Suggest',
    description: 'Can suggest changes but requires approval',
    color: 'text-blue-600 bg-blue-100',
  },
  execute: {
    label: 'Execute',
    description: 'Can execute approved actions automatically',
    color: 'text-amber-600 bg-amber-100',
  },
  autonomous: {
    label: 'Autonomous',
    description: 'Full autonomy within defined boundaries',
    color: 'text-red-600 bg-red-100',
  },
};

export const ZONE_INFO: Record<Zone, { label: string; description: string; color: string; bgColor: string }> = {
  green: {
    label: 'Green Zone',
    description: 'Full autonomy - Features, docs, non-critical code',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-100',
  },
  yellow: {
    label: 'Yellow Zone',
    description: 'Needs review - APIs, core services, tests required',
    color: 'text-amber-700',
    bgColor: 'bg-amber-100',
  },
  red: {
    label: 'Red Zone',
    description: 'No edits without approval - Legal, billing, evidence',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
  },
};
