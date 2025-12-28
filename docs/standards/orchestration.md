# ORCHESTRATION.md
**AgentOS - Orchestration Semantics, Routing, and Execution Topologies (Phase 1 / Canonical)**

> This document defines how AgentOS runs work: execution topologies, framework cluster selection, routing rules, state management, durability, retries/backoff, human-in-the-loop checkpoints, promotion gates, and anti-patterns.

---

## Table of Contents

1. Purpose and Audience
2. Orchestration as a First-Class Contract
3. Core Orchestration Primitives
4. Execution Topologies
5. Framework Cluster Map (CrewAI, n8n, LangGraph, AutoGen, GitHub, Vercel)
6. Router: Decision Policy and Routing Rules
7. State Management and Durability
8. Tool Invocation Orchestration (Permissions, Safety, Retries)
9. Human-in-the-Loop: Approval Models
10. Promotion and Release Orchestration (GitHub + Vercel Rails)
11. Evaluation Gates and Scorecards in Orchestration
12. Failure Handling: Retry, Degrade, Rollback, Escalate
13. Orchestration Patterns by Domain Cluster
14. Observability Requirements (Logs, Metrics, Traces)
15. Anti-Patterns (Forbidden Behaviors)
16. Reference Workflows (Canonical)
17. Open Questions (Phase 1)

---

## 1. Purpose and Audience

AgentOS is not "multi-agent chat." It is an operating model for executing work reliably.

This document is for:
- AI/platform engineers implementing the orchestrator
- automation engineers building n8n workflows
- technical leadership defining governance and reliability standards

---

## 2. Orchestration as a First-Class Contract

### Canonical rule
**Every workflow MUST declare:**
- execution topology
- framework cluster target(s)
- state model
- tool permission scope
- gates (evaluation + approvals)
- retry/degradation policy
- escalation and rollback strategy

No implicit orchestration. No "agent decides what to do next" without a declared policy.

---

## 3. Core Orchestration Primitives

AgentOS standardizes these primitives:

### 3.1 Work Item
A unit of business intent (e.g., "ship landing page," "deploy edge function," "draft legal motion").

### 3.2 Task Graph
A directed graph of tasks with dependencies, gates, and outputs.

### 3.3 Step
A single executable action performed by an agent (may call tools).

### 3.4 Gate
A verification checkpoint that returns:
- PASS
- FAIL with required fixes
- BLOCKED (requires human approval)
- ESCALATE (risk too high)

### 3.5 Policy Overlay
A layer that restricts or modifies:
- tools
- memory writes
- model selection
- spending
- messaging rights
- production mutations

### 3.6 Promotion
A controlled move of artifacts across environments (preview -> production).

---

## 4. Execution Topologies

AgentOS supports five execution topologies. Each is used intentionally.

### 4.1 Sequential (Deterministic Pipeline)
**Best for:** deployments, migrations, compliance workflows, reproducible builds

```
Step 1 -> Gate -> Step 2 -> Gate -> Step 3 -> Done
```

**Strengths:** predictable, testable
**Weaknesses:** slower, less flexible

---

### 4.2 Hierarchical (Manager-Worker Delegation)
**Best for:** product development, design, research synthesis, legal drafting

```
         Manager Agent
        /      |      \
   Worker1  Worker2  Worker3
        \      |      /
         [Results] -> Gate -> Done
             |
         [Fail: back to Manager]
```

**Strengths:** scalable specialization
**Weaknesses:** requires strong role definitions

---

### 4.3 Parallel (Concurrent Subtasks)
**Best for:** deep research, CRO analysis, multi-variant copy, discovery mapping

```
Start -> Fork -> [Agent A, Agent B, Agent C] -> Join -> Gate -> Done
```

**Strengths:** fast coverage
**Weaknesses:** synthesis quality must be gated

---

### 4.4 Event-Driven (Triggers + State Transitions)
**Best for:** marketing ops, integrations, webhook workflows, monitoring/alerting

```
Event Trigger -> State Transition -> Agent/Action -> Gate/Policy
    |                                                    |
    v                                                    v
[Next State] <----------------------- [Recovery State on Fail]
```

**Strengths:** production-friendly automation
**Weaknesses:** requires durable state and idempotency

---

### 4.5 Human-in-the-Loop (Approval-Driven)
**Best for:** legal filings, finance actions, outbound messaging, production mutations

```
Output -> Automated Gate -> Human Approval -> Execute/Promote
                |                    |
                v                    v
            [Revise] <----------[Reject]
```

**Strengths:** enterprise defensibility
**Weaknesses:** slower; must be ergonomically designed

