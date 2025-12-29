# Glossary

Terms and definitions used throughout AgentOS documentation.

---

## A

### Agent
A formally specified runtime actor that performs specific tasks within defined constraints. Agents are defined in YAML and include mission, tools, gates, and authority configuration.

### Agent Pack
A domain-specific bundle of agents that work together, including a pack manager, worker agents, gates, workflows, and tool permissions. Example: Product Pack, Engineering Pack.

### Agent YAML
The YAML configuration file that defines an agent's identity, model settings, authority, tools, gates, and behavior.

### Anthropic
An AI safety company that provides Claude models. One of the supported LLM providers in AgentOS.

### Approval
A human-in-the-loop decision point where an operator must approve or reject an agent action before it proceeds.

### Audit Log
A comprehensive, immutable record of all actions taken by agents, including inputs, outputs, decisions, and outcomes.

### Authority
The permission configuration for an agent, defining what operations it can perform, what zones it can access, and what resources it can use.

---

## B

### Backoff
A retry strategy where wait time increases between retries, typically exponentially. Used to handle rate limits and transient failures.

### Blocking Failure
A gate check failure that prevents the agent from proceeding. Non-blocking failures are logged but allow continuation.

---

## C

### Chain of Thought
A reasoning technique where the model explicitly shows its step-by-step thinking process.

### Compliance Gate
A gate that enforces regulatory requirements such as TCPA, CTIA, or GDPR compliance.

### Context
The information available to an agent during execution, including conversation history, memory, and metadata.

### Cost Limit
A budget constraint that stops agent execution when spending exceeds a defined threshold.

---

## D

### Delegation
When a pack manager assigns tasks to worker agents. Configured in the agent's authority section.

### DeepSeek
An AI provider offering large language models. One of the supported LLM providers in AgentOS.

---

## E

### Endpoint
A specific LLM provider and model combination, e.g., "anthropic/claude-sonnet-4".

### Evaluator
A specialized agent that judges outputs against a scorecard and returns PASS/FAIL with suggested fixes.

### Execution Model
How an agent operates: autonomous, supervised, or approval-required.

### Extended Thinking
A reasoning mode that allows the model more time and tokens for complex reasoning.

---

## F

### Fallback Model
An alternative LLM model used when the primary model is unavailable or rate-limited.

### Forbidden Operations
Actions explicitly prohibited for an agent, listed in the authority configuration.

---

## G

### Gate
A checkpoint system that validates agent outputs before side effects occur. Types include quality, security, compliance, and review gates.

### Gate Check
A specific validation performed by a gate, such as "no PII" or "valid JSON".

### Green Zone
Low-risk zone where agents can operate autonomously without approval.

### Guardrail
A safety measure that prevents agents from performing harmful or unintended actions.

---

## H

### HMAC
Hash-based Message Authentication Code. Used for webhook signature verification.

### Human-in-the-Loop (HITL)
A workflow pattern where human approval is required before certain actions proceed.

---

## I

### Idempotency
The property that performing an operation multiple times produces the same result as performing it once. Used to prevent duplicate processing.

### Identity
The agent configuration block that defines who the agent is: ID, name, role, mission, and personality.

---

## K

### Kill Switch
An emergency control that immediately stops all agent execution. Can be global or per-pack.

---

## L

### LLM (Large Language Model)
The AI models that power agents, such as Claude, GPT, or Gemini.

### Long-term Memory
Persistent memory that survives across sessions, used for approved knowledge and learned patterns.

---

## M

### Manager Agent
See Pack Manager.

### MCP (Model Context Protocol)
A protocol for connecting AI models to external tools and data sources.

### Memory
The system for storing and retrieving information across agent executions. Types: working, session, long-term, audit.

### Model Router
The component that selects which LLM provider and model to use based on task requirements, availability, and cost.

---

## O

### Ops Console
The web-based interface for managing agent operations, approvals, kill switches, and audit logs.

