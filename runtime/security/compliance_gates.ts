/**
 * compliance_gates.ts
 * Regulatory Compliance Gates for AgentOS
 *
 * Implements compliance enforcement for:
 * - TCPA (Telephone Consumer Protection Act) - Telemarketing restrictions
 * - CTIA (Cellular Telecommunications Industry Association) - SMS compliance
 * - GDPR (General Data Protection Regulation) - Data protection
 * - SOC2 (Service Organization Control 2) - Security audit compliance
 * - HIPAA (Health Insurance Portability and Accountability Act) - Health data
 *
 * LEGAL NOTICE: This code implements technical controls for regulatory compliance.
 * Actual legal compliance requires legal review and may vary by jurisdiction.
 *
 * @zone RED - Legal/Compliance zone, requires legal approval for changes
 * @impact_axes [C, E] - Cost (compliance fines) and Legal
 */

import * as crypto from 'crypto';
import { AuditLogger, getAuditLogger } from '../core/audit';
import { createEventId } from '../types/events';

// ============================================================================
// CORE TYPES
// ============================================================================

export type RegulationType = 'TCPA' | 'CTIA' | 'GDPR' | 'SOC2' | 'HIPAA';

export type ViolationSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface Violation {
  /** Violation code (e.g., TCPA-001) */
  code: string;

  /** Human-readable violation description */
  message: string;

  /** Regulation violated */
  regulation: RegulationType;

  /** Severity level */
  severity: ViolationSeverity;

  /** Specific rule or section violated */
  rule_reference?: string;

  /** Timestamp of violation */
  timestamp: string;

  /** Evidence for audit trail */
  evidence?: Record<string, unknown>;

  /** Potential legal exposure (USD) */
  exposure_usd?: number;
}

export interface ComplianceResult {
  /** Whether the action is allowed */
  allowed: boolean;

  /** List of violations found */
  violations: Violation[];

  /** Suggested remediation steps */
  remediation?: string;

  /** Unique audit trail ID */
  audit_id: string;

  /** Time taken for compliance check (ms) */
  check_duration_ms: number;

  /** Gate that performed the check */
  gate_id: string;

  /** Timestamp of check */
  checked_at: string;

  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

export interface ComplianceContext {
  /** Actor performing the action */
  actor: {
    id: string;
    type: 'agent' | 'user' | 'system';
    name?: string;
  };

  /** Action being performed */
  action: string;

  /** Target of the action */
  target?: {
    type: string;
    id: string;
    phone_number?: string;
    email?: string;
    country_code?: string;
    timezone?: string;
  };

  /** Request timestamp */
  timestamp: string;

  /** Additional context data */
  data?: Record<string, unknown>;

  /** Correlation ID for tracing */
  correlation_id?: string;

  /** Session ID */
  session_id?: string;
}

export interface ComplianceGate {
  /** Unique gate identifier */
  id: string;

  /** Gate name */
  name: string;

  /** Regulation this gate enforces */
  regulation: RegulationType;

  /** Gate description */
  description: string;

  /** Whether the gate is enabled */
  enabled: boolean;

  /** Priority (higher = checked first) */
  priority: number;

  /** Perform compliance check */
  check(context: ComplianceContext): Promise<ComplianceResult>;
}

// ============================================================================
// TCPA COMPLIANCE GATE
// Telephone Consumer Protection Act enforcement
// ============================================================================

export interface TCPAConfig {
  /** Time-of-day calling windows by timezone */
  calling_hours: {
    start_hour: number; // 8 AM local
    end_hour: number;   // 9 PM local
  };

  /** DNC (Do-Not-Call) list provider */
  dnc_provider?: {
    type: 'internal' | 'national' | 'custom';
    endpoint?: string;
    api_key?: string;
  };

  /** Consent tracking database */
  consent_tracking?: {
    enabled: boolean;
    cache_ttl_seconds: number;
  };

  /** Holiday blackout dates (ISO format) */
  holiday_blackouts?: string[];

  /** Maximum calls per recipient per day */
  max_calls_per_day: number;

  /** Abandoned call rate threshold */
  max_abandoned_rate: number;
}

export class TCPAComplianceGate implements ComplianceGate {
  id = 'tcpa-compliance-gate';
  name = 'TCPA Compliance Gate';
  regulation: RegulationType = 'TCPA';
  description = 'Enforces Telephone Consumer Protection Act requirements for telemarketing';
  enabled = true;
  priority = 100;

  private config: Required<TCPAConfig>;
  private dncCache: Map<string, { blocked: boolean; checked_at: string }> = new Map();
  private consentCache: Map<string, { consented: boolean; type: string; timestamp: string }> = new Map();
  private callCountCache: Map<string, { count: number; date: string }> = new Map();

  constructor(config: Partial<TCPAConfig> = {}) {
    this.config = {
      calling_hours: config.calling_hours ?? { start_hour: 8, end_hour: 21 },
      dnc_provider: config.dnc_provider ?? { type: 'internal' },
      consent_tracking: config.consent_tracking ?? { enabled: true, cache_ttl_seconds: 3600 },
      holiday_blackouts: config.holiday_blackouts ?? [],
      max_calls_per_day: config.max_calls_per_day ?? 3,
      max_abandoned_rate: config.max_abandoned_rate ?? 0.03 // 3% per FCC rules
    };
  }

  async check(context: ComplianceContext): Promise<ComplianceResult> {
    const startTime = Date.now();
    const violations: Violation[] = [];
    const audit_id = createEventId();

    // Check 1: Time-of-day restrictions
    const timeViolation = this.checkTimeOfDay(context);
    if (timeViolation) violations.push(timeViolation);

    // Check 2: Holiday blackouts
    const holidayViolation = this.checkHolidayBlackout(context);
    if (holidayViolation) violations.push(holidayViolation);

    // Check 3: Do-Not-Call list
    if (context.target?.phone_number) {
      const dncViolation = await this.checkDNCList(context.target.phone_number);
      if (dncViolation) violations.push(dncViolation);
    }

    // Check 4: Prior express consent
    if (context.target?.phone_number) {
      const consentViolation = await this.checkConsent(context);
      if (consentViolation) violations.push(consentViolation);
    }

    // Check 5: Call frequency limits
    if (context.target?.phone_number) {
      const frequencyViolation = this.checkCallFrequency(context.target.phone_number);
      if (frequencyViolation) violations.push(frequencyViolation);
    }

    // Check 6: Caller ID requirements
    const callerIdViolation = this.checkCallerId(context);
    if (callerIdViolation) violations.push(callerIdViolation);

    const result: ComplianceResult = {
      allowed: violations.length === 0,
      violations,
      remediation: this.generateRemediation(violations),
      audit_id,
      check_duration_ms: Date.now() - startTime,
      gate_id: this.id,
      checked_at: new Date().toISOString(),
      metadata: {
        target_phone: context.target?.phone_number ? this.maskPhone(context.target.phone_number) : undefined,
        timezone: context.target?.timezone
      }
    };

    // Log to audit trail
    await this.logComplianceCheck(context, result);

    return result;
  }

  private checkTimeOfDay(context: ComplianceContext): Violation | null {
    const timezone = context.target?.timezone ?? 'America/New_York';
    const now = new Date(context.timestamp);

    // Get local hour in target timezone
    const localHour = this.getLocalHour(now, timezone);

    if (localHour < this.config.calling_hours.start_hour ||
        localHour >= this.config.calling_hours.end_hour) {
      return {
        code: 'TCPA-001',
        message: `Call attempted outside allowed hours (${this.config.calling_hours.start_hour}:00-${this.config.calling_hours.end_hour}:00 local time)`,
        regulation: 'TCPA',
        severity: 'high',
        rule_reference: '47 CFR 64.1200(c)(1)',
        timestamp: context.timestamp,
        evidence: {
          local_hour: localHour,
          timezone,
          allowed_start: this.config.calling_hours.start_hour,
          allowed_end: this.config.calling_hours.end_hour
        },
        exposure_usd: 500 // Per call violation
      };
    }

    return null;
  }

  private checkHolidayBlackout(context: ComplianceContext): Violation | null {
    const dateStr = context.timestamp.split('T')[0];

    if (this.config.holiday_blackouts.includes(dateStr)) {
      return {
        code: 'TCPA-002',
        message: 'Call attempted on a blackout/holiday date',
        regulation: 'TCPA',
        severity: 'medium',
        timestamp: context.timestamp,
        evidence: { date: dateStr }
      };
    }

    return null;
  }

