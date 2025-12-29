# AgentOS Video Tutorial Series

**Production-Ready Video Scripts for AgentOS Documentation**

This directory contains comprehensive video tutorial scripts for AgentOS, the open-source operating system for AI agent orchestration.

## Series Overview

| # | Title | Duration | Audience | Status |
|---|-------|----------|----------|--------|
| 01 | [Platform Introduction](01-intro-script.md) | 3 min | All | Ready |
| 02 | [Quick Start Walkthrough](02-quickstart-script.md) | 5 min | Beginner | Ready |
| 03 | [Creating Agents](03-agent-creation-script.md) | 7 min | Intermediate | Ready |
| 04 | [Managing Packs](04-pack-management-script.md) | 5 min | Intermediate | Ready |
| 05 | [Ops Console Tour](05-ops-console-script.md) | 8 min | Intermediate | Ready |
| 06 | [Security Features](06-security-script.md) | 6 min | Intermediate | Ready |
| 07 | [Troubleshooting Guide](07-troubleshooting-script.md) | 5 min | All | Ready |

**Total Runtime:** ~39 minutes

## Target Audience

- **Developers** building with AgentOS
- **DevOps Engineers** deploying and managing agents
- **Technical Leaders** evaluating the platform
- **Contributors** wanting to understand the architecture

## Production Files

| File | Purpose |
|------|---------|
| [PRODUCTION_NOTES.md](PRODUCTION_NOTES.md) | Recording guidelines and technical specs |
| [ASSETS.md](ASSETS.md) | Required graphics, screenshots, and B-roll |

## Script Format

Each script follows a consistent structure:

```markdown
# Video Title

## Metadata
- Duration, audience, prerequisites

## Scene Breakdown
- Timestamps with visuals, narration, and actions

## B-Roll Suggestions
## Graphics Needed
## Call to Action
```

## Recording Workflow

1. **Pre-production**: Review script, prepare demo environment
2. **Recording**: Follow scene breakdown, capture screen + audio
3. **Post-production**: Add graphics, B-roll, music
4. **Review**: Technical accuracy check
5. **Publish**: Upload to documentation site

## Demo Environment Setup

Before recording, set up a clean demo environment:

```bash
# Clone fresh repo
git clone https://github.com/alanredmond23-bit/Agentos.git demo-agentos
cd demo-agentos

# Install dependencies
npm install

# Start development server
npm run dev

# In another terminal, start ops console
cd ops/console && npm run dev
```

## Versioning

Scripts are versioned with AgentOS releases:

- **v1.0**: Initial series (current)
- Update scripts when major features change
- Add new videos for major feature additions

## Contributing

To propose script changes:

1. Create a branch with your changes
2. Tag affected videos in PR description
3. Request review from documentation team
4. Videos are re-recorded on merge

## Contact

- Documentation Team: docs@agentos.dev
- Video Production: video@agentos.dev
