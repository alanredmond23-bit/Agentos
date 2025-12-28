#!/usr/bin/env npx ts-node

/**
 * AgentOS Demo Script
 *
 * Demonstrates the core workflow:
 * 1. Load an agent YAML file
 * 2. Create a run context with deterministic run_id
 * 3. Simulate a workflow run producing an artifact
 * 4. Write artifact via storage abstraction
 * 5. Emit audit events with PII redaction
 * 6. Print output locations
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// ============================================================================
// Types
// ============================================================================

interface AgentConfig {
  id: string;
  name: string;
  version: string;
  pack: string;
  description: string;
  capabilities: string[];
  model: {
    provider: string;
    name: string;
    temperature: number;
  };
  security: {
    pii_redaction: boolean;
    require_approval: string[];
  };
}

interface RunContext {
  run_id: string;
  agent_id: string;
  pack: string;
  started_at: string;
  environment: string;
  trace_id: string;
}

interface Artifact {
  id: string;
  run_id: string;
  type: string;
  content: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface AuditEvent {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  pack: string;
  agent: string;
  event_type: string;
  run_id: string;
  message: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// PII Redaction
// ============================================================================

const PII_PATTERNS: Array<{ name: string; pattern: RegExp; replacement: string }> = [
  { name: 'email', pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, replacement: '[REDACTED: EMAIL]' },
  { name: 'phone', pattern: /(\+?1[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}/g, replacement: '[REDACTED: PHONE]' },
  { name: 'ssn', pattern: /\b\d{3}-\d{2}-\d{4}\b/g, replacement: '[REDACTED: SSN]' },
  { name: 'credit_card', pattern: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, replacement: '[REDACTED: CC]' },
  { name: 'ip_address', pattern: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, replacement: '[REDACTED: IP]' },
];

function redactPII(text: string): { redacted: string; count: number; types: string[] } {
  let redacted = text;
  let count = 0;
  const types: string[] = [];

  for (const { name, pattern, replacement } of PII_PATTERNS) {
    const matches = redacted.match(pattern);
    if (matches) {
      count += matches.length;
      types.push(name);
      redacted = redacted.replace(pattern, replacement);
    }
  }

  return { redacted, count, types };
}

// ============================================================================
// Storage Abstraction
// ============================================================================

class StorageAdapter {
  private basePath: string;

  constructor(basePath: string) {
    this.basePath = basePath;
  }

  async ensureDirectory(dir: string): Promise<void> {
    const fullPath = path.join(this.basePath, dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
  }

  async writeArtifact(artifact: Artifact): Promise<string> {
    const dir = `artifacts/${artifact.run_id}`;
    await this.ensureDirectory(dir);
    const filePath = path.join(this.basePath, dir, `${artifact.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(artifact, null, 2));
    return filePath;
  }

  async writeAuditEvent(event: AuditEvent): Promise<string> {
    const dir = 'audit_logs';
    await this.ensureDirectory(dir);
    const date = new Date().toISOString().split('T')[0];
    const filePath = path.join(this.basePath, dir, `${date}.jsonl`);
    fs.appendFileSync(filePath, JSON.stringify(event) + '\n');
    return filePath;
  }
}

// ============================================================================
// Demo Workflow
// ============================================================================

function generateDeterministicId(seed: string): string {
  return crypto.createHash('sha256').update(seed).digest('hex').slice(0, 16);
}

function loadAgentYaml(yamlPath: string): AgentConfig {
  // For demo, we'll create a sample agent config
  // In production, this would parse actual YAML
  const agentId = path.basename(yamlPath, '.yaml');

  return {
    id: agentId,
    name: 'Content Writer Agent',
    version: '1.0.0',
    pack: 'marketing',
    description: 'Generates marketing content with PII protection',
    capabilities: ['text_generation', 'content_review'],
    model: {
      provider: 'anthropic',
      name: 'claude-3-opus',
      temperature: 0.7,
    },
    security: {
      pii_redaction: true,
      require_approval: ['publish', 'send_email'],
    },
  };
}

function createRunContext(agent: AgentConfig): RunContext {
  const timestamp = new Date().toISOString();
  const seed = `${agent.id}-${timestamp}-demo`;

  return {
    run_id: `run-${generateDeterministicId(seed)}`,
    agent_id: agent.id,
    pack: agent.pack,
    started_at: timestamp,
    environment: 'demo',
    trace_id: `trace-${generateDeterministicId(seed + '-trace')}`,
  };
}

async function simulateWorkflow(
  agent: AgentConfig,
  context: RunContext,
  storage: StorageAdapter
): Promise<{ artifact: Artifact; events: AuditEvent[] }> {
  const events: AuditEvent[] = [];

  // Event: Task started
  events.push({
    id: `evt-${generateDeterministicId(context.run_id + '-start')}`,
    timestamp: new Date().toISOString(),
    level: 'info',
    pack: agent.pack,
    agent: agent.id,
    event_type: 'task.started',
    run_id: context.run_id,
    message: `Agent ${agent.name} started task execution`,
    metadata: { environment: context.environment },
  });

  // Simulate content generation with PII
  const rawContent = `
    Marketing Report - Q4 2024

    Prepared for: John Smith (john.smith@example.com)
    Contact: 555-123-4567

    Executive Summary:
    Our Q4 campaign reached 10,000 users across 192.168.1.100 network segments.
    Customer feedback from jane.doe@company.org was overwhelmingly positive.

    For billing inquiries, contact accounts@example.com or call 1-800-555-0123.
  `;

  // Apply PII redaction
  const { redacted, count, types } = redactPII(rawContent);

  // Event: PII redacted
  if (count > 0) {
    events.push({
      id: `evt-${generateDeterministicId(context.run_id + '-pii')}`,
      timestamp: new Date().toISOString(),
      level: 'info',
      pack: agent.pack,
      agent: agent.id,
      event_type: 'pii.redacted',
      run_id: context.run_id,
      message: `PII redacted from output: ${count} items of types [${types.join(', ')}]`,
      metadata: { redacted_count: count, pii_types: types },
    });
  }

  // Create artifact
  const artifact: Artifact = {
    id: `artifact-${generateDeterministicId(context.run_id + '-artifact')}`,
    run_id: context.run_id,
    type: 'marketing_report',
    content: redacted,
    metadata: {
      agent_id: agent.id,
      pack: agent.pack,
      pii_redacted: count > 0,
      word_count: redacted.split(/\s+/).length,
    },
    created_at: new Date().toISOString(),
  };

  // Event: Artifact created
  events.push({
    id: `evt-${generateDeterministicId(context.run_id + '-artifact-created')}`,
    timestamp: new Date().toISOString(),
    level: 'info',
    pack: agent.pack,
    agent: agent.id,
    event_type: 'artifact.created',
    run_id: context.run_id,
    message: `Artifact created: ${artifact.type}`,
    metadata: { artifact_id: artifact.id, type: artifact.type },
  });

  // Event: Task completed
  events.push({
    id: `evt-${generateDeterministicId(context.run_id + '-complete')}`,
    timestamp: new Date().toISOString(),
    level: 'info',
    pack: agent.pack,
    agent: agent.id,
    event_type: 'task.completed',
    run_id: context.run_id,
    message: `Agent ${agent.name} completed task successfully`,
    metadata: { duration_ms: 1250, status: 'success' },
  });

  return { artifact, events };
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log('='.repeat(60));
  console.log('AgentOS Demo - Workflow Simulation');
  console.log('='.repeat(60));
  console.log();

  // Setup
  const baseDir = path.resolve(__dirname, '../.demo_output');
  const storage = new StorageAdapter(baseDir);

  // Determine agent YAML path (use argument or default)
  const agentYamlPath = process.argv[2] || 'agents/packs/marketing/agents/content-writer.yaml';

  console.log(`[1] Loading agent configuration...`);
  console.log(`    Path: ${agentYamlPath}`);
  const agent = loadAgentYaml(agentYamlPath);
  console.log(`    Agent: ${agent.name} (${agent.id})`);
  console.log(`    Pack: ${agent.pack}`);
  console.log();

  console.log(`[2] Creating run context...`);
  const context = createRunContext(agent);
  console.log(`    Run ID: ${context.run_id}`);
  console.log(`    Trace ID: ${context.trace_id}`);
  console.log(`    Started: ${context.started_at}`);
  console.log();

  console.log(`[3] Simulating workflow execution...`);
  const { artifact, events } = await simulateWorkflow(agent, context, storage);
  console.log(`    Generated ${events.length} audit events`);
  console.log();

  console.log(`[4] Writing artifact via storage abstraction...`);
  const artifactPath = await storage.writeArtifact(artifact);
  console.log(`    Artifact ID: ${artifact.id}`);
  console.log(`    Type: ${artifact.type}`);
  console.log(`    Location: ${artifactPath}`);
  console.log();

  console.log(`[5] Emitting audit events with redaction...`);
  let auditLogPath = '';
  for (const event of events) {
    auditLogPath = await storage.writeAuditEvent(event);
    console.log(`    [${event.level.toUpperCase()}] ${event.event_type}: ${event.message}`);
  }
  console.log(`    Audit log: ${auditLogPath}`);
  console.log();

  console.log('='.repeat(60));
  console.log('OUTPUT LOCATIONS');
  console.log('='.repeat(60));
  console.log();
  console.log(`Base Directory: ${baseDir}`);
  console.log();
  console.log('Artifacts:');
  console.log(`  ${artifactPath}`);
  console.log();
  console.log('Audit Logs:');
  console.log(`  ${auditLogPath}`);
  console.log();
  console.log('Artifact Content Preview (first 500 chars):');
  console.log('-'.repeat(40));
  console.log(artifact.content.slice(0, 500));
  console.log('-'.repeat(40));
  console.log();
  console.log('Demo completed successfully!');
}

main().catch((error) => {
  console.error('Demo failed:', error);
  process.exit(1);
});
