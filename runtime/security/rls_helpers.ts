/**
 * rls_helpers.ts
 * Row Level Security (RLS) Policy Helpers for AgentOS
 *
 * Provides comprehensive utilities for building, managing, and generating
 * Row Level Security policies for PostgreSQL/Supabase databases.
 *
 * Features:
 * - Fluent API for building RLS policies
 * - Common policy templates (user-based, tenant-based, role-based)
 * - Policy composition (AND, OR, NOT operations)
 * - SQL generation for policy deployment
 * - JSON serialization for policy storage/transport
 *
 * @zone YELLOW - APIs/Core services, requires tests + review
 * @impact_axes [A, B] - Deployment and Revenue (security policies)
 */

import * as crypto from 'crypto';

// ============================================================================
// CORE TYPES AND INTERFACES
// ============================================================================

/**
 * Database operations that RLS policies can apply to
 */
export type RLSOperation = 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'ALL';

/**
 * Common policy template patterns
 */
export enum RLSPolicyTemplate {
  /** User owns the row (user_id = auth.uid()) */
  USER_OWNS_ROW = 'user_owns_row',

  /** Multi-tenant isolation (tenant_id matches) */
  TENANT_ISOLATION = 'tenant_isolation',

  /** Role-based access (user has required role) */
  ROLE_BASED = 'role_based',

  /** Public read access */
  PUBLIC_READ = 'public_read',

  /** Authenticated users only */
  AUTHENTICATED_ONLY = 'authenticated_only',

  /** Admin full access */
  ADMIN_FULL_ACCESS = 'admin_full_access',

  /** Team membership required */
  TEAM_MEMBER = 'team_member',

  /** Organization member required */
  ORG_MEMBER = 'org_member',

  /** Creator access (created_by = auth.uid()) */
  CREATOR_ACCESS = 'creator_access',

  /** Time-based access (within valid date range) */
  TIME_BASED = 'time_based',

  /** Custom expression */
  CUSTOM = 'custom'
}

/**
 * Represents a complete RLS policy definition
 */
export interface RLSPolicy {
  /** Unique policy identifier */
  id: string;

  /** Human-readable policy name */
  name: string;

  /** Target table name */
  table: string;

  /** Schema containing the table */
  schema: string;

  /** Operations this policy applies to */
  operations: RLSOperation[];

  /** USING expression - filters rows for SELECT, UPDATE, DELETE */
  using_expression: string;

  /** WITH CHECK expression - validates new/updated rows for INSERT, UPDATE */
  with_check_expression?: string;

  /** Database roles this policy applies to */
  roles: string[];

  /** Whether the policy is enabled */
  enabled: boolean;

  /** Policy metadata */
  metadata: RLSPolicyMetadata;
}

/**
 * Policy metadata for tracking and auditing
 */
export interface RLSPolicyMetadata {
  /** Policy template used */
  template?: RLSPolicyTemplate;

  /** Policy description */
  description?: string;

  /** Creation timestamp */
  created_at: string;

  /** Last modification timestamp */
  updated_at: string;

  /** Version number for tracking changes */
  version: number;

  /** Creator identifier */
  created_by?: string;

  /** Tags for categorization */
  tags?: string[];

  /** Additional custom metadata */
  custom?: Record<string, unknown>;
}

/**
 * Context for evaluating RLS policies
 */
export interface RLSContext {
  /** Current authenticated user ID */
  user_id?: string;

  /** Current tenant/organization ID */
  tenant_id?: string;

  /** User roles */
  roles: string[];

  /** User claims from JWT */
  claims?: Record<string, unknown>;

  /** Session metadata */
  session?: {
    id: string;
    started_at: string;
    ip_address?: string;
  };

  /** Request context */
  request?: {
    path?: string;
    method?: string;
    origin?: string;
  };

  /** Current timestamp for time-based policies */
  current_timestamp: string;
}

/**
 * Result of policy evaluation
 */
export interface RLSEvaluationResult {
  /** Whether access is allowed */
  allowed: boolean;

  /** Policies that were evaluated */
  policies_evaluated: string[];

  /** Policies that passed */
  policies_passed: string[];

  /** Policies that failed */
  policies_failed: string[];

  /** Evaluation context used */
  context: RLSContext;

  /** Evaluation timestamp */
  evaluated_at: string;

  /** Evaluation duration in ms */
  duration_ms: number;
}

/**
 * Composed policy expression
 */
export interface ComposedExpression {
  /** Type of composition */
  type: 'AND' | 'OR' | 'NOT';

  /** Child expressions */
  expressions: (string | ComposedExpression)[];
}

// ============================================================================
// RLS POLICY BUILDER - FLUENT API
// ============================================================================