---

## 5. Framework Cluster Map

AgentOS routes execution into clusters based on orchestration needs.

### 5.1 CrewAI Cluster
**Use when:** role-based delegation, manager-worker workflows, business process collaboration
**Topology fit:** hierarchical, parallel

### 5.2 n8n Cluster
**Use when:** triggers, schedules, webhooks, SaaS integration, ops automation
**Topology fit:** event-driven, sequential pipelines

### 5.3 LangGraph Cluster
**Use when:** durable state machines, branching workflows, reliable retries, long-running jobs
**Topology fit:** event-driven, sequential, hybrid stateful

### 5.4 AutoGen Cluster
**Use when:** iterative conversational multi-agent loops, coding with dialogue-based refinement
**Topology fit:** hierarchical + iterative loops

### 5.5 GitHub Cluster
**Use when:** code artifacts require versioning, review, CI gates, security scanning
**Topology fit:** sequential gated promotion

### 5.6 Vercel Cluster
**Use when:** preview deployments, production deploys, rollback, web runtime validation
**Topology fit:** gated promotion + runtime checks

---

## 6. Router: Decision Policy and Routing Rules

The router selects:
- topology
- execution framework cluster(s)
- model class per step
- gate requirements

### 6.1 Router Inputs
- task graph
- risk score
- compliance requirements
- environment target (dev/preview/prod)
- cost budget and latency budget
- tool access needs

### 6.2 Router Outputs
- execution plan: topology + cluster targets
- step-by-step model routing
- tool allowlists
- gate list with pass/fail thresholds
- escalation paths

### 6.3 Default Routing Rules (Phase 1)
- **Any code change** -> GitHub cluster mandatory
- **Any web deploy** -> Vercel cluster mandatory
- **Any outbound marketing execution** -> compliance gate mandatory
- **Any legal or finance action** -> human-in-loop mandatory
- **Any long-running event workflow** -> durable state machine (LangGraph or n8n with persistence)

---

## 7. State Management and Durability

### 7.1 State Types
- **Ephemeral state:** temporary workflow variables
- **Durable state:** persisted workflow state (required for event-driven and long-running processes)
- **Audit state:** immutable event trail

### 7.2 Durable State Requirements
Event-driven workflows must implement:
- idempotency keys
- replay-safe transitions
- timeout handling
- retry policy per step
- dead-letter queue / failure sink

### State Machine Diagram

```
[*] --> Planned
Planned --> Running
Running --> AwaitingApproval
AwaitingApproval --> Running: Approved
AwaitingApproval --> Failed: Rejected
Running --> Gated
Gated --> Running: Pass
Gated --> Failed: Fail
Running --> Completed
Running --> Recovering
Recovering --> Running: Fix Applied
Recovering --> RolledBack: Unrecoverable
RolledBack --> [*]
Completed --> [*]
Failed --> [*]
```

---

## 8. Tool Invocation Orchestration

Tool calls are never "free." They are orchestrated events with controls.

### 8.1 Tool Execution Contract
Every tool call must produce:
- input schema (validated)
- permission check result
- execution result or error
- audit event (structured)
- metrics (latency, cost, retries)

### 8.2 Tool Call Lifecycle

```
Agent -> Policy Engine: Request tool access
Policy Engine -> Agent: Allow/Deny + constraints
Agent -> Validator: Validate inputs
Validator -> Agent: OK/Reject
Agent -> Tool Executor: Execute tool call
Tool Executor -> Agent: Result/Error
Agent -> Logger/Audit: Emit audit + metrics
```

### 8.3 Retry/Backoff Rules (canonical)
- retries are step-specific (not global)
- exponential backoff with jitter
- hard cap on attempts
- escalation after cap is reached
- "degrade mode" alternatives allowed only if policy permits

---

## 9. Human-in-the-Loop: Approval Models

AgentOS uses approvals to meet enterprise standards.

### 9.1 Approval Triggers
- legal filings or submissions
- financial transactions
- outbound messaging campaigns
- production mutations
- policy exceptions

### 9.2 Approval Mechanisms (conceptual)
- PR review gates (GitHub)
- deployment promotion approvals (Vercel / internal)
- workflow checkpoint approvals (n8n/LangGraph)
- manual override with audit logging

---

## 10. Promotion and Release Orchestration (GitHub + Vercel Rails)

### 10.1 GitHub: The Code Governance Gate
- PR required for any code change
- CI required: tests/lint/typecheck/security
- required reviews / CODEOWNERS
- merge policy enforced

