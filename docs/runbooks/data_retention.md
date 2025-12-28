# Data Retention Runbook

## Overview

AgentOS maintains strict data retention policies to balance operational needs, compliance requirements, and storage efficiency. This runbook covers retention periods, archival procedures, and deletion policies.

## Retention Periods

### By Data Category

| Category | Retention | Archive | Deletion |
|----------|-----------|---------|----------|
| **Audit Logs** | 2 years | 5 years | 7 years |
| **Agent Artifacts** | 90 days | 1 year | 18 months |
| **Run Metadata** | 1 year | 3 years | 5 years |
| **Approval Records** | 2 years | 5 years | 7 years |
| **PII Data** | 30 days | N/A | 30 days |
| **Debug Logs** | 7 days | 30 days | 90 days |
| **Metrics** | 1 year | 3 years | 5 years |

### By Pack Type

Some packs have specialized retention requirements:

| Pack | Adjustment | Reason |
|------|------------|--------|
| Finance | +2 years audit | Regulatory |
| Legal | +3 years artifacts | Litigation hold |
| Marketing | Standard | None |
| Engineering | -50% debug logs | Volume |

## Storage Tiers

### Hot Storage (0-30 days)

- **Location**: Primary database
- **Access**: Immediate
- **Cost**: High
- **Use**: Active operations, real-time queries

### Warm Storage (30-365 days)

- **Location**: Object storage (S3/GCS)
- **Access**: Seconds to minutes
- **Cost**: Medium
- **Use**: Historical analysis, audits

### Cold Storage (1-7 years)

- **Location**: Archive storage (Glacier/Archive)
- **Access**: Hours
- **Cost**: Low
- **Use**: Compliance, legal holds

## Archival Procedures

### Automatic Archival

Data is automatically archived based on age:

```yaml
# archival_config.yaml
schedules:
  - data_type: artifacts
    hot_to_warm: 30d
    warm_to_cold: 1y

  - data_type: audit_logs
    hot_to_warm: 90d
    warm_to_cold: 2y
```

### Manual Archival

For immediate archival needs:

```bash
# Archive specific run artifacts
./scripts/archive.sh --run-id <run_id>

# Archive pack data before date
./scripts/archive.sh --pack marketing --before 2024-01-01

# Archive with verification
./scripts/archive.sh --pack finance --verify --notify
```

### Restoration

To restore archived data:

```bash
# Check archive status
./scripts/archive.sh --status --run-id <run_id>

# Initiate restoration (cold storage takes hours)
./scripts/restore.sh --run-id <run_id> --priority standard

# For urgent restoration
./scripts/restore.sh --run-id <run_id> --priority expedited
```

## Deletion Policies

### Standard Deletion

Data is permanently deleted after retention period:

1. **Verification**: Check no legal holds apply
2. **Notification**: 30 days before scheduled deletion
3. **Deletion**: Cryptographic erasure + storage deletion
4. **Confirmation**: Audit log entry created

### Early Deletion (GDPR/CCPA)

For data subject requests:

```bash
# Locate all data for identifier
./scripts/data_subject.sh --find --identifier <email>

# Generate deletion report
./scripts/data_subject.sh --report --identifier <email>

# Execute deletion (requires approval)
./scripts/data_subject.sh --delete --identifier <email> --approval-id <id>
```

### Legal Hold

To prevent deletion during legal proceedings:

```bash
# Apply legal hold
./scripts/legal_hold.sh --apply --case-id <id> --scope "pack:finance,date:2024-*"

# Check hold status
./scripts/legal_hold.sh --status --case-id <id>

# Release hold (requires legal approval)
./scripts/legal_hold.sh --release --case-id <id> --approval-id <id>
```

## Monitoring

### Storage Metrics

Monitor via Ops Console dashboards:

- Storage by tier and category
- Archival job status
- Deletion queue
- Legal hold count

### Alerts

| Alert | Condition | Action |
|-------|-----------|--------|
| Storage quota 80% | Approaching limit | Review retention |
| Archival failed | Job error | Investigate, retry |
| Deletion blocked | Legal hold conflict | Contact legal |
| Orphaned data | No retention policy | Assign or delete |

## Compliance Audits

### Self-Service Reports

```bash
# Generate retention compliance report
./scripts/retention_report.sh --format pdf --period 2024-Q4

# List data by retention status
./scripts/retention_report.sh --list --status approaching-deletion
```

### Audit Evidence

For external audits, provide:

1. Retention policy documentation
2. Archival job logs
3. Deletion confirmations
4. Legal hold records

## Configuration

### Retention Policy Schema

```yaml
# retention_policy.yaml
version: 1
policies:
  - name: standard
    data_types:
      - artifacts
      - metadata
    retention:
      active: 90d
      archive: 1y
      delete: 18m

  - name: compliance
    data_types:
      - audit_logs
      - approvals
    retention:
      active: 2y
      archive: 5y
      delete: 7y
    compliance:
      - SOC2
      - GDPR
```

### Pack-Level Overrides

```yaml
# agents/packs/finance/retention.yaml
extends: compliance
overrides:
  retention:
    active: 3y  # Extended for regulatory
  legal_hold:
    default_duration: 5y
```

## Troubleshooting

### Data Not Being Archived

1. Check archival job logs
2. Verify storage credentials
3. Check for lock files
4. Retry with verbose logging

### Cannot Delete Data

1. Check for legal holds
2. Verify retention period elapsed
3. Check deletion permissions
4. Review audit log for blocks

### Restoration Taking Too Long

1. Check restoration tier (standard vs expedited)
2. Verify data location (warm vs cold)
3. Contact cloud provider for SLA status

## Related Documentation

- [pii_redaction.md](./pii_redaction.md) - PII-specific retention
- [incident_response.md](./incident_response.md) - Incident data preservation
- Schema: `schemas/retention_policy.schema.json`
