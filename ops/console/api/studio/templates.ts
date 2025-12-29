/**
 * AgentOS Studio - Template API Client
 * CRUD operations for agent templates and starter configurations
 */

import type {
  Template,
  TemplateSummary,
  TemplateCategory,
  TemplateDifficulty,
  StudioApiResponse,
  PaginationOptions,
  FilterOptions,
  UUID,
  Timestamp,
} from '@/types/studio';
import { studioStorage } from '@/lib/studio/storage';

// ============================================
// Default Template YAMLs
// ============================================

const STARTER_TEMPLATE_YAML = `name: Starter Agent
slug: starter-agent
description: A simple starter agent template
version: 1.0.0

model:
  provider: anthropic
  name: claude-3-5-sonnet-20241022
  temperature: 0.7
  max_tokens: 4096

system_prompt: |
  You are a helpful AI assistant.
  Follow user instructions carefully and provide accurate responses.
  Be concise but thorough in your explanations.

tools: []

capabilities:
  - name: general_assistance
    description: Provide general assistance and answer questions
    enabled: true
    requires_approval: false
    risk_level: low
    allowed_actions:
      - respond
      - explain

triggers:
  - type: manual
    name: default
    enabled: true
    config: {}

outputs:
  - name: response
    type: text
    format: markdown

error_handling:
  on_error: retry
  max_retries: 3
  notify_on_failure: true
  log_level: info

rate_limiting:
  requests_per_minute: 60
  requests_per_hour: 1000
  requests_per_day: 10000
  tokens_per_minute: 100000
  tokens_per_day: 1000000
  concurrent_executions: 5

approval:
  enabled: false
  auto_approve_threshold: low
  require_approval_for: []
  timeout_minutes: 60
  escalation_path: []
  notify_channels: []

metadata:
  author: AgentOS Team
  tags:
    - starter
    - beginner
`;

const CODE_REVIEW_TEMPLATE_YAML = `name: Code Review Agent
slug: code-review-agent
description: Automated code review agent for pull requests
version: 1.0.0

model:
  provider: anthropic
  name: claude-3-5-sonnet-20241022
  temperature: 0.3
  max_tokens: 8192

system_prompt: |
  You are an expert code reviewer. Your role is to analyze code changes for:

  1. Code Quality
     - Clean code principles
     - DRY (Don't Repeat Yourself)
     - SOLID principles
     - Proper naming conventions

  2. Potential Bugs
     - Logic errors
     - Edge cases
     - Null pointer issues
     - Race conditions

  3. Security Issues
     - Input validation
     - SQL injection
     - XSS vulnerabilities
     - Authentication/authorization issues

  4. Performance
     - Algorithm efficiency
     - Memory leaks
     - Database query optimization
     - Caching opportunities

  5. Documentation
     - Code comments
     - API documentation
     - README updates

  Provide constructive feedback with specific line references and suggestions.

tools:
  - name: github_api
    type: mcp
    description: Access GitHub API for PR data
    enabled: true
    requires_approval: false
    risk_level: low
    parameters:
      - name: endpoint
        type: string
        description: GitHub API endpoint
        required: true

capabilities:
  - name: code_analysis
    description: Analyze code for issues and improvements
    enabled: true
    requires_approval: false
    risk_level: low
    allowed_actions:
      - read_code
      - analyze
      - suggest
  - name: pr_comments
    description: Post review comments on pull requests
    enabled: true
    requires_approval: true
    risk_level: medium
    allowed_actions:
      - comment
      - request_changes
      - approve

triggers:
  - type: webhook
    name: github_pr_opened
    enabled: true
    config:
      event: pull_request.opened
  - type: webhook
    name: github_pr_synchronized
    enabled: true
    config:
      event: pull_request.synchronize
  - type: manual
    name: manual_review
    enabled: true
    config: {}

outputs:
  - name: review_summary
    type: text
    format: markdown
  - name: review_comments
    type: json
    format: github_review

error_handling:
  on_error: retry
  max_retries: 3
  notify_on_failure: true
  log_level: info

rate_limiting:
  requests_per_minute: 30
  requests_per_hour: 500
  requests_per_day: 5000
  tokens_per_minute: 100000
  tokens_per_day: 1000000
  concurrent_executions: 3

approval:
  enabled: true
  auto_approve_threshold: low
  require_approval_for:
    - medium
    - high
    - critical
  timeout_minutes: 60
  escalation_path: []
  notify_channels:
    - slack_engineering

metadata:
  author: Engineering Team
  tags:
    - code-review
    - github
    - automation
    - engineering
`;