/**
 * Fluent builder for creating RLS policies
 *
 * @example
 * const policy = RLSPolicyBuilder
 *   .forTable('documents')
 *   .inSchema('public')
 *   .forOperations('SELECT', 'UPDATE', 'DELETE')
 *   .forRoles('authenticated')
 *   .withUserFilter('user_id')
 *   .build();
 */
export class RLSPolicyBuilder {
  private policy: Partial<RLSPolicy>;
  private composedUsing: ComposedExpression | null = null;
  private composedCheck: ComposedExpression | null = null;

  private constructor(table: string) {
    this.policy = {
      id: this.generatePolicyId(),
      table,
      schema: 'public',
      operations: ['ALL'],
      roles: ['public'],
      enabled: true,
      metadata: {
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: 1
      }
    };
  }

  /**
   * Create a new policy builder for a specific table
   */
  static forTable(table: string): RLSPolicyBuilder {
    return new RLSPolicyBuilder(table);
  }

  /**
   * Set the schema for the table
   */
  inSchema(schema: string): RLSPolicyBuilder {
    this.policy.schema = schema;
    return this;
  }

  /**
   * Set the operations this policy applies to
   */
  forOperations(...operations: RLSOperation[]): RLSPolicyBuilder {
    this.policy.operations = operations;
    return this;
  }

  /**
   * Set the roles this policy applies to
   */
  forRoles(...roles: string[]): RLSPolicyBuilder {
    this.policy.roles = roles;
    return this;
  }

  /**
   * Set a custom policy name
   */
  withName(name: string): RLSPolicyBuilder {
    this.policy.name = name;
    return this;
  }

  /**
   * Add user-based filtering (user_id = auth.uid())
   */
  withUserFilter(column: string = 'user_id'): RLSPolicyBuilder {
    const expression = `${this.escapeIdentifier(column)} = auth.uid()`;
    this.policy.using_expression = expression;
    this.policy.with_check_expression = expression;
    this.policy.metadata!.template = RLSPolicyTemplate.USER_OWNS_ROW;
    return this;
  }

  /**
   * Add multi-tenant filtering
   */
  withTenantFilter(column: string = 'tenant_id'): RLSPolicyBuilder {
    const expression = `${this.escapeIdentifier(column)} = (auth.jwt() ->> 'tenant_id')::uuid`;
    this.policy.using_expression = expression;
    this.policy.with_check_expression = expression;
    this.policy.metadata!.template = RLSPolicyTemplate.TENANT_ISOLATION;
    return this;
  }

  /**
   * Add role-based filtering
   */
  withRoleFilter(requiredRole: string): RLSPolicyBuilder {
    const expression = `auth.jwt() ->> 'role' = '${this.escapeString(requiredRole)}'`;
    this.policy.using_expression = expression;
    this.policy.metadata!.template = RLSPolicyTemplate.ROLE_BASED;
    return this;
  }

  /**
   * Add team membership filter
   */
  withTeamFilter(teamColumn: string = 'team_id'): RLSPolicyBuilder {
    const expression = `${this.escapeIdentifier(teamColumn)} IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )`;
    this.policy.using_expression = this.normalizeWhitespace(expression);
    this.policy.with_check_expression = this.normalizeWhitespace(expression);
    this.policy.metadata!.template = RLSPolicyTemplate.TEAM_MEMBER;
    return this;
  }

  /**
   * Add organization membership filter
   */
  withOrgFilter(orgColumn: string = 'org_id'): RLSPolicyBuilder {
    const expression = `${this.escapeIdentifier(orgColumn)} IN (
      SELECT org_id FROM org_members WHERE user_id = auth.uid()
    )`;
    this.policy.using_expression = this.normalizeWhitespace(expression);
    this.policy.with_check_expression = this.normalizeWhitespace(expression);
    this.policy.metadata!.template = RLSPolicyTemplate.ORG_MEMBER;
    return this;
  }

  /**
   * Add creator access filter
   */
  withCreatorFilter(column: string = 'created_by'): RLSPolicyBuilder {
    const expression = `${this.escapeIdentifier(column)} = auth.uid()`;
    this.policy.using_expression = expression;
    this.policy.metadata!.template = RLSPolicyTemplate.CREATOR_ACCESS;
    return this;
  }

  /**
   * Add time-based access filter
   */
  withTimeFilter(
    startColumn: string = 'valid_from',
    endColumn: string = 'valid_until'
  ): RLSPolicyBuilder {
    const expression = `now() BETWEEN ${this.escapeIdentifier(startColumn)} AND ${this.escapeIdentifier(endColumn)}`;
    this.policy.using_expression = expression;
    this.policy.metadata!.template = RLSPolicyTemplate.TIME_BASED;
    return this;
  }

  /**
   * Add public read access (no authentication required)
   */
  withPublicRead(): RLSPolicyBuilder {
    this.policy.operations = ['SELECT'];
    this.policy.using_expression = 'true';
    this.policy.roles = ['anon', 'authenticated'];
    this.policy.metadata!.template = RLSPolicyTemplate.PUBLIC_READ;
    return this;
  }

