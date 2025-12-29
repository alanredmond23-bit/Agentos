# Deployment Procedures Runbook

**Document Version:** 1.0
**Last Updated:** 2024-12-28
**Owner:** SRE Team
**Review Cycle:** Quarterly

---

## Table of Contents

1. [Overview](#overview)
2. [Deployment Types](#deployment-types)
3. [Pre-Deployment Checklist](#pre-deployment-checklist)
4. [Rollout Strategy](#rollout-strategy)
5. [Deployment Procedures](#deployment-procedures)
6. [Rollback Procedures](#rollback-procedures)
7. [Verification Steps](#verification-steps)
8. [Emergency Deployments](#emergency-deployments)
9. [Post-Deployment Activities](#post-deployment-activities)
10. [Appendix](#appendix)

---

## Overview

This runbook defines the standard procedures for deploying changes to AgentOS production infrastructure. All deployments must follow these procedures to ensure reliability and minimize risk.

### Deployment Principles

1. **Deploy small, deploy often** - Smaller changes are safer and easier to rollback
2. **Automate everything** - Manual steps introduce human error
3. **Verify at every stage** - Don't assume success, validate it
4. **Have a rollback plan** - Know how to undo before you do
5. **Communicate proactively** - Keep stakeholders informed

### Deployment Windows

| Window Type | Days | Time (UTC) | Restrictions |
|-------------|------|------------|--------------|
| Standard | Mon-Thu | 14:00-18:00 | None |
| Extended | Mon-Fri | 10:00-20:00 | Manager approval |
| Emergency | Any | Any | VP approval |
| Freeze | None | N/A | No deployments |

### Deployment Freeze Calendar

| Period | Reason | Exceptions |
|--------|--------|------------|
| Dec 15 - Jan 2 | Holiday freeze | Critical security only |
| Major product launches | Business critical | None |
| Quarter end (last 3 days) | Financial close | Security only |

---

## Deployment Types

### Standard Deployment

**Definition:** Regular feature or bug fix deployment during business hours.

| Attribute | Value |
|-----------|-------|
| **Approval Required** | Team Lead |
| **Testing Required** | Full regression |
| **Rollout Strategy** | Canary -> Progressive |
| **Monitoring Period** | 30 minutes |
| **Rollback Criteria** | Error rate > 1% |

### Hotfix Deployment

**Definition:** Urgent fix for production issue.

| Attribute | Value |
|-----------|-------|
| **Approval Required** | Engineering Manager |
| **Testing Required** | Targeted testing |
| **Rollout Strategy** | Fast progressive |
| **Monitoring Period** | 15 minutes |
| **Rollback Criteria** | Any regression |

### Emergency Deployment

**Definition:** Critical security or availability fix.

| Attribute | Value |
|-----------|-------|
| **Approval Required** | VP Engineering |
| **Testing Required** | Smoke tests minimum |
| **Rollout Strategy** | Full deployment |
| **Monitoring Period** | Continuous |
| **Rollback Criteria** | Worse than current state |

### Database Migration

**Definition:** Schema or data changes to production database.

| Attribute | Value |
|-----------|-------|
| **Approval Required** | Engineering Manager + DBA |
| **Testing Required** | Staging migration + rollback test |
| **Rollout Strategy** | Blue-green or maintenance window |
| **Monitoring Period** | 1 hour |
| **Rollback Criteria** | Any error or data corruption |

### Infrastructure Change

**Definition:** Changes to infrastructure configuration.

| Attribute | Value |
|-----------|-------|
| **Approval Required** | SRE Lead + Engineering Manager |
| **Testing Required** | Staging deployment + chaos testing |
| **Rollout Strategy** | Region-by-region |
| **Monitoring Period** | 1 hour |
| **Rollback Criteria** | Any availability impact |

---

## Pre-Deployment Checklist

### Code Readiness

- [ ] All tests passing in CI
- [ ] Code review approved by required reviewers
- [ ] No unresolved security vulnerabilities (Snyk/Dependabot)
- [ ] Documentation updated (if applicable)
- [ ] Feature flags in place for new features
- [ ] Migration scripts tested in staging

### Environment Readiness

- [ ] Staging deployment successful
- [ ] Staging tests passing
- [ ] No active incidents in production
- [ ] Deployment window confirmed
- [ ] Rollback procedure documented
- [ ] On-call engineer aware and available

### Communication

- [ ] Deployment announced in #deployments channel
- [ ] Stakeholders notified (if user-impacting)
- [ ] Support team briefed (if needed)
- [ ] Status page update prepared (if needed)

### Monitoring

- [ ] Dashboards accessible
- [ ] Alert thresholds appropriate
- [ ] Error rate baseline documented
- [ ] Performance baseline documented

### Pre-Deployment Commands

```bash
# Verify CI status
gh pr checks $PR_NUMBER

# Check production health
./scripts/health-check.sh --environment production

# Check for active incidents
./scripts/incident-status.sh

# Verify rollback is possible
./scripts/verify-rollback.sh --version $CURRENT_VERSION

# Document baselines
./scripts/capture-baseline.sh --output /tmp/pre-deploy-baseline.json
```

---

## Rollout Strategy

### Canary Deployment

Deploy to small subset first, validate, then expand.

```
+--------+     +--------+     +--------+     +--------+
| Canary | --> |   10%  | --> |   50%  | --> |  100%  |
|  (1%)  |     |        |     |        |     |        |
+--------+     +--------+     +--------+     +--------+
    |              |              |              |
    v              v              v              v
 5 min          15 min         15 min       Complete
 monitor        monitor        monitor
```

#### Canary Configuration

```yaml
# canary-config.yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: api-server
  namespace: production
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-server
  progressDeadlineSeconds: 600
  analysis:
    interval: 1m
    threshold: 5
    maxWeight: 50
    stepWeight: 10
    metrics:
    - name: request-success-rate
      threshold: 99
      interval: 1m
    - name: request-duration
      threshold: 500
      interval: 1m
  webhooks:
    - name: load-test
      url: http://flagger-loadtester/
      timeout: 5s
```

### Blue-Green Deployment

Maintain two identical environments, switch traffic.

```
Before:
+--------+     +--------+
|  Blue  | <-- | Traffic|
| (v1.0) |     |        |
+--------+     +--------+
|  Green |
| (idle) |
+--------+

During:
+--------+     +--------+
|  Blue  |     | Traffic|
| (v1.0) |     |   |    |
+--------+     +---+----+
|  Green | <-------+
| (v1.1) |
+--------+

After:
+--------+     +--------+
|  Blue  |     | Traffic|
| (v1.0) |     |        |
+--------+     +--------+
|  Green | <------|
| (v1.1) |
+--------+
```

#### Blue-Green Switch Commands

```bash
# Deploy to green environment
kubectl set image deployment/api-server-green \
  api-server=$NEW_IMAGE \
  -n production

# Wait for rollout
kubectl rollout status deployment/api-server-green -n production

# Run smoke tests against green
./scripts/smoke-tests.sh --target green

# Switch traffic to green
kubectl patch service api-server -n production \
  -p '{"spec":{"selector":{"version":"green"}}}'

# Verify traffic switch
./scripts/verify-traffic.sh --target green

# Keep blue as rollback target
# Do not delete until next deployment confirmed stable
```

### Rolling Deployment

Gradually replace old pods with new pods.

```yaml
# rolling-config.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
spec:
  replicas: 10
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 25%
      maxUnavailable: 25%
```

---

## Deployment Procedures

### Standard Deployment Procedure

#### Step 1: Preparation (T-30 minutes)

```bash
# 1. Announce deployment
./scripts/notify.sh --channel deployments --message "
DEPLOYMENT STARTING
--------------------
Service: api-server
Version: v1.2.3
Time: $(date -u +%H:%M) UTC
Owner: @$USER
"

# 2. Capture baselines
./scripts/capture-baseline.sh \
  --services "api-server,agent-worker" \
  --metrics "error-rate,latency,throughput" \
  --output /tmp/baseline-$(date +%Y%m%d).json

# 3. Verify prerequisites
./scripts/pre-deploy-check.sh --environment production

# 4. Create rollback snapshot
./scripts/create-rollback-point.sh --version $(./scripts/get-current-version.sh)
```

#### Step 2: Deploy Canary (T-0)

```bash
# 1. Deploy canary (1% traffic)
kubectl set image deployment/api-server-canary \
  api-server=$NEW_IMAGE \
  -n production

# 2. Wait for canary pods
kubectl rollout status deployment/api-server-canary -n production

# 3. Verify canary health
./scripts/verify-canary.sh --deployment api-server-canary

# 4. Monitor for 5 minutes
./scripts/monitor-deployment.sh \
  --duration 5m \
  --deployment api-server-canary \
  --baseline /tmp/baseline-$(date +%Y%m%d).json
```

#### Step 3: Progressive Rollout (T+5 minutes)

```bash
# 1. Increase to 10%
kubectl scale deployment/api-server-canary -n production --replicas=3

# 2. Monitor 10 minutes
./scripts/monitor-deployment.sh --duration 10m

# 3. If healthy, proceed to 50%
kubectl set image deployment/api-server \
  api-server=$NEW_IMAGE \
  -n production

kubectl rollout status deployment/api-server -n production --timeout=10m

# 4. Monitor 15 minutes
./scripts/monitor-deployment.sh --duration 15m
```

#### Step 4: Complete Rollout (T+30 minutes)

```bash
# 1. Scale down canary
kubectl scale deployment/api-server-canary -n production --replicas=0

# 2. Verify full deployment
kubectl get pods -n production -l app=api-server -o wide

# 3. Run verification tests
./scripts/verify-deployment.sh --full

# 4. Update deployment record
./scripts/record-deployment.sh \
  --version $NEW_VERSION \
  --status success
```

#### Step 5: Post-Deployment (T+45 minutes)

```bash
# 1. Announce completion
./scripts/notify.sh --channel deployments --message "
DEPLOYMENT COMPLETE
--------------------
Service: api-server
Version: v1.2.3
Duration: 45 minutes
Status: SUCCESS
"

# 2. Update documentation
./scripts/update-deployment-log.sh

# 3. Clean up old resources
./scripts/cleanup-old-versions.sh --keep 2
```

### Database Migration Procedure

#### Pre-Migration

```bash
# 1. Create backup
./scripts/db-backup.sh --database production --type full

# 2. Test migration in staging
./scripts/db-migrate.sh --database staging --version $MIGRATION_VERSION

# 3. Test rollback in staging
./scripts/db-rollback.sh --database staging --version $CURRENT_VERSION

# 4. Estimate migration time
./scripts/estimate-migration.sh --version $MIGRATION_VERSION
```

#### Migration Execution

```bash
# 1. Enable maintenance mode (if required)
./scripts/maintenance-mode.sh --enable --message "Database maintenance in progress"

# 2. Stop write traffic (if required)
./scripts/traffic-control.sh --mode read-only

# 3. Run migration
./scripts/db-migrate.sh \
  --database production \
  --version $MIGRATION_VERSION \
  --log /var/log/migrations/$(date +%Y%m%d).log

# 4. Verify migration
./scripts/db-verify.sh --post-migration

# 5. Resume normal traffic
./scripts/traffic-control.sh --mode normal

# 6. Disable maintenance mode
./scripts/maintenance-mode.sh --disable
```

### Agent Pack Deployment

```bash
# 1. Deploy to staging
./scripts/deploy-agent-pack.sh \
  --pack $PACK_NAME \
  --version $VERSION \
  --environment staging

# 2. Run agent tests
./scripts/test-agent-pack.sh --pack $PACK_NAME --environment staging

# 3. Deploy to production (disabled)
./scripts/deploy-agent-pack.sh \
  --pack $PACK_NAME \
  --version $VERSION \
  --environment production \
  --disabled

# 4. Enable for canary users
./scripts/feature-flag.sh set agent:$PACK_NAME:enabled \
  --users canary-users \
  --value true

# 5. Monitor and gradually enable
./scripts/gradual-rollout.sh \
  --flag agent:$PACK_NAME:enabled \
  --steps "5%,25%,50%,100%" \
  --interval 30m
```

---

## Rollback Procedures

### Rollback Decision Criteria

**Immediate Rollback (No Discussion):**
- Error rate > 5%
- P99 latency > 3x baseline
- Any data corruption
- Security vulnerability introduced
- Critical feature broken

**Consider Rollback:**
- Error rate > 1%
- P99 latency > 2x baseline
- Customer complaints received
- Unexpected behavior observed

### Rollback Commands

#### Kubernetes Rollback

```bash
# 1. Initiate rollback
kubectl rollout undo deployment/api-server -n production

# 2. Monitor rollback
kubectl rollout status deployment/api-server -n production

# 3. Verify rollback complete
kubectl get pods -n production -l app=api-server

# 4. Verify previous version running
kubectl get deployment api-server -n production \
  -o jsonpath='{.spec.template.spec.containers[0].image}'

# 5. Run smoke tests
./scripts/smoke-tests.sh --target production
```

#### Rollback to Specific Version

```bash
# 1. Find revision
kubectl rollout history deployment/api-server -n production

# 2. Rollback to specific revision
kubectl rollout undo deployment/api-server -n production --to-revision=$REVISION

# 3. Verify
kubectl rollout status deployment/api-server -n production
```

#### Database Rollback

```bash
# 1. Stop application traffic
./scripts/traffic-control.sh --mode maintenance

# 2. Run rollback
./scripts/db-rollback.sh \
  --database production \
  --version $PREVIOUS_VERSION \
  --verify

# 3. Deploy previous application version
kubectl rollout undo deployment/api-server -n production

# 4. Resume traffic
./scripts/traffic-control.sh --mode normal

# 5. Verify
./scripts/verify-rollback.sh --full
```

#### Feature Flag Rollback

```bash
# 1. Disable feature flag
./scripts/feature-flag.sh set feature:$FEATURE_NAME:enabled --value false

# 2. Clear related caches
./scripts/cache-clear.sh --pattern "feature:$FEATURE_NAME:*"

# 3. Verify feature disabled
./scripts/verify-feature.sh --name $FEATURE_NAME --expected disabled
```

### Rollback Notification

```bash
./scripts/notify.sh --channel deployments --message "
ROLLBACK INITIATED
--------------------
Service: api-server
From: v1.2.3
To: v1.2.2
Reason: $ROLLBACK_REASON
Owner: @$USER
Status: IN PROGRESS
"
```

---

## Verification Steps

### Smoke Tests

```bash
# Run quick smoke tests
./scripts/smoke-tests.sh --environment production

# Smoke test checklist:
# - Health endpoints responding
# - Authentication working
# - Core API endpoints working
# - Database connectivity
# - Cache connectivity
# - External integrations
```

### Functional Verification

```bash
# Run functional test suite
./scripts/functional-tests.sh \
  --environment production \
  --suite critical-paths \
  --timeout 10m
```

### Performance Verification

```bash
# Compare performance to baseline
./scripts/performance-compare.sh \
  --baseline /tmp/baseline-$(date +%Y%m%d).json \
  --current

# Expected output:
# Metric          | Baseline | Current | Delta  | Status
# --------------- | -------- | ------- | ------ | ------
# Error Rate      | 0.1%     | 0.12%   | +0.02% | OK
# P50 Latency     | 45ms     | 47ms    | +4.4%  | OK
# P99 Latency     | 200ms    | 210ms   | +5%    | OK
# Throughput      | 1000 rps | 1005 rps| +0.5%  | OK
```

### Integration Verification

```bash
# Verify all integrations
./scripts/integration-check.sh --all

# Check specific integrations
./scripts/integration-check.sh --services "openai,stripe,sendgrid"
```

### Verification Checklist

- [ ] All smoke tests passing
- [ ] Error rate within acceptable range
- [ ] Latency within acceptable range
- [ ] No new errors in logs
- [ ] Key business metrics stable
- [ ] Customer-facing features working
- [ ] Integrations healthy
- [ ] Monitoring and alerting working

---

## Emergency Deployments

### When to Use Emergency Deployment

- Active security vulnerability being exploited
- Production outage requiring code fix
- Data corruption requiring immediate fix
- Regulatory compliance emergency

### Emergency Deployment Procedure

```bash
# 1. Get VP approval
./scripts/get-approval.sh --type emergency --approver vp-engineering

# 2. Document the emergency
./scripts/create-emergency-record.sh \
  --reason "$EMERGENCY_REASON" \
  --approver "$APPROVER"

# 3. Skip canary, deploy directly
kubectl set image deployment/api-server \
  api-server=$NEW_IMAGE \
  -n production

# 4. Monitor closely
./scripts/monitor-deployment.sh \
  --duration continuous \
  --alerts critical

# 5. Notify all stakeholders
./scripts/notify.sh --channel all-engineering --message "
EMERGENCY DEPLOYMENT
--------------------
Service: api-server
Version: $VERSION
Reason: $EMERGENCY_REASON
Approved by: $APPROVER
Status: DEPLOYED
"
```

### Emergency Deployment Checklist

- [ ] VP approval obtained
- [ ] Emergency documented
- [ ] Minimal testing completed
- [ ] All stakeholders notified
- [ ] Enhanced monitoring enabled
- [ ] On-call aware and standing by
- [ ] Rollback plan ready

---

## Post-Deployment Activities

### Immediate (0-2 hours)

- [ ] Monitor error rates and latency
- [ ] Watch for customer complaints
- [ ] Verify feature functionality
- [ ] Check integration health
- [ ] Update deployment log

### Short-term (2-24 hours)

- [ ] Review overnight metrics
- [ ] Address any minor issues
- [ ] Close deployment ticket
- [ ] Update documentation
- [ ] Brief support team on changes

### Long-term (1-7 days)

- [ ] Analyze deployment metrics
- [ ] Collect user feedback
- [ ] Document lessons learned
- [ ] Update runbooks if needed
- [ ] Plan follow-up improvements

### Deployment Metrics to Track

| Metric | Target | Threshold |
|--------|--------|-----------|
| Deployment frequency | Daily | Weekly minimum |
| Lead time for changes | < 1 day | < 1 week |
| Deployment failure rate | < 5% | < 15% |
| Mean time to recovery | < 1 hour | < 4 hours |
| Change failure rate | < 10% | < 25% |

---

## Appendix

### Deployment Commands Quick Reference

```bash
# === Deployment ===
kubectl set image deployment/NAME IMAGE -n production
kubectl rollout status deployment/NAME -n production
kubectl rollout history deployment/NAME -n production

# === Rollback ===
kubectl rollout undo deployment/NAME -n production
kubectl rollout undo deployment/NAME -n production --to-revision=N

# === Scaling ===
kubectl scale deployment/NAME --replicas=N -n production

# === Monitoring ===
kubectl get pods -n production -l app=NAME
kubectl logs -n production -l app=NAME --tail=100
kubectl top pods -n production -l app=NAME

# === Feature Flags ===
./scripts/feature-flag.sh list
./scripts/feature-flag.sh set FLAG_NAME --value VALUE
./scripts/feature-flag.sh get FLAG_NAME
```

### CI/CD Pipeline Reference

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Run tests
        run: make test

      - name: Build image
        run: make build

      - name: Push image
        run: make push

      - name: Deploy canary
        run: make deploy-canary

      - name: Verify canary
        run: make verify-canary

      - name: Progressive rollout
        run: make deploy-production

      - name: Verify deployment
        run: make verify-production
```

### Related Runbooks

- [incident_response.md](./incident_response.md) - For deployment-caused incidents
- [scaling_operations.md](./scaling_operations.md) - For capacity during deployment
- [maintenance_windows.md](./maintenance_windows.md) - For planned maintenance
- [agent_troubleshooting.md](./agent_troubleshooting.md) - For agent pack issues

---

**Document Control**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-12-28 | SRE Team | Initial release |
