# 02 - Core Concepts

Understanding the fundamental building blocks of AgentOS. This document covers agents, packs, the runtime engine, gates, and how they work together.

---

## Overview

AgentOS is built on four core concepts that work together to provide a production-ready AI agent orchestration platform:

1. **Agents** - YAML-defined autonomous workers
2. **Packs** - Domain-specific collections of agents
3. **Runtime** - TypeScript orchestration engine
4. **Gates** - Quality and security checkpoints

---

## Agents

An **Agent** is a formally specified runtime actor that performs specific tasks within defined constraints.

### What Makes an Agent

An agent has:
- **Mission** - Explicit purpose and scope
- **Constraints** - Runtime limits (tokens, cost, time)
- **Tools** - Restricted allowlist of capabilities
- **Gates** - Quality checks for outputs
- **Audit** - Events and metrics emission

### Agent Categories

| Category | Purpose | Examples |
|----------|---------|----------|
| Planning | Task decomposition, risk estimation | Roadmap planner, Sprint planner |
| Research | Search, verification, synthesis | Searcher, Verifier, Synthesizer |
| Design | UX research, UI specs | UX researcher, UI designer |
| Engineering | Development, testing | Code analyst, Debugger |
| Execution | Marketing, deployments | Campaign executor, Deployer |
| Governance | Compliance, security | Policy enforcer, DLP gatekeeper |
| Recovery | Error handling, rollback | Error predictor, Patch builder |

### Agent YAML Structure

Every agent is defined in YAML with required sections:

```yaml
# Identity - Who is this agent?
identity:
  agent_id: "PROD-PRD-01"
  name: "PRD Writer"
  version: "1.0.0"
  role: "Product Requirements Document Writer"
  pack: "product"
  is_manager: false

  personality:
    traits: ["User-centric", "Detail-oriented"]
    communication_style: "Clear and structured"
    directness_level: 0.85
    humor_enabled: false

  mission: "Create comprehensive PRDs from product briefs"

# Model - Which LLM to use?
model:
  provider: "anthropic"
  model_id: "claude-sonnet-4-20250514"
  parameters:
    temperature: 0.4
    max_tokens: 10000

# Authority - What can this agent do?
authority:
  level: "Worker"
  zone: "YELLOW"
  allowed_operations:
    - "document_creation"
    - "research_queries"
  forbidden_operations:
    - "production_deployment"
    - "financial_commitments"

# Tools - What capabilities are available?
tools:
  primary:
    - name: "prd_generator"
      description: "Generate PRD from brief"

# Gates - Quality checkpoints
gates:
  required:
    - id: "gate.quality.prd_completeness"
      threshold: 0.90
```

### Agent Lifecycle

```
Define YAML --> Validate Schema --> Run in Workflow --> Gate Evaluation
                                                              |
                                    [Pass] --> Execute / Promote Artifact
                                    [Fail] --> Fix Loop --> Retry
```

---

## Agent Packs

A **Pack** is a domain-specific bundle of agents that work together. Packs provide reusable, governed collections for specific domains.

### What Packs Include

Every pack contains:
- **Agents and Subagents** - The workers
- **Pack Manager** - Orchestrating agent
- **Gates and Evaluators** - Quality controls
- **Tool Permissions** - Allowlists
- **Workflows** - Standard processes
- **Memory Policies** - Data retention rules

### Available Packs

| Pack | Status | Agents | Purpose |
|------|--------|--------|---------|
| Product | Production | 6 | PRDs, user stories, roadmaps |
| Marketing | Production | 7 | Campaigns, content, SEO |
| Supabase | Production | 6 | Database, auth, edge functions |
| Engineering | Production | 8 | Code analysis, architecture |
| Design | Production | 5 | UI/UX, design systems |
| DevOps | Beta | 9 | Infrastructure, CI/CD |
| QA | Beta | 5 | Testing, automation |
| Legal | Beta | 7 | Research, discovery |
| Mobile | Beta | 9 | iOS, Android development |
| Research | Alpha | 4 | Deep research, synthesis |
| Planning | Alpha | 6 | Project planning |
| Analytics | Alpha | 4 | Data analysis |
| Orchestration | Alpha | 3 | Task coordination |
| Error Predictor | Alpha | 5 | Failure prediction |

### Pack Hierarchy

```
Core Packs (Required)
    |
    v
Domain Packs (Product, Engineering, etc.)
    |
    v
Gate Packs (Quality, Security, Compliance)
    |
    v
Project Overlays (Custom configurations)
```

### Pack Composition

Packs use merge overlays for configuration:

```yaml
# Base pack definition
pack:
  id: "pack.core.product.v1"
  name: "Product Pack"
  version: "1.0.0"

  manager: "agent.product.pack_manager.v1"

  agents:
    - "agent.product.prd_writer.v1"
    - "agent.product.user_story.v1"
    - "agent.product.roadmap.v1"

  dependencies: []

  gates:
    required:
      - "gate.quality.v1"
      - "gate.security.v1"
```

---

## Runtime Engine

The **Runtime** is a TypeScript orchestration engine that executes agents, enforces policies, and manages state.

### Core Components

