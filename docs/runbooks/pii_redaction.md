# PII Redaction Runbook

## Overview

AgentOS implements automatic PII (Personally Identifiable Information) redaction to protect sensitive data in agent outputs, logs, and artifacts. This runbook covers PII handling policies and procedures.

## PII Categories

### Category A: High Sensitivity (Always Redacted)

| Data Type | Pattern | Redaction Format |
|-----------|---------|------------------|
| SSN | XXX-XX-XXXX | `[REDACTED: SSN]` |
| Credit Card | 16 digits | `[REDACTED: CC]` |
| Bank Account | Account numbers | `[REDACTED: BANK]` |
| API Keys | Key patterns | `[REDACTED: KEY]` |
| Passwords | Password fields | `[REDACTED: PWD]` |

### Category B: Medium Sensitivity (Redacted by Default)

| Data Type | Pattern | Redaction Format |
|-----------|---------|------------------|
| Email | user@domain.com | `[REDACTED: EMAIL]` |
| Phone | Various formats | `[REDACTED: PHONE]` |
| Address | Street addresses | `[REDACTED: ADDR]` |
| Full Name | First + Last | `[REDACTED: NAME]` |
| DOB | Date patterns | `[REDACTED: DOB]` |

### Category C: Low Sensitivity (Configurable)

| Data Type | Redaction |
|-----------|-----------|
| IP Address | Optional |
| User IDs | Pack-specific |
| Location (City/State) | Context-dependent |

## Redaction Pipeline

### Automatic Redaction

PII redaction is applied automatically at these points:

1. **Agent Output**: Before storing artifacts
2. **Audit Logs**: Before writing log entries
3. **API Responses**: Before returning to clients
4. **Exports**: Before generating reports

### Configuration

Redaction settings are defined per pack in the agent YAML:

```yaml
security:
  pii_redaction:
    enabled: true
    categories:
      - high    # Always enabled
      - medium  # Enabled by default
      - low     # Pack-specific
    allow_list:
      - internal_user_ids
    custom_patterns:
      - name: employee_id
        pattern: "EMP-\\d{6}"
        redaction: "[REDACTED: EMP_ID]"
```

## Manual Redaction

### When Required

Manual redaction may be needed for:

- Unrecognized PII patterns
- Context-sensitive data
- Bulk data cleanup
- Incident remediation

### Procedure

1. **Identify** affected data
   ```bash
   ./scripts/pii_scan.sh --pack marketing --since "2024-01-01"
   ```

2. **Review** scan results
   - Verify PII classification
   - Note false positives
   - Document scope

3. **Apply** redaction
   ```bash
   ./scripts/pii_redact.sh --pack marketing --dry-run
   ./scripts/pii_redact.sh --pack marketing --confirm
   ```

4. **Verify** completion
   ```bash
   ./scripts/pii_scan.sh --pack marketing --verify
   ```

## Audit and Logging

### Redaction Events

All redaction events are logged:

```json
{
  "event_type": "pii.redacted",
  "timestamp": "2024-12-28T10:30:00Z",
  "pack": "marketing",
  "agent": "content-writer",
  "run_id": "run-abc123",
  "redacted_count": 3,
  "categories": ["email", "phone"]
}
```

### Viewing Redaction Logs

1. Open Ops Console Audit Explorer
2. Filter by event type: `pii.redacted`
3. Review redaction patterns

## Incident Response

### PII Exposure Detected

If unredacted PII is found:

1. **Immediately** activate pack kill switch
2. **Notify** Security Lead and Privacy Officer
3. **Document** scope of exposure:
   - What data types?
   - How many records?
   - Who had access?

4. **Contain** the exposure:
   ```bash
   # Quarantine affected artifacts
   ./scripts/quarantine_artifacts.sh --run-id <run_id>
   ```

5. **Remediate**:
   - Apply manual redaction
   - Update redaction patterns
   - Re-scan affected period

6. **Report** per legal requirements
   - GDPR: 72-hour notification
   - CCPA: As required
   - Internal: Incident report

### False Positive Handling

If valid data is incorrectly redacted:

1. Add pattern to allow_list
2. Test with sample data
3. Deploy updated configuration
4. Re-process affected artifacts if needed

## Compliance

### GDPR Requirements

- Right to erasure: Use `./scripts/gdpr_delete.sh`
- Data portability: Redacted exports available
- Processing records: Maintained in audit log

### CCPA Requirements

- Consumer data requests: Handled via support
- Opt-out of sale: N/A (data not sold)
- Deletion requests: Same as GDPR

### SOC 2 Controls

- PII inventory maintained
- Encryption at rest and in transit
- Access controls enforced
- Audit logging complete

## Testing

### Regular Testing Schedule

| Test | Frequency | Owner |
|------|-----------|-------|
| Pattern accuracy | Weekly | Security |
| New PII types | On change | Engineering |
| Full scan | Monthly | Compliance |

### Test Procedure

```bash
# Run PII detection tests
npm run test:pii

# Test with sample data
./scripts/pii_test.sh --samples ./test/pii_samples.json
```

## Related Documentation

- [data_retention.md](./data_retention.md) - Retention policies
- [incident_response.md](./incident_response.md) - Escalation
- Schema: `schemas/pii_redaction.schema.json`
- Policy: `ops/policies/gate.security.v1.yaml`
