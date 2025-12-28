# Incident Response Runbook

## Overview

This runbook defines procedures for responding to incidents involving AgentOS agent execution, data integrity, or system availability.

## Severity Levels

| Severity | Description | Response Time | Examples |
|----------|-------------|---------------|----------|
| **SEV1** | Critical - Production down or data breach | 15 minutes | Global agent failure, PII exposure |
| **SEV2** | High - Major feature impaired | 1 hour | Pack-level failures, incorrect outputs |
| **SEV3** | Medium - Partial degradation | 4 hours | Single agent errors, slow performance |
| **SEV4** | Low - Minor issues | 24 hours | UI bugs, documentation errors |

## Incident Classification

### Agent-Related Incidents

- **Runaway Agent**: Agent stuck in loop or consuming excess resources
- **Incorrect Output**: Agent producing wrong or harmful outputs
- **Rate Limit Breach**: Agent exceeding API or system limits
- **Authorization Failure**: Agent accessing unauthorized resources

### System Incidents

- **Service Outage**: Core AgentOS services unavailable
- **Data Corruption**: Artifacts or audit logs corrupted
- **Integration Failure**: External service integrations failing

### Security Incidents

- **PII Exposure**: Personally identifiable information leaked
- **Unauthorized Access**: Suspicious access patterns detected
- **Credential Compromise**: API keys or secrets exposed

## Response Procedures

### Step 1: Triage (0-5 minutes)

1. **Acknowledge** the incident in monitoring system
2. **Assess** severity using the table above
3. **Notify** appropriate personnel:
   - SEV1/SEV2: Page on-call engineer + manager
   - SEV3/SEV4: Create ticket, notify during business hours

### Step 2: Contain (5-15 minutes)

For agent-related issues:

```bash
# Option 1: Kill specific agent pack
# Use Ops Console: /killswitch

# Option 2: Global kill switch
# Use Ops Console: Global toggle OFF

# Option 3: CLI (if console unavailable)
./scripts/emergency_stop.sh --pack <pack_name>
./scripts/emergency_stop.sh --global
```

For system issues:

```bash
# Restart affected service
systemctl restart agentos-orchestrator

# Check service health
curl http://localhost:8080/health
```

### Step 3: Investigate (15-60 minutes)

1. **Gather logs** from Audit Explorer
   - Filter by affected pack/agent
   - Look for error events
   - Note run IDs for correlation

2. **Review timeline**
   - When did issue start?
   - What changed (deployments, configs)?
   - What's the blast radius?

3. **Identify root cause**
   - Code bug in agent?
   - Configuration error?
   - External dependency failure?
   - Resource exhaustion?

### Step 4: Remediate (Variable)

Common remediations:

| Issue | Remediation |
|-------|-------------|
| Agent bug | Disable pack, deploy fix, re-enable |
| Config error | Revert config, verify, redeploy |
| Rate limits | Adjust limits, implement backoff |
| External failure | Enable fallback, contact provider |

### Step 5: Recover

1. **Verify fix** in staging environment
2. **Gradually restore** service
   - Enable one pack at a time
   - Monitor for recurrence
3. **Communicate** status to stakeholders

### Step 6: Post-Incident

1. **Document** the incident
   - Timeline
   - Root cause
   - Actions taken
   - Impact assessment

2. **Conduct retrospective** (within 72 hours for SEV1/2)
   - What went well?
   - What could improve?
   - Action items

3. **Update runbooks** with learnings

## Communication Templates

### Initial Notification (SEV1/2)

```
INCIDENT: [Brief description]
SEVERITY: SEV[X]
STATUS: Investigating
IMPACT: [Description of user/system impact]
LEAD: [Name]
BRIDGE: [Link to call/channel]
```

### Status Update

```
UPDATE [Time]: [Status]
- Current state: [Description]
- Actions in progress: [List]
- ETA to resolution: [Time or "Investigating"]
```

### Resolution

```
RESOLVED: [Brief description]
DURATION: [Time]
ROOT CAUSE: [Brief summary]
FOLLOW-UP: [Ticket/retrospective link]
```

## Escalation Contacts

| Role | Responsibility | Escalation Trigger |
|------|----------------|-------------------|
| On-Call Engineer | Initial response | All incidents |
| Engineering Manager | SEV1/2 coordination | No progress in 30min |
| Security Lead | Security incidents | Any PII/auth issues |
| Legal | Compliance issues | Data breach confirmed |

## Tools and Access

Ensure incident responders have:

- [ ] Ops Console access
- [ ] Production log access
- [ ] Monitoring dashboards
- [ ] Slack/PagerDuty access
- [ ] Runbook access (offline copy)

## Related Runbooks

- [kill_switch.md](./kill_switch.md) - Emergency stop procedures
- [pii_redaction.md](./pii_redaction.md) - PII handling
- [data_retention.md](./data_retention.md) - Data policies
