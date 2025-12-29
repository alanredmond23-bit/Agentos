# 05 - Runtime Configuration

The AgentOS Runtime is the TypeScript orchestration engine that executes agents, enforces policies, and manages state. This guide covers configuration, deployment, and optimization.

---

## Overview

The runtime provides:

- **Orchestrator** - Task routing and lifecycle management
- **Model Router** - Multi-provider LLM management
- **Gate Executor** - Quality checkpoint enforcement
- **Policy Engine** - Configurable rules and quotas
- **State Store** - Persistent state management
- **Audit Logger** - Comprehensive action logging

---

## Prerequisites

- Completed previous onboarding guides
- Understanding of TypeScript
- Node.js 18+ installed

---

## Architecture

```
+-----------------------------------------------------------+
|                     RUNTIME ENGINE                        |
|                                                           |
|  +------------+  +------------+  +------------+          |
|  |Orchestrator|  |Task Router |  |State Store |          |
|  +------------+  +------------+  +------------+          |
|                                                           |
|  +------------+  +------------+  +------------+          |
|  |  Approvals |  |Idempotency |  |   Audit    |          |
|  +------------+  +------------+  +------------+          |
|                                                           |
|  +------------+  +------------+  +------------+          |
|  |Model Router|  |   Gates    |  |Policy Eng. |          |
|  +------------+  +------------+  +------------+          |
|                                                           |
+-----------------------------------------------------------+
                           |
+-----------------------------------------------------------+
|                      ADAPTERS                             |
|  +--------+  +---------+  +--------+  +---------+        |
|  | OpenAI |  |Anthropic|  | Gemini |  | DeepSeek|        |
|  +--------+  +---------+  +--------+  +---------+        |
+-----------------------------------------------------------+
```

---

## Configuration

### Runtime Configuration

Configure the orchestrator in your application:

```typescript
import { Orchestrator, OrchestratorConfig } from './runtime/core/orchestrator';

const config: OrchestratorConfig = {
  // Default zone for new runs
  default_zone: 'green',

  // Maximum tokens per run
  max_tokens_per_run: 100000,

  // Maximum cost per run (USD)
  max_cost_per_run: 10.0,

  // Maximum tool calls per run
  max_tool_calls_per_run: 100,

  // Maximum run duration (milliseconds)
  max_run_duration_ms: 300000, // 5 minutes

  // Enable quality gates
  enable_quality_gates: true,

  // Enable policy checks
  enable_policy_checks: true,

  // Auto-save state interval (milliseconds)
  auto_save_interval_ms: 10000
};

const orchestrator = new Orchestrator(config);
```

### Environment Variables

Essential environment variables:

```env
# Node environment
NODE_ENV=development  # development | staging | production

# Logging
LOG_LEVEL=info        # debug | info | warn | error

# LLM Providers
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_AI_API_KEY=...
DEEPSEEK_API_KEY=...

# Database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Redis (for queue)
REDIS_URL=redis://localhost:6379

# Feature Flags
ENABLE_AUDIT_LOGGING=true
ENABLE_COST_TRACKING=true
ENABLE_RATE_LIMITING=true
```

---

## Creating and Managing Runs

### Creating a Run

```typescript
import { getOrchestrator, loadAgentYAML } from './runtime/core/orchestrator';

// Get the orchestrator singleton
const orchestrator = getOrchestrator();

// Load an agent configuration
const agent = await loadAgentYAML('agents/packs/product/agents/product_prd_writer.yaml');

// Create a run
const run = await orchestrator.createRun(agent, {
  task_class: 'prd_creation',
  mode: 'default',
  input: { brief: 'Create a PRD for user authentication' },
  zone: 'green',
  metadata: { project: 'auth-feature' }
});

console.log(`Created run: ${run.run_id}`);
// Output: Created run: run_1703769600000_a1b2c3d4
```

### Starting a Run

```typescript
// Start the run
await orchestrator.startRun(run.run_id);

// Add user message
await orchestrator.addMessage(run.run_id, {
  role: 'user',
  content: 'Create a PRD for a user authentication system with SSO support'
});

// Get completion from LLM
const response = await orchestrator.getCompletion(run.run_id, {
  use_case: 'prd_creation',
  preset: 'thorough'
});

console.log(response.content);
```

### Completing a Run

```typescript
// Complete the run with output
const result = await orchestrator.completeRun(run.run_id, response.content);

console.log(`Run status: ${result.status}`);
console.log(`Cost: $${result.cost_usd}`);
console.log(`Tokens: ${result.tokens.input} in, ${result.tokens.output} out`);
console.log(`Duration: ${result.duration_ms}ms`);
```

### Handling Run Events

