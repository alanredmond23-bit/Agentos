# 09 - Frequently Asked Questions

Answers to common questions about AgentOS. If you do not find your answer here, check the [Troubleshooting Guide](./08-troubleshooting.md) or open a GitHub issue.

---

## General Questions

### What is AgentOS?

AgentOS is an open-source operating system for AI agent orchestration. It provides a production-ready framework for deploying, managing, and scaling AI agents across organizations, with enterprise security, compliance, and observability as first-class citizens.

### Is AgentOS free to use?

Yes. AgentOS is open-source under the MIT license. You can use, modify, and distribute it freely. Note that you will need your own API keys for LLM providers (OpenAI, Anthropic, etc.), which have their own pricing.

### What LLM providers are supported?

AgentOS supports multiple providers:
- **Anthropic** (Claude models)
- **OpenAI** (GPT models)
- **Google AI** (Gemini models)
- **DeepSeek**

The model router handles failover between providers automatically.

### Can I use local/self-hosted models?

Yes. You can add custom adapters for local models by implementing the adapter interface in `/runtime/adapters/`. See the existing adapters for examples.

---

## Architecture Questions

### What is an Agent Pack?

An Agent Pack is a domain-specific bundle of agents that work together. Each pack includes:
- A pack manager (orchestrating agent)
- Worker agents (specialized tasks)
- Gates (quality checkpoints)
- Workflows (standard processes)

### What is the difference between an Agent and a Subagent?

- **Agent**: A fully-specified autonomous worker with broad capabilities
- **Subagent**: A specialized agent with narrow scope, often invoked by other agents for specific tasks

### What are Gates?

Gates are checkpoint systems that validate agent outputs before side effects occur. They include:
- **Quality Gates**: Validate output quality
- **Security Gates**: Detect sensitive data
- **Compliance Gates**: Regulatory requirements
- **Review Gates**: Human approval

### What are Zones?

AgentOS uses a three-zone security model:
- **RED**: High-risk operations (billing, legal) - requires approval
- **YELLOW**: Medium-risk (APIs, core services) - requires tests + review
- **GREEN**: Low-risk (features, docs) - autonomous

---

## Development Questions

### How do I create a new agent?

1. Create a YAML file in your pack directory
2. Define identity, model, authority, tools, and gates
3. Validate with `npm run validate -- --file your_agent.yaml`
4. Test with `npm run agent:test -- --file your_agent.yaml`

See [03 - First Agent](./03-first-agent.md) for a complete tutorial.

### How do I create a new pack?

1. Create directory structure: `agents/packs/your_pack/agents/`
2. Create pack documentation: `AGENT_PACK.md`
3. Create pack manager and worker agents
4. Register in `PACK_REGISTRY.yaml`
5. Validate with `npm run validate -- --pack your_pack`

See [04 - Agent Packs](./04-packs.md) for details.

### How do I test my agents?

```bash
# Validate YAML
npm run validate -- --pack your_pack

# Run unit tests
npm run test

# Run evaluation suite
npm run evals -- --pack your_pack

# Test specific agent
npm run agent:test -- --pack your_pack --agent your_agent
```

### Can I use TypeScript for agent logic?

The agent definitions are in YAML, but the runtime is TypeScript. You can:
- Create custom tools in TypeScript
- Add custom gate handlers
- Extend the runtime with custom logic

---

## Operations Questions

### How do I monitor agents in production?

Use the Ops Console at `http://localhost:3001` which provides:
- Dashboard with system overview
- Approvals management
- Kill switch controls
- Audit log explorer

### How do I stop an agent in emergency?

1. **Single Pack**: Go to Kill Switch page, disable the specific pack
2. **All Agents**: Activate the global kill switch
3. **Programmatically**:
```bash
npm run killswitch -- --pack product --disable
```

### How do I process approvals?

1. Go to Approvals page in Ops Console
2. Review pending items by risk level
3. Click "View" to see full context
4. Click "Approve" or "Reject"

All decisions are logged to the audit trail.

### Where are audit logs stored?

Audit logs are stored in the configured storage backend (Supabase by default). They can be queried through:
- Ops Console Audit Explorer
- Direct database queries
- API endpoints

---

## Security Questions

### How is PII handled?

