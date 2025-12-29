# Security Incidents Runbook

**Document Version:** 1.0
**Last Updated:** 2024-12-28
**Owner:** Security Team
**Classification:** INTERNAL - SENSITIVE
**Review Cycle:** Quarterly

---

## Table of Contents

1. [Overview](#overview)
2. [Security Incident Classification](#security-incident-classification)
3. [Breach Detection](#breach-detection)
4. [Containment Procedures](#containment-procedures)
5. [Evidence Preservation](#evidence-preservation)
6. [Investigation Procedures](#investigation-procedures)
7. [Notification Requirements](#notification-requirements)
8. [Recovery Procedures](#recovery-procedures)
9. [Post-Incident Activities](#post-incident-activities)
10. [Appendix](#appendix)

---

## Overview

This runbook defines procedures for responding to security incidents affecting AgentOS. Security incidents require specialized handling to ensure proper evidence preservation, regulatory compliance, and minimize damage.

### Definition of Security Incident

A security incident is any event that:
- Compromises confidentiality, integrity, or availability of data
- Violates security policies
- Results in unauthorized access to systems
- Involves malicious activity or indicators of compromise
- Exposes sensitive customer or business data

### Security Incident Response Team (SIRT)

| Role | Responsibility | Contact |
|------|----------------|---------|
| Security Lead | Incident command, coordination | PagerDuty: security-oncall |
| Security Engineer | Technical investigation | PagerDuty: security-oncall |
| Legal Counsel | Regulatory compliance | legal@company.com |
| Communications | External communications | comms@company.com |
| Executive Sponsor | Business decisions | VP Engineering |

### Critical First Actions

When a security incident is suspected:

1. **DO NOT** modify or delete any logs or data
2. **DO NOT** shut down systems unless active data exfiltration
3. **DO** isolate affected systems if possible
4. **DO** document everything with timestamps
5. **DO** escalate to Security Lead immediately

---

## Security Incident Classification

### Severity Levels

#### SEV1 - Critical

**Definition:** Active breach with confirmed data exfiltration or ongoing attack.

| Attribute | Value |
|-----------|-------|
| **Response Time** | Immediate (< 5 minutes) |
| **Notification** | Executive team, Legal, potentially regulators |
| **Bridge Call** | Mandatory |
| **Evidence Collection** | Forensic level |

**Examples:**
- Active ransomware attack
- Confirmed PII/PHI data breach
- Compromised production database
- Attacker persistence detected
- Credential stuffing with successful logins

#### SEV2 - High

**Definition:** Confirmed security incident with potential for significant impact.

| Attribute | Value |
|-----------|-------|
| **Response Time** | < 30 minutes |
| **Notification** | Security Lead, Engineering Manager |
| **Bridge Call** | As needed |
| **Evidence Collection** | Standard |

**Examples:**
- Unauthorized access detected
- Malware detected on production system
- API key or credential exposure
- Suspicious admin activity
- Vulnerability actively being exploited

#### SEV3 - Medium

**Definition:** Security concern requiring investigation.

| Attribute | Value |
|-----------|-------|
| **Response Time** | < 2 hours |
| **Notification** | Security Team |
| **Bridge Call** | Optional |
| **Evidence Collection** | Standard |

**Examples:**
- Failed authentication spike
- Unusual network traffic patterns
- Potential phishing attempt
- Misconfigured security controls
- Non-critical vulnerability discovered

#### SEV4 - Low

**Definition:** Security observation for awareness.

| Attribute | Value |
|-----------|-------|
| **Response Time** | Next business day |
| **Notification** | Ticket creation |
| **Bridge Call** | None |
| **Evidence Collection** | Basic |

**Examples:**
- Security policy violations
- Expired certificates
- Outdated dependencies
- Security audit findings

---

## Breach Detection

### Detection Sources

| Source | Alert Type | Monitoring Tool |
|--------|------------|-----------------|
| WAF | Attack patterns | AWS WAF |
| IDS/IPS | Intrusion attempts | AWS GuardDuty |
| SIEM | Correlation alerts | Datadog Security |
| Authentication | Failed logins, impossible travel | Auth0/Okta |
| Agent Activity | Suspicious agent behavior | AgentOS Audit |
| External | Bug bounty, threat intel | HackerOne, ThreatIntel feeds |

### Key Indicators of Compromise (IOC)

#### Network IOCs
- Unusual outbound connections
- Data exfiltration patterns (large uploads)
- Connections to known malicious IPs
- DNS requests to suspicious domains
- Traffic outside business hours

#### System IOCs
- Unexpected process execution
- Modified system files
- New user accounts
- Privilege escalation
- Disabled security controls

#### Application IOCs
- Unusual API call patterns
- Mass data queries
- Authentication anomalies
- Injection attempts
- File upload anomalies

### Detection Queries

#### Suspicious Authentication Activity

```sql
-- Find impossible travel
SELECT user_id, ip_address, location, timestamp
FROM auth_logs
WHERE timestamp > NOW() - INTERVAL '1 hour'
GROUP BY user_id
HAVING COUNT(DISTINCT location) > 1
  AND MAX(distance_km(location)) > 500;

-- Failed authentication spike
SELECT user_id, COUNT(*) as failures
FROM auth_logs
WHERE status = 'failed'
  AND timestamp > NOW() - INTERVAL '15 minutes'
GROUP BY user_id
HAVING COUNT(*) > 10;
```

#### Suspicious Data Access

```sql
-- Mass data download
SELECT user_id, COUNT(*) as records_accessed
FROM data_access_logs
WHERE timestamp > NOW() - INTERVAL '1 hour'
GROUP BY user_id
HAVING COUNT(*) > 10000;

-- After-hours access
SELECT user_id, action, timestamp
FROM data_access_logs
WHERE EXTRACT(HOUR FROM timestamp) NOT BETWEEN 6 AND 22
  AND timestamp > NOW() - INTERVAL '24 hours';
```

---

## Containment Procedures

### Immediate Containment Actions

#### Step 1: Isolate Affected Systems

```bash
# Isolate network (AWS Security Group)
aws ec2 modify-instance-attribute \
  --instance-id $INSTANCE_ID \
  --groups $ISOLATION_SECURITY_GROUP

# Kubernetes network policy isolation
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: isolate-compromised
  namespace: production
spec:
  podSelector:
    matchLabels:
      compromised: "true"
  policyTypes:
  - Ingress
  - Egress
EOF

# Label compromised pod
kubectl label pod $POD_NAME compromised=true -n production
```

#### Step 2: Disable Compromised Credentials

```bash
# Rotate API keys
./scripts/rotate-api-key.sh --key-id $KEY_ID --immediate

# Disable user account
./scripts/disable-user.sh --user-id $USER_ID --reason "security incident"

# Revoke OAuth tokens
./scripts/revoke-tokens.sh --user-id $USER_ID --all

# Rotate service account credentials
kubectl delete secret $SECRET_NAME -n production
kubectl create secret generic $SECRET_NAME -n production --from-literal=key=$(openssl rand -base64 32)
```

#### Step 3: Block Malicious IPs/Actors

```bash
# Add IP to WAF block list
aws wafv2 update-ip-set \
  --name blocked-ips \
  --scope REGIONAL \
  --id $IP_SET_ID \
  --addresses $MALICIOUS_IP/32

# Block at load balancer
aws elbv2 modify-rule \
  --rule-arn $RULE_ARN \
  --conditions Field=source-ip,SourceIpConfig={Values=[$MALICIOUS_IP/32]} \
  --actions Type=fixed-response,FixedResponseConfig={StatusCode=403}
```

#### Step 4: Preserve System State

```bash
# Snapshot affected EBS volumes
aws ec2 create-snapshot \
  --volume-id $VOLUME_ID \
  --description "Security Incident $INCIDENT_ID - $(date -u +%Y%m%dT%H%M%SZ)"

# Capture memory dump (if possible)
./scripts/memory-dump.sh --instance $INSTANCE_ID --output s3://security-evidence/$INCIDENT_ID/

# Export container filesystem
kubectl exec $POD_NAME -n production -- tar czf - / > /evidence/$INCIDENT_ID/filesystem.tar.gz
```

### Containment Decision Matrix

| Scenario | Containment Action | Impact |
|----------|-------------------|--------|
| Single compromised pod | Isolate pod, preserve state | Minimal |
| Compromised credentials | Rotate immediately | Auth disruption |
| Active data exfiltration | Isolate system immediately | Service impact |
| Ransomware detected | Full network isolation | Major outage |
| Suspicious agent activity | Kill switch + preserve | Agent disruption |

---

## Evidence Preservation

### Evidence Types

| Evidence Type | Collection Method | Storage Location | Retention |
|---------------|-------------------|------------------|-----------|
| System logs | Log export | S3: security-evidence | 7 years |
| Memory dump | Memory capture tool | S3: security-evidence | 1 year |
| Disk image | EBS snapshot | AWS Snapshots | 1 year |
| Network traffic | Packet capture | S3: security-evidence | 90 days |
| Application logs | Datadog export | S3: security-evidence | 7 years |
| Database queries | Audit log export | S3: security-evidence | 7 years |

### Chain of Custody

All evidence must maintain chain of custody:

```markdown
## Evidence Chain of Custody Form

**Incident ID:** INC-SEC-XXXX
**Evidence ID:** EVD-XXXX

### Collection
- **Collected By:** [Name]
- **Date/Time:** [UTC Timestamp]
- **Location:** [Source system/path]
- **Method:** [Collection tool/method]
- **Hash (SHA256):** [Hash value]

### Transfer Log
| Date/Time | From | To | Purpose | Signature |
|-----------|------|-----|---------|-----------|
| | | | | |

### Storage
- **Location:** [S3 path or physical location]
- **Access Controls:** [Who has access]
- **Encryption:** [Yes/No, method]
```

### Evidence Collection Commands

```bash
# Create evidence directory
INCIDENT_ID="INC-SEC-$(date +%Y%m%d%H%M)"
EVIDENCE_DIR="s3://security-evidence/$INCIDENT_ID"
mkdir -p /tmp/$INCIDENT_ID

# Collect system logs
./scripts/collect-evidence.sh \
  --incident-id $INCIDENT_ID \
  --type logs \
  --source production \
  --time-range "24 hours" \
  --output $EVIDENCE_DIR/logs/

# Collect database audit logs
./scripts/collect-evidence.sh \
  --incident-id $INCIDENT_ID \
  --type db-audit \
  --database production \
  --time-range "7 days" \
  --output $EVIDENCE_DIR/db-audit/

# Collect network flow logs
./scripts/collect-evidence.sh \
  --incident-id $INCIDENT_ID \
  --type vpc-flow \
  --time-range "24 hours" \
  --output $EVIDENCE_DIR/network/

# Generate evidence manifest with hashes
./scripts/generate-manifest.sh \
  --evidence-dir $EVIDENCE_DIR \
  --output $EVIDENCE_DIR/manifest.json

# Verify evidence integrity
./scripts/verify-evidence.sh --manifest $EVIDENCE_DIR/manifest.json
```

---

## Investigation Procedures

### Investigation Workflow

```
Detection
    |
    v
+---+---+
| Triage |
+---+---+
    |
    v
+---+---+
| Scope  |
+---+---+
    |
    v
+--------+--------+
| Evidence        |
| Collection      |
+--------+--------+
    |
    v
+--------+--------+
| Analysis        |
+--------+--------+
    |
    v
+--------+--------+
| Root Cause      |
| Determination   |
+--------+--------+
    |
    v
+--------+--------+
| Remediation     |
+--------+--------+
```

### Investigation Steps

#### Step 1: Establish Timeline

```bash
# Create timeline from logs
./scripts/build-timeline.sh \
  --incident-id $INCIDENT_ID \
  --sources "auth,api,agent,network" \
  --time-range "2024-12-27T00:00:00Z/2024-12-28T12:00:00Z" \
  --output $EVIDENCE_DIR/timeline.json

# Output format:
# {
#   "timeline": [
#     {"timestamp": "2024-12-27T10:15:30Z", "source": "auth", "event": "Failed login", "details": {...}},
#     {"timestamp": "2024-12-27T10:15:45Z", "source": "auth", "event": "Successful login", "details": {...}},
#     ...
#   ]
# }
```

#### Step 2: Identify Attack Vector

**Common Attack Vectors:**

| Vector | Investigation Focus | Key Evidence |
|--------|---------------------|--------------|
| Credential compromise | Auth logs, password reuse | Login locations, times |
| API exploitation | API logs, error patterns | Request payloads, responses |
| Insider threat | Access logs, data queries | Unusual access patterns |
| Supply chain | Dependency analysis | Package versions, sources |
| Social engineering | Email logs, user reports | Communication records |

#### Step 3: Determine Scope

```bash
# Identify affected systems
./scripts/scope-analysis.sh \
  --incident-id $INCIDENT_ID \
  --ioc-file $EVIDENCE_DIR/iocs.json \
  --scan-targets "production,staging"

# Identify affected data
./scripts/data-impact.sh \
  --incident-id $INCIDENT_ID \
  --user-id $COMPROMISED_USER \
  --time-range "7 days"

# Identify affected users
./scripts/user-impact.sh \
  --incident-id $INCIDENT_ID \
  --data-types "pii,credentials,financial"
```

#### Step 4: Root Cause Analysis

**RCA Template:**

```markdown
## Root Cause Analysis

### What Happened
[Detailed description of the incident]

### Attack Timeline
| Time (UTC) | Event | Evidence |
|------------|-------|----------|
| | | |

### Root Cause
[Technical explanation of how the breach occurred]

### Contributing Factors
1. [Factor 1]
2. [Factor 2]

### Impact Assessment
- **Data Exposed:** [Types and volume]
- **Systems Affected:** [List]
- **Users Affected:** [Count and types]
- **Business Impact:** [Description]

### Remediation Actions
| Action | Owner | Status | Due Date |
|--------|-------|--------|----------|
| | | | |
```

---

## Notification Requirements

### Internal Notifications

| Severity | Notify Immediately | Notify Within 1 Hour | Notify Within 24 Hours |
|----------|-------------------|---------------------|------------------------|
| SEV1 | CEO, CTO, Legal, Board | All executives | All employees |
| SEV2 | VP Engineering, Legal | CTO, Security Team | Affected teams |
| SEV3 | Security Lead | Engineering Manager | Security Team |
| SEV4 | Security Team | N/A | N/A |

### External Notification Requirements

#### Regulatory Requirements

| Regulation | Trigger | Timeline | Authority |
|------------|---------|----------|-----------|
| GDPR | EU personal data breach | 72 hours | Data Protection Authority |
| CCPA | CA resident data breach | "Without unreasonable delay" | CA Attorney General |
| HIPAA | PHI breach | 60 days (or 72 hours if urgent) | HHS |
| PCI-DSS | Cardholder data breach | Immediately | Card brands, banks |
| SOC 2 | Material breach | Per agreement | Auditor notification |

#### Customer Notification Template

```
Subject: Security Incident Notification - [Company Name]

Dear [Customer Name],

We are writing to inform you of a security incident that may have affected your data.

**What Happened:**
[Brief, clear description of the incident]

**What Information Was Involved:**
[Types of data potentially affected]

**What We Are Doing:**
[Actions taken to address the incident]

**What You Can Do:**
[Recommended protective actions for the customer]

**For More Information:**
[Contact information and resources]

We sincerely apologize for any concern this may cause and are committed to protecting your information.

Sincerely,
[Name]
[Title]
[Company]
```

### Notification Checklist

- [ ] Internal stakeholders notified per severity
- [ ] Legal counsel consulted on notification requirements
- [ ] Regulatory notification timeline determined
- [ ] Customer notification drafted and reviewed by Legal
- [ ] Media statement prepared (if needed)
- [ ] Customer support briefed
- [ ] Notification records documented

---

## Recovery Procedures

### Recovery Priority

1. **Immediate:** Stop ongoing attack, prevent further damage
2. **Short-term:** Restore critical services
3. **Medium-term:** Full system recovery
4. **Long-term:** Implement preventive controls

### System Recovery Steps

#### Step 1: Verify Threat Elimination

```bash
# Scan for remaining IOCs
./scripts/ioc-scan.sh \
  --ioc-file $EVIDENCE_DIR/iocs.json \
  --target production \
  --thorough

# Verify no persistence mechanisms
./scripts/persistence-check.sh --target production

# Review all recent changes
./scripts/change-audit.sh --time-range "7 days"
```

#### Step 2: Credential Reset

```bash
# Reset all potentially compromised credentials
./scripts/mass-credential-reset.sh \
  --scope affected-users \
  --include-service-accounts \
  --notify-users

# Rotate all secrets
./scripts/rotate-all-secrets.sh \
  --namespace production \
  --backup-first

# Invalidate all active sessions
./scripts/invalidate-sessions.sh --all
```

#### Step 3: System Restoration

```bash
# Restore from clean backup (if needed)
./scripts/restore-from-backup.sh \
  --backup-id $CLEAN_BACKUP_ID \
  --target production \
  --verify-integrity

# Rebuild compromised systems (if needed)
./scripts/rebuild-infrastructure.sh \
  --component $COMPROMISED_COMPONENT \
  --from-scratch

# Deploy security patches
./scripts/deploy-patches.sh --emergency --target production
```

#### Step 4: Verification

```bash
# Run security scan
./scripts/security-scan.sh --comprehensive --target production

# Verify all controls are operational
./scripts/security-controls-check.sh

# Monitor for anomalies
./scripts/enhanced-monitoring.sh --enable --duration "7 days"
```

---

## Post-Incident Activities

### Post-Incident Review (PIR)

Schedule within 72 hours of resolution for SEV1/SEV2.

**PIR Agenda:**
1. Incident timeline review
2. Detection effectiveness
3. Response effectiveness
4. Communication effectiveness
5. Root cause analysis review
6. Action items and improvements
7. Lessons learned

### PIR Template

```markdown
# Security Post-Incident Review

**Incident ID:** INC-SEC-XXXX
**Date of Incident:** YYYY-MM-DD
**Date of Review:** YYYY-MM-DD
**Attendees:** [List]

## Executive Summary
[2-3 sentence summary]

## Incident Timeline
[Detailed timeline with evidence references]

## Detection Analysis
- **How was it detected?** [Description]
- **Detection time:** [Duration from start to detection]
- **Could we detect earlier?** [Analysis]

## Response Analysis
- **Response time:** [Duration from detection to containment]
- **What worked well?** [List]
- **What could improve?** [List]

## Root Cause
[Detailed root cause analysis]

## Impact Summary
| Impact Type | Details |
|-------------|---------|
| Data | |
| Systems | |
| Users | |
| Business | |
| Regulatory | |

## Action Items
| ID | Action | Owner | Priority | Due Date | Status |
|----|--------|-------|----------|----------|--------|
| | | | | | |

## Lessons Learned
1. [Lesson 1]
2. [Lesson 2]

## Prevention Measures
[Specific technical and process improvements]
```

### Metrics to Track

| Metric | Target | This Incident |
|--------|--------|---------------|
| Time to Detect | < 1 hour | |
| Time to Contain | < 4 hours | |
| Time to Eradicate | < 24 hours | |
| Time to Recover | < 48 hours | |
| Post-Incident Actions Completed | 100% within SLA | |

---

## Appendix

### Security Contacts

| Role | Name | Contact | Escalation |
|------|------|---------|------------|
| Security Lead | [Name] | PagerDuty | Immediate |
| Security Engineer | [Name] | PagerDuty | Immediate |
| CISO | [Name] | Phone | SEV1/SEV2 |
| Legal Counsel | [Name] | Email/Phone | All incidents |
| External Forensics | [Firm] | [Phone] | SEV1 |
| Cyber Insurance | [Company] | [Phone] | Breach confirmed |

### Security Tools

| Tool | Purpose | Access |
|------|---------|--------|
| AWS GuardDuty | Threat detection | AWS Console |
| Datadog Security | SIEM | Datadog |
| AWS WAF | Attack blocking | AWS Console |
| Vault | Secrets management | CLI/UI |
| Snyk | Vulnerability scanning | CLI/UI |

### Quick Reference Commands

```bash
# Emergency credential rotation
./scripts/emergency-credential-rotate.sh

# Isolate compromised system
./scripts/isolate-system.sh --target $TARGET

# Enable enhanced logging
./scripts/enhanced-logging.sh --enable

# Generate incident report
./scripts/incident-report.sh --id $INCIDENT_ID

# Check for known IOCs
./scripts/ioc-check.sh --source threatintel

# Export evidence package
./scripts/export-evidence.sh --incident $INCIDENT_ID --format forensic
```

### Related Runbooks

- [incident_response.md](./incident_response.md) - General incident response
- [pii_redaction.md](./pii_redaction.md) - PII handling procedures
- [kill_switch.md](./kill_switch.md) - Emergency shutdown
- [data_retention.md](./data_retention.md) - Data policies

---

**Document Control**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-12-28 | Security Team | Initial release |

**Classification:** INTERNAL - SENSITIVE
**Distribution:** Security Team, SRE Team, Engineering Leadership