```typescript
// Subscribe to run events
orchestrator.on('run_created', (event) => {
  console.log(`Run created: ${event.payload.run_id}`);
});

orchestrator.on('run_started', (event) => {
  console.log(`Run started: ${event.payload.run_id}`);
});

orchestrator.on('run_completed', (event) => {
  console.log(`Run completed: ${event.payload.run_id}`);
});

orchestrator.on('run_failed', (event) => {
  console.error(`Run failed: ${event.payload.run_id}`, event.payload.error);
});
```

---

## Model Router Configuration

The model router manages LLM provider selection and fallbacks:

```typescript
import { ModelRouter, ModelEndpoint } from './runtime/core/model_router';

// Define available endpoints
const endpoints: ModelEndpoint[] = [
  {
    provider: 'anthropic',
    model: 'claude-sonnet-4-20250514',
    priority: 1,
    rate_limit: 1000,      // requests per minute
    cost_per_1k_input: 0.003,
    cost_per_1k_output: 0.015
  },
  {
    provider: 'openai',
    model: 'gpt-4-turbo',
    priority: 2,
    rate_limit: 500,
    cost_per_1k_input: 0.01,
    cost_per_1k_output: 0.03
  },
  {
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    priority: 3,           // Fallback
    rate_limit: 2000,
    cost_per_1k_input: 0.002,
    cost_per_1k_output: 0.01
  }
];

const router = new ModelRouter({
  endpoints,
  fallback_strategy: 'next_priority',
  max_retries: 3,
  retry_delay_ms: 1000,
  cost_tracking: true
});
```

### Routing Requests

```typescript
// Route a request to best available model
const routeResult = await router.route({
  messages: [
    { role: 'user', content: 'Analyze this code for security issues' }
  ],
  use_case: 'code_analysis',
  max_tokens: 4000
});

console.log(`Routed to: ${routeResult.endpoint.provider}/${routeResult.endpoint.model}`);
console.log(`Estimated cost: $${routeResult.estimated_cost}`);
```

### Use Case Presets

Define presets for different use cases:

```typescript
const presets = {
  quick: {
    temperature: 0.3,
    max_tokens: 2000,
    preferred_providers: ['anthropic', 'openai']
  },
  thorough: {
    temperature: 0.2,
    max_tokens: 8000,
    preferred_providers: ['anthropic'],
    preferred_models: ['claude-sonnet-4-20250514']
  },
  creative: {
    temperature: 0.8,
    max_tokens: 4000,
    preferred_providers: ['openai', 'anthropic']
  }
};

// Use a preset
const result = await router.route({
  messages: [...],
  preset: 'thorough'
});
```

---

## Gate Execution

Gates validate agent outputs before side effects:

```typescript
import {
  GateExecutor,
  createQualityGate,
  createSecurityGate
} from './runtime/core/gates';

// Create a gate executor
const gateExecutor = new GateExecutor({
  fail_fast: true,           // Stop on first blocking failure
  check_timeout_ms: 5000,    // Timeout per check
  gate_timeout_ms: 30000,    // Overall gate timeout
  skip_in_dev: false         // Run gates in development too
});

// Create a quality gate
const qualityGate = createQualityGate({
  minLength: 100,
  maxLength: 50000,
  requireJson: false,
  noPii: true
});

// Execute the gate
const result = await gateExecutor.execute(qualityGate, {
  agent_id: 'agent.product.prd_writer.v1',
  zone: 'green',
  output: agentOutput
});

if (result.status === 'passed') {
  console.log('Gate passed!');
} else {
  console.log('Gate failed:', result.blocking_failures);
}
```

### Custom Gate Checks

Register custom checks:

```typescript
// Register a custom check handler
gateExecutor.registerHandler('custom_check', async (check, context) => {
  const output = String(context.output ?? '');
  const passed = output.includes('## Summary');  // Example check

  return {
    check_name: check.name,
    passed,
    severity: check.severity,
    message: passed ? undefined : 'Output must include a Summary section',
    blocking: check.blocking,
    duration_ms: 5
  };
});
```

---

## Policy Engine

Configure and enforce policies:

```typescript
import { PolicyEngine, Policy } from './runtime/core/policy_engine';

const policyEngine = new PolicyEngine();

// Register a policy
const costPolicy: Policy = {
  id: 'policy.cost.limit.v1',
  name: 'Cost Limit Policy',
  type: 'cost',
  status: 'active',
  rules: [
    {
      name: 'per_run_limit',
      condition: { field: 'cost_usd', operator: 'lte', value: 10.0 },
      action: 'allow',
      severity: 'error'
    },
    {
      name: 'daily_limit',
      condition: { field: 'daily_cost_usd', operator: 'lte', value: 100.0 },
      action: 'allow',
      severity: 'critical'
    }
  ]
};

policyEngine.registerPolicy(costPolicy);

// Evaluate policies
const result = await policyEngine.evaluate({
  request: {
    agent_id: 'agent.product.prd_writer.v1',
    action: 'execute',
    resource: 'run_123',
    zone: 'green',
    timestamp: new Date().toISOString()
  },
  environment: { name: 'production' },
  data: { cost_usd: 5.0, daily_cost_usd: 45.0 }
});

if (result.action === 'deny') {
  console.error('Policy denied:', result.critical_failures);
}
```