AgentOS automatically detects and redacts PII:
- SSN, credit cards, emails, phone numbers
- Custom patterns can be added
- Redaction happens before storage and output

### How are secrets managed?

Secrets are:
- Stored in environment variables (never in code)
- Automatically redacted from logs
- Access controlled by agent configuration
- Rotation supported

### What compliance features are available?

- **TCPA/CTIA**: For telecommunications and marketing
- **SOC2**: Comprehensive audit logging
- **GDPR**: PII detection and data retention policies
- **Custom**: Define your own compliance gates

### How do I report a security vulnerability?

Do NOT report security vulnerabilities through public GitHub issues.

Email: security@agentos.dev

Include:
- Type of issue
- Affected file paths
- Reproduction steps
- Impact assessment

---

## Cost Questions

### How much does AgentOS cost to run?

AgentOS itself is free. Your costs will be:
- **LLM API calls**: Based on provider pricing and usage
- **Infrastructure**: Hosting, database, storage
- **Optional**: Paid integrations

### How do I track costs?

1. Enable cost tracking in configuration
2. Set per-run and daily budgets
3. Monitor in Ops Console dashboard
4. Query cost metrics via API

### How do I reduce LLM costs?

- Use appropriate model tiers (smaller models for simple tasks)
- Implement caching for repeated queries
- Optimize prompts for fewer tokens
- Set budget limits to prevent runaway costs
- Use fallback models strategically

---

## Scaling Questions

### How many agents can run concurrently?

This depends on your infrastructure, but typical limits are:
- **Workers**: 5-50 concurrent runs per worker
- **Queue**: Thousands of pending tasks
- **Database**: Configure connection pooling

### How do I scale AgentOS?

1. **Horizontal scaling**: Add more worker instances
2. **Database**: Use read replicas
3. **Caching**: Enable Redis caching
4. **Load balancing**: Distribute API requests

### What are the performance benchmarks?

Typical performance:
- Agent startup: < 1 second
- Gate execution: < 500ms per check
- Tool calls: Depends on tool implementation
- LLM calls: Depends on provider and model

---

## Integration Questions

### What integrations are available?

Built-in integrations:
- **GitHub**: Repository, PR, issue management
- **Supabase**: Database, auth, storage
- **Twilio/Sinch**: SMS/MMS messaging
- **Stripe**: Payment webhooks

MCP servers for:
- Jira, Linear, Notion
- Figma, Storybook
- AWS, Vercel, Datadog

### How do I add a new integration?

1. Create an MCP server or adapter
2. Register in runtime configuration
3. Add to agent tool allowlist
4. Test with dry run

### Can agents call external APIs?

Yes, through registered tools. Tools must:
- Be defined in the tools registry
- Be in the agent's allowlist
- Comply with zone restrictions

---

## Troubleshooting Questions

### My agent is stuck. What do I do?

1. Check agent state in Ops Console
2. Review logs for errors
3. Check if waiting for approval
4. Use kill switch if necessary
5. See [08 - Troubleshooting](./08-troubleshooting.md)

### My gate keeps failing. What do I check?

1. Review gate requirements
2. Check agent output against criteria
3. Look at specific check failures
4. Adjust output or gate configuration

### The Ops Console is not loading. What should I do?

1. Check Node.js version (18+)
2. Verify dependencies are installed
3. Check for port conflicts
4. Clear browser cache
5. Check browser console for errors

---

## Contributing Questions

### How do I contribute to AgentOS?

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm run test`
5. Submit a pull request

See `CONTRIBUTING.md` for detailed guidelines.

### What kind of contributions are welcome?

- Bug fixes
- New agent packs
- Documentation improvements
- New integrations
- Performance improvements
- Security enhancements

### Where do I report bugs?

Open a GitHub issue with:
- Clear description
- Steps to reproduce
- Expected vs actual behavior
- Environment details
- Relevant logs

---

## Getting More Help

If your question is not answered here:

1. **Search Issues**: Check GitHub issues for similar questions
2. **Documentation**: Review related docs in `/docs/`
3. **Runbooks**: Check `/docs/runbooks/` for operational guides
4. **Open Issue**: Create a new GitHub issue

---

Previous: [08 - Troubleshooting](./08-troubleshooting.md) | Next: [Glossary](./GLOSSARY.md)
