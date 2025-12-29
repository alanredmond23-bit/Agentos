/**
 * pii_redactor.ts
 * HIPAA/GDPR-compliant PII detection and redaction module
 * Supports multiple redaction modes with context preservation
 */

import * as crypto from 'crypto';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Supported PII types for detection and redaction
 */
export type PIIType =
  | 'email'
  | 'phone'
  | 'ssn'
  | 'credit_card'
  | 'name'
  | 'address'
  | 'ip_address'
  | 'date_of_birth'
  | 'passport'
  | 'drivers_license'
  | 'tax_id'
  | 'bank_account'
  | 'medical_record'
  | 'custom';

/**
 * Redaction mode determining how PII is replaced
 */
export type RedactionMode = 'mask' | 'hash' | 'tokenize' | 'remove';

/**
 * Configuration for the PII redactor
 */
export interface RedactorConfig {
  /** Redaction mode to apply */
  mode: RedactionMode;

  /** PII types to detect and redact */
  types: PIIType[];

  /** Custom regex patterns for additional PII detection */
  customPatterns?: CustomPattern[];

  /** Allowlist of values to skip redaction */
  allowlist?: string[];

  /** Secret key for hashing (required for 'hash' mode) */
  hashSecret?: string;

  /** Token prefix for tokenized values */
  tokenPrefix?: string;

  /** Enable context-aware detection (slower but more accurate) */
  contextAware?: boolean;

  /** Log redaction events */
  logRedactions?: boolean;

  /** Custom logger function */
  logger?: (event: RedactionEvent) => void;
}

/**
 * Custom pattern definition
 */
export interface CustomPattern {
  /** Pattern identifier */
  name: string;

  /** Regular expression for detection */
  pattern: RegExp;

  /** Optional validation function */
  validate?: (match: string) => boolean;

  /** Label for redaction placeholder */
  label?: string;
}

/**
 * Individual PII detection result
 */
export interface PIIMatch {
  /** Type of PII detected */
  type: PIIType;

  /** Original value matched */
  value: string;

  /** Start position in original text */
  startIndex: number;

  /** End position in original text */
  endIndex: number;

  /** Confidence score (0-1) */
  confidence: number;

  /** Context surrounding the match */
  context?: string;

  /** Redacted replacement value */
  replacement: string;
}

/**
 * Result of redaction operation
 */
export interface RedactionResult {
  /** Redacted text output */
  redactedText: string;

  /** Original text (for reference, should not be stored) */
  originalLength: number;

  /** List of PII matches found and redacted */
  matches: PIIMatch[];

  /** Total number of redactions applied */
  redactionCount: number;

  /** Processing time in milliseconds */
  processingTimeMs: number;

  /** Checksum of original for verification */
  originalChecksum: string;

  /** Whether redaction was successful */
  success: boolean;

  /** Any errors encountered */
  errors?: string[];
}

/**
 * Redaction event for logging
 */
export interface RedactionEvent {
  /** Event timestamp */
  timestamp: string;

  /** Event type */
  type: 'detection' | 'redaction' | 'error';

  /** PII type involved */
  piiType: PIIType;

  /** Redaction mode used */
  mode: RedactionMode;

  /** Original length (not value) */
  originalLength: number;

  /** Context (sanitized) */
  context?: string;

  /** Error message if applicable */
  error?: string;
}

/**
 * Token storage for reversible tokenization
 */
export interface TokenEntry {
  /** Token identifier */
  token: string;

  /** Original value (encrypted) */
  encryptedValue: string;

  /** PII type */
  type: PIIType;

  /** Creation timestamp */
  createdAt: string;

  /** Expiration timestamp */
  expiresAt?: string;

  /** Access count */
  accessCount: number;
}

// ============================================================================
// PII DETECTION PATTERNS
// ============================================================================

/**
 * Email detection pattern
 * RFC 5322 compliant with common extensions
 */
