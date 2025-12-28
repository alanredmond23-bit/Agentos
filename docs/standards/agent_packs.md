# AGENT_PACKS.md
**AgentOS - Domain Agent Packs, Subagents, Gates, and Canonical Workflows (Phase 1 / Canonical)**

> This document defines the **Agent Pack system**: reusable, domain-specific bundles of agents, subagents, evaluators, gates, tools, and workflows.
> Packs are how AgentOS scales across projects while maintaining **Fortune-grade standardization, governance, and execution quality**.

**Key rule:** You do not "make a new agent" for every project. You select and compose **packs**.

---

## Table of Contents

1. Purpose and Pack Philosophy
2. Canonical Pack Structure and Composition
3. Pack Dependency Graph (Core -> Domain -> Execution -> Gates)
4. Universal Core Packs (Required Everywhere)
5. Domain Packs (Product, Design, Web, Mobile, Supabase/DB, Marketing, Lead Faucet, Research, Finance, Legal, Security)
6. Shared Gate Packs (Pass/Fail, Compliance, Security, Release)
7. Pack Overlays (Environment, Tenant, Project)
8. Canonical Workflows Per Pack (Exhaustive)
9. Standard Scorecards (UX, Quality, Compliance, Security, Reliability)
10. Naming, Versioning, and Compatibility Rules
11. Anti-Patterns (Forbidden Pack Designs)
12. Appendix: Pack Index (Master Catalog)

---

## 1. Purpose and Pack Philosophy

Agent packs exist to solve three enterprise problems:

1. **Consistency:** identical tasks are performed with identical governance.
2. **Speed:** new projects assemble capability by composition, not reinvention.
3. **Control:** tool permissions, memory rules, and evaluations are enforced at pack level.

A pack is not just "agents."
A pack includes:
- agents and subagents
- gates and evaluators
- default orchestration topologies
- tool allowlists
- memory and retention policies
- model routing defaults
- canonical workflows
- rollback and escalation policies

---

## 2. Canonical Pack Structure and Composition

### 2.1 Pack Anatomy

Every pack MUST declare:

- `pack.id`, `pack.version`, `pack.owner`
- `pack.dependencies`
- `pack.default_orchestration_mode`
- `pack.agents` and `pack.subagents`
- `pack.gates` and `pack.evaluators`
- `pack.tools.allowlist` (and denylist if needed)
- `pack.memory.policy`
- `pack.model.routing_defaults`
- `pack.workflows` (canonical workflow templates)

### 2.2 Pack Composition Model

Packs are composed using **merge overlays**:

```
Core Packs --> Resolver
Domain Pack --> Resolver
Gates Pack --> Resolver
Project Overlay --> Resolver
Env Overlay --> Resolver
                |
                v
        Resolved Pack Runtime Spec
```

**Rationale:** This keeps per-agent YAML manageable while supporting 250-300+ fields.

---

## 3. Pack Dependency Graph

AgentOS uses a strict dependency hierarchy:

```
Universal Core Packs --> Domain Packs --> Execution Packs --> Project Overlay --> Environment Overlay
         |                   |
         v                   v
    Shared Gate Packs ---> Execution Packs
```

- Core packs provide identity, memory, observability, governance primitives.
- Domain packs provide specialized agents and workflows.
- Gate packs enforce pass/fail controls.
- Execution packs connect to real systems (GitHub, Vercel, Twilio, Supabase, etc.).

---

## 4. Universal Core Packs (Required Everywhere)

These packs are mandatory across all projects:

### 4.1 `pack.core.identity_and_persona.v1`
- canonical tone rules
- naming conventions
- user address policy
- humor/vulgarity defaults
- refusal and transparency behavior

### 4.2 `pack.core.memory_and_audit.v1`
- working/session/long-term/audit policies
- redaction rules
- retention rules
- immutable audit event schema

### 4.3 `pack.core.observability.v1`
- logs, metrics, traces
- correlation IDs
- alert rules and thresholds

### 4.4 `pack.core.model_routing.v1`
- task-class router defaults
- fallbacks
- cost/latency budgets

### 4.5 `pack.core.governance_primitives.v1`
- gate execution contract
- approval contract
- escalation contract

---

## 5. Domain Packs (Exhaustive)

Each domain pack below includes:
- Mission
- Agents and subagents
- Required gates
- Default orchestration mode
- Tool permissions
- Canonical workflows
- Outputs and artifacts required

---