  /**
   * Add authenticated-only access
   */
  withAuthenticatedOnly(): RLSPolicyBuilder {
    this.policy.using_expression = 'auth.uid() IS NOT NULL';
    this.policy.with_check_expression = 'auth.uid() IS NOT NULL';
    this.policy.roles = ['authenticated'];
    this.policy.metadata!.template = RLSPolicyTemplate.AUTHENTICATED_ONLY;
    return this;
  }

  /**
   * Add admin full access
   */
  withAdminAccess(): RLSPolicyBuilder {
    this.policy.using_expression = `auth.jwt() ->> 'role' = 'admin'`;
    this.policy.with_check_expression = `auth.jwt() ->> 'role' = 'admin'`;
    this.policy.metadata!.template = RLSPolicyTemplate.ADMIN_FULL_ACCESS;
    return this;
  }

  /**
   * Set a custom USING expression
   */
  withCustomExpression(expression: string): RLSPolicyBuilder {
    this.policy.using_expression = expression;
    this.policy.metadata!.template = RLSPolicyTemplate.CUSTOM;
    return this;
  }

  /**
   * Set a custom WITH CHECK expression
   */
  withCheckExpression(expression: string): RLSPolicyBuilder {
    this.policy.with_check_expression = expression;
    return this;
  }

  /**
   * Add description to policy metadata
   */
  withDescription(description: string): RLSPolicyBuilder {
    this.policy.metadata!.description = description;
    return this;
  }

  /**
   * Add tags to policy metadata
   */
  withTags(...tags: string[]): RLSPolicyBuilder {
    this.policy.metadata!.tags = tags;
    return this;
  }

  /**
   * Set creator for audit purposes
   */
  createdBy(creatorId: string): RLSPolicyBuilder {
    this.policy.metadata!.created_by = creatorId;
    return this;
  }

  /**
   * Set custom metadata
   */
  withCustomMetadata(metadata: Record<string, unknown>): RLSPolicyBuilder {
    this.policy.metadata!.custom = metadata;
    return this;
  }

  /**
   * Set enabled/disabled state
   */
  setEnabled(enabled: boolean): RLSPolicyBuilder {
    this.policy.enabled = enabled;
    return this;
  }

  /**
   * Compose with another expression using AND
   */
  and(expression: string): RLSPolicyBuilder {
    if (this.policy.using_expression) {
      this.policy.using_expression = `(${this.policy.using_expression}) AND (${expression})`;
    } else {
      this.policy.using_expression = expression;
    }
    return this;
  }

  /**
   * Compose with another expression using OR
   */
  or(expression: string): RLSPolicyBuilder {
    if (this.policy.using_expression) {
      this.policy.using_expression = `(${this.policy.using_expression}) OR (${expression})`;
    } else {
      this.policy.using_expression = expression;
    }
    return this;
  }

  /**
   * Negate the current expression
   */
  not(): RLSPolicyBuilder {
    if (this.policy.using_expression) {
      this.policy.using_expression = `NOT (${this.policy.using_expression})`;
    }
    return this;
  }

  /**
   * Build the final RLSPolicy object
   */
  build(): RLSPolicy {
    if (!this.policy.name) {
      this.policy.name = this.generatePolicyName();
    }

    if (!this.policy.using_expression) {
      throw new Error('Policy must have a USING expression. Call withUserFilter(), withTenantFilter(), or withCustomExpression()');
    }

    return this.policy as RLSPolicy;
  }

  /**
   * Generate SQL to create this policy
   */
  toSQL(): string {
    const policy = this.build();
    return generatePolicySQL(policy);
  }

  /**
   * Generate SQL to drop this policy
   */
  toDropSQL(): string {
    const policy = this.build();
    return generateDropPolicySQL(policy);
  }

  // Private helper methods

  private generatePolicyId(): string {
    return `rls_${crypto.randomBytes(8).toString('hex')}`;
  }

  private generatePolicyName(): string {
    const table = this.policy.table;
    const ops = this.policy.operations?.join('_').toLowerCase() || 'all';
    const template = this.policy.metadata?.template || 'custom';
    return `${table}_${template}_${ops}_policy`;
  }

  private escapeIdentifier(identifier: string): string {
    // Escape SQL identifiers to prevent injection
    return `"${identifier.replace(/"/g, '""')}"`;
  }