const EMAIL_PATTERN = /\b[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\b/g;

/**
 * Phone number patterns for various formats
 */
const PHONE_PATTERNS = {
  // US format: (123) 456-7890, 123-456-7890, 123.456.7890, +1 123 456 7890
  US: /(?:\+?1[-.\s]?)?\(?[2-9][0-9]{2}\)?[-.\s]?[2-9][0-9]{2}[-.\s]?[0-9]{4}\b/g,

  // International format with country code
  INTL: /\+[1-9][0-9]{0,3}[-.\s]?(?:\([0-9]{1,4}\)|[0-9]{1,4})[-.\s]?[0-9]{1,4}[-.\s]?[0-9]{1,9}\b/g,

  // UK format
  UK: /(?:\+44|0)[-.\s]?(?:7[0-9]{3}|[1-9][0-9]{2,4})[-.\s]?[0-9]{3,4}[-.\s]?[0-9]{3,4}\b/g,

  // Generic international
  GENERIC: /\b(?:\+?[0-9]{1,4}[-.\s]?)?(?:\([0-9]{1,4}\)[-.\s]?)?[0-9]{2,4}[-.\s]?[0-9]{2,4}[-.\s]?[0-9]{2,4}\b/g
};

/**
 * SSN pattern (US Social Security Number)
 * Format: XXX-XX-XXXX or XXXXXXXXX
 */
const SSN_PATTERN = /\b(?!000|666|9\d{2})\d{3}[-\s]?(?!00)\d{2}[-\s]?(?!0000)\d{4}\b/g;

/**
 * Credit card patterns by card type
 */
const CREDIT_CARD_PATTERNS = {
  // Visa: starts with 4
  VISA: /\b4[0-9]{3}[-\s]?[0-9]{4}[-\s]?[0-9]{4}[-\s]?[0-9]{4}\b/g,

  // Mastercard: starts with 51-55 or 2221-2720
  MASTERCARD: /\b(?:5[1-5][0-9]{2}|222[1-9]|22[3-9][0-9]|2[3-6][0-9]{2}|27[01][0-9]|2720)[-\s]?[0-9]{4}[-\s]?[0-9]{4}[-\s]?[0-9]{4}\b/g,

  // Amex: starts with 34 or 37
  AMEX: /\b3[47][0-9]{2}[-\s]?[0-9]{6}[-\s]?[0-9]{5}\b/g,

  // Discover: starts with 6011, 622126-622925, 644-649, 65
  DISCOVER: /\b(?:6011|65[0-9]{2}|64[4-9][0-9])[-\s]?[0-9]{4}[-\s]?[0-9]{4}[-\s]?[0-9]{4}\b/g,

  // Generic: any 16 digit number (with optional separators)
  GENERIC: /\b(?:[0-9]{4}[-\s]?){3}[0-9]{4}\b/g
};

/**
 * IP address patterns (IPv4 and IPv6)
 */
const IP_PATTERNS = {
  // IPv4
  IPV4: /\b(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,

  // IPv6 (simplified)
  IPV6: /\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b|\b(?:[0-9a-fA-F]{1,4}:){1,7}:\b|\b::(?:[0-9a-fA-F]{1,4}:){0,6}[0-9a-fA-F]{1,4}\b/g
};

/**
 * Date of birth patterns
 */
const DOB_PATTERNS = {
  // MM/DD/YYYY or MM-DD-YYYY
  US: /\b(?:0?[1-9]|1[0-2])[-/](?:0?[1-9]|[12][0-9]|3[01])[-/](?:19|20)[0-9]{2}\b/g,

  // DD/MM/YYYY or DD-MM-YYYY
  EU: /\b(?:0?[1-9]|[12][0-9]|3[01])[-/](?:0?[1-9]|1[0-2])[-/](?:19|20)[0-9]{2}\b/g,

  // YYYY-MM-DD (ISO format)
  ISO: /\b(?:19|20)[0-9]{2}[-/](?:0?[1-9]|1[0-2])[-/](?:0?[1-9]|[12][0-9]|3[01])\b/g,

  // Month DD, YYYY
  WRITTEN: /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},?\s+(?:19|20)\d{2}\b/gi
};

/**
 * Passport number patterns by country
 */
const PASSPORT_PATTERNS = {
  // US passport: 9 digits
  US: /\b[0-9]{9}\b/g,

  // UK passport: 9 digits
  UK: /\b[0-9]{9}\b/g,

  // Generic: alphanumeric 6-12 characters
  GENERIC: /\b[A-Z0-9]{6,12}\b/g
};

/**
 * Driver's license patterns by state/country
 */
const DRIVERS_LICENSE_PATTERNS = {
  // California: 1 letter + 7 digits
  CA: /\b[A-Z][0-9]{7}\b/g,

  // New York: 9 digits
  NY: /\b[0-9]{9}\b/g,

  // Texas: 8 digits
  TX: /\b[0-9]{8}\b/g,

  // Generic US: various formats
  US_GENERIC: /\b[A-Z0-9]{5,15}\b/g
};

/**
 * Tax ID patterns
 */
const TAX_ID_PATTERNS = {
  // EIN (Employer Identification Number): XX-XXXXXXX
  EIN: /\b[0-9]{2}[-]?[0-9]{7}\b/g,

  // ITIN (Individual Taxpayer ID): 9XX-XX-XXXX
  ITIN: /\b9[0-9]{2}[-]?[0-9]{2}[-]?[0-9]{4}\b/g
};

/**
 * Name detection patterns (context-aware)
 * These are less reliable and need context validation
 */
const NAME_CONTEXT_KEYWORDS = [
  'name', 'named', 'user', 'customer', 'patient', 'client', 'employee',
  'mr', 'mrs', 'ms', 'miss', 'dr', 'prof', 'dear', 'hi', 'hello',
  'from', 'to', 'by', 'for', 'signed', 'contact', 'attention'
];

/**
 * Address components pattern
 */
const ADDRESS_PATTERNS = {
  // Street address: number + street name + suffix
  STREET: /\b\d{1,6}\s+(?:[A-Z][a-z]+\s*)+(?:Street|St|Avenue|Ave|Boulevard|Blvd|Road|Rd|Drive|Dr|Lane|Ln|Way|Court|Ct|Circle|Cir|Place|Pl|Terrace|Ter)\b\.?/gi,

  // PO Box
  PO_BOX: /\bP\.?O\.?\s*Box\s+\d+\b/gi,

  // ZIP code (US)
  ZIP_US: /\b\d{5}(?:-\d{4})?\b/g,

  // ZIP+4
  ZIP_EXTENDED: /\b\d{5}-\d{4}\b/g,

  // UK postcode
  ZIP_UK: /\b[A-Z]{1,2}[0-9][0-9A-Z]?\s*[0-9][A-Z]{2}\b/gi,

  // State abbreviation (US)
  STATE: /\b(?:AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC)\b/g
};

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Luhn algorithm for credit card validation
 */
function validateLuhn(cardNumber: string): boolean {
  const digits = cardNumber.replace(/\D/g, '');

  if (digits.length < 13 || digits.length > 19) {
    return false;
  }

  let sum = 0;
  let isEven = false;

  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits[i], 10);

    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
}

/**
 * Validate SSN format (not just pattern but also validity rules)
 */