## 5.1 Product Development Pack
**Pack ID:** `pack.domain.product_dev.v1`
**Default orchestration:** Hierarchical + gated sequential promotion

### Mission
Translate business intent into:
- requirements
- task graphs
- implementation plans
- shipped artifacts with governance

### Agents
**Manager**
- `agent.product.manager.v1`

**Core subagents**
- `subagent.product.requirements.v1`
- `subagent.product.prd_writer.v1`
- `subagent.product.acceptance_criteria.v1`
- `subagent.product.roadmap_planner.v1`
- `subagent.product.risk_pre_mortem.v1`
- `subagent.product.metrics_kpi.v1`

**Evaluator/gates**
- `gate.product.requirements_quality.v1`
- `gate.product.scope_integrity.v1`

### Required tools
- docs read/write (scoped)
- GitHub PR drafting (write.pr only)
- issue tracker (optional)

### Canonical workflows
1. **Intent -> PRD -> Task Graph**
2. **Task Graph -> Delegation Plan**
3. **Weekly Roadmap + KPI Brief**
4. **Risk Pre-mortem -> Mitigation Insert**
5. **Release Notes Package (handoff to Deploy pack)**

### Required artifacts
- PRD
- acceptance criteria
- task dependency graph
- risk register
- test plan outline
- rollback plan pointer

---

## 5.2 Design (UI/UX + Design Systems + CRO) Pack
**Pack ID:** `pack.domain.design_uiux.v1`
**Default orchestration:** Hierarchical + parallel exploration + pass/fail UX gate

### Mission
Create conversion-grade UX + implementation-ready UI specs:
- flows, wireframes, UI tokens, components, states
- copy guidance and error states
- accessibility compliance
- CRO hypotheses and experiments

### Agents
**Manager**
- `agent.design.director.v1`

**UX subagents**
- `subagent.design.ux_researcher.v1`
- `subagent.design.jtbd_personas.v1`
- `subagent.design.flow_mapper.v1`
- `subagent.design.wireframe_builder.v1`

**UI subagents**
- `subagent.design.ui_designer.v1`
- `subagent.design.design_systems.v1`
- `subagent.design.component_spec.v1`
- `subagent.design.responsive_states.v1`

**Copy/CRO**
- `subagent.design.ux_writer.v1`
- `subagent.design.cro_optimizer.v1`
- `subagent.design.experiment_planner.v1`

**Accessibility**
- `subagent.design.accessibility_validator.v1`

**Gates**
- `gate.design.ux_scorecard.v1`
- `gate.design.accessibility_aa.v1`
- `gate.design.brand_consistency.v1`

### Tool permissions
- docs read/write
- optionally: Figma export connector (if available)
- no production changes

### Canonical workflows
1. **Discovery -> Flows -> Wireframes -> Spec**
2. **Design System Tokens + Component Inventory**
3. **Landing Page CRO Blueprint**
4. **UX Copy Pack + Error State Language**
5. **Accessibility Pass/Fail Audit**
6. **Handoff Pack to Engineering**

### Required artifacts
- user flows
- wireframes (or structured spec)
- component inventory
- design tokens (Tailwind-ready)
- CRO experiment backlog
- UX gate report

---

## 5.3 Web: Corporate Site + Landing Pages Pack
**Pack ID:** `pack.domain.web_corporate_and_landers.v1`
**Default orchestration:** Sequential gated build + preview checks + promotion approval

### Mission
Ship high-performing web experiences:
- corporate trust pages
- landing pages that convert
- SEO + analytics instrumentation
- performance budgets and gates

### Agents
**Manager**
- `agent.web.lead.v1`

**Subagents**
- `subagent.web.frontend_engineer.v1`
- `subagent.web.seo_schema.v1`
- `subagent.web.analytics_attribution.v1`
- `subagent.web.performance_optimizer.v1`
- `subagent.web.cro_copywriter.v1`
- `subagent.web.accessibility_validator.v1`

**Gates**
- `gate.web.core_web_vitals.v1`
- `gate.web.cro_scorecard.v1`
- `gate.web.seo_check.v1`
- `gate.web.accessibility_aa.v1`
- `gate.web.compliance_terms_privacy.v1`

### Tool permissions
- GitHub write.pr
- Vercel preview deploy
- analytics config (scoped)
- deny: production deploy without approval

