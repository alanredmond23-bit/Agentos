# 03 - Create Your First Agent

This tutorial walks you through creating a custom agent from scratch. You will define the YAML configuration, validate it, and run the agent.

---

## Overview

In this tutorial, you will create a simple "Code Reviewer" agent that analyzes code and provides feedback. This covers all essential aspects of agent creation.

---

## Prerequisites

- Completed [01 - Quickstart](./01-quickstart.md)
- Read [02 - Core Concepts](./02-concepts.md)
- AgentOS running locally

---

## Step 1: Create the Agent Directory

First, create a directory for your custom agent:

```bash
# Create a custom agents directory
mkdir -p agents/custom/code_reviewer
```

---

## Step 2: Define the Agent YAML

Create the agent configuration file:

```bash
touch agents/custom/code_reviewer/code_reviewer.yaml
```

Add the following YAML configuration:

```yaml
# ==============================================================================
# CODE REVIEWER AGENT - Custom Agent Example
# AgentOS Onboarding Tutorial
# ==============================================================================

# ------------------------------------------------------------------------------
# SECTION 1: IDENTITY
# Who is this agent and what is its purpose?
# ------------------------------------------------------------------------------
identity:
  agent_id: "CUSTOM-CR-01"
  name: "Code Reviewer"
  version: "1.0.0"
  icon: "🔍"
  role: "Code Quality Analyst"
  pack: "custom"
  is_manager: false

  personality:
    description: "Thorough code reviewer focused on best practices"
    traits:
      - "Detail-oriented"
      - "Constructive"
      - "Security-conscious"
      - "Performance-aware"
    communication_style: "Clear, actionable feedback"
    directness_level: 0.80
    humor_enabled: false
    profanity_allowed: false

  mission: "Review code for quality, security, and best practices, providing actionable feedback"

  values:
    - "Code Quality"
    - "Security First"
    - "Maintainability"
    - "Clear Communication"

  knowledge_domains:
    - "Software Engineering"
    - "Code Review Best Practices"
    - "Security Vulnerabilities"
    - "Performance Optimization"
    - "Clean Code Principles"

# ------------------------------------------------------------------------------
# SECTION 2: MODEL CONFIGURATION
# Which LLM should power this agent?
# ------------------------------------------------------------------------------
model:
  provider: "anthropic"
  model_id: "claude-sonnet-4-20250514"

  fallback_models:
    - provider: "anthropic"
      model_id: "claude-3-5-sonnet-20241022"
    - provider: "openai"
      model_id: "gpt-4-turbo"

  parameters:
    temperature: 0.3        # Lower for more consistent reviews
    top_p: 0.85
    max_tokens: 8000
    stop_sequences:
      - "---END REVIEW---"

  presets:
    default:
      temperature: 0.3
      max_tokens: 8000

    thorough:
      temperature: 0.2
      max_tokens: 16000

    quick:
      temperature: 0.4
      max_tokens: 4000

# ------------------------------------------------------------------------------
# SECTION 3: REASONING CONFIGURATION
# How should this agent think?
# ------------------------------------------------------------------------------
reasoning:
  mode: "analytical"
  think_mode: "methodical"
  extended_thinking: true
  chain_of_thought: "structured_analysis"
  reasoning_depth: 3

  decision_framework:
    primary: "Code Quality"
    secondary: "Security"
    tertiary: "Performance"
    quaternary: "Maintainability"

# ------------------------------------------------------------------------------
# SECTION 4: AUTHORITY & PERMISSIONS
# What is this agent allowed to do?
# ------------------------------------------------------------------------------
authority:
  level: "Worker"
  zone: "GREEN"

  execution_model: "autonomous"

  zone_access:
    red: false
    yellow: false
    green: true

  allowed_operations:
    - "code_analysis"
    - "feedback_generation"
    - "documentation_review"

  forbidden_operations:
    - "code_modification"
    - "file_deletion"
    - "production_deployment"
    - "secret_access"

  financial_limits:
    auto_execute: 0
    require_confirmation: 0
    absolute_max: 5
    daily_limit: 20

# ------------------------------------------------------------------------------
# SECTION 5: TOOLS & CAPABILITIES
# What tools can this agent use?
# ------------------------------------------------------------------------------
tools:
  primary:
    - name: "code_analyzer"
      description: "Analyze code structure and patterns"
      input_schema:
        code: "string"
        language: "string"
      output: "analysis_report"

    - name: "security_scanner"
      description: "Scan for common security vulnerabilities"
      input_schema:
        code: "string"
      output: "security_findings"

    - name: "feedback_generator"
      description: "Generate structured review feedback"
      input_schema:
        analysis: "object"
        findings: "object"
      output: "review_document"

  secondary:
    - "complexity_calculator"
    - "naming_validator"
    - "documentation_checker"

# ------------------------------------------------------------------------------
# SECTION 6: MEMORY & CONTEXT
# How does this agent remember things?
# ------------------------------------------------------------------------------
memory:
  type: "session"
  storage: "local"
  retention: "session_duration"

  context_management:
    max_tokens: 50000
    priority_sources:
      - "current_code"
      - "review_history"
      - "project_conventions"

# ------------------------------------------------------------------------------
# SECTION 7: GATES & POLICIES
# What quality checks must pass?
# ------------------------------------------------------------------------------
gates:
  required:
    - id: "gate.quality.review_completeness"
      description: "Review covers all required areas"
      type: "quality"
      threshold: 0.85

  optional:
    - id: "gate.quality.actionable_feedback"
      description: "Feedback is actionable"
      type: "quality"
      threshold: 0.80

policies:
  execution:
    max_retries: 2
    timeout_seconds: 120

  quality:
    require_examples: true
    require_severity_ratings: true
    require_line_references: true

# ------------------------------------------------------------------------------
# SECTION 8: VOICE & COMMUNICATION
# How should this agent communicate?
# ------------------------------------------------------------------------------
voice:
  response_time_target: 5000
  personality_preset: "constructive-reviewer"
  output_format: "structured_markdown"

  communication:
    interruption_handling: true
    multi_turn_awareness: true
    context_preservation: true

# ------------------------------------------------------------------------------
# SECTION 9: EXPECTED RESULTS
# What output format should this agent produce?
# ------------------------------------------------------------------------------
expected_results:
  code_review:
    format: "markdown"
    sections:
      - "summary"
      - "critical_issues"
      - "suggestions"
      - "positive_highlights"
      - "action_items"

  review_template: |
    ## Code Review Summary

    ### Critical Issues
    {critical_issues}

    ### Suggestions for Improvement
    {suggestions}

    ### Positive Highlights
    {highlights}

    ### Action Items
    {action_items}

# ------------------------------------------------------------------------------
# SECTION 10: SAFETY & GUARDRAILS
# What safety measures are in place?
# ------------------------------------------------------------------------------
safety:
  guardrails:
    prevent_code_execution: true
    prevent_file_modification: true
    constructive_feedback_only: true
    no_personal_attacks: true

  validation:
    - "Feedback is constructive"
    - "No executable code in output"
    - "Privacy-respecting comments"
    - "Professional tone maintained"

  emergency:
    abort_command: "ABORT REVIEW"
    notification_channels:
      - "console"

# ------------------------------------------------------------------------------
# SECTION 11: ACTIVATION
# How is this agent started?
# ------------------------------------------------------------------------------
activation:
  auto_start: false

  startup_message: |
    Code Reviewer ready for analysis.
    Supported languages: JavaScript, TypeScript, Python, Go, Rust
    Review modes: quick, default, thorough
    Please provide the code you would like reviewed.

  health_check:
    interval: 300
    checks:
      - "model_connectivity"
      - "tool_availability"
```

