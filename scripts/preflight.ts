#!/usr/bin/env tsx
/**
 * AgentOS Preflight Checks
 * Validates environment requirements before running any AgentOS scripts.
 *
 * Requirements:
 * - Node.js >= 20.0.0
 * - Required environment variables (optional checks)
 */

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

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
  bold: '\x1b[1m',
};

function log(message: string, color: keyof typeof colors = 'reset'): void {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title: string): void {
  console.log('');
  log(`=== ${title} ===`, 'cyan');
}

function logCheck(name: string, passed: boolean, details?: string): void {
  const icon = passed ? '✓' : '✗';
  const color = passed ? 'green' : 'red';
  log(`  ${icon} ${name}${details ? `: ${details}` : ''}`, color);
}

interface PreflightResult {
  passed: boolean;
  checks: {
    name: string;
    passed: boolean;
    details?: string;
    required: boolean;
  }[];
}

/**
 * Parse semantic version string into components
 */
function parseVersion(version: string): { major: number; minor: number; patch: number } | null {
  const match = version.match(/^v?(\d+)\.(\d+)\.(\d+)/);
  if (!match) return null;
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
  };
}

/**
 * Compare two version strings
 * Returns: 1 if a > b, -1 if a < b, 0 if equal
 */
function compareVersions(a: string, b: string): number {
  const vA = parseVersion(a);
  const vB = parseVersion(b);

  if (!vA || !vB) return 0;

  if (vA.major !== vB.major) return vA.major > vB.major ? 1 : -1;
  if (vA.minor !== vB.minor) return vA.minor > vB.minor ? 1 : -1;
  if (vA.patch !== vB.patch) return vA.patch > vB.patch ? 1 : -1;

  return 0;
}

/**
 * Check Node.js version meets minimum requirement
 */
function checkNodeVersion(): { passed: boolean; details: string } {
  const currentVersion = process.version;
  const requiredMajor = 20;
  const parsedVersion = parseVersion(currentVersion);

  if (!parsedVersion) {
    return { passed: false, details: `Unable to parse version: ${currentVersion}` };
  }

  const passed = parsedVersion.major >= requiredMajor;
  return {
    passed,
    details: passed
      ? `${currentVersion} (>= v${requiredMajor}.0.0)`
      : `${currentVersion} < v${requiredMajor}.0.0 - Please upgrade Node.js`,
  };
}

/**
 * Check if .nvmrc file exists and matches expected version
 */
function checkNvmrc(): { passed: boolean; details: string } {
  const nvmrcPath = join(ROOT_DIR, '.nvmrc');

  if (!existsSync(nvmrcPath)) {
    return { passed: false, details: '.nvmrc file not found' };
  }

  const content = readFileSync(nvmrcPath, 'utf-8').trim();
  const expectedVersion = '20';

  if (content !== expectedVersion) {
    return { passed: false, details: `.nvmrc contains "${content}", expected "${expectedVersion}"` };
  }

  return { passed: true, details: `Found .nvmrc with version ${content}` };
}

/**
 * Check if package.json exists and has correct engine requirement
 */
function checkPackageJson(): { passed: boolean; details: string } {
  const packagePath = join(ROOT_DIR, 'package.json');

  if (!existsSync(packagePath)) {
    return { passed: false, details: 'package.json not found' };
  }

  try {
    const content = readFileSync(packagePath, 'utf-8');
    const pkg = JSON.parse(content) as { engines?: { node?: string } };

    if (!pkg.engines?.node) {
      return { passed: false, details: 'No engines.node field in package.json' };
    }

    const nodeRequirement = pkg.engines.node;
    if (!nodeRequirement.includes('20')) {
      return { passed: false, details: `engines.node is "${nodeRequirement}", should include 20` };
    }

    return { passed: true, details: `engines.node = "${nodeRequirement}"` };
  } catch (error) {
    return { passed: false, details: `Failed to parse package.json: ${error}` };
  }
}

/**
 * Check if TypeScript config exists
 */
function checkTsConfig(): { passed: boolean; details: string } {
  const tsconfigPath = join(ROOT_DIR, 'tsconfig.json');

  if (!existsSync(tsconfigPath)) {
    return { passed: false, details: 'tsconfig.json not found' };
  }

  try {
    const content = readFileSync(tsconfigPath, 'utf-8');
    const tsconfig = JSON.parse(content) as { compilerOptions?: { target?: string; module?: string } };

    const target = tsconfig.compilerOptions?.target || 'unknown';
    const module = tsconfig.compilerOptions?.module || 'unknown';

    return { passed: true, details: `target=${target}, module=${module}` };
  } catch (error) {
    return { passed: false, details: `Failed to parse tsconfig.json: ${error}` };
  }
}

