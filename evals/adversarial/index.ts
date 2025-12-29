/**
 * AgentOS Adversarial Test Suite
 *
 * Comprehensive security-focused test suite for evaluating agent robustness
 * against prompt injection, boundary violations, permission bypasses,
 * and hallucination attacks across all 21 agent packs.
 *
 * @module adversarial
 * @version 1.0.0
 */

// =============================================================================
// INJECTION TESTS
// =============================================================================

export {
  // Types
  InjectionTestCase,
  InjectionCategory,
  ExpectedBehavior,

  // Constants
  ALL_PACKS,

  // Test Arrays
  directOverrideTests,
  indirectInjectionTests,
  roleConfusionTests,
  contextManipulationTests,
  systemPromptExtractionTests,
  instructionSmugglingTests,
  delimiterAttackTests,
  encodingBypassTests,
  multiTurnManipulationTests,
  authorityImpersonationTests,
  packSpecificInjectionTests,
  allInjectionTests,

  // Utilities
  getTestsByCategory as getInjectionTestsByCategory,
  getTestsByPack as getInjectionTestsByPack,
  getTestsBySeverity as getInjectionTestsBySeverity,
  getCriticalTests as getCriticalInjectionTests,
  testStats as injectionTestStats
} from './injection_tests';

// =============================================================================
// BOUNDARY TESTS
// =============================================================================

export {
  // Types
  BoundaryTestCase,
  BoundaryCategory,
  BoundaryExpectedBehavior,
  ResourceImpact,

  // Test Arrays
  inputLengthTests,
  specialCharacterTests,
  unicodeEdgeCaseTests,
  numericLimitTests,
  formatAbuseTests,
  recursionDepthTests,
  rateLimitingTests,
  memoryExhaustionTests,
  timeoutAttackTests,
  nullHandlingTests,
  typeConfusionTests,
  pathTraversalTests,
  allBoundaryTests,

  // Utilities
  getTestsByCategory as getBoundaryTestsByCategory,
  getTestsByPack as getBoundaryTestsByPack,
  getTestsBySeverity as getBoundaryTestsBySeverity,
  getResourceIntensiveTests,
  resolveInput,
  boundaryTestStats
} from './boundary_tests';

// =============================================================================
// PERMISSION TESTS
// =============================================================================

export {
  // Types
  PermissionTestCase,
  PermissionCategory,
  PermissionExpectedBehavior,

  // Constants
  ZONE_RED_PACKS,
  ZONE_YELLOW_PACKS,
  ZONE_GREEN_PACKS,

  // Test Arrays
  horizontalEscalationTests,
  verticalEscalationTests,
  crossPackAccessTests,
  dataExfiltrationTests,
  actionAuthorizationTests,
  credentialTheftTests,
  sessionHijackingTests,
  roleManipulationTests,
  resourceAccessTests,
  apiAbuseTests,
  zoneViolationTests,
  auditBypassTests,
  allPermissionTests,

  // Utilities
  getTestsByCategory as getPermissionTestsByCategory,
  getTestsByPack as getPermissionTestsByPack,
  getTestsBySeverity as getPermissionTestsBySeverity,
  getRedZoneTests,
  getYellowZoneTests,
  getCriticalSecurityTests,
  permissionTestStats
} from './permission_tests';

// =============================================================================
// HALLUCINATION TESTS
// =============================================================================

export {
  // Types
  HallucinationTestCase,
  HallucinationCategory,
  HallucinationExpectedBehavior,

  // Test Arrays
  factualAccuracyTests,
  temporalConfusionTests,
  entityConfusionTests,
  capabilityOverstatementTests,
  sourceFabricationTests,
  numericalHallucinationTests,
  falseCausationTests,
  missingContextTests,
  confidenceCalibrationTests,
  knowledgeBoundaryTests,
  selfContradictionTests,
  authorityFabricationTests,
  packSpecificHallucinationTests,
  allHallucinationTests,

  // Utilities
  getTestsByCategory as getHallucinationTestsByCategory,
  getTestsByPack as getHallucinationTestsByPack,
  getTestsBySeverity as getHallucinationTestsBySeverity,
  getTestsWithTrapElements,
  getTestsWithGroundTruth,
  getCriticalAccuracyTests,
  hallucinationTestStats
} from './hallucination_tests';

// =============================================================================
// COMMON TYPES
// =============================================================================

import type { PackName } from './injection_tests';
import type { InjectionTestCase } from './injection_tests';
import type { BoundaryTestCase } from './boundary_tests';
import type { PermissionTestCase } from './permission_tests';
import type { HallucinationTestCase } from './hallucination_tests';

export type { PackName };

export type AdversarialTestCase =
  | InjectionTestCase
  | BoundaryTestCase
  | PermissionTestCase
  | HallucinationTestCase;

export type TestSeverity = 'critical' | 'high' | 'medium' | 'low';

export type TestSuite = 'injection' | 'boundary' | 'permission' | 'hallucination';

// =============================================================================
// COMBINED STATISTICS
// =============================================================================

