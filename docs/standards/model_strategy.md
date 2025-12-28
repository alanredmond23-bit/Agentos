# MODEL_STRATEGY.md
**AgentOS - Multi-Provider Model Strategy, Routing, Cost Controls, and Learning (Phase 1 / Canonical)**

> This document defines how AgentOS selects and governs model usage across providers (OpenAI, Anthropic, Google/Gemini, DeepSeek, etc.).
> It covers task-class routing, reliability controls, context management, safety posture, cost/latency budgets, evaluation coupling, fine-tuning hooks, and model change governance.

---

## Table of Contents

1. Purpose and Audience
2. Model Strategy Principles (Fortune-Grade)
3. Model Classes and Task Taxonomy
4. Routing Architecture (Policy -> Router -> Execution)
5. Provider Strategy (Polyglot by Design)
6. Prompt + Context Construction (RAG and Safety)
7. Output Controls (Determinism, Formatting, Tool Use)
8. Cost Controls (Budgets, Caps, Spend Governance)
9. Latency Controls (SLOs, Streaming, Degradation)
10. Reliability Controls (Fallbacks, Retries, Consistency)
11. Safety Controls (Policy, Refusal Alignment, DLP, Injection Defense)
12. Evaluation Coupling (Offline/Online, Regression, Gates)
13. Learning Loops (Feedback -> Datasets -> Tuning)
14. Fine-Tuning and "Weights & Biases" (Expanded)
15. Multi-Model Orchestration Patterns (Planning vs Execution vs Review)
16. Model Change Management (Governance and Rollback)
17. Model Risk Register (Failure Modes + Mitigations)
18. Canonical YAML: Model Routing Schema (Exhaustive)
19. Open Questions (Phase 1)

---

## 1. Purpose and Audience

AgentOS must support:
- multiple providers and model families
- explicit routing rules that match the task
- cost and latency governance
- defensible safety posture
- reliable production behavior

This document is for:
- AI architects
- platform engineers
- finance/ops controlling spend
- security/compliance governing risk
- leadership requiring auditability

---

## 2. Model Strategy Principles (Fortune-Grade)

1. **Task-class routing beats "one best model."**
2. **Determinism where required, creativity where allowed.**
3. **Costs are governed, not observed after the fact.**
4. **Latency is an SLO, not a surprise.**
5. **Safety is enforced at policy and prompt layers.**
6. **Evaluations gate model changes.**
7. **Fallbacks are planned, not improvised.**
8. **Model upgrades require governance and rollback.**

---

## 3. Model Classes and Task Taxonomy

AgentOS routes by **task class**. Each task class has distinct parameters, goals, and risk posture.

### Canonical Task Classes
- `planning` - decomposition, task graphs, risk modeling, microplanning
- `research` - retrieval + citation + verification, long-context synthesis
- `execution` - deterministic implementation steps, tool invocation
- `review` - adversarial critique, error finding, compliance checking
- `creative` - copy, ideation, variants (bounded by brand and compliance)
- `legal` - authority-bound drafting + strict risk controls
- `finance` - conservative reasoning, validation, controls
- `ops_monitoring` - anomaly detection summaries, incident triage
- `code_gen` - code changes with tests, linting, and diffs
- `data_sql` - schema reasoning, query construction with validation
- `security_redteam` - injection testing, policy probing, adversarial evaluation

---

## 4. Routing Architecture (Policy -> Router -> Execution)

Model selection is not ad hoc; it is orchestrated.

```
Model Policy (task classes, budgets, safety) --> Model Router --> Select Provider/Model
    --> Context Builder (scoped RAG + sanitization) --> Inference Runtime --> Outputs + Tool Calls
    --> Evaluators/Gates --> back to Policy
```

**Rationale:** Policies are stable; routing is deterministic; evaluation influences future policy.

---

## 5. Provider Strategy (Polyglot by Design)

AgentOS is provider-agnostic. Providers are selected based on:
- reasoning strength
- long-context support
- tool-use behavior
- safety alignment
- latency and throughput
- cost efficiency
- availability and rate limits

### Canonical Provider Posture
- **OpenAI:** strong general reasoning and execution, broad tool integration
- **Anthropic:** strong analysis and review, robust critique and safety posture
- **Google/Gemini:** strong multimodal and long-context workloads
- **DeepSeek / similar:** cost-efficient reasoning for certain task classes

**Rule:** the platform must operate even if any single provider is degraded.

---

## 6. Prompt + Context Construction (RAG and Safety)

AgentOS constructs context in layers:

1. **System policy layer** - non-negotiable constraints
2. **Role/agent persona layer** - mission and scope
3. **Task layer** - step instructions and success criteria
4. **Context layer** - retrieval results, documents, state
5. **Tool layer** - available tool specs and schemas

