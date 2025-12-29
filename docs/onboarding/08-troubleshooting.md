# 08 - Troubleshooting

Common issues and solutions when working with AgentOS. Use this guide to diagnose and resolve problems quickly.

---

## Overview

This guide covers:

- Installation and setup issues
- Runtime errors
- Agent execution problems
- Performance issues
- Integration failures

---

## Quick Diagnostics

Before diving into specific issues, run these diagnostic commands:

```bash
# Check system health
npm run preflight

# Validate configurations
npm run validate

# Check agent registry
npm run pack:list

# View recent logs
npm run logs -- --tail 100
```

---

## Installation Issues

### Node.js Version Too Old

**Symptoms**:
```
Error: Unsupported engine
```

**Solution**:
```bash
# Check current version
node --version

# Install correct version using nvm
nvm install 18
nvm use 18

# Or download from nodejs.org
```

### Missing Dependencies

**Symptoms**:
```
Error: Cannot find module 'xyz'
```

**Solution**:
```bash
# Clean install
rm -rf node_modules
rm package-lock.json
npm install
```

### Permission Denied

**Symptoms**:
```
Error: EACCES: permission denied
```

**Solution**:
```bash
# Fix npm permissions
sudo chown -R $(whoami) ~/.npm
sudo chown -R $(whoami) node_modules

# Or use npx
npx npm install
```

### Port Already in Use

**Symptoms**:
```
Error: Port 3001 already in use
```

**Solution**:
```bash
# Find process using port
lsof -i :3001

# Kill the process
kill -9 <PID>

# Or change the port in config
```

---

## Runtime Errors

### Missing API Keys

**Symptoms**:
```
Error: No API key configured for provider
```

**Solution**:
1. Create `.env` file if missing
2. Add required keys:
```env
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```
3. Restart the runtime

### Database Connection Failed

**Symptoms**:
```
Error: Connection refused to database
```

**Solution**:
1. Verify database is running
2. Check connection string in `.env`
3. Verify network access
```bash
# Test connection
psql $DATABASE_URL -c "SELECT 1"
```

### Invalid YAML Configuration

**Symptoms**:
```
Error: Invalid agent YAML: missing required field 'identity.agent_id'
```

**Solution**:
1. Run the validator:
```bash
npm run validate -- --file path/to/agent.yaml
```
2. Fix reported errors
3. Refer to schema documentation

---

## Agent Execution Issues

### Agent Stuck in PENDING

**Symptoms**:
- Agent remains in PENDING for > 60 seconds
- No worker picking up tasks

**Diagnosis**:
```bash
# Check worker status
npm run worker:status

# Check queue depth
npm run queue:stats
```

**Solutions**:
1. Verify workers are running
2. Check worker logs for errors
3. Restart workers if needed
```bash
npm run worker:restart
```

### Agent Timeout

**Symptoms**:
```
Error: Execution timeout exceeded (60s)
```

**Solutions**:
1. Increase timeout in agent YAML:
```yaml
policies:
  execution:
    timeout_seconds: 180
```
2. Optimize agent logic
3. Check for slow external calls

### Gate Failure

**Symptoms**:
```
Error: Quality gate failed: Output contains PII
```

**Solutions**:
1. Check gate requirements
2. Ensure output meets criteria
3. Add PII redaction if needed:
```typescript
import { redactPII } from './runtime/security/pii_redaction';
const safeOutput = redactPII(output);
```

### Token Limit Exceeded

**Symptoms**:
```
Error: Token limit exceeded
```

**Solutions**:
1. Increase limit in configuration:
```typescript
max_tokens_per_run: 200000
```
2. Reduce input size
3. Implement chunking for large inputs

### Cost Limit Exceeded

**Symptoms**:
```
Error: Cost limit exceeded
```

**Solutions**:
1. Increase cost limit:
```typescript
max_cost_per_run: 20.0
```
2. Use more cost-effective models
3. Optimize prompts for fewer tokens

---

## Pack Issues

### Pack Not Found

**Symptoms**:
```
Error: Pack 'custom_pack' not found in registry
```

**Solutions**:
1. Verify pack is registered:
```bash
npm run pack:list
```
2. Add to `PACK_REGISTRY.yaml`
3. Validate pack structure

### Pack Manager Not Delegating

**Symptoms**:
- Tasks not reaching worker agents

**Diagnosis**:
```bash
# Check pack manager logs
npm run logs -- --pack product --agent pack_manager
```

**Solutions**:
1. Verify delegation configuration:
```yaml
delegation:
  can_delegate_to:
    - "worker_1"
    - "worker_2"
```
2. Check worker agent availability
3. Verify zone permissions

### Circular Dependencies

**Symptoms**:
```
Error: Circular dependency detected between packs
```

