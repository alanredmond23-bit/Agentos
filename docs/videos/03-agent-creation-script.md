# Video 03: Creating Agents

## Metadata

- **Duration:** 7 minutes
- **Audience:** Intermediate developers
- **Prerequisites:** Completed Quick Start (Video 02), basic YAML knowledge
- **Goal:** Create a custom agent from scratch using the YAML schema

---

## Scene Breakdown

### Scene 1: Introduction (0:00 - 0:30)

**Visuals:** Editor with blank YAML file, AgentOS docs in sidebar.

**Narration:**
"In AgentOS, agents are defined declaratively using YAML. This means you describe what an agent should do, not how to code it. In this video, we will create a complete agent from scratch, covering all the essential configuration sections. By the end, you will have a working agent ready for production."

**Actions:** Show the agents directory structure briefly

---

### Scene 2: Agent Identity (0:30 - 1:15)

**Visuals:** Editor with YAML being typed.

**Narration:**
"Every agent starts with an identity block. This defines who the agent is and how it fits into your system."

**Actions:** Type the following:
```yaml
agent:
  id: "agent.demo.assistant.v1"
  name: "Demo Assistant"
  short_name: "DA"
  version: "1.0.0"
  lifecycle_stage: "draft"
  domain: "demo"
  category: "worker"
  description: "A demonstration agent for tutorial purposes."
  owner_team: "platform"
  owner_contact: "team@example.com"
```

**Narration (continued):**
"The ID follows a standard pattern: agent dot domain dot role dot version. The lifecycle stage can be draft, beta, production, or deprecated. This helps your team understand which agents are ready for use."

---

### Scene 3: Mission and Scope (1:15 - 2:00)

**Visuals:** Continue typing in editor.

**Narration:**
"Next, define the agent's mission. This is critical for keeping agents focused and preventing scope creep."

**Actions:** Type the following:
```yaml
mission:
  purpose: "Assist with demonstration tasks and tutorials."
  scope:
    in_scope:
      - "answer questions about AgentOS"
      - "generate example configurations"
      - "explain concepts clearly"
    out_of_scope:
      - "modify production systems"
      - "access external APIs"
      - "store personal data"
  success_criteria:
    - "provides accurate information"
    - "stays within defined scope"
  constraints:
    max_runtime_seconds: 300
    max_tool_calls: 20
    max_cost_usd: 1.00
    max_tokens_total: 50000
```

**Narration (continued):**
"The scope section explicitly states what the agent can and cannot do. Constraints set hard limits on runtime, costs, and API usage. These are enforced by the runtime engine."

---

### Scene 4: Persona Configuration (2:00 - 2:45)

**Visuals:** Continue typing.

**Narration:**
"The persona section controls how the agent communicates. This ensures consistent tone across all interactions."

**Actions:** Type the following:
```yaml
persona:
  style:
    formality: "professional"
    voice: "helpful"
    verbosity: "high"
    directness: "high"
  language:
    primary: "en-US"
    allowed: ["en-US", "en-GB"]
  humor:
    enabled: false
  behavioral_controls:
    no_flattery: true
    no_speculation: true
    cite_sources_when_external: true
    admit_uncertainty: true
```

**Narration (continued):**
"Notice the behavioral controls. These prevent common AI issues like excessive flattery or making up facts. The agent will admit when it does not know something rather than guessing."

---

### Scene 5: Model Routing (2:45 - 3:30)

**Visuals:** Diagram of model routing, then back to editor.

**Narration:**
"AgentOS supports multiple LLM providers. The model section configures which models to use for different task types."

**Actions:** Type the following:
```yaml
models:
  routing_strategy: "task_class_router"
  task_classes:
    execution:
      provider_priority: ["openai", "anthropic"]
      model_priority: ["gpt-4o-mini", "claude-3-sonnet"]
      temperature: 0.2
      max_output_tokens: 4000
    review:
      provider_priority: ["anthropic", "openai"]
      model_priority: ["claude-3-opus", "gpt-4o"]
      temperature: 0.0
      max_output_tokens: 2000
  fallback_policy:
    on_timeout: ["switch_provider", "retry"]
    on_rate_limit: ["backoff", "switch_provider"]
  cost_controls:
    per_run_budget_usd: 1.0
    hard_stop_on_budget: true
```