  private escapeString(value: string): string {
    // Escape SQL string literals
    return value.replace(/'/g, "''");
  }

  private normalizeWhitespace(sql: string): string {
    return sql.replace(/\s+/g, ' ').trim();
  }
}

// ============================================================================
// SQL GENERATION FUNCTIONS
// ============================================================================

/**
 * Generate CREATE POLICY SQL statement
 */
export function generatePolicySQL(policy: RLSPolicy): string {
  const qualifiedTable = `"${policy.schema}"."${policy.table}"`;
  const policyName = `"${policy.name}"`;

  // Determine command type based on operations
  const command = getCommandType(policy.operations);

  let sql = `-- Policy: ${policy.name}\n`;
  sql += `-- Description: ${policy.metadata.description || 'No description'}\n`;
  sql += `-- Template: ${policy.metadata.template || 'custom'}\n`;
  sql += `-- Created: ${policy.metadata.created_at}\n\n`;

  // Enable RLS on table if not already enabled
  sql += `ALTER TABLE ${qualifiedTable} ENABLE ROW LEVEL SECURITY;\n\n`;

  // Create the policy
  sql += `CREATE POLICY ${policyName}\n`;
  sql += `  ON ${qualifiedTable}\n`;
  sql += `  AS PERMISSIVE\n`;
  sql += `  FOR ${command}\n`;
  sql += `  TO ${policy.roles.join(', ')}\n`;
  sql += `  USING (${policy.using_expression})`;

  // Add WITH CHECK for INSERT/UPDATE operations
  if (policy.with_check_expression &&
      (policy.operations.includes('INSERT') ||
       policy.operations.includes('UPDATE') ||
       policy.operations.includes('ALL'))) {
    sql += `\n  WITH CHECK (${policy.with_check_expression})`;
  }

  sql += ';\n';

  return sql;
}

/**
 * Generate DROP POLICY SQL statement
 */
export function generateDropPolicySQL(policy: RLSPolicy): string {
  const qualifiedTable = `"${policy.schema}"."${policy.table}"`;
  const policyName = `"${policy.name}"`;

  return `DROP POLICY IF EXISTS ${policyName} ON ${qualifiedTable};\n`;
}

/**
 * Generate SQL to enable RLS on a table
 */
export function generateEnableRLSSQL(schema: string, table: string): string {
  return `ALTER TABLE "${schema}"."${table}" ENABLE ROW LEVEL SECURITY;\n`;
}

/**
 * Generate SQL to disable RLS on a table
 */
export function generateDisableRLSSQL(schema: string, table: string): string {
  return `ALTER TABLE "${schema}"."${table}" DISABLE ROW LEVEL SECURITY;\n`;
}

/**
 * Generate SQL to force RLS for table owner
 */
export function generateForceRLSSQL(schema: string, table: string): string {
  return `ALTER TABLE "${schema}"."${table}" FORCE ROW LEVEL SECURITY;\n`;
}

/**
 * Get SQL command type from operations
 */
function getCommandType(operations: RLSOperation[]): string {
  if (operations.includes('ALL')) return 'ALL';
  if (operations.length === 1) return operations[0];

  // For multiple specific operations, we need multiple policies
  // This function returns the first one; use generateMultiplePoliciesSQL for all
  return operations[0];
}

/**
 * Generate multiple policies for different operations
 */
export function generateMultiplePoliciesSQL(policy: RLSPolicy): string {
  if (policy.operations.includes('ALL') || policy.operations.length === 1) {
    return generatePolicySQL(policy);
  }

  let sql = '';
  const qualifiedTable = `"${policy.schema}"."${policy.table}"`;

  // Enable RLS once
  sql += `ALTER TABLE ${qualifiedTable} ENABLE ROW LEVEL SECURITY;\n\n`;

  // Create a policy for each operation
  for (const operation of policy.operations) {
    const operationPolicy: RLSPolicy = {
      ...policy,
      name: `${policy.name}_${operation.toLowerCase()}`,
      operations: [operation]
    };

    const policySQL = generatePolicySQL(operationPolicy);
    // Remove duplicate ENABLE RLS statement
    sql += policySQL.replace(/ALTER TABLE.*ENABLE ROW LEVEL SECURITY;\n\n/g, '');
  }

  return sql;
}

// ============================================================================
// POLICY GENERATORS
// ============================================================================

/**
 * Generate a user-based RLS policy
 *
 * Creates a policy where users can only access rows they own
 */
export function generateUserPolicy(
  table: string,
  options: {
    schema?: string;
    userIdColumn?: string;
    operations?: RLSOperation[];
    roles?: string[];
    policyName?: string;
  } = {}
): RLSPolicy {
  return RLSPolicyBuilder
    .forTable(table)
    .inSchema(options.schema || 'public')
    .forOperations(...(options.operations || ['ALL']))
    .forRoles(...(options.roles || ['authenticated']))
    .withName(options.policyName || `${table}_user_policy`)
    .withUserFilter(options.userIdColumn || 'user_id')
    .withDescription(`Users can only access their own rows in ${table}`)
    .withTags('user-isolation', 'security')
    .build();
}

/**
 * Generate a multi-tenant RLS policy
 *
 * Creates a policy for tenant isolation in multi-tenant applications
 */
export function generateTenantPolicy(
  table: string,
  options: {
    schema?: string;
    tenantIdColumn?: string;
    operations?: RLSOperation[];
    roles?: string[];
    policyName?: string;
    tenantClaimPath?: string;
  } = {}
): RLSPolicy {
  const tenantColumn = options.tenantIdColumn || 'tenant_id';
  const claimPath = options.tenantClaimPath || 'tenant_id';

  const expression = `"${tenantColumn}" = (auth.jwt() ->> '${claimPath}')::uuid`;

  return RLSPolicyBuilder
    .forTable(table)
    .inSchema(options.schema || 'public')
    .forOperations(...(options.operations || ['ALL']))
    .forRoles(...(options.roles || ['authenticated']))
    .withName(options.policyName || `${table}_tenant_policy`)
    .withCustomExpression(expression)
    .withCheckExpression(expression)
    .withDescription(`Tenant isolation policy for ${table}`)
    .withTags('tenant-isolation', 'multi-tenant', 'security')
    .build();
}

/**
 * Generate a role-based RLS policy
 *
 * Creates a policy based on user roles
 */
export function generateRolePolicy(
  table: string,
  allowedRoles: string[],
  options: {
    schema?: string;
    operations?: RLSOperation[];
    dbRoles?: string[];
    policyName?: string;
    roleClaimPath?: string;
  } = {}
): RLSPolicy {
  const claimPath = options.roleClaimPath || 'role';

  // Build role check expression
  const roleChecks = allowedRoles.map(role =>
    `auth.jwt() ->> '${claimPath}' = '${role}'`
  );
  const expression = roleChecks.length === 1
    ? roleChecks[0]
    : `(${roleChecks.join(' OR ')})`;

  return RLSPolicyBuilder
    .forTable(table)
    .inSchema(options.schema || 'public')
    .forOperations(...(options.operations || ['ALL']))
    .forRoles(...(options.dbRoles || ['authenticated']))
    .withName(options.policyName || `${table}_role_policy`)
    .withCustomExpression(expression)
    .withDescription(`Role-based access policy for ${table}. Allowed roles: ${allowedRoles.join(', ')}`)
    .withTags('role-based', 'security')
    .build();
}

/**
 * Generate a hierarchical access policy
 *
 * Creates a policy for hierarchical data (e.g., org -> team -> user)
 */
export function generateHierarchicalPolicy(
  table: string,
  hierarchy: {
    level: 'user' | 'team' | 'org';
    column: string;
    membershipTable?: string;
  },
  options: {
    schema?: string;
    operations?: RLSOperation[];
    roles?: string[];
    policyName?: string;
  } = {}
): RLSPolicy {
  let expression: string;

  switch (hierarchy.level) {
    case 'user':
      expression = `"${hierarchy.column}" = auth.uid()`;
      break;
    case 'team':
      const teamMembershipTable = hierarchy.membershipTable || 'team_members';
      expression = `"${hierarchy.column}" IN (
        SELECT team_id FROM ${teamMembershipTable} WHERE user_id = auth.uid()
      )`.replace(/\s+/g, ' ').trim();
      break;
    case 'org':
      const orgMembershipTable = hierarchy.membershipTable || 'org_members';
      expression = `"${hierarchy.column}" IN (
        SELECT org_id FROM ${orgMembershipTable} WHERE user_id = auth.uid()
      )`.replace(/\s+/g, ' ').trim();
      break;
  }

  return RLSPolicyBuilder
    .forTable(table)
    .inSchema(options.schema || 'public')
    .forOperations(...(options.operations || ['ALL']))
    .forRoles(...(options.roles || ['authenticated']))
    .withName(options.policyName || `${table}_${hierarchy.level}_policy`)
    .withCustomExpression(expression)
    .withCheckExpression(expression)
    .withDescription(`Hierarchical ${hierarchy.level}-level access policy for ${table}`)
    .withTags('hierarchical', hierarchy.level, 'security')
    .build();
}

/**
 * Generate a time-windowed access policy
 *
 * Creates a policy that restricts access to a time window
 */
export function generateTimeWindowedPolicy(
  table: string,
  options: {
    schema?: string;
    startColumn?: string;
    endColumn?: string;
    operations?: RLSOperation[];
    roles?: string[];
    policyName?: string;
    additionalCondition?: string;
  } = {}
): RLSPolicy {
  const startCol = options.startColumn || 'valid_from';
  const endCol = options.endColumn || 'valid_until';

  let expression = `now() BETWEEN "${startCol}" AND "${endCol}"`;

  if (options.additionalCondition) {
    expression = `(${expression}) AND (${options.additionalCondition})`;
  }

  return RLSPolicyBuilder
    .forTable(table)
    .inSchema(options.schema || 'public')
    .forOperations(...(options.operations || ['SELECT']))
    .forRoles(...(options.roles || ['authenticated']))
    .withName(options.policyName || `${table}_time_window_policy`)
    .withCustomExpression(expression)
    .withDescription(`Time-windowed access policy for ${table}`)
    .withTags('time-based', 'temporal', 'security')
    .build();
}

// ============================================================================
// POLICY COMPOSITION
// ============================================================================

/**
 * Compose multiple policies with AND logic
 */
export function composePoliciesAnd(...policies: RLSPolicy[]): string {
  if (policies.length === 0) return 'false';
  if (policies.length === 1) return policies[0].using_expression;

  const expressions = policies.map(p => `(${p.using_expression})`);
  return expressions.join(' AND ');
}

/**
 * Compose multiple policies with OR logic
 */
export function composePoliciesOr(...policies: RLSPolicy[]): string {
  if (policies.length === 0) return 'false';
  if (policies.length === 1) return policies[0].using_expression;

  const expressions = policies.map(p => `(${p.using_expression})`);
  return expressions.join(' OR ');
}

/**
 * Negate a policy expression
 */
export function negatePolicy(policy: RLSPolicy): string {
  return `NOT (${policy.using_expression})`;
}

/**
 * Create a composite policy from multiple expressions
 */
export function createCompositePolicy(
  table: string,
  composition: ComposedExpression,
  options: {
    schema?: string;
    operations?: RLSOperation[];
    roles?: string[];
    policyName?: string;
    description?: string;
  } = {}
): RLSPolicy {
  const expression = evaluateComposedExpression(composition);

  return RLSPolicyBuilder
    .forTable(table)
    .inSchema(options.schema || 'public')
    .forOperations(...(options.operations || ['ALL']))
    .forRoles(...(options.roles || ['authenticated']))
    .withName(options.policyName || `${table}_composite_policy`)
    .withCustomExpression(expression)
    .withDescription(options.description || 'Composite RLS policy')
    .withTags('composite', 'security')
    .build();
}

/**
 * Evaluate a composed expression tree to SQL
 */
export function evaluateComposedExpression(composition: ComposedExpression): string {
  const evalExpr = (expr: string | ComposedExpression): string => {
    if (typeof expr === 'string') {
      return expr;
    }
    return evaluateComposedExpression(expr);
  };

  switch (composition.type) {
    case 'AND':
      if (composition.expressions.length === 0) return 'true';
      if (composition.expressions.length === 1) return evalExpr(composition.expressions[0]);
      return composition.expressions.map(e => `(${evalExpr(e)})`).join(' AND ');

    case 'OR':
      if (composition.expressions.length === 0) return 'false';
      if (composition.expressions.length === 1) return evalExpr(composition.expressions[0]);
      return composition.expressions.map(e => `(${evalExpr(e)})`).join(' OR ');

    case 'NOT':
      if (composition.expressions.length === 0) return 'true';
      return `NOT (${evalExpr(composition.expressions[0])})`;

    default:
      throw new Error(`Unknown composition type: ${composition.type}`);
  }
}

// ============================================================================
// POLICY SERIALIZATION
// ============================================================================

/**
 * Serialize a policy to JSON string
 */
export function serializePolicy(policy: RLSPolicy): string {
  return JSON.stringify(policy, null, 2);
}

/**
 * Deserialize a policy from JSON string
 */
export function deserializePolicy(json: string): RLSPolicy {
  const parsed = JSON.parse(json);
  return validatePolicy(parsed);
}

/**
 * Serialize multiple policies to JSON
 */
export function serializePolicies(policies: RLSPolicy[]): string {
  return JSON.stringify(policies, null, 2);
}

/**
 * Deserialize multiple policies from JSON
 */
export function deserializePolicies(json: string): RLSPolicy[] {
  const parsed = JSON.parse(json);
  if (!Array.isArray(parsed)) {
    throw new Error('Expected array of policies');
  }
  return parsed.map(validatePolicy);
}

/**
 * Validate and normalize a policy object
 */
export function validatePolicy(obj: unknown): RLSPolicy {
  if (!obj || typeof obj !== 'object') {
    throw new Error('Policy must be an object');
  }

  const policy = obj as Record<string, unknown>;

  // Required fields
  if (typeof policy.id !== 'string') {
    throw new Error('Policy must have a string id');
  }
  if (typeof policy.name !== 'string') {
    throw new Error('Policy must have a string name');
  }
  if (typeof policy.table !== 'string') {
    throw new Error('Policy must have a string table');
  }
  if (typeof policy.using_expression !== 'string') {
    throw new Error('Policy must have a string using_expression');
  }

  // Normalize and validate operations
  if (!Array.isArray(policy.operations)) {
    policy.operations = ['ALL'];
  } else {
    const validOps: RLSOperation[] = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'ALL'];
    for (const op of policy.operations as unknown[]) {
      if (typeof op !== 'string' || !validOps.includes(op as RLSOperation)) {
        throw new Error(`Invalid operation: ${op}`);
      }
    }
  }