function validateSSN(ssn: string): boolean {
  const digits = ssn.replace(/\D/g, '');

  if (digits.length !== 9) {
    return false;
  }

  const area = parseInt(digits.substring(0, 3), 10);
  const group = parseInt(digits.substring(3, 5), 10);
  const serial = parseInt(digits.substring(5, 9), 10);

  // Invalid area numbers
  if (area === 0 || area === 666 || area >= 900) {
    return false;
  }

  // Group cannot be 00
  if (group === 0) {
    return false;
  }

  // Serial cannot be 0000
  if (serial === 0) {
    return false;
  }

  return true;
}

/**
 * Validate email format
 */
function validateEmail(email: string): boolean {
  // Additional validation beyond regex
  const parts = email.split('@');
  if (parts.length !== 2) return false;

  const [local, domain] = parts;

  // Local part checks
  if (local.length === 0 || local.length > 64) return false;
  if (local.startsWith('.') || local.endsWith('.')) return false;
  if (local.includes('..')) return false;

  // Domain checks
  if (domain.length === 0 || domain.length > 253) return false;
  if (!domain.includes('.')) return false;

  const domainParts = domain.split('.');
  if (domainParts.some(part => part.length === 0 || part.length > 63)) return false;

  return true;
}

/**
 * Validate phone number
 */
function validatePhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');

  // Most phone numbers are between 7-15 digits
  if (digits.length < 7 || digits.length > 15) {
    return false;
  }

  // Exclude obvious non-phone patterns
  if (/^(.)\1+$/.test(digits)) {
    return false; // All same digit
  }

  if (digits === '1234567890' || digits === '0123456789') {
    return false; // Sequential
  }

  return true;
}

/**
 * Validate IP address
 */
function validateIPv4(ip: string): boolean {
  const parts = ip.split('.');
  if (parts.length !== 4) return false;

  for (const part of parts) {
    const num = parseInt(part, 10);
    if (isNaN(num) || num < 0 || num > 255) return false;
    if (part !== num.toString()) return false; // No leading zeros
  }

  return true;
}

// ============================================================================
// TOKEN STORE (for tokenization mode)
// ============================================================================

/**
 * In-memory token store (for demonstration - use persistent store in production)
 */
class TokenStore {
  private tokens: Map<string, TokenEntry> = new Map();
  private encryptionKey: Buffer;
  private ivLength = 16;

  constructor(secret: string) {
    // Derive key from secret
    this.encryptionKey = crypto.scryptSync(secret, 'agentos-pii-salt', 32);
  }

  /**
   * Generate a unique token for a value
   */
  generateToken(value: string, type: PIIType, prefix: string = 'TOK'): string {
    const hash = crypto.createHash('sha256').update(value + Date.now()).digest('hex');
    const token = `${prefix}_${type.toUpperCase()}_${hash.substring(0, 16)}`;

    // Encrypt the original value
    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    let encrypted = cipher.update(value, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();

    const entry: TokenEntry = {
      token,
      encryptedValue: `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`,
      type,
      createdAt: new Date().toISOString(),
      accessCount: 0
    };

    this.tokens.set(token, entry);
    return token;
  }

  /**
   * Retrieve original value from token (requires authorization)
   */
  retrieveValue(token: string): string | null {
    const entry = this.tokens.get(token);
    if (!entry) return null;

    try {
      const [ivHex, authTagHex, encrypted] = entry.encryptedValue.split(':');
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');

      const decipher = crypto.createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      entry.accessCount++;
      return decrypted;
    } catch {
      return null;
    }
  }

  /**
   * Delete a token
   */
  deleteToken(token: string): boolean {
    return this.tokens.delete(token);
  }

  /**
   * Check if token exists
   */
  hasToken(token: string): boolean {
    return this.tokens.has(token);
  }

  /**
   * Get token metadata (without decrypting)
   */
  getTokenMeta(token: string): Omit<TokenEntry, 'encryptedValue'> | null {
    const entry = this.tokens.get(token);
    if (!entry) return null;

    const { encryptedValue, ...meta } = entry;
    return meta;
  }

  /**
   * Clear expired tokens
   */
  clearExpired(): number {
    const now = new Date();
    let cleared = 0;

    for (const [token, entry] of this.tokens) {
      if (entry.expiresAt && new Date(entry.expiresAt) < now) {
        this.tokens.delete(token);
        cleared++;
      }
    }

    return cleared;
  }

  /**
   * Get all tokens (metadata only)
   */
  listTokens(): Array<Omit<TokenEntry, 'encryptedValue'>> {
    return Array.from(this.tokens.values()).map(({ encryptedValue, ...meta }) => meta);
  }
}

// ============================================================================
// PII REDACTOR CLASS
// ============================================================================

/**
 * Main PII Redactor class
 * HIPAA/GDPR compliant implementation
 */
export class PIIRedactor {
  private config: Required<RedactorConfig>;
  private tokenStore: TokenStore | null = null;
  private allowlistSet: Set<string>;
  private redactionEvents: RedactionEvent[] = [];