### Context safety requirements
- sanitize untrusted inputs
- scope retrieval to allowlisted sources
- prevent retrieval poisoning
- enforce max context budget
- redact secrets/PII before insertion

```
Untrusted Input -> Sanitize + Inject Defense -> RAG Retrieval (scoped)
    -> Filter + Rank + Freshness Bias -> Context Pack (budgeted) -> Model Prompt
```

---

## 7. Output Controls (Determinism, Formatting, Tool Use)

Outputs must match the operational risk.

### Determinism defaults
- `planning`: low temp, structured output
- `execution`: very low temp, strongly constrained
- `review`: temp near zero, adversarial checklists
- `creative`: higher temp allowed but bounded by brand/compliance

### Output formats
AgentOS mandates structured output in high-stakes tasks:
- JSON schemas (preferred)
- YAML schemas (config)
- Markdown with standardized headings (docs)
- Diff format (code changes)
- Gate findings format (evaluators)

Tool use must be:
- explicitly invoked
- permission-checked
- audited

---

## 8. Cost Controls (Budgets, Caps, Spend Governance)

Costs are governed in four layers:

1. per-step caps
2. per-run caps
3. per-workflow caps
4. daily/monthly global caps

### Cost control mechanisms
- token budgets per class
- context trimming
- fallback to cheaper models for low-risk tasks
- hard stop and escalation on budget breach

```
Start -> Budget Remaining?
    -> No: Block + Escalate
    -> Yes: Route Model -> Run Step -> Record Cost -> back to Budget Check
```

---

## 9. Latency Controls (SLOs, Streaming, Degradation)

Latency is treated as an SLO with fallback behaviors:

### Latency controls
- per-task-class p95 targets
- timeout thresholds
- streaming policies
- fallback routing to lower-latency models
- degrade mode (reduced scope) only if policy allows

---

## 10. Reliability Controls (Fallbacks, Retries, Consistency)

Reliability is ensured via:
- retry/backoff per step
- model/provider fallback sequences
- deterministic mode for critical steps
- "consistency checks" where outputs must match prior invariants
- evaluator enforcement

### Reliability fallback map (conceptual)

```
Primary Model Call -> Result OK?
    -> Yes: Continue
    -> Timeout: Fallback Provider -> Secondary Model Call -> Continue
    -> Rate Limit: Backoff + Retry -> Continue
    -> Policy Violation: Block + Human Review
```

---

## 11. Safety Controls (Policy, Refusal Alignment, DLP, Injection Defense)

Safety is enforced via:
- tool allowlists
- DLP/PII redaction
- refusal alignment checks for restricted content
- injection detection and sanitization
- safe retrieval scoping
- adversarial evaluators ("red team agents")

---

## 12. Evaluation Coupling (Offline/Online, Regression, Gates)

Model usage is inseparable from evaluation.

### Offline
- golden tasks
- regression baselines
- adversarial suites
- quality metrics thresholds

### Online
- drift detection
- anomaly detection
- rollback triggers
- user correction rate monitoring

Model changes require:
- demonstrating improvement against baselines
- no regression in safety/compliance
- explicit approval if risk class is high

---

## 13. Learning Loops (Feedback -> Datasets -> Tuning)

AgentOS learning sources:
- gate failures
- human ratings
- user edits/corrections
- incident postmortems
- monitored production regressions

Learning outputs:
- prompt patches
- new gate rules
- improved retrieval filters
- candidate fine-tune datasets

---

## 14. Fine-Tuning and "Weights & Biases" (Expanded)

AgentOS supports a full tuning pipeline:
- dataset curation and redaction
- labeling and preference ranking
- training runs gated by evaluation
- bias and toxicity audits
- deployment with rollback plan

Key controls:
- include-only-approved examples
- exclude PII
- retain datasets with expiration
- track lineage (dataset version -> model version -> eval results)

---

## 15. Multi-Model Orchestration Patterns

### Pattern A - Plan -> Execute -> Review (Canonical)
1. planner model (deep reasoning)
2. executor model (deterministic)
3. reviewer model (adversarial)
4. gate returns pass/fail

```
Planner Model -> Execution Model -> Reviewer Model -> Pass?
    -> Yes: Done
    -> No: Fix Loop -> back to Execution Model
```

### Pattern B - Parallel Research -> Synthesis -> Verification
Parallel searchers -> synthesizer -> verifier -> gate

### Pattern C - Creative Variants -> Brand/Compliance Gate
Creative generation is only allowed when bounded by strict gates.

---

## 16. Model Change Management (Governance and Rollback)

Model changes require:
- a change request
- offline evaluation pass
- staged rollout (preview -> limited prod -> full prod)
- monitoring and rollback triggers

Rollback must be:
- immediate
- reversible
- auditable

---

## 17. Model Risk Register (Failure Modes + Mitigations)