**Narration (continued):**
"The task class router selects models based on what the agent is doing. Execution tasks use faster, cheaper models. Review tasks use more capable models. Fallback policies handle errors gracefully."

---

### Scene 6: Tools Configuration (3:30 - 4:15)

**Visuals:** Tools registry diagram, then editor.

**Narration:**
"Tools give agents capabilities to interact with the world. AgentOS uses an allowlist model for security."

**Actions:** Type the following:
```yaml
tools:
  registry_ref: "tool_registry.v1"
  permission_model: "allowlist"
  allowlist:
    - "docs.read"
    - "github.read"
    - "tests.run"
  denylist:
    - "payments.execute"
    - "messaging.send"
  side_effect_policy:
    read_only_by_default: true
    high_risk_requires:
      - "human_approval"
      - "audit_event"
  sandboxing:
    enabled: true
    network_access: "restricted"
```

**Narration (continued):**
"The allowlist explicitly grants access. The denylist blocks dangerous actions even if someone tries to expand permissions. Side effect policies require approval for high-risk operations."

---

### Scene 7: Memory and Governance (4:15 - 5:00)

**Visuals:** Memory architecture diagram, then editor.

**Narration:**
"AgentOS separates memory into working, session, long-term, and audit classes. Each has different retention rules."

**Actions:** Type the following:
```yaml
memory:
  enabled: true
  classes:
    working:
      retention: "ephemeral"
      write_enabled: true
    session:
      retention_days: 7
      pii_allowed: false
    audit:
      retention_days: 365
      immutable: true
  redaction:
    enabled: true
    patterns: ["ssn", "credit_card", "email"]

governance:
  required_gates:
    - "gate.quality.v1"
  approvals:
    enabled: true
    approver_roles: ["team_lead"]
```

**Narration (continued):**
"Notice PII is not allowed in session memory, and redaction patterns automatically mask sensitive data. The governance section specifies which gates must pass before outputs are delivered."

---

### Scene 8: Validation and Testing (5:00 - 5:45)

**Visuals:** Terminal running validation.

**Narration:**
"Before deploying, validate your YAML against the schema. AgentOS includes a validation script."

**Actions:** Save file, then run:
```bash
npm run validate:yaml -- agents/packs/demo/demo_assistant.yaml
```

**Narration (continued):**
"The validator checks for required fields, valid enum values, and policy violations. Fix any errors before proceeding."

**Actions:** Show successful validation output

---

### Scene 9: Running Your Agent (5:45 - 6:30)

**Visuals:** Terminal and Ops Console.

**Narration:**
"Now let us run the agent and see it in action."

**Actions:** Execute:
```bash
npm run agent -- --config agents/packs/demo/demo_assistant.yaml --input "Explain what AgentOS does"
```

**Narration (continued):**
"Watch the orchestrator load the YAML, apply the constraints, route to the model, and produce output. In the Ops Console, you can see the run appear with its status, cost, and token usage."

**Actions:** Switch to browser showing run details

---

### Scene 10: Next Steps (6:30 - 7:00)

**Visuals:** Documentation pages and pack index.

**Narration:**
"Congratulations, you have created your first agent. The full YAML schema supports over 250 fields for fine-grained control. Check the AGENTS.md documentation for the complete reference. Next, learn how to organize agents into packs for team-wide deployment, or explore the existing packs for inspiration."

**Actions:**
- Show AGENTS.md in browser
- Preview pack index page
- Show existing pack YAML files

---

## B-Roll Suggestions

- YAML syntax highlighting close-ups
- Flowchart animations for model routing
- Memory tier visualization
- Checkmark animations for validation passing

## Graphics Needed

1. Agent lifecycle stage diagram (draft -> production)
2. Model routing flowchart
3. Memory tiers visualization (4 levels)
4. Tool permission matrix
5. Validation success/failure indicators
6. YAML section header callouts

## Call to Action

- **Primary:** Learn pack management (Video 04)
- **Secondary:** Read the full YAML schema documentation
- **Tertiary:** Explore existing packs for patterns

## Code Snippets for Copy/Paste

Provide a complete working YAML file in the video description for viewers to copy.

## Common Mistakes to Address

1. Forgetting required fields (id, version)
2. Using invalid enum values for lifecycle_stage
3. Setting PII allowed without proper justification
4. Missing gate references
5. Unbounded cost/token limits
