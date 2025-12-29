# Video 06: Security Features

## Metadata

- **Duration:** 6 minutes
- **Audience:** Security engineers, compliance officers, developers
- **Prerequisites:** Basic understanding of AgentOS (Videos 01-02)
- **Goal:** Understand and configure AgentOS security controls

---

## Scene Breakdown

### Scene 1: Security Philosophy (0:00 - 0:40)

**Visuals:** Security architecture diagram.

**Narration:**
"AgentOS is built with security as a first-class citizen, not an afterthought. AI agents have significant power: they can access data, make changes, and interact with external systems. Without proper controls, this power becomes a liability. Let us explore how AgentOS keeps your agents secure."

**Actions:** Show security layers diagram:
- Runtime Security
- Agent Security
- Webhook Security
- Compliance Controls

---

### Scene 2: PII Redaction (0:40 - 1:30)

**Visuals:** Code editor and terminal showing redaction in action.

**Narration:**
"First, PII redaction. AgentOS automatically detects and masks sensitive data before it reaches agent memory or logs."

**Actions:** Show the redaction configuration:
```yaml
memory:
  redaction:
    enabled: true
    patterns: ["ssn", "credit_card", "bank_account", "email"]
```

**Narration (continued):**
"The redaction engine supports common patterns out of the box: social security numbers, credit cards, bank accounts, phone numbers, and emails. You can add custom patterns for your specific data types."

**Actions:** Show runtime code:
```typescript
// runtime/security/pii_redactor.ts
const patterns = {
  ssn: /\d{3}-\d{2}-\d{4}/g,
  credit_card: /\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}/g,
  // ... more patterns
};
```

**Narration (continued):**
"Watch what happens when data containing PII passes through the system."

**Actions:** Demonstrate in terminal:
```bash
# Input: "Customer SSN is 123-45-6789"
# Output: "Customer SSN is [REDACTED-SSN]"
```

---

### Scene 3: Secret Management (1:30 - 2:15)

**Visuals:** Secrets architecture diagram.

**Narration:**
"Agents need API keys, tokens, and credentials. AgentOS provides secure secret management with encryption and rotation."

**Actions:** Show secrets module:
```typescript
// runtime/security/secrets.ts
// Secrets are encrypted at rest
// Access is scoped by agent permissions
// Rotation is automatic and logged
```

**Narration (continued):**
"Secrets are never logged. The agent YAML can reference secrets by name, but the actual values are injected at runtime from secure storage."

**Actions:** Show agent config:
```yaml
security:
  secrets:
    access: "scoped"
    rotate_policy_days: 90
    logging_forbidden: true
```

**Narration (continued):**
"The rotation policy automatically rotates secrets on schedule. Rotation events are logged for audit purposes, but the secret values themselves are never recorded."

---

### Scene 4: Webhook Security (2:15 - 3:00)

**Visuals:** Webhook flow diagram with security checks.

**Narration:**
"When agents receive webhooks from external services, AgentOS validates them with multiple security checks."

**Actions:** Show webhook gateway code:
```typescript
// runtime/webhooks/gateway.ts
// 1. HMAC signature verification
// 2. Timestamp validation (replay defense)
// 3. Nonce checking (prevent duplicates)
// 4. Rate limiting
```

**Narration (continued):**
"HMAC verification ensures the webhook came from the expected sender. Timestamp validation rejects old requests that could be replays. Nonce checking prevents duplicate processing."

**Actions:** Show replay defense diagram:
```
Webhook -> Check Signature -> Check Timestamp -> Check Nonce -> Process
             |                    |                  |
             v                    v                  v
          Reject              Reject             Reject
```

**Narration (continued):**
"We support provider-specific verification for Stripe, Twilio, Sinch, and generic HMAC. Each provider has its own signature scheme."

**Actions:** Show provider files briefly

---

### Scene 5: Policy Engine and Gates (3:00 - 3:50)

**Visuals:** Policy enforcement flow.

**Narration:**
"The Policy Engine evaluates every agent action against configurable rules. Actions can be allowed, denied, or flagged for approval."

**Actions:** Show policy configuration:
```yaml
governance:
  required_gates:
    - "gate.quality.v1"
    - "gate.security.v1"
  conditional_gates:
    if_prod_mutation: ["gate.human.approval.v1"]
```

**Narration (continued):**
"Gates are checkpoints that validate outputs before they proceed. The quality gate checks for correctness and completeness. The security gate scans for policy violations like PII leaks or unsafe tool calls."

**Actions:** Show gate execution in terminal

