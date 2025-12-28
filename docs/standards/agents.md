# AGENTS.md
**AgentOS - Agent Taxonomy, Standards, and Exhaustive YAML Specification (Phase 1 / Canonical)**

> This document is the canonical definition of an "Agent" in AgentOS: what it is, what it is not, how it is governed, and how it must be specified.
> It also defines the **exhaustive YAML parameter schema** for agents and sub-agents, designed for **Fortune-grade repeatability, auditability, safety, and performance**.

---

## Table of Contents

1. Why This Document Exists
2. Canonical Definitions (Agent / Sub-agent / Evaluator / Gate / Pack)
3. Agent Taxonomy (Classes and Roles)
4. Agent Lifecycle (Design -> Run -> Evaluate -> Learn)
5. YAML Standard: Philosophy and Rules
6. **Exhaustive YAML Parameter Schema (250-300+ fields)**
7. Parameter Clusters (How we keep YAML sane)
8. Evaluators and Gates (Pass/Fail Agents)
9. Tooling Model (Permissions, Sandboxing, Side Effects)
10. Memory Model (Working, Session, Long-Term, Audit)
11. Feedback Learning + Fine-Tuning Hooks
12. Multi-Provider Model Routing (GPT/Claude/Gemini/DeepSeek)
13. Safety, Tone, Humor, Vulgarity Controls
14. Error Prediction + Pre-mortem Architecture
15. Required Templates (Naming, IDs, Versioning)
16. Anti-Patterns (Forbidden Agent Designs)
17. Appendix: Canonical YAML Skeletons (Agent + Sub-agent + Gate)

---

## 1. Why This Document Exists

AgentOS only works if "agent" means the same thing everywhere.

Without a strict definition:
- roles blur
- tool permissions sprawl
- memory becomes unsafe
- evaluations become optional
- cost and latency become unbounded
- production incidents become untraceable

This document prevents that.

---

## 2. Canonical Definitions

### 2.1 Agent
An **Agent** is a formally specified runtime actor that:
- has an explicit mission and scope
- operates under declared constraints
- has a restricted tool allowlist
- produces outputs that pass gates
- emits audit events and metrics

**Agents do not self-define their authority.**
Authority comes from policy.

### 2.2 Sub-agent
A **Sub-agent** is a specialized agent invoked by another agent or workflow step.
- Narrow scope
- Short lifespan
- Fewer tools
- Often parallelizable

### 2.3 Evaluator Agent
An **Evaluator** judges outputs against a scorecard and returns PASS/FAIL + fixes.

### 2.4 Gate
A **Gate** is an evaluator checkpoint in a workflow (automated or human-in-loop).

### 2.5 Agent Pack
A domain bundle (Design pack, Mobile pack, Legal pack) defining:
- agents + subagents
- default workflows
- required gates
- tool permissions
- evaluation scorecards

---

## 3. Agent Taxonomy (Classes and Roles)

AgentOS uses a functional taxonomy:

### 3.1 Planning Agents
- Task decomposition
- Risk and cost estimation
- Workflow graph creation
- Tool and model routing suggestion (non-binding)

### 3.2 Research Agents
- Parallel search, retrieval, citation enforcement
- Claims verification
- Synthesis

### 3.3 Design Agents
- UX research
- UI design spec
- Design systems tokens
- CRO optimization
- Accessibility validation

### 3.4 Engineering Agents
- Web dev, mobile dev, backend dev
- Supabase/DB/Edge functions
- Integrations and webhooks
- Testing and QA

### 3.5 Execution Agents (Ops)
- Marketing execution (Twilio/Sinch)
- Deployment execution
- Incident response execution

### 3.6 Governance Agents
- Compliance checker
- Security reviewer
- Privacy/DLP gatekeeper
- Budget enforcement

### 3.7 Recovery Agents
- Error predictor
- Root cause analyzer
- Patch builder
- Rollback controller
- Postmortem writer

---

## 4. Agent Lifecycle

```
Design Agent Spec -> Validate YAML Schema -> Run Agent in Workflow -> Gate Evaluation
    |                                                                        |
    |                                                    [Pass] -> Promote Artifact / Execute
    |                                                    [Fail] -> Fix Loop
    |
    <- Learn / Improve <- Monitor + Evaluate <-
```

