# 06 - Security Best Practices

Security is a first-class citizen in AgentOS. This guide covers PII protection, secrets management, compliance gates, and security best practices for deploying AI agents in production.

---

## Overview

AgentOS implements multiple security layers:

- **PII Redaction** - Automatic detection and masking of sensitive data
- **Secrets Management** - Encrypted storage with rotation support
- **Gate System** - Security checkpoints before sensitive operations
- **Audit Logging** - Comprehensive action logging for compliance
- **Zone-Based Access** - Red/Yellow/Green permission levels
- **Policy Engine** - Configurable security policies

---

## Prerequisites

- Completed previous onboarding guides
- Understanding of security concepts
- Access to production environment (for deployment)

---

## Security Architecture

```
+-----------------------------------------------------------+
|                    SECURITY LAYERS                        |
|                                                           |
|  +------------------+  +------------------+               |
|  |  PII Redaction   |  | Secrets Manager  |               |
|  +------------------+  +------------------+               |
|                                                           |
|  +------------------+  +------------------+               |
|  | Security Gates   |  | Audit Logging    |               |
|  +------------------+  +------------------+               |
|                                                           |
|  +------------------+  +------------------+               |
|  |  Zone Access     |  | Policy Engine    |               |
|  +------------------+  +------------------+               |
|                                                           |
+-----------------------------------------------------------+
```

---

## Zone-Based Access Control

AgentOS uses a three-zone model:

| Zone | Risk Level | Use Case | Approval Required |
|------|------------|----------|-------------------|
| RED | High | Billing, legal, evidence | Always |
| YELLOW | Medium | APIs, core services | Tests + Review |
| GREEN | Low | Features, documentation | Autonomous |

### Configuring Zone Access

```yaml
# Agent authority configuration
authority:
  level: "Worker"
  zone: "GREEN"

  zone_access:
    red: false      # Cannot access red zone
    yellow: false   # Cannot access yellow zone
    green: true     # Can operate in green zone

  allowed_operations:
    - "read"
    - "analyze"
    - "report"

  forbidden_operations:
    - "write_production"
    - "delete"
    - "billing_access"
```

### Zone Enforcement in Code

```typescript
import { getPolicyEngine } from './runtime/core/policy_engine';

const policyEngine = getPolicyEngine();

// Check zone access
const result = await policyEngine.evaluate({
  request: {
    agent_id: 'agent.product.prd_writer.v1',
    action: 'access',
    resource: 'billing_api',
    zone: 'red',          // Requested zone
    timestamp: new Date().toISOString()
  },
  environment: { name: 'production' }
});

if (result.action === 'deny') {
  throw new Error('Agent not authorized for red zone access');
}
```

---

## PII Redaction

AgentOS automatically detects and redacts personally identifiable information.

### Built-in PII Patterns

| Pattern | Description | Example |
|---------|-------------|---------|
| SSN | Social Security Numbers | 123-45-6789 |
| Credit Card | Payment card numbers | 4111-1111-1111-1111 |
| Email | Email addresses | user@example.com |
| Phone | Phone numbers | (555) 123-4567 |
| IP Address | IPv4/IPv6 addresses | 192.168.1.1 |

### Using PII Redaction

```typescript
import { redactPII, PIIPattern } from './runtime/security/pii_redaction';

const input = `
Customer John Doe (john.doe@example.com) called about
order #12345. His SSN is 123-45-6789 and credit card
ends in 4111-1111-1111-1111.
`;

const redacted = redactPII(input);

console.log(redacted);
// Output:
// Customer [NAME REDACTED] ([EMAIL REDACTED]) called about
// order #12345. His SSN is [SSN REDACTED] and credit card
// ends in [CREDIT_CARD REDACTED].
```

### Custom PII Patterns

```typescript
import { registerPIIPattern } from './runtime/security/pii_redaction';

// Register custom pattern for employee IDs
registerPIIPattern({
  name: 'employee_id',
  pattern: /EMP-\d{6}/g,
  replacement: '[EMPLOYEE_ID REDACTED]'
});
```

### Gate-Based PII Enforcement

```yaml
# Gate policy for PII detection
gates:
  required:
    - id: "gate.security.no_pii.v1"
      description: "Ensure no PII in output"
      type: "security"
      checks:
        - name: "no_pii"
          blocking: true
          severity: "critical"
```

---

## Secrets Management

Secure handling of API keys, tokens, and credentials.