  private async checkDNCList(phoneNumber: string): Promise<Violation | null> {
    // Check cache first
    const normalized = this.normalizePhone(phoneNumber);
    const cached = this.dncCache.get(normalized);

    if (cached) {
      const cacheAge = Date.now() - new Date(cached.checked_at).getTime();
      if (cacheAge < 24 * 60 * 60 * 1000) { // 24 hour cache
        if (cached.blocked) {
          return {
            code: 'TCPA-003',
            message: 'Phone number is on the Do-Not-Call registry',
            regulation: 'TCPA',
            severity: 'critical',
            rule_reference: '47 CFR 64.1200(c)(2)',
            timestamp: new Date().toISOString(),
            evidence: { phone_hash: this.hashPhone(normalized) },
            exposure_usd: 43792 // Maximum statutory damages per call
          };
        }
        return null;
      }
    }

    // Query DNC list (simulated - in production, integrate with real DNC provider)
    const isBlocked = await this.queryDNCRegistry(normalized);

    // Update cache
    this.dncCache.set(normalized, {
      blocked: isBlocked,
      checked_at: new Date().toISOString()
    });

    if (isBlocked) {
      return {
        code: 'TCPA-003',
        message: 'Phone number is on the Do-Not-Call registry',
        regulation: 'TCPA',
        severity: 'critical',
        rule_reference: '47 CFR 64.1200(c)(2)',
        timestamp: new Date().toISOString(),
        evidence: { phone_hash: this.hashPhone(normalized) },
        exposure_usd: 43792
      };
    }

    return null;
  }

  private async checkConsent(context: ComplianceContext): Promise<Violation | null> {
    const phoneNumber = context.target?.phone_number;
    if (!phoneNumber) return null;

    const normalized = this.normalizePhone(phoneNumber);

    // Check consent cache
    const cached = this.consentCache.get(normalized);
    if (cached && cached.consented) {
      return null;
    }

    // For telemarketing calls, prior express written consent is required
    const hasConsent = await this.verifyConsent(normalized, context.action);

    if (!hasConsent) {
      return {
        code: 'TCPA-004',
        message: 'No prior express written consent on file for telemarketing call',
        regulation: 'TCPA',
        severity: 'critical',
        rule_reference: '47 CFR 64.1200(a)(2)',
        timestamp: context.timestamp,
        evidence: {
          phone_hash: this.hashPhone(normalized),
          action_type: context.action
        },
        exposure_usd: 1500 // Per call for willful violations
      };
    }

    return null;
  }

  private checkCallFrequency(phoneNumber: string): Violation | null {
    const normalized = this.normalizePhone(phoneNumber);
    const today = new Date().toISOString().split('T')[0];

    const cached = this.callCountCache.get(normalized);

    if (cached && cached.date === today) {
      if (cached.count >= this.config.max_calls_per_day) {
        return {
          code: 'TCPA-005',
          message: `Maximum daily call limit (${this.config.max_calls_per_day}) exceeded for this recipient`,
          regulation: 'TCPA',
          severity: 'medium',
          timestamp: new Date().toISOString(),
          evidence: {
            phone_hash: this.hashPhone(normalized),
            call_count: cached.count,
            limit: this.config.max_calls_per_day
          }
        };
      }
      cached.count++;
    } else {
      this.callCountCache.set(normalized, { count: 1, date: today });
    }

    return null;
  }

  private checkCallerId(context: ComplianceContext): Violation | null {
    const callerId = context.data?.caller_id as string | undefined;

    if (!callerId || callerId === 'anonymous' || callerId === 'blocked') {
      return {
        code: 'TCPA-006',
        message: 'Caller ID must be transmitted and accurate for telemarketing calls',
        regulation: 'TCPA',
        severity: 'high',
        rule_reference: '47 CFR 64.1601',
        timestamp: context.timestamp
      };
    }

    return null;
  }

  // Helper methods
  private getLocalHour(date: Date, timezone: string): number {
    try {
      const localTime = date.toLocaleString('en-US', {
        timeZone: timezone,
        hour: 'numeric',
        hour12: false
      });
      return parseInt(localTime, 10);
    } catch {
      // Fallback to UTC
      return date.getUTCHours();
    }
  }

  private normalizePhone(phone: string): string {
    return phone.replace(/\D/g, '');
  }

  private maskPhone(phone: string): string {
    const normalized = this.normalizePhone(phone);
    if (normalized.length < 4) return '****';
    return '***-***-' + normalized.slice(-4);
  }

  private hashPhone(phone: string): string {
    return crypto.createHash('sha256').update(phone).digest('hex').substring(0, 16);
  }

  private async queryDNCRegistry(phone: string): Promise<boolean> {
    // In production, integrate with:
    // - National DNC Registry API
    // - Internal DNC database
    // - State-specific DNC lists
    return false; // Placeholder
  }

  private async verifyConsent(phone: string, actionType: string): Promise<boolean> {
    // In production, query consent management system
    // Must verify: express written consent, date obtained, opt-in method
    return true; // Placeholder - MUST be replaced with real implementation
  }

  private generateRemediation(violations: Violation[]): string {
    if (violations.length === 0) return '';

    const remediations: string[] = [];

    for (const v of violations) {
      switch (v.code) {
        case 'TCPA-001':
          remediations.push('Reschedule call to be within allowed calling hours (8 AM - 9 PM local time).');
          break;
        case 'TCPA-002':
          remediations.push('Reschedule call to a non-holiday date.');
          break;
        case 'TCPA-003':
          remediations.push('Remove this number from call list immediately. Number is on DNC registry.');
          break;
        case 'TCPA-004':
          remediations.push('Obtain prior express written consent before calling this number.');
          break;
        case 'TCPA-005':
          remediations.push('Wait until tomorrow to contact this recipient again.');
          break;
        case 'TCPA-006':
          remediations.push('Ensure valid caller ID is configured and transmitted.');
          break;
      }
    }

    return remediations.join(' ');
  }

  private async logComplianceCheck(context: ComplianceContext, result: ComplianceResult): Promise<void> {
    const logger = getAuditLogger();
    await logger.logAction(
      'execute',
      { type: context.actor.type, id: context.actor.id },
      { type: 'compliance_gate', id: this.id, name: this.name },
      'red',
      result.allowed,
      {
        duration_ms: result.check_duration_ms,
        metadata: {
          regulation: this.regulation,
          violations: result.violations.map(v => v.code),
          audit_id: result.audit_id
        }
      }
    );
  }
}

// ============================================================================
// CTIA COMPLIANCE GATE
// SMS/MMS messaging compliance
// ============================================================================

export interface CTIAConfig {
  /** Opt-in verification settings */
  opt_in: {
    require_double_opt_in: boolean;
    max_age_days: number;
  };

  /** STOP/HELP keyword settings */
  keywords: {
    stop_words: string[];
    help_words: string[];
    response_required_seconds: number;
  };

  /** Rate limiting per recipient */
  rate_limits: {
    max_per_day: number;
    max_per_week: number;
    max_per_month: number;
  };

  /** Quiet hours */
  quiet_hours: {
    enabled: boolean;
    start_hour: number; // 21:00 local
    end_hour: number;   // 08:00 local
  };

  /** Content restrictions */
  content_restrictions: {
    max_message_length: number;
    require_opt_out_instructions: boolean;
    prohibited_content_patterns: string[];
  };
}

export class CTIAComplianceGate implements ComplianceGate {
  id = 'ctia-compliance-gate';
  name = 'CTIA Compliance Gate';
  regulation: RegulationType = 'CTIA';
  description = 'Enforces CTIA guidelines for SMS/MMS messaging compliance';
  enabled = true;
  priority = 100;

  private config: Required<CTIAConfig>;
  private optInCache: Map<string, { opted_in: boolean; type: string; timestamp: string }> = new Map();
  private optOutCache: Set<string> = new Set();
  private messageCountCache: Map<string, { daily: number; weekly: number; monthly: number; updated: string }> = new Map();

  constructor(config: Partial<CTIAConfig> = {}) {
    this.config = {
      opt_in: config.opt_in ?? { require_double_opt_in: true, max_age_days: 365 },
      keywords: config.keywords ?? {
        stop_words: ['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT'],
        help_words: ['HELP', 'INFO'],
        response_required_seconds: 5
      },
      rate_limits: config.rate_limits ?? {
        max_per_day: 5,
        max_per_week: 20,
        max_per_month: 60
      },
      quiet_hours: config.quiet_hours ?? {
        enabled: true,
        start_hour: 21,
        end_hour: 8
      },
      content_restrictions: config.content_restrictions ?? {
        max_message_length: 160,
        require_opt_out_instructions: true,
        prohibited_content_patterns: [
          'SHAFT', // Prohibited categories: Sex, Hate, Alcohol, Firearms, Tobacco
          'gambling',
          'cannabis',
          'prescription drugs'
        ]
      }
    };
  }

  async check(context: ComplianceContext): Promise<ComplianceResult> {
    const startTime = Date.now();
    const violations: Violation[] = [];
    const audit_id = createEventId();

    const phoneNumber = context.target?.phone_number;
    const messageContent = context.data?.message as string | undefined;

    // Check 1: Opt-in verification
    if (phoneNumber) {
      const optInViolation = await this.checkOptIn(phoneNumber, context);
      if (optInViolation) violations.push(optInViolation);
    }

    // Check 2: Opt-out status (STOP handling)
    if (phoneNumber) {
      const optOutViolation = this.checkOptOut(phoneNumber);
      if (optOutViolation) violations.push(optOutViolation);
    }

    // Check 3: Rate limiting
    if (phoneNumber) {
      const rateViolation = this.checkRateLimits(phoneNumber);
      if (rateViolation) violations.push(rateViolation);
    }

    // Check 4: Quiet hours
    if (context.target?.timezone) {
      const quietViolation = this.checkQuietHours(context);
      if (quietViolation) violations.push(quietViolation);
    }

    // Check 5: Message content
    if (messageContent) {
      const contentViolations = this.checkMessageContent(messageContent);
      violations.push(...contentViolations);
    }

    // Check 6: Sender ID compliance
    const senderViolation = this.checkSenderId(context);
    if (senderViolation) violations.push(senderViolation);

    const result: ComplianceResult = {
      allowed: violations.length === 0,
      violations,
      remediation: this.generateRemediation(violations),
      audit_id,
      check_duration_ms: Date.now() - startTime,
      gate_id: this.id,
      checked_at: new Date().toISOString()
    };

    await this.logComplianceCheck(context, result);

    return result;
  }

