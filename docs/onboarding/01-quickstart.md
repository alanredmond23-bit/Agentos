# 01 - Quickstart Guide

Get AgentOS running on your machine in under 5 minutes. This guide covers installation, basic setup, and running your first agent.

---

## Overview

AgentOS is a modular, event-driven system for orchestrating AI agents at scale. In this quickstart, you will clone the repository, install dependencies, and run the development environment.

---

## Prerequisites

Before starting, verify you have:

```bash
# Check Node.js version (requires 18+)
node --version

# Check npm version
npm --version

# Check git
git --version
```

You will also need API keys for at least one LLM provider:
- OpenAI API key
- Anthropic API key
- Google AI (Gemini) API key

---

## Step 1: Clone the Repository

```bash
# Clone AgentOS
git clone https://github.com/alanredmond23-bit/Agentos.git
cd Agentos
```

---

## Step 2: Install Dependencies

```bash
# Install all dependencies
npm install
```

This installs:
- Runtime engine dependencies
- Ops console dependencies
- Evaluation framework dependencies

---

## Step 3: Configure Environment

Create a `.env` file in the project root:

```bash
# Copy the example environment file
cp .env.example .env
```

Edit `.env` with your API keys:

```env
# LLM Provider Keys
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_AI_API_KEY=...

# Optional: DeepSeek
DEEPSEEK_API_KEY=...

# Database (optional for local dev)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJ...

# Runtime Configuration
NODE_ENV=development
LOG_LEVEL=info
```

---

## Step 4: Bootstrap the Environment

Run the bootstrap script to initialize the project:

```bash
./scripts/bootstrap_repo.sh
```

This script:
- Validates your environment
- Sets up configuration files
- Initializes the local database (if configured)
- Prepares the agent registry

---

## Step 5: Start the Development Server

```bash
# Start the runtime and ops console
npm run dev
```

You should see:

```
[runtime] AgentOS Runtime v1.0.0 started
[runtime] Loaded 14 agent packs (84 agents)
[console] Ops Console running at http://localhost:3001
[runtime] Ready to accept tasks
```

---

## Step 6: Access the Ops Console

Open your browser and navigate to:

```
http://localhost:3001
```

You will see the AgentOS Ops Console with:
- **Dashboard**: System overview and metrics
- **Approvals**: Pending human-in-the-loop actions
- **Kill Switch**: Emergency controls for agents
- **Audit Log**: Activity history

---

## Step 7: Run a Test Agent

Open a new terminal and run a quick test:

```bash
# Validate the product pack
npm run validate -- --pack product

# Run a test agent
npm run agent:test -- --pack product --agent prd_writer
```

Expected output:

```
[test] Loading Product Pack...
[test] Agent: product_prd_writer
[test] Status: READY
[test] Running health check...
[test] Health check passed
```

---

## Step 8: Verify Installation

Run the preflight check to verify everything is configured correctly:

```bash
npm run preflight
```

All checks should pass:

```
[preflight] Checking environment...
[preflight] Node.js: 20.10.0 OK
[preflight] Dependencies: OK
[preflight] API Keys: 2/4 configured OK
[preflight] Agent Registry: 14 packs loaded OK
[preflight] Runtime: OK
[preflight] All checks passed!
```

---

## Project Structure

Now that you are running, here is the key structure:

```
Agentos/
|-- agents/                 # Agent definitions
|   |-- packs/              # Domain-specific packs
|   |   |-- product/        # Product pack
|   |   |-- engineering/    # Engineering pack
|   |   |-- marketing/      # Marketing pack
|   |   +-- ...
|   +-- PACK_REGISTRY.yaml  # Pack registry
|
|-- runtime/                # TypeScript runtime engine
|   |-- core/               # Orchestrator, gates, policies
|   |-- adapters/           # LLM provider adapters
|   |-- security/           # PII redaction, secrets
|   +-- webhooks/           # Webhook handlers
|
|-- ops/                    # Operations
|   |-- console/            # Web-based ops console
|   |-- policies/           # Security policies
|   +-- dashboards/         # Monitoring dashboards
|
|-- evals/                  # Evaluation framework
|   |-- suites/             # Test suites
|   |-- golden_tasks/       # Reference test cases
|   +-- adversarial/        # Security tests
|
+-- docs/                   # Documentation
```

---

## Common Pitfalls

### Node.js Version Too Old

```
Error: Unsupported engine
```

**Solution**: Upgrade to Node.js 18+. Use nvm for version management:

```bash
nvm install 18
nvm use 18
```

### Missing API Keys

```
Error: No API key configured for provider
```

**Solution**: Add at least one LLM provider key to your `.env` file.

### Port Already in Use

```
Error: Port 3001 already in use
```

**Solution**: Change the port in `ops/console/vite.config.ts` or stop the conflicting process.

### Bootstrap Script Fails

```
Error: Permission denied
```

**Solution**: Make the script executable:

```bash
chmod +x scripts/bootstrap_repo.sh
```

---

## Next Steps

You now have AgentOS running locally. Continue with:

1. **[Core Concepts](./02-concepts.md)** - Understand how AgentOS works
2. **[First Agent](./03-first-agent.md)** - Create your own agent
3. **[Agent Packs](./04-packs.md)** - Explore domain-specific agents

---

## Quick Reference Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preflight` | Verify installation |
| `npm run validate` | Validate YAML configurations |
| `npm run evals` | Run evaluation suite |
| `npm run agent:test` | Test a specific agent |

---

Previous: [README](./README.md) | Next: [02 - Core Concepts](./02-concepts.md)