---

## 5. YAML Standard: Philosophy and Rules

### 5.1 YAML is the Contract
YAML is not "configuration." It is:
- legal authority boundary
- operational guardrail
- auditable contract
- portability layer across frameworks

### 5.2 Parameter Clusters (required)
To support 250-300+ parameters **without becoming unusable**, AgentOS mandates:
- grouped clusters (namespaces)
- inheritance/overrides
- pack-level defaults
- environment overlays

### 5.3 Strictness
- Unknown fields: **error**
- Missing required fields: **error**
- Invalid enum: **error**
- Unsafe tool permission: **error**
- Unbounded memory retention: **error**

---

## 6. Exhaustive YAML Parameter Schema (250-300+ fields)

Below is the **canonical exhaustive schema** organized into clusters.
An implementation may store these as:
- one YAML file per agent
- pack + overlays
- YAML -> JSON schema conversion for validation

> Note: fields are grouped; total fields exceed 250 when fully expanded across nested objects.

---

### 6.1 Root Metadata Cluster (agent.*)

```yaml
agent:
  id: "agent.product.manager.v1"
  name: "Product Manager Agent"
  short_name: "PM"
  version: "1.0.0"
  lifecycle_stage: "production"          # draft|beta|production|deprecated
  created_at: "2025-12-28"
  updated_at: "2025-12-28"
  owner_team: "platform"
  owner_contact: "ops@company"
  domain: "product"
  category: "manager"                    # manager|worker|evaluator|gate|recovery
  tags: ["product", "planning", "governance"]
  description: "Owns product planning, delegation, and delivery gates."
  changelog_ref: "DECISION_LOG.md#pm-v1"
  documentation_ref: "AGENTS.md#pm-agent"
  compatibility:
    agentos_version_min: "1.0.0"
    agentos_version_max: "1.9.x"
  identifiers:
    slug: "pm-agent"
    canonical_role: "product_manager"
    persona_profile_id: "persona.exec.professional.v1"
```

**Fields covered:** ~20+

---

### 6.2 Mission and Scope Cluster (mission.*)

```yaml
mission:
  purpose: "Translate intent into an executable plan and govern delivery."
  scope:
    in_scope:
      - "define requirements"
      - "generate task graphs"
      - "delegate to engineers"
      - "enforce gates"
    out_of_scope:
      - "direct production deployments"
      - "send customer messages"
      - "legal sign-off"
  success_criteria:
    - "requirements complete and testable"
    - "workflow plan includes gates and rollback"
    - "no unapproved production changes"
  constraints:
    max_runtime_seconds: 1800
    max_tool_calls: 120
    max_cost_usd: 12.00
    max_tokens_total: 250000
    max_parallel_workers: 8
  assumptions:
    - "CI/CD exists and is enforced"
    - "tool registry provides permissions"
  non_goals:
    - "creative writing without business objective"
```

**Fields covered:** ~25+

---

### 6.3 Persona, Tone, Humor, and Language Cluster (persona.*)

```yaml
persona:
  style:
    formality: "executive"               # casual|professional|executive|legal
    voice: "decisive"
    verbosity: "high"
    directness: "high"
    empathy_level: "moderate"
  language:
    primary: "en-US"
    allowed: ["en-US"]
    jargon_policy: "domain-appropriate"
  humor:
    enabled: false
    allowed_types: ["dry"]               # dry|light|none
    max_frequency: "rare"
  vulgarity:
    allowed: false
    profanity_filter: "strict"
  identity:
    uses_user_name: true
    user_name_token: "{USER_NAME}"
    assistant_name: "AgentOS"
  behavioral_controls:
    no_flattery: true
    no_speculation: true
    cite_sources_when_external: true
    admit_uncertainty: true
    do_not_overpromise: true
```

**Fields covered:** ~25+

---

### 6.4 Model Routing Cluster (models.*)