  constructor(config: RedactorConfig) {
    this.config = {
      mode: config.mode,
      types: config.types,
      customPatterns: config.customPatterns ?? [],
      allowlist: config.allowlist ?? [],
      hashSecret: config.hashSecret ?? crypto.randomBytes(32).toString('hex'),
      tokenPrefix: config.tokenPrefix ?? 'TOK',
      contextAware: config.contextAware ?? false,
      logRedactions: config.logRedactions ?? true,
      logger: config.logger ?? this.defaultLogger.bind(this)
    };

    this.allowlistSet = new Set(this.config.allowlist.map(v => v.toLowerCase()));

    if (this.config.mode === 'tokenize') {
      this.tokenStore = new TokenStore(this.config.hashSecret);
    }
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  /**
   * Redact PII from text
   */
  redact(text: string, configOverride?: Partial<RedactorConfig>): RedactionResult {
    const startTime = Date.now();
    const config = { ...this.config, ...configOverride };
    const matches: PIIMatch[] = [];
    const errors: string[] = [];

    try {
      // Detect all PII
      for (const type of config.types) {
        const typeMatches = this.detectPIIType(text, type);
        matches.push(...typeMatches);
      }

      // Detect custom patterns
      for (const customPattern of config.customPatterns ?? []) {
        const customMatches = this.detectCustomPattern(text, customPattern);
        matches.push(...customMatches);
      }

      // Sort matches by position (descending) for safe replacement
      matches.sort((a, b) => b.startIndex - a.startIndex);

      // Remove duplicates and overlaps
      const uniqueMatches = this.deduplicateMatches(matches);

      // Filter allowlisted values
      const filteredMatches = uniqueMatches.filter(
        match => !this.allowlistSet.has(match.value.toLowerCase())
      );

      // Generate replacements
      for (const match of filteredMatches) {
        match.replacement = this.generateReplacement(match, config);
      }

      // Apply redactions
      let redactedText = text;
      for (const match of filteredMatches) {
        redactedText =
          redactedText.substring(0, match.startIndex) +
          match.replacement +
          redactedText.substring(match.endIndex);

        // Log redaction event
        if (config.logRedactions) {
          this.logRedactionEvent({
            timestamp: new Date().toISOString(),
            type: 'redaction',
            piiType: match.type,
            mode: config.mode,
            originalLength: match.value.length,
            context: this.getSanitizedContext(text, match.startIndex, match.endIndex)
          });
        }
      }

      return {
        redactedText,
        originalLength: text.length,
        matches: filteredMatches,
        redactionCount: filteredMatches.length,
        processingTimeMs: Date.now() - startTime,
        originalChecksum: this.calculateChecksum(text),
        success: true
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push(errorMessage);

      this.logRedactionEvent({
        timestamp: new Date().toISOString(),
        type: 'error',
        piiType: 'custom',
        mode: config.mode,
        originalLength: text.length,
        error: errorMessage
      });

      return {
        redactedText: text,
        originalLength: text.length,
        matches: [],
        redactionCount: 0,
        processingTimeMs: Date.now() - startTime,
        originalChecksum: this.calculateChecksum(text),
        success: false,
        errors
      };
    }
  }

  /**
   * Redact PII from a stream
   */
  redactStream(
    stream: ReadableStream<string>,
    configOverride?: Partial<RedactorConfig>
  ): ReadableStream<string> {
    const config = { ...this.config, ...configOverride };
    const self = this;
    let buffer = '';
    const bufferSize = 1024; // Process in chunks

    return new ReadableStream<string>({
      async start(controller) {
        const reader = stream.getReader();

        try {
          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              // Process remaining buffer
              if (buffer.length > 0) {
                const result = self.redact(buffer, config);
                controller.enqueue(result.redactedText);
              }
              controller.close();
              break;
            }

            buffer += value;

            // Process complete chunks while preserving potential PII at boundaries
            while (buffer.length >= bufferSize * 2) {
              const safePoint = self.findSafeBreakPoint(buffer, bufferSize);
              const chunk = buffer.substring(0, safePoint);
              buffer = buffer.substring(safePoint);

              const result = self.redact(chunk, config);
              controller.enqueue(result.redactedText);
            }
          }
        } catch (error) {
          controller.error(error);
        } finally {
          reader.releaseLock();
        }
      }
    });
  }

  /**
   * Detect PII without redacting
   */
  detect(text: string): PIIMatch[] {
    const matches: PIIMatch[] = [];

    for (const type of this.config.types) {
      const typeMatches = this.detectPIIType(text, type);
      matches.push(...typeMatches);
    }

    for (const customPattern of this.config.customPatterns) {
      const customMatches = this.detectCustomPattern(text, customPattern);
      matches.push(...customMatches);
    }

    return this.deduplicateMatches(matches);
  }

  /**
   * Check if text contains PII
   */
  containsPII(text: string): boolean {
    return this.detect(text).length > 0;
  }

  /**
   * Retrieve tokenized value (only for tokenize mode)
   */
  detokenize(token: string): string | null {
    if (!this.tokenStore) {
      throw new Error('Detokenization requires tokenize mode');
    }
    return this.tokenStore.retrieveValue(token);
  }

  /**
   * Get redaction statistics
   */
  getStats(): {
    totalEvents: number;
    byType: Record<PIIType, number>;
    byMode: Record<RedactionMode, number>;
    errors: number;
  } {
    const stats = {
      totalEvents: this.redactionEvents.length,
      byType: {} as Record<PIIType, number>,
      byMode: {} as Record<RedactionMode, number>,
      errors: 0
    };

    for (const event of this.redactionEvents) {
      stats.byType[event.piiType] = (stats.byType[event.piiType] ?? 0) + 1;
      stats.byMode[event.mode] = (stats.byMode[event.mode] ?? 0) + 1;

      if (event.type === 'error') {
        stats.errors++;
      }
    }

    return stats;
  }

  /**
   * Clear statistics
   */
  clearStats(): void {
    this.redactionEvents = [];
  }