| Risk | Example | Mitigation |
|------|---------|------------|
| Hallucination | false claim | verifier gate + citations |
| Tool misuse | unsafe API call | allowlists + policy engine |
| Prompt injection | malicious instructions in docs | sanitize + scoped RAG |
| Drift | performance declines | online eval + rollback |
| Cost runaway | huge contexts | budgets + trimming + caps |
| Latency spikes | provider degraded | fallback routing |

---

## 18. Canonical YAML: Model Routing Schema (Exhaustive)

Below is a canonical schema stub used by agent YAMLs (expanded per agent with ~250-300 total parameters across all clusters).

```yaml
models:
  routing_strategy: "task_class_router"
  provider_policies:
    openai:
      enabled: true
      rate_limit_strategy: "adaptive_backoff"
    anthropic:
      enabled: true
      rate_limit_strategy: "adaptive_backoff"
    google:
      enabled: true
      rate_limit_strategy: "adaptive_backoff"
    deepseek:
      enabled: true
      rate_limit_strategy: "adaptive_backoff"

  task_classes:
    planning:
      provider_priority: ["openai", "anthropic", "google", "deepseek"]
      model_priority: ["gpt-5", "claude-4", "gemini-2.5-pro", "deepseek-r1"]
      temperature: 0.2
      top_p: 0.9
      max_output_tokens: 6000
      context_budget_tokens: 16000
      reasoning_depth: "very_high"
      tool_use_allowed: false
      structured_output_required: true
      output_schema: "task_graph.v1"

    execution:
      provider_priority: ["openai", "anthropic", "google"]
      model_priority: ["gpt-5-mini", "claude-4-sonnet", "gemini-2.5-flash"]
      temperature: 0.1
      top_p: 0.8
      max_output_tokens: 4000
      context_budget_tokens: 12000
      reasoning_depth: "high"
      tool_use_allowed: true
      tool_use_mode: "strict"
      structured_output_required: true

    review:
      provider_priority: ["anthropic", "openai", "google"]
      model_priority: ["claude-4-opus", "gpt-5", "gemini-2.5-pro"]
      temperature: 0.0
      top_p: 0.7
      max_output_tokens: 5000
      context_budget_tokens: 14000
      reasoning_depth: "high"
      tool_use_allowed: false
      structured_output_required: true
      output_schema: "gate_findings.v1"

    creative:
      provider_priority: ["openai", "anthropic", "google"]
      model_priority: ["gpt-5", "claude-4", "gemini-2.5-pro"]
      temperature: 0.7
      top_p: 0.95
      max_output_tokens: 6000
      context_budget_tokens: 12000
      reasoning_depth: "medium"
      tool_use_allowed: false
      structured_output_required: false

    code_gen:
      provider_priority: ["anthropic", "openai", "google"]
      model_priority: ["claude-4-sonnet", "gpt-5", "gemini-2.5-pro"]
      temperature: 0.1
      top_p: 0.8
      max_output_tokens: 8000
      context_budget_tokens: 20000
      reasoning_depth: "high"
      tool_use_allowed: true
      structured_output_required: true
      output_schema: "code_diff.v1"

    legal:
      provider_priority: ["anthropic", "openai"]
      model_priority: ["claude-4-opus", "gpt-5"]
      temperature: 0.1
      top_p: 0.7
      max_output_tokens: 6000
      context_budget_tokens: 16000
      reasoning_depth: "very_high"
      tool_use_allowed: false
      structured_output_required: true
      requires_human_review: true

    security_redteam:
      provider_priority: ["anthropic", "openai"]
      model_priority: ["claude-4-opus", "gpt-5"]
      temperature: 0.3
      top_p: 0.8
      max_output_tokens: 4000
      context_budget_tokens: 12000
      reasoning_depth: "very_high"
      adversarial_mode: true
      tool_use_allowed: false

  fallback_policy:
    on_timeout: ["switch_provider", "reduce_context", "retry"]
    on_rate_limit: ["backoff", "switch_provider"]
    on_context_overflow: ["trim_context", "summarize_context", "rerun"]
    on_policy_violation: ["block", "human_review"]

  budgets:
    per_step_usd: 2.0
    per_run_usd: 10.0
    per_day_usd: 250.0
    hard_stop: true

  latency:
    p95_target_ms: 6000
    max_wait_ms: 15000
    streaming_enabled: true
```

---

## 19. Open Questions (Phase 1)

- Provider-specific telemetry normalization
- Formal "model capability registry" schema
- Automated canarying strategies per task class
- Unified context-trimming policy across frameworks

---

## Next Document

Proceed to: **`EVALUATION_AND_GATES.md`**
This will define:
- evaluator agent standards
- scorecards and metrics
- offline + online evaluation harnesses
- pass/fail thresholds
- release gating
- regression prevention
- kill-switch and rollback triggers

Model strategy is now defined. Next we formalize how we prove quality and safety at scale.
