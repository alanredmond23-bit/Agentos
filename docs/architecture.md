# AgentOS Architecture

## Overview

AgentOS is a modular, event-driven system for orchestrating AI agents at scale. The architecture prioritizes:

- **Reliability**: Idempotent operations, retry mechanisms, and graceful degradation
- **Security**: PII redaction, RLS enforcement, and comprehensive audit logging
- **Observability**: Real-time monitoring, tracing, and alerting
- **Extensibility**: Plugin architecture for new providers, tools, and agents

## System Layers

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           OPS CONSOLE                                    │
│  ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌──────────┐ ┌──────────────┐  │
│  │Dashboard │ │Approvals │ │Kill Switch│ │Audit Log │ │Cost Tracking │  │
│  └──────────┘ └──────────┘ └───────────┘ └──────────┘ └──────────────┘  │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │
┌─────────────────────────────────▼───────────────────────────────────────┐
│                          RUNTIME ENGINE                                  │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────────────┐    │
│  │Orchestrator│ │Task Router │ │State Store │ │  Policy Engine     │    │
│  └────────────┘ └────────────┘ └────────────┘ └────────────────────┘    │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────────────┐    │
│  │  Approvals │ │Idempotency │ │   Audit    │ │      Gates         │    │
│  └────────────┘ └────────────┘ └────────────┘ └────────────────────┘    │
│  ┌────────────┐ ┌────────────┐                                          │
│  │Tools Reg.  │ │Model Router│                                          │
│  └────────────┘ └────────────┘                                          │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │
┌─────────────────────────────────▼───────────────────────────────────────┐
│                           ADAPTERS                                       │
│  ┌──────────┐ ┌───────────┐ ┌──────────┐ ┌───────────┐                  │
│  │ OpenAI   │ │ Anthropic │ │  Gemini  │ │ DeepSeek  │                  │
│  └──────────┘ └───────────┘ └──────────┘ └───────────┘                  │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │
┌─────────────────────────────────▼───────────────────────────────────────┐
│                         AGENT PACKS                                      │
│  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌────────┐         │
│  │ Product │ │Marketing │ │ Supabase │ │Engineering│ │ Design │  ...    │
│  └─────────┘ └──────────┘ └──────────┘ └───────────┘ └────────┘         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Core Components

### Orchestrator

The central coordinator that:
- Receives task requests from the ops console or API
- Routes tasks to appropriate agent packs
- Manages task lifecycle (queuing, execution, completion)
- Handles failures and retries

### Task Router

Intelligent routing based on:
- Task type and content analysis
- Agent capabilities and availability
- Load balancing across pack instances
- Priority and SLA requirements

### State Store

Persistent state management:
- Task states and history
- Agent execution context
- Approval workflow states
- Idempotency keys

### Policy Engine

Configurable policies for:
- Rate limiting and quotas
- Cost controls
- Access control
- Compliance rules

### Gates

Checkpoint system for:
- Quality validation
- Security scanning
- Compliance verification
- Human approval requirements

### Model Router

Multi-provider LLM management:
- Provider selection based on task requirements
- Fallback chains for reliability
- Cost optimization
- Rate limit handling

## Data Flow

```
1. Request → Orchestrator
2. Orchestrator → Policy Engine (validate)
3. Policy Engine → Task Router (route)
4. Task Router → Agent Pack (execute)
5. Agent Pack → Gates (checkpoint)
6. Gates → Approvals (if required)
7. Agent Pack → Model Router → LLM Provider
8. Response → State Store (persist)
9. State Store → Audit (log)
10. Response → Caller
```

## Security Model

See [webhook_replay_defense.md](diagrams/webhook_replay_defense.md) for webhook security details.

## Deployment

See [ops_console.md](runbooks/ops_console.md) for deployment instructions.