const DATA_ANALYSIS_TEMPLATE_YAML = `name: Data Analysis Agent
slug: data-analysis-agent
description: Automated data analysis and insights generation
version: 1.0.0

model:
  provider: anthropic
  name: claude-3-5-sonnet-20241022
  temperature: 0.5
  max_tokens: 8192

system_prompt: |
  You are a data analysis expert. Your role is to:

  1. Analyze datasets and identify patterns
  2. Generate statistical summaries
  3. Create visualizations recommendations
  4. Identify anomalies and outliers
  5. Provide actionable insights
  6. Suggest follow-up analyses

  Always explain your methodology and provide confidence levels for your findings.
  Use clear language that non-technical stakeholders can understand.

tools:
  - name: sql_query
    type: database
    description: Execute SQL queries on connected databases
    enabled: true
    requires_approval: true
    risk_level: medium
    parameters:
      - name: query
        type: string
        description: SQL query to execute
        required: true
      - name: database
        type: string
        description: Target database name
        required: true
  - name: python_analysis
    type: function
    description: Run Python analysis scripts
    enabled: true
    requires_approval: true
    risk_level: medium
    parameters:
      - name: script
        type: string
        description: Python script to execute
        required: true

capabilities:
  - name: data_querying
    description: Query and retrieve data from databases
    enabled: true
    requires_approval: true
    risk_level: medium
    allowed_actions:
      - query
      - aggregate
      - filter
  - name: statistical_analysis
    description: Perform statistical analysis
    enabled: true
    requires_approval: false
    risk_level: low
    allowed_actions:
      - calculate
      - summarize
      - correlate
  - name: report_generation
    description: Generate analysis reports
    enabled: true
    requires_approval: false
    risk_level: low
    allowed_actions:
      - format
      - export
      - visualize

triggers:
  - type: schedule
    name: daily_analysis
    enabled: true
    config:
      cron: "0 8 * * *"
      timezone: "UTC"
  - type: manual
    name: ad_hoc_analysis
    enabled: true
    config: {}

outputs:
  - name: analysis_report
    type: file
    format: markdown
    destination: /reports
  - name: insights_json
    type: json
    format: structured
  - name: summary_notification
    type: notification
    format: slack

error_handling:
  on_error: retry
  max_retries: 2
  notify_on_failure: true
  log_level: info

rate_limiting:
  requests_per_minute: 20
  requests_per_hour: 200
  requests_per_day: 1000
  tokens_per_minute: 150000
  tokens_per_day: 2000000
  concurrent_executions: 2

approval:
  enabled: true
  auto_approve_threshold: low
  require_approval_for:
    - medium
    - high
    - critical
  timeout_minutes: 120
  escalation_path:
    - data_team_lead
  notify_channels:
    - slack_analytics

metadata:
  author: Analytics Team
  tags:
    - data-analysis
    - analytics
    - automation
    - reporting
`;