  // Normalize roles
  if (!Array.isArray(policy.roles)) {
    policy.roles = ['public'];
  }

  // Normalize schema
  if (typeof policy.schema !== 'string') {
    policy.schema = 'public';
  }

  // Normalize enabled
  if (typeof policy.enabled !== 'boolean') {
    policy.enabled = true;
  }

  // Normalize metadata
  if (!policy.metadata || typeof policy.metadata !== 'object') {
    policy.metadata = {
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      version: 1
    };
  } else {
    const metadata = policy.metadata as Record<string, unknown>;
    if (typeof metadata.created_at !== 'string') {
      metadata.created_at = new Date().toISOString();
    }
    if (typeof metadata.updated_at !== 'string') {
      metadata.updated_at = new Date().toISOString();
    }
    if (typeof metadata.version !== 'number') {
      metadata.version = 1;
    }
  }

  return policy as unknown as RLSPolicy;
}

// ============================================================================
// POLICY REGISTRY
// ============================================================================

/**
 * Registry for managing RLS policies
 */
export class RLSPolicyRegistry {
  private policies: Map<string, RLSPolicy> = new Map();
  private tableIndex: Map<string, Set<string>> = new Map();

  /**
   * Register a policy
   */
  register(policy: RLSPolicy): void {
    this.policies.set(policy.id, policy);

    const tableKey = `${policy.schema}.${policy.table}`;
    if (!this.tableIndex.has(tableKey)) {
      this.tableIndex.set(tableKey, new Set());
    }
    this.tableIndex.get(tableKey)!.add(policy.id);
  }