import { testStats as injectionStats } from './injection_tests';
import { boundaryTestStats as boundaryStats } from './boundary_tests';
import { permissionTestStats as permissionStats } from './permission_tests';
import { hallucinationTestStats as hallucinationStats } from './hallucination_tests';

export const adversarialTestStats = {
  total: injectionStats.total + boundaryStats.total + permissionStats.total + hallucinationStats.total,

  bySuite: {
    injection: injectionStats.total,
    boundary: boundaryStats.total,
    permission: permissionStats.total,
    hallucination: hallucinationStats.total
  },

  bySeverity: {
    critical:
      injectionStats.bySeverity.critical +
      boundaryStats.bySeverity.critical +
      permissionStats.bySeverity.critical +
      hallucinationStats.bySeverity.critical,
    high:
      injectionStats.bySeverity.high +
      boundaryStats.bySeverity.high +
      permissionStats.bySeverity.high +
      hallucinationStats.bySeverity.high,
    medium:
      injectionStats.bySeverity.medium +
      boundaryStats.bySeverity.medium +
      permissionStats.bySeverity.medium +
      hallucinationStats.bySeverity.medium,
    low:
      injectionStats.bySeverity.low +
      boundaryStats.bySeverity.low +
      permissionStats.bySeverity.low +
      hallucinationStats.bySeverity.low
  },

  suiteStats: {
    injection: injectionStats,
    boundary: boundaryStats,
    permission: permissionStats,
    hallucination: hallucinationStats
  }
};

// =============================================================================
// COMBINED TEST ACCESSORS
// =============================================================================

import { allInjectionTests } from './injection_tests';
import { allBoundaryTests } from './boundary_tests';
import { allPermissionTests } from './permission_tests';
import { allHallucinationTests } from './hallucination_tests';

/**
 * Get all adversarial tests across all suites
 */
export function getAllAdversarialTests(): AdversarialTestCase[] {
  return [
    ...allInjectionTests,
    ...allBoundaryTests,
    ...allPermissionTests,
    ...allHallucinationTests
  ];
}

/**
 * Get all tests for a specific pack across all suites
 */
export function getAllTestsForPack(pack: PackName): AdversarialTestCase[] {
  return [
    ...allInjectionTests.filter(t => t.targetPacks.includes(pack)),
    ...allBoundaryTests.filter(t => t.targetPacks.includes(pack)),
    ...allPermissionTests.filter(t => t.targetPacks.includes(pack)),
    ...allHallucinationTests.filter(t => t.targetPacks.includes(pack))
  ];
}

/**
 * Get all critical severity tests across all suites
 */
export function getAllCriticalTests(): AdversarialTestCase[] {
  return [
    ...allInjectionTests.filter(t => t.severity === 'critical'),
    ...allBoundaryTests.filter(t => t.severity === 'critical'),
    ...allPermissionTests.filter(t => t.severity === 'critical'),
    ...allHallucinationTests.filter(t => t.severity === 'critical')
  ];
}

/**
 * Get tests by suite
 */
export function getTestsBySuite(suite: TestSuite): AdversarialTestCase[] {
  switch (suite) {
    case 'injection':
      return allInjectionTests;
    case 'boundary':
      return allBoundaryTests;
    case 'permission':
      return allPermissionTests;
    case 'hallucination':
      return allHallucinationTests;
  }
}

// =============================================================================
// TEST RUNNER INTERFACE
// =============================================================================

export interface TestResult {
  testId: string;
  suite: TestSuite;
  passed: boolean;
  actualBehavior: string;
  expectedBehavior: string;
  response?: string;
  duration?: number;
  error?: string;
}

export interface TestRunSummary {
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  results: TestResult[];
  bySuite: Record<TestSuite, { passed: number; failed: number }>;
  bySeverity: Record<TestSeverity, { passed: number; failed: number }>;
}

/**
 * Create an empty test run summary
 */
export function createEmptyTestRunSummary(): TestRunSummary {
  return {
    totalTests: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    duration: 0,
    results: [],
    bySuite: {
      injection: { passed: 0, failed: 0 },
      boundary: { passed: 0, failed: 0 },
      permission: { passed: 0, failed: 0 },
      hallucination: { passed: 0, failed: 0 }
    },
    bySeverity: {
      critical: { passed: 0, failed: 0 },
      high: { passed: 0, failed: 0 },
      medium: { passed: 0, failed: 0 },
      low: { passed: 0, failed: 0 }
    }
  };
}

// =============================================================================
// TEST FILTERS
// =============================================================================

export interface TestFilter {
  suites?: TestSuite[];
  packs?: PackName[];
  severities?: TestSeverity[];
  categories?: string[];
  maxTests?: number;
  excludeResourceIntensive?: boolean;
}

/**
 * Filter tests based on criteria
 */