**Narration (continued):**
"For high-risk operations like production mutations, the human approval gate routes the request to the Ops Console. No action proceeds without explicit approval."

**Actions:** Show approval appearing in Ops Console

---

### Scene 6: Tool Sandboxing (3:50 - 4:30)

**Visuals:** Sandbox architecture diagram.

**Narration:**
"Agents execute tools in a sandboxed environment. This limits what a compromised or misbehaving agent can do."

**Actions:** Show sandbox configuration:
```yaml
tools:
  sandboxing:
    enabled: true
    network_access: "restricted"
    file_system_access: "restricted"
    secret_access: "scoped"
```

**Narration (continued):**
"Network access can be none, restricted, or full. Restricted limits connections to approved domains. File system access follows the same pattern. Secret access is scoped to only the credentials the agent needs."

**Actions:** Show restriction in action:
```bash
# Agent tries to access unauthorized endpoint
# Error: Network access denied: api.external.com not in allowlist
```

**Narration (continued):**
"The permission model is allowlist-based. Agents can only use tools explicitly granted to them. The denylist provides an additional layer, blocking dangerous operations even if someone tries to expand permissions."

---

### Scene 7: Audit and Compliance (4:30 - 5:20)

**Visuals:** Audit log and compliance dashboard.

**Narration:**
"Every agent action is logged to an immutable audit trail. This is essential for compliance requirements and incident investigation."

**Actions:** Show audit log structure:
```typescript
// runtime/core/audit.ts
interface AuditEvent {
  timestamp: string;
  actor_id: string;
  action: string;
  resource: { type: string; id: string };
  zone: 'red' | 'yellow' | 'green';
  success: boolean;
  metadata: Record<string, unknown>;
  input_hash: string;   // What went in
  output_hash: string;  // What came out
}
```

**Narration (continued):**
"Audit events include hashes of inputs and outputs. This provides tamper evidence without storing sensitive data. You can verify that outputs match what was recorded."

**Actions:** Show Audit Explorer in Ops Console

**Narration (continued):**
"For marketing agents, compliance gates enforce TCPA and CTIA regulations. Agents cannot send messages without proper opt-in verification and STOP/HELP logic."

**Actions:** Show compliance configuration:
```yaml
compliance:
  policies:
    messaging:
      tcpa_mode: "strict"
      ctia_mode: "strict"
      requires_opt_in_proof: true
      requires_stop_help_logic: true
```

---

### Scene 8: Security Best Practices (5:20 - 6:00)

**Visuals:** Best practices checklist.

**Narration:**
"Let us close with security best practices. First, rotate secrets regularly. Use the built-in 90-day rotation or configure shorter intervals for high-sensitivity credentials."

**Actions:** Show checklist building:
1. Rotate secrets every 90 days or less

**Narration (continued):**
"Second, enable all security gates in production. Do not skip gates to save time."

**Actions:** Add to checklist:
2. Enable all security gates

**Narration (continued):**
"Third, review audit logs weekly. Look for anomalies, failed attempts, or unusual patterns."

**Actions:** Add to checklist:
3. Review audit logs weekly

**Narration (continued):**
"Fourth, use environment-specific policies. Development can be permissive. Production must be strict."

**Actions:** Add to checklist:
4. Strict policies in production

**Narration (continued):**
"Fifth, keep AgentOS updated. Security patches address vulnerabilities. Report any issues through the security disclosure process in SECURITY.md."

**Actions:** Add to checklist:
5. Keep AgentOS updated

---

## B-Roll Suggestions

- Lock and key imagery
- Shield animations
- Security operation center footage
- Code scrolling with highlights

## Graphics Needed

1. Security layers diagram (4 layers)
2. PII redaction before/after visual
3. Webhook validation flowchart
4. Sandbox boundary diagram
5. Audit trail visualization
6. Compliance badge icons (TCPA, CTIA, SOC2)
7. Best practices checklist graphic

## Call to Action

- **Primary:** Learn troubleshooting (Video 07)
- **Secondary:** Read SECURITY.md for vulnerability reporting
- **Tertiary:** Implement security gates in your packs

## Security Demonstration Warnings

- Do not use real PII in demonstrations
- Use placeholder credentials, not real API keys
- Blur or obscure any real system identifiers
- Test all security features in isolated environment

## Compliance Notes

Mention but do not provide legal advice about:
- TCPA (Telephone Consumer Protection Act)
- CTIA messaging guidelines
- SOC2 logging requirements
- GDPR considerations for PII