---

## Step 3: Validate the Agent Configuration

Run the YAML validator to ensure your configuration is correct:

```bash
npm run validate -- --file agents/custom/code_reviewer/code_reviewer.yaml
```

Expected output:

```
[validate] Validating agents/custom/code_reviewer/code_reviewer.yaml
[validate] Schema: VALID
[validate] Required fields: PRESENT
[validate] Zone permissions: VALID
[validate] Tool references: VALID
[validate] Gate references: VALID
[validate] Validation passed!
```

---

## Step 4: Test the Agent Locally

Run a quick test to verify the agent loads correctly:

```bash
npm run agent:test -- \
  --file agents/custom/code_reviewer/code_reviewer.yaml \
  --dry-run
```

Expected output:

```
[test] Loading agent: code_reviewer
[test] Agent ID: CUSTOM-CR-01
[test] Pack: custom
[test] Zone: GREEN
[test] Model: anthropic/claude-sonnet-4-20250514
[test] Tools: 3 primary, 3 secondary
[test] Gates: 1 required, 1 optional
[test] Dry run complete - agent is ready
```

---

## Step 5: Create a Test Input

Create a test input file to exercise your agent:

```bash
mkdir -p agents/custom/code_reviewer/tests
```

Create `agents/custom/code_reviewer/tests/sample_input.json`:

```json
{
  "task": "review",
  "input": {
    "code": "function calculateTotal(items) {\n  var total = 0;\n  for (var i = 0; i < items.length; i++) {\n    total = total + items[i].price;\n  }\n  return total\n}",
    "language": "javascript",
    "mode": "default"
  },
  "context": {
    "project": "e-commerce",
    "file_path": "src/utils/cart.js"
  }
}
```

---

## Step 6: Run the Agent

Execute your agent with the test input:

```bash
npm run agent:run -- \
  --file agents/custom/code_reviewer/code_reviewer.yaml \
  --input agents/custom/code_reviewer/tests/sample_input.json
```

The agent will analyze the code and produce a review:

```markdown
## Code Review Summary

### Critical Issues
1. **Missing semicolon** (Line 6)
   - Severity: Low
   - The return statement is missing a semicolon

### Suggestions for Improvement
1. **Use modern variable declarations**
   - Replace `var` with `const` or `let`
   - Example: `const total = 0;`

2. **Use array methods**
   - Replace for loop with `reduce()`
   - Example: `return items.reduce((sum, item) => sum + item.price, 0);`

3. **Add input validation**
   - Check if items is an array
   - Handle null/undefined items

### Positive Highlights
- Clear function naming
- Single responsibility principle followed

### Action Items
- [ ] Fix missing semicolon
- [ ] Refactor to use const/let
- [ ] Consider using reduce() for cleaner code
- [ ] Add input validation
```

---

## Step 7: Register the Agent (Optional)

To include your agent in a pack, update the pack registry:

```yaml
# Add to agents/PACK_REGISTRY.yaml under custom section
custom:
  - id: "pack.custom.code_tools.v1"
    name: "Custom Code Tools"
    domain: "custom"
    lifecycle_stage: "development"
    agents:
      - "agent.custom.code_reviewer.v1"
```

---

## Understanding the Configuration

### Identity Block

The identity block defines who the agent is:

```yaml
identity:
  agent_id: "CUSTOM-CR-01"    # Unique identifier
  name: "Code Reviewer"        # Display name
  role: "Code Quality Analyst" # Role description
  pack: "custom"               # Parent pack
  is_manager: false            # Worker, not manager
```

### Model Configuration

The model block controls LLM behavior:

```yaml
model:
  provider: "anthropic"        # LLM provider
  model_id: "claude-sonnet-4-20250514"

  parameters:
    temperature: 0.3           # Lower = more consistent
    max_tokens: 8000           # Maximum output length
```

### Authority Block

The authority block defines permissions:

```yaml
authority:
  zone: "GREEN"                # Low risk zone
  allowed_operations:
    - "code_analysis"          # Can analyze code
  forbidden_operations:
    - "code_modification"      # Cannot modify code
```

---

## Common Pitfalls

### Schema Validation Errors

```
Error: Missing required field 'identity.agent_id'
```

**Solution**: Ensure all required fields are present. Check the schema documentation.

### Model Configuration Issues

```
Error: Unknown model provider 'claude'
```

**Solution**: Use valid provider names: `anthropic`, `openai`, `google`, `deepseek`

### Tool Permission Errors

```
Error: Tool 'file_write' not in allowlist
```

**Solution**: Only use tools defined in the `tools` section

### Zone Access Violations

```
Error: Agent in GREEN zone cannot access YELLOW resources
```

**Solution**: Match zone access in authority configuration to required resources

---

## Next Steps

Now that you have created your first agent:

1. **[Agent Packs](./04-packs.md)** - Learn to organize agents into packs
2. **[Runtime](./05-runtime.md)** - Configure runtime behavior
3. **[Security](./06-security.md)** - Add security gates

---

## Reference: Minimal Agent Template

For quick starts, here is a minimal agent template:

```yaml
identity:
  agent_id: "MINIMAL-01"
  name: "Minimal Agent"
  version: "1.0.0"
  pack: "custom"
  is_manager: false
  mission: "Describe the agent's purpose"

model:
  provider: "anthropic"
  model_id: "claude-sonnet-4-20250514"
  parameters:
    temperature: 0.5
    max_tokens: 4000

authority:
  level: "Worker"
  zone: "GREEN"
  allowed_operations:
    - "read"
    - "analyze"
  forbidden_operations:
    - "write"
    - "delete"

gates:
  required:
    - id: "gate.quality.v1"
      threshold: 0.85
```

---

Previous: [02 - Core Concepts](./02-concepts.md) | Next: [04 - Agent Packs](./04-packs.md)