  /**
   * Unregister a policy
   */
  unregister(policyId: string): boolean {
    const policy = this.policies.get(policyId);
    if (!policy) return false;

    this.policies.delete(policyId);

    const tableKey = `${policy.schema}.${policy.table}`;
    this.tableIndex.get(tableKey)?.delete(policyId);

    return true;
  }

  /**
   * Get a policy by ID
   */
  get(policyId: string): RLSPolicy | undefined {
    return this.policies.get(policyId);
  }

  /**
   * Get all policies for a table
   */
  getByTable(schema: string, table: string): RLSPolicy[] {
    const tableKey = `${schema}.${table}`;
    const policyIds = this.tableIndex.get(tableKey);

    if (!policyIds) return [];

    return Array.from(policyIds)
      .map(id => this.policies.get(id)!)
      .filter(p => p !== undefined);
  }

  /**
   * Get all policies
   */
  getAll(): RLSPolicy[] {
    return Array.from(this.policies.values());
  }

  /**
   * Get enabled policies only
   */
  getEnabled(): RLSPolicy[] {
    return Array.from(this.policies.values()).filter(p => p.enabled);
  }

  /**
   * Get policies by template
   */
  getByTemplate(template: RLSPolicyTemplate): RLSPolicy[] {
    return Array.from(this.policies.values())
      .filter(p => p.metadata.template === template);
  }