### Canonical workflows
1. **Build landing page -> Preview deploy -> CRO/perf/SEO gates**
2. **Corporate IA -> Trust pages -> Schema + indexing plan**
3. **Experiment plan -> variant generation -> test measurement**
4. **Release -> monitor regressions -> rollback if needed**

### Required artifacts
- page spec
- event taxonomy
- performance budget
- experiment backlog
- preview validation report

---

## 5.4 Mobile Apps Pack (iOS + Android + Stores)
**Pack ID:** `pack.domain.mobile_apps.v1`
**Default orchestration:** Sequential pipeline + strict pass/fail release gate

### Mission
Build and release mobile apps with store readiness:
- Swift/SwiftUI iOS
- Kotlin Android
- store metadata, screenshots, privacy disclosures
- QA matrix and security review

### Agents
**Manager**
- `agent.mobile.architect.v1`

**Engineering**
- `subagent.mobile.ios_swift_engineer.v1`
- `subagent.mobile.android_kotlin_engineer.v1`
- `subagent.mobile.api_integration.v1`
- `subagent.mobile.build_pipeline.v1`

**QA/Security**
- `subagent.mobile.qa_test_engineer.v1`
- `subagent.mobile.security_reviewer.v1`

**Store Ops**
- `subagent.mobile.apple_app_store_agent.v1`
- `subagent.mobile.google_play_store_agent.v1`

**Gates**
- `gate.mobile.test_pass.v1`
- `gate.mobile.security_privacy.v1`
- `gate.mobile.store_readiness.v1`

### Tool permissions
- repo access
- CI pipeline triggers
- store console metadata packs (human approval for submission)

### Canonical workflows
1. **Feature build -> tests -> security -> release candidate**
2. **Store metadata pack generation**
3. **Submission checklist + pass/fail**
4. **Rollback/hotfix workflow**

### Required artifacts
- build artifacts references
- QA results
- privacy disclosure pack
- store listing pack
- release notes
- rollback plan

---

## 5.5 Supabase / DB / Edge Functions / Storage Pack
**Pack ID:** `pack.domain.supabase_db_edge.v1`
**Default orchestration:** Sequential + stateful reliability + security gates

### Mission
Ship backend systems safely:
- schema, migrations, indexes
- RLS policies
- edge functions
- webhooks + idempotency
- storage (S3/Supabase buckets) policies

### Agents
**Manager**
- `agent.platform.data_lead.v1`

**Subagents**
- `subagent.db.schema_architect.v1`
- `subagent.db.sql_engineer.v1`
- `subagent.supabase.rls_policy_engineer.v1`
- `subagent.supabase.edge_functions_engineer.v1`
- `subagent.integrations.webhook_reliability.v1`
- `subagent.storage.s3_policy_agent.v1`
- `subagent.platform.observability_agent.v1`

**Gates**
- `gate.db.schema_validation.v1`
- `gate.db.performance_budget.v1`
- `gate.supabase.rls_security.v1`
- `gate.webhook.idempotency.v1`
- `gate.platform.cost_budget.v1`

### Tool permissions
- DB migration tools (environment-scoped)
- edge deploy tools
- deny: production migrations without approval

### Canonical workflows
1. **Schema change -> migration -> rollback plan -> gate**
2. **RLS policy creation -> security gate**
3. **Edge function build -> integration tests -> deploy**
4. **Webhook receiver design -> idempotency + replay defense**
5. **Storage policy setup -> retention and access rules**

### Required artifacts
- schema diff
- migration + rollback scripts
- RLS policy set
- edge function spec + tests
- webhook contract + idempotency keys

---

## 5.6 Integrations (APIs/Webhooks/ETL) Pack
**Pack ID:** `pack.domain.integrations.v1`
**Default orchestration:** Event-driven + durable state + retries

### Mission
Build reliable connectivity:
- API contracts
- signature verification
- retries/backoff
- dead-letter handling
- observability and alerting

### Agents
- `agent.integrations.manager.v1`
- `subagent.integrations.api_contracts.v1`
- `subagent.integrations.webhook_receiver.v1`
- `subagent.integrations.retry_backoff.v1`
- `subagent.integrations.signature_security.v1`
- `subagent.integrations.data_mapper.v1`

**Gates**
- `gate.integration.contract_validation.v1`
- `gate.integration.security_signature.v1`
- `gate.integration.replay_safety.v1`

---

## 5.7 Marketing Ops (Twilio/Sinch Execution) Pack
**Pack ID:** `pack.domain.marketing_ops_messaging.v1`
**Default orchestration:** Event-driven + compliance gates + monitoring loop

