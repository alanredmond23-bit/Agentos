# AgentOS YAML Schema Reference

**Version:** 1.0.0
**Status:** Canonical
**Last Updated:** 2025-12-28

> This document is the definitive API reference for the AgentOS agent YAML schema. It documents every field, type, valid value, and best practice for defining agents in the AgentOS ecosystem.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Schema Versions](#2-schema-versions)
3. [Identity Block](#3-identity-block)
4. [Model Configuration](#4-model-configuration)
5. [Reasoning Configuration](#5-reasoning-configuration)
6. [Authority and Permissions](#6-authority-and-permissions)
7. [MCP Servers](#7-mcp-servers)
8. [Tools and Capabilities](#8-tools-and-capabilities)
9. [Memory and Context](#9-memory-and-context)
10. [Gates and Policies](#10-gates-and-policies)
11. [Voice and Communication](#11-voice-and-communication)
12. [Business Metrics](#12-business-metrics)
13. [Safety and Guardrails](#13-safety-and-guardrails)
14. [Expected Results](#14-expected-results)
15. [Activation](#15-activation)
16. [Meta Block](#16-meta-block)
17. [Mission Block](#17-mission-block)
18. [Persona Block](#18-persona-block)
19. [Collaboration Block](#19-collaboration-block)
20. [Observability Block](#20-observability-block)
21. [Compliance Block](#21-compliance-block)
22. [Evals Block](#22-evals-block)
23. [Full Example YAML](#23-full-example-yaml)
24. [Common Patterns](#24-common-patterns)
25. [Anti-Patterns to Avoid](#25-anti-patterns-to-avoid)
26. [Migration Guide v0.1 to v0.2](#26-migration-guide-v01-to-v02)

---

## 1. Overview

AgentOS uses YAML as the contract language for defining agents. The YAML specification serves as:

- **Legal authority boundary** - Defines what an agent can and cannot do
- **Operational guardrail** - Enforces runtime constraints
- **Auditable contract** - Every field is logged and traceable
- **Portability layer** - Works across frameworks and providers

### Schema Philosophy

```
Explicit > Implicit
Constrained > Unbounded
Auditable > Convenient
Composable > Monolithic
```

### Strictness Rules

| Condition | Result |
|-----------|--------|
| Unknown fields | ERROR |
| Missing required fields | ERROR |
| Invalid enum value | ERROR |
| Unsafe tool permission | ERROR |
| Unbounded memory retention | ERROR |

---

## 2. Schema Versions

### Current Versions

| Version | Status | Description |
|---------|--------|-------------|
| `1.0` | **Current** | Full production schema with 250+ parameters |
| `0.2` | Deprecated | Beta schema with partial coverage |
| `0.1` | Deprecated | Initial alpha schema |

### Version Declaration

```yaml
meta:
  schema_version: "1.0"
```

---

## 3. Identity Block

The identity block defines core agent metadata and persona information.

### 3.1 Field Definitions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `agent_id` | `string` | **Yes** | Unique identifier (e.g., `MOBILE-MGR-00`) |
| `name` | `string` | **Yes** | Human-readable agent name |
| `version` | `string` | **Yes** | Semantic version (e.g., `1.0.0`) |
| `icon` | `string` | No | Emoji or icon identifier |
| `role` | `string` | **Yes** | Primary role description |
| `pack` | `string` | **Yes** | Parent pack identifier |
| `is_manager` | `boolean` | No | Whether agent is a pack manager |
| `slug` | `string` | No | URL-safe identifier |
| `short_name` | `string` | No | Abbreviated name |

### 3.2 Personality Sub-block

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `description` | `string` | No | Detailed personality description |
| `traits` | `array[string]` | No | List of personality traits |
| `communication_style` | `string` | No | Communication approach |
| `directness_level` | `float` | No | 0.0-1.0 scale of directness |
| `formality_level` | `float` | No | 0.0-1.0 scale of formality |
| `humor_enabled` | `boolean` | No | Whether humor is allowed |
| `profanity_allowed` | `boolean` | No | Whether profanity is permitted |

### 3.3 Lifecycle Sub-block

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `status` | `enum` | No | `active`, `deprecated`, `draft` |
| `created` | `string` | No | ISO 8601 date |
| `last_updated` | `string` | No | ISO 8601 date |
| `deprecated` | `boolean` | No | Deprecation flag |

### 3.4 Values and Mission

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `mission` | `string` | **Yes** | Core mission statement |
| `values` | `array[string]` | No | Guiding values |
| `knowledge_domains` | `array[string]` | No | Areas of expertise |

### 3.5 Example

```yaml
identity:
  agent_id: "MOBILE-MGR-00"
  name: "Mobile Pack Manager"
  version: "1.0.0"
  icon: "phone"
  role: "Mobile Development Orchestrator"
  pack: "mobile"
  is_manager: true
  slug: "mobile-pack-manager"

  personality:
    description: "Strategic mobile architect with cross-platform expertise"
    traits:
      - "Platform-aware"
      - "Performance-focused"
      - "User-experience-driven"
      - "Security-conscious"
    communication_style: "Technical yet accessible"
    directness_level: 0.85
    formality_level: 0.70
    humor_enabled: false
    profanity_allowed: false

  lifecycle:
    status: "active"
    created: "2025-01-01"
    last_updated: "2025-12-28"
    deprecated: false

  mission: "Deliver exceptional mobile experiences across iOS and Android"

  values:
    - "User Experience"
    - "Performance"
    - "Security"
    - "Cross-platform Consistency"

  knowledge_domains:
    - "iOS Development"
    - "Android Development"
    - "React Native"
    - "Mobile Architecture"
```

### 3.6 Best Practices

1. **Use consistent ID patterns**: `{DOMAIN}-{ROLE}-{NUMBER}` (e.g., `MOBILE-MGR-00`)
2. **Keep mission statements under 100 characters**
3. **Limit traits to 3-5 key characteristics**
4. **Always set `is_manager: true` for pack managers**

---

## 4. Model Configuration

Defines the AI model provider, parameters, and routing strategy.

### 4.1 Field Definitions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `provider` | `enum` | **Yes** | `anthropic`, `openai`, `google`, `deepseek` |
| `model_id` | `string` | **Yes** | Specific model identifier |
| `fallback_models` | `array` | No | Fallback model configurations |

### 4.2 Parameters Sub-block

| Field | Type | Required | Default | Valid Range |
|-------|------|----------|---------|-------------|
| `temperature` | `float` | No | `0.7` | 0.0 - 2.0 |
| `top_p` | `float` | No | `0.9` | 0.0 - 1.0 |
| `top_k` | `integer` | No | `40` | 1 - 100 |
| `frequency_penalty` | `float` | No | `0.0` | -2.0 - 2.0 |
| `presence_penalty` | `float` | No | `0.0` | -2.0 - 2.0 |
| `max_tokens` | `integer` | No | `4096` | 1 - 200000 |
| `stop_sequences` | `array[string]` | No | `[]` | Custom stop tokens |

### 4.3 Presets Sub-block

Define named parameter sets for different task types:

```yaml
presets:
  default:
    temperature: 0.4
    top_p: 0.88
    max_tokens: 8192

  planning:
    temperature: 0.5
    top_p: 0.90
    max_tokens: 12000

  routing:
    temperature: 0.2
    top_p: 0.80
    max_tokens: 2048

  review:
    temperature: 0.3
    top_p: 0.85
    max_tokens: 6000

  creative:
    temperature: 0.7
    top_p: 0.95
    max_tokens: 6000
```

### 4.4 Capabilities Sub-block

| Field | Type | Description |
|-------|------|-------------|
| `high_reasoning` | `boolean` | Enable advanced reasoning |
| `extended_context` | `boolean` | Use extended context window |
| `multi_step_analysis` | `boolean` | Enable multi-step processing |

### 4.5 Fallback Configuration

```yaml
fallback:
  provider: "anthropic"
  model_id: "claude-3-5-sonnet-20241022"

fallback_models:
  - provider: "anthropic"
    model_id: "claude-3-5-sonnet-20241022"
  - provider: "openai"
    model_id: "gpt-4-turbo"
```

### 4.6 Full Example

```yaml
model:
  provider: "anthropic"
  model_id: "claude-sonnet-4-20250514"

  parameters:
    temperature: 0.4
    top_p: 0.88
    top_k: 40
    frequency_penalty: 0.15
    presence_penalty: 0.20
    max_tokens: 8192
    stop_sequences:
      - "---END---"
      - "---COMPLETE---"

  presets:
    default:
      temperature: 0.4
      max_tokens: 8192
    planning:
      temperature: 0.5
      max_tokens: 12000

  capabilities:
    high_reasoning: true
    extended_context: true
    multi_step_analysis: true

  fallback:
    provider: "openai"
    model_id: "gpt-4-turbo"
```

### 4.7 Model ID Reference

| Provider | Model ID | Use Case |
|----------|----------|----------|
| `anthropic` | `claude-opus-4-20250514` | Complex reasoning, analysis |
| `anthropic` | `claude-sonnet-4-20250514` | General purpose, balanced |
| `anthropic` | `claude-3-5-sonnet-20241022` | Cost-effective fallback |
| `openai` | `gpt-5` | Advanced reasoning |
| `openai` | `gpt-4-turbo` | General purpose |
| `google` | `gemini-2.5-pro` | Multi-modal tasks |
| `deepseek` | `deepseek-r1` | Reasoning-focused |

---

## 5. Reasoning Configuration

Controls how the agent thinks and makes decisions.

### 5.1 Field Definitions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `mode` | `enum` | **Yes** | Reasoning approach |
| `think_mode` | `string` | No | Thinking style |
| `extended_thinking` | `boolean` | No | Enable extended reasoning |
| `chain_of_thought` | `string` | No | CoT template identifier |
| `reasoning_depth` | `integer` | No | Reasoning depth level (1-5) |

### 5.2 Mode Enum Values

| Value | Description |
|-------|-------------|
| `analytical` | Structured, step-by-step analysis |
| `orchestration` | Workflow and agent coordination |
| `predictive` | Pattern recognition and forecasting |
| `creative` | Open-ended creative generation |
| `execution` | Task-focused execution |

### 5.3 Think Mode Values

| Value | Description |
|-------|-------------|
| `precision` | Maximum accuracy focus |
| `comprehensive` | Thorough analysis |
| `strategic` | Long-term planning |
| `pattern_analysis` | Pattern recognition |
| `privilege_first` | Priority on safety/privilege |

### 5.4 Chain of Thought Templates

| Value | Description |
|-------|-------------|
| `workflow_planning` | Multi-step workflow design |
| `research_methodology` | Research process |
| `legal_reasoning` | Legal analysis framework |
| `technical_analysis` | Technical deep-dive |

### 5.5 Decision Framework Sub-block

```yaml
decision_framework:
  primary: "Platform Requirements"
  secondary: "Performance Impact"
  tertiary: "Development Velocity"
  quaternary: "Maintenance Cost"
```

### 5.6 Learning Sub-block

| Field | Type | Description |
|-------|------|-------------|
| `mode` | `enum` | `continuous`, `batch`, `disabled` |
| `feedback_sources` | `array[string]` | Sources of learning feedback |
| `fine_tune_ready` | `boolean` | Ready for fine-tuning |
| `update_frequency` | `string` | `daily`, `weekly`, `monthly` |

### 5.7 Research Patterns (Domain-Specific)

```yaml
research_patterns:
  - "systematic_review"
  - "triangulation"
  - "source_cross_reference"
  - "temporal_analysis"
  - "stakeholder_mapping"
```

### 5.8 Full Example

```yaml
reasoning:
  mode: "orchestration"
  think_mode: "strategic"
  extended_thinking: true
  chain_of_thought: "workflow_planning"
  reasoning_depth: 4

  learning:
    mode: "continuous"
    feedback_sources:
      - "agent_performance"
      - "task_completion_metrics"
      - "user_satisfaction"
    fine_tune_ready: true
    update_frequency: "weekly"

  decision_framework:
    primary: "Platform Requirements"
    secondary: "Performance Impact"
    tertiary: "Development Velocity"
    quaternary: "Maintenance Cost"
```

---

## 6. Authority and Permissions

Defines what the agent is allowed to do and access.

### 6.1 Core Authority Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `level` | `enum` | **Yes** | Authority tier |
| `zone` | `enum` | **Yes** | Security zone |
| `execution_model` | `enum` | No | How agent executes |
| `approval_required` | `boolean` | No | Requires human approval |
| `approval_timeout_seconds` | `integer` | No | Approval timeout |

### 6.2 Level Enum Values

| Value | Description |
|-------|-------------|
| `Pack Manager` | Full pack authority |
| `Lead` | Team lead authority |
| `Operator` | Standard operational access |
| `Worker` | Limited execution access |
| `Observer` | Read-only access |

### 6.3 Zone Enum Values

| Value | Color | Description |
|-------|-------|-------------|
| `RED` | Red | Critical systems - Legal, billing, evidence |
| `YELLOW` | Yellow | Important systems - APIs, core services |
| `GREEN` | Green | Standard systems - Features, docs |

### 6.4 Execution Model Values

| Value | Description |
|-------|-------------|
| `autonomous` | Fully autonomous execution |
| `semi_autonomous` | Autonomous with checkpoints |
| `supervised_delegation` | Human oversight required |
| `manual` | Human-initiated only |

### 6.5 Zone Access Sub-block

```yaml
zone_access:
  red: false    # No access to critical systems
  yellow: true  # Can access important systems
  green: true   # Full access to standard systems
```

### 6.6 Financial Limits Sub-block

| Field | Type | Description |
|-------|------|-------------|
| `auto_execute` | `float` | Max USD for auto-execution |
| `require_confirmation` | `float` | Threshold requiring confirmation |
| `absolute_maximum` | `float` | Hard limit on spending |
| `daily_limit` | `float` | Daily spending cap |
| `monthly_limit` | `float` | Monthly spending cap |
| `currency` | `string` | Currency code (default: `USD`) |

### 6.7 Operations Lists

```yaml
allowed_operations:
  - "agent_delegation"
  - "workflow_management"
  - "task_routing"
  - "progress_tracking"
  - "quality_review"

forbidden_operations:
  - "app_store_submission"
  - "production_deployment"
  - "code_signing_key_access"
  - "billing_modification"
```

### 6.8 Resource Quotas Sub-block

| Field | Type | Description |
|-------|------|-------------|
| `api_calls_per_minute` | `integer` | Rate limit per minute |
| `api_calls_per_day` | `integer` | Daily API call limit |
| `tokens_per_request` | `integer` | Max tokens per request |
| `tokens_per_day` | `integer` | Daily token limit |
| `storage_mb` | `integer` | Storage allocation |
| `concurrent_tasks` | `integer` | Max parallel tasks |

### 6.9 Delegation Sub-block

```yaml
delegation:
  can_delegate_to:
    - "mobile_ios_swift"
    - "mobile_android_kotlin"
    - "mobile_api_integration"
  requires_approval: false
  max_concurrent_delegations: 5

  delegation_rules:
    search_tasks: "research_searcher"
    verification_tasks: "research_verifier"
    synthesis_tasks: "research_synthesizer"
```

### 6.10 Emergency Powers Sub-block

```yaml
emergency_powers:
  shutdown_on_breach: true
  rollback_on_error: true
  alert_on_anomaly: true
  escalation_contact: "devops-oncall@company.com"
```

### 6.11 Data Classification Access

```yaml
data_classification_access:
  - "public"
  - "internal"
  # Excludes: "confidential", "restricted"
```

### 6.12 Full Example

```yaml
authority:
  level: "Pack Manager"
  zone: "YELLOW"
  execution_model: "supervised_delegation"
  approval_required: false
  approval_timeout_seconds: 300

  zone_access:
    red: false
    yellow: true
    green: true

  financial_limits:
    auto_execute: 0
    require_confirmation: 500
    absolute_maximum: 5000
    daily_limit: 2000
    monthly_limit: 20000
    currency: "USD"

  allowed_operations:
    - "agent_delegation"
    - "workflow_management"
    - "task_routing"

  forbidden_operations:
    - "production_deployment"
    - "billing_modification"

  resource_quotas:
    api_calls_per_minute: 100
    api_calls_per_day: 8000
    tokens_per_request: 12000
    tokens_per_day: 400000
    concurrent_tasks: 6

  delegation:
    can_delegate_to:
      - "mobile_ios_swift"
      - "mobile_android_kotlin"
    requires_approval: false
    max_concurrent_delegations: 5

  emergency_powers:
    shutdown_on_breach: true
    rollback_on_error: true
    alert_on_anomaly: true
```

---

## 7. MCP Servers

Model Context Protocol server configurations for external integrations.

### 7.1 Server Configuration Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `transport` | `enum` | **Yes** | `stdio`, `http`, `websocket` |
| `priority` | `enum` | **Yes** | `critical`, `high`, `medium`, `low` |
| `command` | `string` | Conditional | Command for stdio transport |
| `args` | `array[string]` | No | Command arguments |
| `url` | `string` | Conditional | URL for http transport |
| `timeout_ms` | `integer` | No | Request timeout |
| `retry_count` | `integer` | No | Number of retries |
| `token_env` | `string` | No | Environment variable for auth token |
| `capabilities` | `array[string]` | No | Enabled capabilities |
| `rate_limit` | `string` | No | Rate limit specification |
| `cache_ttl` | `integer` | No | Cache TTL in seconds |
| `fallback` | `string` | No | Fallback server name |
| `description` | `string` | No | Server description |
| `tables` | `array[string]` | No | Database tables (for Supabase) |

### 7.2 Transport Types

| Type | Description | Required Fields |
|------|-------------|-----------------|
| `stdio` | Standard I/O process | `command`, `args` |
| `http` | HTTP REST API | `url` or `token_env` |
| `websocket` | WebSocket connection | `url` |

### 7.3 Priority Levels

| Level | Description |
|-------|-------------|
| `critical` | Required for agent operation |
| `high` | Important but has fallback |
| `medium` | Nice to have |
| `low` | Optional enhancement |

### 7.4 Health Check Sub-block

```yaml
health_check:
  enabled: true
  interval_seconds: 15
  timeout_seconds: 5
```

### 7.5 Full Example

```yaml
mcp_servers:
  github:
    transport: "stdio"
    priority: "critical"
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-github"]
    timeout_ms: 30000
    retry_count: 3
    token_env: "GITHUB_TOKEN"
    capabilities:
      - "repository_read"
      - "pull_request_write"
      - "actions_management"
      - "workflow_dispatch"
    health_check:
      enabled: true
      interval_seconds: 15
      timeout_seconds: 5

  supabase:
    transport: "stdio"
    priority: "critical"
    command: "npx"
    args: ["@agentos/mcp-supabase"]
    token_env: "SUPABASE_SERVICE_KEY"
    tables:
      - "research_projects"
      - "sources"
      - "citations"
    capabilities:
      - "database_read"
      - "database_write"
      - "edge_functions"

  perplexity:
    transport: "http"
    priority: "high"
    token_env: "PERPLEXITY_API_KEY"
    timeout_ms: 30000
    rate_limit: "100/min"
    description: "AI-powered search for research"
    fallback: "tavily"

  slack:
    transport: "http"
    priority: "medium"
    token_env: "SLACK_TOKEN"
    capabilities:
      - "notifications"
      - "channel_messaging"
    rate_limit: "30/min"
    cache_ttl: 0
```

### 7.6 Common MCP Servers

| Server | Transport | Use Case |
|--------|-----------|----------|
| `github` | stdio | Repository management |
| `supabase` | stdio | Database operations |
| `perplexity` | http | AI-powered search |
| `tavily` | http | Real-time search |
| `slack` | http | Notifications |
| `temporal` | http | Workflow orchestration |
| `redis` | stdio | Caching, pub/sub |
| `westlaw` | http | Legal research |
| `stripe` | http | Payment operations |

---

## 8. Tools and Capabilities

Defines what tools the agent can use.

### 8.1 Primary Tools Definition

Each tool has the following structure:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `string` | **Yes** | Tool identifier |
| `description` | `string` | **Yes** | What the tool does |
| `input` | `string` | No | Input parameters description |
| `output` | `string` | No | Output format description |
| `input_schema` | `object` | No | Structured input schema |

### 8.2 Primary Tools Example

```yaml
tools:
  primary:
    - name: "workflow_orchestrator"
      description: "Coordinate mobile development workflows across agents"
      input_schema:
        task_type: "string"
        platforms: "array[string]"
        requirements: "object"
      output: "workflow_plan"

    - name: "agent_router"
      description: "Route tasks to appropriate mobile specialists"
      input_schema:
        task: "object"
        context: "object"
      output: "routing_decision"

    - name: "progress_tracker"
      description: "Track progress across all mobile workstreams"
      input_schema:
        project_id: "string"
      output: "progress_report"
```

### 8.3 Secondary Tools

List additional tools available but not primary:

```yaml
secondary:
  - "timeline_estimator"
  - "dependency_analyzer"
  - "resource_planner"
  - "risk_assessor"
```

### 8.4 Permission Model

| Field | Type | Description |
|-------|------|-------------|
| `registry_ref` | `string` | Reference to tool registry |
| `permission_model` | `enum` | `allowlist`, `denylist`, `inherit` |

### 8.5 Allowlist / Denylist

```yaml
tools:
  registry_ref: "tool_registry.legal.v1"
  permission_model: "allowlist"

  allowlist:
    - "supabase.cases.read"
    - "supabase.cases.write"
    - "supabase.documents.read"
    - "westlaw.case_search"
    - "lexisnexis.case_law"

  denylist:
    - "court.filing"
    - "client.email"
    - "payments.execute"
```

### 8.6 Terminal Tool Configuration

```yaml
terminal:
  enabled: true
  shell: "bash"
  sudo: false
  ssh_enabled: true
  allowed_commands:
    - "git"
    - "kubectl"
    - "terraform"
    - "docker"
  blocked_commands:
    - "rm -rf /"
    - "shutdown"
```

### 8.7 Filesystem Tool Configuration

```yaml
filesystem:
  read: "limited"       # none, limited, full
  write: "limited"
  execute: false
  allowed_paths:
    - "/workspace"
    - "/tmp/devops"
```

### 8.8 API Tool Configuration

```yaml
apis:
  rest: true
  graphql: true
  websocket: true
  grpc: false
```

### 8.9 Code Execution Configuration

```yaml
code_execution:
  enabled: true
  languages:
    - "bash"
    - "python"
    - "javascript"
  sandbox: true
  timeout_seconds: 300
```

### 8.10 Full Example

```yaml
tools:
  registry_ref: "tool_registry.mobile.v1"
  permission_model: "allowlist"

  primary:
    - name: "workflow_orchestrator"
      description: "Coordinate development workflows"
      input_schema:
        task_type: "string"
        platforms: "array[string]"
      output: "workflow_plan"

  secondary:
    - "timeline_estimator"
    - "dependency_analyzer"

  allowlist:
    - "github.read"
    - "github.write.pr"
    - "supabase.read"

  denylist:
    - "payments.execute"
    - "prod.db.mutate"

  terminal:
    enabled: true
    shell: "bash"
    allowed_commands:
      - "git"
      - "npm"

  filesystem:
    read: "limited"
    write: "limited"
    allowed_paths:
      - "/workspace"

  code_execution:
    enabled: true
    languages:
      - "javascript"
      - "python"
    sandbox: true
```

---

## 9. Memory and Context

Configures how the agent stores and retrieves information.

### 9.1 Core Memory Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `enabled` | `boolean` | No | Enable memory (default: true) |
| `type` | `enum` | **Yes** | `ephemeral`, `persistent` |
| `storage` | `string` | **Yes** | Storage backend |
| `retention` | `string` | **Yes** | Retention policy |

### 9.2 Retention Values

| Value | Description |
|-------|-------------|
| `ephemeral` | Cleared after task |
| `session` | Retained for session |
| `project_duration` | Retained for project lifetime |
| `90_days` | 90-day retention |
| `forever` | Permanent retention |

### 9.3 Memory Classes Sub-block

```yaml
classes:
  working:
    retention: "ephemeral"
    write_enabled: true

  session:
    retention_days: 30
    write_enabled: true
    pii_allowed: false

  long_term:
    retention_days: 3650
    write_enabled: true
    pii_allowed: false
    promotion_requires: ["human_or_gate"]

  audit:
    retention_days: 3650
    immutable: true
    write_enabled: true
```

### 9.4 Vector Configuration Sub-block

| Field | Type | Description |
|-------|------|-------------|
| `enabled` | `boolean` | Enable vector storage |
| `dimensions` | `integer` | Vector dimensions (1536 for OpenAI) |
| `index_type` | `string` | Index algorithm (`HNSW`, `IVF`) |
| `similarity_metric` | `string` | `cosine`, `euclidean`, `dot_product` |

```yaml
vector_config:
  enabled: true
  dimensions: 1536
  index_type: "HNSW"
  similarity_metric: "cosine"
```

### 9.5 Retrieval Configuration Sub-block

| Field | Type | Description |
|-------|------|-------------|
| `strategy` | `enum` | `hybrid`, `semantic`, `keyword`, `scoped_rag` |
| `semantic_weight` | `float` | Weight for semantic search (0-1) |
| `keyword_weight` | `float` | Weight for keyword search (0-1) |
| `max_results` | `integer` | Maximum results to return |
| `max_documents` | `integer` | Max documents to retrieve |
| `max_tokens` | `integer` | Max tokens in context |
| `confidence_threshold` | `float` | Minimum confidence score |
| `freshness_bias_days` | `integer` | Prefer recent documents |

```yaml
retrieval:
  strategy: "hybrid"
  semantic_weight: 0.6
  keyword_weight: 0.4
  max_results: 20
  max_documents: 50
  max_tokens: 32000
  confidence_threshold: 0.7
  freshness_bias_days: 30
```

### 9.6 Chunking Configuration

```yaml
chunking:
  strategy: "semantic"    # semantic, fixed, sentence
  size: 512
  overlap: 64
```

### 9.7 Compression Configuration

```yaml
compression:
  enabled: true
  algorithm: "zstd"       # zstd, gzip, lz4
```

### 9.8 Encryption Configuration

```yaml
encryption:
  at_rest: true
  in_transit: true
  algorithm: "aes-256-gcm"
```

### 9.9 Context Management Sub-block

```yaml
context_management:
  max_tokens: 100000
  reserved_for_output: 12000
  prioritization: "relevance"
  priority_sources:
    - "active_tasks"
    - "project_requirements"
    - "agent_status"
```

### 9.10 Learning Sub-block

```yaml
learning:
  patterns:
    - "workflow_effectiveness"
    - "agent_performance"
    - "common_blockers"
  feedback_integration: true
```

### 9.11 Contexts Sub-block

```yaml
contexts:
  research_history: true
  source_database: true
  methodology_templates: true
  quality_benchmarks: true
```

### 9.12 Full Example

```yaml
memory:
  enabled: true
  type: "persistent"
  storage: "supabase"
  retention: "project_duration"

  classes:
    working:
      retention: "ephemeral"
      write_enabled: true
    session:
      retention_days: 365
      write_enabled: true
      pii_allowed: false
    audit:
      retention_days: 3650
      immutable: true

  vector_config:
    enabled: true
    dimensions: 1536
    index_type: "HNSW"
    similarity_metric: "cosine"

  retrieval:
    strategy: "hybrid"
    semantic_weight: 0.6
    keyword_weight: 0.4
    max_results: 20
    confidence_threshold: 0.7

  chunking:
    strategy: "semantic"
    size: 512
    overlap: 64

  compression:
    enabled: true
    algorithm: "zstd"

  encryption:
    at_rest: true
    in_transit: true

  context_management:
    max_tokens: 100000
    priority_sources:
      - "active_tasks"
      - "project_requirements"
```

---

## 10. Gates and Policies

Defines quality gates and execution policies.

### 10.1 Required Gates

Gates that must pass before agent output is accepted.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | **Yes** | Gate identifier |
| `description` | `string` | No | Gate purpose |
| `type` | `string` | No | Gate type classification |
| `threshold` | `float` | **Yes** | Pass threshold (0.0-1.0) |

```yaml
gates:
  required:
    - id: "gate.quality.mobile_standards"
      description: "Mobile development standards compliance"
      type: "quality"
      threshold: 0.85

    - id: "gate.security.mobile_review"
      description: "Security review checkpoint"
      type: "security"
      threshold: 0.90

    - id: "gate.compliance.sox"
      threshold: 1.0
```

### 10.2 Optional Gates

Gates that are recommended but not mandatory:

```yaml
optional:
  - id: "gate.performance.mobile_benchmarks"
    description: "Performance benchmark validation"
    type: "performance"
    threshold: 0.80
```

### 10.3 Conditional Gates

Gates applied based on conditions:

```yaml
conditional_gates:
  if_filing: ["gate.approval.filing"]
  if_domain_legal: ["gate.legal.authority.v1"]
  if_prod_mutation: ["gate.human.approval.v1"]
```

### 10.4 Execution Policies

| Field | Type | Description |
|-------|------|-------------|
| `require_tests` | `boolean` | Tests must pass |
| `require_review` | `boolean` | Review required |
| `require_audit_trail` | `boolean` | Audit logging required |
| `require_approval` | `boolean` | Human approval needed |
| `require_methodology` | `boolean` | Methodology must be defined |
| `allow_parallel` | `boolean` | Parallel execution allowed |
| `max_retries` | `integer` | Maximum retry attempts |
| `minimum_sources` | `integer` | Minimum sources required |

```yaml
policies:
  execution:
    require_tests: true
    require_review: true
    require_audit_trail: true
    require_approval: true
    allow_parallel: true
    max_retries: 3
```

### 10.5 Quality Policies

```yaml
quality:
  min_coverage: 0.70
  require_linting: true
  require_documentation: true
  minimum_credibility_score: 0.70
  require_cross_reference: true
  require_recency_check: true
```

### 10.6 Security Policies

```yaml
security:
  require_security_scan: true
  block_on_critical: true
  require_code_signing: true
```

### 10.7 Output Policies

```yaml
output:
  require_citations: true
  require_confidence_scores: true
  require_methodology_disclosure: true
```

### 10.8 Full Example

```yaml
gates:
  required:
    - id: "gate.quality.source_credibility"
      description: "Ensure source credibility meets threshold"
      threshold: 0.80

    - id: "gate.quality.verification"
      description: "Fact verification threshold"
      threshold: 0.85

    - id: "gate.security.review"
      threshold: 0.90

  optional:
    - id: "gate.performance.benchmarks"
      threshold: 0.80

  conditional_gates:
    if_filing: ["gate.approval.filing"]

policies:
  execution:
    require_tests: true
    require_review: true
    allow_parallel: true
    max_retries: 3

  quality:
    min_coverage: 0.70
    require_linting: true

  security:
    require_security_scan: true
    block_on_critical: true

  output:
    require_citations: true
    require_confidence_scores: true
```

---

## 11. Voice and Communication

Configures voice interface and communication patterns.

### 11.1 Core Voice Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `enabled` | `boolean` | No | Enable voice interface |
| `model` | `string` | Conditional | Voice model (e.g., `whisper-1`) |
| `provider` | `string` | Conditional | Voice provider |
| `voice_tone` | `string` | No | Tone of voice |
| `response_time_target` | `integer` | No | Target response time (ms) |
| `personality_preset` | `string` | No | Personality template |
| `output_format` | `string` | No | Output format style |

### 11.2 Emotion and Style

```yaml
emotion_range: "limited"    # none, limited, full
interruption_handling: true
```

### 11.3 Communication Sub-block

```yaml
communication:
  interruption_handling: true
  multi_turn_awareness: true
  context_preservation: true
```

### 11.4 Escalation Sub-block

```yaml
escalation:
  triggers:
    - "deadline_risk"
    - "security_vulnerability"
    - "blocker_detected"
  channels:
    - "slack"
    - "email"
```

### 11.5 Full Example

```yaml
voice:
  enabled: false
  model: "whisper-1"
  provider: "openai"
  voice_tone: "professional"
  response_time_target: 3000
  personality_preset: "technical-coordinator"
  output_format: "structured_plan"
  emotion_range: "limited"

  communication:
    interruption_handling: true
    multi_turn_awareness: true
    context_preservation: true

  escalation:
    triggers:
      - "deadline_risk"
      - "security_vulnerability"
    channels:
      - "slack"
      - "email"
```

---

## 12. Business Metrics

Tracks cost, time, and performance metrics.

### 12.1 Cost Tracking Sub-block

| Field | Type | Description |
|-------|------|-------------|
| `per_task` | `boolean` | Track cost per task |
| `per_agent` | `boolean` | Track cost per agent |
| `per_project` | `boolean` | Track cost per project |

```yaml
cost_tracking:
  per_task: true
  per_agent: true
  per_project: true
```

### 12.2 Time Estimates Sub-block

Standard time block estimates:

```yaml
time_estimates:
  simple_coordination: "5min"
  feature_planning: "30min"
  release_coordination: "2hr"
```

Or using the structured format:

```yaml
time_blocks:
  1_minute: "quick_check"
  5_minute: "config_review"
  10_minute: "pipeline_debug"
  30_minute: "architecture_review"
  1_hour: "complex_design"
  2_hour_warning: "major_refactor"
```

### 12.3 Quality Metrics Sub-block

```yaml
quality_metrics:
  workflow_efficiency: ">90%"
  agent_utilization: ">80%"
  on_time_delivery: ">95%"
```

### 12.4 KPIs Sub-block

```yaml
kpis:
  - metric: "release_velocity"
    target: "2 releases/month"

  - metric: "bug_escape_rate"
    target: "<5%"

  - metric: "cross_platform_parity"
    target: ">95%"
```

### 12.5 Decision Matrix

```yaml
decision_matrix:
  revenue_weight: 0.10
  cost_weight: 0.20
  time_weight: 0.30
  risk_weight: 0.25
  customer_impact_weight: 0.15
```

### 12.6 Cost Center Fields

```yaml
cost_center: "DEVOPS-002"
department: "Engineering"
team: "Platform"
budget_code: "ENG-DEVOPS-LEAD-2025"
roi_threshold: 1.3
```

### 12.7 Primary/Secondary KPIs

```yaml
metrics:
  primary_kpi: "deployment_velocity"
  secondary_kpis:
    - "pipeline_success_rate"
    - "build_time_p95"
    - "infrastructure_uptime"
  nps_target: 75
```

### 12.8 Full Example

```yaml
business:
  cost_tracking:
    per_task: true
    per_agent: true
    per_project: true

  time_estimates:
    simple_coordination: "5min"
    feature_planning: "30min"
    release_coordination: "2hr"

  quality_metrics:
    workflow_efficiency: ">90%"
    agent_utilization: ">80%"
    on_time_delivery: ">95%"

  kpis:
    - metric: "release_velocity"
      target: "2 releases/month"
    - metric: "bug_escape_rate"
      target: "<5%"

  decision_matrix:
    revenue_weight: 0.20
    cost_weight: 0.15
    time_weight: 0.30
    risk_weight: 0.25
    customer_impact_weight: 0.10

  cost_center: "PLATFORM-001"
  department: "Engineering"
  team: "Platform"
  budget_code: "ENG-2025"
```

---

## 13. Safety and Guardrails

Defines safety controls and emergency procedures.

### 13.1 Guardrails Sub-block

Boolean flags for safety features:

```yaml
guardrails:
  prevent_unauthorized_releases: true
  protect_signing_credentials: true
  enforce_review_process: true
  audit_all_delegations: true
  financial_limit_enforcement: true
  pii_protection: true
  legal_compliance: true
  rate_limiting: true
  idempotency_enforcement: true
  privilege_protection: true
  ethics_compliance: true
  deadline_awareness: true
  conflict_check: true
  no_autonomous_filing: true
```

### 13.2 Validation List

```yaml
validation:
  - "All tasks properly scoped"
  - "Security requirements met"
  - "Quality gates passed"
  - "Platform guidelines followed"
```

### 13.3 Emergency Controls Sub-block

```yaml
emergency:
  abort_command: "ABORT MOBILE"
  rollback_command: "ROLLBACK MOBILE"
  pause_command: "PAUSE MOBILE"
  kill_switch_enabled: true
  rollback_enabled: true
  notification_channels:
    - "slack"
    - "email"
```

### 13.4 Forbidden Operations

```yaml
forbidden_operations:
  - "court_filing"
  - "client_communication_direct"
  - "privilege_waiver"
```

### 13.5 Circuit Breaker Sub-block

```yaml
circuit_breaker:
  enabled: true
  failure_threshold: 5
  reset_timeout_seconds: 180
```

### 13.6 Input Validation Sub-block

```yaml
input_validation:
  max_input_length: 40000
  sanitize_html: true
  block_injections: true
```

### 13.7 Output Validation Sub-block

```yaml
output_validation:
  max_output_length: 80000
  pii_redaction: true
  hallucination_check: true
```

### 13.8 Monitoring Sub-block

```yaml
monitoring:
  alert_threshold: "medium"    # low, medium, high
  audit_level: "important"     # none, important, everything
  retention_days: 180
```

### 13.9 Content Filters

```yaml
content_filters:
  harmful_content: "block"
  unverified_claims: "flag"
  single_source_facts: "require_verification"
```

### 13.10 Alerts

```yaml
alerts:
  - "Approaching filing deadline"
  - "Privilege risk detected"
  - "Agent coordination failure"
```

### 13.11 Full Example

```yaml
safety:
  guardrails:
    prevent_unauthorized_releases: true
    protect_signing_credentials: true
    enforce_review_process: true
    audit_all_delegations: true
    pii_protection: true

  validation:
    - "All tasks properly scoped"
    - "Security requirements met"
    - "Quality gates passed"

  emergency:
    abort_command: "ABORT MOBILE"
    rollback_enabled: true
    kill_switch_enabled: true
    notification_channels:
      - "slack"
      - "email"

  forbidden_operations:
    - "production_deployment"
    - "billing_modification"

  circuit_breaker:
    enabled: true
    failure_threshold: 5
    reset_timeout_seconds: 180

  input_validation:
    max_input_length: 40000
    sanitize_html: true
    block_injections: true

  output_validation:
    max_output_length: 80000
    pii_redaction: true

  content_filters:
    harmful_content: "block"
    unverified_claims: "flag"
```

---

## 14. Expected Results

Defines output artifact formats and structures.

### 14.1 Artifact Definition

| Field | Type | Description |
|-------|------|-------------|
| `format` | `string` | Output format (`markdown`, `yaml`, `json`, `structured_yaml`) |
| `includes` | `array[string]` | Sections/components to include |
| `sections` | `array[string]` | Named sections |
| `audit_trail` | `boolean` | Include audit information |

### 14.2 Example Artifact Definitions

```yaml
expected_results:
  workflow_plan:
    format: "structured_yaml"
    includes:
      - "task_breakdown"
      - "agent_assignments"
      - "timeline"
      - "dependencies"
      - "risk_factors"

  progress_report:
    format: "markdown"
    sections:
      - "completed_tasks"
      - "in_progress"
      - "blockers"
      - "upcoming"
      - "metrics"

  research_report:
    format: "markdown"
    sections:
      - "executive_summary"
      - "research_methodology"
      - "key_findings"
      - "detailed_analysis"
      - "source_evaluation"
      - "confidence_assessment"
      - "citations_and_references"
      - "recommendations"
      - "limitations_and_caveats"
    metadata:
      - "confidence_score"
      - "source_count"
      - "verification_status"
      - "methodology_used"
```

### 14.3 Release Coordination Example

```yaml
release_coordination:
  format: "checklist"
  platforms:
    - "ios"
    - "android"
  stages:
    - "development"
    - "testing"
    - "security"
    - "submission"
    - "monitoring"
```

### 14.4 Legal Package Example

```yaml
legal_package:
  includes:
    - "privileged_documents"
    - "research_memos"
    - "drafted_motions"
    - "timelines"
    - "evidence_exhibits"
    - "privilege_log"
  format: "structured"
  audit_trail: true
```

### 14.5 Financial Report Example

```yaml
financial_report:
  includes:
    - "cashflow"
    - "reconciliation"
    - "forecasts"
    - "risk_assessment"
```

---

## 15. Activation

Configures how the agent is invoked.

### 15.1 Core Activation Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `keyboard_shortcut` | `string` | No | Keyboard activation (e.g., `Cmd+Shift+M M`) |
| `voice_command` | `string` | No | Voice activation phrase |
| `auto_start` | `boolean` | No | Start automatically |
| `confirmation_required` | `boolean` | No | Require confirmation |

### 15.2 Startup Message

Multi-line YAML string for initial message:

```yaml
startup_message: |
  Mobile Pack Manager ready for coordination.
  Available agents: iOS, Android, API, Build, QA, Security, App Store, Play Store
  Current projects: [LOADING]
  Pending reviews: [LOADING]
  What mobile development challenge can I help orchestrate?
```

### 15.3 Triggers

```yaml
triggers:
  - "research_request"
  - "investigation_needed"
  - "fact_check_complex"
```

### 15.4 Health Check

```yaml
health_check:
  interval: 60
  checks:
    - "agent_availability"
    - "mcp_connectivity"
    - "memory_status"
```

### 15.5 Full Example

```yaml
activation:
  keyboard_shortcut: "Cmd+Shift+M M"
  voice_command: "Mobile Manager activate"
  auto_start: false
  confirmation_required: false

  triggers:
    - "mobile_development_request"
    - "release_coordination"

  startup_message: |
    Mobile Pack Manager ready for coordination.
    Available agents: iOS, Android, API, Build, QA
    What mobile development challenge can I help orchestrate?

  health_check:
    interval: 60
    checks:
      - "agent_availability"
      - "mcp_connectivity"
      - "memory_status"
```

---

## 16. Meta Block

Configuration metadata and versioning.

### 16.1 Field Definitions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `version` | `string` | **Yes** | Agent version |
| `pack` | `string` | **Yes** | Parent pack |
| `schema_version` | `string` | **Yes** | Schema version |
| `created_at` | `string` | **Yes** | ISO 8601 datetime |
| `updated_at` | `string` | **Yes** | ISO 8601 datetime |
| `created_by` | `string` | No | Creator identifier |
| `environment` | `string` | No | Target environment |
| `deprecated` | `boolean` | No | Deprecation flag |

### 16.2 Tags and Labels

```yaml
tags:
  - "devops"
  - "lead"
  - "infrastructure"
  - "deployment"

labels:
  team: "devops"
  tier: "lead"
  criticality: "high"
  domain: "orchestration"
```

### 16.3 Full Example

```yaml
meta:
  version: "1.0.0"
  pack: "devops"
  schema_version: "1.0"
  created_at: "2025-12-28T00:00:00Z"
  updated_at: "2025-12-28T00:00:00Z"
  created_by: "platform-team"
  environment: "production"
  deprecated: false

  tags:
    - "devops"
    - "lead"
    - "infrastructure"

  labels:
    team: "devops"
    tier: "lead"
    criticality: "high"
```

---

## 17. Mission Block

Detailed mission and scope definitions.

### 17.1 Field Definitions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `purpose` | `string` | **Yes** | Core purpose statement |
| `primary_objective` | `string` | No | Primary goal |

### 17.2 Scope Sub-block

```yaml
scope:
  in_scope:
    - "agent_coordination"
    - "case_workflow_management"
    - "privilege_oversight"
    - "deadline_tracking"

  out_of_scope:
    - "court_filing"
    - "client_communication_direct"
    - "privilege_waiver_decisions"
```

### 17.3 Success Criteria

```yaml
success_criteria:
  - "zero privilege violations"
  - "all deadlines met or escalated"
  - "agent coordination efficiency >95%"
  - "complete audit trail for all operations"
```

### 17.4 Constraints Sub-block

```yaml
constraints:
  max_runtime_seconds: 7200
  max_tool_calls: 500
  max_cost_usd: 100.00
  max_tokens_total: 1000000
  max_parallel_workers: 6
```

### 17.5 Assumptions and Non-Goals

```yaml
assumptions:
  - "human attorney oversight available"
  - "all case documents in Supabase"
  - "legal research databases configured"

non_goals:
  - "autonomous court filings"
  - "direct client communications"
  - "billing operations"
```

### 17.6 Full Example

```yaml
mission:
  purpose: "Orchestrate legal operations while ensuring privilege protection"
  primary_objective: "Coordinate legal agents for efficient case management"

  scope:
    in_scope:
      - "agent_coordination"
      - "case_workflow_management"
      - "privilege_oversight"
    out_of_scope:
      - "court_filing"
      - "client_communication_direct"

  success_criteria:
    - "zero privilege violations"
    - "all deadlines met or escalated"

  constraints:
    max_runtime_seconds: 7200
    max_tool_calls: 500
    max_cost_usd: 100.00

  assumptions:
    - "human attorney oversight available"

  non_goals:
    - "autonomous court filings"
```

---

## 18. Persona Block

Detailed personality and communication style.

### 18.1 Style Sub-block

| Field | Type | Values |
|-------|------|--------|
| `formality` | `enum` | `casual`, `professional`, `executive`, `legal` |
| `voice` | `string` | `authoritative`, `decisive`, `friendly` |
| `verbosity` | `enum` | `low`, `medium`, `high` |
| `directness` | `enum` | `low`, `medium`, `high` |
| `empathy_level` | `enum` | `low`, `moderate`, `high` |
| `confidence_level` | `enum` | `low`, `moderate`, `high` |

### 18.2 Language Sub-block

```yaml
language:
  primary: "en-US"
  allowed: ["en-US", "en-GB"]
  jargon_policy: "domain-appropriate"
```

### 18.3 Humor Sub-block

```yaml
humor:
  enabled: false
  allowed_types: ["dry", "light"]
  max_frequency: "rare"
```

### 18.4 Vulgarity Sub-block

```yaml
vulgarity:
  allowed: false
  profanity_filter: "strict"    # none, moderate, strict
```

### 18.5 Behavioral Controls Sub-block

```yaml
behavioral_controls:
  no_flattery: true
  no_speculation: true
  cite_sources_when_external: true
  admit_uncertainty: true
  do_not_overpromise: true
  privilege_protection: true
  deadline_awareness: true
```

### 18.6 Full Example

```yaml
persona:
  style:
    formality: "legal"
    voice: "authoritative"
    verbosity: "high"
    directness: "high"
    empathy_level: "low"
    confidence_level: "high"

  language:
    primary: "en-US"
    allowed: ["en-US"]
    jargon_policy: "legal-appropriate"

  humor:
    enabled: false
    allowed_types: []

  vulgarity:
    allowed: false
    profanity_filter: "strict"

  behavioral_controls:
    no_flattery: true
    no_speculation: true
    cite_sources_when_external: true
    admit_uncertainty: true
    privilege_protection: true
```

---

## 19. Collaboration Block

Multi-agent delegation and communication.

### 19.1 Delegation Sub-block

```yaml
delegation:
  allowed: true
  strategy: "manager_worker"    # manager_worker, peer_to_peer, hierarchical
  max_subagents: 12
  parallelism: 6
```

### 19.2 Can Delegate To

```yaml
can_delegate_to:
  - "agent.legal.attorney.v1"
  - "agent.legal.research.v1"
  - "agent.legal.discovery.v1"
```

### 19.3 Communication Sub-block

```yaml
communication:
  style: "structured"
  protocol: "direct"
  message_format: "json"
  encryption: true
  require_status_updates: true
  status_update_format: "progress_log"
```

### 19.4 Handoffs Sub-block

```yaml
handoffs:
  require_handoff_package: true
  handoff_includes:
    - "requirements"
    - "acceptance_criteria"
    - "rollback_plan"
    - "test_plan"
    - "case_context"
    - "privilege_flags"
```

### 19.5 Full Example

```yaml
collaboration:
  delegation:
    allowed: true
    strategy: "manager_worker"
    max_subagents: 6
    parallelism: 4
    can_delegate_to:
      - "agent.legal.attorney.v1"
      - "agent.legal.research.v1"

  communication:
    style: "structured"
    require_status_updates: true

  handoffs:
    require_handoff_package: true
    handoff_includes:
      - "case_context"
      - "privilege_flags"
      - "deadline_info"
      - "quality_requirements"
```

---

## 20. Observability Block

Logging, metrics, and tracing configuration.

### 20.1 Logging Sub-block

```yaml
logging:
  level: "info"              # debug, info, warn, error
  format: "json"             # json, text
  destination: "cloud"       # cloud, local, both
  redact_pii: true
  structured: true
  include_step_ids: true
```

### 20.2 Metrics Sub-block

```yaml
metrics:
  enabled: true
  provider: "prometheus"
  push_interval_seconds: 30
  emit_cost: true
  emit_latency: true
  emit_gate_outcomes: true

  custom_metrics:
    - name: "devops_lead_tasks_total"
      type: "counter"
      description: "Total tasks handled by lead"
      labels: ["task_type", "outcome"]

    - name: "workflow_duration_seconds"
      type: "histogram"
      labels: ["workflow_type"]

    - name: "active_workflows"
      type: "gauge"
      labels: ["workflow_type", "state"]
```

### 20.3 Tracing Sub-block

```yaml
tracing:
  enabled: true
  provider: "otel"           # otel, jaeger, zipkin
  sample_rate: 0.1
  propagation: "w3c"
  correlation_id_required: true
```

### 20.4 Alerting Sub-block

```yaml
alerting:
  enabled: true
  channels:
    - "slack"
    - "pagerduty"

  rules:
    - name: "escalation_needed"
      condition: "escalation.required == true"
      severity: "high"
      channels: ["slack"]

    - name: "workflow_failure_spike"
      condition: "failure_rate > 0.10"
      severity: "critical"
      channels: ["pagerduty"]
```

### 20.5 Full Example

```yaml
observability:
  enabled: true

  logging:
    level: "info"
    format: "json"
    destination: "cloud"
    redact_pii: true

  metrics:
    enabled: true
    provider: "prometheus"
    push_interval_seconds: 30
    custom_metrics:
      - name: "agents_coordinated"
        type: "counter"
        labels: ["agent_type"]

  tracing:
    enabled: true
    provider: "otel"
    sample_rate: 0.1

  alerting:
    enabled: true
    channels: ["slack"]
    rules:
      - name: "deadline_risk"
        condition: "deadline.remaining < 24h"
        severity: "high"
```

---

## 21. Compliance Block

Legal and regulatory compliance configuration.

### 21.1 Core Fields

```yaml
compliance:
  enabled: true
```

### 21.2 Policies Sub-block

```yaml
policies:
  legal:
    requires_authority_check: true
    privilege_protection: true
    ethics_compliance: true
    frcp_compliance: true
    requires_adversarial_review: true

  privacy:
    pii_handling: "minimize"
    retention_days: 365

  messaging:
    tcpa_mode: "strict"
    ctia_mode: "strict"
    requires_opt_in_proof: true
    requires_stop_help_logic: true

  security:
    secrets_in_prompts_forbidden: true
    dependency_scan_required: true
```

### 21.3 Enforcement Sub-block

```yaml
enforcement:
  hard_block_on_violation: true
  escalation_required: true
```

### 21.4 Full Example

```yaml
compliance:
  enabled: true

  policies:
    legal:
      requires_authority_check: true
      privilege_protection: true
      ethics_compliance: true

    privacy:
      pii_handling: "minimize"
      retention_days: 365

    security:
      secrets_in_prompts_forbidden: true

  enforcement:
    hard_block_on_violation: true
    escalation_required: true
```

---

## 22. Evals Block

Evaluation and testing configuration.

### 22.1 Core Fields

```yaml
evals:
  enabled: true
  schedule: "0 3 * * *"    # Cron expression
```

### 22.2 Suites

```yaml
suites:
  - "devops_lead_core"
  - "infrastructure_design"
  - "workflow_execution"
  - "saga_compensation"
```

### 22.3 Paths

```yaml
golden_tasks_path: "/evals/devops/lead_golden_tasks.yaml"
adversarial_path: "/evals/adversarial/devops"
```

### 22.4 Metrics Thresholds

```yaml
metrics:
  accuracy_threshold: 0.88
  latency_p99_ms: 25000
  cost_per_task_max: 0.40
  safety_score_min: 0.92
```

### 22.5 Regression Testing

```yaml
regression:
  enabled: true
  max_regression_percent: 5
```

### 22.6 Notifications

```yaml
notifications:
  on_failure:
    - "#devops-evals"
    - "#platform-alerts"
```

### 22.7 Full Example

```yaml
evals:
  enabled: true
  schedule: "0 3 * * *"

  suites:
    - "devops_lead_core"
    - "infrastructure_design"

  golden_tasks_path: "/evals/devops/lead_golden_tasks.yaml"
  adversarial_path: "/evals/adversarial/devops"

  metrics:
    accuracy_threshold: 0.88
    latency_p99_ms: 25000
    cost_per_task_max: 0.40
    safety_score_min: 0.92

  regression:
    enabled: true
    max_regression_percent: 5

  notifications:
    on_failure:
      - "#devops-evals"
```

---

## 23. Full Example YAML

Complete agent definition example:

```yaml
# ===============================================================================
# RESEARCH PACK MANAGER - Research Operations Orchestrator
# AgentOS v1.0.0 | Full Schema Implementation
# ===============================================================================

# -------------------------------------------------------------------------------
# META BLOCK
# -------------------------------------------------------------------------------
meta:
  version: "1.0.0"
  pack: "research"
  schema_version: "1.0"
  created_at: "2025-12-28T00:00:00Z"
  updated_at: "2025-12-28T00:00:00Z"
  created_by: "platform-team"
  environment: "production"
  deprecated: false
  tags:
    - "research"
    - "manager"
    - "orchestration"
  labels:
    team: "research"
    tier: "manager"
    criticality: "high"

# -------------------------------------------------------------------------------
# IDENTITY BLOCK
# -------------------------------------------------------------------------------
identity:
  agent_id: "RESEARCH-MGR-00"
  name: "Research Pack Manager"
  version: "1.0.0"
  icon: "magnifying-glass"
  role: "Research Operations Orchestrator"
  pack: "research"
  is_manager: true
  slug: "research-pack-manager"

  personality:
    description: "Thorough research coordinator with expertise in verification"
    traits:
      - "Thorough"
      - "Skeptical"
      - "Synthesis-oriented"
      - "Evidence-driven"
    communication_style: "Academic and well-sourced"
    directness_level: 0.85
    formality_level: 0.75
    humor_enabled: false
    profanity_allowed: false

  lifecycle:
    status: "active"
    created: "2025-01-01"
    last_updated: "2025-12-28"
    deprecated: false

  mission: "Orchestrate comprehensive, verified research across sources"

  values:
    - "Accuracy"
    - "Verification"
    - "Source Diversity"
    - "Transparency"

  knowledge_domains:
    - "Research Methodology"
    - "Source Evaluation"
    - "Information Synthesis"
    - "Fact Verification"

# -------------------------------------------------------------------------------
# MODEL CONFIGURATION
# -------------------------------------------------------------------------------
model:
  provider: "anthropic"
  model_id: "claude-opus-4-20250514"

  parameters:
    temperature: 0.35
    top_p: 0.85
    top_k: 40
    max_tokens: 16000

  presets:
    default:
      temperature: 0.35
      max_tokens: 16000
    analysis:
      temperature: 0.2
      max_tokens: 20000
    synthesis:
      temperature: 0.4
      max_tokens: 12000

  capabilities:
    high_reasoning: true
    extended_context: true
    multi_step_analysis: true

  fallback:
    provider: "anthropic"
    model_id: "claude-sonnet-4-20250514"

# -------------------------------------------------------------------------------
# REASONING CONFIGURATION
# -------------------------------------------------------------------------------
reasoning:
  mode: "analytical"
  think_mode: "comprehensive"
  extended_thinking: true
  chain_of_thought: "research_methodology"
  reasoning_depth: 4

  research_patterns:
    - "systematic_review"
    - "triangulation"
    - "source_cross_reference"

  learning:
    mode: "continuous"
    feedback_sources:
      - "verification_accuracy"
      - "source_quality"
    fine_tune_ready: true
    update_frequency: "weekly"

# -------------------------------------------------------------------------------
# AUTHORITY & PERMISSIONS
# -------------------------------------------------------------------------------
authority:
  level: "Pack Manager"
  zone: "GREEN"
  execution_model: "semi_autonomous"
  approval_required: false

  zone_access:
    red: false
    yellow: true
    green: true

  financial_limits:
    auto_execute: 50
    require_confirmation: 200
    absolute_maximum: 1000
    daily_limit: 500
    currency: "USD"

  allowed_operations:
    - "research_orchestration"
    - "workflow_coordination"
    - "quality_aggregation"

  forbidden_operations:
    - "publishing_without_verification"
    - "single_source_conclusions"

  resource_quotas:
    api_calls_per_minute: 100
    api_calls_per_day: 10000
    tokens_per_day: 500000
    concurrent_tasks: 5

  delegation:
    can_delegate_to:
      - "research_searcher"
      - "research_verifier"
      - "research_synthesizer"
    requires_approval: false
    max_concurrent_delegations: 3

  emergency_powers:
    shutdown_on_breach: true
    alert_on_anomaly: true

# -------------------------------------------------------------------------------
# MCP SERVERS
# -------------------------------------------------------------------------------
mcp_servers:
  perplexity:
    transport: "http"
    priority: "critical"
    token_env: "PERPLEXITY_API_KEY"
    timeout_ms: 30000
    description: "AI-powered search"

  tavily:
    transport: "http"
    priority: "high"
    token_env: "TAVILY_API_KEY"
    fallback: "perplexity"
    rate_limit: "100/min"

  supabase:
    transport: "stdio"
    priority: "high"
    tables:
      - "research_projects"
      - "sources"
      - "citations"

  memory:
    transport: "stdio"
    priority: "high"
    description: "Knowledge graph"

# -------------------------------------------------------------------------------
# TOOLS & CAPABILITIES
# -------------------------------------------------------------------------------
tools:
  permission_model: "allowlist"

  primary:
    - name: "research_orchestrator"
      description: "Coordinate multi-source research workflows"
      input_schema:
        query: "string"
        methodology: "string"
      output: "research_plan"

    - name: "methodology_designer"
      description: "Design research methodology"

    - name: "quality_aggregator"
      description: "Aggregate research quality metrics"

  secondary:
    - "source_manager"
    - "workflow_tracker"

  allowlist:
    - "search.execute"
    - "supabase.read"
    - "supabase.write"

  denylist:
    - "publish.execute"

# -------------------------------------------------------------------------------
# MEMORY & CONTEXT
# -------------------------------------------------------------------------------
memory:
  enabled: true
  type: "persistent"
  storage: "supabase"
  retention: "project_lifetime"

  vector_config:
    enabled: true
    dimensions: 1536
    index_type: "HNSW"
    similarity_metric: "cosine"

  retrieval:
    strategy: "hybrid"
    semantic_weight: 0.6
    keyword_weight: 0.4
    max_results: 20
    confidence_threshold: 0.7

  contexts:
    research_history: true
    source_database: true
    methodology_templates: true

# -------------------------------------------------------------------------------
# GATES & POLICIES
# -------------------------------------------------------------------------------
gates:
  required:
    - id: "gate.quality.source_credibility"
      description: "Source credibility threshold"
      threshold: 0.80

    - id: "gate.quality.verification"
      description: "Fact verification threshold"
      threshold: 0.85

  optional:
    - id: "gate.methodology.rigor"
      threshold: 0.75

policies:
  execution:
    require_methodology: true
    require_source_diversity: true
    require_verification: true
    minimum_sources: 3

  quality:
    minimum_credibility_score: 0.70
    require_cross_reference: true

  output:
    require_citations: true
    require_confidence_scores: true

# -------------------------------------------------------------------------------
# SAFETY & GUARDRAILS
# -------------------------------------------------------------------------------
safety:
  guardrails:
    bias_awareness: true
    source_diversity_enforcement: true
    misinformation_detection: true
    claim_verification_required: true

  content_filters:
    harmful_content: "block"
    unverified_claims: "flag"
    single_source_facts: "require_verification"

  emergency:
    abort_command: "ABORT RESEARCH"
    rollback_enabled: true

# -------------------------------------------------------------------------------
# CONFIDENCE SCORING
# -------------------------------------------------------------------------------
confidence_scoring:
  enabled: true

  factors:
    source_credibility: 0.25
    cross_verification: 0.25
    recency: 0.15
    methodology_rigor: 0.20
    source_diversity: 0.15

  thresholds:
    high_confidence: 0.85
    medium_confidence: 0.65
    low_confidence: 0.45

# -------------------------------------------------------------------------------
# EXPECTED RESULTS
# -------------------------------------------------------------------------------
expected_results:
  research_report:
    format: "markdown"
    sections:
      - "executive_summary"
      - "research_methodology"
      - "key_findings"
      - "detailed_analysis"
      - "source_evaluation"
      - "confidence_assessment"
      - "citations_and_references"
      - "recommendations"
      - "limitations_and_caveats"

    metadata:
      - "confidence_score"
      - "source_count"
      - "verification_status"

# -------------------------------------------------------------------------------
# OBSERVABILITY
# -------------------------------------------------------------------------------
observability:
  enabled: true

  logging:
    level: "info"
    format: "json"
    redact_pii: true

  metrics:
    enabled: true
    provider: "prometheus"
    custom_metrics:
      - name: "research_queries_total"
        type: "counter"
        labels: ["methodology"]

  tracing:
    enabled: true
    provider: "otel"
    sample_rate: 0.1

  alerting:
    enabled: true
    channels: ["slack"]

# -------------------------------------------------------------------------------
# ACTIVATION
# -------------------------------------------------------------------------------
activation:
  keyboard_shortcut: "Cmd+Shift+R R"
  voice_command: "Research Manager activate"
  auto_start: false

  triggers:
    - "research_request"
    - "investigation_needed"
    - "fact_check_complex"

  startup_message: |
    Research Pack Manager ready.
    Agents: Searcher, Verifier, Synthesizer
    Integrations: Perplexity, Tavily, Web Search
    Methodology: Systematic with verification
    What topic should we research?

  health_check:
    interval: 60
    checks:
      - "agent_availability"
      - "mcp_connectivity"

# -------------------------------------------------------------------------------
# EVALS
# -------------------------------------------------------------------------------
evals:
  enabled: true
  schedule: "0 3 * * *"

  suites:
    - "research_accuracy"
    - "source_verification"

  metrics:
    accuracy_threshold: 0.90
    safety_score_min: 0.95

  regression:
    enabled: true
    max_regression_percent: 3
```

---

## 24. Common Patterns

### 24.1 Pack Manager Pattern

Pack managers coordinate other agents:

```yaml
identity:
  is_manager: true
  role: "{Domain} Pack Manager"

authority:
  level: "Pack Manager"
  delegation:
    can_delegate_to:
      - "{domain}_worker_1"
      - "{domain}_worker_2"
    max_concurrent_delegations: 5
```

### 24.2 Specialist Worker Pattern

Workers focus on specific tasks:

```yaml
identity:
  is_manager: false
  role: "{Specialty} Specialist"

authority:
  level: "Worker"
  delegation:
    can_delegate_to: []
```

### 24.3 High-Security Agent Pattern

For agents handling sensitive data:

```yaml
authority:
  zone: "RED"
  approval_required: true

gates:
  required:
    - id: "gate.security.sensitive_data"
      threshold: 1.0

safety:
  guardrails:
    pii_protection: true
    audit_all_operations: true
```

### 24.4 Research-Focused Pattern

For agents that gather and synthesize information:

```yaml
reasoning:
  mode: "analytical"
  extended_thinking: true
  chain_of_thought: "research_methodology"

policies:
  execution:
    require_verification: true
    minimum_sources: 3

  output:
    require_citations: true
    require_confidence_scores: true
```

### 24.5 Execution-Focused Pattern

For agents that perform actions:

```yaml
reasoning:
  mode: "execution"
  think_mode: "precision"

safety:
  guardrails:
    rollback_enabled: true
    audit_all_operations: true

emergency:
  abort_command: "ABORT {AGENT}"
  rollback_command: "ROLLBACK {AGENT}"
```

---

## 25. Anti-Patterns to Avoid

### 25.1 Unbounded Authority

**Bad:**
```yaml
authority:
  zone: "RED"
  forbidden_operations: []
  financial_limits:
    absolute_maximum: 999999
```

**Good:**
```yaml
authority:
  zone: "YELLOW"
  forbidden_operations:
    - "production_deployment"
    - "billing_modification"
  financial_limits:
    absolute_maximum: 1000
```

### 25.2 Missing Gates

**Bad:**
```yaml
gates:
  required: []
```

**Good:**
```yaml
gates:
  required:
    - id: "gate.quality.v1"
      threshold: 0.85
    - id: "gate.security.v1"
      threshold: 0.90
```

### 25.3 Unbounded Memory Retention

**Bad:**
```yaml
memory:
  retention: "forever"
  classes:
    session:
      pii_allowed: true
```

**Good:**
```yaml
memory:
  retention: "90_days"
  classes:
    session:
      pii_allowed: false
      retention_days: 30
```

### 25.4 Overly Broad Tool Access

**Bad:**
```yaml
tools:
  permission_model: "denylist"
  denylist: []
```

**Good:**
```yaml
tools:
  permission_model: "allowlist"
  allowlist:
    - "github.read"
    - "supabase.read"
```

### 25.5 Missing Safety Controls

**Bad:**
```yaml
safety:
  guardrails: {}
  emergency: {}
```

**Good:**
```yaml
safety:
  guardrails:
    pii_protection: true
    rate_limiting: true

  emergency:
    abort_command: "ABORT"
    kill_switch_enabled: true
```

### 25.6 Do-Everything Agents

**Bad:**
```yaml
identity:
  role: "Full Stack Agent"
  knowledge_domains:
    - "Everything"

allowed_operations:
  - "plan"
  - "execute"
  - "deploy"
  - "approve"
  - "bill"
```

**Good:**
```yaml
identity:
  role: "Frontend Developer"
  knowledge_domains:
    - "React"
    - "TypeScript"
    - "CSS"

allowed_operations:
  - "code_review"
  - "frontend_development"
```

### 25.7 Skipping Evaluations

**Bad:**
```yaml
evals:
  enabled: false
```

**Good:**
```yaml
evals:
  enabled: true
  suites:
    - "core_functionality"
    - "safety_checks"
  metrics:
    accuracy_threshold: 0.85
    safety_score_min: 0.90
```

---

## 26. Migration Guide v0.1 to v0.2

### 26.1 Breaking Changes

| v0.1 Field | v0.2 Field | Notes |
|------------|------------|-------|
| `agent.id` | `identity.agent_id` | Moved to identity block |
| `agent.name` | `identity.name` | Moved to identity block |
| `model` (string) | `model.model_id` | Now nested object |
| `tools` (array) | `tools.primary` | Restructured |
| `memory.type` | `memory.classes` | Multiple classes |

### 26.2 New Required Fields in v0.2

```yaml
meta:
  schema_version: "1.0"      # NEW: Required

authority:
  zone: "GREEN"              # NEW: Required
  zone_access:               # NEW: Required
    red: false
    yellow: true
    green: true

gates:
  required: []               # NEW: Required (can be empty)
```

### 26.3 Deprecated Fields

| Field | Replacement | Removal Version |
|-------|-------------|-----------------|
| `agent.model` | `model.model_id` | v1.1 |
| `tools.list` | `tools.primary` | v1.1 |
| `memory.retention_days` | `memory.classes.*.retention_days` | v1.1 |

### 26.4 Migration Script

```bash
# Convert v0.1 to v0.2
agentos migrate --from 0.1 --to 0.2 agent.yaml
```

### 26.5 Example Migration

**v0.1:**
```yaml
agent:
  id: "MOBILE-MGR-00"
  name: "Mobile Manager"
  model: "claude-sonnet-4-20250514"

tools:
  - workflow_orchestrator
  - agent_router

memory:
  type: persistent
  retention_days: 90
```

**v0.2:**
```yaml
meta:
  schema_version: "1.0"

identity:
  agent_id: "MOBILE-MGR-00"
  name: "Mobile Manager"

model:
  provider: "anthropic"
  model_id: "claude-sonnet-4-20250514"

tools:
  primary:
    - name: "workflow_orchestrator"
    - name: "agent_router"

memory:
  type: "persistent"
  classes:
    working:
      retention: "ephemeral"
    session:
      retention_days: 90

authority:
  zone: "YELLOW"
  zone_access:
    red: false
    yellow: true
    green: true

gates:
  required:
    - id: "gate.quality.v1"
      threshold: 0.85
```

---

## Appendix A: Field Type Reference

| Type | Description | Example |
|------|-------------|---------|
| `string` | Text value | `"Mobile Manager"` |
| `integer` | Whole number | `100` |
| `float` | Decimal number | `0.85` |
| `boolean` | True/false | `true` |
| `enum` | Fixed set of values | `"GREEN"` |
| `array[string]` | List of strings | `["a", "b"]` |
| `array` | List of objects | `[{...}]` |
| `object` | Nested structure | `{key: value}` |

---

## Appendix B: Enum Reference

### Zone Values
- `RED` - Critical systems
- `YELLOW` - Important systems
- `GREEN` - Standard systems

### Authority Levels
- `Pack Manager`
- `Lead`
- `Operator`
- `Worker`
- `Observer`

### Memory Types
- `ephemeral`
- `persistent`

### Transport Types
- `stdio`
- `http`
- `websocket`

### Priority Levels
- `critical`
- `high`
- `medium`
- `low`

### Reasoning Modes
- `analytical`
- `orchestration`
- `predictive`
- `creative`
- `execution`

---

## Appendix C: Validation Rules

1. **Required fields must be present**
2. **Enum values must match allowed set**
3. **Numeric ranges must be respected**
4. **Zone access must align with zone level**
5. **Delegation targets must exist in registry**
6. **Gate IDs must reference valid gates**
7. **MCP servers must have valid transport config**
8. **Memory retention must not be unbounded**
9. **Financial limits must have absolute_maximum**
10. **Safety block must have emergency controls**

---

**Document Version:** 1.0.0
**Schema Version:** 1.0
**Maintained By:** AgentOS Platform Team