  /**
   * Get policies by tag
   */
  getByTag(tag: string): RLSPolicy[] {
    return Array.from(this.policies.values())
      .filter(p => p.metadata.tags?.includes(tag));
  }

  /**
   * Generate SQL for all policies
   */
  generateAllSQL(): string {
    let sql = '-- RLS Policies Generated by AgentOS\n';
    sql += `-- Generated at: ${new Date().toISOString()}\n`;
    sql += `-- Total policies: ${this.policies.size}\n\n`;

    for (const policy of this.policies.values()) {
      sql += generatePolicySQL(policy);
      sql += '\n';
    }

    return sql;
  }

  /**
   * Export all policies to JSON
   */
  export(): string {
    return serializePolicies(Array.from(this.policies.values()));
  }

  /**
   * Import policies from JSON
   */
  import(json: string): number {
    const policies = deserializePolicies(json);
    for (const policy of policies) {
      this.register(policy);
    }
    return policies.length;
  }

  /**
   * Clear all policies
   */
  clear(): void {
    this.policies.clear();
    this.tableIndex.clear();
  }
}

// ============================================================================
// POLICY ANALYZER
// ============================================================================

/**
 * Analyze RLS policy coverage and potential issues
 */
export interface PolicyAnalysis {
  /** Tables with RLS policies */
  covered_tables: string[];

  /** Tables without RLS policies */
  uncovered_tables: string[];

  /** Policies per table */
  policies_per_table: Map<string, number>;

  /** Potential security issues */
  warnings: PolicyWarning[];

  /** Policy statistics */
  stats: {
    total_policies: number;
    enabled_policies: number;
    disabled_policies: number;
    by_template: Map<RLSPolicyTemplate, number>;
    by_operation: Map<RLSOperation, number>;
  };
}