  private async checkOptIn(phoneNumber: string, context: ComplianceContext): Promise<Violation | null> {
    const normalized = this.normalizePhone(phoneNumber);

    // Check opt-in cache
    const cached = this.optInCache.get(normalized);

    if (!cached || !cached.opted_in) {
      return {
        code: 'CTIA-001',
        message: 'Recipient has not opted in to receive messages',
        regulation: 'CTIA',
        severity: 'critical',
        rule_reference: 'CTIA Messaging Principles 4.1',
        timestamp: context.timestamp,
        evidence: { phone_hash: this.hashPhone(normalized) },
        exposure_usd: 500
      };
    }

    // Check opt-in age
    const optInAge = Date.now() - new Date(cached.timestamp).getTime();
    const maxAge = this.config.opt_in.max_age_days * 24 * 60 * 60 * 1000;

    if (optInAge > maxAge) {
      return {
        code: 'CTIA-002',
        message: `Opt-in consent has expired (older than ${this.config.opt_in.max_age_days} days)`,
        regulation: 'CTIA',
        severity: 'high',
        timestamp: context.timestamp,
        evidence: {
          phone_hash: this.hashPhone(normalized),
          opt_in_date: cached.timestamp,
          max_age_days: this.config.opt_in.max_age_days
        }
      };
    }

    return null;
  }

  private checkOptOut(phoneNumber: string): Violation | null {
    const normalized = this.normalizePhone(phoneNumber);

    if (this.optOutCache.has(normalized)) {
      return {
        code: 'CTIA-003',
        message: 'Recipient has opted out (STOP received)',
        regulation: 'CTIA',
        severity: 'critical',
        rule_reference: 'CTIA Messaging Principles 5.1',
        timestamp: new Date().toISOString(),
        evidence: { phone_hash: this.hashPhone(normalized) },
        exposure_usd: 1500
      };
    }

    return null;
  }

  private checkRateLimits(phoneNumber: string): Violation | null {
    const normalized = this.normalizePhone(phoneNumber);
    const cached = this.messageCountCache.get(normalized);

    if (!cached) {
      this.messageCountCache.set(normalized, {
        daily: 1,
        weekly: 1,
        monthly: 1,
        updated: new Date().toISOString()
      });
      return null;
    }

    // Update counts (simplified - in production, use proper time windows)
    cached.daily++;
    cached.weekly++;
    cached.monthly++;

    if (cached.daily > this.config.rate_limits.max_per_day) {
      return {
        code: 'CTIA-004',
        message: `Daily message limit (${this.config.rate_limits.max_per_day}) exceeded`,
        regulation: 'CTIA',
        severity: 'medium',
        timestamp: new Date().toISOString(),
        evidence: {
          phone_hash: this.hashPhone(normalized),
          daily_count: cached.daily,
          limit: this.config.rate_limits.max_per_day
        }
      };
    }

    if (cached.weekly > this.config.rate_limits.max_per_week) {
      return {
        code: 'CTIA-005',
        message: `Weekly message limit (${this.config.rate_limits.max_per_week}) exceeded`,
        regulation: 'CTIA',
        severity: 'medium',
        timestamp: new Date().toISOString()
      };
    }

    return null;
  }

  private checkQuietHours(context: ComplianceContext): Violation | null {
    if (!this.config.quiet_hours.enabled) return null;

    const timezone = context.target?.timezone ?? 'America/New_York';
    const now = new Date(context.timestamp);
    const localHour = this.getLocalHour(now, timezone);

    const inQuietHours = (localHour >= this.config.quiet_hours.start_hour) ||
                         (localHour < this.config.quiet_hours.end_hour);

    if (inQuietHours) {
      return {
        code: 'CTIA-006',
        message: `Message attempted during quiet hours (${this.config.quiet_hours.start_hour}:00-${this.config.quiet_hours.end_hour}:00 local time)`,
        regulation: 'CTIA',
        severity: 'medium',
        timestamp: context.timestamp,
        evidence: {
          local_hour: localHour,
          timezone,
          quiet_start: this.config.quiet_hours.start_hour,
          quiet_end: this.config.quiet_hours.end_hour
        }
      };
    }

    return null;
  }

  private checkMessageContent(message: string): Violation[] {
    const violations: Violation[] = [];

    // Check message length
    if (message.length > this.config.content_restrictions.max_message_length) {
      violations.push({
        code: 'CTIA-007',
        message: `Message exceeds maximum length (${this.config.content_restrictions.max_message_length} characters)`,
        regulation: 'CTIA',
        severity: 'low',
        timestamp: new Date().toISOString(),
        evidence: {
          message_length: message.length,
          max_length: this.config.content_restrictions.max_message_length
        }
      });
    }

    // Check for required opt-out instructions
    if (this.config.content_restrictions.require_opt_out_instructions) {
      const hasOptOutInstructions = /reply\s+stop|text\s+stop|send\s+stop/i.test(message);
      if (!hasOptOutInstructions) {
        violations.push({
          code: 'CTIA-008',
          message: 'Message must include opt-out instructions (e.g., "Reply STOP to unsubscribe")',
          regulation: 'CTIA',
          severity: 'medium',
          rule_reference: 'CTIA Messaging Principles 5.1.3',
          timestamp: new Date().toISOString()
        });
      }
    }

    // Check for prohibited content
    for (const pattern of this.config.content_restrictions.prohibited_content_patterns) {
      if (message.toLowerCase().includes(pattern.toLowerCase())) {
        violations.push({
          code: 'CTIA-009',
          message: `Message contains prohibited content category`,
          regulation: 'CTIA',
          severity: 'high',
          rule_reference: 'CTIA Messaging Principles 7.0 (SHAFT)',
          timestamp: new Date().toISOString(),
          evidence: { matched_pattern: pattern }
        });
      }
    }

    return violations;
  }

  private checkSenderId(context: ComplianceContext): Violation | null {
    const senderId = context.data?.sender_id as string | undefined;

    if (!senderId) {
      return {
        code: 'CTIA-010',
        message: 'Sender ID (short code or long code) must be registered and disclosed',
        regulation: 'CTIA',
        severity: 'high',
        timestamp: context.timestamp
      };
    }

    return null;
  }

  /**
   * Process incoming STOP/HELP keywords
   */
  async processKeyword(phoneNumber: string, message: string): Promise<{
    keyword_type: 'stop' | 'help' | 'none';
    response_required: boolean;
    suggested_response?: string;
  }> {
    const normalized = message.trim().toUpperCase();

    if (this.config.keywords.stop_words.includes(normalized)) {
      // Add to opt-out cache
      this.optOutCache.add(this.normalizePhone(phoneNumber));

      return {
        keyword_type: 'stop',
        response_required: true,
        suggested_response: 'You have been unsubscribed and will not receive any more messages from this program. Reply START to resubscribe.'
      };
    }

    if (this.config.keywords.help_words.includes(normalized)) {
      return {
        keyword_type: 'help',
        response_required: true,
        suggested_response: 'For support, contact support@company.com or call 1-800-XXX-XXXX. Msg&Data rates may apply. Reply STOP to cancel.'
      };
    }

    return { keyword_type: 'none', response_required: false };
  }

  /**
   * Record opt-in consent
   */
  recordOptIn(phoneNumber: string, type: 'single' | 'double', source: string): void {
    const normalized = this.normalizePhone(phoneNumber);
    this.optInCache.set(normalized, {
      opted_in: true,
      type,
      timestamp: new Date().toISOString()
    });
    // Also remove from opt-out if they're re-subscribing
    this.optOutCache.delete(normalized);
  }

  // Helper methods
  private normalizePhone(phone: string): string {
    return phone.replace(/\D/g, '');
  }

  private hashPhone(phone: string): string {
    return crypto.createHash('sha256').update(phone).digest('hex').substring(0, 16);
  }

  private getLocalHour(date: Date, timezone: string): number {
    try {
      const localTime = date.toLocaleString('en-US', {
        timeZone: timezone,
        hour: 'numeric',
        hour12: false
      });
      return parseInt(localTime, 10);
    } catch {
      return date.getUTCHours();
    }
  }

  private generateRemediation(violations: Violation[]): string {
    if (violations.length === 0) return '';

    const remediations: string[] = [];

    for (const v of violations) {
      switch (v.code) {
        case 'CTIA-001':
          remediations.push('Obtain opt-in consent before sending messages.');
          break;
        case 'CTIA-002':
          remediations.push('Obtain fresh opt-in consent (current consent has expired).');
          break;
        case 'CTIA-003':
          remediations.push('Recipient has opted out. Do not send messages until they opt back in.');
          break;
        case 'CTIA-004':
        case 'CTIA-005':
          remediations.push('Wait for rate limit period to reset before sending more messages.');
          break;
        case 'CTIA-006':
          remediations.push('Reschedule message for non-quiet hours.');
          break;
        case 'CTIA-008':
          remediations.push('Add opt-out instructions to message content.');
          break;
        case 'CTIA-009':
          remediations.push('Remove prohibited content from message.');
          break;
      }
    }

    return remediations.join(' ');
  }

