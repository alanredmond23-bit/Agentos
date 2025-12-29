# Scaling Operations Runbook

**Document Version:** 1.0
**Last Updated:** 2024-12-28
**Owner:** SRE Team
**Review Cycle:** Quarterly

---

## Table of Contents

1. [Overview](#overview)
2. [Scaling Architecture](#scaling-architecture)
3. [Horizontal Scaling Steps](#horizontal-scaling-steps)
4. [Vertical Scaling Steps](#vertical-scaling-steps)
5. [Capacity Planning](#capacity-planning)
6. [Load Testing Procedures](#load-testing-procedures)
7. [Performance Tuning](#performance-tuning)
8. [Auto-Scaling Configuration](#auto-scaling-configuration)
9. [Emergency Scaling](#emergency-scaling)
10. [Appendix](#appendix)

---

## Overview

This runbook provides procedures for scaling AgentOS infrastructure to handle varying workloads. It covers both proactive capacity planning and reactive scaling during high-demand periods.

### Scaling Principles

1. **Scale horizontally first** - Add more instances before increasing instance size
2. **Scale proactively** - Anticipate demand, don't wait for degradation
3. **Scale gradually** - Make incremental changes, monitor impact
4. **Scale with safety margins** - Target 70% utilization, not 100%
5. **Scale both up and down** - Right-size resources to control costs

### Key Scaling Metrics

| Metric | Warning Threshold | Critical Threshold | Scale Action |
|--------|-------------------|-------------------|--------------|
| CPU Utilization | > 70% | > 85% | Scale workers |
| Memory Utilization | > 75% | > 90% | Scale workers |
| Queue Depth | > 1000 | > 5000 | Scale workers |
| API Latency P99 | > 500ms | > 2s | Scale API pods |
| Agent Wait Time | > 30s | > 60s | Scale workers |

---

## Scaling Architecture

### Component Overview

```
                    +------------------+
                    |   Load Balancer  |
                    |   (AWS ALB)      |
                    +--------+---------+
                             |
              +--------------+--------------+
              |              |              |
       +------+------+ +-----+------+ +-----+------+
       |  API Pod 1  | | API Pod 2  | | API Pod N  |
       +------+------+ +-----+------+ +-----+------+
              |              |              |
              +--------------+--------------+
                             |
                    +--------+---------+
                    |  Redis Cluster   |
                    |  (Queue/Cache)   |
                    +--------+---------+
                             |
              +--------------+--------------+
              |              |              |
       +------+------+ +-----+------+ +-----+------+
       | Worker 1    | | Worker 2   | | Worker N   |
       +------+------+ +-----+------+ +-----+------+
              |              |              |
              +--------------+--------------+
                             |
                    +--------+---------+
                    |  PostgreSQL      |
                    |  (Primary/Replica)|
                    +------------------+
```

### Scalable Components

| Component | Scaling Type | Min | Max | Scale Unit |
|-----------|-------------|-----|-----|------------|
| API Pods | Horizontal | 3 | 50 | 1 pod |
| Worker Pods | Horizontal | 5 | 100 | 1 pod |
| Redis | Horizontal (shards) | 3 | 10 | 1 shard |
| PostgreSQL | Vertical + Read Replicas | 1 | 5 replicas | instance class |
| S3 | Auto-scaling | N/A | N/A | N/A |

---

## Horizontal Scaling Steps

### Scaling API Pods

#### When to Scale
- API latency P99 > 500ms
- CPU utilization > 70%
- Request queue building up
- Anticipated traffic increase

#### Scale Up Procedure

```bash
# 1. Check current state
kubectl get deployment api-server -n production
kubectl get hpa api-server -n production

# 2. View current metrics
kubectl top pods -n production -l app=api-server

# 3. Scale up (manual)
kubectl scale deployment api-server -n production --replicas=10

# 4. Verify pods are running
kubectl get pods -n production -l app=api-server -w

# 5. Verify health
for pod in $(kubectl get pods -n production -l app=api-server -o name); do
  kubectl exec -n production $pod -- curl -s localhost:8080/health
done

# 6. Monitor metrics
watch "kubectl top pods -n production -l app=api-server"
```

#### Scale Down Procedure

```bash
# 1. Verify low utilization (sustained for 15+ minutes)
kubectl top pods -n production -l app=api-server

# 2. Check active connections
./scripts/connection-stats.sh --service api-server

# 3. Scale down gradually (50% at a time)
CURRENT=$(kubectl get deployment api-server -n production -o jsonpath='{.spec.replicas}')
TARGET=$((CURRENT / 2))
kubectl scale deployment api-server -n production --replicas=$TARGET

# 4. Wait and monitor
sleep 300  # 5 minutes
kubectl top pods -n production -l app=api-server

# 5. Repeat if needed until at minimum replicas
```

### Scaling Worker Pods

#### When to Scale
- Queue depth > 1000 messages
- Agent wait time > 30 seconds
- Worker CPU > 70%
- Expected batch job submission

#### Scale Up Procedure

```bash
# 1. Check queue depth
redis-cli -h $REDIS_HOST LLEN agent:queue:default

# 2. Check current worker count
kubectl get deployment agent-worker -n production

# 3. Calculate needed workers
QUEUE_DEPTH=$(redis-cli -h $REDIS_HOST LLEN agent:queue:default)
TASKS_PER_WORKER=5
PROCESS_TIME=30  # seconds average
CURRENT_WORKERS=$(kubectl get deployment agent-worker -n production -o jsonpath='{.spec.replicas}')
NEEDED_WORKERS=$((QUEUE_DEPTH / TASKS_PER_WORKER / 60 * PROCESS_TIME + CURRENT_WORKERS))

echo "Queue: $QUEUE_DEPTH, Current: $CURRENT_WORKERS, Recommended: $NEEDED_WORKERS"

# 4. Scale workers
kubectl scale deployment agent-worker -n production --replicas=$NEEDED_WORKERS

# 5. Monitor queue drain
watch "redis-cli -h $REDIS_HOST LLEN agent:queue:default"

# 6. Verify worker health
kubectl get pods -n production -l app=agent-worker | grep -v Running
```

#### Scale Down Procedure

```bash
# 1. Verify queue is empty
redis-cli -h $REDIS_HOST LLEN agent:queue:default

# 2. Check for in-progress work
redis-cli -h $REDIS_HOST SCARD agent:processing

# 3. Drain workers gracefully
kubectl annotate deployment agent-worker -n production drain=true

# 4. Wait for in-progress tasks
while [ $(redis-cli -h $REDIS_HOST SCARD agent:processing) -gt 0 ]; do
  echo "Waiting for tasks to complete..."
  sleep 10
done

# 5. Scale down
kubectl scale deployment agent-worker -n production --replicas=5

# 6. Remove drain annotation
kubectl annotate deployment agent-worker -n production drain-

# 7. Verify health
./scripts/component-health.sh
```

### Scaling Redis Cluster

#### When to Scale
- Memory utilization > 75%
- Connection count near limit
- Command latency increasing
- Replication lag increasing

#### Scale Procedure

```bash
# 1. Check cluster status
redis-cli -h $REDIS_HOST CLUSTER INFO

# 2. Check memory usage
redis-cli -h $REDIS_HOST INFO memory | grep used_memory_human

# 3. Add new shard (via AWS ElastiCache console or CLI)
aws elasticache modify-replication-group \
  --replication-group-id agentos-redis \
  --node-group-count 4 \
  --apply-immediately

# 4. Monitor resharding progress
aws elasticache describe-replication-groups \
  --replication-group-id agentos-redis \
  --query 'ReplicationGroups[0].Status'

# 5. Verify cluster health after resharding
redis-cli -h $REDIS_HOST CLUSTER INFO
redis-cli -h $REDIS_HOST CLUSTER NODES
```

---

## Vertical Scaling Steps

### Scaling Database (RDS)

#### When to Scale Vertically
- Query latency increasing
- Connection count near max
- CPU consistently > 80%
- Memory pressure warnings

#### Scale Up Procedure

```bash
# 1. Check current instance class
aws rds describe-db-instances \
  --db-instance-identifier agentos-primary \
  --query 'DBInstances[0].DBInstanceClass'

# 2. Review performance insights
aws pi get-resource-metrics \
  --service-type RDS \
  --identifier db-XXXXX \
  --metric-queries file://metrics-query.json

# 3. Schedule maintenance window (or immediate if emergency)
aws rds modify-db-instance \
  --db-instance-identifier agentos-primary \
  --db-instance-class db.r6g.2xlarge \
  --apply-immediately  # Remove for scheduled maintenance

# 4. Monitor modification progress
watch "aws rds describe-db-instances \
  --db-instance-identifier agentos-primary \
  --query 'DBInstances[0].DBInstanceStatus'"

# 5. Verify connectivity after modification
psql -h $DB_HOST -U $DB_USER -c "SELECT 1"

# 6. Update replica instance classes
for replica in agentos-replica-1 agentos-replica-2; do
  aws rds modify-db-instance \
    --db-instance-identifier $replica \
    --db-instance-class db.r6g.2xlarge
done
```

### Scaling Worker Memory/CPU

#### When to Scale Vertically
- OOMKilled events
- CPU throttling
- Agent timeouts due to resource constraints

#### Scale Procedure

```bash
# 1. Review current limits
kubectl get deployment agent-worker -n production -o yaml | grep -A10 resources

# 2. Update resource limits
kubectl patch deployment agent-worker -n production --type=json -p='[
  {
    "op": "replace",
    "path": "/spec/template/spec/containers/0/resources/limits/memory",
    "value": "4Gi"
  },
  {
    "op": "replace",
    "path": "/spec/template/spec/containers/0/resources/limits/cpu",
    "value": "2"
  }
]'

# 3. Monitor rollout
kubectl rollout status deployment/agent-worker -n production

# 4. Verify new limits applied
kubectl describe pod -n production -l app=agent-worker | grep -A5 Limits
```

---

## Capacity Planning

### Monthly Capacity Review

**Review Checklist:**

- [ ] Review growth metrics from past month
- [ ] Project next month's demand
- [ ] Identify bottlenecks
- [ ] Plan scaling actions
- [ ] Update cost projections
- [ ] Document findings

### Capacity Metrics to Track

| Metric | Historical | Current | 30-Day Projection | Action Needed |
|--------|------------|---------|-------------------|---------------|
| Daily Agent Executions | | | | |
| Peak Concurrent Agents | | | | |
| Average Queue Depth | | | | |
| API Requests/Second | | | | |
| Database Connections | | | | |
| Storage Usage (GB) | | | | |

### Capacity Planning Formulas

#### Worker Capacity
```
Required Workers = (Peak Queue Depth * Avg Processing Time) / (Target Queue Time * Tasks Per Worker)

Example:
- Peak Queue: 5000 tasks
- Avg Processing: 30 seconds
- Target Queue Time: 60 seconds
- Tasks Per Worker: 5

Workers = (5000 * 30) / (60 * 5) = 500 workers
```

#### Database Capacity
```
Required Connections = (API Pods * Connections Per Pod) + (Workers * Connections Per Worker) + Buffer

Example:
- API Pods: 20
- Connections Per API Pod: 10
- Workers: 100
- Connections Per Worker: 5
- Buffer: 20%

Connections = (20 * 10) + (100 * 5) * 1.2 = 840 connections
```

### Growth Projections

```bash
# Generate capacity report
./scripts/capacity-report.sh --lookback 90d --project 30d

# Output includes:
# - Historical trends
# - Growth rate calculations
# - Projected resource needs
# - Recommended scaling actions
```

---

## Load Testing Procedures

### Pre-Test Checklist

- [ ] Notify stakeholders of load test
- [ ] Ensure staging environment mirrors production
- [ ] Verify monitoring and alerting is active
- [ ] Prepare rollback plan
- [ ] Document baseline metrics
- [ ] Set up load test infrastructure

### Load Test Types

#### Baseline Test
Purpose: Establish current system capacity

```bash
# Run baseline test
./scripts/load-test.sh \
  --type baseline \
  --duration 10m \
  --users 100 \
  --ramp-up 2m \
  --environment staging
```

#### Stress Test
Purpose: Find breaking point

```bash
# Run stress test
./scripts/load-test.sh \
  --type stress \
  --duration 30m \
  --start-users 100 \
  --max-users 1000 \
  --step-users 100 \
  --step-duration 3m \
  --environment staging
```

#### Soak Test
Purpose: Find memory leaks and degradation over time

```bash
# Run soak test
./scripts/load-test.sh \
  --type soak \
  --duration 4h \
  --users 500 \
  --environment staging
```

#### Spike Test
Purpose: Test reaction to sudden load increases

```bash
# Run spike test
./scripts/load-test.sh \
  --type spike \
  --duration 20m \
  --base-users 100 \
  --spike-users 1000 \
  --spike-duration 5m \
  --environment staging
```

### Load Test Scenarios

#### Scenario 1: API Load Test

```yaml
# k6-api-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 100 },
    { duration: '5m', target: 100 },
    { duration: '2m', target: 200 },
    { duration: '5m', target: 200 },
    { duration: '2m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  let res = http.get('https://api.agentos.io/health');
  check(res, { 'status was 200': (r) => r.status == 200 });
  sleep(1);
}
```

#### Scenario 2: Agent Execution Load Test

```yaml
# k6-agent-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 50 },
    { duration: '10m', target: 50 },
    { duration: '2m', target: 0 },
  ],
};

export default function () {
  let payload = JSON.stringify({
    pack: 'research-pack',
    input: { query: 'test query' }
  });

  let params = {
    headers: { 'Content-Type': 'application/json' },
  };

  let res = http.post('https://api.agentos.io/v1/agents/execute', payload, params);
  check(res, { 'execution started': (r) => r.status == 202 });
  sleep(5);
}
```

### Post-Test Analysis

```bash
# Generate load test report
./scripts/load-test-report.sh --test-id $TEST_ID

# Report includes:
# - Response time percentiles
# - Error rates
# - Throughput achieved
# - Resource utilization
# - Bottleneck identification
# - Scaling recommendations
```

---

## Performance Tuning

### API Performance

#### Connection Pooling

```yaml
# Optimal connection pool settings
apiVersion: v1
kind: ConfigMap
metadata:
  name: api-config
data:
  DB_POOL_SIZE: "20"
  DB_POOL_TIMEOUT: "30"
  REDIS_POOL_SIZE: "50"
  HTTP_KEEP_ALIVE: "true"
  HTTP_TIMEOUT: "30s"
```

#### Caching Strategy

| Cache Layer | TTL | Use Case |
|-------------|-----|----------|
| CDN | 1 hour | Static assets |
| Redis | 5 minutes | API responses |
| Local | 1 minute | Frequent lookups |

```bash
# Verify cache hit rates
./scripts/cache-stats.sh

# Target: >80% hit rate
```

### Worker Performance

#### Concurrency Tuning

```yaml
# Worker configuration
WORKER_CONCURRENCY: 5          # Tasks per worker
WORKER_PREFETCH: 2             # Prefetch queue depth
TASK_TIMEOUT: 60               # Max task duration
HEARTBEAT_INTERVAL: 10         # Health check interval
```

#### Memory Optimization

```bash
# Profile memory usage
./scripts/memory-profile.sh --pack $PACK_NAME --run-id $RUN_ID

# Recommendations:
# - Use generators for large datasets
# - Implement streaming for file processing
# - Clear unused variables explicitly
# - Use appropriate data structures
```

### Database Performance

#### Query Optimization

```bash
# Find slow queries
./scripts/slow-queries.sh --threshold 100ms --last 24h

# Analyze query plan
psql -h $DB_HOST -U $DB_USER -c "EXPLAIN ANALYZE $QUERY"

# Add index if needed
CREATE INDEX CONCURRENTLY idx_agents_status ON agents(status) WHERE status = 'RUNNING';
```

#### Connection Optimization

```bash
# Check connection usage
psql -h $DB_HOST -U $DB_USER -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active'"

# Recommended settings:
# max_connections = 500
# shared_buffers = 25% of RAM
# effective_cache_size = 75% of RAM
# work_mem = 256MB
```

### Network Performance

#### Optimize Network Paths

```bash
# Check latency between components
./scripts/network-latency.sh

# Target latencies:
# - API to Redis: < 1ms
# - API to DB: < 5ms
# - Worker to Queue: < 1ms
```

---

## Auto-Scaling Configuration

### Horizontal Pod Autoscaler (HPA)

#### API Server HPA

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-server-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-server
  minReplicas: 3
  maxReplicas: 50
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 100
        periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 50
        periodSeconds: 120
```

#### Worker HPA with Custom Metrics

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: worker-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: agent-worker
  minReplicas: 5
  maxReplicas: 100
  metrics:
  - type: External
    external:
      metric:
        name: redis_queue_depth
        selector:
          matchLabels:
            queue: agent-default
      target:
        type: AverageValue
        averageValue: "100"
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 30
      policies:
      - type: Pods
        value: 10
        periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 600
      policies:
      - type: Percent
        value: 25
        periodSeconds: 120
```

### Cluster Autoscaler

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: cluster-autoscaler-config
data:
  balance-similar-node-groups: "true"
  skip-nodes-with-local-storage: "false"
  scale-down-delay-after-add: "10m"
  scale-down-unneeded-time: "10m"
  scale-down-utilization-threshold: "0.5"
  max-graceful-termination-sec: "600"
```

### Monitoring Auto-Scaling

```bash
# Check HPA status
kubectl get hpa -n production

# Check scaling events
kubectl describe hpa api-server-hpa -n production

# View scaling history
kubectl get events -n production --field-selector reason=SuccessfulRescale
```

---

## Emergency Scaling

### When to Emergency Scale

- Queue depth > 10,000 and growing
- API latency > 5 seconds
- Error rate > 10%
- Imminent service degradation

### Emergency Scale Procedure

```bash
# 1. Declare scaling emergency
./scripts/notify.sh --channel ops --message "EMERGENCY SCALE: Starting emergency scaling procedure"

# 2. Disable HPA (to prevent conflicts)
kubectl patch hpa api-server-hpa -n production --type=json -p='[{"op": "remove", "path": "/spec/minReplicas"}]'
kubectl patch hpa worker-hpa -n production --type=json -p='[{"op": "remove", "path": "/spec/minReplicas"}]'

# 3. Scale to maximum
kubectl scale deployment api-server -n production --replicas=50
kubectl scale deployment agent-worker -n production --replicas=100

# 4. Monitor system recovery
watch "kubectl get pods -n production | grep -E 'api-server|agent-worker' | grep -v Running"

# 5. Monitor metrics
./scripts/watch-metrics.sh --critical

# 6. Once stable, gradually reduce
# (Follow normal scale-down procedure)

# 7. Re-enable HPA
kubectl apply -f k8s/hpa/api-server-hpa.yaml
kubectl apply -f k8s/hpa/worker-hpa.yaml
```

### Emergency Scaling Checklist

- [ ] Notify on-call and management
- [ ] Disable auto-scaling to prevent conflicts
- [ ] Scale to safe capacity
- [ ] Monitor for stabilization
- [ ] Identify root cause of demand spike
- [ ] Gradually return to normal capacity
- [ ] Re-enable auto-scaling
- [ ] Document incident

---

## Appendix

### Scaling Commands Quick Reference

```bash
# === View Current State ===
kubectl get deployments -n production
kubectl get hpa -n production
kubectl top pods -n production
kubectl top nodes

# === Manual Scaling ===
kubectl scale deployment api-server -n production --replicas=N
kubectl scale deployment agent-worker -n production --replicas=N

# === HPA Management ===
kubectl get hpa -n production
kubectl describe hpa NAME -n production
kubectl patch hpa NAME -n production -p '{"spec":{"minReplicas":N}}'

# === Queue Monitoring ===
redis-cli -h $REDIS_HOST LLEN agent:queue:default
redis-cli -h $REDIS_HOST INFO clients

# === Database Monitoring ===
psql -h $DB_HOST -U $DB_USER -c "SELECT count(*) FROM pg_stat_activity"
aws rds describe-db-instances --db-instance-identifier NAME
```

### Instance Size Reference

#### EKS Worker Nodes

| Instance Type | vCPU | Memory | Use Case |
|--------------|------|--------|----------|
| m6i.large | 2 | 8 GB | API pods |
| m6i.xlarge | 4 | 16 GB | Worker pods |
| m6i.2xlarge | 8 | 32 GB | High-memory workers |
| r6i.xlarge | 4 | 32 GB | Memory-intensive |

#### RDS Instance Classes

| Instance Class | vCPU | Memory | Use Case |
|---------------|------|--------|----------|
| db.r6g.large | 2 | 16 GB | Development |
| db.r6g.xlarge | 4 | 32 GB | Small production |
| db.r6g.2xlarge | 8 | 64 GB | Medium production |
| db.r6g.4xlarge | 16 | 128 GB | Large production |

### Related Runbooks

- [incident_response.md](./incident_response.md) - For scaling-related incidents
- [maintenance_windows.md](./maintenance_windows.md) - For planned scaling
- [deployment_procedures.md](./deployment_procedures.md) - For deployment scaling
- [agent_troubleshooting.md](./agent_troubleshooting.md) - For agent performance

---

**Document Control**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-12-28 | SRE Team | Initial release |
