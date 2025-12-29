# 04 - Agent Packs

Agent Packs are domain-specific bundles of agents that work together. This guide explains how packs are structured, how to use existing packs, and how to create your own.

---

## Overview

A Pack is not just a collection of agents - it is a complete, governed solution for a specific domain. Packs provide:

- **Agents and Subagents** - The workers that perform tasks
- **Pack Manager** - The orchestrating agent that coordinates work
- **Gates** - Quality and compliance checkpoints
- **Workflows** - Standard processes and patterns
- **Tool Permissions** - Controlled access to capabilities

---

## Prerequisites

- Completed [02 - Core Concepts](./02-concepts.md)
- Completed [03 - First Agent](./03-first-agent.md)
- Understanding of YAML configuration

---

## Pack Structure

Every pack follows this standard structure:

```
agents/packs/{pack_name}/
|-- AGENT_PACK.md           # Pack documentation
|-- agents/                 # Agent definitions
|   |-- {pack}_pack_manager.yaml
|   |-- {pack}_agent_1.yaml
|   |-- {pack}_agent_2.yaml
|   +-- ...
+-- workflows/              # Optional workflow definitions
```

---

## Production Packs

AgentOS includes 5 production-ready packs:

### Product Pack

**Purpose**: Product management, PRDs, user stories, roadmaps

```yaml
pack:
  id: "pack.core.product.v1"
  name: "Product Pack"
  domain: "product"
  lifecycle_stage: "production"
  agents_count: 6
  manager: "agent.product.pack_manager.v1"

  agents:
    - "agent.product.pack_manager.v1"    # Orchestrates product work
    - "agent.product.prd_writer.v1"       # Writes PRDs
    - "agent.product.user_story.v1"       # Creates user stories
    - "agent.product.roadmap.v1"          # Manages roadmaps
    - "agent.product.analytics.v1"        # Analyzes metrics
    - "agent.product.stakeholder.v1"      # Stakeholder communication

  integrations:
    - "jira"
    - "linear"
    - "notion"
```

**Usage**:

```bash
# Run the product pack manager
npm run pack:run -- --pack product --task "Create PRD for user authentication feature"
```

### Engineering Pack

**Purpose**: Software development, architecture, code analysis

```yaml
pack:
  id: "pack.core.engineering.v1"
  name: "Engineering Pack"
  domain: "engineering"
  agents_count: 8

  agents:
    - "agent.engineering.pack_manager.v1"     # Orchestrates
    - "agent.engineering.product_developer.v1" # Feature development
    - "agent.engineering.architecture.v1"      # System design
    - "agent.engineering.code_analysis.v1"     # Code review
    - "agent.engineering.performance.v1"       # Performance tuning
    - "agent.engineering.plumber.v1"           # Integration work
    - "agent.engineering.refactor.v1"          # Code cleanup
    - "agent.engineering.debugger.v1"          # Bug fixing

  dependencies:
    - "pack.core.design.v1"
```

### Design Pack

**Purpose**: UI/UX design, design systems, accessibility

```yaml
pack:
  id: "pack.core.design.v1"
  name: "Design Pack"
  domain: "design"
  agents_count: 5

  agents:
    - "agent.design.pack_manager.v1"
    - "agent.design.uiux.v1"          # UX research and design
    - "agent.design.system.v1"         # Design system management
    - "agent.design.accessibility.v1"  # Accessibility audits
    - "agent.design.prototyping.v1"    # Prototype creation

  integrations:
    - "figma"
    - "storybook"
```

### Marketing Pack

**Purpose**: Campaigns, content, SEO, messaging

```yaml
pack:
  id: "pack.core.marketing.v1"
  name: "Marketing Pack"
  domain: "marketing"
  agents_count: 7

  agents:
    - "agent.marketing.pack_manager.v1"
    - "agent.marketing.content_writer.v1"
    - "agent.marketing.seo.v1"
    - "agent.marketing.social_media.v1"
    - "agent.marketing.email.v1"
    - "agent.marketing.analytics.v1"
    - "agent.marketing.campaign.v1"
```

### Supabase Pack

**Purpose**: Database, authentication, edge functions