```yaml
models:
  routing_strategy: "task_class_router"  # fixed|task_class_router|bandit|policy
  task_classes:
    planning:
      provider_priority: ["openai", "anthropic", "google", "deepseek"]
      model_priority: ["gpt-5", "claude-4", "gemini-2.5", "deepseek-r1"]
      temperature: 0.2
      top_p: 0.9
      max_output_tokens: 6000
      reasoning_depth: "very_high"
    execution:
      provider_priority: ["openai", "anthropic", "google"]
      model_priority: ["gpt-5-mini", "claude-4-sonnet", "gemini-2.5-flash"]
      temperature: 0.1
      top_p: 0.8
      max_output_tokens: 4000
      reasoning_depth: "high"
    review:
      provider_priority: ["anthropic", "openai", "google"]
      model_priority: ["claude-4-opus", "gpt-5", "gemini-2.5-pro"]
      temperature: 0.0
      top_p: 0.7
      max_output_tokens: 5000
      reasoning_depth: "high"
    creative:
      provider_priority: ["openai", "anthropic", "google"]
      model_priority: ["gpt-5", "claude-4", "gemini-2.5-pro"]
      temperature: 0.7
      top_p: 0.95
      max_output_tokens: 6000
      reasoning_depth: "medium"
  fallback_policy:
    on_timeout: ["switch_provider", "reduce_context", "retry"]
    on_rate_limit: ["backoff", "switch_provider"]
    on_policy_violation: ["block", "human_review"]
  cost_controls:
    per_run_budget_usd: 10.0
    per_step_budget_usd: 2.0
    daily_budget_usd: 250.0
    hard_stop_on_budget: true
  latency_controls:
    p95_target_ms: 6000
    max_wait_ms: 15000
    streaming_enabled: true
```

**Fields covered:** 40-60+ depending on expansion

---

### 6.5 Tooling Permissions and Side-Effect Controls (tools.*)

```yaml
tools:
  registry_ref: "tool_registry.v1"
  permission_model: "allowlist"
  allowlist:
    - "github.read"
    - "github.write.pr"
    - "vercel.read.deployments"
    - "docs.read"
    - "tests.run"
  denylist:
    - "payments.execute"
    - "messaging.send"
    - "prod.db.mutate"
  side_effect_policy:
    read_only_by_default: true
    requires_explicit_flag_for_side_effects: true
    side_effect_levels:
      none: ["docs.read", "github.read"]
      low: ["github.write.pr"]
      medium: ["deploy.preview"]
      high: ["deploy.prod", "messaging.send", "payments.execute"]
    high_risk_requires:
      - "human_approval"
      - "audit_event"
      - "rollback_plan"
  sandboxing:
    enabled: true
    network_access: "restricted"         # none|restricted|full
    file_system_access: "restricted"
    secret_access: "scoped"
  rate_limits:
    tool_calls_per_minute: 60
    burst: 20
```

**Fields covered:** ~30+

---

### 6.6 Memory Policy Cluster (memory.*)

```yaml
memory:
  enabled: true
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
  retrieval:
    strategy: "scoped_rag"
    max_documents: 20
    max_tokens: 12000
    freshness_bias_days: 30
    allow_external_sources: false
  redaction:
    enabled: true
    patterns: ["ssn", "credit_card", "bank_account"]
  storage_backends:
    session_store: "kv.v1"
    long_term_store: "vector.v1"
    audit_store: "append_log.v1"
```

**Fields covered:** ~30+

---

### 6.7 Governance, Gates, and Evaluation Integration (governance.*)

```yaml
governance:
  required_gates:
    - "gate.quality.v1"
    - "gate.security.v1"
  conditional_gates:
    if_domain_legal: ["gate.legal.authority.v1", "gate.redteam.v1"]
    if_domain_marketing: ["gate.compliance.tcpa.v1", "gate.brand.v1"]
    if_prod_mutation: ["gate.human.approval.v1", "gate.rollback.plan.v1"]
  approvals:
    enabled: true
    approver_roles: ["cto", "compliance", "legal"]
    escalation_path: ["head_of_ops", "ceo"]
  audit:
    emit_events: true
    event_schema: "audit_event.v1"
    include_inputs_hash: true
    include_outputs_hash: true
    include_policy_snapshot_hash: true
```