const WORKFLOW_AUTOMATION_TEMPLATE_YAML = `name: Workflow Automation Agent
slug: workflow-automation-agent
description: Orchestrate multi-step workflows and integrations
version: 1.0.0

model:
  provider: anthropic
  name: claude-3-5-sonnet-20241022
  temperature: 0.4
  max_tokens: 4096

system_prompt: |
  You are a workflow automation specialist. Your role is to:

  1. Execute multi-step automated workflows
  2. Coordinate between different services and APIs
  3. Handle error recovery and retry logic
  4. Monitor workflow progress and report status
  5. Optimize workflow efficiency

  Always validate inputs before executing actions.
  Log all steps for auditability.
  Implement proper error handling at each step.

tools:
  - name: http_request
    type: api
    description: Make HTTP requests to external APIs
    enabled: true
    requires_approval: false
    risk_level: medium
    parameters:
      - name: method
        type: string
        description: HTTP method (GET, POST, PUT, DELETE)
        required: true
      - name: url
        type: string
        description: Request URL
        required: true
      - name: body
        type: object
        description: Request body
        required: false
  - name: webhook_trigger
    type: api
    description: Trigger webhooks on external services
    enabled: true
    requires_approval: true
    risk_level: medium
    parameters:
      - name: webhook_url
        type: string
        description: Webhook URL
        required: true
      - name: payload
        type: object
        description: Webhook payload
        required: true

capabilities:
  - name: api_integration
    description: Integrate with external APIs
    enabled: true
    requires_approval: false
    risk_level: medium
    allowed_actions:
      - request
      - authenticate
      - transform
  - name: workflow_orchestration
    description: Orchestrate multi-step workflows
    enabled: true
    requires_approval: false
    risk_level: low
    allowed_actions:
      - sequence
      - parallel
      - conditional
  - name: state_management
    description: Manage workflow state
    enabled: true
    requires_approval: false
    risk_level: low
    allowed_actions:
      - store
      - retrieve
      - update

triggers:
  - type: webhook
    name: external_trigger
    enabled: true
    config:
      path: /workflow/trigger
  - type: schedule
    name: scheduled_workflow
    enabled: true
    config:
      cron: "*/30 * * * *"
  - type: event
    name: event_driven
    enabled: true
    config:
      source: internal_events

outputs:
  - name: workflow_result
    type: json
    format: structured
  - name: audit_log
    type: file
    format: jsonl
    destination: /logs
  - name: status_notification
    type: notification
    format: webhook

error_handling:
  on_error: retry
  max_retries: 5
  fallback_agent: error_handler
  notify_on_failure: true
  log_level: info

rate_limiting:
  requests_per_minute: 100
  requests_per_hour: 2000
  requests_per_day: 20000
  tokens_per_minute: 50000
  tokens_per_day: 500000
  concurrent_executions: 10

approval:
  enabled: true
  auto_approve_threshold: low
  require_approval_for:
    - high
    - critical
  timeout_minutes: 30
  escalation_path: []
  notify_channels:
    - slack_ops

metadata:
  author: Platform Team
  tags:
    - workflow
    - automation
    - integration
    - orchestration
`;

const CUSTOMER_SUPPORT_TEMPLATE_YAML = `name: Customer Support Agent
slug: customer-support-agent
description: Intelligent customer support and ticket handling
version: 1.0.0

model:
  provider: anthropic
  name: claude-3-5-sonnet-20241022
  temperature: 0.6
  max_tokens: 4096

system_prompt: |
  You are a helpful and empathetic customer support agent. Your role is to:

  1. Understand customer issues with empathy
  2. Provide clear and accurate solutions
  3. Escalate complex issues appropriately
  4. Maintain a professional and friendly tone
  5. Document interactions for future reference

  Guidelines:
  - Always acknowledge the customer's concern
  - Use simple, clear language
  - Offer alternative solutions when possible
  - Know when to escalate to human agents
  - Protect customer privacy

  Never share sensitive information or make promises outside of policy.

tools:
  - name: knowledge_base
    type: api
    description: Search internal knowledge base
    enabled: true
    requires_approval: false
    risk_level: low
    parameters:
      - name: query
        type: string
        description: Search query
        required: true
  - name: ticket_system
    type: api
    description: Interact with ticket management system
    enabled: true
    requires_approval: false
    risk_level: low
    parameters:
      - name: action
        type: string
        description: Action to perform (create, update, close)
        required: true
      - name: ticket_id
        type: string
        description: Ticket ID
        required: false

capabilities:
  - name: ticket_management
    description: Create and manage support tickets
    enabled: true
    requires_approval: false
    risk_level: low
    allowed_actions:
      - create
      - update
      - assign
      - close
  - name: knowledge_search
    description: Search knowledge base for solutions
    enabled: true
    requires_approval: false
    risk_level: low
    allowed_actions:
      - search
      - retrieve
      - suggest
  - name: escalation
    description: Escalate issues to human agents
    enabled: true
    requires_approval: false
    risk_level: low
    allowed_actions:
      - escalate
      - transfer
      - notify

triggers:
  - type: webhook
    name: new_ticket
    enabled: true
    config:
      event: ticket.created
  - type: webhook
    name: customer_message
    enabled: true
    config:
      event: message.received
  - type: manual
    name: manual_assist
    enabled: true
    config: {}

outputs:
  - name: response
    type: text
    format: markdown
  - name: ticket_update
    type: json
    format: ticket_system
  - name: escalation_request
    type: notification
    format: internal

error_handling:
  on_error: escalate
  max_retries: 2
  fallback_agent: human_support
  notify_on_failure: true
  log_level: info

rate_limiting:
  requests_per_minute: 60
  requests_per_hour: 1000
  requests_per_day: 10000
  tokens_per_minute: 80000
  tokens_per_day: 800000
  concurrent_executions: 20

approval:
  enabled: false
  auto_approve_threshold: low
  require_approval_for: []
  timeout_minutes: 60
  escalation_path:
    - support_team_lead
  notify_channels:
    - support_dashboard

metadata:
  author: Support Team
  tags:
    - customer-support
    - tickets
    - communication
    - helpdesk
`;

