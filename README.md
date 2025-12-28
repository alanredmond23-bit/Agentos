# AgentOS

**The open-source operating system for AI agent orchestration.**

AgentOS provides a production-ready framework for deploying, managing, and scaling AI agents across your organization. Built with enterprise security, compliance, and observability as first-class citizens.

## Core Concepts

- **Packs**: Domain-specific collections of agents (Product, Marketing, Engineering, etc.)
- **Agents**: YAML-defined autonomous workers with tools, policies, and gates
- **Runtime**: TypeScript orchestration engine with multi-provider LLM support
- **Evals**: Comprehensive testing framework for agent reliability
- **Ops Console**: Real-time monitoring, approvals, and kill switches

## Quick Start

```bash
# Clone the repository
git clone https://github.com/alanredmond23-bit/Agentos.git
cd Agentos

# Install dependencies
npm install

# Bootstrap the environment
./scripts/bootstrap_repo.sh

# Run the development server
npm run dev
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Ops Console                          │
│    (Dashboards, Approvals, Kill Switches, Audit Logs)       │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                      Runtime Engine                          │
│  ┌─────────┐  ┌──────────┐  ┌────────┐  ┌───────────────┐   │
│  │Orchestr.│  │Task Route│  │ Gates  │  │Policy Engine  │   │
│  └─────────┘  └──────────┘  └────────┘  └───────────────┘   │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                      Agent Packs                             │
│  ┌─────────┐ ┌─────────┐ ┌──────────┐ ┌─────────┐           │
│  │ Product │ │Marketing│ │Supabase  │ │Engineer │  ...      │
│  └─────────┘ └─────────┘ └──────────┘ └─────────┘           │
└─────────────────────────────────────────────────────────────┘
```

## Packs

| Pack | Description | Status |
|------|-------------|--------|
| [Product](docs/packs/product_pack.md) | PRDs, specs, discovery, delivery | ✅ Active |
| [Marketing](docs/packs/marketing_pack.md) | Campaigns, SMS/MMS, compliance | ✅ Active |
| [Supabase](docs/packs/supabase_pack.md) | Schema, RLS, Edge Functions | ✅ Active |
| [Engineering](docs/packs/engineering_pack.md) | Implementation, CI/CD, testing | ✅ Active |
| [Design](docs/packs/design_pack.md) | UX research, UI specs, components | ✅ Active |
| [Mobile](docs/packs/mobile_pack.md) | React Native, iOS, Android | 🔧 Building |
| [DevOps](docs/packs/devops_pack.md) | Infrastructure, deployment | 🔧 Building |
| [Research](docs/packs/research_pack.md) | Market analysis, competitive intel | 🔧 Building |
| [Planning](docs/packs/planning_pack.md) | Roadmaps, sprint planning | 🔧 Building |
| [Error Predictor](docs/packs/error_predictor_pack.md) | Failure prediction, prevention | 🔧 Building |
| [Finance](docs/packs/finance_pack.md) | Budgets, invoicing, reporting | 🔧 Building |
| [Legal](docs/packs/legal_pack.md) | Contracts, compliance, risk | 🔧 Building |
| [Lead Faucet](docs/packs/lead_faucet_pack.md) | Lead generation, qualification | 🔧 Building |

## Documentation

- [Architecture Overview](docs/architecture.md)
- [Pack Index](docs/packs/index.md)
- [Runbooks](docs/runbooks/)
- [Standards](docs/standards/)

## Security

See [SECURITY.md](SECURITY.md) for reporting vulnerabilities.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines.

## License

MIT License - see [LICENSE](LICENSE) for details.