```yaml
pack:
  id: "pack.core.supabase.v1"
  name: "Supabase Pack"
  domain: "supabase"
  agents_count: 6

  agents:
    - "agent.supabase.pack_manager.v1"
    - "agent.supabase.database.v1"       # Schema design
    - "agent.supabase.auth.v1"           # Authentication setup
    - "agent.supabase.storage.v1"        # File storage
    - "agent.supabase.edge_functions.v1" # Serverless functions
    - "agent.supabase.realtime.v1"       # Real-time subscriptions
```

---

## Using Packs

### Listing Available Packs

```bash
# List all registered packs
npm run pack:list

# Output:
# Pack Registry (14 packs)
# -------------------------
# PRODUCTION (5):
#   product      - Product Pack (6 agents)
#   engineering  - Engineering Pack (8 agents)
#   design       - Design Pack (5 agents)
#   marketing    - Marketing Pack (7 agents)
#   supabase     - Supabase Pack (6 agents)
#
# BETA (4):
#   devops       - DevOps Pack (9 agents)
#   qa           - QA Pack (5 agents)
#   legal        - Legal Pack (7 agents)
#   mobile       - Mobile Pack (9 agents)
#
# ALPHA (5):
#   research     - Research Pack (4 agents)
#   planning     - Planning Pack (6 agents)
#   analytics    - Analytics Pack (4 agents)
#   orchestration - Orchestration Pack (3 agents)
#   error_predictor - Error Predictor Pack (5 agents)
```

### Running a Pack

```bash
# Run a pack with a task
npm run pack:run -- --pack product --task "Analyze competitor pricing strategies"

# Run with specific agent
npm run pack:run -- --pack engineering --agent code_analysis --input code.ts
```

### Pack Manager Workflow

When you run a pack, the pack manager:

1. **Analyzes the task** - Understands what needs to be done
2. **Routes to agents** - Delegates to appropriate specialists
3. **Coordinates work** - Manages parallel execution
4. **Aggregates results** - Combines outputs from agents
5. **Applies gates** - Runs quality checks

```
Task Request
     |
     v
Pack Manager (Orchestrator)
     |
     +---> Agent 1 (Parallel)
     |
     +---> Agent 2 (Parallel)
     |
     +---> Agent 3 (Sequential, depends on 1 & 2)
     |
     v
Gate Validation
     |
     v
Final Output
```

---

## Creating a Custom Pack

### Step 1: Create Pack Directory

```bash
mkdir -p agents/packs/mypack/agents
```

### Step 2: Create Pack Documentation

Create `agents/packs/mypack/AGENT_PACK.md`:

```markdown
# My Custom Pack

## Overview
Description of what this pack does.

## Agents
- Pack Manager - Orchestrates workflows
- Agent 1 - Does X
- Agent 2 - Does Y

## Workflows
1. Standard workflow description

## Gates
- Quality gate requirements

## Usage
How to use this pack.
```

### Step 3: Create Pack Manager

Create `agents/packs/mypack/agents/mypack_pack_manager.yaml`:

```yaml
identity:
  agent_id: "MYPACK-MGR-00"
  name: "MyPack Manager"
  version: "1.0.0"
  role: "Pack Orchestrator"
  pack: "mypack"
  is_manager: true

  mission: "Orchestrate mypack workflows"

model:
  provider: "anthropic"
  model_id: "claude-sonnet-4-20250514"
  parameters:
    temperature: 0.4
    max_tokens: 10000

authority:
  level: "Pack Manager"
  zone: "YELLOW"
  allowed_operations:
    - "agent_delegation"
    - "workflow_management"
    - "task_routing"
    - "progress_tracking"

  delegation:
    can_delegate_to:
      - "mypack_worker_1"
      - "mypack_worker_2"
    max_concurrent_delegations: 3

gates:
  required:
    - id: "gate.quality.v1"
      threshold: 0.90

activation:
  startup_message: |
    MyPack Manager ready.
    Available agents: Worker 1, Worker 2
    What would you like to accomplish?
```

### Step 4: Create Worker Agents

Create `agents/packs/mypack/agents/mypack_worker_1.yaml`:

