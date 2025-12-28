#!/usr/bin/env tsx
/**
 * AgentOS YAML Validator
 * Validates agent YAML configurations against the JSON schema.
 *
 * Usage:
 *   tsx scripts/validate_yaml.ts [--strict] [--verbose] [path...]
 *
 * Options:
 *   --strict   Fail on warnings (not just errors)
 *   --verbose  Show detailed validation output
 *   path       Specific files/directories to validate (default: agents/packs)
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative, extname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';
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

interface ValidationResult {
  file: string;
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

interface ValidationError {
  path: string;
  message: string;
  keyword?: string;
}

interface ValidationWarning {
  path: string;
  message: string;
}

interface CliArgs {
  strict: boolean;
  verbose: boolean;
  paths: string[];
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const result: CliArgs = {
    strict: false,
    verbose: false,
    paths: [],
  };

  for (const arg of args) {
    if (arg === '--strict') {
      result.strict = true;
    } else if (arg === '--verbose') {
      result.verbose = true;
    } else if (!arg.startsWith('-')) {
      result.paths.push(arg);
    }
  }

  // Default path if none specified
  if (result.paths.length === 0) {
    result.paths.push(join(ROOT_DIR, 'agents', 'packs'));
  }

  return result;
}

function log(message: string, color: keyof typeof colors = 'reset'): void {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logError(file: string, error: ValidationError): void {
  console.log(`  ${colors.red}ERROR${colors.reset} ${colors.dim}${error.path}${colors.reset}`);
  console.log(`        ${error.message}`);
}

function logWarning(file: string, warning: ValidationWarning): void {
  console.log(`  ${colors.yellow}WARN${colors.reset}  ${colors.dim}${warning.path}${colors.reset}`);
  console.log(`        ${warning.message}`);
}

/**
 * Find all YAML files recursively in a directory
 */
function findYamlFiles(dir: string): string[] {
  const results: string[] = [];

  if (!existsSync(dir)) {
    return results;
  }

  const stat = statSync(dir);
  if (stat.isFile()) {
    const ext = extname(dir).toLowerCase();
    if (ext === '.yaml' || ext === '.yml') {
      results.push(dir);
    }
    return results;
  }

  const entries = readdirSync(dir);
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const entryStat = statSync(fullPath);

    if (entryStat.isDirectory()) {
      // Look for agents subdirectory or recurse
      if (entry === 'agents' || entry === 'packs') {
        results.push(...findYamlFiles(fullPath));
      } else if (!entry.startsWith('.')) {
        results.push(...findYamlFiles(fullPath));
      }
    } else if (entryStat.isFile()) {
      const ext = extname(entry).toLowerCase();
      if (ext === '.yaml' || ext === '.yml') {
        results.push(fullPath);
      }
    }
  }

  return results;
}

/**
 * Load and compile the JSON schema
 */
function loadSchema(): Ajv {
  const schemaPath = join(ROOT_DIR, 'schemas', 'agent_yaml.schema.json');

  if (!existsSync(schemaPath)) {
    throw new Error(`Schema file not found: ${schemaPath}`);
  }

  const schemaContent = readFileSync(schemaPath, 'utf-8');
  const schema = JSON.parse(schemaContent);

  const ajv = new Ajv({
    allErrors: true,
    verbose: true,
    strict: false,
  });

  // Add format validators
  addFormats(ajv);

  ajv.addSchema(schema, 'agent_yaml');

  return ajv;
}

/**
 * Validate a single YAML file
 */