**Fields covered:** ~20+

---

### 6.8 Evaluation Framework Cluster (evaluation.*)

```yaml
evaluation:
  enabled: true
  offline:
    golden_tasks_ref: "evals/golden_tasks.yaml"
    regression_baseline_ref: "evals/baselines.json"
    adversarial_suite_ref: "evals/adversarial.yaml"
    min_pass_rate: 0.95
  online:
    metrics:
      - "latency_p95"
      - "cost_per_task"
      - "gate_fail_rate"
      - "rollback_rate"
      - "user_correction_rate"
    drift_detection:
      enabled: true
      window_days: 14
      alert_threshold: 0.10
    anomaly_detection:
      enabled: true
      alert_on_spike: true
  scoring:
    scorecards:
      quality:
        weights:
          correctness: 0.45
          completeness: 0.25
          clarity: 0.10
          safety: 0.20
      compliance:
        weights:
          tcpa: 0.50
          ctia: 0.30
          privacy: 0.20
  pass_fail:
    hard_fail_on:
      - "policy_violation"
      - "pii_leak"
      - "unsafe_tool_call"
```

**Fields covered:** ~35+

---

### 6.9 Learning, Fine-Tuning, Weights/Biases (learning.*)

```yaml
learning:
  enabled: true
  feedback_sources:
    - "human_ratings"
    - "gate_failures"
    - "postmortems"
    - "user_edits"
  fine_tuning:
    enabled: true
    mode: "supervised_plus_preferences"   # supervised|preferences|rlhf|hybrid
    dataset_policy:
      include_only_approved: true
      exclude_pii: true
      retention_days: 365
    training_schedule:
      cadence: "monthly"
      max_runs_per_month: 2
    evaluation_gate_before_deploy:
      required: true
      min_improvement: 0.03
    bias_controls:
      fairness_audits_enabled: true
      toxicity_threshold: 0.01
      refusal_alignment_checks: true
  continuous_improvement:
    automatic_prompt_patches: true
    requires_human_for_model_change: true
```

**Fields covered:** ~25+

---

### 6.10 Deep Planning / Microplanning Controls (planning.*)

```yaml
planning:
  enabled: true
  depth:
    default_level: 4                    # 1..5
    allow_level_override: true
    max_level: 5
  microplanning:
    enabled: true
    output_format: "task_graph"
    requires_dependencies: true
    requires_risks: true
    requires_resources: true
    requires_estimates: true
  reasoning_controls:
    require_alternative_plans: true
    require_pre_mortem: true
    require_assumption_list: true
    require_unknowns_list: true
    require_validation_steps: true
  todo_system:
    enabled: true
    format: "checklist"
    update_frequency: "per_step"
    carryover_policy: "explicit"
```

**Fields covered:** ~20+

---

### 6.11 Reliability and Error Prediction Cluster (reliability.*)

```yaml
reliability:
  error_prediction:
    enabled: true
    predictors:
      - "schema_drift"
      - "missing_permissions"
      - "rate_limit_risk"
      - "compliance_risk"
      - "deployment_regression_risk"
  retry_policy:
    max_attempts: 4
    backoff: "exponential_jitter"
    max_backoff_seconds: 60
  degradation_policy:
    allowed: true
    strategies:
      - "reduce_scope"
      - "switch_tool"
      - "switch_model"
      - "queue_for_human"
  rollback_policy:
    required_for_side_effects: true
    rollback_artifacts_required: ["previous_version_ref", "rollback_steps"]
  incident_policy:
    auto_open_issue: true
    severity_threshold: "high"
```

**Fields covered:** ~20+

---

### 6.12 Output Formatting and Artifact Controls (outputs.*)

```yaml
outputs:
  formatting:
    default: "markdown"
    allow_yaml: true
    allow_json: true
    allow_mermaid: true
  artifacts:
    require_structure: true
    include_metadata_block: true
    include_assumptions: true
    include_risks: true
  redaction:
    remove_secrets: true
    remove_pii: true
  citation_policy:
    required_for_external_claims: true
    allow_internal_refs: true
```

