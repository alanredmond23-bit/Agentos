#!/usr/bin/env tsx
/**
 * AgentOS Registry Builder
 * Verifies that all paths referenced in PACK_REGISTRY.yaml exist
 * and validates the registry structure.
 *
 * Usage:
 *   tsx scripts/build_registry.ts [--fix] [--verbose]
 *
 * Options:
 *   --fix      Attempt to create missing directories
 *   --verbose  Show detailed output
 */

import { readFileSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '..');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
};

interface CliArgs {
  fix: boolean;
  verbose: boolean;
}

interface RegistryCheck {
  path: string;
  exists: boolean;
  type: 'pack' | 'agents_dir' | 'agent_file' | 'docs' | 'evals';
  pack?: string;
  fixed?: boolean;
}

interface PackEntry {
  id: string;
  name: string;
  path: string;
  docs_path?: string;
  agents?: { id: string; file: string }[];
  evals?: { golden_tasks_path?: string; adversarial_path?: string };
}

interface Registry {
  version: string;
  defaults?: {
    base_path?: string;
    agents_subdir?: string;
    docs_path?: string;
    evals_path?: string;
  };
  packs: PackEntry[];
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  return {
    fix: args.includes('--fix'),
    verbose: args.includes('--verbose'),
  };
}

function log(message: string, color: keyof typeof colors = 'reset'): void {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function loadRegistrySchema(): Ajv {
  const schemaPath = join(ROOT_DIR, 'schemas', 'pack_registry.schema.json');

  if (!existsSync(schemaPath)) {
    throw new Error(`Registry schema not found: ${schemaPath}`);
  }

  const schemaContent = readFileSync(schemaPath, 'utf-8');
  const schema = JSON.parse(schemaContent);

  const ajv = new Ajv({
    allErrors: true,
    strict: false,
  });

  addFormats(ajv);
  ajv.addSchema(schema, 'pack_registry');

  return ajv;
}

function loadRegistry(): Registry {
  const registryPath = join(ROOT_DIR, 'agents', 'PACK_REGISTRY.yaml');

  if (!existsSync(registryPath)) {
    throw new Error(`Pack registry not found: ${registryPath}`);
  }

  const content = readFileSync(registryPath, 'utf-8');
  return parseYaml(content) as Registry;
}

function validateRegistrySchema(registry: Registry, ajv: Ajv): boolean {
  const validate = ajv.getSchema('pack_registry');
  if (!validate) {
    log('Registry schema not loaded', 'red');
    return false;
  }

  const valid = validate(registry);
  if (!valid && validate.errors) {
    log('Registry schema validation failed:', 'red');
    for (const error of validate.errors) {
      log(`  ${error.instancePath}: ${error.message}`, 'red');
    }
    return false;
  }

  return true;
}

function checkPaths(registry: Registry, args: CliArgs): RegistryCheck[] {
  const checks: RegistryCheck[] = [];
  const defaults = registry.defaults || {};
  const basePath = defaults.base_path || 'agents/packs';
  const agentsSubdir = defaults.agents_subdir || 'agents';
  const docsPath = defaults.docs_path || 'docs/packs';
  const evalsPath = defaults.evals_path || 'evals';

  for (const pack of registry.packs) {
    // Check pack directory
    const packPath = join(ROOT_DIR, pack.path || `${basePath}/${pack.id}`);
    const packExists = existsSync(packPath);
    checks.push({
      path: packPath,
      exists: packExists,
      type: 'pack',
      pack: pack.id,
    });

    if (!packExists && args.fix) {
      try {
        mkdirSync(packPath, { recursive: true });
        checks[checks.length - 1].exists = true;
        checks[checks.length - 1].fixed = true;
      } catch (err) {
        log(`Failed to create ${packPath}: ${err}`, 'red');
      }
    }

    // Check agents subdirectory
    const agentsPath = join(packPath, agentsSubdir);
    const agentsExists = existsSync(agentsPath);
    checks.push({
      path: agentsPath,
      exists: agentsExists,
      type: 'agents_dir',
      pack: pack.id,
    });

    if (!agentsExists && args.fix) {
      try {
        mkdirSync(agentsPath, { recursive: true });
        checks[checks.length - 1].exists = true;
        checks[checks.length - 1].fixed = true;
      } catch (err) {
        log(`Failed to create ${agentsPath}: ${err}`, 'red');
      }
    }

    // Check individual agent files
    if (pack.agents) {
      for (const agent of pack.agents) {
        const agentPath = join(agentsPath, agent.file);
        checks.push({
          path: agentPath,
          exists: existsSync(agentPath),
          type: 'agent_file',
          pack: pack.id,
        });
      }
    }

    // Check docs path
    const packDocsPath = pack.docs_path || `${docsPath}/${pack.id}_pack.md`;
    const fullDocsPath = join(ROOT_DIR, packDocsPath);
    checks.push({
      path: fullDocsPath,
      exists: existsSync(fullDocsPath),
      type: 'docs',
      pack: pack.id,
    });

    // Check eval paths if defined
    if (pack.evals) {
      if (pack.evals.golden_tasks_path) {
        const goldenPath = join(ROOT_DIR, evalsPath, 'golden_tasks', pack.id);
        checks.push({
          path: goldenPath,
          exists: existsSync(goldenPath),
          type: 'evals',
          pack: pack.id,
        });

        if (!existsSync(goldenPath) && args.fix) {
          try {
            mkdirSync(goldenPath, { recursive: true });
            checks[checks.length - 1].exists = true;
            checks[checks.length - 1].fixed = true;
          } catch (err) {
            log(`Failed to create ${goldenPath}: ${err}`, 'red');
          }
        }
      }

      if (pack.evals.adversarial_path) {
        const adversarialPath = join(ROOT_DIR, evalsPath, 'adversarial', pack.id);
        checks.push({
          path: adversarialPath,
          exists: existsSync(adversarialPath),
          type: 'evals',
          pack: pack.id,
        });

        if (!existsSync(adversarialPath) && args.fix) {
          try {
            mkdirSync(adversarialPath, { recursive: true });
            checks[checks.length - 1].exists = true;
            checks[checks.length - 1].fixed = true;
          } catch (err) {
            log(`Failed to create ${adversarialPath}: ${err}`, 'red');
          }
        }
      }
    }
  }

  return checks;
}

async function main(): Promise<void> {
  const args = parseArgs();

  log('');
  log('AgentOS Registry Builder', 'bold');
  log('========================', 'cyan');
  log('');

  // Load and validate registry
  let registry: Registry;
  try {
    registry = loadRegistry();
    log('Registry loaded successfully', 'green');
  } catch (err) {
    log(`Failed to load registry: ${err}`, 'red');
    process.exit(1);
  }

  // Validate against schema
  let ajv: Ajv;
  try {
    ajv = loadRegistrySchema();
    const schemaValid = validateRegistrySchema(registry, ajv);
    if (!schemaValid) {
      log('Registry schema validation failed', 'red');
      process.exit(1);
    }
    log('Registry schema validation passed', 'green');
  } catch (err) {
    log(`Schema validation error: ${err}`, 'yellow');
    // Continue without schema validation
  }

  // Check paths
  log('');
  log('Checking paths...', 'cyan');

  const checks = checkPaths(registry, args);
  const missing = checks.filter(c => !c.exists);
  const fixed = checks.filter(c => c.fixed);

  // Report results
  if (args.verbose) {
    for (const check of checks) {
      const status = check.exists
        ? (check.fixed ? `${colors.green}FIXED${colors.reset}` : `${colors.green}OK${colors.reset}`)
        : `${colors.red}MISSING${colors.reset}`;
      const relativePath = relative(ROOT_DIR, check.path);
      log(`  [${check.type}] ${status} ${relativePath}`);
    }
  }

  // Summary
  log('');
  log('========================', 'cyan');
  log(`Total paths checked: ${checks.length}`);
  log(`Existing: ${checks.filter(c => c.exists && !c.fixed).length}`);
  if (fixed.length > 0) {
    log(`Fixed: ${fixed.length}`, 'green');
  }
  if (missing.length > 0) {
    log(`Missing: ${missing.length}`, 'red');
    log('');
    log('Missing paths:', 'red');
    for (const check of missing) {
      log(`  [${check.type}] ${relative(ROOT_DIR, check.path)}`, 'red');
    }
    log('');
    if (!args.fix) {
      log('Run with --fix to create missing directories', 'yellow');
    }
    process.exit(1);
  }

  log('');
  log('Registry build passed!', 'green');
}

main().catch((err) => {
  console.error('Registry build failed:', err);
  process.exit(1);
});
