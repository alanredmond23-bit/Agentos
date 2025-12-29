# AgentOS Onboarding Guide

Welcome to AgentOS, the open-source operating system for AI agent orchestration. This documentation will guide you from zero to deploying production-ready AI agents.

---

## Learning Path

Follow this structured path to master AgentOS:

### Getting Started
| Document | Description | Time |
|----------|-------------|------|
| [01 - Quickstart](./01-quickstart.md) | Get running in 5 minutes | 5 min |
| [02 - Core Concepts](./02-concepts.md) | Understand agents, packs, runtime, gates | 15 min |
| [03 - First Agent](./03-first-agent.md) | Create your first agent | 20 min |

### Deep Dives
| Document | Description | Time |
|----------|-------------|------|
| [04 - Agent Packs](./04-packs.md) | Domain-specific agent bundles | 20 min |
| [05 - Runtime](./05-runtime.md) | Configuration and deployment | 25 min |
| [06 - Security](./06-security.md) | Best practices and compliance | 15 min |

### Operations
| Document | Description | Time |
|----------|-------------|------|
| [07 - Ops Console](./07-ops-console.md) | Monitoring and approvals | 15 min |
| [08 - Troubleshooting](./08-troubleshooting.md) | Common issues and solutions | 10 min |
| [09 - FAQ](./09-faq.md) | Frequently asked questions | 10 min |

### Reference
| Document | Description |
|----------|-------------|
| [Glossary](./GLOSSARY.md) | Terms and definitions |

---

## Quick Navigation

### By Role

**Developers**
1. Start with [Quickstart](./01-quickstart.md)
2. Read [Core Concepts](./02-concepts.md)
3. Build your [First Agent](./03-first-agent.md)
4. Explore [Agent Packs](./04-packs.md)

**DevOps/SRE**
1. Start with [Runtime](./05-runtime.md)
2. Review [Security](./06-security.md)
3. Learn [Ops Console](./07-ops-console.md)
4. Keep [Troubleshooting](./08-troubleshooting.md) handy

**Technical Leaders**
1. Review [Core Concepts](./02-concepts.md)
2. Understand [Agent Packs](./04-packs.md)
3. Study [Security](./06-security.md)

---

## Architecture Overview

```
+-----------------------------------------------------------+
|                      OPS CONSOLE                          |
|    Dashboards | Approvals | Kill Switches | Audit Logs    |
+----------------------------+------------------------------+
                             |
+----------------------------v------------------------------+
|                     RUNTIME ENGINE                        |
|  Orchestrator | Task Router | Gates | Policy Engine       |
+----------------------------+------------------------------+
                             |
+----------------------------v------------------------------+
|                     AGENT PACKS                           |
|  Product | Marketing | Engineering | Design | ...         |
+-----------------------------------------------------------+
```

---

## Prerequisites

Before starting, ensure you have:

- **Node.js 18+** - Runtime environment
- **npm or pnpm** - Package manager
- **Git** - Version control
- **API Keys** - For LLM providers (OpenAI, Anthropic, etc.)

---

## Getting Help

- **Documentation**: Start with [Core Concepts](./02-concepts.md)
- **Troubleshooting**: See [Common Issues](./08-troubleshooting.md)
- **FAQ**: Check [Frequently Asked Questions](./09-faq.md)
- **Issues**: Open a GitHub issue for bugs or features
- **Security**: Report vulnerabilities to security@agentos.dev

---

## What You Will Build

By the end of this guide, you will:

1. **Run AgentOS locally** with the development server
2. **Understand the architecture** and core concepts
3. **Create a custom agent** with YAML configuration
4. **Deploy agent packs** for your domain
5. **Configure security gates** and policies
6. **Monitor operations** through the ops console

---

## Estimated Total Time

| Section | Time |
|---------|------|
| Getting Started | 40 min |
| Deep Dives | 60 min |
| Operations | 35 min |
| **Total** | **~2.5 hours** |

---

Next: [01 - Quickstart Guide](./01-quickstart.md)
