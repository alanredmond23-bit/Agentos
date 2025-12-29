# Agent Troubleshooting Runbook

**Document Version:** 1.0
**Last Updated:** 2024-12-28
**Owner:** SRE Team
**Review Cycle:** Quarterly

---

## Table of Contents

1. [Overview](#overview)
2. [Agent Architecture Quick Reference](#agent-architecture-quick-reference)
3. [Common Failure Modes](#common-failure-modes)
4. [Debugging Steps](#debugging-steps)
5. [Log Analysis](#log-analysis)
6. [Recovery Procedures](#recovery-procedures)
7. [Performance Issues](#performance-issues)
8. [Integration Failures](#integration-failures)
9. [Diagnostic Commands](#diagnostic-commands)
10. [Appendix](#appendix)

---

## Overview

This runbook provides comprehensive troubleshooting guidance for AgentOS agent issues. Use this guide when agents exhibit unexpected behavior, fail to execute, or perform suboptimally.

### When to Use This Runbook

- Agent execution failures
- Unexpected agent behavior or outputs
- Agent performance degradation
- Agent stuck in processing state
- Agent resource exhaustion
- Agent communication failures

### Prerequisites

Before troubleshooting, ensure you have:
- [ ] Access to production logs (Datadog/CloudWatch)
- [ ] Access to Kubernetes cluster
- [ ] Ops Console access
- [ ] Database read access
- [ ] Understanding of agent pack structure

---

## Agent Architecture Quick Reference

### Agent Execution Flow

```
+----------------+    +----------------+    +----------------+
|    Trigger     |--->|   Orchestrator |--->|    Worker      |
| (API/Schedule) |    |    Service     |    |    Node        |
+----------------+    +----------------+    +----------------+
                             |                      |
                             v                      v
                      +----------------+    +----------------+
                      |  Queue/Redis   |    |   Agent Pack   |
                      |                |    |   Execution    |
                      +----------------+    +----------------+
                                                   |
                                                   v
                                            +----------------+
                                            |   Artifact     |
                                            |   Storage      |
                                            +----------------+
```

### Key Components

| Component | Description | Health Check |
|-----------|-------------|--------------|
| Orchestrator | Routes and schedules agent tasks | `/health/orchestrator` |
| Worker | Executes agent code | `/health/worker` |
| Queue | Message broker for async tasks | `/health/queue` |
| Artifact Store | Stores agent outputs | `/health/artifacts` |
| Agent Registry | Pack definitions and configs | `/health/registry` |

### Agent States

| State | Description | Normal Duration |
|-------|-------------|-----------------|
| `PENDING` | Task queued, awaiting worker | < 30 seconds |
| `INITIALIZING` | Worker preparing environment | < 60 seconds |
| `RUNNING` | Agent actively executing | Varies by agent |
| `COMPLETING` | Finalizing outputs | < 30 seconds |
| `COMPLETED` | Successfully finished | Terminal |
| `FAILED` | Execution error | Terminal |
| `TIMEOUT` | Exceeded time limit | Terminal |
| `CANCELLED` | Manually cancelled | Terminal |

---

## Common Failure Modes

### 1. Agent Stuck in PENDING State

**Symptoms:**
- Agent remains in PENDING for > 60 seconds
- Queue depth increasing
- No worker picking up tasks

**Root Causes:**
- Workers not running or unhealthy
- Queue connection issues
- Worker capacity exhausted
- Routing misconfiguration

**Quick Diagnosis:**
```bash
# Check worker pod status
kubectl get pods -n production -l app=agent-worker

# Check queue depth
redis-cli -h $REDIS_HOST LLEN agent:queue:default

# Check worker logs for errors
kubectl logs -n production -l app=agent-worker --tail=100 | grep -i error
```

**Resolution:**
1. Verify workers are running: `kubectl get pods -n production -l app=agent-worker`
2. Check worker logs for connection issues
3. Restart workers if necessary: `kubectl rollout restart deployment/agent-worker -n production`
4. Scale workers if capacity issue: `kubectl scale deployment/agent-worker --replicas=10 -n production`

---

### 2. Agent Failing with Timeout

**Symptoms:**
- Agent reaches TIMEOUT state
- Consistent timeout for specific agent type
- Partial outputs in artifact store

**Root Causes:**
- Agent logic too slow
- External API calls timing out
- Resource contention
- Infinite loop in agent code

**Quick Diagnosis:**
```bash
# Check agent execution duration histogram
curl -s "http://prometheus:9090/api/v1/query?query=agent_execution_duration_seconds_bucket" | jq .

# Check specific agent timeout configuration
kubectl get configmap agent-configs -n production -o yaml | grep -A5 timeout

# Review agent execution logs
./scripts/get-agent-logs.sh --run-id $RUN_ID
```

**Resolution:**
1. Review agent timeout configuration
2. Check external dependency latency
3. Consider increasing timeout for legitimate slow operations
4. Investigate agent code for inefficiencies
5. Add progress checkpoints for long-running agents

---

### 3. Agent Returning Incorrect Output

**Symptoms:**
- Agent completes successfully but output is wrong
- Downstream systems reject agent output
- User reports incorrect results

**Root Causes:**
- Bug in agent logic
- Invalid input data
- Model/LLM hallucination
- Configuration drift
- External API changes

**Quick Diagnosis:**
```bash
# Retrieve agent inputs
./scripts/get-agent-artifacts.sh --run-id $RUN_ID --type input

# Retrieve agent outputs
./scripts/get-agent-artifacts.sh --run-id $RUN_ID --type output

# Compare with expected output
diff expected_output.json actual_output.json

# Check agent version deployed
kubectl get deployment agent-worker -n production -o jsonpath='{.spec.template.spec.containers[0].image}'
```

**Resolution:**
1. Reproduce issue in staging environment
2. Compare inputs/outputs with working examples
3. Review recent agent code changes
4. Check external API response formats
5. Validate LLM prompt if applicable

---

### 4. Agent Crash/OOM Kill

**Symptoms:**
- Agent terminates abruptly
- FAILED state without clear error
- OOMKilled in pod events
- Worker pod restarts

**Root Causes:**
- Memory leak in agent code
- Processing very large data
- Concurrent agents overwhelming node
- Memory limits too restrictive

**Quick Diagnosis:**
```bash
# Check pod events for OOM
kubectl describe pod $POD_NAME -n production | grep -A10 Events

# Check memory usage
kubectl top pods -n production -l app=agent-worker

# Check memory limits
kubectl get deployment agent-worker -n production -o jsonpath='{.spec.template.spec.containers[0].resources}'

# Review memory usage over time
curl -s "http://prometheus:9090/api/v1/query?query=container_memory_usage_bytes{pod=~'agent-worker.*'}"
```

**Resolution:**
1. Increase memory limits if justified
2. Implement streaming for large data processing
3. Add memory profiling to identify leaks
4. Optimize agent code for memory efficiency
5. Limit concurrent agents per worker

---

### 5. Agent Authentication Failures

**Symptoms:**
- 401/403 errors in agent logs
- Failed to access external APIs
- Permission denied errors

**Root Causes:**
- Expired credentials/tokens
- Rotated API keys
- Permission changes
- Missing service account

**Quick Diagnosis:**
```bash
# Check agent secret mounting
kubectl get pod $POD_NAME -n production -o jsonpath='{.spec.containers[0].volumeMounts}'

# Verify secrets exist
kubectl get secrets -n production | grep agent

# Test external API connectivity
kubectl exec -it $POD_NAME -n production -- curl -I https://api.external.com/health

# Check service account permissions
kubectl auth can-i --list --as=system:serviceaccount:production:agent-sa
```

**Resolution:**
1. Verify credentials are current and valid
2. Rotate and redeploy secrets if necessary
3. Check IAM/RBAC permissions
4. Verify service account bindings
5. Test connectivity from within pod

---

### 6. Queue Processing Delays

**Symptoms:**
- High queue depth
- Increasing latency for agent execution
- Workers appear healthy but underutilized

**Root Causes:**
- Message routing issues
- Worker concurrency misconfigured
- Priority queue starvation
- Dead letter queue filling up

**Quick Diagnosis:**
```bash
# Check all queue depths
redis-cli -h $REDIS_HOST KEYS "agent:queue:*" | xargs -I {} redis-cli -h $REDIS_HOST LLEN {}

# Check dead letter queue
redis-cli -h $REDIS_HOST LLEN agent:dlq

# Check worker concurrency settings
kubectl get configmap worker-config -n production -o yaml | grep concurrency

# Check queue consumer groups
redis-cli -h $REDIS_HOST XINFO GROUPS agent:stream
```

**Resolution:**
1. Investigate dead letter queue messages
2. Adjust worker concurrency settings
3. Review priority queue weights
4. Scale workers if needed
5. Clear stuck messages after investigation

---

## Debugging Steps

### Step 1: Gather Initial Information

Before deep debugging, collect essential information:

```bash
# Get run details
./scripts/get-run-info.sh --run-id $RUN_ID

# Output includes:
# - Agent pack name and version
# - Trigger source
# - Start time and duration
# - Current state
# - Worker assignment
# - Error message (if failed)
```

### Step 2: Check System Health

Verify overall system health:

```bash
# System health dashboard
curl -s https://api.agentos.io/health | jq .

# Check component status
./scripts/component-health.sh

# Output:
# orchestrator: healthy
# worker: healthy (12/12 pods)
# queue: healthy (depth: 45)
# artifacts: healthy
# registry: healthy
```

### Step 3: Retrieve Logs

Get comprehensive logs for the failed run:

```bash
# Get agent execution logs
./scripts/get-agent-logs.sh --run-id $RUN_ID --format json

# Get worker logs for time window
kubectl logs -n production -l app=agent-worker --since=1h | grep $RUN_ID

# Get orchestrator logs
kubectl logs -n production -l app=orchestrator --since=1h | grep $RUN_ID
```

### Step 4: Analyze State Transitions

Review agent state history:

```bash
# Get state transitions
./scripts/get-state-history.sh --run-id $RUN_ID

# Example output:
# 2024-12-28T10:00:00Z PENDING -> assigned to queue
# 2024-12-28T10:00:05Z INITIALIZING -> worker-pod-abc123
# 2024-12-28T10:00:15Z RUNNING -> execution started
# 2024-12-28T10:01:45Z FAILED -> error: connection refused
```

### Step 5: Reproduce in Staging

If issue is reproducible:

```bash
# Deploy same agent version to staging
./scripts/deploy-agent.sh --pack $PACK_NAME --version $VERSION --env staging

# Trigger test execution
./scripts/trigger-agent.sh --pack $PACK_NAME --env staging --input test_input.json

# Compare behavior
./scripts/compare-runs.sh --prod $RUN_ID --staging $STAGING_RUN_ID
```

---

## Log Analysis

### Log Locations

| Log Type | Location | Retention |
|----------|----------|-----------|
| Agent stdout | Datadog: `service:agent-worker` | 30 days |
| Orchestrator | Datadog: `service:orchestrator` | 30 days |
| Worker system | CloudWatch: `/agentos/workers` | 14 days |
| Audit trail | S3: `s3://agentos-audit/` | 1 year |

### Key Log Patterns

#### Successful Execution
```
INFO [run_id=abc123] Agent pack loaded: research-pack v1.2.3
INFO [run_id=abc123] Execution started with input: {...}
INFO [run_id=abc123] Step 1/3 completed: data_collection
INFO [run_id=abc123] Step 2/3 completed: analysis
INFO [run_id=abc123] Step 3/3 completed: output_generation
INFO [run_id=abc123] Execution completed successfully in 45.2s
```

#### Connection Failure
```
ERROR [run_id=abc123] Failed to connect to external API
ERROR [run_id=abc123] Retry 1/3 after 1s
ERROR [run_id=abc123] Retry 2/3 after 2s
ERROR [run_id=abc123] Retry 3/3 after 4s
ERROR [run_id=abc123] All retries exhausted, marking as failed
```

#### Resource Exhaustion
```
WARN [run_id=abc123] Memory usage at 85%
WARN [run_id=abc123] Memory usage at 92%
ERROR [run_id=abc123] Killed by OOM: memory limit exceeded
```

#### Timeout
```
WARN [run_id=abc123] Execution time: 50s of 60s limit
WARN [run_id=abc123] Execution time: 55s of 60s limit
ERROR [run_id=abc123] Execution timeout exceeded (60s)
```

### Log Search Queries

**Datadog Queries:**

```
# Find all failures for an agent pack
service:agent-worker status:error pack_name:research-pack

# Find OOM kills
service:agent-worker "OOM" OR "memory limit"

# Find slow executions
service:agent-worker @duration:>30000

# Find specific error messages
service:agent-worker "connection refused" OR "timeout"
```

---

## Recovery Procedures

### Procedure 1: Restart Failed Agent

When a single agent fails and needs retry:

```bash
# 1. Get the original run details
./scripts/get-run-info.sh --run-id $RUN_ID

# 2. Verify the issue is transient (not code bug)
./scripts/get-agent-logs.sh --run-id $RUN_ID | tail -50

# 3. Retry the agent execution
./scripts/retry-agent.sh --run-id $RUN_ID

# 4. Monitor new execution
./scripts/watch-run.sh --run-id $NEW_RUN_ID
```

### Procedure 2: Drain and Restart Workers

When workers are in bad state:

```bash
# 1. Drain workers (stop accepting new work)
kubectl annotate deployment agent-worker draining=true -n production

# 2. Wait for in-progress work to complete (monitor queue)
watch "kubectl exec -n production redis-pod -- redis-cli LLEN agent:processing"

# 3. Restart workers
kubectl rollout restart deployment/agent-worker -n production

# 4. Wait for rollout
kubectl rollout status deployment/agent-worker -n production

# 5. Remove drain annotation
kubectl annotate deployment agent-worker draining- -n production

# 6. Verify healthy
./scripts/component-health.sh
```

### Procedure 3: Emergency Pack Disable

When an agent pack is causing widespread issues:

```bash
# 1. Disable pack via kill switch
./scripts/killswitch.sh --pack $PACK_NAME --action disable

# 2. Clear pending tasks for this pack
./scripts/clear-queue.sh --pack $PACK_NAME --confirm

# 3. Notify stakeholders
./scripts/notify.sh --channel ops --message "Pack $PACK_NAME disabled due to issues"

# 4. Investigate root cause
./scripts/get-agent-logs.sh --pack $PACK_NAME --last 1h

# 5. After fix, re-enable
./scripts/killswitch.sh --pack $PACK_NAME --action enable
```

### Procedure 4: Queue Recovery

When queue is backed up or corrupted:

```bash
# 1. Check queue health
redis-cli -h $REDIS_HOST INFO

# 2. Identify stuck messages
redis-cli -h $REDIS_HOST LRANGE agent:queue:default 0 10

# 3. Move stuck messages to DLQ
./scripts/queue-cleanup.sh --move-stuck --older-than 1h

# 4. Process DLQ (manual review)
./scripts/dlq-processor.sh --review

# 5. Verify queue is flowing
watch "redis-cli -h $REDIS_HOST LLEN agent:queue:default"
```

### Procedure 5: Artifact Store Recovery

When artifact storage issues occur:

```bash
# 1. Check artifact store health
curl -s https://api.agentos.io/health/artifacts | jq .

# 2. Verify S3 connectivity
aws s3 ls s3://agentos-artifacts/ --max-items 1

# 3. Check for permission issues
aws sts get-caller-identity

# 4. If S3 issue, failover to backup
./scripts/failover-storage.sh --to backup

# 5. Retry failed artifact operations
./scripts/retry-artifacts.sh --failed-since "1 hour ago"
```

---

## Performance Issues

### Slow Agent Execution

**Diagnosis:**

```bash
# Get execution time percentiles
curl -s "http://prometheus:9090/api/v1/query?query=histogram_quantile(0.99,agent_execution_duration_seconds_bucket)" | jq .

# Find slowest agents
./scripts/slow-agents.sh --threshold 30s --last 1h

# Profile specific agent
./scripts/profile-agent.sh --pack $PACK_NAME --run-id $RUN_ID
```

**Common Causes and Fixes:**

| Cause | Symptoms | Fix |
|-------|----------|-----|
| LLM latency | Slow during inference | Use faster model or caching |
| Large data processing | Memory/CPU spikes | Implement streaming |
| External API calls | Blocking on responses | Add async/parallel calls |
| Database queries | Slow query logs | Optimize queries, add indexes |
| Resource contention | High wait times | Scale workers, adjust limits |

### High Resource Usage

**Diagnosis:**

```bash
# Check CPU usage by pod
kubectl top pods -n production -l app=agent-worker --sort-by=cpu

# Check memory usage
kubectl top pods -n production -l app=agent-worker --sort-by=memory

# Get resource utilization over time
curl -s "http://prometheus:9090/api/v1/query_range?query=container_cpu_usage_seconds_total{container='agent-worker'}&start=$(date -d '1 hour ago' +%s)&end=$(date +%s)&step=60"
```

**Optimization Steps:**

1. Review resource requests/limits
2. Implement connection pooling
3. Add caching for repeated operations
4. Optimize data serialization
5. Consider agent code profiling

---

## Integration Failures

### External API Issues

**Diagnosis:**

```bash
# Check external API health
./scripts/check-external-apis.sh

# Test specific integration
./scripts/test-integration.sh --name openai --timeout 10s

# Review integration metrics
curl -s "http://prometheus:9090/api/v1/query?query=external_api_request_duration_seconds_bucket"
```

**Common Integration Issues:**

| Integration | Common Issue | Quick Fix |
|-------------|--------------|-----------|
| OpenAI | Rate limiting | Implement backoff, check quotas |
| Database | Connection pool exhausted | Increase pool size, optimize queries |
| S3 | Permission denied | Check IAM roles, bucket policy |
| Redis | Connection timeout | Check network, restart connections |
| Webhook | Endpoint unreachable | Verify URL, check firewall |

### Database Connection Issues

```bash
# Check database connectivity
kubectl exec -it $POD_NAME -n production -- pg_isready -h $DB_HOST

# Check connection pool status
./scripts/db-pool-status.sh

# Force connection refresh
kubectl exec -it $POD_NAME -n production -- /app/scripts/refresh-db-connections.sh
```

---

## Diagnostic Commands

### Quick Reference

```bash
# === System Health ===
./scripts/health-check.sh                       # Overall system health
kubectl get pods -n production                   # Pod status
kubectl top pods -n production                   # Resource usage

# === Agent Status ===
./scripts/get-run-info.sh --run-id $RUN_ID      # Run details
./scripts/list-runs.sh --status failed --last 1h # Recent failures
./scripts/agent-stats.sh --pack $PACK_NAME       # Pack statistics

# === Logs ===
./scripts/get-agent-logs.sh --run-id $RUN_ID    # Agent logs
kubectl logs -n production $POD_NAME             # Pod logs
./scripts/audit-trail.sh --run-id $RUN_ID       # Audit logs

# === Queue ===
redis-cli -h $REDIS_HOST LLEN agent:queue:default  # Queue depth
./scripts/queue-stats.sh                          # Queue statistics
./scripts/dlq-inspect.sh                          # DLQ contents

# === Performance ===
./scripts/slow-agents.sh --threshold 30s        # Slow agents
./scripts/error-rates.sh --last 1h              # Error rates
./scripts/latency-stats.sh                      # Latency stats

# === Infrastructure ===
kubectl describe node $NODE_NAME                 # Node details
kubectl get events -n production --sort-by='.lastTimestamp' # Recent events
./scripts/cluster-status.sh                      # Cluster health
```

### Diagnostic Flowchart

```
Agent Issue Reported
        |
        v
+-------+-------+
| Check Run     |
| Status        |
+-------+-------+
        |
        +----------+----------+----------+
        |          |          |          |
        v          v          v          v
    PENDING    RUNNING    FAILED    TIMEOUT
        |          |          |          |
        v          v          v          v
   Check       Check      Get        Check
   Queue       Logs       Error      Duration
        |          |          |          |
        v          v          v          v
   Scale       Debug      Fix        Adjust
   Workers     Issue      Code       Timeout
```

---

## Appendix

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `AGENT_TIMEOUT` | Default agent timeout | 60s |
| `WORKER_CONCURRENCY` | Tasks per worker | 5 |
| `QUEUE_VISIBILITY_TIMEOUT` | Message lock duration | 300s |
| `MAX_RETRIES` | Auto-retry count | 3 |
| `LOG_LEVEL` | Logging verbosity | INFO |

### Error Codes

| Code | Description | Action |
|------|-------------|--------|
| `E001` | Agent pack not found | Verify pack deployment |
| `E002` | Invalid input format | Check input schema |
| `E003` | Timeout exceeded | Increase timeout or optimize |
| `E004` | Resource limit exceeded | Increase limits or optimize |
| `E005` | Authentication failed | Check credentials |
| `E006` | External API error | Check integration health |
| `E007` | Artifact storage error | Check storage connectivity |
| `E008` | Queue error | Check queue health |

### Useful Dashboards

| Dashboard | URL | Purpose |
|-----------|-----|---------|
| Agent Overview | /d/agents/overview | High-level agent metrics |
| Execution Details | /d/agents/execution | Per-run analysis |
| Queue Metrics | /d/queue/overview | Queue health |
| Worker Health | /d/workers/health | Worker pod status |
| Error Analysis | /d/agents/errors | Error patterns |

### Related Runbooks

- [incident_response.md](./incident_response.md) - For escalating issues
- [scaling_operations.md](./scaling_operations.md) - For capacity issues
- [kill_switch.md](./kill_switch.md) - For emergency shutdowns
- [deployment_procedures.md](./deployment_procedures.md) - For rollback procedures

---

**Document Control**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-12-28 | SRE Team | Initial release |