### Environment-Based Secrets

```env
# .env file (never commit to git!)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
DATABASE_URL=postgresql://...
JWT_SECRET=...
```

### Secrets in Runtime

```typescript
import { getSecretManager } from './runtime/security/secrets';

const secrets = getSecretManager();

// Get a secret (with caching)
const apiKey = await secrets.get('OPENAI_API_KEY');

// Secrets are never logged
console.log(`API Key: ${apiKey}`);
// Output: API Key: [REDACTED]
```

### Secret Rotation

```typescript
import { rotateSecret } from './runtime/security/secret_rotation';

// Schedule secret rotation
await rotateSecret({
  name: 'API_KEY',
  rotationInterval: 90,  // days
  onRotate: async (newValue) => {
    // Update dependent services
    await updateService(newValue);
  }
});
```

### Agent Secret Access

```yaml
# Agent configuration - secrets access
authority:
  secrets:
    access: "scoped"          # none | scoped | full
    allowed_secrets:
      - "OPENAI_API_KEY"
      - "DATABASE_READ_ONLY"
    forbidden_secrets:
      - "DATABASE_ADMIN"
      - "BILLING_API_KEY"
```

---

## Security Gates

Gates provide security checkpoints:

### Security Gate Types

| Gate Type | Purpose | When to Use |
|-----------|---------|-------------|
| PII Detection | Find sensitive data | All outputs |
| Secrets Scan | Find leaked credentials | Code outputs |
| Injection Defense | Detect prompt injection | External inputs |
| Compliance Check | Regulatory requirements | Marketing, finance |

### Configuring Security Gates

```yaml
# Agent gates configuration
gates:
  required:
    - id: "gate.security.no_pii.v1"
      description: "No PII in output"
      type: "security"
      threshold: 1.0  # Must pass 100%
      checks:
        - name: "no_pii"
          blocking: true
          severity: "critical"

    - id: "gate.security.no_secrets.v1"
      description: "No secrets in output"
      type: "security"
      checks:
        - name: "no_secrets"
          blocking: true
          severity: "critical"
```

### Creating Security Gates in Code

```typescript
import { createSecurityGate, runGate } from './runtime/core/gates';

const securityGate = createSecurityGate();

const result = await runGate(
  securityGate,
  'agent.product.prd_writer.v1',
  output,
  'green'
);

if (result.status === 'failed') {
  // Handle security violation
  await logSecurityIncident(result);
  throw new SecurityError('Output contains sensitive data');
}
```

---

## Audit Logging

Comprehensive logging for compliance:

### What Gets Logged

| Event | Details |
|-------|---------|
| Run Start | Agent, zone, input hash |
| Run Complete | Output hash, duration, cost |
| Tool Execution | Tool name, parameters (redacted) |
| Gate Results | Pass/fail, failures |
| Approvals | Request, approver, decision |
| Policy Violations | Rule, context |

### Audit Log Configuration

```typescript
import { getAuditLogger } from './runtime/core/audit';

const audit = getAuditLogger();

// Log an action
await audit.logAction(
  'execute',                           // Action type
  { type: 'agent', id: 'agent.prod.v1' }, // Actor
  { type: 'run', id: 'run_123' },      // Target
  'green',                             // Zone
  true,                                // Success
  {
    duration_ms: 1500,
    metadata: { cost_usd: 0.05 }
  }
);
```

### Audit Log Retention

```yaml
# Audit configuration
audit:
  retention_days: 365           # Keep for 1 year
  encryption: true              # Encrypt at rest
  immutable: true               # Cannot be modified
  storage: "append_log"         # Append-only storage
```

### Querying Audit Logs

```typescript
// Query audit logs
const logs = await audit.query({
  agent_id: 'agent.product.prd_writer.v1',
  zone: 'yellow',
  start_time: '2024-01-01',
  end_time: '2024-12-31',
  action: 'execute',
  success: false  // Only failures
});

for (const log of logs) {
  console.log(`${log.timestamp}: ${log.action} - ${log.success ? 'OK' : 'FAIL'}`);
}
```

---

## Compliance Gates

For regulated industries:

### TCPA Compliance (Telecommunications)

```yaml
# Marketing agent compliance
gates:
  required:
    - id: "gate.compliance.tcpa.v1"
      description: "TCPA compliance for messaging"
      type: "compliance"
      checks:
        - name: "has_opt_in"
          description: "Verify opt-in consent"
          blocking: true

        - name: "quiet_hours"
          description: "Respect quiet hours"
          blocking: true

        - name: "stop_handling"
          description: "STOP keyword processing"
          blocking: true
```

