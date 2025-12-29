# 07 - Operations Console

The AgentOS Ops Console is a web-based interface for managing agent operations, approvals, and monitoring. This guide covers setup, features, and daily operations.

---

## Overview

The Ops Console provides:

- **Dashboard** - System overview and metrics
- **Approvals** - Human-in-the-loop decision making
- **Kill Switch** - Emergency controls to halt agents
- **Audit Explorer** - Search and filter audit events
- **Pack Management** - Enable/disable agent packs

---

## Prerequisites

- Completed [01 - Quickstart](./01-quickstart.md)
- AgentOS runtime running
- Node.js 18+ installed

---

## Quick Start

### Starting the Console

```bash
# Navigate to ops console directory
cd ops/console

# Install dependencies
npm install

# Start development server
npm run dev
```

The console will be available at: `http://localhost:3001`

### Development Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start with hot reload |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run type-check` | Run TypeScript checks |
| `npm run lint` | Run ESLint |

---

## Console Features

### 1. Dashboard

**URL**: `http://localhost:3001/`

The dashboard shows:

- **Active Runs** - Currently executing agents
- **Pending Approvals** - Actions awaiting human review
- **Recent Activity** - Latest events across the system
- **Pack Status** - Health of each agent pack
- **Cost Metrics** - LLM spending overview

```
+-----------------------------------------------------------+
|                      DASHBOARD                            |
+-----------------------------------------------------------+
| Active Runs: 12    Pending Approvals: 3    Packs: 14     |
+-----------------------------------------------------------+
|                                                           |
|  +------------------+  +------------------+               |
|  | Active Runs      |  | Recent Activity  |               |
|  | - run_abc (2m)   |  | 10:05 Run comp.  |               |
|  | - run_def (45s)  |  | 10:04 Gate pass  |               |
|  | - run_ghi (1m)   |  | 10:03 Tool exec  |               |
|  +------------------+  +------------------+               |
|                                                           |
|  +------------------+  +------------------+               |
|  | Pack Status      |  | Cost Today       |               |
|  | Product: OK      |  | $12.45           |               |
|  | Engineering: OK  |  | Budget: $100     |               |
|  +------------------+  +------------------+               |
+-----------------------------------------------------------+
```

### 2. Approvals Page

**URL**: `http://localhost:3001/approvals`

Manage human-in-the-loop approvals:

**Features**:
- Filter by status (pending, approved, rejected)
- View action context and risk level
- Quick stats for pending approvals
- Approve/Reject with audit trail

**Workflow**:

1. Navigate to Approvals page
2. Review pending items by risk level (high items first)
3. Click "View" to see full context
4. Click "Approve" or "Reject" as appropriate

**Approval Context Includes**:
- Agent ID and pack
- Requested action
- Zone (red/yellow/green)
- Input data (redacted if sensitive)
- Risk assessment
- Timestamp

```
+-----------------------------------------------------------+
|                    APPROVALS                              |
+-----------------------------------------------------------+
| Filter: [Pending v]    Stats: 3 Pending | 45 Today        |
+-----------------------------------------------------------+
| ID       | Agent          | Action      | Zone  | Actions |
+-----------------------------------------------------------+
| apr_001  | product_prd    | publish_prd | YELLOW| [View]  |
| apr_002  | eng_deployer   | deploy_prod | RED   | [View]  |
| apr_003  | mkt_campaign   | send_sms    | YELLOW| [View]  |
+-----------------------------------------------------------+
```

### 3. Kill Switch Page

**URL**: `http://localhost:3001/killswitch`

Emergency controls to halt agent execution:

**Features**:
- **Global Kill Switch** - Disables ALL agents immediately
- **Per-Pack Controls** - Enable/disable individual packs
- **Activity Log** - History of kill switch changes
- **Confirmation Dialogs** - Prevent accidental activation

**Usage**:

1. For emergencies, use Global toggle
2. For targeted control, use pack-level toggles
3. All changes are logged with timestamp and user

```
+-----------------------------------------------------------+
|                    KILL SWITCH                            |
+-----------------------------------------------------------+
| GLOBAL KILL SWITCH                                        |
| [====OFF====]                                             |
| Status: All systems operational                           |
+-----------------------------------------------------------+
| Pack Controls                                             |
|----------------------------------------------------------|
| Product Pack        [Enabled]   | Runs: 5   | Cost: $2   |
| Engineering Pack    [Enabled]   | Runs: 12  | Cost: $8   |
| Marketing Pack      [DISABLED]  | Runs: 0   | Cost: $0   |
| Design Pack         [Enabled]   | Runs: 2   | Cost: $1   |
+-----------------------------------------------------------+
| Activity Log                                              |
| 10:30 - Marketing Pack disabled by ops@company           |
| 09:15 - Global kill switch deactivated by cto@company    |
+-----------------------------------------------------------+
```

### 4. Audit Explorer Page

**URL**: `http://localhost:3001/audit`

Search and analyze audit events:

**Features**:
- Multi-filter support (pack, agent, level, time range)
- Full-text search on messages and run IDs
- Event metadata viewer
- Real-time statistics
- Export capabilities

**Filters**:
- **Pack**: Filter by agent pack
- **Agent**: Filter by specific agent
- **Level**: info, warn, error
- **Time Range**: 1h, 6h, 24h, 7d, 30d

**Search Examples**:
```
# Find all errors in last 24 hours
Level: error, Time: 24h

# Find specific run
Search: run_abc123

# Find all product pack activity
Pack: product
```