  /**
   * Update configuration
   */
  updateConfig(configUpdate: Partial<RedactorConfig>): void {
    Object.assign(this.config, configUpdate);

    if (configUpdate.allowlist) {
      this.allowlistSet = new Set(configUpdate.allowlist.map(v => v.toLowerCase()));
    }

    if (configUpdate.mode === 'tokenize' && !this.tokenStore) {
      this.tokenStore = new TokenStore(this.config.hashSecret);
    }
  }

  // ============================================================================
  // DETECTION METHODS
  // ============================================================================

  private detectPIIType(text: string, type: PIIType): PIIMatch[] {
    const matches: PIIMatch[] = [];

    switch (type) {
      case 'email':
        matches.push(...this.detectEmails(text));
        break;
      case 'phone':
        matches.push(...this.detectPhones(text));
        break;
      case 'ssn':
        matches.push(...this.detectSSN(text));
        break;
      case 'credit_card':
        matches.push(...this.detectCreditCards(text));
        break;
      case 'name':
        matches.push(...this.detectNames(text));
        break;
      case 'address':
        matches.push(...this.detectAddresses(text));
        break;
      case 'ip_address':
        matches.push(...this.detectIPAddresses(text));
        break;
      case 'date_of_birth':
        matches.push(...this.detectDatesOfBirth(text));
        break;
      case 'passport':
        matches.push(...this.detectPassports(text));
        break;
      case 'drivers_license':
        matches.push(...this.detectDriversLicenses(text));
        break;
      case 'tax_id':
        matches.push(...this.detectTaxIDs(text));
        break;
      case 'bank_account':
        matches.push(...this.detectBankAccounts(text));
        break;
      case 'medical_record':
        matches.push(...this.detectMedicalRecords(text));
        break;
    }

    return matches;
  }

  private detectEmails(text: string): PIIMatch[] {
    const matches: PIIMatch[] = [];
    const pattern = new RegExp(EMAIL_PATTERN.source, 'gi');
    let match;

    while ((match = pattern.exec(text)) !== null) {
      if (validateEmail(match[0])) {
        matches.push({
          type: 'email',
          value: match[0],
          startIndex: match.index,
          endIndex: match.index + match[0].length,
          confidence: 0.95,
          replacement: ''
        });
      }
    }

    return matches;
  }

  private detectPhones(text: string): PIIMatch[] {
    const matches: PIIMatch[] = [];
    const seenRanges = new Set<string>();

    for (const [format, pattern] of Object.entries(PHONE_PATTERNS)) {
      const regex = new RegExp(pattern.source, 'gi');
      let match;

      while ((match = regex.exec(text)) !== null) {
        const rangeKey = `${match.index}-${match.index + match[0].length}`;

        if (!seenRanges.has(rangeKey) && validatePhone(match[0])) {
          seenRanges.add(rangeKey);
          matches.push({
            type: 'phone',
            value: match[0],
            startIndex: match.index,
            endIndex: match.index + match[0].length,
            confidence: format === 'GENERIC' ? 0.7 : 0.9,
            replacement: ''
          });
        }
      }
    }

    return matches;
  }

  private detectSSN(text: string): PIIMatch[] {
    const matches: PIIMatch[] = [];
    const pattern = new RegExp(SSN_PATTERN.source, 'g');
    let match;

    while ((match = pattern.exec(text)) !== null) {
      if (validateSSN(match[0])) {
        matches.push({
          type: 'ssn',
          value: match[0],
          startIndex: match.index,
          endIndex: match.index + match[0].length,
          confidence: 0.9,
          replacement: ''
        });
      }
    }

    return matches;
  }

  private detectCreditCards(text: string): PIIMatch[] {
    const matches: PIIMatch[] = [];
    const seenRanges = new Set<string>();

    for (const [cardType, pattern] of Object.entries(CREDIT_CARD_PATTERNS)) {
      const regex = new RegExp(pattern.source, 'gi');
      let match;

      while ((match = regex.exec(text)) !== null) {
        const rangeKey = `${match.index}-${match.index + match[0].length}`;

        if (!seenRanges.has(rangeKey) && validateLuhn(match[0])) {
          seenRanges.add(rangeKey);
          matches.push({
            type: 'credit_card',
            value: match[0],
            startIndex: match.index,
            endIndex: match.index + match[0].length,
            confidence: 0.95,
            context: cardType,
            replacement: ''
          });
        }
      }
    }

    return matches;
  }

  private detectIPAddresses(text: string): PIIMatch[] {
    const matches: PIIMatch[] = [];

    // IPv4
    const ipv4Pattern = new RegExp(IP_PATTERNS.IPV4.source, 'g');
    let match;

    while ((match = ipv4Pattern.exec(text)) !== null) {
      if (validateIPv4(match[0])) {
        matches.push({
          type: 'ip_address',
          value: match[0],
          startIndex: match.index,
          endIndex: match.index + match[0].length,
          confidence: 0.95,
          replacement: ''
        });
      }
    }

    // IPv6
    const ipv6Pattern = new RegExp(IP_PATTERNS.IPV6.source, 'g');
    while ((match = ipv6Pattern.exec(text)) !== null) {
      matches.push({
        type: 'ip_address',
        value: match[0],
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        confidence: 0.9,
        replacement: ''
      });
    }

    return matches;
  }