  private async logComplianceCheck(context: ComplianceContext, result: ComplianceResult): Promise<void> {
    const logger = getAuditLogger();
    await logger.logAction(
      'execute',
      { type: context.actor.type, id: context.actor.id },
      { type: 'compliance_gate', id: this.id, name: this.name },
      'red',
      result.allowed,
      {
        duration_ms: result.check_duration_ms,
        metadata: {
          regulation: this.regulation,
          violations: result.violations.map(v => v.code),
          audit_id: result.audit_id
        }
      }
    );
  }
}

// ============================================================================
// GDPR COMPLIANCE GATE
// General Data Protection Regulation enforcement
// ============================================================================

export interface GDPRConfig {
  /** Data subject rights handling */
  data_subject_rights: {
    enabled: boolean;
    request_response_days: number; // Max 30 days per GDPR
  };

  /** Consent management */
  consent: {
    require_explicit: boolean;
    track_purpose: boolean;
    max_age_days: number;
  };

  /** Cross-border transfer rules */
  cross_border: {
    adequacy_countries: string[]; // Countries with adequacy decisions
    require_sccs: boolean; // Standard Contractual Clauses
    block_transfers_to: string[]; // Blocked countries
  };

  /** Data minimization */
  data_minimization: {
    enforce: boolean;
    retention_days: Record<string, number>;
  };

  /** Breach notification */
  breach_notification: {
    notify_authority_hours: number; // 72 hours per GDPR
    notify_subjects: boolean;
  };
}

export type DataSubjectRight =
  | 'access'      // Article 15 - Right of access
  | 'rectification' // Article 16 - Right to rectification
  | 'erasure'     // Article 17 - Right to erasure (right to be forgotten)
  | 'restriction' // Article 18 - Right to restriction
  | 'portability' // Article 20 - Right to data portability
  | 'objection';  // Article 21 - Right to object

export interface DataSubjectRequest {
  id: string;
  type: DataSubjectRight;
  subject_id: string;
  subject_email?: string;
  requested_at: string;
  deadline: string;
  status: 'pending' | 'in_progress' | 'completed' | 'rejected';
  completed_at?: string;
  notes?: string;
}

export class GDPRComplianceGate implements ComplianceGate {
  id = 'gdpr-compliance-gate';
  name = 'GDPR Compliance Gate';
  regulation: RegulationType = 'GDPR';
  description = 'Enforces General Data Protection Regulation requirements';
  enabled = true;
  priority = 100;

  private config: Required<GDPRConfig>;
  private consentRecords: Map<string, {
    purposes: string[];
    timestamp: string;
    explicit: boolean;
    legal_basis: string;
  }> = new Map();
  private pendingRequests: Map<string, DataSubjectRequest> = new Map();
  private processingRegistry: Map<string, {
    purpose: string;
    legal_basis: string;
    categories: string[];
    retention_days: number;
  }> = new Map();

  constructor(config: Partial<GDPRConfig> = {}) {
    this.config = {
      data_subject_rights: config.data_subject_rights ?? {
        enabled: true,
        request_response_days: 30
      },
      consent: config.consent ?? {
        require_explicit: true,
        track_purpose: true,
        max_age_days: 365
      },
      cross_border: config.cross_border ?? {
        adequacy_countries: [
          'AD', 'AR', 'CA', 'FO', 'GG', 'IL', 'IM', 'JP', 'JE', 'NZ',
          'KR', 'CH', 'GB', 'UY' // EU adequacy decision countries
        ],
        require_sccs: true,
        block_transfers_to: []
      },
      data_minimization: config.data_minimization ?? {
        enforce: true,
        retention_days: {
          'personal_data': 365,
          'sensitive_data': 90,
          'marketing_data': 730
        }
      },
      breach_notification: config.breach_notification ?? {
        notify_authority_hours: 72,
        notify_subjects: true
      }
    };
  }

  async check(context: ComplianceContext): Promise<ComplianceResult> {
    const startTime = Date.now();
    const violations: Violation[] = [];
    const audit_id = createEventId();

    const subjectId = context.data?.subject_id as string | undefined;
    const countryCode = context.target?.country_code;

    // Check 1: Lawful basis for processing
    const basisViolation = this.checkLawfulBasis(context);
    if (basisViolation) violations.push(basisViolation);

    // Check 2: Consent verification
    if (subjectId) {
      const consentViolation = this.checkConsent(subjectId, context);
      if (consentViolation) violations.push(consentViolation);
    }

    // Check 3: Pending data subject requests
    if (subjectId) {
      const dsrViolation = this.checkDataSubjectRequests(subjectId);
      if (dsrViolation) violations.push(dsrViolation);
    }

    // Check 4: Cross-border transfer restrictions
    if (countryCode) {
      const transferViolation = this.checkCrossBorderTransfer(countryCode, context);
      if (transferViolation) violations.push(transferViolation);
    }

    // Check 5: Data minimization
    const minimizationViolation = this.checkDataMinimization(context);
    if (minimizationViolation) violations.push(minimizationViolation);

    // Check 6: Purpose limitation
    const purposeViolation = this.checkPurposeLimitation(context);
    if (purposeViolation) violations.push(purposeViolation);

    // Check 7: Storage limitation
    const retentionViolation = this.checkRetentionPeriod(context);
    if (retentionViolation) violations.push(retentionViolation);

    const result: ComplianceResult = {
      allowed: violations.length === 0,
      violations,
      remediation: this.generateRemediation(violations),
      audit_id,
      check_duration_ms: Date.now() - startTime,
      gate_id: this.id,
      checked_at: new Date().toISOString(),
      metadata: {
        subject_id: subjectId ? this.hashSubjectId(subjectId) : undefined,
        target_country: countryCode
      }
    };

    await this.logComplianceCheck(context, result);

    return result;
  }

  private checkLawfulBasis(context: ComplianceContext): Violation | null {
    const legalBasis = context.data?.legal_basis as string | undefined;

    const validBases = [
      'consent',           // Article 6(1)(a)
      'contract',          // Article 6(1)(b)
      'legal_obligation',  // Article 6(1)(c)
      'vital_interests',   // Article 6(1)(d)
      'public_task',       // Article 6(1)(e)
      'legitimate_interest' // Article 6(1)(f)
    ];

    if (!legalBasis || !validBases.includes(legalBasis)) {
      return {
        code: 'GDPR-001',
        message: 'No valid lawful basis for processing personal data',
        regulation: 'GDPR',
        severity: 'critical',
        rule_reference: 'Article 6 - Lawfulness of processing',
        timestamp: context.timestamp,
        evidence: { provided_basis: legalBasis },
        exposure_usd: 20000000 // GDPR max fine 20M EUR or 4% revenue
      };
    }

    return null;
  }

  private checkConsent(subjectId: string, context: ComplianceContext): Violation | null {
    const legalBasis = context.data?.legal_basis as string;

    // Only check consent if that's the legal basis
    if (legalBasis !== 'consent') return null;

    const consent = this.consentRecords.get(subjectId);

    if (!consent) {
      return {
        code: 'GDPR-002',
        message: 'No consent record found for data subject',
        regulation: 'GDPR',
        severity: 'critical',
        rule_reference: 'Article 7 - Conditions for consent',
        timestamp: context.timestamp
      };
    }

    // Check if consent is explicit when required
    if (this.config.consent.require_explicit && !consent.explicit) {
      return {
        code: 'GDPR-003',
        message: 'Explicit consent required but not obtained',
        regulation: 'GDPR',
        severity: 'high',
        rule_reference: 'Article 9(2)(a) - Explicit consent for special categories',
        timestamp: context.timestamp
      };
    }

    // Check consent age
    const consentAge = Date.now() - new Date(consent.timestamp).getTime();
    const maxAge = this.config.consent.max_age_days * 24 * 60 * 60 * 1000;

    if (consentAge > maxAge) {
      return {
        code: 'GDPR-004',
        message: `Consent has expired (older than ${this.config.consent.max_age_days} days)`,
        regulation: 'GDPR',
        severity: 'medium',
        timestamp: context.timestamp,
        evidence: {
          consent_date: consent.timestamp,
          max_age_days: this.config.consent.max_age_days
        }
      };
    }

    // Check purpose match
    const requestedPurpose = context.data?.purpose as string | undefined;
    if (requestedPurpose && !consent.purposes.includes(requestedPurpose)) {
      return {
        code: 'GDPR-005',
        message: 'Processing purpose not covered by consent',
        regulation: 'GDPR',
        severity: 'high',
        rule_reference: 'Article 5(1)(b) - Purpose limitation',
        timestamp: context.timestamp,
        evidence: {
          requested_purpose: requestedPurpose,
          consented_purposes: consent.purposes
        }
      };
    }

    return null;
  }

