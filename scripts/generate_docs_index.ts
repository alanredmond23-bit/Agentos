#!/usr/bin/env tsx
/**
 * AgentOS Docs Index Generator
 * Rebuilds docs/packs/index.md from the PACK_REGISTRY.yaml
 *
 * Usage:
 *   tsx scripts/generate_docs_index.ts [--check] [--verbose]
 *
 * Options:
 *   --check    Check if index is up to date (don't write)
 *   --verbose  Show detailed output
 */

import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';

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
  check: boolean;
  verbose: boolean;
}

interface PackEntry {
  id: string;
  name: string;
  description?: string;
  path: string;
  docs_path?: string;
  status?: string;
  enabled?: boolean;
  category?: string;
  icon?: string;
  agents?: { id: string; name?: string; description?: string }[];
  tags?: string[];
}

interface Category {
  id: string;
  name: string;
  description?: string;
  icon?: string;
}

interface Registry {
  version: string;
  metadata?: {
    name?: string;
    description?: string;
  };
  defaults?: {
    docs_path?: string;
  };
  categories?: Category[];
  packs: PackEntry[];
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  return {
    check: args.includes('--check'),
    verbose: args.includes('--verbose'),
  };
}

function log(message: string, color: keyof typeof colors = 'reset'): void {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function loadRegistry(): Registry {
  const registryPath = join(ROOT_DIR, 'agents', 'PACK_REGISTRY.yaml');

  if (!existsSync(registryPath)) {
    throw new Error(`Pack registry not found: ${registryPath}`);
  }

  const content = readFileSync(registryPath, 'utf-8');
  return parseYaml(content) as Registry;
}

function getPackDocsPath(pack: PackEntry, defaults?: Registry['defaults']): string {
  if (pack.docs_path) {
    return pack.docs_path;
  }
  const basePath = defaults?.docs_path || 'docs/packs';
  return `${basePath}/${pack.id}_pack.md`;
}

function getStatusBadge(status?: string): string {
  switch (status) {
    case 'stable':
      return '![Stable](https://img.shields.io/badge/status-stable-green)';
    case 'beta':
      return '![Beta](https://img.shields.io/badge/status-beta-yellow)';
    case 'alpha':
      return '![Alpha](https://img.shields.io/badge/status-alpha-orange)';
    case 'experimental':
      return '![Experimental](https://img.shields.io/badge/status-experimental-red)';
    case 'deprecated':
      return '![Deprecated](https://img.shields.io/badge/status-deprecated-lightgrey)';
    default:
      return '';
  }
}

function generateIndex(registry: Registry): string {
  const lines: string[] = [];
  const now = new Date().toISOString().split('T')[0];

  // Header
  lines.push('# AgentOS Pack Index');
  lines.push('');
  lines.push('> Auto-generated from PACK_REGISTRY.yaml');
  lines.push(`> Last updated: ${now}`);
  lines.push('');

  // Description
  if (registry.metadata?.description) {
    lines.push(registry.metadata.description);
    lines.push('');
  }

  // Quick Stats
  const enabledPacks = registry.packs.filter(p => p.enabled !== false);
  const totalAgents = enabledPacks.reduce((sum, p) => sum + (p.agents?.length || 0), 0);

  lines.push('## Quick Stats');
  lines.push('');
  lines.push(`- **Total Packs**: ${enabledPacks.length}`);
  lines.push(`- **Total Agents**: ${totalAgents}`);
  lines.push(`- **Registry Version**: ${registry.version}`);
  lines.push('');

  // Table of Contents
  lines.push('## Table of Contents');
  lines.push('');

  // Group by category if categories exist
  if (registry.categories && registry.categories.length > 0) {
    for (const category of registry.categories) {
      const categoryPacks = registry.packs.filter(p => p.category === category.id && p.enabled !== false);
      if (categoryPacks.length > 0) {
        lines.push(`- [${category.name}](#${category.id})`);
        for (const pack of categoryPacks) {
          lines.push(`  - [${pack.name}](#${pack.id})`);
        }
      }
    }
    // Uncategorized
    const uncategorized = registry.packs.filter(p => !p.category && p.enabled !== false);
    if (uncategorized.length > 0) {
      lines.push('- [Other](#other)');
      for (const pack of uncategorized) {
        lines.push(`  - [${pack.name}](#${pack.id})`);
      }
    }
  } else {
    // No categories, just list packs
    for (const pack of registry.packs.filter(p => p.enabled !== false)) {
      lines.push(`- [${pack.name}](#${pack.id})`);
    }
  }

  lines.push('');

  // Pack Details
  lines.push('## Packs');
  lines.push('');

  // Render by category if available
  if (registry.categories && registry.categories.length > 0) {
    for (const category of registry.categories) {
      const categoryPacks = registry.packs.filter(p => p.category === category.id && p.enabled !== false);
      if (categoryPacks.length === 0) continue;

      lines.push(`### ${category.icon || ''} ${category.name} {#${category.id}}`);
      lines.push('');
      if (category.description) {
        lines.push(category.description);
        lines.push('');
      }

      for (const pack of categoryPacks) {
        lines.push(...renderPack(pack, registry.defaults));
      }
    }

    // Uncategorized
    const uncategorized = registry.packs.filter(p => !p.category && p.enabled !== false);
    if (uncategorized.length > 0) {
      lines.push('### Other {#other}');
      lines.push('');
      for (const pack of uncategorized) {
        lines.push(...renderPack(pack, registry.defaults));
      }
    }
  } else {
    // No categories
    for (const pack of registry.packs.filter(p => p.enabled !== false)) {
      lines.push(...renderPack(pack, registry.defaults));
    }
  }

  // Footer
  lines.push('---');
  lines.push('');
  lines.push('*This file is auto-generated. Do not edit directly.*');
  lines.push('*Run `npm run docs:generate` to rebuild from PACK_REGISTRY.yaml*');
  lines.push('');

  return lines.join('\n');
}

function renderPack(pack: PackEntry, defaults?: Registry['defaults']): string[] {
  const lines: string[] = [];
  const docsPath = getPackDocsPath(pack, defaults);
  const badge = getStatusBadge(pack.status);

  lines.push(`#### ${pack.icon || ''} ${pack.name} {#${pack.id}}`);
  lines.push('');

  if (badge) {
    lines.push(badge);
    lines.push('');
  }

  if (pack.description) {
    lines.push(pack.description);
    lines.push('');
  }

  // Documentation link
  lines.push(`**Documentation**: [${pack.id}_pack.md](${docsPath})`);
  lines.push('');

  // Agents table
  if (pack.agents && pack.agents.length > 0) {
    lines.push('**Agents**:');
    lines.push('');
    lines.push('| Agent | Description |');
    lines.push('|-------|-------------|');
    for (const agent of pack.agents) {
      const desc = agent.description || '-';
      lines.push(`| ${agent.name || agent.id} | ${desc} |`);
    }
    lines.push('');
  }

  // Tags
  if (pack.tags && pack.tags.length > 0) {
    lines.push(`**Tags**: ${pack.tags.map(t => `\`${t}\``).join(' ')}`);
    lines.push('');
  }

  lines.push('---');
  lines.push('');

  return lines;
}

async function main(): Promise<void> {
  const args = parseArgs();

  log('');
  log('AgentOS Docs Index Generator', 'bold');
  log('============================', 'cyan');
  log('');

  // Load registry
  let registry: Registry;
  try {
    registry = loadRegistry();
    log(`Registry loaded: ${registry.packs.length} packs`, 'green');
  } catch (err) {
    log(`Failed to load registry: ${err}`, 'red');
    process.exit(1);
  }

  // Generate index content
  const indexContent = generateIndex(registry);
  const indexPath = join(ROOT_DIR, 'docs', 'packs', 'index.md');

  if (args.verbose) {
    log('');
    log('Generated content preview:', 'cyan');
    log('---', 'dim');
    const preview = indexContent.split('\n').slice(0, 20).join('\n');
    console.log(preview);
    log('...', 'dim');
    log('---', 'dim');
  }

  if (args.check) {
    // Check mode - compare with existing
    if (existsSync(indexPath)) {
      const existing = readFileSync(indexPath, 'utf-8');
      // Normalize for comparison (ignore date line)
      const normalizedNew = indexContent.replace(/Last updated: \d{4}-\d{2}-\d{2}/, 'Last updated: DATE');
      const normalizedExisting = existing.replace(/Last updated: \d{4}-\d{2}-\d{2}/, 'Last updated: DATE');

      if (normalizedNew === normalizedExisting) {
        log('');
        log('Index is up to date', 'green');
        process.exit(0);
      } else {
        log('');
        log('Index is OUT OF DATE', 'red');
        log('Run `npm run docs:generate` to update', 'yellow');
        process.exit(1);
      }
    } else {
      log('');
      log('Index file does not exist', 'red');
      log('Run `npm run docs:generate` to create', 'yellow');
      process.exit(1);
    }
  } else {
    // Write mode
    try {
      writeFileSync(indexPath, indexContent, 'utf-8');
      log('');
      log(`Index written to: ${relative(ROOT_DIR, indexPath)}`, 'green');
    } catch (err) {
      log(`Failed to write index: ${err}`, 'red');
      process.exit(1);
    }
  }

  log('');
  log('Docs index generation complete!', 'green');
}

main().catch((err) => {
  console.error('Docs generation failed:', err);
  process.exit(1);
});