  private detectDatesOfBirth(text: string): PIIMatch[] {
    const matches: PIIMatch[] = [];

    // Only detect dates in context of birth-related keywords
    const dobContext = /\b(?:born|birth|dob|birthday|date\s+of\s+birth|birthdate)\b/gi;

    for (const [format, pattern] of Object.entries(DOB_PATTERNS)) {
      const regex = new RegExp(pattern.source, 'gi');
      let match;

      while ((match = regex.exec(text)) !== null) {
        // Check for context if context-aware mode is enabled
        let confidence = 0.6; // Base confidence for dates

        if (this.config.contextAware) {
          const contextWindow = text.substring(
            Math.max(0, match.index - 50),
            Math.min(text.length, match.index + match[0].length + 50)
          );

          if (dobContext.test(contextWindow)) {
            confidence = 0.95;
          } else {
            continue; // Skip if no DOB context
          }
        }

        matches.push({
          type: 'date_of_birth',
          value: match[0],
          startIndex: match.index,
          endIndex: match.index + match[0].length,
          confidence,
          replacement: ''
        });
      }
    }

    return matches;
  }

  private detectNames(text: string): PIIMatch[] {
    const matches: PIIMatch[] = [];

    if (!this.config.contextAware) {
      return matches; // Names require context-aware detection
    }

    // Look for name patterns near context keywords
    const namePattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})\b/g;
    let match;

    while ((match = namePattern.exec(text)) !== null) {
      const contextWindow = text.substring(
        Math.max(0, match.index - 30),
        match.index
      ).toLowerCase();

      // Check if preceded by name context keywords
      const hasContext = NAME_CONTEXT_KEYWORDS.some(keyword =>
        contextWindow.includes(keyword)
      );

      if (hasContext) {
        matches.push({
          type: 'name',
          value: match[0],
          startIndex: match.index,
          endIndex: match.index + match[0].length,
          confidence: 0.75,
          replacement: ''
        });
      }
    }

