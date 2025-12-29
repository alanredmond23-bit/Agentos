/**
 * rls_audit.ts
 * Row-Level Security (RLS) Policy Auditing and Validation for AgentOS
 *
 * Implements comprehensive RLS policy auditing including:
 * - SQL syntax validation for RLS policies
 * - Schema coverage analysis
 * - GDPR, SOC2, and HIPAA compliance checking
 * - Violation detection and recommendations
 * - Multi-format report generation
 *
 * @zone RED - Security/Compliance zone, requires security review for changes
 * @impact_axes [C, E] - Cost (security breaches) and Legal
 */

import * as crypto from 'crypto';
import { AuditLogger, getAuditLogger } from '../core/audit';
import { createEventId } from '../types/events';
import {
  RegulationType,
  ViolationSeverity,
  GDPRComplianceGate,
  SOC2ComplianceGate,
  HIPAAComplianceGate,
  getComplianceRegistry
} from './compliance_gates';

// ============================================================================
// CORE TYPES
// ============================================================================

export type RLSOperation = 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'ALL';

export type ComplianceStandard = 'GDPR' | 'SOC2' | 'HIPAA' | 'PCI_DSS';

export type ReportFormat = 'json' | 'markdown' | 'html';

export interface RLSPolicy {
  /** Policy name */
  name: string;

  /** Target table (schema.table) */
  table: string;

  /** Schema name */
  schema: string;

  /** Operations this policy applies to */
  operations: RLSOperation[];

  /** Policy expression (USING clause) */
  using_expression: string;

  /** Check expression (WITH CHECK clause) */
  check_expression?: string;

  /** Policy is permissive or restrictive */
  policy_type: 'permissive' | 'restrictive';

  /** Roles this policy applies to */
  roles: string[];

  /** Whether policy is enabled */
  enabled: boolean;

  /** Policy creation timestamp */
  created_at?: string;

  /** Last modified timestamp */
  modified_at?: string;

  /** Policy description */
  description?: string;
}

export interface RLSViolation {
  /** Violation code (e.g., RLS-001) */
  code: string;

  /** Human-readable violation description */
  message: string;

  /** Severity level */
  severity: ViolationSeverity;

  /** Affected table */
  table: string;

  /** Affected policy name (if applicable) */
  policy_name?: string;

  /** Related compliance standard */
  compliance_standard?: ComplianceStandard;

  /** Specific rule or requirement violated */
  rule_reference?: string;

  /** Timestamp of detection */
  detected_at: string;

  /** Evidence for audit trail */
  evidence?: Record<string, unknown>;

  /** Potential exposure */
  exposure_description?: string;
}

export interface RLSRecommendation {
  /** Recommendation ID */
  id: string;

  /** Priority level */
  priority: 'low' | 'medium' | 'high' | 'critical';

  /** Recommendation title */
  title: string;

  /** Detailed recommendation */
  description: string;

  /** Affected tables */
  affected_tables: string[];

  /** Related violations */
  related_violations: string[];

  /** Implementation steps */
  implementation_steps: string[];

  /** Sample SQL to implement */
  sample_sql?: string;

  /** Effort estimate */
  effort_estimate?: 'minimal' | 'moderate' | 'significant';

  /** Related compliance standards */
  compliance_standards?: ComplianceStandard[];
}

export interface RLSCoverageReport {
  /** Tables with RLS enabled */
  tables_with_rls: TableRLSInfo[];

  /** Tables without RLS */
  tables_without_rls: string[];

  /** Operations covered per table */
  operations_covered: Record<string, RLSOperation[]>;

  /** Operations missing per table */
  operations_missing: Record<string, RLSOperation[]>;

  /** Coverage percentage */
  coverage_percentage: number;

  /** Sensitive tables without RLS */
  sensitive_tables_unprotected: string[];

  /** Coverage by schema */
  coverage_by_schema: Record<string, { covered: number; total: number }>;
}

export interface TableRLSInfo {
  /** Full table name (schema.table) */
  table: string;

  /** Schema name */
  schema: string;

  /** Table name */
  table_name: string;

  /** Whether RLS is enabled */
  rls_enabled: boolean;

  /** Number of policies */
  policy_count: number;

  /** Policies on this table */
  policies: RLSPolicy[];

  /** Operations with policies */
  covered_operations: RLSOperation[];

  /** Sensitive data categories in table */
  sensitive_categories?: string[];
}

export interface ComplianceCheckResult {
  /** Compliance standard checked */
  standard: ComplianceStandard;

  /** Whether compliant */
  compliant: boolean;

  /** Compliance score (0-100) */
  score: number;

  /** Requirements met */
  requirements_met: string[];

  /** Requirements not met */
  requirements_not_met: string[];

  /** Violations found */
  violations: RLSViolation[];

  /** Recommendations */
  recommendations: RLSRecommendation[];
}

export interface RLSAuditResult {
  /** Unique audit ID */
  audit_id: string;

  /** Audit timestamp */
  timestamp: string;

  /** Schema audited */
  schema: string;

  /** Tables audited */
  tables_audited: string[];

  /** Policies found */
  policies_found: RLSPolicy[];

  /** Coverage report */
  coverage: RLSCoverageReport;

  /** Violations found */
  violations: RLSViolation[];

  /** Recommendations */
  recommendations: RLSRecommendation[];

  /** Compliance results by standard */
  compliance: Record<ComplianceStandard, ComplianceCheckResult>;

  /** Overall risk level */
  risk_level: 'low' | 'medium' | 'high' | 'critical';

  /** Audit duration (ms) */
  duration_ms: number;

  /** Auditor metadata */
  auditor: {
    version: string;
    rules_version: string;
  };
}

export interface PolicyValidationResult {
  /** Whether policy is valid */
  valid: boolean;

  /** Validation errors */
  errors: PolicyValidationError[];

  /** Validation warnings */
  warnings: PolicyValidationWarning[];

  /** Policy name */
  policy_name: string;