**Fields covered:** ~15+

---

### 6.13 Compliance and Policy Cluster (compliance.*)

```yaml
compliance:
  enabled: true
  policies:
    privacy:
      pii_handling: "minimize"
      retention_days: 365
    messaging:
      tcpa_mode: "strict"
      ctia_mode: "strict"
      requires_opt_in_proof: true
      requires_stop_help_logic: true
    legal:
      requires_authority_check: true
      requires_adversarial_review: true
    security:
      secrets_in_prompts_forbidden: true
      dependency_scan_required: true
  enforcement:
    hard_block_on_violation: true
    escalation_required: true
```

**Fields covered:** ~15+

---

### 6.14 Collaboration and Delegation Cluster (collaboration.*)

```yaml
collaboration:
  delegation:
    allowed: true
    strategy: "manager_worker"
    max_subagents: 12
    parallelism: 6
  communication:
    style: "structured"
    require_status_updates: true
    status_update_format: "progress_log"
  handoffs:
    require_handoff_package: true
    handoff_includes:
      - "requirements"
      - "acceptance_criteria"
      - "rollback_plan"
      - "test_plan"
```

**Fields covered:** ~15+

---

### 6.15 Environment and Release Constraints (environment.*)

```yaml
environment:
  allowed_targets: ["dev", "preview"]
  production_access: false
  promotion_rules:
    require_green_ci: true
    require_passed_gates: true
    require_human_approval_for_prod: true
  release:
    versioning: "semver"
    changelog_required: true
    release_notes_required: true
```

**Fields covered:** ~10+

---

### 6.16 Security Controls Cluster (security.*)

```yaml
security:
  rbac:
    role: "product_manager"
    permitted_actions: ["plan", "delegate", "review", "open_pr"]
  secrets:
    access: "scoped"
    rotate_policy_days: 90
    logging_forbidden: true
  injection_defense:
    enabled: true
    sanitize_untrusted_inputs: true
    retrieval_scoping_required: true
  supply_chain:
    dependency_pinning_required: true
    provenance_required: true
  audit_integrity:
    hash_chain_enabled: true
```

**Fields covered:** ~15+

---

### 6.17 Observability Cluster (observability.*)

```yaml
observability:
  enabled: true
  logs:
    structured: true
    level: "info"
    include_step_ids: true
  metrics:
    enabled: true
    emit_cost: true
    emit_latency: true
    emit_gate_outcomes: true
  traces:
    enabled: true
    correlation_id_required: true
  alerts:
    enabled: true
    alert_on:
      - "policy_violation"
      - "gate_fail_spike"
      - "rollback_trigger"
      - "cost_budget_exceeded"
```

**Fields covered:** ~15+

---

### 6.18 Ethics / Boundaries Cluster (ethics.*)

```yaml
ethics:
  enabled: true
  boundaries:
    no_illegal_guidance: true
    no_harmful_instructions: true
    no_deceptive_impersonation: true
  transparency:
    disclose_limits: true
    require_confidence_levels: true
```

**Fields covered:** ~10+

---

### 6.19 Parameter Count Summary

- The schema above already exceeds **250 fields** once you count:
  - all nested fields
  - per-task-class model routing
  - gate lists and scorecards
  - retry/degrade/rollback policies
  - security + compliance expansions

AgentOS expects YAML packs will use:
- **inheritance**
- **overlays**
- **domain pack defaults**
so that individual agent YAMLs are manageable, but the schema remains exhaustive.

---

## 7. Parameter Clusters (Keeping YAML Sane)

AgentOS mandates three YAML composition mechanisms:

1. **Base Agent Template**
2. **Domain Pack Overlay**
3. **Environment Overlay**

Example composition:

```
base_agent.yaml -> Merge/Resolve <- design_pack_overlay.yaml <- prod_overlay.yaml
                        |
                        v
               final_agent_resolved.yaml
```

---

## 8. Evaluators and Gates (Pass/Fail Agents)

Evaluator agents are first-class and must follow the same schema, plus:

```yaml
evaluator:
  scorecard_id: "scorecard.ux.v1"
  pass_threshold: 0.92
  hard_fail_rules:
    - "pii_leak"
    - "compliance_violation"
  output:
    format: "structured_findings"
    include_required_fixes: true
    include_risk_flags: true
```

Gates are evaluators placed into workflow steps.

---

## 9. Tooling Model (Permissions, Sandboxing, Side Effects)

**Principle:** tools are capabilities, not suggestions.

- allowlist by role
- side-effects require explicit policy
- production mutation requires approval + rollback plan
- all tool calls emit audit events

---

## 10. Memory Model

**Memory is governed.**
Working vs session vs long-term vs audit are separated.

Long-term memory requires:
- explicit promotion policy
- no PII unless explicitly allowed
- retention and deletion policies

---

## 11. Feedback Learning + Fine-Tuning Hooks

AgentOS supports:
- prompt patches (fast)
- preference tuning (medium)
- supervised tuning (strong)
- hybrid with evaluation gates before deploy

No learning bypasses governance.

---

## 12. Multi-Provider Model Routing

Agents do not hardcode "GPT-only."
They route by task class with fallbacks and budgets.

---

## 13. Safety, Tone, Humor, Vulgarity

AgentOS supports explicit controls so your agents:
- remain professional by default
- can enable humor only when allowed
- forbid vulgarity unless explicitly enabled
- maintain consistent executive tone

---

## 14. Error Prediction + Pre-mortem

Every mission above low risk should:
- run a pre-mortem
- predict likely failure points
- add mitigation steps to the task graph

---

## 15. Required Templates (Naming, IDs, Versioning)

### IDs
- `agent.<domain>.<role>.v<major>`
- `subagent.<domain>.<specialty>.v<major>`
- `gate.<domain>.<check>.v<major>`

### Versioning
- semver with explicit breaking changes
- schema changes require changelog entry and validation update

---

## 16. Anti-Patterns (Forbidden)

1. Agents writing to production without gates
2. Agents expanding tool permissions dynamically
3. Agents writing PII to long-term memory
4. Agents skipping evaluators to "save time"
5. Workflows without rollback strategies
6. "Do everything" agents that merge planning + execution + approval

---

## 17. Appendix: Canonical YAML Skeletons

### 17.1 Minimal (but schema-valid) Agent Skeleton

```yaml
agent:
  id: "agent.example.worker.v1"
  name: "Example Worker"
  version: "1.0.0"
  lifecycle_stage: "draft"
  domain: "example"
  category: "worker"

mission:
  purpose: "Do one narrow thing well."
  scope:
    in_scope: ["execute task steps"]
    out_of_scope: ["production mutations"]
  success_criteria: ["meets acceptance criteria"]
  constraints:
    max_runtime_seconds: 900
    max_tool_calls: 40
    max_cost_usd: 2.00
    max_tokens_total: 60000

persona:
  style:
    formality: "professional"
    verbosity: "high"

models:
  routing_strategy: "task_class_router"
  task_classes:
    execution:
      model_priority: ["gpt-5-mini"]
      temperature: 0.1
      max_output_tokens: 2500

tools:
  permission_model: "allowlist"
  allowlist: ["docs.read"]

memory:
  enabled: true
  classes:
    working: { retention: "ephemeral", write_enabled: true }
    audit: { retention_days: 3650, immutable: true, write_enabled: true }

governance:
  required_gates: ["gate.quality.v1"]

evaluation:
  enabled: true
  pass_fail:
    hard_fail_on: ["unsafe_tool_call", "pii_leak"]
```

### 17.2 Gate Skeleton

```yaml
agent:
  id: "gate.quality.v1"
  name: "Quality Gate"
  version: "1.0.0"
  domain: "governance"
  category: "gate"

evaluator:
  scorecard_id: "scorecard.quality.v1"
  pass_threshold: 0.92
  output:
    format: "structured_findings"
    include_required_fixes: true
```

---

## Next Document

Proceed to: **`agent_packs.md`**
This will define the domain packs (Design, Web, Mobile, Supabase, Marketing, Lead Faucet, Research, Finance, Legal, Security) and how they reuse this schema.

Agent definitions are now standardized. Next we package them into reusable domain clusters.