export interface PolicyWarning {
  type: 'no_check_expression' | 'public_write' | 'disabled_policy' | 'overly_permissive' | 'missing_role';
  severity: 'low' | 'medium' | 'high';
  policy_id: string;
  message: string;
}

/**
 * Analyze policies in a registry
 */
export function analyzePolicies(registry: RLSPolicyRegistry): PolicyAnalysis {
  const policies = registry.getAll();

  const coveredTables = new Set<string>();
  const policiesPerTable = new Map<string, number>();
  const warnings: PolicyWarning[] = [];
  const byTemplate = new Map<RLSPolicyTemplate, number>();
  const byOperation = new Map<RLSOperation, number>();

  let enabledCount = 0;
  let disabledCount = 0;

  for (const policy of policies) {
    const tableKey = `${policy.schema}.${policy.table}`;
    coveredTables.add(tableKey);

    policiesPerTable.set(tableKey, (policiesPerTable.get(tableKey) || 0) + 1);

    // Count by template
    if (policy.metadata.template) {
      byTemplate.set(
        policy.metadata.template,
        (byTemplate.get(policy.metadata.template) || 0) + 1
      );
    }

    // Count by operation
    for (const op of policy.operations) {
      byOperation.set(op, (byOperation.get(op) || 0) + 1);
    }

    // Count enabled/disabled
    if (policy.enabled) {
      enabledCount++;
    } else {
      disabledCount++;
      warnings.push({
        type: 'disabled_policy',
        severity: 'medium',
        policy_id: policy.id,
        message: `Policy "${policy.name}" is disabled`
      });
    }

    // Check for missing WITH CHECK on write operations
    const hasWriteOps = policy.operations.some(op =>
      ['INSERT', 'UPDATE', 'ALL'].includes(op)
    );
    if (hasWriteOps && !policy.with_check_expression) {
      warnings.push({
        type: 'no_check_expression',
        severity: 'medium',
        policy_id: policy.id,
        message: `Policy "${policy.name}" has write operations but no WITH CHECK expression`
      });
    }

    // Check for overly permissive policies
    if (policy.using_expression === 'true' &&
        policy.operations.some(op => ['INSERT', 'UPDATE', 'DELETE', 'ALL'].includes(op))) {
      warnings.push({
        type: 'overly_permissive',
        severity: 'high',
        policy_id: policy.id,
        message: `Policy "${policy.name}" allows unrestricted write access`
      });
    }

    // Check for public write access
    if (policy.roles.includes('anon') &&
        policy.operations.some(op => ['INSERT', 'UPDATE', 'DELETE', 'ALL'].includes(op))) {
      warnings.push({
        type: 'public_write',
        severity: 'high',
        policy_id: policy.id,
        message: `Policy "${policy.name}" allows anonymous write access`
      });
    }
  }

  return {
    covered_tables: Array.from(coveredTables),
    uncovered_tables: [], // Would need table list to determine
    policies_per_table: policiesPerTable,
    warnings,
    stats: {
      total_policies: policies.length,
      enabled_policies: enabledCount,
      disabled_policies: disabledCount,
      by_template: byTemplate,
      by_operation: byOperation
    }
  };
}

// ============================================================================
// SINGLETON AND CONVENIENCE FUNCTIONS
// ============================================================================

let defaultRegistry: RLSPolicyRegistry | null = null;

/**
 * Get the default RLS policy registry
 */
export function getRLSRegistry(): RLSPolicyRegistry {
  if (!defaultRegistry) {
    defaultRegistry = new RLSPolicyRegistry();
  }
  return defaultRegistry;
}

/**
 * Set a custom RLS policy registry
 */
export function setRLSRegistry(registry: RLSPolicyRegistry): void {
  defaultRegistry = registry;
}

/**
 * Quick helper to create a user-based policy and register it
 */
export function registerUserPolicy(
  table: string,
  options?: Parameters<typeof generateUserPolicy>[1]
): RLSPolicy {
  const policy = generateUserPolicy(table, options);
  getRLSRegistry().register(policy);
  return policy;
}

/**
 * Quick helper to create a tenant policy and register it
 */
export function registerTenantPolicy(
  table: string,
  options?: Parameters<typeof generateTenantPolicy>[1]
): RLSPolicy {
  const policy = generateTenantPolicy(table, options);
  getRLSRegistry().register(policy);
  return policy;
}

/**
 * Quick helper to create a role policy and register it
 */
export function registerRolePolicy(
  table: string,
  allowedRoles: string[],
  options?: Parameters<typeof generateRolePolicy>[2]
): RLSPolicy {
  const policy = generateRolePolicy(table, allowedRoles, options);
  getRLSRegistry().register(policy);
  return policy;
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  RLSPolicyBuilder,
  RLSPolicyRegistry
};
