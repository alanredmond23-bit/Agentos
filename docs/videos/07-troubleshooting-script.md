# Video 07: Troubleshooting Guide

## Metadata

- **Duration:** 5 minutes
- **Audience:** All levels - developers, operators, support
- **Prerequisites:** AgentOS running (Video 02)
- **Goal:** Diagnose and resolve common AgentOS issues

---

## Scene Breakdown

### Scene 1: Introduction (0:00 - 0:25)

**Visuals:** Terminal with error message, then clearing to organized view.

**Narration:**
"When agents fail, you need to diagnose and fix problems quickly. In this video, we will cover the most common AgentOS issues and how to resolve them. We will use a systematic approach: identify the symptom, find the cause, and apply the fix."

**Actions:** Show error clearing to organized troubleshooting view

---

### Scene 2: Agent State Diagnosis (0:25 - 1:10)

**Visuals:** Terminal and Ops Console side by side.

**Narration:**
"The first step is identifying the agent state. Agents can be in one of several states: pending, running, completed, failed, timeout, or cancelled."

**Actions:** Show states in Ops Console dashboard

**Narration (continued):**
"For failed runs, check the error code. Common codes include E001 for agent pack not found, E003 for timeout exceeded, E004 for resource limit exceeded, and E005 for authentication failures."

**Actions:** Show error code table:
```
E001 - Agent pack not found
E002 - Invalid input format
E003 - Timeout exceeded
E004 - Resource limit exceeded
E005 - Authentication failed
E006 - External API error
E007 - Artifact storage error
E008 - Queue error
```

---

### Scene 3: Stuck in Pending (1:10 - 1:50)

**Visuals:** Terminal with diagnostic commands.

**Narration:**
"If an agent is stuck in PENDING for more than 60 seconds, the workers may not be picking up tasks."

**Actions:** Run diagnostic:
```bash
# Check worker status
npm run health:workers

# Check queue depth
npm run queue:status
```

**Narration (continued):**
"Common causes include workers not running, queue connection issues, or worker capacity exhausted."

**Actions:** Show resolution steps:
```bash
# Restart workers
npm run workers:restart

# Or scale up
npm run workers:scale --replicas=5
```

**Narration (continued):**
"After restarting, verify the agent moves to RUNNING state."

---

### Scene 4: Timeout Errors (1:50 - 2:30)

**Visuals:** Log output showing timeout.

**Narration:**
"Timeout errors mean the agent exceeded its allowed execution time. Check the logs for what the agent was doing before timeout."

**Actions:** Run:
```bash
npm run logs -- --run-id $RUN_ID --tail=50
```

**Narration (continued):**
"Common causes include slow external API calls, processing large data, or an infinite loop in agent logic."

**Actions:** Show log output:
```
INFO [run_id=abc123] Execution time: 50s of 60s limit
WARN [run_id=abc123] Execution time: 55s of 60s limit
ERROR [run_id=abc123] Execution timeout exceeded (60s)
```

**Narration (continued):**
"For legitimate slow operations, increase the timeout in the agent YAML. For external dependencies, add caching or parallelize calls."

**Actions:** Show YAML change:
```yaml
mission:
  constraints:
    max_runtime_seconds: 300  # Increased from 60
```

---

### Scene 5: Memory and Resource Issues (2:30 - 3:10)

**Visuals:** Memory usage graphs and terminal.

**Narration:**
"OOM kills happen when agents exhaust memory. The agent terminates abruptly without a clear error."

**Actions:** Check memory:
```bash
npm run metrics -- --type=memory
```

**Narration (continued):**
"Look for memory spikes before the crash. Common causes include processing large files, memory leaks, or too many concurrent agents."

**Actions:** Show solutions:
```yaml
# Option 1: Increase memory limit
resources:
  memory: "2Gi"

# Option 2: Stream large data
processing:
  mode: "streaming"
```

**Narration (continued):**
"For persistent issues, profile the agent to identify the memory-heavy operation."

---