```yaml
identity:
  agent_id: "MYPACK-W1-01"
  name: "MyPack Worker 1"
  version: "1.0.0"
  role: "Specialized Worker"
  pack: "mypack"
  is_manager: false

  mission: "Perform specialized task 1"

model:
  provider: "anthropic"
  model_id: "claude-sonnet-4-20250514"
  parameters:
    temperature: 0.3
    max_tokens: 8000

authority:
  level: "Worker"
  zone: "GREEN"
  allowed_operations:
    - "task_execution"
    - "report_generation"

gates:
  required:
    - id: "gate.quality.v1"
      threshold: 0.85
```

### Step 5: Register the Pack

Update `agents/PACK_REGISTRY.yaml`:

```yaml
packs:
  # ... existing packs ...

  - id: "pack.custom.mypack.v1"
    name: "My Custom Pack"
    domain: "custom"
    lifecycle_stage: "development"
    version: "0.1.0"
    path: "agents/packs/mypack"
    description: "My custom pack for X"
    agents_count: 3
    manager: "agent.mypack.pack_manager.v1"
    agents:
      - "agent.mypack.pack_manager.v1"
      - "agent.mypack.worker_1.v1"
      - "agent.mypack.worker_2.v1"
    dependencies: []
```

### Step 6: Validate and Test

```bash
# Validate the pack
npm run validate -- --pack mypack

# Test the pack
npm run pack:test -- --pack mypack
```

---

## Pack Composition

Packs can be composed using overlays:

```
Base Agent Template
       |
       v
Domain Pack Defaults
       |
       v
Environment Overlay (dev/staging/prod)
       |
       v
Final Resolved Configuration
```

### Environment Overlays

```yaml
# prod_overlay.yaml
environment:
  name: "production"

overrides:
  authority:
    zone_access:
      red: false    # No red zone in prod for most agents

  policies:
    execution:
      max_retries: 5      # More retries in prod
      require_approval: true

  gates:
    required:
      - "gate.security.prod.v1"  # Additional prod gate
```

Apply overlay:

```bash
npm run pack:run -- --pack product --overlay prod_overlay.yaml
```

---

## Pack Dependencies

Packs can depend on other packs:

```yaml
pack:
  id: "pack.core.engineering.v1"
  dependencies:
    - "pack.core.design.v1"    # Can use design agents
```

This allows:
- Cross-pack agent delegation
- Shared gate policies
- Consistent tool access

---

## Pack Gates and Workflows

### Standard Gates

All packs should include these gates:

```yaml
gates:
  required:
    - id: "gate.quality.v1"
      type: "quality"
      description: "Basic quality validation"
      checks:
        - "output_not_empty"
        - "format_valid"

    - id: "gate.security.v1"
      type: "security"
      description: "Security validation"
      checks:
        - "no_pii"
        - "no_secrets"
```

### Workflow Patterns

Common pack workflow patterns:

**Sequential Workflow**:
```
Manager -> Agent 1 -> Agent 2 -> Agent 3 -> Output
```

**Parallel Workflow**:
```
         +-> Agent 1 --+
Manager -+-> Agent 2 --+-> Aggregator -> Output
         +-> Agent 3 --+
```

**Gate-Controlled Workflow**:
```
Manager -> Agent 1 -> GATE -> Agent 2 -> GATE -> Output
                        |                   |
                      FAIL                FAIL
                        |                   |
                     Retry              Retry
```

---

## Common Pitfalls

### Missing Pack Manager

**Problem**: Pack without a manager agent
**Solution**: Every pack must have an `is_manager: true` agent

### Circular Dependencies

**Problem**: Pack A depends on Pack B, which depends on Pack A
**Solution**: Refactor to break the cycle or extract shared functionality

### Inconsistent Zones

**Problem**: Manager in GREEN zone trying to delegate to YELLOW agent
**Solution**: Managers should be in same or higher zone than workers

### Unregistered Pack

**Problem**: Pack not appearing in registry
**Solution**: Add pack to `PACK_REGISTRY.yaml`

---

## Next Steps

Now that you understand packs:

1. **[Runtime](./05-runtime.md)** - Configure runtime behavior
2. **[Security](./06-security.md)** - Add security measures
3. **[Ops Console](./07-ops-console.md)** - Monitor your packs

---

Previous: [03 - First Agent](./03-first-agent.md) | Next: [05 - Runtime](./05-runtime.md)