  private checkDataSubjectRequests(subjectId: string): Violation | null {
    // Check for pending erasure or restriction requests
    for (const [, request] of this.pendingRequests) {
      if (request.subject_id === subjectId && request.status === 'pending') {
        if (request.type === 'erasure' || request.type === 'restriction') {
          return {
            code: 'GDPR-006',
            message: `Pending ${request.type} request for this data subject`,
            regulation: 'GDPR',
            severity: 'critical',
            rule_reference: request.type === 'erasure'
              ? 'Article 17 - Right to erasure'
              : 'Article 18 - Right to restriction',
            timestamp: new Date().toISOString(),
            evidence: {
              request_id: request.id,
              request_type: request.type,
              requested_at: request.requested_at,
              deadline: request.deadline
            }
          };
        }
      }
    }

    return null;
  }

  private checkCrossBorderTransfer(countryCode: string, context: ComplianceContext): Violation | null {
    // Check if country is in EU/EEA
    const euEeaCountries = [
      'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
      'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
      'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', // EU
      'IS', 'LI', 'NO' // EEA
    ];

    if (euEeaCountries.includes(countryCode)) {
      return null; // Transfer within EU/EEA is allowed
    }

    // Check blocked countries
    if (this.config.cross_border.block_transfers_to.includes(countryCode)) {
      return {
        code: 'GDPR-007',
        message: `Data transfer to ${countryCode} is explicitly blocked`,
        regulation: 'GDPR',
        severity: 'critical',
        rule_reference: 'Chapter V - Transfers of personal data to third countries',
        timestamp: context.timestamp,
        evidence: { target_country: countryCode }
      };
    }

    // Check adequacy decisions
    if (this.config.cross_border.adequacy_countries.includes(countryCode)) {
      return null; // Country has adequacy decision
    }

    // Check for appropriate safeguards
    const hasSCCs = context.data?.has_sccs as boolean | undefined;
    const hasBindingRules = context.data?.has_bcr as boolean | undefined;

    if (!hasSCCs && !hasBindingRules) {
      return {
        code: 'GDPR-008',
        message: `Transfer to ${countryCode} requires appropriate safeguards (SCCs or BCR)`,
        regulation: 'GDPR',
        severity: 'high',
        rule_reference: 'Article 46 - Transfers subject to appropriate safeguards',
        timestamp: context.timestamp,
        evidence: { target_country: countryCode }
      };
    }

    return null;
  }

  private checkDataMinimization(context: ComplianceContext): Violation | null {
    if (!this.config.data_minimization.enforce) return null;

    const dataFields = context.data?.fields as string[] | undefined;
    const requiredFields = context.data?.required_fields as string[] | undefined;

    if (dataFields && requiredFields) {
      const unnecessaryFields = dataFields.filter(f => !requiredFields.includes(f));

      if (unnecessaryFields.length > 0) {
        return {
          code: 'GDPR-009',
          message: 'Data collection exceeds what is necessary for the purpose',
          regulation: 'GDPR',
          severity: 'medium',
          rule_reference: 'Article 5(1)(c) - Data minimisation',
          timestamp: context.timestamp,
          evidence: {
            unnecessary_fields: unnecessaryFields
          }
        };
      }
    }

    return null;
  }

  private checkPurposeLimitation(context: ComplianceContext): Violation | null {
    const processingId = context.data?.processing_id as string | undefined;
    const purpose = context.data?.purpose as string | undefined;

    if (!processingId || !purpose) return null;

    const registration = this.processingRegistry.get(processingId);

    if (registration && registration.purpose !== purpose) {
      return {
        code: 'GDPR-010',
        message: 'Processing purpose differs from registered purpose',
        regulation: 'GDPR',
        severity: 'high',
        rule_reference: 'Article 5(1)(b) - Purpose limitation',
        timestamp: context.timestamp,
        evidence: {
          registered_purpose: registration.purpose,
          attempted_purpose: purpose
        }
      };
    }

    return null;
  }

  private checkRetentionPeriod(context: ComplianceContext): Violation | null {
    const dataAge = context.data?.data_age_days as number | undefined;
    const dataCategory = context.data?.data_category as string | undefined;

    if (!dataAge || !dataCategory) return null;

    const maxRetention = this.config.data_minimization.retention_days[dataCategory] ??
                         this.config.data_minimization.retention_days['personal_data'] ?? 365;

    if (dataAge > maxRetention) {
      return {
        code: 'GDPR-011',
        message: `Data exceeds retention period (${maxRetention} days)`,
        regulation: 'GDPR',
        severity: 'medium',
        rule_reference: 'Article 5(1)(e) - Storage limitation',
        timestamp: context.timestamp,
        evidence: {
          data_category: dataCategory,
          data_age_days: dataAge,
          max_retention_days: maxRetention
        }
      };
    }

    return null;
  }

  /**
   * Record a data subject rights request
   */
  recordDSR(request: Omit<DataSubjectRequest, 'id' | 'deadline'>): DataSubjectRequest {
    const id = createEventId();
    const deadline = new Date(
      Date.now() + this.config.data_subject_rights.request_response_days * 24 * 60 * 60 * 1000
    ).toISOString();

    const fullRequest: DataSubjectRequest = {
      ...request,
      id,
      deadline
    };

    this.pendingRequests.set(id, fullRequest);
    return fullRequest;
  }

  /**
   * Complete a data subject request
   */
  completeDSR(requestId: string): boolean {
    const request = this.pendingRequests.get(requestId);
    if (!request) return false;

    request.status = 'completed';
    request.completed_at = new Date().toISOString();
    return true;
  }

  /**
   * Record consent
   */
  recordConsent(
    subjectId: string,
    purposes: string[],
    explicit: boolean,
    legalBasis: string
  ): void {
    this.consentRecords.set(subjectId, {
      purposes,
      timestamp: new Date().toISOString(),
      explicit,
      legal_basis: legalBasis
    });
  }

  /**
   * Withdraw consent
   */
  withdrawConsent(subjectId: string): boolean {
    return this.consentRecords.delete(subjectId);
  }

  // Helper methods
  private hashSubjectId(subjectId: string): string {
    return crypto.createHash('sha256').update(subjectId).digest('hex').substring(0, 16);
  }

  private generateRemediation(violations: Violation[]): string {
    if (violations.length === 0) return '';

    const remediations: string[] = [];

    for (const v of violations) {
      switch (v.code) {
        case 'GDPR-001':
          remediations.push('Establish a valid lawful basis before processing.');
          break;
        case 'GDPR-002':
        case 'GDPR-003':
          remediations.push('Obtain valid consent from the data subject.');
          break;
        case 'GDPR-006':
          remediations.push('Complete pending data subject request before processing.');
          break;
        case 'GDPR-007':
        case 'GDPR-008':
          remediations.push('Implement appropriate safeguards for cross-border transfer.');
          break;
        case 'GDPR-009':
          remediations.push('Remove unnecessary data fields to comply with data minimization.');
          break;
        case 'GDPR-011':
          remediations.push('Delete or anonymize data that has exceeded retention period.');
          break;
      }
    }

    return remediations.join(' ');
  }

  private async logComplianceCheck(context: ComplianceContext, result: ComplianceResult): Promise<void> {
    const logger = getAuditLogger();
    await logger.logAction(
      'execute',
      { type: context.actor.type, id: context.actor.id },
      { type: 'compliance_gate', id: this.id, name: this.name },
      'red',
      result.allowed,
      {
        duration_ms: result.check_duration_ms,
        metadata: {
          regulation: this.regulation,
          violations: result.violations.map(v => v.code),
          audit_id: result.audit_id
        }
      }
    );
  }
}

// ============================================================================
// SOC2 COMPLIANCE GATE
// Service Organization Control 2 - Security & Availability
// ============================================================================

export interface SOC2Config {
  /** Access control settings */
  access_control: {
    require_mfa: boolean;
    session_timeout_minutes: number;
    max_failed_attempts: number;
  };

  /** Audit logging settings */
  audit_logging: {
    enabled: boolean;
    retention_days: number;
    real_time: boolean;
  };

  /** Anomaly detection */
  anomaly_detection: {
    enabled: boolean;
    sensitivity: 'low' | 'medium' | 'high';
    alert_threshold: number;
  };

  /** Change management */
  change_management: {
    require_approval: boolean;
    require_documentation: boolean;
  };
}

export interface AccessLogEntry {
  id: string;
  actor_id: string;
  actor_type: string;
  action: string;
  resource: string;
  timestamp: string;
  ip_address?: string;
  user_agent?: string;
  success: boolean;
  risk_score?: number;
}

export class SOC2ComplianceGate implements ComplianceGate {
  id = 'soc2-compliance-gate';
  name = 'SOC2 Compliance Gate';
  regulation: RegulationType = 'SOC2';
  description = 'Enforces SOC2 Trust Services Criteria for security and availability';
  enabled = true;
  priority = 100;

  private config: Required<SOC2Config>;
  private accessLog: AccessLogEntry[] = [];
  private failedAttempts: Map<string, { count: number; last_attempt: string }> = new Map();
  private anomalyScores: Map<string, number[]> = new Map();