    return matches;
  }

  private detectAddresses(text: string): PIIMatch[] {
    const matches: PIIMatch[] = [];
    const seenRanges = new Set<string>();

    for (const [component, pattern] of Object.entries(ADDRESS_PATTERNS)) {
      const regex = new RegExp(pattern.source, 'gi');
      let match;

      while ((match = regex.exec(text)) !== null) {
        const rangeKey = `${match.index}-${match.index + match[0].length}`;

        if (!seenRanges.has(rangeKey)) {
          seenRanges.add(rangeKey);

          // Higher confidence for street addresses, lower for ZIP alone
          const confidence = component === 'STREET' || component === 'PO_BOX' ? 0.9 : 0.7;

          matches.push({
            type: 'address',
            value: match[0],
            startIndex: match.index,
            endIndex: match.index + match[0].length,
            confidence,
            context: component,
            replacement: ''
          });
        }
      }
    }

    return matches;
  }

  private detectPassports(text: string): PIIMatch[] {
    const matches: PIIMatch[] = [];

    if (!this.config.contextAware) {
      return matches; // Passport numbers are ambiguous without context
    }

    const passportContext = /\b(?:passport|travel\s+document|passport\s+number|passport\s+no)\b/gi;

    // Look for passport-like patterns near context
    const pattern = /\b[A-Z0-9]{6,12}\b/g;
    let match;

    while ((match = pattern.exec(text)) !== null) {
      const contextWindow = text.substring(
        Math.max(0, match.index - 50),
        Math.min(text.length, match.index + match[0].length + 50)
      );

      if (passportContext.test(contextWindow)) {
        matches.push({
          type: 'passport',
          value: match[0],
          startIndex: match.index,
          endIndex: match.index + match[0].length,
          confidence: 0.85,
          replacement: ''
        });
      }
    }

    return matches;
  }

  private detectDriversLicenses(text: string): PIIMatch[] {
    const matches: PIIMatch[] = [];

    if (!this.config.contextAware) {
      return matches; // DL numbers are ambiguous without context
    }

    const dlContext = /\b(?:driver'?s?\s+licen[cs]e|dl|driving\s+licen[cs]e|license\s+number|dl\s+number)\b/gi;

    for (const [state, pattern] of Object.entries(DRIVERS_LICENSE_PATTERNS)) {
      const regex = new RegExp(pattern.source, 'g');
      let match;

      while ((match = regex.exec(text)) !== null) {
        const contextWindow = text.substring(
          Math.max(0, match.index - 50),
          Math.min(text.length, match.index + match[0].length + 50)
        );

        if (dlContext.test(contextWindow)) {
          matches.push({
            type: 'drivers_license',
            value: match[0],
            startIndex: match.index,
            endIndex: match.index + match[0].length,
            confidence: 0.8,
            context: state,
            replacement: ''
          });
        }
      }
    }

    return matches;
  }

  private detectTaxIDs(text: string): PIIMatch[] {
    const matches: PIIMatch[] = [];

    for (const [type, pattern] of Object.entries(TAX_ID_PATTERNS)) {
      const regex = new RegExp(pattern.source, 'g');
      let match;

      while ((match = regex.exec(text)) !== null) {
        matches.push({
          type: 'tax_id',
          value: match[0],
          startIndex: match.index,
          endIndex: match.index + match[0].length,
          confidence: 0.85,
          context: type,
          replacement: ''
        });
      }
    }

    return matches;
  }

  private detectBankAccounts(text: string): PIIMatch[] {
    const matches: PIIMatch[] = [];

    if (!this.config.contextAware) {
      return matches;
    }

    const bankContext = /\b(?:account\s+number|account\s+no|acct|bank\s+account|routing\s+number|aba|swift|iban)\b/gi;

    // Look for account number patterns
    const patterns = [
      /\b\d{8,17}\b/g, // Generic account number
      /\b\d{9}\b/g, // US routing number
      /\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/g // IBAN
    ];

    for (const pattern of patterns) {
      const regex = new RegExp(pattern.source, 'g');
      let match;

      while ((match = regex.exec(text)) !== null) {
        const contextWindow = text.substring(
          Math.max(0, match.index - 50),
          Math.min(text.length, match.index + match[0].length + 50)
        );

        if (bankContext.test(contextWindow)) {
          matches.push({
            type: 'bank_account',
            value: match[0],
            startIndex: match.index,
            endIndex: match.index + match[0].length,
            confidence: 0.85,
            replacement: ''
          });
        }
      }
    }

    return matches;
  }

  private detectMedicalRecords(text: string): PIIMatch[] {
    const matches: PIIMatch[] = [];

    if (!this.config.contextAware) {
      return matches;
    }

    const medicalContext = /\b(?:medical\s+record|mrn|patient\s+id|health\s+record|npi|dea|prescription)\b/gi;

    // Medical record number patterns
    const patterns = [
      /\b[A-Z]{2,3}\d{6,10}\b/g, // MRN format
      /\b\d{10}\b/g // NPI (National Provider Identifier)
    ];

    for (const pattern of patterns) {
      const regex = new RegExp(pattern.source, 'g');
      let match;

      while ((match = regex.exec(text)) !== null) {
        const contextWindow = text.substring(
          Math.max(0, match.index - 50),
          Math.min(text.length, match.index + match[0].length + 50)
        );

        if (medicalContext.test(contextWindow)) {
          matches.push({
            type: 'medical_record',
            value: match[0],
            startIndex: match.index,
            endIndex: match.index + match[0].length,
            confidence: 0.85,
            replacement: ''
          });
        }
      }
    }

    return matches;
  }

  private detectCustomPattern(text: string, pattern: CustomPattern): PIIMatch[] {
    const matches: PIIMatch[] = [];
    const regex = new RegExp(pattern.pattern.source, pattern.pattern.flags || 'g');
    let match;

    while ((match = regex.exec(text)) !== null) {
      // Run validation if provided
      if (pattern.validate && !pattern.validate(match[0])) {
        continue;
      }

      matches.push({
        type: 'custom',
        value: match[0],
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        confidence: 0.8,
        context: pattern.name,
        replacement: ''
      });
    }

    return matches;
  }

  // ============================================================================
  // REPLACEMENT GENERATION
  // ============================================================================

  private generateReplacement(match: PIIMatch, config: RedactorConfig): string {
    const mode = config.mode ?? this.config.mode;

    switch (mode) {
      case 'mask':
        return this.generateMask(match);

      case 'hash':
        return this.generateHash(match);

      case 'tokenize':
        return this.generateToken(match);

      case 'remove':
        return '';

      default:
        return this.generateMask(match);
    }
  }

  private generateMask(match: PIIMatch): string {
    const typeLabels: Record<PIIType, string> = {
      email: 'EMAIL',
      phone: 'PHONE',
      ssn: 'SSN',
      credit_card: 'CREDIT_CARD',
      name: 'NAME',
      address: 'ADDRESS',
      ip_address: 'IP_ADDRESS',
      date_of_birth: 'DOB',
      passport: 'PASSPORT',
      drivers_license: 'DRIVERS_LICENSE',
      tax_id: 'TAX_ID',
      bank_account: 'BANK_ACCOUNT',
      medical_record: 'MEDICAL_RECORD',
      custom: 'CUSTOM'
    };

    const label = typeLabels[match.type] || match.type.toUpperCase();
    return `[REDACTED_${label}]`;
  }

  private generateHash(match: PIIMatch): string {
    const hash = crypto
      .createHmac('sha256', this.config.hashSecret)
      .update(match.value)
      .digest('hex')
      .substring(0, 16);

    return `[HASH:${match.type}:${hash}]`;
  }

  private generateToken(match: PIIMatch): string {
    if (!this.tokenStore) {
      throw new Error('Token store not initialized');
    }

    return this.tokenStore.generateToken(
      match.value,
      match.type,
      this.config.tokenPrefix
    );
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private deduplicateMatches(matches: PIIMatch[]): PIIMatch[] {
    // Sort by start index
    const sorted = [...matches].sort((a, b) => a.startIndex - b.startIndex);
    const result: PIIMatch[] = [];

    for (const match of sorted) {
      // Check if this match overlaps with any existing match
      const overlaps = result.some(existing =>
        (match.startIndex >= existing.startIndex && match.startIndex < existing.endIndex) ||
        (match.endIndex > existing.startIndex && match.endIndex <= existing.endIndex) ||
        (match.startIndex <= existing.startIndex && match.endIndex >= existing.endIndex)
      );

      if (!overlaps) {
        result.push(match);
      } else {
        // Keep the match with higher confidence
        const overlappingIndex = result.findIndex(existing =>
          (match.startIndex >= existing.startIndex && match.startIndex < existing.endIndex) ||
          (match.endIndex > existing.startIndex && match.endIndex <= existing.endIndex)
        );

        if (overlappingIndex !== -1 && match.confidence > result[overlappingIndex].confidence) {
          result[overlappingIndex] = match;
        }
      }
    }

    return result;
  }

  private findSafeBreakPoint(buffer: string, targetPoint: number): number {
    // Find a safe point to break the buffer (not in the middle of potential PII)
    // Look for whitespace or punctuation near the target point

    const searchWindow = 100;
    const start = Math.max(0, targetPoint - searchWindow);
    const end = Math.min(buffer.length, targetPoint + searchWindow);

    // Prefer breaking at sentence boundaries
    for (let i = targetPoint; i >= start; i--) {
      if ('.!?\n'.includes(buffer[i])) {
        return i + 1;
      }
    }

    // Fall back to whitespace
    for (let i = targetPoint; i >= start; i--) {
      if (' \t\n\r'.includes(buffer[i])) {
        return i + 1;
      }
    }

    return targetPoint;
  }

  private getSanitizedContext(text: string, start: number, end: number): string {
    const contextSize = 20;
    const before = text.substring(Math.max(0, start - contextSize), start);
    const after = text.substring(end, Math.min(text.length, end + contextSize));

    return `...${before}[MATCH]${after}...`;
  }

  private calculateChecksum(text: string): string {
    return crypto.createHash('sha256').update(text).digest('hex').substring(0, 16);
  }

  private logRedactionEvent(event: RedactionEvent): void {
    this.redactionEvents.push(event);

    if (this.config.logger) {
      this.config.logger(event);
    }
  }

  private defaultLogger(event: RedactionEvent): void {
    // Default: silent logging (just store in memory)
    // In production, this would integrate with the audit logger
  }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create a PII redactor with common defaults
 */
export function createRedactor(config: RedactorConfig): PIIRedactor {
  return new PIIRedactor(config);
}

/**
 * Create a HIPAA-compliant redactor
 * Includes all healthcare-relevant PII types
 */
export function createHIPAARedactor(
  mode: RedactionMode = 'mask',
  options?: Partial<RedactorConfig>
): PIIRedactor {
  return new PIIRedactor({
    mode,
    types: [
      'email',
      'phone',
      'ssn',
      'name',
      'address',
      'date_of_birth',
      'medical_record',
      'ip_address'
    ],
    contextAware: true,
    logRedactions: true,
    ...options
  });
}

/**
 * Create a GDPR-compliant redactor
 * Includes all personally identifiable information types
 */
export function createGDPRRedactor(
  mode: RedactionMode = 'mask',
  options?: Partial<RedactorConfig>
): PIIRedactor {
  return new PIIRedactor({
    mode,
    types: [
      'email',
      'phone',
      'name',
      'address',
      'date_of_birth',
      'ip_address',
      'passport',
      'drivers_license',
      'tax_id'
    ],
    contextAware: true,
    logRedactions: true,
    ...options
  });
}

/**
 * Create a PCI-DSS compliant redactor
 * Focuses on payment card data
 */
export function createPCIRedactor(
  mode: RedactionMode = 'mask',
  options?: Partial<RedactorConfig>
): PIIRedactor {
  return new PIIRedactor({
    mode,
    types: [
      'credit_card',
      'bank_account'
    ],
    logRedactions: true,
    ...options
  });
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Quick redaction with default settings
 */
export function redact(text: string, config: RedactorConfig): RedactionResult {
  const redactor = new PIIRedactor(config);
  return redactor.redact(text);
}

/**
 * Quick stream redaction
 */
export function redactStream(
  stream: ReadableStream<string>,
  config: RedactorConfig
): ReadableStream<string> {
  const redactor = new PIIRedactor(config);
  return redactor.redactStream(stream);
}

/**
 * Check if text contains PII
 */
export function containsPII(text: string, types: PIIType[] = ['email', 'phone', 'ssn', 'credit_card']): boolean {
  const redactor = new PIIRedactor({
    mode: 'mask',
    types
  });
  return redactor.containsPII(text);
}

/**
 * Detect PII in text
 */
export function detectPII(text: string, types: PIIType[] = ['email', 'phone', 'ssn', 'credit_card']): PIIMatch[] {
  const redactor = new PIIRedactor({
    mode: 'mask',
    types
  });
  return redactor.detect(text);
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let defaultRedactor: PIIRedactor | null = null;

/**
 * Get or create the default redactor instance
 */
export function getDefaultRedactor(): PIIRedactor {
  if (!defaultRedactor) {
    defaultRedactor = createGDPRRedactor('mask');
  }
  return defaultRedactor;
}

/**
 * Set the default redactor instance
 */
export function setDefaultRedactor(redactor: PIIRedactor): void {
  defaultRedactor = redactor;
}

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

/**
 * Redact PII from multiple texts
 */
export function batchRedact(
  texts: string[],
  config: RedactorConfig
): RedactionResult[] {
  const redactor = new PIIRedactor(config);
  return texts.map(text => redactor.redact(text));
}

/**
 * Redact PII from object values recursively
 */
export function redactObject<T extends object>(
  obj: T,
  config: RedactorConfig,
  maxDepth: number = 10
): { redactedObject: T; totalRedactions: number } {
  const redactor = new PIIRedactor(config);
  let totalRedactions = 0;

  function processValue(value: unknown, depth: number): unknown {
    if (depth > maxDepth) return value;

    if (typeof value === 'string') {
      const result = redactor.redact(value);
      totalRedactions += result.redactionCount;
      return result.redactedText;
    }

    if (Array.isArray(value)) {
      return value.map(item => processValue(item, depth + 1));
    }

    if (value !== null && typeof value === 'object') {
      const processed: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(value)) {
        processed[key] = processValue(val, depth + 1);
      }
      return processed;
    }

    return value;
  }

  const redactedObject = processValue(obj, 0) as T;
  return { redactedObject, totalRedactions };
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  EMAIL_PATTERN,
  PHONE_PATTERNS,
  SSN_PATTERN,
  CREDIT_CARD_PATTERNS,
  IP_PATTERNS,
  DOB_PATTERNS,
  ADDRESS_PATTERNS,
  validateLuhn,
  validateSSN,
  validateEmail,
  validatePhone,
  validateIPv4
};