| Component | Purpose |
|-----------|---------|
| **Orchestrator** | Routes tasks, manages lifecycle |
| **Task Router** | Intelligent routing based on capabilities |
| **State Store** | Persistent state management |
| **Policy Engine** | Configurable rules and quotas |
| **Model Router** | Multi-provider LLM management |
| **Gates** | Checkpoint execution |
| **Approvals** | Human-in-the-loop workflow |
| **Audit** | Comprehensive logging |

### Data Flow

```
1. Request --> Orchestrator
2. Orchestrator --> Policy Engine (validate)
3. Policy Engine --> Task Router (route)
4. Task Router --> Agent Pack (execute)
5. Agent Pack --> Gates (checkpoint)
6. Gates --> Approvals (if required)
7. Agent Pack --> Model Router --> LLM Provider
8. Response --> State Store (persist)
9. State Store --> Audit (log)
10. Response --> Caller
```

### Run Context

Every agent execution creates a Run Context:

```typescript
interface RunContext {
  run_id: string;          // Unique run identifier
  agent: AgentYAML;        // Agent configuration
  status: RunStatus;       // pending | running | completed | failed
  zone: 'red' | 'yellow' | 'green';  // Security zone
  messages: Message[];     // Conversation history
  tool_calls: ToolCall[];  // Tool execution history
  cost_usd: number;        // Accumulated cost
  tokens: { input: number; output: number };
  started_at: string;
  ended_at?: string;
  error?: { code: string; message: string };
}
```

---

## Gates

**Gates** are checkpoint systems that validate agent outputs before side effects occur.

### Gate Types

| Type | Purpose | Example |
|------|---------|---------|
| Quality | Validate output quality | Completeness, clarity |
| Security | Detect sensitive data | PII detection, secrets |
| Compliance | Regulatory requirements | TCPA, CTIA |
| Review | Human approval | High-risk actions |

### Gate Execution

```typescript
// Gate check result
interface GateResult {
  gate_id: string;
  status: 'passed' | 'failed' | 'skipped';
  checks: GateCheckResult[];
  blocking_failures: GateCheckResult[];
  duration_ms: number;
}

// Run a gate
const result = await runGate(gate, agentId, output, zone);
if (result.status === 'failed') {
  // Handle failure - retry or escalate
}
```

### Built-in Checks

AgentOS provides built-in gate checks:

| Check | Description |
|-------|-------------|
| `output_not_empty` | Output must have content |
| `output_length` | Check min/max length |
| `contains_text` | Required text present |
| `regex_match` | Pattern matching |
| `json_valid` | Valid JSON output |
| `no_pii` | No PII detected |
| `cost_within_budget` | Within cost limit |

### Gate Policy Example

```yaml
# Gate policy definition
gates:
  required:
    - id: "gate.quality.v1"
      description: "Quality validation"
      type: "quality"
      threshold: 0.90
      checks:
        - name: "output_not_empty"
          blocking: true
        - name: "no_pii"
          blocking: true
          severity: "critical"
```

---

## Security Zones

AgentOS uses a zone system to control permissions:

| Zone | Color | Access Level | Use Case |
|------|-------|--------------|----------|
| RED | High Risk | Requires approval | Billing, legal, evidence |
| YELLOW | Medium Risk | Requires tests + review | APIs, core services |
| GREEN | Low Risk | Full autonomy | Features, documentation |

### Zone Enforcement

```yaml
# Agent authority defines zone access
authority:
  zone: "YELLOW"
  zone_access:
    red: false      # Cannot access red zone
    yellow: true    # Can operate in yellow zone
    green: true     # Can operate in green zone
```

---

## Memory Model

AgentOS implements a governed memory model:

| Memory Type | Retention | Use Case |
|-------------|-----------|----------|
| Working | Ephemeral | Current task context |
| Session | 30 days | Conversation history |
| Long-term | Years | Approved knowledge |
| Audit | Years | Immutable logs |

### Memory Configuration

```yaml
memory:
  type: "persistent"
  storage: "supabase"

  vector_config:
    enabled: true
    dimensions: 1536
    similarity_metric: "cosine"

  retrieval:
    strategy: "hybrid"
    semantic_weight: 0.6
    keyword_weight: 0.4
```

---

## Common Pitfalls

### Agents Without Gates

**Problem**: Deploying agents without quality gates
**Solution**: Always define required gates in YAML

### Unbounded Permissions

**Problem**: Agents with overly broad tool access
**Solution**: Use explicit allowlists, minimal permissions

### Missing Zone Restrictions

**Problem**: Workers accessing red zone resources
**Solution**: Enforce zone access in authority configuration

### Ignoring Cost Limits

**Problem**: Agents running up LLM costs
**Solution**: Set per-run and per-step budgets

---

## Next Steps

Now that you understand the core concepts:

1. **[First Agent](./03-first-agent.md)** - Create your own agent
2. **[Agent Packs](./04-packs.md)** - Deep dive into packs
3. **[Runtime](./05-runtime.md)** - Configure the runtime engine

---

Previous: [01 - Quickstart](./01-quickstart.md) | Next: [03 - First Agent](./03-first-agent.md)