  constructor(config: Partial<SOC2Config> = {}) {
    this.config = {
      access_control: config.access_control ?? {
        require_mfa: true,
        session_timeout_minutes: 30,
        max_failed_attempts: 5
      },
      audit_logging: config.audit_logging ?? {
        enabled: true,
        retention_days: 365,
        real_time: true
      },
      anomaly_detection: config.anomaly_detection ?? {
        enabled: true,
        sensitivity: 'medium',
        alert_threshold: 0.8
      },
      change_management: config.change_management ?? {
        require_approval: true,
        require_documentation: true
      }
    };
  }

  async check(context: ComplianceContext): Promise<ComplianceResult> {
    const startTime = Date.now();
    const violations: Violation[] = [];
    const audit_id = createEventId();

    // Check 1: Access control - MFA requirement
    const mfaViolation = this.checkMFARequirement(context);
    if (mfaViolation) violations.push(mfaViolation);

    // Check 2: Session timeout
    const sessionViolation = this.checkSessionTimeout(context);
    if (sessionViolation) violations.push(sessionViolation);

    // Check 3: Failed login attempts
    const lockoutViolation = this.checkAccountLockout(context);
    if (lockoutViolation) violations.push(lockoutViolation);

    // Check 4: Anomaly detection
    if (this.config.anomaly_detection.enabled) {
      const anomalyViolation = await this.checkForAnomalies(context);
      if (anomalyViolation) violations.push(anomalyViolation);
    }

    // Check 5: Change management
    if (this.isChangeOperation(context.action)) {
      const changeViolations = this.checkChangeManagement(context);
      violations.push(...changeViolations);
    }

    // Check 6: Audit logging compliance
    const auditViolation = this.checkAuditCompliance(context);
    if (auditViolation) violations.push(auditViolation);

    // Always log access for SOC2
    await this.logAccess(context, violations.length === 0);

    const result: ComplianceResult = {
      allowed: violations.length === 0,
      violations,
      remediation: this.generateRemediation(violations),
      audit_id,
      check_duration_ms: Date.now() - startTime,
      gate_id: this.id,
      checked_at: new Date().toISOString(),
      metadata: {
        actor_id: context.actor.id,
        action: context.action,
        anomaly_score: this.calculateAnomalyScore(context)
      }
    };

    await this.logComplianceCheck(context, result);

    return result;
  }

  private checkMFARequirement(context: ComplianceContext): Violation | null {
    if (!this.config.access_control.require_mfa) return null;

    const hasMFA = context.data?.mfa_verified as boolean | undefined;

    if (!hasMFA) {
      return {
        code: 'SOC2-001',
        message: 'Multi-factor authentication required but not verified',
        regulation: 'SOC2',
        severity: 'high',
        rule_reference: 'CC6.1 - Logical Access Controls',
        timestamp: context.timestamp
      };
    }

    return null;
  }

  private checkSessionTimeout(context: ComplianceContext): Violation | null {
    const sessionStart = context.data?.session_started_at as string | undefined;

    if (!sessionStart) return null;

    const sessionAge = Date.now() - new Date(sessionStart).getTime();
    const maxAge = this.config.access_control.session_timeout_minutes * 60 * 1000;

    if (sessionAge > maxAge) {
      return {
        code: 'SOC2-002',
        message: `Session has expired (timeout: ${this.config.access_control.session_timeout_minutes} minutes)`,
        regulation: 'SOC2',
        severity: 'medium',
        rule_reference: 'CC6.1 - Session Management',
        timestamp: context.timestamp,
        evidence: {
          session_age_minutes: Math.floor(sessionAge / 60000),
          timeout_minutes: this.config.access_control.session_timeout_minutes
        }
      };
    }

    return null;
  }

  private checkAccountLockout(context: ComplianceContext): Violation | null {
    const actorId = context.actor.id;
    const attempts = this.failedAttempts.get(actorId);

    if (attempts && attempts.count >= this.config.access_control.max_failed_attempts) {
      // Check if lockout period has passed (30 minutes)
      const lockoutEnd = new Date(attempts.last_attempt).getTime() + 30 * 60 * 1000;

      if (Date.now() < lockoutEnd) {
        return {
          code: 'SOC2-003',
          message: `Account locked due to ${attempts.count} failed login attempts`,
          regulation: 'SOC2',
          severity: 'high',
          rule_reference: 'CC6.1 - Account Lockout',
          timestamp: context.timestamp,
          evidence: {
            failed_attempts: attempts.count,
            lockout_until: new Date(lockoutEnd).toISOString()
          }
        };
      } else {
        // Reset after lockout period
        this.failedAttempts.delete(actorId);
      }
    }

    return null;
  }

  private async checkForAnomalies(context: ComplianceContext): Promise<Violation | null> {
    const anomalyScore = this.calculateAnomalyScore(context);

    // Store score for trend analysis
    const actorScores = this.anomalyScores.get(context.actor.id) ?? [];
    actorScores.push(anomalyScore);
    if (actorScores.length > 100) actorScores.shift();
    this.anomalyScores.set(context.actor.id, actorScores);

    if (anomalyScore > this.config.anomaly_detection.alert_threshold) {
      return {
        code: 'SOC2-004',
        message: 'Anomalous activity detected',
        regulation: 'SOC2',
        severity: 'high',
        rule_reference: 'CC7.2 - Security Event Monitoring',
        timestamp: context.timestamp,
        evidence: {
          anomaly_score: anomalyScore,
          threshold: this.config.anomaly_detection.alert_threshold,
          indicators: this.getAnomalyIndicators(context)
        }
      };
    }

    return null;
  }

  private checkChangeManagement(context: ComplianceContext): Violation[] {
    const violations: Violation[] = [];

    if (this.config.change_management.require_approval) {
      const hasApproval = context.data?.change_approved as boolean | undefined;
      const approver = context.data?.approved_by as string | undefined;

      if (!hasApproval || !approver) {
        violations.push({
          code: 'SOC2-005',
          message: 'Change requires approval before implementation',
          regulation: 'SOC2',
          severity: 'high',
          rule_reference: 'CC8.1 - Change Management',
          timestamp: context.timestamp
        });
      }
    }

    if (this.config.change_management.require_documentation) {
      const hasDocumentation = context.data?.change_documented as boolean | undefined;

      if (!hasDocumentation) {
        violations.push({
          code: 'SOC2-006',
          message: 'Change requires documentation',
          regulation: 'SOC2',
          severity: 'medium',
          rule_reference: 'CC8.1 - Change Documentation',
          timestamp: context.timestamp
        });
      }
    }

    return violations;
  }

  private checkAuditCompliance(context: ComplianceContext): Violation | null {
    if (!this.config.audit_logging.enabled) {
      return {
        code: 'SOC2-007',
        message: 'Audit logging is disabled but required for SOC2 compliance',
        regulation: 'SOC2',
        severity: 'critical',
        rule_reference: 'CC7.2 - Audit Logging',
        timestamp: context.timestamp
      };
    }

    return null;
  }

  private calculateAnomalyScore(context: ComplianceContext): number {
    let score = 0;

    // Unusual time of access
    const hour = new Date(context.timestamp).getUTCHours();
    if (hour < 6 || hour > 22) score += 0.2;

    // New IP address
    const isNewIP = context.data?.is_new_ip as boolean | undefined;
    if (isNewIP) score += 0.3;

    // Sensitive resource access
    const resourceSensitivity = context.data?.resource_sensitivity as number | undefined;
    if (resourceSensitivity && resourceSensitivity > 7) score += 0.3;

    // High volume of requests
    const recentRequestCount = context.data?.recent_request_count as number | undefined;
    if (recentRequestCount && recentRequestCount > 100) score += 0.2;

    // Apply sensitivity multiplier
    const sensitivityMultiplier = {
      low: 0.7,
      medium: 1.0,
      high: 1.3
    };

    return Math.min(score * sensitivityMultiplier[this.config.anomaly_detection.sensitivity], 1.0);
  }

  private getAnomalyIndicators(context: ComplianceContext): string[] {
    const indicators: string[] = [];

    const hour = new Date(context.timestamp).getUTCHours();
    if (hour < 6 || hour > 22) indicators.push('unusual_access_time');

    if (context.data?.is_new_ip) indicators.push('new_ip_address');
    if ((context.data?.resource_sensitivity as number) > 7) indicators.push('sensitive_resource');
    if ((context.data?.recent_request_count as number) > 100) indicators.push('high_request_volume');

    return indicators;
  }

  private isChangeOperation(action: string): boolean {
    const changeOperations = ['create', 'update', 'delete', 'deploy', 'configure'];
    return changeOperations.some(op => action.toLowerCase().includes(op));
  }

  /**
   * Record a failed login attempt
   */
  recordFailedAttempt(actorId: string): void {
    const current = this.failedAttempts.get(actorId) ?? { count: 0, last_attempt: '' };
    current.count++;
    current.last_attempt = new Date().toISOString();
    this.failedAttempts.set(actorId, current);
  }

  /**
   * Clear failed attempts on successful login
   */
  clearFailedAttempts(actorId: string): void {
    this.failedAttempts.delete(actorId);
  }

