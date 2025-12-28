# Ops Console Runbook

## Overview

The AgentOS Ops Console is a web-based interface for managing agent operations, approvals, and monitoring. This runbook covers setup, usage, and troubleshooting.

## Prerequisites

- Node.js 18+ installed
- npm or pnpm package manager
- Access to the AgentOS repository

## Running Locally

### Quick Start

```bash
cd ops/console
npm install
npm run dev
```

The console will be available at `http://localhost:3001`.

### Development Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build locally |
| `npm run type-check` | Run TypeScript type checking |
| `npm run lint` | Run ESLint |

## Console Features

### 1. Approvals Page (`/approvals`)

**Purpose**: Review and approve/reject agent actions requiring human oversight.

**Features**:
- Filter by status (pending, approved, rejected)
- View action context and risk level
- Quick stats for pending approvals
- Approve/Reject with audit trail

**Usage**:
1. Navigate to Approvals page
2. Review pending items by risk level (high items first)
3. Click "View" to see full context
4. Click "Approve" or "Reject" as appropriate

### 2. Kill Switch Page (`/killswitch`)

**Purpose**: Emergency controls to halt agent execution.

**Features**:
- Global kill switch (disables all agents)
- Per-pack enable/disable controls
- Activity log of kill switch changes
- Confirmation dialogs for global operations

**Usage**:
1. For emergencies, use Global toggle
2. For targeted control, use pack-level toggles
3. All changes are logged with timestamp and user

### 3. Audit Explorer Page (`/audit`)

**Purpose**: Search and filter audit events across the system.

**Features**:
- Multi-filter support (pack, agent, level, time range)
- Full-text search on messages and run IDs
- Event metadata viewer
- Real-time statistics

**Filters**:
- Pack: Filter by agent pack
- Agent: Filter by specific agent
- Level: info, warn, error
- Time Range: 1h, 6h, 24h, 7d, 30d

## Configuration

### Environment Variables

```bash
# API endpoint (when using real backend)
VITE_API_URL=http://localhost:8080/api

# Feature flags
VITE_ENABLE_AUDIT_EXPORT=true
VITE_ENABLE_BULK_ACTIONS=true
```

### Port Configuration

Edit `vite.config.ts` to change the default port:

```typescript
server: {
  port: 3001,  // Change as needed
  open: true,
}
```

## Troubleshooting

### Console Not Loading

1. Check Node.js version: `node --version` (requires 18+)
2. Clear node_modules: `rm -rf node_modules && npm install`
3. Check for port conflicts: `lsof -i :3001`

### TypeScript Errors

```bash
npm run type-check
```

Review and fix any type errors before building.

### Build Failures

1. Clear build cache: `rm -rf dist`
2. Reinstall dependencies
3. Check for syntax errors in recent changes

## Security Considerations

1. **Authentication**: In production, ensure authentication is configured
2. **HTTPS**: Always use HTTPS in production
3. **Audit Logging**: All console actions are logged to audit trail
4. **Role-Based Access**: Configure appropriate RBAC for operators

## Maintenance

### Regular Tasks

- Monitor console logs for errors
- Review audit trail for unusual activity
- Update dependencies monthly
- Test kill switch functionality weekly

### Backup and Recovery

The console is stateless; all data comes from the backend API. Ensure backend data is properly backed up.

## Support

- Internal: #agentos-ops Slack channel
- Escalation: See [incident_response.md](./incident_response.md)