function validateFile(filePath: string, ajv: Ajv, verbose: boolean): ValidationResult {
  const result: ValidationResult = {
    file: filePath,
    valid: true,
    errors: [],
    warnings: [],
  };

  // Read and parse YAML
  let content: string;
  let data: unknown;

  try {
    content = readFileSync(filePath, 'utf-8');
  } catch (err) {
    result.valid = false;
    result.errors.push({
      path: '/',
      message: `Failed to read file: ${err}`,
    });
    return result;
  }

  // Skip empty files
  if (!content.trim()) {
    result.warnings.push({
      path: '/',
      message: 'File is empty',
    });
    return result;
  }

  try {
    data = parseYaml(content);
  } catch (err) {
    result.valid = false;
    result.errors.push({
      path: '/',
      message: `YAML parse error: ${err}`,
    });
    return result;
  }

  // Skip null/undefined data
  if (data === null || data === undefined) {
    result.warnings.push({
      path: '/',
      message: 'File contains no data',
    });
    return result;
  }

  // Validate against schema
  const validate = ajv.getSchema('agent_yaml');
  if (!validate) {
    result.valid = false;
    result.errors.push({
      path: '/',
      message: 'Schema not loaded',
    });
    return result;
  }

  const valid = validate(data);

  if (!valid && validate.errors) {
    result.valid = false;
    for (const error of validate.errors) {
      result.errors.push({
        path: error.instancePath || '/',
        message: error.message || 'Unknown validation error',
        keyword: error.keyword,
      });
    }
  }

  // Additional semantic validations
  if (typeof data === 'object' && data !== null) {
    const obj = data as Record<string, unknown>;

    // Check for deprecated fields
    if (obj.deprecated === true && !obj.deprecation_message) {
      result.warnings.push({
        path: '/deprecated',
        message: 'Deprecated agents should include a deprecation_message',
      });
    }

    // Check identity requirements
    if (obj.identity && typeof obj.identity === 'object') {
      const identity = obj.identity as Record<string, unknown>;
      if (identity.communication_style === 'custom' && !identity.communication_style_custom) {
        result.warnings.push({
          path: '/identity/communication_style_custom',
          message: 'Custom communication style should include communication_style_custom description',
        });
      }
    }

    // Check authority configuration
    if (obj.authority && typeof obj.authority === 'object') {
      const authority = obj.authority as Record<string, unknown>;
      if (authority.execution_model === 'autonomous' && !authority.financial_limits) {
        result.warnings.push({
          path: '/authority/financial_limits',
          message: 'Autonomous agents should define financial_limits',
        });
      }
    }
  }

  return result;
}

/**
 * Main validation runner
 */
async function main(): Promise<void> {
  const args = parseArgs();
  const results: ValidationResult[] = [];

  log('');
  log('AgentOS YAML Validator', 'bold');
  log('======================', 'cyan');
  log('');

  // Load schema
  let ajv: Ajv;
  try {
    ajv = loadSchema();
    log('Schema loaded successfully', 'green');
  } catch (err) {
    log(`Failed to load schema: ${err}`, 'red');
    process.exit(1);
  }

  // Find all YAML files
  const yamlFiles: string[] = [];
  for (const path of args.paths) {
    const absPath = path.startsWith('/') ? path : join(ROOT_DIR, path);
    yamlFiles.push(...findYamlFiles(absPath));
  }

  if (yamlFiles.length === 0) {
    log('No YAML files found to validate', 'yellow');
    process.exit(0);
  }

  log(`Found ${yamlFiles.length} YAML file(s) to validate`, 'cyan');
  log('');

  // Validate each file
  for (const file of yamlFiles) {
    const relativePath = relative(ROOT_DIR, file);
    const result = validateFile(file, ajv, args.verbose);
    results.push(result);

    if (result.valid && result.warnings.length === 0) {
      if (args.verbose) {
        log(`${colors.green}PASS${colors.reset} ${relativePath}`);
      }
    } else if (result.valid && result.warnings.length > 0) {
      log(`${colors.yellow}WARN${colors.reset} ${relativePath}`);
      for (const warning of result.warnings) {
        logWarning(relativePath, warning);
      }
    } else {
      log(`${colors.red}FAIL${colors.reset} ${relativePath}`);
      for (const error of result.errors) {
        logError(relativePath, error);
      }
      for (const warning of result.warnings) {
        logWarning(relativePath, warning);
      }
    }
  }

  // Summary
  log('');
  log('======================', 'cyan');

  const passed = results.filter(r => r.valid && (args.strict ? r.warnings.length === 0 : true));
  const failed = results.filter(r => !r.valid || (args.strict && r.warnings.length > 0));
  const withWarnings = results.filter(r => r.valid && r.warnings.length > 0);

  log(`Results: ${passed.length} passed, ${failed.length} failed, ${withWarnings.length} warnings`,
      failed.length > 0 ? 'red' : 'green');

  if (failed.length > 0) {
    log('');
    log('Failed files:', 'red');
    for (const result of failed) {
      log(`  - ${relative(ROOT_DIR, result.file)}`, 'red');
    }
    process.exit(1);
  }

  if (args.strict && withWarnings.length > 0) {
    log('');
    log('Files with warnings (strict mode):', 'yellow');
    for (const result of withWarnings) {
      log(`  - ${relative(ROOT_DIR, result.file)}`, 'yellow');
    }
    process.exit(1);
  }

  log('');
  log('Validation passed!', 'green');
}

main().catch((err) => {
  console.error('Validation failed:', err);
  process.exit(1);
});