// ============================================
// Mock Data Generator
// ============================================

const generateMockTemplate = (overrides: Partial<Template> = {}): Template => {
  const id = overrides.id || crypto.randomUUID();
  const now = new Date().toISOString();

  return {
    id,
    slug: overrides.slug || `template-${id.slice(0, 8)}`,
    name: overrides.name || 'Untitled Template',
    description: overrides.description || 'A new agent template',
    category: overrides.category || 'starter',
    icon: overrides.icon || 'FileCode',
    yaml_content: overrides.yaml_content || STARTER_TEMPLATE_YAML,
    preview_image: overrides.preview_image,
    difficulty: overrides.difficulty || 'beginner',
    features: overrides.features || [],
    use_cases: overrides.use_cases || [],
    created_at: overrides.created_at || now,
    updated_at: overrides.updated_at || now,
    popularity: overrides.popularity || 0,
    is_official: overrides.is_official ?? false,
  };
};

const MOCK_TEMPLATES: Template[] = [
  generateMockTemplate({
    id: 'template-starter-001',
    slug: 'starter',
    name: 'Starter Agent',
    description: 'A simple starter template for building your first agent. Perfect for beginners.',
    category: 'starter',
    icon: 'Rocket',
    yaml_content: STARTER_TEMPLATE_YAML,
    difficulty: 'beginner',
    features: ['Simple configuration', 'Basic error handling', 'Manual triggers'],
    use_cases: ['Learning agent development', 'Quick prototyping', 'Simple Q&A bots'],
    popularity: 1500,
    is_official: true,
  }),
  generateMockTemplate({
    id: 'template-code-review-001',
    slug: 'code-review',
    name: 'Code Review Agent',
    description: 'Automated code review agent for pull requests. Integrates with GitHub.',
    category: 'workflow',
    icon: 'GitPullRequest',
    yaml_content: CODE_REVIEW_TEMPLATE_YAML,
    difficulty: 'intermediate',
    features: ['GitHub integration', 'Automated PR comments', 'Security analysis', 'Best practices checks'],
    use_cases: ['Automated code review', 'PR quality gates', 'Team code standards'],
    popularity: 1200,
    is_official: true,
  }),
  generateMockTemplate({
    id: 'template-data-analysis-001',
    slug: 'data-analysis',
    name: 'Data Analysis Agent',
    description: 'Automated data analysis and insights generation. Connects to databases.',
    category: 'analysis',
    icon: 'BarChart',
    yaml_content: DATA_ANALYSIS_TEMPLATE_YAML,
    difficulty: 'advanced',
    features: ['SQL queries', 'Python analysis', 'Scheduled reports', 'Anomaly detection'],
    use_cases: ['Business intelligence', 'Automated reporting', 'Data monitoring'],
    popularity: 800,
    is_official: true,
  }),
  generateMockTemplate({
    id: 'template-workflow-001',
    slug: 'workflow-automation',
    name: 'Workflow Automation Agent',
    description: 'Orchestrate multi-step workflows and integrations across services.',
    category: 'automation',
    icon: 'Workflow',
    yaml_content: WORKFLOW_AUTOMATION_TEMPLATE_YAML,
    difficulty: 'advanced',
    features: ['Multi-step workflows', 'API integrations', 'Error recovery', 'State management'],
    use_cases: ['Process automation', 'Service orchestration', 'Event-driven workflows'],
    popularity: 950,
    is_official: true,
  }),
  generateMockTemplate({
    id: 'template-customer-support-001',
    slug: 'customer-support',
    name: 'Customer Support Agent',
    description: 'Intelligent customer support and ticket handling with human escalation.',
    category: 'communication',
    icon: 'MessageSquare',
    yaml_content: CUSTOMER_SUPPORT_TEMPLATE_YAML,
    difficulty: 'intermediate',
    features: ['Ticket management', 'Knowledge base search', 'Human escalation', 'Multi-channel support'],
    use_cases: ['Customer service', 'Helpdesk automation', 'FAQ handling'],
    popularity: 1100,
    is_official: true,
  }),
];