/**
 * Check if required directories exist
 */
function checkDirectoryStructure(): { passed: boolean; details: string } {
  const requiredDirs = [
    'agents',
    'agents/packs',
    'scripts',
    'schemas',
    'evals',
    'docs',
    'runtime',
  ];

  const missingDirs: string[] = [];

  for (const dir of requiredDirs) {
    const dirPath = join(ROOT_DIR, dir);
    if (!existsSync(dirPath)) {
      missingDirs.push(dir);
    }
  }

  if (missingDirs.length > 0) {
    return { passed: false, details: `Missing directories: ${missingDirs.join(', ')}` };
  }

  return { passed: true, details: `All ${requiredDirs.length} required directories present` };
}

/**
 * Check if required schema files exist
 */
function checkSchemas(): { passed: boolean; details: string } {
  const requiredSchemas = [
    'agent_yaml.schema.json',
    'eval_case.schema.json',
    'pack_registry.schema.json',
    'policy.schema.json',
  ];

  const schemasDir = join(ROOT_DIR, 'schemas');
  const missingSchemas: string[] = [];

  for (const schema of requiredSchemas) {
    const schemaPath = join(schemasDir, schema);
    if (!existsSync(schemaPath)) {
      missingSchemas.push(schema);
    }
  }

  if (missingSchemas.length > 0) {
    return { passed: false, details: `Missing schemas: ${missingSchemas.join(', ')}` };
  }

  return { passed: true, details: `All ${requiredSchemas.length} schema files present` };
}

/**
 * Run all preflight checks
 */
async function runPreflight(): Promise<PreflightResult> {
  const result: PreflightResult = {
    passed: true,
    checks: [],
  };

  log('', 'reset');
  log('AgentOS Preflight Checks', 'bold');
  log('========================', 'cyan');

  // Node.js version check (required)
  logSection('Runtime Environment');
  const nodeCheck = checkNodeVersion();
  result.checks.push({ name: 'Node.js version', ...nodeCheck, required: true });
  logCheck('Node.js version', nodeCheck.passed, nodeCheck.details);
  if (!nodeCheck.passed) result.passed = false;

  // Configuration files
  logSection('Configuration Files');

  const nvmrcCheck = checkNvmrc();
  result.checks.push({ name: '.nvmrc', ...nvmrcCheck, required: true });
  logCheck('.nvmrc', nvmrcCheck.passed, nvmrcCheck.details);
  if (!nvmrcCheck.passed) result.passed = false;

  const packageCheck = checkPackageJson();
  result.checks.push({ name: 'package.json', ...packageCheck, required: true });
  logCheck('package.json engines', packageCheck.passed, packageCheck.details);
  if (!packageCheck.passed) result.passed = false;

  const tsconfigCheck = checkTsConfig();
  result.checks.push({ name: 'tsconfig.json', ...tsconfigCheck, required: true });
  logCheck('tsconfig.json', tsconfigCheck.passed, tsconfigCheck.details);
  if (!tsconfigCheck.passed) result.passed = false;

  // Directory structure
  logSection('Directory Structure');

  const dirsCheck = checkDirectoryStructure();
  result.checks.push({ name: 'Directory structure', ...dirsCheck, required: true });
  logCheck('Directory structure', dirsCheck.passed, dirsCheck.details);
  if (!dirsCheck.passed) result.passed = false;

  // Schemas
  logSection('Schema Files');

  const schemasCheck = checkSchemas();
  result.checks.push({ name: 'Schema files', ...schemasCheck, required: true });
  logCheck('Schema files', schemasCheck.passed, schemasCheck.details);
  if (!schemasCheck.passed) result.passed = false;

  // Summary
  console.log('');
  log('========================', 'cyan');

  const passedCount = result.checks.filter(c => c.passed).length;
  const totalCount = result.checks.length;

  if (result.passed) {
    log(`Preflight PASSED (${passedCount}/${totalCount} checks)`, 'green');
  } else {
    log(`Preflight FAILED (${passedCount}/${totalCount} checks)`, 'red');
    const failedChecks = result.checks.filter(c => !c.passed && c.required);
    if (failedChecks.length > 0) {
      log('', 'reset');
      log('Required fixes:', 'yellow');
      for (const check of failedChecks) {
        log(`  - ${check.name}: ${check.details}`, 'yellow');
      }
    }
  }

  console.log('');

  return result;
}

// Main execution
const result = await runPreflight();
process.exit(result.passed ? 0 : 1);