export function filterTests(filter: TestFilter): AdversarialTestCase[] {
  let tests = getAllAdversarialTests();

  if (filter.suites && filter.suites.length > 0) {
    const suiteTests: AdversarialTestCase[] = [];
    for (const suite of filter.suites) {
      suiteTests.push(...getTestsBySuite(suite));
    }
    tests = suiteTests;
  }

  if (filter.packs && filter.packs.length > 0) {
    tests = tests.filter(t => t.targetPacks.some(p => filter.packs!.includes(p)));
  }

  if (filter.severities && filter.severities.length > 0) {
    tests = tests.filter(t => filter.severities!.includes(t.severity));
  }

  if (filter.excludeResourceIntensive) {
    tests = tests.filter(t => {
      if ('resourceImpact' in t) {
        const impact = (t as BoundaryTestCase).resourceImpact;
        return !(
          impact?.memory === 'extreme' ||
          impact?.cpu === 'extreme' ||
          impact?.time === 'excessive'
        );
      }
      return true;
    });
  }

  if (filter.maxTests && filter.maxTests > 0) {
    tests = tests.slice(0, filter.maxTests);
  }

  return tests;
}

// =============================================================================
// PACK COVERAGE ANALYSIS
// =============================================================================

export interface PackCoverage {
  pack: PackName;
  injectionTests: number;
  boundaryTests: number;
  permissionTests: number;
  hallucinationTests: number;
  total: number;
  criticalCount: number;
}

/**
 * Get coverage statistics for each pack
 */
export function getPackCoverage(): PackCoverage[] {
  const packs: PackName[] = [
    'analytics', 'data', 'design', 'devops', 'engineering',
    'error_predictor', 'finance', 'lead_faucet', 'legal', 'marketing',
    'mobile', 'operations', 'orchestration', 'planning', 'product',
    'qa', 'research', 'security', 'supabase'
  ];

  return packs.map(pack => {
    const injectionTests = allInjectionTests.filter(t => t.targetPacks.includes(pack));
    const boundaryTests = allBoundaryTests.filter(t => t.targetPacks.includes(pack));
    const permissionTests = allPermissionTests.filter(t => t.targetPacks.includes(pack));
    const hallucinationTests = allHallucinationTests.filter(t => t.targetPacks.includes(pack));

    const allPackTests = [
      ...injectionTests,
      ...boundaryTests,
      ...permissionTests,
      ...hallucinationTests
    ];

    return {
      pack,
      injectionTests: injectionTests.length,
      boundaryTests: boundaryTests.length,
      permissionTests: permissionTests.length,
      hallucinationTests: hallucinationTests.length,
      total: allPackTests.length,
      criticalCount: allPackTests.filter(t => t.severity === 'critical').length
    };
  });
}

// =============================================================================
// QUICK TEST PRESETS
// =============================================================================

/**
 * Get a quick smoke test set (critical tests only, limited count)
 */
export function getSmokeTestSet(): AdversarialTestCase[] {
  return filterTests({
    severities: ['critical'],
    maxTests: 20
  });
}

/**
 * Get security-focused test set
 */
export function getSecurityTestSet(): AdversarialTestCase[] {
  return filterTests({
    suites: ['injection', 'permission'],
    severities: ['critical', 'high']
  });
}

/**
 * Get robustness test set (boundary and hallucination)
 */
export function getRobustnessTestSet(): AdversarialTestCase[] {
  return filterTests({
    suites: ['boundary', 'hallucination'],
    excludeResourceIntensive: true
  });
}

/**
 * Get pack-specific test set for focused testing
 */
export function getPackTestSet(pack: PackName): AdversarialTestCase[] {
  return filterTests({
    packs: [pack]
  });
}

// =============================================================================
// PRINT STATS (for debugging)
// =============================================================================

export function printTestStats(): void {
  console.log('='.repeat(60));
  console.log('AGENTOS ADVERSARIAL TEST SUITE STATISTICS');
  console.log('='.repeat(60));
  console.log(`\nTotal Tests: ${adversarialTestStats.total}`);
  console.log('\nBy Suite:');
  console.log(`  Injection:     ${adversarialTestStats.bySuite.injection}`);
  console.log(`  Boundary:      ${adversarialTestStats.bySuite.boundary}`);
  console.log(`  Permission:    ${adversarialTestStats.bySuite.permission}`);
  console.log(`  Hallucination: ${adversarialTestStats.bySuite.hallucination}`);
  console.log('\nBy Severity:');
  console.log(`  Critical: ${adversarialTestStats.bySeverity.critical}`);
  console.log(`  High:     ${adversarialTestStats.bySeverity.high}`);
  console.log(`  Medium:   ${adversarialTestStats.bySeverity.medium}`);
  console.log(`  Low:      ${adversarialTestStats.bySeverity.low}`);
  console.log('\n' + '='.repeat(60));
}

// Export default statistics object for easy import
export default {
  stats: adversarialTestStats,
  getAllTests: getAllAdversarialTests,
  filterTests,
  getPackCoverage,
  getSmokeTestSet,
  getSecurityTestSet,
  getRobustnessTestSet,
  getPackTestSet
};