```
+-----------------------------------------------------------+
|                   AUDIT EXPLORER                          |
+-----------------------------------------------------------+
| Filters:                                                  |
| Pack: [All v]  Agent: [All v]  Level: [All v]  Time: [24h]|
| Search: [________________________] [Search]               |
+-----------------------------------------------------------+
| Stats: 1,234 events | 45 errors | 89 warnings            |
+-----------------------------------------------------------+
| Time     | Pack     | Agent       | Level | Message      |
+-----------------------------------------------------------+
| 10:05:30 | product  | prd_writer  | info  | Run completed|
| 10:05:28 | product  | prd_writer  | info  | Gate passed  |
| 10:05:25 | product  | prd_writer  | warn  | High latency |
| 10:05:20 | product  | prd_writer  | info  | Run started  |
+-----------------------------------------------------------+
```

---

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
export default defineConfig({
  server: {
    port: 3001,  // Change as needed
    open: true,  // Auto-open browser
  }
});
```

### API Integration

Configure API endpoints in `ops/console/src/api/`:

```typescript
// api/config.ts
export const API_CONFIG = {
  baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:8080/api',
  timeout: 30000,
  retries: 3
};
```

---

## WebSocket Updates

The console uses WebSocket for real-time updates:

```typescript
// Connect to WebSocket
import { connectWebSocket } from './lib/websocket';

const ws = connectWebSocket({
  url: 'ws://localhost:8080/ws',
  onMessage: (event) => {
    switch (event.type) {
      case 'run_started':
        updateActiveRuns(event.data);
        break;
      case 'approval_required':
        addPendingApproval(event.data);
        break;
      case 'killswitch_changed':
        updateKillSwitchStatus(event.data);
        break;
    }
  }
});
```

---

## Operational Workflows

### Daily Operations

1. **Morning Check**
   - Review dashboard for overnight issues
   - Check pending approvals
   - Verify all packs are enabled

2. **During Operations**
   - Monitor active runs
   - Process approvals promptly
   - Watch for cost anomalies

3. **End of Day**
   - Review audit log for issues
   - Check daily cost totals
   - Export reports if needed

### Incident Response

1. **Identify Issue**
   - Check dashboard alerts
   - Review error logs in Audit Explorer
   - Identify affected pack/agent

2. **Contain**
   - Use Kill Switch if necessary
   - Disable specific pack if isolated

3. **Investigate**
   - Search audit logs for context
   - Review run details
   - Check gate failures

4. **Resolve**
   - Fix underlying issue
   - Re-enable pack/agent
   - Monitor for recurrence

### Approval Processing

**High-Risk Approvals (Red Zone)**:
1. Carefully review the context
2. Verify the requesting agent
3. Check the action details
4. Consider business impact
5. Approve only if justified

**Medium-Risk Approvals (Yellow Zone)**:
1. Review the context
2. Verify tests passed
3. Approve if appropriate

**Best Practices**:
- Process approvals within SLA
- Document rejection reasons
- Escalate if uncertain

---

## Troubleshooting Console Issues

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

### WebSocket Connection Failed

1. Verify runtime is running
2. Check WebSocket URL configuration
3. Look for CORS issues in browser console

---

## Security Considerations

### Authentication

In production, configure authentication:

```typescript
// Configure auth provider
const authConfig = {
  provider: 'oauth2',
  clientId: process.env.OAUTH_CLIENT_ID,
  redirectUri: 'http://localhost:3001/callback'
};
```

### HTTPS

Always use HTTPS in production:

```bash
# Generate certificates
npm run generate-certs

# Start with HTTPS
npm run dev:https
```

### Role-Based Access Control

Configure RBAC for operators:

```yaml
roles:
  admin:
    - view_dashboard
    - approve_actions
    - modify_killswitch
    - export_audit

  operator:
    - view_dashboard
    - approve_actions
    - view_audit

  viewer:
    - view_dashboard
    - view_audit
```

---

## Maintenance

### Regular Tasks

| Task | Frequency |
|------|-----------|
| Monitor console logs | Daily |
| Review audit trail | Daily |
| Update dependencies | Monthly |
| Test kill switch | Weekly |

### Backup and Recovery

The console is stateless; all data comes from the backend API. Ensure backend data is properly backed up.

### Updating

```bash
# Pull latest changes
git pull

# Install new dependencies
npm install

# Rebuild
npm run build
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `g d` | Go to Dashboard |
| `g a` | Go to Approvals |
| `g k` | Go to Kill Switch |
| `g l` | Go to Audit Log |
| `?` | Show help |
| `Esc` | Close modal |

---

## Common Pitfalls

### Ignoring Pending Approvals

**Problem**: Approvals pile up, blocking workflows
**Solution**: Set up alerts for pending approvals, process within SLA

### Accidental Kill Switch

**Problem**: Accidentally disabling all agents
**Solution**: Use confirmation dialogs, implement undo period

### Missing Audit Context

**Problem**: Searching logs without sufficient context
**Solution**: Use multiple filters, note run IDs for investigation

---

## Next Steps

Now that you understand the Ops Console:

1. **[Troubleshooting](./08-troubleshooting.md)** - Handle common issues
2. **[FAQ](./09-faq.md)** - Frequently asked questions
3. **[Glossary](./GLOSSARY.md)** - Term definitions

---

Previous: [06 - Security](./06-security.md) | Next: [08 - Troubleshooting](./08-troubleshooting.md)