### 10.2 Vercel: The Runtime Promotion Gate
- preview deploy created automatically
- preview validated (UX/perf/compliance)
- promotion to production gated
- rollback always available

### Promotion Pipeline

```
Dev/Local -> Pull Request -> CI Gates -> Vercel Preview -> Runtime Checks
    -> Promotion Approval -> Production Deploy -> Monitoring -> Rollback (if issue)
```

---

## 11. Evaluation Gates and Scorecards in Orchestration

Gates are executable checks.

### 11.1 Gate Types (canonical)
- **Static:** linting, schema validation
- **Dynamic:** tests, smoke tests, integration tests
- **Behavioral:** correctness review, hallucination detection
- **Policy:** compliance and security rules
- **UX:** conversion + accessibility scorecards

### 11.2 Gate Outputs
- PASS
- FAIL + required fixes
- BLOCKED + requires approval
- ESCALATE + requires escalation path

---

## 12. Failure Handling

AgentOS supports four failure responses:

### 12.1 Retry (Recoverable)
- transient tool failure
- rate limiting
- network errors

### 12.2 Degrade (Fallback)
- alternative model
- alternative tool
- reduced scope (only if policy allows)

### 12.3 Rollback (Unrecoverable or Production Risk)
- revert deployment
- revert code changes
- halt campaign

### 12.4 Escalate (High Stakes)
- human intervention required
- explicit incident workflow

---

## 13. Orchestration Patterns by Domain Cluster

### 13.1 Design (UI/UX)
- hierarchical + parallel exploration
- strict UX scorecard gate
- handoff artifact required before engineering starts

### 13.2 Web (Corporate + Landers)
- sequential build -> preview -> runtime gates
- CRO tests and analytics instrumentation required

### 13.3 Mobile (iOS/Android)
- sequential build/test/release
- pass/fail release gate required before store submission

### 13.4 Supabase / DB / Edge Functions
- sequential migrations with rollback
- RLS/security gates mandatory
- performance/cost gates mandatory

### 13.5 Marketing (Twilio/Sinch)
- event-driven execution
- compliance gate mandatory
- deliverability/throughput planner required
- monitoring + optimization loop

### 13.6 Legal / Finance
- human-in-loop mandatory
- adversarial review mandatory
- audit trail mandatory

---

## 14. Observability Requirements

Orchestration is incomplete without observability.

### 14.1 Required Signals
- workflow start/end timestamps
- per-step duration
- tool call latencies and errors
- model usage and cost estimates
- gate pass/fail rates
- rollback and incident counts

### 14.2 Event Schema (conceptual)
Every step emits:
- `workflow_id`
- `step_id`
- `agent_role`
- `tool_name` (if any)
- `policy_snapshot_hash`
- `gate_results`
- `cost_estimate`
- `risk_flags`
- `timestamp`

---

## 15. Anti-Patterns (Forbidden)

These are forbidden by architecture:

1. **Implicit autonomy**: agents picking topology without policy
2. **Tool sprawl**: unrestricted tool access
3. **No gates**: shipping without verification
4. **No audit**: actions without logs
5. **Non-idempotent webhooks**: event-driven flows without replay safety
6. **Production mutation without rollback**
7. **Memory writes without policy**
8. **Compliance bypass** for messaging and legal/finance work
9. **Evaluation ignored** (no regression tracking)

---

## 16. Reference Workflows (Canonical)

### 16.1 "Ship a Landing Page"
1. Design pack produces spec + UX gate
2. Dev pack builds feature branch
3. PR triggers CI gates
4. Vercel preview deploy
5. Runtime checks: CRO + perf + compliance
6. Promote to production
7. Monitor and rollback if regression

### 16.2 "Deploy Edge Function"
1. Plan
2. Implement (edge function agent)
3. Security/RLS gate
4. Integration tests
5. Promote with rollback plan

### 16.3 "Run Messaging Campaign"
1. Segment + copy + throughput plan
2. Compliance gate (TCPA/CTIA)
3. Event-driven execution via n8n
4. Monitoring loop
5. Auto-pause on anomaly + escalate

---

## 17. Open Questions (Phase 1)

- Standardization of gate tooling (internal harness vs OSS)
- Durable state store selection
- Unified policy engine implementation
- Standardized incident automation integration (n8n + GitHub issues + alerts)

These are resolved in later docs and implementation.

---

## Next Document

Proceed to: **`agents.md`**
- canonical agent taxonomy
- YAML standards and required fields
- tool allowlists and permissions
- memory policies
- evaluator/gate agent patterns
- persona controls (professional/humor/vulgarity modes)

Orchestration is now defined. Next we define what an "agent" is in AgentOS.