### Scene 6: Authentication Failures (3:10 - 3:45)

**Visuals:** Error logs showing 401/403.

**Narration:**
"Authentication failures appear as 401 or 403 errors in the logs. The agent cannot access external services."

**Actions:** Show error:
```
ERROR [run_id=abc123] Failed to authenticate with OpenAI API
ERROR [run_id=abc123] Status: 401 Unauthorized
```

**Narration (continued):**
"Check if credentials have expired. API keys rotate. OAuth tokens expire. Service account permissions change."

**Actions:** Verify credentials:
```bash
# Check secret status
npm run secrets:check

# Rotate if needed
npm run secrets:rotate --name=openai_api_key
```

**Narration (continued):**
"After rotation, retry the agent. Authentication should succeed."

---

### Scene 7: Using the Audit Trail (3:45 - 4:20)

**Visuals:** Ops Console Audit Explorer.

**Narration:**
"The Audit Explorer is your best friend for debugging. It shows exactly what happened and when."

**Actions:** Navigate to Audit Explorer

**Narration (continued):**
"Search by run ID to see all events for a specific execution. Filter by error level to find problems quickly."

**Actions:** Demonstrate:
1. Paste run ID
2. Filter: level = error
3. Expand event to see details

**Narration (continued):**
"The metadata includes model used, tokens consumed, and cost. This helps identify if the issue is with a specific provider or configuration."

**Actions:** Show metadata expansion

**Narration (continued):**
"For patterns across many runs, look at the statistics. Sudden spikes in errors often indicate systemic issues like API outages or configuration changes."

---

### Scene 8: Quick Reference and Escalation (4:20 - 5:00)

**Visuals:** Quick reference card on screen.

**Narration:**
"Here is a quick reference for common issues."

**Actions:** Show reference card:
```
PENDING > 60s     -> Restart workers
TIMEOUT           -> Check logs, increase limit
OOM Kill          -> Increase memory, stream data
Auth Failure      -> Rotate credentials
Gate Failed       -> Fix output, retry
```

**Narration (continued):**
"If you cannot resolve an issue, escalate properly. Document the run ID, error code, and what you have tried. Check the incident_response runbook for escalation paths."

**Actions:** Show escalation flow:
1. Document issue
2. Check runbooks
3. Contact on-call
4. Open incident if widespread

**Narration (continued):**
"For production emergencies, use the kill switch first to stop the damage, then investigate. The full troubleshooting runbook is in docs/runbooks/agent_troubleshooting.md with detailed recovery procedures for every scenario."

**Actions:** Show link to documentation

---

## B-Roll Suggestions

- Terminal scrolling with logs
- Dashboard updating
- Developer problem-solving
- Success confirmation animations

## Graphics Needed

1. Agent state diagram with transitions
2. Error code reference card
3. Memory usage graph example
4. Troubleshooting decision flowchart
5. Escalation path diagram
6. Quick reference card (printable)

## Call to Action

- **Primary:** Bookmark the troubleshooting runbook
- **Secondary:** Set up monitoring alerts
- **Tertiary:** Practice incident response procedures

## Common Scenarios to Demonstrate

Prepare demo scenarios for:
1. Agent stuck in pending (stop workers, then restart)
2. Timeout error (slow external call simulation)
3. Authentication failure (expired token scenario)
4. Gate failure (output with PII)

## Terminal Commands Reference

Include all diagnostic commands in video description:
```bash
# Health checks
npm run health:workers
npm run health:queue
npm run health:system

# Logs
npm run logs -- --run-id $RUN_ID
npm run logs -- --pack $PACK --since="1 hour ago"

# Metrics
npm run metrics -- --type=memory
npm run metrics -- --type=errors

# Recovery
npm run workers:restart
npm run queue:clear -- --pack $PACK
npm run agent:retry -- --run-id $RUN_ID
```

## Troubleshooting Mindset

Reinforce throughout:
1. Stay calm
2. Document everything
3. Check the simplest things first
4. Use the kill switch if needed
5. Escalate when stuck