  /** Validated expressions */
  expressions_checked: {
    using: boolean;
    check: boolean;
  };
}

export interface PolicyValidationError {
  /** Error code */
  code: string;

  /** Error message */
  message: string;

  /** Location in expression */
  location?: {
    line: number;
    column: number;
    expression: 'using' | 'check';
  };
}

export interface PolicyValidationWarning {
  /** Warning code */
  code: string;

  /** Warning message */
  message: string;

  /** Recommendation */
  recommendation?: string;
}

// ============================================================================
// RLS VALIDATOR CLASS
// ============================================================================

export class RLSValidator {
  private forbiddenPatterns: Array<{ pattern: RegExp; message: string; code: string }>;
  private warningPatterns: Array<{ pattern: RegExp; message: string; code: string }>;

  constructor() {
    this.forbiddenPatterns = [
      {
        pattern: /\bTRUE\b\s*$/i,
        message: 'Policy expression evaluates to TRUE, allowing all access',
        code: 'RLS-VAL-001'
      },
      {
        pattern: /\b1\s*=\s*1\b/i,
        message: 'Policy contains tautology (1=1), effectively bypassing RLS',
        code: 'RLS-VAL-002'
      },
      {
        pattern: /\bOR\s+TRUE\b/i,
        message: 'Policy contains OR TRUE, effectively bypassing security',
        code: 'RLS-VAL-003'
      },
      {
        pattern: /--.*$/m,
        message: 'SQL comment detected in policy expression',
        code: 'RLS-VAL-004'
      },
      {
        pattern: /;\s*\w/,
        message: 'Multiple statements detected in policy expression',
        code: 'RLS-VAL-005'
      },
      {
        pattern: /\bDROP\b|\bTRUNCATE\b|\bALTER\b/i,
        message: 'DDL statements not allowed in policy expressions',
        code: 'RLS-VAL-006'
      }
    ];

    this.warningPatterns = [
      {
        pattern: /\bcurrent_user\b/i,
        message: 'Using current_user - ensure this is intentional for role-based access',
        code: 'RLS-WARN-001'
      },
      {
        pattern: /\bNOT\s+EXISTS\b/i,
        message: 'NOT EXISTS may have performance implications on large tables',
        code: 'RLS-WARN-002'
      },
      {
        pattern: /\bFALSE\b\s*$/i,
        message: 'Policy expression evaluates to FALSE, blocking all access',
        code: 'RLS-WARN-003'
      },
      {
        pattern: /\bSELECT\b.*\bFROM\b/i,
        message: 'Subquery in policy - consider performance impact',
        code: 'RLS-WARN-004'
      },
      {
        pattern: /current_setting\s*\(/i,
        message: 'Using current_setting - ensure setting is always defined',
        code: 'RLS-WARN-005'
      }
    ];
  }

  /**
   * Validate a single RLS policy
   */
  validatePolicy(policy: RLSPolicy): PolicyValidationResult {
    const errors: PolicyValidationError[] = [];
    const warnings: PolicyValidationWarning[] = [];

    // Validate USING expression
    if (policy.using_expression) {
      const usingResult = this.validateExpression(policy.using_expression, 'using');
      errors.push(...usingResult.errors);
      warnings.push(...usingResult.warnings);
    } else {
      errors.push({
        code: 'RLS-VAL-007',
        message: 'Policy missing USING expression'
      });
    }

    // Validate CHECK expression if present
    if (policy.check_expression) {
      const checkResult = this.validateExpression(policy.check_expression, 'check');
      errors.push(...checkResult.errors);
      warnings.push(...checkResult.warnings);
    }

    // Validate policy structure
    if (!policy.name || policy.name.trim() === '') {
      errors.push({
        code: 'RLS-VAL-008',
        message: 'Policy name is required'
      });
    }

    if (!policy.table || policy.table.trim() === '') {
      errors.push({
        code: 'RLS-VAL-009',
        message: 'Policy table is required'
      });
    }

    if (policy.operations.length === 0) {
      errors.push({
        code: 'RLS-VAL-010',
        message: 'Policy must specify at least one operation'
      });
    }

    if (policy.roles.length === 0) {
      warnings.push({
        code: 'RLS-WARN-006',
        message: 'No specific roles defined - policy applies to PUBLIC',
        recommendation: 'Consider specifying explicit roles for better security control'
      });
    }

    // Validate policy type and expression combination
    if (policy.policy_type === 'restrictive' && !policy.check_expression) {
      warnings.push({
        code: 'RLS-WARN-007',
        message: 'Restrictive policy without CHECK expression may not restrict writes',
        recommendation: 'Add WITH CHECK clause for INSERT/UPDATE operations'
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      policy_name: policy.name,
      expressions_checked: {
        using: !!policy.using_expression,
        check: !!policy.check_expression
      }
    };
  }

  /**
   * Validate multiple policies
   */
  validatePolicies(policies: RLSPolicy[]): {
    results: PolicyValidationResult[];
    summary: {
      total: number;
      valid: number;
      invalid: number;
      total_errors: number;
      total_warnings: number;
    };
  } {
    const results = policies.map(policy => this.validatePolicy(policy));

    return {
      results,
      summary: {
        total: policies.length,
        valid: results.filter(r => r.valid).length,
        invalid: results.filter(r => !r.valid).length,
        total_errors: results.reduce((sum, r) => sum + r.errors.length, 0),
        total_warnings: results.reduce((sum, r) => sum + r.warnings.length, 0)
      }
    };
  }

  /**
   * Check schema RLS coverage
   */
  checkCoverage(tables: TableRLSInfo[]): RLSCoverageReport {
    const tablesWithRls = tables.filter(t => t.rls_enabled && t.policy_count > 0);
    const tablesWithoutRls = tables
      .filter(t => !t.rls_enabled || t.policy_count === 0)
      .map(t => t.table);

    const operationsCovered: Record<string, RLSOperation[]> = {};
    const operationsMissing: Record<string, RLSOperation[]> = {};
    const allOperations: RLSOperation[] = ['SELECT', 'INSERT', 'UPDATE', 'DELETE'];

    for (const table of tables) {
      operationsCovered[table.table] = table.covered_operations;
      operationsMissing[table.table] = allOperations.filter(
        op => !table.covered_operations.includes(op) && !table.covered_operations.includes('ALL')
      );
    }

    // Identify sensitive tables without RLS
    const sensitivePatterns = ['user', 'customer', 'patient', 'account', 'payment', 'credential', 'secret', 'token', 'session'];
    const sensitiveTablesUnprotected = tablesWithoutRls.filter(table => {
      const tableLower = table.toLowerCase();
      return sensitivePatterns.some(pattern => tableLower.includes(pattern));
    });

    // Calculate coverage by schema
    const coverageBySchema: Record<string, { covered: number; total: number }> = {};
    for (const table of tables) {
      if (!coverageBySchema[table.schema]) {
        coverageBySchema[table.schema] = { covered: 0, total: 0 };
      }
      coverageBySchema[table.schema].total++;
      if (table.rls_enabled && table.policy_count > 0) {
        coverageBySchema[table.schema].covered++;
      }
    }

    const coveragePercentage = tables.length > 0
      ? (tablesWithRls.length / tables.length) * 100
      : 0;

    return {
      tables_with_rls: tablesWithRls,
      tables_without_rls: tablesWithoutRls,
      operations_covered: operationsCovered,
      operations_missing: operationsMissing,
      coverage_percentage: Math.round(coveragePercentage * 100) / 100,
      sensitive_tables_unprotected: sensitiveTablesUnprotected,
      coverage_by_schema: coverageBySchema
    };
  }

  /**
   * Validate a SQL expression
   */
  private validateExpression(
    expression: string,
    expressionType: 'using' | 'check'
  ): { errors: PolicyValidationError[]; warnings: PolicyValidationWarning[] } {
    const errors: PolicyValidationError[] = [];
    const warnings: PolicyValidationWarning[] = [];

    // Check for forbidden patterns
    for (const { pattern, message, code } of this.forbiddenPatterns) {
      if (pattern.test(expression)) {
        errors.push({
          code,
          message,
          location: { line: 1, column: 0, expression: expressionType }
        });
      }
    }

    // Check for warning patterns
    for (const { pattern, message, code } of this.warningPatterns) {
      if (pattern.test(expression)) {
        warnings.push({ code, message });
      }
    }

    // Check for balanced parentheses
    let parenCount = 0;
    for (const char of expression) {
      if (char === '(') parenCount++;
      if (char === ')') parenCount--;
      if (parenCount < 0) {
        errors.push({
          code: 'RLS-VAL-011',
          message: 'Unbalanced parentheses in expression',
          location: { line: 1, column: 0, expression: expressionType }
        });
        break;
      }
    }
    if (parenCount !== 0) {
      errors.push({
        code: 'RLS-VAL-011',
        message: 'Unbalanced parentheses in expression',
        location: { line: 1, column: 0, expression: expressionType }
      });
    }

    return { errors, warnings };
  }
}

// ============================================================================
// RLS AUDITOR CLASS
// ============================================================================

export class RLSAuditor {
  private validator: RLSValidator;
  private sensitiveTablePatterns: string[];
  private version = '1.0.0';
  private rulesVersion = '2024.12.1';

  constructor() {
    this.validator = new RLSValidator();
    this.sensitiveTablePatterns = [
      'user', 'users', 'customer', 'customers', 'patient', 'patients',
      'account', 'accounts', 'payment', 'payments', 'transaction', 'transactions',
      'credential', 'credentials', 'secret', 'secrets', 'token', 'tokens',
      'session', 'sessions', 'auth', 'authentication', 'authorization',
      'pii', 'personal', 'private', 'sensitive', 'phi', 'health',
      'billing', 'invoice', 'card', 'bank', 'ssn', 'document'
    ];
  }

  /**
   * Audit an entire schema
   */
  async auditSchema(
    schema: string,
    tables: TableRLSInfo[],
    policies: RLSPolicy[]
  ): Promise<RLSAuditResult> {
    const startTime = Date.now();
    const auditId = createEventId();

    // Validate all policies
    const validationResults = this.validator.validatePolicies(policies);

    // Check coverage
    const coverage = this.validator.checkCoverage(tables);

    // Detect violations
    const violations = this.detectViolations(tables, policies, validationResults, coverage);

    // Generate recommendations
    const recommendations = this.generateRecommendations(violations, coverage, policies);

    // Run compliance checks
    const compliance = await this.runComplianceChecks(tables, policies, coverage);

    // Calculate risk level
    const riskLevel = this.calculateRiskLevel(violations, coverage);

    const result: RLSAuditResult = {
      audit_id: auditId,
      timestamp: new Date().toISOString(),
      schema,
      tables_audited: tables.map(t => t.table),
      policies_found: policies,
      coverage,
      violations,
      recommendations,
      compliance,
      risk_level: riskLevel,
      duration_ms: Date.now() - startTime,
      auditor: {
        version: this.version,
        rules_version: this.rulesVersion
      }
    };

    // Log audit event
    await this.logAuditEvent(result);

    return result;
  }

  /**
   * Audit a single table
   */
  async auditTable(table: TableRLSInfo, policies: RLSPolicy[]): Promise<{
    table: string;
    rls_enabled: boolean;
    policies: RLSPolicy[];
    validation: PolicyValidationResult[];
    violations: RLSViolation[];
    recommendations: RLSRecommendation[];
  }> {
    const tablePolicies = policies.filter(p => p.table === table.table);
    const validationResults = this.validator.validatePolicies(tablePolicies);

    const coverage = this.validator.checkCoverage([table]);
    const violations = this.detectTableViolations(table, tablePolicies, validationResults);
    const recommendations = this.generateTableRecommendations(table, violations, tablePolicies);

    return {
      table: table.table,
      rls_enabled: table.rls_enabled,
      policies: tablePolicies,
      validation: validationResults.results,
      violations,
      recommendations
    };
  }

  /**
   * Generate a report in the specified format
   */
  generateReport(result: RLSAuditResult, format: ReportFormat): string {
    switch (format) {
      case 'json':
        return this.generateJsonReport(result);
      case 'markdown':
        return this.generateMarkdownReport(result);
      case 'html':
        return this.generateHtmlReport(result);
      default:
        return this.generateJsonReport(result);
    }
  }

  // ============================================================================
  // VIOLATION DETECTION
  // ============================================================================

  private detectViolations(
    tables: TableRLSInfo[],
    policies: RLSPolicy[],
    validationResults: { results: PolicyValidationResult[] },
    coverage: RLSCoverageReport
  ): RLSViolation[] {
    const violations: RLSViolation[] = [];
    const now = new Date().toISOString();

    // Validation errors become violations
    for (const result of validationResults.results) {
      for (const error of result.errors) {
        const policy = policies.find(p => p.name === result.policy_name);
        violations.push({
          code: error.code,
          message: error.message,
          severity: 'high',
          table: policy?.table ?? 'unknown',
          policy_name: result.policy_name,
          detected_at: now
        });
      }
    }

    // Sensitive tables without RLS
    for (const table of coverage.sensitive_tables_unprotected) {
      violations.push({
        code: 'RLS-AUD-001',
        message: `Sensitive table '${table}' does not have RLS enabled`,
        severity: 'critical',
        table,
        compliance_standard: 'GDPR',
        rule_reference: 'Article 32 - Security of processing',
        detected_at: now,
        exposure_description: 'Unprotected sensitive data may be accessible without proper authorization'
      });
    }

    // Tables with no policies
    for (const table of coverage.tables_without_rls) {
      const isSensitive = coverage.sensitive_tables_unprotected.includes(table);
      if (!isSensitive) {
        violations.push({
          code: 'RLS-AUD-002',
          message: `Table '${table}' has no RLS policies`,
          severity: 'medium',
          table,
          detected_at: now
        });
      }
    }

    // Missing operations coverage
    for (const [table, missingOps] of Object.entries(coverage.operations_missing)) {
      if (missingOps.length > 0 && !coverage.tables_without_rls.includes(table)) {
        violations.push({
          code: 'RLS-AUD-003',
          message: `Table '${table}' missing RLS policies for operations: ${missingOps.join(', ')}`,
          severity: 'medium',
          table,
          detected_at: now,
          evidence: { missing_operations: missingOps }
        });
      }
    }

    // Check for permissive-only policies (potential security gap)
    const tablesWithOnlyPermissive = new Map<string, RLSPolicy[]>();
    for (const policy of policies) {
      if (policy.policy_type === 'permissive') {
        const existing = tablesWithOnlyPermissive.get(policy.table) ?? [];
        existing.push(policy);
        tablesWithOnlyPermissive.set(policy.table, existing);
      }
    }

    for (const [table, permPolicies] of tablesWithOnlyPermissive) {
      const hasRestrictive = policies.some(
        p => p.table === table && p.policy_type === 'restrictive'
      );
      if (!hasRestrictive && permPolicies.length > 1) {
        violations.push({
          code: 'RLS-AUD-004',
          message: `Table '${table}' has multiple permissive policies without restrictive policies`,
          severity: 'low',
          table,
          detected_at: now,
          exposure_description: 'Multiple permissive policies are ORed together, potentially widening access'
        });
      }
    }

    return violations;
  }

  private detectTableViolations(
    table: TableRLSInfo,
    policies: RLSPolicy[],
    validationResults: { results: PolicyValidationResult[] }
  ): RLSViolation[] {
    const violations: RLSViolation[] = [];
    const now = new Date().toISOString();

    // Check if table should have RLS but doesn't
    const isSensitive = this.isTableSensitive(table.table);

    if (!table.rls_enabled && isSensitive) {
      violations.push({
        code: 'RLS-AUD-001',
        message: `Sensitive table '${table.table}' does not have RLS enabled`,
        severity: 'critical',
        table: table.table,
        compliance_standard: 'GDPR',
        detected_at: now
      });
    }

    // Add validation errors
    for (const result of validationResults.results) {
      for (const error of result.errors) {
        violations.push({
          code: error.code,
          message: error.message,
          severity: 'high',
          table: table.table,
          policy_name: result.policy_name,
          detected_at: now
        });
      }
    }

    return violations;
  }

  // ============================================================================
  // RECOMMENDATION GENERATION
  // ============================================================================

  private generateRecommendations(
    violations: RLSViolation[],
    coverage: RLSCoverageReport,
    policies: RLSPolicy[]
  ): RLSRecommendation[] {
    const recommendations: RLSRecommendation[] = [];

    // Recommend enabling RLS on sensitive tables
    if (coverage.sensitive_tables_unprotected.length > 0) {
      recommendations.push({
        id: createEventId(),
        priority: 'critical',
        title: 'Enable RLS on sensitive tables',
        description: `${coverage.sensitive_tables_unprotected.length} sensitive tables lack Row-Level Security protection`,
        affected_tables: coverage.sensitive_tables_unprotected,
        related_violations: violations
          .filter(v => v.code === 'RLS-AUD-001')
          .map(v => v.code),
        implementation_steps: [
          'Identify the access patterns for each table',
          'Design appropriate RLS policies based on user roles',
          'Enable RLS with ALTER TABLE ... ENABLE ROW LEVEL SECURITY',
          'Create policies for SELECT, INSERT, UPDATE, DELETE operations',
          'Test policies thoroughly before production deployment'
        ],
        sample_sql: this.generateRLSSampleSQL(coverage.sensitive_tables_unprotected[0]),
        effort_estimate: 'significant',
        compliance_standards: ['GDPR', 'SOC2', 'HIPAA']
      });
    }

    // Recommend fixing policy validation errors
    const validationViolations = violations.filter(v => v.code.startsWith('RLS-VAL'));
    if (validationViolations.length > 0) {
      recommendations.push({
        id: createEventId(),
        priority: 'high',
        title: 'Fix policy validation errors',
        description: `${validationViolations.length} RLS policies have validation errors that may compromise security`,
        affected_tables: [...new Set(validationViolations.map(v => v.table))],
        related_violations: validationViolations.map(v => v.code),
        implementation_steps: [
          'Review each flagged policy expression',
          'Remove any tautologies (TRUE, 1=1)',
          'Ensure expressions properly restrict access',
          'Test policies after modifications'
        ],
        effort_estimate: 'moderate'
      });
    }

    // Recommend adding missing operation coverage
    const missingOpTables = Object.entries(coverage.operations_missing)
      .filter(([_, ops]) => ops.length > 0)
      .map(([table]) => table);

    if (missingOpTables.length > 0) {
      recommendations.push({
        id: createEventId(),
        priority: 'medium',
        title: 'Add missing operation policies',
        description: 'Some tables have RLS enabled but lack policies for certain operations',
        affected_tables: missingOpTables,
        related_violations: violations
          .filter(v => v.code === 'RLS-AUD-003')
          .map(v => v.code),
        implementation_steps: [
          'Review which operations are missing policies',
          'Determine if operations should be allowed',
          'Create appropriate policies or deny access',
          'Document the security rationale'
        ],
        effort_estimate: 'moderate'
      });
    }

    // Recommend coverage improvement
    if (coverage.coverage_percentage < 80) {
      recommendations.push({
        id: createEventId(),
        priority: 'medium',
        title: 'Improve overall RLS coverage',
        description: `Current RLS coverage is ${coverage.coverage_percentage}%. Target at least 80% for production systems`,
        affected_tables: coverage.tables_without_rls,
        related_violations: [],
        implementation_steps: [
          'Prioritize tables containing user data',
          'Create a rollout plan for enabling RLS',
          'Start with read policies, then add write policies',
          'Monitor for access issues after enabling'
        ],
        effort_estimate: 'significant',
        compliance_standards: ['SOC2']
      });
    }

    return recommendations;
  }

  private generateTableRecommendations(
    table: TableRLSInfo,
    violations: RLSViolation[],
    policies: RLSPolicy[]
  ): RLSRecommendation[] {
    const recommendations: RLSRecommendation[] = [];

    if (!table.rls_enabled) {
      recommendations.push({
        id: createEventId(),
        priority: this.isTableSensitive(table.table) ? 'critical' : 'medium',
        title: `Enable RLS on ${table.table}`,
        description: 'Row-Level Security should be enabled for access control',
        affected_tables: [table.table],
        related_violations: violations.map(v => v.code),
        implementation_steps: [
          `ALTER TABLE ${table.table} ENABLE ROW LEVEL SECURITY;`,
          'Create appropriate policies for your access patterns',
          'Test with different user roles'
        ],
        sample_sql: this.generateRLSSampleSQL(table.table),
        effort_estimate: 'moderate'
      });
    }

    return recommendations;
  }

  // ============================================================================
  // COMPLIANCE CHECKING
  // ============================================================================

  private async runComplianceChecks(
    tables: TableRLSInfo[],
    policies: RLSPolicy[],
    coverage: RLSCoverageReport
  ): Promise<Record<ComplianceStandard, ComplianceCheckResult>> {
    const results: Record<ComplianceStandard, ComplianceCheckResult> = {} as any;

    // GDPR Compliance Check
    results.GDPR = this.checkGDPRCompliance(tables, policies, coverage);

    // SOC2 Compliance Check
    results.SOC2 = this.checkSOC2Compliance(tables, policies, coverage);

    // HIPAA Compliance Check
    results.HIPAA = this.checkHIPAACompliance(tables, policies, coverage);

    // PCI_DSS Compliance Check
    results.PCI_DSS = this.checkPCIDSSCompliance(tables, policies, coverage);

    return results;
  }

  private checkGDPRCompliance(
    tables: TableRLSInfo[],
    policies: RLSPolicy[],
    coverage: RLSCoverageReport
  ): ComplianceCheckResult {
    const violations: RLSViolation[] = [];
    const requirementsMet: string[] = [];
    const requirementsNotMet: string[] = [];
    const now = new Date().toISOString();

    // Requirement: Personal data must have access controls (Article 32)
    const personalDataTables = tables.filter(t =>
      this.sensitiveTablePatterns.some(p => t.table.toLowerCase().includes(p))
    );

    const protectedPersonalData = personalDataTables.filter(t => t.rls_enabled && t.policy_count > 0);

    if (protectedPersonalData.length === personalDataTables.length && personalDataTables.length > 0) {
      requirementsMet.push('Art. 32: All personal data tables have access controls');
    } else {
      requirementsNotMet.push('Art. 32: Not all personal data tables have access controls');
      violations.push({
        code: 'GDPR-RLS-001',
        message: 'Personal data tables lack RLS protection',
        severity: 'critical',
        table: personalDataTables.find(t => !t.rls_enabled)?.table ?? '',
        compliance_standard: 'GDPR',
        rule_reference: 'Article 32 - Security of processing',
        detected_at: now
      });
    }

    // Requirement: Data minimization in policies (Article 5)
    const selectPolicies = policies.filter(p => p.operations.includes('SELECT') || p.operations.includes('ALL'));
    if (selectPolicies.length > 0) {
      requirementsMet.push('Art. 5(1)(c): Read access policies exist for data minimization');
    } else if (personalDataTables.length > 0) {
      requirementsNotMet.push('Art. 5(1)(c): No read access policies for data minimization');
    }

    const score = requirementsMet.length / (requirementsMet.length + requirementsNotMet.length) * 100 || 0;

    return {
      standard: 'GDPR',
      compliant: requirementsNotMet.length === 0,
      score: Math.round(score),
      requirements_met: requirementsMet,
      requirements_not_met: requirementsNotMet,
      violations,
      recommendations: []
    };
  }

  private checkSOC2Compliance(
    tables: TableRLSInfo[],
    policies: RLSPolicy[],
    coverage: RLSCoverageReport
  ): ComplianceCheckResult {
    const violations: RLSViolation[] = [];
    const requirementsMet: string[] = [];
    const requirementsNotMet: string[] = [];
    const now = new Date().toISOString();

    // CC6.1: Logical access controls
    if (coverage.coverage_percentage >= 80) {
      requirementsMet.push('CC6.1: Adequate logical access controls in place (80%+ RLS coverage)');
    } else {
      requirementsNotMet.push(`CC6.1: Insufficient RLS coverage (${coverage.coverage_percentage}%)`);
      violations.push({
        code: 'SOC2-RLS-001',
        message: 'RLS coverage below 80% threshold',
        severity: 'high',
        table: 'schema-wide',
        compliance_standard: 'SOC2',
        rule_reference: 'CC6.1 - Logical Access Controls',
        detected_at: now
      });
    }

    // CC6.3: Role-based access
    const policiesWithRoles = policies.filter(p => p.roles.length > 0);
    if (policiesWithRoles.length > 0) {
      requirementsMet.push('CC6.3: Role-based access controls implemented');
    } else if (policies.length > 0) {
      requirementsNotMet.push('CC6.3: No role-based access controls');
    }

    const score = requirementsMet.length / (requirementsMet.length + requirementsNotMet.length) * 100 || 0;

    return {
      standard: 'SOC2',
      compliant: requirementsNotMet.length === 0,
      score: Math.round(score),
      requirements_met: requirementsMet,
      requirements_not_met: requirementsNotMet,
      violations,
      recommendations: []
    };
  }

  private checkHIPAACompliance(
    tables: TableRLSInfo[],
    policies: RLSPolicy[],
    coverage: RLSCoverageReport
  ): ComplianceCheckResult {
    const violations: RLSViolation[] = [];
    const requirementsMet: string[] = [];
    const requirementsNotMet: string[] = [];
    const now = new Date().toISOString();

    // Identify PHI tables
    const phiPatterns = ['patient', 'health', 'medical', 'diagnosis', 'prescription', 'treatment', 'phi'];
    const phiTables = tables.filter(t =>
      phiPatterns.some(p => t.table.toLowerCase().includes(p))
    );

    // 164.312(a)(1): Access controls for PHI
    const protectedPHI = phiTables.filter(t => t.rls_enabled && t.policy_count > 0);
    if (protectedPHI.length === phiTables.length && phiTables.length > 0) {
      requirementsMet.push('164.312(a)(1): PHI tables have access controls');
    } else if (phiTables.length > 0) {
      requirementsNotMet.push('164.312(a)(1): Not all PHI tables have access controls');
      violations.push({
        code: 'HIPAA-RLS-001',
        message: 'PHI tables lack RLS protection',
        severity: 'critical',
        table: phiTables.find(t => !t.rls_enabled)?.table ?? '',
        compliance_standard: 'HIPAA',
        rule_reference: '45 CFR 164.312(a)(1)',
        detected_at: now
      });
    }

    // 164.312(d): Person authentication
    const authPolicies = policies.filter(p =>
      p.using_expression.toLowerCase().includes('auth') ||
      p.using_expression.toLowerCase().includes('user_id')
    );
    if (authPolicies.length > 0) {
      requirementsMet.push('164.312(d): Person/entity authentication in policies');
    } else if (phiTables.length > 0) {
      requirementsNotMet.push('164.312(d): No person authentication in RLS policies');
    }

    const score = requirementsMet.length / (requirementsMet.length + requirementsNotMet.length) * 100 || 0;

    return {
      standard: 'HIPAA',
      compliant: requirementsNotMet.length === 0,
      score: Math.round(score),
      requirements_met: requirementsMet,
      requirements_not_met: requirementsNotMet,
      violations,
      recommendations: []
    };
  }

  private checkPCIDSSCompliance(
    tables: TableRLSInfo[],
    policies: RLSPolicy[],
    coverage: RLSCoverageReport
  ): ComplianceCheckResult {
    const violations: RLSViolation[] = [];
    const requirementsMet: string[] = [];
    const requirementsNotMet: string[] = [];
    const now = new Date().toISOString();

    // Identify cardholder data tables
    const cardPatterns = ['card', 'payment', 'transaction', 'pan', 'cvv', 'cardholder'];
    const cardTables = tables.filter(t =>
      cardPatterns.some(p => t.table.toLowerCase().includes(p))
    );

    // Requirement 7: Restrict access to cardholder data
    const protectedCards = cardTables.filter(t => t.rls_enabled && t.policy_count > 0);
    if (protectedCards.length === cardTables.length && cardTables.length > 0) {
      requirementsMet.push('Req 7.1: Cardholder data tables have access controls');
    } else if (cardTables.length > 0) {
      requirementsNotMet.push('Req 7.1: Not all cardholder data tables protected');
      violations.push({
        code: 'PCI-RLS-001',
        message: 'Cardholder data tables lack RLS protection',
        severity: 'critical',
        table: cardTables.find(t => !t.rls_enabled)?.table ?? '',
        compliance_standard: 'PCI_DSS',
        rule_reference: 'PCI DSS Requirement 7.1',
        detected_at: now
      });
    }

    const score = requirementsMet.length / (requirementsMet.length + requirementsNotMet.length) * 100 || 0;

    return {
      standard: 'PCI_DSS',
      compliant: requirementsNotMet.length === 0,
      score: Math.round(score),
      requirements_met: requirementsMet,
      requirements_not_met: requirementsNotMet,
      violations,
      recommendations: []
    };
  }

  // ============================================================================
  // REPORT GENERATION
  // ============================================================================

  private generateJsonReport(result: RLSAuditResult): string {
    return JSON.stringify(result, null, 2);
  }

  private generateMarkdownReport(result: RLSAuditResult): string {
    const lines: string[] = [];

    lines.push('# RLS Audit Report');
    lines.push('');
    lines.push(`**Audit ID:** ${result.audit_id}`);
    lines.push(`**Timestamp:** ${result.timestamp}`);
    lines.push(`**Schema:** ${result.schema}`);
    lines.push(`**Risk Level:** ${result.risk_level.toUpperCase()}`);
    lines.push('');

    lines.push('## Executive Summary');
    lines.push('');
    lines.push(`- **Tables Audited:** ${result.tables_audited.length}`);
    lines.push(`- **Policies Found:** ${result.policies_found.length}`);
    lines.push(`- **RLS Coverage:** ${result.coverage.coverage_percentage}%`);
    lines.push(`- **Violations:** ${result.violations.length}`);
    lines.push(`- **Recommendations:** ${result.recommendations.length}`);
    lines.push('');

    lines.push('## Coverage Analysis');
    lines.push('');
    lines.push(`- Tables with RLS: ${result.coverage.tables_with_rls.length}`);
    lines.push(`- Tables without RLS: ${result.coverage.tables_without_rls.length}`);
    lines.push(`- Sensitive tables unprotected: ${result.coverage.sensitive_tables_unprotected.length}`);
    lines.push('');

    if (result.violations.length > 0) {
      lines.push('## Violations');
      lines.push('');
      for (const v of result.violations) {
        lines.push(`### ${v.code}: ${v.message}`);
        lines.push(`- **Severity:** ${v.severity}`);
        lines.push(`- **Table:** ${v.table}`);
        if (v.compliance_standard) {
          lines.push(`- **Compliance:** ${v.compliance_standard}`);
        }
        lines.push('');
      }
    }

    lines.push('## Compliance Status');
    lines.push('');
    for (const [standard, check] of Object.entries(result.compliance)) {
      const status = check.compliant ? 'COMPLIANT' : 'NON-COMPLIANT';
      lines.push(`### ${standard}: ${status} (${check.score}%)`);
      if (check.requirements_met.length > 0) {
        lines.push('**Met:**');
        for (const req of check.requirements_met) {
          lines.push(`- ${req}`);
        }
      }
      if (check.requirements_not_met.length > 0) {
        lines.push('**Not Met:**');
        for (const req of check.requirements_not_met) {
          lines.push(`- ${req}`);
        }
      }
      lines.push('');
    }

    if (result.recommendations.length > 0) {
      lines.push('## Recommendations');
      lines.push('');
      for (const rec of result.recommendations) {
        lines.push(`### [${rec.priority.toUpperCase()}] ${rec.title}`);
        lines.push(rec.description);
        lines.push('');
        lines.push('**Implementation Steps:**');
        for (const step of rec.implementation_steps) {
          lines.push(`1. ${step}`);
        }
        if (rec.sample_sql) {
          lines.push('');
          lines.push('**Sample SQL:**');
          lines.push('```sql');
          lines.push(rec.sample_sql);
          lines.push('```');
        }
        lines.push('');
      }
    }

    lines.push('---');
    lines.push(`*Generated by RLS Auditor v${result.auditor.version}*`);

    return lines.join('\n');
  }

  private generateHtmlReport(result: RLSAuditResult): string {
    const escapeHtml = (str: string) =>
      str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const riskColors: Record<string, string> = {
      low: '#28a745',
      medium: '#ffc107',
      high: '#fd7e14',
      critical: '#dc3545'
    };

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RLS Audit Report - ${escapeHtml(result.audit_id)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 2rem; color: #333; }
    h1 { color: #1a1a1a; }
    .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin: 1rem 0; }
    .card { background: #f8f9fa; border-radius: 8px; padding: 1rem; }
    .card h3 { margin: 0 0 0.5rem 0; color: #666; font-size: 0.875rem; text-transform: uppercase; }
    .card .value { font-size: 2rem; font-weight: bold; }
    .risk-badge { display: inline-block; padding: 0.25rem 0.75rem; border-radius: 4px; color: white; font-weight: bold; }
    .violation { border-left: 4px solid; padding: 1rem; margin: 1rem 0; background: #fff; }
    .violation.critical { border-color: #dc3545; }
    .violation.high { border-color: #fd7e14; }
    .violation.medium { border-color: #ffc107; }
    .violation.low { border-color: #28a745; }
    .compliance { margin: 1rem 0; }
    .compliance-bar { height: 20px; background: #e9ecef; border-radius: 10px; overflow: hidden; }
    .compliance-fill { height: 100%; transition: width 0.3s; }
    table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
    th, td { padding: 0.75rem; text-align: left; border-bottom: 1px solid #dee2e6; }
    th { background: #f8f9fa; }
    pre { background: #1a1a1a; color: #f8f8f2; padding: 1rem; border-radius: 4px; overflow-x: auto; }
  </style>
</head>
<body>
  <h1>RLS Audit Report</h1>
  <p><strong>Audit ID:</strong> ${escapeHtml(result.audit_id)}<br>
  <strong>Timestamp:</strong> ${escapeHtml(result.timestamp)}<br>
  <strong>Schema:</strong> ${escapeHtml(result.schema)}<br>
  <strong>Risk Level:</strong> <span class="risk-badge" style="background-color: ${riskColors[result.risk_level]}">${result.risk_level.toUpperCase()}</span></p>

  <h2>Executive Summary</h2>
  <div class="summary">
    <div class="card"><h3>Tables Audited</h3><div class="value">${result.tables_audited.length}</div></div>
    <div class="card"><h3>Policies Found</h3><div class="value">${result.policies_found.length}</div></div>
    <div class="card"><h3>RLS Coverage</h3><div class="value">${result.coverage.coverage_percentage}%</div></div>
    <div class="card"><h3>Violations</h3><div class="value" style="color: ${result.violations.length > 0 ? '#dc3545' : '#28a745'}">${result.violations.length}</div></div>
  </div>

  <h2>Compliance Status</h2>
  ${Object.entries(result.compliance).map(([standard, check]) => `
    <div class="compliance">
      <h3>${escapeHtml(standard)}: ${check.compliant ? 'COMPLIANT' : 'NON-COMPLIANT'}</h3>
      <div class="compliance-bar">
        <div class="compliance-fill" style="width: ${check.score}%; background-color: ${check.compliant ? '#28a745' : '#dc3545'}"></div>
      </div>
      <small>${check.score}% compliant</small>
    </div>
  `).join('')}

  ${result.violations.length > 0 ? `
    <h2>Violations</h2>
    ${result.violations.map(v => `
      <div class="violation ${v.severity}">
        <strong>${escapeHtml(v.code)}</strong>: ${escapeHtml(v.message)}<br>
        <small>Table: ${escapeHtml(v.table)} | Severity: ${v.severity.toUpperCase()}${v.compliance_standard ? ` | Compliance: ${v.compliance_standard}` : ''}</small>
      </div>
    `).join('')}
  ` : ''}

  ${result.recommendations.length > 0 ? `
    <h2>Recommendations</h2>
    ${result.recommendations.map(rec => `
      <div class="card">
        <h3>[${rec.priority.toUpperCase()}] ${escapeHtml(rec.title)}</h3>
        <p>${escapeHtml(rec.description)}</p>
        <p><strong>Affected Tables:</strong> ${rec.affected_tables.map(t => escapeHtml(t)).join(', ')}</p>
        ${rec.sample_sql ? `<pre>${escapeHtml(rec.sample_sql)}</pre>` : ''}
      </div>
    `).join('')}
  ` : ''}

  <hr>
  <p><small>Generated by RLS Auditor v${result.auditor.version} | Rules v${result.auditor.rules_version}</small></p>
</body>
</html>`;
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private isTableSensitive(tableName: string): boolean {
    const lowerName = tableName.toLowerCase();
    return this.sensitiveTablePatterns.some(pattern => lowerName.includes(pattern));
  }

  private calculateRiskLevel(
    violations: RLSViolation[],
    coverage: RLSCoverageReport
  ): 'low' | 'medium' | 'high' | 'critical' {
    const criticalViolations = violations.filter(v => v.severity === 'critical').length;
    const highViolations = violations.filter(v => v.severity === 'high').length;
    const sensitiveUnprotected = coverage.sensitive_tables_unprotected.length;

    if (criticalViolations > 0 || sensitiveUnprotected > 0) {
      return 'critical';
    }
    if (highViolations > 2 || coverage.coverage_percentage < 50) {
      return 'high';
    }
    if (highViolations > 0 || coverage.coverage_percentage < 80) {
      return 'medium';
    }
    return 'low';
  }

  private generateRLSSampleSQL(tableName: string): string {
    return `-- Enable RLS on the table
ALTER TABLE ${tableName} ENABLE ROW LEVEL SECURITY;

-- Force RLS for table owner (recommended)
ALTER TABLE ${tableName} FORCE ROW LEVEL SECURITY;

-- Create a policy for authenticated users to see their own rows
CREATE POLICY "Users can view own data"
  ON ${tableName}
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create a policy for inserting own data
CREATE POLICY "Users can insert own data"
  ON ${tableName}
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create a policy for updating own data
CREATE POLICY "Users can update own data"
  ON ${tableName}
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create a policy for deleting own data
CREATE POLICY "Users can delete own data"
  ON ${tableName}
  FOR DELETE
  USING (auth.uid() = user_id);`;
  }

  private async logAuditEvent(result: RLSAuditResult): Promise<void> {
    try {
      const logger = getAuditLogger();
      await logger.logAction(
        'execute',
        { type: 'system', id: 'rls-auditor' },
        { type: 'schema_audit', id: result.audit_id, name: result.schema },
        'red',
        result.violations.length === 0,
        {
          duration_ms: result.duration_ms,
          metadata: {
            tables_audited: result.tables_audited.length,
            policies_found: result.policies_found.length,
            violations: result.violations.length,
            coverage_percentage: result.coverage.coverage_percentage,
            risk_level: result.risk_level
          }
        }
      );
    } catch (error) {
      console.error('Failed to log RLS audit event:', error);
    }
  }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

let defaultAuditor: RLSAuditor | null = null;
let defaultValidator: RLSValidator | null = null;

/**
 * Get the default RLS Auditor instance
 */
export function getRLSAuditor(): RLSAuditor {
  if (!defaultAuditor) {
    defaultAuditor = new RLSAuditor();
  }
  return defaultAuditor;
}

/**
 * Get the default RLS Validator instance
 */
export function getRLSValidator(): RLSValidator {
  if (!defaultValidator) {
    defaultValidator = new RLSValidator();
  }
  return defaultValidator;
}

/**
 * Set a custom RLS Auditor instance
 */
export function setRLSAuditor(auditor: RLSAuditor): void {
  defaultAuditor = auditor;
}

/**
 * Set a custom RLS Validator instance
 */
export function setRLSValidator(validator: RLSValidator): void {
  defaultValidator = validator;
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Quick policy validation
 */
export function validatePolicy(policy: RLSPolicy): PolicyValidationResult {
  return getRLSValidator().validatePolicy(policy);
}

/**
 * Quick schema audit
 */
export async function auditSchema(
  schema: string,
  tables: TableRLSInfo[],
  policies: RLSPolicy[]
): Promise<RLSAuditResult> {
  return getRLSAuditor().auditSchema(schema, tables, policies);
}

/**
 * Generate audit report
 */
export function generateAuditReport(
  result: RLSAuditResult,
  format: ReportFormat = 'markdown'
): string {
  return getRLSAuditor().generateReport(result, format);
}

/**
 * Check RLS coverage for a schema
 */
export function checkCoverage(tables: TableRLSInfo[]): RLSCoverageReport {
  return getRLSValidator().checkCoverage(tables);
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  RLSValidator,
  RLSAuditor
};