### Mission
Execute compliant outbound messaging campaigns with:
- segmentation
- copy generation
- deliverability planning
- throughput controls
- anomaly-driven pausing

### Agents
**Manager**
- `agent.marketing.ops_lead.v1`

**Subagents**
- `subagent.marketing.segmentation.v1`
- `subagent.marketing.copy_generator.v1`
- `subagent.marketing.deliverability_throughput.v1`
- `subagent.marketing.compliance_tcpa_ctia.v1`
- `subagent.marketing.execution_twilio.v1`
- `subagent.marketing.execution_sinch.v1`
- `subagent.marketing.monitoring_optimizer.v1`
- `subagent.marketing.stop_help_handler.v1`

**Gates**
- `gate.marketing.compliance_tcpa.v1`
- `gate.marketing.ctia_program.v1`
- `gate.marketing.brand_voice.v1`
- `gate.marketing.suppression_dnc.v1`
- `gate.marketing.anomaly_pause.v1`

---

## 5.8 Lead Faucet (Lead Generation + Routing) Pack
**Pack ID:** `pack.domain.lead_faucet.v1`
**Default orchestration:** Event-driven + scoring + fraud/risk gates

### Mission
Create a reliable lead intake and distribution system:
- acquisition -> validation -> enrichment -> scoring -> routing -> monitoring

### Agents
- `agent.lead_faucet.manager.v1`
- `subagent.leads.source_manager.v1`
- `subagent.leads.validation_dedup.v1`
- `subagent.leads.enrichment.v1`
- `subagent.leads.scoring.v1`
- `subagent.leads.routing.v1`
- `subagent.leads.fraud_risk.v1`
- `subagent.leads.reporting.v1`

**Gates**
- `gate.leads.quality.v1`
- `gate.leads.fraud_risk.v1`
- `gate.leads.cost_roi.v1`

---

## 5.9 Research Pack
**Pack ID:** `pack.domain.research.v1`
**Default orchestration:** Parallel research + verification + synthesis gate

### Mission
Produce defensible research outputs with:
- parallel searchers
- citation enforcement
- verifier agent
- synthesizer agent

### Agents
- `agent.research.manager.v1`
- `subagent.research.searcher_a.v1`
- `subagent.research.searcher_b.v1`
- `subagent.research.verifier.v1`
- `subagent.research.synthesizer.v1`

**Gates**
- `gate.research.citations_required.v1`
- `gate.research.claims_verification.v1`

---

## 5.10 Finance & Cashflow Pack
**Pack ID:** `pack.domain.finance_cashflow.v1`
**Default orchestration:** Sequential + controls gate + human approval for actions

### Agents
- `agent.finance.lead.v1`
- `subagent.finance.cashflow_modeler.v1`
- `subagent.finance.reconciliation.v1`
- `subagent.finance.risk_detector.v1`
- `subagent.finance.forecast_agent.v1`
- `subagent.finance.controls_auditor.v1`

**Gates**
- `gate.finance.controls.v1`
- `gate.finance.spending_policy.v1`
- `gate.finance.human_approval.v1`

---

## 5.11 Legal Pack
**Pack ID:** `pack.domain.legal.v1`
**Default orchestration:** Human-in-loop + adversarial review required

### Agents
- `agent.legal.lead.v1`
- `subagent.legal.issue_spotter.v1`
- `subagent.legal.authority_checker.v1`
- `subagent.legal.drafter.v1`
- `subagent.legal.adversarial_reviewer.v1`
- `subagent.legal.evidence_mapper.v1`

**Gates**
- `gate.legal.authority_required.v1`
- `gate.legal.adversarial_review.v1`
- `gate.legal.human_approval.v1`

---

## 5.12 Security & Compliance Pack
**Pack ID:** `pack.domain.security_compliance.v1`
**Default orchestration:** Adversarial + gated + escalation-ready

### Agents
- `agent.security.lead.v1`
- `subagent.security.secrets_manager.v1`
- `subagent.security.prompt_injection_redteam.v1`
- `subagent.security.dependency_auditor.v1`
- `subagent.security.pii_dlp_gatekeeper.v1`
- `subagent.security.policy_enforcer.v1`

**Gates**
- `gate.security.dlp.v1`
- `gate.security.supply_chain.v1`
- `gate.security.prompt_injection.v1`

---

## 6. Shared Gate Packs

