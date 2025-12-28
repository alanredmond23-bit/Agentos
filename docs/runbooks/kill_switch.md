# Kill Switch Runbook

## Overview

The AgentOS kill switch provides emergency controls to halt agent execution at global or pack levels. This runbook covers when and how to use these controls.

## Kill Switch Levels

### Level 1: Global Kill Switch

**Effect**: Immediately stops ALL agent execution across ALL packs.

**When to Use**:
- Security breach detected
- Widespread incorrect agent behavior
- System-wide resource exhaustion
- Compliance/legal requirement

**Impact**:
- All running agent tasks are terminated
- Pending approvals remain pending
- Audit logging continues
- Recovery requires explicit re-enablement

### Level 2: Pack Kill Switch

**Effect**: Stops agent execution for a specific pack only.

**When to Use**:
- Issues isolated to one pack
- Pack-specific maintenance
- Testing or debugging needs
- Gradual rollout/rollback

**Impact**:
- Only affects the targeted pack
- Other packs continue normally
- Pack can be re-enabled independently

## Activation Procedures

### Using Ops Console (Recommended)

#### Global Kill Switch

1. Navigate to `/killswitch` in Ops Console
2. Locate "Global Agent Execution" section
3. Click the toggle to DISABLED state
4. Confirm action in the dialog
5. Verify all packs show as disabled

#### Pack Kill Switch

1. Navigate to `/killswitch` in Ops Console
2. Find the target pack in "Pack-Level Controls"
3. Click the toggle for that pack
4. Verify status changes to "Disabled"

### Using CLI (Backup Method)

If Ops Console is unavailable:

```bash
# Global kill switch
./scripts/emergency_stop.sh --global

# Pack kill switch
./scripts/emergency_stop.sh --pack marketing
./scripts/emergency_stop.sh --pack finance

# Check current status
./scripts/emergency_stop.sh --status
```

### Using Direct API (Last Resort)

```bash
# Global disable
curl -X POST http://localhost:8080/api/killswitch/global \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"enabled": false, "reason": "Emergency stop"}'

# Pack disable
curl -X POST http://localhost:8080/api/killswitch/pack/marketing \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"enabled": false, "reason": "Pack maintenance"}'
```

## Verification

After activating kill switch, verify:

1. **Ops Console**: Check pack status shows "Disabled"
2. **Active Runs**: Confirm no new runs are starting
3. **Monitoring**: Verify metrics show zero active agents
4. **Logs**: Check audit logs for kill switch event

```bash
# Verify via API
curl http://localhost:8080/api/packs/status | jq

# Expected output shows all enabled: false
```

## Recovery Procedures

### Re-enabling After Global Kill

1. **Confirm issue is resolved**
2. **Review incident documentation**
3. Navigate to Ops Console `/killswitch`
4. **Enable packs one at a time** (not global toggle)
5. Monitor each pack for 5 minutes before enabling next
6. Once all packs stable, global can be toggled if needed

### Re-enabling After Pack Kill

1. Confirm pack-specific issue is resolved
2. Navigate to Ops Console `/killswitch`
3. Toggle the specific pack to enabled
4. Monitor pack logs for 5 minutes
5. Verify normal operation

## Authorization

### Who Can Activate

| Level | Authorized Roles |
|-------|-----------------|
| Global | Incident Commander, Security Lead, CTO |
| Pack | Team Lead, On-Call Engineer, Incident Commander |

### Audit Trail

All kill switch actions are logged:

- Timestamp
- User ID
- Action (enable/disable)
- Target (global/pack name)
- Reason (if provided)
- IP address

## Testing

Kill switch should be tested monthly:

1. **Schedule** during low-traffic window
2. **Notify** stakeholders
3. **Activate** pack-level kill switch for test pack
4. **Verify** agents stop within 30 seconds
5. **Re-enable** and verify recovery
6. **Document** test results

```bash
# Test script
./scripts/test_killswitch.sh --pack test-pack --duration 60
```

## Troubleshooting

### Kill Switch Not Working

1. Check API service is running
2. Verify database connectivity
3. Check for network partitions
4. Use direct API or database update as last resort

### Agents Not Stopping

1. Some tasks may complete their current step
2. Check for zombie processes
3. Force terminate if necessary:

```bash
./scripts/force_terminate.sh --pack <pack_name>
```

### Cannot Re-enable

1. Check for dependent services
2. Verify policy gates are passing
3. Check for lock files
4. Contact platform team if blocked

## Related Documentation

- [incident_response.md](./incident_response.md) - When to use kill switch
- [ops_console.md](./ops_console.md) - Console usage
- Policy: `ops/policies/killswitch.policy.v1.yaml`