### CTIA Compliance

```yaml
gates:
  required:
    - id: "gate.compliance.ctia.v1"
      description: "CTIA program compliance"
      type: "compliance"
      checks:
        - name: "message_format"
          blocking: true

        - name: "opt_out_instructions"
          blocking: true

        - name: "sender_identification"
          blocking: true
```

---

## Webhook Security

Secure webhook handling:

### HMAC Verification

```typescript
import { verifyWebhookSignature } from './runtime/webhooks/gateway';

// Verify incoming webhook
const isValid = verifyWebhookSignature({
  payload: requestBody,
  signature: request.headers['x-signature'],
  secret: process.env.WEBHOOK_SECRET,
  algorithm: 'sha256'
});

if (!isValid) {
  throw new Error('Invalid webhook signature');
}
```

### Replay Defense

```typescript
import { checkReplayAttack } from './runtime/webhooks/gateway';

// Check for replay attacks
const isReplay = await checkReplayAttack({
  timestamp: request.headers['x-timestamp'],
  nonce: request.headers['x-nonce'],
  maxAge: 300  // 5 minutes
});

if (isReplay) {
  throw new Error('Replay attack detected');
}
```

---

## Security Policies

### Kill Switch Policy

Emergency shutdown capability:

```yaml
# ops/policies/killswitch.policy.v1.yaml
policy:
  id: "policy.killswitch.v1"
  name: "Kill Switch Policy"
  type: "killswitch"

  global:
    enabled: true
    authority: ["ops", "security", "cto"]

  per_pack:
    enabled: true
    authority: ["pack_owner", "ops"]

  triggers:
    - "security_incident"
    - "compliance_violation"
    - "cost_overrun"
    - "manual_activation"
```

### Rate Limiting Policy

```yaml
policy:
  id: "policy.rate_limit.v1"
  name: "Rate Limiting"
  type: "rate_limit"

  limits:
    per_agent:
      requests_per_minute: 60
      tokens_per_hour: 100000
      cost_per_hour: 10.0

    per_pack:
      requests_per_minute: 300
      tokens_per_hour: 500000
      cost_per_hour: 50.0

    global:
      requests_per_minute: 1000
      tokens_per_hour: 2000000
      cost_per_day: 500.0
```

---

## Security Checklist

Before deploying to production:

### Configuration
- [ ] API keys stored in secure environment variables
- [ ] Secrets never committed to version control
- [ ] PII redaction enabled for all outputs
- [ ] Audit logging configured and tested

### Access Control
- [ ] Zone access properly configured for all agents
- [ ] Forbidden operations explicitly listed
- [ ] Financial limits set appropriately
- [ ] Approval workflows for red zone access

### Gates
- [ ] Security gates enabled for all agents
- [ ] Compliance gates for regulated domains
- [ ] PII detection gate enabled
- [ ] Secrets scan gate enabled

### Monitoring
- [ ] Audit logs retained per requirements
- [ ] Anomaly detection configured
- [ ] Kill switch tested and documented
- [ ] Incident response plan in place

---

## Common Pitfalls

### Logging Sensitive Data

**Problem**: Secrets appearing in logs
**Solution**: Use structured logging with automatic redaction

```typescript
// Bad
console.log(`API Key: ${apiKey}`);

// Good
logger.info('API call made', { key_present: !!apiKey });
```

### Overly Permissive Zone Access

**Problem**: Agents with unnecessary zone access
**Solution**: Apply principle of least privilege

```yaml
# Bad
zone_access:
  red: true
  yellow: true
  green: true

# Good
zone_access:
  red: false
  yellow: false
  green: true  # Only what's needed
```

### Missing Audit Trail

**Problem**: Actions not logged for compliance
**Solution**: Enable comprehensive audit logging

```typescript
// Ensure all actions are logged
await audit.logAction('execute', actor, target, zone, success, details);
```

---

## Next Steps

Now that you understand security:

1. **[Ops Console](./07-ops-console.md)** - Monitor security events
2. **[Troubleshooting](./08-troubleshooting.md)** - Handle security issues
3. **[FAQ](./09-faq.md)** - Security questions

---

Previous: [05 - Runtime](./05-runtime.md) | Next: [07 - Ops Console](./07-ops-console.md)