**Solution**:
1. Review pack dependencies
2. Remove circular references
3. Extract shared functionality to separate pack

---

## Model Provider Issues

### Rate Limiting

**Symptoms**:
```
Error: Rate limit exceeded (429)
```

**Solutions**:
1. Implement backoff:
```typescript
await wait(exponentialBackoff(attempt));
```
2. Use fallback models:
```yaml
fallback_models:
  - provider: "openai"
    model_id: "gpt-4-turbo"
```
3. Reduce request frequency

### Model Not Available

**Symptoms**:
```
Error: Model 'gpt-5' not found
```

**Solutions**:
1. Verify model name is correct
2. Check provider availability
3. Use fallback model

### API Key Invalid

**Symptoms**:
```
Error: Invalid API key (401)
```

**Solutions**:
1. Verify key is correct
2. Check key permissions
3. Regenerate key if needed

---

## Performance Issues

### Slow Agent Execution

**Diagnosis**:
```bash
# Check execution times
npm run metrics -- --agent product_prd_writer
```

**Solutions**:
1. Profile the agent:
```bash
npm run profile -- --agent product_prd_writer
```
2. Optimize prompts
3. Use faster models for simple tasks
4. Implement caching

### High Memory Usage

**Symptoms**:
- OOM errors
- Slow response times

**Diagnosis**:
```bash
# Check memory usage
npm run metrics -- --memory
```

**Solutions**:
1. Increase memory limits
2. Implement streaming for large data
3. Clean up resources properly
4. Reduce concurrent runs

### High Latency

**Symptoms**:
- Slow responses
- Timeout errors

**Solutions**:
1. Check network connectivity
2. Use geographically closer endpoints
3. Enable response streaming
4. Optimize model selection

---

## Integration Issues

### Webhook Signature Invalid

**Symptoms**:
```
Error: Invalid webhook signature
```

**Solutions**:
1. Verify webhook secret matches
2. Check signature algorithm
3. Ensure raw body is used for verification

### External API Timeout

**Symptoms**:
```
Error: Request timeout to external API
```

**Solutions**:
1. Increase timeout:
```typescript
const response = await fetch(url, { timeout: 30000 });
```
2. Implement retry logic
3. Add circuit breaker

### Database Query Slow

**Symptoms**:
- Long query times
- Timeout errors

**Solutions**:
1. Add indexes
2. Optimize queries
3. Implement connection pooling
4. Use read replicas

---

## Ops Console Issues

### Console Not Loading

**Solutions**:
1. Check Node.js version
2. Clear browser cache
3. Check for JavaScript errors
4. Verify API is running

### WebSocket Disconnected

**Symptoms**:
- Real-time updates not working
- "Disconnected" status

**Solutions**:
1. Check runtime is running
2. Verify WebSocket URL
3. Check for network issues
4. Reconnect manually

### Approvals Not Appearing

**Solutions**:
1. Refresh the page
2. Check filter settings
3. Verify WebSocket connection
4. Check API logs

---

## Common Error Codes

| Code | Description | Action |
|------|-------------|--------|
| E001 | Agent pack not found | Verify pack deployment |
| E002 | Invalid input format | Check input schema |
| E003 | Timeout exceeded | Increase timeout or optimize |
| E004 | Resource limit exceeded | Increase limits or optimize |
| E005 | Authentication failed | Check credentials |
| E006 | External API error | Check integration health |
| E007 | Artifact storage error | Check storage connectivity |
| E008 | Queue error | Check queue health |
| E009 | Gate failure | Review gate requirements |
| E010 | Policy violation | Review policy configuration |

---

## Diagnostic Commands Reference

| Command | Description |
|---------|-------------|
| `npm run preflight` | System health check |
| `npm run validate` | Validate configurations |
| `npm run pack:list` | List all packs |
| `npm run logs` | View recent logs |
| `npm run metrics` | View metrics |
| `npm run profile` | Profile an agent |
| `npm run worker:status` | Check worker status |
| `npm run queue:stats` | Check queue statistics |

---

## Getting Help

If you cannot resolve an issue:

1. **Search existing issues** on GitHub
2. **Check the FAQ** at [09-faq.md](./09-faq.md)
3. **Review runbooks** in `/docs/runbooks/`
4. **Open a GitHub issue** with:
   - Error message
   - Steps to reproduce
   - Environment details
   - Relevant logs

---

## Prevention

To prevent common issues:

1. **Run preflight checks** before deployment
2. **Validate YAML** before committing
3. **Test agents locally** before production
4. **Monitor metrics** for early warning
5. **Set up alerts** for critical issues

---

Previous: [07 - Ops Console](./07-ops-console.md) | Next: [09 - FAQ](./09-faq.md)