These packs are imported broadly.

### 6.1 `pack.gates.quality.v1`
- correctness, completeness, clarity scorecards

### 6.2 `pack.gates.release.v1`
- CI green
- rollback plan required
- preview validation required

### 6.3 `pack.gates.compliance.v1`
- TCPA/CTIA
- privacy/retention
- legal authority checks

### 6.4 `pack.gates.security.v1`
- secrets scanning
- dependency scanning
- injection defenses

### 6.5 `pack.gates.ux.v1`
- accessibility AA
- conversion heuristics scorecard

---

## 7. Pack Overlays (Environment, Tenant, Project)

### 7.1 Environment overlays
- dev: permissive logging, no prod mutation
- preview: realistic checks, no financial actions
- prod: strict approvals, full audit, rate limits enforced

### 7.2 Tenant overlays (optional)
- per-tenant budget caps
- per-tenant messaging policies
- per-tenant memory isolation

### 7.3 Project overlays
- project-specific tools
- additional gates
- specialized subagents

---

## 8. Canonical Workflows Per Pack (Exhaustive)

AgentOS defines repeatable templates:

### 8.1 Build-and-Ship Workflow (Web/Mobile)
1. Plan + pre-mortem
2. Implement
3. Test
4. Security gate
5. Preview deploy
6. Runtime checks
7. Approval
8. Promote to prod
9. Monitor
10. Rollback if needed

### 8.2 Event-Driven Ops Workflow (Marketing/Integrations)
1. Trigger event
2. Validate + dedupe
3. Enrich
4. Policy gate
5. Execute
6. Observe metrics
7. Auto-pause on anomaly
8. Postmortem and patch

### 8.3 High-Stakes Workflow (Legal/Finance)
1. Draft
2. Authority check
3. Adversarial review
4. Human approval
5. Deliver
6. Audit archive

---

## 9. Standard Scorecards (Canonical)

Scorecards are referenced by gates. Examples:

- Quality scorecard: correctness/completeness/clarity/safety
- UX scorecard: friction, clarity, CTA strength, trust signals, AA compliance
- Compliance scorecard: TCPA/CTIA/privacy/retention
- Security scorecard: secrets, supply-chain, injection defenses
- Reliability scorecard: idempotency, retries, rollback readiness

---

## 10. Naming, Versioning, Compatibility

### Pack IDs
- `pack.core.<name>.v<major>`
- `pack.domain.<name>.v<major>`
- `pack.gates.<name>.v<major>`
- `pack.exec.<name>.v<major>`

### Compatibility policy
- packs declare min/max AgentOS version
- breaking schema changes bump major
- deprecated packs require migration plan

---

## 11. Anti-Patterns (Forbidden Pack Designs)

1. Packs that ship without gates
2. Packs that grant broad tool access to workers
3. Packs that allow production mutation without rollback policies
4. Packs that embed PII in long-term memory
5. Packs that lack canonical workflows
6. Packs that create "one agent to rule them all"

---

## 12. Appendix: Pack Index (Master Catalog)

### Core
- `pack.core.identity_and_persona.v1`
- `pack.core.memory_and_audit.v1`
- `pack.core.observability.v1`
- `pack.core.model_routing.v1`
- `pack.core.governance_primitives.v1`

### Domains
- `pack.domain.product_dev.v1`
- `pack.domain.design_uiux.v1`
- `pack.domain.web_corporate_and_landers.v1`
- `pack.domain.mobile_apps.v1`
- `pack.domain.supabase_db_edge.v1`
- `pack.domain.integrations.v1`
- `pack.domain.marketing_ops_messaging.v1`
- `pack.domain.lead_faucet.v1`
- `pack.domain.research.v1`
- `pack.domain.finance_cashflow.v1`
- `pack.domain.legal.v1`
- `pack.domain.security_compliance.v1`

### Gates
- `pack.gates.quality.v1`
- `pack.gates.release.v1`
- `pack.gates.compliance.v1`
- `pack.gates.security.v1`
- `pack.gates.ux.v1`

---

## Next Documents

Proceed next (Phase 1 remainder):
- `model_strategy.md`
- `EVALUATION_AND_GATES.md`
- `DEPLOYMENT.md`
- `SECURITY_AND_COMPLIANCE.md`
- `CONTRIBUTING.md`
- `CODE_OF_CONDUCT.md`

Packs are now defined. Next we define model strategy for multi-provider routing.