---

## State Management

The state store persists run and agent state:

```typescript
import { getStateStore } from './runtime/core/state_store';

const store = getStateStore();

// Store state
await store.put('runs/run_123', runContext, {
  actor_id: 'agent.product.prd_writer.v1',
  metadata: { zone: 'green' }
});

// Retrieve state
const state = await store.get<RunContext>('runs/run_123');

// Delete state
await store.delete('runs/run_123');

// List states
const runs = await store.list('runs/', { limit: 100 });
```

---

## Tool Execution

Register and execute tools:

```typescript
import { getToolsRegistry } from './runtime/core/tools_registry';

const registry = getToolsRegistry();

// Register a tool
registry.register({
  name: 'web_search',
  description: 'Search the web for information',
  parameters: {
    query: { type: 'string', required: true },
    limit: { type: 'number', default: 10 }
  },
  handler: async (params, context) => {
    // Tool implementation
    const results = await searchWeb(params.query, params.limit);
    return { success: true, output: results };
  },
  requires_approval: false,
  zone: 'green'
});

// Execute a tool in a run
const result = await orchestrator.executeTool(
  run.run_id,
  'web_search',
  { query: 'AgentOS documentation', limit: 5 }
);

if (result.success) {
  console.log('Search results:', result.output);
}
```

---

## Deployment Configuration

### Production Settings

```typescript
const productionConfig: OrchestratorConfig = {
  default_zone: 'green',
  max_tokens_per_run: 50000,       // Lower in production
  max_cost_per_run: 5.0,           // Stricter cost control
  max_tool_calls_per_run: 50,
  max_run_duration_ms: 120000,     // 2 minutes
  enable_quality_gates: true,
  enable_policy_checks: true,
  auto_save_interval_ms: 5000      // More frequent saves
};
```

### Environment-Specific Configuration

```typescript
const getConfig = (): OrchestratorConfig => {
  const env = process.env.NODE_ENV;

  const baseConfig: OrchestratorConfig = {
    enable_quality_gates: true,
    enable_policy_checks: true,
    auto_save_interval_ms: 10000
  };

  if (env === 'production') {
    return {
      ...baseConfig,
      default_zone: 'green',
      max_tokens_per_run: 50000,
      max_cost_per_run: 5.0,
      max_run_duration_ms: 120000
    };
  }

  if (env === 'staging') {
    return {
      ...baseConfig,
      default_zone: 'yellow',
      max_tokens_per_run: 100000,
      max_cost_per_run: 10.0,
      max_run_duration_ms: 300000
    };
  }

  // Development
  return {
    ...baseConfig,
    default_zone: 'green',
    max_tokens_per_run: 200000,
    max_cost_per_run: 20.0,
    max_run_duration_ms: 600000
  };
};
```

---

## Performance Optimization

### Connection Pooling

```typescript
// Configure database connection pool
const dbConfig = {
  max: 20,              // Maximum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
};
```

### Caching

```typescript
// Enable result caching
const cacheConfig = {
  enabled: true,
  ttl: 300,             // 5 minutes
  maxSize: 1000         // Maximum cached items
};
```

### Rate Limiting

```typescript
// Configure rate limits
const rateLimits = {
  requests_per_minute: 100,
  burst: 20,
  per_agent_limit: 10
};
```

---

## Common Pitfalls

### Uncaught Exceptions in Handlers

**Problem**: Event handlers throwing errors
**Solution**: Wrap handlers in try-catch

```typescript
orchestrator.on('run_completed', async (event) => {
  try {
    await processCompletion(event);
  } catch (error) {
    console.error('Handler error:', error);
    // Don't rethrow
  }
});
```

### Memory Leaks from Run Accumulation

**Problem**: Runs accumulating in memory
**Solution**: Configure cleanup

```typescript
// Clean up old runs
await orchestrator.cleanup(86400000); // 24 hours
```

### Missing API Keys

**Problem**: Model router fails with missing keys
**Solution**: Validate configuration at startup

```typescript
function validateConfig() {
  const required = ['ANTHROPIC_API_KEY'];
  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }
}
```

---

## Next Steps

Now that you understand the runtime:

1. **[Security](./06-security.md)** - Security configuration
2. **[Ops Console](./07-ops-console.md)** - Monitoring and operations
3. **[Troubleshooting](./08-troubleshooting.md)** - Common issues

---

Previous: [04 - Agent Packs](./04-packs.md) | Next: [06 - Security](./06-security.md)