### Orchestrator
The central component that routes tasks, manages lifecycle, and coordinates agent execution.

### Overlay
A configuration that extends or overrides base agent settings for specific environments or projects.

---

## P

### Pack
See Agent Pack.

### Pack Manager
The orchestrating agent within a pack that coordinates work among worker agents.

### Pack Registry
The central registry (`PACK_REGISTRY.yaml`) that lists all available agent packs.

### PII (Personally Identifiable Information)
Sensitive data that can identify an individual, such as SSN, email, or phone number. Automatically redacted by AgentOS.

### Policy
A configurable rule that governs agent behavior, such as rate limits, cost controls, or access restrictions.

### Policy Engine
The component that evaluates policies and enforces rules during agent execution.

### Preset
A named configuration of model parameters for specific use cases (e.g., "quick", "thorough", "creative").

### Provider
An LLM service provider such as Anthropic, OpenAI, or Google.

---

## Q

### Quality Gate
A gate that validates output quality, including completeness, clarity, and format.

---

## R

### Rate Limit
A restriction on how many requests can be made in a given time period.

### Reasoning Depth
A configuration that controls how deeply an agent analyzes problems before responding.

### Red Zone
High-risk zone for operations like billing or legal actions. Always requires human approval.

### Redaction
The process of masking or removing sensitive information from outputs and logs.

### Replay Attack
A security attack where a valid data transmission is maliciously repeated. Prevented by timestamp and nonce validation.

### Rollback
The ability to revert changes made by an agent, especially for production mutations.

### Run
A single execution of an agent from start to completion.

### Run Context
The complete state of an agent execution, including messages, tool calls, costs, and metadata.

### Runtime
The TypeScript orchestration engine that executes agents, enforces policies, and manages state.

---

## S

### Scorecard
A set of weighted criteria used by evaluators to assess output quality.

### Secrets
Sensitive credentials like API keys that must be protected from exposure.

### Security Gate
A gate that enforces security requirements, such as no PII or no secrets in output.

### Session Memory
Memory that persists for the duration of a conversation or session, typically 30 days.

### Side Effect
An action that affects external systems, such as writing to a database or sending a message.

### State Store
The component that persists run and agent state for recovery and auditing.

### Subagent
A specialized agent with narrow scope, often invoked by other agents for specific tasks.

---

## T

### Task Class
A category of work that determines how an agent processes a request (e.g., "planning", "execution", "review").

### Task Router
The component that routes tasks to appropriate agents based on capabilities and availability.

### TCPA
Telephone Consumer Protection Act. US regulation governing telemarketing communications.

### Token
A unit of text processed by LLMs. Tokens roughly correspond to word pieces.

### Token Limit
The maximum number of tokens an agent can use in a single run.

### Tool
A capability that an agent can invoke, such as web search, database query, or API call.

### Tools Registry
The component that manages available tools and their permissions.

---

## V

### Validation
The process of checking that configurations and outputs meet required criteria.

### Vector Store
A database optimized for storing and querying embeddings, used for semantic memory retrieval.

---

## W

### Webhook
An HTTP callback that notifies AgentOS of external events.

### Worker
A worker agent that performs specific tasks as directed by a pack manager.

### Workflow
A sequence of agent activities that accomplishes a business goal.

### Working Memory
Ephemeral memory used during a single task execution, discarded when the task completes.

---

## Y

### Yellow Zone
Medium-risk zone for operations on APIs and core services. Requires tests and review.

---

## Z

### Zone
A security classification (RED, YELLOW, GREEN) that determines what approvals are required for agent actions.

### Zone Access
The configuration that specifies which zones an agent can operate in.

---

## See Also

- [02 - Core Concepts](./02-concepts.md) - Detailed explanation of key concepts
- [08 - Troubleshooting](./08-troubleshooting.md) - Problem solving guide
- [09 - FAQ](./09-faq.md) - Frequently asked questions

---

Previous: [09 - FAQ](./09-faq.md) | [Return to README](./README.md)
