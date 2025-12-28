# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them via email to: security@agentos.dev

Include the following information:

- Type of issue (e.g., buffer overflow, SQL injection, cross-site scripting)
- Full paths of source file(s) related to the issue
- Location of affected source code (tag/branch/commit or direct URL)
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit it

## Response Timeline

- **Initial Response**: Within 48 hours
- **Status Update**: Within 7 days
- **Resolution Target**: Within 30 days for critical issues

## Security Measures

AgentOS implements multiple security layers:

### Runtime Security

- **PII Redaction**: Automatic detection and masking of sensitive data
- **Secret Management**: Encrypted storage with rotation support
- **RLS Helpers**: Row-level security enforcement utilities

### Agent Security

- **Policy Engine**: Configurable security policies per agent
- **Gates**: Security checkpoints before sensitive operations
- **Audit Logging**: Comprehensive action logging for compliance

### Webhook Security

- **HMAC Verification**: Signature validation for all webhook providers
- **Replay Defense**: Timestamp and nonce validation
- **Rate Limiting**: Protection against abuse

### Compliance

- **TCPA/CTIA Gates**: Telecommunications compliance for marketing agents
- **SOC2 Logging**: Audit trail requirements
- **Data Retention**: Configurable retention policies

## Security Best Practices

When deploying AgentOS:

1. **Rotate secrets regularly** using the built-in rotation system
2. **Enable all security gates** in production
3. **Review audit logs** for anomalous activity
4. **Keep dependencies updated** via automated security PRs
5. **Use environment-specific policies** (stricter in production)