// ============================================
// API Client Class
// ============================================

class TemplatesApi {
  private templates: Map<UUID, Template>;
  private storageKey = 'studio_templates';

  constructor() {
    this.templates = new Map();
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const stored = studioStorage.get<Template[]>(this.storageKey);
      if (stored && stored.length > 0) {
        stored.forEach((template) => this.templates.set(template.id, template));
      } else {
        // Initialize with mock data
        MOCK_TEMPLATES.forEach((template) => this.templates.set(template.id, template));
        this.saveToStorage();
      }
    } catch {
      MOCK_TEMPLATES.forEach((template) => this.templates.set(template.id, template));
    }
  }

  private saveToStorage(): void {
    studioStorage.set(this.storageKey, Array.from(this.templates.values()));
  }

  private simulateDelay(ms: number = 100): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ============================================
  // CRUD Operations
  // ============================================

  async list(
    options?: PaginationOptions & FilterOptions
  ): Promise<StudioApiResponse<TemplateSummary[]>> {
    await this.simulateDelay();

    let templates = Array.from(this.templates.values());

    // Apply search filter
    if (options?.search) {
      const search = options.search.toLowerCase();
      templates = templates.filter(
        (t) =>
          t.name.toLowerCase().includes(search) ||
          t.description.toLowerCase().includes(search) ||
          t.slug.toLowerCase().includes(search) ||
          t.features.some((f) => f.toLowerCase().includes(search)) ||
          t.use_cases.some((u) => u.toLowerCase().includes(search))
      );
    }

    // Filter by category
    if (options?.category && options.category.length > 0) {
      templates = templates.filter((t) =>
        options.category!.includes(t.category)
      );
    }

    // Apply sorting
    const sortBy = options?.sort_by || 'popularity';
    const sortOrder = options?.sort_order || 'desc';
    templates.sort((a, b) => {
      const aVal = (a as Record<string, unknown>)[sortBy];
      const bVal = (b as Record<string, unknown>)[sortBy];
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortOrder === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      return 0;
    });

    // Apply pagination
    const page = options?.page || 1;
    const perPage = options?.per_page || 20;
    const total = templates.length;
    const startIndex = (page - 1) * perPage;
    const paginatedTemplates = templates.slice(startIndex, startIndex + perPage);

    // Map to summaries
    const summaries: TemplateSummary[] = paginatedTemplates.map((t) => ({
      id: t.id,
      slug: t.slug,
      name: t.name,
      description: t.description,
      category: t.category,
      icon: t.icon,
      difficulty: t.difficulty,
      features: t.features,
      popularity: t.popularity,
      is_official: t.is_official,
    }));

    return {
      success: true,
      data: summaries,
      meta: {
        page,
        per_page: perPage,
        total,
        total_pages: Math.ceil(total / perPage),
      },
    };
  }

  async get(id: UUID): Promise<StudioApiResponse<Template>> {
    await this.simulateDelay();

    const template = this.templates.get(id);
    if (!template) {
      return {
        success: false,
        data: null,
        error: {
          code: 'TEMPLATE_NOT_FOUND',
          message: `Template with ID ${id} not found`,
        },
      };
    }

    // Increment popularity on view
    const updatedTemplate: Template = {
      ...template,
      popularity: template.popularity + 1,
    };
    this.templates.set(id, updatedTemplate);
    this.saveToStorage();

    return { success: true, data: updatedTemplate };
  }

  async getBySlug(slug: string): Promise<StudioApiResponse<Template>> {
    await this.simulateDelay();

    const template = Array.from(this.templates.values()).find(
      (t) => t.slug === slug
    );
    if (!template) {
      return {
        success: false,
        data: null,
        error: {
          code: 'TEMPLATE_NOT_FOUND',
          message: `Template with slug ${slug} not found`,
        },
      };
    }

    return { success: true, data: template };
  }

  // ============================================
  // Category Operations
  // ============================================

  async getCategories(): Promise<StudioApiResponse<{ category: TemplateCategory; count: number }[]>> {
    await this.simulateDelay(50);

    const categoryMap = new Map<TemplateCategory, number>();

    Array.from(this.templates.values()).forEach((template) => {
      const count = categoryMap.get(template.category) || 0;
      categoryMap.set(template.category, count + 1);
    });

    const categories = Array.from(categoryMap.entries()).map(([category, count]) => ({
      category,
      count,
    }));

    return { success: true, data: categories };
  }

  async getByCategory(category: TemplateCategory): Promise<StudioApiResponse<TemplateSummary[]>> {
    return this.list({ category: [category] } as PaginationOptions & FilterOptions);
  }

  async getByDifficulty(difficulty: TemplateDifficulty): Promise<StudioApiResponse<TemplateSummary[]>> {
    await this.simulateDelay();

    const templates = Array.from(this.templates.values())
      .filter((t) => t.difficulty === difficulty)
      .sort((a, b) => b.popularity - a.popularity);

    const summaries: TemplateSummary[] = templates.map((t) => ({
      id: t.id,
      slug: t.slug,
      name: t.name,
      description: t.description,
      category: t.category,
      icon: t.icon,
      difficulty: t.difficulty,
      features: t.features,
      popularity: t.popularity,
      is_official: t.is_official,
    }));

    return { success: true, data: summaries };
  }

  // ============================================
  // Popular & Featured
  // ============================================

  async getPopular(limit: number = 5): Promise<StudioApiResponse<TemplateSummary[]>> {
    await this.simulateDelay(50);

    const templates = Array.from(this.templates.values())
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, limit);

    const summaries: TemplateSummary[] = templates.map((t) => ({
      id: t.id,
      slug: t.slug,
      name: t.name,
      description: t.description,
      category: t.category,
      icon: t.icon,
      difficulty: t.difficulty,
      features: t.features,
      popularity: t.popularity,
      is_official: t.is_official,
    }));

    return { success: true, data: summaries };
  }

  async getOfficial(): Promise<StudioApiResponse<TemplateSummary[]>> {
    await this.simulateDelay(50);

    const templates = Array.from(this.templates.values())
      .filter((t) => t.is_official)
      .sort((a, b) => b.popularity - a.popularity);

    const summaries: TemplateSummary[] = templates.map((t) => ({
      id: t.id,
      slug: t.slug,
      name: t.name,
      description: t.description,
      category: t.category,
      icon: t.icon,
      difficulty: t.difficulty,
      features: t.features,
      popularity: t.popularity,
      is_official: t.is_official,
    }));

    return { success: true, data: summaries };
  }

  async getFeatured(): Promise<StudioApiResponse<TemplateSummary[]>> {
    // Featured templates are official templates with high popularity
    await this.simulateDelay(50);

    const templates = Array.from(this.templates.values())
      .filter((t) => t.is_official && t.popularity > 500)
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, 6);

    const summaries: TemplateSummary[] = templates.map((t) => ({
      id: t.id,
      slug: t.slug,
      name: t.name,
      description: t.description,
      category: t.category,
      icon: t.icon,
      difficulty: t.difficulty,
      features: t.features,
      popularity: t.popularity,
      is_official: t.is_official,
    }));

    return { success: true, data: summaries };
  }

  // ============================================
  // Template Usage
  // ============================================

  async getYAML(id: UUID): Promise<StudioApiResponse<string>> {
    await this.simulateDelay(50);

    const template = this.templates.get(id);
    if (!template) {
      return {
        success: false,
        data: null,
        error: {
          code: 'TEMPLATE_NOT_FOUND',
          message: `Template with ID ${id} not found`,
        },
      };
    }

    return { success: true, data: template.yaml_content };
  }

  async useTemplate(
    id: UUID,
    customizations?: { name?: string; slug?: string; description?: string }
  ): Promise<StudioApiResponse<string>> {
    await this.simulateDelay();

    const template = this.templates.get(id);
    if (!template) {
      return {
        success: false,
        data: null,
        error: {
          code: 'TEMPLATE_NOT_FOUND',
          message: `Template with ID ${id} not found`,
        },
      };
    }

    // Increment popularity on use
    const updatedTemplate: Template = {
      ...template,
      popularity: template.popularity + 5, // Usage counts more than views
    };
    this.templates.set(id, updatedTemplate);
    this.saveToStorage();

    // Apply customizations to YAML
    let yaml = template.yaml_content;
    if (customizations) {
      if (customizations.name) {
        yaml = yaml.replace(/name:\s*.+/m, `name: ${customizations.name}`);
      }
      if (customizations.slug) {
        yaml = yaml.replace(/slug:\s*.+/m, `slug: ${customizations.slug}`);
      }
      if (customizations.description) {
        yaml = yaml.replace(/description:\s*.+/m, `description: ${customizations.description}`);
      }
    }

    return { success: true, data: yaml };
  }

  // ============================================
  // Search
  // ============================================

  async search(query: string): Promise<StudioApiResponse<TemplateSummary[]>> {
    await this.simulateDelay();

    const loweredQuery = query.toLowerCase();
    const templates = Array.from(this.templates.values()).filter((t) => {
      const matchName = t.name.toLowerCase().includes(loweredQuery);
      const matchDescription = t.description.toLowerCase().includes(loweredQuery);
      const matchFeatures = t.features.some((f) => f.toLowerCase().includes(loweredQuery));
      const matchUseCases = t.use_cases.some((u) => u.toLowerCase().includes(loweredQuery));
      const matchSlug = t.slug.toLowerCase().includes(loweredQuery);

      return matchName || matchDescription || matchFeatures || matchUseCases || matchSlug;
    });

    // Sort by relevance (name match first, then popularity)
    templates.sort((a, b) => {
      const aNameMatch = a.name.toLowerCase().includes(loweredQuery) ? 1 : 0;
      const bNameMatch = b.name.toLowerCase().includes(loweredQuery) ? 1 : 0;
      if (aNameMatch !== bNameMatch) return bNameMatch - aNameMatch;
      return b.popularity - a.popularity;
    });

    const summaries: TemplateSummary[] = templates.map((t) => ({
      id: t.id,
      slug: t.slug,
      name: t.name,
      description: t.description,
      category: t.category,
      icon: t.icon,
      difficulty: t.difficulty,
      features: t.features,
      popularity: t.popularity,
      is_official: t.is_official,
    }));

    return { success: true, data: summaries };
  }

  // ============================================
  // Statistics
  // ============================================

  async getStats(): Promise<
    StudioApiResponse<{
      total: number;
      by_category: Record<TemplateCategory, number>;
      by_difficulty: Record<TemplateDifficulty, number>;
      official_count: number;
      total_usage: number;
    }>
  > {
    await this.simulateDelay(50);

    const templates = Array.from(this.templates.values());
    const byCategory: Record<string, number> = {};
    const byDifficulty: Record<string, number> = {};
    let totalUsage = 0;
    let officialCount = 0;

    templates.forEach((template) => {
      byCategory[template.category] = (byCategory[template.category] || 0) + 1;
      byDifficulty[template.difficulty] = (byDifficulty[template.difficulty] || 0) + 1;
      totalUsage += template.popularity;
      if (template.is_official) officialCount++;
    });

    return {
      success: true,
      data: {
        total: templates.length,
        by_category: byCategory as Record<TemplateCategory, number>,
        by_difficulty: byDifficulty as Record<TemplateDifficulty, number>,
        official_count: officialCount,
        total_usage: totalUsage,
      },
    };
  }

  // ============================================
  // Reset
  // ============================================

  async reset(): Promise<void> {
    this.templates.clear();
    MOCK_TEMPLATES.forEach((template) => this.templates.set(template.id, template));
    this.saveToStorage();
  }
}

// Export singleton instance
export const templatesApi = new TemplatesApi();
export type { TemplatesApi };