  /**
   * Get access log entries
   */
  getAccessLog(filters?: {
    actor_id?: string;
    start_time?: string;
    end_time?: string;
    limit?: number;
  }): AccessLogEntry[] {
    let entries = [...this.accessLog];

    if (filters?.actor_id) {
      entries = entries.filter(e => e.actor_id === filters.actor_id);
    }

    if (filters?.start_time) {
      entries = entries.filter(e => e.timestamp >= filters.start_time!);
    }

    if (filters?.end_time) {
      entries = entries.filter(e => e.timestamp <= filters.end_time!);
    }

    // Sort by timestamp descending
    entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    if (filters?.limit) {
      entries = entries.slice(0, filters.limit);
    }

    return entries;
  }

  private async logAccess(context: ComplianceContext, success: boolean): Promise<void> {
    const entry: AccessLogEntry = {
      id: createEventId(),
      actor_id: context.actor.id,
      actor_type: context.actor.type,
      action: context.action,
      resource: context.target?.type ?? 'unknown',
      timestamp: context.timestamp,
      ip_address: context.data?.ip_address as string | undefined,
      user_agent: context.data?.user_agent as string | undefined,
      success,
      risk_score: this.calculateAnomalyScore(context)
    };

    this.accessLog.push(entry);

    // Enforce retention
    const retentionCutoff = new Date(
      Date.now() - this.config.audit_logging.retention_days * 24 * 60 * 60 * 1000
    ).toISOString();

    this.accessLog = this.accessLog.filter(e => e.timestamp >= retentionCutoff);
  }

  private generateRemediation(violations: Violation[]): string {
    if (violations.length === 0) return '';

    const remediations: string[] = [];

    for (const v of violations) {
      switch (v.code) {
        case 'SOC2-001':
          remediations.push('Complete MFA verification before accessing this resource.');
          break;
        case 'SOC2-002':
          remediations.push('Re-authenticate to create a new session.');
          break;
        case 'SOC2-003':
          remediations.push('Account is locked. Wait for lockout period to expire or contact administrator.');
          break;
        case 'SOC2-004':
          remediations.push('Unusual activity detected. Additional verification may be required.');
          break;
        case 'SOC2-005':
          remediations.push('Obtain approval before implementing this change.');
          break;
        case 'SOC2-006':
          remediations.push('Document this change in the change management system.');
          break;
      }
    }

    return remediations.join(' ');
  }

  private async logComplianceCheck(context: ComplianceContext, result: ComplianceResult): Promise<void> {
    const logger = getAuditLogger();
    await logger.logAction(
      'execute',
      { type: context.actor.type, id: context.actor.id },
      { type: 'compliance_gate', id: this.id, name: this.name },
      'red',
      result.allowed,
      {
        duration_ms: result.check_duration_ms,
        metadata: {
          regulation: this.regulation,
          violations: result.violations.map(v => v.code),
          audit_id: result.audit_id
        }
      }
    );
  }
}

// ============================================================================
// HIPAA COMPLIANCE GATE
// Health Insurance Portability and Accountability Act
// ============================================================================

export interface HIPAAConfig {
  /** PHI access controls */
  phi_access: {
    require_authorization: boolean;
    minimum_necessary: boolean;
    log_all_access: boolean;
  };

  /** Encryption requirements */
  encryption: {
    require_at_rest: boolean;
    require_in_transit: boolean;
    min_key_length: number;
  };

  /** Breach notification */
  breach_notification: {
    notify_within_days: number;
    notify_hhs: boolean;
    notify_patients: boolean;
  };
}

export class HIPAAComplianceGate implements ComplianceGate {
  id = 'hipaa-compliance-gate';
  name = 'HIPAA Compliance Gate';
  regulation: RegulationType = 'HIPAA';
  description = 'Enforces HIPAA requirements for protected health information';
  enabled = true;
  priority = 100;

  private config: Required<HIPAAConfig>;
  private authorizationRecords: Map<string, { authorized: boolean; scope: string[]; expires: string }> = new Map();

  constructor(config: Partial<HIPAAConfig> = {}) {
    this.config = {
      phi_access: config.phi_access ?? {
        require_authorization: true,
        minimum_necessary: true,
        log_all_access: true
      },
      encryption: config.encryption ?? {
        require_at_rest: true,
        require_in_transit: true,
        min_key_length: 256
      },
      breach_notification: config.breach_notification ?? {
        notify_within_days: 60,
        notify_hhs: true,
        notify_patients: true
      }
    };
  }

  async check(context: ComplianceContext): Promise<ComplianceResult> {
    const startTime = Date.now();
    const violations: Violation[] = [];
    const audit_id = createEventId();

    const isPHI = context.data?.contains_phi as boolean | undefined;

    if (isPHI) {
      // Check 1: Authorization
      const authViolation = this.checkAuthorization(context);
      if (authViolation) violations.push(authViolation);

      // Check 2: Minimum necessary
      const minNecessaryViolation = this.checkMinimumNecessary(context);
      if (minNecessaryViolation) violations.push(minNecessaryViolation);

      // Check 3: Encryption at rest
      const encryptionAtRestViolation = this.checkEncryptionAtRest(context);
      if (encryptionAtRestViolation) violations.push(encryptionAtRestViolation);

      // Check 4: Encryption in transit
      const encryptionInTransitViolation = this.checkEncryptionInTransit(context);
      if (encryptionInTransitViolation) violations.push(encryptionInTransitViolation);

      // Check 5: Business Associate Agreement
      const baaViolation = this.checkBAA(context);
      if (baaViolation) violations.push(baaViolation);
    }

    const result: ComplianceResult = {
      allowed: violations.length === 0,
      violations,
      remediation: this.generateRemediation(violations),
      audit_id,
      check_duration_ms: Date.now() - startTime,
      gate_id: this.id,
      checked_at: new Date().toISOString()
    };

    // Always log PHI access
    if (isPHI && this.config.phi_access.log_all_access) {
      await this.logPHIAccess(context, result);
    }

    await this.logComplianceCheck(context, result);

    return result;
  }

  private checkAuthorization(context: ComplianceContext): Violation | null {
    if (!this.config.phi_access.require_authorization) return null;

    const patientId = context.data?.patient_id as string | undefined;
    if (!patientId) return null;

    const auth = this.authorizationRecords.get(`${context.actor.id}:${patientId}`);

    if (!auth || !auth.authorized) {
      return {
        code: 'HIPAA-001',
        message: 'No valid authorization to access PHI',
        regulation: 'HIPAA',
        severity: 'critical',
        rule_reference: '45 CFR 164.508 - Uses and disclosures for which authorization is required',
        timestamp: context.timestamp,
        exposure_usd: 1500000 // HIPAA max penalty per violation
      };
    }

    // Check if authorization has expired
    if (new Date(auth.expires) < new Date(context.timestamp)) {
      return {
        code: 'HIPAA-002',
        message: 'Authorization to access PHI has expired',
        regulation: 'HIPAA',
        severity: 'high',
        timestamp: context.timestamp,
        evidence: {
          expires: auth.expires
        }
      };
    }

    return null;
  }

  private checkMinimumNecessary(context: ComplianceContext): Violation | null {
    if (!this.config.phi_access.minimum_necessary) return null;

    const requestedFields = context.data?.requested_fields as string[] | undefined;
    const requiredFields = context.data?.required_fields as string[] | undefined;

    if (requestedFields && requiredFields) {
      const excessFields = requestedFields.filter(f => !requiredFields.includes(f));

      if (excessFields.length > 0) {
        return {
          code: 'HIPAA-003',
          message: 'Request exceeds minimum necessary PHI',
          regulation: 'HIPAA',
          severity: 'medium',
          rule_reference: '45 CFR 164.502(b) - Minimum Necessary',
          timestamp: context.timestamp,
          evidence: {
            excess_fields: excessFields.length
          }
        };
      }
    }

    return null;
  }

  private checkEncryptionAtRest(context: ComplianceContext): Violation | null {
    if (!this.config.encryption.require_at_rest) return null;

    const isEncryptedAtRest = context.data?.encrypted_at_rest as boolean | undefined;

    if (!isEncryptedAtRest) {
      return {
        code: 'HIPAA-004',
        message: 'PHI must be encrypted at rest',
        regulation: 'HIPAA',
        severity: 'high',
        rule_reference: '45 CFR 164.312(a)(2)(iv) - Encryption and Decryption',
        timestamp: context.timestamp
      };
    }

    return null;
  }

  private checkEncryptionInTransit(context: ComplianceContext): Violation | null {
    if (!this.config.encryption.require_in_transit) return null;

    const isEncryptedInTransit = context.data?.encrypted_in_transit as boolean | undefined;

    if (!isEncryptedInTransit) {
      return {
        code: 'HIPAA-005',
        message: 'PHI must be encrypted in transit',
        regulation: 'HIPAA',
        severity: 'high',
        rule_reference: '45 CFR 164.312(e)(1) - Transmission Security',
        timestamp: context.timestamp
      };
    }

    return null;
  }

  private checkBAA(context: ComplianceContext): Violation | null {
    const isThirdParty = context.data?.third_party_access as boolean | undefined;
    const hasBAA = context.data?.has_baa as boolean | undefined;

    if (isThirdParty && !hasBAA) {
      return {
        code: 'HIPAA-006',
        message: 'Business Associate Agreement required for third-party access to PHI',
        regulation: 'HIPAA',
        severity: 'critical',
        rule_reference: '45 CFR 164.502(e) - Business Associates',
        timestamp: context.timestamp
      };
    }

    return null;
  }

