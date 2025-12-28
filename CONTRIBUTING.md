# Contributing to AgentOS

Thank you for your interest in contributing to AgentOS! This document provides guidelines and instructions for contributing.

## Code of Conduct

Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md).

## How to Contribute

### Reporting Issues

- Use GitHub Issues for bugs, feature requests, and questions
- Search existing issues before creating new ones
- Include reproduction steps for bugs
- Use issue templates when available

### Pull Requests

1. **Fork the repository** and create your branch from `main`
2. **Follow naming conventions**:
   - Features: `feature/description`
   - Fixes: `fix/description`
   - Docs: `docs/description`
3. **Write clear commit messages** following conventional commits:
   - `feat: add new marketing agent`
   - `fix: resolve approval race condition`
   - `docs: update architecture diagram`
4. **Add tests** for new functionality
5. **Update documentation** as needed
6. **Run all checks** before submitting:
   ```bash
   npm run lint
   npm run test
   npm run typecheck
   ```

### Agent Pack Contributions

When adding or modifying agent packs:

1. **Follow the YAML schema** defined in `schemas/agent_yaml.schema.json`
2. **Include an AGENT_PACK.md** describing the pack's purpose and agents
3. **Add golden tasks** in `evals/golden_tasks/{pack_name}/`
4. **Add adversarial tests** in `evals/adversarial/{pack_name}/`
5. **Update PACK_REGISTRY.yaml** with new agents

### Eval Contributions

- Golden tasks should be realistic, representative use cases
- Adversarial tests should probe edge cases and failure modes
- Include expected outputs and success criteria
- Document any required fixtures or setup

## Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/Agentos.git
cd Agentos

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your API keys

# Run tests
npm test

# Start development server
npm run dev
```

## Architecture Guidelines

- Keep agents focused on single responsibilities
- Use gates for quality and security checks
- Implement proper error handling and retries
- Log all significant actions for audit
- Follow idempotency patterns for all operations

## Questions?

Open a GitHub Discussion for questions about contributing.