  /**
   * Grant authorization for PHI access
   */
  grantAuthorization(
    actorId: string,
    patientId: string,
    scope: string[],
    expiresInDays: number
  ): void {
    const expires = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString();
    this.authorizationRecords.set(`${actorId}:${patientId}`, {
      authorized: true,
      scope,
      expires
    });
  }

  /**
   * Revoke authorization
   */
  revokeAuthorization(actorId: string, patientId: string): void {
    this.authorizationRecords.delete(`${actorId}:${patientId}`);
  }

  private async logPHIAccess(context: ComplianceContext, result: ComplianceResult): Promise<void> {
    const logger = getAuditLogger();
    await logger.logAction(
      context.action as 'read' | 'create' | 'update' | 'delete' | 'execute',
      { type: context.actor.type, id: context.actor.id },
      { type: 'phi', id: context.data?.patient_id as string ?? 'unknown' },
      'red',
      result.allowed,
      {
        metadata: {
          action_type: context.action,
          contains_phi: true,
          audit_id: result.audit_id
        }
      }
    );
  }

  private generateRemediation(violations: Violation[]): string {
    if (violations.length === 0) return '';

    const remediations: string[] = [];

    for (const v of violations) {
      switch (v.code) {
        case 'HIPAA-001':
        case 'HIPAA-002':
          remediations.push('Obtain valid authorization before accessing PHI.');
          break;
        case 'HIPAA-003':
          remediations.push('Request only the minimum necessary PHI.');
          break;
        case 'HIPAA-004':
          remediations.push('Ensure PHI is stored with encryption at rest.');
          break;
        case 'HIPAA-005':
          remediations.push('Use encrypted connection (TLS) for PHI transmission.');
          break;
        case 'HIPAA-006':
          remediations.push('Execute Business Associate Agreement before sharing PHI.');
          break;
      }
    }

    return remediations.join(' ');
  }

  private async logComplianceCheck(context: ComplianceContext, result: ComplianceResult): Promise<void> {
    const logger = getAuditLogger();
    await logger.logAction(
      'execute',
      { type: context.actor.type, id: context.actor.id },
      { type: 'compliance_gate', id: this.id, name: this.name },
      'red',
      result.allowed,
      {
        duration_ms: result.check_duration_ms,
        metadata: {
          regulation: this.regulation,
          violations: result.violations.map(v => v.code),
          audit_id: result.audit_id
        }
      }
    );
  }
}

// ============================================================================
// COMPLIANCE GATE REGISTRY
// Central registry for managing all compliance gates
// ============================================================================

export class ComplianceGateRegistry {
  private gates: Map<string, ComplianceGate> = new Map();

  /**
   * Register a compliance gate
   */
  register(gate: ComplianceGate): void {
    this.gates.set(gate.id, gate);
  }

  /**
   * Unregister a compliance gate
   */
  unregister(gateId: string): boolean {
    return this.gates.delete(gateId);
  }

  /**
   * Get a gate by ID
   */
  get(gateId: string): ComplianceGate | undefined {
    return this.gates.get(gateId);
  }

  /**
   * Get gates by regulation
   */
  getByRegulation(regulation: RegulationType): ComplianceGate[] {
    return Array.from(this.gates.values())
      .filter(g => g.regulation === regulation && g.enabled);
  }

  /**
   * Get all enabled gates sorted by priority
   */
  getAllEnabled(): ComplianceGate[] {
    return Array.from(this.gates.values())
      .filter(g => g.enabled)
      .sort((a, b) => b.priority - a.priority);
  }

  /**
   * Run all applicable gates
   */
  async checkAll(
    context: ComplianceContext,
    regulations?: RegulationType[]
  ): Promise<{
    overall_allowed: boolean;
    results: Map<string, ComplianceResult>;
    summary: {
      gates_checked: number;
      gates_passed: number;
      gates_failed: number;
      total_violations: number;
      critical_violations: number;
    };
  }> {
    const results = new Map<string, ComplianceResult>();
    let gatesPassed = 0;
    let gatesFailed = 0;
    let totalViolations = 0;
    let criticalViolations = 0;

    const gates = regulations
      ? this.getAllEnabled().filter(g => regulations.includes(g.regulation))
      : this.getAllEnabled();

    for (const gate of gates) {
      try {
        const result = await gate.check(context);
        results.set(gate.id, result);

        if (result.allowed) {
          gatesPassed++;
        } else {
          gatesFailed++;
        }

        totalViolations += result.violations.length;
        criticalViolations += result.violations.filter(v => v.severity === 'critical').length;
      } catch (error) {
        // Log error and fail closed (deny access)
        const errorResult: ComplianceResult = {
          allowed: false,
          violations: [{
            code: 'GATE-ERROR',
            message: `Compliance gate error: ${(error as Error).message}`,
            regulation: gate.regulation,
            severity: 'critical',
            timestamp: new Date().toISOString()
          }],
          audit_id: createEventId(),
          check_duration_ms: 0,
          gate_id: gate.id,
          checked_at: new Date().toISOString()
        };
        results.set(gate.id, errorResult);
        gatesFailed++;
        totalViolations++;
        criticalViolations++;
      }
    }

    return {
      overall_allowed: gatesFailed === 0,
      results,
      summary: {
        gates_checked: gates.length,
        gates_passed: gatesPassed,
        gates_failed: gatesFailed,
        total_violations: totalViolations,
        critical_violations: criticalViolations
      }
    };
  }
}

// ============================================================================
// SINGLETON AND CONVENIENCE FUNCTIONS
// ============================================================================

let defaultRegistry: ComplianceGateRegistry | null = null;

/**
 * Get the default compliance gate registry
 */
export function getComplianceRegistry(): ComplianceGateRegistry {
  if (!defaultRegistry) {
    defaultRegistry = new ComplianceGateRegistry();

    // Register default gates
    defaultRegistry.register(new TCPAComplianceGate());
    defaultRegistry.register(new CTIAComplianceGate());
    defaultRegistry.register(new GDPRComplianceGate());
    defaultRegistry.register(new SOC2ComplianceGate());
    defaultRegistry.register(new HIPAAComplianceGate());
  }
  return defaultRegistry;
}

/**
 * Set a custom compliance gate registry
 */
export function setComplianceRegistry(registry: ComplianceGateRegistry): void {
  defaultRegistry = registry;
}

/**
 * Quick compliance check
 */
export async function checkCompliance(
  context: ComplianceContext,
  regulations?: RegulationType[]
): Promise<{
  allowed: boolean;
  violations: Violation[];
  remediation: string;
}> {
  const registry = getComplianceRegistry();
  const result = await registry.checkAll(context, regulations);

  const allViolations: Violation[] = [];
  const remediations: string[] = [];

  for (const [, gateResult] of result.results) {
    allViolations.push(...gateResult.violations);
    if (gateResult.remediation) {
      remediations.push(gateResult.remediation);
    }
  }

  return {
    allowed: result.overall_allowed,
    violations: allViolations,
    remediation: remediations.join(' ')
  };
}

/**
 * Check TCPA compliance for a call
 */
export async function checkTCPA(
  phoneNumber: string,
  timezone: string,
  actorId: string
): Promise<ComplianceResult> {
  const gate = getComplianceRegistry().get('tcpa-compliance-gate') as TCPAComplianceGate;
  return gate.check({
    actor: { id: actorId, type: 'agent' },
    action: 'telemarketing_call',
    target: {
      type: 'phone',
      id: phoneNumber,
      phone_number: phoneNumber,
      timezone
    },
    timestamp: new Date().toISOString()
  });
}

/**
 * Check CTIA compliance for an SMS
 */
export async function checkCTIA(
  phoneNumber: string,
  message: string,
  actorId: string
): Promise<ComplianceResult> {
  const gate = getComplianceRegistry().get('ctia-compliance-gate') as CTIAComplianceGate;
  return gate.check({
    actor: { id: actorId, type: 'agent' },
    action: 'send_sms',
    target: {
      type: 'phone',
      id: phoneNumber,
      phone_number: phoneNumber
    },
    timestamp: new Date().toISOString(),
    data: { message }
  });
}

/**
 * Check GDPR compliance for data processing
 */
export async function checkGDPR(
  subjectId: string,
  purpose: string,
  countryCode: string,
  actorId: string
): Promise<ComplianceResult> {
  const gate = getComplianceRegistry().get('gdpr-compliance-gate') as GDPRComplianceGate;
  return gate.check({
    actor: { id: actorId, type: 'agent' },
    action: 'process_personal_data',
    target: {
      type: 'data_subject',
      id: subjectId,
      country_code: countryCode
    },
    timestamp: new Date().toISOString(),
    data: {
      subject_id: subjectId,
      purpose,
      legal_basis: 'consent'
    }
  });
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  TCPAComplianceGate,
  CTIAComplianceGate,
  GDPRComplianceGate,
  SOC2ComplianceGate,
  HIPAAComplianceGate,
  ComplianceGateRegistry
};
